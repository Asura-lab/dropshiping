/**
 * E2E test: full order flow
 *   OTP login → browse products → select slot → create order → QPay → confirm
 *
 * Usage: tsx apps/api/test/e2e.ts
 * Requires a running API (default http://localhost:4000) and dev mock mode.
 */

const BASE = process.env.API_URL ?? "http://localhost:4000/v1";
const TEST_PHONE = process.env.TEST_PHONE ?? "+97699000001";

let accessToken = "";
let orderId = "";
let passed = 0;
let failed = 0;

async function api<T = unknown>(
  method: string,
  path: string,
  body?: unknown,
  auth = true
): Promise<{ success: boolean; data: T; error?: { code: string; message: string } }> {
  const res = await fetch(`${BASE}${path}`, {
    method,
    headers: {
      "Content-Type": "application/json",
      ...(auth && accessToken ? { Authorization: `Bearer ${accessToken}` } : {}),
    },
    ...(body ? { body: JSON.stringify(body) } : {}),
  });
  return res.json() as Promise<{
    success: boolean;
    data: T;
    error?: { code: string; message: string };
  }>;
}

function assert(label: string, condition: boolean, detail?: string) {
  if (condition) {
    console.log(`  ✓ ${label}`);
    passed++;
  } else {
    console.error(`  ✗ ${label}${detail ? ` — ${detail}` : ""}`);
    failed++;
  }
}

