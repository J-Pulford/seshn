"use client";

import { useEffect, useState } from "react";
import type { User } from "@supabase/supabase-js";
import Nav from "@/components/Nav";
import { requireProfile } from "@/lib/seshn/auth";
import { listMyApplications, updateApplicationStatus } from "@/lib/seshn/applications";
import type { Application, Gig } from "@/lib/seshn/types";

// listMyApplications embeds the gig (+ its owner).
type MyApplication = Application & { gig?: Gig };

const gigHref = (id?: string) => `/gig/${encodeURIComponent(id || "")}`;
const profileHref = (u?: string) => `/profile/${encodeURIComponent(u || "")}`;

function statusPillClass(status: string) {
  if (status === "accepted") return "pill accent";
  if (status === "rejected" || status === "withdrawn") return "pill";
  return "pill solid";
}
const statusLabel = (s: string) => (s ? s.charAt(0).toUpperCase() + s.slice(1) : "");
function compLabel(g?: Gig) {
  if (!g) return "—";
  if (g.comp === "paid" && g.pay_amount) return "Paid · $" + Number(g.pay_amount).toLocaleString();
  if (g.comp === "paid") return "Paid";
  if (g.comp === "split") return "Split";
  if (g.comp === "trade") return "Trade";
  return "Unpaid";
}

function ApplicationRow({ app, onChange }: { app: MyApplication; onChange: (a: MyApplication) => void }) {
  const g = app.gig || ({} as Gig);
  const owner = g.owner;
  const [busy, setBusy] = useState(false);

  const withdraw = async () => {
    if (!window.confirm("Withdraw your application?")) return;
    setBusy(true);
    try {
      const updated = await updateApplicationStatus(app.id, "withdrawn");
      onChange({ ...app, ...updated });
    } catch (e) {
      alert((e as Error)?.message || "Couldn't withdraw.");
    } finally {
      setBusy(false);
    }
  };

  return (
    <div className="card" style={{ display: "flex", flexDirection: "column", gap: 10 }}>
      <div style={{ display: "flex", justifyContent: "space-between", gap: 12, alignItems: "flex-start" }}>
        <div style={{ flex: 1, minWidth: 0 }}>
          <a href={gigHref(g.id)} style={{ fontFamily: "var(--font-display)", fontWeight: 600, fontSize: 16, color: "var(--ink)", textDecoration: "none" }}>{g.title || "(Gig removed)"}</a>
          <div className="t-meta" style={{ marginTop: 3 }}>
            {g.role && <span>{g.role}</span>}
            {g.role && " · "}
            <span>{compLabel(g)}</span>
            {g.location && " · " + g.location}
            {owner?.display_name && (
              <>
                {" · by "}
                <a href={profileHref(owner.username)} style={{ color: "var(--ink-2)", textDecoration: "none" }}>{owner.display_name}</a>
                {owner.is_pro && " ✓"}
              </>
            )}
          </div>
        </div>
        <div style={{ display: "flex", gap: 6, alignItems: "center", flexWrap: "wrap" }}>
          {g.status === "closed" && <span className="pill" style={{ background: "var(--ink)", color: "var(--frame)", borderColor: "transparent" }}>Gig closed</span>}
          <span className={statusPillClass(app.status)}>{statusLabel(app.status)}</span>
        </div>
      </div>
      <p style={{ fontSize: 13, lineHeight: 1.5, color: "var(--ink-2)", whiteSpace: "pre-wrap", display: "-webkit-box", WebkitLineClamp: 3, WebkitBoxOrient: "vertical", overflow: "hidden" }}>{app.pitch}</p>
      <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", paddingTop: 10, borderTop: "1px solid var(--line-soft)" }}>
        <span className="t-meta">Applied {new Date(app.created_at).toLocaleDateString(undefined, { month: "short", day: "numeric", year: "numeric" })}</span>
        <div style={{ display: "flex", gap: 6 }}>
          {app.status === "pending" && <button className="btn sm" onClick={withdraw} disabled={busy}>{busy ? "…" : "Withdraw"}</button>}
          {g.id && <a href={gigHref(g.id)} className="btn sm">View gig</a>}
        </div>
      </div>
    </div>
  );
}

