import type { T } from "@/i18n/translate";
import { localizeRegion } from "@/i18n/places";
import { date, money } from "@/i18n/translate";
import { calculate } from "./calc";
import { capSummary, explainRules, rateSummary, seasonsInForce } from "./explain";
import { describeLine } from "./format";
import { DEFAULT_REGION_ID, findRegion } from "./taxRules";

/** Host-written sample content (as a local host would write it) for each visitor country's built-in destination. */
type Sample = {
  regionId: string;
  property: string;
  address: string;
  wifi: string;
  phone: string;
  directions: string;
  parking: string;
  rubbish: string;
  guest: string;
};

const SAMPLES: Record<string, Sample> = {
  MT: { regionId: "mt-all", property: "Seaview Apartment, Sliema", address: "Triq ix-Xatt 12, Flat 3, Sliema", wifi: "Seaview_5G", phone: "+356 9912 3456", directions: "Bus X2 to Sliema Ferries, 45 min", parking: "Free street parking on Triq il-Kbira, 2 min walk", rubbish: "Bins out Mon, Wed & Fri before 7:30", guest: "Luca Bianchi" },
  ES: { regionId: "es-barcelona", property: "Gràcia Loft, Barcelona", address: "Carrer de Verdi 24, 2º 1ª, Barcelona", wifi: "GraciaLoft_WiFi", phone: "+34 612 345 678", directions: "Aerobús to Plaça de Catalunya, then metro L3, 40 min", parking: "Public car park on Carrer de Bonavista, 3 min walk", rubbish: "Recycling containers on the corner of Carrer de Verdi", guest: "Luca Bianchi" },
  PT: { regionId: "pt-lisbon", property: "Alfama Terrace, Lisbon", address: "Rua de São Miguel 18, 3º, Lisboa", wifi: "AlfamaTerrace", phone: "+351 912 345 678", directions: "Metro to Baixa-Chiado, then tram 28, 35 min", parking: "Paid parking at Campo das Cebolas, 5 min walk", rubbish: "Bins at the end of the street, collected nightly", guest: "Luca Bianchi" },
  IT: { regionId: "it-rome", property: "Trastevere Apartment, Rome", address: "Via della Lungaretta 45, int. 6, Roma", wifi: "Trastevere_Home", phone: "+39 333 123 4567", directions: "Leonardo Express to Termini, then tram 8, 50 min", parking: "Restricted traffic zone: use the garage on Via Induno", rubbish: "Separate paper, plastic, glass and organic in the courtyard", guest: "Sophie Martin" },
  GR: { regionId: "gr-all", property: "Plaka Suites, Athens", address: "Kydathineon 14, Plaka, Athens", wifi: "PlakaSuites", phone: "+30 691 234 5678", directions: "Metro line 3 to Syntagma, then a 7-minute walk", parking: "Paid parking on Mitropoleos Street", rubbish: "Blue recycling bins at the corner of Adrianou", guest: "Luca Bianchi" },
  AT: { regionId: "at-vienna", property: "Ringstrasse Apartment, Vienna", address: "Schottenring 12/8, 1010 Wien", wifi: "Ring_Apartment", phone: "+43 664 123 4567", directions: "City Airport Train to Wien Mitte, then U4, 30 min", parking: "Short-stay zone: use the Garage am Hof", rubbish: "Waste room in the courtyard; separate paper and plastic", guest: "Luca Bianchi" },
  HR: { regionId: "hr-dubrovnik", property: "Old Town Studio, Dubrovnik", address: "Od Puča 9, Dubrovnik", wifi: "OldTownStudio", phone: "+385 91 234 5678", directions: "Airport shuttle bus to Pile Gate, 30 min", parking: "No cars in the Old Town: car park at Ilijina Glavica", rubbish: "Leave bags outside the door before 9:00", guest: "Luca Bianchi" },
  CZ: { regionId: "cz-prague", property: "Malá Strana Apartment, Prague", address: "Nerudova 21, Praha 1", wifi: "MalaStrana_Home", phone: "+420 601 234 567", directions: "Bus 59, then tram 22 to Malostranské náměstí, 40 min", parking: "Blue zone is residents only: use P+R Veleslavín", rubbish: "Coloured recycling bins on Jánský vršek", guest: "Luca Bianchi" },
  SI: { regionId: "si-ljubljana", property: "Riverside Apartment, Ljubljana", address: "Cankarjevo nabrežje 7, Ljubljana", wifi: "Riverside_LJ", phone: "+386 41 234 567", directions: "Airport shuttle to the bus station, then a 15-minute walk", parking: "Car-free centre: use the Kongresni trg garage", rubbish: "Courtyard bins for packaging, paper and bio waste", guest: "Luca Bianchi" },
  GB: { regionId: "gb-edinburgh", property: "Old Town Apartment, Edinburgh", address: "12 Cockburn Street, Edinburgh EH1 1BP", wifi: "OldTown_WiFi", phone: "+44 7700 900123", directions: "Airlink 100 bus to Waverley Bridge, 30 min", parking: "Permit zone: use the NCP car park on Market Street", rubbish: "Communal bins on Fleshmarket Close", guest: "Luca Bianchi" },
  NL: { regionId: "nl-amsterdam", property: "Canal House, Amsterdam", address: "Prinsengracht 263, Amsterdam", wifi: "CanalHouse_Guest", phone: "+31 6 12345678", directions: "Train to Centraal, then tram 13 to Westermarkt, 35 min", parking: "Use the Q-Park at Westerstraat", rubbish: "Underground waste containers on the corner", guest: "Luca Bianchi" },
  US: { regionId: "us-oahu", property: "Waikiki Condo, Honolulu", address: "2425 Kuhio Ave, #1204, Honolulu", wifi: "Waikiki_Guest", phone: "+1 808 555 0142", directions: "TheBus route 20 from the airport, 50 min", parking: "Assigned stall #318, garage level 3", rubbish: "Trash chute by the elevator; recycling bins in the lobby", guest: "Luca Bianchi" },
  DE: { regionId: "de-berlin", property: "Mitte Apartment, Berlin", address: "Torstraße 140, 10119 Berlin", wifi: "Mitte_Gast", phone: "+49 151 2345 6789", directions: "FEX train to Hauptbahnhof, then U6, 45 min", parking: "Paid street parking; Q-Park Friedrichstraße nearby", rubbish: "Courtyard bins: yellow for packaging, blue for paper", guest: "Luca Bianchi" },
};

