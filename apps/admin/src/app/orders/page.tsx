"use client";

import { useEffect, useState, useCallback } from "react";
import Link from "next/link";
import { apiFetch } from "@/lib/api";
import { useToast } from "@/components/ui/Toast";

interface Order {
  id: string;
  orderNumber: string;
  status: string;
  totalMnt: string;
  deliveryType: string;
  createdAt: string;
  user: { name: string; phone: string };
  payment: { status: string; provider: string } | null;
  delivery: { status: string; slot: { slotDatetime: string } } | null;
}

const ALL_STATUSES = [
  "pending",
  "confirmed",
  "processing",
  "shipped",
  "delivered",
  "cancelled",
] as const;
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

export default function AdminOrdersPage() {
  const { show } = useToast();
  const [orders, setOrders] = useState<Order[]>([]);
  const [total, setTotal] = useState(0);
  const [loading, setLoading] = useState(true);
  const [statusFilter, setStatusFilter] = useState<string>("all");
  const [page, setPage] = useState(1);
  const [updatingId, setUpdatingId] = useState<string | null>(null);

  const load = useCallback(async () => {
    setLoading(true);
    const qs = new URLSearchParams({ page: String(page), limit: "20" });
    if (statusFilter !== "all") qs.set("status", statusFilter);
    const r = await apiFetch<unknown>(`/admin/orders?${qs}`);
    if (r.success) {
      const d = r.data as { data: Order[]; meta: { total: number } };
      setOrders(d.data);
      setTotal(d.meta.total);
    }
    setLoading(false);
  }, [page, statusFilter]);

  useEffect(() => {
    load();
  }, [load]);

  async function advanceStatus(id: string, currentStatus: string) {
    const idx = ALL_STATUSES.indexOf(currentStatus as (typeof ALL_STATUSES)[number]);
    if (idx < 0 || idx >= ALL_STATUSES.length - 2) return;
    const nextStatus = ALL_STATUSES[idx + 1];
    if (!nextStatus) return;
    setUpdatingId(id);
    const r = await apiFetch(`/admin/orders/${id}/status`, {
      method: "PATCH",
      body: JSON.stringify({ status: nextStatus }),
    });
    setUpdatingId(null);
    const ns = nextStatus;
    if (r.success) {
      setOrders((prev) => prev.map((o) => (o.id === id ? { ...o, status: ns } : o)));
      show("Төлөв шинэчлэгдлээ", "success");
    } else {
      show("Алдаа гарлаа", "error");
    }
  }

  const NEXT_LABEL: Record<string, string> = {
    pending: "Баталгаажуулах",
    confirmed: "Боловсруулах",
    processing: "Илгээх",
    shipped: "Хүргэгдсэн болгох",
  };

  return (
    <div style={{ padding: "28px" }}>
      <div style={{ marginBottom: 22 }}>
        <p
          style={{
            fontSize: 11,
            color: "var(--mute-2)",
            letterSpacing: "0.06em",
            textTransform: "uppercase",
            marginBottom: 4,
          }}
        >
          Удирдлага
        </p>
        <h1
          style={{
            fontSize: 22,
            fontWeight: 600,
            letterSpacing: "-0.01em",
            color: "var(--ink)",
          }}
        >
          Захиалгууд
        </h1>
      </div>

      {/* Status filters */}
      <div style={{ display: "flex", gap: 6, flexWrap: "wrap", marginBottom: 18 }}>
        {["all", ...ALL_STATUSES].map((s) => (
          <button
            key={s}
            onClick={() => {
              setStatusFilter(s);
              setPage(1);
            }}
            style={{
              height: 30,
              padding: "0 14px",
              borderRadius: 99,
              border:
                statusFilter === s ? "1.5px solid var(--ink-2)" : "1px solid var(--line)",
              background: statusFilter === s ? "var(--ink-2)" : "var(--bg-paper)",
              color: statusFilter === s ? "var(--bg-paper)" : "var(--mute)",
              fontSize: 12,
              fontWeight: statusFilter === s ? 600 : 400,
              cursor: "pointer",
              fontFamily: "var(--sans)",
              transition: "all 80ms ease",
            }}
          >
            {s === "all" ? "Бүгд" : STATUS_LABELS[s]}
          </button>
        ))}
      </div>

      {/* Table */}
      <div
        style={{
          background: "var(--bg-paper)",
          border: "1px solid var(--line)",
          borderRadius: "var(--r-3)",
          overflow: "hidden",
        }}
      >
        {loading ? (
          <div style={{ padding: 20 }}>
            {Array.from({ length: 8 }).map((_, i) => (
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
              padding: "48px 20px",
              textAlign: "center",
              color: "var(--mute)",
              fontSize: 13,
            }}
          >
            Захиалга олдсонгүй
          </div>
        ) : (
          <table style={{ width: "100%", borderCollapse: "collapse", fontSize: 13 }}>
            <thead>
              <tr style={{ background: "var(--bg-cream)" }}>
                {["Захиалга", "Хэрэглэгч", "Хүргэлт", "Дүн", "Төлбөр", "Төлөв", ""].map(
                  (h) => (
                    <th
                      key={h}
                      style={{
                        padding: "9px 14px",
                        textAlign: "left",
                        fontSize: 11,
                        fontWeight: 500,
                        color: "var(--mute)",
                        letterSpacing: "0.03em",
                        borderBottom: "1px solid var(--line)",
                        whiteSpace: "nowrap",
                      }}
                    >
                      {h}
                    </th>
                  )
                )}
              </tr>
            </thead>
            <tbody>
              {orders.map((o, i) => (
                <tr
                  key={o.id}
                  style={{
                    borderBottom:
                      i < orders.length - 1 ? "1px solid var(--line)" : "none",
                  }}
                >
                  <td style={{ padding: "11px 14px", whiteSpace: "nowrap" }}>
                    <Link href={`/orders/${o.id}`} style={{ textDecoration: "none" }}>
                      <span
                        className="num"
                        style={{ color: "var(--accent)", fontWeight: 500, fontSize: 12 }}
                      >
                        {o.orderNumber}
                      </span>
                    </Link>
                    <p style={{ fontSize: 11, color: "var(--mute-2)", marginTop: 2 }}>
                      {new Date(o.createdAt).toLocaleDateString("mn-MN")}
                    </p>
                  </td>
                  <td style={{ padding: "11px 14px" }}>
                    <p style={{ color: "var(--ink-2)", fontWeight: 400 }}>
                      {o.user.name}
                    </p>
                    <p style={{ fontSize: 11, color: "var(--mute-2)" }}>{o.user.phone}</p>
                  </td>
                  <td
                    style={{
                      padding: "11px 14px",
                      color: "var(--mute)",
                      whiteSpace: "nowrap",
                    }}
                  >
                    {o.deliveryType === "pickup" ? "Өөрөө авах" : "Хүргэлт"}
                    {o.delivery && (
                      <p style={{ fontSize: 11, color: "var(--mute-2)" }}>
                        {new Date(o.delivery.slot.slotDatetime).toLocaleDateString(
                          "mn-MN"
                        )}
                      </p>
                    )}
                  </td>
                  <td style={{ padding: "11px 14px", whiteSpace: "nowrap" }}>
                    <span
                      className="num"
                      style={{ fontWeight: 500, color: "var(--ink)" }}
                    >
                      {Number(o.totalMnt).toLocaleString("en-US")}₮
                    </span>
                  </td>
                  <td style={{ padding: "11px 14px" }}>
                    <span
                      style={{
                        fontSize: 11,
                        padding: "2px 8px",
                        borderRadius: 99,
                        background:
                          o.payment?.status === "paid" ? "#dcfce7" : "var(--bg-stone)",
                        color: o.payment?.status === "paid" ? "#16a34a" : "var(--mute)",
                        fontWeight: 500,
                      }}
                    >
                      {o.payment?.status === "paid" ? "Төлсөн" : "Хүлээгдэж байна"}
                    </span>
                  </td>
                  <td style={{ padding: "11px 14px" }}>
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
                      <span style={{ color: "var(--mute)", whiteSpace: "nowrap" }}>
                        {STATUS_LABELS[o.status] ?? o.status}
                      </span>
                    </div>
                  </td>
                  <td style={{ padding: "11px 14px", whiteSpace: "nowrap" }}>
                    {NEXT_LABEL[o.status] && (
                      <button
                        onClick={() => advanceStatus(o.id, o.status)}
                        disabled={updatingId === o.id}
                        style={{
                          height: 28,
                          padding: "0 12px",
                          background: "var(--accent-soft)",
                          color: "var(--accent)",
                          border: "1px solid var(--accent-mist)",
                          borderRadius: "var(--r-1)",
                          fontSize: 11,
                          fontWeight: 500,
                          cursor: "pointer",
                          opacity: updatingId === o.id ? 0.5 : 1,
                          fontFamily: "var(--sans)",
                        }}
                      >
                        {updatingId === o.id ? "…" : NEXT_LABEL[o.status]}
                      </button>
                    )}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        )}
      </div>

      {/* Pagination */}
      {total > 20 && (
        <div style={{ display: "flex", justifyContent: "center", gap: 8, marginTop: 16 }}>
          <button
            onClick={() => setPage((p) => Math.max(1, p - 1))}
            disabled={page === 1}
            style={{
              height: 32,
              padding: "0 14px",
              border: "1px solid var(--line)",
              borderRadius: "var(--r-2)",
              background: "var(--bg-paper)",
              fontSize: 12,
              cursor: page === 1 ? "not-allowed" : "pointer",
              color: page === 1 ? "var(--mute-2)" : "var(--ink)",
              fontFamily: "var(--sans)",
            }}
          >
            ←
          </button>
          <span style={{ lineHeight: "32px", fontSize: 12, color: "var(--mute)" }}>
            {page} / {Math.ceil(total / 20)}
          </span>
          <button
            onClick={() => setPage((p) => p + 1)}
            disabled={page >= Math.ceil(total / 20)}
            style={{
              height: 32,
              padding: "0 14px",
              border: "1px solid var(--line)",
              borderRadius: "var(--r-2)",
              background: "var(--bg-paper)",
              fontSize: 12,
              cursor: page >= Math.ceil(total / 20) ? "not-allowed" : "pointer",
              color: page >= Math.ceil(total / 20) ? "var(--mute-2)" : "var(--ink)",
              fontFamily: "var(--sans)",
            }}
          >
            →
          </button>
        </div>
      )}
    </div>
  );
}