export default function ApplicationsPage() {
  const [me, setMe] = useState<User | null | undefined>(undefined);
  const [apps, setApps] = useState<MyApplication[] | null>(null);
  const [tab, setTab] = useState<"active" | "archived">("active");

  useEffect(() => {
    (async () => {
      const r = await requireProfile({ allowAnon: true });
      if (!r) return;
      if (!r.user) {
        setMe(null);
        return;
      }
      setMe(r.user);
      const list = (await listMyApplications()) as MyApplication[];
      setApps(list);
    })();
  }, []);

  const updateOne = (next: MyApplication) => setApps((prev) => prev?.map((a) => (a.id === next.id ? next : a)) ?? prev);

  if (me === undefined) {
    return (
      <div>
        <Nav active={null} />
        <div className="app-page"><div className="t-meta">Loading…</div></div>
      </div>
    );
  }
  if (me === null) {
    return (
      <div>
        <Nav active={null} showPostButton={false} />
        <div className="app-page" style={{ textAlign: "center", paddingTop: 60 }}>
          <h1 style={{ fontFamily: "var(--font-display)", fontWeight: 700, fontSize: 28 }}>Sign in to see your applications</h1>
          <p style={{ color: "var(--ink-3)", marginTop: 8, marginBottom: 18 }}>Track every gig you&apos;ve pitched yourself for.</p>
          <a href={"/auth?next=" + encodeURIComponent("/app/applications.html")} className="btn primary lg">Sign in</a>
        </div>
      </div>
    );
  }

  const list = apps || [];
  const active = list.filter((a) => a.status === "pending" || a.status === "accepted");
  const archived = list.filter((a) => a.status === "rejected" || a.status === "withdrawn");
  const shown = tab === "active" ? active : archived;

  return (
    <div>
      <Nav active="applications" />
      <div className="app-page">
        <div style={{ marginBottom: 18 }}>
          <h1 style={{ fontFamily: "var(--font-display)", fontWeight: 600, fontSize: 26, letterSpacing: "-0.02em" }}>My applications</h1>
          <span className="t-meta" style={{ fontSize: 12 }}>{apps === null ? "Loading…" : `${list.length} total · ${active.length} active · ${archived.length} archived`}</span>
        </div>

        <div className="tabs">
          <span className={"tab" + (tab === "active" ? " active" : "")} onClick={() => setTab("active")}>Active {active.length > 0 && <span className="t-meta" style={{ marginLeft: 4 }}>({active.length})</span>}</span>
          <span className={"tab" + (tab === "archived" ? " active" : "")} onClick={() => setTab("archived")}>Archived {archived.length > 0 && <span className="t-meta" style={{ marginLeft: 4 }}>({archived.length})</span>}</span>
        </div>

        {apps === null ? (
          <div className="t-meta">Loading applications…</div>
        ) : shown.length === 0 ? (
          <div className="card" style={{ textAlign: "center", padding: 30 }}>
            <div style={{ fontFamily: "var(--font-display)", fontWeight: 700, fontSize: 20, marginBottom: 6 }}>{tab === "active" ? (list.length === 0 ? "You haven't applied to anything yet." : "No active applications.") : "Nothing archived."}</div>
            <div className="t-meta" style={{ marginBottom: 14 }}>{tab === "active" ? "Browse open gigs and send your first pitch." : "Withdrawn or rejected applications will land here."}</div>
            {tab === "active" && <a href="/feed" className="btn primary">Browse gigs</a>}
          </div>
        ) : (
          <div style={{ display: "flex", flexDirection: "column", gap: 12 }}>
            {shown.map((a) => <ApplicationRow key={a.id} app={a} onChange={updateOne} />)}
          </div>
        )}
      </div>
    </div>
  );
}
