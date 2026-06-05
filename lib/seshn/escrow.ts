// Escrow data layer (client). Reads the escrow for a contract under the 0012
// participant RLS, and drives the three member-facing transitions:
//   - fund    → owner; hits /api/stripe/escrow/fund, redirects to Stripe Checkout
//   - deliver → collaborator; mark_delivered RPC (0028)
//   - release → owner; hits /api/stripe/escrow/release (Stripe transfer)
import { getBrowserClient } from "./client";

export type EscrowStatus =
  | "awaiting_funds"
  | "funded"
  | "delivered"
  | "released"
  | "refunded"
  | "disputed"
  | "cancelled";

export interface Escrow {
  id: string;
  contract_id: string;
  status: EscrowStatus;
  amount_cents: number;
  currency: string;
  platform_fee_cents: number;
  funded_at: string | null;
  delivered_at: string | null;
  released_at: string | null;
  auto_release_at: string | null;
  deadline_at: string | null;
  created_at: string;
}

const ESCROW_FIELDS =
  "id, contract_id, status, amount_cents, currency, platform_fee_cents, " +
  "funded_at, delivered_at, released_at, auto_release_at, deadline_at, created_at";

export async function getEscrowForContract(contractId: string): Promise<Escrow | null> {
  if (!contractId) return null;
  const res = await getBrowserClient()
    .from("escrows")
    .select(ESCROW_FIELDS)
    .eq("contract_id", contractId)
    .maybeSingle();
  if (res.error) {
    console.error("[seshn] getEscrowForContract error", res.error);
    return null;
  }
  return (res.data as unknown as Escrow) ?? null;
}

// Display-only breakdown of what each side sees. The authoritative split is
// computed server-side (computeCharge / PLATFORM_FEE_BPS); this mirrors the
// default 10% all-in fee for the funding summary. The owner pays the quoted fee;
// Seshn's 10% (which absorbs Stripe's processing) comes off the top of the
// collaborator's payout.
export interface FeeView {
  feeCents: number;
  platformFeeCents: number;
  netToCollaboratorCents: number;
}
export function feeView(feeCents: number, platformPct = 10): FeeView {
  const fee = Math.max(0, Math.round(feeCents || 0));
  const platformFeeCents = Math.round((fee * platformPct) / 100);
  return { feeCents: fee, platformFeeCents, netToCollaboratorCents: fee - platformFeeCents };
}

async function authHeaders(): Promise<Record<string, string>> {
  const { data } = await getBrowserClient().auth.getSession();
  const token = data.session?.access_token;
  if (!token) throw new Error("Not signed in");
  return { Authorization: "Bearer " + token, "Content-Type": "application/json" };
}

// Owner: start funding. Resolves to a Stripe Checkout URL the caller redirects to.
export async function startEscrowFunding(contractId: string): Promise<string> {
  const res = await fetch("/api/stripe/escrow/fund", {
    method: "POST",
    headers: await authHeaders(),
    body: JSON.stringify({ contractId }),
  });
  const json = await res.json().catch(() => ({}));
  if (!res.ok) throw new Error(json.error || "Couldn't start escrow funding.");
  if (!json.url) throw new Error("Stripe didn't return a checkout link.");
  return json.url as string;
}

// Collaborator: declare the work delivered. Starts the approval clock.
export async function markDelivered(escrowId: string, note?: string): Promise<void> {
  const res = await getBrowserClient().rpc("mark_delivered", {
    p_escrow_id: escrowId,
    p_note: note?.trim() || null,
  });
  if (res.error) throw res.error;
}

// Owner: approve and release the held funds to the collaborator.
export async function releaseEscrow(contractId: string): Promise<void> {
  const res = await fetch("/api/stripe/escrow/release", {
    method: "POST",
    headers: await authHeaders(),
    body: JSON.stringify({ contractId }),
  });
  const json = await res.json().catch(() => ({}));
  if (!res.ok) throw new Error(json.error || "Couldn't release the escrow.");
}
