/**
 * k6 load test — 100 concurrent orders
 *
 * Install k6: https://k6.io/docs/get-started/installation/
 * Run: k6 run apps/api/test/load.js
 *
 * Targets: p95 < 2s, error rate < 1% under 100 VUs
 */

import http from "k6/http";
import { check, sleep } from "k6";
import { Counter, Rate, Trend } from "k6/metrics";

const BASE = __ENV.API_URL || "http://localhost:4000/v1";
const TEST_PHONE = __ENV.TEST_PHONE || "+97699000099";

// Custom metrics
const ordersCreated = new Counter("orders_created");
const ordersFailed = new Counter("orders_failed");
const errorRate = new Rate("error_rate");
const orderDuration = new Trend("order_duration_ms", true);

export const options = {
  scenarios: {
    ramp_up: {
      executor: "ramping-vus",
      startVUs: 0,
      stages: [
        { duration: "30s", target: 20 }, // ramp to 20
        { duration: "1m", target: 100 }, // ramp to 100
        { duration: "2m", target: 100 }, // hold at 100
        { duration: "30s", target: 0 }, // ramp down
      ],
    },
  },
  thresholds: {
    http_req_duration: ["p(95)<2000"], // 95% of requests under 2s
    error_rate: ["rate<0.01"], // less than 1% errors
    order_duration_ms: ["p(95)<3000"], // 95% of full order flows under 3s
  },
};

const headers = { "Content-Type": "application/json" };

function getToken() {
  // Send OTP
  http.post(`${BASE}/auth/otp/send`, JSON.stringify({ phone: TEST_PHONE }), { headers });

  // Verify OTP (dev mock always accepts "0000")
  const verifyRes = http.post(
    `${BASE}/auth/otp/verify`,
    JSON.stringify({ phone: TEST_PHONE, code: "0000" }),
    { headers }
  );

  const body = verifyRes.json();
  if (!body.success) return null;
  return body.data.access_token;
}

function getFirstProductId(token) {
  const res = http.get(`${BASE}/products?limit=1`, {
    headers: { ...headers, Authorization: `Bearer ${token}` },
  });
  const body = res.json();
  if (!body.success || !body.data?.data?.[0]) return null;
  return body.data.data[0].id;
}

function getPickupSlotId(token) {
  const res = http.get(`${BASE}/delivery-slots`, {
    headers: { ...headers, Authorization: `Bearer ${token}` },
  });
  const body = res.json();
  if (!body.success) return null;
  const slots = body.data?.data ?? [];
  const slot = slots.find((s) => s.type === "pickup" && s.bookedCount < s.capacity);
  return slot?.id ?? null;
}

export default function () {
  const token = getToken();
  if (!token) {
    errorRate.add(1);
    return;
  }

  const authHeaders = { ...headers, Authorization: `Bearer ${token}` };

  const productId = getFirstProductId(token);
  const slotId = getPickupSlotId(token);

  if (!productId || !slotId) {
    errorRate.add(1);
    ordersFailed.add(1);
    return;
  }

  // Create order
  const orderStart = Date.now();
  const orderRes = http.post(
    `${BASE}/orders`,
    JSON.stringify({
      delivery_type: "pickup",
      slot_id: slotId,
      items: [{ product_id: productId, quantity: 1 }],
    }),
    { headers: authHeaders }
  );

  const orderOk = check(orderRes, {
    "order created (201)": (r) => r.status === 201,
    "order success": (r) => r.json("success") === true,
  });

  errorRate.add(!orderOk ? 1 : 0);

  if (!orderOk) {
    ordersFailed.add(1);
    return;
  }

  const orderId = orderRes.json("data.id");
  ordersCreated.add(1);

  // QPay (dev mock)
  const payRes = http.post(
    `${BASE}/payments/qpay`,
    JSON.stringify({ order_id: orderId }),
    { headers: authHeaders }
  );

  check(payRes, {
    "qpay success": (r) => r.json("success") === true,
  });

  orderDuration.add(Date.now() - orderStart);

  sleep(1);
}

export function handleSummary(data) {
  return {
    stdout: `
Load Test Summary
─────────────────────────────────────────
Orders created:  ${data.metrics.orders_created?.values?.count ?? 0}
Orders failed:   ${data.metrics.orders_failed?.values?.count ?? 0}
Error rate:      ${((data.metrics.error_rate?.values?.rate ?? 0) * 100).toFixed(2)}%
Order p95:       ${data.metrics.order_duration_ms?.values?.["p(95)"]?.toFixed(0) ?? "N/A"} ms
HTTP req p95:    ${data.metrics.http_req_duration?.values?.["p(95)"]?.toFixed(0) ?? "N/A"} ms
─────────────────────────────────────────
`,
  };
}
