"use client";

import { useEffect, useRef, useState } from "react";
import { useParams } from "next/navigation";
import type { User } from "@supabase/supabase-js";
import Nav from "@/components/Nav";
import { requireProfile } from "@/lib/seshn/auth";
import { getContract, sendContract, signContract, declineContract, cancelContract, updateContractTerms } from "@/lib/seshn/contracts";
import { getOrCreateConversation } from "@/lib/seshn/messaging";
import { toast } from "@/lib/seshn/toast";
import { render as renderAgreement, hashAgreement, fmtMoney, SeshnContract, type AgreementDoc, type Paragraph } from "@/lib/contract-template";
import type { Contract } from "@/lib/seshn/types";
import "./contract.css";

interface ContractTerms {
  fee_cents?: number;
  currency?: string;
  approval_window_days?: number;
  deliverable?: { description?: string; format_notes?: string; deliver_by?: string };
  splits?: { master_owner_pct?: number; master_collaborator_pct?: number; publishing_owner_pct?: number; publishing_collaborator_pct?: number };
  credits?: { text?: string };
}

function statusLabel(s: string) {
  return { draft: "Draft", awaiting_signatures: "Awaiting signatures", active: "Active", completed: "Completed", cancelled: "Cancelled" }[s] || s || "";
}
function statusPillClass(s: string) {
  if (s === "active" || s === "completed") return "pill accent";
  if (s === "cancelled") return "pill cherry";
  if (s === "awaiting_signatures") return "pill amber";
  return "pill";
}
function fmtDateTime(iso?: string | null) {
  if (!iso) return "—";
  try {
    return new Date(iso).toLocaleString("en-AU", { day: "numeric", month: "short", year: "numeric", hour: "2-digit", minute: "2-digit" });
  } catch {
    return iso;
  }
}

function ContractDocument({ doc, onScrolledBottom }: { doc: AgreementDoc; onScrolledBottom: (() => void) | null }) {
  const ref = useRef<HTMLDivElement>(null);
  useEffect(() => {
    if (!onScrolledBottom) return;
    const el = ref.current;
    if (!el) return;
    let seen = false;
    function check() {
      if (seen || !el) return;
      const rect = el.getBoundingClientRect();
      if (rect.bottom - window.innerHeight < 80) {
        seen = true;
        onScrolledBottom!();
        window.removeEventListener("scroll", check, true);
        window.removeEventListener("resize", check, true);
      }
    }
    window.addEventListener("scroll", check, true);
    window.addEventListener("resize", check, true);
    check();
    return () => {
      window.removeEventListener("scroll", check, true);
      window.removeEventListener("resize", check, true);
    };
  }, [doc, onScrolledBottom]);

  function renderParagraph(p: Paragraph, i: number) {
    if (typeof p === "string") return <p key={i}>{p}</p>;
    if (p.kind === "blockquote") return <div key={i} className="doc-blockquote">{p.text}</div>;
    if (p.kind === "list-bullet") return <ul key={i}>{p.items.map((it, j) => <li key={j}>{it}</li>)}</ul>;
    if (p.kind === "list-letter") return <ol key={i} className="letters">{p.items.map((it, j) => <li key={j}>{it}</li>)}</ol>;
    if (p.kind === "party")
      return (
        <div key={i} className="doc-party">
          <div className="doc-party-role">{p.role}</div>
          <div><div>{p.name}</div><div className="t-meta">{p.handle} · {p.country}</div></div>
        </div>
      );
    if (p.kind === "splits-block")
      return (
        <div key={i} className="doc-splits">
          <div className="doc-splits-label">{p.label}</div>
          {p.rows.map((r, j) => <div key={j} className="doc-splits-row"><span>{r.handle}</span><span>{r.pct}</span></div>)}
        </div>
      );
    return null;
  }

  const s = doc.signatures;
  const sigCard = (role: string, info: typeof s.owner) => {
    const evidence = info.evidence as { agreement_hash?: string } | null;
    return (
      <div className="sig-card">
        <div className="sig-role">{role}</div>
        <div className="sig-name">{info.party.name}</div>
        <div className="sig-handle">{info.party.handle}</div>
        {info.signed_at ? (
          <>
            <div className="sig-when">Signed {fmtDateTime(info.signed_at)}</div>
            {evidence?.agreement_hash && <div className="sig-hash">sha256: {evidence.agreement_hash}</div>}
          </>
        ) : (
          <div className="sig-pending">Awaiting signature</div>
        )}
      </div>
    );
  };

  return (
    <div className="doc" ref={ref}>
      <div className="doc-title">{doc.title}</div>
      <div className="doc-meta">
        <span><b>Contract</b> {doc.header.contract_id}</span>
        {doc.header.created_at && <span><b>Drafted</b> {fmtDateTime(doc.header.created_at)}</span>}
        <span><b>Template</b> {doc.version}</span>
      </div>
      {doc.sections.map((sec) => (
        <div key={sec.number} className="doc-section">
          <h3>{sec.number}. {sec.title}</h3>
          {sec.paragraphs.map(renderParagraph)}
        </div>
      ))}
      <div className="sig-block">
        <div className="t-eyebrow" style={{ marginBottom: 12 }}>Signatures</div>
        <div className="sig-grid">{sigCard("Owner", s.owner)}{sigCard("Collaborator", s.collaborator)}</div>
        <div style={{ marginTop: 18, paddingTop: 14, borderTop: "1px solid var(--line-soft)", fontSize: 11, color: "var(--ink-3)", lineHeight: 1.5 }}>
          <div>Witnessed by <b>{s.witness.entity}</b>.</div>
          <div>Contract ID: <span style={{ fontFamily: "ui-monospace, monospace" }}>{s.witness.contract_id}</span></div>
        </div>
      </div>
    </div>
  );
}

