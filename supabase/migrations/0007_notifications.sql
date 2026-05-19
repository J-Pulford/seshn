-- Seshn — notifications schema
-- A row in this table represents one "thing the user should know about":
--   - someone applied to a gig they own              (application_received)
--   - the owner of a gig they applied to acted on it (application_accepted / application_rejected)
--   - someone sent them a DM                         (message_received)
--
-- Rows are inserted only by SECURITY DEFINER triggers below. Recipients
-- read and mark them read; the only writes from the API are UPDATE for
-- read_at. There is no INSERT policy.

create table public.notifications (
  id              uuid primary key default gen_random_uuid(),
  user_id         uuid not null references public.profiles(id) on delete cascade,
  kind            text not null check (kind in (
                    'application_received',
                    'application_accepted',
                    'application_rejected',
                    'message_received'
                  )),
  actor_id        uuid references public.profiles(id) on delete set null,
  gig_id          uuid references public.gigs(id) on delete cascade,
  application_id  uuid references public.applications(id) on delete cascade,
  conversation_id uuid references public.conversations(id) on delete cascade,
  created_at      timestamptz not null default now(),
  read_at         timestamptz
);

create index notifications_user_created_idx on public.notifications (user_id, created_at desc);
create index notifications_user_unread_idx  on public.notifications (user_id) where read_at is null;

-- ──── Triggers ──────────────────────────────────────────────────────────

-- application_received: insert a notification for the gig owner.
create or replace function public.tg_notify_application_received()
returns trigger language plpgsql security definer set search_path = public as $$
begin
  insert into public.notifications (user_id, kind, actor_id, gig_id, application_id)
  select g.owner_id, 'application_received', new.applicant_id, g.id, new.id
    from public.gigs g
   where g.id = new.gig_id
     and g.owner_id <> new.applicant_id;
  return new;
end;
$$;

create trigger applications_notify_received
  after insert on public.applications
  for each row execute function public.tg_notify_application_received();

-- application_accepted / application_rejected: insert a notification for
-- the applicant when the status moves to one of those two states.
create or replace function public.tg_notify_application_status_change()
returns trigger language plpgsql security definer set search_path = public as $$
begin
  if new.status is not distinct from old.status then return new; end if;
  if new.status in ('accepted', 'rejected') then
    insert into public.notifications (user_id, kind, actor_id, gig_id, application_id)
    select new.applicant_id,
           'application_' || new.status,
           g.owner_id, g.id, new.id
      from public.gigs g
     where g.id = new.gig_id
       and g.owner_id <> new.applicant_id;
  end if;
  return new;
end;
$$;

create trigger applications_notify_status_change
  after update on public.applications
  for each row execute function public.tg_notify_application_status_change();

-- message_received: insert a notification for the other participant.
create or replace function public.tg_notify_message_received()
returns trigger language plpgsql security definer set search_path = public as $$
declare
  recipient uuid;
begin
  select case when c.user_a = new.sender_id then c.user_b else c.user_a end
    into recipient
    from public.conversations c
   where c.id = new.conversation_id;
  if recipient is not null and recipient <> new.sender_id then
    insert into public.notifications (user_id, kind, actor_id, conversation_id)
    values (recipient, 'message_received', new.sender_id, new.conversation_id);
  end if;
  return new;
end;
$$;

create trigger messages_notify_received
  after insert on public.messages
  for each row execute function public.tg_notify_message_received();

-- ──── RLS ───────────────────────────────────────────────────────────────
alter table public.notifications enable row level security;

create policy "Users can read their own notifications"
  on public.notifications for select
  using (user_id = auth.uid());

-- Recipients can mark their own notifications as read (only read_at).
create policy "Users can update their own notifications"
  on public.notifications for update
  using (user_id = auth.uid())
  with check (user_id = auth.uid());

-- No INSERT or DELETE policies — only triggers (security definer) write.

-- Realtime delivery for the bell.
alter publication supabase_realtime add table public.notifications;
