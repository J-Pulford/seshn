"use client";

import { useEffect, useState } from "react";
import { useParams } from "next/navigation";
import type { User } from "@supabase/supabase-js";
import Nav from "@/components/Nav";
import { AlbumArt } from "@/components/visual/AlbumArt";
import { getUser } from "@/lib/seshn/profiles";
import { getGig, setGigStatus } from "@/lib/seshn/gigs";
import { recordGigView } from "@/lib/seshn/analytics";
import { applyToGig, getMyApplication, listApplicationsForGig, updateApplicationStatus } from "@/lib/seshn/applications";
import { createContract, getContractForApplication } from "@/lib/seshn/contracts";
import { getOrCreateConversation } from "@/lib/seshn/messaging";
import { reportGig } from "@/lib/seshn/trust-safety";
import { toast } from "@/lib/seshn/toast";
import { confirm } from "@/lib/seshn/confirm";
import { ProducerBadge } from "@/components/ProducerBadge";
import { SeshnContract } from "@/lib/contract-template";
import type { Application, Contract, Gig, GigOwner } from "@/lib/seshn/types";
import GigRecommendations from "@/components/gig/GigRecommendations";
import "./gig.css";

const R = {
  feed: "/feed",
  applications: "/applications",
  profile: (u?: string) => `/profile/${encodeURIComponent(u || "")}`,
  inboxConvo: (id: string) => `/inbox?c=${encodeURIComponent(id)}`,
  contract: (id: string) => `/contract/${encodeURIComponent(id)}`,
};

// Seed a fresh contract from the gig so the owner starts from sensible terms
// (they can refine everything in the contract's "Edit terms" editor).
function defaultTermsFromGig(gig: Gig): Record<string, unknown> {
  const feeCents = gig.comp === "paid" && gig.pay_amount ? Math.round(Number(gig.pay_amount) * 100) : 0;
  return {
    fee_cents: feeCents,
    currency: gig.pay_currency || "AUD",
    platform_fee_pct: 5,
    approval_window_days: 7,
    deliverable: { description: "", format_notes: "", deliver_by: gig.deadline || "" },
    splits: { master_owner_pct: 50, master_collaborator_pct: 50, publishing_owner_pct: 50, publishing_collaborator_pct: 50 },
    credits: { text: "" },
  };
}

const contractStatusLabel = (s?: string) =>
  ({ draft: "Draft", awaiting_signatures: "Awaiting signatures", active: "Active", completed: "Completed", cancelled: "Cancelled" }[s || ""] || "");

type OwnerApp = Application & { applicant?: GigOwner & { location?: string; roles?: string[]; bio?: string } };

const COVER_PALETTES = [
  ["#5b3858", "#f0e8d6", "#d96e3f"], ["#f0e8d6", "#0d0d0d", "#d96e3f"], ["#2a4d3a", "#a8ebc8", "#f6d36b"],
  ["#1f3a5f", "#f4f1e9", "#f6d36b"], ["#0d0d0d", "#c4e83a", "#a8ebc8"], ["#c43d3f", "#f0e8d6", "#0d0d0d"],
  ["#f4f1e9", "#5b3858", "#d96e3f"], ["#d96e3f", "#f0e8d6", "#0d0d0d"], ["#2CCB73", "#0d0d0d", "#f4f1e9"], ["#a8ebc8", "#2a4d3a", "#0d0d0d"],
];
function _hash(s: string) {
  let h = 2166136261 >>> 0;
  s = String(s || "x");
  for (let i = 0; i < s.length; i++) { h ^= s.charCodeAt(i); h = Math.imul(h, 16777619); }
  return h >>> 0;
}
function initials(name?: string) {
  if (!name) return "··";
  return name.trim().split(/\s+/).map((s) => s[0]).join("").slice(0, 2).toUpperCase();
}
function compLabel(g: Gig) {
  if (g.comp === "paid" && g.pay_amount) return "Paid · $" + Number(g.pay_amount).toLocaleString();
  if (g.comp === "paid") return "Paid";
  if (g.comp === "split") return "Split";
  if (g.comp === "trade") return "Trade";
  return "Unpaid";
}
function deadlineLabel(date?: string | null) {
  if (!date) return null;
  return "Deadline · " + new Date(date).toLocaleDateString(undefined, { month: "short", day: "numeric" });
}
function statusPillClass(status: string) {
  if (status === "accepted") return "pill accent";
  return status === "rejected" || status === "withdrawn" ? "pill" : "pill solid";
}
const statusLabel = (s: string) => (s ? s.charAt(0).toUpperCase() + s.slice(1) : "");

