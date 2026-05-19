-- Seshn — settings: notification preferences + self-serve account deletion

-- ──── Notification preferences ──────────────────────────────────────────
-- One jsonb column on profiles, all kinds enabled by default. Existing rows
-- pick up the default automatically via ADD COLUMN ... DEFAULT.
alter table public.profiles
  add column if not exists notification_prefs jsonb not null default jsonb_build_object(
    'application_received', true,
    'application_accepted', true,
    'application_rejected', true,
    'message_received',     true
  );

-- Helper: is this notification kind enabled for this user?
-- Coalesces missing keys to TRUE so adding a new notification kind later
-- doesn't accidentally mute it for users with older prefs.
create or replace function public.notif_enabled(uid uuid, kind text)
returns boolean
language sql stable
as $$
  select coalesce(
    ((select notification_prefs from public.profiles where id = uid) ->> kind)::boolean,
    true
  );
$$;

-- ──── Trigger updates: respect prefs before inserting ────────────────────
create or replace function public.tg_notify_application_received()
returns trigger language plpgsql security definer set search_path = public as $$
declare
  recipient uuid;
  the_gig_id uuid;
begin
  select g.owner_id, g.id into recipient, the_gig_id
    from public.gigs g
   where g.id = new.gig_id
     and g.owner_id <> new.applicant_id;
  if recipient is null then return new; end if;
  if not public.notif_enabled(recipient, 'application_received') then return new; end if;
  insert into public.notifications (user_id, kind, actor_id, gig_id, application_id)
  values (recipient, 'application_received', new.applicant_id, the_gig_id, new.id);
  return new;
end;
$$;

create or replace function public.tg_notify_application_status_change()
returns trigger language plpgsql security definer set search_path = public as $$
declare
  the_kind text;
  owner_id_v uuid;
begin
  if new.status is not distinct from old.status then return new; end if;
  if new.status not in ('accepted', 'rejected') then return new; end if;
  the_kind := 'application_' || new.status;
  if not public.notif_enabled(new.applicant_id, the_kind) then return new; end if;
  select g.owner_id into owner_id_v
    from public.gigs g
   where g.id = new.gig_id and g.owner_id <> new.applicant_id;
  if owner_id_v is null then return new; end if;
  insert into public.notifications (user_id, kind, actor_id, gig_id, application_id)
  values (new.applicant_id, the_kind, owner_id_v, new.gig_id, new.id);
  return new;
end;
$$;

create or replace function public.tg_notify_message_received()
returns trigger language plpgsql security definer set search_path = public as $$
declare
  recipient uuid;
begin
  select case when c.user_a = new.sender_id then c.user_b else c.user_a end
    into recipient
    from public.conversations c
   where c.id = new.conversation_id;
  if recipient is null or recipient = new.sender_id then return new; end if;
  if not public.notif_enabled(recipient, 'message_received') then return new; end if;
  insert into public.notifications (user_id, kind, actor_id, conversation_id)
  values (recipient, 'message_received', new.sender_id, new.conversation_id);
  return new;
end;
$$;

-- ──── Self-serve account deletion ───────────────────────────────────────
-- Deletes the caller's auth.users row. ON DELETE CASCADE on profiles.id
-- (and from there through the rest of the schema) cleans up everything
-- they own. Their storage objects (avatars, dm attachments) are NOT
-- cleaned up — that's day-2 work via a Storage lifecycle policy.
create or replace function public.delete_my_account()
returns void
language plpgsql
security definer
set search_path = public, auth
as $$
declare
  uid uuid := auth.uid();
begin
  if uid is null then raise exception 'Not authenticated'; end if;
  delete from auth.users where id = uid;
end;
$$;

grant execute on function public.delete_my_account() to authenticated;
