# Seshn — Next.js migration

Living plan + progress tracker for moving the prototype (static HTML + React-via-CDN)
to a real Next.js app. Read this top-to-bottom before picking up migration work.

## Decisions (locked 2026-05-29)

| Decision | Choice | Why |
|----------|--------|-----|
| Framework | **Next.js (App Router)**, latest | Modern default; SSR for the landing page; Vercel-native |
| Language | **TypeScript** | Catches the drift/typo bug class (see filter bug, commit fef38d9) at compile time |
| Styling | **Port inline styles + CSS variables as-is** | Pixel-identical, lowest risk. Tailwind is a later, separate effort |
| Strategy | **Incremental, page-by-page** | App is live with real users; old + new coexist on Vercel, ship continuously |
| Rendering/auth | **Hybrid** — SSR public landing, client-rendered app with existing localStorage auth | Captures the SEO win without reworking the whole auth flow |

## Why we're doing this

The repo README always intended `public/` as a *prototype* to be rebuilt in a real
framework. It got promoted to production. The costs we're now paying:
- **No build step** → manual cache-busting; this directly caused the password-reset
  redirect bug (stale JS served the wrong redirect URL).
- **No SSR** → landing page is invisible to crawlers (bad for a pre-launch waitlist).
- **Babel-in-the-browser** → every visitor compiles 12k lines of JSX on each load.
- **Duplicated constants across files** → drift bugs (the feed/browse filter bug).

## Current surface area (~12,200 LOC)

| File | LOC | Becomes |
|------|----:|---------|
| `public/index.html` | 2698 | `app/page.tsx` (SSR marketing) + waitlist API route |
| `public/app/feed.html` | 785 | `app/feed/page.tsx` (client) |
| `public/app/profile.html` | 970 | `app/profile/[username]/page.tsx` |
| `public/app/gig.html` | 760 | `app/gig/[id]/page.tsx` |
| `public/app/inbox.html` | 631 | `app/inbox/page.tsx` |
| `public/app/contract.html` | 840 | `app/contract/[id]/page.tsx` |
| `public/app/browse.html` | 562 | `app/browse/page.tsx` |
| `public/app/post.html` | 555 | `app/post/page.tsx` |
| `public/app/auth.html` | 613 | `app/auth/page.tsx` |
| `public/app/settings.html` | 435 | `app/settings/page.tsx` |
| `public/app/onboarding.html` | 240 | `app/onboarding/page.tsx` |
| `public/app/applications.html` | 233 | `app/applications/page.tsx` |
| `public/app/pro.html` | 257 | `app/pro/page.tsx` |
| `public/app/project.html` | 270 | `app/project/[id]/page.tsx` |
| `public/js/seshn-supabase.js` | 1289 | `lib/seshn/*.ts` (typed data layer) |
| `public/js/seshn-nav.js` | 626 | `components/Nav.tsx` |
| `public/js/contract-template.js` | 427 | `lib/contract-template.ts` |

## Coexistence model (how old + new run together)

Next.js serves its own `public/` directory as static files at the same paths. So the
legacy app **stays exactly where it is** and keeps serving at `/app/*.html` while we
port. A new Next.js route at the same path **takes precedence** over a static file, so
porting a page = add the route + update links + delete the legacy `.html`.

- Un-ported page → served as today from `public/app/<x>.html` (static, unchanged).
- Ported page → served by the Next.js route, SSR/client as designed.
- Internal links flip from `/app/feed.html` → `/feed` as each page lands.

No Vercel rewrites needed for the happy path; the static-vs-route precedence does it.
We keep the legacy files until their replacement route is verified, then remove them.

## Phases

> **Re-sequenced 2026-05-29:** the landing page (was Phase 1) is deferred to
> **last** — the founder is reworking its design/content separately. The
> scaffold home placeholder stays at `/` on the branch until then. We proceed
> with the app pages first.