function CoverHeader({ height = 160, seed = "cover" }: { height?: number; seed?: string }) {
  const pal = COVER_PALETTES[_hash(seed) % COVER_PALETTES.length];
  const [bg, fg, ac] = pal;
  return (
    <div style={{ height, position: "relative", overflow: "hidden", background: bg, borderRadius: "var(--r-lg)", border: "1px solid var(--line)" }}>
      <svg viewBox="0 0 400 160" width="100%" height="100%" preserveAspectRatio="xMidYMid slice" style={{ position: "absolute", inset: 0 }}>
        <circle cx="80" cy="80" r="80" fill={ac} />
        <circle cx="320" cy="100" r="56" fill={fg} opacity="0.8" />
        <rect x="0" y="130" width="400" height="6" fill={fg} />
        {Array.from({ length: 14 }).map((_, i) => (
          <circle key={i} cx={200 + i * 13} cy={50} r={5 - i * 0.28} fill={fg} opacity={0.6 - i * 0.04} />
        ))}
      </svg>
    </div>
  );
}

async function openDM(otherUserId: string) {
  try {
    const cid = await getOrCreateConversation(otherUserId);
    window.location.href = R.inboxConvo(cid);
  } catch (e) {
    toast.error((e as Error)?.message || "Couldn't open a DM.");
  }
}

function ApplyForm({ gig, owner, onApplied }: { gig: Gig; owner: GigOwner; onApplied: (a: Application) => void }) {
  const [pitch, setPitch] = useState("");
  const [link, setLink] = useState("");
  const [submitting, setSubmitting] = useState(false);
  const [err, setErr] = useState("");
  const canSubmit = pitch.trim().length >= 10 && !submitting;

  const submit = async () => {
    setErr("");
    setSubmitting(true);
    try {
      const app = await applyToGig(gig.id, { pitch: pitch.trim(), attachment_url: link.trim() || null });
      onApplied(app);
    } catch (e) {
      const err = e as { code?: string; message?: string };
      if (err?.code === "23505") setErr("You've already applied to this gig.");
      else setErr(err?.message || "Couldn't send application.");
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <div className="apply-section" style={{ marginBottom: 28 }}>
      <div style={{ fontFamily: "var(--font-display)", fontWeight: 600, fontSize: 18, marginBottom: 6 }}>Apply</div>
      <div className="t-meta" style={{ marginBottom: 16 }}>{(owner.display_name || "The poster").split(" ")[0]} sees your pitch and any attached link.</div>
      <div style={{ display: "flex", flexDirection: "column", gap: 10 }}>
        <textarea className="input-field" rows={5} placeholder="Short pitch — what you'd bring, references, turnaround time… (min 10 chars)" value={pitch} onChange={(e) => setPitch(e.target.value)} maxLength={2000} disabled={submitting} />
        <input className="input-field" style={{ resize: "none", height: 38 }} placeholder="Optional: link to a portfolio track (SoundCloud, Drive, Dropbox…)" value={link} onChange={(e) => setLink(e.target.value)} maxLength={500} disabled={submitting} />
        {err && <div style={{ fontSize: 12, color: "var(--cherry)" }}>{err}</div>}
        <div style={{ display: "flex", gap: 10, alignItems: "center", justifyContent: "space-between" }}>
          <span className="t-meta">{pitch.length}/2000</span>
          <button className="btn primary lg" onClick={submit} disabled={!canSubmit} style={{ opacity: canSubmit ? 1 : 0.5, cursor: canSubmit ? "pointer" : "not-allowed" }}>{submitting ? "Sending…" : "Send application"}</button>
        </div>
      </div>
    </div>
  );
}

function ApplicationStatusCard({ application, owner, onWithdrawn }: { application: Application; owner: GigOwner; onWithdrawn: (a: Application) => void }) {
  const [busy, setBusy] = useState(false);
  const [err, setErr] = useState("");
  const status = application.status;
  const [contract, setContract] = useState<Contract | null | undefined>(undefined);

  useEffect(() => {
    let cancelled = false;
    if (status === "accepted") {
      getContractForApplication(application.id).then((c) => { if (!cancelled) setContract(c); }).catch(() => { if (!cancelled) setContract(null); });
    } else {
      setContract(null);
    }
    return () => { cancelled = true; };
  }, [application.id, status]);

  const withdraw = async () => {
    if (!(await confirm({ title: "Withdraw application?", message: "You can re-apply only by contacting the poster.", confirmLabel: "Withdraw", danger: true }))) return;
    setBusy(true);
    setErr("");
    try {
      const updated = await updateApplicationStatus(application.id, "withdrawn");
      onWithdrawn(updated);
    } catch (e) {
      setErr((e as Error)?.message || "Couldn't withdraw.");
    } finally {
      setBusy(false);
    }
  };
  const headline = { pending: "Your application is in.", accepted: "You're in — accepted!", rejected: "Not this time.", withdrawn: "You withdrew your application." }[status] || "Application sent.";
  const sub = { pending: "The poster will be in touch if you're a fit.", accepted: "The poster accepted. Open a DM to take it from here.", rejected: "The poster passed on this one. Keep going — there's more.", withdrawn: "This gig is closed for you. You can apply to others freely." }[status] || "";
  return (
    <div className="apply-section" style={{ marginBottom: 28 }}>
      <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 10 }}>
        <div style={{ fontFamily: "var(--font-display)", fontWeight: 600, fontSize: 18 }}>{headline}</div>
        <span className={statusPillClass(status)}>{statusLabel(status)}</span>
      </div>
      <div className="t-meta" style={{ marginBottom: 14, fontSize: 12.5 }}>{sub}</div>
      <div className="card hairline" style={{ background: "var(--surface)", padding: 14 }}>
        <div className="t-eyebrow" style={{ marginBottom: 8 }}>Your pitch</div>
        <p style={{ fontSize: 13, lineHeight: 1.55, color: "var(--ink-2)", whiteSpace: "pre-wrap" }}>{application.pitch}</p>
        {application.attachment_url && <a href={application.attachment_url} target="_blank" rel="noopener" style={{ display: "inline-block", marginTop: 10, fontSize: 12, color: "var(--ink)", textDecoration: "underline" }}>{application.attachment_url}</a>}
      </div>
      {status === "accepted" && contract === null && (
        <div className="t-meta" style={{ marginTop: 12 }}>{(owner.display_name || "The poster").split(" ")[0]} will send a collaboration agreement here for you to review and sign.</div>
      )}
      <div style={{ display: "flex", justifyContent: "flex-end", gap: 8, marginTop: 12 }}>
        {status === "accepted" && owner?.id && <button className="btn sm" onClick={() => openDM(owner.id)}>Message {(owner.display_name || "").split(" ")[0] || "owner"}</button>}
        {status === "accepted" && contract && (
          <a href={R.contract(contract.id)} className="btn primary sm">{contract.status === "awaiting_signatures" ? "Review & sign contract →" : "View contract →"}</a>
        )}
        {status === "pending" && <button className="btn sm" onClick={withdraw} disabled={busy}>{busy ? "…" : "Withdraw application"}</button>}
      </div>
      {err && <div style={{ fontSize: 12, color: "var(--cherry)", marginTop: 8 }}>{err}</div>}
    </div>
  );
}

