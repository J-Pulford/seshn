-- Seshn — expose is_staff so the "Seshn team" badge can render on profiles.
--
-- is_staff (0032) drives the help board's staff replies and moderation, but was
-- deliberately kept out of the client-readable columns. To show an official
-- badge on a staff member's public profile we need to read it. The value is
-- safe to expose: it only marks someone as official Seshn staff (the whole point
-- of the badge). Policies still use current_user_is_staff() (SECURITY DEFINER)
-- for authorization, so this grant doesn't affect any access checks.
grant select (is_staff) on public.profiles to anon, authenticated;
