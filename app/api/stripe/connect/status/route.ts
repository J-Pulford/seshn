import { NextResponse } from "next/server";
import { getStripe, getAdminClient, userFromRequest, isMissingAccountError } from "@/lib/stripe/server";
import { isStripeConfigured } from "@/lib/stripe/config";
import { rateLimit } from "@/lib/rate-limit";

export const runtime = "nodejs";

// GET /api/stripe/connect/status — report the caller's payout-account state and
// sync it back onto the profile (stripe_account_status / stripe_country).
export async function GET(req: Request) {
  if (!isStripeConfigured()) return NextResponse.json({ configured: false });
  const user = await userFromRequest(req);
  if (!user) return NextResponse.json({ error: "Not signed in" }, { status: 401 });

  // Each call retrieves the account from Stripe; throttle per user.
  const rl = rateLimit(`stripe:connect-status:${user.id}`, 30, 60_000);
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

    const accountId = prof?.stripe_account_id;
    if (!accountId) return NextResponse.json({ configured: true, connected: false });

    let acct;
    try {
      acct = await stripe.accounts.retrieve(accountId);
    } catch (e) {
      // The saved account doesn't exist under the current key (key rotation or
      // a test/live swap). Clear it so the user can connect fresh, and report
      // not-connected instead of a 500 that the UI would show as "coming soon".
      if (isMissingAccountError(e)) {
        await admin
          .from("profiles")
          .update({ stripe_account_id: null, stripe_account_status: null })
          .eq("id", user.id);
        return NextResponse.json({ configured: true, connected: false, reset: true });
      }
      throw e;
    }
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
    return NextResponse.json({ error: "Something went wrong. Please try again." }, { status: 500 });
  }
}
