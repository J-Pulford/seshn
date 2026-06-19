-- Seshn — security-lint hardening (Supabase advisor pass).
--
-- Clears the safe, no-app-impact warnings from the database advisor:
--   1. Pins search_path on the two functions that were missed.
--   2. Un-exposes trigger functions + the dev seeder from the REST API
--      (they're never meant to be called over /rest/v1/rpc).
--   3. Removes anon EXECUTE from the login-only action RPCs (they all check
--      auth.uid() internally, so anon never had any real access anyway).
--   4. Drops the broad "list everything" SELECT policy on the public avatars
--      bucket. Avatars stay publicly readable by URL (public bucket); this only
--      stops anonymous enumeration of the bucket. The app never lists storage.
--
-- Intentionally NOT touched (correct as-is / handled elsewhere):
--   - public_profile_stats / record_gig_view / record_profile_view keep anon
--     EXECUTE: logged-out visitors view public profile/gig pages and count views.
--   - The `authenticated` SECURITY DEFINER warnings on the action RPCs are by
--     design (those endpoints exist to be called by signed-in users).
--   - RLS helper fns (gig_owner, blocks_between, etc.) are used inside policies,
--     so they keep their grants; relocating them to a private schema is day-2.
--   - dm-attachments bucket: privatised in 0036 (needs matching app changes).
--   - waitlist "always true" INSERT: already locked down (insert-only, no SELECT
--     policy, column-restricted) — a false positive for our setup.

-- ── 1. Pin search_path on the two flagged functions ──────────────────────
alter function public.tg_set_updated_at() set search_path = '';
alter function public.notif_enabled(uuid, text) set search_path = '';

-- ── 2. Un-expose trigger functions + the seeder from the REST API ─────────
-- Triggers fire as the table owner regardless of the caller's EXECUTE grant,
-- so revoking is safe and just removes them from /rest/v1/rpc.
revoke execute on function public.tg_help_reply_after()              from public, anon, authenticated;
revoke execute on function public.tg_help_reply_before()             from public, anon, authenticated;
revoke execute on function public.tg_messages_touch_convo()          from public, anon, authenticated;
revoke execute on function public.tg_notify_application_received()    from public, anon, authenticated;
revoke execute on function public.tg_notify_application_status_change() from public, anon, authenticated;
revoke execute on function public.tg_notify_escrow()                 from public, anon, authenticated;
revoke execute on function public.tg_notify_meeting()                from public, anon, authenticated;
revoke execute on function public.tg_notify_message_received()       from public, anon, authenticated;
revoke execute on function public.tg_notify_review()                 from public, anon, authenticated;
revoke execute on function public.seed_help_threads()               from public, anon, authenticated;

-- ── 3. Drop anon EXECUTE from login-only action RPCs (keep authenticated) ──
-- Pattern: revoke from public + anon, then (re)grant to authenticated so the
-- desired end state holds no matter how the grant was originally made.
revoke execute on function public.cancel_contract(uuid, text)              from public, anon;
revoke execute on function public.decline_contract(uuid, text)             from public, anon;
revoke execute on function public.send_contract(uuid)                      from public, anon;
revoke execute on function public.sign_contract(uuid, text, text, text)    from public, anon;
revoke execute on function public.mark_delivered(uuid, text)               from public, anon;
revoke execute on function public.get_or_create_conversation(uuid)         from public, anon;
revoke execute on function public.delete_my_account()                      from public, anon;
revoke execute on function public.export_my_data()                         from public, anon;
revoke execute on function public.unlock_producer_badge()                  from public, anon;
revoke execute on function public.my_financial_summary()                   from public, anon;
revoke execute on function public.my_listing_analytics(integer)            from public, anon;
revoke execute on function public.my_profile_analytics(integer)            from public, anon;
revoke execute on function public.get_my_notification_prefs()              from public, anon;

grant execute on function public.cancel_contract(uuid, text)              to authenticated;
grant execute on function public.decline_contract(uuid, text)             to authenticated;
grant execute on function public.send_contract(uuid)                      to authenticated;
grant execute on function public.sign_contract(uuid, text, text, text)    to authenticated;
grant execute on function public.mark_delivered(uuid, text)               to authenticated;
grant execute on function public.get_or_create_conversation(uuid)         to authenticated;
grant execute on function public.delete_my_account()                      to authenticated;
grant execute on function public.export_my_data()                         to authenticated;
grant execute on function public.unlock_producer_badge()                  to authenticated;
grant execute on function public.my_financial_summary()                   to authenticated;
grant execute on function public.my_listing_analytics(integer)            to authenticated;
grant execute on function public.my_profile_analytics(integer)            to authenticated;
grant execute on function public.get_my_notification_prefs()              to authenticated;

-- ── 4. Stop anonymous listing of the (public) avatars bucket ──────────────
-- Public bucket => object URLs still resolve without this policy; dropping it
-- only removes the ability to enumerate the bucket via the storage API.
drop policy if exists "Avatars are publicly readable" on storage.objects;
