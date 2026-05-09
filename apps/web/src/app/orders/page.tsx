"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import { apiFetch, getUser } from "@/lib/api";

interface Order {
  id: string;
  orderNumber: string;
  status: string;
  totalMnt: string;
  deliveryType: string;
  createdAt: string;
  payment: { status: string } | null;
}

const STATUS: Record<string, { label: string; dot: string }> = {
  pending: { label: "Хүлээгдэж байна", dot: "#d97706" },
  confirmed: { label: "Баталгаажсан", dot: "#16a34a" },
  processing: { label: "Боловсруулж байна", dot: "#2563eb" },
  shipped: { label: "Илгээсэн", dot: "#7c3aed" },
  delivered: { label: "Хүргэгдсэн", dot: "#16a34a" },
  cancelled: { label: "Цуцлагдсан", dot: "var(--mute-2)" },
};

export default function OrdersPage() {
  const router = useRouter();
  const [orders, setOrders] = useState<Order[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (!getUser()) {
      router.push("/auth");
      return;
    }
    apiFetch<Order[]>("/orders").then((r) => {
      if (r.success) setOrders(r.data);
      setLoading(false);
    });
  }, [router]);

  if (loading) {
    return (
      <div style={{ maxWidth: 680, margin: "0 auto", padding: "28px 20px" }}>
        <div
          style={{
            height: 28,
            width: 120,
            background: "var(--bg-cream)",
            borderRadius: "var(--r-1)",
            marginBottom: 24,
            animation: "pulse 1.5s infinite",
          }}
        />
        {Array.from({ length: 3 }).map((_, i) => (
          <div
            key={i}
            style={{
              height: 76,
              background: "var(--bg-cream)",
              borderRadius: "var(--r-3)",
              marginBottom: 10,
              animation: "pulse 1.5s infinite",
            }}
          />
        ))}
      </div>
    );
  }

  if (orders.length === 0) {
    return (
      <div
        style={{
          maxWidth: 480,
          margin: "80px auto",
          textAlign: "center",
          padding: "0 20px",
        }}
      >
        <div
          style={{
            width: 60,
            height: 60,
            borderRadius: "50%",
            background: "var(--bg-cream)",
            display: "flex",
            alignItems: "center",
            justifyContent: "center",
            margin: "0 auto 20px",
            color: "var(--mute-2)",
          }}
        >
          <svg
            width="24"
            height="24"
            viewBox="0 0 24 24"
            fill="none"
            stroke="currentColor"
            strokeWidth="1.5"
            strokeLinecap="round"
            strokeLinejoin="round"
          >
            <path d="M20 7H4a2 2 0 00-2 2v10a2 2 0 002 2h16a2 2 0 002-2V9a2 2 0 00-2-2z" />
            <path d="M16 21V5a2 2 0 00-2-2h-4a2 2 0 00-2 2v16" />
          </svg>
        </div>
        <h1 style={{ fontSize: 18, fontWeight: 600, marginBottom: 8 }}>
          Захиалга байхгүй
        </h1>
        <p style={{ fontSize: 13, color: "var(--mute)", marginBottom: 24 }}>
          Анхны захиалгаа хийнэ үү
        </p>
        <Link
          href="/products"
          style={{
            display: "inline-block",
            padding: "10px 24px",
            background: "var(--accent)",
            color: "var(--bg-paper)",
            borderRadius: "var(--r-2)",
            fontSize: 13,
            fontWeight: 500,
            textDecoration: "none",
          }}
        >
          Бараа үзэх
        </Link>
      </div>
    );
  }

  return (
    <div style={{ maxWidth: 680, margin: "0 auto", padding: "28px 20px" }}>
      <div style={{ marginBottom: 22 }}>
        <div className="eyebrow" style={{ marginBottom: 4 }}>
          Миний дансны
        </div>
        <h1 style={{ fontSize: 22, fontWeight: 600, letterSpacing: "-0.01em" }}>
          Захиалгууд
        </h1>
      </div>

      <div style={{ display: "flex", flexDirection: "column", gap: 10 }}>
        {orders.map((order) => {
          const st = STATUS[order.status] ?? {
            label: order.status,
            dot: "var(--mute-2)",
          };
          const date = new Date(order.createdAt).toLocaleDateString("mn-MN", {
            year: "numeric",
            month: "short",
            day: "numeric",
          });
          return (
            <Link
              key={order.id}
              href={`/orders/${order.id}`}
              style={{ textDecoration: "none" }}
            >
              <div
                style={{
                  background: "var(--bg-paper)",
                  border: "1px solid var(--line)",
                  borderRadius: "var(--r-3)",
                  padding: "14px 18px",
                  display: "flex",
                  justifyContent: "space-between",
                  alignItems: "center",
                  transition: "border-color 100ms ease",
                }}
                onMouseEnter={(e) =>
                  (e.currentTarget.style.borderColor = "var(--line-2)")
                }
                onMouseLeave={(e) => (e.currentTarget.style.borderColor = "var(--line)")}
              >
                <div>
                  <p
                    className="num"
                    style={{
                      fontSize: 13,
                      fontWeight: 600,
                      color: "var(--ink)",
                      marginBottom: 4,
                    }}
                  >
                    {order.orderNumber}
                  </p>
                  <div style={{ display: "flex", alignItems: "center", gap: 6 }}>
                    <span
                      style={{
                        width: 6,
                        height: 6,
                        borderRadius: "50%",
                        background: st.dot,
                        display: "inline-block",
                        flexShrink: 0,
                      }}
                    />
                    <span style={{ fontSize: 12, color: "var(--mute)" }}>{st.label}</span>
                    <span style={{ fontSize: 11, color: "var(--mute-2)" }}>· {date}</span>
                  </div>
                </div>
                <div style={{ textAlign: "right" }}>
                  <p
                    className="num"
                    style={{ fontSize: 15, fontWeight: 600, color: "var(--ink)" }}
                  >
                    {Number(order.totalMnt).toLocaleString("en-US")}₮
                  </p>
                  <p style={{ fontSize: 11, color: "var(--mute-2)", marginTop: 2 }}>
                    {order.deliveryType === "pickup" ? "Өөрөө авах" : "Хүргэлт"}
                  </p>
                </div>
              </div>
            </Link>
          );
        })}
      </div>
    </div>
  );
}
