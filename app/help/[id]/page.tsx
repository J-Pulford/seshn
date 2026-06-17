"use client";

import { useEffect, useRef, useState } from "react";
import { useParams } from "next/navigation";
import type { User } from "@supabase/supabase-js";
import Nav from "@/components/Nav";
import { requireProfile } from "@/lib/seshn/auth";
import {
  HELP_CATEGORIES,
  getThread,
  listReplies,
  postReply,
  setThreadStatus,
  setThreadPinned,
  amIStaff,
  subscribeToReplies,
} from "@/lib/seshn/help";
import { toast } from "@/lib/seshn/toast";
import type { HelpReply, HelpStatus, HelpThread } from "@/lib/seshn/types";
import "../help.css";

const CAT_LABEL: Record<string, string> = Object.fromEntries(HELP_CATEGORIES.map((c) => [c.value, c.label]));
function fmt(iso: string) {
  return new Date(iso).toLocaleString(undefined, { month: "short", day: "numeric", hour: "2-digit", minute: "2-digit" });
}
function initials(name?: string) {
  const p = String(name || "").trim().split(/\s+/).filter(Boolean);
  return (p.length >= 2 ? p[0][0] + p[1][0] : (p[0] || "?").slice(0, 2)).toUpperCase();
}

function Avatar({ url, name }: { url?: string; name?: string }) {
  return <span className="help-av">{url ? <img src={url} alt="" /> : initials(name)}</span>;
}

