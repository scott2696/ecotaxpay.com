import type { MetadataRoute } from "next";
import { absolute } from "@/lib/seo";

// SEO crawlers that are blocked from the whole site.
const BLOCKED_BOTS = ["AhrefsBot", "SemrushBot", "MJ12bot", "DotBot", "Rogerbot", "serpstatbot", "SistrixBot"];

export default function robots(): MetadataRoute.Robots {
  // App domain (app.ecotaxpay.com): nothing to index there; the public site has its own robots.txt.
  if (process.env.NEXT_PUBLIC_MARKETING_URL) return { rules: [{ userAgent: "*", disallow: "/" }] };
  return {
    rules: [
      // Everyone else may crawl public pages, but not the host area, guests' personal payment links or APIs.
      { userAgent: "*", allow: "/", disallow: ["/host", "/api/", "/p/", "/success"] },
      ...BLOCKED_BOTS.map((userAgent) => ({ userAgent, disallow: "/" })),
    ],
    sitemap: absolute("/sitemap.xml"),
  };
}
