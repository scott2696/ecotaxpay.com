// Synced bookings are remembered on the host, so they stay on the dashboard until the host
// removes them (or the stay is over, or that calendar is disconnected), even if a calendar feed
// is briefly unreachable or a booking drops out of the platform's calendar.
import { upcomingStays, type CalendarResult, type Stay } from "./calendar";
import { platformPriority } from "./platforms";
import { getHost, listProperties, updateHost, type Host, type Property, type SavedStay } from "./store";

export const stayKey = (s: Pick<Stay, "propertyId" | "source" | "uid">) => `${s.propertyId}|${s.source}|${s.uid}`;

export type ListedStay = Stay & { missing?: boolean; key: string };

/** Merge a fresh sync into the saved bookings; returns what to show (and saves changes). */
/**
 * `fresh`: the feeds were just read live (Sync now / Save & sync), so a booking missing from a feed
 * really left that calendar. Ordinary page loads may read a cached copy and only ever add bookings.
 */
export async function rememberStays(host: Host, properties: Property[], live: CalendarResult, today = new Date().toISOString().slice(0, 10), fresh = false): Promise<ListedStay[]> {
  const now = new Date().toISOString();
  const saved: Record<string, SavedStay> = { ...(host.savedStays ?? {}) };
  const hidden = new Set(host.hiddenStays ?? []);
  const byId = new Map(properties.map((p) => [p.id, p]));
  const connected = (propertyId: string, source: string) => !!byId.get(propertyId)?.calendars?.[source];
  const failed = new Set(live.errors.map((e) => `${properties.find((p) => p.name === e.propertyName)?.id}|${e.source}`));

  const before = JSON.stringify(saved);
  const seen = new Set<string>();
  for (const s of live.stays) {
    const key = stayKey(s);
    seen.add(key);
    const had = saved[key];
    const same = had && had.checkIn === s.checkIn && had.checkOut === s.checkOut && had.reservationCode === s.reservationCode && had.phoneLast4 === s.phoneLast4;
    if (same && had.missing && fresh) saved[key] = { ...had, missing: false, lastSeen: now }; // back in the calendar
    else if (!same) saved[key] = { propertyId: s.propertyId, source: s.source, uid: s.uid, checkIn: s.checkIn, checkOut: s.checkOut, nights: s.nights, reservationCode: s.reservationCode, phoneLast4: s.phoneLast4, lastSeen: now };
  }
  for (const [key, s] of Object.entries(saved)) {
    if (s.checkOut < today || !connected(s.propertyId, s.source)) delete saved[key]; // over, or calendar removed by the host
    else if (fresh && !s.missing && !seen.has(key) && !failed.has(`${s.propertyId}|${s.source}`)) saved[key] = { ...s, missing: true }; // feed read live, booking gone
  }
  if (JSON.stringify(saved) !== before) await updateHost(host.id, { savedStays: saved });

  // One row per stay (calendars synced with each other repeat the same stay), hidden ones left out.
  const best = new Map<string, ListedStay>();
  for (const [key, s] of Object.entries(saved)) {
    if (hidden.has(key)) continue;
    const property = byId.get(s.propertyId);
    if (!property) continue;
    const row: ListedStay = { ...s, propertyName: property.name, key, missing: s.missing || undefined };
    const k = `${s.propertyId}|${s.checkIn}|${s.checkOut}`;
    const have = best.get(k);
    if (!have || (have.missing && !row.missing) || (!!have.missing === !!row.missing && platformPriority(row.source) < platformPriority(have.source))) best.set(k, row);
  }
  return [...best.values()].sort((a, b) => a.checkIn.localeCompare(b.checkIn) || a.propertyName.localeCompare(b.propertyName));
}

/** Read every connected calendar live and save the result (Sync now / Save & sync). */
export async function syncNow(host: Host, today = new Date().toISOString().slice(0, 10)) {
  const properties = await listProperties(host.id);
  const live = await upcomingStays(properties, today, true);
  const latest = (await getHost(host.id)) ?? host;
  return rememberStays(latest, properties, live, today, true);
}
