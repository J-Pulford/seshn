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

// Seshn's cut, in basis points (1000 = 10%).
export const PLATFORM_FEE_BPS = Number(process.env.PLATFORM_FEE_BPS || "1000");

// The one-time verification fee (the "Verified" badge review). Env-overridable
// so the price/currency can change without a deploy. Defaults to A$49.
export const VERIFICATION_FEE_CENTS = Math.max(0, Math.round(Number(process.env.VERIFICATION_FEE_CENTS || "4900")));
export const VERIFICATION_CURRENCY = (process.env.VERIFICATION_CURRENCY || "AUD").toUpperCase();

// Stripe processing-fee estimate. Seshn absorbs this out of its platform fee
// (so the client pays exactly the quoted rate and the collaborator keeps a
// predictable share), used here only to surface Seshn's net. Defaults to the
// standard 2.9% + 30¢.
const STRIPE_PCT_BPS = Number(process.env.STRIPE_PCT_BPS || "290");
const STRIPE_FIXED_CENTS = Number(process.env.STRIPE_FIXED_CENTS || "30");

export function isStripeConfigured(): boolean {
  return !!STRIPE_SECRET_KEY;
}

export interface ChargeBreakdown {
  feeCents: number;               // the agreed fee (what the client is quoted)
  amountCents: number;            // what the client is charged = the fee, no markup
  platformFeeCents: number;       // Seshn's cut, taken off the collaborator's payout
  netToCollaboratorCents: number; // what the collaborator receives on release
  stripeFeeCents: number;         // est. card processing fee, borne by Seshn
  platformNetCents: number;       // Seshn's net after absorbing the card fee
}

// Vendor-side fee model: the client pays exactly the agreed fee, and Seshn's
// platform fee is taken off the top of the collaborator's payout (they receive
// fee − platformFee on release). Seshn absorbs Stripe's processing fee out of
// its own cut — so the client always pays the clean quoted rate and the
// collaborator keeps a predictable (100 − fee%)%. This matches the contract
// template, which states the fee is "deducted from the payment to the
// Collaborator at the time of release."
export function computeCharge(feeCents: number, bps: number = PLATFORM_FEE_BPS): ChargeBreakdown {
  const fee = Math.max(0, Math.round(feeCents));
  const platformFeeCents = Math.round((fee * bps) / 10000);
  const netToCollaboratorCents = fee - platformFeeCents;
  const stripeFeeCents = Math.round((fee * STRIPE_PCT_BPS) / 10000) + STRIPE_FIXED_CENTS;
  const platformNetCents = platformFeeCents - stripeFeeCents;
  return { feeCents: fee, amountCents: fee, platformFeeCents, netToCollaboratorCents, stripeFeeCents, platformNetCents };
}
