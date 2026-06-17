"use client";

import { useEffect, useRef, useState } from "react";
import Nav from "@/components/Nav";
import { requireProfile } from "@/lib/seshn/auth";
import {
  getProfileAnalytics,
  getListingAnalytics,
  subscribeProfileViews,
  type ProfileAnalytics,
  type ListingAnalytics,
} from "@/lib/seshn/analytics";
import type { Profile } from "@/lib/seshn/types";
import "../dashboard/dashboard.css";
import "./analytics.css";

const RANGES = [7, 30, 90];

function trend(curr: number, prev: number): { pct: number; dir: "up" | "down" | "flat" } {
  if (prev === 0) return { pct: curr > 0 ? 100 : 0, dir: curr > 0 ? "up" : "flat" };
  const pct = Math.round(((curr - prev) / prev) * 100);
  return { pct: Math.abs(pct), dir: pct > 0 ? "up" : pct < 0 ? "down" : "flat" };
}

function Sparkline({ series }: { series: { day: string; views: number }[] }) {
  if (!series.length) return null;
  const w = 640, h = 64, pad = 4;
  const max = Math.max(1, ...series.map((s) => s.views));
  const step = series.length > 1 ? (w - pad * 2) / (series.length - 1) : 0;
  const pts = series.map((s, i) => {
    const x = pad + i * step;
    const y = h - pad - (s.views / max) * (h - pad * 2);
    return [x, y] as const;
  });
  const line = pts.map(([x, y]) => `${x.toFixed(1)},${y.toFixed(1)}`).join(" ");
  const area = `${pad},${h - pad} ${line} ${(pad + (series.length - 1) * step).toFixed(1)},${h - pad}`;
  return (
    <svg className="an-spark" viewBox={`0 0 ${w} ${h}`} preserveAspectRatio="none" role="img" aria-label="Daily profile views">
      <polygon points={area} fill="var(--accent-bg)" stroke="none" />
      <polyline points={line} fill="none" stroke="var(--accent-d)" strokeWidth={2} strokeLinejoin="round" strokeLinecap="round" />
    </svg>
  );
}

function StatusPill({ status }: { status: string }) {
  const cls = status === "open" ? "ok" : status === "draft" ? "muted" : "warn";
  const label = status.charAt(0).toUpperCase() + status.slice(1);
  return <span className={"an-pill " + cls}>{label}</span>;
}

