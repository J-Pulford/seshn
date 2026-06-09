"use client";

import { useEffect, useState } from "react";
import Nav from "@/components/Nav";
import { listProfiles } from "@/lib/seshn/profiles";
import { requireProfile } from "@/lib/seshn/auth";
import { PROFILE_ROLES, PROFILE_GENRES } from "@/lib/seshn/constants";
import type { Profile } from "@/lib/seshn/types";
import "./browse.css";

const QUICK_LOCATIONS = ["Remote", "NYC", "LA", "London", "Berlin"];
const profileHref = (u: string) => `/profile/${encodeURIComponent(u || "")}`;

function _hash(s: string) {
  let h = 2166136261 >>> 0;
  s = String(s || "x");
  for (let i = 0; i < s.length; i++) {
    h ^= s.charCodeAt(i);
    h = Math.imul(h, 16777619);
  }
  return h >>> 0;
}
function initialsOf(name?: string) {
  if (!name) return "··";
  const parts = name.trim().split(/\s+/).filter(Boolean);
  if (parts.length >= 2) return (parts[0][0] + parts[1][0]).toUpperCase();
  return (parts[0] || "··").slice(0, 2).toUpperCase();
}

type IconKind = "search" | "check" | "grid" | "list";
const Icon = ({ kind, size = 16, color }: { kind: IconKind; size?: number; color?: string }) => {
  const c = { width: size, height: size, viewBox: "0 0 24 24", fill: "none", stroke: color || "currentColor", strokeWidth: 2, style: { display: "block" } };
  if (kind === "search") return (<span style={{ display: "inline-flex", color }}><svg {...c}><circle cx={11} cy={11} r={7} /><path d="m20 20-3.5-3.5" /></svg></span>);
  if (kind === "check") return (<span style={{ display: "inline-flex", color }}><svg {...c} strokeWidth={2.5}><path d="M5 12l5 5L20 7" /></svg></span>);
  if (kind === "grid") return (<span style={{ display: "inline-flex", color }}><svg {...c}><rect x="3" y="3" width="7" height="7" /><rect x="14" y="3" width="7" height="7" /><rect x="3" y="14" width="7" height="7" /><rect x="14" y="14" width="7" height="7" /></svg></span>);
  return (<span style={{ display: "inline-flex", color }}><svg {...c}><path d="M8 6h13M8 12h13M8 18h13M3 6h.01M3 12h.01M3 18h.01" /></svg></span>);
};

function ArtistCard({ profile }: { profile: Profile }) {
  const bgColors = ["#f5e6d3", "#d3e8f5", "#e8d3f5", "#d3f5e0", "#f5d3d3", "#f5f0d3", "#d3d3f5"];
  const ini = initialsOf(profile.display_name);
  const bg = bgColors[_hash(profile.username || ini) % bgColors.length];
  const href = profileHref(profile.username);
  const sub = [profile.location, profile.pronouns].filter(Boolean).join(" · ") || "—";
  return (
    <div className="card" style={{ padding: 16, display: "flex", flexDirection: "column", gap: 11 }}>
      <div className="row" style={{ gap: 12 }}>
        <a href={href}>
          <span className="avatar lg" style={{ background: profile.avatar_url ? "var(--ph)" : bg, color: "#3a3a38", fontWeight: 700, fontFamily: "var(--font-display)", overflow: "hidden" }}>
            {profile.avatar_url ? <img src={profile.avatar_url} alt="" style={{ width: "100%", height: "100%", objectFit: "cover" }} /> : ini}
          </span>
        </a>
        <div className="col" style={{ gap: 3, flex: 1, minWidth: 0 }}>
          <div className="row" style={{ gap: 6 }}>
            <a href={href} style={{ fontFamily: "var(--font-display)", fontWeight: 600, fontSize: 14, color: "var(--ink)", textDecoration: "none" }}>{profile.display_name}</a>
            {profile.is_pro && <span className="pill solid" style={{ fontSize: 9, padding: "2px 5px" }}>✓ Pro</span>}
          </div>
          <span className="t-meta">{sub}</span>
          <div className="row" style={{ gap: 4, marginTop: 3, flexWrap: "wrap" }}>
            {(profile.roles || []).slice(0, 3).map((r) => <span key={r} className="pill accent" style={{ fontSize: 10 }}>{r}</span>)}
          </div>
        </div>
      </div>
      {profile.bio ? (
        <div style={{ fontSize: 12.5, color: "var(--ink-2)", lineHeight: 1.5, overflow: "hidden", display: "-webkit-box", WebkitLineClamp: 2, WebkitBoxOrient: "vertical" }}>{profile.bio}</div>
      ) : (
        <div className="col" style={{ gap: 5 }}>
          <div className="ph-line" style={{ width: "100%" }} />
          <div className="ph-line" style={{ width: "72%" }} />
        </div>
      )}
      {(profile.genres || []).length > 0 && (
        <div className="row" style={{ gap: 4, flexWrap: "wrap" }}>
          {profile.genres.slice(0, 4).map((t) => <span key={t} className="pill" style={{ fontSize: 10 }}>{t}</span>)}
        </div>
      )}
      <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", paddingTop: 10, borderTop: "1px solid var(--line-soft)" }}>
        <span className="t-meta">@{profile.username}</span>
        <a href={href} className="btn sm">View profile</a>
      </div>
    </div>
  );
}

