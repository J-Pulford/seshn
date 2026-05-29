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
- [ ] feed → browse → gig → profile → post → applications → settings
      (these need `components/Nav.tsx` first)

### Phase 4 — Messaging + contracts
- [ ] inbox (realtime messages), contract, project, pro

### Phase 5 — Landing page (LAST — founder reworking design) + cleanup
- [ ] Port the (redesigned) landing → `app/page.tsx` SSR + `metadata` for SEO
- [ ] Waitlist form → `app/api/waitlist/route.ts`
- [ ] Retire legacy auth.html: update Supabase redirect URLs to `/auth`, then
      remove the last legacy `.html` + the three `public/js/*.js` files
- [ ] Strip Babel/CDN script tags everywhere (now compiled at build time)
- [ ] Confirm all internal links use Next routes; add redirects for any old
      `/app/*.html` URLs that may be linked externally (email links, etc.)
- [ ] Lighthouse/SEO check on the landing page

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
