"use client";

import { useEffect, useRef, useState, type CSSProperties } from "react";
import { useParams } from "next/navigation";
import Nav from "@/components/Nav";
import { getProfile, getUser, updateProfile, uploadAvatar, uploadCover, emitProfileUpdated } from "@/lib/seshn/profiles";
import { listGigs } from "@/lib/seshn/gigs";
import { getOrCreateConversation } from "@/lib/seshn/messaging";
import { blockUser, isUserBlocked, reportUser, unblockUser } from "@/lib/seshn/trust-safety";
import { listConnectedAccounts } from "@/lib/seshn/connected-accounts";
import type { ConnectedAccount, Gig, Profile } from "@/lib/seshn/types";
import "./profile.css";

const R = {
  settings: "/app/settings.html",
  post: "/app/post.html",
  gig: (id: string) => `/gig/${encodeURIComponent(id)}`,
  inboxConvo: (id: string) => `/app/inbox.html?c=${encodeURIComponent(id)}`,
};

const EDIT_ROLES = ["Producer", "Vocalist", "Songwriter", "Rapper", "Mixing eng.", "Mastering", "Guitarist", "Drummer", "Bassist", "Keys", "DJ", "A&R", "Composer", "Engineer"];
const EDIT_GENRES = ["Pop", "Hip-Hop", "R&B", "Afrobeats", "Soul", "Electronic", "House", "Techno", "Indie", "Rock", "Alt", "Jazz", "Country", "Latin", "Folk", "Ambient", "K-pop", "Reggaeton", "Drill", "Funk"];
const MAX_ROLES = 3;
const MAX_GENRES = 5;

function _hash(s: string) {
  let h = 2166136261 >>> 0;
  s = String(s || "x");
  for (let i = 0; i < s.length; i++) { h ^= s.charCodeAt(i); h = Math.imul(h, 16777619); }
  return h >>> 0;
}
const COVER_PALETTES = [
  ["#5b3858", "#f0e8d6", "#d96e3f"], ["#f0e8d6", "#0d0d0d", "#d96e3f"], ["#2a4d3a", "#a8ebc8", "#f6d36b"],
  ["#1f3a5f", "#f4f1e9", "#f6d36b"], ["#0d0d0d", "#c4e83a", "#a8ebc8"], ["#c43d3f", "#f0e8d6", "#0d0d0d"],
  ["#f4f1e9", "#5b3858", "#d96e3f"], ["#d96e3f", "#f0e8d6", "#0d0d0d"], ["#2CCB73", "#0d0d0d", "#f4f1e9"], ["#a8ebc8", "#2a4d3a", "#0d0d0d"],
];
function initials(name?: string) {
  if (!name) return "··";
  const parts = String(name).trim().split(/\s+/).filter(Boolean);
  if (parts.length === 0) return "··";
  if (parts.length >= 2) return (parts[0][0] + parts[1][0]).toUpperCase();
  return parts[0].slice(0, 2).toUpperCase();
}
function timeAgo(iso?: string) {
  if (!iso) return "";
  const d = new Date(iso);
  const s = Math.floor((Date.now() - d.getTime()) / 1000);
  if (s < 60) return s + "s";
  const m = Math.floor(s / 60); if (m < 60) return m + "m";
  const h = Math.floor(m / 60); if (h < 24) return h + "h";
  const days = Math.floor(h / 24); if (days < 30) return days + "d";
  return d.toLocaleDateString();
}
function compLabel(g: Gig) {
  if (g.comp === "paid" && g.pay_amount) return "Paid · $" + Number(g.pay_amount).toLocaleString();
  if (g.comp === "paid") return "Paid";
  if (g.comp === "split") return "Split";
  if (g.comp === "trade") return "Trade";
  return "Unpaid";
}

