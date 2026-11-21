import type { T } from "@/i18n/translate";
import { machineTranslationEnabled } from "@/i18n/config";
import { translateTexts } from "@/i18n/machine";
import type { Guide } from "./store";

export type GuideItem = { icon: string; title: string; body: string; highlight?: boolean };

/** The arrival guide as display items, shared by the guest page and the confirmation email. */
export function guideItems(guide: Guide, t: T): GuideItem[] {
  const items = [
    { icon: "📍", title: t("guide.address"), body: guide.address },
    {
      icon: "🕒",
      title: t("guide.times"),
      body: [guide.checkInTime && t("guide.checkInFrom", { time: guide.checkInTime }), guide.checkOutTime && t("guide.checkOutBy", { time: guide.checkOutTime })].filter(Boolean).join(" · "),
    },
    { icon: "🧭", title: t("guide.directions"), body: guide.directions },
    { icon: "🔑", title: t("guide.access"), body: guide.access, highlight: true },
    {
      icon: "📶",
      title: t("guide.wifi"),
      body: [guide.wifiName && t("guide.wifiNetwork", { name: guide.wifiName }), guide.wifiPassword && t("guide.wifiPassword", { password: guide.wifiPassword })].filter(Boolean).join("\n"),
    },
    { icon: "📋", title: t("guide.houseRules"), body: guide.houseRules },
    { icon: "📞", title: t("guide.contact"), body: guide.contact },
    { icon: "💡", title: t("guide.other"), body: guide.other },
    ...(guide.notes ?? []).map((n) => ({ icon: "📝", title: n.title || t("guide.note"), body: n.body })),
  ];
  return items.filter((i): i is GuideItem => !!i.body);
}

/** Guide fields whose text the host wrote freely (translated for guests when machine translation is on). */
export const TRANSLATABLE_GUIDE_FIELDS = ["directions", "access", "houseRules", "contact", "other"] as const;

/** Number of filled-in guide sections (for the apartment list). */
export const guideCount = (guide: Guide) =>
  Object.entries(guide).filter(([k, v]) => k !== "notes" && !!v).length + (guide.notes ?? []).filter((n) => n.body).length;

/**
 * Host-written guide text in the guest's language, including additional notes
 * (only when machine translation is switched on; otherwise returned unchanged).
 */
export async function translateGuide(guide: Guide, locale: string): Promise<Guide & { translated?: boolean }> {
  if (!machineTranslationEnabled()) return guide;
  const fields = TRANSLATABLE_GUIDE_FIELDS.filter((f) => guide[f]);
  const notes = guide.notes ?? [];
  const texts = [...fields.map((f) => guide[f]!), ...notes.flatMap((n) => [n.title, n.body])];
  if (!texts.length) return guide;
  const out = await translateTexts(texts, locale);
  const copy: Guide & { translated?: boolean } = { ...guide };
  fields.forEach((f, i) => (copy[f] = out[i]));
  copy.notes = notes.map((n, i) => ({ title: out[fields.length + i * 2], body: out[fields.length + i * 2 + 1] }));
  copy.translated = out.some((s, i) => s !== texts[i]);
  return copy;
}
