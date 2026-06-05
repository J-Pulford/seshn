# Seshn — launch runbook

The authoritative, ordered checklist to take Seshn live at **www.seshnnn.com**.
Code lives on `main`; most of what's left is dashboard/ops config only you can do.
Tick the boxes as you go. See `MVP-CHECKLIST.md` for the bigger-picture phasing
and `escrow-flow.md` for how the money moves.

_Last updated: 2026-06-05_

---

## 🔴 Hard blockers — do in this order

### 1. Apply database migrations to the production Supabase project
Project: `qatauoaqbplgsikzzxak.supabase.co`. Run `0001 → 0031` in order
(`supabase db push`, or paste new ones into the SQL editor). The recently-added
ones power live features:
- [ ] `0028` escrow funding RPC (`mark_delivered`)
- [ ] `0029` escrow notifications (trigger + new `notifications.kind`s)
- [ ] `0030` analytics (view tables, record/read RPCs, realtime)
- [ ] `0031` data export (`export_my_data`)

Without these the app won't crash (the client degrades gracefully) but
deliver/release, escrow bell alerts, analytics, and "download my data" stay dark.

### 2. Stripe go-live (Vercel → Settings → Environment Variables → Production)
- [ ] `STRIPE_SECRET_KEY` = `sk_live_…`
- [ ] `NEXT_PUBLIC_STRIPE_PUBLISHABLE_KEY` = `pk_live_…`
- [ ] `SUPABASE_SERVICE_ROLE_KEY` = service_role secret (**required** for webhook + escrow routes)
- [ ] `PLATFORM_FEE_BPS=1000` (10%, set explicitly so it can't drift)
- [ ] Create the webhook **in live mode** → `https://www.seshnnn.com/api/stripe/webhook`,
      events: `account.updated`, `checkout.session.completed`, `payment_intent.succeeded`,
      `charge.refunded`. Set `STRIPE_WEBHOOK_SECRET` to that endpoint's `whsec_…`.
- [ ] Confirm the **Stripe Connect** platform profile is activated for live (business
      verification) so collaborators can onboard and receive transfers.
- [ ] Keep modes consistent — never mix test/live keys, webhook, or secret.

### 3. Escrow auto-release/refund cron
- [ ] Set `CRON_SECRET` (any long random string) in Vercel — Vercel sends it as
      `Authorization: Bearer <CRON_SECRET>` to the scheduled job.
- [ ] `vercel.json` already schedules `/api/cron/escrow-sweep` hourly. Confirm it
      appears under Project → Cron Jobs after deploy. (Sweep auto-releases delivered
      escrows past their approval window and refunds funded escrows past their
      deadline. Without it, funds never auto-release if an owner goes quiet.)

### 4. Custom SMTP for auth email
- [ ] Configure Resend / Postmark / SES in Supabase → Auth → SMTP, verify the
      sending domain (SPF/DKIM) on a `seshnnn.com` address, then raise the auth rate
      limits. The built-in mailer is rate-limited and will wall real signups.

### 5. Supabase Auth URL configuration
- [ ] Add `https://www.seshnnn.com` (and any `*.vercel.app` preview) to Auth → URL
      Configuration → Redirect URLs, or magic/reset links break.

### 6. Vercel production deploy
- [ ] Connect the repo, set all env above for Production, attach `www.seshnnn.com`
      + DNS, deploy `main`. (`vercel.json` is `framework: nextjs` — build is automatic.)

---

## 🟡 Strongly recommended before real money moves
- [ ] **Smoke-test the full money path in live** with a real card + a second test
      account: fund → deliver → approve → transfer lands; confirm bell notifications
      fire at funded/delivered/released; confirm the cron releases an overdue test escrow.
- [ ] **Privacy/Terms accuracy** — confirm `/privacy` reflects Stripe Connect,
      Supabase, Spotify connect, **and the new analytics view-tracking** (a new data
      type you now collect). Deletion works (`delete_my_account`); export now works
      (`export_my_data`, Settings → "Download my data").
- [ ] **Re-run secret scan** + enable GitHub secret scanning. (Only hardcoded key is
      the Supabase anon key — public/RLS-protected by design.)
- [ ] **Set yourself as staff** for the Help board: `update profiles set is_staff =
      true where username = '<you>';` so your replies show the Seshn badge and you can
      pin/close threads.

## 🟢 Can ship after launch
- [ ] Launch mode: open signup vs gate behind the existing **waitlist** (`0019`).
- [ ] Email versions of escrow notifications (in-app already works).
- [ ] Analytics rollup tables (only matters past ~10k users).
- [ ] Boost payments.

---

## Environment variables (full list)

| Var | Where | Purpose |
|---|---|---|
| `NEXT_PUBLIC_SUPABASE_URL` / `_ANON_KEY` | client | Supabase (has safe fallbacks) |
| `SUPABASE_SERVICE_ROLE_KEY` | server | webhooks + escrow/analytics writes |
| `STRIPE_SECRET_KEY` | server | charges, transfers, refunds |
| `NEXT_PUBLIC_STRIPE_PUBLISHABLE_KEY` | client | (reserved) client Stripe |
| `STRIPE_WEBHOOK_SECRET` | server | webhook signature verification |
| `CRON_SECRET` | server | authorizes the escrow sweep cron |
| `PLATFORM_FEE_BPS` | server | platform fee (1000 = 10%) |
| `NEXT_PUBLIC_SPOTIFY_CLIENT_ID` | client | optional Spotify connect |
