-- Seshn — profiles schema
-- Each row is one user's public profile. id matches auth.users.id 1:1.

create table public.profiles (
  id            uuid primary key references auth.users(id) on delete cascade,
  username      text unique not null check (username ~ '^[a-z0-9_.-]{2,32}$'),
  display_name  text not null check (char_length(display_name) between 1 and 80),
  bio           text default '' check (char_length(bio) <= 2000),
  location      text default '',
  pronouns      text default '',
  roles         text[] default '{}'::text[],
  genres        text[] default '{}'::text[],
  is_pro        boolean default false,
  avatar_url    text default '',
  created_at    timestamptz default now(),
  updated_at    timestamptz default now()
);

create index profiles_username_idx on public.profiles (lower(username));
create index profiles_roles_idx on public.profiles using gin (roles);
create index profiles_genres_idx on public.profiles using gin (genres);

-- Keep updated_at fresh
create or replace function public.tg_set_updated_at()
returns trigger language plpgsql as $$
begin
  new.updated_at = now();
  return new;
end;
$$;

create trigger profiles_set_updated_at
  before update on public.profiles
  for each row execute function public.tg_set_updated_at();

-- Row-level security: profiles are public-read, owner-write
alter table public.profiles enable row level security;

create policy "Profiles are viewable by everyone"
  on public.profiles for select
  using (true);

create policy "Users can insert their own profile"
  on public.profiles for insert
  with check (auth.uid() = id);

create policy "Users can update their own profile"
  on public.profiles for update
  using (auth.uid() = id)
  with check (auth.uid() = id);

create policy "Users can delete their own profile"
  on public.profiles for delete
  using (auth.uid() = id);
