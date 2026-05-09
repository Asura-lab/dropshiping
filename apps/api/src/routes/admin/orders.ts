import { Router } from "express";
import { z } from "zod";
import { prisma } from "../../lib/prisma";
import { requireAuth, type AuthRequest } from "../../middleware/auth";
import { enqueueSms } from "../../lib/queue";

const router = Router();
router.use(requireAuth("admin"));

const ORDER_STATUSES = [
  "pending",
  "confirmed",
  "processing",
  "shipped",
  "delivered",
  "cancelled",
] as const;

// GET /admin/orders
router.get("/", async (req, res) => {
  const query = z
    .object({
      status: z.enum(ORDER_STATUSES).optional(),
      page: z.coerce.number().int().min(1).default(1),
      limit: z.coerce.number().int().min(1).max(100).default(20),
    })
    .safeParse(req.query);

  if (!query.success) {
    res
      .status(422)
      .json({
        success: false,
        error: { code: "VALIDATION_ERROR", message: "Query буруу" },
      });
    return;
  }

  const { status, page, limit } = query.data;
  const where = { ...(status ? { status } : {}) };

  const [total, orders] = await Promise.all([
    prisma.order.count({ where }),
    prisma.order.findMany({
      where,
      orderBy: { createdAt: "desc" },
      skip: (page - 1) * limit,
      take: limit,
      include: {
        user: { select: { id: true, name: true, phone: true } },
        items: { include: { product: { select: { titleMn: true } } } },
        payment: { select: { status: true, provider: true } },
        delivery: { select: { status: true, slot: true } },
      },
    }),
  ]);

  res.json({
    success: true,
    data: orders,
    meta: { total, page, limit, totalPages: Math.ceil(total / limit) },
  });
});

// PATCH /admin/orders/:id/status
router.patch("/:id/status", async (req: AuthRequest, res) => {
  const result = z
    .object({
      status: z.enum(ORDER_STATUSES),
      note: z.string().optional(),
    })
    .safeParse(req.body);

  if (!result.success) {
    res.status(422).json({
      success: false,
      error: { code: "VALIDATION_ERROR", message: result.error.errors[0]?.message },
    });
    return;
  }

  const order = await prisma.order.findUnique({ where: { id: String(req.params.id) } });
  if (!order) {
    res
      .status(404)
      .json({
        success: false,
        error: { code: "NOT_FOUND", message: "Захиалга олдсонгүй" },
      });
    return;
  }

  const { status, note } = result.data;

  const orderWithUser = await prisma.order.findUnique({
    where: { id: order.id },
    include: {
      user: { select: { phone: true } },
      delivery: { include: { slot: true } },
    },
  });

  const updated = await prisma.$transaction(async (tx) => {
    const o = await tx.order.update({
      where: { id: order.id },
      data: { status },
    });
    await tx.orderStatusLog.create({
      data: {
        orderId: order.id,
        fromStatus: order.status,
        toStatus: status,
        changedBy: req.user!.sub,
        note: note ?? null,
      },
    });
    return o;
  });

  // Send SMS notifications on key status transitions
  if (orderWithUser) {
    const phone = orderWithUser.user.phone;
    const slotDatetime = orderWithUser.delivery?.slot?.slotDatetime?.toISOString() ?? "";
    if (status === "processing") {
      await enqueueSms({
        type: "order_ready_pickup",
        phone,
        orderNumber: order.orderNumber,
        slotDatetime,
      });
    }
  }

  res.json({ success: true, data: updated });
});

// GET /admin/orders/:id
router.get("/:id", async (_req, res) => {
  const order = await prisma.order.findUnique({
    where: { id: String(_req.params.id) },
    include: {
      user: { select: { id: true, name: true, phone: true, email: true } },
      address: true,
      items: { include: { product: true, sourceOrder: true } },
      payment: true,
      delivery: {
        include: {
          slot: true,
          driver: { select: { id: true, name: true, phone: true } },
        },
      },
      statusLogs: {
        orderBy: { createdAt: "asc" },
        include: { changer: { select: { name: true } } },
      },
    },
  });

  if (!order) {
    res
      .status(404)
      .json({
        success: false,
        error: { code: "NOT_FOUND", message: "Захиалга олдсонгүй" },
      });
    return;
  }

  res.json({ success: true, data: order });
});

