-- Seshn — public gig stats (social proof on listings)
-- Surfaces two aggregate counts per gig — how many have viewed it and how many
-- have applied — so they can be shown on the public listing page. The raw
-- gig_views / applications rows stay locked behind RLS (owner-only); this
-- SECURITY DEFINER function returns ONLY scalar counts, never identities, and is
-- callable by anon + authenticated so signed-out browsers can see the numbers
-- too. View counting itself is unchanged (record_gig_view, migration 0030):
-- self-views are dropped and authenticated viewers are de-duped one-per-day, so
-- 'views' is de-duplicated reach. 'applications' counts distinct applicants
-- (applications is unique on (gig_id, applicant_id)).

create or replace function public.gig_public_stats(p_gig_id uuid)
returns jsonb
language sql
security definer
stable
set search_path = public
as $$
  select jsonb_build_object(
    'views',        coalesce((select count(*) from public.gig_views   where gig_id = p_gig_id), 0),
    'applications', coalesce((select count(*) from public.applications where gig_id = p_gig_id), 0)
  );
$$;

revoke all on function public.gig_public_stats(uuid) from public;
grant execute on function public.gig_public_stats(uuid) to anon, authenticated;
