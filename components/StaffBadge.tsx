import type { CSSProperties } from "react";

const TITLE = "Official Seshn team member";

// Official-staff badge shown on the profiles of Seshn team members (anyone with
// profiles.is_staff = true). Matches the "Seshn team" wording used on help-board
// replies. `compact` renders just the checkmark for tight rows.
export function StaffBadge({ compact = false, style }: { compact?: boolean; style?: CSSProperties }) {
  if (compact) {
    return (
      <span role="img" aria-label="Seshn team" title={TITLE} style={{ fontSize: 12, lineHeight: 1, color: "var(--accent-d)", cursor: "default", ...style }}>
        ✓
      </span>
    );
  }
  return (
    <span
      aria-label="Seshn team"
      title={TITLE}
      style={{
        display: "inline-flex",
        alignItems: "center",
        gap: 5,
        padding: "3px 9px",
        borderRadius: 999,
        background: "var(--accent)",
        color: "var(--frame, #fff)",
        fontFamily: "var(--font-display)",
        fontWeight: 700,
        fontSize: 11,
        letterSpacing: "0.01em",
        whiteSpace: "nowrap",
        cursor: "default",
        ...style,
      }}
    >
      <span aria-hidden="true">✓</span> Seshn team
    </span>
  );
}
