import { NextResponse } from "next/server";

export const runtime = "nodejs";

// GET /api/stripe/health — booleans only, never values. A safe way to confirm
// which payments env vars the *running* deployment actually sees, so a missing
// or unredeployed variable is a 5-second check instead of a guess.
function modeOf(key: string): "live" | "test" | null {
  if (key.startsWith("sk_live_") || key.startsWith("rk_live_")) return "live";
  if (key.startsWith("sk_test_") || key.startsWith("rk_test_")) return "test";
  return null;
}

export function GET() {
  const secret = process.env.STRIPE_SECRET_KEY || "";
  const pub = process.env.NEXT_PUBLIC_STRIPE_PUBLISHABLE_KEY || "";
  return NextResponse.json({
    stripe_secret: !!secret,
    publishable: !!pub,
    webhook_secret: !!process.env.STRIPE_WEBHOOK_SECRET,
    service_role: !!process.env.SUPABASE_SERVICE_ROLE_KEY,
    secret_mode: modeOf(secret),
    publishable_mode: pub.startsWith("pk_live_") ? "live" : pub.startsWith("pk_test_") ? "test" : null,
    // A mismatch here (e.g. live secret + test publishable) breaks Checkout.
    mode_match: !!secret && !!pub && modeOf(secret) === (pub.startsWith("pk_live_") ? "live" : pub.startsWith("pk_test_") ? "test" : null),
  });
}
