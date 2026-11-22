"use server";

import { revalidatePath } from "next/cache";
import type { SaveResult } from "./MethodsForm";
import { redirect } from "next/navigation";
import { endSession, requireHost } from "@/lib/auth";
import { billingPortalUrl, cancelSubscription, resumeSubscription, startSubscription } from "@/lib/billing";
import { isWiseUrl, normalizeAccountNumber, normalizeBic, normalizeRouting, normalizeSortCode, normalizeIban, normalizeIntlPhone, normalizePaypal, normalizeRevtag, normalizeUrl, normalizeWero } from "@/lib/payMethods";
import { CARD_BRANDS } from "@/components/PayBadges";
import type { CardBrandId } from "@/lib/store";
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

/** How guests pay this host directly. Invalid entries send the host back with the field marked. */
export async function savePaymentMethods(form: FormData): Promise<SaveResult> {
  const host = await requireHost();
  const text = (k: string, max = 200) => String(form.get(k) ?? "").trim().slice(0, max);
  const on = (k: string) => form.get(k) === "on";
  const bad: string[] = [];
  const pick = <V,>(enabled: boolean, raw: string, field: string, parse: (v: string) => V | null): V | undefined => {
    if (!enabled) return undefined;
    const v = parse(raw);
    if (v === null) bad.push(field);
    return v ?? undefined;
  };

  // Bank transfer: every field is required, so transfers work from abroad (SWIFT) as well as within SEPA.
  const bankOn = on("bankOn");
  const bankType = (["iban", "uk", "us"] as const).find((v) => v === form.get("bankType")) ?? "iban";
  const need = (field: string, value: string) => {
    if (bankOn && !value) bad.push(field);
    return value;
  };
  const holder = need("holder", text("holder", 120));
  const holderAddress = need("holderAddress", text("holderAddress", 160));
  const bankName = need("bankName", text("bankName", 80));
  const bankAddress = need("bankAddress", text("bankAddress", 160));
  const bic = pick(bankOn, text("bic", 20), "bic", normalizeBic);
  const iban = pick(bankOn && bankType === "iban", text("iban", 50), "iban", normalizeIban);
  const sortCode = pick(bankOn && bankType === "uk", text("sortCode", 12), "sortCode", normalizeSortCode);
  const routingNumber = pick(bankOn && bankType === "us", text("routingNumber", 12), "routingNumber", normalizeRouting);
  const accountNumber = pick(bankOn && bankType !== "iban", text("accountNumber", 20), "accountNumber", (v) => normalizeAccountNumber(v, bankType === "uk" ? "uk" : "us"));
  // The BIC's country (letters 5–6) must match the IBAN's, or the transfer will bounce.
  if (iban && bic && iban.slice(0, 2) !== bic.slice(4, 6)) bad.push("bic");
  const linkUrl = pick(on("linkOn"), text("linkUrl", 300), "linkUrl", (v) => normalizeUrl(v));
  const cardUrl = pick(on("cardOn"), text("cardUrl", 300), "cardUrl", (v) => normalizeUrl(v));
  const brands = (prefix: string): CardBrandId[] => CARD_BRANDS.filter((b) => on(`${prefix}_${b}`));

  if (bad.length) return { ok: false, bad }; // nothing is saved, and the form keeps what was typed
  await updateHost(host.id, {
    paymentMethods: {
      card: cardUrl ? { url: cardUrl, provider: text("cardProvider", 40) || undefined, brands: brands("card") } : undefined,
      bank: bankOn
        ? { holder, holderAddress, accountType: bankType, iban, sortCode, routingNumber, accountNumber, bic, bankName, bankAddress }
        : undefined,
      revolut: pick(on("revolutOn"), text("revolut", 60), "revolut", normalizeRevtag),
      paypal: pick(on("paypalOn"), text("paypal", 80), "paypal", normalizePaypal),
      wise: pick(on("wiseOn"), text("wise", 200), "wise", isWiseUrl),
      bizum: pick(on("bizumOn"), text("bizum", 30), "bizum", normalizeIntlPhone),
      mbway: pick(on("mbwayOn"), text("mbway", 30), "mbway", normalizeIntlPhone),
      satispay: pick(on("satispayOn"), text("satispay", 30), "satispay", normalizeIntlPhone),
      twint: pick(on("twintOn"), text("twint", 30), "twint", normalizeIntlPhone),
      wero: pick(on("weroOn"), text("wero", 120), "wero", normalizeWero),
      link: linkUrl ? { url: linkUrl, label: text("linkLabel", 40) || undefined } : undefined,
      note: text("note", 500) || undefined,
    },
  });
  revalidatePath("/host/account");
  revalidatePath("/host");
  return { ok: true };
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
