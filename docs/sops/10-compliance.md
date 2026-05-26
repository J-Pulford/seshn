# 10 — Compliance

Australian Privacy Principles (APP), GDPR / UK GDPR, data exports, legal requests.

🚨 **Most of this category is founder-action.** Tier-1 receives the request, verifies identity, prepares the file, and hands off. Never confirm a deletion or export without founder sign-off.

## What law applies

Seshn Pty Ltd is registered in NSW, Australia. We're bound by:

- **The Privacy Act 1988 (Cth) — Australian Privacy Principles (APP)** for all users
- **GDPR / UK GDPR** for users in the EU / UK (we have users there in practice)
- **CCPA / CPRA** for users in California, US (if we get traffic — not actively flagged today)
- **PIPEDA** for users in Canada (similar to APP, not actively flagged)

Practical rule: when in doubt, treat every privacy request as if both APP and GDPR apply. They're 90% the same.

## The four request types

| Request | What user wants | Our SLA |
|---|---|---|
| **Access** ("send me a copy of my data") | A copy of everything we have about them | 30 days (GDPR), 30 days (APP) |
| **Correction** ("change my X") | A specific data field updated | 30 days |
| **Deletion** ("delete my account / data") | Their data removed | 30 days |
| **Portability** ("export it in a machine-readable format") | A copy in JSON/CSV | 30 days |

We aim for under 14 days in practice. 30 days is the legal max.

## Step 1 (every request): Verify identity

🚨 **Do not action any of the above without confirming the requester is the account holder.**

Verification options, in order of preference:

1. **Request from a device with a known-good session.** If the request comes via the in-app support form (when we build it), they're authenticated.
2. **Reply from the same email as the account.** Confirm via `auth.users.email`. ⚠️ Email is forgeable in the headers; check the actual sender domain in the email's full headers.
3. **Reply via a previously-used support thread** where we've already verified them.
4. **Specific knowledge questions**: ask for their username, signup approximate date, a gig title they posted, etc. Things only they would know.

If verification fails, **do not proceed**. Reply:

> To make sure we're handling your data securely, we need to confirm you're the account holder. Could you reply from the email address associated with your Seshn account, and include your username? Thanks for understanding the extra step.

## Step 2: Check for blockers

Some requests can't be actioned immediately. The DB needs to be clean first.

For **deletion** specifically:

```sql
-- Open contracts (any non-terminal status)
select id, status from public.contracts
  where (owner_id = '[user_uuid]' or collaborator_id = '[user_uuid]')
    and status in ('draft', 'awaiting_signatures', 'active');

-- Open escrows (funds in flight)
select e.id, e.status, e.amount_cents, e.currency
  from public.escrows e
  join public.contracts c on c.id = e.contract_id
  where (c.owner_id = '[user_uuid]' or c.collaborator_id = '[user_uuid]')
    and e.status in ('funded', 'delivered', 'disputed');
```

If any rows: deletion is paused until those resolve. Tell the user. Don't promise a specific timeline — depends on the other party.

## Access / portability (data export)

The cleanest SQL bundle for an export:

```sql
-- 1. Profile
select * from public.profiles where id = '[user_uuid]';

-- 2. Connected accounts
select * from public.connected_accounts where user_id = '[user_uuid]';

-- 3. Their gigs
select * from public.gigs where owner_id = '[user_uuid]';

-- 4. Their applications
select * from public.applications where applicant_id = '[user_uuid]';

-- 5. Applications received on their gigs
select a.* from public.applications a
  join public.gigs g on g.id = a.gig_id
  where g.owner_id = '[user_uuid]';

-- 6. Conversations they're in
select * from public.conversations
  where user_a = '[user_uuid]' or user_b = '[user_uuid]';

-- 7. Messages they sent
select * from public.messages where sender_id = '[user_uuid]';

-- 8. Notifications addressed to them
select * from public.notifications where user_id = '[user_uuid]';

-- 9. Contracts they're party to
select * from public.contracts
  where owner_id = '[user_uuid]' or collaborator_id = '[user_uuid]';

-- 10. Escrows they're party to (via contracts)
select e.* from public.escrows e
  join public.contracts c on c.id = e.contract_id
  where c.owner_id = '[user_uuid]' or c.collaborator_id = '[user_uuid]';

-- 11. Their auth record (limited — only their own data, not internal Supabase fields)
select id, email, created_at, last_sign_in_at, email_confirmed_at
  from auth.users where id = '[user_uuid]';

-- 12. Audit log entries about them
select * from public.audit_log
  where actor_id = '[user_uuid]'
    or (target_table = 'profiles' and target_id::uuid = '[user_uuid]');

-- 13. Restriction history
select * from public.restriction_events where user_id = '[user_uuid]';
```

