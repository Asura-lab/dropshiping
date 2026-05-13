"use client";

import { useEffect, useState, useCallback } from "react";
import { apiFetch } from "@/lib/api";
import { useToast } from "@/components/ui/Toast";

interface DeliverySlot {
  id: string;
  type: "pickup" | "delivery";
  slotDatetime: string;
  capacity: number;
  bookedCount: number;
  isActive: boolean;
  _count: { deliveries: number };
}

const TYPE_LABEL: Record<string, string> = {
  pickup: "Өөрөө авах",
  delivery: "Хүргэлт",
};

const EMPTY_FORM = {
  type: "pickup" as "pickup" | "delivery",
  slotDatetime: "",
  capacity: "20",
};

export default function AdminDeliverySlotsPage() {
  const { show } = useToast();
  const [slots, setSlots] = useState<DeliverySlot[]>([]);
  const [loading, setLoading] = useState(true);
  const [showForm, setShowForm] = useState(false);
  const [saving, setSaving] = useState(false);
  const [deletingId, setDeletingId] = useState<string | null>(null);
  const [form, setForm] = useState(EMPTY_FORM);

  const load = useCallback(async () => {
    setLoading(true);
    const r = await apiFetch<DeliverySlot[]>("/admin/delivery-slots");
    if (r.success) setSlots(r.data);
    setLoading(false);
  }, []);

  useEffect(() => {
    load();
  }, [load]);

  async function handleCreate() {
    if (!form.slotDatetime) {
      show("Огноо цаг оруулна уу", "error");
      return;
    }
    setSaving(true);
    const r = await apiFetch<DeliverySlot>("/admin/delivery-slots", {
      method: "POST",
      body: JSON.stringify({
        type: form.type,
        slotDatetime: new Date(form.slotDatetime).toISOString(),
        capacity: Number(form.capacity),
      }),
    });
    setSaving(false);
    if (r.success) {
      show("Slot нэмэгдлээ", "success");
      setSlots((prev) =>
        [...prev, r.data].sort(
          (a, b) =>
            new Date(a.slotDatetime).getTime() - new Date(b.slotDatetime).getTime()
        )
      );
      setShowForm(false);
      setForm(EMPTY_FORM);
    } else {
      show(r.error?.message ?? "Алдаа гарлаа", "error");
    }
  }

  async function handleDeactivate(id: string) {
    setDeletingId(id);
    const r = await apiFetch(`/admin/delivery-slots/${id}`, { method: "DELETE" });
    setDeletingId(null);
    if (r.success) {
      show("Идэвхгүй болголоо", "success");
      setSlots((prev) => prev.map((s) => (s.id === id ? { ...s, isActive: false } : s)));
    } else {
      show(r.error?.message ?? "Алдаа гарлаа", "error");
    }
  }

  const activeSlots = slots.filter((s) => s.isActive);
  const inactiveSlots = slots.filter((s) => !s.isActive);

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
            Хүргэлтийн цагууд
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
          Slot нэмэх
        </button>
      </div>

      {/* Create form */}
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
            Шинэ slot нэмэх
          </p>
          <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr 1fr", gap: 12 }}>
            <div>
              <label
                style={{
                  fontSize: 11,
                  color: "var(--mute)",
                  display: "block",
                  marginBottom: 4,
                }}
              >
                Төрөл
              </label>
              <select
                value={form.type}
                onChange={(e) =>
                  setForm((p) => ({
                    ...p,
                    type: e.target.value as "pickup" | "delivery",
                  }))
                }
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
                <option value="pickup">Өөрөө авах</option>
                <option value="delivery">Хүргэлт</option>
              </select>
            </div>
            <div>
              <label
                style={{
                  fontSize: 11,
                  color: "var(--mute)",
                  display: "block",
                  marginBottom: 4,
                }}
              >
                Огноо цаг
              </label>
              <input
                type="datetime-local"
                value={form.slotDatetime}
                onChange={(e) => setForm((p) => ({ ...p, slotDatetime: e.target.value }))}
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
            <div>
              <label
                style={{
                  fontSize: 11,
                  color: "var(--mute)",
                  display: "block",
                  marginBottom: 4,
                }}
              >
                Хүчин чадал
              </label>
              <input
                type="number"
                min="1"
                value={form.capacity}
                onChange={(e) => setForm((p) => ({ ...p, capacity: e.target.value }))}
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
              onClick={handleCreate}
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

      {/* Active slots */}
      <SlotTable
        slots={activeSlots}
        loading={loading}
        deletingId={deletingId}
        onDeactivate={handleDeactivate}
      />

      {/* Inactive slots */}
      {inactiveSlots.length > 0 && (
        <div style={{ marginTop: 24 }}>
          <p
            style={{
              fontSize: 12,
              color: "var(--mute-2)",
              marginBottom: 10,
              fontWeight: 500,
            }}
          >
            Идэвхгүй болсон цагууд ({inactiveSlots.length})
          </p>
          <div
            style={{
              background: "var(--bg-paper)",
              border: "1px solid var(--line)",
              borderRadius: "var(--r-3)",
              overflow: "hidden",
              opacity: 0.6,
            }}
          >
            <SlotRows slots={inactiveSlots} deletingId={null} onDeactivate={null} />
          </div>
        </div>
      )}
    </div>
  );
}

