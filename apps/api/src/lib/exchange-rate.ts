import { redis } from "./redis";
import { prisma } from "./prisma";

const REDIS_TTL = 25 * 60 * 60; // 25h — next cron overwrites before expiry

export async function fetchAndStoreRates(): Promise<{ CNY: number; USD: number }> {
  const res = await fetch("https://open.er-api.com/v6/latest/USD");
  if (!res.ok) throw new Error(`Exchange rate API: ${res.status}`);

  const json = (await res.json()) as { rates: Record<string, number> };
  const mntPerUsd = json.rates["MNT"] ?? 3450;
  const cnyPerUsd = json.rates["CNY"] ?? 7.2;
  const mntPerCny = mntPerUsd / cnyPerUsd;

  await Promise.all([
    redis.set("exchange_rate:CNY", mntPerCny.toFixed(4), { EX: REDIS_TTL }),
    redis.set("exchange_rate:USD", mntPerUsd.toFixed(4), { EX: REDIS_TTL }),
  ]);

  console.log(
    `[ExchangeRate] 1 CNY = ${mntPerCny.toFixed(0)}₮  |  1 USD = ${mntPerUsd.toFixed(0)}₮`
  );
  return { CNY: mntPerCny, USD: mntPerUsd };
}

export async function getRates(): Promise<{ CNY: number; USD: number }> {
  const [cny, usd] = await Promise.all([
    redis.get("exchange_rate:CNY"),
    redis.get("exchange_rate:USD"),
  ]);
  if (cny && usd) return { CNY: parseFloat(cny), USD: parseFloat(usd) };
  return fetchAndStoreRates();
}

export function toPriceMnt(
  priceOriginal: number,
  currency: string,
  rates: { CNY: number; USD: number }
): number {
  const rate = currency === "CNY" ? rates.CNY : currency === "USD" ? rates.USD : 1;
  return Math.round(priceOriginal * rate);
}

// Mongolia customs: 5% on amount above 150,000₮ threshold
export function calcCustomsFee(priceMnt: number): number {
  const THRESHOLD = 150_000;
  if (priceMnt <= THRESHOLD) return 0;
  return Math.round((priceMnt - THRESHOLD) * 0.05);
}

// Recalculate and persist priceMnt + customsFee for all non-deleted products
export async function syncProductPrices(rates: { CNY: number; USD: number }) {
  const products = await prisma.product.findMany({
    where: { status: { not: "deleted" } },
    select: { id: true, priceOriginal: true, currencyOriginal: true, shippingFee: true },
  });

  for (const p of products) {
    const base = toPriceMnt(Number(p.priceOriginal), p.currencyOriginal, rates);
    const customsFee = calcCustomsFee(base);
    const priceMnt = base + Number(p.shippingFee);
    await prisma.product.update({
      where: { id: p.id },
      data: { priceMnt, customsFee },
    });
  }

  console.log(`[ExchangeRate] Synced prices for ${products.length} products`);
}
