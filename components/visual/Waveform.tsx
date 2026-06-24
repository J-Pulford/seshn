"use client";

import { useEffect, useRef, useState, type CSSProperties } from "react";

// Deterministic bar heights from a seed, so a given track always draws the same
// waveform (purely decorative — we don't decode the audio).
function _hash(s: string): number {
  let h = 2166136261 >>> 0;
  s = String(s || "x");
  for (let i = 0; i < s.length; i++) { h ^= s.charCodeAt(i); h = Math.imul(h, 16777619); }
  return h >>> 0;
}
function barHeights(seed: string, n: number): number[] {
  let s = _hash(seed) >>> 0;
  const rng = () => { s = (s + 0x6d2b79f5) >>> 0; let t = s; t = Math.imul(t ^ (t >>> 15), t | 1); t ^= t + Math.imul(t ^ (t >>> 7), t | 61); return ((t ^ (t >>> 14)) >>> 0) / 4294967296; };
  return Array.from({ length: n }, (_, i) => {
    const env = Math.sin((i / (n - 1)) * Math.PI) ** 0.45; // taper the ends
    return Math.max(0.12, Math.min(1, (0.25 + rng() * 0.85) * env));
  });
}

// A static, seeded waveform. `progress` (0–1) colours the played portion.
export function Waveform({ seed, progress = 0, count = 56, height = 40, onSeek, style }: {
  seed: string; progress?: number; count?: number; height?: number; onSeek?: (frac: number) => void; style?: CSSProperties;
}) {
  const hs = barHeights(seed, count);
  const gap = 2, bw = 3, w = count * (bw + gap);
  const played = Math.round(progress * count);
  return (
    <svg
      viewBox={`0 0 ${w} ${height}`}
      preserveAspectRatio="none"
      width="100%"
      height={height}
      style={{ display: "block", cursor: onSeek ? "pointer" : "default", ...style }}
      onClick={onSeek ? (e) => { const r = (e.currentTarget as SVGElement).getBoundingClientRect(); onSeek(Math.max(0, Math.min(1, (e.clientX - r.left) / r.width))); } : undefined}
    >
      {hs.map((h, i) => {
        const bh = Math.max(2, h * (height - 4));
        return <rect key={i} x={i * (bw + gap)} y={(height - bh) / 2} width={bw} height={bh} rx={1.5} fill={i < played ? "var(--accent)" : "var(--line)"} />;
      })}
    </svg>
  );
}

function fmt(t: number): string {
  if (!isFinite(t) || t < 0) return "0:00";
  const m = Math.floor(t / 60), s = Math.floor(t % 60);
  return m + ":" + String(s).padStart(2, "0");
}

// A self-contained audio player styled as a track row: artwork-less play button,
// seeded waveform (seek on click), and a live duration readout. Used for
// uploaded portfolio audio on profiles.
export function WaveformAudio({ src, seed, title }: { src: string; seed: string; title?: string }) {
  const ref = useRef<HTMLAudioElement>(null);
  const [playing, setPlaying] = useState(false);
  const [cur, setCur] = useState(0);
  const [dur, setDur] = useState(0);

  useEffect(() => {
    const a = ref.current; if (!a) return;
    const onTime = () => setCur(a.currentTime);
    const onMeta = () => setDur(a.duration || 0);
    const onEnd = () => { setPlaying(false); setCur(0); };
    const onPlay = () => setPlaying(true);
    const onPause = () => setPlaying(false);
    a.addEventListener("timeupdate", onTime);
    a.addEventListener("loadedmetadata", onMeta);
    a.addEventListener("ended", onEnd);
    a.addEventListener("play", onPlay);
    a.addEventListener("pause", onPause);
    return () => {
      a.removeEventListener("timeupdate", onTime);
      a.removeEventListener("loadedmetadata", onMeta);
      a.removeEventListener("ended", onEnd);
      a.removeEventListener("play", onPlay);
      a.removeEventListener("pause", onPause);
    };
  }, []);

  const toggle = () => { const a = ref.current; if (!a) return; if (a.paused) void a.play(); else a.pause(); };
  const seek = (frac: number) => { const a = ref.current; if (!a || !dur) return; a.currentTime = frac * dur; setCur(frac * dur); };
  const progress = dur ? cur / dur : 0;

  return (
    <div className="wf-row">
      <button type="button" className="wf-play" onClick={toggle} aria-label={playing ? "Pause" : "Play"}>
        {playing ? (
          <svg width="16" height="16" viewBox="0 0 24 24" fill="currentColor" aria-hidden="true"><rect x="6" y="5" width="4" height="14" rx="1" /><rect x="14" y="5" width="4" height="14" rx="1" /></svg>
        ) : (
          <svg width="16" height="16" viewBox="0 0 24 24" fill="currentColor" aria-hidden="true"><path d="M8 5v14l11-7z" /></svg>
        )}
      </button>
      <div className="wf-main">
        {title && <div className="wf-title">{title}</div>}
        <Waveform seed={seed} progress={progress} onSeek={seek} height={34} />
      </div>
      <span className="wf-time">{cur > 0 ? fmt(cur) : fmt(dur)}</span>
      <audio ref={ref} src={src} preload="metadata" style={{ display: "none" }} />
    </div>
  );
}
