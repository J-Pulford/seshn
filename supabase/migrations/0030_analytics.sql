-- Seshn — profile & listing analytics
-- Lightweight view tracking so members can see what's happening with their
-- account: who's looking at their profile and their gigs, and how views turn
-- into applications. Two append-only event tables, written only through
-- SECURITY DEFINER RPCs (callable by anon + authenticated so public profile/gig
-- pages can record a view), and owner-scoped aggregation RPCs that power the
-- /analytics dashboard. profile_views is in the realtime publication so the
-- dashboard's "today" counter ticks live.
--
-- Privacy: raw rows are readable only by the owner (RLS). Self-views are never
-- recorded. Authenticated viewers are de-duplicated to one view per
-- profile/gig per day via partial unique indexes; anonymous views aren't
-- de-duped (no identity to key on) and count toward reach.

-- ──── Event tables ─────────────────────────────────────────────────
create table public.profile_views (
  id          bigserial primary key,
  profile_id  uuid not null references public.profiles(id) on delete cascade,
  viewer_id   uuid references public.profiles(id) on delete set null,
  day         date not null default current_date,
  created_at  timestamptz not null default now()
);
create index profile_views_profile_day_idx on public.profile_views (profile_id, day);
create unique index profile_views_unique_auth_idx
  on public.profile_views (profile_id, viewer_id, day) where viewer_id is not null;

create table public.gig_views (
  id          bigserial primary key,
  gig_id      uuid not null references public.gigs(id) on delete cascade,
  owner_id    uuid not null references public.profiles(id) on delete cascade,  -- denormalized for owner RLS + fast rollups
  viewer_id   uuid references public.profiles(id) on delete set null,
  day         date not null default current_date,
  created_at  timestamptz not null default now()
);
create index gig_views_gig_day_idx on public.gig_views (gig_id, day);
create index gig_views_owner_day_idx on public.gig_views (owner_id, day);
create unique index gig_views_unique_auth_idx
  on public.gig_views (gig_id, viewer_id, day) where viewer_id is not null;

-- ──── RLS — owner-read only; writes go through the RPCs below ───────
alter table public.profile_views enable row level security;
alter table public.gig_views     enable row level security;

create policy "Owners read their own profile views"
  on public.profile_views for select using (profile_id = auth.uid());
create policy "Owners read their own gig views"
  on public.gig_views for select using (owner_id = auth.uid());

-- ──── Record RPCs (anon + authenticated) ───────────────────────────
create or replace function public.record_profile_view(p_profile_id uuid)
returns void language plpgsql security definer set search_path = public as $$
declare v uuid := auth.uid();
begin
  if p_profile_id is null then return; end if;
  if not exists (select 1 from public.profiles where id = p_profile_id) then return; end if;
  if v is not null and v = p_profile_id then return; end if;  -- never count self-views
  insert into public.profile_views (profile_id, viewer_id)
  values (p_profile_id, v)
  on conflict do nothing;  -- one/day per authenticated viewer (partial unique)
end; $$;
revoke all on function public.record_profile_view(uuid) from public;
grant execute on function public.record_profile_view(uuid) to anon, authenticated;

create or replace function public.record_gig_view(p_gig_id uuid)
returns void language plpgsql security definer set search_path = public as $$
declare v uuid := auth.uid(); g_owner uuid;
begin
  if p_gig_id is null then return; end if;
  select owner_id into g_owner from public.gigs where id = p_gig_id;
  if g_owner is null then return; end if;
  if v is not null and v = g_owner then return; end if;  -- never count the owner's own views
  insert into public.gig_views (gig_id, owner_id, viewer_id)
  values (p_gig_id, g_owner, v)
  on conflict do nothing;
end; $$;
revoke all on function public.record_gig_view(uuid) from public;
grant execute on function public.record_gig_view(uuid) to anon, authenticated;

