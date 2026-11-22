import { NextResponse } from "next/server";
import { isLocaleCode } from "@/i18n/config";
import { getI18n } from "@/i18n/server";
import { sendReportedEmail } from "@/lib/email";
import { activeMethods } from "@/lib/payMethods";
import { getHost, getPayment, getProperty, updatePayment, type PayMethodId, linkCancelled } from "@/lib/store";
import { normalizePhone } from "@/lib/whatsapp";

// Guest taps "I've paid" (or "I'll pay in cash") on /p/{id}. Nothing is charged here: the guest pays
// the host directly, and the receipt is issued when the host confirms the money arrived.
export async function POST(req: Request, { params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const body = await req.json().catch(() => ({}));
  const { t, locale } = await getI18n();
  const found = await getPayment(id);
  if (!found || linkCancelled(found)) return NextResponse.json({ error: t("err.linkNotFound") }, { status: 404 });
  if (found.status !== "pending") return NextResponse.json({ ok: true });

  const host = found.hostId ? await getHost(found.hostId) : null;
  const methods = activeMethods(host?.paymentMethods);
  const method = String(body.method ?? "") as PayMethodId;
  if (!methods.includes(method)) return NextResponse.json({ error: t("pay.chooseMethod") }, { status: 400 });

  const property = found.propertyId ? await getProperty(found.propertyId) : null;
  if (property?.documents === "required" && !found.documents?.length)
    return NextResponse.json({ error: t("pay.uploadFirst") }, { status: 400 });

  const email = String(body.email ?? "").trim().slice(0, 200);
  if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) return NextResponse.json({ error: t("err.receiptEmail") }, { status: 400 });
  const rawPhone = String(body.phone ?? "").trim().slice(0, 30);
  const phone = normalizePhone(rawPhone);
  if (rawPhone && !phone) return NextResponse.json({ error: t("err.whatsapp") }, { status: 400 });

  // Links made from a calendar booking may have no name: the guest gives it here (it then shows on
  // the host's booking list, the payments table, the CSV export and the receipt).
  const name = String(body.name ?? "").trim().replace(/\s+/g, " ").slice(0, 120);
  if (!found.guestName && name.length < 2) return NextResponse.json({ error: t("pay.nameNeeded") }, { status: 400 });

  const first = !found.reportedPaidAt;
  const rec = (await updatePayment(found.id, {
    guestEmail: email,
    ...(!found.guestName ? { guestName: name } : {}),
    guestPhone: phone ?? undefined,
    locale: typeof body.locale === "string" && isLocaleCode(body.locale) ? body.locale : locale,
    paidVia: method,
    reportedPaidAt: new Date().toISOString(),
  }))!;
  if (first) await sendReportedEmail(rec);
  return NextResponse.json({ ok: true });
}
