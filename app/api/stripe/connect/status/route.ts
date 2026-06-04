import { NextResponse } from "next/server";
import { getStripe, getAdminClient, userFromRequest } from "@/lib/stripe/server";
import { isStripeConfigured } from "@/lib/stripe/config";

export const runtime = "nodejs";

// GET /api/stripe/connect/status — report the caller's payout-account state and
// sync it back onto the profile (stripe_account_status / stripe_country).
export async function GET(req: Request) {
  if (!isStripeConfigured()) return NextResponse.json({ configured: false });
  const user = await userFromRequest(req);
  if (!user) return NextResponse.json({ error: "Not signed in" }, { status: 401 });

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

    const acct = await stripe.accounts.retrieve(accountId);
    const status = acct.payouts_enabled
      ? "verified"
      : acct.requirements?.disabled_reason
        ? "restricted"
        : "pending";
    await admin
      .from("profiles")
      .update({ stripe_account_status: status, stripe_country: acct.country?.toUpperCase() || null })
      .eq("id", user.id);

    return NextResponse.json({
      configured: true,
      connected: true,
      status,
      payouts_enabled: acct.payouts_enabled,
      charges_enabled: acct.charges_enabled,
      details_submitted: acct.details_submitted,
    });
  } catch (e) {
    console.error("[stripe] connect status error", e);
    return NextResponse.json({ error: (e as Error)?.message || "Stripe error" }, { status: 500 });
  }
}
