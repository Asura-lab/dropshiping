"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { apiFetch } from "@/lib/api";

interface StatsOrder {
  id: string;
  orderNumber: string;
  status: string;
  totalMnt: string;
  createdAt: string;
  user: { name: string; phone: string };
  payment: { status: string } | null;
}

const STATUS_LABELS: Record<string, string> = {
  pending: "Хүлээгдэж байна",
  confirmed: "Баталгаажсан",
  processing: "Боловсруулж байна",
  shipped: "Илгээсэн",
  delivered: "Хүргэгдсэн",
  cancelled: "Цуцлагдсан",
};
const STATUS_DOT: Record<string, string> = {
  pending: "#d97706",
  confirmed: "#16a34a",
  processing: "#2563eb",
  shipped: "#7c3aed",
  delivered: "#16a34a",
  cancelled: "var(--mute-2)",
};

export default function AdminDashboard() {
  const [orders, setOrders] = useState<StatsOrder[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    apiFetch<{ data: StatsOrder[] }>("/admin/orders?limit=20").then((r) => {
      if (r.success) {
        const data = r.data as unknown as { data: StatsOrder[]; meta: unknown };
        setOrders(data.data ?? []);
      }
      setLoading(false);
    });
  }, []);

  const activeOrders = orders.filter(
    (o) => !["delivered", "cancelled"].includes(o.status)
  ).length;
  const paidRevenue = orders
    .filter((o) => o.payment?.status === "paid")
    .reduce((sum, o) => sum + Number(o.totalMnt), 0);
  const deliveredCount = orders.filter((o) => o.status === "delivered").length;
  const pendingCount = orders.filter((o) => o.status === "pending").length;

  const stats = [
    { label: "Идэвхтэй захиалга", value: activeOrders, sub: "Өнөөдрийн" },
    { label: "Орлого", value: `${paidRevenue.toLocaleString("en-US")}₮`, sub: "Төлсөн" },
    { label: "Хүргэгдсэн", value: deliveredCount, sub: "Нийт" },
    { label: "Хүлээгдэж байна", value: pendingCount, sub: "Шинэ захиалга" },
  ];

  return (
    <div style={{ padding: "28px 28px" }}>
      <div style={{ marginBottom: 24 }}>
        <p
          style={{
            fontSize: 11,
            color: "var(--mute-2)",
            letterSpacing: "0.06em",
            textTransform: "uppercase",
            marginBottom: 4,
          }}
        >
          Удирдлагын самбар
        </p>
        <h1
          style={{
            fontSize: 22,
            fontWeight: 600,
            letterSpacing: "-0.01em",
            color: "var(--ink)",
          }}
        >
          Нүүр
        </h1>
      </div>

      {/* Stats */}
      <div
        style={{
          display: "grid",
          gridTemplateColumns: "repeat(auto-fill, minmax(180px, 1fr))",
          gap: 12,
          marginBottom: 28,
        }}
      >
        {stats.map((s) => (
          <div
            key={s.label}
            style={{
              background: "var(--bg-paper)",
              border: "1px solid var(--line)",
              borderRadius: "var(--r-3)",
              padding: "18px 18px 14px",
            }}
          >
            <p style={{ fontSize: 11, color: "var(--mute)", marginBottom: 8 }}>
              {s.label}
            </p>
            <p
              className="num"
              style={{
                fontSize: 24,
                fontWeight: 700,
                color: "var(--ink)",
                marginBottom: 4,
              }}
            >
              {loading ? "—" : s.value}
            </p>
            <p style={{ fontSize: 11, color: "var(--mute-2)" }}>{s.sub}</p>
          </div>
        ))}
      </div>

      {/* Recent orders */}
      <div
        style={{
          background: "var(--bg-paper)",
          border: "1px solid var(--line)",
          borderRadius: "var(--r-3)",
          overflow: "hidden",
        }}
      >
        <div
          style={{
            padding: "14px 20px",
            borderBottom: "1px solid var(--line)",
            display: "flex",
            justifyContent: "space-between",
            alignItems: "center",
          }}
        >
          <p style={{ fontSize: 13, fontWeight: 500, color: "var(--ink)" }}>
            Сүүлийн захиалгууд
          </p>
          <Link
            href="/orders"
            style={{ fontSize: 12, color: "var(--accent)", textDecoration: "none" }}
          >
            Бүгдийг харах →
          </Link>
        </div>

        {loading ? (
          <div style={{ padding: 20 }}>
            {Array.from({ length: 5 }).map((_, i) => (
              <div
                key={i}
                style={{
                  height: 44,
                  background: "var(--bg-cream)",
                  borderRadius: "var(--r-2)",
                  marginBottom: 8,
                  animation: "pulse 1.5s infinite",
                }}
              />
            ))}
          </div>
        ) : orders.length === 0 ? (
          <div
            style={{
              padding: "40px 20px",
              textAlign: "center",
              color: "var(--mute)",
              fontSize: 13,
            }}
          >
            Захиалга байхгүй байна
          </div>
        ) : (
          <table style={{ width: "100%", borderCollapse: "collapse", fontSize: 13 }}>
            <thead>
              <tr style={{ background: "var(--bg-cream)" }}>
                {["Захиалгын дугаар", "Хэрэглэгч", "Төлөв", "Дүн", "Огноо"].map((h) => (
                  <th
                    key={h}
                    style={{
                      padding: "9px 16px",
                      textAlign: "left",
                      fontSize: 11,
                      fontWeight: 500,
                      color: "var(--mute)",
                      letterSpacing: "0.03em",
                      borderBottom: "1px solid var(--line)",
                    }}
                  >
                    {h}
                  </th>
                ))}
              </tr>
            </thead>
            <tbody>
              {orders.slice(0, 10).map((o, i) => (
                <tr
                  key={o.id}
                  style={{
                    borderBottom:
                      i < Math.min(orders.length, 10) - 1
                        ? "1px solid var(--line)"
                        : "none",
                  }}
                >
                  <td style={{ padding: "11px 16px" }}>
                    <Link href={`/orders/${o.id}`} style={{ textDecoration: "none" }}>
                      <span
                        className="num"
                        style={{ color: "var(--accent)", fontWeight: 500 }}
                      >
                        {o.orderNumber}
                      </span>
                    </Link>
                  </td>
                  <td style={{ padding: "11px 16px", color: "var(--ink-2)" }}>
                    {o.user.name}
                  </td>
                  <td style={{ padding: "11px 16px" }}>
                    <div style={{ display: "flex", alignItems: "center", gap: 6 }}>
                      <div
                        style={{
                          width: 6,
                          height: 6,
                          borderRadius: "50%",
                          background: STATUS_DOT[o.status] ?? "var(--mute-2)",
                          flexShrink: 0,
                        }}
                      />
                      <span style={{ color: "var(--mute)" }}>
                        {STATUS_LABELS[o.status] ?? o.status}
                      </span>
                    </div>
                  </td>
                  <td style={{ padding: "11px 16px" }}>
                    <span
                      className="num"
                      style={{ fontWeight: 500, color: "var(--ink)" }}
                    >
                      {Number(o.totalMnt).toLocaleString("en-US")}₮
                    </span>
                  </td>
                  <td
                    style={{ padding: "11px 16px", color: "var(--mute-2)", fontSize: 12 }}
                  >
                    {new Date(o.createdAt).toLocaleDateString("mn-MN")}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        )}
      </div>
    </div>
  );
}
