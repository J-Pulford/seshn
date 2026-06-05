import { NextResponse } from "next/server";
import { getStripe, getAdminClient, userFromRequest } from "@/lib/stripe/server";
import { isStripeConfigured } from "@/lib/stripe/config";
import { rateLimit } from "@/lib/rate-limit";

export const runtime = "nodejs";

// GET /api/stripe/balance — the caller's live Stripe Connect balance + recent
// payouts, fetched on their connected account. Read-only; the secret key stays
// server-side. Returns { connected: false } when the user has no Stripe account
// yet, so the dashboard can fall back to its internal escrow figures.
export async function GET(req: Request) {
  if (!isStripeConfigured()) return NextResponse.json({ configured: false });
  const user = await userFromRequest(req);
  if (!user) return NextResponse.json({ error: "Not signed in" }, { status: 401 });

  // Two Stripe API calls per request; throttle per user.
  const rl = rateLimit(`stripe:balance:${user.id}`, 30, 60_000);
  if (!rl.ok) {
    return NextResponse.json(
      { error: "Too many requests — please wait a moment and try again." },
      { status: 429, headers: { "Retry-After": String(rl.retryAfter) } },
    );
  }

  try {
    const stripe = getStripe();
    const admin = getAdminClient();
    const { data: prof } = await admin
      .from("profiles")
      .select("stripe_account_id")
      .eq("id", user.id)
      .maybeSingle();

    const accountId = prof?.stripe_account_id;
    if (!accountId) return NextResponse.json({ configured: true, connected: false });

    const [balance, payouts] = await Promise.all([
      stripe.balance.retrieve({}, { stripeAccount: accountId }),
      stripe.payouts.list({ limit: 5 }, { stripeAccount: accountId }),
    ]);

    const mapAmounts = (list: { amount: number; currency: string }[]) =>
      list.map((b) => ({ amount_cents: b.amount, currency: b.currency.toUpperCase() }));

    return NextResponse.json({
      configured: true,
      connected: true,
      available: mapAmounts(balance.available),
      pending: mapAmounts(balance.pending),
      payouts: payouts.data.map((p) => ({
        id: p.id,
        amount_cents: p.amount,
        currency: p.currency.toUpperCase(),
        status: p.status,
        arrival_date: p.arrival_date,
        created: p.created,
      })),
    });
  } catch (e) {
    console.error("[stripe] balance error", e);
    return NextResponse.json({ error: (e as Error)?.message || "Stripe error" }, { status: 500 });
  }
}
