"use client";

import { useEffect, useState } from "react";
import { getUser, getProfile, upsertProfile } from "@/lib/seshn/profiles";
import { PROFILE_ROLES } from "@/lib/seshn/constants";
import "./onboarding.css";

// Legacy until ported (profile page). Flip to /profile/[username] in Phase 3.
const profileHref = (username: string) => `/app/profile.html?u=${encodeURIComponent(username)}`;

export default function OnboardingPage() {
  const [displayName, setDisplayName] = useState("");
  const [username, setUsername] = useState("");
  const [selected, setSelected] = useState<Set<string>>(new Set());
  const [saving, setSaving] = useState(false);
  const [err, setErr] = useState("");
  const [authChecked, setAuthChecked] = useState(false);

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

  const toggle = (role: string) => {
    setSelected((prev) => {
      const next = new Set(prev);
      if (next.has(role)) next.delete(role);
      else if (next.size < 3) next.add(role);
      return next;
    });
  };

  const usernameValid = /^[a-z0-9_.-]{2,32}$/.test(username);
  const canContinue =
    authChecked && displayName.trim().length > 0 && usernameValid && selected.size > 0 && !saving;

  async function onContinue() {
    if (!canContinue) return;
    setSaving(true);
    setErr("");
    try {
      const profile = await upsertProfile({
        username: username.toLowerCase(),
        display_name: displayName.trim(),
        roles: Array.from(selected),
      });
      window.location.href = profileHref(profile.username);
    } catch (e) {
      const err = e as { code?: string; message?: string };
      console.error("[seshn] upsert profile error:", e);
      if (err?.code === "23505") setErr("That username is already taken — try another.");
      else if (err?.code === "42P01" || err?.code === "PGRST205")
        setErr("The profiles table doesn't exist yet. Run the SQL migration in your Supabase dashboard.");
      else setErr(err?.message || "Couldn't save your profile.");
      setSaving(false);
    }
  }

  return (
    <div className="ob-page">
      <div className="top-bar">
        <a href="/" className="logo">Seshn</a>
        <span className="step-label">Step 1 of 3 · You can change this later</span>
      </div>

      <div className="progress-bar">
        <div className="progress-seg" style={{ background: "var(--accent)" }} />
        <div className="progress-seg" style={{ background: "var(--line)" }} />
        <div className="progress-seg" style={{ background: "var(--line)" }} />
      </div>

      <div className="content">
        <div className="eyebrow">01 · Pick your roles</div>
        <h1>What do you bring<br />to the room?</h1>
        <p className="sub">Pick up to 3. Your roles appear on your profile and tune the gigs you see in the feed.</p>
      </div>

      <div className="name-row" style={{ width: "100%", maxWidth: 760, padding: "0 24px 18px", display: "grid", gridTemplateColumns: "1fr 1fr", gap: 12 }}>
        <label style={{ display: "flex", flexDirection: "column", gap: 6 }}>
          <span style={{ fontFamily: "var(--font-display)", fontWeight: 600, fontSize: 12, color: "var(--ink)" }}>Display name</span>
          <input type="text" value={displayName} onChange={(e) => setDisplayName(e.target.value)} placeholder="Maya Oduya"
            style={{ padding: "10px 12px", border: "1px solid var(--line)", borderRadius: 8, fontFamily: "var(--font-body)", fontSize: 14, background: "var(--surface)", color: "var(--ink)" }} />
        </label>
        <label style={{ display: "flex", flexDirection: "column", gap: 6 }}>
          <span style={{ fontFamily: "var(--font-display)", fontWeight: 600, fontSize: 12, color: "var(--ink)" }}>Username</span>
          <div style={{ display: "flex", alignItems: "center", border: "1px solid var(--line)", borderRadius: 8, background: "var(--surface)", paddingLeft: 12 }}>
            <span style={{ color: "var(--ink-3)", fontFamily: "var(--font-display)", fontSize: 13 }}>seshn.fm/@</span>
            <input type="text" value={username} onChange={(e) => setUsername(e.target.value.toLowerCase().replace(/[^a-z0-9_.-]/g, ""))} placeholder="maya.o" maxLength={32}
              style={{ flex: 1, padding: "10px 12px 10px 2px", border: 0, fontFamily: "var(--font-body)", fontSize: 14, background: "transparent", color: "var(--ink)", outline: "none" }} />
          </div>
          {!usernameValid && username.length > 0 && (
            <span style={{ fontSize: 11, color: "var(--ink-3)" }}>2–32 chars, lowercase letters, numbers, _ . - only.</span>
          )}
        </label>
      </div>

      <div className="roles-grid">
        {PROFILE_ROLES.map((role) => {
          const sel = selected.has(role);
          return (
            <div key={role} className={`role-card ${sel ? "selected" : ""}`} onClick={() => toggle(role)}>
              <span>{sel && <span className="check">✓</span>}{role}</span>
            </div>
          );
        })}
      </div>

      {selected.size >= 3 && (
        <div style={{ width: "100%", maxWidth: 760, padding: "14px 24px 0", color: "var(--ink-3)", fontSize: 12, fontFamily: "var(--font-display)" }}>
          3 roles selected — deselect one to add another
        </div>
      )}

      {err && (
        <div style={{ width: "100%", maxWidth: 760, padding: "10px 24px 0", color: "var(--danger)", fontSize: 12, fontFamily: "var(--font-display)" }}>{err}</div>
      )}

      <div className="actions">
        <button className="btn-ghost" onClick={() => (window.location.href = "/")}>Skip for now</button>
        <button className="btn-primary" disabled={!canContinue} onClick={onContinue} style={!canContinue ? { opacity: 0.5, cursor: "not-allowed" } : undefined}>
          {saving ? "Saving…" : "Create profile →"}
        </button>
      </div>
    </div>
  );
}
