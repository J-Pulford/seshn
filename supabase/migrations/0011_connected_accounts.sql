-- Seshn — connected accounts (Spotify, SoundCloud, Instagram, YouTube)
-- One row per (user, provider). Stores only public-ish stats — we do NOT
-- persist access tokens. The token lives in browser memory just long enough
-- to fetch the user's public profile + headline stats, then we throw it
-- away. To refresh, the user reconnects (a single OAuth tap). This avoids
-- the operational pain of token storage / refresh and keeps the security
-- surface small.

create table public.connected_accounts (
  user_id      uuid not null references public.profiles(id) on delete cascade,
  provider     text not null check (provider in ('spotify', 'soundcloud', 'instagram', 'youtube')),
  external_id  text not null,
  display_name text,
  profile_url  text,
  stats        jsonb not null default '{}'::jsonb,
  connected_at timestamptz not null default now(),
  updated_at   timestamptz not null default now(),
  primary key (user_id, provider)
);

create index connected_accounts_user_idx on public.connected_accounts (user_id);

create trigger connected_accounts_set_updated_at
  before update on public.connected_accounts
  for each row execute function public.tg_set_updated_at();

-- RLS: connected accounts are part of the public profile signal — everyone
-- can read them. Writes are restricted to the owner.
alter table public.connected_accounts enable row level security;

create policy "Connected accounts are public-read"
  on public.connected_accounts for select
  using (true);

create policy "Users insert their own connected accounts"
  on public.connected_accounts for insert
  with check (user_id = auth.uid());

create policy "Users update their own connected accounts"
  on public.connected_accounts for update
  using (user_id = auth.uid())
  with check (user_id = auth.uid());

create policy "Users delete their own connected accounts"
  on public.connected_accounts for delete
  using (user_id = auth.uid());
