import { CUSTOM_REGION_ID, customRegion } from "./custom";
import type { Property } from "./store";
import { findRegion, type AccommodationType, type Country, type Region } from "./taxRules";

export type Resolved = { country: Country; region: Region; acc: AccommodationType };

/** The tax rules that apply to an apartment: a built-in destination, or the host's own custom one. */
export function resolveProperty(p: Pick<Property, "id" | "regionId" | "accommodationTypeId" | "customTax">): Resolved | null {
  const found = p.regionId === CUSTOM_REGION_ID ? (p.customTax ? customRegion(p.id, p.customTax) : null) : findRegion(p.regionId);
  if (!found) return null;
  const acc = found.region.accommodationTypes.find((a) => a.id === p.accommodationTypeId) ?? found.region.accommodationTypes[0];
  return { ...found, acc };
}