function OwnerApplicationCard({ app, gig, onChange }: { app: OwnerApp; gig: Gig; onChange: (a: Application) => void }) {
  const a = app.applicant || ({} as NonNullable<OwnerApp["applicant"]>);
  const [busy, setBusy] = useState(false);
  const [err, setErr] = useState("");
  const href = R.profile(a?.username);
  const [contract, setContract] = useState<Contract | null | undefined>(undefined);
  const [contractBusy, setContractBusy] = useState(false);

  useEffect(() => {
    let cancelled = false;
    if (app.status === "accepted") {
      getContractForApplication(app.id).then((c) => { if (!cancelled) setContract(c); }).catch(() => { if (!cancelled) setContract(null); });
    } else {
      setContract(null);
    }
    return () => { cancelled = true; };
  }, [app.id, app.status]);

  async function openContract() {
    if (contractBusy) return;
    setContractBusy(true);
    setErr("");
    try {
      let c = contract || (await getContractForApplication(app.id));
      if (!c) c = await createContract(app as Application, defaultTermsFromGig(gig), SeshnContract.version);
      window.location.href = R.contract(c.id);
    } catch (e) {
      setErr((e as Error)?.message || "Couldn't open the contract.");
      setContractBusy(false);
    }
  }
  const setStatus = async (next: Application["status"]) => {
    setBusy(true);
    setErr("");
    try {
      onChange(await updateApplicationStatus(app.id, next));
    } catch (e) {
      setErr((e as Error)?.message || "Couldn't update.");
    } finally {
      setBusy(false);
    }
  };
  return (
    <div className="card hairline" style={{ padding: 14, display: "flex", flexDirection: "column", gap: 10 }}>
      <div style={{ display: "flex", gap: 12, alignItems: "flex-start" }}>
        <a href={href} className="avatar" style={{ width: 40, height: 40, textDecoration: "none", color: "var(--ink-3)" }}>
          {a?.avatar_url ? <img src={a.avatar_url} alt="" style={{ width: "100%", height: "100%", objectFit: "cover" }} /> : initials(a?.display_name)}
        </a>
        <div style={{ flex: 1, minWidth: 0 }}>
          <div style={{ display: "flex", gap: 8, alignItems: "center", flexWrap: "wrap" }}>
            <a href={href} style={{ fontFamily: "var(--font-display)", fontWeight: 600, fontSize: 14, color: "var(--ink)", textDecoration: "none" }}>{a?.display_name || "Applicant"}</a>
            {a?.is_pro && <span className="pill solid" style={{ fontSize: 9, padding: "2px 6px" }}>✓ Pro</span>}
            {a?.has_producer_badge && <ProducerBadge compact />}
            <span className={statusPillClass(app.status)} style={{ fontSize: 10 }}>{statusLabel(app.status)}</span>
          </div>
          <div className="t-meta" style={{ marginTop: 2 }}>
            @{a?.username || "—"}
            {a?.location && " · " + a.location}
            {a?.roles && a.roles.length > 0 && " · " + a.roles.slice(0, 2).join(" · ")}
            {" · Applied " + new Date(app.created_at).toLocaleDateString()}
          </div>
        </div>
      </div>
      <p style={{ fontSize: 13, lineHeight: 1.55, color: "var(--ink-2)", whiteSpace: "pre-wrap" }}>{app.pitch}</p>
      {app.attachment_url && <a href={app.attachment_url} target="_blank" rel="noopener" style={{ fontSize: 12, color: "var(--ink)", textDecoration: "underline", overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>{app.attachment_url}</a>}
      <div style={{ display: "flex", gap: 8, justifyContent: "flex-end", paddingTop: 8, borderTop: "1px solid var(--line-soft)", flexWrap: "wrap" }}>
        <a href={href} className="btn sm">View profile</a>
        {app.status === "pending" && (
          <>
            <button className="btn sm" onClick={() => setStatus("rejected")} disabled={busy}>Pass</button>
            <button className="btn primary sm" onClick={() => setStatus("accepted")} disabled={busy}>Accept</button>
          </>
        )}
        {app.status === "accepted" && a?.id && (
          <>
            <button className="btn sm" onClick={() => setStatus("pending")} disabled={busy}>Undo accept</button>
            <button className="btn sm" onClick={() => openDM(a.id)}>Message</button>
            <button className="btn primary sm" onClick={openContract} disabled={contractBusy || contract === undefined}>
              {contractBusy || contract === undefined ? "…" : contract ? `Open contract${contract.status === "draft" ? "" : " · " + contractStatusLabel(contract.status)} →` : "Set up contract →"}
            </button>
          </>
        )}
        {app.status === "rejected" && <button className="btn sm" onClick={() => setStatus("pending")} disabled={busy}>Undo pass</button>}
      </div>
      {err && <div style={{ fontSize: 11, color: "var(--cherry)" }}>{err}</div>}
    </div>
  );
}

function OwnerApplicationsList({ gig }: { gig: Gig }) {
  const [apps, setApps] = useState<OwnerApp[] | null>(null);
  useEffect(() => {
    listApplicationsForGig(gig.id).then((list) => setApps(list as OwnerApp[]));
  }, [gig.id]);
  const updateOne = (updated: Application) => setApps((prev) => prev?.map((a) => (a.id === updated.id ? { ...a, ...updated } : a)) ?? prev);
  const pendingCount = (apps || []).filter((a) => a.status === "pending").length;
  const acceptedCount = (apps || []).filter((a) => a.status === "accepted").length;
  return (
    <div className="apply-section" style={{ marginBottom: 28 }}>
      <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 4 }}>
        <div style={{ fontFamily: "var(--font-display)", fontWeight: 600, fontSize: 18 }}>Applications {apps && `(${apps.length})`}</div>
        {apps && apps.length > 0 && <span className="t-meta">{pendingCount} pending · {acceptedCount} accepted</span>}
      </div>
      <div className="t-meta" style={{ marginBottom: 16 }}>You&apos;re the owner — these are people who pitched themselves for this gig.</div>
      {apps === null ? (
        <div className="t-meta">Loading applications…</div>
      ) : apps.length === 0 ? (
        <div className="card hairline" style={{ padding: 18, textAlign: "center" }}>
          <div style={{ fontFamily: "var(--font-display)", fontWeight: 600, fontSize: 14, color: "var(--ink)", marginBottom: 4 }}>No applications yet.</div>
          <div className="t-meta">Share the link or boost the gig to get pitches faster.</div>
        </div>
      ) : (
        <div style={{ display: "flex", flexDirection: "column", gap: 12 }}>
          {apps.map((a) => <OwnerApplicationCard key={a.id} app={a} gig={gig} onChange={updateOne} />)}
        </div>
      )}
    </div>
  );
}

