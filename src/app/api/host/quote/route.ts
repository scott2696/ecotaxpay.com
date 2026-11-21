import { NextResponse } from "next/server";
import { calculate, QuoteError } from "@/lib/calc";
import { parseStay } from "@/lib/parseStay";
import { resolveProperty } from "@/lib/resolve";
import type { MessageKey } from "@/i18n/messages/en";
import { getI18n } from "@/i18n/server";
import { currentHost } from "@/lib/auth";
import { getProperty } from "@/lib/store";

// Live preview for the host form. With propertyId, the apartment's own rules apply (incl. custom destinations).
export async function POST(req: Request) {
  try {
    const host = await currentHost();
    if (!host) return NextResponse.json({ error: "Please log in" }, { status: 401 });
    const body = await req.json();
    const found = body.propertyId ? await getProperty(String(body.propertyId)) : null;
    const property = found?.hostId === host.id ? found : null;
    const rules = property ? resolveProperty(property) : null;
    const input = parseStay(rules ? { ...body, regionId: rules.region.id, accommodationTypeId: rules.acc.id } : body);
    return NextResponse.json(calculate(input, undefined, rules ?? undefined));
  } catch (e) {
    const { t } = await getI18n();
    const msg = e instanceof QuoteError ? t(e.key as MessageKey) : t("q.invalid");
    return NextResponse.json({ error: msg }, { status: 400 });
  }
}
