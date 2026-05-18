// Seshn — animated scenes for the landing page.
// Lottie-style inline SVG/CSS animations — no JSON needed; swap in real
// Lottie files later by replacing each <X /> with <lottie-player src=… />.

const { Logo, Pill, Avatar, Btn, Input, Icon, GigCard, Audio } = window.SeshnAtoms;
const { AlbumArt, Waveform, Sticker } = window.SeshnVisuals;

// ────────────────────────────────────────────────────
// HOOK · loop a sequence of steps with a step duration
function useLoopStep(stepCount, stepMs = 1400) {
  const [s, setS] = React.useState(0);
  React.useEffect(() => {
    const t = setInterval(() => setS(x => (x + 1) % stepCount), stepMs);
    return () => clearInterval(t);
  }, [stepCount, stepMs]);
  return s;
}

// ────────────────────────────────────────────────────
// HERO — Network of musicians connecting.
// Nodes pulse, edges animate in, audio pulses travel along edges.
const NetworkAnim = ({ width = 540, height = 460 }) => {
  // Node layout — 6 musicians in a circle + one center "you"
  const NODES = [
    { id: "you",   x: 0.50, y: 0.50, ini: "YT", role: "you", r: 36, you: true },
    { id: "maya",  x: 0.16, y: 0.22, ini: "MO", role: "PROD" },
    { id: "nia",   x: 0.82, y: 0.20, ini: "NK", role: "VOC" },
    { id: "theo",  x: 0.90, y: 0.66, ini: "TB", role: "DRM" },
    { id: "sam",   x: 0.60, y: 0.88, ini: "SP", role: "MIX" },
    { id: "lina",  x: 0.18, y: 0.82, ini: "LV", role: "PROD" },
    { id: "ivan",  x: 0.08, y: 0.52, ini: "IR", role: "GTR" },
  ];
  const EDGES = [
    ["you", "maya"], ["you", "nia"], ["you", "theo"],
    ["you", "sam"], ["you", "lina"], ["you", "ivan"],
    ["maya", "nia"], ["nia", "theo"], ["theo", "sam"], ["sam", "lina"], ["lina", "ivan"], ["ivan", "maya"],
  ];
  const W = width, H = height;
  const nodeMap = Object.fromEntries(NODES.map(n => [n.id, { ...n, X: n.x * W, Y: n.y * H }]));

  // Animated time tick for pulse positions
  const [t, setT] = React.useState(0);
  React.useEffect(() => {
    let raf, start = performance.now();
    const step = () => {
      setT((performance.now() - start) / 1000);
      raf = requestAnimationFrame(step);
    };
    raf = requestAnimationFrame(step);
    return () => cancelAnimationFrame(raf);
  }, []);

  return (
    <div style={{ position: "relative", width: "100%", height, maxWidth: width, margin: "0 auto" }}>
      <svg viewBox={`0 0 ${W} ${H}`} width="100%" height={H} style={{ overflow: "visible" }}>
        <defs>
          <radialGradient id="centerGlow" cx="50%" cy="50%" r="50%">
            <stop offset="0%" stopColor="rgba(44,203,115,0.35)" />
            <stop offset="60%" stopColor="rgba(44,203,115,0.06)" />
            <stop offset="100%" stopColor="rgba(44,203,115,0)" />
          </radialGradient>
          <filter id="softblur"><feGaussianBlur stdDeviation="0.6" /></filter>
        </defs>

        {/* Central glow */}
        <circle cx={W * 0.5} cy={H * 0.5} r={W * 0.4} fill="url(#centerGlow)" />

        {/* Subtle concentric rings */}
        {[0.18, 0.28, 0.38].map((r, i) => (
          <circle key={i} cx={W * 0.5} cy={H * 0.5} r={W * r}
            fill="none" stroke="rgba(255,255,255,0.06)" strokeWidth="1"
            strokeDasharray="2 4" />
        ))}

        {/* Edges */}
        {EDGES.map(([a, b], i) => {
          const A = nodeMap[a], B = nodeMap[b];
          // Travelling pulse position (0..1) — offset per edge so they're staggered
          const period = 3.5;
          const offset = (i * 0.31) % 1;
          const u = ((t / period) + offset) % 1;
          const px = A.X + (B.X - A.X) * u;
          const py = A.Y + (B.Y - A.Y) * u;
          const isHub = a === "you" || b === "you";
          return (
            <g key={i}>
              <line x1={A.X} y1={A.Y} x2={B.X} y2={B.Y}
                stroke={isHub ? "rgba(44,203,115,0.35)" : "rgba(255,255,255,0.08)"}
                strokeWidth={isHub ? 1.4 : 1} strokeLinecap="round"
                strokeDasharray={isHub ? "0" : "3 4"} />
              {/* Pulse dot */}
              <circle cx={px} cy={py} r={isHub ? 3.5 : 2.5}
                fill={isHub ? "#2CCB73" : "rgba(255,255,255,0.7)"}>
                <animate attributeName="opacity" values="0.4;1;0.4" dur="1.4s" repeatCount="indefinite" />
              </circle>
            </g>
          );
        })}

        {/* Nodes */}
        {NODES.map((n, i) => {
          const nm = nodeMap[n.id];
          const breathe = 1 + 0.04 * Math.sin(t * 1.4 + i);
          return (
            <g key={n.id} transform={`translate(${nm.X} ${nm.Y}) scale(${breathe})`}>
              {n.you && (
                <circle r={n.r + 12} fill="none" stroke="rgba(44,203,115,0.35)" strokeWidth="1.2" strokeDasharray="3 5">
                  <animateTransform attributeName="transform" type="rotate" from="0" to="360" dur="22s" repeatCount="indefinite" />
                </circle>
              )}
              <circle r={n.r || 26} fill={n.you ? "var(--accent)" : "var(--surface)"}
                stroke={n.you ? "transparent" : "rgba(255,255,255,0.15)"} strokeWidth="1" />
              <text y="5" textAnchor="middle"
                fontFamily="var(--font-display)" fontWeight="700" fontSize={n.you ? 16 : 13}
                fill={n.you ? "#062c19" : "var(--ink)"}>{n.ini}</text>
              {!n.you && (
                <g transform={`translate(${(n.r || 26) - 4} ${(n.r || 26) - 14})`}>
                  <rect x="-13" y="-7" width="30" height="14" rx="7" fill="var(--ink)" />
                  <text y="3" textAnchor="middle" fontFamily="var(--font-display)" fontWeight="600"
                    fontSize="8" letterSpacing="0.06em" fill="var(--frame)">{n.role}</text>
                </g>
              )}
            </g>
          );
        })}

        {/* Audio waveform tag on you-node */}
        <g transform={`translate(${W * 0.5} ${H * 0.5 + 56})`}>
          <rect x="-44" y="-12" width="88" height="22" rx="11" fill="var(--ink)" />
          {Array.from({ length: 16 }).map((_, i) => {
            const env = 0.3 + 0.7 * Math.abs(Math.sin(t * 6 + i * 0.7));
            const h = 4 + env * 10;
            return <rect key={i} x={-38 + i * 5} y={-h / 2} width="2" height={h}
              rx="1" fill="var(--accent)" />;
          })}
        </g>
      </svg>

      {/* Floating album-art accents */}
      <div style={{ position: "absolute", top: 10, right: 10, transform: "rotate(6deg)", animation: "seshn-float-a 6s ease-in-out infinite" }}>
        <AlbumArt seed="hero-1" size={64} radius={6} />
      </div>
      <div style={{ position: "absolute", bottom: 20, left: 0, transform: "rotate(-5deg)", animation: "seshn-float-b 7s ease-in-out infinite" }}>
        <AlbumArt seed="hero-2" size={52} radius={6} />
      </div>
    </div>
  );
};