// POST /admin/orders — manual order creation
router.post("/", async (req: AuthRequest, res) => {
  const schema = z.object({
    user_phone: z.string().min(8),
    slot_id: z.string().uuid(),
    delivery_type: z.enum(["pickup", "delivery"]),
    note: z.string().optional(),
    items: z
      .array(
        z.object({
          product_id: z.string().uuid(),
          quantity: z.number().int().min(1),
        })
      )
      .min(1),
  });

  const result = schema.safeParse(req.body);
  if (!result.success) {
    res
      .status(422)
      .json({
        success: false,
        error: { code: "VALIDATION_ERROR", message: result.error.errors[0]?.message },
      });
    return;
  }

  const { user_phone, slot_id, delivery_type, note, items } = result.data;

  const user = await prisma.user.findUnique({ where: { phone: user_phone } });
  if (!user) {
    res
      .status(404)
      .json({
        success: false,
        error: { code: "USER_NOT_FOUND", message: "Хэрэглэгч олдсонгүй" },
      });
    return;
  }

  const slot = await prisma.deliverySlot.findFirst({
    where: { id: slot_id, isActive: true },
  });
  if (!slot || slot.bookedCount >= slot.capacity) {
    res
      .status(422)
      .json({
        success: false,
        error: { code: "SLOT_UNAVAILABLE", message: "Цаг боломжгүй" },
      });
    return;
  }

  const productIds = items.map((i) => i.product_id);
  const products = await prisma.product.findMany({
    where: { id: { in: productIds }, status: "active" },
  });
  if (products.length !== productIds.length) {
    res
      .status(422)
      .json({
        success: false,
        error: { code: "PRODUCT_NOT_FOUND", message: "Зарим бараа олдсонгүй" },
      });
    return;
  }

  const productMap = new Map(products.map((p) => [p.id, p]));
  let subtotal = 0;
  for (const item of items) {
    subtotal += Number(productMap.get(item.product_id)!.priceMnt) * item.quantity;
  }
  const deliveryFee = delivery_type === "delivery" ? 3000 : 0;
  const total = subtotal + deliveryFee;

  function genOrderNumber() {
    const d = new Date();
    const ymd =
      d.getFullYear().toString() +
      String(d.getMonth() + 1).padStart(2, "0") +
      String(d.getDate()).padStart(2, "0");
    return `DS-${ymd}-${Math.floor(1000 + Math.random() * 9000)}`;
  }

  const order = await prisma.$transaction(async (tx) => {
    let orderNumber = genOrderNumber();
    const exists = await tx.order.findUnique({ where: { orderNumber } });
    if (exists) orderNumber = genOrderNumber();

    const created = await tx.order.create({
      data: {
        userId: user.id,
        orderNumber,
        status: "confirmed",
        deliveryType: delivery_type,
        note: note ?? null,
        subtotalMnt: subtotal,
        deliveryFee,
        discountMnt: 0,
        totalMnt: total,
        items: {
          create: items.map((item) => ({
            productId: item.product_id,
            quantity: item.quantity,
            unitPriceMnt: Number(productMap.get(item.product_id)!.priceMnt),
          })),
        },
        statusLogs: {
          create: {
            fromStatus: null,
            toStatus: "confirmed",
            changedBy: req.user!.sub,
            note: "Админ гараар үүсгэсэн",
          },
        },
      },
      include: { items: true },
    });

    await tx.delivery.create({
      data: { orderId: created.id, slotId: slot_id, status: "scheduled" },
    });
    await tx.deliverySlot.update({
      where: { id: slot_id },
      data: { bookedCount: { increment: 1 } },
    });
    return created;
  });

  res.status(201).json({ success: true, data: order });
});

// DELETE /admin/orders/:id — soft delete (cancel)
router.delete("/:id", async (req: AuthRequest, res) => {
  const order = await prisma.order.findUnique({ where: { id: String(req.params.id) } });
  if (!order) {
    res
      .status(404)
      .json({
        success: false,
        error: { code: "NOT_FOUND", message: "Захиалга олдсонгүй" },
      });
    return;
  }
  await prisma.$transaction([
    prisma.order.update({ where: { id: order.id }, data: { status: "cancelled" } }),
    prisma.orderStatusLog.create({
      data: {
        orderId: order.id,
        fromStatus: order.status,
        toStatus: "cancelled",
        changedBy: req.user!.sub,
        note: "Админ устгасан",
      },
    }),
  ]);
  res.json({ success: true, data: null });
});

export default router;
