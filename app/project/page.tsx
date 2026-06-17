"use client";

// Project room — a static design mockup (no data wiring in the prototype).
// Ported as-is; real data comes when the projects feature is built out.
import { AlbumArt } from "@/components/visual/AlbumArt";
import "./project.css";

function _hash(s: string) {
  let h = 2166136261 >>> 0;
  s = String(s || "x");
  for (let i = 0; i < s.length; i++) { h ^= s.charCodeAt(i); h = Math.imul(h, 16777619); }
  return h >>> 0;
}
function _rng(seed: number) {
  let s = seed >>> 0;
  return () => { s = (s + 0x6d2b79f5) >>> 0; let t = s; t = Math.imul(t ^ (t >>> 15), t | 1); t ^= t + Math.imul(t ^ (t >>> 7), t | 61); return ((t ^ (t >>> 14)) >>> 0) / 4294967296; };
}
function Waveform({ seed = "wf", height = 18, bars = 40, progress = 0.3 }: { seed?: string; height?: number; bars?: number; progress?: number }) {
  const h = _hash(seed);
  const rng = _rng(h);
  const arr: number[] = [];
  for (let i = 0; i < bars; i++) { const t = i / (bars - 1); const env = 0.35 + 0.65 * Math.sin(t * Math.PI) ** 0.6; arr.push((0.18 + 0.82 * rng()) * env); }
  const W = bars * 2.8;
  const bw = W / bars - 1;
  return (
    <svg viewBox={`0 0 ${W} ${height}`} preserveAspectRatio="none" width="100%" height={height} style={{ display: "block" }}>
      {arr.map((a, i) => { const x = i * (W / bars); const bh = Math.max(1.5, a * height); const y = (height - bh) / 2; return <rect key={i} x={x} y={y} width={bw} height={bh} fill={i / bars < progress ? "var(--ink)" : "rgba(0,0,0,0.18)"} rx={bw / 2} />; })}
    </svg>
  );
}

const MEMBERS: [string, string, string][] = [
  ["Maya Oduya", "MO", "Producer · Owner"],
  ["Nia Kassim", "NK", "Vocalist"],
  ["Theo Brooks", "TB", "Drummer"],
  ["Sam Park", "SP", "Mix engineer"],
  ["Iván Reyes", "IR", "Guitar"],
  ["You", "YT", "A&R"],
];

