import { explainRules, seasonsInForce } from "./explain";
import { findRegion, type AccommodationType, type Country, type Region, type Season } from "./taxRules";

export type StayInput = {
  regionId: string;
  accommodationTypeId: string;
  checkIn: string; // YYYY-MM-DD
  nights: number;
  adults: number;
  childAges: number[];
  nightlyPriceCents?: number; // required for percent-based taxes
};

/** Structured line, so it can be written out in any language (see lib/format.ts). */
export type LineDetail =
  | { kind: "person"; people: number; nights: number; rate: number; season?: string; longStayPct?: number; fromNight?: number; reduced?: { from: number; to: number; pct: number } }
  | { kind: "unit"; nights: number; rate: number; season?: string }
  | { kind: "percent"; pct: number; price: number; nights: number }
  | { kind: "cap"; people: number; cap: number; reduced?: { from: number; to: number; pct: number } };

/** `description` is English (CSV exports, old records); `detail` is used to show it in the reader's language. */
export type Line = { description: string; amountCents: number; detail?: LineDetail };

export type Quote = {
  regionId: string;
  regionName: string;
  countryName: string;
  taxName: string;
  accommodationLabel: string;
  currency: string;
  checkIn: string;
  checkOut: string;
  nights: number;
  adults: number;
  childAges: number[];
  taxableGuests: number;
  lines: Line[];
  /** Plain-language explanation of the law for the guest. */
  explanation: string[];
  taxCents: number;
  feeCents: number;
  totalCents: number;
  notes: string[]; // English; guestNotes() renders them in any language
  exemptGuests?: number;
  reducedGuests?: number;
  minTaxableAge?: number;
  reducedRange?: { from: number; to: number; pct: number };
  hostNotes: string[]; // rate caveats, shown to the host only
  /** Quick link: the host typed the amount, so there is no stay, destination or calculation. */
  manual?: boolean;
};

export const LIMITS = { maxNights: 90, maxAdults: 20, maxChildren: 10 };

/** Validation problem with a stay. `key` is the message key for the reader's language ("q.*"). */
export class QuoteError extends Error {
  constructor(message: string, public key = "q.invalid") {
    super(message);
  }
}

export function formatMoney(cents: number, currency = "EUR", locale = "en-GB"): string {
  try {
    return new Intl.NumberFormat(locale, { style: "currency", currency }).format(cents / 100);
  } catch {
    return new Intl.NumberFormat("en-GB", { style: "currency", currency }).format(cents / 100);
  }
}

function addDays(iso: string, days: number): string {
  const d = new Date(`${iso}T00:00:00Z`);
  d.setUTCDate(d.getUTCDate() + days);
  return d.toISOString().slice(0, 10);
}

function seasonFor(seasons: Season[], isoDate: string): Season {
  const md = isoDate.slice(5); // "MM-DD" compares lexically
  const match = seasonsInForce(seasons, isoDate).find((s) =>
    s.from <= s.to ? md >= s.from && md <= s.to : md >= s.from || md <= s.to,
  );
  if (!match) throw new QuoteError(`No tax rate configured for ${isoDate}`);
  return match;
}

/** Service fee added on top of the tax (configure via env; 0 = off). */
export function serviceFeeCents(taxCents: number): number {
  const fixed = Number(process.env.SERVICE_FEE_FIXED_CENTS ?? 0);
  const pct = Number(process.env.SERVICE_FEE_PERCENT ?? 0);
  if (taxCents === 0) return 0;
  return Math.round(fixed + (taxCents * pct) / 100);
}

