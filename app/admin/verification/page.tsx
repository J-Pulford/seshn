"use client";

import { useCallback, useEffect, useState } from "react";
import Nav from "@/components/Nav";
import { requireProfile } from "@/lib/seshn/auth";
import { VerifiedBadge } from "@/components/VerifiedBadge";
import {
  amIStaff,
  listVerificationApplications,
  reviewVerificationApplication,
  type VerificationReviewItem,
  type VerificationStatus,
} from "@/lib/seshn/verification";

type Tab = VerificationStatus | "all";
const TABS: { key: Tab; label: string }[] = [
  { key: "pending", label: "Pending" },
  { key: "approved", label: "Approved" },
  { key: "rejected", label: "Rejected" },
  { key: "all", label: "All" },
];

const card: React.CSSProperties = { maxWidth: 760, margin: "0 auto", padding: "0 16px 64px" };

function Shell({ children }: { children: React.ReactNode }) {
  return (
    <div style={{ minHeight: "100vh", background: "var(--bg)" }}>
      <Nav active={null} />
      <div style={card}>{children}</div>
    </div>
  );
}

function fmtDate(s?: string | null) {
  if (!s) return "";
  try {
    return new Date(s).toLocaleDateString(undefined, { year: "numeric", month: "short", day: "numeric" });
  } catch {
    return "";
  }
}

const statusColor: Record<VerificationStatus, string> = {
  pending: "var(--ink-3)",
  approved: "var(--bus, #5b8def)",
  rejected: "#c0392b",
  withdrawn: "var(--ink-3)",
};

function Row({ d, k }: { d: string | undefined; k: string }) {
  if (!d || !d.trim()) return null;
  const isLink = /^https?:\/\//i.test(d.trim());
  return (
    <div style={{ display: "flex", gap: 10, fontSize: 13, lineHeight: 1.5 }}>
      <span style={{ flex: "0 0 110px", color: "var(--ink-3)", fontFamily: "var(--font-display)", fontWeight: 600 }}>{k}</span>
      {isLink ? (
        <a href={d.trim()} target="_blank" rel="noopener noreferrer" style={{ color: "var(--bus, #5b8def)", wordBreak: "break-all" }}>{d.trim()}</a>
      ) : (
        <span style={{ color: "var(--ink-2)", whiteSpace: "pre-wrap" }}>{d}</span>
      )}
    </div>
  );
}

function ReviewCard({ item, onDecide }: { item: VerificationReviewItem; onDecide: (id: string, decision: "approved" | "rejected", notes: string) => Promise<void> }) {
  const [notes, setNotes] = useState(item.review_notes || "");
  const [busy, setBusy] = useState<"" | "approved" | "rejected">("");
  const [err, setErr] = useState("");
  const a = item.applicant;
  const det = item.details || {};

  async function decide(decision: "approved" | "rejected") {
    setErr("");
    setBusy(decision);
    try {
      await onDecide(item.id, decision, notes);
    } catch (e) {
      setErr((e as Error)?.message || "Couldn't save that decision.");
      setBusy("");
    }
  }

  return (
    <div style={{ border: "1px solid var(--line)", borderRadius: 12, padding: 18, background: "var(--frame)" }}>
      <div style={{ display: "flex", alignItems: "center", gap: 12, marginBottom: 14 }}>
        {a?.avatar_url
          ? <img src={a.avatar_url} alt="" width={44} height={44} style={{ borderRadius: 999, objectFit: "cover", flexShrink: 0 }} />
          : <div style={{ width: 44, height: 44, borderRadius: 999, background: "var(--line)", flexShrink: 0 }} />}
        <div style={{ minWidth: 0, flex: 1 }}>
          <div style={{ display: "flex", alignItems: "center", gap: 7, flexWrap: "wrap" }}>
            {a?.username
              ? <a href={`/profile/${encodeURIComponent(a.username)}`} style={{ fontFamily: "var(--font-display)", fontWeight: 700, fontSize: 16, color: "var(--ink)" }}>{a.display_name || a.username}</a>
              : <span style={{ fontWeight: 700 }}>Unknown applicant</span>}
            {a?.username && <span style={{ color: "var(--ink-3)", fontSize: 13 }}>@{a.username}</span>}
          </div>
          <div style={{ fontSize: 12, color: "var(--ink-3)", marginTop: 2 }}>
            Applied {fmtDate(item.created_at)}
            <span style={{ marginLeft: 8, color: statusColor[item.status], fontWeight: 600, textTransform: "uppercase", letterSpacing: "0.04em" }}>{item.status}</span>
            <span style={{ marginLeft: 8, fontWeight: 600, color: item.payment_status === "paid" ? "var(--bus, #5b8def)" : "#c0392b" }}>
              {item.payment_status === "paid" ? "● Paid" : item.payment_status === "refunded" ? "● Refunded" : "○ Awaiting payment"}
            </span>
          </div>
        </div>
      </div>

      <div style={{ display: "flex", flexDirection: "column", gap: 7, marginBottom: 14 }}>
        <Row k="Full name" d={det.full_name} />
        <Row k="Role" d={[det.primary_role, det.years_experience ? `${det.years_experience} yrs` : ""].filter(Boolean).join(" · ")} />
        <Row k="Based in" d={det.based_in} />
        <Row k="Streaming" d={det.streaming_url} />
        <Row k="Portfolio" d={det.portfolio_url} />
        <Row k="Socials" d={det.socials} />
        <Row k="Notable work" d={det.notable_work} />
        <Row k="Pitch" d={det.pitch} />
      </div>

      {item.status !== "pending" && item.review_notes && (
        <div style={{ fontSize: 12, color: "var(--ink-3)", marginBottom: 12, fontStyle: "italic" }}>
          Review note: {item.review_notes}{item.reviewed_at ? ` · ${fmtDate(item.reviewed_at)}` : ""}
        </div>
      )}

      <textarea
        value={notes}
        onChange={(e) => setNotes(e.target.value)}
        placeholder="Internal review note (optional)"
        rows={2}
        maxLength={1000}
        style={{ width: "100%", padding: "9px 11px", borderRadius: 8, border: "1px solid var(--line)", background: "var(--bg)", color: "var(--ink)", fontSize: 13, fontFamily: "var(--font-body)", resize: "vertical", marginBottom: 10 }}
      />
      {err && <p style={{ color: "#c0392b", fontSize: 12, margin: "0 0 10px" }}>{err}</p>}
      <div style={{ display: "flex", gap: 8, flexWrap: "wrap" }}>
        {item.status !== "approved" && (
          <button className="btn primary sm" disabled={!!busy} onClick={() => decide("approved")}>
            {busy === "approved" ? "Approving…" : "Approve & verify"}
          </button>
        )}
        {item.status !== "rejected" && (
          <button className="btn sm" disabled={!!busy} onClick={() => decide("rejected")}>
            {busy === "rejected" ? "Rejecting…" : "Reject"}
          </button>
        )}
      </div>
    </div>
  );
}

