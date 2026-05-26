# 09 — Trust & safety

Abuse reports, harassment, bans (soft/hard), takedowns, sockpuppetry.

🚨 Most of this category is founder-escalation. Tier-1 collects evidence and prepares the file; the founder makes the call on bans.

## The restriction system (recap)

We have three soft-ban states on a profile:

- `cannot_post_until` — can't post new gigs
- `cannot_apply_until` — can't apply to gigs
- `cannot_pay_until` — can't fund an escrow

Each is a timestamp. If absent or in the past, the user is not restricted. The fast-read mirror is `profiles.restrictions` jsonb. The audit trail is `restriction_events`.

A **hard ban** is the same mechanism but with a far-future timestamp (e.g. `9999-12-31`) — semantically permanent. We also set `auth.users.banned_until` for hard bans so they can't sign in at all.

## Scenario: "I want to report a user"

**Steps**

1. Acknowledge the report within an hour.
2. Collect details: what user, what behaviour, screenshots if any, when it happened, what messages were involved.
3. Investigate (see below) and 🚨 hand off to founder with your findings.

**Investigation**

Pull the reported user's record:

```sql
select p.id, p.username, p.display_name, p.created_at, p.is_pro, p.restrictions,
       u.email, u.last_sign_in_at, u.banned_until
  from public.profiles p
  join auth.users u on u.id = p.id
  where p.username = '[reported_username]';
```

Recent activity:

```sql
-- Their gigs
select id, title, status, created_at from public.gigs
  where owner_id = '[reported_uuid]' order by created_at desc limit 10;

-- Their applications
select a.id, g.title, a.status, a.created_at, length(a.pitch) as pitch_len
  from public.applications a join public.gigs g on g.id = a.gig_id
  where a.applicant_id = '[reported_uuid]' order by a.created_at desc limit 10;
```

If the report involves messages between the reporter and the reported, **do not read message bodies without explicit founder approval**. You can confirm a conversation exists and how many messages were exchanged, but the content is private. The reporter can forward screenshots; that's the appropriate evidence.

Prior reports on this user? Check audit_log:

```sql
select id, created_at, action, payload
  from public.audit_log
  where target_table = 'profiles'
    and target_id = '[reported_uuid]'
    and action in ('user_reported', 'restriction_applied', 'restriction_cleared')
  order by id desc;
```

## Scenario: User is being harassed in DMs

Immediate steps:

1. Reassure the reporter — "I've got this, give me a few hours."
2. We don't currently have a block feature in the UI. Workaround: 🚨 escalate to founder, who can apply a `cannot_apply` and/or `cannot_pay` restriction to the harasser AND optionally close any in-progress conversation between them.
3. If the harassment is severe (threats, doxxing, CSAM), see "Severe content" below.

## Scenario: Spam / scam pattern

Signals:

- Profile created within last 24h
- Posted N gigs in <1 hour
- Applied to N gigs with identical pitches
- Pitch contains contact info ("DM me on telegram @x") trying to move users off-platform
- Display name or bio contains a URL to an external service

**Process**

1. Pull a list of all their activity (gigs, applications, messages) for evidence.
2. Soft-ban (`cannot_post`, `cannot_apply`, `cannot_pay` — all three) with a 24h timestamp. SQL is in `02-cookbook.md`.
3. 🚨 Send the evidence file to founder with a recommendation. Founder decides on hard ban.

For obvious scams (e.g. "send me $50 to unlock your account"), the soft-ban can be 7-day rather than 24h.

## Scenario: Sockpuppetry (same person, multiple accounts)

Signals:

- Same IP across signups (visible in `audit_log.ip` for contract signings; harder to see for gig posts since we don't currently log IP at gig insert)
- Same email domain + suspicious pattern (e.g. `samuel@…`, `samuel2@…`, `samuelL@…`)
- Same writing style across pitches/gigs
- Accounts upvoting / messaging each other immediately on signup

**Process**

1. Compile evidence: signup times, emails, usernames, recent activity for each account.
2. 🚨 Founder decides which accounts to keep + ban. Tier-1 doesn't make this call.

## Scenario: Severe content (threats, CSAM, illegal activity)

🚨 **STOP all other work. Do not download or forward the evidence. Escalate immediately to founder.**

For CSAM specifically:
- Do NOT view, download, or screenshot the material.
- Note the URL or storage path; share only the path with founder.
- Founder will preserve evidence per legal requirements and report to the AFP-led ACCCE (Australian Centre to Counter Child Exploitation).

For credible violence threats:
- 🚨 Founder + Australian Federal Police if the threat is imminent.

For other illegal content (drug sales, weapons, etc):
- 🚨 Founder. Don't engage with the reporter directly until founder agrees on the response.

## Scenario: A user wants their content removed (own content)

If they posted a gig or message they regret, see `06-gigs-applications.md` and `07-messaging-notifications.md` — these have specific guidance. Short version: gigs can be closed but not deleted; messages can't be deleted by users (founder-only for genuine emergencies).

If they're asking for their ENTIRE profile data removed → see `10-compliance.md`.

## Scenario: A user wants someone ELSE's content removed (impersonation, copyright)

Three sub-cases:

**Impersonation of them**:
- Get evidence they are who they say they are (real-name verification — government ID via secure channel after founder approval).
- 🚨 Founder reviews.

**Copyright infringement (DMCA-style request, even though we're AU-based)**:
- They send a takedown notice. Includes: identification of the work, identification of the infringing material, a sworn statement, signature.
- 🚨 Founder handles. We have a takedown process aligned with the AU Copyright Act 1968 (Part V Division 2AA) — founder runs it.

**Defamation**:
- Get specifics. Don't promise removal. 🚨 Founder reviews with legal.

## Applying restrictions (when authorised by founder)

The SQL is in `02-cookbook.md` under the ⚠️ section. The key principle: **every restriction must have a corresponding `restriction_events` row** so we have audit history. Don't update `profiles.restrictions` without also inserting an event.

Template comment when applying:

```sql
-- e.g. 7-day cannot_apply ban for spam pattern (ticket #1234)
update public.profiles
  set restrictions = restrictions || jsonb_build_object(
    'cannot_apply_until', (now() + interval '7 days')::text
  )
  where id = '[user_uuid]';

insert into public.restriction_events (user_id, action, reason, until, actor)
  values ('[user_uuid]', 'cannot_apply',
          'Identical pitch spam across 20+ gigs in 1 hour. Ticket #1234.',
          now() + interval '7 days', 'support');
```

Always cite the ticket number in the reason.

## Lifting restrictions

If the user appeals successfully (or founder decides on review that the restriction was wrong):

```sql
update public.profiles
  set restrictions = restrictions - 'cannot_apply_until'
  where id = '[user_uuid]';

insert into public.restriction_events (user_id, action, reason, actor)
  values ('[user_uuid]', 'cleared', 'Founder review reversed restriction. Ticket #1234.', 'support');
```

## Communications

Don't tell a user the exact text of a restriction reason — that's internal. Use the templates in `03-templates.md`. The user-facing message is:

> Your account has been restricted from [action] until [date]. The reason: [high-level summary, e.g. "posting patterns that violated our community guidelines"]. If you think this is a mistake, reply here and we'll re-review.

Always offer the appeal path.
