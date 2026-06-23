import { NextResponse } from "next/server";

export const runtime = "nodejs";

// GET /api/stripe/health — booleans only, never values. A safe way to confirm
// which payments env vars the *running* deployment actually sees, so a missing
// or unredeployed variable is a 5-second check instead of a guess.
export function GET() {
  return NextResponse.json({
    stripe_secret: !!process.env.STRIPE_SECRET_KEY,
    publishable: !!process.env.NEXT_PUBLIC_STRIPE_PUBLISHABLE_KEY,
    webhook_secret: !!process.env.STRIPE_WEBHOOK_SECRET,
    service_role: !!process.env.SUPABASE_SERVICE_ROLE_KEY,
  });
}
