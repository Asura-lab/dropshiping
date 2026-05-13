import { Worker, Queue } from "bullmq";
import { fetchAndStoreRates, syncProductPrices } from "../lib/exchange-rate";

const connection = { url: process.env.REDIS_URL ?? "redis://localhost:6379" };
const QUEUE_NAME = "sync-exchange-rate";

export function startExchangeRateWorker() {
  const queue = new Queue(QUEUE_NAME, { connection });

  // Daily at 08:00 Ulaanbaatar time = 00:00 UTC (UTC+8)
  queue.add(
    "daily-sync",
    {},
    {
      repeat: { pattern: "0 0 * * *", utc: true },
      jobId: "exchange-rate-daily",
    }
  );

  const worker = new Worker(
    QUEUE_NAME,
    async () => {
      const rates = await fetchAndStoreRates();
      await syncProductPrices(rates);
    },
    { connection }
  );

  worker.on("completed", () => console.log("[ExchangeRate] ✓ daily sync done"));
  worker.on("failed", (_job, err) => console.error(`[ExchangeRate] ✗ ${err.message}`));

  return worker;
}
