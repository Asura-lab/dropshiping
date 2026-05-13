import { createHmac, createHash } from "crypto";
import { redis } from "./redis";
import { getRates, toPriceMnt, calcCustomsFee } from "./exchange-rate";
import { prisma } from "./prisma";

// ── Config ────────────────────────────────────────────────────────────────────

const MARKETPLACE = process.env.AMAZON_MARKETPLACE ?? "www.amazon.com";
const HOST = `webservices.${MARKETPLACE.replace("www.", "")}`;
const REGION = process.env.AMAZON_REGION ?? "us-east-1";
const ACCESS_KEY = process.env.AMAZON_ACCESS_KEY ?? "";
const SECRET_KEY = process.env.AMAZON_SECRET_KEY ?? "";
const PARTNER_TAG = process.env.AMAZON_PARTNER_TAG ?? "";

const SEARCH_TTL = 60 * 60; // 1 hour
const PRODUCT_TTL = 24 * 60 * 60; // 24 hours

// ── AWS SigV4 ─────────────────────────────────────────────────────────────────

function sha256hex(data: string) {
  return createHash("sha256").update(data, "utf8").digest("hex");
}

function hmac(key: Buffer | string, data: string): Buffer {
  return createHmac("sha256", key).update(data, "utf8").digest();
}

function buildSigningKey(dateStamp: string): Buffer {
  const kDate = hmac("AWS4" + SECRET_KEY, dateStamp);
  const kRegion = hmac(kDate, REGION);
  const kService = hmac(kRegion, "ProductAdvertisingAPI");
  return hmac(kService, "aws4_request");
}

async function paApiRequest(
  operation: string,
  payload: Record<string, unknown>
): Promise<Record<string, unknown>> {
  const now = new Date();
  const amzDate =
    now.toISOString().replace(/[-:]/g, "").replace(/\.\d+/, "").slice(0, 15) + "Z";
  const dateStamp = amzDate.slice(0, 8);
  const path = `/paapi5/${operation.toLowerCase()}`;
  const target = `com.amazon.paapi5.v1.ProductAdvertisingAPIv1.${operation}`;

  const body = JSON.stringify({
    ...payload,
    PartnerTag: PARTNER_TAG,
    PartnerType: "Associates",
    Marketplace: MARKETPLACE,
  });

  const payloadHash = sha256hex(body);
  const canonicalHeaders =
    `content-encoding:amz-1.0\n` +
    `content-type:application/json; charset=utf-8\n` +
    `host:${HOST}\n` +
    `x-amz-date:${amzDate}\n` +
    `x-amz-target:${target}\n`;
  const signedHeaders = "content-encoding;content-type;host;x-amz-date;x-amz-target";
  const canonicalReq = `POST\n${path}\n\n${canonicalHeaders}\n${signedHeaders}\n${payloadHash}`;

  const credScope = `${dateStamp}/${REGION}/ProductAdvertisingAPI/aws4_request`;
  const stringToSign = `AWS4-HMAC-SHA256\n${amzDate}\n${credScope}\n${sha256hex(canonicalReq)}`;
  const signature = createHmac("sha256", buildSigningKey(dateStamp))
    .update(stringToSign)
    .digest("hex");

  const res = await fetch(`https://${HOST}${path}`, {
    method: "POST",
    headers: {
      "Content-Type": "application/json; charset=utf-8",
      "Content-Encoding": "amz-1.0",
      Host: HOST,
      "X-Amz-Date": amzDate,
      "X-Amz-Target": target,
      Authorization: `AWS4-HMAC-SHA256 Credential=${ACCESS_KEY}/${credScope}, SignedHeaders=${signedHeaders}, Signature=${signature}`,
    },
    body,
    signal: AbortSignal.timeout(15_000),
  });

  if (!res.ok) {
    const text = await res.text();
    throw new Error(`Amazon PA API ${res.status}: ${text.slice(0, 300)}`);
  }

  return res.json() as Promise<Record<string, unknown>>;
}

// ── Types ─────────────────────────────────────────────────────────────────────

export interface AmazonProduct {
  asin: string;
  title: string;
  priceUsd: number | null;
  imageUrl: string | null;
  images: string[];
  sourceUrl: string;
  category: string | null;
  features: string[];
  brand: string | null;
}

// ── Parser ────────────────────────────────────────────────────────────────────

function parseItem(item: Record<string, unknown>): AmazonProduct {
  const asin = item["ASIN"] as string;
  const info = (item["ItemInfo"] as Record<string, unknown>) ?? {};

  const title =
    ((info["Title"] as Record<string, unknown>)?.["DisplayValue"] as string) ?? "";

  const category =
    ((
      (info["Classifications"] as Record<string, unknown>)?.["ProductGroup"] as Record<
        string,
        unknown
      >
    )?.["DisplayValue"] as string) ?? null;

  const brand =
    ((
      (info["ByLineInfo"] as Record<string, unknown>)?.["Brand"] as Record<
        string,
        unknown
      >
    )?.["DisplayValue"] as string) ?? null;

  const features =
    ((info["Features"] as Record<string, unknown>)?.["DisplayValues"] as string[]) ?? [];

  const listings =
    ((item["Offers"] as Record<string, unknown>)?.["Listings"] as Record<
      string,
      unknown
    >[]) ?? [];
  const priceUsd =
    ((listings[0]?.["Price"] as Record<string, unknown>)?.["Amount"] as number) ?? null;

  const imgBlock = (item["Images"] as Record<string, unknown>) ?? {};
  const primaryUrl =
    ((
      (imgBlock["Primary"] as Record<string, unknown>)?.["Large"] as Record<
        string,
        unknown
      >
    )?.["URL"] as string) ?? null;
  const variantUrls = ((imgBlock["Variants"] as Record<string, unknown>[]) ?? [])
    .map((v) => ((v["Large"] as Record<string, unknown>)?.["URL"] as string) ?? null)
    .filter((u): u is string => !!u);

  const images = [primaryUrl, ...variantUrls].filter((u): u is string => !!u);

  return {
    asin,
    title,
    priceUsd,
    imageUrl: primaryUrl,
    images,
    sourceUrl: `https://${MARKETPLACE}/dp/${asin}${PARTNER_TAG ? `?tag=${PARTNER_TAG}` : ""}`,
    category,
    features,
    brand,
  };
}

