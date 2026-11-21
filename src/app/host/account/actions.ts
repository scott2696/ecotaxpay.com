"use server";

import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import { endSession, requireHost } from "@/lib/auth";
import { billingPortalUrl, cancelSubscription, resumeSubscription, startSubscription } from "@/lib/billing";
import { updateHost } from "@/lib/store";

export async function subscribe() {
  const host = await requireHost();
  redirect(await startSubscription(host));
}

export async function cancel() {
  const host = await requireHost();
  await cancelSubscription(host);
  revalidatePath("/host/account");
  redirect("/host/account?cancelled=1");
}

export async function resume() {
  const host = await requireHost();
  await resumeSubscription(host);
  revalidatePath("/host/account");
  redirect("/host/account?resumed=1");
}

export async function openBillingPortal() {
  const host = await requireHost();
  const url = await billingPortalUrl(host);
  redirect(url ?? "/host/account");
}

export async function saveProfile(form: FormData) {
  const host = await requireHost();
  const text = (k: string, max = 120) => String(form.get(k) ?? "").trim().slice(0, max);
  await updateHost(host.id, {
    name: text("name") || host.name,
    businessName: text("businessName") || undefined,
    taxId: text("taxId", 40) || undefined,
  });
  revalidatePath("/host/account");
  redirect("/host/account?saved=1");
}

export async function logout() {
  await endSession();
  redirect("/");
}
