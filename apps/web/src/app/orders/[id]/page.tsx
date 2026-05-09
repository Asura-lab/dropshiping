"use client";

import { useEffect, useState } from "react";
import { useParams, useRouter } from "next/navigation";
import Link from "next/link";
import { apiFetch, getUser } from "@/lib/api";
import { useToast } from "@/components/ui/Toast";

interface OrderDetail {
  id: string;
  orderNumber: string;
  status: string;
  deliveryType: string;
  subtotalMnt: string;
  deliveryFee: string;
  totalMnt: string;
  note: string | null;
  createdAt: string;
  items: {
    id: string;
    quantity: number;
    unitPriceMnt: string;
    product: { titleMn: string; images: { url: string; is_primary: boolean }[] };
  }[];
  payment: { status: string; provider: string; paidAt: string | null } | null;
  delivery: {
    status: string;
    slot: { slotDatetime: string; type: string };
    driver: { name: string; phone: string } | null;
  } | null;
  statusLogs: {
    id: string;
    fromStatus: string | null;
    toStatus: string;
    note: string | null;
    createdAt: string;
  }[];
}

const STATUS_STEPS = [
  { key: "pending", label: "Захиалга хийгдсэн" },
  { key: "confirmed", label: "Баталгаажсан" },
  { key: "processing", label: "Бэлтгэж байна" },
  { key: "shipped", label: "Хүргэлтэнд гарсан" },
  { key: "delivered", label: "Хүргэгдсэн" },
];

const STATUS_LABELS: Record<string, string> = {
  pending: "Хүлээгдэж байна",
  confirmed: "Баталгаажсан",
  processing: "Боловсруулж байна",
  shipped: "Илгээсэн",
  delivered: "Хүргэгдсэн",
  cancelled: "Цуцлагдсан",
};

