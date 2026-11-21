// Writes calculation results in the reader's language.
import { money, type T } from "@/i18n/translate";
import type { CalendarError } from "./calendar";
import type { Line, Quote } from "./calc";

/** One breakdown line, e.g. "2 people × 6 nights × €1.50" / "2 personas × 6 noches × 1,50 €". */
export function describeLine(line: Line, currency: string, t: T): string {
  const d = line.detail;
  if (!d) return line.description; // records created before translations existed
  const m = (n: number) => money(n, currency, t.locale);
  const nights = (n: number) => t.plural("line.nights", n);
  const who = (people: number, reduced?: { from: number; to: number; pct: number }) =>
    reduced ? t("line.reduced", { count: people, from: reduced.from, to: reduced.to, pct: reduced.pct }) : t.plural("line.people", people);

  switch (d.kind) {
    case "percent":
      return `${d.pct.toLocaleString(t.locale)}% × ${m(d.price)} × ${nights(d.nights)}`;
    case "cap":
      return t("line.cap", { who: who(d.people, d.reduced), amount: m(d.cap) });
    case "unit":
      return `${t("line.property")} × ${nights(d.nights)} × ${m(d.rate)}${d.season ? ` (${t.raw(`season:${d.season}`)})` : ""}`;
    case "person": {
      const tags = [d.season && t.raw(`season:${d.season}`), d.longStayPct && t("line.longStay", { pct: d.longStayPct, n: d.fromNight ?? 0 })].filter(Boolean);
      return `${who(d.people, d.reduced)} × ${nights(d.nights)} × ${m(d.rate)}${tags.length ? ` (${tags.join(", ")})` : ""}`;
    }
  }
}

/** Small print under the breakdown ("1 child under 18 is exempt."). */
export function guestNotes(q: Quote, t: T): string[] {
  if (q.exemptGuests === undefined) return q.notes; // older records
  const out: string[] = [];
  if (q.exemptGuests > 0 && q.minTaxableAge) out.push(t.plural("notes.childFree", q.exemptGuests, { age: q.minTaxableAge }));
  if (q.reducedGuests && q.reducedRange) out.push(t.plural("notes.reduced", q.reducedGuests, { from: q.reducedRange.from, to: q.reducedRange.to, pct: q.reducedRange.pct }));
  return out;
}

/** Why an Airbnb / Booking.com calendar couldn't be read. */
export function calendarErrorText(e: CalendarError, t: T) {
  return e.code === "status" ? t("cal.err.status", { status: e.status ?? 0 }) : e.code === "notCalendar" ? t("cal.err.notCalendar") : t("cal.err.failed");
}

/** A destination's research note (rate caveats) in the reader's language, falling back to English. */
export function regionNote(regionId: string, english: string | undefined, t: T): string | undefined {
  const key = `note:${regionId.startsWith("custom:") ? "custom" : regionId}`;
  return t.has(key) ? t.raw(key) : english;
}
