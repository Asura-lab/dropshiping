export function Footer() {
  return (
    <footer
      style={{
        borderTop: "1px solid var(--color-border)",
        background: "var(--color-surface)",
        padding: "32px 24px",
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
          fontSize: "13px",
          color: "var(--color-text-hint)",
        }}
      >
        <span>© 2026 Дэлгүүр. Бүх эрх хуулиар хамгаалагдсан.</span>
        <span>Монгол Улс</span>
      </div>
    </footer>
  );
}
