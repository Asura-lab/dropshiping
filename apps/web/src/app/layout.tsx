import type { Metadata } from "next";
import { Manrope, JetBrains_Mono } from "next/font/google";
import { Navbar } from "@/components/layout";
import { Footer } from "@/components/layout";
import { ToastProvider } from "@/components/ui";
import { CartProvider } from "@/lib/cart-context";
import "./globals.css";

const manrope = Manrope({
  subsets: ["latin", "cyrillic"],
  weight: ["300", "400", "500", "600", "700"],
  variable: "--font-manrope",
  display: "swap",
});

const jetbrainsMono = JetBrains_Mono({
  subsets: ["latin"],
  weight: ["300", "400", "500"],
  variable: "--font-mono",
  display: "swap",
});

export const metadata: Metadata = {
  title: "OmniFlow — Хятадаас Монголд шууд",
  description:
    "Amazon, Taobao, Alibaba-с бараагаа монгол хэлтэй нэг цонхоор захиалаарай.",
};

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="mn" className={`${manrope.variable} ${jetbrainsMono.variable}`}>
      <body style={{ fontFamily: "var(--font-manrope, var(--sans))" }}>
        <CartProvider>
          <ToastProvider>
            <div style={{ minHeight: "100vh", display: "flex", flexDirection: "column" }}>
              <Navbar />
              <main style={{ flex: 1 }}>{children}</main>
              <Footer />
            </div>
          </ToastProvider>
        </CartProvider>
      </body>
    </html>
  );
}
