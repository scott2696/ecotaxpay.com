import { NextResponse } from "next/server";
import { calculate, QuoteError } from "@/lib/calc";
import { parseStay } from "@/lib/parseStay";
import { resolveProperty } from "@/lib/resolve";
import type { MessageKey } from "@/i18n/messages/en";
import { getI18n } from "@/i18n/server";
import { currentHost, isSubscribed } from "@/lib/auth";
import { createPayment, getProperty } from "@/lib/store";
import { normalizePhone } from "@/lib/whatsapp";
import { manualQuote, QUICK_CURRENCIES, QUICK_MAX_CENTS, QUICK_MIN_CENTS } from "@/lib/quick";
import { money } from "@/i18n/translate";

const clean = (v: unknown, max = 120) => String(v ?? "").trim().slice(0, max);

// Host creates a payment request; the stay details are frozen server-side.
export async function POST(req: Request) {
  const host = await currentHost();
  const { t } = await getI18n();
  if (!host) return NextResponse.json({ error: "Please log in" }, { status: 401 });
  if (!isSubscribed(host)) return NextResponse.json({ error: t("err.notSubscribed") }, { status: 402 });
  const body = await req.json();
  const guestName = clean(body.guestName);
  const guestEmail = clean(body.guestEmail, 200);
  if (guestEmail && !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(guestEmail))
    return NextResponse.json({ error: t("err.guestEmail") }, { status: 400 });
  const rawPhone = clean(body.guestPhone, 30);
  const guestPhone = normalizePhone(rawPhone) ?? undefined;
  if (rawPhone && !guestPhone)
    return NextResponse.json({ error: t("err.guestMobile") }, { status: 400 });

  // Quick link: just an amount. No apartment, stay or guest details are needed.
  if (body.quick) {
    const currency = String(body.currency ?? "");
    if (!(QUICK_CURRENCIES as readonly string[]).includes(currency)) return NextResponse.json({ error: t("q.invalid") }, { status: 400 });
    const amountCents = Math.round(Number(String(body.amount ?? "").replace(",", ".")) * 100);
    if (!Number.isFinite(amountCents) || amountCents < QUICK_MIN_CENTS || amountCents > QUICK_MAX_CENTS)
      return NextResponse.json({ error: t("quick.min", { amount: money(QUICK_MIN_CENTS, currency, t.locale) }) }, { status: 400 });
    const rec = await createPayment({
      hostId: host.id,
      guestName,
      guestEmail,
      guestPhone,
      quote: manualQuote(amountCents, currency, clean(body.description, 80)),
    });
    return NextResponse.json({ id: rec.id, path: `/p/${rec.id}` });
  }

  const found = await getProperty(String(body.propertyId ?? ""));
  const property = found?.hostId === host.id ? found : null;
  if (!property) return NextResponse.json({ error: t("err.chooseApartment") }, { status: 400 });
  if (!guestName) return NextResponse.json({ error: t("err.guestName") }, { status: 400 });

  let quote;
  try {
    // Destination + accommodation type always come from the saved property.
    const rules = resolveProperty(property);
    if (!rules) return NextResponse.json({ error: t("err.destinationGone") }, { status: 400 });
    quote = calculate(parseStay({ ...body, regionId: rules.region.id, accommodationTypeId: rules.acc.id }), undefined, rules);
  } catch (e) {
    return NextResponse.json({ error: e instanceof QuoteError ? t(e.key as MessageKey) : t("q.invalid") }, { status: 400 });
  }
  if (quote.totalCents < 50) return NextResponse.json({ error: t("form.noTax") }, { status: 400 });

  const rec = await createPayment({
    hostId: host.id,
    guestName,
    guestEmail,
    guestPhone,
    bookingRef: clean(body.bookingRef, 60) || undefined,
    propertyId: property.id,
    propertyName: property.name,
    quote,
  });
  return NextResponse.json({ id: rec.id, path: `/p/${rec.id}` });
}
