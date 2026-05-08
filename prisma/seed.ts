import { PrismaClient } from "@prisma/client";
import bcrypt from "bcryptjs";

const prisma = new PrismaClient();

async function main() {
  console.log("Seeding database...");

  // Admin user
  const admin = await prisma.user.upsert({
    where: { phone: "+97699000001" },
    update: {},
    create: {
      phone: "+97699000001",
      name: "Админ",
      email: "admin@dropshipping.mn",
      role: "admin",
    },
  });

  // Test customer
  const customer = await prisma.user.upsert({
    where: { phone: "+97699112233" },
    update: {},
    create: {
      phone: "+97699112233",
      name: "Болд Баатар",
      role: "customer",
    },
  });

  // Customer address
  await prisma.address.upsert({
    where: { id: "00000000-0000-0000-0000-000000000001" },
    update: {},
    create: {
      id: "00000000-0000-0000-0000-000000000001",
      userId: customer.id,
      label: "Гэр",
      duureg: "Сүхбаатар дүүрэг",
      khoroo: "8-р хороо",
      gudamj: "Энхтайваны өргөн чөлөө",
      bair: "Тэнгэр апартмент",
      toot: "42",
      isDefault: true,
    },
  });

  // Test products
  const products = [
    {
      id: "00000000-0000-0000-0001-000000000001",
      sourcePlatform: "taobao",
      sourceUrl: "https://item.taobao.com/item.htm?id=123456",
      sourceId: "123456",
      titleMn: "Утасны цэнэглэгч 65W",
      titleOriginal: "65W快充充电器",
      descriptionMn: "Хурдан цэнэглэгч, Type-C, 65W хүчин чадалтай",
      priceOriginal: 29.9,
      currencyOriginal: "CNY",
      priceMnt: 38500,
      customsFee: 0,
      shippingFee: 8000,
      images: [
        {
          url: "https://placehold.co/400x400?text=Charger",
          is_primary: true,
        },
      ],
      category: "Электроник",
    },
    {
      id: "00000000-0000-0000-0001-000000000002",
      sourcePlatform: "alibaba",
      sourceUrl: "https://www.alibaba.com/product-detail/test_123.html",
      sourceId: "alibaba_123",
      titleMn: "Эрэгтэй цамц хар",
      titleOriginal: "Men's Black T-Shirt",
      descriptionMn: "100% хөвөн, S/M/L/XL хэмжээтэй",
      priceOriginal: 8.5,
      currencyOriginal: "USD",
      priceMnt: 45000,
      customsFee: 0,
      shippingFee: 10000,
      images: [{ url: "https://placehold.co/400x400?text=T-Shirt", is_primary: true }],
      category: "Хувцас",
    },
    {
      id: "00000000-0000-0000-0001-000000000003",
      sourcePlatform: "taobao",
      sourceUrl: "https://item.taobao.com/item.htm?id=789012",
      sourceId: "789012",
      titleMn: "Хүүхдийн тоглоом робот",
      titleOriginal: "儿童玩具机器人",
      descriptionMn: "3-8 настай хүүхдэд зориулсан хөдөлж ярьдаг робот",
      priceOriginal: 89.0,
      currencyOriginal: "CNY",
      priceMnt: 165000,
      customsFee: 24750,
      shippingFee: 15000,
      images: [{ url: "https://placehold.co/400x400?text=Robot", is_primary: true }],
      category: "Тоглоом",
    },
  ];

  for (const product of products) {
    await prisma.product.upsert({
      where: { id: product.id },
      update: {},
      create: product as Parameters<typeof prisma.product.create>[0]["data"],
    });
  }

  // Delivery slots (pickup) — next 7 days
  const now = new Date();
  for (let day = 1; day <= 7; day++) {
    const date = new Date(now);
    date.setDate(date.getDate() + day);
    for (const hour of [10, 14, 16]) {
      const slotTime = new Date(date);
      slotTime.setHours(hour, 0, 0, 0);
      await prisma.deliverySlot.create({
        data: {
          type: "pickup",
          slotDatetime: slotTime,
          capacity: 20,
          bookedCount: 0,
          isActive: true,
        },
      });
    }
  }

  console.log("Seed complete.");
  console.log(`  Admin:    ${admin.phone}`);
  console.log(`  Customer: ${customer.phone}`);
  console.log(`  Products: ${products.length}`);
}

main()
  .catch((e) => {
    console.error(e);
    process.exit(1);
  })
  .finally(() => prisma.$disconnect());
