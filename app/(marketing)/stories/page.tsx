import type { Metadata } from "next";
import Reveal from "@/components/landing/Reveal";
import { SESHN } from "@/lib/landing/content";
import "../landing.css";
import "../pages.css";

export const metadata: Metadata = {
  title: "Stories — Seshn",
  description: "Real sessions, real records. Testimonials from the working musicians making it on Seshn, plus the Sundowner EP case study.",
};

const stars = (n: number) => "★★★★★".slice(0, n) + "☆☆☆☆☆".slice(0, 5 - n);

export default function StoriesPage() {
  return (
    <>
      <section className="mk-hero">
        <div className="container">
          <Reveal>
            <span className="label">STORIES</span>
            <h1>Records that <span className="stem">got made.</span></h1>
            <p className="lede">Not testimonials for a landing page — sessions that became songs. Here&apos;s what the work looks like on Seshn.</p>
          </Reveal>
          <Reveal className="stats-strip">
            {[["1,240", "Sessions reviewed"], ["4.9", "Avg rating"], ["7.9M", "Artists reachable"], ["38", "Cities"], ["10%", "Flat fee, all-in"]].map(([v, k]) => (
              <div className="s" key={k}><div className="v">{v}</div><div className="k">{k}</div></div>
            ))}
          </Reveal>
        </div>
      </section>

      <section className="section" style={{ paddingTop: 0 }}>
        <div className="container">
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

      <section className="section" style={{ background: "var(--bg-2)" }}>
        <div className="container">
          <Reveal>
            <span className="label">CASE STUDY</span>
            <h2>Sundowner EP — <span className="stem">made on Seshn.</span></h2>
          </Reveal>
          <Reveal className="case">
            <div>
              <p style={{ color: "var(--ink-2)", fontSize: 15, lineHeight: 1.65 }}>
                Nia Kassim posted one brief: a vocalist looking for a producer and a mixing engineer for a 4-track EP. Within three weeks she&apos;d matched with Lina Vega (CDMX) and Sam Park (LA), tracked remotely through a single project room, and shipped the record. Two of the collaborators ended up on her live band.
              </p>
              <p style={{ color: "var(--ink-3)", fontSize: 13, marginTop: 14, fontFamily: "var(--mono)" }}>Brief → matched → tracked → mixed → shipped. One workspace.</p>
            </div>
            <div className="case-stats">
              {[["3 wks", "Brief to first track"], ["3", "Cities, one room"], ["9", "Applications in 24h"], ["5.0", "Avg session rating"]].map(([v, k]) => (
                <div className="cs" key={k}><div className="v">{v}</div><div className="k">{k}</div></div>
              ))}
            </div>
          </Reveal>
        </div>
      </section>

      <section className="final-band">
        <div className="container">
          <Reveal>
            <h2 style={{ marginInline: "auto" }}>Your record is <span className="stem">next.</span></h2>
            <a href="/auth" className="btn primary" style={{ marginTop: 10 }}>Start your session →</a>
          </Reveal>
        </div>
      </section>
    </>
  );
}
