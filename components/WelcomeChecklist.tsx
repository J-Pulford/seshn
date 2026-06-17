"use client";

import { useEffect, useState } from "react";
import { getUser, getProfile, getProfileStats } from "@/lib/seshn/profiles";
import { listMyApplications } from "@/lib/seshn/applications";
import { listMyConversations } from "@/lib/seshn/messaging";
import type { Profile } from "@/lib/seshn/types";
import "./welcome-checklist.css";

const DISMISS_KEY = "seshn:welcome_dismissed";

interface Step {
  id: string;
  label: string;
  hint: string;
  done: boolean;
  href: string;
  cta: string;
}

// First-run nudge on the feed: a small checklist that turns a fresh, empty
// account into someone with a real profile and a first action. Self-loads,
// auto-hides once everything's done, and is dismissible (remembered locally).
export default function WelcomeChecklist() {
  const [steps, setSteps] = useState<Step[] | null>(null);
  const [profile, setProfile] = useState<Profile | null>(null);
  const [hidden, setHidden] = useState(true);

  useEffect(() => {
    let cancelled = false;
    (async () => {
      let dismissed = false;
      try { dismissed = localStorage.getItem(DISMISS_KEY) === "1"; } catch { /* ignore */ }
      if (dismissed) return;

      const u = await getUser().catch(() => null);
      if (!u || cancelled) return;
      const p = await getProfile({ id: u.id }).catch(() => null);
      if (!p || cancelled) return; // not onboarded yet, onboarding handles them

      const [stats, apps, convos] = await Promise.all([
        getProfileStats(p.id).catch(() => ({ gigs_posted: 0, collaborations: 0 })),
        listMyApplications().catch(() => []),
        listMyConversations().catch(() => []),
      ]);
      if (cancelled) return;

      const profHref = `/profile/${encodeURIComponent(p.username)}`;
      const built: Step[] = [
        { id: "photo", label: "Add a profile photo", hint: "A face or logo makes people trust you faster.", done: !!p.avatar_url, href: profHref, cta: "Add photo" },
        { id: "bio", label: "Write a short bio", hint: "A line or two on what you make and what you're after.", done: !!(p.bio && p.bio.trim()), href: profHref, cta: "Edit profile" },
        { id: "act", label: "Post a gig or apply to one", hint: "Start a brief, or pitch yourself on someone else's.", done: (stats.gigs_posted || 0) > 0 || apps.length > 0, href: "/post", cta: "Post a gig" },
        { id: "msg", label: "Start a conversation", hint: "Reach out to a collaborator you'd like to work with.", done: convos.length > 0, href: "/browse", cta: "Browse artists" },
      ];

      // Everything already done? Don't nag — quietly mark it dismissed.
      if (built.every((s) => s.done)) {
        try { localStorage.setItem(DISMISS_KEY, "1"); } catch { /* ignore */ }
        return;
      }
      setProfile(p);
      setSteps(built);
      setHidden(false);
    })();
    return () => { cancelled = true; };
  }, []);

  function dismiss() {
    setHidden(true);
    try { localStorage.setItem(DISMISS_KEY, "1"); } catch { /* ignore */ }
  }

  if (hidden || !steps || !profile) return null;
  const doneCount = steps.filter((s) => s.done).length;

  return (
    <div className="wc-card" role="region" aria-label="Getting started">
      <div className="wc-head">
        <div>
          <div className="wc-title">Welcome to Seshn{profile.display_name ? ", " + profile.display_name.split(" ")[0] : ""} 🎧</div>
          <div className="wc-sub">A fuller profile gets {doneCount < 4 ? "you noticed" : "noticed"} faster. {doneCount}/{steps.length} done.</div>
        </div>
        <button className="wc-dismiss" onClick={dismiss} aria-label="Dismiss getting started">×</button>
      </div>
      <div className="wc-progress"><div className="wc-progress-fill" style={{ width: (doneCount / steps.length) * 100 + "%" }} /></div>
      <div className="wc-steps">
        {steps.map((s) => (
          <div key={s.id} className={"wc-step" + (s.done ? " done" : "")}>
            <span className="wc-check" aria-hidden="true">
              {s.done ? (
                <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="3" strokeLinecap="round" strokeLinejoin="round"><path d="M5 12l5 5L20 7" /></svg>
              ) : null}
            </span>
            <div className="wc-step-text">
              <span className="wc-step-label">{s.label}</span>
              <span className="wc-step-hint">{s.hint}</span>
            </div>
            {!s.done && <a href={s.href} className="btn sm primary wc-step-cta">{s.cta}</a>}
          </div>
        ))}
      </div>
    </div>
  );
}
