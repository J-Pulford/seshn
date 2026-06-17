import type { CSSProperties } from "react";

const TITLE = "Cracked the secret code, Secret Member unlocked 🔑";

// Cosmetic badge earned by discovering the Konami-code easter egg. `compact`
// renders just the icon (for tight rows like feed cards); the default is a
// small accent pill for profile headers.
export function ProducerBadge({ compact = false, style }: { compact?: boolean; style?: CSSProperties }) {
  if (compact) {
    return (
      <span role="img" aria-label="Secret Member" title={TITLE} style={{ fontSize: 12, lineHeight: 1, cursor: "default", ...style }}>
        🔑
      </span>
    );
  }
  return (
    <span
      role="img"
      aria-label="Secret Member badge"
      title={TITLE}
      style={{
        display: "inline-flex",
        alignItems: "center",
        gap: 5,
        padding: "3px 9px",
        borderRadius: 999,
        background: "var(--accent-bg)",
        color: "var(--accent-d)",
        fontFamily: "var(--font-display)",
        fontWeight: 700,
        fontSize: 11,
        letterSpacing: "0.01em",
        whiteSpace: "nowrap",
        cursor: "default",
        ...style,
      }}
    >
      <span aria-hidden="true">🔑</span> Secret Member
    </span>
  );
}
