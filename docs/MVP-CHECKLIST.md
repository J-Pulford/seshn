# Seshn — MVP launch checklist

A complete inventory of what stands between "where the codebase is today" and "doors open, users on the platform". Organised by launch phase so you can sequence work without scope creep.

## What "launch" means for Seshn

There are two distinct moments:

- **Doors-open soft launch**: the platform is live, anyone can sign up, the core marketplace works (post a gig, apply, message, sign a contract, fund an escrow, deliver, get paid). Quiet — no marketing push, you onboard users you already know. Confidence-building phase.
- **Public launch**: marketing campaign, press, paid acquisition, growth tactics. Only after soft launch has proven the loop works.

Your stated strategy — **collect a waitlist pre-launch, let them in en masse on day one** — is the right move. The waitlist phase doesn't need the full platform. The doors-open phase does.

---

## ⚠️ Architecture decision that sits UNDER everything below

This checklist is a **feature / launch-readiness** list. It assumes the current
codebase is the thing we keep shipping. But the repo's original `README.md` is
explicit that `public/` is a **design prototype** (HTML/CSS/JS + React-via-CDN),
handed off to be "recreated in whatever technology makes sense — React, Vue,
native". Reality has drifted: the prototype got promoted to production and is
live on Vercel with real users.

So there are TWO interpretations of "make it a functional app", and they are
**not** the same work:

- **(A) Launch readiness** — the features / legal / infra below. This is what
  the rest of this doc covers.
- **(B) Technical migration to Next.js** — porting every prototype page to real
  React components, moving the Supabase client into server components where it
  helps, gaining SSR (SEO for the landing page), real routing, and a build step
  that kills the manual cache-busting class of bug (e.g. the stale-JS issue that
  broke the password-reset redirect on 2026-05-29). **No plan for this exists
  yet — it's a separate ~1–3 week effort, not a checklist item.**

These can be sequenced either way:
- **Ship on the prototype, migrate post-PMF** — fastest to a soft launch; accept
  the architecture's costs (no SSR, manual cache-busting, awkward server-side
  webhooks for Stripe/escrow) until the loop is proven.
- **Migrate first, then resume the list below** — cleaner foundation, but delays
  launch by weeks before you've validated demand.

Recommendation: ship the waitlist + soft-launch on the current stack, decide on
the Next.js migration once the core loop is proven. Don't rewrite pre-PMF.

---

## Phase 0 — Pre-signup waitlist (collect users before signup is open)

The goal: get 200–2000 emails of musicians who want in, segmented by what role they'd play on the platform, before you've built / fully polished the rest.

**What it needs:**

- [ ] **Landing page** (one URL, public) — value prop, screenshots/demo, social proof if any, email capture field, segmentation question ("are you a producer / vocalist / songwriter / engineer / etc"). Already exists in `public/index.html` to some degree — needs an email capture form.
- [x] **Waitlist table** in Supabase — `waitlist (email, role, location, source, created_at)`, insert-only under RLS (migration `0019`); landing `#waitlist` section captures email + role + city. Rate-limit/captcha still TODO (see below).
- [ ] **Confirmation email** — they sign up, they get a thanks-for-joining email confirming their spot. Builds trust.
- [ ] **Anti-abuse** — basic captcha (Cloudflare Turnstile is free), email format validation, server-side rate limit (1 signup per IP per minute).
- [ ] **Analytics** — at minimum: how many signups per day, by source (referrer), by role. Plausible / PostHog / Fathom are all $0–10/mo.
- [ ] **Domain + SSL** — `seshn.com.au` or whatever, with HTTPS. (Already have hosting; just need domain registered + DNS pointing.)
- [ ] **Pixel tracking from social if you're going to ads** — Meta/TikTok pixel optional, defer until you actually run ads.

**What it does NOT need:**

- Sign-in functionality (signup is closed)
- Profiles, gigs, applications, messages
- Contracts, escrow, Stripe
- Any of the marketplace functionality

**Effort estimate**: 1–2 days if the landing already mostly exists. Could go live this week.

---

## Phase 1 — Doors-open readiness (the actual product launches)

Everything below must work before you let waitlist users in. Grouped by **critical** (launch blockers), **should-have** (launch is much worse without), **nice-to-have** (defer).

### Critical (cannot launch without)

#### Auth & onboarding

- [x] Magic link sign-in
- [x] Google OAuth sign-in
- [x] **Password sign-in** (your dev request — also a real user need)
- [x] **Password reset flow** (verified end-to-end 2026-05-29: forgot → email → recovery page → new password → sign-in. Required Supabase Site URL + www-aware redirect allow-list + disabling "require current password")
- [x] Onboarding (username, display name, roles, genres, location)
- [ ] **Onboarding explanation step** — first page after signup that explains what Seshn is, before they're dropped into the feed
- [x] **Email verification** — routing gate (isEmailVerified) blocks unverified sessions from the app + a confirm-your-email holding screen with resend. Magic-link/Google are inherently verified, so zero friction. Turn ON Supabase → Email → "Confirm email" to make it a hard gate for password signups.

