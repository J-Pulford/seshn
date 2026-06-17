"use client";

import { useEffect, useState, type CSSProperties } from "react";
import Nav from "@/components/Nav";
import { AlbumArt } from "@/components/visual/AlbumArt";
import { getUser, listProfiles } from "@/lib/seshn/profiles";
import { listGigs } from "@/lib/seshn/gigs";
import { GIG_ROLES, GIG_GENRES } from "@/lib/seshn/constants";
import WelcomeChecklist from "@/components/WelcomeChecklist";
import { ProducerBadge } from "@/components/ProducerBadge";
import type { Gig, Profile } from "@/lib/seshn/types";
import "./feed.css";

// Legacy link targets — flip to Next routes as each page is ported.
const R = {
  gig: (id?: string) => (id ? `/gig/${encodeURIComponent(id)}` : "/feed"),
  profile: (u?: string) => `/profile/${encodeURIComponent(u || "")}`,
  post: "/post",
  browse: "/browse",
  pro: "/pro",
};

const FEED_COMPS: [string, string][] = [
  ["Paid", "paid"], ["Split / royalty", "split"], ["Trade / barter", "trade"], ["Unpaid", "unpaid"],
];

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
function deadlineLabel(date?: string | null) {
  if (!date) return "no deadline";
  const days = Math.ceil((new Date(date).getTime() - Date.now()) / 86400000);
  if (days < 0) return "closed";
  if (days === 0) return "closes today";
  if (days === 1) return "1 day left";
  return days + " days left";
}
function compLabel(g: Gig) {
  if (g.comp === "paid" && g.pay_amount) return "Paid · $" + Number(g.pay_amount).toLocaleString();
  if (g.comp === "paid") return "Paid";
  if (g.comp === "split") return "Split";
  if (g.comp === "trade") return "Trade";
  return "Unpaid";
}
function initialsOf(name?: string) {
  if (!name) return "··";
  return name.trim().split(/\s+/).map((s) => s[0]).join("").slice(0, 2).toUpperCase();
}

const Check = ({ size = 9 }: { size?: number }) => (
  <svg width={size} height={size} viewBox="0 0 24 24" fill="none" stroke="var(--frame)" strokeWidth={2.5} style={{ display: "block" }}>
    <path d="M5 12l5 5L20 7" />
  </svg>
);

function FilterGroup({ title, items, selected, onToggle }: { title: string; items: [string, string][]; selected: Set<string>; onToggle: (v: string) => void }) {
  return (
    <div className="col" style={{ gap: 8 }}>
      <span className="t-eyebrow">{title}</span>
      <div className="col" style={{ gap: 2 }}>
        {items.map(([label, value]) => {
          const sel = selected.has(value);
          return (
            <label key={value} style={{ display: "flex", alignItems: "center", justifyContent: "space-between", padding: "5px 0", cursor: "pointer", userSelect: "none" }} onClick={() => onToggle(value)}>
              <div className="row" style={{ gap: 8 }}>
                <span className={"check-box" + (sel ? " checked" : "")}>{sel && <Check />}</span>
                <span style={{ fontSize: 12.5, color: sel ? "var(--ink)" : "var(--ink-2)" }}>{label}</span>
              </div>
            </label>
          );
        })}
      </div>
    </div>
  );
}

