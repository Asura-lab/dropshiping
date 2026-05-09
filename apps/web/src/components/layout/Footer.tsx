export function Footer() {
  return (
    <footer
      style={{
        borderTop: "1px solid var(--line)",
        background: "var(--bg-paper)",
        padding: "24px 20px",
        marginTop: "auto",
      }}
    >
      <div
        style={{
          maxWidth: "1200px",
          margin: "0 auto",
          display: "flex",
          justifyContent: "space-between",
          alignItems: "center",
          gap: 16,
          flexWrap: "wrap",
        }}
      >
        <span style={{ fontSize: 12, color: "var(--mute)", letterSpacing: "0.02em" }}>
          © 2026 SHUUD. Бүх эрх хуулиар хамгаалагдсан.
        </span>
        <span
          style={{
            fontSize: 11,
            color: "var(--mute-2)",
            letterSpacing: "0.06em",
            textTransform: "uppercase",
          }}
        >
          Монгол Улс
        </span>
      </div>
    </footer>
  );
}
