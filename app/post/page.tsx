"use client";

import { useState, useEffect, type CSSProperties } from "react";
import { requireProfile } from "@/lib/seshn/auth";
import { createGig } from "@/lib/seshn/gigs";
import { uploadGigCover } from "@/lib/seshn/profiles";
import { GIG_ROLES, GIG_GENRES, COMP_OPTIONS } from "@/lib/seshn/constants";
import type { CompType } from "@/lib/seshn/constants";
import type { Profile } from "@/lib/seshn/types";
import "./post.css";

const QUICK_LOCATIONS = ["Remote", "NYC", "LA", "London", "Berlin"];
const initialsOf = (name?: string) => (name || "··").split(/\s+/).map((s) => s[0]).join("").slice(0, 2).toUpperCase();

export default function PostPage() {
  const [step, setStep] = useState(1);
  const [title, setTitle] = useState("");
  const [description, setDescription] = useState("");
  const [selRole, setSelRole] = useState("");
  const [selGenres, setSelGenres] = useState<Set<string>>(new Set());
  const [selComp, setSelComp] = useState<CompType | "">("");
  const [amount, setAmount] = useState("");
  const [deadline, setDeadline] = useState("");
  const [location, setLocation] = useState("");
  const [coverFile, setCoverFile] = useState<File | null>(null);
  const [coverPreview, setCoverPreview] = useState("");
  const [me, setMe] = useState<Profile | null>(null);
  const [authState, setAuthState] = useState<"checking" | "ready">("checking");
  const [publishing, setPublishing] = useState(false);
  const [err, setErr] = useState("");
  const [tried, setTried] = useState(false);

  useEffect(() => {
    (async () => {
      const r = await requireProfile();
      if (!r || !r.profile) return; // redirected to auth/onboarding
      setMe(r.profile);
      setAuthState("ready");
    })();
  }, []);

  function onCoverPick(e: React.ChangeEvent<HTMLInputElement>) {
    const f = e.target.files?.[0];
    if (!f) return;
    if (!f.type || !f.type.startsWith("image/")) { setErr("Cover must be an image (jpg, png, webp, gif)."); return; }
    if (f.size > 8 * 1024 * 1024) { setErr("Cover image must be under 8 MB."); return; }
    setCoverFile(f);
    setCoverPreview(URL.createObjectURL(f));
    setErr("");
  }
  function clearCover() {
    setCoverFile(null);
    if (coverPreview) URL.revokeObjectURL(coverPreview);
    setCoverPreview("");
  }

  const toggleGenre = (g: string) =>
    setSelGenres((prev) => {
      const next = new Set(prev);
      if (next.has(g)) next.delete(g);
      else if (next.size < 3) next.add(g);
      return next;
    });

  const titleValid = title.trim().length >= 4 && title.trim().length <= 140;
  const descValid = description.trim().length >= 20;
  const roleValid = !!selRole;
  const genresValid = selGenres.size >= 1 && selGenres.size <= 3;
  const compValid = !!selComp;
  const amountValid = selComp !== "paid" || (!!amount && Number(amount) > 0);
  const locationValid = location.trim().length > 0;
  const today = new Date();
  today.setHours(0, 0, 0, 0);
  const deadlineValid = !!deadline && new Date(deadline) >= today;
  const step1Valid = titleValid && descValid;
  const step2Valid = roleValid && genresValid && compValid && amountValid && locationValid && deadlineValid;
  const allValid = step1Valid && step2Valid && authState === "ready";

  function goNext() {
    setTried(true);
    if (step === 1 && step1Valid) { setStep(2); setTried(false); }
    else if (step === 2 && step2Valid) { setStep(3); setTried(false); }
  }
  function goPrev() {
    setTried(false);
    setStep((s) => Math.max(1, s - 1));
  }

  async function onPublish() {
    setTried(true);
    if (!allValid || publishing) return;
    setPublishing(true);
    setErr("");
    try {
      let coverUrl = "";
      if (coverFile) {
        try {
          coverUrl = (await uploadGigCover(coverFile, null)) || "";
        } catch (e) {
          setErr("Couldn't upload cover: " + ((e as Error)?.message || "unknown error"));
          setPublishing(false);
          return;
        }
      }
      const gig = await createGig({
        title: title.trim(),
        description: description.trim(),
        role: selRole,
        genres: Array.from(selGenres),
        comp: selComp as CompType,
        pay_amount: selComp === "paid" ? Number(amount) : null,
        pay_currency: "USD",
        deadline,
        location: location.trim(),
        cover_url: coverUrl,
      });
      window.location.href = `/gig/${encodeURIComponent(gig.id)}`;
    } catch (e) {
      const err = e as { code?: string; message?: string };
      console.error("[seshn] createGig error:", e);
      if (err?.code === "42P01" || err?.code === "PGRST205") setErr("The gigs table doesn't exist yet. Run migration 0002_gigs.sql in your Supabase dashboard.");
      else setErr(err?.message || "Couldn't publish the gig.");
      setPublishing(false);
    }
  }

  const errText = (valid: boolean): CSSProperties => (tried && !valid ? { color: "var(--danger)", fontSize: 11.5, marginTop: 6, fontFamily: "var(--font-display)" } : { display: "none" });
  const showCompLabel = () => {
    if (selComp === "paid" && amount) return "Paid · $" + amount;
    if (selComp === "paid") return "Paid";
    if (selComp === "split") return "Split";
    if (selComp === "trade") return "Trade";
    if (selComp === "unpaid") return "Unpaid";
    return "·";
  };

  return (
    <div className="post-page">
      <nav className="top-nav">
        <div style={{ display: "flex", alignItems: "center", gap: 24 }}>
          <a href="/feed" className="logo">Seshn</a>
        </div>
        <div className="nav-right">
          <span className="post-draft" style={{ fontSize: 12, color: "var(--ink-3)", fontFamily: "var(--font-display)" }}>{authState === "checking" ? "Loading…" : "Draft · not yet published"}</span>
          <a href="/feed" className="btn ghost">Cancel</a>
          {me && <a href={`/profile/${me.username}`} className="avatar" style={{ background: "var(--ph)", textDecoration: "none", color: "var(--ink-3)", width: 32, height: 32 }}>{initialsOf(me.display_name)}</a>}
        </div>
      </nav>

      <div className="content">
        <div style={{ display: "flex", flexDirection: "column", gap: 24 }}>
          <div className="progress">
            {[1, 2, 3].map((n) => (
              <div key={n} style={{ display: "contents" }}>
                <div style={{ display: "flex", alignItems: "center", gap: 8 }}>
                  <div className="step-node" style={{ background: n <= step ? "var(--ink)" : "transparent", border: "1px solid " + (n <= step ? "var(--ink)" : "var(--line)"), color: n <= step ? "var(--frame)" : "var(--ink-3)" }}>{n < step ? "✓" : n}</div>
                  <span style={{ fontFamily: "var(--font-display)", fontSize: 12, fontWeight: 500, color: n <= step ? "var(--ink)" : "var(--ink-3)" }}>{["Brief", "Details", "Review"][n - 1]}</span>
                </div>
                {n < 3 && <div className="step-connector" />}
              </div>
            ))}
          </div>

          <div>
            <div className="step-label">Step {step} of 3</div>
            <h1>{step === 1 ? "The brief." : step === 2 ? "The details." : "Review and publish."}</h1>
          </div>

          {step === 1 && (
            <>
              <div>
                <div className="section-label">Title <span style={{ color: "var(--accent-d)" }}>*</span> <span className="t-meta">· what role + project, in plain words</span></div>
                <input className="input-field" placeholder="e.g. Topline writer wanted for an Afrobeats demo" value={title} onChange={(e) => setTitle(e.target.value)} maxLength={140} />
                <div style={errText(titleValid)}>Title must be 4–140 characters.</div>
              </div>
              <div>
                <div className="section-label">Brief <span style={{ color: "var(--accent-d)" }}>*</span> <span className="t-meta">· references, vibe, what you&apos;ve got so far ({description.trim().length} / 20+ chars)</span></div>
                <textarea className="input-field" placeholder="What's the song / project about? Drop references, any tracks you've got so far, what you'd like the collaborator to bring." value={description} onChange={(e) => setDescription(e.target.value)} maxLength={4000} style={{ minHeight: 140, resize: "vertical", fontFamily: "var(--font-body)", lineHeight: 1.5 }} />
                <div style={errText(descValid)}>Brief must be at least 20 characters.</div>
              </div>
              <div>
                <div className="section-label">Cover image <span className="t-meta">· optional · we&apos;ll generate one for you if you skip this</span></div>
                <div style={{ display: "flex", gap: 14, alignItems: "center", flexWrap: "wrap" }}>
                  <div style={{ width: 96, height: 96, borderRadius: 8, overflow: "hidden", flex: "0 0 auto", border: "1px dashed var(--line)", background: "var(--surface-2)", display: "flex", alignItems: "center", justifyContent: "center", color: "var(--ink-4)", fontSize: 11, textAlign: "center" }}>
                    {coverPreview ? <img src={coverPreview} alt="Cover preview" style={{ width: "100%", height: "100%", objectFit: "cover", display: "block" }} /> : "Auto-generated"}
                  </div>
                  <div style={{ display: "flex", flexDirection: "column", gap: 6 }}>
                    <label className="btn sm" style={{ cursor: "pointer", display: "inline-block" }}>
                      {coverFile ? "Choose a different image" : "Upload cover"}
                      <input type="file" accept="image/png,image/jpeg,image/webp,image/gif" onChange={onCoverPick} style={{ display: "none" }} />
                    </label>
                    {coverFile && <button type="button" className="btn sm" onClick={clearCover} style={{ color: "var(--ink-3)" }}>Remove · use auto cover</button>}
                    <span className="t-meta">JPG, PNG, WebP or GIF · max 8 MB · square or landscape works best</span>
                  </div>
                </div>
              </div>
            </>
          )}

          {step === 2 && (
            <>
              <div>
                <div className="section-label">Role needed <span style={{ color: "var(--accent-d)" }}>*</span></div>
                <div style={{ display: "flex", flexWrap: "wrap", gap: 6 }}>
                  {GIG_ROLES.map((r) => <span key={r} className={`pill ${r === selRole ? "solid" : ""}`} onClick={() => setSelRole(r)}>{r === selRole && "✓ "}{r}</span>)}
                </div>
                <div style={errText(roleValid)}>Pick a role.</div>
              </div>
              <div>
                <div className="section-label">Genre tags <span style={{ color: "var(--accent-d)" }}>*</span> <span className="t-meta">· 1–3</span></div>
                <div style={{ display: "flex", flexWrap: "wrap", gap: 6 }}>
                  {GIG_GENRES.map((g) => <span key={g} className={`pill ${selGenres.has(g) ? "accent" : ""}`} onClick={() => toggleGenre(g)}>{selGenres.has(g) && "✓ "}{g}</span>)}
                </div>
                <div style={errText(genresValid)}>Pick at least one genre (up to three).</div>
              </div>
              <div>
                <div className="section-label">Compensation <span style={{ color: "var(--accent-d)" }}>*</span></div>
                <div className="comp-grid">
                  {COMP_OPTIONS.map((c) => (
                    <div key={c.id} className={`comp-card ${selComp === c.id ? "selected" : ""}`} onClick={() => setSelComp(c.id)}>
                      <div className="title">{selComp === c.id && "✓ "}{c.label}</div>
                      <div className="sub">{c.sub}</div>
                    </div>
                  ))}
                </div>
                <div style={errText(compValid)}>Pick a compensation type.</div>
                {selComp === "paid" && (
                  <div className="amount-row" style={{ marginTop: 12 }}>
                    <input className="input-field" type="number" min="1" placeholder="$ Amount" value={amount} onChange={(e) => setAmount(e.target.value)} style={{ maxWidth: 200 }} />
                    <input className="input-field" defaultValue="USD" style={{ maxWidth: 100 }} readOnly />
                  </div>
                )}
                {selComp === "paid" && <div style={errText(amountValid)}>Enter an amount greater than 0.</div>}
              </div>
              <div>
                <div className="section-label">Location <span style={{ color: "var(--accent-d)" }}>*</span></div>
                <input className="input-field" placeholder="e.g. Remote, NYC, London" value={location} onChange={(e) => setLocation(e.target.value)} style={{ maxWidth: 360 }} />
                <div style={{ display: "flex", gap: 6, marginTop: 8, flexWrap: "wrap" }}>
                  {QUICK_LOCATIONS.map((q) => <span key={q} className="pill" style={{ opacity: location === q ? 1 : 0.7 }} onClick={() => setLocation(q)}>{q}</span>)}
                </div>
                <div style={errText(locationValid)}>Enter a location (or &apos;Remote&apos;).</div>
              </div>
              <div>
                <div className="section-label">Deadline <span style={{ color: "var(--accent-d)" }}>*</span></div>
                <input className="input-field" type="date" value={deadline} min={new Date().toISOString().slice(0, 10)} onChange={(e) => setDeadline(e.target.value)} style={{ maxWidth: 240 }} />
                <div style={errText(deadlineValid)}>Pick a deadline today or in the future.</div>
              </div>
            </>
          )}

          {step === 3 && (
            <div className="card" style={{ padding: 20 }}>
              <div className="t-eyebrow" style={{ marginBottom: 14 }}>Summary</div>
              <div style={{ display: "grid", gridTemplateColumns: "auto 1fr", gap: "10px 20px", fontSize: 13.5, lineHeight: 1.5 }}>
                <span className="t-meta">Title</span><span style={{ fontFamily: "var(--font-display)", fontWeight: 600 }}>{title}</span>
                <span className="t-meta">Brief</span><span style={{ whiteSpace: "pre-wrap" }}>{description}</span>
                <span className="t-meta">Role</span><span>{selRole}</span>
                <span className="t-meta">Genres</span><span style={{ display: "flex", gap: 5, flexWrap: "wrap" }}>{[...selGenres].map((g) => <span key={g} className="pill">{g}</span>)}</span>
                <span className="t-meta">Comp</span><span>{showCompLabel()}</span>
                <span className="t-meta">Location</span><span>{location}</span>
                <span className="t-meta">Deadline</span><span>{deadline ? new Date(deadline).toLocaleDateString(undefined, { weekday: "short", year: "numeric", month: "short", day: "numeric" }) : "·"}</span>
              </div>
              <div style={{ marginTop: 16, paddingTop: 16, borderTop: "1px solid var(--line-soft)", fontSize: 12, color: "var(--ink-3)", lineHeight: 1.5 }}>Once you publish, your gig appears in the public feed. You can edit or close it any time from your profile.</div>
            </div>
          )}

          {err && <div style={{ padding: "10px 14px", borderRadius: 8, border: "1px solid var(--danger)", background: "rgba(192,57,43,0.06)", color: "var(--danger)", fontSize: 13, fontFamily: "var(--font-display)" }}>{err}</div>}

          <div className="actions">
            {step === 1 ? <a href="/feed" className="btn">← Cancel</a> : <button className="btn" onClick={goPrev}>← Back · {step === 2 ? "Brief" : "Details"}</button>}
            {step < 3 ? (
              <button className="btn primary lg" onClick={goNext} style={(step === 1 ? !step1Valid : !step2Valid) ? { opacity: 0.5, cursor: "not-allowed" } : undefined}>Continue → {step === 1 ? "Details" : "Review"}</button>
            ) : (
              <button className="btn primary lg" onClick={onPublish} disabled={!allValid || publishing} style={!allValid || publishing ? { opacity: 0.5, cursor: "not-allowed" } : undefined}>{publishing ? "Publishing…" : "Publish gig →"}</button>
            )}
          </div>
        </div>

        <div className="preview-section">
          <div className="eyebrow">Live preview · feed card</div>
          <div className="gig-card" style={{ marginBottom: 12 }}>
            <div className="gig-head">
              <div className="avatar" style={{ position: "relative", width: 32, height: 32, background: "var(--ph)" }}>
                {me ? initialsOf(me.display_name) : "··"}
                {me?.is_pro && <span style={{ position: "absolute", bottom: -2, right: -2, background: "var(--frame)", borderRadius: 999, padding: "2px 5px", fontSize: 8, fontFamily: "var(--font-display)", fontWeight: 600, color: "var(--ink)", border: "1px solid var(--line)", lineHeight: 1, textTransform: "uppercase" }}>PRO</span>}
              </div>
              <div style={{ flex: 1, minWidth: 0 }}>
                <div style={{ display: "flex", gap: 6, alignItems: "center", marginBottom: 4 }}>
                  <span style={{ fontWeight: 600, fontFamily: "var(--font-display)", fontSize: 13 }}>{me ? me.display_name : "You"}</span>
                  <span style={{ width: 4, height: 4, borderRadius: "50%", background: "var(--ink-4)", flexShrink: 0 }} />
                  <span className="t-meta">just now</span>
                </div>
                <div style={{ display: "flex", gap: 6, alignItems: "center" }}>
                  <span className="pill accent">{selRole || "Role"} needed</span>
                  <span className="t-meta">· {showCompLabel()}</span>
                </div>
              </div>
            </div>
            <div className="gig-title" style={!title ? { color: "var(--ink-4)", fontStyle: "italic" } : undefined}>{title || "Your gig title will appear here…"}</div>
            <div style={{ display: "flex", gap: 4, flexWrap: "wrap" }}>{[...selGenres].map((t) => <span key={t} className="pill">{t}</span>)}</div>
            <div className="gig-foot">
              <span className="t-meta">0 applied{deadline ? " · closing " + new Date(deadline).toLocaleDateString(undefined, { month: "short", day: "numeric" }) : ""}</span>
              <div style={{ display: "flex", gap: 8 }}>
                <button className="btn sm">View</button>
                <button className="btn sm primary">Apply</button>
              </div>
            </div>
          </div>

          <div className="card hairline" style={{ padding: 12 }}>
            <div className="eyebrow" style={{ marginBottom: 8 }}>Status</div>
            <div style={{ display: "flex", flexDirection: "column", gap: 6, fontSize: 12, color: "var(--ink-2)" }}>
              <div style={{ display: "flex", gap: 8, alignItems: "center" }}><span style={{ color: step1Valid ? "var(--accent-d)" : "var(--ink-4)" }}>{step1Valid ? "✓" : "○"}</span> Brief</div>
              <div style={{ display: "flex", gap: 8, alignItems: "center" }}><span style={{ color: step2Valid ? "var(--accent-d)" : "var(--ink-4)" }}>{step2Valid ? "✓" : "○"}</span> Details</div>
              <div style={{ display: "flex", gap: 8, alignItems: "center" }}><span style={{ color: step === 3 && allValid ? "var(--accent-d)" : "var(--ink-4)" }}>{step === 3 && allValid ? "✓" : "○"}</span> Review &amp; publish</div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
