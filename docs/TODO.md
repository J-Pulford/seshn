# Seshn — working to-do / backlog

A lightweight, actionable backlog we add to as things come up. For the big-picture
launch sequencing see `MVP-CHECKLIST.md`; this is the day-to-day "do next" list.

_Last updated: 2026-06-05_

> **Launching?** See `LAUNCH.md` for the authoritative, ordered go-live runbook.

---

## 🟢 Recently done
- **Escrow funding + delivery + release** — `/contract/[id]/fund` checkout (Stripe
  Checkout), webhook marks funded, `mark_delivered` RPC, owner approve→transfer
  release. Migrations `0028`. `escrow-flow.md` updated to the live 10% model.
- **Escrow auto-release / refund cron** — `/api/cron/escrow-sweep` (daily via
  `vercel.json`) releases overdue deliveries and refunds missed deadlines. Needs
  `CRON_SECRET` set in Vercel.
- **Escrow notifications** — bell alerts on funded/delivered/released/refunded/
  disputed (migration `0029`).
- **Profile + listing analytics** — `/analytics` with live view counts, trend
  sparkline, and per-listing view→application conversion (migration `0030`).
- **Download my data** — Settings → "Download my data" (`export_my_data`, `0031`).
- **Marketing** — fee-comparison table + sourced stats (`docs/marketing-sources.md`).
- **Stripe Connect payouts (test mode)** — onboarding → `account.updated` → status sync.

---

## 🟢 Previously done
- **Auth email links** — magic-link / password-reset links no longer land on the
  homepage. Root cause was the Supabase Redirect-URL allow-list missing the
  canonical `www.seshnnn.com` origin; added `AuthLinkCatcher` safety-net + `/auth`
  hardening (PR #15).
- **Stripe Connect payouts (test mode)** — onboarding → `account.updated` webhook
  → profile status sync → "✓ Payouts enabled" verified end-to-end.
- **Migration `0025`** — producer-badge column + `unlock_producer_badge()` applied.

---

## 🔴 Payments — finish going live
- [ ] **Stripe test → live switch.** Confirm the Stripe account is fully activated
      for live charges + Connect; swap Vercel to `sk_live` / `pk_live`; create/confirm
      the webhook **in live mode** pointed at `https://www.seshnnn.com/api/stripe/webhook`
      and set `STRIPE_WEBHOOK_SECRET` to that live endpoint's secret; redeploy; do one
      real onboarding to verify the live chain. Keep modes consistent (don't mix
      test/live keys, webhook, secret).
- [x] **Escrow fund/release flow.** Done — see "Recently done" above. Live switch
      (`charge.refunded` bookkeeping is handled in the cron refund path).

## 🔴 Infra / email
- [ ] **Custom SMTP in Supabase.** Built-in sender is rate-limited and unreliable
      for real users (caused the "email rate limit exceeded" wall). Configure a real
      provider (Resend / SendGrid / Postmark / SES), verify the sending domain
      (SPF/DKIM), set sender to an address on a domain we control, then raise the
      auth rate limits. Required before launch.

## 🟡 Privacy
- [ ] **Public profiles — product decision.** Profile pages (`/profile/[username]`)
      are intentionally viewable logged-out (no `requireProfile` gate) for
      discovery/SEO. This is NOT a data leak — `profiles` is column-locked
      (migration `0018`): anon can read only public columns; `stripe_*`,
      `restrictions`, `deletion_requested_at`, `locale` are service-role only, and
      email lives in `auth.users` (never exposed). DECIDE: keep public (recommended
      for a discovery marketplace) vs gate behind login. If gating, add
      `requireProfile({ allowAnon: false })` to the profile page + tighten RLS.
- [ ] **Tighten `notification_prefs` exposure.** `0018` grants anon SELECT on
      `notification_prefs` (line 29) — a user's notification settings are readable by
      anyone. Drop it from the anon/`authenticated` public grant (owner-only via a
      scoped read) unless there's a reason it's public.
- [ ] **Privacy policy accuracy.** `/privacy` + `/terms` pages exist. Confirm the
      privacy policy actually reflects current data practices (Stripe Connect,
      Spotify connect, Supabase, what we store + share). Data export / "download my
      data" still TODO; account deletion already works (`deleteMyAccount()` →
      `delete_my_account` RPC).

## 🟡 Security hardening
_Prompted by the indie-dev security reels (2026-06-05). Mapped to our actual code._
- [x] **Secret scan** — no Stripe/service-role keys in tracked files; `.env.local`
      gitignored; no secret-named `NEXT_PUBLIC_` vars. (Only hardcoded key is the
      Supabase **anon** key in `lib/seshn/config.ts` — public/RLS-protected by
      design.) Re-run before launch + enable GitHub secret scanning.
- [ ] **Rate limiting on custom API routes.** `/api/stripe/connect` (+ status) have
      no rate limit. The webhook is signature-verified (fine). Add lightweight
      per-user/IP throttling to the authenticated routes. Auth-attempt limits are
      handled by Supabase Auth's built-in limits — review/tune them in the dashboard.
- [ ] **Input validation review.** Audit API routes + any client-supplied payloads
      to SECURITY DEFINER RPCs for size/shape validation (most writes already go
      through column-locked grants + RLS, but confirm the escrow/contract RPCs
      reject malformed input).
- [ ] **Prompt-injection** — N/A today (no LLM-facing user input). Revisit if/when
      AI features are added.

## 🟡 Settings & UI polish
- [ ] **Fix spacing in settings.** Tighten/normalise spacing on the settings page
      (`app/settings/page.tsx` / `app/settings/settings.css`).
- [ ] **Profile-picture dropdown menu.** Clicking the profile picture should open a
      dropdown menu (e.g. profile, settings, sign out) instead of / in addition to
      its current behaviour.
- [ ] **Change password in settings.** Add a UI to change password from settings.
      The helper already exists — `setMyPassword(newPassword)` in `lib/seshn/auth.ts`
      — so this is mostly wiring up a form + validation.
