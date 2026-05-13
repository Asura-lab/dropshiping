"use client";

import { createContext, useContext, useCallback, useState } from "react";

type ToastType = "success" | "error" | "info";

interface Toast {
  id: string;
  message: string;
  type: ToastType;
}

interface ToastContextValue {
  show: (message: string, type?: ToastType) => void;
}

const ToastContext = createContext<ToastContextValue | null>(null);

export function ToastProvider({ children }: { children: React.ReactNode }) {
  const [toasts, setToasts] = useState<Toast[]>([]);

  const show = useCallback((message: string, type: ToastType = "success") => {
    const id = Math.random().toString(36).slice(2);
    setToasts((prev) => [...prev, { id, message, type }]);
    setTimeout(() => {
      setToasts((prev) => prev.filter((t) => t.id !== id));
    }, 3000);
  }, []);

  return (
    <ToastContext.Provider value={{ show }}>
      {children}
      <div
        style={{
          position: "fixed",
          bottom: "24px",
          right: "24px",
          display: "flex",
          flexDirection: "column",
          gap: "8px",
          zIndex: 9999,
        }}
        aria-live="polite"
      >
        {toasts.map((toast) => (
          <ToastItem key={toast.id} toast={toast} />
        ))}
      </div>
    </ToastContext.Provider>
  );
}

function ToastItem({ toast }: { toast: Toast }) {
  const bgMap: Record<ToastType, string> = {
    success: "var(--ink)",
    error: "#dc2626",
    info: "var(--ink)",
  };
  const iconMap: Record<ToastType, string> = { success: "✓", error: "✕", info: "ℹ" };

  return (
    <div
      role="status"
      style={{
        display: "flex",
        alignItems: "center",
        gap: "10px",
        padding: "12px 18px",
        borderRadius: "var(--r-2)",
        background: bgMap[toast.type],
        color: "#fff",
        fontSize: "13px",
        fontWeight: 500,
        boxShadow: "0 4px 16px rgba(0,0,0,0.15)",
        minWidth: "220px",
        maxWidth: "360px",
        animation: "toast-in 0.2s ease",
      }}
    >
      <span>{iconMap[toast.type]}</span>
      {toast.message}
    </div>
  );
}

export function useToast() {
  const ctx = useContext(ToastContext);
  if (!ctx) throw new Error("useToast must be used within ToastProvider");
  return ctx;
}
