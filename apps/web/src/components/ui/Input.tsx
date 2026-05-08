import type { InputHTMLAttributes } from "react";
import { forwardRef } from "react";

interface InputProps extends InputHTMLAttributes<HTMLInputElement> {
  label?: string;
  error?: string;
  hint?: string;
}

export const Input = forwardRef<HTMLInputElement, InputProps>(
  ({ label, error, hint, id, style, ...props }, ref) => {
    const inputId = id ?? label?.toLowerCase().replace(/\s+/g, "-");

    return (
      <div style={{ display: "flex", flexDirection: "column", gap: "6px" }}>
        {label && (
          <label
            htmlFor={inputId}
            style={{
              fontSize: "13px",
              fontWeight: 500,
              color: "var(--color-text-secondary)",
            }}
          >
            {label}
          </label>
        )}
        <input
          ref={ref}
          id={inputId}
          style={{
            padding: "10px 14px",
            borderRadius: "var(--radius-md)",
            border: `1.5px solid ${error ? "var(--color-error)" : "var(--color-border)"}`,
            background: "var(--color-surface)",
            color: "var(--color-text-primary)",
            fontSize: "14px",
            outline: "none",
            transition: "border-color 0.15s",
            width: "100%",
            ...style,
          }}
          {...props}
        />
        {error && (
          <span style={{ fontSize: "12px", color: "var(--color-error)" }} role="alert">
            {error}
          </span>
        )}
        {hint && !error && (
          <span style={{ fontSize: "12px", color: "var(--color-text-hint)" }}>
            {hint}
          </span>
        )}
      </div>
    );
  }
);

Input.displayName = "Input";
