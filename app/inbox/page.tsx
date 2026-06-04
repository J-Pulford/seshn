"use client";

import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import type { User } from "@supabase/supabase-js";
import Nav from "@/components/Nav";
import { requireProfile } from "@/lib/seshn/auth";
import {
  listMyConversations, getConversation, listMessages, markConversationRead,
  subscribeToMessages, subscribeToMyConversations, sendMessage, uploadDmAttachment,
} from "@/lib/seshn/messaging";
import type { ConversationWithMeta, DmAttachment, GigOwner, Message } from "@/lib/seshn/types";
import MeetingScheduler from "@/components/meetings/MeetingScheduler";
import "./inbox.css";

const profileHref = (u?: string) => `/profile/${encodeURIComponent(u || "")}`;

function initials(name?: string) {
  if (!name) return "··";
  const parts = name.trim().split(/\s+/).filter(Boolean);
  if (parts.length >= 2) return (parts[0][0] + parts[1][0]).toUpperCase();
  return (parts[0] || "··").slice(0, 2).toUpperCase();
}
function formatRelativeTime(iso?: string | null) {
  if (!iso) return "";
  const t = new Date(iso);
  const now = new Date();
  if (t.toDateString() === now.toDateString()) return t.toLocaleTimeString(undefined, { hour: "numeric", minute: "2-digit" });
  const diffDays = Math.floor((now.getTime() - t.getTime()) / 86400000);
  if (diffDays < 7) return t.toLocaleDateString(undefined, { weekday: "short" });
  return t.toLocaleDateString(undefined, { month: "short", day: "numeric" });
}
const formatMessageTime = (iso: string) => new Date(iso).toLocaleTimeString(undefined, { hour: "numeric", minute: "2-digit" });
function formatSize(bytes?: number | null) {
  if (bytes == null || isNaN(bytes)) return "";
  if (bytes < 1024) return bytes + " B";
  if (bytes < 1024 * 1024) return Math.round(bytes / 1024) + " KB";
  return (bytes / (1024 * 1024)).toFixed(1).replace(/\.0$/, "") + " MB";
}
function formatDuration(ms?: number | null) {
  if (ms == null || isNaN(ms) || ms < 0) return "";
  const s = Math.round(ms / 1000);
  return Math.floor(s / 60) + ":" + (s % 60 < 10 ? "0" : "") + (s % 60);
}
const dateKey = (iso: string) => new Date(iso).toLocaleDateString(undefined, { year: "numeric", month: "short", day: "numeric" });

function ConvoListItem({ convo, isActive, onSelect }: { convo: ConversationWithMeta; isActive: boolean; onSelect: () => void }) {
  const o: Partial<GigOwner> = convo.other || {};
  const preview = convo.last_message_preview || (convo.last_message_at ? "" : "Say hi — no messages yet.");
  const sentByMe = convo.last_message_sender === convo.me_id;
  return (
    <div className={`convo-item ${isActive ? "active" : ""}`} onClick={onSelect}>
      <div className="avatar">{o.avatar_url ? <img src={o.avatar_url} alt="" /> : initials(o.display_name)}</div>
      <div className="convo-info">
        <div className="convo-name-row">
          <span className="convo-name">{o.display_name || o.username || "User"}</span>
          <span className="convo-time">{formatRelativeTime(convo.last_message_at)}</span>
        </div>
        <span className={`convo-preview ${convo.unread ? "unread" : ""}`}>
          {sentByMe && convo.last_message_preview && <span style={{ color: "var(--ink-4)" }}>You: </span>}
          {preview}
        </span>
      </div>
      {convo.unread && <div className="unread-dot" />}
    </div>
  );
}

function MessageAttachment({ msg }: { msg: Message }) {
  const label = msg.attachment_name || "attachment";
  const sizeLabel = formatSize(msg.attachment_size_bytes);
  const durLabel = formatDuration(msg.attachment_duration_ms);
  const isAudio = msg.attachment_kind === "audio";
  return (
    <div className="attachment-card">
      <div className="attachment-meta">
        <span className="attachment-name" title={label}>{label}</span>
        <span className="attachment-size">{[durLabel, sizeLabel].filter(Boolean).join(" · ") || (isAudio ? "Audio" : "File")}</span>
      </div>
      {isAudio ? (
        <audio controls preload="metadata" src={msg.attachment_url || undefined} />
      ) : (
        <a href={msg.attachment_url || undefined} target="_blank" rel="noopener noreferrer" style={{ fontSize: 12, color: "var(--accent-d)", fontFamily: "var(--font-display)", fontWeight: 600, textDecoration: "none" }}>Open file →</a>
      )}
    </div>
  );
}

