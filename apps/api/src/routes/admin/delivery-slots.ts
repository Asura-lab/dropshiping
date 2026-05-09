import { Router } from "express";
import { z } from "zod";
import { prisma } from "../../lib/prisma";
import { requireAuth } from "../../middleware/auth";

const router = Router();
router.use(requireAuth("admin"));

const slotSchema = z.object({
  type: z.enum(["pickup", "delivery"]),
  slotDatetime: z.string().datetime(),
  capacity: z.number().int().min(1).default(20),
});

// GET /admin/delivery-slots
router.get("/", async (_req, res) => {
  const slots = await prisma.deliverySlot.findMany({
    orderBy: { slotDatetime: "asc" },
    include: { _count: { select: { deliveries: true } } },
  });
  res.json({ success: true, data: slots });
});

// POST /admin/delivery-slots
router.post("/", async (req, res) => {
  const result = slotSchema.safeParse(req.body);
  if (!result.success) {
    res.status(422).json({
      success: false,
      error: { code: "VALIDATION_ERROR", message: result.error.errors[0]?.message },
    });
    return;
  }
  const slot = await prisma.deliverySlot.create({
    data: {
      type: result.data.type,
      slotDatetime: new Date(result.data.slotDatetime),
      capacity: result.data.capacity,
    },
  });
  res.status(201).json({ success: true, data: slot });
});

// PATCH /admin/delivery-slots/:id
router.patch("/:id", async (req, res) => {
  const result = slotSchema.partial().safeParse(req.body);
  if (!result.success) {
    res.status(422).json({
      success: false,
      error: { code: "VALIDATION_ERROR", message: result.error.errors[0]?.message },
    });
    return;
  }
  const slot = await prisma.deliverySlot.update({
    where: { id: String(req.params.id) },
    data: {
      ...(result.data.type && { type: result.data.type }),
      ...(result.data.slotDatetime && {
        slotDatetime: new Date(result.data.slotDatetime),
      }),
      ...(result.data.capacity && { capacity: result.data.capacity }),
    },
  });
  res.json({ success: true, data: slot });
});

// DELETE /admin/delivery-slots/:id — deactivate
router.delete("/:id", async (req, res) => {
  await prisma.deliverySlot.update({
    where: { id: String(req.params.id) },
    data: { isActive: false },
  });
  res.json({ success: true, data: null });
});

export default router;
