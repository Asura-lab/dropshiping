"use client";

import Link from "next/link";
import { usePathname, useRouter } from "next/navigation";
import { useEffect, useState } from "react";
import { useCart } from "@/lib/cart-context";
import { getUser, logout } from "@/lib/api";

// ---- SVG Icons -------------------------------------------------------
function Icon({
  name,
  size = 18,
  stroke = 1.5,
}: {
  name: string;
  size?: number;
  stroke?: number;
}) {
  const p = {
    width: size,
    height: size,
    viewBox: "0 0 24 24",
    fill: "none",
    stroke: "currentColor",
    strokeWidth: stroke,
    strokeLinecap: "round" as const,
    strokeLinejoin: "round" as const,
  };
  switch (name) {
    case "cart":
      return (
        <svg {...p}>
          <path d="M4 5h2l2 11h11l2-8H7" />
          <circle cx="9" cy="20" r="1.2" />
          <circle cx="18" cy="20" r="1.2" />
        </svg>
      );
    case "home":
      return (
        <svg {...p}>
          <path d="M3 11 12 4l9 7" />
          <path d="M5 10v10h14V10" />
        </svg>
      );
    case "search":
      return (
        <svg {...p}>
          <circle cx="11" cy="11" r="7" />
          <path d="m20 20-3.5-3.5" />
        </svg>
      );
    case "track":
      return (
        <svg {...p}>
          <path d="M3 7h11l3 4h4v6H3z" />
          <circle cx="8" cy="17" r="2" />
          <circle cx="17" cy="17" r="2" />
        </svg>
      );
    case "user":
      return (
        <svg {...p}>
          <circle cx="12" cy="8" r="4" />
          <path d="M4 21c0-4 4-6 8-6s8 2 8 6" />
        </svg>
      );
    case "globe":
      return (
        <svg {...p}>
          <circle cx="12" cy="12" r="9" />
          <path d="M3 12h18M12 3c3 3 3 15 0 18M12 3c-3 3-3 15 0 18" />
        </svg>
      );
    default:
      return null;
  }
}

// ---- OmniFlow Logo -------------------------------------------------------
function OmniFlowLogo({ size = 16 }: { size?: number }) {
  return (
    <span
      style={{
        display: "inline-flex",
        alignItems: "center",
        gap: 7,
        color: "var(--ink)",
      }}
    >
      <svg width={size} height={size} viewBox="0 0 24 24" fill="none">
        <rect
          x="2.5"
          y="2.5"
          width="19"
          height="19"
          rx="3"
          stroke="currentColor"
          strokeWidth="1.4"
        />
        <path
          d="M7 14c1.5 1.5 8.5 1.5 10 0M7 10c1.5-1.5 8.5-1.5 10 0"
          stroke="currentColor"
          strokeWidth="1.4"
          strokeLinecap="round"
        />
      </svg>
      <span
        style={{
          fontWeight: 600,
          letterSpacing: "0.16em",
          fontSize: size * 0.78,
          textTransform: "uppercase",
        }}
      >
        OmniFlow
      </span>
    </span>
  );
}

// ---- Language toggle -------------------------------------------------
function LangToggle() {
  const [lang, setLang] = useState("mn");
  return (
    <div
      style={{
        display: "inline-flex",
        border: "1px solid var(--line)",
        borderRadius: 999,
        padding: 2,
        background: "var(--bg-cream)",
      }}
    >
      {["mn", "en"].map((l) => (
        <button
          key={l}
          onClick={() => setLang(l)}
          style={{
            padding: "3px 10px",
            fontSize: 11,
            letterSpacing: "0.06em",
            borderRadius: 999,
            cursor: "pointer",
            border: 0,
            background: lang === l ? "var(--accent)" : "transparent",
            color: lang === l ? "var(--bg-paper)" : "var(--mute)",
            fontWeight: 500,
            transition: "background 120ms",
            textTransform: "uppercase" as const,
          }}
        >
          {l === "mn" ? "МН" : "EN"}
        </button>
      ))}
    </div>
  );
}

