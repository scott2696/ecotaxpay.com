// Host subscription plans: €3 a month, €8 for 3 months, €16 for 6 months, €30 a year. Visitors outside
// the eurozone see, and are billed, the equivalent in their own currency at the ECB daily reference rate.
import { visitorCountry } from "./geo";

export const PLANS = [
  { id: "monthly", months: 1, eur: 3 },
  { id: "quarterly", months: 3, eur: 8 },
  { id: "semiannual", months: 6, eur: 16 },
  { id: "yearly", months: 12, eur: 30 },
] as const;
export type PlanId = (typeof PLANS)[number]["id"];
export const isPlanId = (x: unknown): x is PlanId => PLANS.some((p) => p.id === x);
export const planDef = (id: PlanId) => PLANS.find((p) => p.id === id)!;

/** The monthly price, the reference for "save x%" on longer plans. */
export const BASE_PRICE_EUR = PLANS[0].eur;

/** Country → currency, for currencies the ECB publishes a reference rate for. Everything else stays in euro. */
const COUNTRY_CURRENCY: Record<string, string> = {
  US: "USD", PR: "USD", GB: "GBP", CH: "CHF", LI: "CHF", NO: "NOK", SE: "SEK", DK: "DKK", PL: "PLN", CZ: "CZK", HU: "HUF", RO: "RON",
  IS: "ISK", TR: "TRY", JP: "JPY", CN: "CNY", HK: "HKD", KR: "KRW", SG: "SGD", MY: "MYR", TH: "THB", ID: "IDR", PH: "PHP",
  IN: "INR", IL: "ILS", AU: "AUD", NZ: "NZD", CA: "CAD", MX: "MXN", BR: "BRL", ZA: "ZAR",
};

/** Shown and charged in whole units (no cents). */
const WHOLE_UNITS = new Set(["JPY", "KRW", "HUF", "ISK", "IDR"]);
/** Stripe takes these amounts without a ×100 multiplier. */
const STRIPE_ZERO_DECIMAL = new Set(["JPY", "KRW"]);

/** Used if the ECB feed is unreachable (rates on 20 Nov 2026). */
const FALLBACK_RATES: Record<string, number> = {
  USD: 1.099, JPY: 174.35, CZK: 24.469, DKK: 7.4746, GBP: 0.83735, HUF: 373.55, PLN: 4.4583, RON: 5.3493, SEK: 11.2125, CHF: 0.9223,
  ISK: 137.2, NOK: 10.718, TRY: 55.5788, AUD: 1.6487, BRL: 6.5259, CAD: 1.5723, CNY: 7.3388, HKD: 8.615, IDR: 20071.37, ILS: 3.6737,
  INR: 101.85, KRW: 1472.04, MXN: 20.9547, MYR: 4.5196, NZD: 1.9968, PHP: 70.091, SGD: 1.416, THB: 37.262, ZAR: 19.1987,
};

/** Euro reference rates, refreshed once a day. */
async function eurRates(): Promise<Record<string, number>> {
  try {
    const res = await fetch("https://www.ecb.europa.eu/stats/eurofxref/eurofxref-daily.xml", {
      next: { revalidate: 60 * 60 * 24 },
      signal: AbortSignal.timeout(4000),
    });
    if (!res.ok) throw new Error(String(res.status));
    const xml = await res.text();
    const rates: Record<string, number> = {};
    for (const m of xml.matchAll(/currency='([A-Z]{3})' rate='([\d.]+)'/g)) rates[m[1]] = Number(m[2]);
    return Object.keys(rates).length ? rates : FALLBACK_RATES;
  } catch {
    return FALLBACK_RATES;
  }
}

export type Plan = {
  id: PlanId;
  months: number; // billing period
  currency: string; // ISO, upper case
  amount: number; // in major units, e.g. 3.30 (for the whole period)
  stripeUnitAmount: number; // what Stripe expects for this currency
  label: string; // "$3.30", "€8", "16 €"
  perMonthLabel: string; // "€2.67" — the period's price divided by its months
  savePct: number; // vs paying monthly (0 for the monthly plan)
};

const fmtLocale = (l: string) => (l === "en" ? "en-GB" : l);

export function formatPlan(currency: string, amount: number, locale: string) {
  const whole = Number.isInteger(amount);
  return new Intl.NumberFormat(fmtLocale(locale), {
    style: "currency",
    currency,
    currencyDisplay: "narrowSymbol", // "$3.30" rather than "US$3.30"
    minimumFractionDigits: whole ? 0 : 2,
    maximumFractionDigits: whole ? 0 : 2,
  }).format(amount);
}

/** A plan's price for a country (null → euro). */
export async function planFor(country: string | null, locale: string, id: PlanId = "monthly"): Promise<Plan> {
  const def = planDef(id);
  const currency = (country && COUNTRY_CURRENCY[country]) || "EUR";
  const rate = currency === "EUR" ? 1 : ((await eurRates())[currency] ?? FALLBACK_RATES[currency]);
  const convert = (eur: number) => (currency === "EUR" ? eur : WHOLE_UNITS.has(currency) ? Math.round(eur * rate) : Math.round(eur * rate * 100) / 100);
  const amount = convert(def.eur);
  const stripeUnitAmount = STRIPE_ZERO_DECIMAL.has(currency) ? amount : Math.round(amount * 100);
  const perMonth = WHOLE_UNITS.has(currency) ? Math.round(amount / def.months) : Math.round((amount / def.months) * 100) / 100;
  return {
    id,
    months: def.months,
    currency,
    amount,
    stripeUnitAmount,
    label: formatPlan(currency, amount, locale),
    perMonthLabel: formatPlan(currency, perMonth, locale),
    savePct: Math.round((1 - def.eur / (BASE_PRICE_EUR * def.months)) * 100),
  };
}

/** Every plan for a country, shortest first. */
export async function plansFor(country: string | null, locale: string): Promise<Plan[]> {
  return Promise.all(PLANS.map((p) => planFor(country, locale, p.id)));
}

/** The price for whoever is making this request (outside a request, euro). */
export async function visitorPlan(locale: string, id: PlanId = "monthly"): Promise<Plan> {
  return planFor(await safeCountry(), locale, id);
}

/** Every plan for whoever is making this request. */
export async function visitorPlans(locale: string): Promise<Plan[]> {
  return plansFor(await safeCountry(), locale);
}

async function safeCountry(): Promise<string | null> {
  try {
    return await visitorCountry();
  } catch {
    return null;
  }
}
