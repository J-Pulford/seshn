import type { Metadata } from "next";
import Reveal from "@/components/landing/Reveal";
import Beatmaker from "@/components/landing/Beatmaker";
import { SESHN } from "@/lib/landing/content";
import "./landing.css";

export const metadata: Metadata = {
  title: "Seshn — make a record. Together.",
  description:
    "Seshn is the home base for the working musician. Post a brief, find vetted collaborators, and ship a record together — audio-first profiles, verified ratings, project rooms, and Stripe payouts.",
  openGraph: {
    title: "Seshn — make a record. Together.",
    description: "Find the people who finish your record. Post a brief, find vetted collaborators, ship it together.",
    type: "website",
  },
};

const stars = (n: number) => "★★★★★".slice(0, n) + "☆☆☆☆☆".slice(0, 5 - n);

export default function LandingPage() {
  return (
    <>
      {/* Hero */}
      <section className="hero">
        <div className="container">
          <div className="hero-grid">
            <div>
              <span className="badge">REC · LIVE · 412 SESSIONS NOW</span>
              <h1>
                Make a record.<br />
                <span className="strike">Solo.</span><br />
                <span className="stem">Together.</span>
              </h1>
              <p className="lede">
                The home base for the working musician. Post a brief, find vetted collaborators, and ship the record together — audio-first profiles, verified ratings, project rooms, and payouts in one place.
              </p>
              <div className="ctas">
                <a href="/auth" className="btn primary">▶ Start your session</a>
                <a href="#how" className="btn">How it works</a>
              </div>
            </div>
            <Reveal className="mixer-wrap">
              <div className="mixer" aria-hidden="true">
                {[["KICK", 70], ["BASS", 48], ["VOX", 86], ["KEYS", 38], ["MIX", 60]].map(([tag, lvl]) => (
                  <div className="strip" key={tag as string}>
                    <span className="tag">{tag}</span>
                    <div className="meter" style={{ ["--lvl" as string]: `${100 - (lvl as number)}%` }} />
                    <div className="knob" />
                  </div>
                ))}
              </div>
            </Reveal>
          </div>
        </div>
      </section>

      {/* Beatmaker */}
      <section className="section" id="beatmaker" style={{ paddingTop: 40 }}>
        <div className="container">
          <Reveal>
            <span className="label">[TRY IT] · LIVE DEMO</span>
            <h2>This is the energy. <span className="stem">Now find your people.</span></h2>
            <p className="lede">Tap out a beat right here — eight synthesized voices, sixteen steps, four presets. No sign-up, nothing leaves your browser. Then go find a vocalist for it.</p>
          </Reveal>
          <Beatmaker />
        </div>
      </section>

      {/* Problem */}
      <section className="section" id="problem" style={{ background: "var(--bg-2)" }}>
        <div className="container">
          <Reveal>
            <span className="label">CH 01 · INPUT</span>
            <h2>The signal-to-<span className="stem">noise</span> ratio is broken.</h2>
          </Reveal>
          <Reveal className="stat-row">
            {SESHN.stats.map((s) => (
              <div className="stat-card" key={s.big}>
                <div className="big">{s.big}</div>
                <h3>{s.h}</h3>
                <p>{s.p}</p>
                <div className="src">{s.src}</div>
              </div>
            ))}
          </Reveal>
          <div className="callout">No platform exists to connect emerging musicians with each other. <span className="stem">Until now.</span></div>
          <div className="deep-problems">
            {SESHN.problemsDeep.map((d) => (
              <Reveal className="dp-row" key={d.stat}>
                <div>
                  <div className="dp-stat">{d.stat}</div>
                  <div className="dp-label">{d.label}</div>
                </div>
                <div>
                  <h3>{d.h}</h3>
                  <p style={{ color: "var(--ink-2)", fontSize: 14, lineHeight: 1.6 }}>{d.body}</p>
                  <div className="dp-src">{d.src}</div>
                </div>
              </Reveal>
            ))}
          </div>
        </div>
      </section>

      {/* How it works */}
      <section className="section" id="how">
        <div className="container">
          <Reveal>
            <span className="label">CH 02 · ROUTING</span>
            <h2>Three steps. <span className="stem">Ninety seconds</span> each.</h2>
          </Reveal>
          <Reveal className="how-grid">
            {SESHN.how.map((step) => (
              <div className="how-card" key={step.n}>
                <div className="n">{step.n}</div>
                <h3>{step.h}</h3>
                <p style={{ color: "var(--ink-2)", fontSize: 14, lineHeight: 1.55 }}>{step.p}</p>
                <ul>{step.points.map((pt) => <li key={pt}>{pt}</li>)}</ul>
              </div>
            ))}
          </Reveal>
        </div>
      </section>

      {/* Features */}
      <section className="section" id="features" style={{ background: "var(--bg-2)" }}>
        <div className="container">
          <Reveal>
            <span className="label">CH 03 · INSERTS</span>
            <h2>Every channel <span className="stem">earns its keep.</span></h2>
          </Reveal>
          <Reveal className="feat-grid">
            {SESHN.features.map((f) => (
              <div className="feat-card" key={f.n}>
                <div className="n">{f.n}</div>
                <h3>{f.h}</h3>
                <p>{f.p}</p>
              </div>
            ))}
          </Reveal>
        </div>
      </section>

      {/* Testimonials */}
      <section className="section">
        <div className="container">
          <Reveal>
            <span className="label">CH 04 · SENDS</span>
            <h2>From the <span className="stem">control room.</span></h2>
          </Reveal>
          <Reveal className="tg">
            {SESHN.testimonials.map((t) => (
              <div className="tcard" key={t.name}>
                <div className="stars">{stars(t.rating)}</div>
                <div className="quote">“{t.quote}”</div>
                <div className="ptag">{t.project} · {t.date}</div>
                <div className="who">
                  <span className="av">{t.ini}</span>
                  <div><div className="nm">{t.name}</div><div className="rl">{t.role}</div></div>
                </div>
              </div>
            ))}
          </Reveal>
        </div>
      </section>

      {/* Pricing */}
      <section className="section" id="pricing" style={{ background: "var(--bg-2)" }}>
        <div className="container" style={{ textAlign: "center" }}>
          <Reveal>
            <span className="label">CH 05 · MASTER OUT</span>
            <h2 style={{ marginInline: "auto" }}>Free forever. <span className="stem">Pro</span> when you mean it.</h2>
          </Reveal>
          <Reveal className="price-grid" style={{ marginTop: 30, textAlign: "left" }}>
            <div className="price-card">
              <div className="label" style={{ color: "var(--ink-3)", background: "transparent", border: "none", padding: 0 }}>FREE</div>
              <div className="amt">$0</div>
              <div style={{ color: "var(--ink-3)", fontSize: 13 }}>Permanent. Not a trial.</div>
              <ul>
                <li>Unlimited briefs &amp; applications</li>
                <li>Audio-first profile</li>
                <li>Project rooms &amp; DMs</li>
                <li>Stripe payouts — zero commission</li>
              </ul>
              <a href="/auth" className="btn" style={{ width: "100%", justifyContent: "center" }}>Start free</a>
            </div>
            <div className="price-card pro">
              <div className="label" style={{ color: "var(--accent)", background: "transparent", border: "none", padding: 0 }}>PRO · $5/MO FLAT</div>
              <div className="amt">$5<span style={{ fontSize: 16, color: "var(--ink-3)" }}>/mo</span></div>
              <div style={{ color: "var(--ink-3)", fontSize: 13 }}>Never a cut of your earnings.</div>
              <ul>
                <li>Everything in Free</li>
                <li>Verified ✓ badge</li>
                <li>Message anyone first</li>
                <li>Profile analytics</li>
                <li>1 boost credit / month</li>
              </ul>
              <a href="/auth" className="btn primary" style={{ width: "100%", justifyContent: "center" }}>Go Pro</a>
            </div>
          </Reveal>
        </div>
      </section>

      {/* Final CTA */}
      <section className="final" id="join">
        <div className="container">
          <Reveal>
            <h2>Hit <span className="stem">record.</span></h2>
            <p className="lede" style={{ margin: "0 auto 32px", textAlign: "center" }}>Post your first brief in ninety seconds. Find the people who finish your record.</p>
            <a href="/auth" className="btn primary" style={{ fontSize: 16, padding: "16px 28px" }}>▶ Start your session</a>
          </Reveal>
        </div>
      </section>
    </>
  );
}
