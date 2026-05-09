"use client";

import Link from "next/link";
import { useCart } from "@/lib/cart-context";
import { Button } from "@/components/ui/Button";

export default function CartPage() {
  const { items, total, removeItem, updateQuantity } = useCart();

  if (items.length === 0) {
    return (
      <div
        style={{
          maxWidth: "600px",
          margin: "80px auto",
          textAlign: "center",
          padding: "0 24px",
        }}
      >
        <div style={{ fontSize: "48px", marginBottom: "16px" }}>🛒</div>
        <h1 style={{ fontSize: "20px", fontWeight: 700, marginBottom: "8px" }}>
          Сагс хоосон байна
        </h1>
        <p style={{ color: "var(--color-text-secondary)", marginBottom: "24px" }}>
          Бараа сонгоод сагсанд нэмээрэй
        </p>
        <Link href="/products">
          <Button>Бараа үзэх</Button>
        </Link>
      </div>
    );
  }

  return (
    <div style={{ maxWidth: "800px", margin: "0 auto", padding: "32px 24px" }}>
      <h1 style={{ fontSize: "24px", fontWeight: 700, marginBottom: "24px" }}>Сагс</h1>

      <div
        style={{
          display: "flex",
          flexDirection: "column",
          gap: "12px",
          marginBottom: "32px",
        }}
      >
        {items.map((item) => (
          <div
            key={item.productId}
            style={{
              display: "flex",
              gap: "16px",
              background: "var(--bg-paper)",
              border: "1px solid var(--color-border)",
              borderRadius: "var(--radius-lg)",
              padding: "16px",
              alignItems: "center",
            }}
          >
            {/* Image */}
            <div
              style={{
                width: "72px",
                height: "72px",
                borderRadius: "var(--radius-md)",
                background: "var(--color-bg-muted)",
                overflow: "hidden",
                flexShrink: 0,
              }}
            >
              {item.image && (
                <img
                  src={item.image}
                  alt={item.titleMn}
                  style={{ width: "100%", height: "100%", objectFit: "cover" }}
                />
              )}
            </div>

            {/* Info */}
            <div style={{ flex: 1, minWidth: 0 }}>
              <p
                style={{
                  fontSize: "14px",
                  fontWeight: 500,
                  marginBottom: "4px",
                  overflow: "hidden",
                  textOverflow: "ellipsis",
                  whiteSpace: "nowrap",
                }}
              >
                {item.titleMn}
              </p>
              <p
                style={{
                  fontSize: "15px",
                  fontWeight: 700,
                  color: "var(--color-accent)",
                }}
              >
                {(item.priceMnt * item.quantity).toLocaleString("mn-MN")}₮
              </p>
            </div>

            {/* Quantity */}
            <div style={{ display: "flex", alignItems: "center", gap: "8px" }}>
              <button
                onClick={() => updateQuantity(item.productId, item.quantity - 1)}
                disabled={item.quantity <= 1}
                style={{
                  width: "32px",
                  height: "32px",
                  borderRadius: "var(--radius-sm)",
                  border: "1.5px solid var(--color-border)",
                  background: "transparent",
                  fontSize: "18px",
                  cursor: item.quantity <= 1 ? "not-allowed" : "pointer",
                  opacity: item.quantity <= 1 ? 0.4 : 1,
                  display: "flex",
                  alignItems: "center",
                  justifyContent: "center",
                }}
              >
                −
              </button>
              <span style={{ minWidth: "24px", textAlign: "center", fontWeight: 600 }}>
                {item.quantity}
              </span>
              <button
                onClick={() => updateQuantity(item.productId, item.quantity + 1)}
                style={{
                  width: "32px",
                  height: "32px",
                  borderRadius: "var(--radius-sm)",
                  border: "1.5px solid var(--color-border)",
                  background: "transparent",
                  fontSize: "18px",
                  cursor: "pointer",
                  display: "flex",
                  alignItems: "center",
                  justifyContent: "center",
                }}
              >
                +
              </button>
            </div>

            {/* Remove */}
            <button
              onClick={() => removeItem(item.productId)}
              style={{
                color: "var(--color-text-hint)",
                fontSize: "18px",
                cursor: "pointer",
                padding: "4px",
                flexShrink: 0,
              }}
              aria-label="Устгах"
            >
              ✕
            </button>
          </div>
        ))}
      </div>

      {/* Summary */}
      <div
        style={{
          background: "var(--bg-paper)",
          border: "1px solid var(--color-border)",
          borderRadius: "var(--radius-lg)",
          padding: "24px",
        }}
      >
        <div
          style={{
            display: "flex",
            justifyContent: "space-between",
            fontSize: "18px",
            fontWeight: 700,
            marginBottom: "20px",
          }}
        >
          <span>Нийт дүн</span>
          <span style={{ color: "var(--color-accent)" }}>
            {total.toLocaleString("mn-MN")}₮
          </span>
        </div>
        <Link href="/checkout">
          <Button fullWidth size="lg">
            Захиалах
          </Button>
        </Link>
        <Link
          href="/products"
          style={{
            display: "block",
            textAlign: "center",
            marginTop: "12px",
            fontSize: "14px",
            color: "var(--color-text-secondary)",
          }}
        >
          Бараа нэмэх
        </Link>
      </div>
    </div>
  );
}