export default function OrderDetailPage() {
  const params = useParams();
  const router = useRouter();
  const { show } = useToast();
  const [order, setOrder] = useState<OrderDetail | null>(null);
  const [loading, setLoading] = useState(true);
  const [cancelling, setCancelling] = useState(false);

  useEffect(() => {
    if (!getUser()) {
      router.push("/auth");
      return;
    }
    apiFetch<OrderDetail>(`/orders/${params.id as string}`).then((r) => {
      if (r.success) setOrder(r.data);
      setLoading(false);
    });
  }, [params.id, router]);

  if (loading) {
    return (
      <div style={{ maxWidth: 680, margin: "0 auto", padding: "28px 20px" }}>
        {Array.from({ length: 3 }).map((_, i) => (
          <div
            key={i}
            style={{
              height: i === 0 ? 120 : 200,
              background: "var(--bg-cream)",
              borderRadius: "var(--r-3)",
              marginBottom: 12,
              animation: "pulse 1.5s infinite",
            }}
          />
        ))}
      </div>
    );
  }

  if (!order) {
    return (
      <div
        style={{
          maxWidth: 680,
          margin: "80px auto",
          textAlign: "center",
          padding: "0 20px",
        }}
      >
        <p style={{ color: "var(--mute)", marginBottom: 16 }}>Захиалга олдсонгүй</p>
        <Link href="/orders" style={{ color: "var(--accent)", fontSize: 13 }}>
          Буцах
        </Link>
      </div>
    );
  }

  async function cancelOrder() {
    if (!confirm("Захиалгыг цуцлах уу?")) return;
    setCancelling(true);
    const r = await apiFetch(`/orders/${order!.id}/cancel`, { method: "POST" });
    setCancelling(false);
    if (r.success) {
      show("Захиалга цуцлагдлаа", "success");
      setOrder((o) => (o ? { ...o, status: "cancelled" } : o));
    } else {
      show((r.error as { message?: string })?.message ?? "Алдаа гарлаа", "error");
    }
  }

  const currentStepIndex = STATUS_STEPS.findIndex((s) => s.key === order.status);
  const isCancelled = order.status === "cancelled";
  const canCancel = ["pending", "confirmed"].includes(order.status);

  return (
    <div style={{ maxWidth: 680, margin: "0 auto", padding: "28px 20px" }}>
      {/* Back */}
      <Link
        href="/orders"
        style={{
          display: "inline-flex",
          alignItems: "center",
          gap: 5,
          fontSize: 13,
          color: "var(--mute)",
          marginBottom: 20,
          textDecoration: "none",
        }}
      >
        <svg
          width="14"
          height="14"
          viewBox="0 0 24 24"
          fill="none"
          stroke="currentColor"
          strokeWidth="2"
          strokeLinecap="round"
          strokeLinejoin="round"
        >
          <path d="M15 5l-7 7 7 7" />
        </svg>
        Захиалгууд руу буцах
      </Link>

      {/* Header */}
      <div
        style={{
          background: "var(--bg-paper)",
          border: "1px solid var(--line)",
          borderRadius: "var(--r-3)",
          padding: "20px 20px 0",
          marginBottom: 12,
        }}
      >
        <div
          style={{
            display: "flex",
            justifyContent: "space-between",
            alignItems: "flex-start",
            marginBottom: 20,
          }}
        >
          <div>
            <p
              className="num"
              style={{
                fontSize: 18,
                fontWeight: 700,
                letterSpacing: "-0.01em",
                color: "var(--ink)",
                marginBottom: 4,
              }}
            >
              {order.orderNumber}
            </p>
            <p style={{ fontSize: 12, color: "var(--mute)" }}>
              {new Date(order.createdAt).toLocaleString("mn-MN", {
                year: "numeric",
                month: "short",
                day: "numeric",
                hour: "2-digit",
                minute: "2-digit",
              })}
            </p>
          </div>
          <div style={{ display: "flex", alignItems: "center", gap: 8 }}>
            {canCancel && (
              <button
                onClick={cancelOrder}
                disabled={cancelling}
                style={{
                  height: 30,
                  padding: "0 12px",
                  border: "1px solid var(--line)",
                  borderRadius: 99,
                  background: "var(--bg-paper)",
                  color: "var(--mute)",
                  fontSize: 12,
                  cursor: "pointer",
                  fontFamily: "var(--sans)",
                  opacity: cancelling ? 0.5 : 1,
                }}
              >
                {cancelling ? "…" : "Цуцлах"}
              </button>
            )}
            <span
              style={{
                padding: "4px 12px",
                borderRadius: 99,
                fontSize: 12,
                fontWeight: 500,
                background: isCancelled ? "var(--bg-stone)" : "var(--accent-soft)",
                color: isCancelled ? "var(--mute)" : "var(--accent)",
              }}
            >
              {STATUS_LABELS[order.status] ?? order.status}
            </span>
          </div>
        </div>

        {/* Timeline */}
        {!isCancelled && (
          <div style={{ paddingBottom: 20 }}>
            <div style={{ display: "flex", alignItems: "center" }}>
              {STATUS_STEPS.map((step, i) => {
                const done = i <= currentStepIndex;
                const active = i === currentStepIndex;
                const isLast = i === STATUS_STEPS.length - 1;
                return (
                  <div
                    key={step.key}
                    style={{
                      display: "flex",
                      alignItems: "center",
                      flex: isLast ? undefined : 1,
                    }}
                  >
                    <div
                      style={{
                        display: "flex",
                        flexDirection: "column",
                        alignItems: "center",
                        gap: 6,
                      }}
                    >
                      <div
                        style={{
                          width: 20,
                          height: 20,
                          borderRadius: "50%",
                          background: done
                            ? active
                              ? "var(--accent)"
                              : "var(--ink-2)"
                            : "var(--bg-cream)",
                          border: done ? "none" : "1.5px solid var(--line)",
                          display: "flex",
                          alignItems: "center",
                          justifyContent: "center",
                          flexShrink: 0,
                        }}
                      >
                        {done && !active && (
                          <svg
                            width="10"
                            height="10"
                            viewBox="0 0 24 24"
                            fill="none"
                            stroke="white"
                            strokeWidth="3"
                            strokeLinecap="round"
                            strokeLinejoin="round"
                          >
                            <path d="M20 6L9 17l-5-5" />
                          </svg>
                        )}
                        {active && (
                          <div
                            style={{
                              width: 8,
                              height: 8,
                              borderRadius: "50%",
                              background: "white",
                            }}
                          />
                        )}
                      </div>
                      <span
                        style={{
                          fontSize: 9,
                          textAlign: "center",
                          maxWidth: 64,
                          color: active
                            ? "var(--accent)"
                            : done
                              ? "var(--ink-2)"
                              : "var(--mute-2)",
                          fontWeight: active ? 600 : 400,
                          lineHeight: 1.3,
                        }}
                      >
                        {step.label}
                      </span>
                    </div>
                    {!isLast && (
                      <div
                        style={{
                          flex: 1,
                          height: 1.5,
                          background:
                            i < currentStepIndex ? "var(--ink-2)" : "var(--line)",
                          margin: "0 4px",
                          marginBottom: 20,
                        }}
                      />
                    )}
                  </div>
                );
              })}
            </div>
          </div>
        )}
      </div>

      {/* Items */}
      <div
        style={{
          background: "var(--bg-paper)",
          border: "1px solid var(--line)",
          borderRadius: "var(--r-3)",
          marginBottom: 12,
          overflow: "hidden",
        }}
      >
        <div style={{ padding: "14px 18px", borderBottom: "1px solid var(--line)" }}>
          <p
            style={{
              fontSize: 12,
              fontWeight: 600,
              color: "var(--ink-2)",
              letterSpacing: "0.04em",
              textTransform: "uppercase",
            }}
          >
            Бараанууд
          </p>
        </div>
        {order.items.map((item, i) => {
          const img =
            item.product.images.find((x) => x.is_primary) ?? item.product.images[0];
          return (
            <div
              key={item.id}
              style={{
                display: "flex",
                gap: 12,
                padding: "12px 18px",
                borderBottom:
                  i < order.items.length - 1 ? "1px solid var(--line)" : "none",
              }}
            >
              <div
                style={{
                  width: 52,
                  height: 52,
                  borderRadius: "var(--r-2)",
                  background: "var(--bg-cream)",
                  overflow: "hidden",
                  flexShrink: 0,
                }}
              >
                {img && (
                  <img
                    src={img.url}
                    alt={item.product.titleMn}
                    style={{ width: "100%", height: "100%", objectFit: "cover" }}
                  />
                )}
              </div>
              <div style={{ flex: 1, minWidth: 0 }}>
                <p
                  style={{
                    fontSize: 13,
                    fontWeight: 500,
                    color: "var(--ink)",
                    marginBottom: 3,
                    overflow: "hidden",
                    textOverflow: "ellipsis",
                    whiteSpace: "nowrap",
                  }}
                >
                  {item.product.titleMn}
                </p>
                <p style={{ fontSize: 12, color: "var(--mute)" }}>
                  <span className="num">
                    {Number(item.unitPriceMnt).toLocaleString("en-US")}₮
                  </span>{" "}
                  × {item.quantity}
                </p>
              </div>
              <p
                className="num"
                style={{
                  fontSize: 13,
                  fontWeight: 600,
                  color: "var(--ink)",
                  whiteSpace: "nowrap",
                }}
              >
                {(Number(item.unitPriceMnt) * item.quantity).toLocaleString("en-US")}₮
              </p>
            </div>
          );
        })}
        <div
          style={{
            padding: "12px 18px",
            borderTop: "1px solid var(--line)",
            display: "flex",
            flexDirection: "column",
            gap: 6,
          }}
        >
          <PriceRow
            label="Бараа нийт"
            value={`${Number(order.subtotalMnt).toLocaleString("en-US")}₮`}
          />
          <PriceRow
            label="Хүргэлт"
            value={`${Number(order.deliveryFee).toLocaleString("en-US")}₮`}
          />
          <PriceRow
            label="Нийт дүн"
            value={`${Number(order.totalMnt).toLocaleString("en-US")}₮`}
            bold
          />
        </div>
      </div>

      {/* Delivery info */}
      {order.delivery && (
        <div
          style={{
            background: "var(--bg-paper)",
            border: "1px solid var(--line)",
            borderRadius: "var(--r-3)",
            marginBottom: 12,
            overflow: "hidden",
          }}
        >
          <div style={{ padding: "14px 18px", borderBottom: "1px solid var(--line)" }}>
            <p
              style={{
                fontSize: 12,
                fontWeight: 600,
                color: "var(--ink-2)",
                letterSpacing: "0.04em",
                textTransform: "uppercase",
              }}
            >
              Хүргэлтийн мэдээлэл
            </p>
          </div>
          <div
            style={{
              padding: "14px 18px",
              display: "flex",
              flexDirection: "column",
              gap: 10,
            }}
          >
            <InfoRow
              label="Хүргэлтийн цаг"
              value={new Date(order.delivery.slot.slotDatetime).toLocaleString("mn-MN", {
                year: "numeric",
                month: "short",
                day: "numeric",
                hour: "2-digit",
                minute: "2-digit",
              })}
            />
            <InfoRow
              label="Төрөл"
              value={order.deliveryType === "pickup" ? "Өөрөө авах" : "Хүргэлт"}
            />
            {order.delivery.driver && (
              <InfoRow
                label="Жолооч"
                value={`${order.delivery.driver.name} · ${order.delivery.driver.phone}`}
              />
            )}
          </div>
        </div>
      )}

      {/* Payment */}
      {order.payment && (
        <div
          style={{
            background: "var(--bg-paper)",
            border: "1px solid var(--line)",
            borderRadius: "var(--r-3)",
            marginBottom: 12,
            overflow: "hidden",
          }}
        >
          <div style={{ padding: "14px 18px", borderBottom: "1px solid var(--line)" }}>
            <p
              style={{
                fontSize: 12,
                fontWeight: 600,
                color: "var(--ink-2)",
                letterSpacing: "0.04em",
                textTransform: "uppercase",
              }}
            >
              Төлбөр
            </p>
          </div>
          <div
            style={{
              padding: "14px 18px",
              display: "flex",
              flexDirection: "column",
              gap: 10,
            }}
          >
            <InfoRow label="Арга" value={order.payment.provider.toUpperCase()} />
            <InfoRow
              label="Төлөв"
              value={
                order.payment.status === "paid"
                  ? "Төлөгдсөн"
                  : order.payment.status === "pending"
                    ? "Хүлээгдэж байна"
                    : "Амжилтгүй"
              }
              accent={order.payment.status === "paid"}
            />
            {order.payment.paidAt && (
              <InfoRow
                label="Төлсөн огноо"
                value={new Date(order.payment.paidAt).toLocaleString("mn-MN")}
              />
            )}
          </div>
        </div>
      )}

      {/* Status log */}
      {order.statusLogs.length > 0 && (
        <div
          style={{
            background: "var(--bg-paper)",
            border: "1px solid var(--line)",
            borderRadius: "var(--r-3)",
            overflow: "hidden",
          }}
        >
          <div style={{ padding: "14px 18px", borderBottom: "1px solid var(--line)" }}>
            <p
              style={{
                fontSize: 12,
                fontWeight: 600,
                color: "var(--ink-2)",
                letterSpacing: "0.04em",
                textTransform: "uppercase",
              }}
            >
              Захиалгын явц
            </p>
          </div>
          <div
            style={{
              padding: "14px 18px",
              display: "flex",
              flexDirection: "column",
              gap: 0,
            }}
          >
            {order.statusLogs.map((log, i) => (
              <div
                key={log.id}
                style={{ display: "flex", gap: 14, position: "relative" }}
              >
                {/* Vertical line */}
                {i < order.statusLogs.length - 1 && (
                  <div
                    style={{
                      position: "absolute",
                      left: 5,
                      top: 14,
                      bottom: 0,
                      width: 1,
                      background: "var(--line)",
                    }}
                  />
                )}
                <div
                  style={{
                    width: 11,
                    height: 11,
                    borderRadius: "50%",
                    flexShrink: 0,
                    background: i === 0 ? "var(--accent)" : "var(--bg-stone)",
                    border: i === 0 ? "none" : "1.5px solid var(--line)",
                    marginTop: 3,
                  }}
                />
                <div style={{ paddingBottom: i < order.statusLogs.length - 1 ? 16 : 0 }}>
                  <p
                    style={{
                      fontSize: 13,
                      fontWeight: 500,
                      color: "var(--ink)",
                      marginBottom: 2,
                    }}
                  >
                    {STATUS_LABELS[log.toStatus] ?? log.toStatus}
                  </p>
                  {log.note && (
                    <p style={{ fontSize: 12, color: "var(--mute)", marginBottom: 2 }}>
                      {log.note}
                    </p>
                  )}
                  <p style={{ fontSize: 11, color: "var(--mute-2)" }}>
                    {new Date(log.createdAt).toLocaleString("mn-MN")}
                  </p>
                </div>
              </div>
            ))}
          </div>
        </div>
      )}
    </div>
  );
}

function PriceRow({
  label,
  value,
  bold,
}: {
  label: string;
  value: string;
  bold?: boolean;
}) {
  return (
    <div
      style={{
        display: "flex",
        justifyContent: "space-between",
        fontSize: bold ? 14 : 13,
        fontWeight: bold ? 600 : 400,
        color: bold ? "var(--ink)" : "var(--mute)",
      }}
    >
      <span>{label}</span>
      <span className="num" style={{ color: bold ? "var(--accent)" : undefined }}>
        {value}
      </span>
    </div>
  );
}

function InfoRow({
  label,
  value,
  accent,
}: {
  label: string;
  value: string;
  accent?: boolean;
}) {
  return (
    <div
      style={{ display: "flex", justifyContent: "space-between", alignItems: "baseline" }}
    >
      <span style={{ fontSize: 12, color: "var(--mute)" }}>{label}</span>
      <span
        style={{
          fontSize: 13,
          fontWeight: 500,
          color: accent ? "var(--accent)" : "var(--ink)",
        }}
      >
        {value}
      </span>
    </div>
  );
}
