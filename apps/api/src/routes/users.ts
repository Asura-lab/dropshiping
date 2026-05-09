import { Router } from "express";
import { z } from "zod";
import { prisma } from "../lib/prisma";
import { requireAuth, type AuthRequest } from "../middleware/auth";

const router = Router();
router.use(requireAuth("customer", "driver", "admin"));

// GET /users/me
router.get("/me", async (req: AuthRequest, res) => {
  const user = await prisma.user.findUnique({ where: { id: req.user!.sub } });
  if (!user) {
    res
      .status(404)
      .json({
        success: false,
        error: { code: "USER_NOT_FOUND", message: "Хэрэглэгч олдсонгүй" },
      });
    return;
  }
  res.json({
    success: true,
    data: {
      id: user.id,
      phone: user.phone,
      name: user.name,
      email: user.email,
      role: user.role,
    },
  });
});

// PATCH /users/me
router.patch("/me", async (req: AuthRequest, res) => {
  const result = z
    .object({ name: z.string().min(1).optional(), email: z.string().email().optional() })
    .safeParse(req.body);
  if (!result.success) {
    res
      .status(422)
      .json({
        success: false,
        error: { code: "VALIDATION_ERROR", message: "Өгөгдөл буруу" },
      });
    return;
  }
  const { name, email } = result.data;
  const user = await prisma.user.update({
    where: { id: req.user!.sub },
    data: { ...(name !== undefined && { name }), ...(email !== undefined && { email }) },
  });
  res.json({
    success: true,
    data: { id: user.id, phone: user.phone, name: user.name, email: user.email },
  });
});

// GET /users/me/addresses
router.get("/me/addresses", async (req: AuthRequest, res) => {
  const addresses = await prisma.address.findMany({
    where: { userId: req.user!.sub },
    orderBy: { createdAt: "asc" },
  });
  res.json({ success: true, data: addresses });
});

const addressSchema = z.object({
  label: z.string().optional(),
  duureg: z.string().min(1),
  khoroo: z.string().min(1),
  gudamj: z.string().optional(),
  bair: z.string().optional(),
  toot: z.string().optional(),
  note: z.string().optional(),
  is_default: z.boolean().optional(),
});

// POST /users/me/addresses
router.post("/me/addresses", async (req: AuthRequest, res) => {
  const result = addressSchema.safeParse(req.body);
  if (!result.success) {
    res
      .status(422)
      .json({
        success: false,
        error: { code: "VALIDATION_ERROR", message: "Хаяг буруу" },
      });
    return;
  }
  const { is_default, ...data } = result.data;
  if (is_default) {
    await prisma.address.updateMany({
      where: { userId: req.user!.sub },
      data: { isDefault: false },
    });
  }
  const address = await prisma.address.create({
    data: {
      userId: req.user!.sub,
      isDefault: is_default ?? false,
      duureg: data.duureg,
      khoroo: data.khoroo,
      label: data.label ?? null,
      gudamj: data.gudamj ?? null,
      bair: data.bair ?? null,
      toot: data.toot ?? null,
      note: data.note ?? null,
    },
  });
  res.status(201).json({ success: true, data: address });
});

// PATCH /users/me/addresses/:id
router.patch("/me/addresses/:id", async (req: AuthRequest, res) => {
  const result = addressSchema.partial().safeParse(req.body);
  if (!result.success) {
    res
      .status(422)
      .json({
        success: false,
        error: { code: "VALIDATION_ERROR", message: "Хаяг буруу" },
      });
    return;
  }
  const existing = await prisma.address.findFirst({
    where: { id: String(req.params.id), userId: req.user!.sub },
  });
  if (!existing) {
    res
      .status(404)
      .json({ success: false, error: { code: "NOT_FOUND", message: "Хаяг олдсонгүй" } });
    return;
  }
  const { is_default, ...data } = result.data;
  if (is_default) {
    await prisma.address.updateMany({
      where: { userId: req.user!.sub },
      data: { isDefault: false },
    });
  }
  const updateData: Record<string, unknown> = {};
  if (data.duureg !== undefined) updateData.duureg = data.duureg;
  if (data.khoroo !== undefined) updateData.khoroo = data.khoroo;
  if (data.label !== undefined) updateData.label = data.label ?? null;
  if (data.gudamj !== undefined) updateData.gudamj = data.gudamj ?? null;
  if (data.bair !== undefined) updateData.bair = data.bair ?? null;
  if (data.toot !== undefined) updateData.toot = data.toot ?? null;
  if (data.note !== undefined) updateData.note = data.note ?? null;
  if (is_default !== undefined) updateData.isDefault = is_default;
  const address = await prisma.address.update({
    where: { id: String(req.params.id) },
    data: updateData,
  });
  res.json({ success: true, data: address });
});

// DELETE /users/me/addresses/:id
router.delete("/me/addresses/:id", async (req: AuthRequest, res) => {
  const existing = await prisma.address.findFirst({
    where: { id: String(req.params.id), userId: req.user!.sub },
  });
  if (!existing) {
    res
      .status(404)
      .json({ success: false, error: { code: "NOT_FOUND", message: "Хаяг олдсонгүй" } });
    return;
  }
  await prisma.address.delete({ where: { id: String(req.params.id) } });
  res.json({ success: true, data: null });
});

export default router;
