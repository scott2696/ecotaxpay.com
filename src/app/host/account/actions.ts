"use server";

import { sealSecret } from "@/lib/stripeHook";
import { revalidatePath } from "next/cache";
import type { SaveResult } from "./MethodsForm";
import { redirect } from "next/navigation";
import { endSession, requireHost, setPassword, startSession, verifyPassword } from "@/lib/auth";
import { getI18n } from "@/i18n/server";
import type { PasswordResult } from "./ChangePasswordForm";
import { billingPortalUrl, cancelSubscription, resumeSubscription, startSubscription } from "@/lib/billing";
import { activeMethods, isWiseUrl, normalizeAccountNumber, normalizeBic, normalizeRouting, normalizeSortCode, normalizeIban, normalizeIntlPhone, normalizePaypal, normalizeRevtag, normalizeUrl, normalizeWero } from "@/lib/payMethods";
import { CARD_BRANDS } from "@/components/PayBadges";
import type { CardBrandId } from "@/lib/store";
import { getHost, updateHost } from "@/lib/store";

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
  // Every field is checked before anything is saved (a wrong entry must never be dropped silently).
  const revolut = pick(on("revolutOn"), text("revolut", 60), "revolut", normalizeRevtag);
  const paypal = pick(on("paypalOn"), text("paypal", 80), "paypal", normalizePaypal);
  const wise = pick(on("wiseOn"), text("wise", 200), "wise", isWiseUrl);
  const bizum = pick(on("bizumOn"), text("bizum", 30), "bizum", normalizeIntlPhone);
  const mbway = pick(on("mbwayOn"), text("mbway", 30), "mbway", normalizeIntlPhone);
  const satispay = pick(on("satispayOn"), text("satispay", 30), "satispay", normalizeIntlPhone);
  const twint = pick(on("twintOn"), text("twint", 30), "twint", normalizeIntlPhone);
  const wero = pick(on("weroOn"), text("wero", 120), "wero", normalizeWero);

  if (bad.length) return { ok: false, bad }; // nothing is saved, and the form keeps what was typed
  await updateHost(host.id, {
    paymentMethods: {
      card: cardUrl ? { url: cardUrl, provider: text("cardProvider", 40) || undefined, brands: brands("card") } : undefined,
      bank: bankOn
        ? { holder, holderAddress, accountType: bankType, iban, sortCode, routingNumber, accountNumber, bic, bankName, bankAddress }
        : undefined,
      revolut,
      paypal,
      wise,
      bizum,
      mbway,
      satispay,
      twint,
      wero,
      link: linkUrl ? { url: linkUrl, label: text("linkLabel", 40) || undefined } : undefined,
      note: text("note", 500) || undefined,
    },
  });
  revalidatePath("/host/account");
  revalidatePath("/host");
  // Tell the form exactly what is now stored, read back from the saved account.
  const saved = activeMethods((await getHost(host.id))?.paymentMethods);
  return { ok: true, saved };
}

export async function saveProfile(form: FormData) {
  const host = await requireHost();
  const text = (k: string, max = 120) => String(form.get(k) ?? "").trim().slice(0, max);
  await updateHost(host.id, {
    name: text("name") || host.name,
    businessName: text("businessName") || undefined,
    taxId: text("taxId", 40) || undefined,
    guestContact: text("guestContact", 120) || undefined,
    guestPolicy: text("guestPolicy", 1500) || undefined,
  });
  revalidatePath("/host/account");
  redirect("/host/account?saved=1");
}

/** "Change password": needs the current one; this device stays logged in, all others are logged out. */
export async function changePassword(form: FormData): Promise<PasswordResult> {
  const host = await requireHost();
  const { t } = await getI18n();
  const current = String(form.get("current") ?? "");
  const password = String(form.get("password") ?? "");
  if (!verifyPassword(current, host.passwordHash)) return { ok: false, error: t("err.currentPassword") };
  if (password.length < 8) return { ok: false, error: t("err.password") };
  if (password !== String(form.get("confirm") ?? "")) return { ok: false, error: t("reset.mismatch") };
  await setPassword(host, password);
  await startSession(host.id); // new session for this device (old ones no longer match the password)
  return { ok: true };
}

export async function logout() {
  await endSession();
  redirect("/");
}

/** Automatic confirmation: save the signing secret of the host's Stripe webhook (stored encrypted). */
export async function saveStripeHook(form: FormData) {
  const host = await requireHost();
  const secret = String(form.get("whsec") ?? "").trim();
  if (!host.stripeHook || !/^whsec_[A-Za-z0-9+/=_-]{10,}$/.test(secret)) redirect("/host/account?hookError=1#auto-confirm");
  await updateHost(host.id, { stripeHook: { ...host.stripeHook!, secret: sealSecret(secret), connectedAt: new Date().toISOString(), lastEventAt: undefined, lastResult: undefined } });
  revalidatePath("/host/account");
  redirect("/host/account?hookSaved=1#auto-confirm");
}

export async function disconnectStripeHook() {
  const host = await requireHost();
  if (host.stripeHook) await updateHost(host.id, { stripeHook: { id: host.stripeHook.id } });
  revalidatePath("/host/account");
  redirect("/host/account#auto-confirm");
}
