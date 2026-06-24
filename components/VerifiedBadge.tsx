import type { CSSProperties } from "react";

const TITLE = "Verified — this profile has been deeply vetted by Seshn";

// Awarded to profiles that pass Seshn's verification review (profiles.is_verified).
// Distinct from the green "Seshn team" staff badge. `compact` renders just the
// check seal for tight rows.
export function VerifiedBadge({ compact = false, style }: { compact?: boolean; style?: CSSProperties }) {
  const seal = (
    <svg width={compact ? 16 : 15} height={compact ? 16 : 15} viewBox="0 0 24 24" fill="none" aria-hidden="true" style={{ flexShrink: 0 }}>
      <path d="M12 2l2.4 1.8 3 .1 1 2.8 2.4 1.7-.9 2.9.9 2.9-2.4 1.7-1 2.8-3 .1L12 22l-2.4-1.8-3-.1-1-2.8L3.2 15l.9-2.9-.9-2.9 2.4-1.7 1-2.8 3-.1z" fill="var(--bus, #5b8def)" />
      <path d="M8.5 12.2l2.3 2.3 4.7-5" stroke="#fff" strokeWidth="2" fill="none" strokeLinecap="round" strokeLinejoin="round" />
    </svg>
  );
  if (compact) {
    return (
      <span role="img" aria-label="Verified" title={TITLE} style={{ display: "inline-flex", lineHeight: 0, cursor: "default", ...style }}>
        {seal}
      </span>
    );
  }
  return (
    <span
      aria-label="Verified"
      title={TITLE}
      style={{
        display: "inline-flex",
        alignItems: "center",
        gap: 5,
        padding: "3px 9px 3px 6px",
        borderRadius: 999,
        background: "var(--bus-bg, rgba(91,141,239,0.14))",
        color: "var(--bus, #5b8def)",
        fontFamily: "var(--font-display)",
        fontWeight: 700,
        fontSize: 11,
        letterSpacing: "0.01em",
        whiteSpace: "nowrap",
        cursor: "default",
        ...style,
      }}
    >
      {seal} Verified
    </span>
  );
}
