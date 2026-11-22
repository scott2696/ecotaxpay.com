import type { MetadataRoute } from "next";
import { LEGAL_UPDATED } from "@/components/LegalPage";
import { absolute } from "@/lib/seo";

// Public, indexable pages only (host area, guest payment links and APIs are private; see robots.ts).
// `updated`: when the page's content last changed (legal pages follow LEGAL_UPDATED).
// No hreflang alternates: languages share one URL (chosen by cookie; ?lang=xx redirects to the clean URL).
const PAGES: { path: string; priority: number; changeFrequency: MetadataRoute.Sitemap[number]["changeFrequency"]; updated: string }[] = [
  { path: "/", priority: 1, changeFrequency: "weekly", updated: "2026-11-22" },
  { path: "/register", priority: 0.8, changeFrequency: "monthly", updated: "2026-11-22" },
  { path: "/about", priority: 0.7, changeFrequency: "monthly", updated: "2026-11-22" },
  { path: "/contact", priority: 0.6, changeFrequency: "monthly", updated: "2026-11-20" },
  { path: "/login", priority: 0.3, changeFrequency: "yearly", updated: "2026-11-20" },
  { path: "/terms", priority: 0.3, changeFrequency: "yearly", updated: LEGAL_UPDATED },
  { path: "/privacy", priority: 0.3, changeFrequency: "yearly", updated: LEGAL_UPDATED },
  { path: "/cookies", priority: 0.3, changeFrequency: "yearly", updated: LEGAL_UPDATED },
];

export default function sitemap(): MetadataRoute.Sitemap {
  return PAGES.map((p) => ({
    url: absolute(p.path),
    lastModified: new Date(`${p.updated}T00:00:00Z`),
    changeFrequency: p.changeFrequency,
    priority: p.priority,
  }));
}
