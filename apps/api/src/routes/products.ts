import { Router } from "express";
import { z } from "zod";
import { prisma } from "../lib/prisma";

const router = Router();

// GET /products
router.get("/", async (req, res) => {
  const query = z
    .object({
      q: z.string().optional(),
      category: z.string().optional(),
      platform: z.enum(["taobao", "alibaba", "amazon"]).optional(),
      min_price: z.coerce.number().optional(),
      max_price: z.coerce.number().optional(),
      sort: z.enum(["price_asc", "price_desc", "newest"]).optional(),
      page: z.coerce.number().int().min(1).default(1),
      limit: z.coerce.number().int().min(1).max(100).default(20),
    })
    .safeParse(req.query);

  if (!query.success) {
    res
      .status(422)
      .json({
        success: false,
        error: { code: "VALIDATION_ERROR", message: "Query буруу" },
      });
    return;
  }

  const { q, category, platform, min_price, max_price, sort, page, limit } = query.data;

  const where = {
    status: "active",
    ...(q && { titleMn: { contains: q, mode: "insensitive" as const } }),
    ...(category && { category }),
    ...(platform && { sourcePlatform: platform }),
    ...(min_price !== undefined && { priceMnt: { gte: min_price } }),
    ...(max_price !== undefined && { priceMnt: { lte: max_price } }),
  };

  const orderBy =
    sort === "price_asc"
      ? { priceMnt: "asc" as const }
      : sort === "price_desc"
        ? { priceMnt: "desc" as const }
        : { createdAt: "desc" as const };

  const [total, products] = await Promise.all([
    prisma.product.count({ where }),
    prisma.product.findMany({
      where,
      orderBy,
      skip: (page - 1) * limit,
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
    meta: { total, page, limit, totalPages: Math.ceil(total / limit) },
  });
});

// GET /products/:id
router.get("/:id", async (req, res) => {
  const product = await prisma.product.findFirst({
    where: { id: req.params.id, status: "active" },
  });

  if (!product) {
    res
      .status(404)
      .json({
        success: false,
        error: { code: "PRODUCT_NOT_FOUND", message: "Бараа олдсонгүй" },
      });
    return;
  }

  res.json({ success: true, data: product });
});

export default router;