### Phase 0 — Scaffold + shared foundation  ✅ DONE (2026-05-29)
- [ ] Next.js + TS + ESLint scaffold at repo root (manual, so it doesn't clobber `public/`)
- [ ] `app/globals.css` — port the shared CSS custom-property palette + base resets that
      every page currently re-declares in its own `<style>` block
- [x] `lib/seshn/client.ts` — browser Supabase client (keeps current localStorage auth)
- [x] `lib/seshn/server.ts` — server Supabase client (anon, read-only) for SSR pages
- [x] `lib/seshn/types.ts` — DB row types (Profile, Gig, Application, Conversation, …)
- [x] `lib/seshn/constants.ts` — typed role/genre/comp vocabularies (single source)
- [x] `components/visual/` — shared `AlbumArt`, `Vinyl`, `Grain`
- [x] `next build` passes with a placeholder home route
- [x] Vercel preview renders + coexistence confirmed (`/` new, `/app/*.html` legacy)

### Phase 2 — Data layer + auth + shared app chrome  ⬅ IN PROGRESS
- [~] `lib/seshn/` — typed port of the seshn-supabase.js data layer, split by domain:
      - [x] `profiles.ts`, `auth.ts`, `gigs.ts`, `applications.ts`,
            `notifications.ts`, `messaging.ts`, `trust-safety.ts`
      - [ ] connected accounts + contracts (port with the settings/contract pages)
- [x] `components/Nav.tsx` — `seshn-nav.js` ported (global NavSearch, notifications
      bell + realtime, inbox badge, mobile menu). Nav link targets centralised in an
      `R` map (legacy /app/*.html until each page is ported). + `components/nav.css`,
      + shared design-system atoms (.btn/.pill/.avatar/.logo/.card/…) added to globals.css.
- [x] `app/auth/page.tsx` — auth.html ported (magic / password / recovery / verify),
      coexists with legacy auth.html (kept alive: Supabase email links + legacy
      pages still point at /app/auth.html). `next build` + smoke test pass.
- [x] guard helpers — `requireProfile` / `routeAfterAuth` ported with email-verify gate.
      Redirect targets centralised in auth.ts ROUTES (some still legacy until ported).
- [ ] `components/Nav.tsx` — port `seshn-nav.js` (incl. the global NavSearch)

### Phase 3 — Core marketplace pages (client-rendered)
Port in dependency order. Legacy files are NOT deleted yet (kept for coexistence
until the legacy auth.html is retired in Phase 5); new routes coexist.
- [x] onboarding (`/onboarding`) — standalone, no nav. routeAfterAuth/requireProfile
      now target it. Build + verified.
- [x] feed (`/feed`) — full port: filter sidebar (role/comp/genre/location/search),
      sort pills, grid/list view toggle (localStorage), GigCard, suggested artists,
      Pro upsell. First page to render the new Nav. Build + smoke test pass.
- [x] browse (`/browse`) — artist discovery: role/genre/location/pro filters,
      search, sort, grid/list, ArtistCard. Uses PROFILE_ROLES/PROFILE_GENRES.
- [x] applications (`/applications`) — my applications, active/archived tabs,
      withdraw. Signed-out CTA. Nav links for feed/browse/applications now point
      at the ported routes.
- [x] gig (`/gig/[id]`) — dynamic route. Apply form, my-application status,
      owner applications list (accept/pass/undo, message), close/reopen, cover
      header, poster card, gig details, report modal. Feed/browse/applications/
      nav gig links now point at /gig/[id].
- [x] profile (`/profile/[username]`) — dynamic route. Cover+avatar header,
      bio, connected accounts, recent posts, roles/genres rail; owner edit modal
      (avatar/cover upload, chips); non-owner message + report/block controls.
      All profile links across nav/feed/browse/gig/applications now point at
      /profile/[username]. Added lib/seshn/connected-accounts.ts.
- [x] post (`/post`) — 3-step gig form, cover upload, live preview, createGig.
- [x] settings (`/settings`) — account/email change, notification prefs,
      connected accounts (Spotify PKCE connect/disconnect), account deletion.
      Added the Spotify connect flow + save/disconnect to connected-accounts.ts.

**Phase 3 complete** — all 8 marketplace pages ported (onboarding, feed, browse,
applications, gig, profile, post, settings). All inter-page links on the new stack.

### Phase 4 — Messaging + contracts  ⬅ IN PROGRESS
- [x] inbox (`/inbox`) — conversation list (unread dot/preview/count), thread
      with attachments, composer, realtime. **Fixed live unread/DM badge**:
      `conversations` was missing from the realtime publication →
      0017_realtime_conversations.sql adds it (REPLICA IDENTITY FULL). Apply
      0017 + ensure project Realtime is on.
- [x] pro (`/pro`) — pricing page (static).
- [x] project (`/project`) — project-room mockup (static; no data wiring in the
      prototype either).
- [x] contracts data layer (`lib/seshn/contracts.ts`) — completes lib/seshn.
- [x] contract page (`/contract/[id]`) — full sign flow: document renderer,
      status sidebar, terms editor (owner/draft), decline + cancel, scroll-to-
      sign gate, sha256 agreement hash. + lib/contract-template.ts (typed port
      of contract-template.js; hash is byte-identical to the prototype).

**Phase 4 complete.** Every prototype page is now ported (14 routes). The whole
app runs on Next.js, coexisting with the legacy files.

### Phase 5 — Landing page (LAST — founder reworking design) + cleanup
- [x] Port the (redesigned) landing → `app/(marketing)/page.tsx` SSR + the five
      marketing sub-pages (features, mission, roadmap, suggestions, stories)
- [x] Waitlist capture — `#waitlist` section on the landing
      (`components/landing/WaitlistSection.tsx`) writing to an insert-only
      `waitlist` table (migration `0019`) via `lib/seshn/waitlist.ts`. Follow-ups:
      captcha/rate-limit, confirmation email, signup analytics.
- [x] Retire legacy auth.html: all internal links now target `/auth`; the
      legacy `public/app/*.html` + three `public/js/*.js` + old `public/index.html`
      are removed. **ACTION REQUIRED (founder, Supabase dashboard):** confirm the
      Google OAuth + email redirect URLs allow `/auth` (the `/**` wildcard already
      covers it) so email/OAuth links land on the new route.
- [x] Strip Babel/CDN script tags everywhere (legacy files deleted; the only
      inline script left is the theme-init literal in `app/layout.tsx`)
- [x] Confirm all internal links use Next routes; redirects for old `/app/*.html`
      URLs (incl. `?id=`/`?u=` → dynamic segments) added in `next.config.mjs`
- [ ] Lighthouse/SEO check on the landing page (still TODO)

## Risks & how we handle them
- **Auth session continuity**: localStorage auth is preserved in the client app, so
  signed-in users aren't logged out by the migration. Cookie-based SSR auth is a
  deliberate non-goal for now.
- **Email redirect URLs**: Supabase Site URL + allow-list already point at
  `www.seshnnn.com` with `/**` wildcards, so they keep working as routes change from
  `/app/auth.html` to `/auth`. Add a redirect from the old path to be safe.
- **Pixel drift**: styles ported verbatim; compare each page against the live deploy
  before deleting its legacy file.
- **Two genre/role vocabularies** (gigs vs profiles): fold into typed constants in
  `lib/seshn/constants.ts` during the port so they can't drift again.

## Progress log
- 2026-05-29: Plan written; decisions locked. Starting Phase 0.
- 2026-06-03: Phase 5 cleanup — Next.js is now the sole app. Removed all legacy
  `public/app/*.html`, `public/js/*.js`, and the old `public/index.html`; added
  `/app/*.html` → route redirects (with `?id=`/`?u=` capture); flipped the last
  three legacy links (onboarding profile, applications sign-in, Google OAuth
  redirect) to Next routes. Security: closed an open-redirect in the `?next=`
  guard (rejected protocol-relative `//host` targets). Remaining: waitlist API
  route, Lighthouse pass, and the Supabase dashboard redirect-URL confirmation.
