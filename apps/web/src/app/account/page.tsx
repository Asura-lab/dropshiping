"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { apiFetch, getUser, logout } from "@/lib/api";
import { useToast } from "@/components/ui/Toast";

interface Profile {
  id: string;
  name: string;
  phone: string;
  email: string | null;
  role: string;
  createdAt: string;
}

interface Address {
  id: string;
  label: string | null;
  duureg: string;
  khoroo: string;
  gudamj: string | null;
  bair: string | null;
  toot: string | null;
  isDefault: boolean;
}

type Tab = "profile" | "addresses";

export default function AccountPage() {
  const router = useRouter();
  const { show } = useToast();
  const [tab, setTab] = useState<Tab>("profile");
  const [profile, setProfile] = useState<Profile | null>(null);
  const [addresses, setAddresses] = useState<Address[]>([]);
  const [loading, setLoading] = useState(true);

  // Address add form
  const [showAddForm, setShowAddForm] = useState(false);
  const [newAddr, setNewAddr] = useState({
    duureg: "",
    khoroo: "",
    bair: "",
    toot: "",
    gudamj: "",
    label: "",
  });
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    if (!getUser()) {
      router.push("/auth");
      return;
    }
    Promise.all([
      apiFetch<Profile>("/users/me"),
      apiFetch<Address[]>("/users/me/addresses"),
    ]).then(([pRes, aRes]) => {
      if (pRes.success) setProfile(pRes.data);
      if (aRes.success) setAddresses(aRes.data);
      setLoading(false);
    });
  }, [router]);

  async function addAddress() {
    if (!newAddr.duureg || !newAddr.khoroo) {
      show("Дүүрэг, хороо оруулна уу", "error");
      return;
    }
    setSaving(true);
    const res = await apiFetch<Address>("/users/me/addresses", {
      method: "POST",
      body: JSON.stringify({
        duureg: newAddr.duureg,
        khoroo: newAddr.khoroo,
        ...(newAddr.gudamj ? { gudamj: newAddr.gudamj } : {}),
        ...(newAddr.bair ? { bair: newAddr.bair } : {}),
        ...(newAddr.toot ? { toot: newAddr.toot } : {}),
        ...(newAddr.label ? { label: newAddr.label } : {}),
      }),
    });
    setSaving(false);
    if (res.success) {
      setAddresses((prev) => [...prev, res.data]);
      setNewAddr({ duureg: "", khoroo: "", bair: "", toot: "", gudamj: "", label: "" });
      setShowAddForm(false);
      show("Хаяг нэмэгдлээ", "success");
    } else {
      show(res.error?.message ?? "Алдаа гарлаа", "error");
    }
  }

  async function deleteAddress(id: string) {
    const res = await apiFetch(`/users/me/addresses/${id}`, { method: "DELETE" });
    if (res.success) {
      setAddresses((prev) => prev.filter((a) => a.id !== id));
      show("Хаяг устгагдлаа", "success");
    }
  }

  function handleLogout() {
    logout();
    router.push("/auth");
  }

  if (loading) {
    return (
      <div style={{ maxWidth: 600, margin: "0 auto", padding: "28px 20px" }}>
        <div
          style={{
            height: 28,
            width: 120,
            background: "var(--bg-cream)",
            borderRadius: "var(--r-1)",
            marginBottom: 24,
            animation: "pulse 1.5s infinite",
          }}
        />
        <div
          style={{
            height: 200,
            background: "var(--bg-cream)",
            borderRadius: "var(--r-3)",
            animation: "pulse 1.5s infinite",
          }}
        />
      </div>
    );
  }

  return (
    <div style={{ maxWidth: 600, margin: "0 auto", padding: "28px 20px" }}>
      {/* Header */}
      <div
        style={{
          marginBottom: 24,
          display: "flex",
          justifyContent: "space-between",
          alignItems: "flex-start",
        }}
      >
        <div>
          <div className="eyebrow" style={{ marginBottom: 4 }}>
            Миний данс
          </div>
          <h1 style={{ fontSize: 22, fontWeight: 600, letterSpacing: "-0.01em" }}>
            {profile?.name ?? "Профайл"}
          </h1>
        </div>
        <button
          onClick={handleLogout}
          style={{
            height: 34,
            padding: "0 14px",
            border: "1px solid var(--line)",
            borderRadius: "var(--r-2)",
            background: "var(--bg-paper)",
            color: "var(--mute)",
            fontSize: 12,
            cursor: "pointer",
            fontFamily: "var(--sans)",
          }}
        >
          Гарах
        </button>
      </div>

      {/* Tab bar */}
      <div
        style={{
          display: "inline-flex",
          gap: 2,
          background: "var(--bg-cream)",
          borderRadius: "var(--r-2)",
          padding: 3,
          marginBottom: 24,
        }}
      >
        {(["profile", "addresses"] as Tab[]).map((t) => (
          <button
            key={t}
            onClick={() => setTab(t)}
            style={{
              height: 32,
              padding: "0 16px",
              borderRadius: "var(--r-1)",
              border: "none",
              background: tab === t ? "var(--bg-paper)" : "transparent",
              color: tab === t ? "var(--ink)" : "var(--mute)",
              fontSize: 13,
              fontWeight: tab === t ? 500 : 400,
              cursor: "pointer",
              fontFamily: "var(--sans)",
              boxShadow: tab === t ? "0 1px 3px rgba(0,0,0,0.06)" : "none",
              transition: "all 100ms ease",
            }}
          >
            {t === "profile" ? "Профайл" : "Хаягууд"}
          </button>
        ))}
      </div>

      {/* Profile tab */}
      {tab === "profile" && profile && (
        <div
          style={{
            background: "var(--bg-paper)",
            border: "1px solid var(--line)",
            borderRadius: "var(--r-3)",
            overflow: "hidden",
          }}
        >
          {[
            { label: "Нэр", value: profile.name },
            { label: "Утас", value: profile.phone },
            ...(profile.email ? [{ label: "Имэйл", value: profile.email }] : []),
            {
              label: "Бүртгүүлсэн огноо",
              value: new Date(profile.createdAt).toLocaleDateString("mn-MN", {
                year: "numeric",
                month: "long",
                day: "numeric",
              }),
            },
          ].map((row, i, arr) => (
            <div
              key={row.label}
              style={{
                display: "flex",
                justifyContent: "space-between",
                alignItems: "center",
                padding: "14px 18px",
                borderBottom: i < arr.length - 1 ? "1px solid var(--line)" : "none",
              }}
            >
              <span style={{ fontSize: 12, color: "var(--mute)" }}>{row.label}</span>
              <span style={{ fontSize: 14, fontWeight: 500, color: "var(--ink)" }}>
                {row.value}
              </span>
            </div>
          ))}
        </div>
      )}

      {/* Addresses tab */}
      {tab === "addresses" && (
        <div>
          {addresses.length > 0 && (
            <div
              style={{
                display: "flex",
                flexDirection: "column",
                gap: 10,
                marginBottom: 14,
              }}
            >
              {addresses.map((addr) => (
                <div
                  key={addr.id}
                  style={{
                    background: "var(--bg-paper)",
                    border: addr.isDefault
                      ? "1.5px solid var(--accent-mist)"
                      : "1px solid var(--line)",
                    borderRadius: "var(--r-3)",
                    padding: "14px 16px",
                    display: "flex",
                    justifyContent: "space-between",
                    alignItems: "flex-start",
                  }}
                >
                  <div>
                    {addr.label && (
                      <p
                        style={{
                          fontSize: 11,
                          color: "var(--mute-2)",
                          marginBottom: 4,
                          textTransform: "uppercase",
                          letterSpacing: "0.05em",
                        }}
                      >
                        {addr.label}
                      </p>
                    )}
                    <p
                      style={{
                        fontSize: 14,
                        fontWeight: 500,
                        color: "var(--ink)",
                        marginBottom: 2,
                      }}
                    >
                      {addr.duureg}, {addr.khoroo}
                    </p>
                    {(addr.bair || addr.toot || addr.gudamj) && (
                      <p style={{ fontSize: 12, color: "var(--mute)" }}>
                        {[
                          addr.gudamj,
                          addr.bair && `${addr.bair} байр`,
                          addr.toot && `${addr.toot} тоот`,
                        ]
                          .filter(Boolean)
                          .join(", ")}
                      </p>
                    )}
                    {addr.isDefault && (
                      <span
                        style={{
                          display: "inline-block",
                          marginTop: 6,
                          padding: "2px 8px",
                          borderRadius: 99,
                          background: "var(--accent-soft)",
                          color: "var(--accent)",
                          fontSize: 10.5,
                          fontWeight: 500,
                        }}
                      >
                        Үндсэн хаяг
                      </span>
                    )}
                  </div>
                  <button
                    onClick={() => deleteAddress(addr.id)}
                    style={{
                      color: "var(--mute-2)",
                      background: "none",
                      border: "none",
                      cursor: "pointer",
                      padding: "2px 6px",
                      fontSize: 16,
                      lineHeight: 1,
                    }}
                    aria-label="Устгах"
                  >
                    ✕
                  </button>
                </div>
              ))}
            </div>
          )}

          {!showAddForm ? (
            <button
              onClick={() => setShowAddForm(true)}
              style={{
                width: "100%",
                height: 44,
                border: "1.5px dashed var(--line-2)",
                borderRadius: "var(--r-3)",
                background: "transparent",
                color: "var(--mute)",
                fontSize: 13,
                cursor: "pointer",
                fontFamily: "var(--sans)",
                display: "flex",
                alignItems: "center",
                justifyContent: "center",
                gap: 8,
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
              >
                <path d="M12 5v14M5 12h14" />
              </svg>
              Хаяг нэмэх
            </button>
          ) : (
            <div
              style={{
                background: "var(--bg-paper)",
                border: "1px solid var(--line)",
                borderRadius: "var(--r-3)",
                padding: "18px",
              }}
            >
              <p
                style={{
                  fontSize: 13,
                  fontWeight: 500,
                  marginBottom: 14,
                  color: "var(--ink)",
                }}
              >
                Шинэ хаяг нэмэх
              </p>
              <div style={{ display: "flex", flexDirection: "column", gap: 10 }}>
                {[
                  {
                    key: "duureg" as const,
                    label: "Дүүрэг *",
                    placeholder: "СБД, БГД, ...",
                  },
                  { key: "khoroo" as const, label: "Хороо *", placeholder: "1-р хороо" },
                  {
                    key: "gudamj" as const,
                    label: "Гудамж",
                    placeholder: "Чингэлтэй гудамж",
                  },
                  { key: "bair" as const, label: "Байр", placeholder: "17" },
                  { key: "toot" as const, label: "Тоот", placeholder: "304" },
                  {
                    key: "label" as const,
                    label: "Нэр (заавал биш)",
                    placeholder: "Гэр, Ажил, ...",
                  },
                ].map((field) => (
                  <div key={field.key}>
                    <label
                      style={{
                        fontSize: 11,
                        color: "var(--mute)",
                        display: "block",
                        marginBottom: 5,
                      }}
                    >
                      {field.label}
                    </label>
                    <input
                      type="text"
                      placeholder={field.placeholder}
                      value={newAddr[field.key]}
                      onChange={(e) =>
                        setNewAddr((p) => ({ ...p, [field.key]: e.target.value }))
                      }
                      style={{
                        width: "100%",
                        height: 38,
                        padding: "0 12px",
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
              <div style={{ display: "flex", gap: 8, marginTop: 16 }}>
                <button
                  onClick={() => setShowAddForm(false)}
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
                  onClick={addAddress}
                  disabled={saving}
                  style={{
                    flex: 1,
                    height: 38,
                    background: "var(--accent)",
                    color: "var(--bg-paper)",
                    border: "none",
                    borderRadius: "var(--r-2)",
                    fontSize: 13,
                    fontWeight: 500,
                    cursor: "pointer",
                    opacity: saving ? 0.7 : 1,
                    fontFamily: "var(--sans)",
                  }}
                >
                  {saving ? "Хадгалж байна…" : "Хадгалах"}
                </button>
              </div>
            </div>
          )}
        </div>
      )}
    </div>
  );
}
