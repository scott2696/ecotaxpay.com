// "Other destination": a host anywhere can define their own local tax for one apartment.
import type { AccommodationType, Country, Region } from "./taxRules";

export const CUSTOM_REGION_ID = "custom";

// Currencies with 2 decimal places only (amounts are stored in minor units ×100).
export const CURRENCIES = [
  "EUR", "GBP", "USD", "CHF", "CZK", "PLN", "DKK", "SEK", "NOK", "RON", "BGN", "TRY",
  "CAD", "AUD", "NZD", "MXN", "BRL", "ZAR", "AED", "SGD", "HKD", "THB", "MYR", "IDR", "INR", "PHP",
] as const;

export type CustomTax = {
  countryName: string;
  placeName: string; // city / town, used in "In <place>, the law requires…"
  taxName: string;
  currency: string;
  basis: "person_night" | "unit_night" | "percent";
  rateCents?: number; // person_night / unit_night
  percent?: number; // percent
  minTaxableAge?: number; // younger guests are exempt
  maxNights?: number; // cap: only the first N nights
  capPerPersonCents?: number; // cap: maximum per person per stay (person_night only)
};

/** Turn a host's custom tax into the same shape as a built-in destination. */
export function customRegion(propertyId: string, t: CustomTax): { country: Country; region: Region } {
  const acc: AccommodationType = {
    id: "custom",
    label: "Your accommodation",
    basis: t.basis,
    percent: t.percent,
    seasons: t.basis === "percent" ? undefined : [{ from: "01-01", to: "12-31", rateCents: t.rateCents ?? 0, capPerPersonCents: t.capPerPersonCents }],
  };
  const region: Region = {
    id: `${CUSTOM_REGION_ID}:${propertyId}`,
    name: t.placeName,
    placeName: t.placeName,
    taxName: t.taxName,
    currency: t.currency,
    minTaxableAge: t.minTaxableAge,
    maxNights: t.maxNights,
    accommodationTypes: [acc],
    notes: "Rate entered by you. Keep it up to date with your local authority.",
    verifiedOn: "host",
    sources: [],
  };
  return { country: { code: "XX", name: t.countryName, flag: "🌍", regions: [region] }, region };
}

const num = (v: unknown) => (v === "" || v === null || v === undefined ? undefined : Number(v));

/** Validate the host's custom tax form. Returns the clean value, or an error message key ("ct.err.*"). */
export function parseCustomTax(raw: unknown): CustomTax | string {
  const r = (raw ?? {}) as Record<string, unknown>;
  const text = (k: string, max = 80) => String(r[k] ?? "").trim().slice(0, max);
  const t: CustomTax = {
    countryName: text("countryName"),
    placeName: text("placeName"),
    taxName: text("taxName") || "Tourist Tax",
    currency: String(r.currency ?? "").toUpperCase(),
    basis: r.basis === "unit_night" || r.basis === "percent" ? r.basis : "person_night",
  };
  if (!t.countryName || !t.placeName) return "ct.err.place";
  if (!(CURRENCIES as readonly string[]).includes(t.currency)) return "ct.err.currency";

  if (t.basis === "percent") {
    const pct = num(r.percent);
    if (!(pct !== undefined && pct > 0 && pct <= 50)) return "ct.err.percent";
    t.percent = Math.round(pct * 100) / 100;
  } else {
    const rate = num(r.rate);
    if (!(rate !== undefined && rate > 0 && rate <= 1000)) return "ct.err.rate";
    t.rateCents = Math.round(rate * 100);
  }

  const age = num(r.minTaxableAge);
  if (age !== undefined) {
    if (!(Number.isInteger(age) && age >= 0 && age <= 18)) return "ct.err.age";
    if (age > 0) t.minTaxableAge = age;
  }
  const capType = r.capType;
  if (capType === "nights") {
    const n = num(r.maxNights);
    if (!(n !== undefined && Number.isInteger(n) && n >= 1 && n <= 365)) return "ct.err.maxNights";
    t.maxNights = n;
  } else if (capType === "amount") {
    if (t.basis !== "person_night") return "ct.err.capBasis";
    const cap = num(r.capAmount);
    if (!(cap !== undefined && cap > 0)) return "ct.err.capAmount";
    t.capPerPersonCents = Math.round(cap * 100);
  }
  return t;
}
