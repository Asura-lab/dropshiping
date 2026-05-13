import { Queue } from "bullmq";
import { redis } from "./redis";
import type { ScrapeJobData } from "../workers/scraper.worker";
import type { SourceOrderJobData } from "../workers/source-order.worker";

const connection = {
  url: process.env.REDIS_URL ?? "redis://localhost:6379",
};

// ── SMS ────────────────────────────────────────────────────────────────────────

export const smsQueue = new Queue("sms", {
  connection,
  defaultJobOptions: {
    attempts: 3,
    backoff: { type: "exponential", delay: 5000 },
    removeOnComplete: { count: 100 },
    removeOnFail: { count: 200 },
  },
});

export type SmsJobData =
  | { type: "order_confirmed"; phone: string; orderNumber: string }
  | {
      type: "order_ready_pickup";
      phone: string;
      orderNumber: string;
      slotDatetime: string;
    }
  | { type: "slot_reminder"; phone: string; orderNumber: string; slotDatetime: string }
  | { type: "source_order_failed"; phone: string; orderNumber: string }
  | { type: "arrived_warehouse"; phone: string; orderNumber: string };

export async function enqueueSms(data: SmsJobData) {
  await smsQueue.add(data.type, data);
}

export async function enqueueSlotReminder(
  data: Extract<SmsJobData, { type: "slot_reminder" }>,
  slotDatetime: Date
) {
  const delay = slotDatetime.getTime() - 2 * 60 * 60 * 1000 - Date.now();
  if (delay > 0) {
    await smsQueue.add("slot_reminder", data, { delay });
  }
}

// ── Scraper ────────────────────────────────────────────────────────────────────

export const scrapeQueue = new Queue<ScrapeJobData>("scrape-product", {
  connection,
  defaultJobOptions: {
    attempts: 3,
    backoff: { type: "exponential", delay: 10_000 },
    removeOnComplete: { count: 50 },
    removeOnFail: { count: 100 },
  },
});

export async function enqueueScrape(data: ScrapeJobData) {
  const job = await scrapeQueue.add("scrape", data);
  return job.id;
}

// ── Source orders ──────────────────────────────────────────────────────────────

export const sourceOrderQueue = new Queue<SourceOrderJobData>("place-source-order", {
  connection,
  defaultJobOptions: {
    attempts: 4,
    backoff: { type: "exponential", delay: 5 * 60 * 1000 },
    removeOnComplete: { count: 200 },
    removeOnFail: { count: 500 },
  },
});

export async function enqueueSourceOrder(data: SourceOrderJobData) {
  await sourceOrderQueue.add("place", data);
}
