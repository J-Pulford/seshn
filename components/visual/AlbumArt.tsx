// Deterministic procedural "album art" — same seed always yields the same
// cover. Ported verbatim from the prototype (auth.html was the canonical copy)
// and deduped from the ~10 pages that each inlined it. Pure + hook-free, so it
// renders in server or client components.
import type { CSSProperties } from "react";

const V_PAL = {
  cream: "#f0e8d6", bone: "#f4f1e9", rust: "#d96e3f", plum: "#5b3858",
  forest: "#2a4d3a", ink: "#0d0d0d", navy: "#1f3a5f", mint: "#a8ebc8",
  lime: "#c4e83a", cherry: "#c43d3f", green: "#2CCB73", deep: "#1C8F56",
  butter: "#f6d36b", fog: "#c9d3d2",
};

const COVER_PALETTES: string[][] = [
  [V_PAL.plum, V_PAL.cream, V_PAL.rust],
  [V_PAL.cream, V_PAL.ink, V_PAL.rust],
  [V_PAL.forest, V_PAL.mint, V_PAL.butter],
  [V_PAL.navy, V_PAL.bone, V_PAL.butter],
  [V_PAL.ink, V_PAL.lime, V_PAL.mint],
  [V_PAL.cherry, V_PAL.cream, V_PAL.ink],
  [V_PAL.bone, V_PAL.plum, V_PAL.rust],
  [V_PAL.rust, V_PAL.cream, V_PAL.ink],
  [V_PAL.green, V_PAL.ink, V_PAL.bone],
  [V_PAL.mint, V_PAL.forest, V_PAL.ink],
];

function _hash(s: string): number {
  let h = 2166136261 >>> 0;
  s = String(s || "x");
  for (let i = 0; i < s.length; i++) {
    h ^= s.charCodeAt(i);
    h = Math.imul(h, 16777619);
  }
  return h >>> 0;
}

function _rng(seed: number): () => number {
  let s = seed >>> 0;
  return () => {
    s = (s + 0x6d2b79f5) >>> 0;
    let t = s;
    t = Math.imul(t ^ (t >>> 15), t | 1);
    t ^= t + Math.imul(t ^ (t >>> 7), t | 61);
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}

export interface AlbumArtProps {
  seed?: string;
  size?: number;
  variant?: number;
  radius?: number;
  style?: CSSProperties;
}

export function AlbumArt({ seed = "track", size = 56, variant, radius = 6, style }: AlbumArtProps) {
  const h = _hash(seed);
  const v = variant != null ? variant : h % 8;
  const pal = COVER_PALETTES[(h >>> 3) % COVER_PALETTES.length];
  const bg = pal[0], fg = pal[1], ac = pal[2];
  const rng = _rng(h);
  const wrap: CSSProperties = {
    width: size, height: size, borderRadius: radius, overflow: "hidden",
    flex: "0 0 auto", display: "inline-block", ...style,
  };

  let inner: React.ReactNode;
  if (v === 0) {
    const cx = 50, cy = 38 + (rng() - 0.5) * 16;
    inner = (
      <svg viewBox="0 0 100 100" width="100%" height="100%">
        <rect width="100" height="100" fill={bg} />
        <circle cx={cx} cy={cy} r={26} fill={ac} />
        <rect x="0" y="68" width="100" height="6" fill={fg} />
        <rect x="0" y="78" width="100" height="2" fill={fg} opacity="0.45" />
      </svg>
    );
  } else if (v === 1) {
    const dots: React.ReactNode[] = [];
    for (let y = 0; y < 10; y++)
      for (let x = 0; x < 10; x++) {
        const d = (x + y) / 18;
        const r = Math.max(0.4, 4.2 * (1 - d) + rng() * 0.4);
        dots.push(<circle key={x + "_" + y} cx={5 + x * 10} cy={5 + y * 10} r={r} fill={fg} />);
      }
    inner = (
      <svg viewBox="0 0 100 100" width="100%" height="100%">
        <rect width="100" height="100" fill={bg} />
        {dots}
      </svg>
    );
  } else if (v === 2) {
    const letter = (seed[0] || "S").toUpperCase();
    inner = (
      <svg viewBox="0 0 100 100" width="100%" height="100%">
        <rect width="100" height="100" fill={bg} />
        <text x="50" y="72" textAnchor="middle" fontFamily="var(--font-display)" fontWeight="700" fontSize="86" letterSpacing="-3" fill={fg}>{letter}</text>
        <rect x="14" y="84" width="72" height="4" fill={ac} />
      </svg>
    );
  } else if (v === 3) {
    const bars: React.ReactNode[] = [];
    for (let i = 0; i < 28; i++) {
      const t = i / 27;
      const env = Math.sin(t * Math.PI) ** 0.6;
      const a = 10 + rng() * 80 * env;
      bars.push(<rect key={i} x={5 + i * 3.4} y={50 - a / 2} width="2" height={a} fill={fg} rx="1" />);
    }
    inner = (
      <svg viewBox="0 0 100 100" width="100%" height="100%">
        <rect width="100" height="100" fill={bg} />
        {bars}
        <rect x="6" y="86" width="40" height="2" fill={ac} />
      </svg>
    );
  } else if (v === 4) {
    inner = (
      <svg viewBox="0 0 100 100" width="100%" height="100%">
        <rect width="100" height="100" fill={bg} />
        <polygon points="0,0 100,0 0,100" fill={fg} />
        <circle cx="50" cy="50" r="18" fill={ac} />
      </svg>
    );
  } else if (v === 5) {
    inner = (
      <svg viewBox="0 0 100 100" width="100%" height="100%">
        <rect width="100" height="100" fill={bg} />
        {[36, 26, 16].map((r, i) => (
          <circle key={i} cx="50" cy="50" r={r} fill="none" stroke={fg} strokeWidth={i === 1 ? 2 : 1.2} opacity={0.85 - i * 0.1} />
        ))}
        <circle cx={50 + 36 * Math.cos(((h >>> 5) % 360) * Math.PI / 180)} cy={50 + 36 * Math.sin(((h >>> 5) % 360) * Math.PI / 180)} r="5" fill={ac} />
      </svg>
    );
  } else if (v === 6) {
    inner = (
      <svg viewBox="0 0 100 100" width="100%" height="100%">
        <rect width="100" height="100" fill={bg} />
        <rect x="18" y="22" width="58" height="58" fill={ac} />
        <rect x="26" y="30" width="58" height="58" fill={fg} opacity="0.85" />
        <rect x="34" y="38" width="58" height="58" fill={ac} opacity="0.6" />
      </svg>
    );
  } else {
    inner = (
      <svg viewBox="0 0 100 100" width="100%" height="100%">
        <rect width="100" height="100" fill={bg} />
        <rect y="55" width="100" height="45" fill={fg} />
        <circle cx="50" cy="55" r="20" fill={ac} />
        <rect x="0" y="55" width="100" height="1.5" fill={ac} opacity="0.4" />
      </svg>
    );
  }

  return <div style={wrap} aria-hidden="true">{inner}</div>;
}
