// Page metadata with a self-referencing canonical URL, and schema.org JSON-LD builders.
import type { Metadata } from "next";
import { site } from "./config";

export const absolute = (path: string) => `${site.baseUrl}${path}`;

/** Title, description, self-referencing canonical and Open Graph for a public page. */
export function pageMeta(path: string, title: string, description: string): Metadata {
  return {
    title,
    description,
    alternates: { canonical: absolute(path) },
    openGraph: { title, description, url: absolute(path), siteName: site.name, type: "website" },
    twitter: { card: "summary", title, description },
  };
}

const ORG_ID = `${site.baseUrl}/#organization`;
const SITE_ID = `${site.baseUrl}/#website`;

/** Organization + WebSite: included on every page. */
export function siteSchema() {
  return [
    {
      "@type": "Organization",
      "@id": ORG_ID,
      name: site.company,
      brand: site.name,
      url: site.baseUrl,
      logo: `${site.baseUrl}/icon4.png`,
      email: site.supportEmail,
      ...(site.companyAddress ? { address: site.companyAddress } : {}),
      contactPoint: [{ "@type": "ContactPoint", contactType: "customer support", email: site.supportEmail, availableLanguage: ["en", "es", "it", "fr", "de", "mt"] }],
    },
    { "@type": "WebSite", "@id": SITE_ID, name: site.name, url: site.baseUrl, publisher: { "@id": ORG_ID }, inLanguage: ["en", "es", "it", "fr", "de", "mt"] },
  ];
}

/** A page node (WebPage / AboutPage / ContactPage) plus its breadcrumb trail. */
export function pageSchema(type: "WebPage" | "AboutPage" | "ContactPage", path: string, name: string, description: string, locale: string) {
  return [
    {
      "@type": type,
      "@id": `${absolute(path)}#webpage`,
      url: absolute(path),
      name,
      description,
      inLanguage: locale,
      isPartOf: { "@id": SITE_ID },
      about: { "@id": ORG_ID },
      breadcrumb: { "@id": `${absolute(path)}#breadcrumb` },
    },
    {
      "@type": "BreadcrumbList",
      "@id": `${absolute(path)}#breadcrumb`,
      itemListElement: [
        { "@type": "ListItem", position: 1, name: site.name, item: site.baseUrl },
        ...(path === "/" ? [] : [{ "@type": "ListItem", position: 2, name, item: absolute(path) }]),
      ],
    },
  ];
}

export function graph(...nodes: object[][]) {
  return { "@context": "https://schema.org", "@graph": nodes.flat() };
}
