"use server";

import { revalidatePath, revalidateTag } from "next/cache";
import { redirect } from "next/navigation";
import { requireHost } from "@/lib/auth";
import { CALENDAR_CACHE_TAG } from "@/lib/calendar";
import { syncNow } from "@/lib/bookings";
import { notifyPaid } from "@/lib/notify";
import { deleteProperty, refundPayment, getPayment, listPayments, markPaid, updateHost, updatePayment } from "@/lib/store";

/** Host confirms the guest's direct payment arrived (or cash was handed over): issue the receipt. */
export async function markPaidOffline(id: string) {
  const host = await requireHost();
  const p = await getPayment(id);
  if (!p || p.hostId !== host.id) throw new Error("Not found");
  const res = await markPaid(id, { status: "paid_offline" });
  // Email / WhatsApp the receipt to the guest (and the arrival guide), now that the money is in.
  if (res?.justPaid && (res.record.guestEmail || res.record.guestPhone)) await notifyPaid(res.record);
  revalidatePath("/host");
}

/** Save the guest's name for an Airbnb / Booking.com booking (calendar feeds don't share names). */
export async function saveBookingName(key: string, booking: { propertyId: string; checkIn: string }, form: FormData) {
  const host = await requireHost();
  const name = String(form.get("name") ?? "").trim().slice(0, 120);
  const names = { ...(host.bookingNames ?? {}) };
  if (name) names[key] = name;
  else delete names[key];
  await updateHost(host.id, { bookingNames: names });
  // Keep the booking and its payment link in sync: a link sent without a name gets this one
  // (so it shows in "Guests & payments", the CSV export and the receipt).
  if (name) {
    const link = (await listPayments(host.id)).find(
      (p) => p.propertyId === booking.propertyId && p.quote.checkIn === booking.checkIn && p.status !== "refunded" && !p.guestName,
    );
    if (link) await updatePayment(link.id, { guestName: name });
  }
  revalidatePath("/host");
}

/** Delete one of this host's apartments (after a confirmation step on the Apartments page). */
export async function removeProperty(id: string) {
  const host = await requireHost();
  await deleteProperty(id, host.id);
  revalidatePath("/host/properties");
  revalidatePath("/host");
  redirect("/host/properties?deleted=1");
}

/** Refund / cancel a paid payment: issues a numbered credit note (the money is refunded by the host directly). */
export async function refundPaid(id: string, form: FormData) {
  const host = await requireHost();
  const p = await getPayment(id);
  if (!p || p.hostId !== host.id) return;
  await refundPayment(id, String(form.get("reason") ?? "").trim().slice(0, 200));
  revalidatePath("/host");
}

/** Remove a payment link / transaction from the dashboard (an unpaid link stops working; receipts keep working). */
export async function removePayment(id: string) {
  const host = await requireHost();
  const p = await getPayment(id);
  if (!p || p.hostId !== host.id) return;
  await updatePayment(id, { removedAt: new Date().toISOString() });
  revalidatePath("/host");
}

/** Remove a synced booking from the dashboard list (restorable from "Removed bookings"). */
export async function hideStay(key: string) {
  const host = await requireHost();
  const hidden = new Set(host.hiddenStays ?? []);
  hidden.add(key);
  // The booking itself is kept, so it can be restored from "Removed bookings".
  await updateHost(host.id, { hiddenStays: [...hidden].slice(-2000) });
  revalidatePath("/host");
}

/** Put a removed booking back in the list. */
export async function restoreStay(key: string) {
  const host = await requireHost();
  await updateHost(host.id, { hiddenStays: (host.hiddenStays ?? []).filter((k) => k !== key) });
  revalidatePath("/host");
}

/** "Sync now": drop cached Airbnb / Booking.com calendars and reload the dashboard. */
export async function syncCalendars() {
  const host = await requireHost();
  revalidateTag(CALENDAR_CACHE_TAG);
  await syncNow(host);
  revalidatePath("/host");
}