function StatusSidebar({ contract, me, onOpenEditor, onSend, onDecline, onCancel, busy }: { contract: Contract; me: User; onOpenEditor: () => void; onSend: () => void; onDecline: () => void; onCancel: () => void; busy: boolean }) {
  const isOwner = contract.owner_id === me.id;
  const t = (contract.terms || {}) as ContractTerms;
  const amount = fmtMoney(t.fee_cents, t.currency || "AUD");
  const days = t.approval_window_days || 7;

  return (
    <div className="sidebar no-print">
      <div className="card">
        <div className="t-eyebrow" style={{ marginBottom: 6 }}>Status</div>
        <span className={statusPillClass(contract.status)}>{statusLabel(contract.status)}</span>
        <div style={{ marginTop: 14 }}>
          <div className="status-row">
            <div className="who"><span className="who-name">{contract.owner?.display_name || "Owner"}</span><span className="who-meta">@{contract.owner?.username} · owner</span></div>
            {contract.owner_signed_at ? <span className="tick" title={fmtDateTime(contract.owner_signed_at)}>✓</span> : <span className="dot" title="not yet" />}
          </div>
          <div className="status-row">
            <div className="who"><span className="who-name">{contract.collaborator?.display_name || "Collaborator"}</span><span className="who-meta">@{contract.collaborator?.username} · collaborator</span></div>
            {contract.collaborator_signed_at ? <span className="tick" title={fmtDateTime(contract.collaborator_signed_at)}>✓</span> : <span className="dot" title="not yet" />}
          </div>
        </div>
      </div>

      <div className="card">
        <div className="t-eyebrow" style={{ marginBottom: 8 }}>Money</div>
        <div style={{ fontFamily: "var(--font-display)", fontWeight: 600, fontSize: 22, color: "var(--ink)" }}>{amount}</div>
        <div className="t-meta" style={{ marginTop: 6, lineHeight: 1.5 }}>Held in escrow until the owner approves the delivery, or {days} days pass after delivery, or a dispute is opened.</div>
      </div>

      {t.splits && (
        <div className="card">
          <div className="t-eyebrow" style={{ marginBottom: 8 }}>Splits</div>
          <div style={{ fontSize: 12, color: "var(--ink-2)", lineHeight: 1.7 }}>
            <div><b>Master</b> &nbsp; {t.splits.master_owner_pct}% / {t.splits.master_collaborator_pct}%</div>
            <div><b>Publishing</b> &nbsp; {t.splits.publishing_owner_pct}% / {t.splits.publishing_collaborator_pct}%</div>
            <div className="t-meta" style={{ marginTop: 6 }}>Effective on full release of payment.</div>
          </div>
        </div>
      )}

      {contract.status === "draft" && isOwner && (
        <div className="card">
          <div className="t-eyebrow" style={{ marginBottom: 8 }}>Actions</div>
          <button className="btn primary" style={{ width: "100%", marginBottom: 8 }} onClick={onOpenEditor} disabled={busy}>Edit terms</button>
          <button className="btn" style={{ width: "100%", marginBottom: 8 }} onClick={onSend} disabled={busy}>{busy ? "…" : "Send to collaborator"}</button>
          <button className="btn danger" style={{ width: "100%" }} onClick={onCancel} disabled={busy}>Cancel contract</button>
          <div className="t-meta" style={{ marginTop: 8, lineHeight: 1.5 }}>Once you send this contract, terms are locked until both parties sign or it&apos;s declined.</div>
        </div>
      )}

      {contract.status === "awaiting_signatures" && (
        <div className="card">
          <div className="t-eyebrow" style={{ marginBottom: 8 }}>What&apos;s next</div>
          {isOwner && contract.owner_signed_at && !contract.collaborator_signed_at && (
            <div className="t-meta" style={{ lineHeight: 1.5 }}>Waiting on @{contract.collaborator?.username} to sign. We&apos;ll notify you when they do.</div>
          )}
          {!isOwner && !contract.collaborator_signed_at && <div className="t-meta" style={{ lineHeight: 1.5 }}>Read the document, then sign or decline below.</div>}
          {isOwner && <button className="btn danger" style={{ width: "100%", marginTop: 10 }} onClick={onCancel} disabled={busy}>Cancel contract</button>}
          {!isOwner && <button className="btn" style={{ width: "100%", marginTop: 10 }} onClick={onDecline} disabled={busy}>Decline &amp; ask to renegotiate</button>}
        </div>
      )}

      {contract.status === "active" && (
        <div className="card">
          <div className="t-eyebrow" style={{ marginBottom: 8 }}>Next step</div>
          {isOwner ? (
            <>
              <button className="btn primary" style={{ width: "100%" }} disabled>Fund escrow ({amount})</button>
              <div className="t-meta" style={{ marginTop: 8, lineHeight: 1.5 }}>Funding goes live once Stripe Connect is wired up. For now this contract sits active.</div>
            </>
          ) : (
            <div className="t-meta" style={{ lineHeight: 1.5 }}>Waiting on @{contract.owner?.username} to fund the escrow. Once funded, you can start delivering.</div>
          )}
        </div>
      )}

      <div className="card hairline">
        <div className="t-meta" style={{ lineHeight: 1.8 }}>
          <a href="/contracts" style={{ color: "var(--ink-2)", display: "block" }}>← All contracts</a>
          <a href={`/gig/${encodeURIComponent(contract.gig_id)}`} style={{ color: "var(--ink-2)", display: "block" }}>← Back to gig</a>
        </div>
      </div>
    </div>
  );
}