type IconKind = "pin" | "more" | "flag" | "ban";
const Icon = ({ kind, size = 16 }: { kind: IconKind; size?: number }) => {
  const c = { width: size, height: size, viewBox: "0 0 24 24", style: { display: "block" } as CSSProperties };
  const stroke = { fill: "none", stroke: "currentColor", strokeWidth: 2 };
  if (kind === "pin") return (<span style={{ display: "inline-flex" }}><svg {...c} {...stroke}><path d="M12 22s-7-7.5-7-13a7 7 0 1 1 14 0c0 5.5-7 13-7 13z" /><circle cx="12" cy="9" r="2.5" /></svg></span>);
  if (kind === "flag") return (<span style={{ display: "inline-flex" }}><svg {...c} {...stroke}><path d="M4 15s1-1 4-1 5 2 8 2 4-1 4-1V3s-1 1-4 1-5-2-8-2-4 1-4 1z" /><line x1="4" y1="22" x2="4" y2="15" /></svg></span>);
  if (kind === "ban") return (<span style={{ display: "inline-flex" }}><svg {...c} {...stroke}><circle cx="12" cy="12" r="9" /><line x1="5.6" y1="5.6" x2="18.4" y2="18.4" /></svg></span>);
  return (<span style={{ display: "inline-flex" }}><svg {...c} fill="currentColor"><circle cx="5" cy="12" r="1.8" /><circle cx="12" cy="12" r="1.8" /><circle cx="19" cy="12" r="1.8" /></svg></span>);
};

function CoverHeader({ height = 150, seed = "cover", imageUrl }: { height?: number; seed?: string; imageUrl?: string }) {
  if (imageUrl) {
    return (
      <div style={{ height, position: "relative", overflow: "hidden", background: "var(--ph)" }}>
        <img src={imageUrl} alt="" style={{ width: "100%", height: "100%", objectFit: "cover", display: "block" }} />
      </div>
    );
  }
  const pal = COVER_PALETTES[_hash(seed) % COVER_PALETTES.length];
  const [bg, fg, ac] = pal;
  return (
    <div style={{ height, position: "relative", overflow: "hidden", background: bg }}>
      <svg viewBox="0 0 400 150" width="100%" height="100%" preserveAspectRatio="xMidYMid slice" style={{ position: "absolute", inset: 0 }}>
        <circle cx="80" cy="60" r="64" fill={ac} />
        <circle cx="320" cy="80" r="44" fill={fg} opacity="0.85" />
        <rect x="0" y="120" width="400" height="6" fill={fg} />
        {Array.from({ length: 14 }).map((_, i) => (
          <circle key={i} cx={200 + i * 13} cy={40} r={5 - i * 0.3} fill={fg} opacity={0.6 - i * 0.04} />
        ))}
      </svg>
    </div>
  );
}

function GigSummary({ gig, profile }: { gig: Gig; profile: Profile }) {
  const closed = gig.status === "closed";
  return (
    <div className="gig" style={closed ? { opacity: 0.72 } : undefined}>
      <div className="row" style={{ gap: 10 }}>
        <span className="avatar md" style={{ background: "var(--ph-2)" }}>
          {initials(profile.display_name)}
          <span style={{ position: "absolute", bottom: -2, right: -2, background: "var(--frame)", borderRadius: 999, padding: "1px 4px", fontSize: 7, fontFamily: "var(--font-display)", fontWeight: 600, color: "var(--ink)", border: "1px solid var(--line)", lineHeight: 1.4, textTransform: "uppercase" }}>{profile.is_pro ? "PRO" : "ART"}</span>
        </span>
        <div className="col" style={{ flex: 1, gap: 2, minWidth: 0 }}>
          <div className="row" style={{ gap: 6, alignItems: "center" }}>
            <span style={{ fontWeight: 600, fontFamily: "var(--font-display)", fontSize: 13 }}>{profile.display_name}</span>
            <span className="dot" />
            <span className="t-meta">{timeAgo(gig.created_at)} ago</span>
            {closed && <span className="pill" style={{ marginLeft: "auto", background: "var(--ink)", color: "var(--frame)", borderColor: "transparent", fontSize: 9 }}>Closed</span>}
          </div>
          <div className="row" style={{ gap: 6 }}>
            <span className="pill accent">{gig.role} needed</span>
            <span className="t-meta">· {compLabel(gig)}</span>
          </div>
        </div>
      </div>
      <div style={{ fontFamily: "var(--font-display)", fontWeight: 600, fontSize: 16, letterSpacing: "-0.012em", lineHeight: 1.2 }}>{gig.title}</div>
      {(gig.genres || []).length > 0 && (
        <div className="row" style={{ gap: 6, flexWrap: "wrap" }}>{gig.genres.slice(0, 3).map((t) => <span key={t} className="pill">{t}</span>)}</div>
      )}
    </div>
  );
}

