-- Seshn — notify applicants of verification decisions.
--
-- When staff approve/reject a verification application the applicant should hear
-- about it (in-app bell + the generic email bridge), not discover it by chance.
-- Adds two notification kinds and wires the review function (0041) to drop a
-- notification on a decision. No new reference column is needed — the deep link
-- is just /verify, mapped in the email route + nav.

-- 1) Allow the new kinds. Re-state the full list (cumulative, mirrors 0037).
alter table public.notifications drop constraint if exists notifications_kind_check;
alter table public.notifications add constraint notifications_kind_check check (kind in (
  'application_received', 'application_accepted', 'application_rejected',
  'message_received',
  'meeting_proposed', 'meeting_updated', 'meeting_confirmed', 'meeting_declined', 'meeting_cancelled',
  'escrow_funded', 'escrow_delivered', 'escrow_released', 'escrow_refunded', 'escrow_disputed',
  'help_reply',
  'review_received',
  'contract_received',
  'verification_approved', 'verification_rejected'
));

-- 2) Re-create the review function with a notification on the decision. The body
-- is unchanged from 0041 except for the notify block before RETURN. Runs as the
-- function owner (SECURITY DEFINER), so it can insert into notifications (which
-- has no INSERT policy — all rows come from definer code). actor_id is left null
-- so the applicant isn't shown which staff member decided.
create or replace function public.review_verification_application(
  app_id   uuid,
  decision text,
  notes    text default null
) returns public.verification_applications
language plpgsql security definer set search_path = public as $$
declare
  app public.verification_applications;
begin
  if not public.current_user_is_staff() then
    raise exception 'Not authorized' using errcode = '42501';
  end if;
  if decision not in ('approved', 'rejected', 'pending') then
    raise exception 'Invalid decision: %', decision;
  end if;

  update public.verification_applications
     set status       = decision,
         review_notes = notes,
         reviewed_by  = auth.uid(),
         reviewed_at  = now()
   where id = app_id
   returning * into app;

  if app.id is null then
    raise exception 'Application not found: %', app_id;
  end if;

  if decision = 'approved' then
    update public.profiles set is_verified = true  where id = app.user_id;
  elsif decision = 'rejected' then
    update public.profiles set is_verified = false where id = app.user_id;
  end if;

  -- Tell the applicant (respecting their per-kind email/notification pref).
  if decision in ('approved', 'rejected')
     and public.notif_enabled(app.user_id, 'verification_' || decision) then
    insert into public.notifications (user_id, kind)
    values (app.user_id, 'verification_' || decision);
  end if;

  return app;
end;
$$;

revoke all on function public.review_verification_application(uuid, text, text) from public, anon;
grant execute on function public.review_verification_application(uuid, text, text) to authenticated;
