import type { Metadata } from "next";
import { Navbar } from "@/components/layout";
import { Footer } from "@/components/layout";
import { ToastProvider } from "@/components/ui";
import "./globals.css";

export const metadata: Metadata = {
  title: "Дэлгүүр — Гадаадын бараа, дотоодын хүргэлт",
  description:
    "Amazon, Taobao, Alibaba-с бараагаа монгол хэлтэй нэг цонхоор захиалаарай.",
};

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="mn">
      <body
        style={{
          minHeight: "100vh",
          display: "flex",
          flexDirection: "column",
        }}
      >
        <ToastProvider>
          <Navbar />
          <main style={{ flex: 1 }}>{children}</main>
          <Footer />
        </ToastProvider>
      </body>
    </html>
  );
}
