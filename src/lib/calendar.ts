// Upcoming stays from Airbnb / Booking.com via their iCal export links.
// iCal only carries dates (+ Airbnb's reservation code and the guest's last 4 phone digits),
// never guest names or guest counts — the host completes those when creating the link.
import type { Property } from "./store";

export type Source = "airbnb" | "booking";

export type Stay = {
  propertyId: string;
  propertyName: string;
  source: Source;
  checkIn: string; // YYYY-MM-DD
  checkOut: string;
  nights: number;
  reservationCode?: string;
  phoneLast4?: string;
  uid: string;
};

/** Why a calendar couldn't be read, as a message key for the reader's language ("cal.err.*"). */
export type CalendarError = { code: "status" | "notCalendar" | "failed"; status?: number };
export type CalendarResult = { stays: Stay[]; errors: { propertyName: string; source: Source; error: CalendarError }[] };

class CalendarFetchError extends Error {
  constructor(public info: CalendarError) {
    super(info.code);
  }
}
const toError = (e: unknown): CalendarError => (e instanceof CalendarFetchError ? e.info : { code: "failed" });

const ALLOWED: Record<Source, RegExp> = {
  airbnb: /(^|\.)airbnb\.[a-z.]+$/i,
  booking: /(^|\.)booking\.com$/i,
};

/** Validate a calendar link the host pasted. Returns null, or an error message key ("cal.url.*"). Only Airbnb / Booking.com hosts (prevents the server fetching arbitrary URLs). */
export function checkCalendarUrl(source: Source, raw: string): string | null {
  let url: URL;
  try {
    url = new URL(raw.trim());
  } catch {
    return "cal.url.invalid";
  }
  const devLocal = process.env.NODE_ENV !== "production" && url.hostname === "localhost"; // for local testing only
  if (!devLocal && url.protocol !== "https:") return "cal.url.https";
  if (!devLocal && !ALLOWED[source].test(url.hostname))
    return source === "airbnb" ? "cal.url.airbnb" : "cal.url.booking";
  return null;
}

type VEvent = { uid: string; start: string; end: string; summary: string; description: string };

const icsDate = (v: string) => (/^\d{8}/.test(v) ? `${v.slice(0, 4)}-${v.slice(4, 6)}-${v.slice(6, 8)}` : "");
const unescape = (v: string) => v.replace(/\\n/gi, "\n").replace(/\\([,;\\])/g, "$1");

/** Minimal RFC 5545 parser — enough for Airbnb / Booking.com exports. */
export function parseIcs(text: string): VEvent[] {
  const lines = text.replace(/\r\n[ \t]/g, "").replace(/\n[ \t]/g, "").split(/\r?\n/); // unfold
  const events: VEvent[] = [];
  let cur: Partial<VEvent> | null = null;
  for (const line of lines) {
    if (line === "BEGIN:VEVENT") cur = { summary: "", description: "" };
    else if (line === "END:VEVENT" && cur) {
      if (cur.start && cur.end) events.push({ ...(cur as VEvent), uid: cur.uid ?? `${cur.start}-${cur.end}` });
      cur = null;
    } else if (cur) {
      const i = line.indexOf(":");
      if (i < 0) continue;
      const name = line.slice(0, i).split(";")[0].toUpperCase();
      const value = line.slice(i + 1);
      if (name === "DTSTART") cur.start = icsDate(value);
      else if (name === "DTEND") cur.end = icsDate(value);
      else if (name === "SUMMARY") cur.summary = unescape(value);
      else if (name === "DESCRIPTION") cur.description = unescape(value);
      else if (name === "UID") cur.uid = value;
    }
  }
  return events;
}

const nightsBetween = (a: string, b: string) => Math.round((Date.parse(`${b}T00:00:00Z`) - Date.parse(`${a}T00:00:00Z`)) / 86_400_000);

/** Turn feed events into guest stays, skipping dates the host blocked on Airbnb. */
export function toStays(events: VEvent[], source: Source, property: Pick<Property, "id" | "name">): Stay[] {
  return events
    .filter((e) => !(source === "airbnb" && /not available|blocked/i.test(e.summary)))
    .map((e) => ({
      propertyId: property.id,
      propertyName: property.name,
      source,
      checkIn: e.start,
      checkOut: e.end,
      nights: nightsBetween(e.start, e.end),
      reservationCode: e.description.match(/reservations\/details\/([A-Z0-9]+)/i)?.[1],
      phoneLast4: e.description.match(/Last 4 Digits\)?:\s*(\d{4})/i)?.[1],
      uid: e.uid,
    }))
    .filter((s) => s.nights > 0);
}

export const CALENDAR_CACHE_TAG = "calendars";

async function fetchIcs(url: string, fresh = false): Promise<string> {
  const res = await fetch(url, {
    headers: { "User-Agent": "EcoTaxPay calendar sync (+https://ecotaxpay.com)" },
    signal: AbortSignal.timeout(10_000),
    // Re-check each calendar at most every 10 minutes; "Sync now" clears this cache.
    ...(fresh ? { cache: "no-store" as const } : { next: { revalidate: 600, tags: [CALENDAR_CACHE_TAG] } }),
  });
  if (!res.ok) throw new CalendarFetchError({ code: "status", status: res.status });
  const text = await res.text();
  if (text.length > 2_000_000 || !text.includes("BEGIN:VCALENDAR")) throw new CalendarFetchError({ code: "notCalendar" });
  return text;
}

/** Upcoming stays (check-out today or later) for all connected apartments, sorted by check-in. */
export async function upcomingStays(properties: Property[], today = new Date().toISOString().slice(0, 10)): Promise<CalendarResult> {
  const jobs = properties.flatMap((p) =>
    (["airbnb", "booking"] as Source[])
      .filter((src) => p.calendars?.[src])
      .map(async (src) => {
        try {
          return { stays: toStays(parseIcs(await fetchIcs(p.calendars![src]!)), src, p) };
        } catch (e) {
          return { error: { propertyName: p.name, source: src, error: toError(e) } };
        }
      }),
  );
  const results = await Promise.all(jobs);
  const all = results.flatMap((r) => ("stays" in r ? r.stays! : []));

  // If both calendars are synced to each other, an Airbnb booking also shows on Booking.com as "closed". Show it once.
  const airbnbKeys = new Set(all.filter((s) => s.source === "airbnb").map((s) => `${s.propertyId}|${s.checkIn}|${s.checkOut}`));
  const stays = all
    .filter((s) => s.source === "airbnb" || !airbnbKeys.has(`${s.propertyId}|${s.checkIn}|${s.checkOut}`))
    .filter((s) => s.checkOut >= today)
    .sort((a, b) => a.checkIn.localeCompare(b.checkIn) || a.propertyName.localeCompare(b.propertyName));

  return { stays, errors: results.flatMap((r) => ("error" in r ? [r.error!] : [])) };
}

/** Fetch one link right now and report what it contains: used when the host connects a calendar. */
export async function testCalendar(source: Source, url: string, today = new Date().toISOString().slice(0, 10)) {
  try {
    const stays = toStays(parseIcs(await fetchIcs(url, true)), source, { id: "", name: "" }).filter((s) => s.checkOut >= today);
    return { ok: true as const, upcoming: stays.length };
  } catch (e) {
    return { ok: false as const, error: toError(e) };
  }
}
