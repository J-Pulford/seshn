"use client";

import { useEffect, useState } from "react";
import Nav from "@/components/Nav";
import { requireProfile } from "@/lib/seshn/auth";
import type { Profile } from "@/lib/seshn/types";

// First-run walkthrough: the "what is Seshn / how it works" moment shown once,
// right after onboarding (onboarding.finish() redirects here). Returning users
// route to their profile, so this is naturally first-run only. Ends by handing
// off to /start (the setup checklist) or the feed.
const STEPS: { icon: string; title: (name: string) => string; body: string }[] = [
  {
    icon: "🎧",
    title: (name) => `Welcome to Seshn${name ? `, ${name}` : ""}`,
    body: "Seshn is home base for the working musician — post what you need, find vetted collaborators, make the record together, and get paid safely. Here's the whole thing in four screens.",
  },
  {
    icon: "📝",
    title: () => "Post a brief, or find your people",
    body: "Say what you need — role, genre, comp, deadline — in about 90 seconds. Or browse talent and hear the work before you read the bio. Discovery on Seshn is audio-first.",
  },
  {
    icon: "📄",
    title: () => "Collaborate with cover",
    body: "Message and plan in DMs, then lock terms in a contract. The owner funds an escrow that Seshn holds safely and releases on approval — one flat 10%, all fees included. No more chasing payment.",
  },
  {
    icon: "💸",
    title: () => "Get paid, and get verified",
    body: "Connect your bank once and get paid via Stripe — you keep 90% on paid bookings, and split or trade collabs are free. Apply for the Verified badge to stand out as deeply vetted.",
  },
];

export default function WelcomePage() {
  const [me, setMe] = useState<Profile | null | undefined>(undefined);
  const [step, setStep] = useState(0);

  useEffect(() => {
    (async () => {
      const r = await requireProfile();
      if (!r) return;
      if (!r.user || !r.profile) { setMe(null); return; }
      setMe(r.profile);
    })();
  }, []);

  const firstName = (me?.display_name || me?.username || "").split(" ")[0] || "";
  const isLast = step === STEPS.length - 1;
  const s = STEPS[step];

  const wrap: React.CSSProperties = { minHeight: "100vh", background: "var(--bg)", display: "flex", flexDirection: "column" };
  const center: React.CSSProperties = { flex: 1, display: "flex", alignItems: "center", justifyContent: "center", padding: "24px 16px 56px" };
  const card: React.CSSProperties = { width: "100%", maxWidth: 460, textAlign: "center" };

  if (me === undefined) {
    return <div style={wrap}><Nav active={null} /><div style={center}><p className="t-meta">Loading…</p></div></div>;
  }

  return (
    <div style={wrap}>
      <Nav active={null} />
      <div style={center}>
        <div style={card}>
          <div style={{ textAlign: "right", marginBottom: 8 }}>
            <a href="/feed" style={{ fontSize: 13, color: "var(--ink-3)", textDecoration: "none" }}>Skip →</a>
          </div>

          <div aria-hidden="true" style={{ fontSize: 56, lineHeight: 1, marginBottom: 18 }}>{s.icon}</div>
          <h1 style={{ fontFamily: "var(--font-display)", fontWeight: 700, fontSize: 27, letterSpacing: "-0.02em", margin: "0 0 12px" }}>{s.title(firstName)}</h1>
          <p style={{ color: "var(--ink-2)", lineHeight: 1.65, fontSize: 15.5, margin: "0 auto", maxWidth: 420 }}>{s.body}</p>

          {/* Progress dots */}
          <div style={{ display: "flex", gap: 7, justifyContent: "center", margin: "28px 0 24px" }}>
            {STEPS.map((_, i) => (
              <button
                key={i}
                type="button"
                aria-label={`Go to step ${i + 1}`}
                onClick={() => setStep(i)}
                style={{ width: i === step ? 22 : 8, height: 8, borderRadius: 999, border: "none", padding: 0, cursor: "pointer", background: i === step ? "var(--accent, #2CCB73)" : "var(--line)", transition: "width 0.18s ease" }}
              />
            ))}
          </div>

          <div style={{ display: "flex", gap: 10, justifyContent: "center", alignItems: "center" }}>
            {step > 0 && <button type="button" className="btn" onClick={() => setStep((x) => x - 1)}>Back</button>}
            {!isLast ? (
              <button type="button" className="btn primary lg" onClick={() => setStep((x) => x + 1)}>Next</button>
            ) : (
              <a className="btn primary lg" href="/start">Set up my profile →</a>
            )}
          </div>
          {isLast && (
            <div style={{ marginTop: 14 }}>
              <a href="/feed" style={{ fontSize: 13, color: "var(--ink-3)", textDecoration: "none" }}>or jump straight to the feed</a>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
