-- Seshn — built-in meeting scheduler.
--
-- Either party in a conversation (and, by extension, a contract) can propose a
-- meeting; the other party confirms or declines. This is a self-contained
-- scheduler — no third-party calendar account required — but the client also
-- offers an .ics download and a Google Calendar link so a confirmed meeting
-- lands on the member's real calendar.
--
-- A meeting hangs off a conversation (the 1:1 thread that already gates who can
-- talk to whom) and optionally references a contract for deal-related calls.
-- Times are timestamptz (UTC); the client renders in local time.
--
-- Idempotent where practical.

create table if not exists public.meetings (
  id              uuid primary key default gen_random_uuid(),
  conversation_id uuid references public.conversations(id) on delete cascade,
  contract_id     uuid references public.contracts(id) on delete set null,
  organizer_id    uuid not null references public.profiles(id) on delete cascade,
  invitee_id      uuid not null references public.profiles(id) on delete cascade,
  title           text not null check (char_length(title) between 1 and 140),
  agenda          text not null default '' check (char_length(agenda) <= 2000),
  location        text not null default '' check (char_length(location) <= 200),
  meeting_url     text not null default '' check (char_length(meeting_url) <= 500),
  starts_at       timestamptz not null,
  ends_at         timestamptz not null,
  status          text not null default 'proposed' check (status in (
                    'proposed',
                    'confirmed',
                    'declined',
                    'cancelled',
                    'completed'
                  )),
  created_at      timestamptz not null default now(),
  updated_at      timestamptz not null default now(),
  check (ends_at > starts_at),
  check (organizer_id <> invitee_id)
);

create index if not exists meetings_conversation_idx on public.meetings (conversation_id, starts_at);
create index if not exists meetings_invitee_idx      on public.meetings (invitee_id, starts_at);
create index if not exists meetings_organizer_idx    on public.meetings (organizer_id, starts_at);
create index if not exists meetings_upcoming_idx     on public.meetings (starts_at)
  where status in ('proposed', 'confirmed');

drop trigger if exists meetings_set_updated_at on public.meetings;
create trigger meetings_set_updated_at
  before update on public.meetings
  for each row execute function public.tg_set_updated_at();

-- ──── RLS ───────────────────────────────────────────────────────────────
alter table public.meetings enable row level security;

drop policy if exists "Meetings visible to participants" on public.meetings;
create policy "Meetings visible to participants"
  on public.meetings for select
  using (organizer_id = auth.uid() or invitee_id = auth.uid());

-- The organizer creates the meeting. If it's attached to a conversation, the
-- organizer must be a member of it and the invitee must be the other party.
drop policy if exists "Participants can propose meetings" on public.meetings;
create policy "Participants can propose meetings"
  on public.meetings for insert
  with check (
    organizer_id = auth.uid()
    and invitee_id <> auth.uid()
    and (
      conversation_id is null
      or conversation_id in (
        select id from public.conversations
        where (user_a = auth.uid() and user_b = invitee_id)
           or (user_b = auth.uid() and user_a = invitee_id)
      )
    )
  );

-- Either party can update their shared meeting (confirm / decline / cancel /
-- reschedule). The status check constraint guards the allowed values; the app
-- enforces sensible transitions.
drop policy if exists "Participants can update meetings" on public.meetings;
create policy "Participants can update meetings"
  on public.meetings for update
  using (organizer_id = auth.uid() or invitee_id = auth.uid())
  with check (organizer_id = auth.uid() or invitee_id = auth.uid());

-- ──── Notifications ──────────────────────────────────────────────────────
-- Extend the bell feed to cover meeting activity. Add a meeting_id reference
-- and widen the kind check, then a trigger that notifies the other party.

alter table public.notifications
  add column if not exists meeting_id uuid references public.meetings(id) on delete cascade;

alter table public.notifications drop constraint if exists notifications_kind_check;
alter table public.notifications add constraint notifications_kind_check check (kind in (
  'application_received',
  'application_accepted',
  'application_rejected',
  'message_received',
  'meeting_proposed',
  'meeting_updated',
  'meeting_confirmed',
  'meeting_declined',
  'meeting_cancelled'
));

create or replace function public.tg_notify_meeting()
returns trigger language plpgsql security definer set search_path = public as $$
declare
  actor     uuid := auth.uid();
  recipient uuid;
  knd       text;
begin
  if (tg_op = 'INSERT') then
    recipient := new.invitee_id;
    knd := 'meeting_proposed';
  elsif (tg_op = 'UPDATE') then
    if new.status is distinct from old.status then
      if new.status in ('confirmed', 'declined', 'cancelled') then
        knd := 'meeting_' || new.status;
      else
        return new;  -- 'completed' (and any future state) needs no notification
      end if;
    elsif (new.starts_at is distinct from old.starts_at and new.status = 'proposed') then
      knd := 'meeting_updated';
    else
      return new;  -- edit that doesn't change time or state
    end if;
    recipient := case when actor = new.organizer_id then new.invitee_id else new.organizer_id end;
  end if;

  if recipient is not null and knd is not null and recipient is distinct from actor then
    insert into public.notifications (user_id, kind, actor_id, conversation_id, meeting_id)
    values (recipient, knd, actor, new.conversation_id, new.id);
  end if;
  return new;
end;
$$;

drop trigger if exists meetings_notify on public.meetings;
create trigger meetings_notify
  after insert or update on public.meetings
  for each row execute function public.tg_notify_meeting();

-- ──── Realtime ───────────────────────────────────────────────────────────
-- So the conversation's meeting panel updates live for both parties.
do $$ begin
  if not exists (
    select 1 from pg_publication_tables
    where pubname = 'supabase_realtime' and schemaname = 'public' and tablename = 'meetings'
  ) then
    alter publication supabase_realtime add table public.meetings;
  end if;
end $$;
