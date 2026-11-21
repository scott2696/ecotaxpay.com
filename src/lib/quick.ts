// Quick payment links: the host types the amount, with no apartment, calendar or stay details.
import type { T } from "@/i18n/translate";
import type { Quote } from "./calc";

/** Currencies a quick link can be charged in (all have 2 decimals at Stripe). */
export const QUICK_CURRENCIES = ["EUR", "USD", "GBP", "CHF", "CZK", "PLN", "SEK", "NOK", "DKK", "AUD", "CAD", "NZD"] as const;
export const QUICK_MIN_CENTS = 50;
export const QUICK_MAX_CENTS = 1_000_000;

/** A quote holding only the amount, so links, receipts and exports work as for calculated ones. */
export function manualQuote(amountCents: number, currency: string, description: string): Quote {
  const today = new Date().toISOString().slice(0, 10);
  return {
    manual: true,
    regionId: "manual",
    regionName: "",
    countryName: "",
    taxName: description,
    accommodationLabel: "",
    currency,
    checkIn: today,
    checkOut: today,
    nights: 0,
    adults: 0,
    childAges: [],
    taxableGuests: 0,
    lines: [],
    explanation: [],
    taxCents: amountCents,
    feeCents: 0,
    totalCents: amountCents,
    notes: [],
    hostNotes: [],
  };
}

/** What the guest is paying for: the host's description, or "tourist tax" in the reader's language (for use mid-sentence). */
export const quoteTitle = (q: Quote, t: T) => (q.manual && !q.taxName ? t("quick.defaultTax") : q.taxName);

/** First letter in capitals, for a title on its own ("Tasa turística"). */
export const capFirst = (s: string) => s.charAt(0).toLocaleUpperCase() + s.slice(1);