const REPORT_REASONS = ["Spam or scam", "Harassment or abuse", "Impersonation", "Inappropriate content", "Something else"];
function ReportModal({ targetId, targetName, onClose }: { targetId: string; targetName?: string; onClose: () => void }) {
  const [reason, setReason] = useState("");
  const [details, setDetails] = useState("");
  const [state, setState] = useState<"idle" | "sending" | "done" | "error">("idle");
  const [err, setErr] = useState("");
  async function submit() {
    if (!reason) { setErr("Pick a reason."); return; }
    setState("sending");
    setErr("");
    try {
      await reportUser(targetId, reason, details);
      setState("done");
    } catch (e) {
      setErr((e as Error)?.message || "Couldn't send the report.");
      setState("error");
    }
  }
  return (
    <div className="modal-backdrop" onClick={onClose}>
      <div onClick={(e) => e.stopPropagation()} style={{ background: "var(--surface)", borderRadius: 14, border: "1px solid var(--line)", width: "100%", maxWidth: 440, padding: 24 }}>
        {state === "done" ? (
          <>
            <h2 className="t-h2" style={{ fontSize: 20, marginBottom: 8 }}>Report received</h2>
            <p className="t-meta" style={{ lineHeight: 1.5, marginBottom: 20 }}>Thanks for flagging this. Our team reviews every report — we won&apos;t share that it came from you.</p>
            <button className="btn primary" style={{ width: "100%" }} onClick={onClose}>Done</button>
          </>
        ) : (
          <>
            <h2 className="t-h2" style={{ fontSize: 20, marginBottom: 4 }}>Report {targetName || "this user"}</h2>
            <p className="t-meta" style={{ lineHeight: 1.5, marginBottom: 16 }}>What&apos;s going on? This goes to our team — it&apos;s confidential.</p>
            <div style={{ display: "flex", flexDirection: "column", gap: 8, marginBottom: 14 }}>
              {REPORT_REASONS.map((r) => (
                <label key={r} style={{ display: "flex", alignItems: "center", gap: 10, padding: "10px 12px", borderRadius: 8, border: "1px solid " + (reason === r ? "var(--accent-d)" : "var(--line)"), background: reason === r ? "var(--accent-bg)" : "var(--surface)", cursor: "pointer", fontSize: 14, fontFamily: "var(--font-display)", fontWeight: 500 }}>
                  <input type="radio" name="reason" checked={reason === r} onChange={() => { setReason(r); setErr(""); }} />
                  {r}
                </label>
              ))}
            </div>
            <textarea value={details} onChange={(e) => setDetails(e.target.value)} placeholder="Add any detail that helps us (optional)" maxLength={2000} style={{ width: "100%", minHeight: 80, padding: "10px 12px", borderRadius: 8, border: "1px solid var(--line)", fontFamily: "var(--font-body)", fontSize: 14, resize: "vertical", marginBottom: 12 }} />
            {err && <div style={{ color: "var(--cherry)", fontSize: 13, marginBottom: 10 }}>{err}</div>}
            <div style={{ display: "flex", gap: 10 }}>
              <button className="btn" style={{ flex: 1 }} onClick={onClose} disabled={state === "sending"}>Cancel</button>
              <button className="btn primary" style={{ flex: 1 }} onClick={submit} disabled={state === "sending" || !reason}>{state === "sending" ? "Sending…" : "Submit report"}</button>
            </div>
          </>
        )}
      </div>
    </div>
  );
}

