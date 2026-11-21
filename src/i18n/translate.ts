import { en, type LocaleMessages, type MessageKey } from "./messages/en";

export type Vars = Record<string, string | number>;

/** Translator: t("key", { name: "Ana" }) and t.plural("nights", 3). Falls back to English for missing keys. */
export type T = ((key: MessageKey, vars?: Vars) => string) & {
  locale: string;
  plural: (key: string, count: number, vars?: Vars) => string;
  has: (key: string) => boolean;
  raw: (key: string, vars?: Vars) => string; // dynamic keys (e.g. accommodation labels), falls back to the key itself
};

const fillVars = (s: string, vars?: Vars) => (vars ? s.replace(/\{(\w+)\}/g, (m, k) => (k in vars ? String(vars[k]) : m)) : s);

/** `defaults` fill placeholders shared by many messages, e.g. {price} (the subscription in the reader's currency). */
export function makeT(locale: string, messages: LocaleMessages = {}, defaults?: Vars): T {
  const get = (key: string) => (messages as Record<string, string | undefined>)[key] ?? (en as Record<string, string>)[key];
  const fill = (s: string, vars?: Vars) => fillVars(s, defaults ? { ...defaults, ...vars } : vars);
  const t = ((key: MessageKey, vars?: Vars) => fill(get(key) ?? key, vars)) as T;
  t.locale = locale;
  t.has = (key) => get(key) !== undefined;
  t.raw = (key, vars) => fill(get(key) ?? key.replace(/^[a-z]+:/, ""), vars);
  t.plural = (key, count, vars) => {
    let cat = "other";
    try {
      cat = new Intl.PluralRules(locale).select(count);
    } catch {}
    const s = get(`${key}.${cat}`) ?? get(`${key}.other`) ?? key;
    return fill(s, { count, ...vars });
  };
  return t;
}

/** English translator: the default for code that doesn't know the reader's language (e.g. CSV exports). */
export const tEn = makeT("en", en);

/** Plain "en" formats US-style; use British/European style (10 Dec 2026, €18.00) like the rest of the app. */
const fmtLocale = (l: string) => (l === "en" ? "en-GB" : l);

/** Money in the reader's locale, e.g. "€18.00" / "18,00 €". Amounts are in minor units (×100). */
export function money(minor: number, currency: string, locale = "en-GB") {
  // "$100.80" rather than "US$100.80": the currency is always clear from the destination.
  try {
    return new Intl.NumberFormat(fmtLocale(locale), { style: "currency", currency, currencyDisplay: "narrowSymbol" }).format(minor / 100);
  } catch {
    return new Intl.NumberFormat("en-GB", { style: "currency", currency }).format(minor / 100);
  }
}

/** Dates in the reader's locale. */
export function date(iso: string, locale: string, opts: Intl.DateTimeFormatOptions) {
  const d = new Date(iso.length === 10 ? `${iso}T00:00:00Z` : iso);
  try {
    return d.toLocaleDateString(fmtLocale(locale), { timeZone: "UTC", ...opts });
  } catch {
    return d.toLocaleDateString("en-GB", { timeZone: "UTC", ...opts });
  }
}
