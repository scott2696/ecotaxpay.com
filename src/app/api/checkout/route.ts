import { NextResponse } from "next/server";
import { isLocaleCode } from "@/i18n/config";
import { getI18n } from "@/i18n/server";
import { isDemoMode, site, stripe } from "@/lib/config";
import { notifyPaid } from "@/lib/notify";
import { getPayment, getProperty, markPaid, updatePayment } from "@/lib/store";
import { normalizePhone } from "@/lib/whatsapp";

// Guest clicks "Pay" on /p/{id}. Amount comes only from the stored request.
export async function POST(req: Request) {
  const body = await req.json();
  const { t, locale } = await getI18n();
  const found = typeof body.id === "string" ? await getPayment(body.id) : null;
  if (!found) return NextResponse.json({ error: t("err.linkNotFound") }, { status: 404 });
  if (found.status !== "pending") return NextResponse.json({ url: `/p/${found.id}` });

  const property = found.propertyId ? await getProperty(found.propertyId) : null;
  if (property?.documents === "required" && !found.documents?.length)
    return NextResponse.json({ error: t("pay.uploadFirst") }, { status: 400 });

  // The guest may only add/correct their contact details, never the stay or amount.
  const email = String(body.email ?? "").trim().slice(0, 200);
  if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email))
    return NextResponse.json({ error: t("err.receiptEmail") }, { status: 400 });
  const rawPhone = String(body.phone ?? "").trim().slice(0, 30);
  const phone = normalizePhone(rawPhone);
  if (rawPhone && !phone)
    return NextResponse.json({ error: t("err.whatsapp") }, { status: 400 });
  const rec = (await updatePayment(found.id, {
    guestEmail: email,
    guestPhone: phone ?? undefined,
    // The guest's language: used for their receipt and confirmation email.
    locale: typeof body.locale === "string" && isLocaleCode(body.locale) ? body.locale : locale,
  }))!;

  if (isDemoMode()) {
    const res = await markPaid(rec.id);
    if (res?.justPaid) await notifyPaid(res.record);
    return NextResponse.json({ url: `/p/${rec.id}?paid=1` });
  }

  const q = rec.quote;
  const cur = q.currency.toLowerCase();
  const session = await stripe()!.checkout.sessions.create({
    mode: "payment",
    locale: "auto", // Stripe shows its payment page in the guest's browser language
    customer_email: rec.guestEmail,
    line_items: [
      {
        quantity: 1,
        price_data: {
          currency: cur,
          unit_amount: q.taxCents,
          product_data: {
            name: q.taxName || "Tourist tax",
            ...(q.manual ? {} : { description: `${rec.propertyName ?? q.regionName} · ${q.checkIn} → ${q.checkOut} · ${q.nights} nights · ${q.taxableGuests} taxable guest(s)` }),
          },
        },
      },
      ...(q.feeCents > 0 ? [{ quantity: 1, price_data: { currency: cur, unit_amount: q.feeCents, product_data: { name: "Service fee" } } }] : []),
    ],
    metadata: { paymentId: rec.id },
    payment_intent_data: { metadata: { paymentId: rec.id }, description: `${q.taxName || "Tourist tax"}: ${rec.guestName || rec.guestEmail}` },
    success_url: `${site.baseUrl}/success?id=${rec.id}&session_id={CHECKOUT_SESSION_ID}`,
    cancel_url: `${site.baseUrl}/p/${rec.id}?cancelled=1`,
  });
  return NextResponse.json({ url: session.url });
}
