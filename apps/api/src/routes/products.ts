import { Router } from "express";
import { z } from "zod";
import { prisma } from "../lib/prisma";
import { searchAmazon, getAmazonProduct, upsertAmazonProductToDB } from "../lib/amazon";
import { getRates, toPriceMnt, calcCustomsFee } from "../lib/exchange-rate";

const router = Router();

// GET /products/search?q=...&page=1 — Amazon real-time search (cached 1h)
router.get("/search", async (req, res) => {
  const query = z
    .object({
      q: z.string().min(1, "Хайлтын үг шаардлагатай"),
      page: z.coerce.number().int().min(1).default(1),
    })
    .safeParse(req.query);

  if (!query.success) {
    res.status(422).json({
      success: false,
      error: { code: "VALIDATION_ERROR", message: query.error.errors[0]?.message },
    });
    return;
  }

  const products = await searchAmazon(query.data.q, query.data.page);
  const rates = await getRates();

  const data = products.map((p) => {
    const priceMnt = p.priceUsd ? toPriceMnt(p.priceUsd, "USD", rates) : null;
    return {
      asin: p.asin,
      title: p.title,
      imageUrl: p.imageUrl,
      priceUsd: p.priceUsd,
      priceMnt,
      sourceUrl: p.sourceUrl,
      category: p.category,
      platform: "amazon",
    };
  });

  res.json({ success: true, data, meta: { page: query.data.page, q: query.data.q } });
});

// GET /products/amazon/:asin — Amazon product detail, auto-saved to DB for ordering
router.get("/amazon/:asin", async (req, res) => {
  const asin = String(req.params.asin).toUpperCase();

  const amazon = await getAmazonProduct(asin);
  if (!amazon) {
    res.status(404).json({
      success: false,
      error: { code: "NOT_FOUND", message: "Amazon бараа олдсонгүй" },
    });
    return;
  }

  // Persist to DB so orders can reference it
  const dbId = await upsertAmazonProductToDB(amazon);
  const rates = await getRates();
  const priceMnt = amazon.priceUsd ? toPriceMnt(amazon.priceUsd, "USD", rates) : null;
  const customsFee = priceMnt ? calcCustomsFee(priceMnt) : 0;

  res.json({
    success: true,
    data: {
      id: dbId, // use this for POST /orders
      asin: amazon.asin,
      title: amazon.title,
      brand: amazon.brand,
      category: amazon.category,
      features: amazon.features,
      imageUrl: amazon.imageUrl,
      images: amazon.images,
      priceUsd: amazon.priceUsd,
      priceMnt,
      customsFee,
      sourceUrl: amazon.sourceUrl,
      platform: "amazon",
    },
  });
});

// GET /products — supports both offset (page) and cursor pagination
// Cursor pagination: pass ?cursor=<last_item_id>&limit=20 → nextCursor in meta
router.get("/", async (req, res) => {
  const query = z
    .object({
      q: z.string().optional(),
      category: z.string().optional(),
      platform: z.enum(["taobao", "alibaba", "amazon"]).optional(),
      min_price: z.coerce.number().optional(),
      max_price: z.coerce.number().optional(),
      sort: z.enum(["price_asc", "price_desc", "newest"]).optional(),
      // offset pagination
      page: z.coerce.number().int().min(1).optional(),
      // cursor pagination (takes precedence over page when provided)
      cursor: z.string().optional(),
      limit: z.coerce.number().int().min(1).max(100).default(20),
    })
    .safeParse(req.query);

  if (!query.success) {
    res.status(422).json({
      success: false,
      error: { code: "VALIDATION_ERROR", message: "Query буруу" },
    });
    return;
  }

  const { q, category, platform, min_price, max_price, sort, page, cursor, limit } =
    query.data;

  const where = {
    status: "active",
    ...(q && { titleMn: { contains: q, mode: "insensitive" as const } }),
    ...(category && { category }),
    ...(platform && { sourcePlatform: platform }),
    ...(min_price !== undefined && { priceMnt: { gte: min_price } }),
    ...(max_price !== undefined && { priceMnt: { lte: max_price } }),
  };

  // Cursor pagination only supports createdAt desc ordering
  const isCursor = !!cursor;
  const orderBy = isCursor
    ? { createdAt: "desc" as const }
    : sort === "price_asc"
      ? { priceMnt: "asc" as const }
      : sort === "price_desc"
        ? { priceMnt: "desc" as const }
        : { createdAt: "desc" as const };

  if (isCursor) {
    // Fetch one extra to determine if there's a next page
    const products = await prisma.product.findMany({
      where,
      orderBy,
      take: limit + 1,
      cursor: { id: cursor },
      skip: 1,
      select: {
        id: true,
        titleMn: true,
        priceMnt: true,
        images: true,
        sourcePlatform: true,
        stockStatus: true,
        category: true,
      },
    });

    const hasNextPage = products.length > limit;
    const items = hasNextPage ? products.slice(0, limit) : products;
    const nextCursor = hasNextPage ? items[items.length - 1]?.id : null;

    res.json({
      success: true,
      data: items,
      meta: { limit, nextCursor, hasNextPage },
    });
    return;
  }

  const currentPage = page ?? 1;
  const [total, products] = await Promise.all([
    prisma.product.count({ where }),
    prisma.product.findMany({
      where,
      orderBy,
      skip: (currentPage - 1) * limit,
      take: limit,
      select: {
        id: true,
        titleMn: true,
        priceMnt: true,
        images: true,
        sourcePlatform: true,
        stockStatus: true,
        category: true,
      },
    }),
  ]);

  res.json({
    success: true,
    data: products,
    meta: { total, page: currentPage, limit, totalPages: Math.ceil(total / limit) },
  });
});

// GET /products/:id
router.get("/:id", async (req, res) => {
  const product = await prisma.product.findFirst({
    where: { id: req.params.id, status: "active" },
  });

  if (!product) {
    res.status(404).json({
      success: false,
      error: { code: "PRODUCT_NOT_FOUND", message: "Бараа олдсонгүй" },
    });
    return;
  }

  res.json({ success: true, data: product });
});

export default router;
