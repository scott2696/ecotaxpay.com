// The host subscription is €3/month. Visitors outside the eurozone see, and are billed, the
// equivalent in their own currency, converted at the European Central Bank's daily reference rate.
import { visitorCountry } from "./geo";

export const BASE_PRICE_EUR = 3;

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
  currency: string; // ISO, upper case
  amount: number; // in major units, e.g. 3.30
  stripeUnitAmount: number; // what Stripe expects for this currency
  label: string; // "$3.30", "€3", "3 €"
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

/** The subscription price for a country (null → euro). */
export async function planFor(country: string | null, locale: string): Promise<Plan> {
  const currency = (country && COUNTRY_CURRENCY[country]) || "EUR";
  let amount = BASE_PRICE_EUR;
  if (currency !== "EUR") {
    const rate = (await eurRates())[currency] ?? FALLBACK_RATES[currency];
    amount = WHOLE_UNITS.has(currency) ? Math.round(BASE_PRICE_EUR * rate) : Math.round(BASE_PRICE_EUR * rate * 100) / 100;
  }
  const stripeUnitAmount = STRIPE_ZERO_DECIMAL.has(currency) ? amount : Math.round(amount * 100);
  return { currency, amount, stripeUnitAmount, label: formatPlan(currency, amount, locale) };
}

/** The price for whoever is making this request (outside a request, euro). */
export async function visitorPlan(locale: string): Promise<Plan> {
  let country: string | null = null;
  try {
    country = await visitorCountry();
  } catch {}
  return planFor(country, locale);
}
