"use client";

import { useEffect, useState, useCallback } from "react";
import { apiFetch } from "@/lib/api";
import { useToast } from "@/components/ui/Toast";

interface SourceOrder {
  id: string;
  status: string;
  platform: string;
  retryCount: number;
  errorMessage: string | null;
  placedAt: string | null;
  shippedAt: string | null;
  arrivedAt: string | null;
  createdAt: string;
  orderItem: {
    order: { orderNumber: string; userId: string };
    product: { titleMn: string; sourcePlatform: string };
  };
}

const ALL_STATUSES = [
  "queued",
  "processing",
  "placed",
  "shipped",
  "arrived",
  "failed",
] as const;

const STATUS_LABEL: Record<string, string> = {
  queued: "Дарааллаа хүлээж байна",
  processing: "Боловсруулж байна",
  placed: "Захиалсан",
  shipped: "Илгээсэн",
  arrived: "Ирсэн",
  failed: "Алдаа",
};

const STATUS_COLOR: Record<string, { bg: string; color: string }> = {
  queued: { bg: "#fef9c3", color: "#a16207" },
  processing: { bg: "#dbeafe", color: "#1d4ed8" },
  placed: { bg: "#ede9fe", color: "#6d28d9" },
  shipped: { bg: "#f3e8ff", color: "#7c3aed" },
  arrived: { bg: "#dcfce7", color: "#15803d" },
  failed: { bg: "#fee2e2", color: "#b91c1c" },
};

export default function AdminSourceOrdersPage() {
  const { show } = useToast();
  const [items, setItems] = useState<SourceOrder[]>([]);
  const [total, setTotal] = useState(0);
  const [loading, setLoading] = useState(true);
  const [statusFilter, setStatusFilter] = useState("all");
  const [page, setPage] = useState(1);
  const [actionId, setActionId] = useState<string | null>(null);

  const load = useCallback(async () => {
    setLoading(true);
    const qs = new URLSearchParams({ page: String(page), limit: "20" });
    if (statusFilter !== "all") qs.set("status", statusFilter);
    const r = await apiFetch<unknown>(`/admin/source-orders?${qs}`);
    if (r.success) {
      const d = r.data as { data: SourceOrder[]; meta: { total: number } };
      setItems(d.data);
      setTotal(d.meta.total);
    }
    setLoading(false);
  }, [page, statusFilter]);

  useEffect(() => {
    load();
  }, [load]);

  async function retry(id: string) {
    setActionId(id);
    const r = await apiFetch(`/admin/source-orders/${id}/retry`, { method: "POST" });
    setActionId(null);
    if (r.success) {
      show("Дахин queue-д орлоо", "success");
      load();
    } else {
      show(r.error?.message ?? "Алдаа гарлаа", "error");
    }
  }

  const totalPages = Math.ceil(total / 20);

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
          Amazon эх захиалгууд
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
            {s === "all" ? "Бүгд" : STATUS_LABEL[s]}
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
        ) : items.length === 0 ? (
          <div
            style={{
              padding: "48px 20px",
              textAlign: "center",
              color: "var(--mute)",
              fontSize: 13,
            }}
          >
            Amazon эх захиалга олдсонгүй
          </div>
        ) : (
          <table style={{ width: "100%", borderCollapse: "collapse", fontSize: 13 }}>
            <thead>
              <tr style={{ background: "var(--bg-cream)" }}>
                {["Захиалга", "Бараа", "Статус", "Оролдлого", "Огноо", ""].map((h) => (
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
                ))}
              </tr>
            </thead>
            <tbody>
              {items.map((item, i) => {
                const sc = STATUS_COLOR[item.status] ?? {
                  bg: "var(--bg-stone)",
                  color: "var(--mute)",
                };
                return (
                  <tr
                    key={item.id}
                    style={{
                      borderBottom:
                        i < items.length - 1 ? "1px solid var(--line)" : "none",
                    }}
                  >
                    <td style={{ padding: "11px 14px", whiteSpace: "nowrap" }}>
                      <span
                        className="num"
                        style={{ color: "var(--accent)", fontWeight: 500, fontSize: 12 }}
                      >
                        {item.orderItem.order.orderNumber}
                      </span>
                    </td>
                    <td style={{ padding: "11px 14px", maxWidth: 240 }}>
                      <p
                        style={{
                          color: "var(--ink-2)",
                          overflow: "hidden",
                          textOverflow: "ellipsis",
                          whiteSpace: "nowrap",
                        }}
                      >
                        {item.orderItem.product.titleMn}
                      </p>
                    </td>
                    <td style={{ padding: "11px 14px", whiteSpace: "nowrap" }}>
                      <span
                        style={{
                          fontSize: 11,
                          padding: "2px 8px",
                          borderRadius: 99,
                          background: sc.bg,
                          color: sc.color,
                          fontWeight: 500,
                        }}
                      >
                        {STATUS_LABEL[item.status] ?? item.status}
                      </span>
                      {item.errorMessage && (
                        <p
                          style={{
                            fontSize: 11,
                            color: "#b91c1c",
                            marginTop: 3,
                            maxWidth: 180,
                            overflow: "hidden",
                            textOverflow: "ellipsis",
                            whiteSpace: "nowrap",
                          }}
                          title={item.errorMessage}
                        >
                          {item.errorMessage}
                        </p>
                      )}
                    </td>
                    <td style={{ padding: "11px 14px", textAlign: "center" }}>
                      <span
                        className="num"
                        style={{
                          fontSize: 13,
                          color: item.retryCount > 0 ? "#b91c1c" : "var(--mute-2)",
                        }}
                      >
                        {item.retryCount}
                      </span>
                    </td>
                    <td style={{ padding: "11px 14px", whiteSpace: "nowrap" }}>
                      <p style={{ fontSize: 12, color: "var(--mute)" }}>
                        {new Date(item.createdAt).toLocaleDateString("mn-MN")}
                      </p>
                      {item.shippedAt && (
                        <p style={{ fontSize: 11, color: "var(--mute-2)" }}>
                          Илгээсэн: {new Date(item.shippedAt).toLocaleDateString("mn-MN")}
                        </p>
                      )}
                    </td>
                    <td style={{ padding: "11px 14px", whiteSpace: "nowrap" }}>
                      {item.status === "failed" && (
                        <button
                          onClick={() => retry(item.id)}
                          disabled={actionId === item.id}
                          style={{
                            height: 28,
                            padding: "0 12px",
                            background: "#fee2e2",
                            color: "#b91c1c",
                            border: "1px solid #fca5a5",
                            borderRadius: "var(--r-1)",
                            fontSize: 11,
                            fontWeight: 500,
                            cursor: "pointer",
                            opacity: actionId === item.id ? 0.5 : 1,
                            fontFamily: "var(--sans)",
                          }}
                        >
                          {actionId === item.id ? "…" : "Дахин оролдох"}
                        </button>
                      )}
                    </td>
                  </tr>
                );
              })}
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
            {page} / {totalPages}
          </span>
          <button
            onClick={() => setPage((p) => p + 1)}
            disabled={page >= totalPages}
            style={{
              height: 32,
              padding: "0 14px",
              border: "1px solid var(--line)",
              borderRadius: "var(--r-2)",
              background: "var(--bg-paper)",
              fontSize: 12,
              cursor: page >= totalPages ? "not-allowed" : "pointer",
              color: page >= totalPages ? "var(--mute-2)" : "var(--ink)",
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
