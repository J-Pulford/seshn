-- Seshn — make DM attachments actually private.
--
-- 0009 created the dm-attachments bucket as PUBLIC and stored a permanent
-- public URL on every message, relying only on an unguessable path. The broad
-- SELECT policy also allowed listing the whole bucket, so private DM files
-- (audio, contracts, PDFs) could be enumerated and downloaded by anyone.
--
-- This flips the bucket to private and scopes access to the two people in the
-- conversation. New uploads use a conversation-scoped path:
--     {conversation_id}/{uploader_uid}/{timestamp}-{filename}
-- and the app fetches short-lived signed URLs at render time (see messaging.ts).
--
-- NOTE: requires the matching app change in the same release. Legacy rows that
-- stored a full public URL keep working because the bucket object is unchanged;
-- the renderer detects an http(s) value and uses it directly. New rows store the
-- path instead and are served via signed URLs.

-- ── Private bucket ────────────────────────────────────────────────────────
update storage.buckets set public = false where id = 'dm-attachments';

-- ── Replace the public-read policies with participant-scoped ones ──────────
drop policy if exists "DM attachments are publicly readable" on storage.objects;
drop policy if exists "Users can upload DM attachments to their own folder" on storage.objects;
drop policy if exists "Users can delete their own DM attachments" on storage.objects;

-- Read: either participant of the conversation in the path's first folder.
create policy "DM attachments readable by conversation participants"
  on storage.objects for select to authenticated
  using (
    bucket_id = 'dm-attachments'
    and exists (
      select 1 from public.conversations c
      where c.id::text = (storage.foldername(name))[1]
        and auth.uid() in (c.user_a, c.user_b)
    )
  );

-- Insert: must be a participant AND uploading into your own uid subfolder.
create policy "DM attachments insert by conversation participants"
  on storage.objects for insert to authenticated
  with check (
    bucket_id = 'dm-attachments'
    and (storage.foldername(name))[2] = auth.uid()::text
    and exists (
      select 1 from public.conversations c
      where c.id::text = (storage.foldername(name))[1]
        and auth.uid() in (c.user_a, c.user_b)
    )
  );

-- Delete: only the uploader (own uid subfolder), still within their conversation.
create policy "DM attachments delete by uploader"
  on storage.objects for delete to authenticated
  using (
    bucket_id = 'dm-attachments'
    and (storage.foldername(name))[2] = auth.uid()::text
    and exists (
      select 1 from public.conversations c
      where c.id::text = (storage.foldername(name))[1]
        and auth.uid() in (c.user_a, c.user_b)
    )
  );
