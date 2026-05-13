import { Worker, Queue } from "bullmq";
import { prisma } from "../lib/prisma";
import { enqueueSms } from "../lib/queue";

const connection = { url: process.env.REDIS_URL ?? "redis://localhost:6379" };

export type SourceOrderJobData = {
  orderItemId: string;
  platform: string;
  orderNumber: string;
  customerPhone: string;
};

export const sourceOrderQueue = new Queue<SourceOrderJobData>("place-source-order", {
  connection,
  defaultJobOptions: {
    // 4 total attempts: immediate → +5min → +10min → +20min
    attempts: 4,
    backoff: { type: "exponential", delay: 5 * 60 * 1000 },
    removeOnComplete: { count: 200 },
    removeOnFail: { count: 500 },
  },
});

// ── External platform ordering ─────────────────────────────────────────────────

async function placeOnTaobao(
  product: { sourceId: string },
  quantity: number
): Promise<string> {
  if (!process.env.TAOBAO_API_KEY) {
    // Dev mock
    console.log(`[SourceOrder] DEV MOCK taobao order: ${product.sourceId} x${quantity}`);
    return `MOCK-TB-${Date.now()}`;
  }
  // TODO: Taobao Open Platform API
  // POST https://eco.taobao.com/router/rest
  throw new Error("Taobao API not configured. Set TAOBAO_API_KEY.");
}

async function placeOnAlibaba(
  product: { sourceId: string },
  quantity: number
): Promise<string> {
  if (!process.env.ALIBABA_API_KEY) {
    console.log(`[SourceOrder] DEV MOCK alibaba order: ${product.sourceId} x${quantity}`);
    return `MOCK-AB-${Date.now()}`;
  }
  // TODO: Alibaba B2B API
  throw new Error("Alibaba API not configured. Set ALIBABA_API_KEY.");
}

// ── Worker ─────────────────────────────────────────────────────────────────────

export function startSourceOrderWorker() {
  const worker = new Worker<SourceOrderJobData>(
    "place-source-order",
    async (job) => {
      const { orderItemId, platform } = job.data;

      const orderItem = await prisma.orderItem.findUnique({
        where: { id: orderItemId },
        include: { product: true },
      });
      if (!orderItem) throw new Error(`OrderItem ${orderItemId} not found`);

      // Mark as processing (upsert in case first attempt)
      await prisma.sourceOrder.upsert({
        where: { orderItemId },
        create: {
          orderItemId,
          platform,
          status: "processing",
          retryCount: job.attemptsMade,
        },
        update: {
          status: "processing",
          retryCount: job.attemptsMade,
          errorMessage: null,
        },
      });

      const platformOrderId =
        platform === "taobao"
          ? await placeOnTaobao(orderItem.product, orderItem.quantity)
          : platform === "alibaba"
            ? await placeOnAlibaba(orderItem.product, orderItem.quantity)
            : (() => {
                throw new Error(`Unknown platform: ${platform}`);
              })();

      await prisma.sourceOrder.update({
        where: { orderItemId },
        data: {
          status: "placed",
          platformOrderId,
          placedAt: new Date(),
          errorMessage: null,
        },
      });
    },
    { connection, concurrency: 5 }
  );

  worker.on("failed", async (job, err) => {
    if (!job) return;
    const isLastAttempt = job.attemptsMade >= (job.opts.attempts ?? 4);
    if (!isLastAttempt) {
      console.warn(
        `[SourceOrder] ✗ attempt ${job.attemptsMade}/${job.opts.attempts}: ${err.message}`
      );
      return;
    }

    const { orderItemId, orderNumber } = job.data;
    try {
      await prisma.sourceOrder.update({
        where: { orderItemId },
        data: { status: "failed", errorMessage: err.message },
      });
      // Notify all admins
      const admins = await prisma.user.findMany({
        where: { role: "admin", isActive: true },
        select: { phone: true },
      });
      for (const admin of admins) {
        await enqueueSms({
          type: "source_order_failed",
          phone: admin.phone,
          orderNumber,
        });
      }
    } catch (e) {
      console.error("[SourceOrder] Failed to handle final failure:", e);
    }
    console.error(`[SourceOrder] ✗ FINAL FAILURE job ${job.id}: ${err.message}`);
  });

  worker.on("completed", (job) =>
    console.log(`[SourceOrder] ✓ job ${job.id} (item ${job.data.orderItemId})`)
  );

  return worker;
}
