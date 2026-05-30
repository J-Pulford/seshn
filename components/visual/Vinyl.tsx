import type { CSSProperties } from "react";

export interface VinylProps {
  size?: number;
  color?: string;
  label?: string;
  style?: CSSProperties;
}

// Spinning-record motif. Ported verbatim from the prototype.
export function Vinyl({ size = 44, color = "var(--ink)", label = "var(--accent)", style }: VinylProps) {
  return (
    <svg viewBox="0 0 100 100" width={size} height={size} style={{ display: "block", ...style }}>
      <circle cx="50" cy="50" r="48" fill={color} />
      <circle cx="50" cy="50" r="36" fill="none" stroke="rgba(255,255,255,0.1)" strokeWidth="0.5" />
      <circle cx="50" cy="50" r="28" fill="none" stroke="rgba(255,255,255,0.08)" strokeWidth="0.5" />
      <circle cx="50" cy="50" r="20" fill="none" stroke="rgba(255,255,255,0.06)" strokeWidth="0.5" />
      <circle cx="50" cy="50" r="14" fill={label} />
      <circle cx="50" cy="50" r="2" fill={color} />
    </svg>
  );
}
