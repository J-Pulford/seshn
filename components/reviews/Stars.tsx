"use client";

import { useState } from "react";

// Read-only star display with partial fill (e.g. 4.6 of 5).
export function Stars({ value, size = 16 }: { value: number; size?: number }) {
  const pct = Math.max(0, Math.min(100, (value / 5) * 100));
  return (
    <span
      role="img"
      aria-label={`${value.toFixed(1)} out of 5 stars`}
      style={{ position: "relative", display: "inline-block", fontSize: size, lineHeight: 1, letterSpacing: "1px", fontFamily: "Arial, sans-serif" }}
    >
      <span style={{ color: "var(--line)" }}>★★★★★</span>
      <span style={{ position: "absolute", left: 0, top: 0, width: `${pct}%`, overflow: "hidden", color: "#f5a623", whiteSpace: "nowrap" }}>★★★★★</span>
    </span>
  );
}

// Interactive 1–5 picker.
export function StarRatingInput({ value, onChange, size = 28 }: { value: number; onChange: (v: number) => void; size?: number }) {
  const [hover, setHover] = useState(0);
  const shown = hover || value;
  return (
    <span style={{ display: "inline-flex", gap: 4 }} role="radiogroup" aria-label="Star rating">
      {[1, 2, 3, 4, 5].map((n) => (
        <button
          key={n}
          type="button"
          role="radio"
          aria-checked={value === n}
          aria-label={`${n} star${n > 1 ? "s" : ""}`}
          onMouseEnter={() => setHover(n)}
          onMouseLeave={() => setHover(0)}
          onClick={() => onChange(n)}
          style={{ background: "none", border: "none", cursor: "pointer", padding: 0, fontSize: size, lineHeight: 1, color: n <= shown ? "#f5a623" : "var(--line)", transition: "color .1s" }}
        >
          ★
        </button>
      ))}
    </span>
  );
}
