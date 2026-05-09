import type { ButtonHTMLAttributes } from "react";
import { forwardRef } from "react";

type Variant = "primary" | "secondary" | "ghost" | "danger";
type Size = "sm" | "md" | "lg";

interface ButtonProps extends ButtonHTMLAttributes<HTMLButtonElement> {
  variant?: Variant;
  size?: Size;
  loading?: boolean;
  fullWidth?: boolean;
}

export const Button = forwardRef<HTMLButtonElement, ButtonProps>(
  (
    {
      variant = "primary",
      size = "md",
      loading = false,
      fullWidth = false,
      disabled,
      children,
      style,
      ...props
    },
    ref
  ) => {
    const isDisabled = disabled || loading;

    const base: React.CSSProperties = {
      display: "inline-flex",
      alignItems: "center",
      justifyContent: "center",
      gap: "8px",
      fontFamily: "var(--font-manrope, var(--sans))",
      fontWeight: 500,
      letterSpacing: "0.01em",
      cursor: isDisabled ? "not-allowed" : "pointer",
      opacity: isDisabled ? 0.45 : 1,
      transition: "background 120ms ease, border-color 120ms ease, opacity 120ms ease",
      border: "1px solid transparent",
      whiteSpace: "nowrap" as const,
      width: fullWidth ? "100%" : undefined,
    };

    const variants: Record<Variant, React.CSSProperties> = {
      primary: {
        background: "var(--accent)",
        color: "var(--bg-paper)",
        borderColor: "transparent",
      },
      secondary: {
        background: "var(--bg-cream)",
        color: "var(--ink)",
        borderColor: "var(--line)",
      },
      ghost: {
        background: "transparent",
        color: "var(--ink-2)",
        borderColor: "transparent",
      },
      danger: {
        background: "transparent",
        color: "var(--accent)",
        borderColor: "var(--accent)",
      },
    };

    const sizes: Record<Size, React.CSSProperties> = {
      sm: { padding: "6px 14px", fontSize: "12px", borderRadius: "var(--r-2)" },
      md: { padding: "10px 18px", fontSize: "13px", borderRadius: "var(--r-2)" },
      lg: { padding: "14px 22px", fontSize: "14px", borderRadius: "var(--r-2)" },
    };

    return (
      <button
        ref={ref}
        disabled={isDisabled}
        style={{ ...base, ...variants[variant], ...sizes[size], ...style }}
        {...props}
      >
        {loading ? (
          <svg
            width="14"
            height="14"
            viewBox="0 0 24 24"
            fill="none"
            stroke="currentColor"
            strokeWidth="2"
            style={{ animation: "spin 0.7s linear infinite" }}
          >
            <path d="M12 2v4M12 18v4M4.93 4.93l2.83 2.83M16.24 16.24l2.83 2.83M2 12h4M18 12h4M4.93 19.07l2.83-2.83M16.24 7.76l2.83-2.83" />
          </svg>
        ) : null}
        {children}
      </button>
    );
  }
);

Button.displayName = "Button";
