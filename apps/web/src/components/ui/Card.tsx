import type { HTMLAttributes } from "react";

interface CardProps extends HTMLAttributes<HTMLDivElement> {
  padding?: string;
}

export function Card({ children, padding = "20px", style, ...props }: CardProps) {
  return (
    <div
      style={{
        background: "var(--color-surface)",
        borderRadius: "var(--radius-lg)",
        border: "1px solid var(--color-border)",
        padding,
        ...style,
      }}
      {...props}
    >
      {children}
    </div>
  );
}