function TermsEditor({ contract, onClose, onSave }: { contract: Contract; onClose: () => void; onSave: (c: Contract) => void }) {
  const t0 = (contract.terms || {}) as ContractTerms;
  const d0 = t0.deliverable || {};
  const s0 = t0.splits || {};
  const c0 = t0.credits || {};
  const [fee, setFee] = useState((((t0.fee_cents || 0) / 100) || "").toString());
  const [currency, setCurrency] = useState(t0.currency || "AUD");
  const [desc, setDesc] = useState(d0.description || "");
  const [fmt, setFmt] = useState(d0.format_notes || "");
  const [deliverBy, setDeliverBy] = useState(d0.deliver_by || "");
  const [approvalDays, setApprovalDays] = useState((t0.approval_window_days || 7).toString());
  const [masterOwner, setMasterOwner] = useState((s0.master_owner_pct != null ? s0.master_owner_pct : 50).toString());
  const [pubOwner, setPubOwner] = useState((s0.publishing_owner_pct != null ? s0.publishing_owner_pct : 50).toString());
  const [credits, setCredits] = useState(c0.text || "");
  const [saving, setSaving] = useState(false);
  const [err, setErr] = useState("");

  async function save() {
    setErr("");
    const feeCents = Math.round(parseFloat(fee || "0") * 100);
    if (!feeCents || feeCents < 100) { setErr("Fee must be at least $1."); return; }
    if (!desc.trim()) { setErr("Deliverable description is required."); return; }
    if (!deliverBy) { setErr("Delivery deadline is required."); return; }
    const mO = parseInt(masterOwner, 10), pO = parseInt(pubOwner, 10);
    if (isNaN(mO) || mO < 0 || mO > 100) { setErr("Master split owner % must be 0-100."); return; }
    if (isNaN(pO) || pO < 0 || pO > 100) { setErr("Publishing split owner % must be 0-100."); return; }
    const aw = parseInt(approvalDays, 10);
    if (isNaN(aw) || aw < 1 || aw > 30) { setErr("Approval window must be 1-30 days."); return; }

    const terms = {
      template_version: SeshnContract.version,
      fee_cents: feeCents,
      currency,
      platform_fee_pct: 5,
      approval_window_days: aw,
      deliverable: { description: desc.trim(), format_notes: fmt.trim(), deliver_by: deliverBy },
      splits: { master_owner_pct: mO, master_collaborator_pct: 100 - mO, publishing_owner_pct: pO, publishing_collaborator_pct: 100 - pO },
      credits: { text: credits.trim() },
    };
    setSaving(true);
    try {
      const updated = await updateContractTerms(contract.id, terms);
      onSave(updated);
    } catch (e) {
      setErr((e as Error)?.message || "Could not save terms.");
    } finally {
      setSaving(false);
    }
  }

  return (
    <div className="modal-backdrop" onClick={onClose}>
      <div className="modal" onClick={(e) => e.stopPropagation()}>
        <h2>Edit contract terms</h2>
        <div className="field-row">
          <div className="field"><label>Fee</label><input type="number" min="1" step="0.01" value={fee} onChange={(e) => setFee(e.target.value)} /></div>
          <div className="field"><label>Currency</label><select value={currency} onChange={(e) => setCurrency(e.target.value)}><option value="AUD">AUD</option><option value="USD">USD</option><option value="GBP">GBP</option><option value="EUR">EUR</option></select></div>
        </div>
        <div className="field"><label>Deliverable description</label><textarea value={desc} onChange={(e) => setDesc(e.target.value)} placeholder="e.g. Two mixed and mastered audio stems for the chorus and bridge." /></div>
        <div className="field-row">
          <div className="field"><label>Format notes</label><input type="text" value={fmt} onChange={(e) => setFmt(e.target.value)} placeholder="e.g. 24-bit WAV, 48 kHz" /></div>
          <div className="field"><label>Deliver by</label><input type="date" value={deliverBy} onChange={(e) => setDeliverBy(e.target.value)} /></div>
        </div>
        <div className="field">
          <label>Approval window (days)</label>
          <input type="number" min="1" max="30" value={approvalDays} onChange={(e) => setApprovalDays(e.target.value)} />
          <span className="field-hint">Days after delivery before funds auto-release if the owner doesn&apos;t act.</span>
        </div>
        <div className="field-row">
          <div className="field"><label>Master split — owner %</label><input type="number" min="0" max="100" value={masterOwner} onChange={(e) => setMasterOwner(e.target.value)} /><span className="field-hint">Collaborator gets {Math.max(0, 100 - parseInt(masterOwner || "0", 10))}%.</span></div>
          <div className="field"><label>Publishing split — owner %</label><input type="number" min="0" max="100" value={pubOwner} onChange={(e) => setPubOwner(e.target.value)} /><span className="field-hint">Collaborator gets {Math.max(0, 100 - parseInt(pubOwner || "0", 10))}%.</span></div>
        </div>
        <div className="field"><label>Credit text</label><textarea value={credits} onChange={(e) => setCredits(e.target.value)} placeholder="e.g. Produced by Sam Lee. Co-produced by Jo Park." /></div>
        {err && <div className="banner cherry">{err}</div>}
        <div style={{ display: "flex", gap: 8, marginTop: 8 }}>
          <button className="btn primary" onClick={save} disabled={saving}>{saving ? "Saving…" : "Save terms"}</button>
          <button className="btn" onClick={onClose} disabled={saving}>Cancel</button>
        </div>
      </div>
    </div>
  );
}

