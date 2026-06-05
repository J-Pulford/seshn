"use client";

import { useEffect, useState } from "react";
import { useParams, useSearchParams } from "next/navigation";
import type { User } from "@supabase/supabase-js";
import Nav from "@/components/Nav";
import { requireProfile } from "@/lib/seshn/auth";
import { getContract } from "@/lib/seshn/contracts";
import { getEscrowForContract, feeView, startEscrowFunding, type Escrow } from "@/lib/seshn/escrow";
import { formatMoney } from "@/lib/seshn/finances";
import { toast } from "@/lib/seshn/toast";
import type { Contract } from "@/lib/seshn/types";
import "../contract.css";
import "./fund.css";

interface Terms {
  fee_cents?: number;
  currency?: string;
  approval_window_days?: number;
  deliverable?: { description?: string; deliver_by?: string };
}

function fmtDate(iso?: string | null) {
  if (!iso) return "—";
  try {
    return new Date(iso).toLocaleDateString("en-AU", { day: "numeric", month: "short", year: "numeric" });
  } catch {
    return iso;
  }
}

export default function FundEscrowPage() {
  const params = useParams();
  const search = useSearchParams();
  const contractId = (Array.isArray(params.id) ? params.id[0] : params.id) || "";
  const justFunded = search.get("status") === "funded";
  const cancelled = search.get("status") === "cancelled";

  const [me, setMe] = useState<User | null | undefined>(undefined);
  const [contract, setContract] = useState<Contract | null | undefined>(undefined);
  const [escrow, setEscrow] = useState<Escrow | null>(null);
  const [paying, setPaying] = useState(false);
  const [err, setErr] = useState("");

  useEffect(() => {
    (async () => {
      const r = await requireProfile({ allowAnon: true });
      if (!r) return;
      if (!r.user) { setMe(null); return; }
      setMe(r.user);
      if (!contractId) { setContract(null); return; }
      try {
        setContract(await getContract(contractId));
        setEscrow(await getEscrowForContract(contractId));
      } catch (e) {
        setErr((e as Error)?.message || "Could not load contract.");
        setContract(null);
      }
    })();
  }, [contractId]);

  // After returning from Stripe, the webhook flips the escrow to 'funded'
  // asynchronously. Poll a few times so the success state reflects reality.
  useEffect(() => {
    if (!justFunded || !contractId) return;
    let tries = 0;
    const t = setInterval(async () => {
      tries++;
      const e = await getEscrowForContract(contractId);
      if (e) setEscrow(e);
      if ((e && e.status !== "awaiting_funds") || tries >= 6) clearInterval(t);
    }, 2000);
    return () => clearInterval(t);
  }, [justFunded, contractId]);

  async function pay() {
    if (!contractId) return;
    setPaying(true); setErr("");
    try {
      const url = await startEscrowFunding(contractId);
      window.location.href = url;
    } catch (e) {
      setErr((e as Error)?.message || "Couldn't start the payment.");
      setPaying(false);
    }
  }

  if (me === undefined || contract === undefined) {
    return <div className="contract-page"><Nav active={null} /><div className="page"><div className="t-meta">Loading…</div></div></div>;
  }
  if (me === null) {
    return (
      <div className="contract-page">
        <Nav active={null} showPostButton={false} />
        <div className="page" style={{ textAlign: "center", paddingTop: 60 }}>
          <h1 style={{ fontFamily: "var(--font-display)", fontWeight: 700, fontSize: 26 }}>Sign in to fund this escrow</h1>
          <a href={"/auth?next=" + encodeURIComponent("/contract/" + contractId + "/fund")} className="btn primary lg" style={{ marginTop: 16 }}>Sign in</a>
        </div>
      </div>
    );
  }
  if (!contract) {
    return (
      <div className="contract-page">
        <Nav active={null} />
        <div className="page" style={{ textAlign: "center", paddingTop: 60 }}>
          <h1 style={{ fontFamily: "var(--font-display)", fontWeight: 700, fontSize: 24 }}>Contract not found</h1>
          <p style={{ color: "var(--ink-3)", marginTop: 8 }}>{err || "Either it doesn't exist or you're not a party to it."}</p>
          <a href="/contracts" className="btn" style={{ marginTop: 14 }}>Back to contracts</a>
        </div>
      </div>
    );
  }

  const isOwner = contract.owner_id === me.id;
  const t = (contract.terms || {}) as Terms;
  const currency = t.currency || "AUD";
  const view = feeView(t.fee_cents || 0);
  const collabHandle = contract.collaborator?.username;
  const backLink = <a className="fund-back" href={`/contract/${encodeURIComponent(contractId)}`}>← Back to contract</a>;

  // The escrow is already funded (or further along) — show its state, no re-pay.
  const fundedAlready = escrow && escrow.status !== "awaiting_funds";

  if (!isOwner) {
    return (
      <div className="contract-page fund-page">
        <Nav active={null} />
        <div className="page fund-narrow">
          {backLink}
          <div className="card fund-state">
            <div className="fund-state-icon">🔒</div>
            <h1>Only the owner funds this escrow</h1>
            <p>@{contract.owner?.username} funds the agreed fee. Once it&apos;s held in escrow, you can start delivering — and you&apos;ll be paid on approval.</p>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="contract-page fund-page">
      <Nav active={null} />
      <div className="page fund-narrow">
        {backLink}

        {justFunded || fundedAlready ? (
          <div className="card fund-state">
            <div className="fund-state-icon">✅</div>
            <h1>{escrow && escrow.status === "released" ? "Released" : "Funds held in escrow"}</h1>
            {escrow && escrow.status === "awaiting_funds" ? (
              <p>We&apos;re confirming your payment with Stripe — this usually takes a few seconds. You can safely leave this page; the contract updates automatically.</p>
            ) : escrow && escrow.status === "released" ? (
              <p>This escrow has been released to @{collabHandle}. The contract is complete.</p>
            ) : (
              <p>
                {formatMoney(view.feeCents, currency)} is now held safely in escrow. @{collabHandle} can start the work and will receive{" "}
                {formatMoney(view.netToCollaboratorCents, currency)} when you approve the delivery.
              </p>
            )}
            <a href={`/contract/${encodeURIComponent(contractId)}`} className="btn primary lg" style={{ marginTop: 18 }}>Go to contract</a>
          </div>
        ) : contract.status !== "active" ? (
          <div className="card fund-state">
            <div className="fund-state-icon">⏳</div>
            <h1>Not ready to fund yet</h1>
            <p>This contract is <strong>{contract.status}</strong>. Both parties need to sign before you can fund the escrow.</p>
            <a href={`/contract/${encodeURIComponent(contractId)}`} className="btn lg" style={{ marginTop: 18 }}>Back to contract</a>
          </div>
        ) : (
          <>
            <header className="fund-head">
              <span className="t-eyebrow">Secure checkout</span>
              <h1>Fund the escrow</h1>
              <p>You&apos;re paying the agreed fee for your collaboration with @{collabHandle}. We hold it in escrow and only release it to them once you approve the delivery.</p>
            </header>

            {cancelled && <div className="banner amber">Payment cancelled — nothing was charged. You can try again whenever you&apos;re ready.</div>}
            {err && <div className="banner cherry">{err}</div>}

            <div className="fund-grid">
              <div className="card fund-summary">
                <div className="t-eyebrow" style={{ marginBottom: 12 }}>Order summary</div>

                <div className="fund-line">
                  <span>Collaboration</span>
                  <strong>{contract.gig?.title || "Untitled"}</strong>
                </div>
                <div className="fund-line">
                  <span>Collaborator</span>
                  <strong>@{collabHandle}</strong>
                </div>
                {t.deliverable?.deliver_by && (
                  <div className="fund-line">
                    <span>Deliver by</span>
                    <strong>{fmtDate(t.deliverable.deliver_by)}</strong>
                  </div>
                )}
                {t.approval_window_days != null && (
                  <div className="fund-line">
                    <span>Approval window</span>
                    <strong>{t.approval_window_days} days</strong>
                  </div>
                )}

                <div className="fund-divider" />

                <div className="fund-line fund-total">
                  <span>You pay today</span>
                  <strong>{formatMoney(view.feeCents, currency)}</strong>
                </div>
                <div className="fund-subline">
                  <span>Collaborator receives on release</span>
                  <span>{formatMoney(view.netToCollaboratorCents, currency)}</span>
                </div>
                <div className="fund-subline">
                  <span>Seshn fee (10%, Stripe processing included)</span>
                  <span>{formatMoney(view.platformFeeCents, currency)}</span>
                </div>

                <button className="btn primary lg fund-pay" onClick={pay} disabled={paying}>
                  {paying ? "Redirecting to secure payment…" : `Pay ${formatMoney(view.feeCents, currency)} & fund escrow`}
                </button>
                <p className="fund-secure">🔒 Payments are processed by Stripe. Your card details never touch Seshn&apos;s servers.</p>
              </div>

              <aside className="card fund-protect">
                <div className="t-eyebrow" style={{ marginBottom: 10 }}>How escrow protects you</div>
                <ul className="fund-steps">
                  <li><strong>You fund now.</strong> The money is held by Stripe — not paid out yet.</li>
                  <li><strong>They deliver.</strong> @{collabHandle} does the work knowing the funds are secured.</li>
                  <li><strong>You approve.</strong> Release the funds when you&apos;re happy — or they auto-release after the approval window, or you open a dispute.</li>
                </ul>
                <div className="fund-note">No card fee on top — the flat 10% covers Stripe processing. Nothing leaves escrow without your approval or the agreed window.</div>
              </aside>
            </div>
          </>
        )}
      </div>
    </div>
  );
}