#### Core marketplace

- [x] Post a gig
- [x] Browse gigs (feed)
- [x] Apply to a gig
- [x] My applications page
- [x] Browse profiles
- [x] View a profile
- [x] Edit your profile
- [x] Avatar + cover upload
- [x] Connected accounts (Spotify / SoundCloud / Instagram / YouTube)
- [x] DMs (1-to-1 conversations)
- [x] Notifications (bell + counters)
- [x] **Customisable gig cover photos** (upload picker in post flow; falls back to algorithmic cover)
- [x] **Feed filters that actually filter** — fixed vocabulary drift: feed role/genre filters now match post.html's stored values (e.g. "Hip-hop" casing), browse genre filter matches profile.html's. Several chips previously matched zero rows.
- [x] **Search works** — gig title (feed), profile name/username/bio (browse), and global NavSearch were already wired; hardened the profile or= filter against punctuation breakage (J.Cole, drum (live)). Verify in browser.
- [ ] **Mobile responsiveness sweep** — every page on iPhone, every page on small Android. Most pages done per commit history; needs final pass on the new contract + verification pages.

#### Contracts & money (or deferred)

This is the biggest scoping decision. **You can launch without the contract/escrow flow** as long as you make the boundary clear ("Seshn helps you find collaborators; agreements happen between you directly for v1"). That ships much faster.

If you ARE shipping contracts at launch:

- [x] Contract schema + RPCs (done — `0012`, `0013`)
- [ ] **Contract page deployed** (`contract.html` — currently uncommitted)
- [ ] **Entry point to draft a contract** — when owner accepts an application, show "Draft contract" button
- [ ] **Notifications for contract events** — extend `notifications.kind` for `contract_sent`, `contract_signed`, `contract_active`, `contract_declined`, `contract_cancelled`
- [ ] **Stripe Connect Express integration** — onboarding flow for collaborators to receive payouts
- [ ] **Funding the escrow** — Stripe PaymentIntent + webhook handler
- [ ] **Deliverable upload** — storage bucket + UI for collaborator to submit files
- [ ] **Approval & auto-release** — UI for owner to approve; cron job for auto-release after window
- [ ] **Dispute flow** — UI for either party to open, support email integration
- [ ] **Cron job infrastructure** — Supabase scheduled functions or external cron

**My recommendation**: launch WITHOUT contracts/escrow first. Let users find collaborators on the platform, transact off-platform. Watch what happens — if collabs are being made, that proves the core loop. Then bring contracts back as the v2 value-add and charge for them.

#### Trust & safety

- [x] **Report user / report gig button** — `reports` table (0016) + report modal on profile.html and gig.html. Insert/select-own under RLS; triage via SQL.
- [x] **Block user button** — `blocks` table (0016) + Block/Unblock in the "⋯" menu on profiles. Enforced: blocked pairs can't apply to each other's gigs or DM each other.
- [x] **Restriction system live** — 0016 turns it on: RLS on gigs.insert (cannot_post_until) and applications.insert (cannot_apply_until), via SECURITY DEFINER `is_restricted()`. NOTE: requires applying migration 0016 to the live DB.
- [ ] **Admin UI to handle reports** — DEFERRED. Needs an admin-role mechanism first; founder triages via SQL (docs/sops/09) for now. Not a launch blocker.
- [ ] **Hide blocked users' gigs from feed** — block currently gates applying + DMing, not feed visibility. Follow-up.
- [ ] **Profanity / scam pattern filter** — defer to post-launch unless you're seeing abuse

#### Legal & compliance

- [ ] **Terms of Service** — drafted, lawyer-reviewed, accepted at signup via clickwrap
- [ ] **Privacy Policy** — APP + GDPR-compliant. Cover: what data you collect, what you do with it, retention, user rights, contact for requests.
- [ ] **Cookie consent banner** — for EU/UK visitors. Minimal: "we use cookies for session + analytics, OK / Settings". Cookiebot or a simple custom one.
- [ ] **DPA with Supabase** — Supabase has a standard Data Processing Agreement; you sign it in their dashboard.
- [ ] **DPA with Stripe** (if doing payments) — same.
- [ ] **ABN registered** — Seshn Pty Ltd needs the ABN done before transacting.
- [ ] **GST registration decision** — if you'll turn over >$75k/year, you must register. Defer until close to threshold.

#### Domain & infrastructure

- [x] Supabase project live
- [ ] **Domain registered** — `seshn.com.au` etc.
- [ ] **SSL / HTTPS** — auto if on Vercel/Netlify; check it's working.
- [ ] **Email infrastructure** — magic links currently come from Supabase's default sender (deliverability is OK but not great). Set up a custom SMTP (Resend / Postmark) + SPF / DKIM / DMARC records for your domain so emails don't go to spam.
- [ ] **Status page** — simple uptime monitor. UptimeRobot or BetterStack are free for basic.
- [ ] **Error monitoring** — Sentry free tier. Catches client-side JS errors so you know what's broken before users tell you.
- [ ] **Backup strategy** — Supabase does daily backups on the paid plan; confirm you're on a plan that includes them. Pre-launch, schedule a manual export.

