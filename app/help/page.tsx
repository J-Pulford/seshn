"use client";

import { useEffect, useState } from "react";
import type { User } from "@supabase/supabase-js";
import Nav from "@/components/Nav";
import { requireProfile } from "@/lib/seshn/auth";
import { HELP_CATEGORIES, listThreads, createThread } from "@/lib/seshn/help";
import { toast } from "@/lib/seshn/toast";
import type { HelpCategory, HelpThread } from "@/lib/seshn/types";
import "./help.css";

function timeAgo(iso: string): string {
  const s = Math.floor((Date.now() - new Date(iso).getTime()) / 1000);
  if (s < 60) return "just now";
  const m = Math.floor(s / 60); if (m < 60) return `${m}m ago`;
  const h = Math.floor(m / 60); if (h < 24) return `${h}h ago`;
  const d = Math.floor(h / 24); if (d < 7) return `${d}d ago`;
  return new Date(iso).toLocaleDateString(undefined, { month: "short", day: "numeric" });
}

const CAT_LABEL: Record<string, string> = Object.fromEntries(HELP_CATEGORIES.map((c) => [c.value, c.label]));

export function CategoryChip({ cat }: { cat: string }) {
  return <span className={"help-chip cat-" + cat}>{CAT_LABEL[cat] || cat}</span>;
}
export function StatusChip({ status }: { status: string }) {
  if (status === "open") return null;
  return <span className={"help-status " + status}>{status === "answered" ? "✓ Answered" : "Closed"}</span>;
}

function Composer({ onCreated }: { onCreated: (t: HelpThread) => void }) {
  const [open, setOpen] = useState(false);
  const [category, setCategory] = useState<HelpCategory>("question");
  const [title, setTitle] = useState("");
  const [body, setBody] = useState("");
  const [busy, setBusy] = useState(false);

  async function submit() {
    setBusy(true);
    try {
      const t = await createThread({ category, title, body });
      toast.success("Posted.");
      onCreated(t);
    } catch (e) {
      toast.error((e as Error)?.message || "Couldn't post.");
    } finally {
      setBusy(false);
    }
  }

  if (!open) {
    return (
      <button className="btn primary" onClick={() => setOpen(true)}>+ New post</button>
    );
  }
  return (
    <div className="help-composer card">
      <div className="help-field">
        <label>Category</label>
        <div className="help-cat-pick">
          {HELP_CATEGORIES.map((c) => (
            <button key={c.value} type="button" className={"help-cat-btn" + (category === c.value ? " is-active" : "")} onClick={() => setCategory(c.value)} title={c.blurb}>{c.label}</button>
          ))}
        </div>
      </div>
      <div className="help-field">
        <label>Title</label>
        <input value={title} onChange={(e) => setTitle(e.target.value)} maxLength={160} placeholder="Short and specific — e.g. ‘How do I release an escrow early?’" />
      </div>
      <div className="help-field">
        <label>Details</label>
        <textarea value={body} onChange={(e) => setBody(e.target.value)} maxLength={8000} rows={5} placeholder="Add the detail. If it's a bug, what did you do, what happened, what did you expect?" />
      </div>
      <div className="help-composer-actions">
        <button className="btn primary" onClick={submit} disabled={busy || title.trim().length < 3 || !body.trim()}>{busy ? "Posting…" : "Post"}</button>
        <button className="btn" onClick={() => setOpen(false)} disabled={busy}>Cancel</button>
      </div>
    </div>
  );
}

export default function HelpPage() {
  const [me, setMe] = useState<User | null | undefined>(undefined);
  const [cat, setCat] = useState<HelpCategory | "all">("all");
  const [threads, setThreads] = useState<HelpThread[] | null>(null);

  useEffect(() => {
    (async () => {
      const r = await requireProfile({ allowAnon: true });
      if (r) setMe(r.user ?? null);
    })();
  }, []);

  useEffect(() => {
    setThreads(null);
    listThreads({ category: cat }).then(setThreads);
  }, [cat]);

  return (
    <div className="help-page">
      <Nav active={null} />
      <div className="help-wrap">
        <header className="help-head">
          <div>
            <span className="t-eyebrow">Help &amp; community</span>
            <h1>Ask, report, and shape Seshn</h1>
            <p>Questions, bug reports, feedback, and feature ideas — in the open. The Seshn team replies here, and so does the community.</p>
          </div>
          {me ? <Composer onCreated={(t) => (window.location.href = `/help/${t.id}`)} /> : <a className="btn primary" href={"/auth?next=" + encodeURIComponent("/help")}>Sign in to post</a>}
        </header>

        <div className="help-tabs" role="tablist">
          <button role="tab" aria-selected={cat === "all"} className={"help-tab" + (cat === "all" ? " is-active" : "")} onClick={() => setCat("all")}>All</button>
          {HELP_CATEGORIES.map((c) => (
            <button key={c.value} role="tab" aria-selected={cat === c.value} className={"help-tab" + (cat === c.value ? " is-active" : "")} onClick={() => setCat(c.value)}>{c.label}</button>
          ))}
        </div>

        {threads === null ? (
          <div className="help-empty">Loading threads…</div>
        ) : threads.length === 0 ? (
          <div className="help-empty">
            <div className="help-empty-title">No posts here yet</div>
            <p>{cat === "all" ? "Be the first to ask a question or share feedback." : "Nothing in this category yet — start the conversation."}</p>
          </div>
        ) : (
          <div className="help-list">
            {threads.map((t) => (
              <a key={t.id} className={"help-row" + (t.pinned ? " pinned" : "")} href={`/help/${t.id}`}>
                <div className="help-row-main">
                  <div className="help-row-top">
                    {t.pinned && <span className="help-pin" title="Pinned">📌</span>}
                    <CategoryChip cat={t.category} />
                    <span className="help-row-title">{t.title}</span>
                    <StatusChip status={t.status} />
                  </div>
                  <div className="help-row-meta">
                    @{t.author?.username || "member"} · {timeAgo(t.last_activity_at)}
                  </div>
                </div>
                <div className="help-row-replies"><strong>{t.reply_count}</strong><span>{t.reply_count === 1 ? "reply" : "replies"}</span></div>
              </a>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}