// ────────────────────────────────────────────────────
// STEP 1 — POST.  Gig card composes itself in place — cleaner than the
// previous fly-to-feed transition, every element fades in instead of
// transforming the whole layout.
const PostAnim = () => {
  const step = useLoopStep(7, 850);
  // 0: empty card, 1: title typed, 2: role pill, 3: genre pills, 4: pay row, 5: published badge, 6: hold
  const title = step >= 1 ? "Topline writer wanted — Afrobeats demo" : "";
  const showRole = step >= 2;
  const showTags = step >= 3;
  const showPay = step >= 4;
  const published = step >= 5;
  return (
    <div className="land-anim-card" style={{ padding: 16, borderRadius: 16, background: "#f5f3ee", border: "1px solid rgba(0,0,0,0.06)", height: 420, display: "flex", flexDirection: "column", color: "var(--ink)", position: "relative", overflow: "hidden" }}>
      {/* Header */}
      <div className="row" style={{ gap: 8, marginBottom: 14, justifyContent: "space-between", color: "var(--ink)" }}>
        <div className="row" style={{ gap: 8 }}>
          <span style={{ width: 6, height: 6, borderRadius: 3, background: published ? "#1c8f56" : "#d96e3f", boxShadow: published ? "0 0 0 3px rgba(28,143,86,0.15)" : "0 0 0 3px rgba(217,110,63,0.15)", transition: "all .3s" }} />
          <span style={{ fontFamily: "var(--font-display)", fontSize: 11, fontWeight: 600, letterSpacing: "0.1em", textTransform: "uppercase", color: "#0d0d0d" }}>
            {published ? "Published · live" : "Draft · composing"}
          </span>
        </div>
        <span style={{ fontFamily: "var(--font-display)", fontSize: 11, fontWeight: 500, color: "#6e6c66" }}>Step 2 of 3</span>
      </div>

      {/* Gig card composing in place */}
      <div style={{ background: "#fff", border: published ? "2px solid #1c8f56" : "1px solid rgba(0,0,0,0.08)", borderRadius: 14, padding: 16, transition: "border-color .35s, box-shadow .35s", boxShadow: published ? "0 12px 28px rgba(28,143,86,0.18)" : "0 4px 14px rgba(0,0,0,0.04)", display: "flex", flexDirection: "column", gap: 12, flex: 1 }}>
        {/* Poster row */}
        <div className="row" style={{ gap: 10 }}>
          <Avatar size="md" initials="MO" role="PRO" />
          <div className="col" style={{ flex: 1, gap: 2 }}>
            <span style={{ fontFamily: "var(--font-display)", fontWeight: 600, fontSize: 13.5, color: "#0d0d0d" }}>Maya Oduya</span>
            <span style={{ fontSize: 10.5, color: "#6e6c66" }}>Posting now · Brooklyn</span>
          </div>
          {published && (
            <span style={{ animation: "seshn-pop .4s", background: "#1c8f56", color: "#fff", padding: "4px 10px", borderRadius: 999, fontFamily: "var(--font-display)", fontWeight: 700, fontSize: 10, letterSpacing: "0.06em" }}>✓ LIVE</span>
          )}
        </div>
        {/* Title row */}
        <div style={{ minHeight: 26, fontFamily: "var(--font-display)", fontWeight: 600, fontSize: 16, color: "#0d0d0d", lineHeight: 1.2, letterSpacing: "-0.015em" }}>
          {title}
          {!published && (
            <span style={{ display: "inline-block", width: 2, height: 16, background: "#2CCB73", marginLeft: 2, verticalAlign: "middle", animation: "seshn-caret 0.6s steps(2) infinite" }} />
          )}
        </div>
        {/* Pills row */}
        <div className="row" style={{ gap: 6, flexWrap: "wrap", minHeight: 24 }}>
          {showRole && <span style={{ animation: "seshn-pop .3s", background: "#A8EBC8", color: "#1C8F56", padding: "4px 10px", borderRadius: 999, fontSize: 11, fontFamily: "var(--font-display)", fontWeight: 600 }}>Vocalist needed</span>}
          {showTags && <span style={{ animation: "seshn-pop .3s", background: "#f0eee9", color: "#0d0d0d", padding: "4px 10px", borderRadius: 999, fontSize: 11, fontFamily: "var(--font-display)", fontWeight: 500 }}>Afrobeats</span>}
          {showTags && <span style={{ animation: "seshn-pop .3s", background: "#f0eee9", color: "#0d0d0d", padding: "4px 10px", borderRadius: 999, fontSize: 11, fontFamily: "var(--font-display)", fontWeight: 500 }}>Topline</span>}
        </div>
        {/* Pay row */}
        <div style={{ minHeight: 36, paddingTop: 8, borderTop: "1px solid rgba(0,0,0,0.06)" }}>
          {showPay && (
            <div className="row" style={{ gap: 14, animation: "seshn-pop .3s" }}>
              <div className="col" style={{ gap: 2 }}>
                <span style={{ fontSize: 9.5, color: "#6e6c66", letterSpacing: "0.08em", textTransform: "uppercase", fontFamily: "var(--font-display)", fontWeight: 500 }}>Pay</span>
                <span style={{ fontFamily: "var(--font-display)", fontWeight: 700, fontSize: 14, color: "#0d0d0d" }}>$200</span>
              </div>
              <div className="col" style={{ gap: 2 }}>
                <span style={{ fontSize: 9.5, color: "#6e6c66", letterSpacing: "0.08em", textTransform: "uppercase", fontFamily: "var(--font-display)", fontWeight: 500 }}>Deadline</span>
                <span style={{ fontFamily: "var(--font-display)", fontWeight: 700, fontSize: 14, color: "#0d0d0d" }}>Jun 14</span>
              </div>
              <div className="col" style={{ gap: 2 }}>
                <span style={{ fontSize: 9.5, color: "#6e6c66", letterSpacing: "0.08em", textTransform: "uppercase", fontFamily: "var(--font-display)", fontWeight: 500 }}>Location</span>
                <span style={{ fontFamily: "var(--font-display)", fontWeight: 700, fontSize: 14, color: "#0d0d0d" }}>Remote</span>
              </div>
            </div>
          )}
        </div>
        {/* Reach indicator */}
        <div style={{ minHeight: 32 }}>
          {published && (
            <div style={{ animation: "seshn-pop-in .4s", padding: "8px 12px", background: "#A8EBC8", borderRadius: 8, color: "#1C8F56", fontFamily: "var(--font-display)", fontWeight: 600, fontSize: 11.5, display: "flex", alignItems: "center", gap: 8 }}>
              <span style={{ width: 6, height: 6, borderRadius: 3, background: "#1C8F56", animation: "seshn-caret 1s infinite" }} />
              Now visible to <b>142 matched artists</b> · Maya, Theo, Nia +139 others
            </div>
          )}
        </div>
      </div>
    </div>
  );
};

