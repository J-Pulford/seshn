import type { Metadata } from "next";
import Reveal from "@/components/landing/Reveal";
import { SESHN } from "@/lib/landing/content";
import "../landing.css";
import "../pages.css";

export const metadata: Metadata = {
  title: "Features — Seshn",
  description: "Audio-first profiles, tag-based discovery, project rooms, verified ratings, Stripe payouts, and boost. Every channel earns its keep.",
};

export default function FeaturesPage() {
  return (
    <>
      <section className="mk-hero">
        <div className="container">
          <Reveal>
            <span className="label">CH 03 · INSERTS</span>
            <h1>Every channel <span className="stem">earns its keep.</span></h1>
            <p className="lede">Six tools that replace the spreadsheet, the group chat, and the gamble. Built around the work — not the follower count.</p>
          </Reveal>
        </div>
      </section>

      <section className="section" style={{ paddingTop: 0 }}>
        <div className="container">
          {SESHN.featuresDeep.map((f) => (
            <Reveal className="fdeep-row" key={f.n}>
              <div className="num">{f.n}</div>
              <div>
                <div className="lead">{f.h}</div>
                <p className="body" style={{ marginBottom: 10 }}><strong style={{ color: "var(--ink)" }}>{f.lead}</strong></p>
                <p className="body">{f.body}</p>
              </div>
              <div className="fdeep-panel">
                <ul>{f.points.map((p) => <li key={p}>{p}</li>)}</ul>
                <div className="solves">{f.solves}</div>
              </div>
            </Reveal>
          ))}
        </div>
      </section>

      <section className="final-band">
        <div className="container">
          <Reveal>
            <h2 style={{ marginInline: "auto" }}>Try it on a <span className="stem">real brief.</span></h2>
            <a href="/auth" className="btn primary" style={{ marginTop: 10 }}>Start your session →</a>
          </Reveal>
        </div>
      </section>
    </>
  );
}
