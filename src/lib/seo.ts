// Page metadata with a self-referencing canonical URL, and schema.org JSON-LD builders.
import type { Metadata } from "next";
import { site } from "./config";
import { STATIC_SITE } from "./urls";

export const absolute = (path: string) => `${site.baseUrl}${path}`;
/** A public page's own address. GitHub Pages serves /about at /about/, so use that (no redirect). */
export const pageUrl = (path: string) => absolute(STATIC_SITE && path !== "/" && !path.endsWith("/") ? `${path}/` : path);

/** Title, description, self-referencing canonical and Open Graph for a public page. */
export function pageMeta(path: string, title: string, description: string): Metadata {
  return {
    title,
    description,
    alternates: { canonical: pageUrl(path) },
    openGraph: { title, description, url: pageUrl(path), siteName: site.name, type: "website" },
    twitter: { card: "summary", title, description },
  };
}

/** Hand-translated languages (also offered via ?lang=xx). */
export const LANGUAGES = ["en", "es", "it", "fr", "de", "mt"];

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
      logo: { "@type": "ImageObject", "@id": `${site.baseUrl}/#logo`, url: `${site.baseUrl}/logo.png`, width: 256, height: 256, caption: site.name },
      image: { "@id": `${site.baseUrl}/#logo` },
      description: "Software for holiday-rental hosts to calculate the local tourist or eco tax and collect it from guests before arrival, in any currency. Guests pay the host directly; Eco Tax Pay never handles the money.",
      email: site.supportEmail,
      address: { "@type": "PostalAddress", ...site.companyPostal },
      contactPoint: [{ "@type": "ContactPoint", contactType: "customer support", email: site.supportEmail, availableLanguage: LANGUAGES }],
    },
    {
      "@type": "WebSite",
      "@id": SITE_ID,
      name: site.name,
      alternateName: site.domain,
      url: site.baseUrl,
      publisher: { "@id": ORG_ID },
      inLanguage: LANGUAGES,
    },
  ];
}

/** A page node (WebPage / AboutPage / ContactPage) plus its breadcrumb trail. */
export function pageSchema(type: "WebPage" | "AboutPage" | "ContactPage", path: string, name: string, description: string, locale: string) {
  return [
    {
      "@type": type,
      "@id": `${pageUrl(path)}#webpage`,
      url: pageUrl(path),
      name,
      description,
      inLanguage: locale,
      isPartOf: { "@id": SITE_ID },
      about: { "@id": ORG_ID },
      breadcrumb: { "@id": `${pageUrl(path)}#breadcrumb` },
    },
    {
      "@type": "BreadcrumbList",
      "@id": `${pageUrl(path)}#breadcrumb`,
      itemListElement: [
        { "@type": "ListItem", position: 1, name: site.name, item: site.baseUrl },
        ...(path === "/" ? [] : [{ "@type": "ListItem", position: 2, name, item: pageUrl(path) }]),
      ],
    },
  ];
}

export function graph(...nodes: object[][]) {
  return { "@context": "https://schema.org", "@graph": nodes.flat() };
}
