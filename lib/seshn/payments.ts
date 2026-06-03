// Client-side payments helpers. These call the server routes under
// /api/stripe/* (the Stripe secret key never touches the browser). Because the
// app uses localStorage-based Supabase auth, we forward the access token as a
// Bearer header so the server can identify the caller.
import { getBrowserClient } from "./client";

async function authHeaders(): Promise<Record<string, string>> {
  const { data } = await getBrowserClient().auth.getSession();
  const token = data.session?.access_token;
  if (!token) throw new Error("Not signed in");
  return { Authorization: "Bearer " + token };
}

// Kick off (or resume) Stripe Connect onboarding, then redirect to Stripe's
// hosted flow. The user returns to /settings?stripe=return.
export async function startPayoutOnboarding(): Promise<void> {
  const res = await fetch("/api/stripe/connect", { method: "POST", headers: await authHeaders() });
  const json = await res.json().catch(() => ({}));
  if (!res.ok) throw new Error(json.error || "Couldn't start payout setup.");
  if (!json.url) throw new Error("Stripe didn't return an onboarding link.");
  window.location.href = json.url;
}

export interface PayoutStatus {
  configured: boolean;     // is Stripe set up on the server at all
  connected?: boolean;     // does this user have a Connect account
  status?: "pending" | "verified" | "restricted";
  payouts_enabled?: boolean;
  charges_enabled?: boolean;
  details_submitted?: boolean;
}

export async function getPayoutStatus(): Promise<PayoutStatus> {
  try {
    const res = await fetch("/api/stripe/connect/status", { headers: await authHeaders() });
    if (!res.ok) return { configured: false };
    return (await res.json()) as PayoutStatus;
  } catch {
    return { configured: false };
  }
}