function MessagesPane({ convo, messages, meId }: { convo: ConversationWithMeta; messages: Message[] | null; meId: string }) {
  const scrollRef = useRef<HTMLDivElement>(null);
  useEffect(() => {
    if (scrollRef.current) scrollRef.current.scrollTop = scrollRef.current.scrollHeight;
  }, [messages]);

  if (messages === null) return <div className="messages"><div className="t-meta">Loading…</div></div>;
  if (messages.length === 0) {
    const o: Partial<GigOwner> = convo.other || {};
    return (
      <div className="messages" ref={scrollRef}>
        <div style={{ margin: "auto", textAlign: "center", padding: 40 }}>
          <div style={{ fontFamily: "var(--font-display)", fontWeight: 600, fontSize: 16, marginBottom: 6 }}>Start the conversation with {(o.display_name || "this user").split(" ")[0]}</div>
          <div className="t-meta">No messages yet — type below to say hi.</div>
        </div>
      </div>
    );
  }
  const rendered: React.ReactNode[] = [];
  let lastDate: string | null = null;
  for (const m of messages) {
    const dk = dateKey(m.created_at);
    if (dk !== lastDate) {
      rendered.push(<div key={"d-" + dk} className="date-divider">{dk}</div>);
      lastDate = dk;
    }
    const mine = m.sender_id === meId;
    const senderName = mine ? "You" : convo.other?.display_name || "User";
    const senderInitials = mine ? initials(senderName) : initials(convo.other?.display_name);
    rendered.push(
      <div key={m.id} className={`msg-row ${mine ? "self" : ""}`}>
        <div className="avatar" style={mine ? { background: "var(--ink)", color: "var(--frame)" } : undefined}>
          {!mine && convo.other?.avatar_url ? <img src={convo.other.avatar_url} alt="" /> : senderInitials}
        </div>
        <div className="msg-content">
          <div className="msg-meta" style={mine ? { flexDirection: "row-reverse" } : undefined}>
            <span className="msg-name">{senderName}</span>
            <span className="msg-time">{formatMessageTime(m.created_at)}</span>
          </div>
          {m.body && <div className="msg-bubble" style={{ whiteSpace: "pre-wrap" }}>{m.body}</div>}
          {m.attachment_url && <MessageAttachment msg={m} />}
        </div>
      </div>
    );
  }
  return <div className="messages" ref={scrollRef}>{rendered}</div>;
}

