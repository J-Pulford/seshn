"use client";

import { useEffect, useState } from "react";
import type { User } from "@supabase/supabase-js";
import Nav from "@/components/Nav";
import { requireProfile } from "@/lib/seshn/auth";
import { listMyContracts } from "@/lib/seshn/contracts";
import { formatMoney } from "@/lib/seshn/finances";
import type { Contract } from "@/lib/seshn/types";
import "./contracts.css";

const contractHref = (id: string) => `/contract/${encodeURIComponent(id)}`;
const profileHref = (u?: string) => `/profile/${encodeURIComponent(u || "")}`;

function initials(name?: string) {
  if (!name) return "··";
  return name.trim().split(/\s+/).map((s) => s[0]).join("").slice(0, 2).toUpperCase();
}

const STATUS_META: Record<string, { label: string; cls: string }> = {
  draft: { label: "Draft", cls: "muted" },
  awaiting_signatures: { label: "Awaiting signatures", cls: "warn" },
  active: { label: "Active", cls: "ok" },
  completed: { label: "Completed", cls: "ok" },
  cancelled: { label: "Cancelled", cls: "muted" },
};

const FILTERS: { id: string; label: string; match: (s: string) => boolean }[] = [
  { id: "all", label: "All", match: () => true },
  { id: "open", label: "In progress", match: (s) => s === "draft" || s === "awaiting_signatures" || s === "active" },
  { id: "needs", label: "Needs signature", match: (s) => s === "awaiting_signatures" },
  { id: "completed", label: "Completed", match: (s) => s === "completed" },
  { id: "cancelled", label: "Cancelled", match: (s) => s === "cancelled" },
];

function fee(c: Contract) {
  const t = (c.terms || {}) as { fee_cents?: number; currency?: string };
  if (!t.fee_cents) return null;
  return formatMoney(t.fee_cents, t.currency || "AUD");
}

function ContractCard({ c, meId }: { c: Contract; meId: string }) {
  const iAmOwner = c.owner_id === meId;
  const other = iAmOwner ? c.collaborator : c.owner;
  const meta = STATUS_META[c.status] || { label: c.status, cls: "muted" };
  const amount = fee(c);
  // Does this contract need *my* signature right now?
  const needsMySignature =
    c.status === "awaiting_signatures" && (iAmOwner ? !c.owner_signed_at : !c.collaborator_signed_at);

  return (
    <a href={contractHref(c.id)} className="ct-card">
      <span className="ct-avatar">
        {other?.avatar_url ? <img src={other.avatar_url} alt="" /> : <span>{initials(other?.display_name)}</span>}
      </span>
      <div className="ct-main">
        <div className="ct-title-row">
          <span className="ct-title">{c.gig?.title || (c.origin === "direct" ? "Direct booking" : "Collaboration")}</span>
          <span className={"ct-status " + meta.cls}>{meta.label}</span>
        </div>
        <div className="ct-meta">
          {iAmOwner ? "You hired " : "For "}
          <span className="ct-name">{other?.display_name || other?.username || "the other party"}</span>
          {" · you're the "}{iAmOwner ? "owner" : "collaborator"}
          {c.gig?.role ? " · " + c.gig.role : ""}
        </div>
        <div className="ct-sub">
          {amount && <span className="ct-fee">{amount}</span>}
          {amount && <span className="ct-dot">·</span>}
          <span>Updated {new Date(c.updated_at).toLocaleDateString(undefined, { month: "short", day: "numeric", year: "numeric" })}</span>
        </div>
      </div>
      <span className="ct-action">
        {needsMySignature && <span className="ct-flag">Sign now</span>}
        <span className="ct-go">Open →</span>
      </span>
    </a>
  );
}

export default function ContractsPage() {
  const [me, setMe] = useState<User | null | undefined>(undefined);
  const [contracts, setContracts] = useState<Contract[] | null>(null);
  const [filter, setFilter] = useState("all");

  useEffect(() => {
    (async () => {
      const r = await requireProfile({ allowAnon: true });
      if (!r) return;
      if (!r.user) { setMe(null); return; }
      setMe(r.user);
      document.title = "Seshn, Contracts";
      setContracts(await listMyContracts());
    })();
  }, []);

  if (me === undefined) {
    return (<div><Nav active={null} /><div className="ct-page"><div className="t-meta">Loading…</div></div></div>);
  }
  if (me === null) {
    return (
      <div>
        <Nav active={null} showPostButton={false} />
        <div className="ct-page" style={{ textAlign: "center", paddingTop: 60 }}>
          <h1 style={{ fontFamily: "var(--font-display)", fontWeight: 700, fontSize: 28 }}>Sign in to see your contracts</h1>
          <p style={{ color: "var(--ink-3)", marginTop: 8, marginBottom: 18 }}>Every agreement you&apos;re a party to lives here.</p>
          <a href={"/auth?next=" + encodeURIComponent("/contracts")} className="btn primary lg">Sign in</a>
        </div>
      </div>
    );
  }

  const all = contracts || [];
  const active = FILTERS.find((f) => f.id === filter)!;
  const shown = all.filter((c) => active.match(c.status));
  const needsCount = all.filter((c) => c.status === "awaiting_signatures" && (c.owner_id === me.id ? !c.owner_signed_at : !c.collaborator_signed_at)).length;

  return (
    <div>
      <Nav active={null} />
      <div className="ct-page">
        <div className="ct-head">
          <div>
            <div className="t-eyebrow">Agreements</div>
            <h1 className="t-h1 page-h1">Contracts</h1>
          </div>
          <a className="btn sm" href="/dashboard">Finances →</a>
        </div>

        {needsCount > 0 && (
          <div className="ct-banner">
            <strong>{needsCount} contract{needsCount === 1 ? "" : "s"} need your signature.</strong> Open and sign to move things forward.
          </div>
        )}

        <div className="ct-filters">
          {FILTERS.map((f) => {
            const n = f.id === "all" ? all.length : all.filter((c) => f.match(c.status)).length;
            return (
              <button key={f.id} className={"ct-filter" + (filter === f.id ? " active" : "")} onClick={() => setFilter(f.id)}>
                {f.label}{n > 0 && <span className="ct-filter-n">{n}</span>}
              </button>
            );
          })}
        </div>

        {contracts === null ? (
          <div className="t-meta">Loading contracts…</div>
        ) : all.length === 0 ? (
          <div className="ct-empty">
            <div className="ct-empty-title">No contracts yet</div>
            <p>When you accept an applicant and set up an agreement, or sign one someone sends you, it shows up here. Contracts are how deals get terms, signatures, and (soon) escrow.</p>
            <div style={{ display: "flex", gap: 8, justifyContent: "center", flexWrap: "wrap" }}>
              <a className="btn primary sm" href="/applications">Your applications</a>
              <a className="btn sm" href="/feed">Browse gigs</a>
            </div>
          </div>
        ) : shown.length === 0 ? (
          <div className="ct-empty"><div className="ct-empty-title">Nothing in “{active.label}”.</div><p>Try a different filter.</p></div>
        ) : (
          <div className="ct-list">
            {shown.map((c) => <ContractCard key={c.id} c={c} meId={me.id} />)}
          </div>
        )}
      </div>
    </div>
  );
}
