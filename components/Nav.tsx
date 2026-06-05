"use client";

// Shared top nav for in-app pages. Port of seshn-nav.js (was React.createElement;
// now JSX/TSX). Renders the global search, inbox + notifications badges, and the
// mobile menu. Usage: <Nav active="feed" />.
import { useEffect, useRef, useState, type CSSProperties } from "react";
import { getProfile, getUser, listProfiles } from "@/lib/seshn/profiles";
import { listGigs } from "@/lib/seshn/gigs";
import {
  getUnreadNotificationCount,
  listNotifications,
  markAllNotificationsRead,
  markNotificationsRead,
  subscribeToNotifications,
} from "@/lib/seshn/notifications";
import { getUnreadCount, subscribeToMyConversations } from "@/lib/seshn/messaging";
import { countContractsNeedingMySignature } from "@/lib/seshn/contracts";
import { signOut } from "@/lib/seshn/auth";
import type { Gig, Notification, Profile } from "@/lib/seshn/types";
import ThemeToggle from "./ThemeToggle";
import "./nav.css";

export type NavActive = "feed" | "browse" | "applications" | "inbox" | "profile" | null;

// Link targets. Flip each from legacy /app/*.html to its Next route as that
// page is ported. (feed is ported.)
const R = {
  feed: "/feed",
  browse: "/browse",
  applications: "/applications",
  post: "/post",
  inbox: "/inbox",
  settings: "/settings",
  dashboard: "/dashboard",
  contracts: "/contracts",
  profile: (username?: string) => (username ? `/profile/${encodeURIComponent(username)}` : "/feed"),
  gig: (id: string) => `/gig/${encodeURIComponent(id)}`,
  inboxConvo: (id: string) => `/inbox?c=${encodeURIComponent(id)}`,
};

function navInitials(name?: string) {
  if (!name) return "··";
  const parts = name.trim().split(/\s+/).filter(Boolean);
  if (parts.length === 0) return "··";
  if (parts.length === 1) return parts[0].slice(0, 2).toUpperCase();
  return (parts[0][0] + parts[1][0]).toUpperCase();
}

function relativeTime(iso?: string) {
  if (!iso) return "";
  const diff = Date.now() - new Date(iso).getTime();
  const s = Math.round(diff / 1000);
  if (s < 60) return "just now";
  const m = Math.round(s / 60);
  if (m < 60) return m + "m";
  const hrs = Math.round(m / 60);
  if (hrs < 24) return hrs + "h";
  const d = Math.round(hrs / 24);
  if (d < 7) return d + "d";
  return new Date(iso).toLocaleDateString(undefined, { month: "short", day: "numeric" });
}

function notifText(n: Notification) {
  const actor = n.actor?.display_name || n.actor?.username || "Someone";
  const gigTitle = n.gig?.title || n.gig?.role || "your gig";
  if (n.kind === "application_received") return `${actor} applied to ${gigTitle}`;
  if (n.kind === "application_accepted") return `${actor} accepted your application to ${gigTitle}`;
  if (n.kind === "application_rejected") return `${actor} passed on your application to ${gigTitle}`;
  if (n.kind === "message_received") return `${actor} sent you a message`;
  const meetingTitle = n.meeting?.title || "a meeting";
  if (n.kind === "meeting_proposed") return `${actor} proposed ${meetingTitle}`;
  if (n.kind === "meeting_updated") return `${actor} rescheduled ${meetingTitle}`;
  if (n.kind === "meeting_confirmed") return `${actor} confirmed ${meetingTitle}`;
  if (n.kind === "meeting_declined") return `${actor} declined ${meetingTitle}`;
  if (n.kind === "meeting_cancelled") return `${actor} cancelled ${meetingTitle}`;
  return "New activity";
}

function notifHref(n: Notification): string | null {
  if (n.kind === "application_received" && n.gig_id) return R.gig(n.gig_id);
  if ((n.kind === "application_accepted" || n.kind === "application_rejected") && n.gig_id) return R.gig(n.gig_id);
  if (n.kind === "message_received" && n.conversation_id) return R.inboxConvo(n.conversation_id);
  if (n.kind.startsWith("meeting_") && n.conversation_id) return R.inboxConvo(n.conversation_id);
  return null;
}

