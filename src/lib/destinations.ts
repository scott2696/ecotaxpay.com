// Public "Tourist tax in <place>" pages, one per built-in destination (from the verified rate data).
import { COUNTRIES, type Country, type Region } from "./taxRules";

const SLUGS: Record<string, string> = {
  "es-balearic": "balearic-islands",
  "es-barcelona": "barcelona",
  "pt-lisbon": "lisbon",
  "pt-porto": "porto",
  "it-rome": "rome",
  "gr-all": "greece",
  "mt-all": "malta",
  "at-vienna": "vienna",
  "hr-dubrovnik": "dubrovnik",
  "cz-prague": "prague",
  "si-ljubljana": "ljubljana",
  "gb-edinburgh": "edinburgh",
  "nl-amsterdam": "amsterdam",
  "de-berlin": "berlin",
  "us-oahu": "oahu",
};

export type Destination = { slug: string; country: Country; region: Region };

const slugFor = (regionId: string) => SLUGS[regionId] ?? regionId.replace(/^[a-z]{2}-/, "");

export const DESTINATIONS: Destination[] = COUNTRIES.flatMap((country) => country.regions.map((region) => ({ slug: slugFor(region.id), country, region })));

export const destinationBySlug = (slug: string) => DESTINATIONS.find((d) => d.slug === slug);

/** "/destinations/malta" */
export const destinationPath = (d: Destination) => `/destinations/${d.slug}`;

/** Place name without the bracketed detail: "Balearic Islands (Mallorca, …)" → "Balearic Islands". */
export const placeName = (r: Region) => r.name.split(" (")[0];
