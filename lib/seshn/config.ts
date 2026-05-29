// Supabase connection config. The anon key is a public, RLS-protected client
// key (it already ships in the legacy browser bundle), so a hardcoded fallback
// is safe and lets the app build/deploy before env vars are configured. Set
// NEXT_PUBLIC_SUPABASE_* in Vercel to override.
export const SUPABASE_URL =
  process.env.NEXT_PUBLIC_SUPABASE_URL ?? "https://qatauoaqbplgsikzzxak.supabase.co";

export const SUPABASE_ANON_KEY =
  process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY ??
  "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InFhdGF1b2FxYnBsZ3Npa3p6eGFrIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NzkwMzM1OTMsImV4cCI6MjA5NDYwOTU5M30.95QE3GsG6HA3X3LNICqtwz46YrZ4bKHl9BqkH95smLw";
