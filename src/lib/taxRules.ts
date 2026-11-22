// Tourist / eco tax rules per destination.
//
// ⚠️ Rates change often and published sources sometimes disagree. Every region
// carries `verifiedOn` + `sources`. Confirm each rate with the official authority
// before taking live payments, and update `verifiedOn` when you do.
//
// All money is in integer cents. Season dates are "MM-DD" (inclusive) and may
// wrap the new year (e.g. from "11-01" to "04-30").

export type Basis =
  | "person_night" // rate × taxable guests × nights
  | "unit_night" // rate × nights (per room / property, guest count irrelevant)
  | "percent"; // percent of the nightly accommodation price

export type Season = {
  from: string;
  to: string;
  /** Amount in the region's minor currency unit (cents, pence, haléř…). Not used for percent taxes. */
  rateCents?: number;
  /** For percent taxes whose percentage changes on a date. */
  percent?: number;
  label?: string;
  /** Optional legal validity window (YYYY-MM-DD): from inclusive, until exclusive. Used for rate changes. */
  validFrom?: string;
  validUntil?: string;
  /** Maximum per person for the whole stay (person_night only). Taken from the rate in force at check-in. */
  capPerPersonCents?: number;
};

export type AccommodationType = {
  id: string;
  label: string;
  /** Plural phrase used in the guest explanation ("staying in hotels"). */
  guestLabel?: string;
  basis: Basis;
  seasons?: Season[]; // for person_night / unit_night
  percent?: number; // for percent basis, e.g. 12.5
};

export type Region = {
  id: string;
  name: string;
  /** How the place is named in a sentence ("In Malta, …"). Defaults to `name`. */
  placeName?: string;
  taxName: string;
  /** ISO currency code. Only currencies with 2 decimal places are supported. */
  currency: string;
  /** Guests younger than this are exempt (omit = everyone pays). */
  minTaxableAge?: number;
  /** Only the first N nights of a stay are taxed. */
  maxNights?: number;
  /** Multiplier applied from night `fromNight` onwards (e.g. 50% from the 9th night). */
  longStay?: { fromNight: number; multiplier: number };
  /** Guests aged fromAge–toAge (inclusive) pay a fraction, e.g. Croatia: 12–17 pay 50%. */
  childReduction?: { fromAge: number; toAge: number; multiplier: number };
  accommodationTypes: AccommodationType[];
  notes?: string;
  verifiedOn: string;
  sources: string[];
};

export type Country = { code: string; name: string; flag: string; regions: Region[] };

// Malta Budget 2027: from 1 Jan 2027 holiday rentals (apartments, houses, rooms) pay
// €10/adult/night capped at €80, and hotels and other collective accommodation pay
// €8/adult/night capped at €64. Until then both pay €1.50 (cap €22.50).
// Announced in the Budget; check the legal notice (legislation.mt / MTA) and adjust this
// date if it starts later. Nights before this date keep the old rate.
// Set to null to switch the new rates off again.
export const MALTA_NEW_RATES_FROM: string | null = "2027-01-01";

type RatePeriod = { rateCents: number; capPerPersonCents?: number };
function rateChange(current: RatePeriod, next: RatePeriod, from: string | null): Season[] {
  if (!from) return [{ from: "01-01", to: "12-31", ...current }];
  return [
    { from: "01-01", to: "12-31", ...current, validUntil: from },
    { from: "01-01", to: "12-31", ...next, validFrom: from },
  ];
}

type Rate = Pick<AccommodationType, "basis" | "seasons" | "percent">;
/** Several accommodation types that the law taxes the same way. Keep ids stable: saved apartments reference them. */
function sameRate(rate: Rate, guestLabel: string, types: [id: string, label: string][]): AccommodationType[] {
  return types.map(([id, label]) => ({ id, label, guestLabel, ...rate }));
}
const allYear = (rateCents: number): Season[] => [{ from: "01-01", to: "12-31", rateCents }];

// The usual list for places where every type pays the same rate.
const EVERY_TYPE: [string, string][] = [
  ["apartment", "Apartment"],
  ["room", "Room in a home"],
  ["guesthouse", "Guest house"],
  ["bnb", "Bed & breakfast"],
  ["house", "Holiday house / villa"],
  ["hotel", "Hotel"],
  ["aparthotel", "Aparthotel / serviced apartment"],
  ["hostel", "Hostel"],
  ["any", "Other accommodation"],
];

