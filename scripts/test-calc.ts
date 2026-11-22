// Run: npm test
import assert from "node:assert/strict";
import { calculate, QuoteError } from "../src/lib/calc";
import { COUNTRIES } from "../src/lib/taxRules";
import { checkCalendarUrl, parseIcs, toStays } from "../src/lib/calendar";
import { customRegion, parseCustomTax, type CustomTax } from "../src/lib/custom";

const noFee = () => 0;
const q = (o: Partial<Parameters<typeof calculate>[0]>) =>
  calculate(
    { regionId: "es-balearic", accommodationTypeId: "holiday-rental", checkIn: "2026-07-10", nights: 7, adults: 2, childAges: [], ...o },
    noFee,
  );

// Balearic high season: 2 adults × 7 × €2 = €28
assert.equal(q({}).taxCents, 2800);
// Child under 16 exempt, 16-year-old pays
assert.equal(q({ childAges: [5, 16] }).taxCents, 3 * 7 * 200);
// 10 nights: 8 full + 2 at 50% → 2 × (8×200 + 2×100) = 3600
assert.equal(q({ nights: 10 }).taxCents, 3600);
// Low season: 2 × 7 × €0.50 = €7
assert.equal(q({ checkIn: "2026-01-10" }).taxCents, 700);
// Straddles season change (Oct 29 → Nov 2): 3 high + 1 low
assert.equal(q({ checkIn: "2026-10-29", nights: 4 }).taxCents, 2 * (3 * 200 + 50));
// Wrap-around season over new year
assert.equal(q({ checkIn: "2026-12-30", nights: 3 }).taxCents, 2 * 3 * 50);

// Lisbon: capped at 7 nights, under 13 exempt
const lis = calculate({ regionId: "pt-lisbon", accommodationTypeId: "any", checkIn: "2026-05-01", nights: 10, adults: 2, childAges: [12] }, noFee);
assert.equal(lis.taxCents, 2 * 7 * 400);

// Greece: per property, guest count irrelevant
const gr = calculate({ regionId: "gr-all", accommodationTypeId: "short-rental", checkIn: "2026-08-01", nights: 5, adults: 6, childAges: [] }, noFee);
assert.equal(gr.taxCents, 5 * 800);

// Amsterdam percent: 12.5% × €150 × 3 = €56.25
const ams = calculate({ regionId: "nl-amsterdam", accommodationTypeId: "any", checkIn: "2026-08-01", nights: 3, adults: 2, childAges: [], nightlyPriceCents: 15000 }, noFee);
assert.equal(ams.taxCents, 5625);

// Malta (current): €1.50 pp/night, adults only, capped at 15 nights (= €22.50 pp)
const mt = (o: object) => calculate({ regionId: "mt-all", accommodationTypeId: "other", checkIn: "2026-11-01", nights: 5, adults: 2, childAges: [], ...o }, noFee);
assert.equal(mt({}).taxCents, 2 * 5 * 150);
assert.equal(mt({ childAges: [17] }).taxCents, 2 * 5 * 150);
assert.equal(mt({ nights: 20 }).taxCents, 2 * 2250);
assert.equal(mt({ accommodationTypeId: "hotel" }).taxCents, 2 * 5 * 150);

// Malta from 1 Jan 2027: holiday rentals €10 (cap €80 pp), hotels €8 (cap €64 pp)
const mt27 = (o: object) => mt({ checkIn: "2027-02-01", ...o });
assert.equal(mt27({ accommodationTypeId: "apartment" }).taxCents, 2 * 5 * 1000);
assert.equal(mt27({ accommodationTypeId: "hotel" }).taxCents, 2 * 5 * 800);
assert.equal(mt27({ accommodationTypeId: "apartment", nights: 12 }).taxCents, 2 * 8000);
assert.equal(mt27({ accommodationTypeId: "hotel", nights: 12 }).taxCents, 2 * 6400);
assert.equal(mt27({ accommodationTypeId: "hotel", childAges: [10] }).taxCents, 2 * 5 * 800);
// Stay over New Year: nights before 1 Jan at €1.50, later nights at the new rate…
assert.equal(mt({ checkIn: "2026-12-31", nights: 2, accommodationTypeId: "apartment" }).taxCents, 2 * (150 + 1000));
assert.equal(mt({ checkIn: "2026-12-31", nights: 2, accommodationTypeId: "hotel" }).taxCents, 2 * (150 + 800));
// …but the per-person cap is the one in force at check-in (€22.50 for check-ins in 2026)
assert.equal(mt({ checkIn: "2026-12-30", nights: 5, accommodationTypeId: "apartment" }).taxCents, 2 * 2250);

COUNTRIES.push({ code: "XC", name: "Cap", flag: "", regions: [{ id: "xx-cap", name: "C", taxName: "T", currency: "EUR", verifiedOn: "", sources: [],
  accommodationTypes: [{ id: "a", label: "A", basis: "person_night", seasons: [{ from: "01-01", to: "12-31", rateCents: 1000, capPerPersonCents: 8000 }] }] }] });