function DeclineModal({ onClose, onSubmit, busy }: { onClose: () => void; onSubmit: (reason: string) => void; busy: boolean }) {
  const [reason, setReason] = useState("");
  return (
    <div className="modal-backdrop" onClick={onClose}>
      <div className="modal" onClick={(e) => e.stopPropagation()} style={{ maxWidth: 460 }}>
        <h2>Decline &amp; ask to renegotiate</h2>
        <p style={{ fontSize: 13, color: "var(--ink-2)", lineHeight: 1.6, marginBottom: 14 }}>The contract goes back to draft. The owner can edit terms and resend. Both signatures (yours and theirs) will be cleared.</p>
        <div className="field"><label>What needs to change? (optional)</label><textarea value={reason} onChange={(e) => setReason(e.target.value)} placeholder="e.g. The deadline is too tight, can we push to July 15?" /></div>
        <div style={{ display: "flex", gap: 8 }}>
          <button className="btn primary" onClick={() => onSubmit(reason)} disabled={busy}>{busy ? "…" : "Decline"}</button>
          <button className="btn" onClick={onClose} disabled={busy}>Keep reviewing</button>
        </div>
      </div>
    </div>
  );
}

function SignBar({ contract, me, readToBottom, onSign, busy }: { contract: Contract; me: User; readToBottom: boolean; onSign: () => void; busy: boolean }) {
  const [ack, setAck] = useState(false);
  const isOwner = contract.owner_id === me.id;
  const myHandle = isOwner ? contract.owner?.username : contract.collaborator?.username;
  const alreadySigned = isOwner ? !!contract.owner_signed_at : !!contract.collaborator_signed_at;

  if (alreadySigned) {
    return (
      <div className="sign-bar no-print">
        <div className="banner green" style={{ margin: 0 }}>
          You signed this contract on {fmtDateTime(isOwner ? contract.owner_signed_at : contract.collaborator_signed_at)}.
          {!contract.fully_signed_at && " Waiting on the other party."}
        </div>
      </div>
    );
  }
  const canSign = readToBottom && ack && !busy;
  return (
    <div className="sign-bar sticky-bottom no-print">
      <label className={"ack-row" + (readToBottom ? "" : " disabled")} title={readToBottom ? "" : "Scroll to the bottom of the agreement first."}>
        <input type="checkbox" checked={ack} onChange={(e) => setAck(e.target.checked)} disabled={!readToBottom} />
        <span>I have read this agreement and agree to its terms. I confirm I am @{myHandle || "—"} and I intend to sign this contract.</span>
      </label>
      <div className="sign-actions">
        <button className="btn primary lg" onClick={onSign} disabled={!canSign} aria-disabled={!canSign}>{busy ? "Signing…" : "Sign contract"}</button>
      </div>
      <div className="sign-disclaimer">
        By signing, you confirm your identity as @{myHandle} and consent to Seshn recording your signing time, browser, and a cryptographic hash of this agreement as proof of signature. This is a binding electronic signature under the Electronic Transactions Act 1999 (Cth).
        {!readToBottom && <span style={{ display: "block", marginTop: 6, color: "var(--ink-2)" }}>Scroll the agreement to the bottom to enable signing.</span>}
      </div>
    </div>
  );
}

