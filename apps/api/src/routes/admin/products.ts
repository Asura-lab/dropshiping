import { Router } from "express";
import { z } from "zod";
import { prisma } from "../../lib/prisma";
import { requireAuth } from "../../middleware/auth";

const router = Router();
router.use(requireAuth("admin"));

const productSchema = z.object({
  sourcePlatform: z.enum(["taobao", "alibaba", "amazon"]),
  sourceUrl: z.string().url(),
  sourceId: z.string().min(1),
  titleMn: z.string().min(1),
  titleOriginal: z.string().min(1),
  descriptionMn: z.string().optional(),
  priceOriginal: z.number().positive(),
  currencyOriginal: z.enum(["CNY", "USD", "KRW"]),
  priceMnt: z.number().positive(),
  customsFee: z.number().min(0).default(0),
  shippingFee: z.number().min(0).default(0),
  images: z
    .array(z.object({ url: z.string().url(), is_primary: z.boolean() }))
    .default([]),
  category: z.string().optional(),
  stockStatus: z.enum(["in_stock", "out_of_stock", "unknown"]).default("in_stock"),
});

// GET /admin/products
router.get("/", async (_req, res) => {
  const products = await prisma.product.findMany({
    where: { status: { not: "deleted" } },
    orderBy: { createdAt: "desc" },
  });
  res.json({ success: true, data: products });
});

// POST /admin/products
router.post("/", async (req, res) => {
  const result = productSchema.safeParse(req.body);
  if (!result.success) {
    res
      .status(422)
      .json({
        success: false,
        error: { code: "VALIDATION_ERROR", message: result.error.errors[0]?.message },
      });
    return;
  }
  const d = result.data;
  const product = await prisma.product.create({
    data: {
      sourcePlatform: d.sourcePlatform,
      sourceUrl: d.sourceUrl,
      sourceId: d.sourceId,
      titleMn: d.titleMn,
      titleOriginal: d.titleOriginal,
      descriptionMn: d.descriptionMn ?? null,
      priceOriginal: d.priceOriginal,
      currencyOriginal: d.currencyOriginal,
      priceMnt: d.priceMnt,
      customsFee: d.customsFee,
      shippingFee: d.shippingFee,
      images: d.images,
      category: d.category ?? null,
      stockStatus: d.stockStatus,
    },
  });
  res.status(201).json({ success: true, data: product });
});

// PATCH /admin/products/:id
router.patch("/:id", async (req, res) => {
  const result = productSchema.partial().safeParse(req.body);
  if (!result.success) {
    res
      .status(422)
      .json({
        success: false,
        error: { code: "VALIDATION_ERROR", message: result.error.errors[0]?.message },
      });
    return;
  }
  const existing = await prisma.product.findUnique({ where: { id: req.params.id } });
  if (!existing || existing.status === "deleted") {
    res
      .status(404)
      .json({ success: false, error: { code: "NOT_FOUND", message: "Бараа олдсонгүй" } });
    return;
  }
  const d = result.data;
  const patch: Record<string, unknown> = {};
  if (d.sourcePlatform !== undefined) patch.sourcePlatform = d.sourcePlatform;
  if (d.sourceUrl !== undefined) patch.sourceUrl = d.sourceUrl;
  if (d.sourceId !== undefined) patch.sourceId = d.sourceId;
  if (d.titleMn !== undefined) patch.titleMn = d.titleMn;
  if (d.titleOriginal !== undefined) patch.titleOriginal = d.titleOriginal;
  if (d.descriptionMn !== undefined) patch.descriptionMn = d.descriptionMn ?? null;
  if (d.priceOriginal !== undefined) patch.priceOriginal = d.priceOriginal;
  if (d.currencyOriginal !== undefined) patch.currencyOriginal = d.currencyOriginal;
  if (d.priceMnt !== undefined) patch.priceMnt = d.priceMnt;
  if (d.customsFee !== undefined) patch.customsFee = d.customsFee;
  if (d.shippingFee !== undefined) patch.shippingFee = d.shippingFee;
  if (d.images !== undefined) patch.images = d.images;
  if (d.category !== undefined) patch.category = d.category ?? null;
  if (d.stockStatus !== undefined) patch.stockStatus = d.stockStatus;
  const product = await prisma.product.update({
    where: { id: String(req.params.id) },
    data: patch,
  });
  res.json({ success: true, data: product });
});

// DELETE /admin/products/:id
router.delete("/:id", async (req, res) => {
  const existing = await prisma.product.findUnique({
    where: { id: String(req.params.id) },
  });
  if (!existing || existing.status === "deleted") {
    res
      .status(404)
      .json({ success: false, error: { code: "NOT_FOUND", message: "Бараа олдсонгүй" } });
    return;
  }
  await prisma.product.update({
    where: { id: String(req.params.id) },
    data: { status: "deleted" },
  });
  res.json({ success: true, data: null });
});

export default router;
