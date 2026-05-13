import type { ReactNode } from "react";
import { generateCssVars } from "@dropshipping/ui";
import AdminShell from "@/components/AdminShell";
import "./globals.css";

export const metadata = {
  title: "OmniFlow Admin",
  description: "OmniFlow удирдлагын систем",
};

export default function RootLayout({ children }: { children: ReactNode }) {
  const cssVars = generateCssVars();

  return (
    <html lang="mn">
      <head>
        {/* CSS variables injected from @dropshipping/ui tokens — single source of truth */}
        <style dangerouslySetInnerHTML={{ __html: cssVars }} />
      </head>
      <body style={{ margin: 0, fontFamily: "var(--sans)" }}>
        <AdminShell>{children}</AdminShell>
      </body>
    </html>
  );
}