#### Support operations

- [x] SOPs written (`docs/sops/`)
- [ ] **support@seshn.[tld] email** — set up the inbox + auto-responder
- [ ] **Help / contact page** — visible from the footer of every page
- [ ] **First-response SLA** — for solo founder, "we reply within 1 business day" is honest and OK

### Should-have (launch is much worse without)

- [ ] **Verification badge applications** — the green tick. Users apply, you review, you approve. Schema: `verification_requests(user_id, status, evidence, applied_at, reviewed_at, reviewer_id)`. Charging for it via Stripe comes later.
- [ ] **Email notifications (opt-in)** — at minimum: "you got a new application", "your application was accepted", "new DM". Settings page already has the toggles; backend doesn't actually send yet.
- [ ] **Settings: account deletion** — UI exists; needs the actual delete worker
- [ ] **Settings: email / password change** — UI for email change (currently no UI for it)
- [x] **Card view vs list view on feed** — your specific ask. Toggle persists in localStorage.
- [x] **3-column responsive feed** with dynamic sizing (auto-fit grid, collapses to 1 col on mobile)
- [ ] **Gig page that's shareable** — already exists (`gig.html?id=…`); confirm it has OpenGraph tags so links unfurl on Twitter/iMessage/etc.
- [ ] **Profile page shareable** — same, with OG tags.
- [x] **Hamburger menu fix on desktop** — your specific ask. (inline display no longer overrides the hide-on-desktop CSS)
- [ ] **Boosted gigs UI / monetization** — schema supports `boosted_until`; needs purchase flow.

### Nice-to-have (defer to post-launch)

- [ ] Push notifications (web push)
- [ ] Mobile apps (PWA install banner is the easy win)
- [ ] Referral program ("invite a friend, both get pro for a month")
- [ ] Saved searches / gig alerts
- [ ] Gig deadlines with countdown UI
- [ ] Voice / video calls in DMs
- [ ] Calendar integration for deliverables
- [ ] Team accounts (a label / studio with multiple members)
- [ ] Public release page (showing finished collabs)
- [ ] Analytics dashboard for users (profile views, application rate)

---

## Phase 2 — Post-launch backlog

The above is just "make it ready to launch". Once you're live:

- Onboarding email sequence (welcome, "complete your profile", "post your first gig")
- Weekly digest emails ("new gigs matching your roles this week")
- Featured profiles / featured gigs (editorial)
- A blog or content section (for SEO + value)
- Affiliate / artist ambassador program
- Pricing tiers (Pro at $X/mo with N benefits)
- Native mobile apps via React Native
- Multi-language (Spanish first probably — large LATAM music community)
- Multi-currency on transactions
- Integration with DAW plugins (long term)

---

## Recommended sequencing

If I were sequencing this for you as a solo founder:

### Week 1 — Pre-signup launch
1. Day 1–2: ship the waitlist landing + analytics + domain + email infra
2. Day 3: announce on social / your existing channels / 1 producer Discord / etc
3. Day 4–7: collect emails, talk to people who signed up, learn

### Weeks 2–4 — Doors-open prep (critical items only)
1. Fix the launch blockers (legal pages, email verification, restriction enforcement, hamburger bug, mobile sweep)
2. Add the should-haves that are quick wins (customisable gig covers, verification badge applications without payment, feed card/list view)
3. Decide on contracts/escrow: ship without it (faster) or with it (slower but stronger positioning)
4. Beta-test with 5–10 waitlist users you trust. Watch them use it. Take notes on every confusion.

### Week 5+ — Soft open to waitlist
1. Email waitlist in batches (50 at a time) so you can absorb support
2. Watch metrics: signup→first action conversion, gig post rate, DM rate, repeat visits
3. Fix what breaks. Don't add features.

### Week 8+ — Public launch
1. Press / launch on Product Hunt / artist channels
2. Now you can talk about contracts/escrow if you didn't ship them at launch

---

## What I think you should DECIDE before any of this

A few choices that affect everything downstream:

1. **Are you launching with contracts/escrow or without?** Without = faster, simpler launch. With = stronger product but 2–3 weeks more work.
2. **Pricing model at launch?** Free everywhere? Free + Pro at $X/mo? Marketplace fee only? You can change later but the launch messaging hinges on this.
3. **Geographic focus?** AU-only at launch (cleaner legal, AUD only, smaller TAM) or global from day 1 (more users available, more compliance overhead)?
4. **Verification economic model?** Free for now, paid later. What's the price when it goes paid? ($5 one-time? $5/mo? Annual?)

Once you've made those four decisions, the critical-list above sharpens up: some items move to nice-to-have, others become non-negotiable.
