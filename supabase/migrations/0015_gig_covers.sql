-- Seshn — gig cover photos
-- Owners can optionally upload a custom cover image when posting a
-- gig. When cover_url is empty/null the UI falls back to the
-- algorithmic AlbumArt component (seeded by gig id/title), so
-- existing gigs without a cover continue to render correctly.
--
-- Reuses the existing 'avatars' storage bucket and its RLS policies
-- (which scope writes to the user's own folder). Path convention:
--   avatars/{user_id}/gig-cover-<ts>.<ext>

alter table public.gigs
  add column if not exists cover_url text default '';
