import type { Metadata } from "next";
import Reveal from "@/components/landing/Reveal";
import { SESHN } from "@/lib/landing/content";
import "../landing.css";
import "../pages.css";

export const metadata: Metadata = {
  title: "Mission — Seshn",
  description: SESHN.mission.headline,
};

export default function MissionPage() {
  const m = SESHN.mission;
  return (
    <>
      <section className="mk-hero">
        <div className="container">
          <Reveal>
            <span className="label">{m.eyebrow.toUpperCase()}</span>
            <h1>{m.headline}</h1>
            <p className="lede" style={{ maxWidth: 720 }}>{m.statement}</p>
          </Reveal>
        </div>
      </section>

      <section className="section" style={{ paddingTop: 20 }}>
        <div className="container">
          <Reveal className="pillars">
            {m.pillars.map((p) => (
              <div className="pillar" key={p.n}>
                <div className="n">{p.n}</div>
                <h3>{p.h}</h3>
                <p>{p.b}</p>
              </div>
            ))}
          </Reveal>
        </div>
      </section>

      <section className="section" style={{ background: "var(--bg-2)" }}>
        <div className="container">
          <Reveal>
            <span className="label">CONTEXT</span>
            <h2>{m.why_now.h}</h2>
          </Reveal>
          <Reveal className="why-grid">
            <div>{m.why_now.paragraphs.slice(0, 2).map((p, i) => <p key={i}>{p}</p>)}</div>
            <div>{m.why_now.paragraphs.slice(2).map((p, i) => <p key={i}>{p}</p>)}</div>
          </Reveal>
        </div>
      </section>

      <section className="section">
        <div className="container">
          <Reveal>
            <span className="label">PLEDGE</span>
            <h2>{m.pledge.h}</h2>
          </Reveal>
          <Reveal className="pledge-grid">
            {m.pledge.points.map((p) => <div className="pledge-item" key={p}>{p}</div>)}
          </Reveal>
        </div>
      </section>

      <section className="final-band">
        <div className="container">
          <Reveal>
            <h2 style={{ marginInline: "auto" }}>Build it <span className="stem">with us.</span></h2>
            <a href="/auth" className="btn primary" style={{ marginTop: 10 }}>Start your session →</a>
          </Reveal>
        </div>
      </section>
    </>
  );
}
