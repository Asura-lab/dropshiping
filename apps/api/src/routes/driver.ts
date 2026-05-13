import { Router } from "express";
import { z } from "zod";
import { prisma } from "../lib/prisma";
import { requireAuth, type AuthRequest } from "../middleware/auth";
import { enqueueSms } from "../lib/queue";

const router = Router();
router.use(requireAuth("driver", "admin"));

// GET /driver/deliveries — today's deliveries for the logged-in driver
router.get("/deliveries", async (req: AuthRequest, res) => {
  const isAdmin = req.user!.role === "admin";
  const driverId = req.user!.sub;

  const today = new Date();
  today.setHours(0, 0, 0, 0);
  const tomorrow = new Date(today);
  tomorrow.setDate(tomorrow.getDate() + 1);

  const deliveries = await prisma.delivery.findMany({
    where: {
      ...(isAdmin ? {} : { driverId }),
      slot: { slotDatetime: { gte: today, lt: tomorrow } },
    },
    include: {
      order: {
        include: {
          user: { select: { name: true, phone: true } },
          address: true,
          items: { include: { product: { select: { titleMn: true, images: true } } } },
        },
      },
      slot: true,
    },
    orderBy: { slot: { slotDatetime: "asc" } },
  });

  res.json({ success: true, data: deliveries });
});

// PATCH /driver/deliveries/:id/status
router.patch("/deliveries/:id/status", async (req: AuthRequest, res) => {
  const result = z
    .object({
      status: z.enum(["en_route", "delivered", "failed"]),
      note: z.string().optional(),
    })
    .safeParse(req.body);

  if (!result.success) {
    res.status(422).json({
      success: false,
      error: { code: "VALIDATION_ERROR", message: "status шаардлагатай" },
    });
    return;
  }

  const delivery = await prisma.delivery.findFirst({
    where: {
      id: String(req.params.id),
      ...(req.user!.role === "driver" ? { driverId: req.user!.sub } : {}),
    },
    include: {
      order: { include: { user: { select: { phone: true } } } },
    },
  });

  if (!delivery) {
    res
      .status(404)
      .json({
        success: false,
        error: { code: "NOT_FOUND", message: "Хүргэлт олдсонгүй" },
      });
    return;
  }

  const ALLOWED_TRANSITIONS: Record<string, string[]> = {
    scheduled: ["en_route"],
    en_route: ["delivered", "failed"],
  };
  if (!ALLOWED_TRANSITIONS[delivery.status]?.includes(result.data.status)) {
    res.status(422).json({
      success: false,
      error: {
        code: "INVALID_TRANSITION",
        message: `${delivery.status} → ${result.data.status} шилжилт боломжгүй`,
      },
    });
    return;
  }

  const { status, note } = result.data;

  const updated = await prisma.$transaction(async (tx) => {
    const d = await tx.delivery.update({
      where: { id: delivery.id },
      data: {
        status,
        ...(status === "delivered" && { deliveredAt: new Date() }),
        ...(note && { note }),
      },
    });
    if (status === "delivered") {
      await tx.order.update({
        where: { id: delivery.orderId },
        data: { status: "delivered" },
      });
      await tx.orderStatusLog.create({
        data: {
          orderId: delivery.orderId,
          fromStatus: "processing",
          toStatus: "delivered",
          changedBy: req.user!.sub,
          note: note ?? "Жолооч хүргэлт баталгаажуулсан",
        },
      });
    }
    return d;
  });

  if (status === "delivered") {
    await enqueueSms({
      type: "order_confirmed",
      phone: delivery.order.user.phone,
      orderNumber: delivery.order.orderNumber,
    });
  }

  res.json({ success: true, data: updated });
});

export default router;
