import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  // The static-site export builds into its own folder so it never clashes with `next dev`.
  distDir: process.env.NEXT_DIST_DIR || ".next",
  // Static public site: put <title>, description, canonical and hreflang in <head> for every visitor
  // (by default Next streams them into <body> for non-bot browsers; the export is fetched without a
  // bot user agent, so the published HTML would carry its SEO tags in the body).
  // Links use the same /about/ form GitHub Pages serves (no redirect, and identical in HTML and in the
  // browser, so pages hydrate without mismatches in every language).
  ...(process.env.NEXT_PUBLIC_STATIC_SITE === "1" ? { htmlLimitedBots: /.*/, trailingSlash: true } : {}),
};

export default nextConfig;