const GIG_REPORT_REASONS = ["Spam or scam", "Misleading or fake", "Inappropriate content", "Asking to pay off-platform", "Something else"];
function GigReport({ gigId }: { gigId: string }) {
  const [open, setOpen] = useState(false);
  const [reason, setReason] = useState("");
  const [details, setDetails] = useState("");
  const [state, setState] = useState<"idle" | "sending" | "done" | "error">("idle");
  const [err, setErr] = useState("");
  const close = () => { setOpen(false); setReason(""); setDetails(""); setState("idle"); setErr(""); };
  const submit = async () => {
    if (!reason) { setErr("Pick a reason."); return; }
    setState("sending");
    setErr("");
    try {
      await reportGig(gigId, reason, details);
      setState("done");
    } catch (e) {
      setErr((e as Error)?.message || "Couldn't send the report.");
      setState("error");
    }
  };
  return (
    <>
      <button onClick={() => setOpen(true)} style={{ background: "none", border: "none", padding: 0, cursor: "pointer", fontFamily: "var(--font-display)", fontWeight: 500, fontSize: 11.5, color: "var(--ink-4)", textDecoration: "underline" }}>Report this gig</button>
      {open && (
        <div onClick={close} style={{ position: "fixed", inset: 0, background: "rgba(13,13,13,0.5)", zIndex: 60, display: "flex", alignItems: "flex-start", justifyContent: "center", padding: "60px 16px 16px", overflowY: "auto" }}>
          <div onClick={(e) => e.stopPropagation()} style={{ background: "var(--surface)", borderRadius: 14, border: "1px solid var(--line)", width: "100%", maxWidth: 440, padding: 24 }}>
            {state === "done" ? (
              <>
                <div style={{ fontFamily: "var(--font-display)", fontWeight: 600, fontSize: 20, marginBottom: 8 }}>Report received</div>
                <p style={{ fontSize: 13, color: "var(--ink-3)", lineHeight: 1.5, marginBottom: 20 }}>Thanks for flagging this. Our team reviews every report — we won&apos;t share that it came from you.</p>
                <button className="btn primary" style={{ width: "100%" }} onClick={close}>Done</button>
              </>
            ) : (
              <>
                <div style={{ fontFamily: "var(--font-display)", fontWeight: 600, fontSize: 20, marginBottom: 4 }}>Report this gig</div>
                <p style={{ fontSize: 13, color: "var(--ink-3)", lineHeight: 1.5, marginBottom: 16 }}>What&apos;s going on? This goes to our team — it&apos;s confidential.</p>
                <div style={{ display: "flex", flexDirection: "column", gap: 8, marginBottom: 14 }}>
                  {GIG_REPORT_REASONS.map((r) => (
                    <label key={r} style={{ display: "flex", alignItems: "center", gap: 10, padding: "10px 12px", borderRadius: 8, border: "1px solid " + (reason === r ? "var(--accent-d)" : "var(--line)"), background: reason === r ? "var(--accent-bg)" : "var(--surface)", cursor: "pointer", fontSize: 14, fontFamily: "var(--font-display)", fontWeight: 500 }}>
                      <input type="radio" name="gig-reason" checked={reason === r} onChange={() => { setReason(r); setErr(""); }} />
                      {r}
                    </label>
                  ))}
                </div>
                <textarea value={details} onChange={(e) => setDetails(e.target.value)} placeholder="Add any detail that helps us (optional)" maxLength={2000} style={{ width: "100%", minHeight: 80, padding: "10px 12px", borderRadius: 8, border: "1px solid var(--line)", fontFamily: "var(--font-body)", fontSize: 14, resize: "vertical", marginBottom: 12 }} />
                {err && <div style={{ color: "var(--cherry)", fontSize: 13, marginBottom: 10 }}>{err}</div>}
                <div style={{ display: "flex", gap: 10 }}>
                  <button className="btn" style={{ flex: 1 }} onClick={close} disabled={state === "sending"}>Cancel</button>
                  <button className="btn primary" style={{ flex: 1 }} onClick={submit} disabled={state === "sending" || !reason}>{state === "sending" ? "Sending…" : "Submit report"}</button>
                </div>
              </>
            )}
          </div>
        </div>
      )}
    </>
  );
}

