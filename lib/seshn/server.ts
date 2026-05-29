import { createClient, type SupabaseClient } from "@supabase/supabase-js";
import { SUPABASE_URL, SUPABASE_ANON_KEY } from "./config";

// Server-side Supabase client for SSR data fetching on PUBLIC pages (the
// landing page, public profile/gig views). Anonymous, no session persistence —
// it reads only what RLS exposes to the anon role. User-scoped data stays in
// client components using the browser client (hybrid model; see
// docs/NEXTJS-MIGRATION.md).
export function getServerClient(): SupabaseClient {
  return createClient(SUPABASE_URL, SUPABASE_ANON_KEY, {
    auth: { persistSession: false, autoRefreshToken: false },
  });
}