function Composer({ onSend, placeholderName, disabled }: { onSend: (text: string, attachment: DmAttachment | null) => Promise<void>; placeholderName?: string; disabled?: boolean }) {
  const [draft, setDraft] = useState("");
  const [busy, setBusy] = useState(false);
  const [attachment, setAttachment] = useState<DmAttachment | null>(null);
  const [uploading, setUploading] = useState(false);
  const [err, setErr] = useState("");
  const fileInputRef = useRef<HTMLInputElement>(null);

  const send = async () => {
    const text = draft.trim();
    if ((!text && !attachment) || busy || uploading) return;
    setBusy(true);
    setErr("");
    try {
      await onSend(text, attachment);
      setDraft("");
      setAttachment(null);
    } catch (e) {
      setErr((e as Error)?.message || "Couldn't send.");
    } finally {
      setBusy(false);
    }
  };
  const onKey = (e: React.KeyboardEvent) => {
    if (e.key === "Enter" && !e.shiftKey) { e.preventDefault(); send(); }
  };
  async function onPickFile(e: React.ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0];
    if (fileInputRef.current) fileInputRef.current.value = "";
    if (!file) return;
    setUploading(true);
    setErr("");
    try {
      setAttachment(await uploadDmAttachment(file));
    } catch (e2) {
      setErr((e2 as Error)?.message || "Couldn't upload that file.");
    } finally {
      setUploading(false);
    }
  }
  const canSend = !disabled && !busy && !uploading && (!!draft.trim() || !!attachment);

  return (
    <div className="composer">
      {(attachment || uploading || err) && (
        <div className="composer-preview" style={{ borderColor: err ? "#c43d3f" : "var(--line)" }}>
          {uploading ? (
            <span style={{ color: "var(--ink-3)" }}>Uploading…</span>
          ) : attachment ? (
            <>
              <span style={{ flexShrink: 0, color: "var(--ink-3)" }}>{attachment.kind === "audio" ? "♪" : "📎"}</span>
              <span style={{ fontFamily: "var(--font-display)", fontWeight: 600, fontSize: 12, overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap", flex: 1, minWidth: 0 }} title={attachment.name}>{attachment.name}</span>
              <span style={{ fontSize: 10.5, color: "var(--ink-3)", flexShrink: 0 }}>{[formatDuration(attachment.duration_ms), formatSize(attachment.size_bytes)].filter(Boolean).join(" · ")}</span>
              <button onClick={() => setAttachment(null)} aria-label="Remove attachment" style={{ border: "none", background: "transparent", cursor: "pointer", padding: "2px 6px", color: "var(--ink-3)", fontSize: 14, lineHeight: 1 }}>×</button>
            </>
          ) : (
            <span style={{ color: "#c43d3f", fontSize: 12 }}>{err}</span>
          )}
        </div>
      )}
      <div className="composer-inner">
        <input ref={fileInputRef} type="file" accept="audio/*,.mp3,.wav,.m4a,.aac,.flac,.ogg,application/pdf,image/*" onChange={onPickFile} style={{ display: "none" }} />
        <button type="button" className="composer-attach" onClick={() => fileInputRef.current?.click()} disabled={disabled || busy || uploading} aria-label="Attach a file" title="Attach a file (audio, PDF, image — up to 50 MB)">
          <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="m21 12-8.5 8.5a5 5 0 1 1-7-7L14 5a3 3 0 1 1 4 4l-9 9a1 1 0 1 1-1.5-1.5L15 8" /></svg>
        </button>
        <input className="composer-input" placeholder={attachment ? "Add a caption (optional)…" : "Message " + (placeholderName ? placeholderName.split(" ")[0] : "") + "… (Enter to send)"} value={draft} onChange={(e) => setDraft(e.target.value)} onKeyDown={onKey} disabled={disabled || busy} maxLength={4000} />
        <button className="btn primary sm" onClick={send} disabled={!canSend} style={{ opacity: canSend ? 1 : 0.5 }}>{busy ? "…" : "Send"}</button>
      </div>
    </div>
  );
}

function DmPanel({ convo, meId, onMessageSent, onBack }: { convo: ConversationWithMeta | null; meId: string; onMessageSent: () => void; onBack: () => void }) {
  const [messages, setMessages] = useState<Message[] | null>(null);

  useEffect(() => {
    if (!convo) return;
    let cancelled = false;
    setMessages(null);
    listMessages(convo.id).then((list) => { if (!cancelled) setMessages(list); });
    markConversationRead(convo.id);
    const unsub = subscribeToMessages(convo.id, (msg) => {
      setMessages((prev) => {
        if (!prev) return [msg];
        if (prev.some((m) => m.id === msg.id)) return prev;
        return prev.concat(msg);
      });
      if (msg.sender_id !== meId) markConversationRead(convo.id);
    });
    return () => { cancelled = true; unsub(); };
  }, [convo, meId]);

  if (!convo) {
    return (
      <div className="dm-panel" style={{ alignItems: "center", justifyContent: "center" }}>
        <div style={{ margin: "auto", textAlign: "center", padding: 40, maxWidth: 360 }}>
          <div style={{ fontFamily: "var(--font-display)", fontWeight: 700, fontSize: 22, marginBottom: 6, color: "var(--ink)" }}>Your inbox</div>
          <div className="t-meta" style={{ fontSize: 13 }}>Pick a conversation, or find someone in Browse and hit Message to start a new one.</div>
        </div>
      </div>
    );
  }

  const o: Partial<GigOwner> = convo.other || {};
  const href = profileHref(o.username);
  const send = async (text: string, attachment: DmAttachment | null) => {
    const msg = await sendMessage(convo.id, text, attachment || undefined);
    setMessages((prev) => (prev ? prev.concat(msg) : [msg]));
    onMessageSent();
  };

  return (
    <div className="dm-panel">
      <div className="dm-header">
        <div className="dm-header-left">
          <button type="button" className="dm-back btn sm" onClick={onBack} aria-label="Back to conversations" style={{ padding: "6px 8px" }}>
            <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M15 18l-6-6 6-6" /></svg>
          </button>
          <a href={href} className="avatar md" style={{ textDecoration: "none", color: "var(--ink-3)" }}>{o.avatar_url ? <img src={o.avatar_url} alt="" /> : initials(o.display_name)}</a>
          <div>
            <div style={{ display: "flex", gap: 8, alignItems: "center", marginBottom: 3 }}>
              <a href={href} style={{ fontFamily: "var(--font-display)", fontWeight: 600, fontSize: 15, color: "var(--ink)", textDecoration: "none" }}>{o.display_name || o.username || "User"}</a>
              {o.is_pro && <span className="pill solid" style={{ fontSize: 9, padding: "2px 7px" }}>✓ Pro</span>}
            </div>
            <div className="t-meta">{o.roles?.[0] || "Artist"}{o.location ? " · " + o.location : ""}</div>
          </div>
        </div>
        <div className="dm-header-right"><a href={href} className="btn sm">View profile</a></div>
      </div>
      {convo.other?.id && (
        <MeetingScheduler
          conversationId={convo.id}
          otherUser={convo.other}
          meId={meId}
          autoOpen={typeof window !== "undefined" && new URLSearchParams(window.location.search).get("schedule") === "1"}
        />
      )}
      <MessagesPane convo={convo} messages={messages} meId={meId} />
      <Composer onSend={send} placeholderName={o.display_name || o.username || ""} />
    </div>
  );
}

export default function InboxPage() {
  const [me, setMe] = useState<User | null | undefined>(undefined);
  const [convos, setConvos] = useState<ConversationWithMeta[] | null>(null);
  const [activeId, setActiveId] = useState<string | null>(null);
  const [filter, setFilter] = useState<"all" | "unread">("all");
  const [search, setSearch] = useState("");

  const selectConvo = useCallback((id: string | null) => {
    setActiveId(id);
    const url = new URL(window.location.href);
    if (id) url.searchParams.set("c", id);
    else url.searchParams.delete("c");
    window.history.replaceState({}, "", url.toString());
  }, []);

  const refresh = useCallback(async () => {
    const list = await listMyConversations();
    setConvos(list);
    return list;
  }, []);

  useEffect(() => {
    let unsub = () => {};
    (async () => {
      const r = await requireProfile({ allowAnon: true });
      if (!r) return;
      if (!r.user) { setMe(null); return; }
      const u = r.user;
      setMe(u);
      const list = await refresh();
      const initialId = new URLSearchParams(window.location.search).get("c");
      if (initialId && list.some((c) => c.id === initialId)) {
        setActiveId(initialId);
      } else if (initialId) {
        const c = await getConversation(initialId);
        if (c) {
          setConvos((prev) => (prev || []).concat([{ ...c, unread: false, me_id: u.id }]));
          setActiveId(initialId);
        } else {
          const url = new URL(window.location.href);
          url.searchParams.delete("c");
          window.history.replaceState({}, "", url.toString());
        }
      }
      unsub = await subscribeToMyConversations(() => { refresh(); });
    })();
    return () => unsub();
  }, [refresh]);

  const activeConvo = convos && activeId ? convos.find((c) => c.id === activeId) || null : null;

  const filtered = useMemo(() => {
    if (!convos) return null;
    let arr = convos;
    if (filter === "unread") arr = arr.filter((c) => c.unread);
    if (search.trim()) {
      const s = search.trim().toLowerCase();
      arr = arr.filter((c) => {
        const o: Partial<GigOwner> = c.other || {};
        return (o.display_name || "").toLowerCase().includes(s) || (o.username || "").toLowerCase().includes(s) || (c.last_message_preview || "").toLowerCase().includes(s);
      });
    }
    return arr;
  }, [convos, filter, search]);

  const unreadCount = (convos || []).filter((c) => c.unread).length;

  if (me === undefined) {
    return (
      <div className="inbox-page">
        <Nav active="inbox" />
        <div style={{ flex: 1, display: "flex", alignItems: "center", justifyContent: "center", color: "var(--ink-3)" }}>Loading…</div>
      </div>
    );
  }
  if (me === null) {
    return (
      <div className="inbox-page">
        <Nav active="inbox" showPostButton={false} />
        <div style={{ flex: 1, display: "flex", flexDirection: "column", gap: 12, alignItems: "center", justifyContent: "center", padding: 24, textAlign: "center" }}>
          <span style={{ fontFamily: "var(--font-display)", fontWeight: 700, fontSize: 28, color: "var(--ink)" }}>Sign in to use your inbox</span>
          <span className="t-meta" style={{ fontSize: 14 }}>DMs are private to signed-in members.</span>
          <a href={"/auth?next=" + encodeURIComponent("/inbox")} className="btn primary" style={{ marginTop: 6 }}>Sign in</a>
        </div>
      </div>
    );
  }

  return (
    <div className="inbox-page">
      <Nav active="inbox" />
      <div className={"main" + (activeId ? " has-active" : "")}>
        <div className="convo-list">
          <div className="convo-header">
            <div className="convo-header-row">
              <span style={{ fontFamily: "var(--font-display)", fontWeight: 600, fontSize: 20 }}>Inbox</span>
              <span className="t-meta">{unreadCount > 0 ? unreadCount + " unread" : "All caught up"}</span>
            </div>
            <div className="search-bar">
              <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" style={{ color: "var(--ink-3)", flexShrink: 0 }}><circle cx="11" cy="11" r="7" /><path d="m20 20-3.5-3.5" /></svg>
              <input type="text" placeholder="Search conversations" value={search} onChange={(e) => setSearch(e.target.value)} style={{ flex: 1, border: 0, background: "transparent", outline: "none", fontSize: 12, fontFamily: "var(--font-body)", color: "var(--ink)" }} />
            </div>
            <div className="filter-row">
              <span className={`pill ${filter === "all" ? "solid" : ""}`} onClick={() => setFilter("all")}>All</span>
              <span className={`pill ${filter === "unread" ? "solid" : ""}`} onClick={() => setFilter("unread")}>Unread{unreadCount > 0 && " · " + unreadCount}</span>
            </div>
          </div>
          <div className="convo-scroll">
            {filtered === null ? (
              Array.from({ length: 6 }).map((_, i) => (
                <div key={i} className="row" style={{ gap: 12, padding: "14px 16px", alignItems: "center" }} aria-hidden="true">
                  <div className="skel" style={{ width: 40, height: 40, borderRadius: "50%", flex: "0 0 auto" }} />
                  <div className="col" style={{ flex: 1, gap: 7 }}>
                    <div className="skel" style={{ height: 11, width: "45%" }} />
                    <div className="skel" style={{ height: 10, width: "75%" }} />
                  </div>
                </div>
              ))
            ) : filtered.length === 0 ? (
              <div style={{ padding: 24, textAlign: "center" }}>
                <div style={{ fontFamily: "var(--font-display)", fontWeight: 600, fontSize: 14, marginBottom: 6 }}>{convos!.length === 0 ? "No conversations yet" : "Nothing here"}</div>
                <div className="t-meta" style={{ marginBottom: 12, fontSize: 12 }}>{convos!.length === 0 ? "Find someone in Browse and hit Message to say hi." : filter !== "all" ? "Try clearing the filter." : "Try a different search."}</div>
                {convos!.length === 0 && <a href="/browse" className="btn sm">Find artists</a>}
              </div>
            ) : (
              filtered.map((c) => <ConvoListItem key={c.id} convo={c} isActive={c.id === activeId} onSelect={() => selectConvo(c.id)} />)
            )}
          </div>
        </div>
        <DmPanel convo={activeConvo} meId={me.id} onMessageSent={() => refresh()} onBack={() => selectConvo(null)} />
      </div>
    </div>
  );
}
