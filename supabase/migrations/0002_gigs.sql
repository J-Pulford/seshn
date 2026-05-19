-- Seshn — gigs schema
-- Each row is one collaboration brief posted by a profile.

create type public.comp_type as enum ('paid', 'split', 'trade', 'unpaid');
create type public.gig_status as enum ('draft', 'open', 'closed');

create table public.gigs (
  id              uuid primary key default gen_random_uuid(),
  owner_id        uuid not null references public.profiles(id) on delete cascade,
  title           text not null check (char_length(title) between 4 and 140),
  description     text default '' check (char_length(description) <= 4000),
  role            text not null,
  genres          text[] default '{}'::text[],
  comp            public.comp_type not null default 'paid',
  pay_amount      numeric(12, 2),
  pay_currency    text default 'USD',
  deadline        date,
  location        text default 'Remote',
  status          public.gig_status not null default 'open',
  boosted_until   timestamptz,
  created_at      timestamptz default now(),
  updated_at      timestamptz default now()
);

create index gigs_owner_idx       on public.gigs (owner_id);
create index gigs_status_idx      on public.gigs (status);
create index gigs_role_idx        on public.gigs (role);
create index gigs_genres_idx      on public.gigs using gin (genres);
create index gigs_created_at_idx  on public.gigs (created_at desc);
create index gigs_boosted_idx     on public.gigs (boosted_until desc nulls last) where boosted_until > now();

-- Reuse the updated_at trigger function from 0001_profiles.sql
create trigger gigs_set_updated_at
  before update on public.gigs
  for each row execute function public.tg_set_updated_at();

-- Row-level security: open gigs are public-read; drafts only visible to owner; all writes restricted to owner.
alter table public.gigs enable row level security;

create policy "Open gigs visible to everyone"
  on public.gigs for select
  using (status = 'open' or owner_id = auth.uid());

create policy "Authenticated users can post their own gigs"
  on public.gigs for insert
  with check (auth.uid() = owner_id);

create policy "Owners can update their own gigs"
  on public.gigs for update
  using (auth.uid() = owner_id)
  with check (auth.uid() = owner_id);

create policy "Owners can delete their own gigs"
  on public.gigs for delete
  using (auth.uid() = owner_id);
