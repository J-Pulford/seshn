"use client";

import { useEffect, useRef, useState, type CSSProperties } from "react";
import { useParams } from "next/navigation";
import Nav from "@/components/Nav";
import { getProfile, getProfileStats, getUser, updateProfile, uploadAvatar, uploadCover, uploadGalleryImage, normalizeUrl, emitProfileUpdated } from "@/lib/seshn/profiles";
import { listGigs } from "@/lib/seshn/gigs";
import { getOrCreateConversation } from "@/lib/seshn/messaging";
import { blockUser, isUserBlocked, reportUser, unblockUser } from "@/lib/seshn/trust-safety";
import { listConnectedAccounts } from "@/lib/seshn/connected-accounts";
import { recordProfileView } from "@/lib/seshn/analytics";
import { listProfileReviews } from "@/lib/seshn/reviews";
import DirectContractModal from "@/components/DirectContractModal";
import { Stars } from "@/components/reviews/Stars";
import { SOCIAL_PLATFORMS, AVAILABILITY_OPTIONS } from "@/lib/seshn/constants";
import { embedFor } from "@/lib/seshn/embeds";
import { toast } from "@/lib/seshn/toast";
import { confirm } from "@/lib/seshn/confirm";
import { ProducerBadge } from "@/components/ProducerBadge";
import { StaffBadge } from "@/components/StaffBadge";
import type { ConnectedAccount, Credit, FeaturedItem, GalleryItem, Gig, Profile, ProfileStats, Review, Service, SocialLinks } from "@/lib/seshn/types";
import "./profile.css";

// A simple free-text tag input (type, Enter/comma to add). Used for skills,
// influences, and languages in the editor.
function TagInput({ tags, onChange, placeholder, max = 20 }: { tags: string[]; onChange: (next: string[]) => void; placeholder?: string; max?: number }) {
  const [draft, setDraft] = useState("");
  const add = (raw: string) => {
    const v = raw.trim().replace(/,$/, "").trim();
    if (!v) return;
    if (tags.length >= max || tags.some((t) => t.toLowerCase() === v.toLowerCase())) { setDraft(""); return; }
    onChange(tags.concat([v.slice(0, 40)]));
    setDraft("");
  };
  return (
    <div className="tag-input">
      {tags.map((t, i) => (
        <span key={t + i} className="tag-chip">{t}<button type="button" aria-label={"Remove " + t} onClick={() => onChange(tags.filter((_, idx) => idx !== i))}>×</button></span>
      ))}
      <input
        value={draft}
        placeholder={tags.length === 0 ? placeholder : ""}
        onChange={(e) => setDraft(e.target.value)}
        onKeyDown={(e) => {
          if (e.key === "Enter" || e.key === ",") { e.preventDefault(); add(draft); }
          else if (e.key === "Backspace" && !draft && tags.length) onChange(tags.slice(0, -1));
        }}
        onBlur={() => add(draft)}
      />
    </div>
  );
}

