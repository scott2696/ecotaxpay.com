import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  // The static-site export builds into its own folder so it never clashes with `next dev`.
  distDir: process.env.NEXT_DIST_DIR || ".next",
};

export default nextConfig;