function GigCard({ gig }: { gig: Gig }) {
  const owner = gig.owner || ({} as NonNullable<Gig["owner"]>);
  const isBoosted = !!(gig.boosted_until && new Date(gig.boosted_until) > new Date());
  const tags = (gig.genres || []).slice(0, 4);
  const roleTag = owner?.is_pro ? "PRO" : "ART";
  const showArt = isBoosted || (gig.genres && gig.genres.length);
  return (
    <div className={"gig" + (isBoosted ? " boost" : "")}>
      <div className="row" style={{ gap: 10 }}>
        <span className="avatar md" style={{ background: "var(--ph-2)" }}>
          {initialsOf(owner?.display_name)}
          <span className="role-dot">{roleTag}</span>
        </span>
        <div className="col" style={{ flex: 1, gap: 2, minWidth: 0 }}>
          <div className="row" style={{ gap: 6 }}>
            <span style={{ fontWeight: 600, fontFamily: "var(--font-display)", fontSize: 13 }}>{owner?.display_name || "Artist"}</span>
            {owner?.has_producer_badge && <ProducerBadge compact />}
            <span className="dot" />
            <span className="t-meta">{timeAgo(gig.created_at)} ago</span>
            {isBoosted && <span className="pill solid" style={{ marginLeft: "auto", fontSize: 9 }}>★ Boosted</span>}
          </div>
          <div className="row" style={{ gap: 6 }}>
            <span className="pill accent">{(gig.role || "Collaborator")} needed</span>
            <span className="t-meta">· {compLabel(gig)}</span>
          </div>
        </div>
        {gig.cover_url ? (
          <img src={gig.cover_url} alt="" style={{ width: 48, height: 48, borderRadius: 6, objectFit: "cover", display: "block", flex: "0 0 auto" }} />
        ) : (
          showArt && <AlbumArt seed={gig.title || "art"} size={48} radius={6} />
        )}
      </div>
      <div style={{ fontFamily: "var(--font-display)", fontWeight: 600, fontSize: 16, letterSpacing: "-0.012em", lineHeight: 1.2 }}>{gig.title}</div>
      {gig.description && (
        <div style={{ fontSize: 13, color: "var(--ink-2)", lineHeight: 1.5, overflow: "hidden", display: "-webkit-box", WebkitLineClamp: 2, WebkitBoxOrient: "vertical" }}>{gig.description}</div>
      )}
      <div className="row" style={{ gap: 6, flexWrap: "wrap" }}>
        {tags.map((t) => <span key={t} className="pill">{t}</span>)}
      </div>
      <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", gap: 12, paddingTop: 10, borderTop: "1px solid var(--line-soft)" }}>
        <span className="t-meta">{deadlineLabel(gig.deadline)}</span>
        <div className="row" style={{ gap: 8 }}>
          <a href={R.gig(gig.id)} className="btn sm">View</a>
          <a href={R.gig(gig.id)} className="btn primary sm">Apply</a>
        </div>
      </div>
    </div>
  );
}

function SkeletonCard() {
  return (
    <div className="gig" aria-hidden="true">
      <div className="row" style={{ gap: 10 }}>
        <div className="skel" style={{ width: 36, height: 36, borderRadius: "50%", flex: "0 0 auto" }} />
        <div className="col" style={{ flex: 1, gap: 6 }}>
          <div className="skel" style={{ height: 10, width: "40%" }} />
          <div className="skel" style={{ height: 10, width: "60%" }} />
        </div>
      </div>
      <div className="skel" style={{ height: 16, width: "80%", marginTop: 4 }} />
      <div className="skel" style={{ height: 10, width: "100%" }} />
      <div className="skel" style={{ height: 10, width: "92%" }} />
      <div className="row" style={{ justifyContent: "space-between", paddingTop: 10 }}>
        <div className="skel" style={{ height: 10, width: 64 }} />
        <div className="skel" style={{ height: 28, width: 120, borderRadius: 6 }} />
      </div>
    </div>
  );
}