// ── Mock (dev mode — no credentials needed) ───────────────────────────────────

function mockProducts(query: string, page: number): AmazonProduct[] {
  return Array.from({ length: 8 }, (_, i) => {
    const num = (page - 1) * 8 + i + 1;
    return {
      asin: `B0MOCK${String(num).padStart(4, "0")}`,
      title: `[Dev] ${query} — Product ${num}`,
      priceUsd: parseFloat((10 + num * 3.5).toFixed(2)),
      imageUrl: null,
      images: [],
      sourceUrl: `https://www.amazon.com/dp/B0MOCK${String(num).padStart(4, "0")}`,
      category: "Electronics",
      features: ["Feature A", "Feature B"],
      brand: "MockBrand",
    };
  });
}

function mockProduct(asin: string): AmazonProduct {
  return {
    asin,
    title: `[Dev] Amazon Product ${asin}`,
    priceUsd: 29.99,
    imageUrl: null,
    images: [],
    sourceUrl: `https://www.amazon.com/dp/${asin}`,
    category: "Electronics",
    features: ["Mock feature 1", "Mock feature 2", "Mock feature 3"],
    brand: "MockBrand",
  };
}

// ── PA API Resources ──────────────────────────────────────────────────────────

const SEARCH_RESOURCES = [
  "Images.Primary.Large",
  "ItemInfo.Title",
  "ItemInfo.Classifications",
  "Offers.Listings.Price",
];

const DETAIL_RESOURCES = [
  ...SEARCH_RESOURCES,
  "Images.Variants.Large",
  "ItemInfo.Features",
  "ItemInfo.ByLineInfo",
];

// ── Public functions ──────────────────────────────────────────────────────────

export async function searchAmazon(query: string, page = 1): Promise<AmazonProduct[]> {
  const cacheKey = `amazon:search:${Buffer.from(`${query}:${page}`).toString("base64url")}`;
  const cached = await redis.get(cacheKey);
  if (cached) return JSON.parse(cached) as AmazonProduct[];

  let products: AmazonProduct[];

  if (!ACCESS_KEY || !SECRET_KEY || !PARTNER_TAG) {
    products = mockProducts(query, page);
  } else {
    const data = await paApiRequest("SearchItems", {
      Keywords: query,
      SearchIndex: "All",
      ItemCount: 10,
      ItemPage: page,
      Resources: SEARCH_RESOURCES,
    });
    const items =
      ((data["SearchResult"] as Record<string, unknown>)?.["Items"] as Record<
        string,
        unknown
      >[]) ?? [];
    products = items.map(parseItem);
  }

  await redis.set(cacheKey, JSON.stringify(products), { EX: SEARCH_TTL });
  return products;
}

export async function getAmazonProduct(asin: string): Promise<AmazonProduct | null> {
  const cacheKey = `amazon:product:${asin}`;
  const cached = await redis.get(cacheKey);
  if (cached) return JSON.parse(cached) as AmazonProduct;

  let product: AmazonProduct;

  if (!ACCESS_KEY || !SECRET_KEY || !PARTNER_TAG) {
    product = mockProduct(asin);
  } else {
    const data = await paApiRequest("GetItems", {
      ItemIds: [asin],
      Resources: DETAIL_RESOURCES,
    });
    const items =
      ((data["ItemsResult"] as Record<string, unknown>)?.["Items"] as Record<
        string,
        unknown
      >[]) ?? [];
    if (!items.length) return null;
    product = parseItem(items[0]!);
  }

  await redis.set(cacheKey, JSON.stringify(product), { EX: PRODUCT_TTL });
  return product;
}

// Auto-save to DB so the product can be ordered
export async function upsertAmazonProductToDB(amazon: AmazonProduct): Promise<string> {
  const rates = await getRates();
  const priceUsd = amazon.priceUsd ?? 0;
  const priceMnt = toPriceMnt(priceUsd, "USD", rates);
  const customsFee = calcCustomsFee(priceMnt);
  const images = amazon.images
    .slice(0, 5)
    .map((url, i) => ({ url, is_primary: i === 0 }));

  const product = await prisma.product.upsert({
    where: {
      sourcePlatform_sourceId: { sourcePlatform: "amazon", sourceId: amazon.asin },
    },
    create: {
      sourcePlatform: "amazon",
      sourceId: amazon.asin,
      sourceUrl: amazon.sourceUrl,
      titleMn: amazon.title,
      titleOriginal: amazon.title,
      priceOriginal: priceUsd,
      currencyOriginal: "USD",
      priceMnt,
      customsFee,
      images,
      category: amazon.category,
      stockStatus: "in_stock",
      status: "active",
    },
    update: {
      priceOriginal: priceUsd,
      priceMnt,
      customsFee,
      syncedAt: new Date(),
      ...(images.length > 0 && { images }),
    },
    select: { id: true },
  });

  return product.id;
}
