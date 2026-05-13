"use client";

import { useEffect, useState } from "react";
import { useParams, useRouter } from "next/navigation";
import Link from "next/link";
import { apiFetch } from "@/lib/api";
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
  user: { id: string; name: string; phone: string };
  address: {
    duureg: string;
    khoroo: string;
    bair: string | null;
    toot: string | null;
    gudamj: string | null;
  } | null;
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

const ALL_STATUSES = [
  "pending",
  "confirmed",
  "processing",
  "shipped",
  "delivered",
  "cancelled",
] as const;
const STATUS_LABELS: Record<string, string> = {
  pending: "Хүлээгдэж байна",
  confirmed: "Баталгаажсан",
  processing: "Боловсруулж байна",
  shipped: "Илгээсэн",
  delivered: "Хүргэгдсэн",
  cancelled: "Цуцлагдсан",
};

interface Driver {
  id: string;
  name: string;
  phone: string;
}

export default function AdminOrderDetailPage() {
  const params = useParams();
  const router = useRouter();
  const { show } = useToast();
  const [order, setOrder] = useState<OrderDetail | null>(null);
  const [loading, setLoading] = useState(true);
  const [updating, setUpdating] = useState(false);
  const [newStatus, setNewStatus] = useState("");
  const [statusNote, setStatusNote] = useState("");
  const [drivers, setDrivers] = useState<Driver[]>([]);
  const [selectedDriver, setSelectedDriver] = useState("");
  const [assigningDriver, setAssigningDriver] = useState(false);

  useEffect(() => {
    apiFetch<OrderDetail>(`/admin/orders/${params.id as string}`).then((r) => {
      if (r.success) {
        setOrder(r.data);
        setNewStatus(r.data.status);
        if (r.data.deliveryType === "delivery") {
          apiFetch<Driver[]>("/admin/orders/drivers/list").then((dr) => {
            if (dr.success) setDrivers(dr.data);
          });
        }
      } else {
        router.push("/orders");
      }
      setLoading(false);
    });
  }, [params.id, router]);

  async function assignDriver() {
    if (!order || !selectedDriver) return;
    setAssigningDriver(true);
    const r = await apiFetch(`/admin/orders/${order.id}/delivery/assign`, {
      method: "PATCH",
      body: JSON.stringify({ driverId: selectedDriver }),
    });
    setAssigningDriver(false);
    if (r.success) {
      const driver = drivers.find((d) => d.id === selectedDriver);
      show("Жолооч онооллоо", "success");
      setOrder((o) =>
        o && o.delivery
          ? { ...o, delivery: { ...o.delivery, driver: driver ?? null } }
          : o
      );
    } else {
      show((r.error as { message?: string })?.message ?? "Алдаа гарлаа", "error");
    }
  }

  async function updateStatus() {
    if (!order || newStatus === order.status) return;
    setUpdating(true);
    const r = await apiFetch(`/admin/orders/${order.id}/status`, {
      method: "PATCH",
      body: JSON.stringify({
        status: newStatus,
        ...(statusNote ? { note: statusNote } : {}),
      }),
    });
    setUpdating(false);
    if (r.success) {
      show("Төлөв шинэчлэгдлээ", "success");
      setOrder((o) => (o ? { ...o, status: newStatus } : o));
      setStatusNote("");
    } else {
      show((r.error as { message?: string })?.message ?? "Алдаа гарлаа", "error");
    }
  }

  if (loading) {
    return (
      <div style={{ padding: 28 }}>
        {Array.from({ length: 3 }).map((_, i) => (
          <div
            key={i}
            style={{
              height: i === 0 ? 80 : 200,
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

  if (!order) return null;

  return (
    <div style={{ padding: 28, maxWidth: 800 }}>
      {/* Header */}
      <div style={{ display: "flex", alignItems: "center", gap: 12, marginBottom: 24 }}>
        <Link
          href="/orders"
          style={{
            display: "flex",
            alignItems: "center",
            justifyContent: "center",
            width: 32,
            height: 32,
            border: "1px solid var(--line)",
            borderRadius: "var(--r-2)",
            color: "var(--mute)",
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
        </Link>
        <div>
          <p
            style={{
              fontSize: 11,
              color: "var(--mute-2)",
              letterSpacing: "0.06em",
              textTransform: "uppercase",
            }}
          >
            Захиалгын дэлгэрэнгүй
          </p>
          <h1
            className="num"
            style={{ fontSize: 20, fontWeight: 700, color: "var(--ink)" }}
          >
            {order.orderNumber}
          </h1>
        </div>
        <span
          style={{
            marginLeft: "auto",
            padding: "4px 14px",
            borderRadius: 99,
            background:
              order.status === "cancelled" ? "var(--bg-stone)" : "var(--accent-soft)",
            color: order.status === "cancelled" ? "var(--mute)" : "var(--accent)",
            fontSize: 12,
            fontWeight: 500,
          }}
        >
          {STATUS_LABELS[order.status] ?? order.status}
        </span>
      </div>

      <div
        style={{
          display: "grid",
          gridTemplateColumns: "1fr 320px",
          gap: 16,
          alignItems: "start",
        }}
      >
        {/* Left column */}
        <div style={{ display: "flex", flexDirection: "column", gap: 12 }}>
          {/* Customer */}
          <AdminCard title="Хэрэглэгч">
            <InfoRow label="Нэр" value={order.user.name} />
            <InfoRow label="Утас" value={order.user.phone} />
            <InfoRow
              label="Огноо"
              value={new Date(order.createdAt).toLocaleString("mn-MN")}
            />
            <InfoRow
              label="Хүргэлтийн төрөл"
              value={order.deliveryType === "pickup" ? "Өөрөө авах" : "Хүргэлт"}
            />
            {order.address && (
              <InfoRow
                label="Хаяг"
                value={[
                  order.address.duureg,
                  order.address.khoroo,
                  order.address.gudamj,
                  order.address.bair && `${order.address.bair} байр`,
                  order.address.toot && `${order.address.toot} тоот`,
                ]
                  .filter(Boolean)
                  .join(", ")}
              />
            )}
          </AdminCard>

          {/* Items */}
          <AdminCard title="Бараанууд">
            {order.items.map((item, i) => {
              const img =
                item.product.images.find((x) => x.is_primary) ?? item.product.images[0];
              return (
                <div
                  key={item.id}
                  style={{
                    display: "flex",
                    gap: 12,
                    paddingBottom: i < order.items.length - 1 ? 12 : 0,
                    marginBottom: i < order.items.length - 1 ? 12 : 0,
                    borderBottom:
                      i < order.items.length - 1 ? "1px solid var(--line)" : "none",
                  }}
                >
                  <div
                    style={{
                      width: 48,
                      height: 48,
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
                borderTop: "1px solid var(--line)",
                paddingTop: 10,
                marginTop: 10,
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
                label="Нийт"
                value={`${Number(order.totalMnt).toLocaleString("en-US")}₮`}
                bold
              />
            </div>
          </AdminCard>

          {/* Status history */}
          {order.statusLogs.length > 0 && (
            <AdminCard title="Статусын түүх">
              {order.statusLogs.map((log, i) => (
                <div
                  key={log.id}
                  style={{ display: "flex", gap: 12, position: "relative" }}
                >
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
                      marginTop: 3,
                      background: i === 0 ? "var(--accent)" : "var(--bg-stone)",
                      border: i === 0 ? "none" : "1.5px solid var(--line)",
                    }}
                  />
                  <div
                    style={{ paddingBottom: i < order.statusLogs.length - 1 ? 14 : 0 }}
                  >
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
            </AdminCard>
          )}
        </div>

        {/* Right column */}
        <div style={{ display: "flex", flexDirection: "column", gap: 12 }}>
          {/* Status update */}
          <AdminCard title="Статус өөрчлөх">
            <div style={{ marginBottom: 10 }}>
              <label
                style={{
                  fontSize: 11,
                  color: "var(--mute)",
                  display: "block",
                  marginBottom: 5,
                }}
              >
                Шинэ статус
              </label>
              <select
                value={newStatus}
                onChange={(e) => setNewStatus(e.target.value)}
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
                  boxSizing: "border-box",
                }}
              >
                {ALL_STATUSES.map((s) => (
                  <option key={s} value={s}>
                    {STATUS_LABELS[s]}
                  </option>
                ))}
              </select>
            </div>
            <div style={{ marginBottom: 12 }}>
              <label
                style={{
                  fontSize: 11,
                  color: "var(--mute)",
                  display: "block",
                  marginBottom: 5,
                }}
              >
                Тэмдэглэл (заавал биш)
              </label>
              <input
                type="text"
                placeholder="Жишээ: агуулахад ирлээ"
                value={statusNote}
                onChange={(e) => setStatusNote(e.target.value)}
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
                onFocus={(e) => (e.currentTarget.style.borderColor = "var(--accent-mid)")}
                onBlur={(e) => (e.currentTarget.style.borderColor = "var(--line)")}
              />
            </div>
            <button
              onClick={updateStatus}
              disabled={updating || newStatus === order.status}
              style={{
                width: "100%",
                height: 38,
                background: "var(--accent)",
                color: "var(--bg-paper)",
                border: "none",
                borderRadius: "var(--r-2)",
                fontSize: 13,
                fontWeight: 500,
                cursor:
                  updating || newStatus === order.status ? "not-allowed" : "pointer",
                opacity: updating || newStatus === order.status ? 0.5 : 1,
                fontFamily: "var(--sans)",
              }}
            >
              {updating ? "Шинэчилж байна…" : "Шинэчлэх"}
            </button>
          </AdminCard>

          {/* Payment */}
          {order.payment && (
            <AdminCard title="Төлбөр">
              <InfoRow label="Арга" value={order.payment.provider.toUpperCase()} />
              <InfoRow
                label="Төлөв"
                value={order.payment.status === "paid" ? "Төлөгдсөн" : "Хүлээгдэж байна"}
                accent={order.payment.status === "paid"}
              />
              {order.payment.paidAt && (
                <InfoRow
                  label="Огноо"
                  value={new Date(order.payment.paidAt).toLocaleString("mn-MN")}
                />
              )}
            </AdminCard>
          )}

          {/* Delivery */}
          {order.delivery && (
            <AdminCard title="Хүргэлт">
              <InfoRow
                label="Цаг"
                value={new Date(order.delivery.slot.slotDatetime).toLocaleString(
                  "mn-MN",
                  {
                    month: "short",
                    day: "numeric",
                    hour: "2-digit",
                    minute: "2-digit",
                  }
                )}
              />
              <InfoRow label="Статус" value={order.delivery.status} />
              {order.delivery.driver ? (
                <InfoRow
                  label="Жолооч"
                  value={`${order.delivery.driver.name} · ${order.delivery.driver.phone}`}
                  accent
                />
              ) : (
                <p style={{ fontSize: 12, color: "var(--mute-2)" }}>Жолооч оноогоогүй</p>
              )}
            </AdminCard>
          )}

          {/* Driver assignment — only for delivery orders */}
          {order.deliveryType === "delivery" && drivers.length > 0 && (
            <AdminCard title="Жолооч оноох">
              <div>
                <label
                  style={{
                    fontSize: 11,
                    color: "var(--mute)",
                    display: "block",
                    marginBottom: 5,
                  }}
                >
                  Жолооч сонгох
                </label>
                <select
                  value={selectedDriver}
                  onChange={(e) => setSelectedDriver(e.target.value)}
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
                    boxSizing: "border-box",
                    marginBottom: 10,
                  }}
                >
                  <option value="">— Сонгох —</option>
                  {drivers.map((d) => (
                    <option key={d.id} value={d.id}>
                      {d.name} · {d.phone}
                    </option>
                  ))}
                </select>
                <button
                  onClick={assignDriver}
                  disabled={assigningDriver || !selectedDriver}
                  style={{
                    width: "100%",
                    height: 36,
                    background: "var(--ink-2)",
                    color: "var(--bg-paper)",
                    border: "none",
                    borderRadius: "var(--r-2)",
                    fontSize: 13,
                    fontWeight: 500,
                    cursor:
                      assigningDriver || !selectedDriver ? "not-allowed" : "pointer",
                    opacity: assigningDriver || !selectedDriver ? 0.5 : 1,
                    fontFamily: "var(--sans)",
                  }}
                >
                  {assigningDriver ? "Оноож байна…" : "Оноох"}
                </button>
              </div>
            </AdminCard>
          )}
        </div>
      </div>
    </div>
  );
}

function AdminCard({ title, children }: { title: string; children: React.ReactNode }) {
  return (
    <div
      style={{
        background: "var(--bg-paper)",
        border: "1px solid var(--line)",
        borderRadius: "var(--r-3)",
        overflow: "hidden",
      }}
    >
      <div style={{ padding: "12px 16px", borderBottom: "1px solid var(--line)" }}>
        <p
          style={{
            fontSize: 11,
            fontWeight: 600,
            color: "var(--ink-2)",
            letterSpacing: "0.04em",
            textTransform: "uppercase",
          }}
        >
          {title}
        </p>
      </div>
      <div
        style={{
          padding: "14px 16px",
          display: "flex",
          flexDirection: "column",
          gap: 10,
        }}
      >
        {children}
      </div>
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
      style={{
        display: "flex",
        justifyContent: "space-between",
        alignItems: "baseline",
        gap: 12,
      }}
    >
      <span style={{ fontSize: 12, color: "var(--mute)", flexShrink: 0 }}>{label}</span>
      <span
        style={{
          fontSize: 13,
          fontWeight: 500,
          color: accent ? "var(--accent)" : "var(--ink)",
          textAlign: "right",
        }}
      >
        {value}
      </span>
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