Export each result set as CSV (Studio supports CSV export from the result grid) or JSON. Zip them. 🚨 Founder approves before the file is sent. Send via a secure channel (the support email is fine if we don't have a portal yet).

**What we exclude from the export:**

- Other users' message bodies in conversations they're part of (those are joint records; we send the user only their own sent messages).
- Other users' personal data (the export doesn't include the other party's email, IP, etc).
- Internal-only fields (e.g. Supabase Auth internal metadata, our audit log entries about other people).

## Correction

"Change my email" / "Update my display name" — most of these are user-self-service via the Settings page. Only escalate if the user can't access settings for some reason.

For email change specifically: see `04-auth.md`.

## Deletion (the hard one)

The deletion flow:

1. Verify identity (above).
2. Check blockers (above). Wait for resolution.
3. 🚨 Founder reviews and approves.
4. Founder sets `deletion_requested_at` on the profile.
5. A worker job (planned; until then, manual SQL) does the actual delete after a brief grace period (e.g. 7 days, to allow accidental requests to be reversed).
6. Send the user a confirmation email when done.

**What gets deleted:**

- `profiles` row → cascades to `applications`, `gigs`, `connected_accounts`, `messages`, `notifications`, `restriction_events`.
- `conversations` row only deletes if the other participant is also deleted; otherwise it stays (it's a joint record).
- `auth.users` row → done via Supabase Admin API.
- Storage objects in `/avatars/[user_id]/`, `/covers/[user_id]/`, `/dm-attachments/[user_id]/` → manual storage cleanup.

**What we retain (and tell the user):**

- `audit_log` rows about contract signings (kept for 7 years for legal/tax — anonymised where possible by replacing `actor_id` with NULL after deletion, but the action record itself stays).
- `contracts`, `escrows`, `deliverables`, `disputes` they were party to — kept for 7 years (transaction records under the Corporations Act and ATO record-keeping rules). The other party also needs access to these.
- Aggregated, anonymised analytics data.

Be explicit with the user about what stays. Use the template in `03-templates.md`.

## Legal requests (subpoena, court order, police request)

🚨 **Immediate founder escalation. Tier-1 does not respond directly to law enforcement under any circumstances.**

Workflow:

1. Receive the request. Acknowledge receipt only — "Thanks for your email, this has been forwarded to our legal team."
2. Forward the full email + attachments to founder.
3. Founder verifies the request (calls back the agency on a published number) before producing data.
4. Founder reviews scope with legal counsel before responding.

We comply with valid Australian legal process. We don't respond to informal requests ("hey can you tell me…" from a non-official channel) — those go back to legal channels.

## Breach handling

If we suspect a data breach (a database leak, a credential compromise, a stolen Stripe key, a successful XSS on the platform):

🚨 **Immediate founder escalation. Treat as P0 incident.**

Under the **Notifiable Data Breaches scheme** (Australian Privacy Act Part IIIC) we have **30 days** to assess and notify the OAIC + affected individuals if the breach is likely to cause serious harm.

We don't discuss breaches with users until founder gives us specific language. "I'm not sure, I'm checking" is the right holding message — not "yes there's a breach" and not "no there isn't."

## Documentation hygiene

Every data request — regardless of outcome — should leave a paper trail. Founder maintains a separate (internal) log with:

- Requester identity verification used
- Date received
- Date actioned
- Type of request
- Data scope
- Confirmation sent to user

Don't leave this informal. Audits will look at it.
