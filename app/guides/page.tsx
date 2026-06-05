import type { Metadata } from "next";
import Nav from "@/components/Nav";
import { GUIDES } from "@/lib/content/guides";
import "./guides.css";

export const metadata: Metadata = {
  title: "Best practices — Seshn",
  description:
    "Playbooks for getting the most out of Seshn: win more applications, write briefs that attract great collaborators, build a profile that books, price and get paid, and run a tight project room.",
};

export default function GuidesPage() {
  return (
    <div className="guides-page">
      <Nav active={null} />
      <div className="guides-wrap">
        <header className="guides-head">
          <span className="t-eyebrow">Best practices</span>
          <h1>Get the most out of Seshn</h1>
          <p>Short, practical playbooks for both sides of a collaboration — how to win the work, post briefs that pull great applicants, and optimise every part of your presence on the platform.</p>
        </header>

        <div className="guides-layout">
          <nav className="guides-toc" aria-label="Guides">
            {GUIDES.map((g) => (
              <a key={g.id} href={`#${g.id}`} className="guides-toc-link">
                <span className="guides-toc-icon">{g.icon}</span>
                <span>{g.title}</span>
              </a>
            ))}
          </nav>

          <div className="guides-content">
            {GUIDES.map((g) => (
              <section key={g.id} id={g.id} className="guide">
                <div className="guide-head">
                  <span className="guide-icon" aria-hidden="true">{g.icon}</span>
                  <div>
                    <h2>{g.title}</h2>
                    <span className="guide-audience">{g.audience}</span>
                  </div>
                </div>
                <p className="guide-summary">{g.summary}</p>
                <ol className="guide-tips">
                  {g.tips.map((t) => (
                    <li key={t.h}>
                      <strong>{t.h}</strong>
                      <span>{t.p}</span>
                    </li>
                  ))}
                </ol>
              </section>
            ))}

            <div className="guides-cta">
              <div>
                <strong>Still stuck on something?</strong>
                <span>Ask the community or the Seshn team on the help board.</span>
              </div>
              <a className="btn primary" href="/help">Go to Help &amp; community</a>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
