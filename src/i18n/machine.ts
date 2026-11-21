// Machine translation via Google Cloud Translation (v2, API key). Results are cached on disk,
// so each language / text is only ever translated once.
import { createHash } from "node:crypto";
import { existsSync, mkdirSync, readFileSync, writeFileSync } from "node:fs";
import path from "node:path";
import { isLocaleCode, machineTranslationEnabled } from "./config";
import { en, type LocaleMessages, type Messages } from "./messages/en";

const DIR = path.join(process.cwd(), "data", "i18n");
const API = "https://translation.googleapis.com/language/translate/v2";

function readJson<T>(file: string, fallback: T): T {
  try {
    return JSON.parse(readFileSync(file, "utf8")) as T;
  } catch {
    return fallback;
  }
}
function writeJson(file: string, data: unknown) {
  mkdirSync(DIR, { recursive: true });
  writeFileSync(file, JSON.stringify(data));
}

// {placeholders} must survive translation untouched.
const protect = (s: string) => s.replace(/\{(\w+)\}/g, '<span class="notranslate">{$1}</span>').replace(/\n/g, "<br>");
const unprotect = (s: string) =>
  s
    .replace(/<span class="notranslate">\s*\{(\w+)\}\s*<\/span>/g, "{$1}")
    .replace(/<br\s*\/?>/g, "\n")
    .replace(/&#39;/g, "'")
    .replace(/&quot;/g, '"')
    .replace(/&amp;/g, "&")
    .replace(/&lt;/g, "<")
    .replace(/&gt;/g, ">");

async function translateBatch(texts: string[], target: string, source: string | null = "en"): Promise<string[]> {
  const out: string[] = [];
  for (let i = 0; i < texts.length; i += 100) {
    const chunk = texts.slice(i, i + 100);
    const res = await fetch(`${API}?key=${process.env.GOOGLE_TRANSLATE_API_KEY}`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ q: chunk.map(protect), ...(source ? { source } : {}), target, format: "html" }),
      signal: AbortSignal.timeout(30_000),
    });
    if (!res.ok) throw new Error(`Google Translate ${res.status}: ${await res.text()}`);
    const data = (await res.json()) as { data: { translations: { translatedText: string }[] } };
    out.push(...data.data.translations.map((x) => unprotect(x.translatedText)));
  }
  return out;
}

/** The whole interface in `locale`, machine-translated once and cached. Null if unavailable. */
export async function machineMessages(locale: string): Promise<LocaleMessages | null> {
  if (!machineTranslationEnabled() || !isLocaleCode(locale)) return null;
  const file = path.join(DIR, `messages.${locale}.json`);
  const cached = readJson<{ source: string; messages: LocaleMessages } | null>(file, null);
  const source = createHash("sha1").update(JSON.stringify(en)).digest("hex");
  if (cached?.source === source) return cached.messages;
  try {
    const keys = Object.keys(en) as (keyof Messages)[];
    const translated = await translateBatch(keys.map((k) => en[k]), locale);
    const messages = Object.fromEntries(keys.map((k, i) => [k, translated[i]])) as LocaleMessages;
    writeJson(file, { source, messages });
    return messages;
  } catch (e) {
    console.error(`[i18n] machine translation to ${locale} failed`, e);
    return cached?.messages ?? null;
  }
}

/** Translate host-written text (e.g. arrival guide) for a guest. Returns the originals if unavailable. */
export async function translateTexts(texts: string[], locale: string): Promise<string[]> {
  if (!machineTranslationEnabled() || !isLocaleCode(locale) || texts.length === 0) return texts;
  const file = path.join(DIR, "content-cache.json");
  const cache = readJson<Record<string, string>>(file, {});
  const keyOf = (s: string) => createHash("sha1").update(`${locale}\u0000${s}`).digest("hex");
  const missing = [...new Set(texts.filter((s) => s.trim() && !cache[keyOf(s)]))];
  if (missing.length) {
    try {
      const done = await translateBatch(missing, locale, null); // host text: let Google detect its language
      missing.forEach((s, i) => (cache[keyOf(s)] = done[i]));
      writeJson(file, cache);
    } catch (e) {
      console.error("[i18n] content translation failed", e);
      return texts;
    }
  }
  return texts.map((s) => cache[keyOf(s)] ?? s);
}

/** All languages Google supports (code + English name), cached for a week. */
export async function machineLanguages(): Promise<{ code: string; name: string }[]> {
  if (!machineTranslationEnabled()) return [];
  const file = path.join(DIR, "languages.json");
  const cached = readJson<{ at: number; list: { code: string; name: string }[] } | null>(file, null);
  if (cached && Date.now() - cached.at < 7 * 86_400_000) return cached.list;
  try {
    const res = await fetch(`${API}/languages?key=${process.env.GOOGLE_TRANSLATE_API_KEY}&target=en`, { signal: AbortSignal.timeout(15_000) });
    if (!res.ok) throw new Error(String(res.status));
    const data = (await res.json()) as { data: { languages: { language: string; name: string }[] } };
    const list = data.data.languages.map((l) => ({ code: l.language, name: l.name })).filter((l) => isLocaleCode(l.code));
    writeJson(file, { at: Date.now(), list });
    return list;
  } catch {
    return cached?.list ?? [];
  }
}

export const hasCachedMessages = (locale: string) => existsSync(path.join(DIR, `messages.${locale}.json`));