function SafetyControls({ profile }: { profile: Profile }) {
  const [open, setOpen] = useState(false);
  const [reporting, setReporting] = useState(false);
  const [blocked, setBlocked] = useState(false);
  const [busy, setBusy] = useState(false);
  const menuRef = useRef<HTMLDivElement>(null);
  useEffect(() => {
    let alive = true;
    isUserBlocked(profile.id).then((b) => { if (alive) setBlocked(b); });
    return () => { alive = false; };
  }, [profile.id]);
  useEffect(() => {
    if (!open) return;
    const onDown = (e: MouseEvent) => { if (menuRef.current && !menuRef.current.contains(e.target as Node)) setOpen(false); };
    document.addEventListener("mousedown", onDown);
    return () => document.removeEventListener("mousedown", onDown);
  }, [open]);
  async function toggleBlock() {
    setOpen(false);
    const name = profile.display_name || "this user";
    if (!blocked && !window.confirm("Block " + name + "? They won't be able to message you or apply to your gigs, and you won't be able to message them.")) return;
    setBusy(true);
    try {
      if (blocked) { await unblockUser(profile.id); setBlocked(false); }
      else { await blockUser(profile.id); setBlocked(true); }
    } catch (e) {
      alert((e as Error)?.message || "Couldn't update block.");
    } finally {
      setBusy(false);
    }
  }
  const itemStyle: CSSProperties = { display: "flex", alignItems: "center", gap: 10, width: "100%", padding: "9px 10px", border: "none", background: "none", cursor: "pointer", borderRadius: 6, fontFamily: "var(--font-display)", fontWeight: 500, fontSize: 13.5, textAlign: "left" };
  return (
    <div ref={menuRef} style={{ position: "relative" }}>
      <button className="btn" aria-label="More options" disabled={busy} style={{ backdropFilter: "blur(8px)", background: "rgba(255,255,255,0.9)", padding: "0 12px" }} onClick={() => setOpen((o) => !o)}><Icon kind="more" size={16} /></button>
      {open && (
        <div style={{ position: "absolute", right: 0, top: "calc(100% + 6px)", background: "var(--surface)", border: "1px solid var(--line)", borderRadius: 10, boxShadow: "0 8px 24px rgba(0,0,0,0.12)", padding: 6, minWidth: 180, zIndex: 40 }}>
          <button onClick={() => { setOpen(false); setReporting(true); }} style={{ ...itemStyle, color: "var(--ink)" }}><Icon kind="flag" size={15} /> Report</button>
          <button onClick={toggleBlock} style={{ ...itemStyle, color: "var(--cherry)" }}><Icon kind="ban" size={15} /> {blocked ? "Unblock" : "Block"}</button>
        </div>
      )}
      {reporting && <ReportModal targetId={profile.id} targetName={profile.display_name} onClose={() => setReporting(false)} />}
    </div>
  );
}