function SlotTable({
  slots,
  loading,
  deletingId,
  onDeactivate,
}: {
  slots: DeliverySlot[];
  loading: boolean;
  deletingId: string | null;
  onDeactivate: ((id: string) => void) | null;
}) {
  return (
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
          {Array.from({ length: 5 }).map((_, i) => (
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
      ) : slots.length === 0 ? (
        <div
          style={{
            padding: "40px 20px",
            textAlign: "center",
            color: "var(--mute)",
            fontSize: 13,
          }}
        >
          Slot байхгүй байна
        </div>
      ) : (
        <table style={{ width: "100%", borderCollapse: "collapse", fontSize: 13 }}>
          <thead>
            <tr style={{ background: "var(--bg-cream)" }}>
              {["Төрөл", "Огноо цаг", "Захиалсан / Нийт", "Дүүрэлт", ""].map((h) => (
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
                    whiteSpace: "nowrap",
                  }}
                >
                  {h}
                </th>
              ))}
            </tr>
          </thead>
          <tbody>
            <SlotRows slots={slots} deletingId={deletingId} onDeactivate={onDeactivate} />
          </tbody>
        </table>
      )}
    </div>
  );
}

function SlotRows({
  slots,
  deletingId,
  onDeactivate,
}: {
  slots: DeliverySlot[];
  deletingId: string | null;
  onDeactivate: ((id: string) => void) | null;
}) {
  return (
    <>
      {slots.map((slot, i) => {
        const pct = Math.round((slot.bookedCount / slot.capacity) * 100);
        const isFull = slot.bookedCount >= slot.capacity;
        return (
          <tr
            key={slot.id}
            style={{
              borderBottom: i < slots.length - 1 ? "1px solid var(--line)" : "none",
            }}
          >
            <td style={{ padding: "11px 14px" }}>
              <span
                style={{
                  fontSize: 11,
                  padding: "2px 8px",
                  borderRadius: 99,
                  fontWeight: 500,
                  background: slot.type === "delivery" ? "#dbeafe" : "#f0fdf4",
                  color: slot.type === "delivery" ? "#1d4ed8" : "#15803d",
                }}
              >
                {TYPE_LABEL[slot.type]}
              </span>
            </td>
            <td style={{ padding: "11px 14px", whiteSpace: "nowrap" }}>
              <span className="num" style={{ color: "var(--ink)", fontWeight: 500 }}>
                {new Date(slot.slotDatetime).toLocaleString("mn-MN", {
                  month: "short",
                  day: "numeric",
                  hour: "2-digit",
                  minute: "2-digit",
                })}
              </span>
            </td>
            <td style={{ padding: "11px 14px" }}>
              <span className="num" style={{ color: isFull ? "#dc2626" : "var(--ink)" }}>
                {slot.bookedCount} / {slot.capacity}
              </span>
            </td>
            <td style={{ padding: "11px 14px", minWidth: 120 }}>
              <div style={{ display: "flex", alignItems: "center", gap: 8 }}>
                <div
                  style={{
                    flex: 1,
                    height: 6,
                    background: "var(--bg-stone)",
                    borderRadius: 3,
                    overflow: "hidden",
                  }}
                >
                  <div
                    style={{
                      width: `${pct}%`,
                      height: "100%",
                      background: isFull
                        ? "#dc2626"
                        : pct > 70
                          ? "#d97706"
                          : "var(--accent)",
                      borderRadius: 3,
                      transition: "width 0.3s ease",
                    }}
                  />
                </div>
                <span
                  style={{
                    fontSize: 11,
                    color: "var(--mute-2)",
                    width: 30,
                    textAlign: "right",
                  }}
                  className="num"
                >
                  {pct}%
                </span>
              </div>
            </td>
            <td style={{ padding: "11px 14px" }}>
              {onDeactivate && slot.isActive && (
                <button
                  onClick={() => onDeactivate(slot.id)}
                  disabled={deletingId === slot.id}
                  style={{
                    height: 28,
                    padding: "0 12px",
                    border: "1px solid var(--line)",
                    borderRadius: "var(--r-1)",
                    background: "var(--bg-paper)",
                    color: "var(--mute)",
                    fontSize: 11,
                    cursor: "pointer",
                    opacity: deletingId === slot.id ? 0.5 : 1,
                    fontFamily: "var(--sans)",
                    whiteSpace: "nowrap",
                  }}
                >
                  {deletingId === slot.id ? "…" : "Хаах"}
                </button>
              )}
            </td>
          </tr>
        );
      })}
    </>
  );
}
