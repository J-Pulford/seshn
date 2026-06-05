-- notification_prefs is a private setting, but 0018 lumped it into the public
-- column grant — so with the "profiles are viewable by everyone" RLS policy
-- (0001), ANY visitor (even anon) could read a user's notification settings.
--
-- Lock it down to match how the other private columns are handled (0018): drop
-- it from the public grant and expose the caller's own prefs via a
-- SECURITY DEFINER getter scoped to auth.uid(). Writes are unaffected — the
-- owner-only UPDATE grant from 0010/0018 still applies.
--
-- Idempotent.

revoke select (notification_prefs) on public.profiles from anon, authenticated;

create or replace function public.get_my_notification_prefs()
returns jsonb
language sql
security definer
set search_path = public
as $$
  select coalesce(notification_prefs, '{}'::jsonb)
  from public.profiles
  where id = auth.uid();
$$;

revoke all on function public.get_my_notification_prefs() from public, anon;
grant execute on function public.get_my_notification_prefs() to authenticated;
