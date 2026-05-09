"use client";

import { useRouter } from "next/navigation";
import { useState } from "react";
import { useCart } from "@/lib/cart-context";
import { useToast } from "@/components/ui/Toast";
import { getUser } from "@/lib/api";

interface Props {
  product: {
    id: string;
    titleMn: string;
    priceMnt: string;
    stockStatus: string;
    image?: string;
  };
}

export function AddToCartButton({ product }: Props) {
  const { addItem } = useCart();
  const { show } = useToast();
  const router = useRouter();
  const [qty, setQty] = useState(1);
  const price = Number(product.priceMnt);

  if (product.stockStatus === "out_of_stock") {
    return (
      <div
        style={{
          padding: "14px 20px",
          textAlign: "center",
          background: "var(--bg-cream)",
          borderRadius: "var(--r-2)",
          fontSize: 13,
          color: "var(--mute)",
          fontWeight: 500,
          border: "1px solid var(--line)",
        }}
      >
        Дууссан
      </div>
    );
  }

  function handleAdd() {
    const user = getUser();
    if (!user) {
      router.push("/auth");
      return;
    }
    addItem({
      productId: product.id,
      titleMn: product.titleMn,
      priceMnt: price,
      ...(product.image ? { image: product.image } : {}),
      quantity: qty,
    });
    show("Сагсанд нэмэгдлээ", "success");
  }

  const total = (price * qty).toLocaleString("en-US");

  return (
    <div style={{ display: "flex", alignItems: "center", gap: 12 }}>
      {/* Qty stepper */}
      <div style={{ display: "inline-flex", alignItems: "center" }}>
        <button
          onClick={() => setQty((q) => Math.max(1, q - 1))}
          disabled={qty <= 1}
          style={{
            width: 32,
            height: 32,
            border: "1px solid var(--line)",
            background: "var(--bg-paper)",
            cursor: qty <= 1 ? "not-allowed" : "pointer",
            display: "flex",
            alignItems: "center",
            justifyContent: "center",
            borderRadius: "var(--r-1) 0 0 var(--r-1)",
            opacity: qty <= 1 ? 0.4 : 1,
          }}
        >
          <svg
            width="12"
            height="12"
            viewBox="0 0 24 24"
            fill="none"
            stroke="currentColor"
            strokeWidth="2"
            strokeLinecap="round"
          >
            <path d="M5 12h14" />
          </svg>
        </button>
        <span
          className="num"
          style={{
            minWidth: 40,
            height: 32,
            display: "inline-flex",
            alignItems: "center",
            justifyContent: "center",
            borderTop: "1px solid var(--line)",
            borderBottom: "1px solid var(--line)",
            background: "var(--bg-paper)",
            fontSize: 13,
          }}
        >
          {qty}
        </span>
        <button
          onClick={() => setQty((q) => Math.min(20, q + 1))}
          style={{
            width: 32,
            height: 32,
            border: "1px solid var(--line)",
            background: "var(--bg-paper)",
            cursor: "pointer",
            display: "flex",
            alignItems: "center",
            justifyContent: "center",
            borderRadius: "0 var(--r-1) var(--r-1) 0",
          }}
        >
          <svg
            width="12"
            height="12"
            viewBox="0 0 24 24"
            fill="none"
            stroke="currentColor"
            strokeWidth="2"
            strokeLinecap="round"
          >
            <path d="M12 5v14M5 12h14" />
          </svg>
        </button>
      </div>

      {/* Add to cart */}
      <button
        onClick={handleAdd}
        style={{
          flex: 1,
          display: "flex",
          alignItems: "center",
          justifyContent: "center",
          gap: 8,
          padding: "0 18px",
          height: 44,
          background: "var(--accent)",
          color: "var(--bg-paper)",
          borderRadius: "var(--r-2)",
          border: "none",
          fontSize: 13,
          fontWeight: 500,
          cursor: "pointer",
          transition: "background 120ms ease",
        }}
        onMouseEnter={(e) => (e.currentTarget.style.background = "var(--accent-hover)")}
        onMouseLeave={(e) => (e.currentTarget.style.background = "var(--accent)")}
      >
        Сагсанд нэмэх
        <span className="num" style={{ opacity: 0.8 }}>
          · {total}₮
        </span>
      </button>
    </div>
  );
}
