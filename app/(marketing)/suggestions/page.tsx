"use client";

import { useMemo, useState } from "react";
import Reveal from "@/components/landing/Reveal";
import { SESHN, type Suggestion } from "@/lib/landing/content";
import "../landing.css";
import "../pages.css";

const CATEGORIES = ["Profile", "Discovery", "Project Rooms", "Audio", "Mobile", "Trust", "Payouts", "Other"];

interface Item extends Suggestion { id: string; voted: boolean }

export default function SuggestionsPage() {
  const [items, setItems] = useState<Item[]>(() =>
    SESHN.suggestion_examples.map((s, i) => ({ ...s, id: "seed-" + i, voted: false })),
  );
  const [filter, setFilter] = useState<string>("All");
  const [sort, setSort] = useState<"top" | "new">("top");
  const [body, setBody] = useState("");
  const [cat, setCat] = useState(CATEGORIES[0]);
  const [email, setEmail] = useState("");
  const [ack, setAck] = useState(false);

  const tags = useMemo(() => ["All", ...Array.from(new Set(items.map((i) => i.tag)))], [items]);
  const shown = useMemo(() => {
    let arr = filter === "All" ? items : items.filter((i) => i.tag === filter);
    arr = [...arr].sort((a, b) => (sort === "top" ? b.upvotes - a.upvotes : a.id < b.id ? 1 : -1));
    return arr;
  }, [items, filter, sort]);

  function toggleVote(id: string) {
    setItems((prev) => prev.map((i) => (i.id === id ? { ...i, voted: !i.voted, upvotes: i.upvotes + (i.voted ? -1 : 1) } : i)));
  }
  function submit() {
    if (!body.trim()) return;
    const item: Item = { id: "new-" + Date.now(), body: body.trim(), tag: cat, upvotes: 1, voted: true };
    setItems((prev) => [item, ...prev]);
    setBody("");
    setEmail("");
    setAck(true);
    setTimeout(() => setAck(false), 4500);
  }

  return (
    <>
      <section className="mk-hero">
        <div className="container">
          <Reveal>
            <span className="label">SUGGESTION BOX</span>
            <h1>You shape <span className="stem">what ships.</span></h1>
            <p className="lede">Drop a feature request, upvote the ones you want, watch them move on the public roadmap. No account needed to suggest.</p>
          </Reveal>
        </div>
      </section>

      <section className="section" style={{ paddingTop: 10 }}>
        <div className="container" style={{ maxWidth: 760 }}>
          {ack && <div className="ack">Thanks — your suggestion is in. We read every one; the popular ones land on the roadmap.</div>}
          <Reveal className="composer">
            <textarea value={body} onChange={(e) => setBody(e.target.value)} placeholder="What should Seshn build next? Be specific — the clearer the ask, the faster it moves." maxLength={500} />
            <div className="row2">
              <select value={cat} onChange={(e) => setCat(e.target.value)}>
                {CATEGORIES.map((c) => <option key={c} value={c}>{c}</option>)}
              </select>
              <input type="email" value={email} onChange={(e) => setEmail(e.target.value)} placeholder="Email (optional — we'll tell you when it ships)" style={{ flex: 1, minWidth: 200 }} />
              <button className="btn primary" onClick={submit} disabled={!body.trim()}>Submit →</button>
            </div>
          </Reveal>

          <div className="chips">
            {tags.map((t) => (
              <button key={t} className={"chip" + (filter === t ? " on" : "")} onClick={() => setFilter(t)}>{t}</button>
            ))}
            <span style={{ marginLeft: "auto", display: "inline-flex", gap: 8 }}>
              <button className={"chip" + (sort === "top" ? " on" : "")} onClick={() => setSort("top")}>Top</button>
              <button className={"chip" + (sort === "new" ? " on" : "")} onClick={() => setSort("new")}>New</button>
            </span>
          </div>

          <div>
            {shown.map((s) => (
              <div className="sugg-item" key={s.id}>
                <button className={"upvote" + (s.voted ? " voted" : "")} onClick={() => toggleVote(s.id)} aria-label="Upvote">
                  <span className="uv-n">{s.upvotes}</span>
                  <span className="uv-c">▲ VOTE</span>
                </button>
                <div>
                  <div style={{ fontSize: 14, lineHeight: 1.5, color: "var(--ink)" }}>{s.body}</div>
                  <div className="stag" style={{ marginTop: 8 }}>{s.tag}</div>
                </div>
              </div>
            ))}
          </div>
          <p style={{ fontFamily: "var(--mono)", fontSize: 10, color: "var(--ink-3)", marginTop: 18 }}>
            Prototype: votes &amp; submissions are local to your browser for now.
          </p>
        </div>
      </section>
    </>
  );
}
