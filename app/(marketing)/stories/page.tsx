import type { Metadata } from "next";
import Reveal from "@/components/landing/Reveal";
import "../landing.css";
import "../pages.css";

export const metadata: Metadata = {
  title: "Stories · Seshn",
  description: "The records made on Seshn will live here, in the words of the people who made them. We're just getting started.",
};

export default function StoriesPage() {
  return (
    <>
      <section className="mk-hero">
        <div className="container">
          <Reveal>
            <span className="label">STORIES</span>
            <h1>The records made here <span className="stem">will live here.</span></h1>
            <p className="lede">
              We just opened the doors, so we&apos;re going to be straight with you. There&apos;s nothing to show off yet.
              As members post briefs, match up, and ship records, the real ones land on this page. No invented quotes,
              no stock photos, no borrowed logos. When it&apos;s real, you&apos;ll see it here.
            </p>
          </Reveal>
        </div>
      </section>

      <section className="section">
        <div className="container">
          <Reveal>
            <h2>Made something on Seshn?</h2>
            <p className="lede" style={{ maxWidth: 640 }}>
              If it started with a brief and ended with a record, tell us about it. We&apos;ll feature it here with your
              name and your work, in your words.
            </p>
            <div style={{ display: "flex", gap: 10, marginTop: 18, flexWrap: "wrap" }}>
              <a href="/auth" className="btn primary">Start your session →</a>
              <a href="/help" className="btn">Tell us your story</a>
            </div>
          </Reveal>
        </div>
      </section>
    </>
  );
}
