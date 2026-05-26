# 04 — Authentication & accounts

Sign-in trouble, magic links, OAuth, account deletion. These are the highest-frequency tickets.

## How Seshn auth works (in 60 seconds)

- Supabase Auth manages the user table (`auth.users`).
- Two sign-in methods:
  1. **Magic link** — user enters email, gets a one-time link, clicks it, signed in.
  2. **Google OAuth** — user clicks "Continue with Google", redirects to Google, returns signed in.
- No passwords. Ever. There's nothing to "reset" — the only flow is the same magic-link flow.
- Sessions are JWTs stored in localStorage. They auto-refresh while the tab is open.
- A new user lands on `onboarding.html` and must pick a username + display name before they can do anything else. `profiles.username` is the unique identifier.

## Scenario: "I'm not getting the magic link email"

**First check (15 seconds)**

Is the email correct?

```sql
select id, email, last_sign_in_at, email_confirmed_at, banned_until
  from auth.users
  where email ilike '[email_from_ticket]';
```

If the row exists, the address is right. If not, they might be typing it wrong — ask them to double-check.

**Common causes, in order of likelihood**

1. **Email in spam folder** (60% of cases). The from-address is `noreply@mail.app.supabase.io` or our custom domain — both end up in spam reasonably often. Ask them to check.
2. **Wrong email typed.** They typed `gmail.con` instead of `gmail.com`, or used a different email than they thought.
3. **Rate-limited.** Supabase rate-limits magic links to 4 per hour per email. Check Auth → Logs in Studio for `email_rate_limit_exceeded`.
4. **Email infrastructure issue.** Supabase had a Resend outage; or our DNS records are misconfigured. Check Auth → Logs for `email_delivery_failed`.
5. **`banned_until` is set on the row.** Someone applied an auth ban. Investigate `restrictions` and `restriction_events` for context — escalate to founder if unclear.

**Resolution**

If spam folder: ask them to check, then mark `noreply@…` as not-spam. Template: see `03-templates.md`.

If rate-limited: tell them to wait an hour and try again, OR resend manually from Studio (Auth → User → "Send magic link").

If email infrastructure: 🚨 escalate to founder. There's a system issue, not a user issue.

If `banned_until`: 🚨 escalate to founder. This was deliberate.

## Scenario: "Google sign-in shows an error"

**First check**

What's the exact error text? The most common errors and their causes:

| Error message | Cause |
|---|---|
| "Email link is invalid or has expired" | The OAuth link from Google expired (24h). They need to redo the flow. |
| "Server error. Please try again." | Could be a Supabase transient issue OR our redirect URL is misconfigured. Check Auth → Providers → Google in Studio: the redirect URLs must include `https://app.seshn.[tld]/app/auth.html` and the Supabase callback URL. |
| "Access denied" | They cancelled the Google consent screen. They need to click "Allow" this time. |
| Lands on a blank page after Google | Our `auth.html` failed to load. Browser/network issue on their end usually. |

**Resolution**

For everything except a misconfigured redirect URL: ask them to retry. If it fails twice, fall back to magic link.

For a misconfigured redirect URL: 🚨 founder. We don't fix auth provider settings under tickets — it's a production-affecting change.

## Scenario: "I signed in but I'm on the wrong screen"

User says: "I signed in but it just dumps me on the home page" or "I keep getting bounced to onboarding".

**Check whether they completed onboarding**

```sql
select id, username, display_name, created_at
  from public.profiles
  where id = '[user_id]';
```

- No row → they never completed onboarding. Send them to `/app/onboarding.html` directly.
- Row exists with empty `username` → also incomplete onboarding (rare but possible). Same fix.
- Row exists with username → they've completed onboarding. Likely a routing bug; ask for screenshots, then 🚨 escalate.

## Scenario: "I want to change my email"

There's no in-app UI for this yet, but it's possible. **Requires identity verification first.**

Identity verification means: reply must come from a device that's signed in to the account already (we can confirm by looking at last_sign_in_at vs the email timestamps), AND they must answer a "what only you would know" question (gig title they posted, person they messaged, etc).

Once verified, 🚨 the actual email change is a founder action (Auth → User → Edit email in Studio). Don't do it yourself.

## Scenario: "I want to delete my account"

🚨 **Read `10-compliance.md` first.** This has legal implications under the Australian Privacy Principles (APP) and GDPR (for EU/UK users).

Briefly:
1. Confirm the request via the user's signed-in device (anti-impersonation).
2. Check for open contracts/escrows. If any, those must be wound down before deletion.
3. Tell them what gets deleted and what's retained (transaction records for tax/legal).
4. Once they confirm, set `deletion_requested_at` on their profile. The actual delete runs as a worker job (built later; until then, founder action).

The full template + the legal text is in `03-templates.md` and `10-compliance.md`.

## Scenario: "Someone created an account using my email"

**First step: confirm.** Anyone can claim this; we need evidence. Ask them to:
- Send the email they're concerned about
- Confirm they did NOT sign up for Seshn themselves
- Confirm they haven't received a magic link they didn't request

If they confirm: check `auth.users` for the row. Two possible explanations:

1. **They signed up and forgot** — possible. The `created_at` will be old; the `last_sign_in_at` recent or empty. Send a magic link so they can take ownership.
2. **Email enumeration / spam signup** — rare. Someone typed the user's email into our signup form to harass them. The row exists but `last_sign_in_at` is null. 🚨 escalate to founder. We'll delete the row and look at whether we need rate limiting on signups.

## Scenario: "I never got the welcome email" (or other emails)

We don't send a welcome email currently. We send: magic link, password-changed (N/A — no passwords), notifications (only if user opts in via Settings).

If they mean "I'm not getting notification emails" → see `07-messaging-notifications.md`.

If they mean the magic link → see "I'm not getting the magic link email" above.

## Investigation checklist for any auth ticket

1. Find the user via email or username (cookbook).
2. Check `auth.users.banned_until` — anything set?
3. Check `auth.users.last_sign_in_at` — when did they last successfully sign in?
4. Check `public.profiles.restrictions` — anything in there about `cannot_*`?
5. Check Auth → Logs in Studio for recent auth attempts on that email.
6. If the issue spans multiple users (e.g. nobody can sign in), 🚨 immediate escalation — it's a platform incident.