/** Everything the homepage examples need, for one destination, already written in the reader's language. */
export type DemoCard = {
  property: string;
  propertyShort: string;
  flag: string;
  place: string;
  regionName: string;
  stay: string;
  taxName: string;
  amount: string;
  rate: string;
  formula: string;
  cap: string | null;
  explanation: string;
  pay: string;
  fromShort: string;
  toShort: string;
  fromLong: string;
  toLong: string;
  nights: string;
  guest: string;
  guestFirst: string;
  receiptNo: string;
  local: Pick<Sample, "address" | "wifi" | "phone" | "directions" | "parking" | "rubbish">;
  /** Dashboard example: Kyle Brown's paid stay and the total collected with this one. */
  secondAmount: string;
  totalAmount: string;
  /** ISO currency of the sample destination. */
  currency: string;
  /** Short rate tile for the features grid: [place, headline rate, cap]. */
  tile: [string, string, string];
  /** Upcoming calendar bookings, by arrival date. Names are known only once a payment link exists. */
  upcoming: DemoBooking[];
};

export type DemoBooking = {
  src: "airbnb" | "booking";
  name?: string;
  ref?: string;
  phoneLast4?: string;
  arrives: string;
  dates: string;
  nights: number;
  people: number;
  amount?: string;
  status: "paid" | "sent" | "new";
};

const addDays = (iso: string, n: number) => new Date(Date.parse(iso) + n * 864e5).toISOString().slice(0, 10);

/**
 * The homepage's sample stay, worked out with the real tax engine for the visitor's country
 * (2 adults, 6 nights in an apartment, starting two weeks from today). Falls back to Malta.
 */
