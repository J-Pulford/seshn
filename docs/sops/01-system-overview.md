# 01 — System overview

The mental model you need before touching any ticket.

## What Seshn is

A marketplace for music collaboration. Two roles:

- **Owner** — someone with a project, posts a "gig" describing what help they need (e.g. "vocalist for a chorus", "mix engineer for an EP")
- **Collaborator / Applicant** — someone who applies to a gig with a pitch

When the owner accepts an application, the two parties can:
1. Chat in DMs
2. Sign a **collaboration agreement** (a per-deal contract)
3. Fund an **escrow** via Stripe Connect
4. Deliver the work; funds release on owner approval or after the approval window

A user can be both — anyone can post gigs AND apply to others' gigs from the same profile.

## Data model (just the tables a support agent needs)

These are the production tables. See `supabase/migrations/` for the full schema.

| Table | What's in it | Key columns |
|---|---|---|
| `profiles` | The public-facing user record (1:1 with `auth.users`) | `id`, `username`, `display_name`, `is_pro`, `restrictions`, `stripe_account_id` |
| `gigs` | A collaboration brief | `id`, `owner_id`, `title`, `role`, `status` (`open`/`closed`/`draft`) |
| `applications` | A pitch for one gig from one user | `id`, `gig_id`, `applicant_id`, `pitch`, `status` (`pending`/`accepted`/`rejected`/`withdrawn`) |
| `conversations` | A DM thread between two users (1:1 only) | `id`, `user_a`, `user_b` |
| `messages` | One message in a conversation | `id`, `conversation_id`, `sender_id`, `body`, `attachment_url` |
| `notifications` | The bell feed (and read-state) | `id`, `user_id`, `kind`, `read_at` |
| `connected_accounts` | Linked Spotify/SoundCloud/etc accounts on a profile | `user_id`, `provider`, `stats` (jsonb) |
| `contracts` | A signed collaboration agreement | `id`, `owner_id`, `collaborator_id`, `status` (`draft`/`awaiting_signatures`/`active`/`completed`/`cancelled`) |
| `escrows` | The funds-holding state machine for a contract | `id`, `contract_id`, `status`, `amount_cents`, `currency` |
| `deliverables` | Files/links the collaborator submitted | `id`, `escrow_id`, `kind`, `file_url` |
| `disputes` | Either party flagged a problem with an escrow | `id`, `escrow_id`, `opened_by`, `status`, `reason` |
| `restriction_events` | History of soft/hard bans applied to a user | `id`, `user_id`, `action`, `reason`, `until` |
| `audit_log` | Append-only log of security-sensitive transitions | `actor_id`, `action`, `target_table`, `target_id`, `payload` |

## The "who can read/write what" rules (RLS)

Row-level security (RLS) is on every table. Most rules to know:

- **profiles**: public-read, owner-write. Anyone can see anyone's profile; only the owner can edit theirs.
- **gigs**: `open` gigs are public-read. `closed` gigs are visible to the owner and to anyone who applied. `draft` gigs are owner-only.
- **applications**: visible only to the applicant and the gig owner. Nobody else.
- **messages**: visible only to the two conversation participants.
- **notifications**: visible only to the recipient.
- **contracts**: visible only to the two contract parties.
- **escrows / deliverables / disputes**: visible only to the two contract parties.
- **audit_log**: not user-visible. Service role only.

This means: **the support agent cannot see most user-private data from the user's perspective.** You need to query via Supabase Studio with the service role.

## What can fail at each step (and where to look)

```
sign up ────────── auth.users (Supabase Auth)
   │
   ↓
onboarding ─────── profiles (username, display_name set here)
   │
   ↓
post gig / apply ─ gigs / applications
   │
   ↓
chat ───────────── conversations / messages
   │
   ↓
contract ───────── contracts (with terms in jsonb)
   │
   ↓
escrow funded ──── escrows + Stripe Connect (PaymentIntent)
   │
   ↓
delivered ──────── deliverables (+ escrow.status = 'delivered')
   │
   ↓
released ───────── escrow.status = 'released' + Stripe transfer
   ↑
   └── dispute? ── disputes (pauses auto-release)
```

A ticket usually maps to exactly one step in this pipeline. Identify the step first, then go to the matching SOP.

## Conventions in the codebase

- All money in `bigint` cents. `7500` = $75.00. Never floats.
- All currency as ISO 4217 ("AUD", "USD"). Validated at the schema level.
- All timestamps are `timestamptz` (UTC). Display in user's local time.
- `created_at` / `updated_at` on most tables. Updated_at is maintained by a trigger.
- Soft-delete is rare. Most "delete" actions cascade or set a status flag.
- Status enums are stored as `text` with check constraints — read them like enum values.

## Where logs and evidence live

| Source | What it contains | How to query |
|---|---|---|
| `audit_log` table | Contract signing events, sensitive state changes (with IP + UA) | SQL via Supabase Studio |
| Supabase Auth logs | Sign-in attempts, magic link sends, OAuth flows | Auth → Logs tab in Studio |
| Supabase function logs | Server-side errors from edge functions and triggers | Database → Logs tab |
| Stripe events | Payment intent lifecycle, payout status (when wired) | Stripe Dashboard → Events |
| Supabase Storage objects | Avatars, DM attachments, contract PDFs | Storage tab in Studio |

## Identifying a user

Tickets come with email, username, or "the user @sammy" — convert to a `user_id` (UUID) first:

```sql
-- By email
select id, email, created_at
  from auth.users
  where email ilike 'sammy%';

-- By username
select id, username, display_name, created_at, is_pro
  from public.profiles
  where username = 'sammy';

-- By rough name (last resort)
select id, username, display_name
  from public.profiles
  where display_name ilike '%sammy%';
```

Always confirm the right user before acting — names are not unique, usernames are. If you're unsure, write back to the ticket and ask for their username or the email they signed up with.

## A typical investigation has 4 steps

1. **Identify the user(s)** — get the UUID(s)
2. **Identify the entity** — gig id, application id, contract id, etc
3. **Read the state** — what does the DB say happened?
4. **Compare to the user's claim** — does the state match what they think happened?

Step 4 is where the real diagnosis lives. The user thinks they sent a message; the DB shows the message row exists but the recipient's `notifications` row is missing — that's a notification bug, not a messaging bug.
