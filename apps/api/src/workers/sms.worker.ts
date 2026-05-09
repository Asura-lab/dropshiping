import { Worker, type Job } from "bullmq";
import type { SmsJobData } from "../lib/queue";

const SMS_TEMPLATES: Record<string, (data: SmsJobData) => string> = {
  order_confirmed: (d) => {
    const j = d as Extract<SmsJobData, { type: "order_confirmed" }>;
    return `SHUUD: Таны ${j.orderNumber} дугаартай захиалга баталгаажлаа. Дэлгэрэнгүйг апп-аас харна уу.`;
  },
  order_ready_pickup: (d) => {
    const j = d as Extract<SmsJobData, { type: "order_ready_pickup" }>;
    const time = new Date(j.slotDatetime).toLocaleString("mn-MN", {
      month: "short",
      day: "numeric",
      hour: "2-digit",
      minute: "2-digit",
    });
    return `SHUUD: ${j.orderNumber} захиалга авахад бэлэн боллоо. Авах цаг: ${time}`;
  },
  slot_reminder: (d) => {
    const j = d as Extract<SmsJobData, { type: "slot_reminder" }>;
    const time = new Date(j.slotDatetime).toLocaleString("mn-MN", {
      hour: "2-digit",
      minute: "2-digit",
    });
    return `SHUUD: Сануулга — ${j.orderNumber} захиалгаа өнөөдөр ${time} цагт авна уу.`;
  },
};

async function sendSms(phone: string, message: string) {
  const apiKey = process.env.SMS_API_KEY;
  if (!apiKey) {
    console.log(`[SMS DEV] To: ${phone}\n  Msg: ${message}`);
    return;
  }

  // Mongolian SMS API (MobiFinance / Unitel etc.)
  const res = await fetch("https://sms.unitel.mn/sendmessage", {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      Authorization: `Bearer ${apiKey}`,
    },
    body: JSON.stringify({
      phone,
      message,
      from: process.env.SMS_SENDER_ID ?? "SHUUD",
    }),
  });

  if (!res.ok) {
    throw new Error(`SMS API error: ${res.status}`);
  }
}

export function startSmsWorker() {
  const worker = new Worker<SmsJobData>(
    "sms",
    async (job: Job<SmsJobData>) => {
      const data = job.data;
      const template = SMS_TEMPLATES[data.type];
      if (!template) {
        console.warn(`[SMS] Unknown job type: ${data.type}`);
        return;
      }
      const message = template(data);
      await sendSms(data.phone, message);
    },
    {
      connection: { url: process.env.REDIS_URL ?? "redis://localhost:6379" },
      concurrency: 5,
    }
  );

  worker.on("completed", (job) => {
    console.log(`[SMS] ✓ ${job.name} (${job.id})`);
  });

  worker.on("failed", (job, err) => {
    console.error(`[SMS] ✗ ${job?.name} (${job?.id}): ${err.message}`);
  });

  return worker;
}
