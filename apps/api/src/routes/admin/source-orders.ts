import { Router } from "express";
import { z } from "zod";
import { prisma } from "../../lib/prisma";
import { requireAuth } from "../../middleware/auth";
import { enqueueSourceOrder } from "../../lib/queue";

const router = Router();
router.use(requireAuth("admin"));

// GET /admin/source-orders
router.get("/", async (req, res) => {
  const query = z
    .object({
      status: z.enum(["queued", "processing", "placed", "shipped", "failed"]).optional(),
      platform: z.enum(["taobao", "alibaba", "amazon"]).optional(),
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

  const { status, platform, page, limit } = query.data;
  const where = {
    ...(status && { status }),
    ...(platform && { platform }),
  };

  const [total, sourceOrders] = await Promise.all([
    prisma.sourceOrder.count({ where }),
    prisma.sourceOrder.findMany({
      where,
      orderBy: { createdAt: "desc" },
      skip: (page - 1) * limit,
      take: limit,
      include: {
        orderItem: {
          include: {
            order: { select: { orderNumber: true, userId: true } },
            product: { select: { titleMn: true, sourcePlatform: true } },
          },
        },
      },
    }),
  ]);

  res.json({
    success: true,
    data: sourceOrders,
    meta: { total, page, limit, totalPages: Math.ceil(total / limit) },
  });
});

// GET /admin/source-orders/:id
router.get("/:id", async (req, res) => {
  const sourceOrder = await prisma.sourceOrder.findUnique({
    where: { id: String(req.params.id) },
    include: {
      orderItem: {
        include: {
          order: { include: { user: { select: { id: true, name: true, phone: true } } } },
          product: true,
        },
      },
    },
  });

  if (!sourceOrder) {
    res
      .status(404)
      .json({ success: false, error: { code: "NOT_FOUND", message: "Олдсонгүй" } });
    return;
  }

  res.json({ success: true, data: sourceOrder });
});

// POST /admin/source-orders/:id/retry — re-queue a failed source order
router.post("/:id/retry", async (req, res) => {
  const sourceOrder = await prisma.sourceOrder.findUnique({
    where: { id: String(req.params.id) },
    include: {
      orderItem: {
        include: {
          order: { include: { user: { select: { phone: true } } } },
        },
      },
    },
  });

  if (!sourceOrder) {
    res
      .status(404)
      .json({ success: false, error: { code: "NOT_FOUND", message: "Олдсонгүй" } });
    return;
  }

  if (sourceOrder.status !== "failed") {
    res.status(422).json({
      success: false,
      error: {
        code: "INVALID_STATUS",
        message: "Зөвхөн failed статустай захиалгыг дахин оролдож болно",
      },
    });
    return;
  }

  await prisma.sourceOrder.update({
    where: { id: sourceOrder.id },
    data: { status: "queued", retryCount: 0, errorMessage: null },
  });

  await enqueueSourceOrder({
    orderItemId: sourceOrder.orderItemId,
    platform: sourceOrder.platform,
    orderNumber: sourceOrder.orderItem.order.orderNumber,
    customerPhone: sourceOrder.orderItem.order.user?.phone ?? "",
  });

  res.json({ success: true, data: { message: "Дахин queue-д орлоо" } });
});

// PATCH /admin/source-orders/:id/status — manual status override
router.patch("/:id/status", async (req, res) => {
  const result = z
    .object({
      status: z.enum(["queued", "processing", "placed", "shipped", "arrived", "failed"]),
      note: z.string().optional(),
    })
    .safeParse(req.body);

  if (!result.success) {
    res
      .status(422)
      .json({
        success: false,
        error: { code: "VALIDATION_ERROR", message: "status шаардлагатай" },
      });
    return;
  }

  const sourceOrder = await prisma.sourceOrder.findUnique({
    where: { id: String(req.params.id) },
  });
  if (!sourceOrder) {
    res
      .status(404)
      .json({ success: false, error: { code: "NOT_FOUND", message: "Олдсонгүй" } });
    return;
  }

  const updated = await prisma.sourceOrder.update({
    where: { id: sourceOrder.id },
    data: {
      status: result.data.status,
      ...(result.data.status === "placed" &&
        !sourceOrder.placedAt && { placedAt: new Date() }),
      ...(result.data.status === "shipped" &&
        !sourceOrder.shippedAt && { shippedAt: new Date() }),
      ...(result.data.status === "arrived" &&
        !sourceOrder.arrivedAt && { arrivedAt: new Date() }),
      ...(result.data.note && { errorMessage: result.data.note }),
    },
  });

  res.json({ success: true, data: updated });
});

export default router;
