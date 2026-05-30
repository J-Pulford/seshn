/** @type {import('next').NextConfig} */
const nextConfig = {
  reactStrictMode: true,
  // Legacy prototype pages still live in public/app/*.html and serve as static
  // files during the incremental migration. A Next route at the same path takes
  // precedence; porting a page = add the route, update links, delete the .html.
  // Redirects from old /app/*.html paths to new routes land in Phase 5 cleanup,
  // once their replacement routes exist (adding them now would break live pages).
  // See docs/NEXTJS-MIGRATION.md.
};

export default nextConfig;
