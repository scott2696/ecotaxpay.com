import { NextResponse } from "next/server";
import type { MessageKey } from "@/i18n/messages/en";
import { getI18n } from "@/i18n/server";
import { calculate, LIMITS, QuoteError } from "@/lib/calc";
import { resolveProperty } from "@/lib/resolve";
import { getPayment, getProperty, updatePayment } from "@/lib/store";

// The guest enters how many people are staying (the host didn't know: e.g. a calendar booking).
// The tax is recalculated here, on the server, from the apartment's rules and the stay dates;
// the guest can only change the party size, never the dates, rate or amount.
export async function POST(req: Request, { params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const { t } = await getI18n();
  const p = await getPayment(id);
  if (!p) return NextResponse.json({ error: t("err.linkNotFound") }, { status: 404 });
  if (p.status !== "pending" || p.reportedPaidAt || !(p.guestsToConfirm || p.guestsConfirmedAt) || p.quote.manual)
    return NextResponse.json({ error: t("q.invalid") }, { status: 409 });

  const body = await req.json().catch(() => ({}));
  const adults = Math.round(Number(body.adults));
  const childAges = (Array.isArray(body.childAges) ? body.childAges : []).map((a: unknown) => Math.round(Number(a)));
  if (!(adults >= 1 && adults <= LIMITS.maxAdults) || childAges.length > LIMITS.maxChildren || childAges.some((a: number) => !(a >= 0 && a <= 17)))
    return NextResponse.json({ error: t("q.invalid") }, { status: 400 });

  const property = p.propertyId ? await getProperty(p.propertyId) : null;
  const rules = property ? resolveProperty(property) : null;
  if (!rules) return NextResponse.json({ error: t("err.destinationGone") }, { status: 400 });
  try {
    const quote = calculate(
      { regionId: rules.region.id, accommodationTypeId: rules.acc.id, checkIn: p.quote.checkIn, nights: p.quote.nights, adults, childAges, nightlyPriceCents: p.nightlyPriceCents },
      undefined,
      rules,
    );
    await updatePayment(p.id, { quote, guestsToConfirm: false, guestsConfirmedAt: new Date().toISOString() });
    return NextResponse.json({ ok: true, totalCents: quote.totalCents });
  } catch (e) {
    return NextResponse.json({ error: e instanceof QuoteError ? t(e.key as MessageKey) : t("q.invalid") }, { status: 400 });
  }
}