function EditProfileModal({ profile, onClose, onSaved }: { profile: Profile; onClose: () => void; onSaved: (p: Profile) => void }) {
  const [displayName, setDisplayName] = useState(profile.display_name || "");
  const [bio, setBio] = useState(profile.bio || "");
  const [location, setLocation] = useState(profile.location || "");
  const [pronouns, setPronouns] = useState(profile.pronouns || "");
  const [roles, setRoles] = useState<Set<string>>(new Set(profile.roles || []));
  const [genres, setGenres] = useState<Set<string>>(new Set(profile.genres || []));
  const [avatarUrl, setAvatarUrl] = useState(profile.avatar_url || "");
  const [coverUrl, setCoverUrl] = useState(profile.cover_url || "");
  const [previewSrc, setPreviewSrc] = useState("");
  const [coverPreviewSrc, setCoverPreviewSrc] = useState("");
  const [saving, setSaving] = useState(false);
  const [uploadBusy, setUploadBusy] = useState(false);
  const [coverBusy, setCoverBusy] = useState(false);
  const [err, setErr] = useState("");
  const fileInputRef = useRef<HTMLInputElement>(null);
  const coverInputRef = useRef<HTMLInputElement>(null);

  const toggleRole = (r: string) => setRoles((prev) => { const next = new Set(prev); if (next.has(r)) next.delete(r); else if (next.size < MAX_ROLES) next.add(r); return next; });
  const toggleGenre = (g: string) => setGenres((prev) => { const next = new Set(prev); if (next.has(g)) next.delete(g); else if (next.size < MAX_GENRES) next.add(g); return next; });

  async function onPickAvatar(e: React.ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0];
    if (!file) return;
    setErr("");
    const reader = new FileReader();
    reader.onload = (ev) => setPreviewSrc(ev.target?.result as string);
    reader.readAsDataURL(file);
    setUploadBusy(true);
    try {
      const url = await uploadAvatar(file);
      setAvatarUrl(url || "");
      setPreviewSrc("");
    } catch (e2) {
      setErr((e2 as Error)?.message || "Couldn't upload that image.");
      setPreviewSrc("");
    } finally {
      setUploadBusy(false);
      if (fileInputRef.current) fileInputRef.current.value = "";
    }
  }
  async function onPickCover(e: React.ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0];
    if (!file) return;
    setErr("");
    const reader = new FileReader();
    reader.onload = (ev) => setCoverPreviewSrc(ev.target?.result as string);
    reader.readAsDataURL(file);
    setCoverBusy(true);
    try {
      const url = await uploadCover(file);
      setCoverUrl(url || "");
      setCoverPreviewSrc("");
    } catch (e2) {
      setErr((e2 as Error)?.message || "Couldn't upload that image.");
      setCoverPreviewSrc("");
    } finally {
      setCoverBusy(false);
      if (coverInputRef.current) coverInputRef.current.value = "";
    }
  }
  async function save() {
    const name = displayName.trim();
    if (!name) { setErr("Display name is required."); return; }
    if (roles.size === 0) { setErr("Pick at least one role."); return; }
    setSaving(true);
    setErr("");
    try {
      const updated = await updateProfile({
        display_name: name, bio: bio.trim(), location: location.trim(), pronouns: pronouns.trim(),
        roles: Array.from(roles), genres: Array.from(genres), avatar_url: avatarUrl || "", cover_url: coverUrl || "",
      });
      emitProfileUpdated(updated);
      onSaved(updated);
    } catch (e) {
      setErr((e as Error)?.message || "Couldn't save.");
    } finally {
      setSaving(false);
    }
  }
  const shownAvatar = previewSrc || avatarUrl;

  return (
    <div className="modal-backdrop" onClick={onClose}>
      <div className="modal" onClick={(e) => e.stopPropagation()}>
        <div className="modal-header">
          <span className="t-h3">Edit profile</span>
          <button className="btn sm" onClick={onClose} aria-label="Close">Close</button>
        </div>
        <div className="modal-body">
          <div style={{ display: "flex", alignItems: "center", gap: 14 }}>
            <div className="avatar lg" style={{ background: "var(--ph-2)", overflow: "hidden", color: "var(--ink-3)" }}>
              {shownAvatar ? <img src={shownAvatar} alt="" /> : <span style={{ fontFamily: "var(--font-display)", fontWeight: 700 }}>{initials(displayName)}</span>}
            </div>
            <div style={{ display: "flex", flexDirection: "column", gap: 6 }}>
              <input ref={fileInputRef} type="file" accept="image/*" onChange={onPickAvatar} style={{ display: "none" }} />
              <div style={{ display: "flex", gap: 8 }}>
                <button className="btn sm" disabled={uploadBusy} onClick={() => fileInputRef.current?.click()}>{uploadBusy ? "Uploading…" : avatarUrl ? "Change photo" : "Upload photo"}</button>
                {avatarUrl && !uploadBusy && <button className="btn sm" onClick={() => setAvatarUrl("")}>Remove</button>}
              </div>
              <span className="field-hint">JPG/PNG/WebP, up to 5 MB.</span>
            </div>
          </div>

          <div className="field">
            <span className="field-label">Cover photo</span>
            <div style={{ position: "relative", borderRadius: 10, overflow: "hidden", border: "1px solid var(--line)", background: "var(--ph)", aspectRatio: "4 / 1", display: "flex", alignItems: "center", justifyContent: "center" }}>
              {coverPreviewSrc || coverUrl ? <img src={coverPreviewSrc || coverUrl} alt="" style={{ width: "100%", height: "100%", objectFit: "cover", display: "block" }} /> : <span className="field-hint" style={{ padding: 12, textAlign: "center" }}>No cover yet — a generated pattern is shown on your profile.</span>}
              {coverBusy && <div style={{ position: "absolute", inset: 0, background: "rgba(13,13,13,0.4)", color: "#fff", display: "flex", alignItems: "center", justifyContent: "center", fontFamily: "var(--font-display)", fontWeight: 600, fontSize: 13 }}>Uploading…</div>}
            </div>
            <input ref={coverInputRef} type="file" accept="image/*" onChange={onPickCover} style={{ display: "none" }} />
            <div style={{ display: "flex", gap: 8 }}>
              <button className="btn sm" disabled={coverBusy} onClick={() => coverInputRef.current?.click()}>{coverBusy ? "Uploading…" : coverUrl ? "Change cover" : "Upload cover"}</button>
              {coverUrl && !coverBusy && <button className="btn sm" onClick={() => setCoverUrl("")}>Remove</button>}
            </div>
            <span className="field-hint">Wide images work best (about 4:1). JPG/PNG/WebP, up to 8 MB.</span>
          </div>

          <div className="field">
            <label className="field-label" htmlFor="ep-name">Display name</label>
            <input id="ep-name" className="input" value={displayName} onChange={(e) => setDisplayName(e.target.value)} maxLength={80} placeholder="Your name" />
          </div>
          <div className="field">
            <label className="field-label" htmlFor="ep-bio">Bio</label>
            <textarea id="ep-bio" className="textarea" value={bio} onChange={(e) => setBio(e.target.value)} maxLength={2000} placeholder="What you're working on, what you're looking for, who you want to collaborate with." rows={4} />
            <span className="field-hint">{bio.length}/2000</span>
          </div>
          <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 12 }}>
            <div className="field">
              <label className="field-label" htmlFor="ep-loc">Location</label>
              <input id="ep-loc" className="input" value={location} onChange={(e) => setLocation(e.target.value)} maxLength={80} placeholder="London, UK" />
            </div>
            <div className="field">
              <label className="field-label" htmlFor="ep-pro">Pronouns</label>
              <input id="ep-pro" className="input" value={pronouns} onChange={(e) => setPronouns(e.target.value)} maxLength={30} placeholder="she/her" />
            </div>
          </div>
          <div className="field">
            <span className="field-label">Roles ({roles.size}/{MAX_ROLES})</span>
            <div className="chip-row">
              {EDIT_ROLES.map((r) => {
                const sel = roles.has(r);
                const cap = !sel && roles.size >= MAX_ROLES;
                return <span key={r} className={`chip ${sel ? "selected" : ""} ${cap ? "disabled" : ""}`} onClick={() => !cap && toggleRole(r)}>{sel && "✓ "}{r}</span>;
              })}
            </div>
          </div>
          <div className="field">
            <span className="field-label">Genres ({genres.size}/{MAX_GENRES})</span>
            <div className="chip-row">
              {EDIT_GENRES.map((g) => {
                const sel = genres.has(g);
                const cap = !sel && genres.size >= MAX_GENRES;
                return <span key={g} className={`chip ${sel ? "selected" : ""} ${cap ? "disabled" : ""}`} onClick={() => !cap && toggleGenre(g)}>{sel && "✓ "}{g}</span>;
              })}
            </div>
          </div>
          {err && <div style={{ color: "#c43d3f", fontSize: 12, fontFamily: "var(--font-display)" }}>{err}</div>}
        </div>
        <div className="modal-footer">
          <button className="btn" onClick={onClose} disabled={saving}>Cancel</button>
          <button className="btn primary" onClick={save} disabled={saving || uploadBusy || coverBusy}>{saving ? "Saving…" : "Save changes"}</button>
        </div>
      </div>
    </div>
  );
}

