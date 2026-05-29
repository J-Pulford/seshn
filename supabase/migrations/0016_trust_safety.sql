-- Seshn — trust & safety: reports, blocks, and live restriction enforcement
--
-- The restriction DATA model already exists (0012 added profiles.restrictions
-- jsonb + the restriction_events audit table), but nothing enforced it: a
-- soft-banned user could still post and apply. This migration:
--   1. adds a `reports` table (users flag a user or a gig)
--   2. adds a `blocks` table (a user blocks another user)
--   3. turns restrictions ON by gating gig/application inserts via RLS
--   4. enforces blocks on applications and on DMs
--
-- All cross-table lookups inside policies go through SECURITY DEFINER helper
-- functions, following the pattern established in 0014: RLS does not
-- re-evaluate inside a security-definer function, so we avoid both recursion
-- and the need to grant callers direct read access to the underlying rows.


-- ──── Reports ───────────────────────────────────────────────────────
-- A user flags either another user or a gig. Triage is done by the founder
-- (service-role / SQL per docs/sops/09-trust-safety.md); users can only file
-- and see their own reports.

create type public.report_target as enum ('user', 'gig');
create type public.report_status as enum ('open', 'reviewing', 'actioned', 'dismissed');

create table public.reports (
  id              uuid primary key default gen_random_uuid(),
  reporter_id     uuid not null references public.profiles(id) on delete cascade,
  target_type     public.report_target not null,
  target_user_id  uuid references public.profiles(id) on delete cascade,
  target_gig_id   uuid references public.gigs(id) on delete cascade,
  reason          text not null check (char_length(reason) between 1 and 80),
  details         text not null default '' check (char_length(details) <= 2000),
  status          public.report_status not null default 'open',
  created_at      timestamptz not null default now(),
  -- Exactly one target, matching the declared type.
  check (
    (target_type = 'user' and target_user_id is not null and target_gig_id is null) or
    (target_type = 'gig'  and target_gig_id  is not null and target_user_id is null)
  ),
  -- Can't report yourself.
  check (target_user_id is null or target_user_id <> reporter_id)
);

create index reports_status_idx       on public.reports (status, created_at desc);
create index reports_target_user_idx  on public.reports (target_user_id) where target_user_id is not null;
create index reports_target_gig_idx   on public.reports (target_gig_id)  where target_gig_id  is not null;

-- One open-ended report per reporter per target. Partial unique indexes
-- (rather than a table UNIQUE) because the nullable target columns would make
-- a plain UNIQUE treat every row as distinct.
create unique index reports_unique_user_target
  on public.reports (reporter_id, target_user_id) where target_type = 'user';
create unique index reports_unique_gig_target
  on public.reports (reporter_id, target_gig_id)  where target_type = 'gig';


-- ──── Blocks ────────────────────────────────────────────────────────
-- Directed: blocker_id blocks blocked_id. Enforcement (below) treats a block
-- as mutual — neither party can apply to the other's gigs or DM the other —
-- but only the blocker can see/manage the row.

create table public.blocks (
  blocker_id   uuid not null references public.profiles(id) on delete cascade,
  blocked_id   uuid not null references public.profiles(id) on delete cascade,
  created_at   timestamptz not null default now(),
  primary key (blocker_id, blocked_id),
  check (blocker_id <> blocked_id)
);

create index blocks_blocked_idx on public.blocks (blocked_id);


-- ──── Helper functions (SECURITY DEFINER, no RLS re-evaluation) ──────

-- Is the current user under the given restriction right now? Reads the single
-- jsonb field on their own profile. A missing key or a past timestamp = not
-- restricted; a far-future timestamp (e.g. 9999-12-31) = permanent ban.
create or replace function public.is_restricted(p_key text)
returns boolean
language sql stable security definer set search_path = public
as $$
  select coalesce(
    (select (restrictions ->> p_key)::timestamptz > now()
       from public.profiles where id = auth.uid()),
    false
  )
$$;

-- True if either user has blocked the other (block is mutual for enforcement).
create or replace function public.blocks_between(a uuid, b uuid)
returns boolean
language sql stable security definer set search_path = public
as $$
  select exists (
    select 1 from public.blocks
     where (blocker_id = a and blocked_id = b)
        or (blocker_id = b and blocked_id = a)
  )
