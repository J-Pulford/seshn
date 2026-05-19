-- Seshn — DM attachments (audio + generic files)
-- Extends the messages table with attachment metadata and creates a separate
-- public storage bucket for DM uploads. Bucket is public-read because object
-- URLs use random UUIDs and aren't easily guessable; tightening this to
-- signed URLs is a future-day-2 concern.

alter table public.messages
  add column attachment_url         text,
  add column attachment_name        text,
  add column attachment_kind        text
    check (attachment_kind is null or attachment_kind in ('audio', 'file')),
  add column attachment_size_bytes  bigint
    check (attachment_size_bytes is null or
           (attachment_size_bytes between 0 and 100 * 1024 * 1024)),
  add column attachment_duration_ms integer
    check (attachment_duration_ms is null or attachment_duration_ms >= 0),
  add column attachment_mime        text;

-- Replace the old body-length-only check (auto-named from 0004_messaging.sql)
-- with one that also allows an empty body when there's an attachment.
do $$
declare c text;
begin
  for c in
    select conname from pg_constraint
     where conrelid = 'public.messages'::regclass
       and contype = 'c'
       and pg_get_constraintdef(oid) ilike '%char_length(body)%'
  loop
    execute format('alter table public.messages drop constraint %I', c);
  end loop;
end $$;

alter table public.messages
  alter column body set default '';

alter table public.messages
  add constraint messages_body_or_attachment_check check (
    char_length(body) <= 4000
    and (char_length(body) > 0 or attachment_url is not null)
  );

-- Update the conversation-touch trigger so attachment-only messages still
-- produce a useful preview ("♪ filename.mp3") in the inbox list.
create or replace function public.tg_messages_touch_convo() returns trigger
language plpgsql as $$
begin
  update public.conversations
     set last_message_at      = new.created_at,
         last_message_preview = case
           when char_length(coalesce(new.body, '')) > 0 then left(new.body, 200)
           when new.attachment_kind = 'audio' then '♪ ' || coalesce(new.attachment_name, 'Audio')
           when new.attachment_url is not null then '📎 ' || coalesce(new.attachment_name, 'File')
           else ''
         end,
         last_message_sender  = new.sender_id
   where id = new.conversation_id;
  return new;
end;
$$;

-- ──── Storage bucket ────────────────────────────────────────────────────
insert into storage.buckets (id, name, public)
values ('dm-attachments', 'dm-attachments', true)
on conflict (id) do nothing;

drop policy if exists "DM attachments are publicly readable" on storage.objects;
create policy "DM attachments are publicly readable"
  on storage.objects for select
  using (bucket_id = 'dm-attachments');

drop policy if exists "Users can upload DM attachments to their own folder" on storage.objects;
create policy "Users can upload DM attachments to their own folder"
  on storage.objects for insert to authenticated
  with check (
    bucket_id = 'dm-attachments'
    and auth.uid()::text = (storage.foldername(name))[1]
  );

drop policy if exists "Users can delete their own DM attachments" on storage.objects;
create policy "Users can delete their own DM attachments"
  on storage.objects for delete to authenticated
  using (
    bucket_id = 'dm-attachments'
    and auth.uid()::text = (storage.foldername(name))[1]
  );
