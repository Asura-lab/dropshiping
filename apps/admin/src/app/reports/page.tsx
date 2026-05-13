"use client";

import { useEffect, useState } from "react";
import { apiFetch } from "@/lib/api";

interface DailyRevenue {
  date: string;
  amount: number;
}

interface TopProduct {
  product: { id: string; titleMn: string; priceMnt: string } | null;
  totalQuantity: number;
  orderCount: number;
}

interface Summary {
  totalRevenueMnt: number;
  paidOrderCount: number;
  totalOrders: number;
  statusCounts: Record<string, number>;
  dailyRevenue: DailyRevenue[];
  topProducts: TopProduct[];
}

const STATUS_LABELS: Record<string, string> = {
  pending: "Хүлээгдэж байна",
  confirmed: "Баталгаажсан",
  processing: "Боловсруулж байна",
  shipped: "Илгээсэн",
  delivered: "Хүргэгдсэн",
  cancelled: "Цуцлагдсан",
};

const STATUS_COLORS: Record<string, string> = {
  pending: "#d97706",
  confirmed: "#16a34a",
  processing: "#2563eb",
  shipped: "#7c3aed",
  delivered: "#16a34a",
  cancelled: "#9ca3af",
};

function fmt(n: number) {
  return n.toLocaleString("en-US");
}