export default function VerificationReviewPage() {
  const [staff, setStaff] = useState<boolean | undefined>(undefined);
  const [tab, setTab] = useState<Tab>("pending");
  const [items, setItems] = useState<VerificationReviewItem[] | undefined>(undefined);
  const [err, setErr] = useState("");

  const load = useCallback(async (t: Tab) => {
    setItems(undefined);
    setErr("");
    try {
      setItems(await listVerificationApplications(t === "all" ? undefined : t));
    } catch (e) {
      setErr((e as Error)?.message || "Couldn't load the review queue.");
      setItems([]);
    }
  }, []);

  useEffect(() => {
    (async () => {
      const r = await requireProfile();
      if (!r) return;
      if (!r.user || !r.profile) { setStaff(false); return; }
      const ok = await amIStaff();
      setStaff(ok);
      if (ok) load("pending");
    })();
  }, [load]);

  async function onDecide(id: string, decision: "approved" | "rejected", notes: string) {
    await reviewVerificationApplication(id, decision, notes);
    // Reflect the new status in place; drop it from a status-filtered queue.
    setItems((prev) => {
      if (!prev) return prev;
      if (tab !== "all" && tab !== decision) return prev.filter((x) => x.id !== id);
      return prev.map((x) => (x.id === id ? { ...x, status: decision, review_notes: notes.trim() || null } : x));
    });
  }

  if (staff === undefined) return <Shell><p className="t-meta" style={{ paddingTop: 40 }}>Loading…</p></Shell>;
  if (!staff) {
    return <Shell><div style={{ paddingTop: 48, textAlign: "center" }}><h1 style={{ fontFamily: "var(--font-display)", fontWeight: 700, fontSize: 24 }}>Not available</h1><p style={{ color: "var(--ink-2)" }}>This page is for the Seshn team.</p></div></Shell>;
  }

  return (
    <Shell>
      <header style={{ paddingTop: 40, marginBottom: 20 }}>
        <div style={{ display: "inline-flex", marginBottom: 12 }}><VerifiedBadge style={{ fontSize: 13, padding: "5px 13px 5px 9px" }} /></div>
        <h1 style={{ fontFamily: "var(--font-display)", fontWeight: 700, fontSize: 28, letterSpacing: "-0.02em", margin: "0 0 6px" }}>Verification review</h1>
        <p style={{ color: "var(--ink-2)", lineHeight: 1.6 }}>Approve or reject applications for the Verified badge. Approving flips the applicant&apos;s badge immediately.</p>
      </header>

      <div style={{ display: "flex", gap: 6, marginBottom: 20, flexWrap: "wrap" }}>
        {TABS.map((t) => (
          <button
            key={t.key}
            className={"btn sm" + (tab === t.key ? " primary" : "")}
            onClick={() => { setTab(t.key); load(t.key); }}
          >
            {t.label}
          </button>
        ))}
      </div>

      {err && <p style={{ color: "#c0392b" }}>{err}</p>}
      {items === undefined && <p className="t-meta">Loading…</p>}
      {items && items.length === 0 && <p className="t-meta" style={{ color: "var(--ink-3)" }}>Nothing here.</p>}

      <div style={{ display: "flex", flexDirection: "column", gap: 14 }}>
        {items?.map((it) => <ReviewCard key={it.id} item={it} onDecide={onDecide} />)}
      </div>
    </Shell>
  );
}
