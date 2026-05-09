"use client";

import { useEffect, useState } from "react";
import { useRouter, usePathname } from "next/navigation";
import Link from "next/link";
import { getUser } from "@/lib/api";

const NAV = [
  {
    href: "/admin",
    label: "Нүүр",
    icon: (
      <svg
        width="16"
        height="16"
        viewBox="0 0 24 24"
        fill="none"
        stroke="currentColor"
        strokeWidth="1.75"
        strokeLinecap="round"
        strokeLinejoin="round"
      >
        <rect x="3" y="3" width="7" height="7" />
        <rect x="14" y="3" width="7" height="7" />
        <rect x="14" y="14" width="7" height="7" />
        <rect x="3" y="14" width="7" height="7" />
      </svg>
    ),
  },
  {
    href: "/admin/orders",
    label: "Захиалгууд",
    icon: (
      <svg
        width="16"
        height="16"
        viewBox="0 0 24 24"
        fill="none"
        stroke="currentColor"
        strokeWidth="1.75"
        strokeLinecap="round"
        strokeLinejoin="round"
      >
        <path d="M6 2L3 6v14a2 2 0 002 2h14a2 2 0 002-2V6l-3-4z" />
        <line x1="3" y1="6" x2="21" y2="6" />
        <path d="M16 10a4 4 0 01-8 0" />
      </svg>
    ),
  },
  {
    href: "/admin/products",
    label: "Бараа",
    icon: (
      <svg
        width="16"
        height="16"
        viewBox="0 0 24 24"
        fill="none"
        stroke="currentColor"
        strokeWidth="1.75"
        strokeLinecap="round"
        strokeLinejoin="round"
      >
        <path d="M21 16V8a2 2 0 00-1-1.73l-7-4a2 2 0 00-2 0l-7 4A2 2 0 003 8v8a2 2 0 001 1.73l7 4a2 2 0 002 0l7-4A2 2 0 0021 16z" />
        <polyline points="3.27 6.96 12 12.01 20.73 6.96" />
        <line x1="12" y1="22.08" x2="12" y2="12" />
      </svg>
    ),
  },
];

export default function AdminLayout({ children }: { children: React.ReactNode }) {
  const router = useRouter();
  const pathname = usePathname();
  const [checked, setChecked] = useState(false);

  useEffect(() => {
    if (pathname === "/admin/login") {
      setChecked(true);
      return;
    }
    const user = getUser();
    if (!user || user.role !== "admin") {
      router.replace("/admin/login");
    } else {
      setChecked(true);
    }
  }, [router, pathname]);

  if (!checked) return null;

  if (pathname === "/admin/login") {
    return <>{children}</>;
  }

  return (
    <div style={{ display: "flex", minHeight: "100vh", background: "var(--bg-cream)" }}>
      {/* Sidebar */}
      <aside
        style={{
          width: 200,
          background: "var(--bg-paper)",
          borderRight: "1px solid var(--line)",
          flexShrink: 0,
          padding: "24px 0",
          display: "flex",
          flexDirection: "column",
        }}
      >
        <div
          style={{
            padding: "0 16px 20px",
            borderBottom: "1px solid var(--line)",
            marginBottom: 8,
          }}
        >
          <p
            style={{
              fontSize: 11,
              letterSpacing: "0.08em",
              color: "var(--mute-2)",
              textTransform: "uppercase",
              marginBottom: 2,
            }}
          >
            SHUUD
          </p>
          <p style={{ fontSize: 13, fontWeight: 600, color: "var(--ink)" }}>Удирдлага</p>
        </div>
        <nav style={{ flex: 1 }}>
          {NAV.map((item) => {
            const active =
              item.href === "/admin"
                ? pathname === "/admin"
                : pathname.startsWith(item.href);
            return (
              <Link
                key={item.href}
                href={item.href}
                style={{
                  display: "flex",
                  alignItems: "center",
                  gap: 10,
                  padding: "9px 16px",
                  color: active ? "var(--accent)" : "var(--mute)",
                  background: active ? "var(--accent-soft)" : "transparent",
                  fontSize: 13,
                  fontWeight: active ? 500 : 400,
                  textDecoration: "none",
                  borderLeft: active
                    ? "2px solid var(--accent)"
                    : "2px solid transparent",
                  transition: "all 80ms ease",
                }}
              >
                {item.icon}
                {item.label}
              </Link>
            );
          })}
        </nav>
        <div style={{ padding: "12px 16px", borderTop: "1px solid var(--line)" }}>
          <Link
            href="/"
            style={{ fontSize: 12, color: "var(--mute-2)", textDecoration: "none" }}
          >
            ← Сайт руу буцах
          </Link>
        </div>
      </aside>

      {/* Main */}
      <main style={{ flex: 1, overflow: "auto" }}>{children}</main>
    </div>
  );
}