function iconBtnStyle(isActive: boolean): CSSProperties {
  return {
    display: "inline-flex", alignItems: "center", justifyContent: "center",
    width: 34, height: 34, borderRadius: 8,
    color: isActive ? "var(--accent-d)" : "var(--ink-2)",
    background: isActive ? "var(--accent-bg)" : "transparent",
    textDecoration: "none", cursor: "pointer", border: "none", position: "relative",
  };
}

type IconKind = "search" | "message" | "bell" | "contract";
function IconSvg({ kind, size = 18 }: { kind: IconKind; size?: number }) {
  const common = {
    width: size, height: size, viewBox: "0 0 24 24", fill: "none", stroke: "currentColor",
    strokeWidth: 2, strokeLinecap: "round" as const, strokeLinejoin: "round" as const, style: { display: "block" },
  };
  if (kind === "search") return (<svg {...common}><circle cx={11} cy={11} r={7} /><path d="m20 20-3.5-3.5" /></svg>);
  if (kind === "message") return (<svg {...common}><path d="M21 12a8 8 0 0 1-12 7l-5 1 1-5a8 8 0 1 1 16-3z" /></svg>);
  if (kind === "contract") return (<svg {...common}><path d="M14 3H7a2 2 0 0 0-2 2v14a2 2 0 0 0 2 2h10a2 2 0 0 0 2-2V8z" /><path d="M14 3v5h5M8.5 13.5h5M8.5 17h3" /></svg>);
  return (<svg {...common}><path d="M6 8a6 6 0 0 1 12 0c0 7 3 9 3 9H3s3-2 3-9" /><path d="M10 21a2 2 0 0 0 4 0" /></svg>);
}

function Badge({ count }: { count: number }) {
  return (
    <span style={{ position: "absolute", top: 4, right: 4, minWidth: 16, height: 16, padding: "0 4px", borderRadius: 999, background: "var(--accent)", color: "#062c19", fontFamily: "var(--font-display)", fontWeight: 700, fontSize: 10, display: "inline-flex", alignItems: "center", justifyContent: "center", border: "2px solid var(--frame)", boxSizing: "content-box", lineHeight: 1 }}>
      {count > 9 ? "9+" : String(count)}
    </span>
  );
}

function NotificationRow({ notif: n, onClick }: { notif: Notification; onClick: (n: Notification) => void }) {
  const actor = n.actor || ({} as NonNullable<Notification["actor"]>);
  const href = notifHref(n);
  const unread = !n.read_at;
  return (
    <button onClick={() => onClick(n)} style={{ display: "flex", gap: 10, alignItems: "flex-start", padding: "12px 14px", background: unread ? "var(--accent-bg)" : "transparent", border: "none", borderBottom: "1px solid var(--line-soft)", textAlign: "left", cursor: href ? "pointer" : "default", width: "100%", fontFamily: "var(--font-body)", color: "var(--ink)", opacity: unread ? 1 : 0.85 }}>
      <span style={{ width: 32, height: 32, borderRadius: "50%", background: "var(--ph)", overflow: "hidden", flexShrink: 0, display: "inline-flex", alignItems: "center", justifyContent: "center", fontFamily: "var(--font-display)", fontWeight: 700, fontSize: 11, color: "var(--ink-3)" }}>
        {actor?.avatar_url ? <img src={actor.avatar_url} alt="" style={{ width: "100%", height: "100%", objectFit: "cover", display: "block" }} /> : navInitials(actor?.display_name || actor?.username)}
      </span>
      <span style={{ flex: 1, minWidth: 0, display: "flex", flexDirection: "column", gap: 2 }}>
        <span style={{ fontSize: 12.5, lineHeight: 1.4, color: "var(--ink)" }}>{notifText(n)}</span>
        <span style={{ fontSize: 11, color: "var(--ink-3)" }}>{relativeTime(n.created_at)}</span>
      </span>
      {unread && <span style={{ width: 8, height: 8, borderRadius: "50%", background: "var(--accent-d)", flexShrink: 0, marginTop: 6 }} />}
    </button>
  );
}

