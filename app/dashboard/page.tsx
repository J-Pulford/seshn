"use client";

import { useEffect, useState } from "react";
import Nav from "@/components/Nav";
import { getUser } from "@/lib/seshn/profiles";
import {
  getFinancialSummary,
  listRecentTransactions,
  primaryCurrency,
  formatMoney,
} from "@/lib/seshn/finances";
import { getPayoutStatus, getStripeBalance, startPayoutOnboarding, type PayoutStatus, type StripeBalance } from "@/lib/seshn/payments";
import { toast } from "@/lib/seshn/toast";
import type { FinancialSummary, TransactionRow } from "@/lib/seshn/types";
import "./dashboard.css";

function initials(name?: string) {
  const parts = String(name || "").trim().split(/\s+/).filter(Boolean);
  if (parts.length === 0) return "··";
  if (parts.length >= 2) return (parts[0][0] + parts[1][0]).toUpperCase();
  return parts[0].slice(0, 2).toUpperCase();
}

function fmtDate(iso?: string | null) {
  if (!iso) return "";
  return new Date(iso).toLocaleDateString(undefined, { month: "short", day: "numeric", year: "numeric" });
}

const STATUS_META: Record<string, { label: string; cls: string }> = {
  awaiting_funds: { label: "Awaiting funds", cls: "muted" },
  funded: { label: "In escrow", cls: "warn" },
  delivered: { label: "Delivered", cls: "warn" },
  released: { label: "Released", cls: "ok" },
  refunded: { label: "Refunded", cls: "muted" },
  disputed: { label: "Disputed", cls: "danger" },
  cancelled: { label: "Cancelled", cls: "muted" },
};

function PayoutBanner({ status, onStart, starting }: { status: PayoutStatus; onStart: () => void; starting: boolean }) {
  if (!status.configured) {
    return (
      <div className="dash-banner info">
        <div>
          <strong>Payouts aren&apos;t live yet.</strong>
          <span> Stripe isn&apos;t connected on this environment, so earnings figures below are illustrative until it&apos;s wired up.</span>
        </div>
      </div>
    );
  }
  if (status.connected && status.payouts_enabled) {
    return (
      <div className="dash-banner ok">
        <div>
          <strong>Payouts active.</strong>
          <span> Your Stripe account is verified and ready to receive earnings.</span>
        </div>
        <a className="btn sm" href="/settings">Manage</a>
      </div>
    );
  }
  return (
    <div className="dash-banner warn">
      <div>
        <strong>Finish setting up payouts.</strong>
        <span> Connect a payout account so you can get paid for collaborations.</span>
      </div>
      <button className="btn primary sm" onClick={onStart} disabled={starting}>
        {starting ? "Opening…" : status.connected ? "Continue setup →" : "Set up payouts →"}
      </button>
    </div>
  );
}

function StatCard({ label, value, sub, accent }: { label: string; value: string; sub?: string; accent?: boolean }) {
  return (
    <div className={"dash-stat" + (accent ? " accent" : "")}>
      <div className="dash-stat-label">{label}</div>
      <div className="dash-stat-value">{value}</div>
      {sub && <div className="dash-stat-sub">{sub}</div>}
    </div>
  );
}

const PAYOUT_STATUS_LABEL: Record<string, string> = {
  paid: "Paid",
  pending: "Pending",
  in_transit: "In transit",
  canceled: "Canceled",
  failed: "Failed",
};

