"use client";

import { useEffect, useRef, useState } from "react";
import {
  getUser,
  getProfile,
  upsertProfile,
  uploadAvatar,
  normalizeUrl,
} from "@/lib/seshn/profiles";
import {
  PROFILE_ROLES,
  PROFILE_GENRES,
  AVAILABILITY_OPTIONS,
  SOCIAL_PLATFORMS,
} from "@/lib/seshn/constants";
import type { Profile, SocialLinks } from "@/lib/seshn/types";
import "./onboarding.css";

const profileHref = (username: string) => `/profile/${encodeURIComponent(username)}`;

const MAX_ROLES = 3;
const MAX_GENRES = 5;

const STEPS = [
  { eyebrow: "01 · Who you are", title: "Let's set up\nyour profile." },
  { eyebrow: "02 · What you make", title: "What do you bring\nto the room?" },
  { eyebrow: "03 · Your story", title: "Tell people\nwho you are." },
  { eyebrow: "04 · Show the work", title: "Let your work\ndo the talking." },
] as const;

function initials(name?: string) {
  const parts = String(name || "").trim().split(/\s+/).filter(Boolean);
  if (parts.length === 0) return "··";
  if (parts.length >= 2) return (parts[0][0] + parts[1][0]).toUpperCase();
  return parts[0].slice(0, 2).toUpperCase();
}

// Local tag input (type, Enter/comma to add). Mirrors the profile editor's.
function TagInput({
  tags,
  onChange,
  placeholder,
  max = 20,
}: {
  tags: string[];
  onChange: (next: string[]) => void;
  placeholder?: string;
  max?: number;
}) {
  const [draft, setDraft] = useState("");
  const add = (raw: string) => {
    const v = raw.trim().replace(/,$/, "").trim();
    if (!v) return;
    if (tags.length >= max || tags.some((t) => t.toLowerCase() === v.toLowerCase())) {
      setDraft("");
      return;
    }
    onChange(tags.concat([v.slice(0, 40)]));
    setDraft("");
  };
  return (
    <div className="ob-tags">
      {tags.map((t, i) => (
        <span key={t + i} className="ob-tag">
          {t}
          <button type="button" aria-label={"Remove " + t} onClick={() => onChange(tags.filter((_, idx) => idx !== i))}>
            ×
          </button>
        </span>
      ))}
      <input
        value={draft}
        placeholder={tags.length === 0 ? placeholder : ""}
        onChange={(e) => setDraft(e.target.value)}
        onKeyDown={(e) => {
          if (e.key === "Enter" || e.key === ",") {
            e.preventDefault();
            add(draft);
          } else if (e.key === "Backspace" && !draft && tags.length) {
            onChange(tags.slice(0, -1));
          }
        }}
        onBlur={() => add(draft)}
      />
    </div>
  );
}