export function demoCard(country: string | null, t: T): DemoCard {
  const picked = (country && SAMPLES[country]) || SAMPLES.MT;
  // The Malta sample (what ecotaxpay.com shows) has its host notes translated; others are shown as written.
  const sample = picked === SAMPLES.MT ? { ...picked, parking: t("demo.mt.parking"), rubbish: t("demo.mt.rubbish"), directions: t("demo.mt.directions") } : picked;
  const found = findRegion(sample.regionId) ?? findRegion(DEFAULT_REGION_ID)!;
  const region = localizeRegion(found.region, t.locale); // names in the visitor's language
  const acc = region.accommodationTypes.find((a) => a.id === "apartment") ?? region.accommodationTypes[0];

  const checkIn = addDays(new Date().toISOString().slice(0, 10), 14);
  const nightly = region.currency === "CZK" ? 300000 : 12000; // only used by percentage-based taxes
  const quote = (nights: number, adults: number, from = checkIn) =>
    calculate({ regionId: region.id, accommodationTypeId: acc.id, checkIn: from, nights, adults, childAges: [], nightlyPriceCents: nightly }, () => 0, found);
  const q = quote(6, 2);
  const kyle = { from: addDays(checkIn, -11), nights: 4, people: 2 };
  const emma = { from: addDays(checkIn, -5), nights: 3, people: 1 };
  const qKyle = quote(kyle.nights, kyle.people, kyle.from);
  const qEmma = quote(emma.nights, emma.people, emma.from);
  const arrives = (iso: string) => date(iso, t.locale, { weekday: "short", day: "numeric", month: "short" });

  const m = (cents: number) => money(cents, q.currency, t.locale);
  const short = (iso: string) => date(iso, t.locale, { day: "numeric", month: "short" });
  const long = (iso: string) => date(iso, t.locale, { day: "numeric", month: "short", year: "numeric" });
  const place = new Intl.DisplayNames([t.locale], { type: "region" }).of(found.country.code) ?? found.country.name;
  const range = (from: string, nights: number) => `${short(from)} → ${short(addDays(from, nights))}`;

  const season = seasonsInForce(acc.seasons ?? [], checkIn)[0];
  const headline =
    acc.basis === "percent"
      ? `${(season?.percent ?? acc.percent ?? 0).toLocaleString(t.locale)}%`
      : money(season?.rateCents ?? 0, region.currency, t.locale);
  const regionName = region.name.replace(/\s*\(.*\)\s*$/, "");

  return {
    property: sample.property,
    propertyShort: sample.property.split(",")[0],
    flag: found.country.flag,
    place,
    regionName,
    stay: `${short(q.checkIn)} → ${short(q.checkOut)} · ${t.plural("guest.adults", 2)} · ${t.plural("line.nights", 6)}`,
    taxName: region.taxName.replace(/\s*\(.*\)\s*$/, ""),
    amount: m(q.taxCents),
    rate: rateSummary(region, acc, checkIn, t),
    formula: q.lines.map((l) => describeLine(l, q.currency, t)).join(" + "),
    cap: capSummary(region, acc, checkIn, t),
    explanation: explainRules(region, acc, checkIn, t)[0] ?? "",
    pay: t("guest.pay", { amount: m(q.taxCents) }),
    fromShort: short(q.checkIn),
    toShort: short(q.checkOut),
    fromLong: long(q.checkIn),
    toLong: long(q.checkOut),
    nights: t.plural("line.nights", 6),
    guest: sample.guest,
    guestFirst: sample.guest.split(" ")[0],
    receiptNo: `${q.checkIn.slice(0, 4)}-000142`,
    local: sample,
    secondAmount: m(qKyle.taxCents),
    totalAmount: m(q.taxCents + qKyle.taxCents),
    currency: region.currency,
    tile: [regionName, headline, capSummary(region, acc, checkIn, t) ?? t("explain.noCap").split(":")[0]],
    upcoming: [
      { src: "airbnb", name: "Kyle Brown", ref: "HMKX82PL", arrives: arrives(kyle.from), dates: range(kyle.from, kyle.nights), nights: kyle.nights, people: kyle.people, amount: m(qKyle.taxCents), status: "paid" },
      { src: "booking", name: "Emma Schmidt", arrives: arrives(emma.from), dates: range(emma.from, emma.nights), nights: emma.nights, people: emma.people, amount: m(qEmma.taxCents), status: "sent" },
      { src: "airbnb", ref: "HMQ4X2ZK", phoneLast4: "4821", arrives: arrives(checkIn), dates: range(checkIn, 6), nights: 6, people: 2, status: "new" },
      { src: "booking", arrives: arrives(addDays(checkIn, 9)), dates: range(addDays(checkIn, 9), 3), nights: 3, people: 0, status: "new" },
    ],
  };
}
