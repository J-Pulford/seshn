import { NextResponse } from "next/server";
import type Stripe from "stripe";
import { getStripe, getAdminClient } from "@/lib/stripe/server";
import { isStripeConfigured, STRIPE_WEBHOOK_SECRET } from "@/lib/stripe/config";

export const runtime = "nodejs";

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
      // TODO (escrow milestone): payment_intent.succeeded -> mark escrow funded;
      // transfer.created / charge.refunded -> release / refund bookkeeping.
      default:
        break;
    }
  } catch (e) {
    console.error("[stripe] webhook handler error", e);
    return NextResponse.json({ error: "handler error" }, { status: 500 });
  }

  return NextResponse.json({ received: true });
}