// Per-person cap (money), and explanation text
const capped = calculate({ regionId: "xx-cap", accommodationTypeId: "a", checkIn: "2027-02-01", nights: 10, adults: 2, childAges: [] }, noFee);
assert.equal(capped.taxCents, 2 * 8000);
assert.match(mt({}).explanation[0], /In Malta, the law requires every guest aged 18 or over staying in holiday rentals.*€1\.50 per person per night, capped at €22\.50/);
assert.match(q({}).explanation.join(" "), /From night 9 onwards, the rate is reduced by 50%/);

// Rate change mid-stay (validFrom/validUntil): 2 nights old rate + 2 nights new rate
COUNTRIES.push({ code: "XX", name: "Test", flag: "", regions: [{ id: "xx", name: "X", taxName: "T", currency: "EUR", verifiedOn: "", sources: [],
  accommodationTypes: [{ id: "a", label: "A", basis: "person_night", seasons: [
    { from: "01-01", to: "12-31", rateCents: 150, validUntil: "2027-01-01" },
    { from: "01-01", to: "12-31", rateCents: 1000, validFrom: "2027-01-01" },
  ] }] }] });
assert.equal(calculate({ regionId: "xx", accommodationTypeId: "a", checkIn: "2026-12-30", nights: 4, adults: 1, childAges: [] }, noFee).taxCents, 2 * 150 + 2 * 1000);

// Service fee
assert.equal(calculate({ regionId: "pt-lisbon", accommodationTypeId: "any", checkIn: "2026-05-01", nights: 1, adults: 1, childAges: [] }, () => 50).totalCents, 450);

// Validation
assert.throws(() => q({ nights: 0 }), QuoteError);
assert.throws(() => q({ adults: 0 }), QuoteError);
assert.throws(() => q({ regionId: "nope" }), QuoteError);
assert.throws(() => calculate({ regionId: "nl-amsterdam", accommodationTypeId: "any", checkIn: "2026-08-01", nights: 3, adults: 2, childAges: [] }, noFee), QuoteError);

// ---- New destinations ----
const c = (o: Partial<Parameters<typeof calculate>[0]>) =>
  calculate({ regionId: "", accommodationTypeId: "apartment", checkIn: "2026-07-10", nights: 3, adults: 2, childAges: [], ...o }, noFee);
// Dubrovnik peak €2.65; child 8 free; teen 14 pays 50%
const dub = c({ regionId: "hr-dubrovnik", childAges: [8, 14] });
assert.equal(dub.taxCents, 2 * 3 * 265 + Math.round(1 * 3 * 265 * 0.5));
assert.equal(dub.taxableGuests, 3);
assert.match(dub.explanation.join(" "), /Guests aged 12–17 pay 50%/);
// Edinburgh: 5% of £120/night, only first 5 nights, in GBP
const edi = c({ regionId: "gb-edinburgh", nights: 8, nightlyPriceCents: 12000 });
assert.equal(edi.taxCents, 5 * 600);
assert.equal(edi.currency, "GBP");
assert.match(edi.lines[0].description, /£120\.00/);
assert.match(edi.explanation[0], /capped at 5 nights per stay/);
// Amsterdam: 12.5% until 31 Dec 2026, 16% from 1 Jan 2027 (stay crossing new year)
const ams2 = c({ regionId: "nl-amsterdam", checkIn: "2026-12-30", nights: 4, nightlyPriceCents: 10000 });
assert.equal(ams2.taxCents, 2 * 1250 + 2 * 1600);
// Prague: CZK 50 pp/night, under 18 free, formatted in koruna
const prg = c({ regionId: "cz-prague", childAges: [10] });
assert.equal(prg.taxCents, 2 * 3 * 5000);
assert.match(prg.lines[0].description, /CZK/);
// Berlin: no 21-night limit any more
assert.equal(c({ regionId: "de-berlin", nights: 30, nightlyPriceCents: 10000 }).taxCents, 30 * 750);
assert.match(c({ regionId: "de-berlin", nightlyPriceCents: 10000 }).explanation.join(" "), /There is no cap/);
// Barcelona: €9.50, 7-night cap
assert.equal(c({ regionId: "es-barcelona", nights: 10 }).taxCents, 2 * 7 * 950);

