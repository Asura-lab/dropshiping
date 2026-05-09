"use client";

import { useState, useEffect } from "react";
import { useRouter } from "next/navigation";
import { useCart } from "@/lib/cart-context";
import { apiFetch, getUser } from "@/lib/api";
import { useToast } from "@/components/ui/Toast";

interface Slot {
  id: string;
  type: string;
  slotDatetime: string;
  availableCount: number;
  isFull: boolean;
}

interface Address {
  id: string;
  label: string | null;
  duureg: string;
  khoroo: string;
  isDefault: boolean;
}

type Step = "delivery" | "slot" | "confirm" | "payment";

export default function CheckoutPage() {
  const router = useRouter();
  const { items, total, clearCart } = useCart();
  const { show } = useToast();

  const [step, setStep] = useState<Step>("delivery");
  const [deliveryType, setDeliveryType] = useState<"pickup" | "delivery">("pickup");
  const [slots, setSlots] = useState<Slot[]>([]);
  const [selectedSlot, setSelectedSlot] = useState<string | null>(null);
  const [addresses, setAddresses] = useState<Address[]>([]);
  const [selectedAddress, setSelectedAddress] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);
  const [qpayData, setQpayData] = useState<{
    invoice_id: string;
    qr_text: string;
  } | null>(null);
  const [orderId, setOrderId] = useState<string | null>(null);

  useEffect(() => {
    if (!getUser()) {
      router.push("/auth");
      return;
    }
    if (items.length === 0) router.push("/cart");
  }, [items, router]);

  useEffect(() => {
    if (step !== "slot") return;
    apiFetch<Slot[]>(`/delivery-slots?type=${deliveryType}`).then((r) => {
      if (r.success) setSlots(r.data);
    });
    if (deliveryType === "delivery") {
      apiFetch<Address[]>("/users/me/addresses").then((r) => {
        if (r.success) {
          setAddresses(r.data);
          const def = r.data.find((a) => a.isDefault);
          if (def) setSelectedAddress(def.id);
        }
      });
    }
  }, [step, deliveryType]);

  async function createOrder() {
    if (!selectedSlot) return;
    if (deliveryType === "delivery" && !selectedAddress) {
      show("Хүргэлтийн хаяг сонгоно уу", "error");
      return;
    }
    setLoading(true);
    try {
      const orderRes = await apiFetch<{ id: string }>("/orders", {
        method: "POST",
        body: JSON.stringify({
          delivery_type: deliveryType,
          slot_id: selectedSlot,
          ...(deliveryType === "delivery" ? { address_id: selectedAddress } : {}),
          items: items.map((i) => ({ product_id: i.productId, quantity: i.quantity })),
        }),
      });
      if (!orderRes.success) throw new Error(orderRes.error?.message);
      setOrderId(orderRes.data.id);

      const payRes = await apiFetch<{ qpay: { invoice_id: string; qr_text: string } }>(
        "/payments/qpay",
        { method: "POST", body: JSON.stringify({ order_id: orderRes.data.id }) }
      );
      if (!payRes.success) throw new Error(payRes.error?.message);
      setQpayData(payRes.data.qpay);
      setStep("payment");
      clearCart();
    } catch (e) {
      show(e instanceof Error ? e.message : "Алдаа гарлаа", "error");
    } finally {
      setLoading(false);
    }
  }

  const deliveryFee = deliveryType === "delivery" ? 3000 : 0;
  const grandTotal = total + deliveryFee;

  /* ─── Payment success screen ─── */
  if (step === "payment" && qpayData) {
    return (
      <div
        style={{
          maxWidth: 480,
          margin: "64px auto",
          padding: "0 20px",
          textAlign: "center",
        }}
      >
        <div
          style={{
            width: 64,
            height: 64,
            borderRadius: "50%",
            background: "var(--accent-soft)",
            display: "flex",
            alignItems: "center",
            justifyContent: "center",
            margin: "0 auto 20px",
          }}
        >
          <svg
            width="28"
            height="28"
            viewBox="0 0 24 24"
            fill="none"
            stroke="var(--accent)"
            strokeWidth="2"
            strokeLinecap="round"
            strokeLinejoin="round"
          >
            <path d="M20 6L9 17l-5-5" />
          </svg>
        </div>
        <h1
          style={{
            fontSize: 22,
            fontWeight: 600,
            letterSpacing: "-0.01em",
            marginBottom: 8,
          }}
        >
          Захиалга үүслээ
        </h1>
        <p style={{ fontSize: 14, color: "var(--mute)", marginBottom: 32 }}>
          QPay апп-аар QR уншуулж төлбөрөө хийнэ үү
        </p>

        <div
          style={{
            background: "var(--bg-cream)",
            border: "1px solid var(--line)",
            borderRadius: "var(--r-3)",
            padding: "28px",
            marginBottom: 24,
          }}
        >
          <p
            style={{
              fontSize: 11,
              color: "var(--mute-2)",
              marginBottom: 12,
              textTransform: "uppercase",
              letterSpacing: "0.06em",
            }}
          >
            QR мэдээлэл (dev горим)
          </p>
          <div
            style={{
              fontFamily: "var(--mono)",
              fontSize: 11,
              background: "var(--bg-stone)",
              borderRadius: "var(--r-2)",
              padding: "12px 14px",
              wordBreak: "break-all",
              color: "var(--ink-2)",
              textAlign: "left",
            }}
          >
            {qpayData.qr_text}
          </div>
        </div>

        <button
          onClick={() => router.push(`/orders/${orderId}`)}
          style={{
            width: "100%",
            height: 46,
            background: "var(--accent)",
            color: "var(--bg-paper)",
            border: "none",
            borderRadius: "var(--r-2)",
            fontSize: 14,
            fontWeight: 500,
            cursor: "pointer",
            fontFamily: "var(--sans)",
          }}
        >
          Захиалга харах
        </button>
      </div>
    );
  }

  /* ─── Step indicator ─── */
  const STEPS: { key: Step; label: string }[] = [
    { key: "delivery", label: "Хүргэлт" },
    { key: "slot", label: "Цаг" },
    { key: "confirm", label: "Баталгаа" },
  ];
  const stepIndex = STEPS.findIndex((s) => s.key === step);

  return (
    <div style={{ maxWidth: 640, margin: "0 auto", padding: "28px 20px" }}>
      <h1
        style={{
          fontSize: 22,
          fontWeight: 600,
          letterSpacing: "-0.01em",
          marginBottom: 24,
        }}
      >
        Захиалах
      </h1>

      {/* Step bar */}
      <div style={{ display: "flex", alignItems: "center", gap: 0, marginBottom: 32 }}>
        {STEPS.map((s, i) => {
          const done = i < stepIndex;
          const active = i === stepIndex;
          return (
            <div
              key={s.key}
              style={{
                display: "flex",
                alignItems: "center",
                flex: i < STEPS.length - 1 ? 1 : undefined,
              }}
            >
              <div style={{ display: "flex", alignItems: "center", gap: 8 }}>
                <div
                  style={{
                    width: 26,
                    height: 26,
                    borderRadius: "50%",
                    background: done
                      ? "var(--ink-2)"
                      : active
                        ? "var(--accent)"
                        : "var(--bg-cream)",
                    border: done || active ? "none" : "1px solid var(--line)",
                    display: "flex",
                    alignItems: "center",
                    justifyContent: "center",
                    flexShrink: 0,
                  }}
                >
                  {done ? (
                    <svg
                      width="12"
                      height="12"
                      viewBox="0 0 24 24"
                      fill="none"
                      stroke="white"
                      strokeWidth="2.5"
                      strokeLinecap="round"
                      strokeLinejoin="round"
                    >
                      <path d="M20 6L9 17l-5-5" />
                    </svg>
                  ) : (
                    <span
                      style={{
                        fontSize: 11,
                        fontWeight: 600,
                        color: active ? "white" : "var(--mute)",
                      }}
                    >
                      {i + 1}
                    </span>
                  )}
                </div>
                <span
                  style={{
                    fontSize: 12,
                    fontWeight: active ? 600 : 400,
                    color: active ? "var(--ink)" : done ? "var(--ink-2)" : "var(--mute)",
                  }}
                >
                  {s.label}
                </span>
              </div>
              {i < STEPS.length - 1 && (
                <div
                  style={{
                    flex: 1,
                    height: 1,
                    background: done ? "var(--ink-2)" : "var(--line)",
                    margin: "0 10px",
                  }}
                />
              )}
            </div>
          );
        })}
      </div>

      {/* ─── Step 1: Delivery type ─── */}
      {step === "delivery" && (
        <div>
          <p style={{ fontSize: 13, color: "var(--mute)", marginBottom: 16 }}>
            Хэрхэн авахаа сонгоно уу
          </p>
          <div
            style={{
              display: "grid",
              gridTemplateColumns: "1fr 1fr",
              gap: 12,
              marginBottom: 28,
            }}
          >
            {(["pickup", "delivery"] as const).map((type) => {
              const active = deliveryType === type;
              return (
                <button
                  key={type}
                  onClick={() => setDeliveryType(type)}
                  style={{
                    padding: "20px 16px",
                    borderRadius: "var(--r-3)",
                    border: active ? "2px solid var(--accent)" : "1px solid var(--line)",
                    background: active ? "var(--accent-soft)" : "var(--bg-paper)",
                    cursor: "pointer",
                    textAlign: "left",
                    transition: "all 100ms ease",
                    fontFamily: "var(--sans)",
                  }}
                >
                  <div style={{ marginBottom: 8 }}>
                    {type === "pickup" ? (
                      <svg
                        width="22"
                        height="22"
                        viewBox="0 0 24 24"
                        fill="none"
                        stroke={active ? "var(--accent)" : "var(--mute)"}
                        strokeWidth="1.5"
                        strokeLinecap="round"
                        strokeLinejoin="round"
                      >
                        <path d="M3 9l9-7 9 7v11a2 2 0 01-2 2H5a2 2 0 01-2-2z" />
                        <polyline points="9 22 9 12 15 12 15 22" />
                      </svg>
                    ) : (
                      <svg
                        width="22"
                        height="22"
                        viewBox="0 0 24 24"
                        fill="none"
                        stroke={active ? "var(--accent)" : "var(--mute)"}
                        strokeWidth="1.5"
                        strokeLinecap="round"
                        strokeLinejoin="round"
                      >
                        <rect x="1" y="3" width="15" height="13" />
                        <polygon points="16 8 20 8 23 11 23 16 16 16 16 8" />
                        <circle cx="5.5" cy="18.5" r="2.5" />
                        <circle cx="18.5" cy="18.5" r="2.5" />
                      </svg>
                    )}
                  </div>
                  <p
                    style={{
                      fontSize: 14,
                      fontWeight: 600,
                      color: active ? "var(--accent)" : "var(--ink)",
                      marginBottom: 2,
                    }}
                  >
                    {type === "pickup" ? "Өөрөө авах" : "Хүргэлт"}
                  </p>
                  <p style={{ fontSize: 12, color: "var(--mute)" }}>
                    {type === "pickup" ? "Үнэгүй" : "+3,000₮"}
                  </p>
                </button>
              );
            })}
          </div>
          <button
            onClick={() => setStep("slot")}
            style={{
              width: "100%",
              height: 46,
              background: "var(--accent)",
              color: "var(--bg-paper)",
              border: "none",
              borderRadius: "var(--r-2)",
              fontSize: 14,
              fontWeight: 500,
              cursor: "pointer",
              fontFamily: "var(--sans)",
            }}
          >
            Үргэлжлүүлэх
          </button>
        </div>
      )}

      {/* ─── Step 2: Slot + address ─── */}
      {step === "slot" && (
        <div>
          {deliveryType === "delivery" && addresses.length > 0 && (
            <div style={{ marginBottom: 28 }}>
              <p style={{ fontSize: 13, fontWeight: 500, marginBottom: 10 }}>
                Хүргэлтийн хаяг
              </p>
              <div style={{ display: "flex", flexDirection: "column", gap: 8 }}>
                {addresses.map((a) => {
                  const active = selectedAddress === a.id;
                  return (
                    <button
                      key={a.id}
                      onClick={() => setSelectedAddress(a.id)}
                      style={{
                        padding: "12px 14px",
                        borderRadius: "var(--r-2)",
                        border: active
                          ? "1.5px solid var(--accent)"
                          : "1px solid var(--line)",
                        background: active ? "var(--accent-soft)" : "var(--bg-paper)",
                        textAlign: "left",
                        cursor: "pointer",
                        fontFamily: "var(--sans)",
                      }}
                    >
                      <span
                        style={{ fontSize: 13, fontWeight: 500, color: "var(--ink)" }}
                      >
                        {a.label ?? `${a.duureg}, ${a.khoroo}`}
                      </span>
                    </button>
                  );
                })}
              </div>
            </div>
          )}

          <p style={{ fontSize: 13, fontWeight: 500, marginBottom: 10 }}>
            Цаг сонгоно уу
          </p>
          {slots.filter((s) => !s.isFull).length === 0 ? (
            <p style={{ fontSize: 13, color: "var(--mute)", marginBottom: 24 }}>
              Боломжтой цаг байхгүй байна
            </p>
          ) : (
            <div
              style={{
                display: "flex",
                flexDirection: "column",
                gap: 8,
                marginBottom: 24,
              }}
            >
              {slots
                .filter((s) => !s.isFull)
                .map((slot) => {
                  const dt = new Date(slot.slotDatetime);
                  const dateStr = dt.toLocaleDateString("mn-MN", {
                    month: "short",
                    day: "numeric",
                  });
                  const timeStr = dt.toLocaleTimeString("mn-MN", {
                    hour: "2-digit",
                    minute: "2-digit",
                  });
                  const active = selectedSlot === slot.id;
                  return (
                    <button
                      key={slot.id}
                      onClick={() => setSelectedSlot(slot.id)}
                      style={{
                        padding: "12px 14px",
                        borderRadius: "var(--r-2)",
                        border: active
                          ? "1.5px solid var(--accent)"
                          : "1px solid var(--line)",
                        background: active ? "var(--accent-soft)" : "var(--bg-paper)",
                        display: "flex",
                        justifyContent: "space-between",
                        alignItems: "center",
                        cursor: "pointer",
                        fontFamily: "var(--sans)",
                      }}
                    >
                      <span
                        style={{ fontSize: 13, fontWeight: 500, color: "var(--ink)" }}
                      >
                        {dateStr} · {timeStr}
                      </span>
                      <span style={{ fontSize: 11, color: "var(--mute-2)" }}>
                        {slot.availableCount} байр
                      </span>
                    </button>
                  );
                })}
            </div>
          )}

          <div style={{ display: "flex", gap: 10 }}>
            <button
              onClick={() => setStep("delivery")}
              style={{
                height: 44,
                padding: "0 20px",
                border: "1px solid var(--line)",
                borderRadius: "var(--r-2)",
                background: "var(--bg-paper)",
                cursor: "pointer",
                fontSize: 13,
                color: "var(--ink)",
                fontFamily: "var(--sans)",
              }}
            >
              Буцах
            </button>
            <button
              onClick={() => setStep("confirm")}
              disabled={
                !selectedSlot || (deliveryType === "delivery" && !selectedAddress)
              }
              style={{
                flex: 1,
                height: 44,
                background: "var(--accent)",
                color: "var(--bg-paper)",
                border: "none",
                borderRadius: "var(--r-2)",
                fontSize: 14,
                fontWeight: 500,
                cursor: "pointer",
                opacity:
                  !selectedSlot || (deliveryType === "delivery" && !selectedAddress)
                    ? 0.4
                    : 1,
                fontFamily: "var(--sans)",
              }}
            >
              Үргэлжлүүлэх
            </button>
          </div>
        </div>
      )}

      {/* ─── Step 3: Confirm ─── */}
      {step === "confirm" && (
        <div>
          <div
            style={{
              background: "var(--bg-cream)",
              border: "1px solid var(--line)",
              borderRadius: "var(--r-3)",
              overflow: "hidden",
              marginBottom: 24,
            }}
          >
            {items.map((item, i) => (
              <div
                key={item.productId}
                style={{
                  display: "flex",
                  justifyContent: "space-between",
                  alignItems: "center",
                  padding: "13px 16px",
                  borderBottom: i < items.length - 1 ? "1px solid var(--line)" : "none",
                  fontSize: 13,
                }}
              >
                <span style={{ flex: 1, marginRight: 16, color: "var(--ink-2)" }}>
                  {item.titleMn}
                  <span style={{ color: "var(--mute)", marginLeft: 6 }}>
                    ×{item.quantity}
                  </span>
                </span>
                <span
                  className="num"
                  style={{ fontWeight: 600, color: "var(--ink)", whiteSpace: "nowrap" }}
                >
                  {(item.priceMnt * item.quantity).toLocaleString("en-US")}₮
                </span>
              </div>
            ))}

            <div
              style={{
                borderTop: "1px solid var(--line)",
                padding: "13px 16px",
                display: "flex",
                flexDirection: "column",
                gap: 8,
              }}
            >
              {deliveryType === "delivery" && (
                <div
                  style={{
                    display: "flex",
                    justifyContent: "space-between",
                    fontSize: 13,
                    color: "var(--mute)",
                  }}
                >
                  <span>Хүргэлтийн төлбөр</span>
                  <span className="num">3,000₮</span>
                </div>
              )}
              <div
                style={{
                  display: "flex",
                  justifyContent: "space-between",
                  fontSize: 15,
                  fontWeight: 600,
                  color: "var(--ink)",
                }}
              >
                <span>Нийт дүн</span>
                <span className="num" style={{ color: "var(--accent)" }}>
                  {grandTotal.toLocaleString("en-US")}₮
                </span>
              </div>
            </div>
          </div>

          <div style={{ display: "flex", gap: 10 }}>
            <button
              onClick={() => setStep("slot")}
              style={{
                height: 44,
                padding: "0 20px",
                border: "1px solid var(--line)",
                borderRadius: "var(--r-2)",
                background: "var(--bg-paper)",
                cursor: "pointer",
                fontSize: 13,
                color: "var(--ink)",
                fontFamily: "var(--sans)",
              }}
            >
              Буцах
            </button>
            <button
              onClick={createOrder}
              disabled={loading}
              style={{
                flex: 1,
                height: 44,
                background: "var(--accent)",
                color: "var(--bg-paper)",
                border: "none",
                borderRadius: "var(--r-2)",
                fontSize: 14,
                fontWeight: 500,
                cursor: loading ? "not-allowed" : "pointer",
                opacity: loading ? 0.7 : 1,
                display: "flex",
                alignItems: "center",
                justifyContent: "center",
                gap: 8,
                fontFamily: "var(--sans)",
              }}
            >
              {loading && (
                <svg
                  width="16"
                  height="16"
                  viewBox="0 0 24 24"
                  fill="none"
                  stroke="currentColor"
                  strokeWidth="2"
                  strokeLinecap="round"
                >
                  <path d="M12 2v4M12 18v4M4.93 4.93l2.83 2.83M16.24 16.24l2.83 2.83M2 12h4M18 12h4" />
                </svg>
              )}
              Захиалж, QPay-р төлөх
            </button>
          </div>
        </div>
      )}
    </div>
  );
}
