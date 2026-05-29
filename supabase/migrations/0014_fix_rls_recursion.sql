-- Seshn — fix infinite recursion in gigs / applications RLS policies
--
-- 0008_gig_lifecycle introduced a "gigs visible to applicants" rule whose
-- subquery against public.applications interacted with 0003_applications'
-- "visible to gig owner" rule (subquery against public.gigs) to create a
-- circular RLS dependency:
--
--   gigs.SELECT          ──┐
--     id IN (SELECT gig_id FROM applications WHERE applicant_id = uid)
--                          │ (applications has its own SELECT policy…)
--   applications.SELECT  ──┤
--     gig_id IN (SELECT id FROM gigs WHERE owner_id = uid)
--                          │ (which sends us back to gigs.SELECT…)
--                          └─── ERROR: infinite recursion detected
--
-- The error surfaces whenever the planner has to expand both policies —
-- in practice, any INSERT...RETURNING on gigs (which Supabase's JS client
-- appends by default) or any cross-table join.
--
-- Fix: wrap each cross-table lookup in a SECURITY DEFINER helper. Inside
-- a security-definer function, RLS does not re-evaluate, so the cycle is
-- broken at the function boundary. The functions still use auth.uid()
-- so each caller only sees their own rows.

create or replace function public.my_application_gig_ids()
returns setof uuid
language sql stable security definer set search_path = public
as $$
  select gig_id from public.applications where applicant_id = auth.uid()
$$;

create or replace function public.my_owned_gig_ids()
returns setof uuid
language sql stable security definer set search_path = public
as $$
  select id from public.gigs where owner_id = auth.uid()
$$;

revoke all on function public.my_application_gig_ids() from public;
revoke all on function public.my_owned_gig_ids() from public;
grant execute on function public.my_application_gig_ids() to authenticated;
grant execute on function public.my_owned_gig_ids() to authenticated;

-- Re-create the two policies using the helpers.

drop policy if exists "Gigs visible to public, owner, or applicants" on public.gigs;
create policy "Gigs visible to public, owner, or applicants"
  on public.gigs for select
  using (
    status = 'open'
    or owner_id = auth.uid()
    or id in (select * from public.my_application_gig_ids())
  );

drop policy if exists "Applications visible to applicant or gig owner" on public.applications;
create policy "Applications visible to applicant or gig owner"
  on public.applications for select
  using (
    applicant_id = auth.uid()
    or gig_id in (select * from public.my_owned_gig_ids())
  );