const R = {
  settings: "/settings",
  dashboard: "/dashboard",
  post: "/post",
  gig: (id: string) => `/gig/${encodeURIComponent(id)}`,
  inboxConvo: (id: string) => `/inbox?c=${encodeURIComponent(id)}`,
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
function memberSince(iso?: string) {
  if (!iso) return "";
  return "Member since " + new Date(iso).toLocaleDateString(undefined, { month: "long", year: "numeric" });
}
const availabilityMeta = (id?: string | null) => AVAILABILITY_OPTIONS.find((a) => a.id === id) || null;

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

function GigSummary({ gig }: { gig: Gig }) {
  const closed = gig.status === "closed";
  return (
    <div className={"gig-card" + (closed ? " closed" : "")}>
      <div className="gig-card-head">
        <span className="pill accent">{gig.role} needed</span>
        {closed && <span className="gig-closed-tag">Closed</span>}
      </div>
      <div className="gig-card-title">{gig.title}</div>
      <div className="gig-card-meta">
        <span>{compLabel(gig)}</span>
        <span className="dot" />
        <span>{timeAgo(gig.created_at)} ago</span>
        {(gig.genres || []).slice(0, 3).map((t) => <span key={t} className="pill sm">{t}</span>)}
      </div>
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
            <p className="t-meta" style={{ lineHeight: 1.5, marginBottom: 20 }}>Thanks for flagging this. Our team reviews every report, we won&apos;t share that it came from you.</p>
            <button className="btn primary" style={{ width: "100%" }} onClick={onClose}>Done</button>
          </>
        ) : (
          <>
            <h2 className="t-h2" style={{ fontSize: 20, marginBottom: 4 }}>Report {targetName || "this user"}</h2>
            <p className="t-meta" style={{ lineHeight: 1.5, marginBottom: 16 }}>What&apos;s going on? This goes to our team, it&apos;s confidential.</p>
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
    if (!blocked && !(await confirm({ title: "Block " + name + "?", message: "They won't be able to message you or apply to your gigs, and you won't be able to message them.", confirmLabel: "Block", danger: true }))) return;
    setBusy(true);
    try {
      if (blocked) { await unblockUser(profile.id); setBlocked(false); toast.success("Unblocked " + name + "."); }
      else { await blockUser(profile.id); setBlocked(true); toast.success("Blocked " + name + "."); }
    } catch (e) {
      toast.error((e as Error)?.message || "Couldn't update block.");
    } finally {
      setBusy(false);
    }
  }
  const itemStyle: CSSProperties = { display: "flex", alignItems: "center", gap: 10, width: "100%", padding: "9px 10px", border: "none", background: "none", cursor: "pointer", borderRadius: 6, fontFamily: "var(--font-display)", fontWeight: 500, fontSize: 13.5, textAlign: "left" };
  return (
    <div ref={menuRef} style={{ position: "relative" }}>
      <button className="btn" aria-label="More options" disabled={busy} style={{ backdropFilter: "blur(8px)", background: "rgba(255,255,255,0.9)", color: "#141414", borderColor: "rgba(0,0,0,0.18)", padding: "0 12px" }} onClick={() => setOpen((o) => !o)}><Icon kind="more" size={16} /></button>
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
  const [social, setSocial] = useState<SocialLinks>({ ...(profile.social_links || {}) });
  const [gallery, setGallery] = useState<GalleryItem[]>(profile.gallery ? [...profile.gallery] : []);
  const [credits, setCredits] = useState<Credit[]>(profile.credits ? [...profile.credits] : []);
  const [availability, setAvailability] = useState<string>(profile.availability || "");
  const [featured, setFeatured] = useState<FeaturedItem[]>(profile.featured ? [...profile.featured] : []);
  const [skills, setSkills] = useState<string[]>(profile.skills ? [...profile.skills] : []);
  const [influences, setInfluences] = useState<string[]>(profile.influences ? [...profile.influences] : []);
  const [languages, setLanguages] = useState<string[]>(profile.languages ? [...profile.languages] : []);
  const [services, setServices] = useState<Service[]>(profile.services ? [...profile.services] : []);
  const [galleryBusy, setGalleryBusy] = useState(false);
  const [saving, setSaving] = useState(false);
  const [uploadBusy, setUploadBusy] = useState(false);
  const [coverBusy, setCoverBusy] = useState(false);
  const [err, setErr] = useState("");
  const fileInputRef = useRef<HTMLInputElement>(null);
  const coverInputRef = useRef<HTMLInputElement>(null);
  const galleryInputRef = useRef<HTMLInputElement>(null);

  const setLink = (key: string, val: string) => setSocial((prev) => ({ ...prev, [key]: val }));
  async function onPickGallery(e: React.ChangeEvent<HTMLInputElement>) {
    const files = Array.from(e.target.files || []);
    if (galleryInputRef.current) galleryInputRef.current.value = "";
    if (!files.length) return;
    const room = 12 - gallery.length;
    if (room <= 0) { setErr("Gallery is full (12 photos max)."); return; }
    setErr("");
    setGalleryBusy(true);
    try {
      for (const file of files.slice(0, room)) {
        const url = await uploadGalleryImage(file);
        if (url) setGallery((prev) => (prev.length >= 12 ? prev : prev.concat([{ url }])));
      }
    } catch (e2) {
      setErr((e2 as Error)?.message || "Couldn't upload a photo.");
    } finally {
      setGalleryBusy(false);
    }
  }
  const removeGallery = (i: number) => setGallery((prev) => prev.filter((_, idx) => idx !== i));
  const setCaption = (i: number, caption: string) => setGallery((prev) => prev.map((g, idx) => (idx === i ? { ...g, caption } : g)));
  const addCredit = () => setCredits((prev) => (prev.length >= 30 ? prev : prev.concat([{ title: "" }])));
  const removeCredit = (i: number) => setCredits((prev) => prev.filter((_, idx) => idx !== i));
  const setCreditField = (i: number, field: keyof Credit, val: string) =>
    setCredits((prev) => prev.map((c, idx) => (idx === i ? { ...c, [field]: val } : c)));
  const addFeatured = () => setFeatured((prev) => (prev.length >= 6 ? prev : prev.concat([{ url: "" }])));
  const removeFeatured = (i: number) => setFeatured((prev) => prev.filter((_, idx) => idx !== i));
  const setFeaturedField = (i: number, field: keyof FeaturedItem, val: string) =>
    setFeatured((prev) => prev.map((f, idx) => (idx === i ? { ...f, [field]: val } : f)));
  const addService = () => setServices((prev) => (prev.length >= 12 ? prev : prev.concat([{ title: "" }])));
  const removeService = (i: number) => setServices((prev) => prev.filter((_, idx) => idx !== i));
  const setServiceField = (i: number, field: keyof Service, val: string) =>
    setServices((prev) => prev.map((s, idx) => (idx === i ? { ...s, [field]: val } : s)));

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
      // Clean the showcase + credits: normalise URLs, drop blanks.
      const cleanSocial: SocialLinks = {};
      for (const p of SOCIAL_PLATFORMS) {
        const v = normalizeUrl(social[p.key] || "");
        if (v) cleanSocial[p.key] = v;
      }
      const cleanCredits = credits
        .map((c) => ({ title: c.title.trim(), role: c.role?.trim() || undefined, year: c.year?.trim() || undefined, link: c.link ? normalizeUrl(c.link) : undefined }))
        .filter((c) => c.title);
      const cleanGallery = gallery.map((g) => ({ url: g.url, caption: g.caption?.trim() || undefined })).filter((g) => g.url);
      const cleanFeatured = featured
        .map((f) => ({ url: normalizeUrl(f.url), title: f.title?.trim() || undefined }))
        .filter((f) => f.url);
      const cleanServices = services
        .map((s) => ({ title: s.title.trim(), price: s.price?.trim() || undefined, unit: s.unit?.trim() || undefined, description: s.description?.trim() || undefined }))
        .filter((s) => s.title);
      const updated = await updateProfile({
        display_name: name, bio: bio.trim(), location: location.trim(), pronouns: pronouns.trim(),
        roles: Array.from(roles), genres: Array.from(genres), avatar_url: avatarUrl || "", cover_url: coverUrl || "",
        social_links: cleanSocial, gallery: cleanGallery, credits: cleanCredits,
        availability: (availability || null) as Profile["availability"],
        featured: cleanFeatured, skills, influences, languages, services: cleanServices,
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
              {coverPreviewSrc || coverUrl ? <img src={coverPreviewSrc || coverUrl} alt="" style={{ width: "100%", height: "100%", objectFit: "cover", display: "block" }} /> : <span className="field-hint" style={{ padding: 12, textAlign: "center" }}>No cover yet. We'll show a generated pattern on your profile.</span>}
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

          <div className="field">
            <span className="field-label">Skills &amp; gear</span>
            <TagInput tags={skills} onChange={setSkills} placeholder="Pro Tools, vocal tuning, SSL console…" max={20} />
            <span className="field-hint">What you&apos;re great at and what you work on. Press Enter to add.</span>
          </div>
          <div className="field">
            <span className="field-label">Sounds like / influences</span>
            <TagInput tags={influences} onChange={setInfluences} placeholder="SZA, Fred again.., Dilla…" max={12} />
          </div>
          <div className="field">
            <span className="field-label">Languages</span>
            <TagInput tags={languages} onChange={setLanguages} placeholder="English, Spanish…" max={10} />
          </div>

          <div className="field">
            <span className="field-label">Availability</span>
            <div className="chip-row">
              <span className={`chip ${availability === "" ? "selected" : ""}`} onClick={() => setAvailability("")}>Not set</span>
              {AVAILABILITY_OPTIONS.map((a) => (
                <span key={a.id} className={`chip ${availability === a.id ? "selected" : ""}`} onClick={() => setAvailability(a.id)}>{availability === a.id && "✓ "}{a.label}</span>
              ))}
            </div>
            <span className="field-hint">Shown as a badge on your profile so collaborators know if you&apos;re taking work.</span>
          </div>

          <div className="field">
            <span className="field-label">Showcase links</span>
            <span className="field-hint" style={{ marginBottom: 4 }}>Paste links to your work. Only the ones you fill in show on your profile.</span>
            <div className="link-grid">
              {SOCIAL_PLATFORMS.map((p) => (
                <div key={p.key} className="link-field">
                  <span className="link-label">{p.label}</span>
                  <input className="input" type="url" inputMode="url" placeholder={p.placeholder} value={social[p.key] || ""} onChange={(e) => setLink(p.key, e.target.value)} />
                </div>
              ))}
            </div>
          </div>

          <div className="field">
            <span className="field-label">Featured work ({featured.length}/6)</span>
            <span className="field-hint" style={{ marginBottom: 4 }}>Paste a Spotify, SoundCloud, or YouTube link and it plays inline on your profile.</span>
            <div className="credits-edit">
              {featured.map((f, i) => {
                const kind = f.url.trim() ? embedFor(f.url).kind : null;
                return (
                  <div key={i} className="featured-edit-row">
                    <input className="input sm" type="url" placeholder="https://open.spotify.com/track/…" value={f.url} onChange={(e) => setFeaturedField(i, "url", e.target.value)} />
                    <input className="input sm" placeholder="Label (optional)" value={f.title || ""} maxLength={80} onChange={(e) => setFeaturedField(i, "title", e.target.value)} />
                    <span className={"featured-kind " + (kind && kind !== "link" ? "ok" : "bad")}>{!f.url.trim() ? "" : kind === "link" ? "not embeddable" : kind}</span>
                    <button type="button" className="gallery-remove credit-remove" aria-label="Remove" onClick={() => removeFeatured(i)}>×</button>
                  </div>
                );
              })}
            </div>
            {featured.length < 6 && <div style={{ marginTop: featured.length ? 8 : 0 }}><button type="button" className="btn sm" onClick={addFeatured}>+ Add featured track</button></div>}
          </div>

          <div className="field">
            <span className="field-label">Photo gallery ({gallery.length}/12)</span>
            <span className="field-hint" style={{ marginBottom: 4 }}>Studio shots, live photos, gear, sessions. Show people who you are.</span>
            {gallery.length > 0 && (
              <div className="gallery-edit-grid">
                {gallery.map((g, i) => (
                  <div key={g.url} className="gallery-edit-item">
                    <div className="gallery-edit-thumb"><img src={g.url} alt="" /><button type="button" className="gallery-remove" aria-label="Remove photo" onClick={() => removeGallery(i)}>×</button></div>
                    <input className="input sm" placeholder="Caption (optional)" value={g.caption || ""} maxLength={120} onChange={(e) => setCaption(i, e.target.value)} />
                  </div>
                ))}
              </div>
            )}
            <input ref={galleryInputRef} type="file" accept="image/*" multiple onChange={onPickGallery} style={{ display: "none" }} />
            <div>
              <button type="button" className="btn sm" disabled={galleryBusy || gallery.length >= 12} onClick={() => galleryInputRef.current?.click()}>{galleryBusy ? "Uploading…" : "+ Add photos"}</button>
            </div>
            <span className="field-hint">JPG/PNG/WebP, up to 8 MB each.</span>
          </div>

          <div className="field">
            <span className="field-label">Credits &amp; discography</span>
            <span className="field-hint" style={{ marginBottom: 4 }}>Notable releases or projects you worked on. This is what builds trust fast.</span>
            <div className="credits-edit">
              {credits.map((c, i) => (
                <div key={i} className="credit-edit-row">
                  <input className="input sm credit-title" placeholder="Track / project" value={c.title} maxLength={120} onChange={(e) => setCreditField(i, "title", e.target.value)} />
                  <input className="input sm credit-role" placeholder="Your role" value={c.role || ""} maxLength={60} onChange={(e) => setCreditField(i, "role", e.target.value)} />
                  <input className="input sm credit-year" placeholder="Year" value={c.year || ""} maxLength={9} onChange={(e) => setCreditField(i, "year", e.target.value)} />
                  <input className="input sm credit-link" placeholder="Link (optional)" value={c.link || ""} onChange={(e) => setCreditField(i, "link", e.target.value)} />
                  <button type="button" className="gallery-remove credit-remove" aria-label="Remove credit" onClick={() => removeCredit(i)}>×</button>
                </div>
              ))}
            </div>
            {credits.length < 30 && <div style={{ marginTop: gallery.length ? 8 : 0 }}><button type="button" className="btn sm" onClick={addCredit}>+ Add a credit</button></div>}
          </div>

          <div className="field">
            <span className="field-label">Services &amp; rates ({services.length}/12)</span>
            <span className="field-hint" style={{ marginBottom: 4 }}>What you offer and your rates. Shown on your profile. Paid booking comes with Stripe.</span>
            <div className="credits-edit">
              {services.map((s, i) => (
                <div key={i} className="service-edit-row">
                  <input className="input sm service-title" placeholder="e.g. Mixing" value={s.title} maxLength={80} onChange={(e) => setServiceField(i, "title", e.target.value)} />
                  <input className="input sm service-price" placeholder="$200" value={s.price || ""} maxLength={20} onChange={(e) => setServiceField(i, "price", e.target.value)} />
                  <input className="input sm service-unit" placeholder="per track" value={s.unit || ""} maxLength={24} onChange={(e) => setServiceField(i, "unit", e.target.value)} />
                  <input className="input sm service-desc" placeholder="Short description (optional)" value={s.description || ""} maxLength={160} onChange={(e) => setServiceField(i, "description", e.target.value)} />
                  <button type="button" className="gallery-remove credit-remove" aria-label="Remove service" onClick={() => removeService(i)}>×</button>
                </div>
              ))}
            </div>
            {services.length < 12 && <div style={{ marginTop: services.length ? 8 : 0 }}><button type="button" className="btn sm" onClick={addService}>+ Add a service</button></div>}
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
  const [showContract, setShowContract] = useState(false);
  const [contractConvoId, setContractConvoId] = useState<string | null>(null);
  const [connected, setConnected] = useState<ConnectedAccount[] | null>(null);
  const [lightbox, setLightbox] = useState<number | null>(null);
  const [stats, setStats] = useState<ProfileStats | null>(null);
  const [reviews, setReviews] = useState<Review[] | null>(null);
  useEffect(() => {
    listConnectedAccounts(profile.id).then(setConnected).catch(() => setConnected([]));
    getProfileStats(profile.id).then(setStats).catch(() => setStats(null));
    listProfileReviews(profile.id).then(setReviews).catch(() => setReviews([]));
  }, [profile.id]);

  const social = profile.social_links || {};
  const socialItems = SOCIAL_PLATFORMS.filter((p) => social[p.key]).map((p) => ({ key: p.key as string, label: p.label, url: social[p.key] as string }));
  // OAuth-connected accounts (e.g. Spotify) whose platform isn't already a manual link.
  const extraConnected = (connected || []).filter((acc) => !socialItems.some((s) => s.key === acc.provider));
  const hasShowcase = socialItems.length > 0 || extraConnected.length > 0;
  const gallery = profile.gallery || [];
  const credits = profile.credits || [];
  const featured = (profile.featured || []).filter((f) => f.url);
  const services = profile.services || [];
  const skills = profile.skills || [];
  const influences = profile.influences || [];
  const languages = profile.languages || [];

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
              <a className="btn" style={{ backdropFilter: "blur(8px)", background: "rgba(255,255,255,0.9)", color: "#141414", borderColor: "rgba(0,0,0,0.18)" }} href={R.dashboard}>Finances</a>
              <a className="btn" style={{ backdropFilter: "blur(8px)", background: "rgba(255,255,255,0.9)", color: "#141414", borderColor: "rgba(0,0,0,0.18)" }} href={R.settings}>Settings</a>
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
                  toast.error((e as Error)?.message || "Couldn't start a conversation.");
                }
              }}>Message</button>
              <button className="btn" onClick={async () => {
                try {
                  const me = await getUser();
                  if (!me) { window.location.href = "/auth?next=" + encodeURIComponent(window.location.pathname); return; }
                  let cid: string | null = null;
                  try { cid = await getOrCreateConversation(profile.id); } catch { cid = null; }
                  setContractConvoId(cid);
                  setShowContract(true);
                } catch (e) {
                  toast.error((e as Error)?.message || "Couldn't start a contract.");
                }
              }}>Send a contract</button>
              <SafetyControls profile={profile} />
            </>
          )}
        </div>
      </div>

      <div className="profile-name-block" style={{ background: "var(--surface)", borderBottom: "1px solid var(--line)" }}>
        <div className="row" style={{ gap: 10, marginBottom: 5, flexWrap: "wrap", alignItems: "center" }}><h1 className="t-h1 page-h1" style={{ fontSize: 30 }}>{profile.display_name}</h1>{profile.is_staff && <StaffBadge />}{profile.has_producer_badge && <ProducerBadge />}</div>
        <div className="row" style={{ gap: 14, marginBottom: 10, flexWrap: "wrap", alignItems: "center" }}>
          {(() => { const a = availabilityMeta(profile.availability); return a ? (
            <span className="t-meta" style={{ display: "inline-flex", alignItems: "center", gap: 6, padding: "3px 10px", borderRadius: 999, border: "1px solid var(--line)", background: "var(--surface-2)", fontFamily: "var(--font-display)", fontWeight: 600 }}>
              <span style={{ width: 7, height: 7, background: a.dot, borderRadius: "50%", display: "inline-block" }} />{a.label}
            </span>
          ) : null; })()}
          {profile.location && <span className="t-meta" style={{ display: "flex", alignItems: "center", gap: 5 }}><Icon kind="pin" size={12} /> {profile.location}</span>}
          {profile.location && <span className="dot" />}
          <span className="t-meta">{memberSince(profile.created_at)}</span>
        </div>
        <div className="row" style={{ gap: 6, flexWrap: "wrap" }}>
          {(profile.roles || []).map((r) => <span key={r} className="pill accent">{r}</span>)}
          {(profile.genres || []).map((g) => <span key={g} className="pill">{g}</span>)}
        </div>
        {stats && (stats.gigs_posted > 0 || stats.collaborations > 0 || stats.rating_count > 0) && (
          <div className="profile-stats">
            {stats.rating_count > 0 && stats.rating_avg != null && (
              <div className="stat">
                <span className="stat-n">{Number(stats.rating_avg).toFixed(1)}</span>
                <span className="stat-l" style={{ display: "inline-flex", alignItems: "center", gap: 5 }}><Stars value={Number(stats.rating_avg)} size={12} /> {stats.rating_count} {stats.rating_count === 1 ? "review" : "reviews"}</span>
              </div>
            )}
            <div className="stat"><span className="stat-n">{stats.gigs_posted}</span><span className="stat-l">{stats.gigs_posted === 1 ? "gig posted" : "gigs posted"}</span></div>
            <div className="stat"><span className="stat-n">{stats.collaborations}</span><span className="stat-l">{stats.collaborations === 1 ? "collaboration" : "collaborations"}</span></div>
          </div>
        )}
      </div>

      <div className="profile-grid">
        <div className="col" style={{ gap: 28, minWidth: 0 }}>
          {reviews && reviews.length > 0 && (
            <section>
              <div className="t-eyebrow" style={{ marginBottom: 10, display: "flex", alignItems: "center", gap: 10 }}>
                Reviews
                {stats && stats.rating_count > 0 && stats.rating_avg != null && (
                  <span style={{ display: "inline-flex", alignItems: "center", gap: 6, color: "var(--ink-2)", fontSize: 12, fontFamily: "var(--font-body)", letterSpacing: 0, textTransform: "none" }}>
                    <Stars value={Number(stats.rating_avg)} size={14} /> {Number(stats.rating_avg).toFixed(1)} · {stats.rating_count}
                  </span>
                )}
              </div>
              <div className="profile-reviews">
                {reviews.map((r) => (
                  <div key={r.id} className="profile-review">
                    <div className="pr-head">
                      <span className="pr-av">{r.reviewer?.avatar_url ? <img src={r.reviewer.avatar_url} alt="" /> : initials(r.reviewer?.display_name || r.reviewer?.username)}</span>
                      <div className="pr-who">
                        <a className="pr-name" href={`/profile/${encodeURIComponent(r.reviewer?.username || "")}`}>{r.reviewer?.display_name || ("@" + (r.reviewer?.username || "member"))}</a>
                        <Stars value={r.rating} size={13} />
                      </div>
                      <span className="pr-date">{new Date(r.created_at).toLocaleDateString(undefined, { month: "short", year: "numeric" })}</span>
                    </div>
                    {r.body && <div className="pr-body">{r.body}</div>}
                  </div>
                ))}
              </div>
            </section>
          )}
          {featured.length > 0 && (
            <section>
              <div className="t-eyebrow" style={{ marginBottom: 10 }}>Featured work</div>
              <div className="featured-list">
                {featured.map((f, i) => {
                  const e = embedFor(f.url);
                  return (
                    <div key={i} className="featured-item">
                      {f.title && <div className="featured-title">{f.title}</div>}
                      {e.kind === "youtube" ? (
                        <div className="embed-16x9"><iframe src={e.src} title={f.title || "Featured video"} loading="lazy" allow="accelerometer; clipboard-write; encrypted-media; gyroscope; picture-in-picture; web-share" allowFullScreen /></div>
                      ) : e.kind === "link" ? (
                        <a href={e.url} target="_blank" rel="noopener noreferrer" className="social-link">Open link ↗</a>
                      ) : (
                        <iframe className="embed-player" style={{ height: e.height }} src={e.src} title={f.title || "Featured track"} loading="lazy" allow="autoplay; clipboard-write; encrypted-media; fullscreen; picture-in-picture" />
                      )}
                    </div>
                  );
                })}
              </div>
            </section>
          )}

          <section>
            <div className="t-eyebrow" style={{ marginBottom: 10 }}>Bio</div>
            <p style={{ fontSize: 14, lineHeight: 1.65, color: "var(--ink-2)", maxWidth: 680, whiteSpace: "pre-wrap" }}>
              {profile.bio || <span style={{ color: "var(--ink-3)", fontStyle: "italic" }}>No bio yet{isOwner ? ". Add one in your profile settings." : "."}</span>}
            </p>
          </section>

          {hasShowcase && (
            <section>
              <div className="t-eyebrow" style={{ marginBottom: 10 }}>Find me on</div>
              <div className="row" style={{ gap: 10, flexWrap: "wrap" }}>
                {socialItems.map((s) => (
                  <a key={s.key} href={s.url} target="_blank" rel="noopener noreferrer" className="social-link">
                    <span>{s.label}</span>
                    <span aria-hidden="true" style={{ color: "var(--ink-4)" }}>↗</span>
                  </a>
                ))}
                {extraConnected.map((acc) => {
                  const followers = acc.stats?.followers != null ? acc.stats.followers.toLocaleString() + " followers" : null;
                  const inner = (
                    <span className="social-link" style={{ background: "var(--surface)" }}>
                      <span style={{ textTransform: "capitalize" }}>{acc.provider}</span>
                      {acc.display_name && <><span style={{ color: "var(--ink-4)" }}>·</span><span style={{ color: "var(--ink-2)" }}>{acc.display_name}</span></>}
                      {followers && <><span style={{ color: "var(--ink-4)" }}>·</span><span style={{ color: "var(--accent-d)" }}>{followers}</span></>}
                    </span>
                  );
                  return acc.profile_url ? <a key={acc.provider} href={acc.profile_url} target="_blank" rel="noopener noreferrer" style={{ textDecoration: "none" }}>{inner}</a> : <span key={acc.provider}>{inner}</span>;
                })}
              </div>
            </section>
          )}

          {credits.length > 0 && (
            <section>
              <div className="t-eyebrow" style={{ marginBottom: 10 }}>Credits &amp; discography</div>
              <div className="credits-list">
                {credits.map((c, i) => {
                  const meta = [c.role, c.year].filter(Boolean).join(" · ");
                  const body = (
                    <>
                      <span className="credit-dot" aria-hidden="true" />
                      <span className="credit-name">{c.title}</span>
                      {meta && <span className="credit-meta">{meta}</span>}
                      {c.link && <span className="credit-go" aria-hidden="true">↗</span>}
                    </>
                  );
                  return c.link
                    ? <a key={i} href={c.link} target="_blank" rel="noopener noreferrer" className="credit-row is-link">{body}</a>
                    : <div key={i} className="credit-row">{body}</div>;
                })}
              </div>
            </section>
          )}

          {gallery.length > 0 && (
            <section>
              <div className="t-eyebrow" style={{ marginBottom: 10 }}>Gallery</div>
              <div className="gallery-grid">
                {gallery.map((g, i) => (
                  <button type="button" key={g.url} className="gallery-cell" onClick={() => setLightbox(i)} title={g.caption || "View photo"}>
                    <img src={g.url} alt={g.caption || ""} loading="lazy" />
                    {g.caption && <span className="gallery-cap">{g.caption}</span>}
                  </button>
                ))}
              </div>
            </section>
          )}

          {services.length > 0 && (
            <section>
              <div className="t-eyebrow" style={{ marginBottom: 10 }}>Services &amp; rates</div>
              <div className="services-grid">
                {services.map((s, i) => (
                  <div key={i} className="service-card">
                    <div className="row between" style={{ alignItems: "baseline", gap: 8 }}>
                      <span className="service-name">{s.title}</span>
                      {s.price && <span className="service-rate">{s.price}{s.unit ? <span className="service-unit"> / {s.unit}</span> : null}</span>}
                    </div>
                    {s.description && <p className="service-desc-text">{s.description}</p>}
                  </div>
                ))}
              </div>
              {!isOwner && (
                <button className="btn sm" style={{ marginTop: 10 }} onClick={async () => {
                  try {
                    const me = await getUser();
                    if (!me) { window.location.href = "/auth?next=" + encodeURIComponent(window.location.pathname); return; }
                    const cid = await getOrCreateConversation(profile.id);
                    window.location.href = R.inboxConvo(cid);
                  } catch (e) { toast.error((e as Error)?.message || "Couldn't start a conversation."); }
                }}>Message to book</button>
              )}
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
                    <GigSummary gig={g} />
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
          {(skills.length > 0 || influences.length > 0 || languages.length > 0) && (
            <div className="card" style={{ padding: 18, display: "flex", flexDirection: "column", gap: 14 }}>
              {skills.length > 0 && (
                <div>
                  <div className="t-eyebrow" style={{ marginBottom: 8 }}>Skills &amp; gear</div>
                  <div className="row" style={{ gap: 6, flexWrap: "wrap" }}>{skills.map((s) => <span key={s} className="pill">{s}</span>)}</div>
                </div>
              )}
              {influences.length > 0 && (
                <div>
                  <div className="t-eyebrow" style={{ marginBottom: 8 }}>Sounds like</div>
                  <div className="row" style={{ gap: 6, flexWrap: "wrap" }}>{influences.map((s) => <span key={s} className="pill">{s}</span>)}</div>
                </div>
              )}
              {languages.length > 0 && (
                <div>
                  <div className="t-eyebrow" style={{ marginBottom: 8 }}>Languages</div>
                  <span className="t-meta">{languages.join(" · ")}</span>
                </div>
              )}
            </div>
          )}
          <div style={{ padding: "14px 0", borderTop: "1px solid var(--line-soft)" }}>
            <div className="t-eyebrow" style={{ marginBottom: 8 }}>Share profile</div>
            <div style={{ padding: "8px 12px", background: "var(--surface-2)", borderRadius: 8, border: "1px solid var(--line)", fontSize: 11, color: "var(--ink-3)", fontFamily: "var(--font-body)" }}>seshn.fm/@{profile.username}</div>
          </div>
        </aside>
      </div>

      {editing && <EditProfileModal profile={profile} onClose={() => setEditing(false)} onSaved={(updated) => { setEditing(false); onProfileUpdate(updated); }} />}
      {showContract && (
        <DirectContractModal
          open
          onClose={() => setShowContract(false)}
          counterparty={{ id: profile.id, username: profile.username, display_name: profile.display_name }}
          conversationId={contractConvoId}
          theirServices={profile.services}
        />
      )}
      {lightbox !== null && gallery[lightbox] && (
        <div className="modal-backdrop" onClick={() => setLightbox(null)} style={{ alignItems: "center" }}>
          <div onClick={(e) => e.stopPropagation()} style={{ maxWidth: "min(92vw, 900px)", maxHeight: "90vh", display: "flex", flexDirection: "column", gap: 10 }}>
            <img src={gallery[lightbox].url} alt={gallery[lightbox].caption || ""} style={{ maxWidth: "100%", maxHeight: "78vh", objectFit: "contain", borderRadius: 10, display: "block" }} />
            <div className="row between" style={{ alignItems: "center" }}>
              <span className="t-meta" style={{ color: "#fff" }}>{gallery[lightbox].caption || ""}</span>
              <div className="row" style={{ gap: 8 }}>
                <button className="btn sm" onClick={() => setLightbox((i) => (i! - 1 + gallery.length) % gallery.length)} disabled={gallery.length < 2}>← Prev</button>
                <button className="btn sm" onClick={() => setLightbox((i) => (i! + 1) % gallery.length)} disabled={gallery.length < 2}>Next →</button>
                <button className="btn sm" onClick={() => setLightbox(null)}>Close</button>
              </div>
            </div>
          </div>
        </div>
      )}
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
        const profile = username ? await getProfile({ username, withStaff: true }) : null;
        if (!profile) {
          setState({ status: "notfound", profile: null, isOwner: false, gigs: null });
          return;
        }
        document.title = "Seshn · " + (profile.display_name || profile.username);
        const isOwner = !!(me && me.id === profile.id);
        setState({ status: "ready", profile, isOwner, gigs: null });
        if (!isOwner) void recordProfileView(profile.id);
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
