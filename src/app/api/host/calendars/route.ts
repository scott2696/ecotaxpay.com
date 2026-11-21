import { NextResponse } from "next/server";
import { revalidateTag } from "next/cache";
import { CALENDAR_CACHE_TAG, checkCalendarUrl, testCalendar, type CalendarError, type Source } from "@/lib/calendar";
import type { MessageKey } from "@/i18n/messages/en";
import { getI18n } from "@/i18n/server";
import { currentHost } from "@/lib/auth";
import { getProperty, saveProperty } from "@/lib/store";

const SOURCES: Source[] = ["airbnb", "booking"];
const NAME = { airbnb: "Airbnb", booking: "Booking.com" };
type K = MessageKey;

type Body = { calendars: Record<string, Partial<Record<Source, string>>> };
type Check = { ok: true; upcoming: number } | { ok: false; error: CalendarError };

// Save the Airbnb / Booking.com links for one or more apartments, then test each link live.
export async function POST(req: Request) {
  const host = await currentHost();
  const { t } = await getI18n();
  if (!host) return NextResponse.json({ error: "Please log in" }, { status: 401 });
  const { calendars } = (await req.json()) as Body;
  if (!calendars || typeof calendars !== "object") return NextResponse.json({ error: t("err.nothingToSave") }, { status: 400 });

  // Validate everything first so a bad link doesn't leave a half-saved state.
  const updates: { id: string; links: Partial<Record<Source, string>> }[] = [];
  for (const [id, raw] of Object.entries(calendars)) {
    const property = await getProperty(id);
    if (!property || property.hostId !== host.id) return NextResponse.json({ error: t("err.unknownApartment") }, { status: 400 });
    const links: Partial<Record<Source, string>> = {};
    for (const src of SOURCES) {
      const v = String(raw?.[src] ?? "").trim();
      if (!v) continue;
      const problem = checkCalendarUrl(src, v);
      if (problem) return NextResponse.json({ error: `${property.name}, ${NAME[src]}: ${t(problem as K)}` }, { status: 400 });
      links[src] = v;
    }
    updates.push({ id, links });
  }

  const results: Record<string, Partial<Record<Source, Check>>> = {};
  for (const { id, links } of updates) {
    const property = (await getProperty(id))!;
    await saveProperty({ ...property, calendars: links });
    results[id] = {};
    for (const src of SOURCES) if (links[src]) results[id][src] = await testCalendar(src, links[src]!);
  }
  revalidateTag(CALENDAR_CACHE_TAG);
  return NextResponse.json({ results });
}
