# 06 — Gigs & applications

The core marketplace flow: someone posts a gig, others apply, owner accepts/rejects.

## Gig lifecycle

```
draft (owner only) ──→ open (public) ──→ closed (visible to owner + applicants)
                            │
                            └──(owner edits)──→ open (republish)
```

A gig at `open` is searchable in the feed. At `closed`, it disappears from the feed but stays visible to the owner and anyone who already applied — so their application history doesn't go blank.

## Application lifecycle

```
pending ──→ accepted   (owner approved)
        ──→ rejected   (owner declined)
        ──→ withdrawn  (applicant pulled out)
```

A user can apply at most once per gig (DB-enforced unique constraint). Once status is non-`pending`, the row is effectively immutable — there's no DELETE, only status transitions.

## Scenario: "I posted a gig but I can't see it in the feed"

**First check** — what state is the gig in?

```sql
select id, title, owner_id, status, created_at, deadline,
       boosted_until, comp, role
  from public.gigs
  where owner_id = '[user_uuid]'
  order by created_at desc
  limit 5;
```

**Common causes**

1. **Gig is `draft` or `closed`.** Drafts don't appear in the feed. Closed gigs don't either.
2. **Feed filters are excluding it.** The user has filters set (role, genre, location, comp type) that don't match their gig. Easy: they should clear all filters and search.
3. **Boost prioritization pushes it down.** Recent boosted gigs sort above their non-boosted gig. They might just need to scroll.
4. **Deadline passed.** If a gig's `deadline` is in the past, it stays `open` but some clients may hide it. Verify in DB.

**Resolution**

For 1: tell them how to publish (Edit → Status → Open).

For 2: walk them through clearing filters.

For 3 & 4: explain ranking, and offer to boost if they have credits (boost flow is future-state).

## Scenario: "I can't post a gig" (button does nothing / error)

**First check** — are they restricted?

```sql
select id, username, restrictions
  from public.profiles
  where id = '[user_uuid]';
```

If `restrictions.cannot_post_until` is in the future, they're soft-banned from posting. Don't reveal the ban exists; instead say "we'll need to look into your account" and 🚨 escalate to founder.

**Common causes**

1. **Validation failed.** Title is required and must be 4–140 chars. Description is capped at 4000. Role must be one of the allowed roles. Pay amount must be numeric if comp type is "paid".
2. **They're not signed in.** Session expired silently. Tell them to refresh and sign in again.
3. **Network failure on submit.** Connection cut mid-request. Tell them to try again — gigs are NOT half-submitted; the insert is atomic.
4. **Restricted (see above).**

**Resolution**

For 1: ask for screenshot of the form. The validation errors should be visible; if not, that's a UI bug to escalate.

For 2–3: refresh and retry.

## Scenario: "I applied to a gig but my application isn't showing up"

**First check** — does the row exist?

```sql
select a.id, a.status, a.created_at, a.pitch is not null as has_pitch,
       g.title as gig_title, g.status as gig_status
  from public.applications a
  join public.gigs g on g.id = a.gig_id
  where a.applicant_id = '[user_uuid]'
    and g.id = '[gig_uuid]';
```

**Possible states**

| Result | Diagnosis |
|---|---|
| Row exists, status=`pending` | Application worked. Owner just hasn't responded yet. Tell user. |
| Row exists, status=`accepted` | They were accepted. Notification probably failed. |
| Row exists, status=`rejected` | They were rejected. They may not have noticed the rejection. Be careful how you tell them — it's not your role to soften a rejection, just to confirm. |
| Row exists, status=`withdrawn` | They withdrew their own application. They might not remember. |
| No row | The application never got through. |

For "no row":

1. Are they applying to their OWN gig? Self-application is blocked by the RLS policy. The UI should prevent this but verify they're not the owner.
2. Is the gig still `open`? You can't apply to a `closed` or `draft` gig.
3. Did they hit the unique constraint? They might already have an application on that gig (different status). Re-run the query above without the gig_id filter to see all their applications, find any on that gig.
4. Network failure on submit. Try again.

## Scenario: "I accepted an application but the applicant says they can't see it"

**Check the application status:**

```sql
select id, status, updated_at, applicant_id, gig_id
  from public.applications
  where id = '[application_uuid]';
```

If `status = 'accepted'` and `updated_at` is recent, the accept took effect.

**Then check the applicant's notification:**

```sql
select id, kind, created_at, read_at
  from public.notifications
  where user_id = '[applicant_uuid]'
    and application_id = '[application_uuid]'
  order by created_at desc;
```

There should be a `notification_kind = 'application_accepted'` row. If it's missing, the trigger failed — 🚨 escalate.

**Resolution**

Tell the applicant: "I confirmed the owner accepted your application on [date]. Check your **My applications** page (the Active tab) — you should see it there. The notification didn't reach you because [cause], but the acceptance is real."

## Scenario: "I want to withdraw my application"

The user can do this themselves from `applications.html`. If they can't, check:

1. Is the application status already `withdrawn` / `rejected` / `accepted`? You can only withdraw from `pending`.
2. RLS — the withdraw flow is one of the few UPDATEs the applicant is allowed to do, and only to set status to `withdrawn`. If it's failing, 🚨 escalate.

If you need to withdraw on their behalf (rare), use the cookbook recipe under ⚠️ section — founder approval first.

## Scenario: "I closed a gig but my applicants can't see it anymore"

This is the intended behaviour, but it surprises users. Tell them:

> When you close a gig, it disappears from the public feed, but anyone who already applied to it can still see it on their **My applications** page. So if your applicants tell you they can't see it — they should be checking their applications, not browsing the feed.

If an applicant genuinely cannot see a gig they applied to, check `applications` for their row, and verify the gig isn't deleted (it shouldn't be — we don't delete gigs).

## Scenario: "I want to delete a gig"

We don't allow deletes via the UI; we only allow status changes. This is deliberate — applications attached to the gig need to keep working.

Tell them to close it instead. If they really need it gone (e.g. they posted something sensitive by mistake), 🚨 escalate. Founder will decide whether to delete.

## Scenario: "Two people applied with the exact same pitch — is this spam?"

Check both applicants — if they're separate accounts but identical pitches, it could be:

- A copy-paste from a template they both found online (annoying but not abuse)
- A single user with two accounts (sockpuppetry — against ToS)
- A spam ring (rare at our scale, but possible)

Compare their accounts:

```sql
select p.id, p.username, p.display_name, u.email, u.created_at, u.last_sign_in_at
  from public.profiles p
  join auth.users u on u.id = p.id
  where p.id in ('[applicant_1]', '[applicant_2]');
```

Same email domain + same recent creation date + similar usernames = strong sockpuppet signal. 🚨 escalate.

## Investigation checklist for any gig/application ticket

1. Identify the gig (UUID).
2. Identify the applicant (UUID).
3. Check the gig's `status` and `created_at`.
4. Check the application's `status` and `created_at`.
5. Check the relevant `notifications` row.
6. If the user is restricted, see `09-trust-safety.md`.
