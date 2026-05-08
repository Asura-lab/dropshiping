import Link from "next/link";

export default function HomePage() {
  return (
    <div>
      {/* Hero */}
      <section
        style={{
          background: "var(--color-surface)",
          borderBottom: "1px solid var(--color-border)",
          padding: "80px 24px",
          textAlign: "center",
        }}
      >
        <div style={{ maxWidth: "600px", margin: "0 auto" }}>
          <h1
            style={{
              fontSize: "clamp(28px, 5vw, 44px)",
              fontWeight: 700,
              letterSpacing: "-0.04em",
              color: "var(--color-text-primary)",
              lineHeight: 1.2,
              marginBottom: "16px",
            }}
          >
            Гадаадын дэлгүүр,
            <br />
            дотоодын хүргэлт
          </h1>
          <p
            style={{
              fontSize: "16px",
              color: "var(--color-text-secondary)",
              marginBottom: "32px",
            }}
          >
            Amazon, Taobao, Alibaba-с бараагаа монгол хэлтэй нэг цонхоор захиалаарай.
          </p>
          <Link
            href="/products"
            style={{
              display: "inline-block",
              padding: "14px 36px",
              borderRadius: "var(--radius-md)",
              background: "var(--color-accent)",
              color: "#fff",
              fontWeight: 600,
              fontSize: "15px",
              transition: "opacity 0.15s",
            }}
          >
            Бараа үзэх
          </Link>
        </div>
      </section>

      {/* Features */}
      <section
        style={{
          maxWidth: "900px",
          margin: "0 auto",
          padding: "64px 24px",
          display: "grid",
          gridTemplateColumns: "repeat(auto-fit, minmax(200px, 1fr))",
          gap: "32px",
        }}
      >
        {[
          { icon: "🇲🇳", title: "Монгол хэлтэй", desc: "Бүх UI монгол хэлтэй" },
          {
            icon: "💳",
            title: "Тунгалаг үнэ",
            desc: "Гааль + тээвэр захиалгаас өмнө тодорхой",
          },
          { icon: "⚡", title: "Автомат захиалга", desc: "Та зөвхөн сонгоод төлнө" },
          { icon: "📱", title: "SMS мэдэгдэл", desc: "Явц бүрт мэдэгдэл ирнэ" },
        ].map((f) => (
          <div key={f.title} style={{ textAlign: "center" }}>
            <div style={{ fontSize: "32px", marginBottom: "12px" }}>{f.icon}</div>
            <div
              style={{
                fontWeight: 600,
                fontSize: "15px",
                color: "var(--color-text-primary)",
                marginBottom: "6px",
              }}
            >
              {f.title}
            </div>
            <div style={{ fontSize: "13px", color: "var(--color-text-secondary)" }}>
              {f.desc}
            </div>
          </div>
        ))}
      </section>
    </div>
  );
}
