"use server";

import { revalidatePath, revalidateTag } from "next/cache";
import { requireHost } from "@/lib/auth";
import { CALENDAR_CACHE_TAG } from "@/lib/calendar";
import { getPayment, markPaid } from "@/lib/store";

export async function markPaidOffline(id: string) {
  const host = await requireHost();
  const p = await getPayment(id);
  if (!p || p.hostId !== host.id) throw new Error("Not found");
  await markPaid(id, { status: "paid_offline" });
  revalidatePath("/host");
}

/** "Sync now": drop cached Airbnb / Booking.com calendars and reload the dashboard. */
export async function syncCalendars() {
  await requireHost();
  revalidateTag(CALENDAR_CACHE_TAG);
  revalidatePath("/host");
}
