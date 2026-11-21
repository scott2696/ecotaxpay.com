import type { StayInput } from "./calc";

/** Parse untrusted JSON / query input into a StayInput (validation happens in calculate()). */
export function parseStay(body: Record<string, unknown>): StayInput {
  const ages = Array.isArray(body.childAges) ? body.childAges : [];
  const price = Number(body.nightlyPrice);
  return {
    regionId: String(body.regionId ?? ""),
    accommodationTypeId: String(body.accommodationTypeId ?? ""),
    checkIn: String(body.checkIn ?? ""),
    nights: Number(body.nights),
    adults: Number(body.adults),
    childAges: ages.map(Number),
    nightlyPriceCents: Number.isFinite(price) && price > 0 ? Math.round(price * 100) : undefined,
  };
}
