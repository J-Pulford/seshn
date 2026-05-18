// Seshn — visuals: procedural album covers, real waveforms, instrument illustrations,
// sticker badges, marquee, vinyl, cassette, grain texture, cover headers.

// ──────────────────────────────────────────────────────────────
// Palette — editorial accents that complement the brand greens.
// Cover-art swatches and decorative backgrounds.
const V_PAL = {
  cream:   "#f0e8d6",
  bone:    "#f4f1e9",
  rust:    "#d96e3f",
  plum:    "#5b3858",
  forest:  "#2a4d3a",
  ink:     "#0d0d0d",
  navy:    "#1f3a5f",
  mint:    "#a8ebc8",
  lime:    "#c4e83a",
  cherry:  "#c43d3f",
  green:   "#2CCB73",
  deep:    "#1C8F56",
  butter:  "#f6d36b",
  fog:     "#c9d3d2",
};

// Curated cover-art palettes (bg, fg, accent) — chosen for harmony.
const COVER_PALETTES = [
  [V_PAL.plum,   V_PAL.cream,  V_PAL.rust],
  [V_PAL.cream,  V_PAL.ink,    V_PAL.rust],
  [V_PAL.forest, V_PAL.mint,   V_PAL.butter],
  [V_PAL.navy,   V_PAL.bone,   V_PAL.butter],
  [V_PAL.ink,    V_PAL.lime,   V_PAL.mint],
  [V_PAL.cherry, V_PAL.cream,  V_PAL.ink],
  [V_PAL.bone,   V_PAL.plum,   V_PAL.rust],
  [V_PAL.rust,   V_PAL.cream,  V_PAL.ink],
  [V_PAL.green,  V_PAL.ink,    V_PAL.bone],
  [V_PAL.mint,   V_PAL.forest, V_PAL.ink],
];

