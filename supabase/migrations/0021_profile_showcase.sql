-- Seshn — richer profiles: showcase links, photo gallery, availability.
--
-- Adds three owner-editable, public-readable columns to profiles:
--   • social_links — { spotify, soundcloud, youtube, instagram, facebook, twitter }
--     as URLs; the profile shows only the platforms that have a link. Replaces
--     the OAuth "connected accounts" UX with plain link inputs.
--   • gallery      — ordered array of { url, caption? } photos (max 12).
--   • credits      — discography / "worked with": array of
--     { title, role, year?, link? } (max 30). The credibility signal that
--     comparable platforms (SoundBetter) lead with, minus the reviews.
--   • availability — optional working-status signal (open / selective / booked).
--
-- profiles is column-locked (0018): clients may read/write only granted columns.
-- So we extend the SELECT/INSERT/UPDATE grants to cover the new columns. Grants
-- are additive, so this layers on top of 0018 without re-revoking.
--
-- Idempotent.

alter table public.profiles
  add column if not exists social_links jsonb not null default '{}'::jsonb,
  add column if not exists gallery      jsonb not null default '[]'::jsonb,
  add column if not exists credits      jsonb not null default '[]'::jsonb,
  add column if not exists availability text;

-- Light integrity guards (added only if missing so the file is re-runnable).
do $$ begin
  if not exists (select 1 from pg_constraint where conname = 'profiles_social_links_obj') then
    alter table public.profiles
      add constraint profiles_social_links_obj check (jsonb_typeof(social_links) = 'object');
  end if;
  if not exists (select 1 from pg_constraint where conname = 'profiles_gallery_arr') then
    alter table public.profiles
      add constraint profiles_gallery_arr
      check (jsonb_typeof(gallery) = 'array' and jsonb_array_length(gallery) <= 12);
  end if;
  if not exists (select 1 from pg_constraint where conname = 'profiles_credits_arr') then
    alter table public.profiles
      add constraint profiles_credits_arr
      check (jsonb_typeof(credits) = 'array' and jsonb_array_length(credits) <= 30);
  end if;
  if not exists (select 1 from pg_constraint where conname = 'profiles_availability_chk') then
    alter table public.profiles
      add constraint profiles_availability_chk
      check (availability is null or availability in ('open', 'selective', 'booked'));
  end if;
end $$;

-- Extend the column-level grants from 0018 to the new columns.
grant select (social_links, gallery, credits, availability) on public.profiles to anon, authenticated;
grant insert (social_links, gallery, credits, availability) on public.profiles to authenticated;
grant update (social_links, gallery, credits, availability) on public.profiles to authenticated;
