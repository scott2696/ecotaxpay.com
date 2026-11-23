// Public, indexable pages, grouped into sub-sitemaps under one sitemap index (/sitemap.xml).
// Host area, guest payment links and APIs are private (see robots.ts).
import { LEGAL_UPDATED } from "@/components/LegalPage";
import { absolute } from "./seo";
import { isPublicPath, STATIC_LANGS, STATIC_SITE } from "./urls";
import { DESTINATIONS, destinationPath } from "./destinations";

type Freq = "always" | "hourly" | "daily" | "weekly" | "monthly" | "yearly" | "never";
export type SitemapPage = { path: string; priority: number; changefreq: Freq; updated: string };

/** `updated`: when the page's content last changed (YYYY-MM-DD; legal pages follow LEGAL_UPDATED). */
export const SITEMAPS: Record<string, SitemapPage[]> = {
  page: [
    { path: "/", priority: 1, changefreq: "weekly", updated: "2026-11-22" },
    { path: "/register", priority: 0.8, changefreq: "monthly", updated: "2026-11-22" },
    { path: "/about", priority: 0.7, changefreq: "monthly", updated: "2026-11-22" },
    { path: "/contact", priority: 0.6, changefreq: "monthly", updated: "2026-11-20" },
    { path: "/login", priority: 0.3, changefreq: "yearly", updated: "2026-11-20" },
    { path: "/sitemap", priority: 0.2, changefreq: "monthly", updated: "2026-11-22" },
  ],
  destination: [
    { path: "/destinations", priority: 0.8, changefreq: "monthly", updated: DESTINATIONS.map((d) => d.region.verifiedOn).sort().at(-1)! },
    ...DESTINATIONS.map((d) => ({ path: destinationPath(d), priority: 0.7, changefreq: "monthly" as const, updated: d.region.verifiedOn })),
  ],
  legal: [
    { path: "/terms", priority: 0.3, changefreq: "yearly", updated: LEGAL_UPDATED },
    { path: "/privacy", priority: 0.3, changefreq: "yearly", updated: LEGAL_UPDATED },
    { path: "/cookies", priority: 0.3, changefreq: "yearly", updated: LEGAL_UPDATED },
  ],
};

const iso = (day: string) => `${day}T00:00:00+00:00`;
const esc = (s: string) => s.replace(/&/g, "&amp;").replace(/</g, "&lt;").replace(/>/g, "&gt;");
// Browsers render the XML with this stylesheet; search engines read the XML itself.
const HEAD = `<?xml version="1.0" encoding="UTF-8"?>\n<?xml-stylesheet type="text/xsl" href="/sitemap.xsl"?>\n`;

function xml(body: string) {
  return new Response(HEAD + body, {
    headers: { "Content-Type": "application/xml; charset=utf-8", "Cache-Control": "public, max-age=3600", "X-Robots-Tag": "noindex" },
  });
}

/** /sitemap.xml: the index of all sub-sitemaps. */
export function sitemapIndex() {
  const items = Object.entries(SITEMAPS)
    .map(([name, pages]) => {
      const last = pages.map((p) => p.updated).sort().at(-1)!;
      return `  <sitemap>\n    <loc>${esc(absolute(`/${name}-sitemap.xml`))}</loc>\n    <lastmod>${iso(last)}</lastmod>\n  </sitemap>`;
    })
    .join("\n");
  return xml(`<sitemapindex xmlns="http://www.sitemaps.org/schemas/sitemap/0.9">\n${items}\n</sitemapindex>\n`);
}

/** /<name>-sitemap.xml: the pages in one group. */
export function sitemapFor(name: keyof typeof SITEMAPS) {
  // Static public site: every language has its own address (/es/about …), linked as hreflang alternates.
  const langs = STATIC_SITE ? STATIC_LANGS : ["en"];
  // Pages are served at /about/ on the static site (no redirect); sign-up and login live on the app domain.
  const localized = (lang: string, path: string) => {
    const p = lang === "en" ? path : `/${lang}${path === "/" ? "/" : path}`;
    return absolute(STATIC_SITE && !p.endsWith("/") ? `${p}/` : p);
  };
  const items = SITEMAPS[name]
    .filter((p) => !STATIC_SITE || isPublicPath(p.path))
    .flatMap((p) =>
      langs.map((lang) => {
        const alternates = STATIC_SITE
          ? [...STATIC_LANGS.map((l) => `    <xhtml:link rel="alternate" hreflang="${l}" href="${esc(localized(l, p.path))}"/>`), `    <xhtml:link rel="alternate" hreflang="x-default" href="${esc(localized("en", p.path))}"/>`].join("\n") + "\n"
          : "";
        return `  <url>\n    <loc>${esc(localized(lang, p.path))}</loc>\n${alternates}    <lastmod>${iso(p.updated)}</lastmod>\n    <changefreq>${p.changefreq}</changefreq>\n    <priority>${p.priority.toFixed(1)}</priority>\n  </url>`;
      }),
    )
    .join("\n");
  return xml(`<urlset xmlns="http://www.sitemaps.org/schemas/sitemap/0.9"${STATIC_SITE ? ' xmlns:xhtml="http://www.w3.org/1999/xhtml"' : ""}>\n${items}\n</urlset>\n`);
}
