import { withSentryConfig } from "@sentry/nextjs";

/** @type {import('next').NextConfig} */

// Content-Security-Policy covering the app's real origins: Supabase REST +
// realtime (wss), Spotify connect (client-side token/profile fetch), and the
// audio embed iframes (Spotify / SoundCloud / YouTube). Shipped Report-Only so
// it can be validated in production (and doesn't break `next dev`) before being
// enforced — flip the header name to "Content-Security-Policy" to enforce.
const csp = [
  "default-src 'self'",
  "base-uri 'self'",
  "object-src 'none'",
  "frame-ancestors 'none'",
  "form-action 'self'",
  "img-src 'self' data: blob: https:",
  "font-src 'self' data:",
  "style-src 'self' 'unsafe-inline'",
  "script-src 'self' 'unsafe-inline' https://www.googletagmanager.com",
  "connect-src 'self' https://*.supabase.co wss://*.supabase.co https://api.spotify.com https://accounts.spotify.com https://www.googletagmanager.com https://*.google-analytics.com https://*.analytics.google.com",
  "frame-src https://open.spotify.com https://w.soundcloud.com https://www.youtube.com https://www.youtube-nocookie.com",
  "media-src 'self' https: blob:",
  "worker-src 'self' blob:",
].join("; ");

const securityHeaders = [
  { key: "Content-Security-Policy-Report-Only", value: csp },
  { key: "X-Frame-Options", value: "DENY" },
  { key: "X-Content-Type-Options", value: "nosniff" },
  { key: "Referrer-Policy", value: "strict-origin-when-cross-origin" },
  { key: "Permissions-Policy", value: "camera=(), microphone=(), geolocation=(), browsing-topics=()" },
  { key: "Strict-Transport-Security", value: "max-age=63072000; includeSubDomains; preload" },
];

const nextConfig = {
  reactStrictMode: true,
  async headers() {
    return [{ source: "/(.*)", headers: securityHeaders }];
  },
  // The Next.js app is now the whole app — the legacy prototype pages that used
  // to live in public/app/*.html (and public/js/*.js, public/index.html) have
  // been removed. These redirects keep old, externally-linked URLs working:
  // shared gig/profile links, Supabase auth email links, bookmarks, search
  // engines. Query-param routes (?id=, ?u=) are rewritten to the new dynamic
  // path segments; the bare fallbacks catch param-less hits.
  async redirects() {
    return [
      // Static 1:1 pages.
      { source: "/app/feed.html", destination: "/feed", permanent: true },
      { source: "/app/browse.html", destination: "/browse", permanent: true },
      { source: "/app/applications.html", destination: "/applications", permanent: true },
      { source: "/app/post.html", destination: "/post", permanent: true },
      { source: "/app/settings.html", destination: "/settings", permanent: true },
      { source: "/app/onboarding.html", destination: "/onboarding", permanent: true },
      { source: "/app/inbox.html", destination: "/inbox", permanent: true },
      { source: "/app/pro.html", destination: "/pro", permanent: true },
      { source: "/app/project.html", destination: "/project", permanent: true },
      // auth.html carried a ?next= which is forwarded automatically.
      { source: "/app/auth.html", destination: "/auth", permanent: true },

      // Dynamic pages: old query param -> new path segment.
      {
        source: "/app/gig.html",
        has: [{ type: "query", key: "id", value: "(?<id>[^&]+)" }],
        destination: "/gig/:id",
        permanent: true,
      },
      { source: "/app/gig.html", destination: "/feed", permanent: true },
      {
        source: "/app/profile.html",
        has: [{ type: "query", key: "u", value: "(?<u>[^&]+)" }],
        destination: "/profile/:u",
        permanent: true,
      },
      { source: "/app/profile.html", destination: "/browse", permanent: true },
      {
        source: "/app/contract.html",
        has: [{ type: "query", key: "id", value: "(?<id>[^&]+)" }],
        destination: "/contract/:id",
        permanent: true,
      },
      { source: "/app/contract.html", destination: "/feed", permanent: true },
    ];
  },
};

// Sentry build wrapper (required by the SDK). Source maps upload only when
// SENTRY_AUTH_TOKEN is present (so local/preview builds without it still pass).
// tunnelRoute proxies Sentry events through our own domain → bypasses ad
// blockers and keeps the CSP connect-src at 'self'.
export default withSentryConfig(nextConfig, {
  org: process.env.SENTRY_ORG,
  project: process.env.SENTRY_PROJECT,
  authToken: process.env.SENTRY_AUTH_TOKEN,
  widenClientFileUpload: true,
  tunnelRoute: "/monitoring",
  silent: !process.env.CI,
});
