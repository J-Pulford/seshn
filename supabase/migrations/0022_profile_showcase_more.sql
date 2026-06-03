-- Seshn — profile depth, round 2: featured audio, skills, influences,
-- languages, services, and a public stats RPC.
--
-- Adds more owner-editable, public-readable columns to profiles:
--   • featured    — array of { url, title? } embeds (Spotify/SoundCloud/YouTube)
--                   rendered inline as players. Max 6.
--   • skills      — free-text tags (e.g. "Pro Tools", "Analog mixing", gear).
--   • influences  — "sounds like" artist tags.
--   • languages   — languages the person works in.
--   • services    — array of { title, price?, unit?, description? } offered
--                   (informational now; "book" wires to Stripe later). Max 12.
--
-- Plus public_profile_stats(uuid): a SECURITY DEFINER count so a profile can
-- show "gigs posted" + "collaborations" to ANYONE, even though contracts are
-- RLS-restricted to their participants (a viewer can't read someone else's
-- contracts directly, so the count is exposed via this definer function only).
--
-- profiles is column-locked (0018); grants are extended to the new columns.
-- Idempotent.

alter table public.profiles
  add column if not exists featured   jsonb  not null default '[]'::jsonb,
  add column if not exists skills      text[] not null default '{}'::text[],
  add column if not exists influences  text[] not null default '{}'::text[],
  add column if not exists languages   text[] not null default '{}'::text[],
  add column if not exists services    jsonb  not null default '[]'::jsonb;

do $$ begin
  if not exists (select 1 from pg_constraint where conname = 'profiles_featured_arr') then
    alter table public.profiles
      add constraint profiles_featured_arr
      check (jsonb_typeof(featured) = 'array' and jsonb_array_length(featured) <= 6);
  end if;
  if not exists (select 1 from pg_constraint where conname = 'profiles_services_arr') then
    alter table public.profiles
      add constraint profiles_services_arr
      check (jsonb_typeof(services) = 'array' and jsonb_array_length(services) <= 12);
  end if;
end $$;

grant select (featured, skills, influences, languages, services) on public.profiles to anon, authenticated;
grant insert (featured, skills, influences, languages, services) on public.profiles to authenticated;
grant update (featured, skills, influences, languages, services) on public.profiles to authenticated;

-- ──── Public profile stats (definer count) ──────────────────────────────
create or replace function public.public_profile_stats(p_uid uuid)
returns jsonb
language sql
stable
security definer
set search_path = public
as $$
  select jsonb_build_object(
    'gigs_posted', (
      select count(*) from public.gigs
       where owner_id = p_uid and status <> 'draft'
    ),
    'collaborations', (
      select count(*) from public.contracts
       where fully_signed_at is not null
         and (owner_id = p_uid or collaborator_id = p_uid)
    )
  )
$$;

revoke all on function public.public_profile_stats(uuid) from public;
grant execute on function public.public_profile_stats(uuid) to anon, authenticated;
