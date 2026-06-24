"use client";

import { useEffect, useState } from "react";

// Brand palette for the illustrations.
const GREEN = "#2CCB73";
const MINT = "#a8ebc8";
const CREAM = "#f0e8d6";
const INK = "#0d0d0d";
const PANEL = "rgba(255,255,255,0.07)";
const LINE = "rgba(255,255,255,0.16)";

function Frame({ children }: { children: React.ReactNode }) {
  return (
    <svg viewBox="0 0 320 240" width="100%" style={{ maxWidth: 360, display: "block" }} role="img" aria-hidden="true">
      {children}
    </svg>
  );
}

// 1 — Post a brief: a brief card with role/genre tag chips.
function BriefArt() {
  return (
    <Frame>
      <rect x="48" y="34" width="224" height="172" rx="14" fill={PANEL} stroke={LINE} />
      <rect x="68" y="58" width="96" height="14" rx="7" fill={CREAM} />
      <rect x="68" y="84" width="184" height="8" rx="4" fill={LINE} />
      <rect x="68" y="100" width="160" height="8" rx="4" fill={LINE} />
      <rect x="68" y="132" width="70" height="26" rx="13" fill={GREEN} />
      <rect x="146" y="132" width="58" height="26" rx="13" fill="none" stroke={MINT} />
      <rect x="68" y="170" width="44" height="20" rx="10" fill="none" stroke={LINE} />
      <text x="103" y="149" fill={INK} fontFamily="monospace" fontSize="11" fontWeight="700" textAnchor="middle">PRODUCER</text>
      <circle cx="248" cy="62" r="14" fill={MINT} />
      <path d="M243 62l4 4 7-8" stroke={INK} strokeWidth="2.4" fill="none" strokeLinecap="round" strokeLinejoin="round" />
    </Frame>
  );
}

// 2 — Find your people: profile cards + a waveform.
function MatchArt() {
  const bars = [14, 30, 20, 44, 26, 52, 34, 60, 40, 50, 24, 38, 18, 30];
  return (
    <Frame>
      <rect x="36" y="50" width="150" height="140" rx="14" fill={PANEL} stroke={LINE} transform="rotate(-5 111 120)" />
      <rect x="150" y="46" width="150" height="148" rx="14" fill={PANEL} stroke={LINE} />
      <circle cx="180" cy="80" r="18" fill={MINT} />
      <rect x="208" y="70" width="74" height="10" rx="5" fill={CREAM} />
      <rect x="208" y="88" width="54" height="8" rx="4" fill={LINE} />
      {bars.map((h, i) => (
        <rect key={i} x={168 + i * 9} y={150 - h / 2} width="5" height={h} rx="2.5" fill={i % 3 === 0 ? GREEN : MINT} />
      ))}
    </Frame>
  );
}

// 3 — Agree terms, escrow: a contract with a shield/lock.
function EscrowArt() {
  return (
    <Frame>
      <rect x="40" y="36" width="150" height="168" rx="12" fill={PANEL} stroke={LINE} />
      <rect x="58" y="58" width="80" height="10" rx="5" fill={CREAM} />
      {[84, 102, 120, 138].map((y) => (
        <rect key={y} x="58" y={y} width={y === 138 ? 70 : 114} height="7" rx="3.5" fill={LINE} />
      ))}
      <path d="M62 176l8 7 14-15" stroke={GREEN} strokeWidth="3" fill="none" strokeLinecap="round" strokeLinejoin="round" />
      <path d="M232 60l40 14v34c0 30-20 46-40 54-20-8-40-24-40-54V74z" fill={GREEN} opacity="0.16" stroke={GREEN} strokeWidth="2" />
      <rect x="218" y="108" width="28" height="24" rx="4" fill="none" stroke={MINT} strokeWidth="2.4" />
      <path d="M223 108v-6a9 9 0 0 1 18 0v6" fill="none" stroke={MINT} strokeWidth="2.4" />
      <circle cx="232" cy="120" r="3.2" fill={MINT} />
    </Frame>
  );
}

// 4 — Deliver & get paid: a payout card with a checkmark.
function PaidArt() {
  return (
    <Frame>
      <rect x="54" y="56" width="212" height="128" rx="14" fill={PANEL} stroke={LINE} />
      <rect x="54" y="56" width="212" height="34" rx="14" fill={GREEN} opacity="0.18" />
      <circle cx="160" cy="118" r="30" fill={GREEN} />
      <path d="M147 118l9 9 18-20" stroke={INK} strokeWidth="3.4" fill="none" strokeLinecap="round" strokeLinejoin="round" />
      <rect x="78" y="158" width="60" height="10" rx="5" fill={CREAM} />
      <rect x="182" y="158" width="60" height="10" rx="5" fill={LINE} />
      <text x="234" y="80" fill={MINT} fontFamily="monospace" fontSize="13" fontWeight="700" textAnchor="end">+ $</text>
    </Frame>
  );
}

const SLIDES = [
  { title: "Post what you need", body: "Role, genre, budget, deadline. Your brief reaches matched collaborators in about 90 seconds.", art: <BriefArt /> },
  { title: "Find your people", body: "Browse artists, producers, vocalists and engineers. Hear the work before you read a word.", art: <MatchArt /> },
  { title: "Agree terms, money held safe", body: "Sign a clear contract and the payment sits in escrow until the work is delivered and approved.", art: <EscrowArt /> },
  { title: "Deliver and get paid", body: "Approve the delivery and the funds release. One flat 10%, fees included, no surprises.", art: <PaidArt /> },
];

export default function HowItWorks() {
  const [i, setI] = useState(0);
  useEffect(() => {
    const reduce = typeof window !== "undefined" && window.matchMedia?.("(prefers-reduced-motion: reduce)").matches;
    if (reduce) return;
    const t = setInterval(() => setI((n) => (n + 1) % SLIDES.length), 5000);
    return () => clearInterval(t);
  }, []);
  const s = SLIDES[i];
  return (
    <div style={{ display: "flex", flexDirection: "column", flex: 1, justifyContent: "center", padding: "8px 0", position: "relative", zIndex: 2 }}>
      <div style={{ display: "flex", alignItems: "center", justifyContent: "center", minHeight: 240, marginBottom: 18 }} key={i}>
        <div style={{ animation: "seshn-fade-in 0.5s ease" }}>{s.art}</div>
      </div>
      <div style={{ fontFamily: "var(--font-mono, monospace)", fontSize: 11, letterSpacing: "0.16em", textTransform: "uppercase", color: "var(--accent)", marginBottom: 10 }}>
        How Seshn works
      </div>
      <h2 style={{ fontFamily: "var(--font-display)", fontWeight: 700, fontSize: 26, lineHeight: 1.15, letterSpacing: "-0.02em", color: "#fff", margin: "0 0 12px", maxWidth: 380 }}>
        {s.title}
      </h2>
      <p style={{ fontSize: 15, lineHeight: 1.55, color: "rgba(255,255,255,0.7)", margin: 0, maxWidth: 380 }}>{s.body}</p>
      <div style={{ display: "flex", gap: 6, marginTop: 22 }}>
        {SLIDES.map((_, n) => (
          <button
            key={n}
            type="button"
            aria-label={`Step ${n + 1}`}
            onClick={() => setI(n)}
            style={{ width: n === i ? 24 : 14, height: 3, borderRadius: 2, border: "none", padding: 0, cursor: "pointer", background: n === i ? "var(--accent)" : "rgba(255,255,255,0.22)", transition: "width .3s, background .3s" }}
          />
        ))}
      </div>
    </div>
  );
}