export default function AnalyticsPage() {
  const [me, setMe] = useState<Profile | null | undefined>(undefined);
  const [days, setDays] = useState(30);
  const [profile, setProfile] = useState<ProfileAnalytics | null>(null);
  const [listings, setListings] = useState<ListingAnalytics[]>([]);
  const [loading, setLoading] = useState(true);
  const meId = useRef<string | null>(null);

  // Auth gate.
  useEffect(() => {
    (async () => {
      const r = await requireProfile();
      if (!r || !r.profile) return;
      meId.current = r.profile.id;
      setMe(r.profile);
    })();
  }, []);

  // Load (and reload on range change) once we know who we are.
  useEffect(() => {
    if (!me) return;
    let alive = true;
    setLoading(true);
    (async () => {
      const [p, l] = await Promise.all([getProfileAnalytics(days), getListingAnalytics(days)]);
      if (!alive) return;
      setProfile(p);
      setListings(l);
      setLoading(false);
    })();
    return () => { alive = false; };
  }, [me, days]);

  // Live: bump the live counters when a new view lands.
  useEffect(() => {
    if (!meId.current) return;
    let off = () => {};
    subscribeProfileViews(meId.current, () => {
      setProfile((p) => (p ? { ...p, views_today: p.views_today + 1, views_window: p.views_window + 1, views_total: p.views_total + 1 } : p));
    }).then((fn) => { off = fn; });
    return () => off();
  }, [me]);

  if (me === undefined) {
    return <div className="dash-page"><Nav active={null} /><div className="dash-main"><div className="dash-loading">Loading…</div></div></div>;
  }

  const t = profile ? trend(profile.views_window, profile.views_prev_window) : null;

  return (
    <div className="dash-page an-page">
      <Nav active={null} />
      <div className="dash-main">
        <div className="dash-head">
          <div>
            <div className="t-eyebrow">Analytics</div>
            <h1 className="an-title page-h1">What&apos;s happening with your account</h1>
          </div>
          <div className="an-range" role="tablist" aria-label="Time range">
            {RANGES.map((r) => (
              <button key={r} role="tab" aria-selected={days === r} className={"an-range-btn" + (days === r ? " is-active" : "")} onClick={() => setDays(r)}>
                {r}d
              </button>
            ))}
          </div>
        </div>

        {loading && !profile ? (
          <div className="dash-loading">Crunching your numbers…</div>
        ) : (
          <>
            {/* Profile views */}
            <section className="an-section">
              <div className="an-section-head">
                <span className="t-eyebrow">Profile views</span>
                <span className="an-live"><span className="an-live-dot" /> live</span>
              </div>
              <div className="dash-stats an-stats">
                <div className="dash-stat">
                  <div className="dash-stat-label">Views · last {profile?.window_days}d</div>
                  <div className="dash-stat-value">{profile?.views_window ?? 0}</div>
                  {t && (
                    <div className={"dash-stat-sub an-trend " + t.dir}>
                      {t.dir === "up" ? "▲" : t.dir === "down" ? "▼" : "·"} {t.pct}% vs prev {profile?.window_days}d
                    </div>
                  )}
                </div>
                <div className="dash-stat accent">
                  <div className="dash-stat-label">Views today</div>
                  <div className="dash-stat-value">{profile?.views_today ?? 0}</div>
                  <div className="dash-stat-sub">updates in real time</div>
                </div>
                <div className="dash-stat">
                  <div className="dash-stat-label">Unique viewers</div>
                  <div className="dash-stat-value">{profile?.unique_viewers_window ?? 0}</div>
                  <div className="dash-stat-sub">signed-in, last {profile?.window_days}d</div>
                </div>
                <div className="dash-stat">
                  <div className="dash-stat-label">All-time views</div>
                  <div className="dash-stat-value">{profile?.views_total ?? 0}</div>
                  <div className="dash-stat-sub">since you joined</div>
                </div>
              </div>
              {profile && profile.series.length > 0 && (
                <div className="an-spark-card">
                  <Sparkline series={profile.series} />
                  <div className="an-spark-axis"><span>{profile.series[0]?.day}</span><span>today</span></div>
                </div>
              )}
              <div className="dash-secondary">
                <div className="dash-mini"><span className="dash-mini-n">{profile?.applications_received ?? 0}</span><span className="dash-mini-l">applications received</span></div>
                <div className="dash-mini"><span className="dash-mini-n">{profile?.gigs_open ?? 0}</span><span className="dash-mini-l">open listings</span></div>
              </div>
            </section>

            {/* Listing analytics */}
            <section className="an-section">
              <div className="an-section-head"><span className="t-eyebrow">Listing analytics</span></div>
              {listings.length === 0 ? (
                <div className="dash-empty">
                  <div className="dash-empty-title">No listings yet</div>
                  <p>Post a brief and you&apos;ll see views, applications, and how well each one converts right here.</p>
                  <a className="btn primary" href="/post">Post a brief</a>
                </div>
              ) : (
                <div className="an-table">
                  <div className="an-row an-row-head">
                    <span>Listing</span>
                    <span className="an-num">Views · {days}d</span>
                    <span className="an-num">Applications</span>
                    <span className="an-num">Conversion</span>
                  </div>
                  {listings.map((g) => (
                    <a className="an-row" key={g.gig_id} href={`/gig/${encodeURIComponent(g.gig_id)}`}>
                      <span className="an-listing">
                        <span className="an-listing-title">{g.title || "Untitled"}</span>
                        <span className="an-listing-sub">{g.role} · <StatusPill status={g.status} /></span>
                      </span>
                      <span className="an-num"><strong>{g.views_window}</strong><span className="an-num-sub">{g.views_total} all-time</span></span>
                      <span className="an-num"><strong>{g.applications}</strong><span className="an-num-sub">{g.accepted} accepted</span></span>
                      <span className="an-num"><strong>{g.conversion_pct}%</strong><span className="an-num-sub">views → apps</span></span>
                    </a>
                  ))}
                </div>
              )}
            </section>

            <p className="an-foot">Self-views aren&apos;t counted. Signed-in viewers are de-duplicated to one view per day; anonymous visits count toward reach.</p>
          </>
        )}
      </div>
    </div>
  );
}
