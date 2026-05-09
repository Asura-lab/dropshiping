import { Router } from "express";
import { z } from "zod";
import { prisma } from "../lib/prisma";
import { requireAuth } from "../middleware/auth";

const router = Router();
router.use(requireAuth("customer", "driver", "admin"));

// GET /delivery-slots
router.get("/", async (req, res) => {
  const query = z
    .object({
      type: z.enum(["pickup", "delivery"]).optional(),
      date: z.string().optional(), // YYYY-MM-DD
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

  const { type, date } = query.data;

  const now = new Date();
  let dateFrom = now;
  let dateTo: Date | undefined;

  if (date) {
    dateFrom = new Date(`${date}T00:00:00`);
    dateTo = new Date(`${date}T23:59:59`);
  }

  const slots = await prisma.deliverySlot.findMany({
    where: {
      isActive: true,
      slotDatetime: {
        gte: dateFrom,
        ...(dateTo ? { lte: dateTo } : {}),
      },
      ...(type ? { type } : {}),
    },
    orderBy: { slotDatetime: "asc" },
  });

  const available = slots.map((s) => ({
    ...s,
    availableCount: s.capacity - s.bookedCount,
    isFull: s.bookedCount >= s.capacity,
  }));

  res.json({ success: true, data: available });
});

export default router;
