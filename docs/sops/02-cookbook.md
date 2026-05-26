# 02 — Cookbook

Copy-paste SQL for the moves that come up over and over. All queries are read-only unless explicitly marked ⚠️.

Run these in Supabase Studio → SQL Editor.

Replace `[email]`, `[username]`, `[uuid]` etc with values from the ticket.

## Identify a user

```sql
-- By email (case-insensitive)
select u.id, u.email, u.created_at, p.username, p.display_name, p.is_pro
  from auth.users u
  left join public.profiles p on p.id = u.id
  where u.email ilike '[email]';

-- By username
select p.id, p.username, p.display_name, p.is_pro, p.created_at,
       u.email, u.last_sign_in_at
  from public.profiles p
  join auth.users u on u.id = p.id
  where p.username = '[username]';
```

## Their full state in one query

Gives you everything most tickets need on one page:

```sql
with u as (
  select id from public.profiles where username = '[username]'
)
select
  (select row_to_json(p) from public.profiles p where p.id = (select id from u))
    as profile,
  (select count(*) from public.gigs where owner_id = (select id from u))
    as gigs_posted,
  (select count(*) from public.applications where applicant_id = (select id from u))
    as applications_sent,
  (select count(*) from public.applications a
     join public.gigs g on g.id = a.gig_id
     where g.owner_id = (select id from u))
    as applications_received,
  (select count(*) from public.contracts
     where owner_id = (select id from u) or collaborator_id = (select id from u))
    as contracts_total,
  (select count(*) from public.notifications where user_id = (select id from u) and read_at is null)
    as unread_notifications,
  (select restrictions from public.profiles where id = (select id from u))
    as current_restrictions;
```

## Check sign-in history

```sql
-- Most recent sign-ins
select last_sign_in_at, email_confirmed_at, created_at, banned_until
  from auth.users
  where id = '[user_uuid]';
```

For magic-link / OAuth attempt history, open **Auth → Logs** in Studio. SQL doesn't expose this.

## A specific gig + its applications

```sql
-- Replace [gig_uuid]
select g.id, g.title, g.status, g.created_at,
       p.username as owner_username,
       (select count(*) from public.applications a where a.gig_id = g.id) as total_apps,
       (select count(*) from public.applications a where a.gig_id = g.id and a.status = 'pending') as pending_apps,
       (select count(*) from public.applications a where a.gig_id = g.id and a.status = 'accepted') as accepted_apps
  from public.gigs g
  join public.profiles p on p.id = g.owner_id
  where g.id = '[gig_uuid]';

-- The applications themselves
select a.id, a.applicant_id, ap.username as applicant_username,
       a.status, a.created_at, length(a.pitch) as pitch_chars
  from public.applications a
  join public.profiles ap on ap.id = a.applicant_id
  where a.gig_id = '[gig_uuid]'
  order by a.created_at desc;
```

## A specific application

```sql
select a.*,
       g.title as gig_title, g.status as gig_status, g.owner_id,
       go.username as owner_username,
       ap.username as applicant_username
  from public.applications a
  join public.gigs g on g.id = a.gig_id
  join public.profiles go on go.id = g.owner_id
  join public.profiles ap on ap.id = a.applicant_id
  where a.id = '[application_uuid]';
```

## A specific conversation + recent messages

```sql
-- Get the conversation
select c.id, c.user_a, c.user_b, c.created_at,
       pa.username as user_a_username, pb.username as user_b_username
  from public.conversations c
  join public.profiles pa on pa.id = c.user_a
  join public.profiles pb on pb.id = c.user_b
  where c.id = '[conversation_uuid]';

-- Last 20 messages (no body text — see PII note below)
select id, sender_id, created_at,
       length(body) as body_chars,
       attachment_url is not null as has_attachment
  from public.messages
  where conversation_id = '[conversation_uuid]'
  order by created_at desc
  limit 20;
```

**PII note**: don't `select body` unless you have explicit founder permission. Message contents are private. The metadata above tells you whether messages exist; the contents themselves are off-limits to support without a specific reason.