/** `resolved` lets a host's own custom destination be used instead of the built-in list. */
export function calculate(
  input: StayInput,
  feeFn: (tax: number) => number = serviceFeeCents,
  resolved?: { country: Country; region: Region },
): Quote {
  const found = resolved ?? findRegion(input.regionId);
  if (!found) throw new QuoteError("Unknown destination", "q.destination");
  const { country, region } = found;
  const acc = region.accommodationTypes.find((a) => a.id === input.accommodationTypeId);
  if (!acc) throw new QuoteError("Unknown accommodation type", "q.accType");

  if (!/^\d{4}-\d{2}-\d{2}$/.test(input.checkIn) || isNaN(Date.parse(input.checkIn)))
    throw new QuoteError("Invalid check-in date", "q.checkIn");
  const nights = Math.floor(input.nights);
  const adults = Math.floor(input.adults);
  if (!(nights >= 1 && nights <= LIMITS.maxNights)) throw new QuoteError("Invalid number of nights", "q.nights");
  if (!(adults >= 1 && adults <= LIMITS.maxAdults)) throw new QuoteError("At least one adult is required", "q.adults");
  if (input.childAges.length > LIMITS.maxChildren) throw new QuoteError("Too many children", "q.children");
  if (input.childAges.some((a) => !(Number.isInteger(a) && a >= 0 && a <= 17)))
    throw new QuoteError("Invalid child age", "q.childAge");

  const minAge = region.minTaxableAge ?? 0;
  const red = region.childReduction;
  const isReduced = (age: number) => !!red && age >= red.fromAge && age <= red.toAge;
  const reduced = input.childAges.filter((a) => a >= minAge && isReduced(a)).length;
  const full = adults + input.childAges.filter((a) => a >= minAge && !isReduced(a)).length;
  const taxableGuests = full + reduced;
  const exemptGuests = adults + input.childAges.length - taxableGuests;

  const lines = buildLines(region, acc, input, nights, { full, reduced });
  const taxCents = lines.reduce((s, l) => s + l.amountCents, 0);
  const feeCents = feeFn(taxCents);

  const notes: string[] = [];
  if (exemptGuests > 0 && acc.basis === "person_night")
    notes.push(`${exemptGuests} ${exemptGuests === 1 ? "child" : "children"} under ${minAge} ${exemptGuests === 1 ? "is" : "are"} exempt.`);
  if (reduced > 0 && acc.basis === "person_night" && red)
    notes.push(`${reduced} ${reduced === 1 ? "guest" : "guests"} aged ${red.fromAge}–${red.toAge} ${reduced === 1 ? "pays" : "pay"} ${Math.round(red.multiplier * 100)}%.`);


  return {
    regionId: region.id,
    regionName: region.name,
    countryName: country.name,
    taxName: region.taxName,
    accommodationLabel: acc.label,
    currency: region.currency,
    checkIn: input.checkIn,
    checkOut: addDays(input.checkIn, nights),
    nights,
    adults,
    childAges: input.childAges,
    taxableGuests,
    lines,
    explanation: explainRules(region, acc, input.checkIn),
    taxCents,
    feeCents,
    totalCents: taxCents + feeCents,
    notes,
    exemptGuests: acc.basis === "person_night" ? exemptGuests : 0,
    reducedGuests: acc.basis === "person_night" ? reduced : 0,
    minTaxableAge: region.minTaxableAge,
    reducedRange: red ? { from: red.fromAge, to: red.toAge, pct: Math.round(red.multiplier * 100) } : undefined,
    hostNotes: region.notes ? [region.notes] : [],
  };
}

