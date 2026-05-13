import { Worker, Queue } from "bullmq";
import { PutObjectCommand } from "@aws-sdk/client-s3";
import { randomUUID } from "crypto";
import { prisma } from "../lib/prisma";
import { r2, getPublicUrl } from "../lib/r2";
import { getRates, toPriceMnt, calcCustomsFee } from "../lib/exchange-rate";

const connection = { url: process.env.REDIS_URL ?? "redis://localhost:6379" };

export type ScrapeJobData = { url: string };

export const scrapeQueue = new Queue<ScrapeJobData>("scrape-product", {
  connection,
  defaultJobOptions: {
    attempts: 3,
    backoff: { type: "exponential", delay: 10_000 },
    removeOnComplete: { count: 50 },
    removeOnFail: { count: 100 },
  },
});

// ── Helpers ────────────────────────────────────────────────────────────────────

function parseTaobaoId(url: string): string | null {
  try {
    return new URL(url).searchParams.get("id");
  } catch {
    return null;
  }
}

function parseAlibabaId(url: string): string | null {
  // https://www.alibaba.com/product-detail/xxx_123456789.html
  const match = url.match(/_(\d+)\.html/);
  return match?.[1] ?? null;
}

async function uploadImageToR2(imageUrl: string): Promise<string> {
  const res = await fetch(imageUrl);
  if (!res.ok) throw new Error(`Image fetch failed: ${res.status}`);

  const contentType = res.headers.get("content-type") ?? "image/jpeg";
  const ext = contentType.split("/")[1]?.replace("jpeg", "jpg") ?? "jpg";
  const key = `products/${randomUUID()}.${ext}`;
  const body = Buffer.from(await res.arrayBuffer());

  await r2.send(
    new PutObjectCommand({
      Bucket: process.env.R2_BUCKET_NAME ?? "dropshipping-images",
      Key: key,
      Body: body,
      ContentType: contentType,
    })
  );

  return getPublicUrl(key);
}

// ── Scraping ───────────────────────────────────────────────────────────────────

interface ScrapedProduct {
  titleOriginal: string;
  titleMn: string;
  priceOriginal: number;
  currencyOriginal: "CNY" | "USD";
  imageUrls: string[];
  description?: string;
}

async function scrapeTaobao(itemId: string, sourceUrl: string): Promise<ScrapedProduct> {
  const apiKey = process.env.SCRAPER_API_KEY;

  if (!apiKey) {
    // Dev mock — replace with real scraping in production
    return {
      titleOriginal: `Taobao Product ${itemId}`,
      titleMn: `Taobao бараа ${itemId}`,
      priceOriginal: 29.9,
      currencyOriginal: "CNY",
      imageUrls: [],
    };
  }

  // Production: use ScraperAPI to bypass Taobao anti-bot
  // https://www.scraperapi.com — sign up and set SCRAPER_API_KEY
  const encodedUrl = encodeURIComponent(`https://item.taobao.com/item.htm?id=${itemId}`);
  const res = await fetch(
    `http://api.scraperapi.com?api_key=${apiKey}&url=${encodedUrl}&country_code=cn`,
    { signal: AbortSignal.timeout(30_000) }
  );
  if (!res.ok) throw new Error(`ScraperAPI error: ${res.status}`);

  // TODO: parse HTML response with cheerio or node-html-parser
  // Install: npm install cheerio -w apps/api
  // import * as cheerio from "cheerio";
  // const $ = cheerio.load(await res.text());
  // const title = $("h3.tb-main-title").text().trim();
  // const price = parseFloat($("em.tb-rmb-num").text());
  throw new Error(
    "Taobao HTML parser not yet implemented. See TODO in scraper.worker.ts"
  );
}

async function scrapeAlibaba(itemId: string, sourceUrl: string): Promise<ScrapedProduct> {
  if (!process.env.SCRAPER_API_KEY) {
    return {
      titleOriginal: `Alibaba Product ${itemId}`,
      titleMn: `Alibaba бараа ${itemId}`,
      priceOriginal: 15.0,
      currencyOriginal: "USD",
      imageUrls: [],
    };
  }

  // TODO: Alibaba HTML parsing — same ScraperAPI approach as Taobao
  throw new Error("Alibaba scraper not yet implemented.");
}

// ── Worker ─────────────────────────────────────────────────────────────────────

export function startScraperWorker() {
  const worker = new Worker<ScrapeJobData>(
    "scrape-product",
    async (job) => {
      const { url } = job.data;
      let platform: "taobao" | "alibaba";
      let itemId: string | null;

      if (url.includes("taobao.com") || url.includes("tmall.com")) {
        platform = "taobao";
        itemId = parseTaobaoId(url);
      } else if (url.includes("alibaba.com") || url.includes("1688.com")) {
        platform = "alibaba";
        itemId = parseAlibabaId(url);
      } else {
        throw new Error(`Unsupported platform URL: ${url}`);
      }

      if (!itemId) throw new Error(`Cannot parse item ID from: ${url}`);

      const scraped =
        platform === "taobao"
          ? await scrapeTaobao(itemId, url)
          : await scrapeAlibaba(itemId, url);

      const rates = await getRates();
      const base = toPriceMnt(scraped.priceOriginal, scraped.currencyOriginal, rates);
      const customsFee = calcCustomsFee(base);
      const priceMnt = base;

      // Upload images to R2 (max 5)
      const images: { url: string; is_primary: boolean }[] = [];
      for (let i = 0; i < Math.min(scraped.imageUrls.length, 5); i++) {
        try {
          const imgUrl = scraped.imageUrls[i];
          if (!imgUrl) continue;
          const r2Url = await uploadImageToR2(imgUrl);
          images.push({ url: r2Url, is_primary: i === 0 });
        } catch (e) {
          console.warn(`[Scraper] Image ${i} upload skipped: ${e}`);
        }
      }

      const existing = await prisma.product.findUnique({
        where: {
          sourcePlatform_sourceId: { sourcePlatform: platform, sourceId: itemId },
        },
      });

      if (existing) {
        await prisma.product.update({
          where: { id: existing.id },
          data: {
            priceOriginal: scraped.priceOriginal,
            priceMnt,
            customsFee,
            syncedAt: new Date(),
            ...(images.length > 0 && { images }),
          },
        });
        console.log(`[Scraper] Updated ${platform}:${itemId}`);
      } else {
        await prisma.product.create({
          data: {
            sourcePlatform: platform,
            sourceUrl: url,
            sourceId: itemId,
            titleMn: scraped.titleMn,
            titleOriginal: scraped.titleOriginal,
            descriptionMn: scraped.description ?? null,
            priceOriginal: scraped.priceOriginal,
            currencyOriginal: scraped.currencyOriginal,
            priceMnt,
            customsFee,
            images,
            stockStatus: "in_stock",
            status: "active",
          },
        });
        console.log(`[Scraper] Created ${platform}:${itemId}`);
      }
    },
    { connection, concurrency: 3 }
  );

  worker.on("completed", (job) => console.log(`[Scraper] ✓ job ${job.id}`));
  worker.on("failed", (job, err) =>
    console.error(`[Scraper] ✗ job ${job?.id}: ${err.message}`)
  );

  return worker;
}
