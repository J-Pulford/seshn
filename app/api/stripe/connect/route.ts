import { NextResponse } from "next/server";
import { getStripe, getAdminClient, userFromRequest } from "@/lib/stripe/server";
import { isStripeConfigured } from "@/lib/stripe/config";
import { rateLimit } from "@/lib/rate-limit";

export const runtime = "nodejs";

// POST /api/stripe/connect — create (or reuse) the caller's Stripe Connect
// Express account and return a hosted onboarding link. Stripe runs KYC/identity
// and payout setup; we just store the account id + status on the profile.
export async function POST(req: Request) {
  if (!isStripeConfigured()) {
    return NextResponse.json({ error: "Payments aren't set up yet." }, { status: 503 });
  }
  const user = await userFromRequest(req);
  if (!user) return NextResponse.json({ error: "Not signed in" }, { status: 401 });

  // Onboarding-link creation hits Stripe's API; throttle per user to blunt abuse.
  const rl = rateLimit(`stripe:connect:${user.id}`, 10, 60_000);
  if (!rl.ok) {
    return NextResponse.json(
      { error: "Too many requests, please wait a moment and try again." },
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

    let accountId = prof?.stripe_account_id || null;
    if (!accountId) {
      const account = await stripe.accounts.create({
        type: "express",
        email: user.email || undefined,
        capabilities: { transfers: { requested: true } },
        business_profile: { product_description: "Music collaboration services on Seshn" },
        metadata: { seshn_user_id: user.id },
      });
      accountId = account.id;
      await admin
        .from("profiles")
        .update({ stripe_account_id: accountId, stripe_account_status: "pending" })
        .eq("id", user.id);
    }

    const origin = new URL(req.url).origin;
    const link = await stripe.accountLinks.create({
      account: accountId,
      refresh_url: `${origin}/settings?stripe=refresh`,
      return_url: `${origin}/settings?stripe=return`,
      type: "account_onboarding",
    });
    return NextResponse.json({ url: link.url });
  } catch (e) {
    console.error("[stripe] connect error", e);
    return NextResponse.json({ error: "Something went wrong. Please try again." }, { status: 500 });
  }
}
