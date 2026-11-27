// Destination and tax names in each site language. The rate data (lib/taxRules.ts) is in English;
// these labels are what visitors read. Local official names stay in brackets where hosts search for them.
import type { Region } from "@/lib/taxRules";

type L = { es: string; it: string; fr: string; de: string; mt: string };

const PLACES: Record<string, L> = {
  "es-balearic": { es: "Islas Baleares", it: "Isole Baleari", fr: "Îles Baléares", de: "Balearen", mt: "Il-Gżejjer Baleariċi" },
  "es-barcelona": { es: "Barcelona", it: "Barcellona", fr: "Barcelone", de: "Barcelona", mt: "Barċellona" },
  "pt-lisbon": { es: "Lisboa", it: "Lisbona", fr: "Lisbonne", de: "Lissabon", mt: "Lisbona" },
  "pt-porto": { es: "Oporto", it: "Porto", fr: "Porto", de: "Porto", mt: "Porto" },
  "it-rome": { es: "Roma", it: "Roma", fr: "Rome", de: "Rom", mt: "Ruma" },
  "gr-all": { es: "Toda Grecia", it: "Tutta la Grecia", fr: "Toute la Grèce", de: "Ganz Griechenland", mt: "Il-Greċja kollha" },
  "mt-all": { es: "Malta y Gozo", it: "Malta e Gozo", fr: "Malte et Gozo", de: "Malta und Gozo", mt: "Malta u Għawdex" },
  "at-vienna": { es: "Viena", it: "Vienna", fr: "Vienne", de: "Wien", mt: "Vjenna" },
  "hr-dubrovnik": { es: "Dubrovnik", it: "Dubrovnik", fr: "Dubrovnik", de: "Dubrovnik", mt: "Dubrovnik" },
  "cz-prague": { es: "Praga", it: "Praga", fr: "Prague", de: "Prag", mt: "Praga" },
  "si-ljubljana": { es: "Liubliana", it: "Lubiana", fr: "Ljubljana", de: "Ljubljana", mt: "Ljubljana" },
  "gb-edinburgh": { es: "Edimburgo", it: "Edimburgo", fr: "Édimbourg", de: "Edinburgh", mt: "Edinburgu" },
  "nl-amsterdam": { es: "Ámsterdam", it: "Amsterdam", fr: "Amsterdam", de: "Amsterdam", mt: "Amsterdam" },
  "de-berlin": { es: "Berlín", it: "Berlino", fr: "Berlin", de: "Berlin", mt: "Berlin" },
  "us-oahu": { es: "Oʻahu (Honolulu)", it: "Oʻahu (Honolulu)", fr: "Oʻahu (Honolulu)", de: "Oʻahu (Honolulu)", mt: "Oʻahu (Honolulu)" },
};