// ---- Custom destination (host sets own rate) ----
assert.equal(typeof parseCustomTax({ countryName: "France", placeName: "", currency: "EUR", rate: "2" }), "string");
assert.equal(typeof parseCustomTax({ countryName: "France", placeName: "Nice", currency: "XYZ", rate: "2" }), "string");
assert.equal(typeof parseCustomTax({ countryName: "France", placeName: "Nice", currency: "EUR", basis: "percent", capType: "amount", percent: "5", capAmount: "10" }), "string");
const nice = parseCustomTax({ countryName: "France", placeName: "Nice", taxName: "Taxe de séjour", currency: "EUR", basis: "person_night", rate: "2.88", minTaxableAge: "18", capType: "amount", capAmount: "10" }) as CustomTax;
assert.deepEqual([nice.rateCents, nice.minTaxableAge, nice.capPerPersonCents], [288, 18, 1000]);
const niceQ = calculate({ regionId: "x", accommodationTypeId: "custom", checkIn: "2026-12-01", nights: 5, adults: 2, childAges: [12] }, noFee, customRegion("p9", nice));
assert.equal(niceQ.taxCents, 2 * 1000); // 5 × 2.88 = 14.40 > 10.00 cap
assert.match(niceQ.explanation[0], /In Nice, the law requires every guest aged 18 or over to pay the Taxe de séjour: €2\.88 per person per night, capped at €10\.00 per person per stay\./);
const usd = parseCustomTax({ countryName: "USA", placeName: "Austin", taxName: "Hotel Occupancy Tax", currency: "USD", basis: "percent", percent: "17", capType: "none" }) as CustomTax;
const usdQ = calculate({ regionId: "x", accommodationTypeId: "custom", checkIn: "2026-12-01", nights: 2, adults: 2, childAges: [], nightlyPriceCents: 20000 }, noFee, customRegion("p8", usd));
assert.equal(usdQ.taxCents, 2 * 3400);
assert.match(usdQ.lines[0].description, /US\$200\.00/);
assert.match(usdQ.explanation.join(" "), /There is no cap/);

// ---- Calendar import (iCal) ----
const airbnbIcs = [
  "BEGIN:VCALENDAR", "PRODID;X-RICAL-TZSOURCE=TZINFO:-//Airbnb Inc//Hosting Calendar 1.0//EN", "VERSION:2.0",
  "BEGIN:VEVENT", "DTEND;VALUE=DATE:20261209", "DTSTART;VALUE=DATE:20261203", "UID:1418fb94e984-abc@airbnb.com",
  "DESCRIPTION:Reservation URL: https://www.airbnb.com/hosting/reservations/details/HMZ8812ABC\\nPhone Number (Last 4 Digits): 4567",
  "SUMMARY:Reserved", "END:VEVENT",
  "BEGIN:VEVENT", "DTEND;VALUE=DATE:20261220", "DTSTART;VALUE=DATE:20261215", "UID:blk@airbnb.com", "SUMMARY:Airbnb (Not available)", "END:VEVENT",
  "END:VCALENDAR",
].join("\r\n");
const bookingIcs = [
  "BEGIN:VCALENDAR", "VERSION:2.0", "PRODID:-//Booking.com//NONSGML//EN",
  "BEGIN:VEVENT", "UID:8a6f@booking.com", "DTSTART;VALUE=DATE:20270105", "DTEND;VALUE=DATE:20270108", "SUMMARY:CLOSED - Not available", "END:VEVENT",
  "END:VCALENDAR",
].join("\n");
const prop = { id: "p1", name: "Flat 3" };
const air = toStays(parseIcs(airbnbIcs), "airbnb", prop);
assert.equal(air.length, 1); // owner block skipped
assert.deepEqual([air[0].checkIn, air[0].checkOut, air[0].nights, air[0].reservationCode, air[0].phoneLast4], ["2026-12-03", "2026-12-09", 6, "HMZ8812ABC", "4567"]);
const bk = toStays(parseIcs(bookingIcs), "booking", prop);
assert.deepEqual([bk.length, bk[0].checkIn, bk[0].nights], [1, "2027-01-05", 3]);
// Folded long lines (RFC 5545) are joined
assert.equal(parseIcs("BEGIN:VEVENT\r\nDTSTART;VALUE=DATE:20270101\r\nDTEND;VALUE=DATE:20270102\r\nDESCRIPTION:Reservation URL: https://www.airbnb.com/hosting/reser\r\n vations/details/HMFOLD123\r\nEND:VEVENT")[0].description.includes("HMFOLD123"), true);
// Only Airbnb / Booking.com links are accepted (server must not fetch arbitrary URLs)
assert.equal(checkCalendarUrl("airbnb", "https://www.airbnb.com/calendar/ical/123.ics?s=abc"), null);
assert.equal(checkCalendarUrl("airbnb", "https://www.airbnb.co.uk/calendar/ical/123.ics?s=abc"), null);
assert.equal(checkCalendarUrl("booking", "https://admin.booking.com/hotel/hoteladmin/ical.html?t=x"), null);
assert.notEqual(checkCalendarUrl("airbnb", "https://evil.com/airbnb.com.ics"), null);
assert.notEqual(checkCalendarUrl("booking", "https://booking.com.evil.net/x"), null);
assert.notEqual(checkCalendarUrl("airbnb", "http://www.airbnb.com/calendar/ical/1.ics"), null);
assert.notEqual(checkCalendarUrl("booking", "https://169.254.169.254/latest"), null);

console.log("✓ all tax calculation + calendar tests passed");