// Turn raw URLs and internal paths (e.g. /guides#win-applications) into links.
function linkify(text: string) {
  return String(text || "")
    .split(/(https?:\/\/[^\s]+|\/[A-Za-z][A-Za-z0-9/_#-]*)/g)
    .map((part, i) => {
      if (/^https?:\/\//.test(part)) return <a key={i} href={part} target="_blank" rel="noopener noreferrer">{part}</a>;
      if (/^\/[A-Za-z]/.test(part)) return <a key={i} href={part}>{part}</a>;
      return part;
    });
}

function ReplyCard({ r }: { r: HelpReply }) {
  return (
    <div className={"help-reply" + (r.is_staff_reply ? " staff" : "")}>
      <div className="help-reply-head">
        <Avatar url={r.author?.avatar_url} name={r.author?.display_name || r.author?.username} />
        <div className="help-reply-who">
          <span className="help-reply-name">
            {r.author?.display_name || r.author?.username || "Member"}
            {r.is_staff_reply && <span className="help-staff-badge">Seshn team</span>}
          </span>
          <span className="help-reply-time">{fmt(r.created_at)}</span>
        </div>
      </div>
      <div className="help-reply-body">{linkify(r.body)}</div>
    </div>
  );
}

export default function HelpThreadPage() {
  const params = useParams();
  const id = (Array.isArray(params.id) ? params.id[0] : params.id) || "";
  const [me, setMe] = useState<User | null | undefined>(undefined);
  const [staff, setStaff] = useState(false);
  const [thread, setThread] = useState<HelpThread | null | undefined>(undefined);
  const [replies, setReplies] = useState<HelpReply[]>([]);
  const [body, setBody] = useState("");
  const [busy, setBusy] = useState(false);
  const seen = useRef<Set<string>>(new Set());

  useEffect(() => {
    (async () => {
      const r = await requireProfile({ allowAnon: true });
      if (r) {
        setMe(r.user ?? null);
        if (r.user) amIStaff().then(setStaff);
      }
      const t = await getThread(id);
      setThread(t);
      if (t) {
        const rs = await listReplies(id);
        rs.forEach((x) => seen.current.add(x.id));
        setReplies(rs);
      }
    })();
  }, [id]);

  // Live replies.
  useEffect(() => {
    if (!thread) return;
    let off = () => {};
    subscribeToReplies(id, (r) => {
      if (seen.current.has(r.id)) return;
      seen.current.add(r.id);
      setReplies((prev) => [...prev, r]);
    }).then((fn) => { off = fn; });
    return () => off();
  }, [thread, id]);

  async function send() {
    setBusy(true);
    try {
      const r = await postReply(id, body);
      if (!seen.current.has(r.id)) { seen.current.add(r.id); setReplies((p) => [...p, r]); }
      setBody("");
      setThread((t) => (t ? { ...t, reply_count: t.reply_count + 1 } : t));
    } catch (e) {
      toast.error((e as Error)?.message || "Couldn't post your reply.");
    } finally {
      setBusy(false);
    }
  }

  async function changeStatus(status: HelpStatus) {
    try { await setThreadStatus(id, status); setThread((t) => (t ? { ...t, status } : t)); toast.success("Updated."); }
    catch (e) { toast.error((e as Error)?.message || "Couldn't update."); }
  }
  async function togglePin() {
    if (!thread) return;
    try { await setThreadPinned(id, !thread.pinned); setThread({ ...thread, pinned: !thread.pinned }); }
    catch (e) { toast.error((e as Error)?.message || "Couldn't update."); }
  }

  if (thread === undefined) {
    return <div className="help-page"><Nav active={null} /><div className="help-wrap"><div className="help-empty">Loading…</div></div></div>;
  }
  if (thread === null) {
    return (
      <div className="help-page"><Nav active={null} /><div className="help-wrap">
        <div className="help-empty"><div className="help-empty-title">Thread not found</div><p>It may have been removed.</p><a className="btn" href="/help" style={{ marginTop: 12 }}>← Back to Help</a></div>
      </div></div>
    );
  }

  const isAuthor = !!me && me.id === thread.author_id;
  const canModerate = staff || isAuthor;

  return (
    <div className="help-page">
      <Nav active={null} />
      <div className="help-wrap help-thread-wrap">
        <a className="help-back" href="/help">← All posts</a>

        <article className="help-thread card">
          <div className="help-thread-top">
            <span className={"help-chip cat-" + thread.category}>{CAT_LABEL[thread.category] || thread.category}</span>
            {thread.status !== "open" && <span className={"help-status " + thread.status}>{thread.status === "answered" ? "✓ Answered" : "Closed"}</span>}
            {thread.pinned && <span className="help-pin" title="Pinned">📌</span>}
          </div>
          <h1 className="help-thread-title">{thread.title}</h1>
          <div className="help-thread-byline">
            <Avatar url={thread.author?.avatar_url} name={thread.author?.display_name || thread.author?.username} />
            <span>@{thread.author?.username || "member"} · {fmt(thread.created_at)}</span>
          </div>
          <div className="help-thread-body">{linkify(thread.body)}</div>

          {canModerate && (
            <div className="help-mod">
              {thread.status !== "answered" && <button className="btn sm" onClick={() => changeStatus("answered")}>Mark answered</button>}
              {thread.status !== "closed" ? <button className="btn sm" onClick={() => changeStatus("closed")}>Close</button> : <button className="btn sm" onClick={() => changeStatus("open")}>Reopen</button>}
              {staff && <button className="btn sm" onClick={togglePin}>{thread.pinned ? "Unpin" : "Pin"}</button>}
            </div>
          )}
        </article>

        <div className="help-replies-head">{replies.length} {replies.length === 1 ? "reply" : "replies"}</div>
        <div className="help-replies">
          {replies.map((r) => <ReplyCard key={r.id} r={r} />)}
          {replies.length === 0 && <div className="help-empty sm">No replies yet, be the first to help.</div>}
        </div>

        {me ? (
          thread.status === "closed" && !staff ? (
            <div className="help-closed-note">This thread is closed. If you have a new question, start a fresh post.</div>
          ) : (
            <div className="help-reply-composer card">
              <textarea value={body} onChange={(e) => setBody(e.target.value)} rows={3} maxLength={8000} placeholder="Write a reply…" />
              <div className="help-composer-actions">
                <button className="btn primary" onClick={send} disabled={busy || !body.trim()}>{busy ? "Posting…" : "Reply"}</button>
              </div>
            </div>
          )
        ) : (
          <div className="help-closed-note"><a href={"/auth?next=" + encodeURIComponent("/help/" + id)}>Sign in</a> to reply.</div>
        )}
      </div>
    </div>
  );
}
