# Seshn — Support SOPs

A field guide for handling support tickets, abuse reports, and operational issues on the Seshn platform. Designed to be read by either a human virtual assistant (VA) or an AI agent acting as tier-1 support.

## How to use this with an AI

Give the AI this prompt as a system message, then paste the ticket:

> You are a tier-1 support agent for Seshn, a music collaboration marketplace. Before you respond to the ticket below, read the relevant SOPs in `docs/sops/`. Each file is self-contained — start with `README.md` to pick the right one, then read just that file. Investigate using read-only Supabase queries (Studio SQL editor). Never run a destructive query. Never message the user under your own name — always draft a reply for human review. Escalate to the founder using the rules in this README. Reply with: (1) what you investigated, (2) what you found, (3) the draft user-facing message, (4) any escalation flag.
>
> The ticket: [paste]

## How to use this with a human VA

Onboard them by reading the files in order: `01` → `09`. They should bookmark `02-cookbook.md` (the SQL snippets) and `03-templates.md` (the message templates). Most tickets in the first 6 months will be handled by `04-auth.md`, `05-profiles.md`, and `06-gigs-applications.md`.

## File index

| # | File | What it covers |
|---|---|---|
| 01 | [system-overview.md](01-system-overview.md) | Mental model: what Seshn is, the data model, who can do what, the tools you have |
| 02 | [cookbook.md](02-cookbook.md) | Copy-paste SQL queries for the most common investigation moves |
| 03 | [templates.md](03-templates.md) | Boilerplate user-facing messages for the most common situations |
| 04 | [auth.md](04-auth.md) | Sign-in trouble, magic link issues, OAuth, account deletion |
| 05 | [profiles.md](05-profiles.md) | Profile edits, avatars, usernames, connected accounts (Spotify etc) |
| 06 | [gigs-applications.md](06-gigs-applications.md) | Posting a gig, applying to one, status changes, visibility |
| 07 | [messaging-notifications.md](07-messaging-notifications.md) | DMs, attachments, notifications, bell, realtime |
| 08 | [contracts-escrow.md](08-contracts-escrow.md) | Contract signing, escrow lifecycle, deliveries, disputes |
| 09 | [trust-safety.md](09-trust-safety.md) | Abuse reports, bans (soft/hard), restrictions, takedowns |
| 10 | [compliance.md](10-compliance.md) | GDPR / Australian Privacy Principles, data exports, legal requests |

## Escalate to the founder if

Any of the following — do not attempt to resolve solo:

1. **Money is involved** — funded escrow, refunds, payouts, chargebacks, Stripe disputes
2. **Legal request** — subpoena, court order, lawyer letter, takedown notice (DMCA), police request
3. **Data deletion request from an EU/UK/AU/CA resident** — must be confirmed via the formal flow (see `10-compliance.md`)
4. **Reported sexual content involving a minor** — STOP all other work, escalate immediately, do not download/forward evidence
5. **Anything involving a verified pro account or label partnership** — these are relationship-managed, never handled tier-1
6. **A user claims you (the support agent) wronged them in a previous ticket** — always re-route to founder
7. **You cannot reproduce the bug and the user has tried it 2+ times** — engineering, not support

## Tools you have

| Tool | What it's for | Access |
|---|---|---|
| Supabase Studio (SQL editor) | Investigation queries, profile lookups | Read-only role for VAs; service role only for emergency fixes |
| Supabase Auth dashboard | Verify a user exists, resend magic link | Read-only for VAs |
| Supabase Storage browser | Check if an avatar/attachment actually uploaded | Read-only |
| Stripe dashboard | Payment lookups, payout status (when wired up) | Read-only for VAs |
| Email inbox (support@seshn.[tld]) | Reading tickets, drafting replies | Yes |
| Internal dashboard (TODO) | Ban/unban, manual notification sends, refund triggers | Built later — for now, these are SQL ops gated by the founder |

## Things you must never do

- Run a SQL `UPDATE`, `DELETE`, or `INSERT` against the production database without explicit founder approval. Investigation is read-only.
- Send a message to a user from a personal email — always reply from `support@seshn.[tld]`.
- Promise a refund. Stripe refunds go through the founder. You can promise to "look into it" — never "you'll have your money back by Friday."
- Reveal another user's email, real name, IP, or any data the requesting user wouldn't already know. Even if the requester says they're the other party.
- Ban a user. Restrictions go through the founder's review. You can flag a profile in the `trust_flags` queue (see `09-trust-safety.md`).
- Modify a contract or escrow row directly. All contract state changes go through the RPC functions (`sign_contract`, `send_contract`, `cancel_contract`).

## How to write a good reply

Three rules, in order:

1. **Acknowledge the impact first**, not the cause. "I can see this has been frustrating — let me get to the bottom of it" beats "This is happening because of an RLS policy mismatch."
2. **Tell them what you did or are doing**, not just what they should do. "I've checked your account and I can see the application was submitted at 14:32" beats "Have you tried refreshing?"
3. **Set a next step or expectation**, even if it's "I'll come back to you within 4 hours."

Avoid: copy-pasted scripts, jargon (RLS, schema, JWT), "as per our policy", "unfortunately", "for security reasons" without an actual reason.

## Document conventions

- **bold** = the user-facing label or button
- `code` = the technical name (table, column, function)
- `[placeholder]` = something to fill in from the ticket
- → = "next step"
- 🚨 = escalation
- ⚠️ = caution
