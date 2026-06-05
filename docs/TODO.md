# Seshn — working to-do / backlog

A lightweight, actionable backlog we add to as things come up. For the big-picture
launch sequencing see `MVP-CHECKLIST.md`; this is the day-to-day "do next" list.

_Last updated: 2026-06-05_

---

## 🟢 Recently done
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
- [ ] **Escrow fund/release flow.** Wire the stubbed webhook events
      (`payment_intent.succeeded` → mark escrow funded; `transfer.created` /
      `charge.refunded` → release / refund bookkeeping) in
      `app/api/stripe/webhook/route.ts`. Design notes in `docs/escrow-flow.md`.

## 🔴 Infra / email
- [ ] **Custom SMTP in Supabase.** Built-in sender is rate-limited and unreliable
      for real users (caused the "email rate limit exceeded" wall). Configure a real
      provider (Resend / SendGrid / Postmark / SES), verify the sending domain
      (SPF/DKIM), set sender to an address on a domain we control, then raise the
      auth rate limits. Required before launch.

## 🟡 Privacy
- [ ] **Privacy work** (to be scoped). Capture specifics here — e.g. profile
      visibility controls, data export / "download my data", account deletion UX
      (note: `delete_my_account` RPC + `deleteMyAccount()` already exist), blocked
      users, what's exposed to `anon` vs `authenticated`, cookie/consent. _Expand
      with the exact requirements when we pick this up._

## 🟡 Settings & UI polish
- [ ] **Fix spacing in settings.** Tighten/normalise spacing on the settings page
      (`app/settings/page.tsx` / `app/settings/settings.css`).
- [ ] **Profile-picture dropdown menu.** Clicking the profile picture should open a
      dropdown menu (e.g. profile, settings, sign out) instead of / in addition to
      its current behaviour.
- [ ] **Change password in settings.** Add a UI to change password from settings.
      The helper already exists — `setMyPassword(newPassword)` in `lib/seshn/auth.ts`
      — so this is mostly wiring up a form + validation.