// Deterministic hash → 32-bit
function _hash(s) {
  let h = 2166136261 >>> 0;
  s = String(s || "x");
  for (let i = 0; i < s.length; i++) {
    h ^= s.charCodeAt(i);
    h = Math.imul(h, 16777619);
  }
  return h >>> 0;
}
function _rng(seed) {
  let s = seed >>> 0;
  return () => {
    s = (s + 0x6D2B79F5) >>> 0;
    let t = s;
    t = Math.imul(t ^ (t >>> 15), t | 1);
    t ^= t + Math.imul(t ^ (t >>> 7), t | 61);
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}

// ──────────────────────────────────────────────────────────────
// AlbumArt — procedural SVG cover art seeded by `seed` (title string).
// Variants: 0 sun-disc · 1 halftone · 2 big-initial · 3 waveform-poster
//           4 sliced · 5 orbit · 6 stack · 7 horizon
const AlbumArt = ({ seed = "track", size = 56, variant, radius = 6, style, initial }) => {
  const h = _hash(seed);
  const v = variant != null ? variant : h % 8;
  const pal = COVER_PALETTES[((h >>> 3) % COVER_PALETTES.length)];
  const bg = pal[0], fg = pal[1], ac = pal[2];
  const rng = _rng(h);

  const wrap = {
    width: size, height: size,
    borderRadius: radius,
    overflow: "hidden",
    flex: "0 0 auto",
    display: "inline-block",
    ...style,
  };

  let inner;
  if (v === 0) {
    // Sun disc + horizon line
    const cx = 50, cy = 38 + (rng() - 0.5) * 16;
    inner = (
      <svg viewBox="0 0 100 100" style={{ display: "block" }} width="100%" height="100%">
        <rect width="100" height="100" fill={bg} />
        <circle cx={cx} cy={cy} r={26} fill={ac} />
        <rect x="0" y="68" width="100" height="6" fill={fg} />
        <rect x="0" y="78" width="100" height="2" fill={fg} opacity="0.45" />
      </svg>
    );
  } else if (v === 1) {
    // Halftone gradient — dots fade across diagonal
    const dots = [];
    for (let y = 0; y < 10; y++)
      for (let x = 0; x < 10; x++) {
        const d = (x + y) / 18; // 0..1
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
    // Big initial — display letter
    const letter = (initial || seed[0] || "S").toUpperCase();
    inner = (
      <svg viewBox="0 0 100 100" width="100%" height="100%">
        <rect width="100" height="100" fill={bg} />
        <text x="50" y="72" textAnchor="middle"
          fontFamily="var(--font-display)" fontWeight="700" fontSize="86"
          letterSpacing="-3" fill={fg}>{letter}</text>
        <rect x="14" y="84" width="72" height="4" fill={ac} />
      </svg>
    );
  } else if (v === 3) {
    // Waveform poster
    const bars = [];
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
    // Sliced diagonal half + circle on the seam
    inner = (
      <svg viewBox="0 0 100 100" width="100%" height="100%">
        <rect width="100" height="100" fill={bg} />
        <polygon points="0,0 100,0 0,100" fill={fg} />
        <circle cx="50" cy="50" r="18" fill={ac} />
      </svg>
    );
  } else if (v === 5) {
    // Orbit — concentric rings + offset dot
    inner = (
      <svg viewBox="0 0 100 100" width="100%" height="100%">
        <rect width="100" height="100" fill={bg} />
        {[36, 26, 16].map((r, i) => (
          <circle key={i} cx="50" cy="50" r={r} fill="none" stroke={fg} strokeWidth={i === 1 ? 2 : 1.2} opacity={0.85 - i * 0.1} />
        ))}
        <circle cx={50 + 36 * Math.cos(((h >>> 5) % 360) * Math.PI / 180)}
                cy={50 + 36 * Math.sin(((h >>> 5) % 360) * Math.PI / 180)} r="5" fill={ac} />
      </svg>
    );
  } else if (v === 6) {
    // Stack — three offset blocks like overlapping LPs
    inner = (
      <svg viewBox="0 0 100 100" width="100%" height="100%">
        <rect width="100" height="100" fill={bg} />
        <rect x="18" y="22" width="58" height="58" fill={ac} />
        <rect x="26" y="30" width="58" height="58" fill={fg} opacity="0.85" />
        <rect x="34" y="38" width="58" height="58" fill={ac} opacity="0.6" />
      </svg>
    );
  } else {
    // 7 — Horizon — sky/land split with sun
    inner = (
      <svg viewBox="0 0 100 100" width="100%" height="100%">
        <rect width="100" height="55" fill={bg} />
        <rect y="55" width="100" height="45" fill={fg} />
        <circle cx="50" cy="55" r="20" fill={ac} />
        <rect x="0" y="55" width="100" height="1.5" fill={ac} opacity="0.4" />
      </svg>
    );
  }

  return <div style={wrap} aria-hidden="true">{inner}</div>;
};

// ──────────────────────────────────────────────────────────────
// Waveform — SVG waveform with optional playhead progress.
const Waveform = ({ seed = "wf", height = 28, bars = 56, progress = 0.32, color, played, compact, style }) => {
  const h = _hash(seed);
  const rng = _rng(h);
  const arr = [];
  for (let i = 0; i < bars; i++) {
    const t = i / (bars - 1);
    // gentle envelope so it looks musical, not random
    const env = 0.35 + 0.65 * (Math.sin(t * Math.PI) ** 0.6);
    const a = (0.18 + 0.82 * rng()) * env;
    arr.push(a);
  }
  const W = bars * (compact ? 2.4 : 3);
  const gap = compact ? 1 : 1.2;
  const bw = (W / bars) - gap;
  const playedColor = played || "var(--ink)";
  const restColor = color || "rgba(0,0,0,0.22)";
  return (
    <svg viewBox={`0 0 ${W} ${height}`} preserveAspectRatio="none"
      width="100%" height={height} style={{ display: "block", ...style }}>
      {arr.map((a, i) => {
        const x = i * (W / bars);
        const bh = Math.max(2, a * height);
        const y = (height - bh) / 2;
        const isPlayed = (i / bars) < progress;
        return <rect key={i} x={x} y={y} width={bw} height={bh}
          fill={isPlayed ? playedColor : restColor} rx={bw / 2} />;
      })}
    </svg>
  );
};

// ──────────────────────────────────────────────────────────────
// Marquee — horizontal scrolling ticker
const Marquee = ({ items = [], speed = 60, sep = "✶", style, dark }) => {
  // duplicate items so the loop seam is invisible
  const doubled = [...items, ...items];
  return (
    <div style={{
      overflow: "hidden",
      borderTop: "1px solid var(--line)",
      borderBottom: "1px solid var(--line)",
      background: dark ? "var(--ink-black)" : "var(--surface)",
      color: dark ? "var(--frame)" : "var(--ink)",
      ...style,
    }}>
      <div style={{
        display: "flex",
        whiteSpace: "nowrap",
        animation: `seshn-marquee ${speed}s linear infinite`,
        willChange: "transform",
      }}>
        {doubled.map((it, i) => (
          <div key={i} style={{
            display: "inline-flex", alignItems: "center", gap: 14,
            padding: "10px 22px",
            fontFamily: "var(--font-display)", fontSize: 13, fontWeight: 500, letterSpacing: "-0.005em",
          }}>
            <span>{it}</span>
            <span style={{ color: dark ? "var(--accent)" : "var(--accent-d)", fontSize: 11 }}>{sep}</span>
          </div>
        ))}
      </div>
    </div>
  );
};

// ──────────────────────────────────────────────────────────────
// Sticker — small rotated badge, hand-placed feel
const Sticker = ({ children, rot = -4, color = "accent", style, size = "md" }) => {
  const colors = {
    accent: { bg: "var(--accent)", fg: "#062c19" },
    ink:    { bg: "var(--ink)", fg: "var(--frame)" },
    cream:  { bg: V_PAL.cream, fg: "var(--ink)" },
    rust:   { bg: V_PAL.rust, fg: "var(--bone)" },
  };
  const c = colors[color] || colors.accent;
  const pad = size === "sm" ? "4px 10px" : "6px 12px";
  return (
    <span style={{
      display: "inline-block",
      transform: `rotate(${rot}deg)`,
      padding: pad,
      borderRadius: 4,
      background: c.bg,
      color: c.fg,
      fontFamily: "var(--font-display)", fontWeight: 700,
      fontSize: size === "sm" ? 10 : 12,
      letterSpacing: "0.04em",
      textTransform: "uppercase",
      boxShadow: "0 6px 14px rgba(0,0,0,0.15), 0 1px 0 rgba(0,0,0,0.08)",
      ...style,
    }}>{children}</span>
  );
};

// ──────────────────────────────────────────────────────────────
// Vinyl — decorative SVG
const Vinyl = ({ size = 44, color = "var(--ink)", label = "var(--accent)", style }) => (
  <svg viewBox="0 0 100 100" width={size} height={size} style={{ display: "block", ...style }}>
    <circle cx="50" cy="50" r="48" fill={color} />
    <circle cx="50" cy="50" r="36" fill="none" stroke="rgba(255,255,255,0.1)" strokeWidth="0.5" />
    <circle cx="50" cy="50" r="28" fill="none" stroke="rgba(255,255,255,0.08)" strokeWidth="0.5" />
    <circle cx="50" cy="50" r="20" fill="none" stroke="rgba(255,255,255,0.06)" strokeWidth="0.5" />
    <circle cx="50" cy="50" r="14" fill={label} />
    <circle cx="50" cy="50" r="2" fill={color} />
  </svg>
);

// ──────────────────────────────────────────────────────────────
// Cassette — decorative SVG
const Cassette = ({ size = 60, color = V_PAL.cream, accent = V_PAL.plum, style }) => (
  <svg viewBox="0 0 120 80" width={size} height={size * (80 / 120)} style={{ display: "block", ...style }}>
    <rect x="2" y="2" width="116" height="76" rx="6" fill={color} stroke={accent} strokeWidth="2" />
    <rect x="10" y="34" width="100" height="22" rx="2" fill={accent} />
    <circle cx="36" cy="45" r="7" fill={color} />
    <circle cx="84" cy="45" r="7" fill={color} />
    <circle cx="36" cy="45" r="2.5" fill={accent} />
    <circle cx="84" cy="45" r="2.5" fill={accent} />
    <rect x="20" y="14" width="80" height="14" rx="2" fill={color} stroke={accent} strokeWidth="1" />
    <rect x="24" y="18" width="38" height="2" fill={accent} opacity="0.6" />
    <rect x="24" y="22" width="50" height="2" fill={accent} opacity="0.3" />
    <rect x="14" y="62" width="92" height="2" fill={accent} opacity="0.4" />
  </svg>
);

// ──────────────────────────────────────────────────────────────
// Polaroid — small rotated photo card
const Polaroid = ({ rot = -3, caption = "studio · tues", size = 80, seed = "p", style }) => (
  <div style={{
    transform: `rotate(${rot}deg)`,
    background: "var(--frame)",
    padding: 6,
    paddingBottom: 18,
    boxShadow: "0 8px 22px rgba(0,0,0,0.18)",
    display: "inline-block",
    position: "relative",
    ...style,
  }}>
    <AlbumArt seed={seed} size={size} radius={0} />
    <div style={{
      position: "absolute", bottom: 4, left: 6, right: 6,
      fontFamily: "var(--font-display)", fontSize: 9,
      color: "var(--ink-3)", textAlign: "center",
    }}>{caption}</div>
  </div>
);

// ──────────────────────────────────────────────────────────────
// CoverHeader — banner for profile / project (abstract shapes + grain)
const CoverHeader = ({ height = 130, seed = "cover", style }) => {
  const h = _hash(seed);
  const pal = COVER_PALETTES[h % COVER_PALETTES.length];
  const bg = pal[0], fg = pal[1], ac = pal[2];
  return (
    <div style={{ height, position: "relative", overflow: "hidden", background: bg, ...style }}>
      <svg viewBox="0 0 400 130" width="100%" height="100%" preserveAspectRatio="xMidYMid slice" style={{ position: "absolute", inset: 0 }}>
        <circle cx="80" cy="60" r="64" fill={ac} />
        <circle cx="320" cy="80" r="44" fill={fg} opacity="0.85" />
        <rect x="0" y="100" width="400" height="6" fill={fg} />
        {/* Halftone trail */}
        {Array.from({ length: 14 }).map((_, i) => (
          <circle key={i} cx={200 + i * 13} cy={40} r={5 - i * 0.3} fill={fg} opacity={0.6 - i * 0.04} />
        ))}
      </svg>
      <Grain />
    </div>
  );
};

// ──────────────────────────────────────────────────────────────
// Grain — film-grain overlay (SVG noise data URL)
const NOISE_SVG = `<svg xmlns='http://www.w3.org/2000/svg' width='180' height='180'><filter id='n'><feTurbulence type='fractalNoise' baseFrequency='1.4' numOctaves='2' stitchTiles='stitch'/><feColorMatrix values='0 0 0 0 0 0 0 0 0 0 0 0 0 0 0 0 0 0 0.45 0'/></filter><rect width='100%25' height='100%25' filter='url(%23n)'/></svg>`;
const GRAIN_URL = `url("data:image/svg+xml;utf8,${NOISE_SVG}")`;
const Grain = ({ opacity = 0.22, blend = "overlay", style }) => (
  <div style={{
    position: "absolute", inset: 0,
    backgroundImage: GRAIN_URL,
    opacity,
    mixBlendMode: blend,
    pointerEvents: "none",
    ...style,
  }} />
);

// ──────────────────────────────────────────────────────────────
// Instrument illustrations — used for empty states & decoration.
// Hand-drawn-feeling line work, single-color.
const Illo = ({ kind, size = 72, color = "var(--ink)", style }) => {
  const props = {
    width: size, height: size, viewBox: "0 0 100 100",
    fill: "none", stroke: color, strokeWidth: 2.2,
    strokeLinecap: "round", strokeLinejoin: "round",
    style: { display: "block", ...style },
  };
  switch (kind) {
    case "mic":
      return (
        <svg {...props}>
          <rect x="38" y="14" width="24" height="44" rx="12" />
          <path d="M28 48a22 22 0 0 0 44 0" />
          <path d="M50 70v14M40 84h20" />
          <circle cx="50" cy="32" r="1.4" fill={color} />
        </svg>
      );
    case "headphones":
      return (
        <svg {...props}>
          <path d="M18 56v-6a32 32 0 0 1 64 0v6" />
          <rect x="12" y="56" width="14" height="26" rx="4" />
          <rect x="74" y="56" width="14" height="26" rx="4" />
          <path d="M22 70l-4 2M82 70l4 2" />
        </svg>
      );
    case "vinyl":
      return (
        <svg width={size} height={size} viewBox="0 0 100 100" style={{ display: "block", ...style }}>
          <circle cx="50" cy="50" r="38" fill="none" stroke={color} strokeWidth="2.2" />
          <circle cx="50" cy="50" r="30" fill="none" stroke={color} strokeWidth="0.8" opacity="0.6" />
          <circle cx="50" cy="50" r="22" fill="none" stroke={color} strokeWidth="0.8" opacity="0.6" />
          <circle cx="50" cy="50" r="14" fill={color} />
          <circle cx="50" cy="50" r="2.5" fill="var(--frame)" />
        </svg>
      );
    case "stems":
      return (
        <svg {...props}>
          <rect x="14" y="24" width="72" height="14" rx="3" />
          <rect x="14" y="44" width="72" height="14" rx="3" />
          <rect x="14" y="64" width="72" height="14" rx="3" />
          <path d="M22 31h12M40 31h22M22 51h38M22 71h26M58 71h14" stroke={color} strokeWidth="1.4" opacity="0.5" />
          <circle cx="80" cy="31" r="2" fill={color} />
          <circle cx="80" cy="51" r="2" fill={color} />
          <circle cx="80" cy="71" r="2" fill={color} />
        </svg>
      );
    case "cassette":
      return (
        <svg {...props}>
          <rect x="12" y="26" width="76" height="48" rx="5" />
          <rect x="20" y="48" width="60" height="14" rx="2" />
          <circle cx="36" cy="55" r="4" />
          <circle cx="64" cy="55" r="4" />
          <rect x="26" y="32" width="48" height="10" rx="1.5" />
          <path d="M16 70v2M84 70v2" />
        </svg>
      );
    case "mailbox":
      return (
        <svg {...props}>
          <path d="M14 40v40h72V40" />
          <path d="M50 16l34 24H16z" />
          <path d="M38 56h24v18H38z" />
          <path d="M50 56v18" />
        </svg>
      );
    case "compass":
      return (
        <svg {...props}>
          <circle cx="50" cy="50" r="36" />
          <path d="M50 22v6M50 72v6M22 50h6M72 50h6" />
          <path d="m42 58 8-20 8 20-8-6z" fill={color} />
        </svg>
      );
    case "spark":
      return (
        <svg {...props}>
          <path d="M50 18v18M50 64v18M18 50h18M64 50h18" />
          <path d="m30 30 12 12M58 58l12 12M70 30 58 42M30 70l12-12" />
        </svg>
      );
    case "session":
      return (
        <svg {...props}>
          <rect x="14" y="30" width="72" height="44" rx="3" />
          {[26, 38, 50, 62, 74].map(x => <path key={x} d={`M${x} 38v28`} />)}
          {[22, 30, 42, 54, 66, 78].map(x => <path key={x} d={`M${x} 34v36`} strokeWidth="1" opacity="0.4" />)}
          <circle cx="32" cy="48" r="2" fill={color} />
          <circle cx="56" cy="60" r="2" fill={color} />
          <circle cx="68" cy="44" r="2" fill={color} />
        </svg>
      );
    default:
      return null;
  }
};

// ──────────────────────────────────────────────────────────────
// Highlight — fake hand-drawn highlighter mark under a word
const Highlight = ({ children, color = "var(--accent)", style }) => (
  <span style={{ position: "relative", display: "inline-block", ...style }}>
    <span style={{ position: "relative", zIndex: 1 }}>{children}</span>
    <span style={{
      position: "absolute",
      left: "-2%", right: "-2%", bottom: "0.05em",
      height: "0.32em",
      background: color,
      borderRadius: 999,
      zIndex: 0,
      transform: "skewX(-4deg)",
      opacity: 0.55,
    }} />
  </span>
);

// ──────────────────────────────────────────────────────────────
// Global CSS injection for keyframes — once.
if (typeof document !== "undefined" && !document.getElementById("seshn-visuals-css")) {
  const s = document.createElement("style");
  s.id = "seshn-visuals-css";
  s.textContent = `
    @keyframes seshn-marquee {
      from { transform: translateX(0); }
      to   { transform: translateX(-50%); }
    }
    @keyframes seshn-spin {
      from { transform: rotate(0deg); }
      to   { transform: rotate(360deg); }
    }
    .seshn-vinyl-spin { animation: seshn-spin 6s linear infinite; }
  `;
  document.head.appendChild(s);
}

window.SeshnVisuals = {
  AlbumArt, Waveform, Marquee, Sticker, Vinyl, Cassette, Polaroid,
  CoverHeader, Grain, Illo, Highlight,
  V_PAL, COVER_PALETTES,
};
Object.assign(window, window.SeshnVisuals);
