// Server-only Stripe + privileged-Supabase helpers. Import ONLY from route
// handlers (app/api/**), never from client components.
import Stripe from "stripe";
import { createClient, type SupabaseClient, type User } from "@supabase/supabase-js";
import { SUPABASE_URL, SUPABASE_ANON_KEY } from "@/lib/seshn/config";
import { STRIPE_SECRET_KEY } from "./config";

let _stripe: Stripe | null = null;

export function getStripe(): Stripe {
  if (!STRIPE_SECRET_KEY) throw new Error("Stripe is not configured");
  if (!_stripe) _stripe = new Stripe(STRIPE_SECRET_KEY);
  return _stripe;
}

// Service-role Supabase client — bypasses RLS. Used by webhooks and routes that
// must write locked-down columns (e.g. profiles.stripe_account_id, 0018) or
// react to Stripe events with no user session. Server-only.
export function getAdminClient(): SupabaseClient {
  const key = process.env.SUPABASE_SERVICE_ROLE_KEY;
  if (!key) throw new Error("SUPABASE_SERVICE_ROLE_KEY is not configured");
  return createClient(SUPABASE_URL, key, { auth: { persistSession: false, autoRefreshToken: false } });
}

// The app uses localStorage-based Supabase auth (not cookies), so server routes
// can't read a session from cookies. The client sends its access token as a
// Bearer header; we verify it here and return the user.
export async function userFromRequest(req: Request): Promise<User | null> {
  const header = req.headers.get("authorization") || "";
  const token = header.startsWith("Bearer ") ? header.slice(7) : "";
  if (!token) return null;
  const sb = createClient(SUPABASE_URL, SUPABASE_ANON_KEY, { auth: { persistSession: false, autoRefreshToken: false } });
  const { data, error } = await sb.auth.getUser(token);
  if (error) return null;
  return data.user;
}