interface ChatProps { self?: boolean; ini: string; name: string; time: string; body?: string; audio?: { title: string; meta: string }; file?: { name: string; size: string } }
function ChatMessage({ self, ini, name, time, body, audio, file }: ChatProps) {
  return (
    <div className={`msg-row ${self ? "self" : ""}`}>
      <div className="avatar sm" style={self ? { background: "var(--ink)", color: "var(--frame)" } : undefined}>{ini}</div>
      <div className="msg-content">
        <div className="msg-meta-row"><span className="msg-name">{name}</span><span className="msg-time">{time}</span></div>
        {body && <div className="msg-bubble">{body}</div>}
        {audio && (
          <div className="audio-embed">
            <AlbumArt seed={audio.title} size={36} radius={4} />
            <div className="play-btn" />
            <div style={{ flex: 1, minWidth: 0 }}>
              <div style={{ display: "flex", justifyContent: "space-between", alignItems: "baseline", marginBottom: 4 }}>
                <span style={{ fontFamily: "var(--font-display)", fontWeight: 600, fontSize: 11.5, overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>{audio.title}</span>
                <span className="t-meta" style={{ marginLeft: 8, flexShrink: 0 }}>Audio</span>
              </div>
              <Waveform seed={audio.title} height={16} progress={0} />
              <div className="t-meta" style={{ marginTop: 3 }}>{audio.meta}</div>
            </div>
          </div>
        )}
        {file && (
          <div className="file-embed">
            <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" style={{ color: "var(--ink-3)", flexShrink: 0 }}><path d="M3 6h7l2 2h9v11H3z" /></svg>
            <div>
              <div style={{ fontFamily: "var(--font-display)", fontWeight: 600, fontSize: 12 }}>{file.name}</div>
              <div className="t-meta">{file.size}</div>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}

export default function ProjectPage() {
  return (
    <div className="project-page">
      <div className="project-header">
        <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between" }}>
          <div style={{ display: "flex", alignItems: "center", gap: 16 }}>
            <AlbumArt seed="sundowner-ep" size={56} radius={8} />
            <div>
              <div className="t-eyebrow" style={{ marginBottom: 4 }}>Project · started Apr 12</div>
              <div style={{ display: "flex", alignItems: "center", gap: 10 }}>
                <span style={{ fontFamily: "var(--font-display)", fontWeight: 600, fontSize: 22, letterSpacing: "-0.02em" }}>Sundowner EP</span>
                <span className="pill accent">In progress</span>
                <span style={{ display: "inline-block", transform: "rotate(-3deg)", padding: "4px 10px", borderRadius: 4, background: "#f0e8d6", color: "#0d0d0d", fontFamily: "var(--font-display)", fontWeight: 700, fontSize: 10, letterSpacing: "0.04em", textTransform: "uppercase", boxShadow: "0 4px 12px rgba(0,0,0,0.15)" }}>Q3 • release</span>
              </div>
            </div>
          </div>
          <div style={{ display: "flex", alignItems: "center", gap: 16 }}>
            <div style={{ display: "flex", alignItems: "center" }}>
              {["MO", "NK", "TB", "SP"].map((ini, k) => <div key={ini} className="avatar sm" style={{ marginLeft: k > 0 ? -8 : 0, border: "2px solid var(--frame)", zIndex: 4 - k }}>{ini}</div>)}
              <span className="pill" style={{ marginLeft: 8, fontSize: 10 }}>+2</span>
            </div>
            <button className="btn sm">Invite</button>
          </div>
        </div>
      </div>

      <div className="main" style={{ flex: 1, overflow: "hidden" }}>
        <div className="chat-panel">
          <div className="messages">
            <div className="date-div">,  Today, Tuesday May 14 , </div>
            <ChatMessage ini="MO" name="Maya Oduya" time="9:14" body="just pushed v3 of the topline. let me know if the bridge lands. ✶" />
            <ChatMessage ini="MO" name="Maya Oduya" time="9:14" audio={{ title: "sundowner_topline_v3.wav", meta: "Maya O. · 1:42" }} />
            <ChatMessage self ini="YT" name="You" time="9:21" body="oh this is the move. the pre is doing exactly what we talked about. one note, can we hold the last word in the bridge a beat longer?" />
            <ChatMessage ini="NK" name="Nia Kassim" time="9:33" body="will track that today. I'll have a stem up by EOD." />
            <ChatMessage ini="TB" name="Theo Brooks" time="9:48" file={{ name: "drum-bus_v2_groove-shift.zip", size: "84 MB · Reaper session" }} />
            <ChatMessage ini="TB" name="Theo Brooks" time="9:48" body="re-cut the hat to push behind the beat. small thing, big feel." />
          </div>
          <div className="composer">
            <div className="composer-inner">
              <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" style={{ color: "var(--ink-3)", flexShrink: 0, cursor: "pointer" }}><path d="m21 12-8.5 8.5a5 5 0 1 1-7-7L14 5a3 3 0 1 1 4 4l-9 9a1 1 0 1 1-1.5-1.5L15 8" /></svg>
              <input className="composer-input" placeholder="Reply to the room…" />
              <button className="btn primary sm">Send</button>
            </div>
          </div>
        </div>

        <div className="right-panel">
          <div>
            <div className="t-eyebrow" style={{ marginBottom: 10 }}>Brief</div>
            <div style={{ display: "flex", flexDirection: "column", gap: 6, marginBottom: 12 }}>
              <div className="ph-line" /><div className="ph-line" /><div className="ph-line" style={{ width: "85%" }} /><div className="ph-line" style={{ width: "60%" }} />
            </div>
            <div style={{ display: "flex", gap: 6, flexWrap: "wrap" }}>
              <span className="pill">R&amp;B</span><span className="pill">Soul</span><span className="pill accent">Q3 release</span>
            </div>
          </div>
          <div style={{ height: 1, background: "var(--line-soft)" }} />
          <div>
            <div className="t-eyebrow" style={{ marginBottom: 10 }}>Moodboard</div>
            <div style={{ display: "flex", gap: 6 }}>
              <AlbumArt seed="sundowner-1" size={50} radius={4} />
              <AlbumArt seed="sundowner-2" size={50} radius={4} />
              <AlbumArt seed="sundowner-3" size={50} radius={4} />
              <div style={{ width: 50, height: 50, borderRadius: 4, border: "1.5px dashed var(--line)", display: "flex", alignItems: "center", justifyContent: "center", color: "var(--ink-3)", fontFamily: "var(--font-display)", fontSize: 20, cursor: "pointer" }}>+</div>
            </div>
          </div>
          <div style={{ height: 1, background: "var(--line-soft)" }} />
          <div>
            <div className="t-eyebrow" style={{ marginBottom: 10 }}>Members · 6</div>
            <div style={{ display: "flex", flexDirection: "column", gap: 10 }}>
              {MEMBERS.map(([name, ini, role]) => (
                <div key={ini} style={{ display: "flex", alignItems: "center", gap: 8 }}>
                  <div className="avatar sm" style={ini === "YT" ? { background: "var(--ink)", color: "var(--frame)" } : undefined}>{ini}</div>
                  <div>
                    <div style={{ fontFamily: "var(--font-display)", fontWeight: 600, fontSize: 12 }}>{name}</div>
                    <div className="t-meta">{role}</div>
                  </div>
                </div>
              ))}
            </div>
          </div>
          <div style={{ height: 1, background: "var(--line-soft)" }} />
          <div>
            <div className="t-eyebrow" style={{ marginBottom: 10 }}>Deadline</div>
            <div className="card" style={{ padding: 12 }}>
              <div style={{ display: "flex", gap: 10, alignItems: "center" }}>
                <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="var(--accent-d)" strokeWidth="2"><path d="M12 22s-7-7.5-7-13a7 7 0 1 1 14 0c0 5.5-7 13-7 13z" /><circle cx="12" cy="9" r="2.5" /></svg>
                <div>
                  <div style={{ fontFamily: "var(--font-display)", fontWeight: 600, fontSize: 14 }}>Aug 1, 2026</div>
                  <div className="t-meta">Mix lock · 78 days</div>
                </div>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
