import { cookies, headers } from "next/headers";
import { cache } from "react";
import { CURATED, DEFAULT_LOCALE, LANG_COOKIE, dirOf, isCurated, isLocaleCode, machineTranslationEnabled, nativeName } from "./config";
import { machineLanguages, machineMessages } from "./machine";
import type { LocaleMessages } from "./messages/en";
import { makeT, type T, type Vars } from "./translate";
import { visitorPlans, type Plan } from "@/lib/pricing";

const LOADERS: Record<string, () => Promise<LocaleMessages>> = {
  en: async () => (await import("./messages/en")).en,
  es: async () => (await import("./messages/es")).es,
  it: async () => (await import("./messages/it")).it,
  fr: async () => (await import("./messages/fr")).fr,
  de: async () => (await import("./messages/de")).de,
  mt: async () => (await import("./messages/mt")).mt,
};

/** Messages for any language: hand-written if we have them, otherwise machine-translated (or English). */
export async function loadMessages(locale: string): Promise<{ locale: string; messages: LocaleMessages }> {
  if (isCurated(locale)) return { locale, messages: await LOADERS[locale]() };
  const base = locale.split("-")[0];
  if (isCurated(base)) return { locale: base, messages: await LOADERS[base]() };
  const mt = await machineMessages(locale);
  return mt ? { locale, messages: mt } : { locale: DEFAULT_LOCALE, messages: await LOADERS.en() };
}

/** Pick the reader's language: cookie (chosen in the menu) → browser's Accept-Language → English. */
export const getLocale = cache(async (): Promise<string> => {
  const chosen = (await cookies()).get(LANG_COOKIE)?.value;
  if (chosen && isLocaleCode(chosen) && (isCurated(chosen) || machineTranslationEnabled())) return chosen;
  const accept = (await headers()).get("accept-language") ?? "";
  for (const part of accept.split(",")) {
    const code = part.split(";")[0].trim();
    if (!isLocaleCode(code)) continue;
    if (isCurated(code)) return code;
    if (isCurated(code.split("-")[0])) return code.split("-")[0];
    if (machineTranslationEnabled()) return code.split("-")[0];
  }
  return DEFAULT_LOCALE;
});

/** Translator for server components, route handlers, emails and PDFs. */
export const getI18n = cache(
  async (forced?: string): Promise<{ t: T; locale: string; dir: "ltr" | "rtl"; messages: LocaleMessages; plan: Plan; vars: Vars }> => {
    const { locale, messages } = await loadMessages(forced ?? (await getLocale()));
    // The subscription price in the visitor's currency fills {price} in every message.
    const plans = await visitorPlans(locale);
    const plan = plans[0]; // monthly
    const vars = { price: plan.label, price3: plans[1].label, price6: plans[2].label, price12: plans[3].label };
    return { t: makeT(locale, messages, vars), locale, dir: dirOf(locale) as "ltr" | "rtl", messages, plan, vars };
  },
);

/** Options for the language menu: hand-translated first, then every machine-translatable language. */
export async function languageOptions(): Promise<{ code: string; label: string }[]> {
  const curated = Object.entries(CURATED).map(([code, label]) => ({ code, label }));
  const machine = (await machineLanguages())
    .filter((l) => !isCurated(l.code))
    .map((l) => ({ code: l.code, label: `${nativeName(l.code)} (${l.name})` }))
    .sort((a, b) => a.label.localeCompare(b.label));
  return [...curated, ...machine];
}
