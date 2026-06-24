"use client";

import { useEffect, useState } from "react";
import Nav from "@/components/Nav";
import { requireProfile } from "@/lib/seshn/auth";
import { getPayoutStatus } from "@/lib/seshn/payments";
import { listGigs } from "@/lib/seshn/gigs";
import { listMyApplications } from "@/lib/seshn/applications";
import type { Profile } from "@/lib/seshn/types";
import "./start.css";

interface ChecklistItem {
  id: string;
  label: string;
  desc: string;
  done: boolean;
  href: string;
  cta: string;
}

// The 60-second tour — what the platform is, one card per pillar.
const TOUR: { icon: string; title: string; body: string; href: string; link: string }[] = [
  { icon: "📝", title: "Post a brief", body: "Say what you need, role, genre, comp, deadline. 90 seconds, no resume. Your brief goes out to matched collaborators.", href: "/post", link: "Post a brief" },
  { icon: "🔎", title: "Find your people", body: "Browse and filter by role, genre, comp, and location. Hear the work before you read the bio, discovery is audio-first.", href: "/browse", link: "Browse talent" },
  { icon: "📨", title: "Apply & get applications", body: "Apply to briefs with a tight pitch and a sample, or field applications on your own posts. Track everything in one place.", href: "/applications", link: "Your applications" },
  { icon: "💬", title: "Talk & plan in DMs", body: "Message collaborators, share files, and schedule a call, all without leaving Seshn.", href: "/inbox", link: "Open inbox" },
  { icon: "📄", title: "Contracts & escrow", body: "Agree terms, both sign, the owner funds an escrow. Funds are held safely and released on approval. One flat 10%, fees included.", href: "/contracts", link: "Your contracts" },
  { icon: "💸", title: "Get paid", body: "Connect your bank once and get paid via Stripe. You keep 90% on paid bookings; split and trade collabs are free.", href: "/settings", link: "Set up payouts" },
  { icon: "📈", title: "Track what's working", body: "See profile views, where they come from, and which listings convert, in real time, on your analytics dashboard.", href: "/analytics", link: "View analytics" },
];

function StepRow({ item }: { item: ChecklistItem }) {
  return (
    <a className={"st-step" + (item.done ? " done" : "")} href={item.done ? undefined : item.href}>
      <span className="st-check" aria-hidden="true">{item.done ? "✓" : ""}</span>
      <span className="st-step-main">
        <span className="st-step-label">{item.label}</span>
        <span className="st-step-desc">{item.desc}</span>
      </span>
      {!item.done && <span className="st-step-cta">{item.cta} →</span>}
    </a>
  );
}

export default function GetStartedPage() {
  const [me, setMe] = useState<Profile | null | undefined>(undefined);
  const [items, setItems] = useState<ChecklistItem[] | null>(null);

  useEffect(() => {
    (async () => {
      const r = await requireProfile({ allowAnon: true });
      if (!r) return;
      if (!r.user || !r.profile) { setMe(null); return; }
      const p = r.profile;
      setMe(p);

      const [payout, gigs, apps] = await Promise.all([
        getPayoutStatus().catch(() => ({ configured: false })),
        listGigs({ ownerId: p.id, limit: 1, statuses: ["open", "closed", "draft"] }).catch(() => []),
        listMyApplications().catch(() => []),
      ]);

      const hasWork =
        (!!p.social_links && Object.keys(p.social_links).length > 0) ||
        (!!p.gallery && p.gallery.length > 0) ||
        (!!p.featured && p.featured.length > 0);
      const payoutsReady = !!(payout && "connected" in payout && payout.connected && payout.payouts_enabled);

      setItems([
        { id: "photo", label: "Add a profile photo", desc: "A photo gets you taken seriously. Nobody books a grey circle.", done: !!p.avatar_url, href: `/profile/${encodeURIComponent(p.username)}`, cta: "Add photo" },
        { id: "roles", label: "Say what you do", desc: "Add your roles and genres so you show up in the right searches.", done: (p.roles?.length || 0) > 0, href: `/profile/${encodeURIComponent(p.username)}`, cta: "Set roles" },
        { id: "work", label: "Show your work", desc: "Connect Spotify/SoundCloud or add tracks, your profile should play.", done: hasWork, href: `/profile/${encodeURIComponent(p.username)}`, cta: "Add work" },
        { id: "payouts", label: "Set up payouts", desc: "Connect your bank so you can be paid (and funded) via Stripe.", done: payoutsReady, href: "/settings", cta: "Connect" },
        { id: "move", label: "Make your first move", desc: "Post a brief, or browse and apply to one. This is where it starts.", done: gigs.length > 0 || apps.length > 0, href: "/post", cta: "Post a brief" },
      ]);
    })();
  }, []);

  const done = items?.filter((i) => i.done).length ?? 0;
  const total = items?.length ?? 5;
  const pct = total ? Math.round((done / total) * 100) : 0;
  const allDone = items != null && done === total;

  return (
    <div className="start-page">
      <Nav active={null} />
      <div className="start-wrap">
        <header className="start-head">
          <span className="t-eyebrow">Get started</span>
          <h1 className="page-h1">Welcome to Seshn{me ? `, ${(me.display_name || me.username || "").split(" ")[0]}` : ""}.</h1>
          <p>Seshn is the home base for the working musician: post what you need, find vetted collaborators, ship the record together, and get paid safely. Here&apos;s the whole platform in sixty seconds.</p>
        </header>

        {/* Live setup checklist (signed-in) */}
        {me ? (
          <section className="start-checklist">
            <div className="st-progress-head">
              <div>
                <h2>{allDone ? "You're all set up 🎉" : "Set up your account"}</h2>
                <span className="st-progress-sub">{allDone ? "Your profile is ready to get booked." : `${done} of ${total} done, takes about a minute.`}</span>
              </div>
              <div className="st-ring" style={{ ["--pct" as string]: `${pct}%` }} aria-label={`${pct}% complete`}>
                <span>{pct}%</span>
              </div>
            </div>
            <div className="st-steps">
              {items ? items.map((it) => <StepRow key={it.id} item={it} />) : <div className="st-loading">Checking your setup…</div>}
            </div>
          </section>
        ) : (
          <section className="start-cta-card">
            <div>
              <h2>Create your account to begin</h2>
              <span>It&apos;s free, post briefs, find collaborators, and get paid. Pro is $5/mo, never a slice of your fee.</span>
            </div>
            <a className="btn primary lg" href="/auth">Start your session</a>
          </section>
        )}

        {/* 60-second tour */}
        <section className="start-tour">
          <div className="t-eyebrow" style={{ marginBottom: 12 }}>The whole platform, fast</div>
          <div className="st-tour-grid">
            {TOUR.map((c, i) => (
              <a key={c.title} className="st-tour-card" href={c.href}>
                <span className="st-tour-num">{String(i + 1).padStart(2, "0")}</span>
                <span className="st-tour-icon" aria-hidden="true">{c.icon}</span>
                <h3>{c.title}</h3>
                <p>{c.body}</p>
                <span className="st-tour-link">{c.link} →</span>
              </a>
            ))}
          </div>
        </section>

        <div className="start-foot">
          <a className="btn" href="/guides">Read the best-practices playbooks</a>
          <a className="btn" href="/help">Ask the community</a>
        </div>
      </div>
    </div>
  );
}
