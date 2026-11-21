// Languages. "Curated" ones are translated by hand and always available.
// Every other language is machine-translated on demand when GOOGLE_TRANSLATE_API_KEY is set.

export const CURATED = {
  en: "English",
  es: "Español",
  it: "Italiano",
  fr: "Français",
  de: "Deutsch",
  mt: "Malti",
} as const;

export type CuratedLocale = keyof typeof CURATED;
export type Locale = string; // BCP 47 code, e.g. "en", "pt", "zh-CN"

export const DEFAULT_LOCALE: CuratedLocale = "en";
export const LANG_COOKIE = "lang";
const RTL = new Set(["ar", "he", "iw", "fa", "ur", "ps", "sd", "ug", "yi", "dv", "ckb"]);

export const isCurated = (l: string): l is CuratedLocale => l in CURATED;
export const dirOf = (l: string) => (RTL.has(l.split("-")[0]) ? "rtl" : "ltr");
export const machineTranslationEnabled = () => !!process.env.GOOGLE_TRANSLATE_API_KEY;

/** A language's own name ("Português", "日本語"), falling back to the code. */
export function nativeName(l: string): string {
  if (isCurated(l)) return CURATED[l];
  try {
    const n = new Intl.DisplayNames([l], { type: "language" }).of(l);
    return n ? n[0].toLocaleUpperCase(l) + n.slice(1) : l;
  } catch {
    return l;
  }
}

/** Valid-looking language code (protects cookies, cache file names and API calls). */
export const isLocaleCode = (l: string) => /^[a-z]{2,3}(-[A-Za-z0-9]{2,4})?$/.test(l);