-- ──── Read RPCs (owner-scoped via auth.uid()) ──────────────────────
-- Profile analytics: totals, current vs previous window (for the trend arrow),
-- a zero-filled daily series for the sparkline, plus headline funnel counts.
create or replace function public.my_profile_analytics(p_days int default 30)
returns jsonb language plpgsql security definer set search_path = public as $$
declare
  uid    uuid := auth.uid();
  d      int  := greatest(1, least(coalesce(p_days, 30), 365));
  wstart date := current_date - (d - 1);
  pstart date := current_date - (2 * d - 1);
  result jsonb;
begin
  if uid is null then raise exception 'Not authenticated' using errcode = '42501'; end if;

  with win as (
    select day, count(*)::int c
      from public.profile_views
     where profile_id = uid and day >= wstart
     group by day
  ),
  series as (
    select gs::date as day, coalesce(w.c, 0) as views
      from generate_series(wstart, current_date, interval '1 day') gs
      left join win w on w.day = gs::date
  )
  select jsonb_build_object(
    'window_days',           d,
    'views_total',           (select count(*) from public.profile_views where profile_id = uid),
    'views_window',          (select coalesce(sum(c), 0) from win),
    'views_prev_window',     (select count(*) from public.profile_views where profile_id = uid and day >= pstart and day < wstart),
    'views_today',           (select count(*) from public.profile_views where profile_id = uid and day = current_date),
    'unique_viewers_window', (select count(distinct viewer_id) from public.profile_views where profile_id = uid and day >= wstart and viewer_id is not null),
    'series',                (select coalesce(jsonb_agg(jsonb_build_object('day', day, 'views', views) order by day), '[]'::jsonb) from series),
    'applications_received', (select count(*) from public.applications a join public.gigs g on g.id = a.gig_id where g.owner_id = uid),
    'gigs_open',             (select count(*) from public.gigs where owner_id = uid and status = 'open')
  ) into result;

  return result;
end; $$;
revoke all on function public.my_profile_analytics(int) from public;
grant execute on function public.my_profile_analytics(int) to authenticated;

-- Listing analytics: one row per gig the caller owns, with views, applications,
-- and the view→application conversion rate.
create or replace function public.my_listing_analytics(p_days int default 30)
returns jsonb language plpgsql security definer set search_path = public as $$
declare
  uid    uuid := auth.uid();
  d      int  := greatest(1, least(coalesce(p_days, 30), 365));
  wstart date := current_date - (d - 1);
  result jsonb;
begin
  if uid is null then raise exception 'Not authenticated' using errcode = '42501'; end if;

  select coalesce(jsonb_agg(jsonb_build_object(
           'gig_id',         g.id,
           'title',          g.title,
           'role',           g.role,
           'status',         g.status,
           'created_at',     g.created_at,
           'views_total',    coalesce(vt.total, 0),
           'views_window',   coalesce(vw.win, 0),
           'applications',   coalesce(ap.total, 0),
           'accepted',       coalesce(ap.accepted, 0),
           'conversion_pct', case when coalesce(vt.total, 0) > 0
                                  then round(100.0 * coalesce(ap.total, 0) / vt.total, 1)
                                  else 0 end
         ) order by coalesce(vw.win, 0) desc, g.created_at desc), '[]'::jsonb)
    into result
    from public.gigs g
    left join (select gig_id, count(*)::int total from public.gig_views group by gig_id) vt on vt.gig_id = g.id
    left join (select gig_id, count(*)::int win from public.gig_views where day >= wstart group by gig_id) vw on vw.gig_id = g.id
    left join (select gig_id, count(*)::int total, count(*) filter (where status = 'accepted')::int accepted
                 from public.applications group by gig_id) ap on ap.gig_id = g.id
   where g.owner_id = uid;

  return result;
end; $$;
revoke all on function public.my_listing_analytics(int) from public;
grant execute on function public.my_listing_analytics(int) to authenticated;

-- ──── Realtime — live "profile views today" counter ────────────────
alter publication supabase_realtime add table public.profile_views;
