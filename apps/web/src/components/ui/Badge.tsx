import type { HTMLAttributes } from "react";

type BadgeVariant = "default" | "success" | "warning" | "error" | "accent";

interface BadgeProps extends HTMLAttributes<HTMLSpanElement> {
  variant?: BadgeVariant;
}

const badgeColors: Record<BadgeVariant, { bg: string; text: string }> = {
  default: { bg: "var(--color-surface-2)", text: "var(--color-text-secondary)" },
  success: { bg: "#dcfce7", text: "var(--color-success)" },
  warning: { bg: "var(--color-warning-bg)", text: "var(--color-warning)" },
  error: { bg: "var(--color-accent-light)", text: "var(--color-error)" },
  accent: { bg: "var(--color-accent-light)", text: "var(--color-accent)" },
};

export function Badge({ variant = "default", children, style, ...props }: BadgeProps) {
  const colors = badgeColors[variant];
  return (
    <span
      style={{
        display: "inline-flex",
        alignItems: "center",
        gap: "4px",
        padding: "2px 10px",
        borderRadius: "999px",
        fontSize: "11px",
        fontWeight: 600,
        letterSpacing: "0.02em",
        background: colors.bg,
        color: colors.text,
        ...style,
      }}
      {...props}
    >
      {children}
    </span>
  );
}