export default function OnboardingPage() {
  // ── flow state ──
  const [step, setStep] = useState(0);
  const [authChecked, setAuthChecked] = useState(false);
  const [saving, setSaving] = useState(false);
  const [err, setErr] = useState("");

  // ── profile fields ──
  const [displayName, setDisplayName] = useState("");
  const [username, setUsername] = useState("");
  const [avatarUrl, setAvatarUrl] = useState("");
  const [avatarPreview, setAvatarPreview] = useState("");
  const [avatarBusy, setAvatarBusy] = useState(false);
  const [roles, setRoles] = useState<Set<string>>(new Set());
  const [genres, setGenres] = useState<Set<string>>(new Set());
  const [bio, setBio] = useState("");
  const [location, setLocation] = useState("");
  const [pronouns, setPronouns] = useState("");
  const [availability, setAvailability] = useState("");
  const [skills, setSkills] = useState<string[]>([]);
  const [influences, setInfluences] = useState<string[]>([]);
  const [social, setSocial] = useState<SocialLinks>({});
  const [featuredUrl, setFeaturedUrl] = useState("");

  const fileRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    (async () => {
      let u = null;
      try {
        u = await getUser();
      } catch (e) {
        setErr("Couldn't verify your session: " + ((e as Error)?.message || e));
        return;
      }
      if (!u) {
        window.location.href = "/auth";
        return;
      }
      try {
        const p = await getProfile({ id: u.id });
        if (p && p.username) {
          window.location.href = profileHref(p.username);
          return;
        }
      } catch (e) {
        console.warn("[seshn] profile lookup failed (continuing):", e);
      }
      if (u.email) {
        const handle = u.email.split("@")[0].toLowerCase().replace(/[^a-z0-9_.-]/g, "");
        setUsername(handle.slice(0, 24));
      }
      setAuthChecked(true);
    })();
  }, []);

  const toggleRole = (role: string) =>
    setRoles((prev) => {
      const next = new Set(prev);
      if (next.has(role)) next.delete(role);
      else if (next.size < MAX_ROLES) next.add(role);
      return next;
    });
  const toggleGenre = (g: string) =>
    setGenres((prev) => {
      const next = new Set(prev);
      if (next.has(g)) next.delete(g);
      else if (next.size < MAX_GENRES) next.add(g);
      return next;
    });
  const setLink = (key: string, val: string) => setSocial((prev) => ({ ...prev, [key]: val }));

  async function onPickAvatar(e: React.ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0];
    if (fileRef.current) fileRef.current.value = "";
    if (!file) return;
    setErr("");
    const reader = new FileReader();
    reader.onload = (ev) => setAvatarPreview(ev.target?.result as string);
    reader.readAsDataURL(file);
    setAvatarBusy(true);
    try {
      const url = await uploadAvatar(file);
      setAvatarUrl(url || "");
      setAvatarPreview("");
    } catch (e2) {
      setErr((e2 as Error)?.message || "Couldn't upload that image.");
      setAvatarPreview("");
    } finally {
      setAvatarBusy(false);
    }
  }

  const usernameValid = /^[a-z0-9_.-]{2,32}$/.test(username);
  const stepValid = (() => {
    if (step === 0) return displayName.trim().length > 0 && usernameValid;
    if (step === 1) return roles.size > 0;
    return true; // steps 2 & 3 are optional
  })();
  // Minimum needed to create a profile at all (collected by end of step 1).
  const canFinish = displayName.trim().length > 0 && usernameValid && roles.size > 0;
  const isLast = step === STEPS.length - 1;

  async function finish() {
    if (!canFinish || saving) return;
    setSaving(true);
    setErr("");
    try {
      const cleanSocial: SocialLinks = {};
      for (const p of SOCIAL_PLATFORMS) {
        const v = normalizeUrl(social[p.key] || "");
        if (v) cleanSocial[p.key] = v;
      }
      const featured = featuredUrl.trim() ? [{ url: normalizeUrl(featuredUrl) }] : [];
      const profile = await upsertProfile({
        username: username.toLowerCase(),
        display_name: displayName.trim(),
        roles: Array.from(roles),
        genres: Array.from(genres),
        bio: bio.trim(),
        location: location.trim(),
        pronouns: pronouns.trim(),
        avatar_url: avatarUrl || "",
        availability: (availability || null) as Profile["availability"],
        skills,
        influences,
        social_links: cleanSocial,
        featured,
      });
      // Send brand-new members to Get Started so they grok the platform fast.
      window.location.href = "/start";
    } catch (e) {
      const ex = e as { code?: string; message?: string };
      console.error("[seshn] onboarding upsert error:", e);
      if (ex?.code === "23505") {
        setErr("That username is already taken — try another.");
        setStep(0);
      } else if (ex?.code === "42P01" || ex?.code === "PGRST205") {
        setErr("The profiles table doesn't exist yet. Run the SQL migration in your Supabase dashboard.");
      } else {
        setErr(ex?.message || "Couldn't save your profile.");
      }
      setSaving(false);
    }
  }

  function next() {
    if (!stepValid) return;
    if (isLast) finish();
    else setStep((s) => Math.min(s + 1, STEPS.length - 1));
  }
  function back() {
    setErr("");
    setStep((s) => Math.max(s - 1, 0));
  }

  const shownAvatar = avatarPreview || avatarUrl;
  const avail = AVAILABILITY_OPTIONS.find((a) => a.id === availability) || null;
  const meta = STEPS[step];

  return (
    <div className="ob-page">
      <header className="ob-top">
        <a href="/" className="logo">Seshn</a>
        <span className="ob-step-label">
          Step {step + 1} of {STEPS.length} · You can change all of this later
        </span>
      </header>

      <div className="ob-progress">
        {STEPS.map((_, i) => (
          <div
            key={i}
            className="ob-progress-seg"
            style={{ background: i <= step ? "var(--accent)" : "var(--line)" }}
          />
        ))}
      </div>

      <div className="ob-layout">
        {/* ── form column ── */}
        <main className="ob-form">
          <div className="ob-eyebrow">{meta.eyebrow}</div>
          <h1>
            {meta.title.split("\n").map((line, i) => (
              <span key={i}>
                {line}
                {i === 0 && <br />}
              </span>
            ))}
          </h1>

          {/* STEP 0 — identity */}
          {step === 0 && (
            <div className="ob-fields">
              <p className="ob-sub">A photo and a name make your profile feel real from day one.</p>
              <div className="ob-avatar-row">
                <button
                  type="button"
                  className="ob-avatar"
                  onClick={() => fileRef.current?.click()}
                  aria-label="Upload a profile photo"
                >
                  {shownAvatar ? <img src={shownAvatar} alt="" /> : <span>{initials(displayName)}</span>}
                  <span className="ob-avatar-edit">{avatarBusy ? "…" : shownAvatar ? "Change" : "Add photo"}</span>
                </button>
                <input ref={fileRef} type="file" accept="image/*" onChange={onPickAvatar} style={{ display: "none" }} />
                <div className="ob-avatar-hint">
                  <span>Upload a clear photo of you or your logo.</span>
                  <span className="ob-hint-mute">JPG, PNG, or WebP · up to 5&nbsp;MB</span>
                </div>
              </div>

              <label className="ob-label">
                Display name
                <input
                  className="ob-input"
                  type="text"
                  value={displayName}
                  onChange={(e) => setDisplayName(e.target.value)}
                  placeholder="Maya Oduya"
                  maxLength={80}
                />
              </label>

              <label className="ob-label">
                Username
                <span className="ob-username">
                  <span className="ob-username-prefix">seshn.fm/@</span>
                  <input
                    type="text"
                    value={username}
                    onChange={(e) => setUsername(e.target.value.toLowerCase().replace(/[^a-z0-9_.-]/g, ""))}
                    placeholder="maya.o"
                    maxLength={32}
                  />
                </span>
                {!usernameValid && username.length > 0 && (
                  <span className="ob-field-err">2–32 chars · lowercase letters, numbers, _ . - only.</span>
                )}
              </label>
            </div>
          )}

          {/* STEP 1 — roles + genres */}
          {step === 1 && (
            <div className="ob-fields">
              <p className="ob-sub">Pick the roles you play and the genres you live in. This tunes the gigs and people you see.</p>
              <div className="ob-group">
                <div className="ob-group-head">
                  <span className="ob-group-label">Your roles</span>
                  <span className="ob-group-count">{roles.size}/{MAX_ROLES}</span>
                </div>
                <div className="ob-chips">
                  {PROFILE_ROLES.map((role) => {
                    const sel = roles.has(role);
                    const cap = !sel && roles.size >= MAX_ROLES;
                    return (
                      <button
                        type="button"
                        key={role}
                        className={`ob-chip ${sel ? "selected" : ""} ${cap ? "disabled" : ""}`}
                        onClick={() => !cap && toggleRole(role)}
                      >
                        {sel && "✓ "}{role}
                      </button>
                    );
                  })}
                </div>
              </div>
              <div className="ob-group">
                <div className="ob-group-head">
                  <span className="ob-group-label">Genres</span>
                  <span className="ob-group-count">{genres.size}/{MAX_GENRES}</span>
                </div>
                <div className="ob-chips">
                  {PROFILE_GENRES.map((g) => {
                    const sel = genres.has(g);
                    const cap = !sel && genres.size >= MAX_GENRES;
                    return (
                      <button
                        type="button"
                        key={g}
                        className={`ob-chip ${sel ? "selected" : ""} ${cap ? "disabled" : ""}`}
                        onClick={() => !cap && toggleGenre(g)}
                      >
                        {sel && "✓ "}{g}
                      </button>
                    );
                  })}
                </div>
              </div>
            </div>
          )}

          {/* STEP 2 — about */}
          {step === 2 && (
            <div className="ob-fields">
              <p className="ob-sub">A few lines and some tags help collaborators get you fast. All optional — but they make a fuller profile.</p>
              <label className="ob-label">
                Bio
                <textarea
                  className="ob-textarea"
                  value={bio}
                  onChange={(e) => setBio(e.target.value)}
                  maxLength={2000}
                  rows={4}
                  placeholder="What you're working on, what you're looking for, who you want to collaborate with."
                />
                <span className="ob-hint-mute">{bio.length}/2000</span>
              </label>
              <div className="ob-two">
                <label className="ob-label">
                  Location
                  <input className="ob-input" value={location} onChange={(e) => setLocation(e.target.value)} maxLength={80} placeholder="London, UK" />
                </label>
                <label className="ob-label">
                  Pronouns
                  <input className="ob-input" value={pronouns} onChange={(e) => setPronouns(e.target.value)} maxLength={30} placeholder="she/her" />
                </label>
              </div>
              <div className="ob-group">
                <span className="ob-group-label">Availability</span>
                <div className="ob-chips">
                  <button type="button" className={`ob-chip ${availability === "" ? "selected" : ""}`} onClick={() => setAvailability("")}>Not set</button>
                  {AVAILABILITY_OPTIONS.map((a) => (
                    <button type="button" key={a.id} className={`ob-chip ${availability === a.id ? "selected" : ""}`} onClick={() => setAvailability(a.id)}>
                      {availability === a.id && "✓ "}{a.label}
                    </button>
                  ))}
                </div>
              </div>
              <label className="ob-label">
                Skills &amp; gear
                <TagInput tags={skills} onChange={setSkills} placeholder="Pro Tools, vocal tuning, SSL console…" max={20} />
              </label>
              <label className="ob-label">
                Sounds like / influences
                <TagInput tags={influences} onChange={setInfluences} placeholder="SZA, Fred again.., Dilla…" max={12} />
              </label>
            </div>
          )}

          {/* STEP 3 — showcase */}
          {step === 3 && (
            <div className="ob-fields">
              <p className="ob-sub">Drop links to your work. Only the ones you fill in show on your profile — but even one makes a huge difference.</p>
              <label className="ob-label">
                Featured track
                <input
                  className="ob-input"
                  type="url"
                  inputMode="url"
                  value={featuredUrl}
                  onChange={(e) => setFeaturedUrl(e.target.value)}
                  placeholder="https://open.spotify.com/track/…"
                />
                <span className="ob-hint-mute">A Spotify, SoundCloud, or YouTube link — it plays inline on your profile.</span>
              </label>
              <div className="ob-link-grid">
                {SOCIAL_PLATFORMS.map((p) => (
                  <label key={p.key} className="ob-label">
                    {p.label}
                    <input
                      className="ob-input"
                      type="url"
                      inputMode="url"
                      placeholder={p.placeholder}
                      value={social[p.key] || ""}
                      onChange={(e) => setLink(p.key, e.target.value)}
                    />
                  </label>
                ))}
              </div>
            </div>
          )}

          {err && <div className="ob-error">{err}</div>}

          <div className="ob-actions">
            {step > 0 ? (
              <button type="button" className="ob-btn-ghost" onClick={back} disabled={saving}>← Back</button>
            ) : (
              <button type="button" className="ob-btn-ghost" onClick={() => (window.location.href = "/")} disabled={saving}>Cancel</button>
            )}
            <div className="ob-actions-right">
              {step >= 1 && !isLast && (
                <button type="button" className="ob-btn-ghost" onClick={finish} disabled={!canFinish || saving}>
                  {saving ? "Saving…" : "Skip the rest"}
                </button>
              )}
              <button
                type="button"
                className="ob-btn-primary"
                onClick={next}
                disabled={!stepValid || !authChecked || saving}
              >
                {saving ? "Saving…" : isLast ? "Create profile →" : "Continue →"}
              </button>
            </div>
          </div>
        </main>

        {/* ── live preview column ── */}
        <aside className="ob-preview" aria-hidden="true">
          <span className="ob-preview-tag">Live preview</span>
          <div className="ob-preview-card">
            <div className="ob-preview-cover" />
            <div className="ob-preview-avatar">
              {shownAvatar ? <img src={shownAvatar} alt="" /> : <span>{initials(displayName)}</span>}
            </div>
            <div className="ob-preview-body">
              <div className="ob-preview-name">{displayName.trim() || "Your name"}</div>
              <div className="ob-preview-handle">seshn.fm/@{username || "username"}</div>
              <div className="ob-preview-meta">
                {avail && (
                  <span className="ob-preview-avail">
                    <span className="ob-dot" style={{ background: avail.dot }} />
                    {avail.label}
                  </span>
                )}
                {location.trim() && <span>📍 {location.trim()}</span>}
              </div>
              {(roles.size > 0 || genres.size > 0) && (
                <div className="ob-preview-pills">
                  {Array.from(roles).map((r) => <span key={r} className="ob-pill accent">{r}</span>)}
                  {Array.from(genres).map((g) => <span key={g} className="ob-pill">{g}</span>)}
                </div>
              )}
              {bio.trim() && <p className="ob-preview-bio">{bio.trim()}</p>}
              {(skills.length > 0 || influences.length > 0) && (
                <div className="ob-preview-pills subtle">
                  {skills.slice(0, 4).map((s) => <span key={s} className="ob-pill">{s}</span>)}
                  {influences.slice(0, 3).map((s) => <span key={s} className="ob-pill">{s}</span>)}
                </div>
              )}
            </div>
          </div>
          <p className="ob-preview-note">The more you add, the more collaborators trust you at a glance.</p>
        </aside>
      </div>
    </div>
  );
}
