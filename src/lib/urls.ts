// Where things live when the public site and the app are on different domains:
//   ecotaxpay.com      → static public pages (GitHub Pages), built with NEXT_PUBLIC_STATIC_SITE=1
//   app.ecotaxpay.com  → the app (login, sign-up, host dashboard, guest payment pages, APIs)
// Locally, and when everything runs on one domain, both are unset and links stay relative.
// No imports: safe in client components.

/** Building the static public site for GitHub Pages. */
export const STATIC_SITE = process.env.NEXT_PUBLIC_STATIC_SITE === "1";

const APP_URL = (process.env.NEXT_PUBLIC_APP_URL ?? "").replace(/\/$/, "");
/** On the app domain: the public site's address (app visitors to public pages are sent there). */
export const MARKETING_URL = (process.env.NEXT_PUBLIC_MARKETING_URL ?? "").replace(/\/$/, "");

/** Link to a public page (home, terms…): on the app domain, straight to the public site (no redirect). */
export const publicHref = (path: string) => (MARKETING_URL ? `${MARKETING_URL}${path}` : path);

/** Link into the app: login, sign-up, dashboard, rates, APIs. */
export const appHref = (path: string) => (APP_URL ? `${APP_URL}${path}` : path);

/** The public pages, also served as static files on the public domain. */
export const PUBLIC_PATHS = ["/", "/about", "/contact", "/terms", "/privacy", "/cookies", "/sitemap", "/destinations"];
/** Destination pages (/destinations/<slug>) are public too. */
export const isPublicPath = (p: string) => PUBLIC_PATHS.includes(p) || p.startsWith("/destinations/");

/** Languages with their own static copy (/es/, /it/, …); English is at the root. */
export const STATIC_LANGS = ["en", "es", "it", "fr", "de", "mt"];
