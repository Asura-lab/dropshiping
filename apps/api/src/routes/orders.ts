import { Router } from "express";
import { z } from "zod";
import { prisma } from "../lib/prisma";
import { redis } from "../lib/redis";
import { requireAuth, type AuthRequest } from "../middleware/auth";
import { enqueueSlotReminder } from "../lib/queue";

const router = Router();
router.use(requireAuth("customer", "driver", "admin"));

function generateOrderNumber(): string {
  const date = new Date();
  const ymd =
    date.getFullYear().toString() +
    String(date.getMonth() + 1).padStart(2, "0") +
    String(date.getDate()).padStart(2, "0");
  const rand = Math.floor(1000 + Math.random() * 9000);
  return `DS-${ymd}-${rand}`;
}

const createOrderSchema = z.object({
  delivery_type: z.enum(["pickup", "delivery"]),
  address_id: z.string().uuid().optional(),
  slot_id: z.string().uuid(),
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

// POST /orders
router.post("/", async (req: AuthRequest, res) => {
  const result = createOrderSchema.safeParse(req.body);
  if (!result.success) {
    res.status(422).json({
      success: false,
      error: { code: "VALIDATION_ERROR", message: result.error.errors[0]?.message },
    });
    return;
  }

  const { delivery_type, address_id, slot_id, note, items } = result.data;

  if (delivery_type === "delivery" && !address_id) {
    res.status(422).json({
      success: false,
      error: { code: "VALIDATION_ERROR", message: "Хүргэлтийн хаяг шаардлагатай" },
    });
    return;
  }

  // Redis lock — prevent double-booking the same slot under concurrent requests
  const lockKey = `slot_lock:${slot_id}`;
  const lockAcquired = await redis.set(lockKey, "1", { NX: true, EX: 10 });
  if (!lockAcquired) {
    res.status(422).json({
      success: false,
      error: {
        code: "SLOT_LOCKED",
        message: "Цаг захиалгын слот хэт их хүсэлт байна. Дахин оролдоно уу.",
      },
    });
    return;
  }

  let slotReleased = false;
  const releaseSlotLock = async () => {
    if (!slotReleased) {
      slotReleased = true;
      await redis.del(lockKey);
    }
  };

  try {
    const slot = await prisma.deliverySlot.findFirst({
      where: { id: slot_id, isActive: true },
    });
    if (!slot || slot.bookedCount >= slot.capacity) {
      await releaseSlotLock();
      res.status(422).json({
        success: false,
        error: { code: "SLOT_UNAVAILABLE", message: "Цаг захиалгын слот боломжгүй" },
      });
      return;
    }

    const productIds = items.map((i) => i.product_id);
    const products = await prisma.product.findMany({
      where: { id: { in: productIds }, status: "active" },
    });

    if (products.length !== productIds.length) {
      res.status(422).json({
        success: false,
        error: {
          code: "PRODUCT_NOT_FOUND",
          message: "Зарим бараа олдсонгүй эсвэл идэвхгүй байна",
        },
      });
      return;
    }

    const productMap = new Map(products.map((p) => [p.id, p]));
    let subtotal = 0;
    for (const item of items) {
      const product = productMap.get(item.product_id)!;
      subtotal += Number(product.priceMnt) * item.quantity;
    }

    const deliveryFee = delivery_type === "delivery" ? 3000 : 0;
    const total = subtotal + deliveryFee;

    const order = await prisma.$transaction(async (tx) => {
      let orderNumber = generateOrderNumber();
      const exists = await tx.order.findUnique({ where: { orderNumber } });
      if (exists) orderNumber = generateOrderNumber();

      const created = await tx.order.create({
        data: {
          userId: req.user!.sub,
          addressId: address_id ?? null,
          orderNumber,
          status: "pending",
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
              toStatus: "pending",
              changedBy: req.user!.sub,
            },
          },
        },
        include: { items: true },
      });

      await tx.delivery.create({
        data: {
          orderId: created.id,
          slotId: slot_id,
          status: "scheduled",
        },
      });

      await tx.deliverySlot.update({
        where: { id: slot_id },
        data: { bookedCount: { increment: 1 } },
      });

      return created;
    });

    // Release the slot lock now that booking is committed
    await releaseSlotLock();

    // Schedule pickup reminder SMS 2 hours before slot
    const user = await prisma.user.findUnique({ where: { id: req.user!.sub } });
    if (user && slot.slotDatetime) {
      await enqueueSlotReminder(
        {
          type: "slot_reminder",
          phone: user.phone,
          orderNumber: order.orderNumber,
          slotDatetime: slot.slotDatetime.toISOString(),
        },
        slot.slotDatetime
      );
    }

    res.status(201).json({ success: true, data: order });
  } catch (err) {
    await releaseSlotLock();
    throw err;
  }
});

// GET /orders
router.get("/", async (req: AuthRequest, res) => {
  const query = z
    .object({
      status: z.string().optional(),
      page: z.coerce.number().int().min(1).default(1),
      limit: z.coerce.number().int().min(1).max(50).default(10),
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
  const isAdmin = req.user!.role === "admin";

  const where = {
    ...(isAdmin ? {} : { userId: req.user!.sub }),
    ...(status && { status }),
  };

  const [total, orders] = await Promise.all([
    prisma.order.count({ where }),
    prisma.order.findMany({
      where,
      orderBy: { createdAt: "desc" },
      skip: (page - 1) * limit,
      take: limit,
      include: {
        items: { include: { product: { select: { titleMn: true, images: true } } } },
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

// GET /orders/:id
router.get("/:id", async (req: AuthRequest, res) => {
  const isAdmin = req.user!.role === "admin";

  const order = await prisma.order.findFirst({
    where: {
      id: String(req.params.id),
      ...(isAdmin ? {} : { userId: req.user!.sub }),
    },
    include: {
      items: { include: { product: true } },
      payment: true,
      delivery: {
        include: {
          slot: true,
          driver: { select: { id: true, name: true, phone: true } },
        },
      },
      statusLogs: { orderBy: { createdAt: "asc" } },
      address: true,
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

// POST /orders/:id/cancel
router.post("/:id/cancel", async (req: AuthRequest, res) => {
  const isAdmin = req.user!.role === "admin";
  const order = await prisma.order.findFirst({
    where: {
      id: String(req.params.id),
      ...(isAdmin ? {} : { userId: req.user!.sub }),
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

  if (!["pending", "confirmed"].includes(order.status)) {
    res.status(422).json({
      success: false,
      error: { code: "CANNOT_CANCEL", message: "Энэ захиалгыг цуцлах боломжгүй" },
    });
    return;
  }

  const updated = await prisma.$transaction(async (tx) => {
    const o = await tx.order.update({
      where: { id: order.id },
      data: { status: "cancelled" },
    });
    await tx.orderStatusLog.create({
      data: {
        orderId: order.id,
        fromStatus: order.status,
        toStatus: "cancelled",
        changedBy: req.user!.sub,
        note: "Хэрэглэгч цуцалсан",
      },
    });
    // Release the delivery slot
    const delivery = await tx.delivery.findUnique({ where: { orderId: order.id } });
    if (delivery) {
      await tx.deliverySlot.update({
        where: { id: delivery.slotId },
        data: { bookedCount: { decrement: 1 } },
      });
    }
    return o;
  });

  res.json({ success: true, data: updated });
});

export default router;
