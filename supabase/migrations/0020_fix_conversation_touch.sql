-- Seshn — fix inbox previews: conversation-touch trigger must bypass RLS.
--
-- tg_messages_touch_convo() (0004, updated in 0009) denormalises the latest
-- message onto conversations.last_message_{at,preview,sender}. It ran as the
-- message sender (plain plpgsql), but conversations has NO update policy under
-- RLS — only a SELECT policy (0004). So the trigger's UPDATE matched 0 rows
-- every time: last_message_* stayed null, and the inbox list showed
-- "Say hi — no messages yet" for conversations that actually had messages
-- (and the unread dot / DM badge never lit).
--
-- Fix: make the function SECURITY DEFINER (with a pinned search_path) so the
-- denormalisation runs with the owner's rights and bypasses the missing UPDATE
-- policy. This is safe: the trigger only fires on a message INSERT (already
-- gated to conversation participants by the messages insert policy, 0016) and
-- only touches that message's own conversation row. Then backfill existing
-- conversations from their latest message.
--
-- Idempotent.

create or replace function public.tg_messages_touch_convo() returns trigger
language plpgsql
security definer
set search_path = public
as $$
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

-- Backfill conversations whose denorm columns never got written (runs as the
-- migration role, which bypasses RLS).
update public.conversations c
   set last_message_at      = m.created_at,
       last_message_preview = case
         when char_length(coalesce(m.body, '')) > 0 then left(m.body, 200)
         when m.attachment_kind = 'audio' then '♪ ' || coalesce(m.attachment_name, 'Audio')
         when m.attachment_url is not null then '📎 ' || coalesce(m.attachment_name, 'File')
         else ''
       end,
       last_message_sender  = m.sender_id
  from (
    select distinct on (conversation_id)
           conversation_id, body, attachment_kind, attachment_name, attachment_url, sender_id, created_at
      from public.messages
     order by conversation_id, created_at desc
  ) m
 where m.conversation_id = c.id
   and (c.last_message_at is null or c.last_message_at <> m.created_at);
