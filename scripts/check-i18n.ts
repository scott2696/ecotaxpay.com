// Run: npx tsx scripts/check-i18n.ts — lists missing / extra keys and broken {placeholders} per language.
import { en } from "../src/i18n/messages/en";
import { de } from "../src/i18n/messages/de";
import { es } from "../src/i18n/messages/es";
import { fr } from "../src/i18n/messages/fr";
import { it } from "../src/i18n/messages/it";
import { mt } from "../src/i18n/messages/mt";

const vars = (s: string) => [...s.matchAll(/\{(\w+)\}/g)].map((m) => m[1]).sort().join(",");
let problems = 0;
for (const [name, msgs] of Object.entries({ es, it, fr, de, mt })) {
  const keys = Object.keys(en) as (keyof typeof en)[];
  // Plural forms may differ per language (e.g. Maltese "few"/"many"), so compare by base key.
  const missing = keys.filter((k) => !(k in msgs) && !(/\.(one|other)$/.test(k) && Object.keys(msgs).some((m) => m.startsWith(k.replace(/\.(one|other)$/, ".")))));
  const badVars = keys.filter((k) => msgs[k] !== undefined && vars(msgs[k]!) !== vars(en[k]) && !(/\.one$/.test(k)));
  const extra = Object.keys(msgs).filter((k) => !(k in en) && !/^(a|g|season|in|note):/.test(k) && !/\.(zero|two|few|many)$/.test(k));
  console.log(`${name}: ${keys.length - missing.length}/${keys.length} keys${missing.length ? ` · missing: ${missing.join(", ")}` : ""}${badVars.length ? ` · placeholder mismatch: ${badVars.join(", ")}` : ""}${extra.length ? ` · unknown: ${extra.join(", ")}` : ""}`);
  problems += missing.length + badVars.length + extra.length;
}
process.exit(problems ? 1 : 0);
