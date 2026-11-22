import { NextResponse } from "next/server";
import { checkCalendarUrl } from "@/lib/calendar";
import { platformById, platformName } from "@/lib/platforms";
import type { MessageKey } from "@/i18n/messages/en";
import { getI18n } from "@/i18n/server";
import { currentHost } from "@/lib/auth";
import { getProperty, saveProperty, type DocumentsSetting, type Guide, type GuideTextField, type Property, listProperties } from "@/lib/store";
import { parseDocumentsRequest } from "@/lib/documents";
import { CUSTOM_REGION_ID, parseCustomTax, type CustomTax } from "@/lib/custom";
import { findRegion } from "@/lib/taxRules";
import { GUIDE_NOTES } from "@/lib/guideLimits";

const GUIDE_FIELDS: GuideTextField[] = [
  "address", "mapsUrl", "checkInTime", "checkOutTime", "directions", "access",
  "wifiName", "wifiPassword", "houseRules", "contact", "other",
];

// Create (no id) or update (with id) a property.
export async function POST(req: Request) {
  const host = await currentHost();
  const { t } = await getI18n();
  if (!host) return NextResponse.json({ error: "Please log in" }, { status: 401 });
  const body = await req.json();
  const name = String(body.name ?? "").trim().slice(0, 120);
  if (!name) return NextResponse.json({ error: t("err.apartmentName") }, { status: 400 });
  // Built-in destination, or the host's own rate ("Other destination").
  let regionId = String(body.regionId ?? "");
  let accommodationTypeId = String(body.accommodationTypeId ?? "");
  let customTax: CustomTax | undefined;
  if (regionId === CUSTOM_REGION_ID) {
    const parsed = parseCustomTax(body.customTax);
    if (typeof parsed === "string") return NextResponse.json({ error: t(parsed as MessageKey) }, { status: 400 });
    customTax = parsed;
    accommodationTypeId = "custom";
  } else {
    const found = findRegion(regionId);
    if (!found) return NextResponse.json({ error: t("q.destination") }, { status: 400 });
    if (!found.region.accommodationTypes.some((a) => a.id === accommodationTypeId))
      return NextResponse.json({ error: t("q.accType") }, { status: 400 });
    regionId = found.region.id;
  }
  const documents: DocumentsSetting = ["off", "optional", "required"].includes(body.documents) ? body.documents : "off";

  const documentsRequest = parseDocumentsRequest(body.documentsRequest);
  if (documents !== "off" && documentsRequest.items.length === 0)
    return NextResponse.json({ error: t("err.tickDocument") }, { status: 400 });

  const guide: Guide = {};
  for (const f of GUIDE_FIELDS) {
    const v = String(body.guide?.[f] ?? "").trim().slice(0, 4000);
    if (v) guide[f] = v;
  }
  const notes = (Array.isArray(body.guide?.notes) ? body.guide.notes : [])
    .slice(0, GUIDE_NOTES.max)
    .map((n: { title?: unknown; body?: unknown }) => ({
      title: String(n?.title ?? "").trim().slice(0, GUIDE_NOTES.title),
      body: String(n?.body ?? "").trim().slice(0, GUIDE_NOTES.body),
    }))
    .filter((n: { body: string }) => n.body);
  if (notes.length) guide.notes = notes;
  if (guide.mapsUrl && !/^https?:\/\//i.test(guide.mapsUrl))
    return NextResponse.json({ error: t("err.mapsUrl") }, { status: 400 });

  // Calendar links are managed on the "Connect calendars" page; the apartment form doesn't send them.
  const sentCalendars = body.calendars && typeof body.calendars === "object";
  const calendars: NonNullable<Property["calendars"]> = {};
  if (sentCalendars)
    for (const [src, value] of Object.entries(body.calendars as Record<string, unknown>)) {
      const v = String(value ?? "").trim();
      if (!v || !platformById(src)) continue;
      const problem = checkCalendarUrl(src, v);
      if (problem) return NextResponse.json({ error: `${platformName(src)}: ${t(problem as MessageKey)}` }, { status: 400 });
      calendars[src] = v;
    }

  // Editing: the apartment must belong to this host.
  const id = typeof body.id === "string" && body.id ? body.id : undefined;
  // New apartment with exactly the same name as an existing one: almost always a double save.
  const norm = (v: string) => v.toLowerCase().replace(/\s+/g, " ").trim();
  const twin = id ? undefined : (await listProperties(host.id)).find((p) => norm(p.name) === norm(name));
  if (twin) return NextResponse.json({ error: t("err.duplicateApartment", { name: twin.name }) }, { status: 409 });
  if (id && (await getProperty(id))?.hostId !== host.id) return NextResponse.json({ error: t("err.unknownApartment") }, { status: 404 });

  const property = await saveProperty({
    id,
    hostId: host.id,
    name,
    regionId,
    accommodationTypeId,
    customTax,
    documents,
    documentsNote: undefined,
    documentsRequest,
    guide,
    calendars: sentCalendars ? calendars : (id ? (await getProperty(id))?.calendars : undefined),
  });
  return NextResponse.json({ id: property.id });
}
