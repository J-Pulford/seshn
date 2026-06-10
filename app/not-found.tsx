// Branded 404. Renders inside the root layout, so global tokens + fonts apply.
export default function NotFound() {
  return (
    <div style={{ minHeight: "100vh", display: "flex", flexDirection: "column", alignItems: "center", justifyContent: "center", gap: 14, padding: 24, textAlign: "center", background: "var(--bg)" }}>
      <a href="/" className="logo" style={{ fontSize: 22, marginBottom: 4 }}>Seshn</a>
      <h1 style={{ fontFamily: "var(--font-display)", fontWeight: 700, fontSize: 30, letterSpacing: "-0.02em", color: "var(--ink)" }}>Page not found</h1>
      <p style={{ color: "var(--ink-3)", fontSize: 15, maxWidth: 420, lineHeight: 1.6 }}>
        This page doesn&apos;t exist or may have moved. Let&apos;s get you back to the music.
      </p>
      <div style={{ display: "flex", gap: 10, marginTop: 6 }}>
        <a href="/feed" className="btn primary">Go to feed</a>
        <a href="/" className="btn">Home</a>
      </div>
    </div>
  );
}