function ProfileView({ profile, isOwner, gigs, onProfileUpdate }: { profile: Profile; isOwner: boolean; gigs: Gig[] | null; onProfileUpdate: (p: Profile) => void }) {
  const [editing, setEditing] = useState(false);
  const [connected, setConnected] = useState<ConnectedAccount[] | null>(null);
  useEffect(() => {
    listConnectedAccounts(profile.id).then(setConnected).catch(() => setConnected([]));
  }, [profile.id]);

  return (
    <div style={{ minHeight: "100vh", background: "var(--bg)", display: "flex", flexDirection: "column" }}>
      <Nav active="profile" />

      <div style={{ position: "relative", background: "var(--surface)" }}>
        <div className="profile-cover">
          <CoverHeader seed={profile.username || "seshn-cover"} imageUrl={profile.cover_url} height={180} />
        </div>
        <div className="profile-avatar-wrap">
          <div style={{ background: "var(--frame)", padding: 4, borderRadius: "50%", boxShadow: "0 0 0 1px var(--line)" }}>
            <span className="avatar xl" style={{ background: profile.avatar_url ? "var(--ph)" : "linear-gradient(135deg,#a8ebc8,#2CCB73)", color: "#062c19", fontSize: 26, fontFamily: "var(--font-display)", fontWeight: 700, overflow: "hidden" }}>
              {profile.avatar_url ? <img src={profile.avatar_url} alt="" /> : initials(profile.display_name)}
            </span>
          </div>
        </div>
        <div className="profile-actions">
          {profile.is_pro && <span style={{ display: "inline-block", transform: "rotate(-4deg)", padding: "5px 11px", borderRadius: 4, background: "var(--ink)", color: "var(--frame)", fontFamily: "var(--font-display)", fontWeight: 700, fontSize: 11, letterSpacing: "0.04em", textTransform: "uppercase", boxShadow: "0 4px 12px rgba(0,0,0,0.18)" }}>✓ Pro · Verified</span>}
          {isOwner ? (
            <>
              <a className="btn" style={{ backdropFilter: "blur(8px)", background: "rgba(255,255,255,0.9)" }} href={R.settings}>Settings</a>
              <button className="btn primary" onClick={() => setEditing(true)}>Edit profile</button>
            </>
          ) : (
            <>
              <button className="btn primary" onClick={async () => {
                try {
                  const me = await getUser();
                  if (!me) { window.location.href = "/auth?next=" + encodeURIComponent(window.location.pathname); return; }
                  const cid = await getOrCreateConversation(profile.id);
                  window.location.href = R.inboxConvo(cid);
                } catch (e) {
                  alert((e as Error)?.message || "Couldn't start a conversation.");
                }
              }}>Message</button>
              <SafetyControls profile={profile} />
            </>
          )}
        </div>
      </div>

      <div className="profile-name-block" style={{ background: "var(--surface)", borderBottom: "1px solid var(--line)" }}>
        <div className="row" style={{ gap: 10, marginBottom: 5, flexWrap: "wrap" }}><h1 className="t-h1" style={{ fontSize: 30 }}>{profile.display_name}</h1></div>
        <div className="row" style={{ gap: 14, marginBottom: 10, flexWrap: "wrap" }}>
          {profile.location && <span className="t-meta" style={{ display: "flex", alignItems: "center", gap: 5 }}><Icon kind="pin" size={12} /> {profile.location}</span>}
          {profile.location && <span className="dot" />}
          <span className="t-meta"><span style={{ width: 7, height: 7, background: "var(--accent)", borderRadius: "50%", display: "inline-block", marginRight: 5 }} />New on Seshn</span>
        </div>
        <div className="row" style={{ gap: 6, flexWrap: "wrap" }}>
          {(profile.roles || []).map((r) => <span key={r} className="pill accent">{r}</span>)}
          {(profile.genres || []).map((g) => <span key={g} className="pill">{g}</span>)}
        </div>
      </div>

      <div className="profile-grid">
        <div className="col" style={{ gap: 28, minWidth: 0 }}>
          <section>
            <div className="t-eyebrow" style={{ marginBottom: 10 }}>Bio</div>
            <p style={{ fontSize: 14, lineHeight: 1.65, color: "var(--ink-2)", maxWidth: 680, whiteSpace: "pre-wrap" }}>
              {profile.bio || <span style={{ color: "var(--ink-3)", fontStyle: "italic" }}>No bio yet{isOwner ? " — add one in your profile settings." : "."}</span>}
            </p>
          </section>

          {connected && connected.length > 0 && (
            <section>
              <div className="t-eyebrow" style={{ marginBottom: 10 }}>Elsewhere</div>
              <div className="row" style={{ gap: 10, flexWrap: "wrap" }}>
                {connected.map((acc) => {
                  const followers = acc.stats?.followers != null ? acc.stats.followers.toLocaleString() + " followers" : null;
                  const inner = (
                    <span style={{ display: "inline-flex", alignItems: "center", gap: 8, padding: "8px 12px", borderRadius: 999, background: "var(--surface)", border: "1px solid var(--line)", fontFamily: "var(--font-display)", fontWeight: 600, fontSize: 12, color: "var(--ink)" }}>
                      <span style={{ textTransform: "capitalize", color: "var(--ink-2)" }}>{acc.provider}</span>
                      <span style={{ color: "var(--ink-4)" }}>·</span>
                      <span>{acc.display_name || acc.provider}</span>
                      {followers && <><span style={{ color: "var(--ink-4)" }}>·</span><span style={{ color: "var(--accent-d)" }}>{followers}</span></>}
                    </span>
                  );
                  return acc.profile_url ? <a key={acc.provider} href={acc.profile_url} target="_blank" rel="noopener noreferrer" style={{ textDecoration: "none" }}>{inner}</a> : <span key={acc.provider}>{inner}</span>;
                })}
              </div>
            </section>
          )}

          <section>
            <div className="row between" style={{ marginBottom: 12 }}>
              <div className="t-eyebrow">Recent posts</div>
              {isOwner && <a href={R.post} className="btn sm primary">+ Post a gig</a>}
            </div>
            <div className="col" style={{ gap: 12 }}>
              {gigs === null ? (
                <div className="t-meta" style={{ padding: "12px 0" }}>Loading…</div>
              ) : gigs.length === 0 ? (
                <div className="card" style={{ padding: 18, textAlign: "center", color: "var(--ink-3)", fontSize: 13 }}>
                  {isOwner ? <>You haven&apos;t posted any gigs yet. <a href={R.post} style={{ color: "var(--accent-d)", fontFamily: "var(--font-display)", fontWeight: 600 }}>Post your first →</a></> : "No gigs posted yet."}
                </div>
              ) : (
                gigs.map((g) => (
                  <a key={g.id} href={R.gig(g.id)} style={{ textDecoration: "none", color: "inherit" }}>
                    <GigSummary gig={g} profile={profile} />
                  </a>
                ))
              )}
            </div>
          </section>
        </div>

        <aside className="col" style={{ gap: 16, position: "sticky", top: 82, height: "fit-content" }}>
          {(profile.roles?.length || profile.genres?.length) ? (
            <div className="card" style={{ padding: 18 }}>
              {profile.roles && profile.roles.length > 0 && (
                <div style={{ marginBottom: profile.genres && profile.genres.length ? 14 : 0 }}>
                  <div className="t-eyebrow" style={{ marginBottom: 8 }}>Roles</div>
                  <div className="row" style={{ gap: 6, flexWrap: "wrap" }}>{profile.roles.map((r) => <span key={r} className="pill accent">{r}</span>)}</div>
                </div>
              )}
              {profile.genres && profile.genres.length > 0 && (
                <div>
                  <div className="t-eyebrow" style={{ marginBottom: 8 }}>Genres</div>
                  <div className="row" style={{ gap: 6, flexWrap: "wrap" }}>{profile.genres.map((g) => <span key={g} className="pill">{g}</span>)}</div>
                </div>
              )}
            </div>
          ) : null}
          <div style={{ padding: "14px 0", borderTop: "1px solid var(--line-soft)" }}>
            <div className="t-eyebrow" style={{ marginBottom: 8 }}>Share profile</div>
            <div style={{ padding: "8px 12px", background: "var(--surface-2)", borderRadius: 8, border: "1px solid var(--line)", fontSize: 11, color: "var(--ink-3)", fontFamily: "var(--font-body)" }}>seshn.fm/@{profile.username}</div>
          </div>
        </aside>
      </div>

      {editing && <EditProfileModal profile={profile} onClose={() => setEditing(false)} onSaved={(updated) => { setEditing(false); onProfileUpdate(updated); }} />}
    </div>
  );
}