export default function ReportsPage() {
  const [summary, setSummary] = useState<Summary | null>(null);
  const [loading, setLoading] = useState(true);

  // Export filters
  const [exportFrom, setExportFrom] = useState("");
  const [exportTo, setExportTo] = useState("");
  const [exportStatus, setExportStatus] = useState("");
  const [exporting, setExporting] = useState(false);

  useEffect(() => {
    apiFetch<Summary>("/admin/reports/summary").then((r) => {
      if (r.success) setSummary(r.data as Summary);
      setLoading(false);
    });
  }, []);

  async function handleExport() {
    setExporting(true);
    const qs = new URLSearchParams();
    if (exportFrom) qs.set("from", exportFrom);
    if (exportTo) qs.set("to", exportTo);
    if (exportStatus) qs.set("status", exportStatus);

    const token = localStorage.getItem("access_token");
    const base = process.env.NEXT_PUBLIC_API_URL ?? "http://localhost:4000/v1";
    const url = `${base}/admin/reports/orders/export?${qs.toString()}`;

    const res = await fetch(url, { headers: { Authorization: `Bearer ${token}` } });
    if (res.ok) {
      const blob = await res.blob();
      const a = document.createElement("a");
      a.href = URL.createObjectURL(blob);
      a.download = `orders-${new Date().toISOString().slice(0, 10)}.csv`;
      a.click();
      URL.revokeObjectURL(a.href);
    }
    setExporting(false);
  }

  const maxDaily = summary
    ? Math.max(...summary.dailyRevenue.map((d) => d.amount), 1)
    : 1;

  return (
    <div style={{ padding: "28px", maxWidth: 960 }}>
      {/* Header */}
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
          Тайлан
        </h1>
      </div>

      {/* Summary cards */}
      <div
        style={{
          display: "grid",
          gridTemplateColumns: "repeat(auto-fill, minmax(180px, 1fr))",
          gap: 12,
          marginBottom: 28,
        }}
      >
        {[
          {
            label: "Нийт орлого",
            value: loading ? "—" : `${fmt(summary?.totalRevenueMnt ?? 0)}₮`,
            sub: "Төлсөн захиалгаас",
          },
          {
            label: "Төлсөн захиалга",
            value: loading ? "—" : fmt(summary?.paidOrderCount ?? 0),
            sub: "Нийт",
          },
          {
            label: "Бүх захиалга",
            value: loading ? "—" : fmt(summary?.totalOrders ?? 0),
            sub: "Нийт",
          },
          {
            label: "Хүргэгдсэн",
            value: loading ? "—" : fmt(summary?.statusCounts?.delivered ?? 0),
            sub: "Амжилттай",
          },
        ].map((s) => (
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
                fontSize: 22,
                fontWeight: 700,
                color: "var(--ink)",
                marginBottom: 4,
              }}
            >
              {s.value}
            </p>
            <p style={{ fontSize: 11, color: "var(--mute-2)" }}>{s.sub}</p>
          </div>
        ))}
      </div>

      <div
        style={{
          display: "grid",
          gridTemplateColumns: "1fr 1fr",
          gap: 16,
          marginBottom: 28,
        }}
      >
        {/* Захиалга төлөвөөр */}
        <div
          style={{
            background: "var(--bg-paper)",
            border: "1px solid var(--line)",
            borderRadius: "var(--r-3)",
            padding: "18px 20px",
          }}
        >
          <p
            style={{
              fontSize: 13,
              fontWeight: 500,
              color: "var(--ink)",
              marginBottom: 14,
            }}
          >
            Захиалга — төлөвөөр
          </p>
          {loading ? (
            <div
              style={{
                height: 120,
                background: "var(--bg-cream)",
                borderRadius: "var(--r-2)",
              }}
            />
          ) : (
            <div style={{ display: "flex", flexDirection: "column", gap: 10 }}>
              {Object.entries(STATUS_LABELS).map(([key, label]) => {
                const count = summary?.statusCounts?.[key] ?? 0;
                const total = summary?.totalOrders ?? 1;
                const pct = total > 0 ? Math.round((count / total) * 100) : 0;
                return (
                  <div key={key}>
                    <div
                      style={{
                        display: "flex",
                        justifyContent: "space-between",
                        marginBottom: 4,
                      }}
                    >
                      <span style={{ fontSize: 12, color: "var(--mute)" }}>{label}</span>
                      <span
                        className="num"
                        style={{ fontSize: 12, color: "var(--ink-2)", fontWeight: 500 }}
                      >
                        {fmt(count)}
                      </span>
                    </div>
                    <div
                      style={{
                        height: 5,
                        background: "var(--bg-stone)",
                        borderRadius: 99,
                      }}
                    >
                      <div
                        style={{
                          height: 5,
                          width: `${pct}%`,
                          background: STATUS_COLORS[key] ?? "var(--accent)",
                          borderRadius: 99,
                          transition: "width 0.4s ease",
                        }}
                      />
                    </div>
                  </div>
                );
              })}
            </div>
          )}
        </div>

        {/* Top products */}
        <div
          style={{
            background: "var(--bg-paper)",
            border: "1px solid var(--line)",
            borderRadius: "var(--r-3)",
            padding: "18px 20px",
          }}
        >
          <p
            style={{
              fontSize: 13,
              fontWeight: 500,
              color: "var(--ink)",
              marginBottom: 14,
            }}
          >
            Их захиалагдсан бараа (Top 5)
          </p>
          {loading ? (
            <div
              style={{
                height: 120,
                background: "var(--bg-cream)",
                borderRadius: "var(--r-2)",
              }}
            />
          ) : summary?.topProducts.length === 0 ? (
            <p style={{ fontSize: 12, color: "var(--mute)", paddingTop: 8 }}>
              Өгөгдөл байхгүй
            </p>
          ) : (
            <div style={{ display: "flex", flexDirection: "column", gap: 10 }}>
              {summary?.topProducts.map((tp, i) => (
                <div key={i} style={{ display: "flex", alignItems: "center", gap: 10 }}>
                  <span
                    style={{
                      fontSize: 11,
                      color: "var(--mute-2)",
                      width: 16,
                      textAlign: "right",
                      flexShrink: 0,
                    }}
                  >
                    {i + 1}
                  </span>
                  <div style={{ flex: 1, minWidth: 0 }}>
                    <p
                      style={{
                        fontSize: 12,
                        color: "var(--ink-2)",
                        overflow: "hidden",
                        textOverflow: "ellipsis",
                        whiteSpace: "nowrap",
                      }}
                    >
                      {tp.product?.titleMn ?? "—"}
                    </p>
                  </div>
                  <span
                    className="num"
                    style={{ fontSize: 11, color: "var(--mute)", flexShrink: 0 }}
                  >
                    {fmt(tp.totalQuantity)} ш
                  </span>
                </div>
              ))}
            </div>
          )}
        </div>
      </div>

      {/* Daily revenue — last 30 days */}
      <div
        style={{
          background: "var(--bg-paper)",
          border: "1px solid var(--line)",
          borderRadius: "var(--r-3)",
          padding: "18px 20px",
          marginBottom: 28,
        }}
      >
        <p
          style={{ fontSize: 13, fontWeight: 500, color: "var(--ink)", marginBottom: 16 }}
        >
          Өдрийн орлого — сүүлийн 30 хоног
        </p>
        {loading ? (
          <div
            style={{
              height: 100,
              background: "var(--bg-cream)",
              borderRadius: "var(--r-2)",
            }}
          />
        ) : (
          <div style={{ overflowX: "auto" }}>
            <div
              style={{
                display: "flex",
                alignItems: "flex-end",
                gap: 3,
                height: 80,
                minWidth: 600,
              }}
            >
              {summary?.dailyRevenue.map((d) => {
                const h =
                  maxDaily > 0 ? Math.max(2, Math.round((d.amount / maxDaily) * 72)) : 2;
                return (
                  <div
                    key={d.date}
                    style={{
                      flex: 1,
                      display: "flex",
                      flexDirection: "column",
                      alignItems: "center",
                      gap: 4,
                      cursor: "default",
                    }}
                    title={`${d.date}: ${fmt(d.amount)}₮`}
                  >
                    <div
                      style={{
                        width: "100%",
                        height: h,
                        background: d.amount > 0 ? "var(--accent)" : "var(--bg-stone)",
                        borderRadius: "2px 2px 0 0",
                        opacity: d.amount > 0 ? 1 : 0.5,
                      }}
                    />
                  </div>
                );
              })}
            </div>
            <div
              style={{ display: "flex", justifyContent: "space-between", marginTop: 6 }}
            >
              <span style={{ fontSize: 10, color: "var(--mute-2)" }}>
                {summary?.dailyRevenue[0]?.date?.slice(5) ?? ""}
              </span>
              <span style={{ fontSize: 10, color: "var(--mute-2)" }}>
                {summary?.dailyRevenue[summary.dailyRevenue.length - 1]?.date?.slice(5) ??
                  ""}
              </span>
            </div>
          </div>
        )}
      </div>

      {/* CSV Export */}
      <div
        style={{
          background: "var(--bg-paper)",
          border: "1px solid var(--line)",
          borderRadius: "var(--r-3)",
          padding: "18px 20px",
        }}
      >
        <p
          style={{ fontSize: 13, fontWeight: 500, color: "var(--ink)", marginBottom: 14 }}
        >
          Захиалга CSV татах
        </p>
        <div
          style={{ display: "flex", flexWrap: "wrap", gap: 10, alignItems: "flex-end" }}
        >
          <div>
            <label
              style={{
                display: "block",
                fontSize: 11,
                color: "var(--mute)",
                marginBottom: 4,
              }}
            >
              Эхлэх огноо
            </label>
            <input
              type="date"
              value={exportFrom}
              onChange={(e) => setExportFrom(e.target.value)}
              style={{
                height: 32,
                padding: "0 10px",
                border: "1px solid var(--line)",
                borderRadius: "var(--r-1)",
                fontSize: 12,
                color: "var(--ink)",
                background: "var(--bg-cream)",
                fontFamily: "var(--sans)",
                outline: "none",
              }}
            />
          </div>
          <div>
            <label
              style={{
                display: "block",
                fontSize: 11,
                color: "var(--mute)",
                marginBottom: 4,
              }}
            >
              Дуусах огноо
            </label>
            <input
              type="date"
              value={exportTo}
              onChange={(e) => setExportTo(e.target.value)}
              style={{
                height: 32,
                padding: "0 10px",
                border: "1px solid var(--line)",
                borderRadius: "var(--r-1)",
                fontSize: 12,
                color: "var(--ink)",
                background: "var(--bg-cream)",
                fontFamily: "var(--sans)",
                outline: "none",
              }}
            />
          </div>
          <div>
            <label
              style={{
                display: "block",
                fontSize: 11,
                color: "var(--mute)",
                marginBottom: 4,
              }}
            >
              Төлөв
            </label>
            <select
              value={exportStatus}
              onChange={(e) => setExportStatus(e.target.value)}
              style={{
                height: 32,
                padding: "0 10px",
                border: "1px solid var(--line)",
                borderRadius: "var(--r-1)",
                fontSize: 12,
                color: "var(--ink)",
                background: "var(--bg-cream)",
                fontFamily: "var(--sans)",
                outline: "none",
              }}
            >
              <option value="">Бүгд</option>
              {Object.entries(STATUS_LABELS).map(([v, l]) => (
                <option key={v} value={v}>
                  {l}
                </option>
              ))}
            </select>
          </div>
          <button
            onClick={handleExport}
            disabled={exporting}
            style={{
              height: 32,
              padding: "0 18px",
              background: "var(--accent)",
              color: "#fff",
              border: "none",
              borderRadius: "var(--r-1)",
              fontSize: 12,
              fontWeight: 500,
              cursor: exporting ? "not-allowed" : "pointer",
              opacity: exporting ? 0.6 : 1,
              fontFamily: "var(--sans)",
              flexShrink: 0,
            }}
          >
            {exporting ? "Татаж байна…" : "CSV татах"}
          </button>
        </div>
        <p style={{ fontSize: 11, color: "var(--mute-2)", marginTop: 10 }}>
          Огноо хоосон байвал бүх захиалга татна. Excel-д нэхэхэд UTF-8 BOM-тайгаар
          хадгална.
        </p>
      </div>
    </div>
  );
}
