"use client";

import { AlbumArt } from "@/components/visual/AlbumArt";
import { Vinyl } from "@/components/visual/Vinyl";
import { Grain } from "@/components/visual/Grain";
import "./pro.css";

const FREE_FEATURES = [
  "Unlimited gig posts",
  "Apply to any post",
  "Up to 3 portfolio embeds",
  "Reply to messages you receive",
  "Basic search & filters",
];
const PRO_FEATURES = [
  "Verified ✓ badge on your profile",
  "Message anyone first",
  "Profile view analytics",
  "Unlimited portfolio slots",
  "Priority in search results",
  "1 boost credit per month",
];
const FAQ: [string, string][] = [
  ["Can I cancel anytime?", "Yes, cancel from your account settings. You'll keep Pro until the end of your billing period."],
  ["Is there a free trial?", "The Free plan is free forever, so you can try everything before upgrading."],
  ["What counts as a 'boost credit'?", "Each credit pins your gig to the top of the feed and sends push notifications to matched artists for 7 days."],
  ["Do I need Pro to apply to gigs?", "No. Applying is always free. Pro helps you get found and message first."],
];

const CheckIcon = ({ color = "var(--ink-2)" }: { color?: string }) => (
  <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke={color} strokeWidth="2.5" style={{ flexShrink: 0 }}><path d="M5 12l5 5L20 7" /></svg>
);

export default function ProPage() {
  return (
    <div className="pro-page" style={{ background: "var(--bg)", minHeight: "100vh" }}>
      <nav className="top-nav">
        <a href="/feed" className="logo">Seshn</a>
        <a href="/feed" style={{ fontSize: 13, color: "var(--ink-3)", textDecoration: "none", fontFamily: "var(--font-display)" }}>← Back to feed</a>
      </nav>

      <div style={{ position: "relative", overflow: "hidden" }}>
        <div className="float-deco" style={{ top: 60, left: 80, transform: "rotate(-6deg)", opacity: 0.88 }}><AlbumArt seed="pro-deco-1" size={84} radius={6} /></div>
        <div className="float-deco" style={{ top: 120, right: 100, transform: "rotate(8deg)", opacity: 0.88 }}><AlbumArt seed="pro-deco-2" size={70} radius={6} /></div>
        <div className="float-deco" style={{ top: 200, left: 60, opacity: 0.5 }}><AlbumArt seed="pro-deco-3" size={48} radius={4} /></div>
        <div className="float-deco" style={{ top: 32, right: 280, opacity: 0.6 }}><AlbumArt seed="pro-deco-4" size={44} radius={4} /></div>
        <div className="hero">
          <span className="pill accent" style={{ fontSize: 12 }}>✴ Seshn Pro</span>
          <h1>Move first,<br />get <span className="highlight"><span>heard</span></span> first.</h1>
          <p className="sub">Pro gives you the tools serious artists use to find collaborators faster, and look like one.</p>
        </div>
      </div>

      <div className="pricing-grid">
        <div className="free-card">
          <div className="card-eyebrow" style={{ color: "var(--ink-3)" }}>Free</div>
          <div className="price" style={{ color: "var(--ink)" }}>$0</div>
          <div className="price-sub" style={{ color: "var(--ink-3)" }}>Everything to start.</div>
          <div className="feature-list">
            {FREE_FEATURES.map((f) => <div key={f} className="feature-item" style={{ color: "var(--ink-2)" }}><CheckIcon color="var(--ink-3)" />{f}</div>)}
          </div>
          <button className="btn block" style={{ padding: "13px 20px", fontSize: 14 }}>You&apos;re on Free</button>
        </div>

        <div className="pro-card">
          <Grain opacity={0.18} />
          <div style={{ position: "absolute", top: -30, right: -30, opacity: 0.4 }}>
            <Vinyl size={160} color="rgba(255,255,255,0.05)" label="var(--accent)" style={{ animation: "seshn-spin 14s linear infinite" }} />
          </div>
          <div style={{ position: "relative", zIndex: 1 }}>
            <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 14 }}>
              <div className="card-eyebrow" style={{ color: "var(--accent)", marginBottom: 0 }}>Pro</div>
              <span className="pill solid" style={{ fontSize: 9, padding: "3px 9px" }}>Most popular</span>
            </div>
            <div style={{ display: "flex", alignItems: "baseline", gap: 6, marginBottom: 4 }}>
              <div className="price" style={{ color: "#f4f3ef" }}>$5</div>
              <span style={{ color: "rgba(255,255,255,0.5)", fontSize: 14 }}>/ month</span>
            </div>
            <div className="price-sub" style={{ color: "rgba(255,255,255,0.55)" }}>or $48/year, save 20%</div>
            <div className="feature-list">
              {PRO_FEATURES.map((f) => <div key={f} className="feature-item" style={{ color: "rgba(255,255,255,0.85)" }}><CheckIcon color="var(--accent)" />{f}</div>)}
            </div>
            <button className="btn primary lg block" style={{ marginBottom: 12 }}>Upgrade to Pro →</button>
            <div style={{ textAlign: "center", fontSize: 11, color: "rgba(255,255,255,0.5)" }}>Cancel anytime · Powered by Stripe</div>
          </div>
        </div>
      </div>

      <div className="stats-row">
        {([["3.2×", "more applications on boosted posts"], ["~4h", "average response time for Pro users"], ["94%", "of Pro users say they'd recommend it"]] as [string, string][]).map(([num, label]) => (
          <div key={num} className="stat"><div className="stat-num">{num}</div><div className="stat-label">{label}</div></div>
        ))}
      </div>

      <div style={{ maxWidth: 900, margin: "0 auto 60px", padding: "0 40px" }}>
        <div style={{ fontFamily: "var(--font-display)", fontWeight: 500, fontSize: 10, letterSpacing: "0.14em", textTransform: "uppercase", color: "var(--ink-3)", marginBottom: 20 }}>Frequently asked</div>
        <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 20 }}>
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