// ────────────────────────────────────────────────────
// STEP 2 — MATCH.  Artist grid filters down to relevant ones.
const MatchAnim = () => {
  const step = useLoopStep(5, 1100);
  // 0: all artists, 1: role filter, 2: genre filter, 3: result narrows, 4: chat thread appears
  const artists = [
    { ini: "NK", role: "Vocalist", genres: ["R&B", "Soul"], pro: true, match: true },
    { ini: "SP", role: "Mix eng.", genres: ["Indie"], match: false },
    { ini: "LV", role: "Producer", genres: ["Electronic"], match: false },
    { ini: "MD", role: "Drummer", genres: ["Soul"], match: false },
    { ini: "AL", role: "Vocalist", genres: ["R&B", "Pop"], match: true },
    { ini: "RK", role: "Songwriter", genres: ["Pop"], match: false },
  ];
  const showFilter1 = step >= 1;
  const showFilter2 = step >= 2;
  const filterApplied = step >= 3;
  const showChat = step >= 4;
  return (
    <div style={{ padding: 16, borderRadius: 16, background: "var(--surface-2)", border: "1px solid var(--line)", minHeight: 340, position: "relative" }}>
      <div className="row" style={{ gap: 6, marginBottom: 12, minHeight: 24 }}>
        <span className="t-eyebrow">Filters</span>
        {showFilter1 && <Pill variant="solid" style={{ animation: "seshn-pop .3s" }}>✓ Vocalist</Pill>}
        {showFilter2 && <Pill variant="solid" style={{ animation: "seshn-pop .3s" }}>✓ R&B</Pill>}
      </div>
      <div style={{ display: "grid", gridTemplateColumns: "repeat(3, 1fr)", gap: 8, transition: "all .4s" }}>
        {artists.map((a, i) => {
          const hidden = filterApplied && !a.match;
          return (
            <div key={i} className="card" style={{
              padding: 10, transition: "all .5s",
              opacity: hidden ? 0.18 : 1,
              transform: hidden ? "scale(0.9)" : "scale(1)",
              borderColor: filterApplied && a.match ? "var(--accent-d)" : "var(--line)",
              background: filterApplied && a.match ? "var(--accent-bg)" : "var(--surface)",
              position: "relative",
            }}>
              <div className="row" style={{ gap: 8 }}>
                <Avatar size="sm" initials={a.ini} />
                <div className="col" style={{ flex: 1, minWidth: 0, gap: 1 }}>
                  <span style={{ fontFamily: "var(--font-display)", fontSize: 11, fontWeight: 600, color: "#0d0d0d" }}>{a.role}</span>
                  <span style={{ fontSize: 9.5, color: "#6e6c66" }}>{a.genres.join(" · ")}</span>
                </div>
              </div>
              {filterApplied && a.match && i === 0 && (
                <div style={{ position: "absolute", top: -4, right: -4, animation: "seshn-pop .3s" }}>
                  <span style={{ background: "var(--accent)", color: "#062c19", padding: "1px 5px", borderRadius: 6, fontSize: 8, fontFamily: "var(--font-display)", fontWeight: 700 }}>NEW</span>
                </div>
              )}
            </div>
          );
        })}
      </div>
      {showChat && (
        <div style={{ marginTop: 14, padding: 12, borderRadius: 10, background: "var(--ink)", color: "var(--frame)", animation: "seshn-pop-in .4s" }}>
          <div className="row" style={{ gap: 8 }}>
            <Avatar size="sm" initials="NK" style={{ background: "rgba(255,255,255,0.1)", color: "var(--frame)" }} />
            <div className="col" style={{ flex: 1, gap: 2 }}>
              <span style={{ fontFamily: "var(--font-display)", fontSize: 11.5, fontWeight: 600, color: "var(--frame)" }}>Nia K. → you</span>
              <span style={{ fontSize: 11, color: "rgba(255,255,255,0.8)" }}>"saw your post — have a demo I think fits ↵"</span>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

// ────────────────────────────────────────────────────
// STEP 3 — BUILD.  Project room with messages appearing, audio playing,
// deadline ticking, status finishing.
const BuildAnim = () => {
  const step = useLoopStep(6, 900);
  // 0..5: messages appear one by one, finally status changes to delivered
  const msgs = [
    { who: "MO", side: "L", body: "topline v3 incoming ✶", at: 1 },
    { who: "MO", side: "L", audio: true, at: 2 },
    { who: "YT", side: "R", body: "this is the move — let's track tomorrow", at: 3 },
    { who: "TB", side: "L", file: true, at: 4 },
  ];
  const showDelivered = step >= 5;
  return (
    <div style={{ padding: 16, borderRadius: 16, background: "var(--surface-2)", border: "1px solid var(--line)", minHeight: 340, display: "flex", flexDirection: "column" }}>
      <div className="between" style={{ marginBottom: 10 }}>
        <div className="row" style={{ gap: 8 }}>
          <AlbumArt seed="anim-project" size={26} radius={4} />
          <span style={{ fontFamily: "var(--font-display)", fontWeight: 600, fontSize: 13 }}>Sundowner EP</span>
        </div>
        <Pill variant={showDelivered ? "success" : "accent"} style={{ transition: "all .3s" }}>
          {showDelivered ? "Delivered" : "In progress"}
        </Pill>
      </div>
      <div className="col" style={{ flex: 1, gap: 8 }}>
        {msgs.map((m, i) => step >= m.at && (
          <div key={i} className="row" style={{ gap: 8, justifyContent: m.side === "R" ? "flex-end" : "flex-start", animation: "seshn-pop-in .35s" }}>
            {m.side === "L" && <Avatar size="sm" initials={m.who} />}
            {m.body && (
              <div style={{
                padding: "7px 11px",
                background: m.side === "R" ? "var(--ink)" : "var(--surface)",
                color: m.side === "R" ? "var(--frame)" : "var(--ink)",
                borderRadius: 10, fontSize: 12, lineHeight: 1.35, maxWidth: "75%",
                border: m.side === "L" ? "1px solid var(--line)" : "none",
              }}>{m.body}</div>
            )}
            {m.audio && (
              <div style={{ flex: "0 0 auto", maxWidth: 200 }}>
                <Audio compact title="topline_v3.wav" artist="Maya · 1:42" source="" seed="anim-audio" playing progress={0.4} />
              </div>
            )}
            {m.file && (
              <div className="row" style={{ gap: 6, padding: "6px 10px", background: "var(--surface)", border: "1px solid var(--line)", borderRadius: 10 }}>
                <Icon kind="folder" size={12} style={{ color: "var(--ink-3)" }} />
                <div className="col" style={{ gap: 0 }}>
                  <span style={{ fontFamily: "var(--font-display)", fontSize: 11, fontWeight: 600 }}>drum-bus_v2.zip</span>
                  <span className="t-meta" style={{ fontSize: 9.5 }}>84 MB</span>
                </div>
              </div>
            )}
            {m.side === "R" && <Avatar size="sm" initials={m.who} />}
          </div>
        ))}
      </div>
      {showDelivered && (
        <div style={{ marginTop: 10, padding: "8px 12px", background: "var(--accent-bg)", borderRadius: 8, color: "var(--accent-d)", fontSize: 12, fontFamily: "var(--font-display)", fontWeight: 600, animation: "seshn-pop-in .4s" }}>
          ✓ Mix lock met · Aug 1, 2026
        </div>
      )}
    </div>
  );
};

// ────────────────────────────────────────────────────
// FEATURE MINI-ANIMATIONS — small persistent loops for each card.
const FeatAudio = () => (
  <div style={{ display: "flex", alignItems: "center", gap: 8, padding: 10, background: "var(--surface)", borderRadius: 8, border: "1px solid var(--line)" }}>
    <div style={{ width: 22, height: 22, borderRadius: 11, background: "var(--ink)", display: "flex", alignItems: "center", justifyContent: "center" }}>
      <div style={{ width: 0, height: 0, borderLeft: "6px solid var(--accent)", borderTop: "4px solid transparent", borderBottom: "4px solid transparent", marginLeft: 2 }} />
    </div>
    <Waveform seed="feat-audio" height={20} bars={32} progress={0.55} played="var(--ink)" />
  </div>
);

const FeatPills = () => {
  const [i, setI] = React.useState(0);
  const all = [["R&B", "Vocalist", "Remote"], ["Indie", "Producer", "NYC"], ["Pop", "Songwriter", "Paid"], ["Afrobeats", "Mix eng.", "Split"]];
  React.useEffect(() => { const t = setInterval(() => setI(x => (x + 1) % all.length), 1700); return () => clearInterval(t); }, []);
  return (
    <div className="row" style={{ gap: 4, flexWrap: "wrap", minHeight: 22, transition: "all .3s" }}>
      {all[i].map((t, k) => <span key={t} className="pill" style={{ animation: "seshn-pop-in .35s", animationDelay: `${k * 0.08}s`, animationFillMode: "both" }}>{t}</span>)}
    </div>
  );
};

const FeatTyping = () => {
  const step = useLoopStep(4, 900);
  return (
    <div style={{ padding: 10, background: "var(--surface)", border: "1px solid var(--line)", borderRadius: 8, display: "flex", flexDirection: "column", gap: 6, height: 76 }}>
      <div className="row" style={{ gap: 6, height: 24 }}>
        <Avatar size="sm" initials="MO" />
        <div style={{ flex: 1, padding: "4px 8px", background: "var(--surface-2)", borderRadius: 6, fontSize: 11 }}>
          {step >= 1 ? "stems incoming ✶" : <span style={{ letterSpacing: 2 }}>•••</span>}
        </div>
      </div>
      <div className="row" style={{ gap: 6, justifyContent: "flex-end", height: 24, opacity: step >= 2 ? 1 : 0, transition: "opacity .3s" }}>
        <div style={{ padding: "4px 8px", background: "var(--ink)", color: "var(--frame)", borderRadius: 6, fontSize: 11 }}>
          {step >= 3 ? "🔥" : <span style={{ letterSpacing: 2 }}>•••</span>}
        </div>
        <Avatar size="sm" initials="YT" />
      </div>
    </div>
  );
};

const FeatStars = () => {
  const [v, setV] = React.useState(0);
  React.useEffect(() => {
    const t = setInterval(() => setV(x => x >= 5 ? 0 : x + 0.5), 240);
    return () => clearInterval(t);
  }, []);
  return (
    <div className="row" style={{ gap: 8 }}>
      <window.StarRow value={v} size={20} color="var(--accent-d)" />
      <span style={{ fontFamily: "var(--font-display)", fontWeight: 600, fontSize: 16, color: "var(--ink)" }}>{v.toFixed(1)}</span>
    </div>
  );
};

const FeatPaid = () => {
  const [n, setN] = React.useState(0);
  const ref = React.useRef(null);
  const [inView, setInView] = React.useState(false);
  React.useEffect(() => {
    if (!ref.current) return;
    const io = new IntersectionObserver(es => es.forEach(e => e.isIntersecting && setInView(true)), { threshold: 0.5 });
    io.observe(ref.current);
    return () => io.disconnect();
  }, []);
  React.useEffect(() => {
    if (!inView) return;
    const target = 4724, dur = 1700;
    const easeOut = (t) => 1 - Math.pow(1 - t, 3);
    let raf, holdT;
    const start = (t0) => {
      const startTime = performance.now();
      const tick = () => {
        const u = Math.min(1, (performance.now() - startTime) / dur);
        setN(Math.floor(target * easeOut(u)));
        if (u < 1) {
          raf = requestAnimationFrame(tick);
        } else {
          // Hold 3 seconds, then reset and loop.
          holdT = setTimeout(() => { setN(0); start(); }, 3000);
        }
      };
      raf = requestAnimationFrame(tick);
    };
    start();
    return () => { cancelAnimationFrame(raf); clearTimeout(holdT); };
  }, [inView]);
  return (
    <div ref={ref} className="row" style={{ gap: 8, alignItems: "baseline" }}>
      <span style={{ fontFamily: "var(--font-display)", fontWeight: 700, fontSize: 28, letterSpacing: "-0.02em", fontVariantNumeric: "tabular-nums" }}>${n.toLocaleString()}</span>
      <span className="t-meta">paid out this week</span>
    </div>
  );
};

const FeatBoost = () => {
  const step = useLoopStep(4, 800);
  return (
    <div style={{ padding: 8, background: "var(--surface)", border: "1px solid var(--line)", borderRadius: 8, display: "flex", flexDirection: "column", gap: 4 }}>
      {[2, 1, 0].map(rank => {
        const isYou = rank === (3 - step) % 3;
        return (
          <div key={rank} className="row" style={{ gap: 6, padding: "4px 6px", background: isYou ? "var(--accent-bg)" : "transparent", borderRadius: 4, transition: "all .4s" }}>
            <span style={{ fontFamily: "var(--font-display)", fontSize: 10, fontWeight: 700, color: "var(--ink-3)" }}>#{rank + 1}</span>
            <div style={{ height: 4, flex: 1, borderRadius: 2, background: "var(--line-soft)" }}>
              <div style={{ height: "100%", width: isYou ? "100%" : `${60 - rank * 15}%`, background: isYou ? "var(--accent-d)" : "var(--ink-3)", borderRadius: 2, transition: "width .4s" }} />
            </div>
            {isYou && <span style={{ fontSize: 9, fontFamily: "var(--font-display)", fontWeight: 700, color: "var(--accent-d)" }}>YOU</span>}
          </div>
        );
      })}
    </div>
  );
};

Object.assign(window, { NetworkAnim, PostAnim, MatchAnim, BuildAnim, FeatAudio, FeatPills, FeatTyping, FeatStars, FeatPaid, FeatBoost, useLoopStep });
