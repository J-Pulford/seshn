-- Seshn — profile verification (the one-time, vetted "Verified" badge).
--
-- Replaces the old paid "Pro" concept. Verification is awarded only after a
-- reviewed application (handled manually by staff for now; payment is a later
-- step). is_verified is distinct from is_staff (the "Seshn team" badge) and from
-- the legacy is_pro flag.

-- Awarded flag. Like is_staff (0032/0038), kept OUT of the broad column grants
-- and read best-effort by the client, so a profile read never depends on it.
alter table public.profiles add column if not exists is_verified boolean not null default false;
grant select (is_verified) on public.profiles to anon, authenticated;

-- ──── Applications ─────────────────────────────────────────────────
-- One row per submission. Details are a jsonb blob because the form will evolve
-- while we tune what "deeply vetted" requires. status drives the review queue.
create table if not exists public.verification_applications (
  id            uuid primary key default gen_random_uuid(),
  user_id       uuid not null references public.profiles(id) on delete cascade,
  status        text not null default 'pending' check (status in ('pending', 'approved', 'rejected', 'withdrawn')),
  details       jsonb not null default '{}'::jsonb,
  review_notes  text,
  reviewed_by   uuid references public.profiles(id) on delete set null,
  reviewed_at   timestamptz,
  created_at    timestamptz not null default now(),
  updated_at    timestamptz not null default now()
);

create index if not exists verification_apps_user_idx   on public.verification_applications (user_id, created_at desc);
create index if not exists verification_apps_status_idx on public.verification_applications (status, created_at desc)
  where status = 'pending';

drop trigger if exists verification_apps_set_updated_at on public.verification_applications;
create trigger verification_apps_set_updated_at
  before update on public.verification_applications
  for each row execute function public.tg_set_updated_at();

-- ──── RLS ──────────────────────────────────────────────────────────
alter table public.verification_applications enable row level security;

-- Applicants submit their own; reviews/decisions are staff-only.
drop policy if exists "Users submit their own verification application" on public.verification_applications;
create policy "Users submit their own verification application"
  on public.verification_applications for insert to authenticated
  with check (user_id = auth.uid());

drop policy if exists "Users see their own verification application" on public.verification_applications;
create policy "Users see their own verification application"
  on public.verification_applications for select to authenticated
  using (user_id = auth.uid() or public.current_user_is_staff());

-- Withdraw (and staff review) happen via UPDATE; applicant may withdraw a pending
-- one, staff may update any.
drop policy if exists "Applicant or staff can update verification application" on public.verification_applications;
create policy "Applicant or staff can update verification application"
  on public.verification_applications for update to authenticated
  using (user_id = auth.uid() or public.current_user_is_staff())
  with check (user_id = auth.uid() or public.current_user_is_staff());
