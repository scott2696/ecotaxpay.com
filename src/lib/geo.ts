import { cookies, headers } from "next/headers";

/** Cookie holding the browser's IANA time zone (set by components/TimeZoneCookie). */
export const TZ_COOKIE = "tz";

/**
 * Best guess at the visitor's country (ISO 3166-1 alpha-2), for display only.
 * 1. A ?country=XX preview (set by middleware), else the country header from the hosting edge network
 *    (Vercel, Cloudflare, CloudFront, Netlify…).
 * 2. The device's time zone, e.g. "Europe/Malta" → MT, "America/Chicago" → US.
 * 3. The region in the browser's language preference, e.g. "es-ES" → ES, "de-AT" → AT. "en-US" is
 *    skipped: it is the default English setting worldwide, so it says nothing about where someone is.
 * 4. A language that clearly belongs to one country, e.g. "el" → GR.
 * No IP lookups or third-party calls, and nothing is stored on the server.
 */
export async function visitorCountry(): Promise<string | null> {
  const h = await headers();
  for (const name of ["x-preview-country", "x-vercel-ip-country", "cf-ipcountry", "cloudfront-viewer-country", "x-country-code", "x-nf-country"]) {
    const v = h.get(name)?.toUpperCase();
    if (v && /^[A-Z]{2}$/.test(v) && v !== "XX" && v !== "T1") return v;
  }
  const tz = (await cookies()).get(TZ_COOKIE)?.value;
  const fromTz = tz ? tzCountry(decodeURIComponent(tz)) : null;
  if (fromTz) return fromTz;
  const langs = (h.get("accept-language") ?? "").split(",").map((p) => p.split(";")[0].trim()).filter(Boolean);
  for (const l of langs) {
    if (/^en-us$/i.test(l)) continue;
    const region = l.split("-")[1]?.toUpperCase();
    if (region && /^[A-Z]{2}$/.test(region)) return region;
  }
  const LANG_COUNTRY: Record<string, string> = { mt: "MT", el: "GR", cs: "CZ", sl: "SI", hr: "HR", nl: "NL", pt: "PT", it: "IT", es: "ES", de: "DE" };
  for (const l of langs) {
    const c = LANG_COUNTRY[l.split("-")[0].toLowerCase()];
    if (c) return c;
  }
  return null;
}

const TZ_COUNTRY: Record<string, string> = {
  "Europe/Malta": "MT", "Europe/Rome": "IT", "Europe/Madrid": "ES", "Atlantic/Canary": "ES", "Africa/Ceuta": "ES",
  "Europe/Lisbon": "PT", "Atlantic/Madeira": "PT", "Atlantic/Azores": "PT", "Europe/Athens": "GR", "Europe/Vienna": "AT",
  "Europe/Zagreb": "HR", "Europe/Prague": "CZ", "Europe/Ljubljana": "SI", "Europe/London": "GB", "Europe/Amsterdam": "NL",
  "Europe/Berlin": "DE", "Europe/Paris": "FR", "Europe/Brussels": "BE", "Europe/Luxembourg": "LU", "Europe/Dublin": "IE",
  "Europe/Zurich": "CH", "Europe/Vaduz": "LI", "Europe/Oslo": "NO", "Europe/Stockholm": "SE", "Europe/Copenhagen": "DK",
  "Europe/Helsinki": "FI", "Europe/Tallinn": "EE", "Europe/Riga": "LV", "Europe/Vilnius": "LT", "Europe/Warsaw": "PL",
  "Europe/Bratislava": "SK", "Europe/Budapest": "HU", "Europe/Bucharest": "RO", "Europe/Sofia": "BG", "Asia/Nicosia": "CY",
  "Atlantic/Reykjavik": "IS", "Europe/Istanbul": "TR", "Asia/Tokyo": "JP", "Asia/Shanghai": "CN", "Asia/Hong_Kong": "HK",
  "Asia/Seoul": "KR", "Asia/Singapore": "SG", "Asia/Kuala_Lumpur": "MY", "Asia/Bangkok": "TH", "Asia/Jakarta": "ID",
  "Asia/Manila": "PH", "Asia/Kolkata": "IN", "Asia/Calcutta": "IN", "Asia/Jerusalem": "IL", "Pacific/Auckland": "NZ",
  "America/Mexico_City": "MX", "America/Cancun": "MX", "America/Sao_Paulo": "BR", "Africa/Johannesburg": "ZA",
  "Pacific/Honolulu": "US", "America/Phoenix": "US", "America/Anchorage": "US", "America/Puerto_Rico": "PR",
};
const US_ZONES = /^America\/(New_York|Chicago|Denver|Los_Angeles|Detroit|Boise|Juneau|Sitka|Nome|Adak|Menominee|Indiana\/.+|Kentucky\/.+|North_Dakota\/.+)$/;
const CA_ZONES = /^America\/(Toronto|Vancouver|Edmonton|Winnipeg|Halifax|St_Johns|Regina|Montreal|Moncton|Whitehorse|Yellowknife|Iqaluit)$/;

/** Country for an IANA time zone, where the zone belongs to one country. */
export function tzCountry(tz: string): string | null {
  if (TZ_COUNTRY[tz]) return TZ_COUNTRY[tz];
  if (US_ZONES.test(tz)) return "US";
  if (CA_ZONES.test(tz)) return "CA";
  if (tz.startsWith("Australia/")) return "AU";
  return null;
}
