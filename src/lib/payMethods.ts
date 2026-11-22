// Hosts are paid directly by their guests, with the methods they choose (bank transfer,
// Revolut, PayPal, Wise, their own payment link or cash). The platform never handles the money:
// the guest says "I've paid", the host confirms it arrived, and the receipt is issued then.
import type { BankDetails, Host, PaymentMethods, PayMethodId, PaymentRecord } from "./store";

// Guests pay before they arrive, so there are no "on arrival" options (cash / card machine at check-in).
// Old records may still say a guest chose one; paysOnArrival() keeps those readable.
export const METHOD_ORDER: PayMethodId[] = [
  "card", "bank", "revolut", "paypal", "wise", "bizum", "mbway", "satispay", "twint", "wero", "link",
];
/** Apps where the guest sends money to the host's phone number. */
export const PHONE_APPS = ["bizum", "mbway", "satispay", "twint", "wero"] as const;
export type PhoneApp = (typeof PHONE_APPS)[number];
export const PHONE_APP_NAMES: Record<PhoneApp, string> = { bizum: "Bizum", mbway: "MB WAY", satispay: "Satispay", twint: "TWINT", wero: "Wero" };
export const METHOD_ICONS: Record<PayMethodId, string> = {
  card: "💳", bank: "🏦", revolut: "⚡", paypal: "🅿️", wise: "🌍", bizum: "📱", mbway: "📱", satispay: "📱", twint: "📱", wero: "📱",
  link: "🔗", cardOnArrival: "💳", cash: "💶",
};

/** Paid in person at check-in (no transfer to make now, no payment reference). */
export const paysOnArrival = (id?: PayMethodId) => id === "cash" || id === "cardOnArrival";

/** The methods a host has switched on, in display order. */
export function activeMethods(m?: PaymentMethods): PayMethodId[] {
  if (!m) return [];
  return METHOD_ORDER.filter((id) => {
    switch (id) {
      case "cash": return !!m.cash;
      case "bank": return bankComplete(m.bank);
      case "link": return !!m.link?.url;
      case "card": return !!m.card?.url;
      case "cardOnArrival": return !!m.cardOnArrival;
      default: return !!m[id];
    }
  });
}
export const hasPaymentMethods = (h: Host) => activeMethods(h.paymentMethods).length > 0;

/** Short reference the guest puts on the transfer, so the host can match it (e.g. ETP-7KQ2M9). */
export const paymentReference = (p: Pick<PaymentRecord, "id">) => `ETP-${p.id.slice(0, 6).toUpperCase()}`;

const amountString = (cents: number) => (cents / 100).toFixed(2);

/** Ready-to-tap links that open the payment app with the right recipient (and amount where supported). */
export function methodUrl(id: PayMethodId, m: PaymentMethods, cents: number, currency: string): string | null {
  switch (id) {
    case "revolut":
      return m.revolut ? `https://revolut.me/${encodeURIComponent(m.revolut)}` : null;
    case "paypal":
      return m.paypal ? `https://paypal.me/${encodeURIComponent(m.paypal)}/${amountString(cents)}${currency.toUpperCase()}` : null;
    case "wise":
      return m.wise ?? null;
    case "link":
      return m.link?.url ?? null;
    case "card":
      return m.card?.url ?? null;
    default:
      return null;
  }
}

// ---------- Validation of what the host types ----------

/** IBAN check (ISO 13616 mod-97). Returns it grouped in fours, or null if invalid. */
export function normalizeIban(raw: string): string | null {
  const iban = raw.replace(/[\s-]/g, "").toUpperCase();
  if (!/^[A-Z]{2}\d{2}[A-Z0-9]{10,30}$/.test(iban)) return null;
  const moved = iban.slice(4) + iban.slice(0, 4);
  let rem = 0;
  for (const ch of moved) {
    const v = /\d/.test(ch) ? ch : String(ch.charCodeAt(0) - 55);
    for (const d of v) rem = (rem * 10 + Number(d)) % 97;
  }
  return rem === 1 ? iban.replace(/(.{4})/g, "$1 ").trim() : null;
}

