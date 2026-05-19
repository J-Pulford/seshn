-- Seshn — profile cover photo
-- Cover image is stored in the existing 'avatars' storage bucket under
-- avatars/{user_id}/cover-<ts>.<ext>. The existing storage policies already
-- scope writes to the user's own folder, so no new policies are needed.

alter table public.profiles
  add column if not exists cover_url text default '';
