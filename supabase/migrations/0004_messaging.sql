-- Seshn — 1:1 messaging schema
-- Two-user conversations only (no groups for now). Each pair of users has at
-- most one conversation row, enforced by a deterministic pair_key.

create table public.conversations (
  id                    uuid primary key default gen_random_uuid(),
  user_a                uuid not null references public.profiles(id) on delete cascade,
  user_b                uuid not null references public.profiles(id) on delete cascade,
  created_at            timestamptz not null default now(),
  last_message_at       timestamptz,
  last_message_preview  text,
  last_message_sender   uuid references public.profiles(id) on delete set null,
  -- Deterministic uniqueness: only one conversation per pair, regardless of order.
  pair_key              text generated always as (
    least(user_a::text, user_b::text) || '|' || greatest(user_a::text, user_b::text)
  ) stored unique,
  check (user_a <> user_b)
);

create index conversations_user_a_idx     on public.conversations (user_a);
create index conversations_user_b_idx     on public.conversations (user_b);
create index conversations_last_msg_idx   on public.conversations (last_message_at desc nulls last);

create table public.messages (
  id              uuid primary key default gen_random_uuid(),
  conversation_id uuid not null references public.conversations(id) on delete cascade,
  sender_id       uuid not null references public.profiles(id) on delete cascade,
  body            text not null check (char_length(body) between 1 and 4000),
  created_at      timestamptz not null default now()
);

create index messages_convo_idx  on public.messages (conversation_id, created_at desc);
create index messages_sender_idx on public.messages (sender_id);

-- Per-user read state. When a user opens a conversation we upsert last_read_at = now().
create table public.conversation_reads (
  conversation_id uuid not null references public.conversations(id) on delete cascade,
  user_id         uuid not null references public.profiles(id) on delete cascade,
  last_read_at    timestamptz not null default now(),
  primary key (conversation_id, user_id)
);

-- When a message is inserted, denormalize a preview onto the conversation row.
create or replace function public.tg_messages_touch_convo() returns trigger
language plpgsql as $$
begin
  update public.conversations
     set last_message_at      = new.created_at,
         last_message_preview = left(new.body, 200),
         last_message_sender  = new.sender_id
   where id = new.conversation_id;
  return new;
end;
$$;

create trigger messages_touch_convo
  after insert on public.messages
  for each row execute function public.tg_messages_touch_convo();

-- get_or_create_conversation(other_user) — single round-trip from the client.
-- security definer so we can return a row the caller may not yet have SELECT
-- access to via the policy (right after creating it).
create or replace function public.get_or_create_conversation(other_user uuid)
returns uuid
language plpgsql
security definer
set search_path = public
as $$
declare
  me uuid := auth.uid();
  a uuid;
  b uuid;
  convo_id uuid;
begin
  if me is null then raise exception 'Not authenticated'; end if;
  if other_user is null or other_user = me then raise exception 'Invalid recipient'; end if;
  if not exists (select 1 from public.profiles where id = other_user) then
    raise exception 'Recipient not found';
  end if;
  if me < other_user then a := me; b := other_user; else a := other_user; b := me; end if;
  select id into convo_id from public.conversations where user_a = a and user_b = b;
  if convo_id is null then
    insert into public.conversations(user_a, user_b) values (a, b) returning id into convo_id;
  end if;
  return convo_id;
end;
$$;

grant execute on function public.get_or_create_conversation(uuid) to authenticated;

-- ──── Row-level security ────────────────────────────────────────────────
alter table public.conversations      enable row level security;
alter table public.messages           enable row level security;
alter table public.conversation_reads enable row level security;

-- Conversations: participants can SELECT. No direct INSERT/UPDATE/DELETE
-- (use get_or_create_conversation RPC; row is touched via the messages trigger).
create policy "Participants can see their conversations"
  on public.conversations for select
  using (user_a = auth.uid() or user_b = auth.uid());

-- Messages: participants can SELECT and INSERT (only as themselves).
create policy "Participants can read messages in their conversations"
  on public.messages for select
  using (
    conversation_id in (
      select id from public.conversations
       where user_a = auth.uid() or user_b = auth.uid()
    )
  );

create policy "Participants can send messages as themselves"
  on public.messages for insert
  with check (
    sender_id = auth.uid()
    and conversation_id in (
      select id from public.conversations
       where user_a = auth.uid() or user_b = auth.uid()
    )
  );

-- Conversation reads: each user manages their own row.
create policy "Users can see their own conversation reads"
  on public.conversation_reads for select
  using (user_id = auth.uid());

create policy "Users can insert their own conversation reads"
  on public.conversation_reads for insert
  with check (user_id = auth.uid());

create policy "Users can update their own conversation reads"
  on public.conversation_reads for update
  using (user_id = auth.uid())
  with check (user_id = auth.uid());

-- Enable realtime delivery for new messages.
alter publication supabase_realtime add table public.messages;