function buildLines(
  region: Region,
  acc: AccommodationType,
  input: StayInput,
  nights: number,
  guests: { full: number; reduced: number },
): Line[] {
  const cur = region.currency;
  const money = (n: number) => formatMoney(n, cur);
  const taxedNights = Math.min(nights, region.maxNights ?? nights);
  const nightsWord = (n: number) => `${n} ${n === 1 ? "night" : "nights"}`;

  if (acc.basis === "percent") {
    const price = Math.floor(input.nightlyPriceCents ?? 0);
    if (!(price > 0)) throw new QuoteError("Enter the nightly accommodation price", "q.price");
    // Percentages can change on a date (e.g. Amsterdam 12.5% → 16%): group nights by the rate in force.
    const byPct = new Map<number, number>();
    for (let i = 0; i < taxedNights; i++) {
      const pct = acc.seasons?.length ? (seasonFor(acc.seasons, addDays(input.checkIn, i)).percent ?? acc.percent ?? 0) : (acc.percent ?? 0);
      byPct.set(pct, (byPct.get(pct) ?? 0) + 1);
    }
    return [...byPct].map(([pct, count]) => ({
      description: `${pct}% × ${money(price)} × ${nightsWord(count)}`,
      amountCents: Math.round(((price * pct) / 100) * count),
      detail: { kind: "percent", pct, price, nights: count },
    }));
  }

  // Group nights that share the same rate + multiplier into one line.
  const groups = new Map<string, { rate: number; mult: number; label?: string; count: number }>();
  for (let i = 0; i < taxedNights; i++) {
    const season = seasonFor(acc.seasons ?? [], addDays(input.checkIn, i));
    const mult = region.longStay && i + 1 >= region.longStay.fromNight ? region.longStay.multiplier : 1;
    const key = `${season.rateCents}|${mult}|${season.label ?? ""}`;
    const g = groups.get(key) ?? { rate: season.rateCents ?? 0, mult, label: season.label, count: 0 };
    g.count++;
    groups.set(key, g);
  }

  if (acc.basis === "unit_night")
    return [...groups.values()].map((g) => ({
      description: `1 property × ${nightsWord(g.count)} × ${money(g.rate * g.mult)}${g.label ? ` (${g.label})` : ""}`,
      amountCents: Math.round(g.count * g.rate * g.mult),
      detail: { kind: "unit", nights: g.count, rate: g.rate * g.mult, season: g.label },
    }));

  // Per person: full-rate guests, plus guests on a reduced rate (e.g. Croatia: ages 12–17 pay 50%).
  const red = region.childReduction;
  const reducedInfo = red ? { from: red.fromAge, to: red.toAge, pct: Math.round(red.multiplier * 100) } : undefined;
  const people = [
    { count: guests.full, mult: 1, reduced: undefined as typeof reducedInfo, label: (n: number) => `${n} ${n === 1 ? "person" : "people"}` },
    { count: guests.reduced, mult: red?.multiplier ?? 1, reduced: reducedInfo, label: (n: number) => `${n} aged ${red?.fromAge}–${red?.toAge} (${Math.round((red?.multiplier ?? 1) * 100)}%)` },
  ].filter((p) => p.count > 0);

  // Per-person cap for the whole stay, from the rate in force at check-in.
  const cap = seasonFor(acc.seasons ?? [], input.checkIn).capPerPersonCents;
  const perPerson = [...groups.values()].reduce((s, g) => s + g.count * g.rate * g.mult, 0);

  return people.flatMap((p): Line[] => {
    if (cap && perPerson * p.mult > cap)
      return [{
        description: `${p.label(p.count)} × ${money(cap)} (maximum per person per stay)`,
        amountCents: p.count * cap,
        detail: { kind: "cap" as const, people: p.count, cap, reduced: p.reduced },
      }];
    return [...groups.values()].map((g) => {
      const tags = [g.label, g.mult !== 1 ? `${Math.round((1 - g.mult) * 100)}% off from night ${region.longStay!.fromNight}` : null]
        .filter(Boolean)
        .join(", ");
      return {
        description: `${p.label(p.count)} × ${nightsWord(g.count)} × ${money(g.rate * g.mult * p.mult)}${tags ? ` (${tags})` : ""}`,
        amountCents: Math.round(p.count * g.count * g.rate * g.mult * p.mult),
        detail: {
          kind: "person" as const,
          people: p.count,
          nights: g.count,
          rate: g.rate * g.mult * p.mult,
          season: g.label,
          longStayPct: g.mult !== 1 ? Math.round((1 - g.mult) * 100) : undefined,
          fromNight: g.mult !== 1 ? region.longStay!.fromNight : undefined,
          reduced: p.reduced,
        },
      };
    });
  });
}
