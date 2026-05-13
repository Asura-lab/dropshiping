import { Suspense } from "react";
import ProductList from "./ProductList";

export const metadata = { title: "Бараа — OmniFlow" };

export default function ProductsPage() {
  return (
    <div style={{ background: "var(--bg-paper)", minHeight: "100%" }}>
      <div style={{ maxWidth: "1200px", margin: "0 auto", padding: "24px 18px" }}>
        <div style={{ marginBottom: 20 }}>
          <div className="eyebrow" style={{ marginBottom: 6 }}>
            Бүтээгдэхүүн
          </div>
          <h1 style={{ fontSize: 22, fontWeight: 600, letterSpacing: "-0.01em" }}>
            Бүх бараа
          </h1>
        </div>

        <Suspense fallback={<ProductsSkeleton />}>
          <ProductList />
        </Suspense>
      </div>
    </div>
  );
}

function ProductsSkeleton() {
  return (
    <div>
      {/* Search skeleton */}
      <div
        style={{ marginBottom: 20, display: "flex", flexDirection: "column", gap: 12 }}
      >
        <div
          style={{
            height: 38,
            maxWidth: 420,
            borderRadius: 99,
            background: "var(--bg-cream)",
            animation: "pulse 1.5s infinite",
          }}
        />
        <div style={{ display: "flex", gap: 6 }}>
          {Array.from({ length: 6 }).map((_, i) => (
            <div
              key={i}
              style={{
                height: 28,
                width: 60,
                borderRadius: 99,
                background: "var(--bg-cream)",
                animation: "pulse 1.5s infinite",
              }}
            />
          ))}
        </div>
      </div>

      <div
        style={{
          display: "grid",
          gridTemplateColumns: "repeat(auto-fill, minmax(190px, 1fr))",
          gap: 16,
        }}
      >
        {Array.from({ length: 8 }).map((_, i) => (
          <div
            key={i}
            style={{
              background: "var(--bg-paper)",
              border: "1px solid var(--line)",
              borderRadius: "var(--r-3)",
              overflow: "hidden",
            }}
          >
            <div
              style={{
                height: 180,
                background: "var(--bg-cream)",
                animation: "pulse 1.5s infinite",
              }}
            />
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
                  height: 12,
                  width: "40%",
                  background: "var(--bg-stone)",
                  borderRadius: 3,
                  animation: "pulse 1.5s infinite",
                }}
              />
              <div
                style={{
                  height: 32,
                  background: "var(--bg-stone)",
                  borderRadius: 3,
                  animation: "pulse 1.5s infinite",
                }}
              />
              <div
                style={{
                  height: 15,
                  width: "50%",
                  background: "var(--bg-stone)",
                  borderRadius: 3,
                  animation: "pulse 1.5s infinite",
                }}
              />
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}
