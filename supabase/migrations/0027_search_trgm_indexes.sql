-- Search performance: trigram indexes for substring (ILIKE '%term%') search.
--
-- The app searches names/titles/locations with leading-wildcard ILIKE
-- (lib/seshn/profiles.ts, lib/seshn/gigs.ts). A normal B-tree index can only
-- accelerate left-anchored matches ('term%'); a leading wildcard forces Postgres
-- to scan every row. pg_trgm GIN indexes break text into 3-char chunks so the
-- planner can seek straight to candidate rows instead — the "don't read every
-- row" win. Substring matching behaviour is unchanged; only speed improves.
--
-- Idempotent.

create extension if not exists pg_trgm;

-- Profiles: people search by display name / handle / bio / location.
create index if not exists profiles_display_name_trgm
  on public.profiles using gin (display_name gin_trgm_ops);
create index if not exists profiles_username_trgm
  on public.profiles using gin (username gin_trgm_ops);
create index if not exists profiles_bio_trgm
  on public.profiles using gin (bio gin_trgm_ops);
create index if not exists profiles_location_trgm
  on public.profiles using gin (location gin_trgm_ops);

-- Gigs: search by title / location.
create index if not exists gigs_title_trgm
  on public.gigs using gin (title gin_trgm_ops);
create index if not exists gigs_location_trgm
  on public.gigs using gin (location gin_trgm_ops);