export default function ContractPage() {
  const params = useParams();
  const contractId = (Array.isArray(params.id) ? params.id[0] : params.id) || "";
  const [me, setMe] = useState<User | null | undefined>(undefined);
  const [contract, setContract] = useState<Contract | null | undefined>(undefined);
  const [doc, setDoc] = useState<AgreementDoc | null>(null);
  const [agreementHash, setAgreementHash] = useState<string | null>(null);
  const [readToBottom, setReadToBottom] = useState(false);
  const [busy, setBusy] = useState(false);
  const [err, setErr] = useState("");
  const [showEditor, setShowEditor] = useState(false);
  const [showDecline, setShowDecline] = useState(false);

  useEffect(() => {
    (async () => {
      const r = await requireProfile({ allowAnon: true });
      if (!r) return;
      if (!r.user) { setMe(null); return; }
      setMe(r.user);
      if (!contractId) { setContract(null); return; }
      try {
        const c = await getContract(contractId);
        setContract(c);
      } catch (e) {
        setErr((e as Error)?.message || "Could not load contract.");
        setContract(null);
      }
    })();
  }, [contractId]);

  useEffect(() => {
    if (!contract) return;
    const rendered = renderAgreement(contract, contract.owner, contract.collaborator, contract.gig);
    setDoc(rendered);
    hashAgreement(rendered).then(setAgreementHash).catch(() => setAgreementHash(null));
    setReadToBottom(false);
  }, [contract]);

  async function refresh() {
    setContract(await getContract(contractId));
  }
  async function doSend() {
    if (!contract) return;
    if (!window.confirm("Send this contract to @" + (contract.collaborator?.username) + " for signing? Terms will lock once sent.")) return;
    setBusy(true); setErr("");
    try { await sendContract(contract.id); await refresh(); toast.success("Contract sent for signing."); } catch (e) { setErr((e as Error)?.message || "Could not send contract."); } finally { setBusy(false); }
  }
  async function doSign() {
    if (!contract) return;
    if (!agreementHash) { setErr("Agreement hash not ready yet — try again in a moment."); return; }
    setBusy(true); setErr("");
    try { await signContract(contract.id, agreementHash); await refresh(); toast.success("Signed. We've recorded your signature."); } catch (e) { setErr((e as Error)?.message || "Could not sign contract."); } finally { setBusy(false); }
  }
  async function doDecline(reason: string) {
    if (!contract) return;
    setBusy(true); setErr("");
    try { await declineContract(contract.id, reason); setShowDecline(false); await refresh(); } catch (e) { setErr((e as Error)?.message || "Could not decline."); } finally { setBusy(false); }
  }
  async function doCancel() {
    if (!contract) return;
    const reason = window.prompt("Cancel this contract? Optional: why?");
    if (reason === null) return;
    setBusy(true); setErr("");
    try { await cancelContract(contract.id, reason); await refresh(); } catch (e) { setErr((e as Error)?.message || "Could not cancel."); } finally { setBusy(false); }
  }
  async function scheduleMeeting() {
    if (!contract || !me) return;
    const otherId = contract.owner_id === me.id ? contract.collaborator_id : contract.owner_id;
    try {
      const cid = await getOrCreateConversation(otherId);
      window.location.href = `/inbox?c=${encodeURIComponent(cid)}&schedule=1`;
    } catch (e) {
      toast.error((e as Error)?.message || "Couldn't open a conversation to schedule.");
    }
  }

  if (me === undefined || contract === undefined) {
    return (<div className="contract-page"><Nav active={null} /><div className="page"><div className="t-meta">Loading…</div></div></div>);
  }
  if (me === null) {
    return (
      <div className="contract-page">
        <Nav active={null} showPostButton={false} />
        <div className="page" style={{ textAlign: "center", paddingTop: 60 }}>
          <h1 style={{ fontFamily: "var(--font-display)", fontWeight: 700, fontSize: 26 }}>Sign in to view this contract</h1>
          <p style={{ color: "var(--ink-3)", marginTop: 8, marginBottom: 18 }}>Only the two named parties can read or sign a contract.</p>
          <a href={"/auth?next=" + encodeURIComponent("/contract/" + contractId)} className="btn primary lg">Sign in</a>
        </div>
      </div>
    );
  }
  if (contract === null) {
    return (
      <div className="contract-page">
        <Nav active={null} />
        <div className="page" style={{ textAlign: "center", paddingTop: 60 }}>
          <h1 style={{ fontFamily: "var(--font-display)", fontWeight: 700, fontSize: 24 }}>Contract not found</h1>
          <p style={{ color: "var(--ink-3)", marginTop: 8 }}>{err || "Either it doesn't exist or you're not a party to it."}</p>
          <a href="/applications" className="btn" style={{ marginTop: 14 }}>Back to applications</a>
        </div>
      </div>
    );
  }

  const isOwner = contract.owner_id === me.id;
  const canSign = contract.status === "awaiting_signatures" && (isOwner ? !contract.owner_signed_at : !contract.collaborator_signed_at);

  return (
    <div className="contract-page">
      <div className="no-print"><Nav active={null} /></div>
      <div className="page">
        <div className="no-print" style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 18, flexWrap: "wrap", gap: 10 }}>
          <h1 style={{ fontFamily: "var(--font-display)", fontWeight: 600, fontSize: 22, letterSpacing: "-0.01em" }}>
            Contract with @{isOwner ? contract.collaborator?.username : contract.owner?.username}
          </h1>
          <div style={{ display: "flex", gap: 8 }}>
            {contract.status !== "cancelled" && <button className="btn sm" onClick={scheduleMeeting}>Schedule a meeting</button>}
            <button className="btn sm" onClick={() => window.print()}>Print / save PDF</button>
          </div>
        </div>

        {contract.status === "draft" && isOwner && <div className="banner amber no-print">This contract is a draft. Edit the terms, then send it to @{contract.collaborator?.username} for signing.</div>}
        {contract.status === "draft" && !isOwner && <div className="banner amber no-print">@{contract.owner?.username} is still drafting this contract. You&apos;ll see it here once they send it.</div>}
        {contract.status === "cancelled" && <div className="banner cherry no-print">This contract was cancelled.</div>}
        {contract.status === "active" && <div className="banner green no-print">Both parties signed. Contract is active. Next step: owner funds the escrow.</div>}
        {contract.status === "completed" && <div className="banner green no-print">Contract completed — funds released, splits effective.</div>}
        {err && <div className="banner cherry no-print">{err}</div>}

        <div className="grid">
          <div>
            {doc && <ContractDocument doc={doc} onScrolledBottom={canSign ? () => setReadToBottom(true) : null} />}
            {canSign && <SignBar contract={contract} me={me} readToBottom={readToBottom} onSign={doSign} busy={busy} />}
          </div>
          <StatusSidebar contract={contract} me={me} onOpenEditor={() => setShowEditor(true)} onSend={doSend} onDecline={() => setShowDecline(true)} onCancel={doCancel} busy={busy} />
        </div>
      </div>

      {showEditor && <TermsEditor contract={contract} onClose={() => setShowEditor(false)} onSave={(updated) => { setShowEditor(false); setContract(updated); refresh(); }} />}
      {showDecline && <DeclineModal onClose={() => setShowDecline(false)} onSubmit={doDecline} busy={busy} />}
    </div>
  );
}
