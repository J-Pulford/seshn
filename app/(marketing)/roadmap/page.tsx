import type { Metadata } from "next";
import Reveal from "@/components/landing/Reveal";
import { SESHN } from "@/lib/landing/content";
import "../landing.css";
import "../pages.css";

export const metadata: Metadata = {
  title: "Roadmap — Seshn",
  description: "What's shipped, in progress, in design, and on the horizon. Public roadmap + changelog.",
};

const CHANGELOG: [string, string][] = [
  ["May 28", "Verified ✓ badges live for Pro members."],
  ["May 21", "Refer-a-collaborator credits — both sides get a month of Pro."],
  ["May 14", "Inline waveform comments shipped to Audio Studio v2 beta."],
  ["May 06", "Realtime inbox unread + notification badges."],
  ["Apr 29", "Report / block + trust & safety controls across profiles and gigs."],
];

export default function RoadmapPage() {
  return (
    <>
      <section className="mk-hero">
        <div className="container">
          <Reveal>
            <span className="label">PUBLIC ROADMAP</span>
            <h1>Built in <span className="stem">public.</span></h1>
            <p className="lede">Every feature ships because someone needed it on a Tuesday at 11pm. Here&apos;s what&apos;s next — and where it stands.</p>
          </Reveal>
          <Reveal className="legend">
            <span className="dotk"><span className="sw" style={{ background: "var(--accent)" }} /> shipped</span>
            <span className="dotk"><span className="sw" style={{ background: "var(--warn)" }} /> in progress</span>
            <span className="dotk"><span className="sw" style={{ background: "var(--bus)" }} /> in design</span>
            <span className="dotk"><span className="sw" style={{ background: "var(--ink-3)" }} /> exploring</span>
          </Reveal>
        </div>
      </section>

      <section className="section" style={{ paddingTop: 10 }}>
        <div className="container">
          <Reveal className="rm-grid">
            {SESHN.roadmap.map((q) => (
              <div className={"rm-quarter " + q.tone} key={q.q}>
                <div className="q">{q.q}</div>
                <div className="status">{q.status}</div>
                <h3 style={{ fontSize: 18 }}>{q.h}</h3>
                <p style={{ color: "var(--ink-3)", fontSize: 12.5, marginBottom: 6 }}>{q.tagline}</p>
                {q.items.map((it) => (
                  <div className="rm-item" key={it.title}>
                    <div className="it-title">
                      <span>{it.title}</span>
                      {it.state && <span className={"state-badge state-" + it.state}>{it.state.replace("-", " ")}</span>}
                    </div>
                    <div className="it-desc">{it.desc}</div>
                  </div>
                ))}
              </div>
            ))}
          </Reveal>

          <Reveal className="changelog">
            <span className="label">CHANGELOG · LAST 30 DAYS</span>
            <div style={{ marginTop: 10 }}>
              {CHANGELOG.map(([d, t]) => (
                <div className="cl-row" key={d}>
                  <span className="cl-date">{d}</span>
                  <span style={{ color: "var(--ink-2)" }}>{t}</span>
                </div>
              ))}
            </div>
          </Reveal>
        </div>
      </section>

      <section className="final-band">
        <div className="container">
          <Reveal>
            <h2 style={{ marginInline: "auto" }}>Shape what ships <span className="stem">next.</span></h2>
            <a href="/suggestions" className="btn primary" style={{ marginTop: 10 }}>Suggest a feature →</a>
          </Reveal>
        </div>
      </section>
    </>
  );
}
