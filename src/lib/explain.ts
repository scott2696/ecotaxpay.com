import { date, money, tEn, type T } from "@/i18n/translate";
import type { AccommodationType, Region, Season } from "./taxRules";

const dayMonth = (md: string, t: T) => date(`2026-${md}`, t.locale, { day: "numeric", month: "long" });

/** Seasons legally in force on a date (rate changes use validFrom/validUntil). */
export function seasonsInForce(seasons: Season[], isoDate: string): Season[] {
  return seasons.filter((s) => (!s.validFrom || isoDate >= s.validFrom) && (!s.validUntil || isoDate < s.validUntil));
}

/** "capped at €22.50 per person per stay" / "capped at 7 nights per stay" / null when there's no cap. */
export function capSummary(region: Region, acc: AccommodationType, onDate: string, t: T = tEn): string | null {
  const cap = seasonsInForce(acc.seasons ?? [], onDate).find((s) => s.capPerPersonCents)?.capPerPersonCents;
  if (cap && acc.basis === "person_night") return t("cap.amount", { amount: money(cap, region.currency, t.locale) });
  if (region.maxNights) return t.plural("cap.nights", region.maxNights);
  return null;
}

/** "€1.50 per person per night", "€2.00 per person per night from 1 May to 31 October and €0.50 from …", "12.5% of the accommodation price per night" */
export function rateSummary(region: Region, acc: AccommodationType, onDate: string, t: T = tEn): string {
  const seasons = seasonsInForce(acc.seasons ?? [], onDate);
  if (acc.basis === "percent") return t("rate.percent", { pct: (seasons[0]?.percent ?? acc.percent ?? 0).toLocaleString(t.locale) });
  const kind = acc.basis === "person_night" ? "person" : "unit";
  const amount = (s: Season) => money(s.rateCents ?? 0, region.currency, t.locale);
  if (seasons.length === 1) return t(kind === "person" ? "rate.person" : "rate.unit", { amount: amount(seasons[0]) });
  return seasons
    .map((s, i) =>
      t(i === 0 ? (kind === "person" ? "rate.seasonFirst.person" : "rate.seasonFirst.unit") : "rate.seasonNext", {
        amount: amount(s),
        from: dayMonth(s.from, t),
        to: dayMonth(s.to, t),
      }),
    )
    .join(t("rate.and"));
}

/** The accommodation group as guests read it ("hotels, guest houses and hostels"). */
export const groupLabel = (acc: AccommodationType, t: T) => t.raw(`g:${acc.guestLabel ?? acc.label}`);

/**
 * Plain-language explanation of the law, shown to the guest under the amount, e.g.
 * "In Malta, the law requires every visitor aged 18 or over staying in hotels to pay the
 *  Eco Contribution: €1.50 per person per night, capped at €22.50 per person per stay."
 */
export function explainRules(region: Region, acc: AccommodationType, checkIn: string, t: T = tEn): string[] {
  const place = region.placeName ?? region.name.split(" (")[0];
  // "In Malta" / "En Grèce" / "Auf den Balearen": place phrases are translated where the language needs it.
  const inPlace = t.has(`in:${place}`) ? t.raw(`in:${place}`) : t("explain.in", { place });
  // Only mention the accommodation type when the law actually taxes types differently.
  const categories = new Set(region.accommodationTypes.map((a) => a.guestLabel ?? a.label));
  const what = categories.size > 1 ? groupLabel(acc, t) : null;
  const rate = rateSummary(region, acc, checkIn, t);
  const capText = capSummary(region, acc, checkIn, t);
  const cap = capText ? `, ${capText}` : "";
  const tax = region.taxName;
  const out: string[] = [];

  if (acc.basis === "person_night") {
    const who = region.minTaxableAge ? t("explain.who.age", { age: region.minTaxableAge }) : t("explain.who.all");
    out.push(t("explain.person", { inPlace, who, where: what ? t("explain.where", { what }) : "", tax, rate, cap }));
  } else if (acc.basis === "unit_night") {
    out.push(t("explain.unit", { inPlace, tax, for: what ? t("explain.for", { what }) : "", rate, cap }));
  } else {
    out.push(t("explain.percent", { inPlace, tax, rate, cap }));
  }

  if (!capText) out.push(t("explain.noCap"));
  if (region.longStay)
    out.push(t("explain.longStay", { n: region.longStay.fromNight, pct: Math.round((1 - region.longStay.multiplier) * 100) }));
  if (acc.basis === "person_night") {
    if (region.minTaxableAge) out.push(t("explain.childrenFree", { age: region.minTaxableAge }));
    const red = region.childReduction;
    if (red) out.push(t("explain.reduced", { from: red.fromAge, to: red.toAge, pct: Math.round(red.multiplier * 100) }));
  }
  out.push(t("explain.collect"));
  return out;
}
