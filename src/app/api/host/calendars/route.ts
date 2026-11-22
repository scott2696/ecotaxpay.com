import { NextResponse } from "next/server";
import { revalidateTag } from "next/cache";
import { CALENDAR_CACHE_TAG, checkCalendarUrl, testCalendar, type CalendarError, type Source } from "@/lib/calendar";
import type { MessageKey } from "@/i18n/messages/en";
import { getI18n } from "@/i18n/server";
import { currentHost } from "@/lib/auth";
import { getProperty, saveProperty } from "@/lib/store";
import { platformById, platformName } from "@/lib/platforms";

type K = MessageKey;
const MAX_PER_APARTMENT = 12;

type Body = { calendars: Record<string, Partial<Record<Source, string>>> };
type Check = { ok: true; upcoming: number } | { ok: false; error: CalendarError };

// Save the calendar links (any platform in platforms.ts) for one or more apartments, then test each live.
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
    for (const [src, value] of Object.entries(raw ?? {}).slice(0, MAX_PER_APARTMENT)) {
      const v = String(value ?? "").trim();
      if (!v) continue;
      if (!platformById(src)) return NextResponse.json({ error: t("err.nothingToSave") }, { status: 400 });
      const problem = checkCalendarUrl(src, v);
      if (problem) return NextResponse.json({ error: `${property.name}, ${platformName(src)}: ${t(problem as K)}` }, { status: 400 });
      links[src] = v;
    }
    updates.push({ id, links });
  }

  const results: Record<string, Partial<Record<Source, Check>>> = {};
  for (const { id, links } of updates) {
    const property = (await getProperty(id))!;
    await saveProperty({ ...property, calendars: links });
    results[id] = {};
    for (const [src, url] of Object.entries(links)) results[id][src] = await testCalendar(src, url!);
  }
  revalidateTag(CALENDAR_CACHE_TAG);
  return NextResponse.json({ results });
}