function CheckGroup({ title, options, selected, onToggle }: { title: string; options: readonly string[]; selected: Set<string>; onToggle: (v: string) => void }) {
  return (
    <div className="col" style={{ gap: 8 }}>
      <span className="t-eyebrow">{title}</span>
      <div className="col" style={{ gap: 3 }}>
        {options.map((label) => {
          const sel = selected.has(label);
          return (
            <label key={label} style={{ display: "flex", alignItems: "center", justifyContent: "space-between", padding: "5px 0", cursor: "pointer" }} onClick={() => onToggle(label)}>
              <div className="row" style={{ gap: 8 }}>
                <span className={"check-box" + (sel ? " checked" : "")}>{sel && <Icon kind="check" size={9} color="var(--frame)" />}</span>
                <span style={{ fontSize: 12.5, color: sel ? "var(--ink)" : "var(--ink-2)" }}>{label}</span>
              </div>
            </label>
          );
        })}
      </div>
    </div>
  );
}

export default function BrowsePage() {
  const [view, setView] = useState<"grid" | "list">("grid");
  const [sort, setSort] = useState<"newest" | "az">("newest");
  const [selectedRoles, setSelectedRoles] = useState<Set<string>>(new Set());
  const [selectedGenres, setSelectedGenres] = useState<Set<string>>(new Set());
  const [location, setLocation] = useState("");
  const [proOnly, setProOnly] = useState(false);
  const [search, setSearch] = useState("");
  const [profiles, setProfiles] = useState<Profile[] | null>(null);
  const [meId, setMeId] = useState<string | null>(null);
  const [err, setErr] = useState("");
  const [filtersOpen, setFiltersOpen] = useState(false);

  useEffect(() => {
    requireProfile({ allowAnon: true }).then((r) => {
      if (r && r.user) setMeId(r.user.id);
    });
  }, []);

  useEffect(() => {
    const t = setTimeout(() => {
      listProfiles({
        roles: Array.from(selectedRoles),
        genres: Array.from(selectedGenres),
        location,
        search,
        sort: sort === "az" ? "name" : "newest",
        proOnly,
        excludeId: meId,
        limit: 60,
      })
        .then(setProfiles)
        .catch((e) => {
          console.error(e);
          setProfiles([]);
        });
    }, 250);
    return () => clearTimeout(t);
  }, [selectedRoles, selectedGenres, location, search, sort, proOnly, meId]);

  const toggleSet = (setter: React.Dispatch<React.SetStateAction<Set<string>>>) => (v: string) =>
    setter((prev) => {
      const next = new Set(prev);
      if (next.has(v)) next.delete(v);
      else next.add(v);
      return next;
    });
  const clearAll = () => {
    setSelectedRoles(new Set());
    setSelectedGenres(new Set());
    setLocation("");
    setSearch("");
    setProOnly(false);
  };
  const activeFilters = selectedRoles.size + selectedGenres.size + (location ? 1 : 0) + (search ? 1 : 0) + (proOnly ? 1 : 0);

  return (
    <div style={{ minHeight: "100vh", background: "var(--bg)", display: "flex", flexDirection: "column" }}>
      <Nav active="browse" />
      <div className="browse-grid">
        <div className={"browse-filters-drawer" + (filtersOpen ? " open" : "")}>
          <div className="browse-filters-drawer-header">
            <span style={{ fontFamily: "var(--font-display)", fontWeight: 700, fontSize: 18 }}>Filters</span>
            <button className="btn sm" onClick={() => setFiltersOpen(false)}>Done</button>
          </div>
          <aside className="browse-filters-aside" style={{ position: "sticky", top: 82, height: "calc(100vh - 100px)", overflowY: "auto", paddingRight: 4 }}>
            <div className="col" style={{ gap: 22 }}>
              <CheckGroup title="Roles" options={PROFILE_ROLES} selected={selectedRoles} onToggle={toggleSet(setSelectedRoles)} />
              <div style={{ height: 1, background: "var(--line-soft)" }} />
              <CheckGroup title="Genres" options={PROFILE_GENRES} selected={selectedGenres} onToggle={toggleSet(setSelectedGenres)} />
              <div style={{ height: 1, background: "var(--line-soft)" }} />
              <div className="col" style={{ gap: 8 }}>
                <span className="t-eyebrow">Location</span>
                <input className="input" placeholder="City or 'Remote'" value={location} onChange={(e) => setLocation(e.target.value)} />
                <div className="row" style={{ gap: 6, flexWrap: "wrap" }}>
                  {QUICK_LOCATIONS.map((loc) => (
                    <span key={loc} className={"pill" + (location === loc ? " solid" : "")} style={{ cursor: "pointer" }} onClick={() => setLocation(location === loc ? "" : loc)}>{loc}</span>
                  ))}
                </div>
              </div>
              <div style={{ height: 1, background: "var(--line-soft)" }} />
              <div className="col" style={{ gap: 8 }}>
                <span className="t-eyebrow">Status</span>
                <label className="row" style={{ gap: 8, cursor: "pointer", padding: "5px 0" }} onClick={() => setProOnly((p) => !p)}>
                  <span className={"check-box" + (proOnly ? " checked" : "")}>{proOnly && <Icon kind="check" size={9} color="var(--frame)" />}</span>
                  <span style={{ fontSize: 12.5, color: proOnly ? "var(--ink)" : "var(--ink-2)" }}>Pro members only</span>
                </label>
              </div>
              <button className="btn" style={{ width: "100%", marginTop: 4, opacity: activeFilters === 0 ? 0.5 : 1 }} onClick={clearAll} disabled={activeFilters === 0}>
                Clear all filters {activeFilters > 0 && `(${activeFilters})`}
              </button>
            </div>
          </aside>
        </div>

        <main style={{ minWidth: 0 }}>
          <div style={{ marginBottom: 18 }}>
            <div className="row" style={{ gap: 8, padding: "10px 14px", background: "var(--surface-2)", borderRadius: 999, border: "1px solid var(--line)" }}>
              <Icon kind="search" size={15} color="var(--ink-3)" />
              <input type="text" placeholder="Search by name, username, or bio…" value={search} onChange={(e) => setSearch(e.target.value)}
                style={{ flex: 1, border: 0, background: "transparent", outline: "none", fontSize: 13, fontFamily: "var(--font-body)", color: "var(--ink)" }} />
              {search && <span style={{ cursor: "pointer", color: "var(--ink-3)", fontSize: 14 }} onClick={() => setSearch("")}>✕</span>}
            </div>
          </div>

          <div style={{ display: "flex", alignItems: "flex-start", justifyContent: "space-between", marginBottom: 18, gap: 12 }}>
            <div>
              <h1 className="page-h1" style={{ fontFamily: "var(--font-display)", fontWeight: 600, fontSize: 22, letterSpacing: "-0.02em" }}>Browse artists</h1>
              <span className="t-meta" style={{ fontSize: 12 }}>
                {profiles === null ? "Loading…" : `${profiles.length} artist${profiles.length === 1 ? "" : "s"}${activeFilters > 0 ? " match your filters" : ""}`}
              </span>
            </div>
            <div className="row" style={{ gap: 8, flexShrink: 0, flexWrap: "wrap" }}>
              <button className="browse-filters-toggle btn sm" onClick={() => setFiltersOpen(true)}>Filters{activeFilters > 0 ? " · " + activeFilters : ""}</button>
              {([["newest", "Newest"], ["az", "A–Z"]] as const).map(([k, label]) => (
                <span key={k} className={"pill" + (sort === k ? " dark" : "")} style={{ cursor: "pointer" }} onClick={() => setSort(k)}>{label}</span>
              ))}
              <div style={{ width: 1, height: 20, background: "var(--line)", margin: "0 2px" }} />
              <span onClick={() => setView("grid")} style={{ cursor: "pointer", color: view === "grid" ? "var(--ink)" : "var(--ink-4)" }}><Icon kind="grid" size={16} /></span>
              <span onClick={() => setView("list")} style={{ cursor: "pointer", color: view === "list" ? "var(--ink)" : "var(--ink-4)" }}><Icon kind="list" size={16} /></span>
            </div>
          </div>

          {profiles === null ? (
            <div style={{ padding: "60px 0", textAlign: "center", color: "var(--ink-3)", fontFamily: "var(--font-display)", fontSize: 13 }}>Loading artists…</div>
          ) : profiles.length === 0 ? (
            <div className="card" style={{ padding: "40px 20px", textAlign: "center", display: "flex", flexDirection: "column", gap: 12, alignItems: "center" }}>
              <div style={{ fontFamily: "var(--font-display)", fontWeight: 700, fontSize: 22, color: "var(--ink)" }}>{activeFilters > 0 ? "No artists match your filters." : "No artists on Seshn yet."}</div>
              <div style={{ color: "var(--ink-3)", fontSize: 14, maxWidth: 380 }}>{activeFilters > 0 ? "Try removing some filters or broadening your search." : "Be the first to invite people. As folks join and complete their profiles, they'll show up here."}</div>
              {activeFilters > 0 && <button className="btn" onClick={clearAll} style={{ marginTop: 6 }}>Clear all filters</button>}
              {err && <div style={{ color: "var(--danger)", fontSize: 12 }}>{err}</div>}
            </div>
          ) : (
            <div className="browse-cards-grid" style={{ display: "grid", gridTemplateColumns: view === "grid" ? "repeat(3, 1fr)" : "1fr", gap: 14 }}>
              {profiles.map((p) => <ArtistCard key={p.id} profile={p} />)}
            </div>
          )}
        </main>
      </div>
    </div>
  );
}
