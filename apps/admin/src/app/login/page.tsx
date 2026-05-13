"use client";

import { useState, useEffect } from "react";
import { useRouter } from "next/navigation";
import { getUser } from "@/lib/api";

const API = process.env.NEXT_PUBLIC_API_URL ?? "http://localhost:4000/v1";

export default function AdminLoginPage() {
  const router = useRouter();
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");

  useEffect(() => {
    const user = getUser();
    if (user?.role === "admin") router.replace("/");
  }, [router]);

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setError("");
    setLoading(true);
    try {
      const res = await fetch(`${API}/auth/admin/login`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ email, password }),
      });
      const data = await res.json();
      if (!data.success) throw new Error(data.error?.message ?? "Нэвтрэх боломжгүй");
      localStorage.setItem("access_token", data.data.access_token as string);
      localStorage.setItem("refresh_token", data.data.refresh_token as string);
      localStorage.setItem("user", JSON.stringify(data.data.user));
      router.push("/");
    } catch (e) {
      setError(e instanceof Error ? e.message : "Алдаа гарлаа");
    } finally {
      setLoading(false);
    }
  }

  return (
    <div
      style={{
        minHeight: "100vh",
        background: "var(--bg-cream)",
        display: "flex",
        alignItems: "center",
        justifyContent: "center",
        padding: "0 20px",
      }}
    >
      <div
        style={{
          width: "100%",
          maxWidth: 360,
          background: "var(--bg-paper)",
          border: "1px solid var(--line)",
          borderRadius: "var(--r-3)",
          padding: "32px 28px",
        }}
      >
        <div style={{ marginBottom: 28, textAlign: "center" }}>
          <p
            style={{
              fontSize: 11,
              letterSpacing: "0.1em",
              color: "var(--mute-2)",
              textTransform: "uppercase",
              marginBottom: 4,
            }}
          >
            OmniFlow
          </p>
          <p style={{ fontSize: 16, fontWeight: 600, color: "var(--ink)" }}>
            Удирдлагын нэвтрэх
          </p>
        </div>

        <form
          onSubmit={handleSubmit}
          style={{ display: "flex", flexDirection: "column", gap: 14 }}
        >
          <div>
            <label
              style={{
                fontSize: 11,
                color: "var(--mute)",
                display: "block",
                marginBottom: 5,
              }}
            >
              Имэйл
            </label>
            <input
              type="email"
              placeholder="admin@omniflow.mn"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              required
              style={{
                width: "100%",
                height: 40,
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
                marginBottom: 5,
              }}
            >
              Нууц үг
            </label>
            <input
              type="password"
              placeholder="••••••••"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              required
              style={{
                width: "100%",
                height: 40,
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
              onFocus={(e) => (e.currentTarget.style.borderColor = "var(--accent-mid)")}
              onBlur={(e) => (e.currentTarget.style.borderColor = "var(--line)")}
            />
          </div>

          {error && (
            <p
              style={{
                fontSize: 12,
                color: "#dc2626",
                background: "#fef2f2",
                border: "1px solid #fecaca",
                borderRadius: "var(--r-2)",
                padding: "8px 12px",
              }}
            >
              {error}
            </p>
          )}

          <button
            type="submit"
            disabled={loading}
            style={{
              width: "100%",
              height: 42,
              background: "var(--accent)",
              color: "var(--bg-paper)",
              border: "none",
              borderRadius: "var(--r-2)",
              fontSize: 14,
              fontWeight: 500,
              cursor: loading ? "not-allowed" : "pointer",
              opacity: loading ? 0.7 : 1,
              fontFamily: "var(--sans)",
              marginTop: 4,
            }}
          >
            {loading ? "Нэвтэрч байна…" : "Нэвтрэх"}
          </button>
        </form>

        <p
          style={{
            marginTop: 20,
            textAlign: "center",
            fontSize: 12,
            color: "var(--mute-2)",
          }}
        >
          Dev горим: нууц үг = ADMIN_PASSWORD env эсвэл "admin1234"
        </p>
      </div>
    </div>
  );
}
