/** @type {import('next').NextConfig} */
const nextConfig = {
  reactStrictMode: true,
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

export default nextConfig;
