import { NextResponse } from "next/server";
import { getStripe, getAdminClient, userFromRequest } from "@/lib/stripe/server";
import { isStripeConfigured, VERIFICATION_FEE_CENTS, VERIFICATION_CURRENCY } from "@/lib/stripe/config";
import { rateLimit } from "@/lib/rate-limit";

export const runtime = "nodejs";

// POST /api/stripe/verification/checkout — the applicant pays the one-time
// verification fee for their most recent (pending, unpaid) application. Opens a
// Stripe Checkout session; the charge settles onto Seshn's platform balance
// (this is a platform fee, not an escrow hold). The webhook
// (checkout.session.completed / payment_intent.succeeded, kind=verification)
// stamps payment_status='paid', which puts the application into the review queue.
export async function POST(req: Request) {
  if (!isStripeConfigured()) {
    return NextResponse.json({ error: "Payments aren't set up yet." }, { status: 503 });
  }
  const user = await userFromRequest(req);
  if (!user) return NextResponse.json({ error: "Not signed in" }, { status: 401 });

  const rl = rateLimit(`stripe:verify:${user.id}`, 10, 60_000);
  if (!rl.ok) {
    return NextResponse.json(
      { error: "Too many requests, please wait a moment and try again." },
      { status: 429, headers: { "Retry-After": String(rl.retryAfter) } },
    );
  }

  if (!VERIFICATION_FEE_CENTS || VERIFICATION_FEE_CENTS < 100) {
    return NextResponse.json({ error: "Verification isn't open for payment right now." }, { status: 503 });
  }
  const currency = VERIFICATION_CURRENCY;
  if (!/^[A-Z]{3}$/.test(currency)) {
    return NextResponse.json({ error: "Verification currency is misconfigured." }, { status: 500 });
  }

  try {
    const stripe = getStripe();
    const admin = getAdminClient();

    // The application to pay for: the caller's most recent one. Authorize by
    // hand (service role bypasses RLS).
    const { data: app, error: aErr } = await admin
      .from("verification_applications")
      .select("id, user_id, status, payment_status")
      .eq("user_id", user.id)
      .order("created_at", { ascending: false })
      .limit(1)
      .maybeSingle();
    if (aErr) throw aErr;
    if (!app) {
      return NextResponse.json({ error: "Submit your application before paying.", code: "no_application" }, { status: 404 });
    }
    if (app.payment_status === "paid") {
      return NextResponse.json({ error: "This application is already paid.", code: "already_paid" }, { status: 409 });
    }
    if (app.status === "withdrawn") {
      return NextResponse.json({ error: "This application was withdrawn. Reapply to pay.", code: "withdrawn" }, { status: 409 });
    }

    const origin = new URL(req.url).origin;
    const meta = { kind: "verification", application_id: app.id as string, user_id: user.id };

    const session = await stripe.checkout.sessions.create({
      mode: "payment",
      customer_email: user.email || undefined,
      line_items: [
        {
          quantity: 1,
          price_data: {
            currency: currency.toLowerCase(),
            unit_amount: VERIFICATION_FEE_CENTS,
            product_data: {
              name: "Seshn verification",
              description: "One-time fee for the Verified badge review. Reviewed by hand; fee is non-refundable if not approved.",
            },
          },
        },
      ],
      payment_intent_data: { metadata: meta, description: `Seshn verification ${app.id}` },
      metadata: meta,
      success_url: `${origin}/verify?status=paid&session_id={CHECKOUT_SESSION_ID}`,
      cancel_url: `${origin}/verify?status=cancelled`,
    });

    return NextResponse.json({ url: session.url });
  } catch (e) {
    console.error("[stripe] verification checkout error", e);
    return NextResponse.json({ error: "Something went wrong. Please try again." }, { status: 500 });
  }
}
