import { Suspense } from "react";
import ProductList from "./ProductList";

export const metadata = { title: "Бараа — Дэлгүүр" };

export default function ProductsPage() {
  return (
    <div style={{ maxWidth: "1200px", margin: "0 auto", padding: "32px 24px" }}>
      <h1 style={{ fontSize: "24px", fontWeight: 700, marginBottom: "24px" }}>Бараа</h1>
      <Suspense fallback={<ProductsSkeleton />}>
        <ProductList />
      </Suspense>
    </div>
  );
}

function ProductsSkeleton() {
  return (
    <div
      style={{
        display: "grid",
        gridTemplateColumns: "repeat(auto-fill, minmax(220px, 1fr))",
        gap: "20px",
      }}
    >
      {Array.from({ length: 8 }).map((_, i) => (
        <div
          key={i}
          style={{
            background: "var(--color-surface)",
            border: "1px solid var(--color-border)",
            borderRadius: "var(--radius-lg)",
            overflow: "hidden",
          }}
        >
          <div
            style={{
              height: "200px",
              background: "var(--color-bg-muted)",
              animation: "pulse 1.5s infinite",
            }}
          />
          <div
            style={{
              padding: "16px",
              display: "flex",
              flexDirection: "column",
              gap: "8px",
            }}
          >
            <div
              style={{
                height: "16px",
                background: "var(--color-bg-muted)",
                borderRadius: "4px",
                animation: "pulse 1.5s infinite",
              }}
            />
            <div
              style={{
                height: "16px",
                width: "60%",
                background: "var(--color-bg-muted)",
                borderRadius: "4px",
                animation: "pulse 1.5s infinite",
              }}
            />
            <div
              style={{
                height: "20px",
                width: "40%",
                background: "var(--color-bg-muted)",
                borderRadius: "4px",
                animation: "pulse 1.5s infinite",
              }}
            />
          </div>
        </div>
      ))}
    </div>
  );
}
