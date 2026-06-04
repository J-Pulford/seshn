// Stripe + payments configuration. All secrets are read from env and accessed
// lazily (never at module load), so the app builds/deploys fine before Stripe
// is set up. Set these in Vercel to activate:
//   STRIPE_SECRET_KEY                  (server)  sk_test_… / sk_live_…
//   NEXT_PUBLIC_STRIPE_PUBLISHABLE_KEY (client)  pk_test_… / pk_live_…
//   STRIPE_WEBHOOK_SECRET              (server)  whsec_…  (from the webhook endpoint)
//   SUPABASE_SERVICE_ROLE_KEY          (server)  for privileged writes from webhooks/routes
//   PLATFORM_FEE_BPS                   (optional) basis points, default 500 = 5%

export const STRIPE_SECRET_KEY = process.env.STRIPE_SECRET_KEY || "";
export const STRIPE_WEBHOOK_SECRET = process.env.STRIPE_WEBHOOK_SECRET || "";
export const STRIPE_PUBLISHABLE_KEY = process.env.NEXT_PUBLIC_STRIPE_PUBLISHABLE_KEY || "";

// Seshn's cut, in basis points (500 = 5%).
export const PLATFORM_FEE_BPS = Number(process.env.PLATFORM_FEE_BPS || "500");
// Stripe processing-fee estimate, used to gross up the charge so the payer
// covers it (so Seshn nets the full platform fee). Tune per your Stripe
// pricing / region. Defaults to standard 2.9% + 30¢.
const STRIPE_PCT_BPS = Number(process.env.STRIPE_PCT_BPS || "290");
const STRIPE_FIXED_CENTS = Number(process.env.STRIPE_FIXED_CENTS || "30");

export function isStripeConfigured(): boolean {
  return !!STRIPE_SECRET_KEY;
}

export interface ChargeBreakdown {
  feeCents: number;        // what the collaborator is quoted / receives in full
  platformFeeCents: number; // Seshn's cut
  stripeFeeCents: number;  // estimated card processing fee (payer-covered)
  amountCents: number;     // total the client is charged
}

// "Payer covers all": gross up so the client pays fee + platform fee + card
// fee, the collaborator receives the full fee, and Seshn nets the platform fee.
// amount = (fee + platformFee + fixed) / (1 - pct)
export function computeCharge(feeCents: number, bps: number = PLATFORM_FEE_BPS): ChargeBreakdown {
  const fee = Math.max(0, Math.round(feeCents));
  const platformFeeCents = Math.round((fee * bps) / 10000);
  const pct = STRIPE_PCT_BPS / 10000;
  const net = fee + platformFeeCents;
  const amountCents = Math.ceil((net + STRIPE_FIXED_CENTS) / (1 - pct));
  const stripeFeeCents = amountCents - net;
  return { feeCents: fee, platformFeeCents, stripeFeeCents, amountCents };
}
