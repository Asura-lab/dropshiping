"use client";

import { useState, useMemo } from "react";
import Link from "next/link";

interface Product {
  id: string;
  titleMn: string;
  priceMnt: string;
  images: { url: string; is_primary: boolean }[];
  sourcePlatform: string;
  stockStatus: string;
  category: string | null;
}

const platformStyle: Record<string, { label: string; bg: string }> = {
  taobao: { label: "Taobao", bg: "#FBEAE0" },
  alibaba: { label: "Alibaba", bg: "#F2EBD6" },
  amazon: { label: "Amazon", bg: "#E4E7EA" },
};

const CATEGORIES = ["Бүгд", "Гэр ахуй", "Электроник", "Хувцас", "Тоглоом", "Бичиг хэрэг"];
const PLATFORMS = [
  { key: "all", label: "Бүгд" },
  { key: "taobao", label: "Taobao" },
  { key: "alibaba", label: "Alibaba" },
  { key: "amazon", label: "Amazon" },
];

export function ProductsClient({ products }: { products: Product[] }) {
  const [query, setQuery] = useState("");
  const [category, setCategory] = useState("Бүгд");
  const [platform, setPlatform] = useState("all");

  const filtered = useMemo(() => {
    const q = query.trim().toLowerCase();
    return products.filter((p) => {
      if (q && !p.titleMn.toLowerCase().includes(q)) return false;
      if (category !== "Бүгд" && p.category !== category) return false;
      if (platform !== "all" && p.sourcePlatform !== platform) return false;
      return true;
    });
  }, [products, query, category, platform]);

  return (
    <div>
      {/* Search + filters */}
      <div
        style={{ marginBottom: 20, display: "flex", flexDirection: "column", gap: 12 }}
      >
        {/* Search bar */}
        <div
          style={{
            position: "relative",
            maxWidth: 420,
          }}
        >
          <svg
            width="15"
            height="15"
            viewBox="0 0 24 24"
            fill="none"
            stroke="currentColor"
            strokeWidth="1.75"
            strokeLinecap="round"
            strokeLinejoin="round"
            style={{
              position: "absolute",
              left: 12,
              top: "50%",
              transform: "translateY(-50%)",
              color: "var(--mute)",
              pointerEvents: "none",
            }}
          >
            <circle cx="11" cy="11" r="7" />
            <path d="m20 20-3.5-3.5" />
          </svg>
          <input
            type="search"
            placeholder="Бараа хайх…"
            value={query}
            onChange={(e) => setQuery(e.target.value)}
            style={{
              width: "100%",
              height: 38,
              paddingLeft: 36,
              paddingRight: 14,
              border: "1px solid var(--line)",
              borderRadius: 99,
              background: "var(--bg-paper)",
              fontSize: 13,
              color: "var(--ink)",
              outline: "none",
              fontFamily: "var(--sans)",
              boxSizing: "border-box",
            }}
            onFocus={(e) => (e.currentTarget.style.borderColor = "var(--accent-mid)")}
            onBlur={(e) => (e.currentTarget.style.borderColor = "var(--line)")}
          />
        </div>

        {/* Platform chips */}
        <div style={{ display: "flex", gap: 6, flexWrap: "wrap" }}>
          {PLATFORMS.map((p) => (
            <button
              key={p.key}
              onClick={() => setPlatform(p.key)}
              style={{
                height: 28,
                padding: "0 12px",
                borderRadius: 99,
                border:
                  platform === p.key
                    ? "1.5px solid var(--accent)"
                    : "1px solid var(--line)",
                background: platform === p.key ? "var(--accent-soft)" : "var(--bg-paper)",
                color: platform === p.key ? "var(--accent)" : "var(--mute)",
                fontSize: 12,
                fontWeight: platform === p.key ? 600 : 400,
                cursor: "pointer",
                fontFamily: "var(--sans)",
                transition: "all 100ms ease",
              }}
            >
              {p.label}
            </button>
          ))}
          <div style={{ width: 1, background: "var(--line)", margin: "0 4px" }} />
          {CATEGORIES.map((cat) => (
            <button
              key={cat}
              onClick={() => setCategory(cat)}
              style={{
                height: 28,
                padding: "0 12px",
                borderRadius: 99,
                border:
                  category === cat ? "1.5px solid var(--ink-2)" : "1px solid var(--line)",
                background: category === cat ? "var(--ink-2)" : "var(--bg-paper)",
                color: category === cat ? "var(--bg-paper)" : "var(--mute)",
                fontSize: 12,
                fontWeight: category === cat ? 600 : 400,
                cursor: "pointer",
                fontFamily: "var(--sans)",
                transition: "all 100ms ease",
              }}
            >
              {cat}
            </button>
          ))}
        </div>

        {/* Result count */}
        <p style={{ fontSize: 12, color: "var(--mute-2)" }}>{filtered.length} бараа</p>
      </div>

      {/* Grid */}
      {filtered.length === 0 ? (
        <div style={{ padding: "80px 0", textAlign: "center" }}>
          <div
            style={{
              width: 56,
              height: 56,
              borderRadius: "50%",
              background: "var(--bg-cream)",
              display: "flex",
              alignItems: "center",
              justifyContent: "center",
              margin: "0 auto 16px",
              color: "var(--mute-2)",
            }}
          >
            <svg
              width="22"
              height="22"
              viewBox="0 0 24 24"
              fill="none"
              stroke="currentColor"
              strokeWidth="1.5"
              strokeLinecap="round"
              strokeLinejoin="round"
            >
              <circle cx="11" cy="11" r="7" />
              <path d="m20 20-3.5-3.5" />
            </svg>
          </div>
          <p style={{ fontSize: 14, color: "var(--ink-2)" }}>Бараа олдсонгүй</p>
          {(query || category !== "Бүгд" || platform !== "all") && (
            <button
              onClick={() => {
                setQuery("");
                setCategory("Бүгд");
                setPlatform("all");
              }}
              style={{
                marginTop: 12,
                fontSize: 13,
                color: "var(--accent)",
                background: "none",
                border: "none",
                cursor: "pointer",
                fontFamily: "var(--sans)",
              }}
            >
              Шүүлт арилгах
            </button>
          )}
        </div>
      ) : (
        <div
          style={{
            display: "grid",
            gridTemplateColumns: "repeat(auto-fill, minmax(190px, 1fr))",
            gap: 16,
          }}
        >
          {filtered.map((p) => (
            <ProductCard key={p.id} product={p} />
          ))}
        </div>
      )}
    </div>
  );
}