// Live balance + recent payouts pulled straight from the user's Stripe Connect
// account (distinct from the internal escrow figures above, which reflect Seshn
// bookings). Hidden until the user has a connected account with something to show.
function StripeBalanceSection({ balance }: { balance: StripeBalance }) {
  if (!balance.connected) return null;
  const available = balance.available || [];
  const pending = balance.pending || [];
  const payouts = balance.payouts || [];
  if (!available.length && !pending.length && !payouts.length) return null;

  const fallbackCur = available[0]?.currency || pending[0]?.currency || "AUD";

  return (
    <section className="dash-activity" style={{ marginBottom: 18 }}>
      <div className="row between" style={{ marginBottom: 12 }}>
        <span className="t-eyebrow">Stripe balance</span>
        <a className="btn sm" href="/settings">Manage payouts</a>
      </div>
      <div className="dash-stats">
        {(available.length ? available : [{ amount_cents: 0, currency: fallbackCur }]).map((a) => (
          <StatCard key={"avail-" + a.currency} accent label="Available" value={formatMoney(a.amount_cents, a.currency)} sub="Settled — ready to pay out" />
        ))}
        {(pending.length ? pending : [{ amount_cents: 0, currency: fallbackCur }]).map((p) => (
          <StatCard key={"pend-" + p.currency} label="Pending" value={formatMoney(p.amount_cents, p.currency)} sub="Still clearing in Stripe" />
        ))}
      </div>
      {payouts.length > 0 && (
        <div className="dash-othercur" style={{ marginTop: 14 }}>
          <span className="t-eyebrow">Recent payouts</span>
          <div className="dash-othercur-rows">
            {payouts.map((p) => (
              <div key={p.id} className="dash-othercur-row">
                <span>{formatMoney(p.amount_cents, p.currency)}</span>
                <span className="dash-cur-code">{PAYOUT_STATUS_LABEL[p.status] || p.status}</span>
                <span>{p.status === "paid" ? "Arrived" : "Expected"} {fmtDate(new Date(p.arrival_date * 1000).toISOString())}</span>
              </div>
            ))}
          </div>
        </div>
      )}
    </section>
  );
}

