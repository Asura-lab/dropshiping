import { Queue } from "bullmq";
import { redis } from "./redis";

const connection = {
  url: process.env.REDIS_URL ?? "redis://localhost:6379",
};

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
  | { type: "slot_reminder"; phone: string; orderNumber: string; slotDatetime: string };

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
