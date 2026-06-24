"use client";

import { Grain } from "@/components/visual/Grain";
import { Vinyl } from "@/components/visual/Vinyl";
import { VerifiedBadge } from "@/components/VerifiedBadge";
import "./pro.css";

// What the verification review actually checks.
const CHECKS: [string, string][] = [
  ["Real identity", "We confirm you're a real person behind a real account, no impersonation."],
  ["Real work", "We review your releases, credits and portfolio to confirm the work is yours."],
  ["Track record", "We look for a genuine history of collaboration or professional output."],
  ["Good standing", "No unresolved disputes, reports, or policy issues on the platform."],
];

// Perks that came with the old Pro tier — parked until we flesh them out.
const COMING_SOON = [
  "Profile view analytics",
  "Priority placement in search",
  "Boost credits for your gigs",
  "Message anyone first",
];

const FAQ: [string, string][] = [
  ["Is it really one-time?", "Yes. Verification is a single $49 payment, not a subscription. The badge stays on your profile."],
  ["What does it get me?", "The Verified badge on your profile, the trust signal that tells collaborators you've been deeply vetted by Seshn."],
  ["Do I need it to use Seshn?", "No. Posting, applying, messaging, contracts and escrow are all free. Verification is an optional trust badge."],
  ["When does payment go live?", "Soon. Right now you can apply for free while we finalise the review process, we'll only charge once it fully launches."],
];

const CheckIcon = ({ color = "var(--accent)" }: { color?: string }) => (
  <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke={color} strokeWidth="2.5" style={{ flexShrink: 0 }}><path d="M5 12l5 5L20 7" /></svg>
);

export default function VerificationPage() {
  return (
    <div className="pro-page" style={{ background: "var(--bg)", minHeight: "100vh" }}>
      <nav className="top-nav">
        <a href="/feed" className="logo">Seshn</a>
        <a href="/feed" style={{ fontSize: 13, color: "var(--ink-3)", textDecoration: "none", fontFamily: "var(--font-display)" }}>← Back to feed</a>
      </nav>

      <div style={{ position: "relative", overflow: "hidden" }}>
        <div className="hero">
          <span className="pill accent" style={{ fontSize: 12 }}>✓ Seshn Verification</span>
          <h1>Verified means<br /><span className="highlight"><span>vetted</span></span>.</h1>
          <p className="sub">A one-time, deeply-vetted badge that tells collaborators you&apos;re the real thing, real person, real work, real track record.</p>
        </div>
      </div>

      <div style={{ maxWidth: 560, margin: "0 auto 56px", padding: "0 24px" }}>
        <div className="pro-card" style={{ width: "100%" }}>
          <Grain opacity={0.18} />
          <div style={{ position: "absolute", top: -30, right: -30, opacity: 0.4 }}>
            <Vinyl size={160} color="rgba(255,255,255,0.05)" label="var(--bus, #5b8def)" style={{ animation: "seshn-spin 14s linear infinite" }} />
          </div>
          <div style={{ position: "relative", zIndex: 1 }}>
            <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 14 }}>
              <div className="card-eyebrow" style={{ color: "var(--bus, #5b8def)", marginBottom: 0 }}>Verification</div>
              <VerifiedBadge style={{ fontSize: 10, padding: "3px 9px 3px 6px" }} />
            </div>
            <div style={{ display: "flex", alignItems: "baseline", gap: 8, marginBottom: 4 }}>
              <div className="price" style={{ color: "#f4f3ef" }}>$49</div>
              <span style={{ color: "rgba(255,255,255,0.5)", fontSize: 14 }}>one-time</span>
            </div>
            <div className="price-sub" style={{ color: "rgba(255,255,255,0.55)" }}>No subscription. Awarded after review.</div>
            <div className="feature-list">
              {["The Verified badge on your profile", "Deep identity & work vetting", "A trust signal that wins bookings", "Stands out in search and DMs"].map((f) => (
                <div key={f} className="feature-item" style={{ color: "rgba(255,255,255,0.85)" }}><CheckIcon color="var(--bus, #5b8def)" />{f}</div>
              ))}
            </div>
            <a className="btn primary lg block" href="/verify" style={{ marginBottom: 12, textDecoration: "none", textAlign: "center" }}>Apply for verification →</a>
            <div style={{ textAlign: "center", fontSize: 11, color: "rgba(255,255,255,0.5)" }}>Free to apply · $49 payment coming soon</div>
          </div>
        </div>
      </div>

      <div style={{ maxWidth: 760, margin: "0 auto 60px", padding: "0 24px" }}>
        <div style={{ fontFamily: "var(--font-display)", fontWeight: 500, fontSize: 10, letterSpacing: "0.14em", textTransform: "uppercase", color: "var(--ink-3)", marginBottom: 20 }}>What we check</div>
        <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(240px, 1fr))", gap: 18 }}>
          {CHECKS.map(([h, p]) => (
            <div key={h} style={{ border: "1px solid var(--line)", borderRadius: 14, padding: 18, background: "var(--surface)" }}>
              <div style={{ display: "flex", alignItems: "center", gap: 8, marginBottom: 8 }}><CheckIcon color="var(--bus, #5b8def)" /><span style={{ fontFamily: "var(--font-display)", fontWeight: 600, fontSize: 15, color: "var(--ink)" }}>{h}</span></div>
              <p style={{ fontSize: 13, color: "var(--ink-3)", lineHeight: 1.55, margin: 0 }}>{p}</p>
            </div>
          ))}
        </div>
      </div>

      <div style={{ maxWidth: 760, margin: "0 auto 60px", padding: "0 24px" }}>
        <div style={{ border: "1px dashed var(--line-2, var(--line))", borderRadius: 16, padding: "22px 24px", background: "var(--surface-2, var(--surface))" }}>
          <div style={{ display: "flex", alignItems: "center", gap: 10, marginBottom: 10 }}>
            <span style={{ fontFamily: "var(--font-display)", fontWeight: 700, fontSize: 16, color: "var(--ink)" }}>More for verified members</span>
            <span className="pill" style={{ fontSize: 9, padding: "2px 8px", background: "var(--accent-bg)", borderColor: "transparent", color: "var(--accent-d)" }}>Coming soon</span>
          </div>
          <p style={{ fontSize: 13, color: "var(--ink-3)", lineHeight: 1.55, margin: "0 0 14px" }}>We&apos;re building these on top of verification. They&apos;re not live yet, we&apos;d rather ship them properly.</p>
          <div style={{ display: "flex", flexWrap: "wrap", gap: 8 }}>
            {COMING_SOON.map((f) => (
              <span key={f} style={{ fontSize: 12.5, color: "var(--ink-2)", border: "1px solid var(--line)", borderRadius: 999, padding: "6px 12px" }}>{f}</span>
            ))}
          </div>
        </div>
      </div>

      <div style={{ maxWidth: 900, margin: "0 auto 60px", padding: "0 24px" }}>
        <div style={{ fontFamily: "var(--font-display)", fontWeight: 500, fontSize: 10, letterSpacing: "0.14em", textTransform: "uppercase", color: "var(--ink-3)", marginBottom: 20 }}>Frequently asked</div>
        <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(280px, 1fr))", gap: 20 }}>
          {FAQ.map(([q, a]) => (
            <div key={q} style={{ display: "flex", flexDirection: "column", gap: 6 }}>
              <div style={{ fontFamily: "var(--font-display)", fontWeight: 600, fontSize: 14, color: "var(--ink)" }}>{q}</div>
              <div style={{ fontSize: 13, color: "var(--ink-3)", lineHeight: 1.55 }}>{a}</div>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}
