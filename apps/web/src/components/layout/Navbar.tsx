"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";

export function Navbar() {
  return (
    <header
      style={{
        position: "sticky",
        top: 0,
        zIndex: 100,
        background: "var(--color-surface)",
        borderBottom: "1px solid var(--color-border)",
      }}
    >
      <div
        style={{
          maxWidth: "1200px",
          margin: "0 auto",
          padding: "0 24px",
          height: "60px",
          display: "flex",
          alignItems: "center",
          gap: "24px",
        }}
      >
        {/* Logo */}
        <Link
          href="/"
          style={{
            fontWeight: 700,
            fontSize: "17px",
            color: "var(--color-text-primary)",
            letterSpacing: "-0.03em",
          }}
        >
          Дэлгүүр
        </Link>

        {/* Nav links */}
        <nav style={{ display: "flex", gap: "4px", flex: 1 }}>
          <NavLink href="/products">Бараа</NavLink>
          <NavLink href="/orders">Захиалга</NavLink>
        </nav>

        {/* Right side */}
        <div style={{ display: "flex", alignItems: "center", gap: "8px" }}>
          <LangToggle />
          <NavIconLink href="/cart" label="Сагс">
            🛒
          </NavIconLink>
          <NavIconLink href="/auth" label="Нэвтрэх">
            👤
          </NavIconLink>
        </div>
      </div>
    </header>
  );
}

function NavLink({ href, children }: { href: string; children: React.ReactNode }) {
  const pathname = usePathname();
  const active = pathname.startsWith(href);
  return (
    <Link
      href={href}
      style={{
        padding: "6px 12px",
        borderRadius: "var(--radius-sm)",
        fontSize: "14px",
        fontWeight: active ? 600 : 400,
        color: active ? "var(--color-accent)" : "var(--color-text-secondary)",
        background: active ? "var(--color-accent-light)" : "transparent",
        transition: "background 0.15s, color 0.15s",
      }}
    >
      {children}
    </Link>
  );
}

function NavIconLink({
  href,
  label,
  children,
}: {
  href: string;
  label: string;
  children: React.ReactNode;
}) {
  return (
    <Link
      href={href}
      aria-label={label}
      style={{
        display: "flex",
        alignItems: "center",
        justifyContent: "center",
        width: "38px",
        height: "38px",
        borderRadius: "var(--radius-sm)",
        fontSize: "18px",
        color: "var(--color-text-secondary)",
        transition: "background 0.15s",
      }}
    >
      {children}
    </Link>
  );
}

function LangToggle() {
  return (
    <button
      style={{
        display: "flex",
        alignItems: "center",
        gap: "2px",
        padding: "5px 10px",
        borderRadius: "var(--radius-sm)",
        border: "1.5px solid var(--color-border)",
        fontSize: "12px",
        fontWeight: 600,
        color: "var(--color-text-secondary)",
        background: "transparent",
        cursor: "pointer",
      }}
      title="Хэл солих"
    >
      МН
    </button>
  );
}