export default function ProfilePage() {
  const params = useParams();
  const username = (Array.isArray(params.username) ? params.username[0] : params.username) || "";
  const [state, setState] = useState<{ status: "loading" | "ready" | "notfound" | "error"; profile: Profile | null; isOwner: boolean; gigs: Gig[] | null }>({ status: "loading", profile: null, isOwner: false, gigs: null });

  useEffect(() => {
    (async () => {
      try {
        const me = await getUser();
        const profile = username ? await getProfile({ username }) : null;
        if (!profile) {
          setState({ status: "notfound", profile: null, isOwner: false, gigs: null });
          return;
        }
        document.title = "Seshn — " + (profile.display_name || profile.username);
        const isOwner = !!(me && me.id === profile.id);
        setState({ status: "ready", profile, isOwner, gigs: null });
        try {
          const list = await listGigs({ ownerId: profile.id, limit: 8, statuses: isOwner ? ["open", "closed"] : ["open"] });
          setState((s) => ({ ...s, gigs: list }));
        } catch {
          setState((s) => ({ ...s, gigs: [] }));
        }
      } catch {
        setState({ status: "error", profile: null, isOwner: false, gigs: null });
      }
    })();
  }, [username]);

  if (state.status === "loading") {
    return <div style={{ minHeight: "100vh", display: "flex", alignItems: "center", justifyContent: "center", color: "var(--ink-3)", fontFamily: "var(--font-display)", fontSize: 13 }}>Loading profile…</div>;
  }
  if (state.status === "notfound") {
    return (
      <div style={{ minHeight: "100vh", display: "flex", flexDirection: "column", alignItems: "center", justifyContent: "center", gap: 14, padding: 24, textAlign: "center" }}>
        <span style={{ fontFamily: "var(--font-display)", fontWeight: 700, fontSize: 28, color: "var(--ink)" }}>Profile not found</span>
        <span style={{ color: "var(--ink-3)", fontSize: 14 }}>The username you&apos;re looking for doesn&apos;t exist on Seshn yet.</span>
        <a href="/" className="btn primary" style={{ marginTop: 8 }}>← Back to home</a>
      </div>
    );
  }
  if (state.status === "error" || !state.profile) {
    return <div style={{ minHeight: "100vh", display: "flex", alignItems: "center", justifyContent: "center", color: "var(--danger)", fontFamily: "var(--font-display)", fontSize: 13 }}>Couldn&apos;t load Seshn. Check your connection and refresh.</div>;
  }
  return <ProfileView profile={state.profile} isOwner={state.isOwner} gigs={state.gigs} onProfileUpdate={(updated) => setState((s) => ({ ...s, profile: updated }))} />;
}
