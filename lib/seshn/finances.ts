// Finances data layer for the in-app dashboard. Reads the member's own escrow /
// contract aggregates. The summary goes through the my_financial_summary()
// SECURITY DEFINER RPC (0023); the recent-activity list reads escrows directly
// under the participant RLS from 0012.
import { getBrowserClient } from "./client";
import { getUser } from "./profiles";
import type { CurrencyTotals, FinancialSummary, TransactionRow } from "./types";

const EMPTY: FinancialSummary = {
  authenticated: false,
  currencies: [],
  active_contracts: 0,
  completed_deals: 0,
  total_deals: 0,
};

export async function getFinancialSummary(): Promise<FinancialSummary> {
  const res = await getBrowserClient().rpc("my_financial_summary");
  if (res.error) {
    console.error("[seshn] getFinancialSummary error", res.error);
    return EMPTY;
  }
  return { ...EMPTY, ...(res.data as Partial<FinancialSummary>) };
}

// Pick the currency a member transacts in most, for the headline cards. The RPC
// already orders the array by activity, so the first row is the primary one.
export function primaryCurrency(summary: FinancialSummary): CurrencyTotals | null {
  return summary.currencies[0] ?? null;
}

export async function listRecentTransactions(limit = 20): Promise<TransactionRow[]> {
  const sb = getBrowserClient();
  const u = await getUser();
  if (!u) return [];
  const res = await sb
    .from("escrows")
    .select(
      "id, amount_cents, platform_fee_cents, currency, status, created_at, funded_at, released_at, " +
        "contract:contracts!inner(owner_id, collaborator_id, " +
        "gig:gigs(title), " +
        "owner:profiles!owner_id(username, display_name, avatar_url), " +
        "collaborator:profiles!collaborator_id(username, display_name, avatar_url))",
    )
    .order("created_at", { ascending: false })
    .limit(limit);
  if (res.error) {
    console.error("[seshn] listRecentTransactions error", res.error);
    return [];
  }
  type Party = { username: string; display_name: string; avatar_url: string };
  type Row = {
    id: string;
    amount_cents: number;
    platform_fee_cents: number;
    currency: string;
    status: string;
    created_at: string;
    funded_at: string | null;
    released_at: string | null;
    contract: {
      owner_id: string;
      collaborator_id: string;
      gig?: { title?: string } | null;
      owner?: Party | null;
      collaborator?: Party | null;
    } | null;
  };
  return ((res.data as unknown as Row[]) || []).map((r) => {
    const c = r.contract;
    const iAmCollaborator = c?.collaborator_id === u.id;
    const counterparty = iAmCollaborator ? c?.owner : c?.collaborator;
    return {
      id: r.id,
      amount_cents: r.amount_cents,
      platform_fee_cents: r.platform_fee_cents,
      currency: r.currency,
      status: r.status,
      created_at: r.created_at,
      funded_at: r.funded_at,
      released_at: r.released_at,
      role: iAmCollaborator ? "earning" : "spending",
      counterparty: counterparty ?? null,
      gig_title: c?.gig?.title ?? null,
    };
  });
}

// Format bigint cents to a localised currency string. Falls back gracefully for
// unknown codes.
export function formatMoney(cents: number, currency = "AUD"): string {
  const amount = (cents || 0) / 100;
  try {
    return new Intl.NumberFormat(undefined, {
      style: "currency",
      currency,
      minimumFractionDigits: 2,
      maximumFractionDigits: 2,
    }).format(amount);
  } catch {
    return `${amount.toFixed(2)} ${currency}`;
  }
}