async function run() {
  console.log(`\n=== OmniFlow E2E Test ===`);
  console.log(`API: ${BASE}  Phone: ${TEST_PHONE}\n`);

  // ── Health check ─────────────────────────────────────────────────────────────
  console.log("1. Health check");
  const health = (await fetch(`${BASE.replace("/v1", "")}/health`).then((r) =>
    r.json()
  )) as { status: string };
  assert("API is up", health.status === "ok");

  // ── Auth: OTP send ────────────────────────────────────────────────────────────
  console.log("\n2. Auth — OTP send");
  const sendRes = await api<{ expires_in: number }>(
    "POST",
    "/auth/otp/send",
    { phone: TEST_PHONE },
    false
  );
  assert("OTP send succeeds", sendRes.success, sendRes.error?.message);

  // ── Auth: OTP verify (dev mock uses "1234" when SMS_API_KEY is not set) ───────
  console.log("\n3. Auth — OTP verify");
  const verifyRes = await api<{
    access_token: string;
    user: { id: string; name: string | null; role: string };
    is_new: boolean;
  }>(
    "POST",
    "/auth/otp/verify",
    { phone: TEST_PHONE, otp: process.env.DEV_OTP ?? "1234" },
    false
  );
  assert("OTP verify succeeds", verifyRes.success, verifyRes.error?.message);

  if (!verifyRes.success) {
    console.error("\n[E2E] Auth failed — aborting");
    process.exit(1);
  }

  accessToken = verifyRes.data.access_token;
  assert("Access token received", accessToken.length > 0);

  // Set name if new user
  if (verifyRes.data.is_new || !verifyRes.data.user.name) {
    await api("PATCH", "/users/me", { name: "E2E TestUser" });
  }

  // ── Products ──────────────────────────────────────────────────────────────────
  console.log("\n4. Products");
  const productsRes = await api<{ data: { id: string; titleMn: string }[] }>(
    "GET",
    "/products?limit=5"
  );
  assert(
    "Products endpoint returns data",
    productsRes.success,
    productsRes.error?.message
  );
  assert(
    "At least one product exists",
    Array.isArray((productsRes.data as unknown as { data: unknown[] }).data)
  );

  const productsList = (productsRes.data as unknown as { data: { id: string }[] }).data;
  const firstProduct = productsList[0];
  assert("First product has id", !!firstProduct?.id);

  // ── Delivery slots ────────────────────────────────────────────────────────────
  console.log("\n5. Delivery slots");
  const slotsRes = await api<{
    data: { id: string; type: string; bookedCount: number; capacity: number }[];
  }>("GET", "/delivery-slots");
  assert(
    "Delivery slots endpoint returns data",
    slotsRes.success,
    slotsRes.error?.message
  );

  const slotsList = (
    slotsRes.data as unknown as {
      data: { id: string; type: string; bookedCount: number; capacity: number }[];
    }
  ).data;
  const pickupSlot = slotsList?.find(
    (s) => s.type === "pickup" && s.bookedCount < s.capacity
  );
  assert(
    "At least one pickup slot available",
    !!pickupSlot,
    "Seed data may be missing pickup slots"
  );

  if (!pickupSlot || !firstProduct) {
    console.error("\n[E2E] No slot or product available — aborting order test");
    printSummary();
    return;
  }

  // ── Create order ──────────────────────────────────────────────────────────────
  console.log("\n6. Create order");
  const orderRes = await api<{ id: string; orderNumber: string; status: string }>(
    "POST",
    "/orders",
    {
      delivery_type: "pickup",
      slot_id: pickupSlot.id,
      items: [{ product_id: firstProduct.id, quantity: 1 }],
    }
  );
  assert("Order created", orderRes.success, orderRes.error?.message);

  if (!orderRes.success) {
    printSummary();
    return;
  }

  orderId = (orderRes.data as unknown as { id: string }).id;
  const orderNumber = (orderRes.data as unknown as { orderNumber: string }).orderNumber;
  assert("Order has id", !!orderId);
  assert("Order number format DS-YYYYMMDD-XXXX", /^DS-\d{8}-\d{4}$/.test(orderNumber));
  assert(
    "Order status is pending",
    (orderRes.data as unknown as { status: string }).status === "pending"
  );

  // ── QPay payment ──────────────────────────────────────────────────────────────
  console.log("\n7. QPay payment (dev mock)");
  const qpayRes = await api<{ payment_id: string; qpay: { invoice_id: string } }>(
    "POST",
    "/payments/qpay",
    {
      order_id: orderId,
    }
  );
  assert("QPay invoice created", qpayRes.success, qpayRes.error?.message);

  // ── Verify order confirmed (mock auto-confirms) ────────────────────────────────
  console.log("\n8. Verify order confirmed after mock QPay");
  await new Promise((r) => setTimeout(r, 300)); // small delay for DB write
  const orderCheckRes = await api<{ status: string }>("GET", `/orders/${orderId}`);
  assert(
    "Order status updated to confirmed",
    (orderCheckRes.data as unknown as { status: string }).status === "confirmed"
  );

  // ── SocialPay payment on a second order ───────────────────────────────────────
  console.log("\n9. SocialPay payment (dev mock)");
  const order2Res = await api<{ id: string }>("POST", "/orders", {
    delivery_type: "pickup",
    slot_id: pickupSlot.id,
    items: [{ product_id: firstProduct.id, quantity: 1 }],
  });
  if (order2Res.success) {
    const oid2 = (order2Res.data as unknown as { id: string }).id;
    const spRes = await api<{ payment_id: string }>("POST", "/payments/socialpay", {
      order_id: oid2,
    });
    assert("SocialPay invoice created", spRes.success, spRes.error?.message);
    await new Promise((r) => setTimeout(r, 300));
    const o2Check = await api<{ status: string }>("GET", `/orders/${oid2}`);
    assert(
      "Order confirmed after SocialPay mock",
      (o2Check.data as unknown as { status: string }).status === "confirmed"
    );
  } else {
    assert("Second order created for SocialPay test", false, order2Res.error?.message);
  }

  printSummary();
}

function printSummary() {
  const total = passed + failed;
  console.log(`\n${"─".repeat(40)}`);
  console.log(`E2E Results: ${passed}/${total} passed`);
  if (failed > 0) {
    console.error(`${failed} test(s) FAILED`);
    process.exit(1);
  } else {
    console.log("All tests passed ✓");
  }
}

run().catch((err) => {
  console.error("[E2E] Unexpected error:", err);
  process.exit(1);
});