$$;

-- Owner of a gig, resolved without tripping the gigs SELECT policy.
create or replace function public.gig_owner(p_gig uuid)
returns uuid
language sql stable security definer set search_path = public
as $$
  select owner_id from public.gigs where id = p_gig
$$;

-- True if the current user and the other participant of a conversation have a
-- block between them. Used by the messages INSERT policy.
create or replace function public.convo_is_blocked(p_convo uuid)
returns boolean
language sql stable security definer set search_path = public
as $$
  select exists (
    select 1
      from public.conversations c
      join public.blocks bl
        on (bl.blocker_id = c.user_a and bl.blocked_id = c.user_b)
        or (bl.blocker_id = c.user_b and bl.blocked_id = c.user_a)
     where c.id = p_convo
       and (c.user_a = auth.uid() or c.user_b = auth.uid())
  )
$$;

revoke all on function public.is_restricted(text)        from public;
revoke all on function public.blocks_between(uuid, uuid)  from public;
revoke all on function public.gig_owner(uuid)             from public;
revoke all on function public.convo_is_blocked(uuid)      from public;
grant execute on function public.is_restricted(text)       to authenticated;
grant execute on function public.blocks_between(uuid, uuid) to authenticated;
grant execute on function public.gig_owner(uuid)           to authenticated;
grant execute on function public.convo_is_blocked(uuid)    to authenticated;


-- ──── RLS: reports ──────────────────────────────────────────────────
alter table public.reports enable row level security;

create policy "Users can file their own reports"
  on public.reports for insert
  with check (reporter_id = auth.uid());

create policy "Users can see their own reports"
  on public.reports for select
  using (reporter_id = auth.uid());
-- No user UPDATE/DELETE: triage happens out-of-band via service role.


-- ──── RLS: blocks ───────────────────────────────────────────────────
alter table public.blocks enable row level security;

-- Only the blocker can see their own blocks (the blocked user must not learn
-- they've been blocked).
create policy "Users can see their own blocks"
  on public.blocks for select
  using (blocker_id = auth.uid());

create policy "Users can create their own blocks"
  on public.blocks for insert
  with check (blocker_id = auth.uid() and blocker_id <> blocked_id);

create policy "Users can remove their own blocks"
  on public.blocks for delete
  using (blocker_id = auth.uid());


-- ──── Enforce restrictions + blocks on gig / application inserts ─────

-- Gigs: a user under cannot_post_until can no longer post.
drop policy if exists "Authenticated users can post their own gigs" on public.gigs;
create policy "Authenticated users can post their own gigs"
  on public.gigs for insert
  with check (
    auth.uid() = owner_id
    and not public.is_restricted('cannot_post_until')
  );

-- Applications: a user under cannot_apply_until can no longer apply, and a
-- block between applicant and gig owner (either direction) prevents applying.
drop policy if exists "Authenticated users can apply to others' open gigs" on public.applications;
create policy "Authenticated users can apply to others' open gigs"
  on public.applications for insert
  with check (
    applicant_id = auth.uid()
    and gig_id in (select id from public.gigs where owner_id <> auth.uid() and status = 'open')
    and not public.is_restricted('cannot_apply_until')
    and not public.blocks_between(auth.uid(), public.gig_owner(gig_id))
  );


-- ──── Enforce blocks on DMs ─────────────────────────────────────────

-- Existing conversations: can't send a message to someone you've blocked or
-- who has blocked you.
drop policy if exists "Participants can send messages as themselves" on public.messages;
create policy "Participants can send messages as themselves"
  on public.messages for insert
  with check (
    sender_id = auth.uid()
    and conversation_id in (
      select id from public.conversations
       where user_a = auth.uid() or user_b = auth.uid()
    )
    and not public.convo_is_blocked(conversation_id)
  );

-- New conversations: get_or_create_conversation refuses a blocked pair.
-- Re-created from 0004 with the block guard added.
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
  if exists (
    select 1 from public.blocks
     where (blocker_id = me and blocked_id = other_user)
        or (blocker_id = other_user and blocked_id = me)
  ) then
    raise exception 'Cannot start a conversation with this user';
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
