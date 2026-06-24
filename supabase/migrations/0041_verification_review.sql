-- Seshn — staff decisions on verification applications.
--
-- The review queue lives in 0039. Approving an application has to flip the
-- applicant's profiles.is_verified, but the profiles UPDATE policy is self-only
-- (0001) — a staff member can't write another user's row directly. This
-- SECURITY DEFINER function is the controlled path: it gates on
-- current_user_is_staff() (0032), stamps the decision on the application, and
-- awards/revokes the badge to match — all in one transaction. Mirrors the
-- "kept out of broad grants, mutated only through a vetted function" approach
-- used for is_staff.
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

  -- Keep the badge in lockstep with the decision. A 'pending' reset leaves the
  -- current badge untouched (re-queue without revoking).
  if decision = 'approved' then
    update public.profiles set is_verified = true  where id = app.user_id;
  elsif decision = 'rejected' then
    update public.profiles set is_verified = false where id = app.user_id;
  end if;

  return app;
end;
$$;

revoke all on function public.review_verification_application(uuid, text, text) from public, anon;
grant execute on function public.review_verification_application(uuid, text, text) to authenticated;