/** Phone number for Bizum / MB WAY / Satispay / TWINT / Wero: "+34 612 34 56 78" → "+34612345678". */
export function normalizeIntlPhone(raw: string): string | null {
  const v = raw.trim().replace(/[\s().-]/g, "").replace(/^00/, "+");
  return /^\+[1-9]\d{6,14}$/.test(v) ? v : null;
}
/** Wero also accepts an email address. */
export function normalizeWero(raw: string): string | null {
  const v = raw.trim();
  return /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(v) ? v.toLowerCase() : normalizeIntlPhone(v);
}

/** A BIC / SWIFT code: 4-letter bank, 2-letter country, 2-character location, optional 3-character branch. */
export function normalizeBic(raw: string): string | null {
  const v = raw.replace(/\s/g, "").toUpperCase();
  return /^[A-Z]{4}[A-Z]{2}[A-Z0-9]{2}([A-Z0-9]{3})?$/.test(v) ? v : null;
}
/** UK sort code: 6 digits → "12-34-56". */
export function normalizeSortCode(raw: string): string | null {
  const d = raw.replace(/[\s-]/g, "");
  return /^\d{6}$/.test(d) ? `${d.slice(0, 2)}-${d.slice(2, 4)}-${d.slice(4)}` : null;
}
/** US ABA routing number: 9 digits with a valid check digit. */
export function normalizeRouting(raw: string): string | null {
  const d = raw.replace(/\s/g, "");
  if (!/^\d{9}$/.test(d)) return null;
  const n = [...d].map(Number);
  const sum = 3 * (n[0] + n[3] + n[6]) + 7 * (n[1] + n[4] + n[7]) + (n[2] + n[5] + n[8]);
  return sum % 10 === 0 ? d : null;
}
export const normalizeAccountNumber = (raw: string, type: "uk" | "us") => {
  const d = raw.replace(/[\s-]/g, "");
  return (type === "uk" ? /^\d{8}$/ : /^\d{4,17}$/).test(d) ? d : null;
};

/** All the details needed for both SEPA and international transfers are present. */
export function bankComplete(b?: BankDetails): boolean {
  if (!b?.holder) return false;
  const type = b.accountType ?? "iban";
  const account = type === "iban" ? !!b.iban : type === "uk" ? !!(b.sortCode && b.accountNumber) : !!(b.routingNumber && b.accountNumber);
  // Older records saved before the address fields existed still work (they were SEPA-only).
  return account;
}

/** "@jane", "jane" or "https://revolut.me/jane" → "jane". */
export function normalizeRevtag(raw: string): string | null {
  const v = raw.trim().replace(/^https?:\/\/(www\.)?revolut\.me\//i, "").replace(/^@/, "").replace(/\/.*$/, "");
  return /^[a-z0-9._-]{3,32}$/i.test(v) ? v : null;
}

/** "jane", "@jane" or "paypal.me/jane" → "jane". */
export function normalizePaypal(raw: string): string | null {
  const v = raw.trim().replace(/^https?:\/\//i, "").replace(/^(www\.)?paypal\.(me|com\/paypalme)\//i, "").replace(/^@/, "").replace(/\/.*$/, "");
  return /^[a-z0-9]{1,30}$/i.test(v) ? v : null;
}

/** Only https links, so a guest is never sent somewhere unsafe. */
export function normalizeUrl(raw: string, host?: RegExp): string | null {
  try {
    const u = new URL(raw.trim());
    if (u.protocol !== "https:") return null;
    if (host && !host.test(u.hostname)) return null;
    return u.toString();
  } catch {
    return null;
  }
}
export const isWiseUrl = (raw: string) => normalizeUrl(raw, /(^|\.)wise\.com$/i);

/** Display name of a payment method in the reader's language (t from the server or client). */
export function methodTitle(id: string, t: (key: never) => string): string {
  if (id in PHONE_APP_NAMES) return PHONE_APP_NAMES[id as PhoneApp];
  return (t as unknown as (k: string) => string)(`method.${id}`);
}
