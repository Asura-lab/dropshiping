import crypto from "crypto";
import { Router } from "express";
import { z } from "zod";
import { prisma } from "../lib/prisma";
import { requireAuth, type AuthRequest } from "../middleware/auth";
import { enqueueSms, enqueueSourceOrder } from "../lib/queue";

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
    // Enqueue source orders for each item
    const items = await prisma.orderItem.findMany({
      where: { orderId: order.id },
      include: { product: { select: { sourcePlatform: true } } },
    });
    for (const item of items) {
      await enqueueSourceOrder({
        orderItemId: item.id,
        platform: item.product.sourcePlatform,
        orderNumber: order.orderNumber,
        customerPhone: user?.phone ?? "",
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
      // Enqueue source orders for each item
      const items = await prisma.orderItem.findMany({
        where: { orderId: order.id },
        include: { product: { select: { sourcePlatform: true } } },
      });
      for (const item of items) {
        await enqueueSourceOrder({
          orderItemId: item.id,
          platform: item.product.sourcePlatform,
          orderNumber: order.orderNumber,
          customerPhone: order.user.phone,
        });
      }
    }
  } else {
    await prisma.payment.update({
      where: { id: payment.id },
      data: { status: "failed" },
    });
  }

  res.status(200).json({ success: true });
});

// ── SocialPay ──────────────────────────────────────────────────────────────────

const SOCIALPAY_BASE = "https://ecommerce.socialpay.mn/api";

async function createSocialPayInvoice(params: {
  orderId: string;
  amount: number;
  description: string;
  callbackUrl: string;
}): Promise<{ invoice: string; paymentUrl: string; qrImage: string }> {
  const terminal = process.env.SOCIALPAY_TERMINAL!;
  const key = process.env.SOCIALPAY_KEY!;
  const invoiceNo = `SP-${params.orderId.slice(-8).toUpperCase()}`;

  const payload = {
    amount: params.amount,
    checksum: crypto
      .createHmac("md5", key)
      .update(`${terminal}${invoiceNo}${params.amount}`)
      .digest("hex"),
    invoice: invoiceNo,
    terminal,
    description: params.description,
    phone: "",
    callback_url: params.callbackUrl,
    cancel_url: params.callbackUrl,
  };

  const res = await fetch(`${SOCIALPAY_BASE}/invoice`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(payload),
  });
  if (!res.ok) {
    throw new Error(`SocialPay API error: ${res.status}`);
  }
  const data = (await res.json()) as {
    invoice: string;
    qrCode?: string;
    paymentUrl?: string;
  };
  return {
    invoice: data.invoice,
    paymentUrl: data.paymentUrl ?? `${SOCIALPAY_BASE}/pay/${data.invoice}`,
    qrImage: data.qrCode ?? "",
  };
}

// POST /payments/socialpay
router.post(
  "/socialpay",
  requireAuth("customer", "admin"),
  async (req: AuthRequest, res) => {
    const result = z.object({ order_id: z.string().uuid() }).safeParse(req.body);
    if (!result.success) {
      res.status(422).json({
        success: false,
        error: { code: "VALIDATION_ERROR", message: "order_id шаардлагатай" },
      });
      return;
    }

    const order = await prisma.order.findFirst({
      where: { id: result.data.order_id, userId: req.user!.sub, status: "pending" },
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

    if (order.payment?.status === "paid") {
      res.status(400).json({
        success: false,
        error: { code: "ALREADY_PAID", message: "Захиалга аль хэдийн төлөгдсөн" },
      });
      return;
    }

    const isMockMode = !process.env.SOCIALPAY_TERMINAL || !process.env.SOCIALPAY_KEY;

    let socialPayData: { invoice: string; paymentUrl: string; qrImage: string };

    if (isMockMode) {
      socialPayData = {
        invoice: `MOCK-SP-${Date.now()}`,
        paymentUrl: "https://socialpay.mn",
        qrImage: "",
      };
    } else {
      try {
        const callbackUrl = `${process.env.API_BASE_URL ?? "http://localhost:4000"}/v1/payments/socialpay/callback`;
        socialPayData = await createSocialPayInvoice({
          orderId: order.id,
          amount: Number(order.totalMnt),
          description: `OmniFlow ${order.orderNumber}`,
          callbackUrl,
        });
      } catch (err) {
        res.status(503).json({
          success: false,
          error: {
            code: "PAYMENT_UNAVAILABLE",
            message: "SocialPay холбогдож чадсангүй",
          },
        });
        return;
      }
    }

    const payment = await prisma.payment.upsert({
      where: { orderId: order.id },
      create: {
        orderId: order.id,
        provider: "socialpay",
        amountMnt: order.totalMnt,
        status: "pending",
        externalId: socialPayData.invoice,
      },
      update: {
        provider: "socialpay",
        externalId: socialPayData.invoice,
        status: "pending",
      },
    });

    // Dev mock mode: auto-confirm immediately
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
            note: "Mock SocialPay — dev горим",
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
      const items = await prisma.orderItem.findMany({
        where: { orderId: order.id },
        include: { product: { select: { sourcePlatform: true } } },
      });
      for (const item of items) {
        await enqueueSourceOrder({
          orderItemId: item.id,
          platform: item.product.sourcePlatform,
          orderNumber: order.orderNumber,
          customerPhone: user?.phone ?? "",
        });
      }
    }

    res.json({
      success: true,
      data: {
        payment_id: payment.id,
        socialpay: {
          invoice: socialPayData.invoice,
          payment_url: socialPayData.paymentUrl,
          qr_image: socialPayData.qrImage,
        },
      },
    });
  }
);

// POST /payments/socialpay/callback — SocialPay webhook (no auth)
router.post("/socialpay/callback", async (req, res) => {
  const result = z
    .object({
      invoice: z.string(),
      status: z.string(),
      bank_transaction_id: z.string().optional(),
      checksum: z.string().optional(),
    })
    .safeParse(req.body);

  if (!result.success) {
    res.status(200).json({ success: false });
    return;
  }

  const { invoice, status, checksum } = result.data;

  // Verify HMAC checksum if credentials are set
  if (process.env.SOCIALPAY_KEY && checksum) {
    const expected = crypto
      .createHmac("md5", process.env.SOCIALPAY_KEY)
      .update(invoice)
      .digest("hex");
    if (expected !== checksum) {
      console.warn("[SocialPay] Invalid checksum, ignoring callback");
      res.status(200).json({ success: false, error: "invalid_checksum" });
      return;
    }
  }

  const payment = await prisma.payment.findFirst({ where: { externalId: invoice } });
  if (!payment) {
    res.status(200).json({ success: false });
    return;
  }

  const isPaid = status === "SUCCESS" || status === "paid";

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
          note: "SocialPay төлбөр амжилттай",
        },
      }),
    ]);
    if (order) {
      await enqueueSms({
        type: "order_confirmed",
        phone: order.user.phone,
        orderNumber: order.orderNumber,
      });
      const items = await prisma.orderItem.findMany({
        where: { orderId: order.id },
        include: { product: { select: { sourcePlatform: true } } },
      });
      for (const item of items) {
        await enqueueSourceOrder({
          orderItemId: item.id,
          platform: item.product.sourcePlatform,
          orderNumber: order.orderNumber,
          customerPhone: order.user.phone,
        });
      }
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
      res.status(404).json({
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
