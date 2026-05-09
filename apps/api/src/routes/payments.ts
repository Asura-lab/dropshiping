import { Router } from "express";
import { z } from "zod";
import { prisma } from "../lib/prisma";
import { requireAuth, type AuthRequest } from "../middleware/auth";
import { enqueueSms } from "../lib/queue";

const router = Router();

// POST /payments/qpay
router.post("/qpay", requireAuth("customer", "admin"), async (req: AuthRequest, res) => {
  const result = z.object({ order_id: z.string().uuid() }).safeParse(req.body);
  if (!result.success) {
    res.status(422).json({
      success: false,
      error: { code: "VALIDATION_ERROR", message: "order_id шаардлагатай" },
    });
    return;
  }

  const order = await prisma.order.findFirst({
    where: {
      id: result.data.order_id,
      userId: req.user!.sub,
      status: "pending",
    },
    include: { payment: true },
  });

  if (!order) {
    res.status(404).json({
      success: false,
      error: {
        code: "NOT_FOUND",
        message: "Захиалга олдсонгүй эсвэл төлбөр хийх боломжгүй",
      },
    });
    return;
  }

  if (order.payment && order.payment.status === "paid") {
    res.status(400).json({
      success: false,
      error: { code: "ALREADY_PAID", message: "Захиалга аль хэдийн төлөгдсөн" },
    });
    return;
  }

  // Dev mode: mock QPay response — auto-confirm order immediately
  const isMockMode = !process.env.QPAY_MERCHANT_ID;

  let qpayData: Record<string, unknown>;

  if (isMockMode) {
    qpayData = {
      invoice_id: `MOCK-${Date.now()}`,
      qr_text: `MOCK_QR_${order.orderNumber}`,
      qr_image: "data:image/png;base64,MOCK",
      urls: [
        { name: "QPay", description: "QPay wallet", logo: "", link: "https://qpay.mn" },
      ],
    };
  } else {
    // TODO: call real QPay API
    res.status(503).json({
      success: false,
      error: { code: "PAYMENT_UNAVAILABLE", message: "QPay тохиргоо хийгдээгүй байна" },
    });
    return;
  }

  const payment = await prisma.payment.upsert({
    where: { orderId: order.id },
    create: {
      orderId: order.id,
      provider: "qpay",
      amountMnt: order.totalMnt,
      status: "pending",
      externalId: qpayData.invoice_id as string,
    },
    update: {
      externalId: qpayData.invoice_id as string,
      status: "pending",
    },
  });

  // In dev mock mode, auto-confirm payment and send SMS
  if (isMockMode) {
    const user = await prisma.user.findUnique({ where: { id: order.userId } });
    await prisma.$transaction([
      prisma.payment.update({
        where: { id: payment.id },
        data: { status: "paid", paidAt: new Date() },
      }),
      prisma.order.update({ where: { id: order.id }, data: { status: "confirmed" } }),
      prisma.orderStatusLog.create({
        data: {
          orderId: order.id,
          fromStatus: "pending",
          toStatus: "confirmed",
          note: "Mock QPay — dev горим",
        },
      }),
    ]);
    if (user) {
      await enqueueSms({
        type: "order_confirmed",
        phone: user.phone,
        orderNumber: order.orderNumber,
      });
    }
  }

  res.json({ success: true, data: { payment_id: payment.id, qpay: qpayData } });
});

// POST /payments/qpay/callback — QPay webhook (no auth)
router.post("/qpay/callback", async (req, res) => {
  const result = z
    .object({
      payment_id: z.string(),
      invoice_id: z.string(),
      payment_status: z.string(),
    })
    .safeParse(req.body);

  if (!result.success) {
    res.status(200).json({ success: false });
    return;
  }

  const { invoice_id, payment_status } = result.data;

  const payment = await prisma.payment.findFirst({ where: { externalId: invoice_id } });
  if (!payment) {
    res.status(200).json({ success: false });
    return;
  }

  const isPaid = payment_status === "PAID" || payment_status === "paid";

  if (isPaid) {
    const order = await prisma.order.findUnique({
      where: { id: payment.orderId },
      include: { user: { select: { phone: true } } },
    });
    await prisma.$transaction([
      prisma.payment.update({
        where: { id: payment.id },
        data: { status: "paid", paidAt: new Date() },
      }),
      prisma.order.update({
        where: { id: payment.orderId },
        data: { status: "confirmed" },
      }),
      prisma.orderStatusLog.create({
        data: {
          orderId: payment.orderId,
          fromStatus: "pending",
          toStatus: "confirmed",
          note: "QPay төлбөр амжилттай",
        },
      }),
    ]);
    if (order) {
      await enqueueSms({
        type: "order_confirmed",
        phone: order.user.phone,
        orderNumber: order.orderNumber,
      });
    }
  } else {
    await prisma.payment.update({
      where: { id: payment.id },
      data: { status: "failed" },
    });
  }

  res.status(200).json({ success: true });
});

// GET /payments/:order_id — check payment status
router.get(
  "/:order_id",
  requireAuth("customer", "admin"),
  async (req: AuthRequest, res) => {
    const isAdmin = req.user!.role === "admin";

    const order = await prisma.order.findFirst({
      where: {
        id: String(req.params.order_id),
        ...(isAdmin ? {} : { userId: req.user!.sub }),
      },
      include: { payment: true },
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

    if (!order.payment) {
      res.json({ success: true, data: null });
      return;
    }

    res.json({ success: true, data: order.payment });
  }
);

export default router;