export const COUNTRIES: Country[] = [
  {
    code: "ES",
    name: "Spain",
    flag: "🇪🇸",
    regions: [
      {
        id: "es-balearic",
        name: "Balearic Islands (Mallorca, Menorca, Ibiza, Formentera)",
        placeName: "the Balearic Islands",
        taxName: "Sustainable Tourism Tax (Ecotasa / ITS)",
        currency: "EUR",
        minTaxableAge: 16,
        longStay: { fromNight: 9, multiplier: 0.5 },
        accommodationTypes: [
          ...sameRate(
            { basis: "person_night", seasons: [
              { from: "05-01", to: "10-31", rateCents: 200, label: "High season" },
              { from: "11-01", to: "04-30", rateCents: 50, label: "Low season" },
            ] },
            "holiday rentals, tourist apartments and 3★ hotels",
            [
              ["apartment", "Apartment / tourist apartment"],
              ["holiday-rental", "Holiday house / villa"],
              ["room", "Room in a home"],
              ["hotel-3", "3★ hotel"],
            ],
          ),
          ...sameRate(
            { basis: "person_night", seasons: [
              { from: "05-01", to: "10-31", rateCents: 300, label: "High season" },
              { from: "11-01", to: "04-30", rateCents: 75, label: "Low season" },
            ] },
            "4★ hotels",
            [["hotel-4", "4★ / 4★ superior hotel"]],
          ),
          ...sameRate(
            { basis: "person_night", seasons: [
              { from: "05-01", to: "10-31", rateCents: 400, label: "High season" },
              { from: "11-01", to: "04-30", rateCents: 100, label: "Low season" },
            ] },
            "5★ hotels",
            [["hotel-5", "5★ / 5★ grand luxury hotel"]],
          ),
          ...sameRate(
            { basis: "person_night", seasons: [
              { from: "05-01", to: "10-31", rateCents: 100, label: "High season" },
              { from: "11-01", to: "04-30", rateCents: 25, label: "Low season" },
            ] },
            "guest houses, hostels and 1–2★ hotels",
            [
              ["guesthouse", "Guest house (hostal)"],
              ["hostel", "Hostel / 1–2★ hotel"],
            ],
          ),
        ],
        notes: "Sources disagree on whether 10% VAT is added on top of these rates. Check with ATIB.",
        verifiedOn: "2026-10-28",
        sources: [
          "https://chekin.com/en/blog/complete-guide-tourist-tax-in-spain/",
          "https://www.mallorca.com/en/advice/property/taxes-law/taxes-mallorca",
        ],
      },
      {
        id: "es-barcelona",
        name: "Barcelona",
        taxName: "Tourist Tax (IEET + city surcharge)",
        currency: "EUR",
        minTaxableAge: 17,
        maxNights: 7,
        accommodationTypes: sameRate({ basis: "person_night", seasons: [{ from: "01-01", to: "12-31", rateCents: 950 }] }, "tourist apartments and rooms", [
          ["apartment", "Tourist apartment (HUT)"],
          ["house", "Holiday house / villa"],
          ["room", "Room in a home"],
        ]),
        notes: "€4.50 Catalan tax + €5.00 Barcelona surcharge (from April 2026). The surcharge rises €1 each year to €8 in 2029. Hotels pay different rates (not set up). Sources disagree on the exempt age (under 16 or under 17).",
        verifiedOn: "2026-11-20",
        sources: [
          "https://www.hostaway.com/vacation-rental-guide/tourist-tax/spain/barcelona/",
          "https://chekin.com/en/blog/complete-guide-to-the-tourist-tax-in-catalonia/",
          "https://www.idealista.com/en/news/financial-advice-in-spain/2026/04/02/886033-barcelona-s-tourist-tax-is-now-double-here-s-what-to-know",
        ],
      },
    ],
  },
  {
    code: "PT",
    name: "Portugal",
    flag: "🇵🇹",
    regions: [
      {
        id: "pt-lisbon",
        name: "Lisbon",
        taxName: "Municipal Tourist Tax (Taxa Turística)",
        currency: "EUR",
        minTaxableAge: 13,
        maxNights: 7,
        accommodationTypes: sameRate({ basis: "person_night", seasons: allYear(400) }, "any accommodation", EVERY_TYPE),
        verifiedOn: "2026-10-28",
        sources: [
          "https://www.idealista.pt/en/news/legal-advice-in-portugal/2025/08/05/70982-tourist-tax-in-portugal-2025-rates-for-lisbon-the-algarve-madeira",
        ],
      },
      {
        id: "pt-porto",
        name: "Porto",
        taxName: "Municipal Tourist Tax (Taxa Turística)",
        currency: "EUR",
        minTaxableAge: 13,
        maxNights: 7,
        accommodationTypes: sameRate({ basis: "person_night", seasons: allYear(300) }, "any accommodation", EVERY_TYPE),
        notes: "Porto is reviewing an increase to €4 (Sept 2026). The exempt age is reported as both under 12 and under 13.",
        verifiedOn: "2026-10-28",
        sources: ["https://supercasa.pt/en-gb/noticias/porto-pode-aumentar-taxa-turistica-para-quatro-anos/n9072"],
      },
    ],
  },
  {
    code: "IT",
    name: "Italy",
    flag: "🇮🇹",
    regions: [
      {
        id: "it-rome",
        name: "Rome",
        taxName: "Contributo di Soggiorno",
        currency: "EUR",
        minTaxableAge: 10,
        maxNights: 10,
        accommodationTypes: [
          ...sameRate({ basis: "person_night", seasons: allYear(600) }, "short-term rentals, rooms, guest houses and B&Bs", [
            ["apartment", "Apartment (casa vacanze)"],
            ["short-rental", "Short-term rental"],
            ["room", "Room in a home"],
            ["guesthouse", "Guest house (affittacamere, 2nd category)"],
            ["bnb", "Bed & breakfast"],
          ]),
          ...sameRate({ basis: "person_night", seasons: allYear(400) }, "agriturismi and tourist residences", [
            ["agriturismo", "Agriturismo / tourist residence"],
          ]),
          ...sameRate({ basis: "person_night", seasons: allYear(350) }, "hostels", [["hostel", "Hostel"]]),
        ],
        notes: "Rome hotels pay €4–10 depending on stars, and guest houses €5–7 depending on category. Only the most common rate is set up here.",
        verifiedOn: "2026-10-28",
        sources: ["https://chekin.com/it/blog/tassa-di-soggiorno-roma/"],
      },
    ],
  },
  {
    code: "GR",
    name: "Greece",
    flag: "🇬🇷",
    regions: [
      {
        id: "gr-all",
        name: "All of Greece",
        placeName: "Greece",
        taxName: "Climate Resilience Fee",
        currency: "EUR",
        accommodationTypes: [
          ...sameRate(
            { basis: "unit_night", seasons: [
              { from: "04-01", to: "10-31", rateCents: 800, label: "Peak season" },
              { from: "11-01", to: "03-31", rateCents: 200, label: "Off season" },
            ] },
            "short-term rentals",
            [
              ["apartment", "Apartment (short-term rental)"],
              ["room", "Room (short-term rental)"],
              ["short-rental", "House / villa up to 80 m² (short-term rental)"],
            ],
          ),
          ...sameRate(
            { basis: "unit_night", seasons: [
              { from: "04-01", to: "10-31", rateCents: 1500, label: "Peak season" },
              { from: "11-01", to: "03-31", rateCents: 400, label: "Off season" },
            ] },
            "detached houses over 80 m²",
            [["detached-80", "Detached house / villa over 80 m²"]],
          ),
        ],
        notes: "Hotels and licensed rooms-to-let in Greece pay a different, star-based fee (not set up). One 2026 source reports lower apartment rates (€1.50 / €0.50). Confirm with AADE.",
        verifiedOn: "2026-10-28",
        sources: ["https://greekcitytimes.com/2025/01/08/greece-climate-resilience-fee/"],
      },
    ],
  },
  {
    code: "MT",
    name: "Malta",
    flag: "🇲🇹",
    regions: [
      {
        id: "mt-all",
        name: "Malta & Gozo",
        placeName: "Malta",
        taxName: "Eco Contribution",
        currency: "EUR",
        minTaxableAge: 18,
        accommodationTypes: [
          // Short lets: €1.50 → €10 (cap €80) from MALTA_NEW_RATES_FROM.
          ...sameRate(
            { basis: "person_night", seasons: rateChange({ rateCents: 150, capPerPersonCents: 2250 }, { rateCents: 1000, capPerPersonCents: 8000 }, MALTA_NEW_RATES_FROM) },
            "holiday rentals (apartments, houses and rooms)",
            [
              ["apartment", "Apartment / flat"],
              ["room", "Room in a home"],
              ["house", "Holiday house / villa / farmhouse"],
              ["bnb", "Bed & breakfast"],
              ["other", "Other holiday rental"],
            ],
          ),
          // Hotels & collective accommodation: €1.50 → €8 (cap €64) from MALTA_NEW_RATES_FROM.
          ...sameRate(
            { basis: "person_night", seasons: rateChange({ rateCents: 150, capPerPersonCents: 2250 }, { rateCents: 800, capPerPersonCents: 6400 }, MALTA_NEW_RATES_FROM) },
            "hotels, guest houses and hostels",
            [
              ["hotel", "Hotel"],
              ["aparthotel", "Aparthotel"],
              ["guesthouse", "Guest house"],
              ["hostel", "Hostel"],
            ],
          ),
        ],
        notes: "From the new rates, which group B&Bs and guest houses fall into (holiday rental €10 per night, capped at €80 per person, or hotel €8 per night, capped at €64 per person) should be confirmed with the MTA.",
        verifiedOn: "2026-10-28",
        sources: [
          "https://mta.com.mt/environmental-contribution/",
          "https://maintax.org/news/new-eco-contribution-rates/",
          "https://visitworld.today/blog/4734/malta-to-raise-tourist-tax-fivefold-how-much-will-a-holiday-cost-in-2027",
        ],
      },
    ],
  },
  {
    code: "AT",
    name: "Austria",
    flag: "🇦🇹",
    regions: [
      {
        id: "at-vienna",
        name: "Vienna",
        taxName: "Local Tax (Ortstaxe)",
        currency: "EUR",
        accommodationTypes: sameRate(
          { basis: "percent", percent: 5, seasons: [
            { from: "01-01", to: "12-31", percent: 5, validUntil: "2027-07-01" },
            { from: "01-01", to: "12-31", percent: 8, validFrom: "2027-07-01" },
          ] },
          "any accommodation",
          EVERY_TYPE,
        ),
        notes: "5% of the room price excluding VAT and breakfast; 8% from 1 July 2027 (hotels are lobbying to freeze it at 5%).",
        verifiedOn: "2026-11-20",
        sources: ["https://www.wko.at/wien/tourismus-freizeitwirtschaft/hotellerie/aktuelle-ortstaxe-wien", "https://www.wien.gv.at/pdf/ma06/ortstaxe-faq.pdf"],
      },
    ],
  },
  {
    code: "HR",
    name: "Croatia",
    flag: "🇭🇷",
    regions: [
      {
        id: "hr-dubrovnik",
        name: "Dubrovnik",
        taxName: "Tourist Tax (Turistička pristojba)",
        currency: "EUR",
        minTaxableAge: 12,
        childReduction: { fromAge: 12, toAge: 17, multiplier: 0.5 },
        accommodationTypes: sameRate(
          { basis: "person_night", seasons: [
            { from: "04-01", to: "09-30", rateCents: 265, label: "Peak season" },
            { from: "10-01", to: "03-31", rateCents: 185, label: "Off season" },
          ] },
          "any accommodation",
          EVERY_TYPE,
        ),
        notes: "Each Croatian town sets its own rate. For anywhere else in Croatia, use 'Other destination'.",
        verifiedOn: "2026-11-20",
        sources: ["https://gov.hr/en/tourist-tax/1520", "https://www.etoa.org/tourist-tax-rates/croatia"],
      },
    ],
  },
  {
    code: "CZ",
    name: "Czechia",
    flag: "🇨🇿",
    regions: [
      {
        id: "cz-prague",
        name: "Prague",
        taxName: "Local Tourist Fee",
        currency: "CZK",
        minTaxableAge: 18,
        accommodationTypes: sameRate({ basis: "person_night", seasons: [{ from: "01-01", to: "12-31", rateCents: 5000 }] }, "any accommodation", EVERY_TYPE),
        notes: "CZK 50 per person per night. Under-18 exemption from the Czech local fees law. Prague 1 is pushing for an increase; none adopted as of Nov 2026.",
        verifiedOn: "2026-11-20",
        sources: ["https://sdileneubytovani.praha.eu/jnp/en/for_accommodation_providers/local_tourist_fee.html"],
      },
    ],
  },
  {
    code: "SI",
    name: "Slovenia",
    flag: "🇸🇮",
    regions: [
      {
        id: "si-ljubljana",
        name: "Ljubljana",
        taxName: "Tourist Tax",
        currency: "EUR",
        minTaxableAge: 7,
        childReduction: { fromAge: 7, toAge: 17, multiplier: 0.5 },
        accommodationTypes: sameRate({ basis: "person_night", seasons: [{ from: "01-01", to: "12-31", rateCents: 313 }] }, "any accommodation", EVERY_TYPE),
        notes: "€2.50 tourist tax + €0.63 promotion tax. The child rules (under 7 free, 7–17 half) are from Slovenian national law; confirm with Visit Ljubljana.",
        verifiedOn: "2026-11-20",
        sources: ["https://www.visitljubljana.com/en/about-ljubljana-tourism/tourist-tax-in-ljubljana"],
      },
    ],
  },
  {
    code: "GB",
    name: "United Kingdom",
    flag: "🇬🇧",
    regions: [
      {
        id: "gb-edinburgh",
        name: "Edinburgh",
        taxName: "Edinburgh Visitor Levy",
        currency: "GBP",
        maxNights: 5,
        accommodationTypes: sameRate({ basis: "percent", percent: 5 }, "any accommodation", EVERY_TYPE),
        notes: "5% of the accommodation cost excluding VAT and extras, first 5 nights only. Stays booked and paid before 1 October 2025 are exempt.",
        verifiedOn: "2026-11-20",
        sources: ["https://www.edinburgh.gov.uk/business/visitor-levy-edinburgh", "https://www.edinburgh.gov.uk/news/article/14452/edinburgh-visitor-levy-comes-into-effect"],
      },
    ],
  },
  {
    code: "NL",
    name: "Netherlands",
    flag: "🇳🇱",
    regions: [
      {
        id: "nl-amsterdam",
        name: "Amsterdam",
        taxName: "Tourist Tax (Toeristenbelasting)",
        currency: "EUR",
        accommodationTypes: sameRate(
          { basis: "percent", percent: 12.5, seasons: [
            { from: "01-01", to: "12-31", percent: 12.5, validUntil: "2027-01-01" },
            { from: "01-01", to: "12-31", percent: 16, validFrom: "2027-01-01" },
          ] },
          "any accommodation",
          EVERY_TYPE,
        ),
        notes: "Percentage of the room price excluding VAT. Rises to 16% on 1 January 2027 (approved), then +1 point a year to 20%.",
        verifiedOn: "2026-11-20",
        sources: ["https://nltimes.nl/2026/11/12/amsterdam-approves-sharp-tourist-tax-increase-despite-objections-businesses"],
      },
    ],
  },
  {
    code: "DE",
    name: "Germany",
    flag: "🇩🇪",
    regions: [
      {
        id: "de-berlin",
        name: "Berlin",
        taxName: "City Tax (Übernachtungsteuer)",
        currency: "EUR",
        accommodationTypes: sameRate({ basis: "percent", percent: 7.5 }, "any accommodation", EVERY_TYPE),
        notes: "7.5% of the net room price (excluding VAT and extras like breakfast). The old 21-night limit no longer applies.",
        verifiedOn: "2026-11-20",
        sources: ["https://www.berlin.de/sen/finanzen/steuern/informationen-fuer-steuerzahler-/faq-steuern/artikel.57911.php"],
      },
    ],
  },
  {
    code: "US",
    name: "United States",
    flag: "🇺🇸",
    regions: [
      {
        id: "us-oahu",
        name: "Oʻahu (Honolulu)",
        placeName: "Oʻahu",
        taxName: "Transient Accommodations Tax (State 11% + Oʻahu 3%)",
        currency: "USD",
        accommodationTypes: sameRate({ basis: "percent", percent: 14 }, "any accommodation", EVERY_TYPE),
        notes: "State TAT of 11% (from 1 January 2026, Act 96) plus the Oʻahu county TAT of 3%, both on the gross rent, for stays under 180 days. Hawaii's General Excise Tax is separate and not included.",
        verifiedOn: "2026-11-21",
        sources: [
          "https://files.hawaii.gov/tax/news/announce/ann25-03.pdf",
          "https://www.honolulu.gov/bfs/wp-content/uploads/sites/62/2025/05/OTAT_Announcement_2022-01.pdf",
        ],
      },
    ],
  },
];

/** Destination the host form opens on. */
export const DEFAULT_REGION_ID = "mt-all";

export function findRegion(regionId: string): { country: Country; region: Region } | null {
  for (const country of COUNTRIES) {
    const region = country.regions.find((r) => r.id === regionId);
    if (region) return { country, region };
  }
  return null;
}
