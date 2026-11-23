// Every active ISO 4217 currency, so hosts anywhere can charge in their own money.
// Amounts are stored in hundredths (×100) for every currency; display uses each currency's own decimals.

/** Shown first in currency lists. */
export const POPULAR_CURRENCIES = ["EUR", "USD", "GBP", "CHF", "CAD", "AUD", "NZD", "JPY", "CNY", "INR", "AED", "SGD", "HKD", "ZAR", "BRL", "MXN", "SEK", "NOK", "DKK", "PLN", "CZK", "HUF", "RON", "TRY", "THB", "IDR"] as const;

export const ALL_CURRENCIES = [
  "AED", "AFN", "ALL", "AMD", "ANG", "AOA", "ARS", "AUD", "AWG", "AZN", "BAM", "BBD", "BDT", "BGN", "BHD", "BIF", "BMD", "BND", "BOB", "BRL",
  "BSD", "BTN", "BWP", "BYN", "BZD", "CAD", "CDF", "CHF", "CLP", "CNY", "COP", "CRC", "CUP", "CVE", "CZK", "DJF", "DKK", "DOP", "DZD", "EGP",
  "ERN", "ETB", "EUR", "FJD", "FKP", "GBP", "GEL", "GHS", "GIP", "GMD", "GNF", "GTQ", "GYD", "HKD", "HNL", "HTG", "HUF", "IDR", "ILS", "INR",
  "IQD", "IRR", "ISK", "JMD", "JOD", "JPY", "KES", "KGS", "KHR", "KMF", "KPW", "KRW", "KWD", "KYD", "KZT", "LAK", "LBP", "LKR", "LRD", "LSL",
  "LYD", "MAD", "MDL", "MGA", "MKD", "MMK", "MNT", "MOP", "MRU", "MUR", "MVR", "MWK", "MXN", "MYR", "MZN", "NAD", "NGN", "NIO", "NOK", "NPR",
  "NZD", "OMR", "PAB", "PEN", "PGK", "PHP", "PKR", "PLN", "PYG", "QAR", "RON", "RSD", "RUB", "RWF", "SAR", "SBD", "SCR", "SDG", "SEK", "SGD",
  "SHP", "SLE", "SOS", "SRD", "SSP", "STN", "SVC", "SYP", "SZL", "THB", "TJS", "TMT", "TND", "TOP", "TRY", "TTD", "TWD", "TZS", "UAH", "UGX",
  "USD", "UYU", "UZS", "VES", "VND", "VUV", "WST", "XAF", "XCD", "XCG", "XOF", "XPF", "YER", "ZAR", "ZMW", "ZWG",
] as const;

const SET = new Set<string>(ALL_CURRENCIES);
export const isCurrency = (c: unknown): c is string => typeof c === "string" && SET.has(c);

/** "EUR · Euro" in the given language (falls back to the code). */
export function currencyLabel(code: string, locale: string): string {
  try {
    const name = new Intl.DisplayNames([locale], { type: "currency" }).of(code);
    return name && name !== code ? `${code} · ${name}` : code;
  } catch {
    return code;
  }
}

/** Decimals the currency is normally written with (JPY 0, EUR 2, KWD 3…), capped at 2 (amounts are stored ×100). */
export function currencyDecimals(code: string): number {
  try {
    return Math.min(2, new Intl.NumberFormat("en", { style: "currency", currency: code }).resolvedOptions().maximumFractionDigits ?? 2);
  } catch {
    return 2;
  }
}

/** Currencies PayPal.Me accepts an amount in (others: the guest types the amount on PayPal). */
export const PAYPAL_CURRENCIES = new Set(["AUD", "BRL", "CAD", "CNY", "CZK", "DKK", "EUR", "HKD", "HUF", "ILS", "JPY", "MYR", "MXN", "TWD", "NZD", "NOK", "PHP", "PLN", "GBP", "SGD", "SEK", "CHF", "THB", "USD"]);

/** Convert an amount in a payment provider's minor units (JPY 0 decimals, EUR 2, KWD 3) to our ×100 storage. */
export function minorToCents(minor: number, currency: string): number {
  let decimals = 2;
  try {
    decimals = new Intl.NumberFormat("en", { style: "currency", currency }).resolvedOptions().maximumFractionDigits ?? 2;
  } catch {}
  return Math.round((minor * 100) / 10 ** decimals);
}
