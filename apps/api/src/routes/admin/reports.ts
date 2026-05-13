import { Router } from "express";
import { z } from "zod";
import { prisma } from "../../lib/prisma";
import { requireAuth } from "../../middleware/auth";

const router = Router();
router.use(requireAuth("admin"));

const ORDER_STATUSES = [
  "pending",
  "confirmed",
  "processing",
  "shipped",
  "delivered",
  "cancelled",
] as const;

// GET /admin/reports/summary
router.get("/summary", async (_req, res) => {
  const thirtyDaysAgo = new Date();
  thirtyDaysAgo.setDate(thirtyDaysAgo.getDate() - 30);

  const [orderStats, revenue, allTimePaid, recentOrders, topItems] = await Promise.all([
    prisma.order.groupBy({ by: ["status"], _count: { id: true } }),
    prisma.payment.aggregate({ where: { status: "paid" }, _sum: { amountMnt: true } }),
    prisma.order.count({ where: { payment: { status: "paid" } } }),
    prisma.order.findMany({
      where: { createdAt: { gte: thirtyDaysAgo }, payment: { status: "paid" } },
      select: { createdAt: true, totalMnt: true },
    }),
    prisma.orderItem.groupBy({
      by: ["productId"],
      _sum: { quantity: true },
      _count: { id: true },
      orderBy: { _count: { id: "desc" } },
      take: 5,
    }),
  ]);

  // Build daily revenue map for last 30 days
  const dailyMap: Record<string, number> = {};
  for (let i = 29; i >= 0; i--) {
    const d = new Date();
    d.setDate(d.getDate() - i);
    dailyMap[d.toISOString().slice(0, 10)] = 0;
  }
  for (const o of recentOrders) {
    const key = o.createdAt.toISOString().slice(0, 10);
    if (key in dailyMap) dailyMap[key] = (dailyMap[key] ?? 0) + Number(o.totalMnt);
  }
  const dailyRevenue = Object.entries(dailyMap).map(([date, amount]) => ({
    date,
    amount,
  }));

  // Resolve product names for top items
  const productIds = topItems.map((i) => i.productId);
  const products = await prisma.product.findMany({
    where: { id: { in: productIds } },
    select: { id: true, titleMn: true, priceMnt: true },
  });
  const productMap = new Map(products.map((p) => [p.id, p]));

  const topProducts = topItems.map((i) => ({
    product: productMap.get(i.productId) ?? null,
    totalQuantity: i._sum.quantity ?? 0,
    orderCount: i._count.id,
  }));

  const statusCounts = Object.fromEntries(orderStats.map((s) => [s.status, s._count.id]));
  const totalOrders = orderStats.reduce((sum, s) => sum + s._count.id, 0);

  res.json({
    success: true,
    data: {
      totalRevenueMnt: Number(revenue._sum.amountMnt ?? 0),
      paidOrderCount: allTimePaid,
      totalOrders,
      statusCounts,
      dailyRevenue,
      topProducts,
    },
  });
});

// GET /admin/reports/orders/export — CSV download
router.get("/orders/export", async (req, res) => {
  const query = z
    .object({
      from: z.string().optional(),
      to: z.string().optional(),
      status: z.enum(ORDER_STATUSES).optional(),
    })
    .safeParse(req.query);

  if (!query.success) {
    res.status(422).json({ success: false, error: { code: "VALIDATION_ERROR" } });
    return;
  }

  const { from, to, status } = query.data;

  const where: Record<string, unknown> = {};
  if (status) where.status = status;
  if (from || to) {
    where.createdAt = {
      ...(from ? { gte: new Date(from) } : {}),
      ...(to ? { lte: new Date(to + "T23:59:59.999Z") } : {}),
    };
  }

  const orders = await prisma.order.findMany({
    where,
    orderBy: { createdAt: "desc" },
    take: 10000,
    include: {
      user: { select: { name: true, phone: true } },
      payment: { select: { status: true, provider: true, paidAt: true } },
    },
  });

  const headers = [
    "Захиалгын дугаар",
    "Хэрэглэгч",
    "Утас",
    "Захиалгын төлөв",
    "Төлбөрийн төлөв",
    "Төлбөрийн хэрэгсэл",
    "Нийт дүн (₮)",
    "Хүргэлтийн төрөл",
    "Огноо",
  ];

  function escapeCell(val: string | number): string {
    const s = String(val);
    if (s.includes(",") || s.includes('"') || s.includes("\n")) {
      return `"${s.replace(/"/g, '""')}"`;
    }
    return s;
  }

  const rows = orders.map((o) => [
    o.orderNumber,
    o.user.name,
    o.user.phone,
    o.status,
    o.payment?.status ?? "",
    o.payment?.provider ?? "",
    Number(o.totalMnt),
    o.deliveryType,
    o.createdAt.toISOString().slice(0, 10),
  ]);

  const csv = [
    headers.map(escapeCell).join(","),
    ...rows.map((r) => r.map(escapeCell).join(",")),
  ].join("\r\n");

  const filename = `orders-${new Date().toISOString().slice(0, 10)}.csv`;
  res.setHeader("Content-Type", "text/csv; charset=utf-8");
  res.setHeader("Content-Disposition", `attachment; filename="${filename}"`);
  res.send("﻿" + csv);
});

export default router;
