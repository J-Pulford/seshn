"use client";

import { useEffect, useState } from "react";
import Nav from "@/components/Nav";
import { requireProfile } from "@/lib/seshn/auth";
import { VerifiedBadge } from "@/components/VerifiedBadge";
import {
  getMyVerificationApplication,
  submitVerificationApplication,
  withdrawVerificationApplication,
  type VerificationApplication,
  type VerificationDetails,
} from "@/lib/seshn/verification";
import type { Profile } from "@/lib/seshn/types";

const ROLES = ["Producer", "Vocalist", "Songwriter", "Mixing engineer", "Mastering engineer", "Instrumentalist", "Beatmaker", "Artist / band", "Other"];

const label: React.CSSProperties = { display: "block", fontFamily: "var(--font-display)", fontWeight: 600, fontSize: 13, marginBottom: 6, color: "var(--ink)" };
const hint: React.CSSProperties = { fontSize: 12, color: "var(--ink-3)", marginBottom: 6, lineHeight: 1.5 };
const input: React.CSSProperties = { width: "100%", padding: "11px 13px", borderRadius: 9, border: "1px solid var(--line)", background: "var(--frame)", color: "var(--ink)", fontSize: 14, fontFamily: "var(--font-body)" };

export default function VerifyPage() {
  const [me, setMe] = useState<Profile | null | undefined>(undefined);
  const [existing, setExisting] = useState<VerificationApplication | null | undefined>(undefined);
  const [busy, setBusy] = useState(false);
  const [err, setErr] = useState("");
  const [done, setDone] = useState(false);

  const [d, setD] = useState<VerificationDetails>({
    full_name: "", primary_role: "", years_experience: "", based_in: "",
    streaming_url: "", portfolio_url: "", socials: "", notable_work: "", pitch: "", consent_identity: false,
  });
  const set = <K extends keyof VerificationDetails>(k: K, v: VerificationDetails[K]) => setD((p) => ({ ...p, [k]: v }));

  useEffect(() => {
    (async () => {
      const r = await requireProfile();
      if (!r) return;
      if (!r.user || !r.profile) { setMe(null); return; }
      setMe(r.profile);
      setD((p) => ({ ...p, full_name: r.profile.display_name || "", primary_role: r.profile.roles?.[0] || "", based_in: r.profile.location || "" }));
      setExisting(await getMyVerificationApplication());
    })();
  }, []);

  async function submit() {
    setErr("");
    if (!d.full_name.trim()) return setErr("Your full legal name is required.");
    if (!d.primary_role) return setErr("Pick your primary role.");
    if (!d.streaming_url.trim() && !d.portfolio_url.trim()) return setErr("Add at least one link to your work (streaming or portfolio).");
    if (d.pitch.trim().length < 40) return setErr("Tell us a bit more about your work (at least a couple of sentences).");
    if (!d.consent_identity) return setErr("Please confirm you consent to identity verification.");
    setBusy(true);
    try {
      await submitVerificationApplication(d);
      setDone(true);
    } catch (e) {
      setErr((e as Error)?.message || "Couldn't submit your application.");
    } finally {
      setBusy(false);
    }
  }

  const card: React.CSSProperties = { maxWidth: 680, margin: "0 auto", padding: "0 16px 64px" };

  function Shell({ children }: { children: React.ReactNode }) {
    return (
      <div style={{ minHeight: "100vh", background: "var(--bg)" }}>
        <Nav active={null} />
        <div style={card}>{children}</div>
      </div>
    );
  }

  if (me === undefined || existing === undefined) {
    return <Shell><p className="t-meta" style={{ paddingTop: 40 }}>Loading…</p></Shell>;
  }
  if (me === null) {
    return <Shell><div style={{ paddingTop: 40 }}><p className="t-meta">Sign in to apply for verification.</p><a className="btn primary" href="/auth" style={{ marginTop: 12 }}>Sign in</a></div></Shell>;
  }

  // Already submitted (and not withdrawn) → show status, not the form again.
  if ((existing && existing.status !== "withdrawn") || done) {
    const status = done ? "pending" : existing!.status;
    const copy: Record<string, { h: string; p: string }> = {
      pending: { h: "Application received", p: "Thanks, your verification application is in the queue. Our team reviews each one by hand, we'll be in touch by email. This usually takes a few days." },
      approved: { h: "You're verified", p: "Your profile carries the Verified badge. Nice work." },
      rejected: { h: "Not approved this time", p: "We couldn't verify this application. You're welcome to reapply with more detail or links to your work." },
    };
    const c = copy[status] || copy.pending;
    return (
      <Shell>
        <div style={{ paddingTop: 48, textAlign: "center" }}>
          <div style={{ display: "inline-flex", marginBottom: 14 }}><VerifiedBadge style={{ fontSize: 13, padding: "5px 13px 5px 9px" }} /></div>
          <h1 style={{ fontFamily: "var(--font-display)", fontWeight: 700, fontSize: 26, margin: "0 0 10px" }}>{c.h}</h1>
          <p style={{ color: "var(--ink-2)", lineHeight: 1.6, maxWidth: 460, margin: "0 auto" }}>{c.p}</p>
          {status === "pending" && existing && (
            <button className="btn" style={{ marginTop: 22 }} onClick={async () => { try { await withdrawVerificationApplication(existing.id); setExisting({ ...existing, status: "withdrawn" }); setDone(false); } catch { /* ignore */ } }}>
              Withdraw application
            </button>
          )}
          {status === "rejected" && <button className="btn primary" style={{ marginTop: 22 }} onClick={() => setExisting(null)}>Reapply</button>}
        </div>
      </Shell>
    );
  }

  return (
    <Shell>
      <header style={{ paddingTop: 40, marginBottom: 28 }}>
        <div style={{ display: "inline-flex", marginBottom: 12 }}><VerifiedBadge style={{ fontSize: 13, padding: "5px 13px 5px 9px" }} /></div>
        <h1 style={{ fontFamily: "var(--font-display)", fontWeight: 700, fontSize: 30, letterSpacing: "-0.02em", margin: "0 0 10px" }}>Apply for verification</h1>
        <p style={{ color: "var(--ink-2)", lineHeight: 1.6, maxWidth: 560 }}>
          The Verified badge tells collaborators your profile has been deeply vetted by Seshn, real person, real work, real track record. Applications are reviewed by hand.
          <strong style={{ color: "var(--ink)" }}> Payment ($49, one-time) is coming soon</strong>, for now there&apos;s no charge to apply.
        </p>
      </header>

      <div style={{ display: "flex", flexDirection: "column", gap: 20 }}>
        <div>
          <label style={label}>Full legal name *</label>
          <div style={hint}>Used only for verification, never shown publicly.</div>
          <input style={input} value={d.full_name} onChange={(e) => set("full_name", e.target.value)} maxLength={120} />
        </div>

        <div style={{ display: "flex", gap: 14, flexWrap: "wrap" }}>
          <div style={{ flex: "1 1 220px" }}>
            <label style={label}>Primary role *</label>
            <select style={input} value={d.primary_role} onChange={(e) => set("primary_role", e.target.value)}>
              <option value="">Select…</option>
              {ROLES.map((r) => <option key={r} value={r}>{r}</option>)}
            </select>
          </div>
          <div style={{ flex: "1 1 160px" }}>
            <label style={label}>Years doing this</label>
            <input style={input} value={d.years_experience} onChange={(e) => set("years_experience", e.target.value)} placeholder="e.g. 6" maxLength={20} />
          </div>
          <div style={{ flex: "1 1 160px" }}>
            <label style={label}>Based in</label>
            <input style={input} value={d.based_in} onChange={(e) => set("based_in", e.target.value)} placeholder="City, country" maxLength={80} />
          </div>
        </div>

        <div>
          <label style={label}>Streaming profile</label>
          <div style={hint}>Your Spotify / Apple Music artist page, or a label/distributor page.</div>
          <input style={input} value={d.streaming_url} onChange={(e) => set("streaming_url", e.target.value)} placeholder="https://" maxLength={300} />
        </div>

        <div>
          <label style={label}>Portfolio / website</label>
          <div style={hint}>SoundCloud, a showreel, your site, anything that shows the work.</div>
          <input style={input} value={d.portfolio_url} onChange={(e) => set("portfolio_url", e.target.value)} placeholder="https://" maxLength={300} />
        </div>

        <div>
          <label style={label}>Social handles</label>
          <input style={input} value={d.socials} onChange={(e) => set("socials", e.target.value)} placeholder="@instagram, @tiktok, etc." maxLength={300} />
        </div>

        <div>
          <label style={label}>Notable credits or releases</label>
          <div style={hint}>Records you&apos;ve worked on, artists you&apos;ve collaborated with, placements, press.</div>
          <textarea style={{ ...input, minHeight: 90, resize: "vertical" }} value={d.notable_work} onChange={(e) => set("notable_work", e.target.value)} maxLength={2000} />
        </div>

        <div>
          <label style={label}>Tell us about your work *</label>
          <div style={hint}>What you do, who you do it for, and why you should be verified. A few honest sentences beats a CV.</div>
          <textarea style={{ ...input, minHeight: 120, resize: "vertical" }} value={d.pitch} onChange={(e) => set("pitch", e.target.value)} maxLength={3000} />
        </div>

        <label style={{ display: "flex", gap: 10, alignItems: "flex-start", fontSize: 13, color: "var(--ink-2)", lineHeight: 1.5, cursor: "pointer" }}>
          <input type="checkbox" checked={d.consent_identity} onChange={(e) => set("consent_identity", e.target.checked)} style={{ marginTop: 3, width: 16, height: 16, flexShrink: 0 }} />
          <span>I confirm the above is accurate and I consent to Seshn verifying my identity and work as part of the review.</span>
        </label>

        {err && <div style={{ color: "#c43d3f", fontSize: 13 }}>{err}</div>}

        <div>
          <button className="btn primary lg" onClick={submit} disabled={busy} style={{ width: "100%" }}>{busy ? "Submitting…" : "Submit application"}</button>
          <p style={{ fontSize: 12, color: "var(--ink-3)", textAlign: "center", marginTop: 10, lineHeight: 1.5 }}>No charge today. We&apos;ll review and email you, the $49 one-time fee will apply once verification fully launches.</p>
        </div>
      </div>
    </Shell>
  );
}
