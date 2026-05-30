"use client";

import { createClient, type SupabaseClient } from "@supabase/supabase-js";
import { SUPABASE_URL, SUPABASE_ANON_KEY } from "./config";

// Browser Supabase client (singleton).
//
// Deliberately uses @supabase/supabase-js with the default localStorage-backed
// session — NOT cookie-based @supabase/ssr — so that ported Next.js pages and
// the still-live legacy public/app/*.html pages SHARE the same auth session
// during the incremental migration. A user signed in on a legacy page stays
// signed in when they hit a ported page, and vice versa. See
// docs/NEXTJS-MIGRATION.md (hybrid rendering decision).
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
