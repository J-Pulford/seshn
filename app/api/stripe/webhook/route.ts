import { NextResponse } from "next/server";
import type Stripe from "stripe";
import type { SupabaseClient } from "@supabase/supabase-js";
import { getStripe, getAdminClient } from "@/lib/stripe/server";
import { isStripeConfigured, STRIPE_WEBHOOK_SECRET } from "@/lib/stripe/config";

export const runtime = "nodejs";

// Mark an escrow funded exactly once. The `.eq("status", "awaiting_funds")`
// guard makes this idempotent across duplicate / retried Stripe events. Records
// the funding moment in audit_log when (and only when) it actually transitions.
async function markEscrowFunded(admin: SupabaseClient, escrowId: string, paymentIntentId: string | null) {
  const { data, error } = await admin
    .from("escrows")
    .update({ status: "funded", funded_at: new Date().toISOString(), stripe_payment_intent_id: paymentIntentId })
    .eq("id", escrowId)
    .eq("status", "awaiting_funds")
    .select("id, amount_cents, currency")
    .maybeSingle();
  if (error) throw error;
  if (!data) return; // already funded, duplicate event, nothing to do
  await admin.from("audit_log").insert({
    action: "escrow_funded",
    target_table: "escrows",
    target_id: escrowId,
    payload: { amount_cents: data.amount_cents, currency: data.currency, payment_intent_id: paymentIntentId },
  });
}

// Mark a verification application paid exactly once. Guarded on
// payment_status='unpaid' so duplicate/retried events are no-ops. Records the
// payment in audit_log only on the real transition.
async function markVerificationPaid(
  admin: SupabaseClient,
  applicationId: string,
  paymentIntentId: string | null,
  amountCents: number | null,
  currency: string | null,
) {
  const { data, error } = await admin
    .from("verification_applications")
    .update({
      payment_status: "paid",
      paid_at: new Date().toISOString(),
      stripe_payment_intent_id: paymentIntentId,
      amount_paid_cents: amountCents,
      currency: currency ? currency.toUpperCase() : null,
    })
    .eq("id", applicationId)
    .eq("payment_status", "unpaid")
    .select("id, user_id")
    .maybeSingle();
  if (error) throw error;
  if (!data) return; // already paid, duplicate event
  await admin.from("audit_log").insert({
    action: "verification_paid",
    target_table: "verification_applications",
    target_id: applicationId,
    payload: { user_id: data.user_id, amount_cents: amountCents, currency, payment_intent_id: paymentIntentId },
  });
}

// POST /api/stripe/webhook — Stripe event sink. Verify the signature against the
// raw body, then react. account.updated keeps payout-account status fresh;
// escrow events (payment_intent.succeeded, transfer.*) get handled when the
// escrow funding flow lands.
export async function POST(req: Request) {
  if (!isStripeConfigured() || !STRIPE_WEBHOOK_SECRET) {
    return NextResponse.json({ error: "not configured" }, { status: 503 });
  }
  const sig = req.headers.get("stripe-signature") || "";
  const raw = await req.text();

  let event: Stripe.Event;
  try {
    event = getStripe().webhooks.constructEvent(raw, sig, STRIPE_WEBHOOK_SECRET);
  } catch (e) {
    console.error("[stripe] webhook signature verification failed", e);
    return NextResponse.json({ error: "invalid signature" }, { status: 400 });
  }

  try {
    const admin = getAdminClient();
    switch (event.type) {
      case "account.updated": {
        const acct = event.data.object as Stripe.Account;
        const status = acct.payouts_enabled
          ? "verified"
          : acct.requirements?.disabled_reason
            ? "restricted"
            : "pending";
        await admin
          .from("profiles")
          .update({ stripe_account_status: status })
          .eq("stripe_account_id", acct.id);
        break;
      }
      // Escrow funding: the owner completed Stripe Checkout. Flip the escrow to
      // 'funded' so the collaborator can deliver. Guarded on awaiting_funds so a
      // re-delivered event can't double-process.
      case "checkout.session.completed": {
        const session = event.data.object as Stripe.Checkout.Session;
        const meta = session.metadata || {};
        if (meta.kind === "escrow_funding" && meta.escrow_id && session.payment_status === "paid") {
          const pi = typeof session.payment_intent === "string" ? session.payment_intent : session.payment_intent?.id || null;
          await markEscrowFunded(admin, meta.escrow_id, pi);
        } else if (meta.kind === "verification" && meta.application_id && session.payment_status === "paid") {
          const pi = typeof session.payment_intent === "string" ? session.payment_intent : session.payment_intent?.id || null;
          await markVerificationPaid(admin, meta.application_id, pi, session.amount_total ?? null, session.currency ?? null);
        }
        break;
      }
      // Belt-and-suspenders: if Checkout's event is missed but the PaymentIntent
      // carries our metadata, fund off that instead. markEscrowFunded is a no-op
      // once the escrow has left awaiting_funds.
      case "payment_intent.succeeded": {
        const pi = event.data.object as Stripe.PaymentIntent;
        const meta = pi.metadata || {};
        if (meta.kind === "escrow_funding" && meta.escrow_id) {
          await markEscrowFunded(admin, meta.escrow_id, pi.id);
        } else if (meta.kind === "verification" && meta.application_id) {
          await markVerificationPaid(admin, meta.application_id, pi.id, pi.amount ?? null, pi.currency ?? null);
        }
        break;
      }
      // TODO (escrow milestone): charge.refunded -> refund bookkeeping.
      default:
        break;
    }
  } catch (e) {
    console.error("[stripe] webhook handler error", e);
    return NextResponse.json({ error: "handler error" }, { status: 500 });
  }

  return NextResponse.json({ received: true });
}
