-- Seshn — security hardening: column-level lockdown on profiles.
--
-- profiles is public-read (so anyone can view a profile) and owner-writable
-- (0001). Row-level security alone can't restrict WHICH columns are read or
-- written, which left two real holes once 0012 added sensitive columns:
--
--   1. Privilege escalation / ban evasion: the owner-update policy let a user
--      write ANY column on their own row — including is_pro (self-grant the
--      verified badge) and restrictions (clear their own soft-ban, which
--      is_restricted() reads to gate posting/applying).
--   2. Info disclosure: public read exposed stripe_account_id /
--      stripe_account_status / stripe_country / restrictions /
--      deletion_requested_at to anyone.
--
-- Fix with COLUMN-level privileges (RLS still gates rows on top):
--   • Clients may READ only public-display columns.
--   • Clients may WRITE only their own editable display columns.
--   • is_pro, restrictions, stripe_*, deletion_requested_at, locale become
--     settable/readable only by service_role and SECURITY DEFINER functions
--     (is_restricted() etc. run as owner, so enforcement is unaffected).
--
-- Idempotent. After this runs, the app must select explicit columns (it does;
-- see lib/seshn/profiles.ts) — `select *` would hit a revoked column.

-- READ: public-safe columns only.
revoke select on public.profiles from anon, authenticated;
grant select (
  id, username, display_name, bio, location, pronouns,
  roles, genres, is_pro, avatar_url, cover_url, notification_prefs,
  created_at, updated_at
) on public.profiles to anon, authenticated;

-- INSERT (onboarding creates the row): only non-privileged columns. is_pro,
-- restrictions, stripe_*, etc. fall back to their column defaults.
revoke insert on public.profiles from anon, authenticated;
grant insert (
  id, username, display_name, bio, location, pronouns,
  roles, genres, avatar_url, cover_url, notification_prefs
) on public.profiles to authenticated;

-- UPDATE: only the owner's editable display fields. (RLS still restricts to
-- their own row; this restricts which columns even the owner may change.)
revoke update on public.profiles from anon, authenticated;
grant update (
  display_name, bio, location, pronouns,
  roles, genres, avatar_url, cover_url, notification_prefs
) on public.profiles to authenticated;
