-- Seshn — native audio uploads for the profile portfolio.
--
-- Lets members upload audio files (mp3/wav/…) to their portfolio alongside the
-- pasted Spotify/SoundCloud/YouTube embeds. Public bucket because portfolio
-- audio is meant to be heard by anyone viewing the profile; served via public
-- object URL. No broad SELECT policy, so the bucket can't be enumerated (same
-- pattern as the hardened avatars bucket). Owner-only write/delete, scoped to
-- their {uid}/ folder.
insert into storage.buckets (id, name, public)
values ('portfolio-audio', 'portfolio-audio', true)
on conflict (id) do nothing;

drop policy if exists "Users upload their own portfolio audio" on storage.objects;
create policy "Users upload their own portfolio audio"
  on storage.objects for insert to authenticated
  with check (
    bucket_id = 'portfolio-audio'
    and auth.uid()::text = (storage.foldername(name))[1]
  );

drop policy if exists "Users delete their own portfolio audio" on storage.objects;
create policy "Users delete their own portfolio audio"
  on storage.objects for delete to authenticated
  using (
    bucket_id = 'portfolio-audio'
    and auth.uid()::text = (storage.foldername(name))[1]
  );
