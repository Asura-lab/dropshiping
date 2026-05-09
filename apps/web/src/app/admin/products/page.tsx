"use client";

import { useEffect, useState, useCallback } from "react";
import { apiFetch } from "@/lib/api";
import { useToast } from "@/components/ui/Toast";
import { ImageUpload } from "@/components/ui/ImageUpload";

interface Product {
  id: string;
  titleMn: string;
  titleOriginal: string;
  priceMnt: string;
  sourcePlatform: string;
  stockStatus: string;
  category: string | null;
  createdAt: string;
  images: { url: string; is_primary: boolean }[];
}

const PLATFORM_BG: Record<string, string> = {
  taobao: "#FBEAE0",
  alibaba: "#F2EBD6",
  amazon: "#E4E7EA",
};

const STOCK_STATUS: Record<string, { label: string; color: string }> = {
  in_stock: { label: "Байгаа", color: "#16a34a" },
  out_of_stock: { label: "Дууссан", color: "#dc2626" },
  unknown: { label: "Тодорхойгүй", color: "var(--mute)" },
};

export default function AdminProductsPage() {
  const { show } = useToast();
  const [products, setProducts] = useState<Product[]>([]);
  const [loading, setLoading] = useState(true);
  const [showForm, setShowForm] = useState(false);
  const [saving, setSaving] = useState(false);
  const [images, setImages] = useState<string[]>([]);
  const [form, setForm] = useState({
    titleMn: "",
    titleOriginal: "",
    descriptionMn: "",
    sourcePlatform: "taobao",
    sourceUrl: "",
    sourceId: "",
    priceMnt: "",
    priceOriginal: "",
    currencyOriginal: "CNY",
    shippingFee: "0",
    customsFee: "0",
    category: "",
    stockStatus: "in_stock",
  });

  const load = useCallback(async () => {
    setLoading(true);
    const r = await apiFetch<Product[]>("/admin/products");
    if (r.success) setProducts(r.data);
    setLoading(false);
  }, []);

  useEffect(() => {
    load();
  }, [load]);

  async function handleSubmit() {
    const required = [
      "titleMn",
      "titleOriginal",
      "sourceUrl",
      "sourceId",
      "priceMnt",
      "priceOriginal",
    ] as const;
    for (const k of required) {
      if (!form[k]) {
        show(`${k} шаардлагатай`, "error");
        return;
      }
    }
    setSaving(true);
    const r = await apiFetch<Product>("/admin/products", {
      method: "POST",
      body: JSON.stringify({
        ...form,
        priceMnt: Number(form.priceMnt),
        priceOriginal: Number(form.priceOriginal),
        shippingFee: Number(form.shippingFee),
        customsFee: Number(form.customsFee),
        category: form.category || undefined,
        descriptionMn: form.descriptionMn || undefined,
        images: images.map((url, i) => ({ url, is_primary: i === 0 })),
      }),
    });
    setSaving(false);
    if (r.success) {
      setProducts((p) => [r.data, ...p]);
      setShowForm(false);
      setImages([]);
      setForm({
        titleMn: "",
        titleOriginal: "",
        descriptionMn: "",
        sourcePlatform: "taobao",
        sourceUrl: "",
        sourceId: "",
        priceMnt: "",
        priceOriginal: "",
        currencyOriginal: "CNY",
        shippingFee: "0",
        customsFee: "0",
        category: "",
        stockStatus: "in_stock",
      });
      show("Бараа нэмэгдлээ", "success");
    } else {
      show(r.error?.message ?? "Алдаа гарлаа", "error");
    }
  }

  async function toggleStock(id: string, current: string) {
    const next = current === "in_stock" ? "out_of_stock" : "in_stock";
    const r = await apiFetch(`/admin/products/${id}`, {
      method: "PATCH",
      body: JSON.stringify({ stockStatus: next }),
    });
    if (r.success) {
      setProducts((p) => p.map((x) => (x.id === id ? { ...x, stockStatus: next } : x)));
    }
  }

  return (
    <div style={{ padding: "28px" }}>
      <div
        style={{
          marginBottom: 22,
          display: "flex",
          justifyContent: "space-between",
          alignItems: "flex-end",
        }}
      >
        <div>
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
            Бараа
          </h1>
        </div>
        <button
          onClick={() => setShowForm((v) => !v)}
          style={{
            height: 38,
            padding: "0 18px",
            background: "var(--accent)",
            color: "var(--bg-paper)",
            border: "none",
            borderRadius: "var(--r-2)",
            fontSize: 13,
            fontWeight: 500,
            cursor: "pointer",
            fontFamily: "var(--sans)",
            display: "flex",
            alignItems: "center",
            gap: 6,
          }}
        >
          <svg
            width="13"
            height="13"
            viewBox="0 0 24 24"
            fill="none"
            stroke="currentColor"
            strokeWidth="2.5"
            strokeLinecap="round"
          >
            <path d="M12 5v14M5 12h14" />
          </svg>
          Бараа нэмэх
        </button>
      </div>

      {/* Add form */}
      {showForm && (
        <div
          style={{
            background: "var(--bg-paper)",
            border: "1px solid var(--line)",
            borderRadius: "var(--r-3)",
            padding: "20px",
            marginBottom: 20,
          }}
        >
          <p
            style={{
              fontSize: 14,
              fontWeight: 600,
              color: "var(--ink)",
              marginBottom: 16,
            }}
          >
            Шинэ бараа нэмэх
          </p>
          <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 12 }}>
            {[
              {
                key: "titleMn" as const,
                label: "Монгол нэр *",
                placeholder: "Ухаалаг цаг",
              },
              {
                key: "titleOriginal" as const,
                label: "Эх нэр *",
                placeholder: "Smart Watch...",
              },
              {
                key: "sourceUrl" as const,
                label: "Эх сурвалжийн URL *",
                placeholder: "https://...",
              },
              {
                key: "sourceId" as const,
                label: "Эх дугаар *",
                placeholder: "123456789",
              },
              {
                key: "priceMnt" as const,
                label: "Үнэ (₮) *",
                placeholder: "50000",
                type: "number",
              },
              {
                key: "priceOriginal" as const,
                label: "Эх үнэ *",
                placeholder: "99.00",
                type: "number",
              },
              {
                key: "shippingFee" as const,
                label: "Тээврийн зардал (₮)",
                placeholder: "0",
                type: "number",
              },
              {
                key: "customsFee" as const,
                label: "Гаалийн татвар (₮)",
                placeholder: "0",
                type: "number",
              },
              { key: "category" as const, label: "Ангилал", placeholder: "Электроник" },
              { key: "descriptionMn" as const, label: "Тайлбар", placeholder: "..." },
            ].map((f) => (
              <div key={f.key}>
                <label
                  style={{
                    fontSize: 11,
                    color: "var(--mute)",
                    display: "block",
                    marginBottom: 4,
                  }}
                >
                  {f.label}
                </label>
                <input
                  type={f.type ?? "text"}
                  placeholder={f.placeholder}
                  value={form[f.key]}
                  onChange={(e) => setForm((p) => ({ ...p, [f.key]: e.target.value }))}
                  style={{
                    width: "100%",
                    height: 36,
                    padding: "0 10px",
                    border: "1px solid var(--line)",
                    borderRadius: "var(--r-2)",
                    background: "var(--bg-paper)",
                    fontSize: 13,
                    color: "var(--ink)",
                    fontFamily: "var(--sans)",
                    outline: "none",
                    boxSizing: "border-box",
                  }}
                  onFocus={(e) =>
                    (e.currentTarget.style.borderColor = "var(--accent-mid)")
                  }
                  onBlur={(e) => (e.currentTarget.style.borderColor = "var(--line)")}
                />
              </div>
            ))}
          </div>

          {/* Images */}
          <div style={{ marginTop: 12 }}>
            <label
              style={{
                fontSize: 11,
                color: "var(--mute)",
                display: "block",
                marginBottom: 6,
              }}
            >
              Зурагнууд (эхний нь үндсэн зураг болно)
            </label>
            <ImageUpload value={images} onChange={setImages} maxFiles={5} />
          </div>

          {/* Selects */}
          <div
            style={{
              display: "grid",
              gridTemplateColumns: "1fr 1fr 1fr",
              gap: 12,
              marginTop: 12,
            }}
          >
            {[
              {
                key: "sourcePlatform" as const,
                label: "Платформ",
                options: ["taobao", "alibaba", "amazon"],
              },
              {
                key: "currencyOriginal" as const,
                label: "Валют",
                options: ["CNY", "USD", "KRW"],
              },
              {
                key: "stockStatus" as const,
                label: "Нөөц",
                options: ["in_stock", "out_of_stock", "unknown"],
              },
            ].map((f) => (
              <div key={f.key}>
                <label
                  style={{
                    fontSize: 11,
                    color: "var(--mute)",
                    display: "block",
                    marginBottom: 4,
                  }}
                >
                  {f.label}
                </label>
                <select
                  value={form[f.key]}
                  onChange={(e) => setForm((p) => ({ ...p, [f.key]: e.target.value }))}
                  style={{
                    width: "100%",
                    height: 36,
                    padding: "0 8px",
                    border: "1px solid var(--line)",
                    borderRadius: "var(--r-2)",
                    background: "var(--bg-paper)",
                    fontSize: 13,
                    color: "var(--ink)",
                    fontFamily: "var(--sans)",
                    cursor: "pointer",
                    boxSizing: "border-box",
                  }}
                >
                  {f.options.map((o) => (
                    <option key={o} value={o}>
                      {o}
                    </option>
                  ))}
                </select>
              </div>
            ))}
          </div>

          <div style={{ display: "flex", gap: 8, marginTop: 16 }}>
            <button
              onClick={() => setShowForm(false)}
              style={{
                height: 38,
                padding: "0 16px",
                border: "1px solid var(--line)",
                borderRadius: "var(--r-2)",
                background: "var(--bg-paper)",
                color: "var(--mute)",
                fontSize: 13,
                cursor: "pointer",
                fontFamily: "var(--sans)",
              }}
            >
              Цуцлах
            </button>
            <button
              onClick={handleSubmit}
              disabled={saving}
              style={{
                height: 38,
                padding: "0 24px",
                background: "var(--accent)",
                color: "var(--bg-paper)",
                border: "none",
                borderRadius: "var(--r-2)",
                fontSize: 13,
                fontWeight: 500,
                cursor: saving ? "not-allowed" : "pointer",
                opacity: saving ? 0.7 : 1,
                fontFamily: "var(--sans)",
              }}
            >
              {saving ? "Хадгалж байна…" : "Нэмэх"}
            </button>
          </div>
        </div>
      )}

      {/* Product list */}
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
            {Array.from({ length: 6 }).map((_, i) => (
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
        ) : products.length === 0 ? (
          <div
            style={{
              padding: "48px 20px",
              textAlign: "center",
              color: "var(--mute)",
              fontSize: 13,
            }}
          >
            Бараа байхгүй байна
          </div>
        ) : (
          <table style={{ width: "100%", borderCollapse: "collapse", fontSize: 13 }}>
            <thead>
              <tr style={{ background: "var(--bg-cream)" }}>
                {["", "Нэр", "Платформ", "Үнэ", "Ангилал", "Нөөц", ""].map((h) => (
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
                    }}
                  >
                    {h}
                  </th>
                ))}
              </tr>
            </thead>
            <tbody>
              {products.map((p, i) => {
                const stock = STOCK_STATUS[p.stockStatus] ?? {
                  label: p.stockStatus,
                  color: "var(--mute)",
                };
                return (
                  <tr
                    key={p.id}
                    style={{
                      borderBottom:
                        i < products.length - 1 ? "1px solid var(--line)" : "none",
                    }}
                  >
                    <td style={{ padding: "8px 8px 8px 14px", width: 48 }}>
                      {(() => {
                        const img = p.images?.find((x) => x.is_primary) ?? p.images?.[0];
                        return img ? (
                          <img
                            src={img.url}
                            alt=""
                            style={{
                              width: 40,
                              height: 40,
                              objectFit: "cover",
                              borderRadius: "var(--r-2)",
                              display: "block",
                            }}
                          />
                        ) : (
                          <div
                            style={{
                              width: 40,
                              height: 40,
                              borderRadius: "var(--r-2)",
                              background: "var(--bg-stone)",
                            }}
                          />
                        );
                      })()}
                    </td>
                    <td style={{ padding: "11px 14px", maxWidth: 240 }}>
                      <p
                        style={{
                          fontWeight: 500,
                          color: "var(--ink)",
                          overflow: "hidden",
                          textOverflow: "ellipsis",
                          whiteSpace: "nowrap",
                        }}
                      >
                        {p.titleMn}
                      </p>
                      <p
                        style={{
                          fontSize: 11,
                          color: "var(--mute-2)",
                          overflow: "hidden",
                          textOverflow: "ellipsis",
                          whiteSpace: "nowrap",
                        }}
                      >
                        {p.titleOriginal}
                      </p>
                    </td>
                    <td style={{ padding: "11px 14px" }}>
                      <span
                        style={{
                          display: "inline-flex",
                          padding: "3px 8px",
                          borderRadius: "var(--r-1)",
                          fontSize: 11,
                          fontWeight: 500,
                          background: PLATFORM_BG[p.sourcePlatform] ?? "var(--bg-cream)",
                          color: "var(--ink-2)",
                        }}
                      >
                        {p.sourcePlatform}
                      </span>
                    </td>
                    <td style={{ padding: "11px 14px" }}>
                      <span
                        className="num"
                        style={{ fontWeight: 500, color: "var(--ink)" }}
                      >
                        {Number(p.priceMnt).toLocaleString("en-US")}₮
                      </span>
                    </td>
                    <td
                      style={{ padding: "11px 14px", color: "var(--mute)", fontSize: 12 }}
                    >
                      {p.category ?? "—"}
                    </td>
                    <td style={{ padding: "11px 14px" }}>
                      <span style={{ fontSize: 12, color: stock.color, fontWeight: 500 }}>
                        {stock.label}
                      </span>
                    </td>
                    <td style={{ padding: "11px 14px" }}>
                      <button
                        onClick={() => toggleStock(p.id, p.stockStatus)}
                        style={{
                          height: 28,
                          padding: "0 12px",
                          border: "1px solid var(--line)",
                          borderRadius: "var(--r-1)",
                          background: "var(--bg-paper)",
                          color: "var(--mute)",
                          fontSize: 11,
                          cursor: "pointer",
                          fontFamily: "var(--sans)",
                          whiteSpace: "nowrap",
                        }}
                      >
                        {p.stockStatus === "in_stock" ? "Дуусгах" : "Нөөцлөх"}
                      </button>
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        )}
      </div>
    </div>
  );
}