// ---- Top Navbar ------------------------------------------------------
export function Navbar() {
  const { count } = useCart();
  const router = useRouter();
  const [userName, setUserName] = useState<string | null>(null);

  useEffect(() => {
    setUserName(getUser()?.name ?? null);
  }, []);

  function handleLogout() {
    logout();
    setUserName(null);
    router.push("/");
    router.refresh();
  }

  return (
    <>
      {/* Top bar */}
      <header
        style={{
          position: "sticky",
          top: 0,
          zIndex: 100,
          background: "var(--bg-paper)",
          borderBottom: "1px solid var(--line)",
        }}
      >
        <div
          style={{
            maxWidth: "1200px",
            margin: "0 auto",
            padding: "0 20px",
            height: "56px",
            display: "flex",
            alignItems: "center",
            gap: "20px",
          }}
        >
          <Link href="/">
            <OmniFlowLogo size={17} />
          </Link>

          {/* Desktop nav */}
          <nav style={{ display: "flex", gap: "2px", flex: 1 }} className="desktop-nav">
            <NavLink href="/products">Бараа</NavLink>
            <NavLink href="/orders">Захиалга</NavLink>
          </nav>

          {/* Right */}
          <div style={{ display: "flex", alignItems: "center", gap: "10px" }}>
            <LangToggle />

            {/* Cart (desktop) */}
            <Link
              href="/cart"
              aria-label="Сагс"
              style={{
                position: "relative",
                display: "flex",
                alignItems: "center",
                justifyContent: "center",
                width: 36,
                height: 36,
                color: "var(--ink-2)",
                borderRadius: "var(--r-2)",
              }}
              className="desktop-only"
            >
              <Icon name="cart" size={19} />
              {count > 0 && (
                <span
                  style={{
                    position: "absolute",
                    top: 0,
                    right: 0,
                    background: "var(--accent)",
                    color: "var(--bg-paper)",
                    borderRadius: 999,
                    fontSize: 9,
                    fontFamily: "var(--mono)",
                    padding: "1px 5px",
                    lineHeight: 1.4,
                  }}
                >
                  {count > 9 ? "9+" : count}
                </span>
              )}
            </Link>

            {/* Auth */}
            {userName ? (
              <div style={{ display: "flex", alignItems: "center", gap: "8px" }}>
                <Link
                  href="/account"
                  style={{
                    fontSize: 12,
                    color: "var(--mute)",
                    maxWidth: 100,
                    overflow: "hidden",
                    textOverflow: "ellipsis",
                    whiteSpace: "nowrap",
                    textDecoration: "none",
                  }}
                >
                  {userName}
                </Link>
                <button
                  onClick={handleLogout}
                  style={{
                    fontSize: 12,
                    color: "var(--mute)",
                    padding: "5px 10px",
                    borderRadius: "var(--r-2)",
                    border: "1px solid var(--line)",
                    background: "transparent",
                    cursor: "pointer",
                  }}
                >
                  Гарах
                </button>
              </div>
            ) : (
              <Link
                href="/auth"
                style={{
                  display: "flex",
                  alignItems: "center",
                  justifyContent: "center",
                  width: 36,
                  height: 36,
                  color: "var(--ink-2)",
                  borderRadius: "var(--r-2)",
                }}
                aria-label="Нэвтрэх"
              >
                <Icon name="user" size={19} />
              </Link>
            )}
          </div>
        </div>
      </header>

      {/* Mobile bottom tab bar */}
      <BottomNav count={count} isLoggedIn={!!userName} />

      <style>{`
        .desktop-nav { display: flex; }
        .desktop-only { display: flex; }
        @media (max-width: 640px) {
          .desktop-nav { display: none; }
          .desktop-only { display: none; }
        }
      `}</style>
    </>
  );
}

function NavLink({ href, children }: { href: string; children: React.ReactNode }) {
  const pathname = usePathname();
  const active = pathname === href || pathname.startsWith(href + "/");
  return (
    <Link
      href={href}
      style={{
        padding: "6px 12px",
        borderRadius: "var(--r-2)",
        fontSize: 13,
        fontWeight: active ? 600 : 400,
        color: active ? "var(--accent)" : "var(--mute)",
        background: active ? "var(--accent-soft)" : "transparent",
        transition: "background 120ms, color 120ms",
      }}
    >
      {children}
    </Link>
  );
}

function BottomNav({ count, isLoggedIn }: { count: number; isLoggedIn: boolean }) {
  const pathname = usePathname();

  const tabs = [
    { href: "/", label: "Нүүр", icon: "home" },
    { href: "/products", label: "Бараа", icon: "search" },
    { href: "/cart", label: "Сагс", icon: "cart", count },
    { href: "/orders", label: "Захиалга", icon: "track" },
    { href: isLoggedIn ? "/account" : "/auth", label: "Профайл", icon: "user" },
  ];

  return (
    <>
      <nav
        style={{
          position: "fixed",
          bottom: 0,
          left: 0,
          right: 0,
          zIndex: 100,
          background: "var(--bg-paper)",
          borderTop: "1px solid var(--line)",
          display: "grid",
          gridTemplateColumns: "repeat(5, 1fr)",
          paddingBottom: "env(safe-area-inset-bottom, 0px)",
        }}
        className="mobile-bottom-nav"
      >
        {tabs.map((tab) => {
          const active =
            tab.href === "/" ? pathname === "/" : pathname.startsWith(tab.href);
          return (
            <Link
              key={tab.href}
              href={tab.href}
              style={{
                display: "flex",
                flexDirection: "column",
                alignItems: "center",
                gap: 3,
                padding: "10px 4px 8px",
                color: active ? "var(--accent)" : "var(--mute)",
                fontSize: 10,
                letterSpacing: "0.01em",
              }}
            >
              <span style={{ position: "relative", display: "inline-flex" }}>
                <Icon name={tab.icon} size={20} stroke={active ? 1.8 : 1.5} />
                {tab.count && tab.count > 0 ? (
                  <span
                    style={{
                      position: "absolute",
                      top: -4,
                      right: -8,
                      background: "var(--accent)",
                      color: "var(--bg-paper)",
                      borderRadius: 999,
                      fontSize: 9,
                      padding: "1px 5px",
                      fontFamily: "var(--mono)",
                    }}
                  >
                    {tab.count}
                  </span>
                ) : null}
              </span>
              <span>{tab.label}</span>
            </Link>
          );
        })}
      </nav>
      <style>{`
        .mobile-bottom-nav { display: none; }
        @media (max-width: 640px) {
          .mobile-bottom-nav { display: grid; }
          main { padding-bottom: 64px; }
        }
      `}</style>
    </>
  );
}
