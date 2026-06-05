// Server-only escrow money operations, shared by the owner-initiated routes
// (/api/stripe/escrow/*) and the cron sweep (/api/cron/escrow-sweep). Both the
// transfer and the refund are idempotency-keyed per escrow, and every status
// write is guarded on the expected prior status, so re-running a sweep or
// racing a manual action can never double-pay or double-refund.
import type Stripe from "stripe";
import type { SupabaseClient } from "@supabase/supabase-js";

export interface EscrowRow {
  id: string;
  contract_id: string;
  status: string;
  amount_cents: number;
  platform_fee_cents: number;
  currency: string;
  stripe_payment_intent_id: string | null;
  stripe_transfer_id: string | null;
}

// Release: transfer (amount − platform fee) to the collaborator's connected
// account, flip the escrow to released, and complete the contract. `actorId` is
// the owner for a manual approval, null for the auto-release cron.
export async function releaseEscrow(
  admin: SupabaseClient,
  stripe: Stripe,
  escrow: EscrowRow,
  collaboratorAccountId: string,
  actorId: string | null,
  trigger: "owner_approved" | "auto_release",
): Promise<{ released: boolean; transferId?: string }> {
  if (escrow.status !== "funded" && escrow.status !== "delivered") return { released: false };

  const transferAmount = Math.max(0, escrow.amount_cents - escrow.platform_fee_cents);
  const transfer = await stripe.transfers.create(
    {
      amount: transferAmount,
      currency: String(escrow.currency).toLowerCase(),
      destination: collaboratorAccountId,
      transfer_group: `escrow_${escrow.id}`,
      metadata: { kind: "escrow_release", escrow_id: escrow.id, contract_id: escrow.contract_id, trigger },
    },
    { idempotencyKey: `escrow_release_${escrow.id}` },
  );

  // Only the call that actually flips funded/delivered → released does the
  // bookkeeping; a racing caller sees no matching row and bails (the transfer
  // was the same idempotent object, so no extra money moved).
  const { data: updated } = await admin
    .from("escrows")
    .update({ status: "released", released_at: new Date().toISOString(), stripe_transfer_id: transfer.id })
    .eq("id", escrow.id)
    .in("status", ["funded", "delivered"])
    .select("id")
    .maybeSingle();
  if (!updated) return { released: false, transferId: transfer.id };

  await admin.from("contracts").update({ status: "completed" }).eq("id", escrow.contract_id);
  await admin.from("audit_log").insert({
    actor_id: actorId,
    action: "escrow_released",
    target_table: "escrows",
    target_id: escrow.id,
    payload: {
      transfer_id: transfer.id,
      transfer_amount_cents: transferAmount,
      platform_fee_cents: escrow.platform_fee_cents,
      currency: escrow.currency,
      trigger,
    },
  });
  return { released: true, transferId: transfer.id };
}

// Refund: return the held funds to the owner via the original PaymentIntent,
// flip the escrow to refunded, and cancel the contract. Used when a funded deal
// passes its delivery deadline with nothing delivered.
export async function refundEscrow(
  admin: SupabaseClient,
  stripe: Stripe,
  escrow: EscrowRow,
  actorId: string | null,
  trigger: "deadline_missed" | "manual",
): Promise<{ refunded: boolean }> {
  if (escrow.status !== "funded") return { refunded: false };
  if (!escrow.stripe_payment_intent_id) return { refunded: false };

  await stripe.refunds.create(
    { payment_intent: escrow.stripe_payment_intent_id, metadata: { kind: "escrow_refund", escrow_id: escrow.id, trigger } },
    { idempotencyKey: `escrow_refund_${escrow.id}` },
  );

  const { data: updated } = await admin
    .from("escrows")
    .update({ status: "refunded" })
    .eq("id", escrow.id)
    .eq("status", "funded")
    .select("id")
    .maybeSingle();
  if (!updated) return { refunded: false };

  await admin.from("contracts").update({ status: "cancelled" }).eq("id", escrow.contract_id);
  await admin.from("audit_log").insert({
    actor_id: actorId,
    action: "escrow_refunded",
    target_table: "escrows",
    target_id: escrow.id,
    payload: { trigger },
  });
  return { refunded: true };
}