function SuggestedArtist({ profile }: { profile: Profile }) {
  const href = R.profile(profile.username);
  const sub = [profile.roles?.[0], profile.location].filter(Boolean).join(" · ");
  return (
    <div className="row" style={{ gap: 10 }}>
      <a href={href}>
        <span className="avatar md" style={{ background: "var(--ph-2)", overflow: "hidden" }}>
          {profile.avatar_url ? <img src={profile.avatar_url} alt="" style={{ width: "100%", height: "100%", objectFit: "cover", display: "block" }} /> : initialsOf(profile.display_name)}
        </span>
      </a>
      <div className="col" style={{ gap: 1, flex: 1, minWidth: 0 }}>
        <span style={{ display: "inline-flex", alignItems: "center", gap: 5, minWidth: 0 }}><a href={href} style={{ fontFamily: "var(--font-display)", fontSize: 12.5, fontWeight: 600, color: "var(--ink)", textDecoration: "none", overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>{profile.display_name || profile.username}</a>{profile.has_producer_badge && <ProducerBadge compact />}</span>
        <span className="t-meta" style={{ overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>{sub || "·"}</span>
      </div>
      <a href={href} className="btn sm">View</a>
    </div>
  );
}

export default function FeedPage() {
  const [gigs, setGigs] = useState<Gig[] | null>(null);
  const [suggested, setSuggested] = useState<Profile[] | null>(null);
  const [err, setErr] = useState("");
  const [filtersOpen, setFiltersOpen] = useState(false);
  const [roles, setRoles] = useState<Set<string>>(new Set());
  const [genres, setGenres] = useState<Set<string>>(new Set());
  const [comps, setComps] = useState<Set<string>>(new Set());
  const [location, setLocation] = useState("");
  const [search, setSearch] = useState("");
  const [sort, setSort] = useState<"default" | "newest">("default");
  const [view, setView] = useState<"grid" | "list">("grid");

  // Read persisted view after mount (localStorage is unavailable during SSR).
  useEffect(() => {
    try {
      if (localStorage.getItem("seshn:feed_view") === "list") setView("list");
    } catch {
      /* ignore */
    }
  }, []);
  useEffect(() => {
    try {
      localStorage.setItem("seshn:feed_view", view);
    } catch {
      /* ignore */
    }
  }, [view]);

  const toggleIn = (setter: React.Dispatch<React.SetStateAction<Set<string>>>) => (value: string) => {
    setter((prev) => {
      const next = new Set(prev);
      if (next.has(value)) next.delete(value);
      else next.add(value);
      return next;
    });
  };
  const clearAll = () => {
    setRoles(new Set());
    setGenres(new Set());
    setComps(new Set());
    setLocation("");
    setSearch("");
  };
  const activeFilterCount = roles.size + genres.size + comps.size + (location.trim() ? 1 : 0) + (search.trim() ? 1 : 0);

  useEffect(() => {
    setGigs(null);
    const t = setTimeout(() => {
      listGigs({
        limit: 30,
        roles: Array.from(roles),
        genres: Array.from(genres),
        comps: Array.from(comps) as never,
        location,
        search,
        sort,
      })
        .then(setGigs)
        .catch((e) => {
          setErr((e as Error)?.message || "Couldn't load feed.");
          setGigs([]);
        });
    }, 220);
    return () => clearTimeout(t);
  }, [roles, genres, comps, location, search, sort]);

  useEffect(() => {
    getUser().then((u) => {
      listProfiles({ limit: 5, excludeId: u ? u.id : null })
        .then((list) => setSuggested(list || []))
        .catch(() => setSuggested([]));
    });
  }, []);

  const sortPill = (active: boolean): CSSProperties => ({
    cursor: "pointer",
    background: active ? "var(--ink)" : undefined,
    color: active ? "var(--frame)" : undefined,
    borderColor: active ? "transparent" : undefined,
  });

  return (
    <div style={{ minHeight: "100vh", background: "var(--bg)", display: "flex", flexDirection: "column" }}>
      <Nav active="feed" />
      <div className="feed-grid">
        {/* Filters (drawer on mobile) */}
        <div className={"feed-filters-drawer" + (filtersOpen ? " open" : "")}>
          <div className="feed-filters-drawer-header">
            <span style={{ fontFamily: "var(--font-display)", fontWeight: 700, fontSize: 18 }}>Filters</span>
            <button className="btn sm" onClick={() => setFiltersOpen(false)}>Done</button>
          </div>
          <aside className="feed-filters-aside" style={{ position: "sticky", top: 82, height: "calc(100vh - 100px)", overflowY: "auto", paddingRight: 4 }}>
            <div className="col" style={{ gap: 22 }}>
              <div className="col" style={{ gap: 6 }}>
                <span className="t-eyebrow">Search</span>
                <input type="text" value={search} onChange={(e) => setSearch(e.target.value)} placeholder="Title…"
                  style={{ padding: "8px 12px", border: "1px solid var(--line)", borderRadius: 8, fontFamily: "var(--font-body)", fontSize: 13, background: "var(--surface)", color: "var(--ink)", outline: "none", width: "100%" }} />
              </div>
              <FilterGroup title="Role needed" items={GIG_ROLES.map((r) => [r, r])} selected={roles} onToggle={toggleIn(setRoles)} />
              <div style={{ height: 1, background: "var(--line-soft)" }} />
              <FilterGroup title="Compensation" items={FEED_COMPS} selected={comps} onToggle={toggleIn(setComps)} />
              <div style={{ height: 1, background: "var(--line-soft)" }} />
              <FilterGroup title="Genre" items={GIG_GENRES.map((g) => [g, g])} selected={genres} onToggle={toggleIn(setGenres)} />
              <div style={{ height: 1, background: "var(--line-soft)" }} />
              <div className="col" style={{ gap: 6 }}>
                <span className="t-eyebrow">Location</span>
                <input type="text" value={location} onChange={(e) => setLocation(e.target.value)} placeholder="Remote, London…"
                  style={{ padding: "8px 12px", border: "1px solid var(--line)", borderRadius: 8, fontFamily: "var(--font-body)", fontSize: 13, background: "var(--surface)", color: "var(--ink)", outline: "none", width: "100%" }} />
              </div>
              {activeFilterCount > 0 && <button className="btn" style={{ width: "100%" }} onClick={clearAll}>Clear all filters</button>}
            </div>
          </aside>
        </div>

        {/* Main feed */}
        <main style={{ minWidth: 0 }}>
          <WelcomeChecklist />
          <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", marginBottom: 16, gap: 12, flexWrap: "wrap" }}>
            <h1 className="page-h1" style={{ fontFamily: "var(--font-display)", fontWeight: 600, fontSize: 22, letterSpacing: "-0.02em" }}>
              Live feed
              {gigs && <span style={{ fontSize: 13, color: "var(--ink-3)", fontWeight: 400, marginLeft: 8 }}>· {gigs.length} {gigs.length === 1 ? "gig" : "gigs"}</span>}
            </h1>
            <div className="row" style={{ gap: 6, flexWrap: "wrap" }}>
              <button className="feed-filters-toggle btn sm" onClick={() => setFiltersOpen(true)}>
                Filters{activeFilterCount > 0 ? " · " + activeFilterCount : ""}
              </button>
              <span className={"pill" + (sort === "default" ? "" : " ghost")} style={sortPill(sort === "default")} onClick={() => setSort("default")}>Recommended</span>
              <span className={"pill" + (sort === "newest" ? "" : " ghost")} style={sortPill(sort === "newest")} onClick={() => setSort("newest")}>Newest</span>
              <div style={{ width: 1, height: 20, background: "var(--line)", margin: "0 2px" }} />
              <button type="button" onClick={() => setView("grid")} aria-label="Card view" aria-pressed={view === "grid"} style={{ background: "none", border: "none", padding: 4, cursor: "pointer", color: view === "grid" ? "var(--ink)" : "var(--ink-4)", display: "inline-flex", alignItems: "center" }}>
                <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><rect x="3" y="3" width="7" height="7" /><rect x="14" y="3" width="7" height="7" /><rect x="3" y="14" width="7" height="7" /><rect x="14" y="14" width="7" height="7" /></svg>
              </button>
              <button type="button" onClick={() => setView("list")} aria-label="List view" aria-pressed={view === "list"} style={{ background: "none", border: "none", padding: 4, cursor: "pointer", color: view === "list" ? "var(--ink)" : "var(--ink-4)", display: "inline-flex", alignItems: "center" }}>
                <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><path d="M8 6h13M8 12h13M8 18h13M3 6h.01M3 12h.01M3 18h.01" /></svg>
              </button>
            </div>
          </div>

          <div className={"feed-cards" + ((gigs === null || gigs.length > 0) && view === "grid" ? " grid" : "")}>
            {gigs === null ? (
              Array.from({ length: 6 }).map((_, i) => <SkeletonCard key={i} />)
            ) : gigs.length === 0 ? (
              activeFilterCount > 0 ? (
                <div className="gig" style={{ alignItems: "center", textAlign: "center", padding: "40px 20px", gap: 12 }}>
                  <div style={{ fontFamily: "var(--font-display)", fontWeight: 700, fontSize: 20, color: "var(--ink)" }}>No gigs match your filters.</div>
                  <div style={{ color: "var(--ink-3)", fontSize: 14, maxWidth: 380 }}>Try widening the filters or clearing them.</div>
                  <button className="btn" style={{ marginTop: 6 }} onClick={clearAll}>Clear all filters</button>
                </div>
              ) : (
                <div className="gig" style={{ alignItems: "center", textAlign: "center", padding: "40px 20px", gap: 12 }}>
                  <div style={{ fontFamily: "var(--font-display)", fontWeight: 700, fontSize: 22, color: "var(--ink)" }}>Feed&apos;s quiet right now.</div>
                  <div style={{ color: "var(--ink-3)", fontSize: 14, maxWidth: 380 }}>Be the first to post a brief, once others sign up and post, their gigs will show up here.</div>
                  <a href={R.post} className="btn primary" style={{ marginTop: 6 }}>+ Post the first gig</a>
                  {err && <div style={{ color: "var(--danger)", fontSize: 12, marginTop: 8 }}>{err}</div>}
                </div>
              )
            ) : (
              gigs.map((g) => <GigCard key={g.id} gig={g} />)
            )}
          </div>
        </main>

        {/* Right rail */}
        <aside className="feed-right-rail" style={{ position: "sticky", top: 82, height: "calc(100vh - 100px)", overflowY: "auto" }}>
          <div className="col" style={{ gap: 18 }}>
            <div>
              <div style={{ fontFamily: "var(--font-display)", fontSize: 10, fontWeight: 500, letterSpacing: "0.14em", textTransform: "uppercase", color: "var(--ink-3)", marginBottom: 12 }}>Suggested for you</div>
              <div className="col" style={{ gap: 12 }}>
                {suggested === null ? <span className="t-meta">Loading…</span> : suggested.length === 0 ? <span className="t-meta">No suggestions yet, check back soon.</span> : suggested.map((p) => <SuggestedArtist key={p.id} profile={p} />)}
              </div>
              <a href={R.browse} className="btn ghost" style={{ marginTop: 10, fontSize: 11, padding: "4px 0", color: "var(--ink-3)", textDecoration: "none", display: "block" }}>See all artists →</a>
            </div>
            <div style={{ height: 1, background: "var(--line-soft)" }} />
            <div className="card" style={{ background: "var(--accent-bg)", borderColor: "transparent", padding: 16 }}>
              <div style={{ fontFamily: "var(--font-display)", fontSize: 10, fontWeight: 500, letterSpacing: "0.14em", textTransform: "uppercase", color: "var(--accent-d)", marginBottom: 6 }}>Go Pro</div>
              <div style={{ fontFamily: "var(--font-display)", fontWeight: 600, fontSize: 14, color: "var(--accent-d)", lineHeight: 1.3, marginBottom: 10 }}>Message anyone first, unlock analytics, get the verified badge.</div>
              <a href={R.pro} className="btn dark sm" style={{ textDecoration: "none" }}>Learn more</a>
            </div>
            <div style={{ height: 1, background: "var(--line-soft)" }} />
            <div>
              <div style={{ fontFamily: "var(--font-display)", fontSize: 10, fontWeight: 500, letterSpacing: "0.14em", textTransform: "uppercase", color: "var(--ink-3)", marginBottom: 10 }}>Looking for artists?</div>
              <a href={R.browse} className="btn" style={{ width: "100%", justifyContent: "center" }}>Browse artists →</a>
            </div>
          </div>
        </aside>
      </div>
    </div>
  );
}