function ProductCard({ product: p }: { product: Product }) {
  const [hovered, setHovered] = useState(false);
  const image = p.images.find((i) => i.is_primary) ?? p.images[0];
  const price = Number(p.priceMnt).toLocaleString("en-US");
  const plat = platformStyle[p.sourcePlatform] ?? {
    label: p.sourcePlatform,
    bg: "var(--bg-cream)",
  };

  return (
    <Link href={`/products/${p.id}`} style={{ textDecoration: "none", display: "block" }}>
      <div
        onMouseEnter={() => setHovered(true)}
        onMouseLeave={() => setHovered(false)}
        style={{
          background: "var(--bg-paper)",
          border: `1px solid ${hovered ? "var(--line-2)" : "var(--line)"}`,
          borderRadius: "var(--r-3)",
          overflow: "hidden",
          transition: "border-color 120ms ease, box-shadow 120ms ease",
          boxShadow: hovered ? "0 2px 8px rgba(0,0,0,0.05)" : "none",
        }}
      >
        <div style={{ height: 180, position: "relative" }}>
          {image ? (
            <img
              src={image.url}
              alt={p.titleMn}
              style={{ width: "100%", height: "100%", objectFit: "cover" }}
            />
          ) : (
            <div className="ph" style={{ height: "100%", background: "var(--bg-cream)" }}>
              <span className="ph-label">{p.titleMn.toLowerCase()}</span>
            </div>
          )}
          {p.stockStatus === "out_of_stock" && (
            <div
              style={{
                position: "absolute",
                inset: 0,
                background: "rgba(250,250,248,0.8)",
                display: "flex",
                alignItems: "center",
                justifyContent: "center",
                fontSize: 12,
                fontWeight: 600,
                color: "var(--mute)",
              }}
            >
              Дууссан
            </div>
          )}
        </div>

        <div
          style={{
            padding: "12px 14px 14px",
            display: "flex",
            flexDirection: "column",
            gap: 8,
          }}
        >
          <div
            style={{
              display: "flex",
              alignItems: "center",
              justifyContent: "space-between",
            }}
          >
            <span
              style={{
                display: "inline-flex",
                alignItems: "center",
                padding: "3px 8px",
                borderRadius: "var(--r-1)",
                background: plat.bg,
                fontSize: 10.5,
                fontWeight: 500,
                color: "var(--ink-2)",
                letterSpacing: "0.01em",
              }}
            >
              {plat.label}
            </span>
            {p.category && (
              <span style={{ fontSize: 10.5, color: "var(--mute-2)" }}>{p.category}</span>
            )}
          </div>

          <p
            style={{
              fontSize: 13.5,
              fontWeight: 500,
              color: "var(--ink)",
              lineHeight: 1.35,
              overflow: "hidden",
              display: "-webkit-box",
              WebkitLineClamp: 2,
              WebkitBoxOrient: "vertical" as const,
              minHeight: 36,
            }}
          >
            {p.titleMn}
          </p>

          <span
            className="num"
            style={{ fontSize: 15, fontWeight: 600, color: "var(--ink)" }}
          >
            {price}₮
          </span>
        </div>
      </div>
    </Link>
  );
}