function NotificationsBell() {
  const [open, setOpen] = useState(false);
  const [items, setItems] = useState<Notification[] | null>(null);
  const [unread, setUnread] = useState(0);
  const containerRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    let cancelled = false;
    let unsub = () => {};
    const refreshCount = () => {
      getUnreadNotificationCount().then((n) => { if (!cancelled) setUnread(n); }).catch(() => {});
    };
    getUser().then((u) => {
      if (!u || cancelled) return;
      refreshCount();
      subscribeToNotifications(() => {
        refreshCount();
        setItems((prev) => {
          if (prev === null) return prev;
          listNotifications({ limit: 30 }).then((list) => { if (!cancelled) setItems(list); }).catch(() => {});
          return prev;
        });
      }).then((fn) => { if (cancelled) fn(); else unsub = fn; });
    });
    return () => { cancelled = true; try { unsub(); } catch { /* ignore */ } };
  }, []);

  useEffect(() => {
    if (!open) return;
    const onClick = (e: MouseEvent) => { if (containerRef.current && !containerRef.current.contains(e.target as Node)) setOpen(false); };
    const onKey = (e: KeyboardEvent) => { if (e.key === "Escape") setOpen(false); };
    document.addEventListener("mousedown", onClick);
    document.addEventListener("keydown", onKey);
    return () => { document.removeEventListener("mousedown", onClick); document.removeEventListener("keydown", onKey); };
  }, [open]);

  function toggle() {
    if (!open) listNotifications({ limit: 30 }).then(setItems).catch(() => setItems([]));
    setOpen(!open);
  }

  function onClickItem(n: Notification) {
    if (!n.read_at) {
      markNotificationsRead([n.id]);
      setUnread((x) => Math.max(0, x - 1));
      setItems((prev) => prev?.map((x) => (x.id === n.id ? { ...x, read_at: new Date().toISOString() } : x)) ?? prev);
    }
    const href = notifHref(n);
    if (href) window.location.href = href;
  }

  function markAll() {
    markAllNotificationsRead().then(() => {
      setUnread(0);
      const ts = new Date().toISOString();
      setItems((prev) => prev?.map((x) => (x.read_at ? x : { ...x, read_at: ts })) ?? prev);
    });
  }

  return (
    <div ref={containerRef} style={{ position: "relative" }}>
      <button type="button" onClick={toggle} style={iconBtnStyle(open)} aria-label={"Notifications" + (unread > 0 ? ` (${unread} unread)` : "")} aria-expanded={open}>
        <IconSvg kind="bell" size={18} />
        {unread > 0 && <Badge count={unread} />}
      </button>
      {open && (
        <div className="seshn-notifications-panel" style={{ position: "absolute", right: 0, top: "calc(100% + 8px)", width: 360, maxHeight: 520, overflowY: "auto", background: "var(--frame)", border: "1px solid var(--line)", borderRadius: 12, boxShadow: "0 20px 48px rgba(0,0,0,0.18)", zIndex: 110, display: "flex", flexDirection: "column" }}>
          <div style={{ padding: "14px 16px", borderBottom: "1px solid var(--line)", display: "flex", alignItems: "center", justifyContent: "space-between" }}>
            <span style={{ fontFamily: "var(--font-display)", fontWeight: 600, fontSize: 14 }}>Notifications</span>
            {unread > 0 && <button onClick={markAll} style={{ border: "none", background: "transparent", cursor: "pointer", color: "var(--ink-3)", fontSize: 11, fontFamily: "var(--font-display)", fontWeight: 600 }}>Mark all read</button>}
          </div>
          {items === null ? (
            <div style={{ padding: 20, textAlign: "center", color: "var(--ink-3)", fontSize: 12 }}>Loading…</div>
          ) : items.length === 0 ? (
            <div style={{ padding: "32px 20px", textAlign: "center", color: "var(--ink-3)" }}>
              <div style={{ fontFamily: "var(--font-display)", fontWeight: 600, fontSize: 14, color: "var(--ink-2)", marginBottom: 4 }}>All caught up</div>
              <div style={{ fontSize: 12 }}>We&apos;ll let you know when something happens.</div>
            </div>
          ) : (
            <div style={{ display: "flex", flexDirection: "column" }}>
              {items.map((n) => <NotificationRow key={n.id} notif={n} onClick={onClickItem} />)}
            </div>
          )}
        </div>
      )}
    </div>
  );
}

type SearchTarget = { type: "profile"; item: Profile } | { type: "gig"; item: Gig };