export default function DashboardPage() {
  const [state, setState] = useState<"loading" | "ready" | "signedout" | "error">("loading");
  const [summary, setSummary] = useState<FinancialSummary | null>(null);
  const [txns, setTxns] = useState<TransactionRow[] | null>(null);
  const [payout, setPayout] = useState<PayoutStatus | null>(null);
  const [balance, setBalance] = useState<StripeBalance | null>(null);
  const [starting, setStarting] = useState(false);

  useEffect(() => {
    (async () => {
      try {
        const u = await getUser();
        if (!u) {
          window.location.href = "/auth?next=/dashboard";
          setState("signedout");
          return;
        }
        document.title = "Seshn — Finances";
        const [s, t, p, b] = await Promise.all([
          getFinancialSummary(),
          listRecentTransactions(20),
          getPayoutStatus().catch(() => ({ configured: false }) as PayoutStatus),
          getStripeBalance().catch(() => ({ configured: false }) as StripeBalance),
        ]);
        setSummary(s);
        setTxns(t);
        setPayout(p);
        setBalance(b);
        setState("ready");
      } catch (e) {
        console.error("[seshn] dashboard load error", e);
        setState("error");
      }
    })();
  }, []);

  async function onStartPayout() {
    setStarting(true);
    try {
      await startPayoutOnboarding();
    } catch (e) {
      toast.error((e as Error)?.message || "Couldn't start payout setup.");
      setStarting(false);
    }
  }

  const primary = summary ? primaryCurrency(summary) : null;
  const cur = primary?.currency || "AUD";
  const extraCurrencies = summary ? summary.currencies.slice(1) : [];

  return (
    <div className="dash-page">
      <Nav active={null} />
      <main className="dash-main">
        <header className="dash-head">
          <div>
            <div className="t-eyebrow">Your money</div>
            <h1 className="t-h1">Finances</h1>
          </div>
          <div style={{ display: "flex", gap: 8 }}>
            <a className="btn sm" href="/contracts">Contracts</a>
            <a className="btn sm" href="/settings">Payout settings</a>
          </div>
        </header>

        {state === "loading" && <div className="dash-loading">Loading your finances…</div>}
        {state === "error" && <div className="dash-loading err">Couldn&apos;t load your finances. Refresh to try again.</div>}

        {state === "ready" && summary && (
          <>
            {payout && <PayoutBanner status={payout} onStart={onStartPayout} starting={starting} />}

            {balance && <StripeBalanceSection balance={balance} />}

            <div className="dash-stats">
              <StatCard label="Earned" accent value={formatMoney(primary?.earned_cents || 0, cur)} sub="Released to you, after fees" />
              <StatCard label="In escrow" value={formatMoney(primary?.pending_cents || 0, cur)} sub="Funded, awaiting release" />
              <StatCard label="Spent" value={formatMoney(primary?.spent_cents || 0, cur)} sub="Paid out to collaborators" />
              <StatCard label="Platform fees" value={formatMoney(primary?.fees_cents || 0, cur)} sub="Seshn's 5% on paid bookings" />
            </div>

            <div className="dash-secondary">
              <div className="dash-mini">
                <span className="dash-mini-n">{summary.active_contracts}</span>
                <span className="dash-mini-l">{summary.active_contracts === 1 ? "active contract" : "active contracts"}</span>
              </div>
              <div className="dash-mini">
                <span className="dash-mini-n">{summary.completed_deals}</span>
                <span className="dash-mini-l">{summary.completed_deals === 1 ? "completed deal" : "completed deals"}</span>
              </div>
              <div className="dash-mini">
                <span className="dash-mini-n">{primary?.paid_deals || 0}</span>
                <span className="dash-mini-l">paid {(primary?.paid_deals || 0) === 1 ? "booking" : "bookings"}</span>
              </div>
            </div>

            {extraCurrencies.length > 0 && (
              <div className="dash-othercur">
                <span className="t-eyebrow">Other currencies</span>
                <div className="dash-othercur-rows">
                  {extraCurrencies.map((c) => (
                    <div key={c.currency} className="dash-othercur-row">
                      <span className="dash-cur-code">{c.currency}</span>
                      <span>Earned {formatMoney(c.earned_cents, c.currency)}</span>
                      <span>In escrow {formatMoney(c.pending_cents, c.currency)}</span>
                      <span>Spent {formatMoney(c.spent_cents, c.currency)}</span>
                    </div>
                  ))}
                </div>
              </div>
            )}

            <section className="dash-activity">
              <div className="row between" style={{ marginBottom: 12 }}>
                <span className="t-eyebrow">Recent activity</span>
              </div>
              {txns === null ? (
                <div className="dash-loading">Loading…</div>
              ) : txns.length === 0 ? (
                <div className="dash-empty">
                  <div className="dash-empty-title">No transactions yet</div>
                  <p>When you fund or get paid for a collaboration, it&apos;ll show up here. Earnings, escrow, and fees are all tracked automatically.</p>
                  <a className="btn primary sm" href="/browse">Find a collaborator →</a>
                </div>
              ) : (
                <div className="dash-txns">
                  {txns.map((t) => {
                    const meta = STATUS_META[t.status] || { label: t.status, cls: "muted" };
                    const net = t.role === "earning" ? t.amount_cents - t.platform_fee_cents : t.amount_cents;
                    return (
                      <div key={t.id} className="dash-txn">
                        <span className="dash-txn-av">
                          {t.counterparty?.avatar_url ? (
                            <img src={t.counterparty.avatar_url} alt="" />
                          ) : (
                            <span>{initials(t.counterparty?.display_name || t.counterparty?.username)}</span>
                          )}
                        </span>
                        <span className="dash-txn-main">
                          <span className="dash-txn-title">
                            {t.gig_title || (t.role === "earning" ? "Collaboration" : "Booking")}
                          </span>
                          <span className="dash-txn-sub">
                            {t.role === "earning" ? "From " : "To "}
                            {t.counterparty?.display_name || t.counterparty?.username || "a collaborator"}
                            {" · "}
                            {fmtDate(t.released_at || t.funded_at || t.created_at)}
                          </span>
                        </span>
                        <span className={"dash-txn-status " + meta.cls}>{meta.label}</span>
                        <span className={"dash-txn-amt " + (t.role === "earning" ? "in" : "out")}>
                          {t.role === "earning" ? "+" : "−"}
                          {formatMoney(net, t.currency)}
                        </span>
                      </div>
                    );
                  })}
                </div>
              )}
            </section>
          </>
        )}
      </main>
    </div>
  );
}