function GigView({ gig: initialGig }: { gig: Gig }) {
  const [gig, setGig] = useState<Gig>(initialGig);
  const owner = gig.owner || ({} as GigOwner);
  const isBoosted = !!(gig.boosted_until && new Date(gig.boosted_until) > new Date());
  const body = (gig.description || "").split(/\n\n+/).filter(Boolean);
  const [me, setMe] = useState<User | null | undefined>(undefined);
  const [myApp, setMyApp] = useState<Application | null | undefined>(undefined);
  const [statusBusy, setStatusBusy] = useState(false);

  async function toggleStatus() {
    if (statusBusy) return;
    const next = gig.status === "closed" ? "open" : "closed";
    const verb = next === "closed" ? "close" : "reopen";
    if (!(await confirm({
      title: (next === "closed" ? "Close" : "Reopen") + " this gig?",
      message: next === "closed" ? "It will be hidden from the feed and stop accepting new applications." : "It will be visible in the feed and accept applications again.",
      confirmLabel: verb.charAt(0).toUpperCase() + verb.slice(1),
      danger: next === "closed",
    }))) return;
    setStatusBusy(true);
    try {
      const updated = await setGigStatus(gig.id, next);
      setGig((prev) => ({ ...prev, status: updated.status }));
      toast.success(next === "closed" ? "Gig closed." : "Gig reopened.");
    } catch (e) {
      toast.error((e as Error)?.message || "Couldn't update the gig.");
    } finally {
      setStatusBusy(false);
    }
  }

  useEffect(() => {
    let cancelled = false;
    getUser().then(async (u) => {
      if (cancelled) return;
      setMe(u || null);
      if (u && u.id !== owner.id) {
        const a = await getMyApplication(gig.id);
        if (!cancelled) setMyApp(a || null);
      } else {
        setMyApp(null);
      }
    });
    return () => { cancelled = true; };
  }, [gig.id, owner.id]);

  const isOwner = !!(me && me.id === owner.id);
  const isClosed = gig.status === "closed";

  return (
    <div style={{ background: "var(--bg)", minHeight: "100vh" }}>
      <Nav />
      <div className="gig-page">
        <div>
          <a href={R.feed} className="back-link">← Back to feed</a>
          <div style={{ display: "flex", gap: 8, flexWrap: "wrap", marginBottom: 16, alignItems: "center" }}>
            {isClosed && <span className="pill" style={{ background: "var(--ink)", color: "var(--frame)", borderColor: "transparent" }}>Closed</span>}
            {isBoosted && !isClosed && <span className="pill solid">★ Boosted</span>}
            <span className="pill accent">{gig.role} needed</span>
            <span className="pill">{compLabel(gig)}</span>
            {gig.location && <span className="pill">{gig.location}</span>}
            {gig.deadline && <span className="pill">{deadlineLabel(gig.deadline)}</span>}
            {isOwner && <button className="btn sm" style={{ marginLeft: "auto" }} onClick={toggleStatus} disabled={statusBusy}>{statusBusy ? "…" : isClosed ? "Reopen gig" : "Close gig"}</button>}
          </div>

          <h1 className="page-h1" style={{ fontFamily: "var(--font-display)", fontWeight: 600, fontSize: 40, lineHeight: 1.02, letterSpacing: "-0.025em", color: "var(--ink)", marginBottom: 20 }}>{gig.title}</h1>

          <div style={{ position: "relative", marginBottom: 20 }}>
            {gig.cover_url ? (
              <div style={{ height: 160, borderRadius: 12, overflow: "hidden", background: "var(--ph)" }}>
                <img src={gig.cover_url} alt="" style={{ width: "100%", height: "100%", objectFit: "cover", display: "block" }} />
              </div>
            ) : (
              <CoverHeader seed={gig.id || gig.title} height={160} />
            )}
            <div style={{ position: "absolute", left: 18, bottom: 14, display: "flex", gap: 12, alignItems: "center" }}>
              {gig.cover_url ? (
                <img src={gig.cover_url} alt="" style={{ width: 64, height: 64, borderRadius: 6, objectFit: "cover", display: "block", border: "2px solid var(--frame)", boxShadow: "0 4px 12px rgba(0,0,0,0.18)" }} />
              ) : (
                <AlbumArt seed={gig.title} size={64} radius={6} />
              )}
            </div>
            {gig.genres && gig.genres.length > 0 && (
              <div style={{ position: "absolute", top: 14, right: 14 }}>
                <span style={{ display: "inline-block", transform: "rotate(4deg)", padding: "5px 10px", borderRadius: 4, background: "var(--ink)", color: "var(--frame)", fontFamily: "var(--font-display)", fontWeight: 700, fontSize: 11, letterSpacing: "0.04em", textTransform: "uppercase", boxShadow: "0 4px 12px rgba(0,0,0,0.3)" }}>{gig.genres.slice(0, 2).join(" · ")}</span>
              </div>
            )}
          </div>

          <div style={{ display: "flex", alignItems: "center", gap: 12, marginBottom: 24 }}>
            <a href={R.profile(owner.username)} className="avatar" style={{ width: 40, height: 40, fontSize: 14, position: "relative", textDecoration: "none", color: "var(--ink-3)" }}>
              {owner.avatar_url ? <img src={owner.avatar_url} alt="" style={{ width: "100%", height: "100%", objectFit: "cover" }} /> : initials(owner.display_name)}
              {owner.is_pro && <span style={{ position: "absolute", bottom: -2, right: -2, background: "var(--frame)", borderRadius: 999, padding: "2px 5px", fontSize: 8, fontFamily: "var(--font-display)", fontWeight: 600, color: "var(--ink)", border: "1px solid var(--line)", lineHeight: 1, textTransform: "uppercase" }}>PRO</span>}
            </a>
            <div>
              <span style={{ display: "inline-flex", alignItems: "center", gap: 7 }}><a href={R.profile(owner.username)} style={{ fontFamily: "var(--font-display)", fontWeight: 600, fontSize: 14, color: "var(--ink)", textDecoration: "none" }}>{owner.display_name || "Artist"}</a>{owner.has_producer_badge && <ProducerBadge compact />}</span>
              <div className="t-meta">{owner.roles?.[0] || "Artist"}{owner.location ? " · " + owner.location : ""} · Posted {gig.created_at ? new Date(gig.created_at).toLocaleDateString() : "recently"}</div>
            </div>
          </div>

          <div style={{ borderTop: "1px solid var(--line)", paddingTop: 20, marginBottom: 24 }}>
            {body.length > 0 ? (
              <div style={{ display: "flex", flexDirection: "column", gap: 14 }}>
                {body.map((p, i) => <p key={i} style={{ fontSize: 14, lineHeight: 1.65, color: "var(--ink-2)", whiteSpace: "pre-wrap" }}>{p}</p>)}
              </div>
            ) : (
              <p style={{ fontSize: 14, color: "var(--ink-3)", fontStyle: "italic" }}>No additional brief — reach out to {owner.display_name || "the poster"} for details.</p>
            )}
          </div>

          {gig.genres && gig.genres.length > 0 && (
            <div style={{ marginBottom: 24 }}>
              <div className="t-eyebrow" style={{ marginBottom: 10 }}>Genres</div>
              <div style={{ display: "flex", gap: 6, flexWrap: "wrap" }}>{gig.genres.map((g) => <span key={g} className="pill">{g}</span>)}</div>
            </div>
          )}

          {me === undefined ? (
            <div className="apply-section" style={{ marginBottom: 28 }}><div className="t-meta">Loading…</div></div>
          ) : isOwner ? (
            <OwnerApplicationsList gig={gig} />
          ) : me === null ? (
            <div className="apply-section" style={{ marginBottom: 28, textAlign: "center" }}>
              <div style={{ fontFamily: "var(--font-display)", fontWeight: 600, fontSize: 18, marginBottom: 6 }}>Sign in to apply</div>
              <div className="t-meta" style={{ marginBottom: 14 }}>You&apos;ll need a Seshn account to send a pitch to {(owner.display_name || "the poster").split(" ")[0]}.</div>
              <a href={"/auth?next=" + encodeURIComponent(typeof window !== "undefined" ? window.location.pathname : "/")} className="btn primary lg">Sign in to apply</a>
            </div>
          ) : isClosed ? (
            <div className="apply-section" style={{ marginBottom: 28, textAlign: "center" }}>
              <div style={{ fontFamily: "var(--font-display)", fontWeight: 600, fontSize: 18, marginBottom: 6 }}>This gig is closed</div>
              <div className="t-meta">{(owner.display_name || "The poster").split(" ")[0]} is no longer taking applications.</div>
            </div>
          ) : myApp === undefined ? (
            <div className="apply-section" style={{ marginBottom: 28 }}><div className="t-meta">Checking…</div></div>
          ) : myApp ? (
            <ApplicationStatusCard application={myApp} owner={owner} onWithdrawn={setMyApp} />
          ) : (
            <ApplyForm gig={gig} owner={owner} onApplied={setMyApp} />
          )}
        </div>

        <div style={{ display: "flex", flexDirection: "column", gap: 14 }}>
          <div className="card">
            <div style={{ display: "flex", gap: 12, marginBottom: 14 }}>
              <a href={R.profile(owner.username)} className="avatar lg" style={{ textDecoration: "none", color: "var(--ink-3)" }}>
                {owner.avatar_url ? <img src={owner.avatar_url} alt="" style={{ width: "100%", height: "100%", objectFit: "cover" }} /> : initials(owner.display_name)}
              </a>
              <div style={{ flex: 1, minWidth: 0 }}>
                <div style={{ display: "flex", gap: 8, alignItems: "center", marginBottom: 3 }}>
                  <a href={R.profile(owner.username)} style={{ fontFamily: "var(--font-display)", fontWeight: 600, fontSize: 15, color: "var(--ink)", textDecoration: "none" }}>{owner.display_name || "Artist"}</a>
                  {owner.is_pro && <span className="pill solid" style={{ fontSize: 9, padding: "2px 7px" }}>✓ Pro</span>}
                </div>
                <div className="t-meta">{owner.roles?.join(" · ") || "Artist"}{owner.location ? " · " + owner.location : ""}</div>
              </div>
            </div>
            <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", paddingTop: 12, borderTop: "1px solid var(--line-soft)" }}>
              <div>
                <div className="t-meta">Posted</div>
                <div style={{ fontFamily: "var(--font-display)", fontWeight: 600, fontSize: 15, marginTop: 2 }}>{gig.created_at ? new Date(gig.created_at).toLocaleDateString() : "—"}</div>
              </div>
              <a href={R.profile(owner.username)} className="btn sm">View profile</a>
            </div>
          </div>

          <div className="card hairline">
            <div className="t-eyebrow" style={{ marginBottom: 12 }}>Gig details</div>
            <div style={{ display: "flex", flexDirection: "column", gap: 10 }}>
              <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center" }}><span className="t-meta">Role</span><strong style={{ fontFamily: "var(--font-display)", fontSize: 13 }}>{gig.role}</strong></div>
              <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center" }}><span className="t-meta">Pay</span><strong style={{ fontFamily: "var(--font-display)", fontSize: 13 }}>{compLabel(gig)}</strong></div>
              <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center" }}><span className="t-meta">Location</span><strong style={{ fontFamily: "var(--font-display)", fontSize: 13 }}>{gig.location || "—"}</strong></div>
              {gig.deadline && <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center" }}><span className="t-meta">Closes</span><strong style={{ fontFamily: "var(--font-display)", fontSize: 13 }}>{new Date(gig.deadline).toLocaleDateString(undefined, { month: "short", day: "numeric" })}</strong></div>}
            </div>
          </div>

          {!isOwner && !isClosed && myApp === null && me !== null && (
            <button className="btn primary" style={{ padding: "14px 20px", fontSize: 14, borderRadius: 10 }} onClick={() => window.scrollTo({ top: 0, behavior: "smooth" })}>Apply to this gig →</button>
          )}
          {!isOwner && myApp && (
            <div className="card hairline" style={{ textAlign: "center", padding: 14 }}>
              <span className={statusPillClass(myApp.status)}>{statusLabel(myApp.status)}</span>
              <div className="t-meta" style={{ marginTop: 6 }}>Your application</div>
            </div>
          )}
          {isOwner && <a href={R.applications} className="btn" style={{ padding: "12px 16px", fontSize: 13, justifyContent: "center" }}>Manage all your gigs</a>}

          <div style={{ textAlign: "center", fontSize: 11, color: "var(--ink-4)" }}>{isOwner ? "You own this gig" : "Free to apply · no account required to browse"}</div>
          {!isOwner && <div style={{ textAlign: "center", marginTop: 2 }}><GigReport gigId={gig.id} /></div>}
        </div>
      </div>
      <GigRecommendations gig={gig} meId={me === undefined ? null : me?.id ?? null} />
    </div>
  );
}

export default function GigPage() {
  const params = useParams();
  const id = (Array.isArray(params.id) ? params.id[0] : params.id) || "";
  const [state, setState] = useState<{ status: "loading" | "ready" | "notfound" | "error"; gig: Gig | null }>({ status: "loading", gig: null });

  useEffect(() => {
    if (!id) {
      setState({ status: "notfound", gig: null });
      return;
    }
    getGig(id).then((gig) => {
      if (!gig) {
        setState({ status: "notfound", gig: null });
        return;
      }
      document.title = "Seshn — " + gig.title;
      setState({ status: "ready", gig });
      void recordGigView(gig.id);
    }).catch(() => setState({ status: "error", gig: null }));
  }, [id]);

  if (state.status === "loading") {
    return <div style={{ minHeight: "100vh", display: "flex", alignItems: "center", justifyContent: "center", color: "var(--ink-3)", fontFamily: "var(--font-display)", fontSize: 13 }}>Loading gig…</div>;
  }
  if (state.status === "notfound") {
    return (
      <div style={{ minHeight: "100vh", display: "flex", flexDirection: "column", alignItems: "center", justifyContent: "center", gap: 14, padding: 24, textAlign: "center" }}>
        <span style={{ fontFamily: "var(--font-display)", fontWeight: 700, fontSize: 28, color: "var(--ink)" }}>Gig not found</span>
        <span style={{ color: "var(--ink-3)", fontSize: 14 }}>This gig may have been closed or removed.</span>
        <a href={R.feed} className="btn primary" style={{ marginTop: 8 }}>← Back to the feed</a>
      </div>
    );
  }
  if (state.status === "error" || !state.gig) {
    return <div style={{ minHeight: "100vh", display: "flex", alignItems: "center", justifyContent: "center", color: "var(--danger)", fontFamily: "var(--font-display)", fontSize: 13 }}>Couldn&apos;t load Seshn. Refresh to try again.</div>;
  }
  return <GigView gig={state.gig} />;
}