## Notifications for a user

```sql
-- Recent notifications
select id, kind, actor_id, gig_id, application_id, conversation_id,
       created_at, read_at
  from public.notifications
  where user_id = '[user_uuid]'
  order by created_at desc
  limit 30;

-- Count of unread by kind
select kind, count(*)
  from public.notifications
  where user_id = '[user_uuid]' and read_at is null
  group by kind;
```

## A contract in detail

```sql
select c.id, c.status,
       c.owner_id, c.collaborator_id,
       po.username as owner_un, pc.username as collab_un,
       c.terms,
       c.owner_signed_at, c.collaborator_signed_at, c.fully_signed_at,
       c.created_at, c.updated_at
  from public.contracts c
  join public.profiles po on po.id = c.owner_id
  join public.profiles pc on pc.id = c.collaborator_id
  where c.id = '[contract_uuid]';

-- The audit trail for that contract
select id, created_at, action, payload->>'role' as role, payload
  from public.audit_log
  where target_table = 'contracts' and target_id = '[contract_uuid]'
  order by id;
```

## An escrow in detail

```sql
select e.id, e.status, e.amount_cents, e.currency,
       e.funded_at, e.delivered_at, e.released_at,
       e.auto_release_at, e.deadline_at,
       e.stripe_payment_intent_id, e.stripe_transfer_id,
       c.owner_id, c.collaborator_id
  from public.escrows e
  join public.contracts c on c.id = e.contract_id
  where e.id = '[escrow_uuid]';

-- Deliverables submitted on it
select id, kind, submitted_at, file_url is not null as has_file, length(note) as note_chars
  from public.deliverables
  where escrow_id = '[escrow_uuid]'
  order by submitted_at;
```

## Restrictions / bans on a user

```sql
-- Current state (the fast-read mirror)
select id, username, restrictions
  from public.profiles
  where id = '[user_uuid]';

-- Full history
select id, action, reason, until, escrow_id, actor, created_at
  from public.restriction_events
  where user_id = '[user_uuid]'
  order by created_at desc;
```

## Audit log for a user

Everything sensitive that user ever did or had done to them:

```sql
select id, created_at, action, target_table, target_id, payload
  from public.audit_log
  where actor_id = '[user_uuid]'
  order by id desc
  limit 50;
```

## Find the storage object behind a broken URL

If a user says their avatar / DM attachment isn't loading:

```sql
-- Get the URL on file
select id, username, avatar_url from public.profiles where id = '[user_uuid]';

-- Then in Studio: Storage → avatars (or dm-attachments) → search for the path
-- The path is the bit after /avatars/ or /dm-attachments/ in the URL.
```

## ⚠️ Recipes that change data (founder approval required)

Don't run these without a green light from the founder. They exist here for reference.

### Mark a notification as read (rarely needed; user can do this in the UI)

```sql
update public.notifications
  set read_at = now()
  where id = '[notification_uuid]';
```

### Withdraw an application on behalf of a user

```sql
update public.applications
  set status = 'withdrawn'
  where id = '[application_uuid]' and applicant_id = '[user_uuid]';
```

### Close a gig

```sql
update public.gigs
  set status = 'closed'
  where id = '[gig_uuid]' and owner_id = '[user_uuid]';
```

### Apply a soft ban (24h pause on a single action)

```sql
-- e.g. pause posting for 24h
update public.profiles
  set restrictions = restrictions || jsonb_build_object(
    'cannot_post_until', (now() + interval '24 hours')::text
  )
  where id = '[user_uuid]';

insert into public.restriction_events (user_id, action, reason, until, actor)
  values ('[user_uuid]', 'cannot_post', '[short reason]',
          now() + interval '24 hours', 'support');
```

### Clear a restriction

```sql
update public.profiles
  set restrictions = restrictions - 'cannot_post_until'
  where id = '[user_uuid]';

insert into public.restriction_events (user_id, action, reason, actor)
  values ('[user_uuid]', 'cleared', '[reason]', 'support');
```