const TAXES: Record<string, L> = {
  "es-balearic": {
    es: "Impuesto de Turismo Sostenible (Ecotasa / ITS)",
    it: "Imposta sul turismo sostenibile (Ecotasa / ITS)",
    fr: "Taxe de tourisme durable (Ecotasa / ITS)",
    de: "Steuer für nachhaltigen Tourismus (Ecotasa / ITS)",
    mt: "Taxxa tat-Turiżmu Sostenibbli (Ecotasa / ITS)",
  },
  "es-barcelona": {
    es: "Impuesto turístico (IEET + recargo municipal)",
    it: "Imposta turistica (IEET + maggiorazione comunale)",
    fr: "Taxe touristique (IEET + surtaxe municipale)",
    de: "Touristensteuer (IEET + städtischer Zuschlag)",
    mt: "Taxxa turistika (IEET + żieda tal-belt)",
  },
  "pt-lisbon": {
    es: "Tasa turística municipal (Taxa Turística)",
    it: "Tassa di soggiorno comunale (Taxa Turística)",
    fr: "Taxe de séjour municipale (Taxa Turística)",
    de: "Städtische Touristenabgabe (Taxa Turística)",
    mt: "Taxxa turistika muniċipali (Taxa Turística)",
  },
  "pt-porto": {
    es: "Tasa turística municipal (Taxa Turística)",
    it: "Tassa di soggiorno comunale (Taxa Turística)",
    fr: "Taxe de séjour municipale (Taxa Turística)",
    de: "Städtische Touristenabgabe (Taxa Turística)",
    mt: "Taxxa turistika muniċipali (Taxa Turística)",
  },
  "it-rome": {
    es: "Contributo di Soggiorno (tasa de estancia)",
    it: "Contributo di soggiorno",
    fr: "Contributo di Soggiorno (taxe de séjour)",
    de: "Contributo di Soggiorno (Aufenthaltsabgabe)",
    mt: "Contributo di Soggiorno (taxxa tas-soġġorn)",
  },
  "gr-all": {
    es: "Tasa de resiliencia climática",
    it: "Tassa di resilienza climatica",
    fr: "Taxe de résilience climatique",
    de: "Klimaresilienzgebühr",
    mt: "Tariffa tar-Reżiljenza Klimatika",
  },
  "mt-all": {
    es: "Contribución ecológica (Eco Contribution)",
    it: "Contributo ecologico (Eco Contribution)",
    fr: "Contribution écologique (Eco Contribution)",
    de: "Ökobeitrag (Eco Contribution)",
    mt: "Kontribuzzjoni Ambjentali (Eco Contribution)",
  },
  "at-vienna": {
    es: "Tasa local (Ortstaxe)",
    it: "Tassa locale (Ortstaxe)",
    fr: "Taxe locale (Ortstaxe)",
    de: "Ortstaxe",
    mt: "Taxxa lokali (Ortstaxe)",
  },
  "hr-dubrovnik": {
    es: "Tasa turística (Turistička pristojba)",
    it: "Tassa di soggiorno (Turistička pristojba)",
    fr: "Taxe de séjour (Turistička pristojba)",
    de: "Kurtaxe (Turistička pristojba)",
    mt: "Taxxa turistika (Turistička pristojba)",
  },
  "cz-prague": {
    es: "Tasa turística local",
    it: "Tassa turistica locale",
    fr: "Taxe de séjour locale",
    de: "Örtliche Touristengebühr",
    mt: "Tariffa turistika lokali",
  },
  "si-ljubljana": { es: "Tasa turística", it: "Tassa di soggiorno", fr: "Taxe de séjour", de: "Kurtaxe", mt: "Taxxa turistika" },
  "gb-edinburgh": {
    es: "Tasa de visitantes de Edimburgo",
    it: "Tassa sui visitatori di Edimburgo",
    fr: "Taxe sur les visiteurs d’Édimbourg",
    de: "Besucherabgabe Edinburgh",
    mt: "Taxxa tal-Viżitaturi ta’ Edinburgu",
  },
  "nl-amsterdam": {
    es: "Tasa turística (Toeristenbelasting)",
    it: "Tassa di soggiorno (Toeristenbelasting)",
    fr: "Taxe de séjour (Toeristenbelasting)",
    de: "Touristensteuer (Toeristenbelasting)",
    mt: "Taxxa turistika (Toeristenbelasting)",
  },
  "de-berlin": {
    es: "Tasa municipal (Übernachtungsteuer)",
    it: "Tassa di soggiorno (Übernachtungsteuer)",
    fr: "Taxe de séjour (Übernachtungsteuer)",
    de: "Übernachtungsteuer (City Tax)",
    mt: "Taxxa tal-belt (Übernachtungsteuer)",
  },
  "us-oahu": {
    es: "Impuesto sobre alojamientos temporales (estatal 11 % + Oʻahu 3 %)",
    it: "Imposta sugli alloggi temporanei (statale 11% + Oʻahu 3%)",
    fr: "Taxe sur les hébergements temporaires (État 11 % + Oʻahu 3 %)",
    de: "Steuer auf Kurzzeitunterkünfte (Staat 11 % + Oʻahu 3 %)",
    mt: "Taxxa fuq akkomodazzjoni temporanja (Stat 11% + Oʻahu 3%)",
  },
};

const lang = (locale: string) => locale.slice(0, 2) as keyof L;

/** A destination's name in the reader's language (English: the rate data's own name). */
export function localPlaceName(regionId: string, fallback: string, locale: string): string {
  return PLACES[regionId]?.[lang(locale)] ?? fallback;
}

/** A tax's name in the reader's language (English: the rate data's own name). */
export function localTaxName(regionId: string, fallback: string, locale: string): string {
  return TAXES[regionId]?.[lang(locale)] ?? fallback;
}

/** The region with its name and tax name in the reader's language: pass it to rate summaries and explanations. */
export function localizeRegion<R extends Region>(region: R, locale: string): R {
  if (lang(locale) === ("en" as string)) return region;
  return { ...region, name: localPlaceName(region.id, region.name, locale), taxName: localTaxName(region.id, region.taxName, locale) };
}

/** A country's name in the reader's language. */
export function localCountryName(code: string, fallback: string, locale: string): string {
  try {
    return new Intl.DisplayNames([locale], { type: "region" }).of(code) ?? fallback;
  } catch {
    return fallback;
  }
}
