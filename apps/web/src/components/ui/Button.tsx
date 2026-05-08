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

const styles: Record<Variant, string> = {
  primary: `
    background: var(--color-accent);
    color: #fff;
    border: 1.5px solid transparent;
  `,
  secondary: `
    background: var(--color-surface);
    color: var(--color-text-primary);
    border: 1.5px solid var(--color-border);
  `,
  ghost: `
    background: transparent;
    color: var(--color-text-primary);
    border: 1.5px solid transparent;
  `,
  danger: `
    background: transparent;
    color: var(--color-error);
    border: 1.5px solid var(--color-error);
  `,
};

const sizes: Record<Size, string> = {
  sm: "padding: 6px 14px; font-size: 13px; border-radius: var(--radius-sm);",
  md: "padding: 10px 20px; font-size: 14px; border-radius: var(--radius-md);",
  lg: "padding: 14px 28px; font-size: 15px; border-radius: var(--radius-md);",
};

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

    return (
      <button
        ref={ref}
        disabled={isDisabled}
        style={{
          display: "inline-flex",
          alignItems: "center",
          justifyContent: "center",
          gap: "8px",
          fontWeight: 500,
          transition: "opacity 0.15s, background 0.15s",
          opacity: isDisabled ? 0.5 : 1,
          cursor: isDisabled ? "not-allowed" : "pointer",
          width: fullWidth ? "100%" : undefined,
          ...parseInlineStyle(styles[variant]),
          ...parseInlineStyle(sizes[size]),
          ...style,
        }}
        {...props}
      >
        {loading ? <span className="spinner" aria-hidden /> : null}
        {children}
      </button>
    );
  }
);

Button.displayName = "Button";

function parseInlineStyle(cssText: string): React.CSSProperties {
  const result: Record<string, string> = {};
  cssText
    .split(";")
    .map((s) => s.trim())
    .filter(Boolean)
    .forEach((declaration) => {
      const [prop, ...rest] = declaration.split(":");
      if (prop && rest.length) {
        const camel = prop.trim().replace(/-([a-z])/g, (_, c: string) => c.toUpperCase());
        result[camel] = rest.join(":").trim();
      }
    });
  return result as React.CSSProperties;
}
