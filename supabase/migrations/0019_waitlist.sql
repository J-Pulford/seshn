-- Seshn — pre-launch waitlist capture.
--
-- A public, insert-only table so the marketing landing can collect emails
-- (with an optional role + location) before/around launch. Anyone — signed
-- out included — may INSERT a row; nobody but service_role may read, update,
-- or delete. The founder reads the list from the Supabase dashboard (the SQL
-- editor / table view run as service_role, which bypasses RLS).
--
-- Idempotent: guarded so it is safe to re-run.

create table if not exists public.waitlist (
  id          uuid primary key default gen_random_uuid(),
  email       text not null,
  role        text,
  location    text,
  source      text not null default 'landing',
  created_at  timestamptz not null default now(),
  -- Stored lowercase (the client normalises) so the unique index is
  -- case-insensitive without a functional index.
  constraint waitlist_email_lower  check (email = lower(email)),
  constraint waitlist_email_format check (
    email ~ '^[^@[:space:]]+@[^@[:space:]]+\.[^@[:space:]]+$'
    and char_length(email) <= 254
  ),
  constraint waitlist_role_len     check (role is null or char_length(role) <= 40),
  constraint waitlist_location_len check (location is null or char_length(location) <= 120),
  constraint waitlist_source_len   check (char_length(source) <= 40)
);

-- One signup per email.
create unique index if not exists waitlist_email_key on public.waitlist (email);
create index if not exists waitlist_created_idx on public.waitlist (created_at desc);

-- ──── Row-level security: insert-only for the public ────────────────
alter table public.waitlist enable row level security;

-- Clients may write only these columns; id/created_at use their defaults.
revoke all on public.waitlist from anon, authenticated;
grant insert (email, role, location, source) on public.waitlist to anon, authenticated;

drop policy if exists "Anyone can join the waitlist" on public.waitlist;
create policy "Anyone can join the waitlist"
  on public.waitlist for insert to anon, authenticated
  with check (true);
-- No SELECT/UPDATE/DELETE policies => denied for anon + authenticated. The list
-- is readable only via service_role (dashboard), so emails never leak to clients.
