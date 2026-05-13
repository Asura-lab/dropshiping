import { Router } from "express";
import { z } from "zod";
import { prisma } from "../../lib/prisma";
import { enqueueSms } from "../../lib/queue";

const router = Router();

// Verify shared secret from env
function verifySecret(req: {
  headers: Record<string, string | string[] | undefined>;
}): boolean {
  const secret = process.env.WEBHOOK_SECRET;
  if (!secret) return false;
  return req.headers["x-webhook-secret"] === secret;
}

const bodySchema = z.object({
  platform: z.enum(["taobao", "alibaba"]),
  platformOrderId: z.string().min(1),
  status: z.enum(["shipped", "arrived"]),
  trackingNumber: z.string().optional(),
});

// POST /internal/source-orders/webhook
router.post("/", async (req, res) => {
  if (!verifySecret(req)) {
    res
      .status(401)
      .json({
        success: false,
        error: { code: "UNAUTHORIZED", message: "Invalid webhook secret" },
      });
    return;
  }

  const parsed = bodySchema.safeParse(req.body);
  if (!parsed.success) {
    res
      .status(422)
      .json({
        success: false,
        error: { code: "VALIDATION_ERROR", message: "body буруу" },
      });
    return;
  }

  const { platform, platformOrderId, status, trackingNumber } = parsed.data;

  const sourceOrder = await prisma.sourceOrder.findFirst({
    where: { platformOrderId, platform },
    include: {
      orderItem: {
        include: {
          order: {
            include: {
              user: { select: { phone: true } },
              items: { include: { sourceOrder: { select: { status: true } } } },
            },
          },
        },
      },
    },
  });

  if (!sourceOrder) {
    res
      .status(404)
      .json({
        success: false,
        error: { code: "NOT_FOUND", message: "Эх захиалга олдсонгүй" },
      });
    return;
  }

  const now = new Date();
  await prisma.sourceOrder.update({
    where: { id: sourceOrder.id },
    data: {
      status,
      ...(trackingNumber && { errorMessage: null }),
      ...(status === "shipped" && !sourceOrder.shippedAt && { shippedAt: now }),
      ...(status === "arrived" && !sourceOrder.arrivedAt && { arrivedAt: now }),
    },
  });

  const order = sourceOrder.orderItem.order;

  if (status === "shipped") {
    // If the order is still in sourcing, advance to shipped_international
    if (order.status === "sourcing") {
      await prisma.order.update({
        where: { id: order.id },
        data: { status: "shipped_international" },
      });
    }
  }

  if (status === "arrived") {
    // Check if ALL source orders for this order are now arrived
    const allItems = order.items;
    const otherStatuses = allItems
      .filter((item) => item.sourceOrder && item.id !== sourceOrder.orderItemId)
      .map((item) => item.sourceOrder!.status);

    const allArrived = otherStatuses.every((s) => s === "arrived");

    if (
      allArrived &&
      ["sourcing", "shipped_international", "customs"].includes(order.status)
    ) {
      await prisma.order.update({
        where: { id: order.id },
        data: { status: "arrived_warehouse" },
      });

      const phone = order.user.phone;
      if (phone) {
        await enqueueSms({
          type: "arrived_warehouse",
          phone,
          orderNumber: order.orderNumber,
        });
      }
    }
  }

  res.json({ success: true, data: { id: sourceOrder.id, status } });
});

export default router;
