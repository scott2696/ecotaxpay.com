import { currentHost } from "@/lib/auth";
import { listPayments } from "@/lib/store";

// CSV export for accountants / tax declarations. Optional ?from=YYYY-MM-DD&to=YYYY-MM-DD (by check-in).
export async function GET(req: Request) {
  const host = await currentHost();
  if (!host) return new Response("Please log in", { status: 401 });
  const url = new URL(req.url);
  const from = url.searchParams.get("from") ?? "0000-00-00";
  const to = url.searchParams.get("to") ?? "9999-99-99";
  const apartment = url.searchParams.get("apartment");
  const stayDate = (p: { quote: { checkIn: string }; createdAt: string }) => p.quote.checkIn || p.createdAt.slice(0, 10);
  const rows = (await listPayments(host.id)).filter(
    (p) =>
      (p.status === "paid" || p.status === "paid_offline" || p.status === "refunded") &&
      stayDate(p) >= from &&
      stayDate(p) <= to &&
      (!apartment || p.propertyId === apartment),
  );

  const header = [
    "receipt_number", "paid_at", "status", "guest_name", "guest_email", "booking_ref", "property",
    "country", "region", "tax_name", "accommodation", "check_in", "check_out", "nights",
    "adults", "children", "taxable_guests", "currency", "tax", "service_fee", "total", "stripe_payment_intent",
    "paid_via", "credit_note_number", "refunded_at", "refund_reason",
  ];
  const cell = (v: unknown) => {
    const s = String(v ?? "");
    // Quote and neutralise spreadsheet formula injection.
    return `"${(/^[=+\-@]/.test(s) ? `'${s}` : s).replace(/"/g, '""')}"`;
  };
  const amt = (minor: number) => (minor / 100).toFixed(2);
  const lines = rows.map((p) => {
    const q = p.quote;
    return [
      p.receiptNumber, p.paidAt, p.status, p.guestName, p.guestEmail, p.bookingRef, p.propertyName,
      q.countryName, q.regionName, q.taxName || (q.manual ? "Tourist tax" : ""), q.accommodationLabel, q.checkIn, q.checkOut, q.nights,
      q.adults, q.childAges.length, q.taxableGuests, q.currency, amt(q.taxCents), amt(q.feeCents), amt(q.totalCents), p.stripePaymentIntentId ?? p.stripeSessionId,
      p.paidVia, p.creditNoteNumber, p.refundedAt, p.refundReason,
    ].map(cell).join(",");
  });

  return new Response([header.join(","), ...lines].join("\n"), {
    headers: {
      "Content-Type": "text/csv; charset=utf-8",
      "Content-Disposition": `attachment; filename="tourist-tax-${from === "0000-00-00" ? "all" : `${from}_to_${to === "9999-99-99" ? "now" : to}`}.csv"`,
    },
  });
}
