"use client";

import { useState, useRef, useEffect } from "react";
import { useRouter } from "next/navigation";
import { Button } from "@/components/ui/Button";
import { Input } from "@/components/ui/Input";
import { useToast } from "@/components/ui/Toast";

const API = process.env.NEXT_PUBLIC_API_URL ?? "http://localhost:4000/v1";

type Step = "phone" | "otp" | "name";

export default function AuthPage() {
  const router = useRouter();
  const { show } = useToast();
  const [step, setStep] = useState<Step>("phone");
  const [phone, setPhone] = useState("");
  const [otp, setOtp] = useState(["", "", "", ""]);
  const [name, setName] = useState("");
  const [loading, setLoading] = useState(false);
  const [countdown, setCountdown] = useState(0);
  const otpRefs = [
    useRef<HTMLInputElement>(null),
    useRef<HTMLInputElement>(null),
    useRef<HTMLInputElement>(null),
    useRef<HTMLInputElement>(null),
  ];

  useEffect(() => {
    if (countdown > 0) {
      const t = setTimeout(() => setCountdown((c) => c - 1), 1000);
      return () => clearTimeout(t);
    }
  }, [countdown]);

  async function sendOtp() {
    if (!phone.match(/^\+?[0-9]{8,15}$/)) {
      show("Утасны дугаар буруу байна", "error");
      return;
    }
    setLoading(true);
    try {
      const res = await fetch(`${API}/auth/otp/send`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ phone }),
      });
      const data = await res.json();
      if (!data.success) throw new Error(data.error?.message);
      setStep("otp");
      setCountdown(data.data.expires_in as number);
      setTimeout(() => otpRefs[0].current?.focus(), 100);
    } catch (e) {
      show(e instanceof Error ? e.message : "Алдаа гарлаа", "error");
    } finally {
      setLoading(false);
    }
  }

  function handleOtpInput(index: number, value: string) {
    if (!/^\d*$/.test(value)) return;
    const next = [...otp];
    next[index] = value.slice(-1);
    setOtp(next);
    if (value && index < 3) otpRefs[index + 1]?.current?.focus();
    if (next.every((d) => d) && next.join("").length === 4) {
      verifyOtp(next.join(""));
    }
  }

  function handleOtpKeyDown(index: number, e: React.KeyboardEvent) {
    if (e.key === "Backspace" && !otp[index] && index > 0) {
      otpRefs[index - 1]?.current?.focus();
    }
  }

  async function verifyOtp(code?: string) {
    const otpCode = code ?? otp.join("");
    if (otpCode.length !== 4) return;
    setLoading(true);
    try {
      const res = await fetch(`${API}/auth/otp/verify`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ phone, otp: otpCode }),
      });
      const data = await res.json();
      if (!data.success) throw new Error(data.error?.message);

      localStorage.setItem("access_token", data.data.access_token as string);
      localStorage.setItem("refresh_token", data.data.refresh_token as string);
      localStorage.setItem("user", JSON.stringify(data.data.user));

      if (data.data.is_new) {
        setStep("name");
      } else {
        show("Амжилттай нэвтэрлээ", "success");
        router.push("/products");
      }
    } catch (e) {
      show(e instanceof Error ? e.message : "OTP буруу байна", "error");
      setOtp(["", "", "", ""]);
      otpRefs[0].current?.focus();
    } finally {
      setLoading(false);
    }
  }

  async function saveName() {
    if (!name.trim()) {
      show("Нэрээ оруулна уу", "error");
      return;
    }
    setLoading(true);
    try {
      const token = localStorage.getItem("access_token");
      const res = await fetch(`${API}/users/me`, {
        method: "PATCH",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${token}`,
        },
        body: JSON.stringify({ name: name.trim() }),
      });
      const data = await res.json();
      if (!data.success) throw new Error(data.error?.message);
      localStorage.setItem("user", JSON.stringify(data.data));
      show("Тавтай морилно уу!", "success");
      router.push("/products");
    } catch (e) {
      show(e instanceof Error ? e.message : "Алдаа гарлаа", "error");
    } finally {
      setLoading(false);
    }
  }

  return (
    <div
      style={{
        minHeight: "calc(100vh - 120px)",
        display: "flex",
        alignItems: "center",
        justifyContent: "center",
        padding: "24px",
      }}
    >
      <div
        style={{
          width: "100%",
          maxWidth: "360px",
          background: "var(--color-surface)",
          border: "1px solid var(--color-border)",
          borderRadius: "var(--radius-lg)",
          padding: "40px 32px",
        }}
      >
        {step === "phone" && (
          <>
            <h1 style={{ fontSize: "22px", fontWeight: 700, marginBottom: "8px" }}>
              Нэвтрэх
            </h1>
            <p
              style={{
                fontSize: "14px",
                color: "var(--color-text-secondary)",
                marginBottom: "28px",
              }}
            >
              Утасны дугаараа оруулна уу
            </p>
            <div style={{ display: "flex", flexDirection: "column", gap: "16px" }}>
              <Input
                label="Утасны дугаар"
                type="tel"
                placeholder="+97699112233"
                value={phone}
                onChange={(e) => setPhone(e.target.value)}
                onKeyDown={(e) => e.key === "Enter" && sendOtp()}
                autoFocus
              />
              <Button fullWidth loading={loading} onClick={sendOtp}>
                OTP авах
              </Button>
            </div>
          </>
        )}

        {step === "otp" && (
          <>
            <h1 style={{ fontSize: "22px", fontWeight: 700, marginBottom: "8px" }}>
              OTP оруулах
            </h1>
            <p
              style={{
                fontSize: "14px",
                color: "var(--color-text-secondary)",
                marginBottom: "28px",
              }}
            >
              {phone} дугаарт 4 оронтой код илгээлээ
            </p>
            <div
              style={{
                display: "flex",
                gap: "12px",
                marginBottom: "24px",
                justifyContent: "center",
              }}
            >
              {otp.map((digit, i) => (
                <input
                  key={i}
                  ref={otpRefs[i]}
                  value={digit}
                  onChange={(e) => handleOtpInput(i, e.target.value)}
                  onKeyDown={(e) => handleOtpKeyDown(i, e)}
                  inputMode="numeric"
                  maxLength={1}
                  style={{
                    width: "56px",
                    height: "64px",
                    textAlign: "center",
                    fontSize: "24px",
                    fontWeight: 700,
                    border: "1.5px solid var(--color-border)",
                    borderRadius: "var(--radius-md)",
                    background: "var(--color-surface)",
                    color: "var(--color-text-primary)",
                    outline: "none",
                  }}
                />
              ))}
            </div>
            <Button fullWidth loading={loading} onClick={() => verifyOtp()}>
              Баталгаажуулах
            </Button>
            <div style={{ textAlign: "center", marginTop: "16px" }}>
              {countdown > 0 ? (
                <span style={{ fontSize: "13px", color: "var(--color-text-hint)" }}>
                  {countdown}с-д дахин авах боломжтой
                </span>
              ) : (
                <button
                  onClick={() => {
                    setStep("phone");
                    setOtp(["", "", "", ""]);
                  }}
                  style={{
                    fontSize: "13px",
                    color: "var(--color-accent)",
                    background: "none",
                    border: "none",
                    cursor: "pointer",
                  }}
                >
                  Дугаараа өөрчлөх
                </button>
              )}
            </div>
          </>
        )}

        {step === "name" && (
          <>
            <h1 style={{ fontSize: "22px", fontWeight: 700, marginBottom: "8px" }}>
              Нэрээ оруулна уу
            </h1>
            <p
              style={{
                fontSize: "14px",
                color: "var(--color-text-secondary)",
                marginBottom: "28px",
              }}
            >
              Анх удаа нэвтэрч байна. Нэрээ оруулна уу.
            </p>
            <div style={{ display: "flex", flexDirection: "column", gap: "16px" }}>
              <Input
                label="Нэр"
                placeholder="Болд Баатар"
                value={name}
                onChange={(e) => setName(e.target.value)}
                onKeyDown={(e) => e.key === "Enter" && saveName()}
                autoFocus
              />
              <Button fullWidth loading={loading} onClick={saveName}>
                Үргэлжлүүлэх
              </Button>
            </div>
          </>
        )}
      </div>
    </div>
  );
}
