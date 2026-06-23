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
-- NOTE: requires the matching app change in the same release. New rows store the
-- path and are served via signed URLs. CAVEAT: any attachment sent BEFORE this
-- migration stored a full public URL, and once the bucket is private that public
-- URL no longer resolves. This is fine for a fresh launch (bucket is empty), but
-- if pre-0036 attachments exist they need a one-off backfill (move the object to
-- a {conversation_id}/{uid}/ path and rewrite messages.attachment_url). Confirm
-- `select count(*) from storage.objects where bucket_id='dm-attachments'` is 0
-- before applying, or schedule the backfill.

-- ── Private bucket ────────────────────────────────────────────────────────
update storage.buckets set public = false where id = 'dm-attachments';

-- ── Replace the public-read policies with participant-scoped ones ──────────
-- Drop both the old public-read policies AND the new names, so this migration
-- is safe to re-run (Postgres has no CREATE POLICY IF NOT EXISTS).
drop policy if exists "DM attachments are publicly readable" on storage.objects;
drop policy if exists "Users can upload DM attachments to their own folder" on storage.objects;
drop policy if exists "Users can delete their own DM attachments" on storage.objects;
drop policy if exists "DM attachments readable by conversation participants" on storage.objects;
drop policy if exists "DM attachments insert by conversation participants" on storage.objects;
drop policy if exists "DM attachments delete by uploader" on storage.objects;

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