function NavSearch() {
  const [query, setQuery] = useState("");
  const [data, setData] = useState<{ profiles: Profile[]; gigs: Gig[]; loading: boolean }>({ profiles: [], gigs: [], loading: false });
  const [open, setOpen] = useState(false);
  const [highlight, setHighlight] = useState(0);
  const containerRef = useRef<HTMLDivElement>(null);
  const inputRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    const s = query.trim();
    if (!s || s.length < 2) { setData({ profiles: [], gigs: [], loading: false }); return; }
    setData((prev) => ({ profiles: prev.profiles, gigs: prev.gigs, loading: true }));
    const t = setTimeout(() => {
      Promise.all([
        listProfiles({ search: s, limit: 5 }).catch(() => [] as Profile[]),
        listGigs({ search: s, limit: 5 }).catch(() => [] as Gig[]),
      ]).then(([profiles, gigs]) => { setData({ profiles, gigs, loading: false }); setHighlight(0); });
    }, 180);
    return () => clearTimeout(t);
  }, [query]);

  useEffect(() => {
    if (!open) return;
    const onDown = (e: MouseEvent) => { if (containerRef.current && !containerRef.current.contains(e.target as Node)) setOpen(false); };
    document.addEventListener("mousedown", onDown);
    return () => document.removeEventListener("mousedown", onDown);
  }, [open]);

  const items: SearchTarget[] = [
    ...data.profiles.map((p) => ({ type: "profile" as const, item: p })),
    ...data.gigs.map((g) => ({ type: "gig" as const, item: g })),
  ];

  function go(target: SearchTarget) {
    if (target.type === "profile") window.location.href = R.profile(target.item.username);
    else window.location.href = R.gig(target.item.id);
  }

  function onKey(e: React.KeyboardEvent) {
    if (e.key === "Escape") { setOpen(false); (e.currentTarget as HTMLElement).blur(); return; }
    if (!open || items.length === 0) return;
    if (e.key === "ArrowDown") { e.preventDefault(); setHighlight((highlight + 1) % items.length); }
    else if (e.key === "ArrowUp") { e.preventDefault(); setHighlight((highlight - 1 + items.length) % items.length); }
    else if (e.key === "Enter") { e.preventDefault(); go(items[highlight]); }
  }

  return (
    <div ref={containerRef} style={{ flex: 1, maxWidth: 360, marginLeft: 16, position: "relative" }}>
      <div style={{ display: "flex", alignItems: "center", gap: 8, padding: "8px 13px", background: "var(--surface-2)", borderRadius: 999, border: "1px solid " + (open ? "var(--ink-3)" : "var(--line)"), color: "var(--ink-3)" }}>
        <IconSvg kind="search" size={14} />
        <input ref={inputRef} type="text" value={query} placeholder="Search artists, gigs…"
          onChange={(e) => { setQuery(e.target.value); setOpen(true); }} onFocus={() => setOpen(true)} onKeyDown={onKey}
          style={{ flex: 1, border: "none", outline: "none", background: "transparent", fontSize: 12.5, fontFamily: "var(--font-body)", color: "var(--ink)", minWidth: 0 }} />
        {query && (
          <button type="button" onClick={() => { setQuery(""); setData({ profiles: [], gigs: [], loading: false }); inputRef.current?.focus(); }}
            style={{ background: "transparent", border: "none", cursor: "pointer", color: "var(--ink-3)", padding: 0, fontSize: 16, lineHeight: 1 }} aria-label="Clear search">×</button>
        )}
      </div>
      {open && query.trim().length >= 2 && (
        <div style={{ position: "absolute", left: 0, right: 0, top: "calc(100% + 6px)", background: "var(--frame)", border: "1px solid var(--line)", borderRadius: 12, boxShadow: "0 16px 36px rgba(0,0,0,0.14)", maxHeight: 460, overflowY: "auto", zIndex: 110 }}>
          {data.loading && items.length === 0 && <div style={{ padding: 14, color: "var(--ink-3)", fontSize: 12 }}>Searching…</div>}
          {!data.loading && items.length === 0 && <div style={{ padding: 14, color: "var(--ink-3)", fontSize: 12, textAlign: "center" }}>No matches for &quot;{query.trim()}&quot;</div>}
          {data.profiles.length > 0 && (
            <div style={{ padding: "10px 14px 4px", fontFamily: "var(--font-display)", fontWeight: 500, fontSize: 10, letterSpacing: "0.14em", textTransform: "uppercase", color: "var(--ink-4)" }}>Artists</div>
          )}
          {data.profiles.map((p, i) => (
            <button key={"p-" + p.id} onClick={() => go({ type: "profile", item: p })} onMouseEnter={() => setHighlight(i)}
              style={{ display: "flex", gap: 10, alignItems: "center", padding: "8px 12px", width: "100%", border: "none", textAlign: "left", cursor: "pointer", background: highlight === i ? "var(--surface-2)" : "transparent", fontFamily: "var(--font-body)" }}>
              <span style={{ width: 28, height: 28, borderRadius: "50%", background: "var(--ph)", overflow: "hidden", display: "inline-flex", alignItems: "center", justifyContent: "center", fontFamily: "var(--font-display)", fontWeight: 700, fontSize: 10, color: "var(--ink-3)", flexShrink: 0 }}>
                {p.avatar_url ? <img src={p.avatar_url} alt="" style={{ width: "100%", height: "100%", objectFit: "cover", display: "block" }} /> : navInitials(p.display_name || p.username)}
              </span>
              <span style={{ flex: 1, minWidth: 0, display: "flex", flexDirection: "column", gap: 1 }}>
                <span style={{ fontFamily: "var(--font-display)", fontWeight: 600, fontSize: 13, color: "var(--ink)", overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>{p.display_name || p.username}</span>
                <span style={{ fontSize: 11, color: "var(--ink-3)", overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>
                  {"@" + (p.username || "") + (p.roles?.[0] ? " · " + p.roles[0] : "") + (p.location ? " · " + p.location : "")}
                </span>
              </span>
            </button>
          ))}
          {data.gigs.length > 0 && (
            <div style={{ padding: "10px 14px 4px", fontFamily: "var(--font-display)", fontWeight: 500, fontSize: 10, letterSpacing: "0.14em", textTransform: "uppercase", color: "var(--ink-4)", borderTop: data.profiles.length > 0 ? "1px solid var(--line-soft)" : "none" }}>Gigs</div>
          )}
          {data.gigs.map((g, i) => {
            const idx = data.profiles.length + i;
            return (
              <button key={"g-" + g.id} onClick={() => go({ type: "gig", item: g })} onMouseEnter={() => setHighlight(idx)}
                style={{ display: "flex", flexDirection: "column", gap: 2, padding: "10px 12px", width: "100%", border: "none", textAlign: "left", cursor: "pointer", background: highlight === idx ? "var(--surface-2)" : "transparent", fontFamily: "var(--font-body)" }}>
                <span style={{ fontFamily: "var(--font-display)", fontWeight: 600, fontSize: 13, color: "var(--ink)", overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>{g.title}</span>
                <span style={{ fontSize: 11, color: "var(--ink-3)", overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>
                  {(g.role || "Gig") + (g.owner?.display_name ? " · by " + g.owner.display_name : "")}
                </span>
              </button>
            );
          })}
        </div>
      )}
    </div>
  );
}

// Avatar in the top-right opens an account dropdown (profile / finances /
// settings / sign out) rather than jumping straight to the profile. Closes on
// outside-click or Escape.
function ProfileMenu({ me, active, initials }: { me: Profile | null; active: NavActive; initials: string }) {
  const [open, setOpen] = useState(false);
  const ref = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (!open) return;
    const onDoc = (e: MouseEvent) => { if (ref.current && !ref.current.contains(e.target as Node)) setOpen(false); };
    const onKey = (e: KeyboardEvent) => { if (e.key === "Escape") setOpen(false); };
    document.addEventListener("mousedown", onDoc);
    document.addEventListener("keydown", onKey);
    return () => { document.removeEventListener("mousedown", onDoc); document.removeEventListener("keydown", onKey); };
  }, [open]);

  const itemStyle: CSSProperties = {
    display: "flex", alignItems: "center", gap: 10, padding: "10px 14px", borderRadius: 8,
    color: "var(--ink)", textDecoration: "none", background: "transparent", border: "none",
    width: "100%", textAlign: "left", cursor: "pointer",
    fontFamily: "var(--font-display)", fontWeight: 500, fontSize: 13,
  };

  return (
    <div ref={ref} style={{ position: "relative" }}>
      <button type="button" onClick={() => setOpen((o) => !o)} aria-haspopup="menu" aria-expanded={open} aria-label="Account menu"
        style={{ background: "none", border: "none", padding: 0, cursor: "pointer", display: "inline-flex" }}>
        <span className="avatar md" style={{ background: me?.avatar_url ? "var(--ph)" : "linear-gradient(135deg,#a8ebc8,#2CCB73)", color: "#062c19", fontSize: 12, fontFamily: "var(--font-display)", fontWeight: 700, border: (active === "profile" || open) ? "2px solid var(--ink)" : "2px solid transparent", overflow: "hidden", width: 32, height: 32, display: "inline-flex", alignItems: "center", justifyContent: "center", borderRadius: "50%" }}>
          {me?.avatar_url ? <img src={me.avatar_url} alt="" style={{ width: "100%", height: "100%", borderRadius: "50%", objectFit: "cover", display: "block" }} /> : initials}
        </span>
      </button>
      {open && (
        <div role="menu" style={{ position: "absolute", top: "calc(100% + 8px)", right: 0, minWidth: 208, background: "var(--surface)", border: "1px solid var(--line)", borderRadius: 12, boxShadow: "0 12px 32px rgba(0,0,0,0.18)", padding: 6, zIndex: 200 }}>
          {me && (
            <div style={{ padding: "8px 14px 10px", borderBottom: "1px solid var(--line-soft)", marginBottom: 4 }}>
              <div style={{ fontFamily: "var(--font-display)", fontWeight: 700, fontSize: 13, color: "var(--ink)", whiteSpace: "nowrap", overflow: "hidden", textOverflow: "ellipsis" }}>{me.display_name || me.username}</div>
              {me.username && <div style={{ fontSize: 12, color: "var(--ink-3)" }}>@{me.username}</div>}
            </div>
          )}
          <a role="menuitem" href={R.profile(me?.username)} style={itemStyle} onClick={() => setOpen(false)}>Your profile</a>
          <a role="menuitem" href={R.dashboard} style={itemStyle} onClick={() => setOpen(false)}>Finances</a>
          <a role="menuitem" href={R.settings} style={itemStyle} onClick={() => setOpen(false)}>Settings</a>
          <div style={{ height: 1, background: "var(--line-soft)", margin: "4px 0" }} />
          <button role="menuitem" type="button" style={{ ...itemStyle, color: "var(--ink-2)" }}
            onClick={async () => { setOpen(false); try { await signOut(); } catch { /* ignore */ } window.location.href = "/auth"; }}>
            Sign out
          </button>
        </div>
      )}
    </div>
  );
}

export default function Nav({ active = null, showSearch = true, showPostButton = true }: { active?: NavActive; showSearch?: boolean; showPostButton?: boolean }) {
  const [me, setMe] = useState<Profile | null>(null);
  const [unreadConvos, setUnreadConvos] = useState(0);
  const [contractsSig, setContractsSig] = useState(0);
  const [menuOpen, setMenuOpen] = useState(false);

  useEffect(() => {
    getProfile().then(setMe).catch(() => {});
    const onUpdate = (e: Event) => {
      const detail = (e as CustomEvent<Profile>).detail;
      if (detail) setMe(detail);
      else getProfile().then(setMe).catch(() => {});
    };
    window.addEventListener("seshn:profile-updated", onUpdate);
    return () => window.removeEventListener("seshn:profile-updated", onUpdate);
  }, []);

  useEffect(() => {
    let cancelled = false;
    let unsub = () => {};
    const refresh = () => { getUnreadCount().then((n) => { if (!cancelled) setUnreadConvos(n); }).catch(() => {}); };
    getUser().then((u) => {
      if (!u || cancelled) return;
      refresh();
      countContractsNeedingMySignature().then((n) => { if (!cancelled) setContractsSig(n); }).catch(() => {});
      subscribeToMyConversations(refresh).then((fn) => { if (cancelled) fn(); else unsub = fn; });
    });
    return () => { cancelled = true; try { unsub(); } catch { /* ignore */ } };
  }, []);

  const displayName = me?.display_name || "";
  const initials = navInitials(displayName);

  const navLinkStyle = (isActive: boolean): CSSProperties => ({
    display: "inline-flex", alignItems: "center", gap: 6, padding: "6px 10px", borderRadius: 8,
    color: isActive ? "var(--ink)" : "var(--ink-2)", background: isActive ? "var(--surface-2)" : "transparent",
    textDecoration: "none", fontFamily: "var(--font-display)", fontWeight: 500, fontSize: 13,
  });
  const mobileLinkStyle = (isActive: boolean): CSSProperties => ({
    display: "block", padding: "14px 18px", borderBottom: "1px solid var(--line-soft)",
    color: isActive ? "var(--accent-d)" : "var(--ink)", background: isActive ? "var(--accent-bg)" : "transparent",
    textDecoration: "none", fontFamily: "var(--font-display)", fontWeight: 600, fontSize: 15,
  });

  return (
    <>
      <nav className="seshn-nav-root" style={{ background: "var(--surface)", borderBottom: "1px solid var(--line)", padding: "0 28px", height: 58, display: "flex", alignItems: "center", justifyContent: "space-between", position: "sticky", top: 0, zIndex: 100 }}>
        <div style={{ display: "flex", alignItems: "center", gap: 12, flex: 1, minWidth: 0 }}>
          <a href={R.feed} className="logo" style={{ textDecoration: "none" }}>Seshn</a>
          <div className="seshn-nav-links" style={{ display: "flex", alignItems: "center", gap: 4, marginLeft: 6 }}>
            <a href={R.feed} style={navLinkStyle(active === "feed")}>Feed</a>
            <a href={R.browse} style={navLinkStyle(active === "browse")}>Browse</a>
            <a href={R.applications} style={navLinkStyle(active === "applications")}>Applications</a>
          </div>
          {showSearch && <div className="seshn-nav-search" style={{ display: "contents" }}><NavSearch /></div>}
        </div>
        <div style={{ display: "flex", alignItems: "center", gap: 8 }}>
          {showPostButton && (
            <a href={R.post} className="btn primary sm">
              <span className="seshn-nav-post-text">+ Post a gig</span>
            </a>
          )}
          <a href={R.contracts} style={iconBtnStyle(false)} aria-label={"Contracts" + (contractsSig > 0 ? ` (${contractsSig} need your signature)` : "")} title="Contracts">
            <IconSvg kind="contract" size={18} />
            {contractsSig > 0 && <Badge count={contractsSig} />}
          </a>
          <a href={R.inbox} style={iconBtnStyle(active === "inbox")} aria-label={"Inbox" + (unreadConvos > 0 ? ` (${unreadConvos} unread)` : "")}>
            <IconSvg kind="message" size={18} />
            {unreadConvos > 0 && <Badge count={unreadConvos} />}
          </a>
          <ThemeToggle />
          <NotificationsBell />
          <ProfileMenu me={me} active={active} initials={initials} />
          <button type="button" className="seshn-nav-hamburger" onClick={() => setMenuOpen(!menuOpen)}
            style={{ width: 34, height: 34, borderRadius: 8, color: "var(--ink-2)", background: "transparent", cursor: "pointer", border: "none", alignItems: "center", justifyContent: "center" }}
            aria-label={menuOpen ? "Close menu" : "Open menu"} aria-expanded={menuOpen}>
            <svg width={18} height={18} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={2} strokeLinecap="round">
              {menuOpen ? <path d="M6 6l12 12M18 6L6 18" /> : <path d="M4 7h16M4 12h16M4 17h16" />}
            </svg>
          </button>
        </div>
      </nav>
      <div className={"seshn-nav-mobile-menu" + (menuOpen ? " open" : "")} style={{ flexDirection: "column", background: "var(--surface)", borderBottom: "1px solid var(--line)", position: "sticky", top: 58, zIndex: 99 }}>
        <a href={R.feed} style={mobileLinkStyle(active === "feed")} onClick={() => setMenuOpen(false)}>Feed</a>
        <a href={R.browse} style={mobileLinkStyle(active === "browse")} onClick={() => setMenuOpen(false)}>Browse</a>
        <a href={R.applications} style={mobileLinkStyle(active === "applications")} onClick={() => setMenuOpen(false)}>Applications</a>
        <a href={R.contracts} style={mobileLinkStyle(false)} onClick={() => setMenuOpen(false)}>Contracts</a>
        <a href={R.dashboard} style={mobileLinkStyle(false)} onClick={() => setMenuOpen(false)}>Finances</a>
        <a href={R.settings} style={mobileLinkStyle(false)} onClick={() => setMenuOpen(false)}>Settings</a>
        {showSearch && <div style={{ padding: "12px 14px" }}><NavSearch /></div>}
      </div>
    </>
  );
}
