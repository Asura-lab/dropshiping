import Link from "next/link";

export default function HomePage() {
  return (
    <div style={{ background: "var(--bg-paper)" }}>
      {/* Hero */}
      <section
        style={{
          margin: "20px 18px",
          padding: "28px 24px 26px",
          background: "var(--accent-soft)",
          borderRadius: "var(--r-3)",
          position: "relative",
          overflow: "hidden",
          maxWidth: "720px",
          marginLeft: "auto",
          marginRight: "auto",
        }}
      >
        {/* Decorative concentric circles */}
        <div
          style={{
            position: "absolute",
            top: -50,
            right: -40,
            opacity: 0.45,
            color: "var(--accent-mid)",
            pointerEvents: "none",
          }}
        >
          <svg width="200" height="200" viewBox="0 0 200 200" fill="none">
            <circle cx="100" cy="100" r="85" stroke="currentColor" strokeWidth="0.7" />
            <circle cx="100" cy="100" r="65" stroke="currentColor" strokeWidth="0.7" />
            <circle cx="100" cy="100" r="45" stroke="currentColor" strokeWidth="0.7" />
            <circle cx="100" cy="100" r="25" stroke="currentColor" strokeWidth="0.7" />
          </svg>
        </div>

        <div style={{ position: "relative" }}>
          <div className="eyebrow" style={{ color: "var(--accent)", marginBottom: 10 }}>
            Хятадаас Монголд шууд
          </div>
          <h1
            style={{
              fontSize: "clamp(24px, 5vw, 34px)",
              fontWeight: 600,
              lineHeight: 1.15,
              color: "var(--accent)",
              letterSpacing: "-0.02em",
              marginBottom: 10,
              maxWidth: 300,
            }}
          >
            Сонго. Авч ир. Хүлээн ав.
          </h1>
          <p
            style={{
              fontSize: 13,
              color: "var(--ink-2)",
              lineHeight: 1.55,
              marginBottom: 20,
              maxWidth: 320,
            }}
          >
            Худалдаачинтай яриа, гааль, эцсийн хүргэлт — бид хариуцна. Та зөвхөн сонгоно.
          </p>
          <div style={{ display: "flex", gap: 10, flexWrap: "wrap" }}>
            <Link
              href="/products"
              style={{
                display: "inline-flex",
                alignItems: "center",
                justifyContent: "center",
                padding: "11px 20px",
                borderRadius: "var(--r-2)",
                background: "var(--accent)",
                color: "var(--bg-paper)",
                fontSize: 13,
                fontWeight: 500,
                letterSpacing: "0.01em",
              }}
            >
              Дэлгүүр хэсэх
            </Link>
            <button
              style={{
                display: "inline-flex",
                alignItems: "center",
                gap: 4,
                padding: "11px 16px",
                borderRadius: "var(--r-2)",
                background: "transparent",
                color: "var(--accent)",
                fontSize: 13,
                fontWeight: 500,
                cursor: "pointer",
              }}
            >
              Хэрхэн ажилладаг вэ →
            </button>
          </div>
        </div>
      </section>

      {/* How it works */}
      <section style={{ padding: "0 18px 28px", maxWidth: "756px", margin: "0 auto" }}>
        <div className="eyebrow" style={{ marginBottom: 12 }}>
          Хэрхэн ажилладаг
        </div>
        <div style={{ display: "grid", gridTemplateColumns: "repeat(3, 1fr)", gap: 10 }}>
          {[
            {
              title: "1. Сонго",
              desc: "Taobao, Alibaba, Amazon-оос ₮ рүү хөрвүүлсэн үнээр.",
            },
            {
              title: "2. Төл",
              desc: "Гааль, тээвэр, эцсийн хүргэлт бүгд нэг үнэд багтсан.",
            },
            { title: "3. Хүлээн ав", desc: "8–20 өдөр. Цэгээс авах эсвэл гэрт хүргэх." },
          ].map((s) => (
            <div
              key={s.title}
              style={{
                padding: "14px",
                borderRadius: "var(--r-2)",
                background: "var(--bg-cream)",
                border: "1px solid var(--line)",
              }}
            >
              <div
                style={{
                  fontSize: 12,
                  fontWeight: 600,
                  color: "var(--accent)",
                  marginBottom: 6,
                }}
              >
                {s.title}
              </div>
              <div style={{ fontSize: 11, color: "var(--mute)", lineHeight: 1.45 }}>
                {s.desc}
              </div>
            </div>
          ))}
        </div>
      </section>

      {/* Platform badges */}
      <section style={{ padding: "0 18px 32px", maxWidth: "756px", margin: "0 auto" }}>
        <div className="eyebrow" style={{ marginBottom: 14 }}>
          Дэмжих платформ
        </div>
        <div style={{ display: "flex", gap: 10, flexWrap: "wrap" }}>
          {[
            { label: "Taobao", bg: "#FBEAE0", desc: "Хамгийн том Хятадын зах зээл" },
            { label: "Alibaba", bg: "#F2EBD6", desc: "Бөөний болон жижиглэнгийн" },
            { label: "Amazon", bg: "#E4E7EA", desc: "Дэлхийн тэргүүлэгч e-commerce" },
          ].map((p) => (
            <div
              key={p.label}
              style={{
                display: "flex",
                alignItems: "center",
                gap: 10,
                padding: "12px 16px",
                background: p.bg,
                borderRadius: "var(--r-2)",
                flex: "1 1 160px",
              }}
            >
              <div>
                <div
                  style={{
                    fontSize: 13,
                    fontWeight: 600,
                    color: "var(--ink)",
                    marginBottom: 2,
                  }}
                >
                  {p.label}
                </div>
                <div style={{ fontSize: 11, color: "var(--mute)" }}>{p.desc}</div>
              </div>
            </div>
          ))}
        </div>
      </section>

      {/* CTA */}
      <section
        style={{
          margin: "0 18px 40px",
          padding: "28px 24px",
          background: "var(--bg-cream)",
          borderRadius: "var(--r-3)",
          border: "1px solid var(--line)",
          textAlign: "center",
          maxWidth: "720px",
          marginLeft: "auto",
          marginRight: "auto",
        }}
      >
        <div style={{ fontSize: 18, fontWeight: 600, marginBottom: 8 }}>
          Анхны захиалгаа хийхэд бэлэн үү?
        </div>
        <p style={{ fontSize: 13, color: "var(--mute)", marginBottom: 20 }}>
          Утасны дугаараар нэвтэрч, OTP-р баталгаажуул.
        </p>
        <Link
          href="/auth"
          style={{
            display: "inline-flex",
            alignItems: "center",
            justifyContent: "center",
            padding: "12px 28px",
            borderRadius: "var(--r-2)",
            background: "var(--accent)",
            color: "var(--bg-paper)",
            fontSize: 14,
            fontWeight: 500,
          }}
        >
          Нэвтрэх / Бүртгүүлэх
        </Link>
      </section>
    </div>
  );
}
