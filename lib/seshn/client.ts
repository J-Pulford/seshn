"use client";

import { createClient, type SupabaseClient } from "@supabase/supabase-js";
import { SUPABASE_URL, SUPABASE_ANON_KEY } from "./config";

// Browser Supabase client (singleton).
//
// Deliberately uses @supabase/supabase-js with the default localStorage-backed
// session — NOT cookie-based @supabase/ssr. The migration off the legacy
// prototype is complete, but cookie-based SSR auth remains a deliberate
// non-goal: the app is client-rendered behind requireProfile guards, public
// SSR pages read only anon-visible data. See docs/NEXTJS-MIGRATION.md
// (hybrid rendering decision).
let _client: SupabaseClient | null = null;

export function getBrowserClient(): SupabaseClient {
  if (_client) return _client;
  _client = createClient(SUPABASE_URL, SUPABASE_ANON_KEY, {
    auth: {
      persistSession: true,
      autoRefreshToken: true,
      detectSessionInUrl: true,
    },
  });
  return _client;
}
