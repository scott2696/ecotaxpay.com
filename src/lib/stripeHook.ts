// Automatic payment confirmation for hosts who take card payments with their own Stripe Payment Link.
// The host adds a webhook in THEIR Stripe account pointing at /api/hooks/stripe/<id>; Stripe tells us
// when a guest paid (checkout.session.completed). The money goes to the host's Stripe: we never hold it.
// Payment links carry client_reference_id=ETP-XXXXXX (see payMethods.ts), which identifies the payment.
import { createCipheriv, createDecipheriv, createHash, createHmac, randomBytes, timingSafeEqual } from "node:crypto";
import { appSecret } from "./auth";
import { minorToCents } from "./currencies";
import { notifyPaid } from "./notify";
import { paymentReference } from "./payMethods";
import { listPayments, markPaid, updateHost, updatePayment, type Host } from "./store";

const key = () => createHash("sha256").update(`stripe-hook:${appSecret()}`).digest();

export function sealSecret(plain: string): string {
  const iv = randomBytes(12);
  const c = createCipheriv("aes-256-gcm", key(), iv);
  const enc = Buffer.concat([c.update(plain, "utf8"), c.final()]);
  return [iv, c.getAuthTag(), enc].map((b) => b.toString("base64url")).join(".");
}

export function openSecret(sealed: string): string | null {
  try {
    const [iv, tag, enc] = sealed.split(".").map((p) => Buffer.from(p, "base64url"));
    const d = createDecipheriv("aes-256-gcm", key(), iv);
    d.setAuthTag(tag);
    return Buffer.concat([d.update(enc), d.final()]).toString("utf8");
  } catch {
    return null;
  }
}

/** Stripe's signature scheme: header "t=<ts>,v1=<hmac>[,v1=…]", HMAC-SHA256 of "<ts>.<raw body>". */
export function verifyStripeSignature(rawBody: string, header: string | null, secret: string, toleranceSec = 300, now = Date.now()): boolean {
  if (!header) return false;
  const parts = header.split(",").map((p) => p.split("=") as [string, string]);
  const ts = Number(parts.find(([k]) => k === "t")?.[1]);
  const sigs = parts.filter(([k]) => k === "v1").map(([, v]) => v);
  if (!ts || !sigs.length || Math.abs(now / 1000 - ts) > toleranceSec) return false;
  const expected = createHmac("sha256", secret).update(`${ts}.${rawBody}`).digest();
  return sigs.some((s) => {
    const got = Buffer.from(s, "hex");
    return got.length === expected.length && timingSafeEqual(got, expected);
  });
}

type Session = { id: string; object: string; client_reference_id?: string | null; amount_total?: number | null; currency?: string | null; payment_status?: string };

/** Handle one verified event for a host. Returns a short result for the host's settings page. */
export async function handleStripeEvent(host: Host, event: { type: string; data: { object: Session } }): Promise<string> {
  if (event.type !== "checkout.session.completed" && event.type !== "checkout.session.async_payment_succeeded") return "ignored";
  const s = event.data.object;
  if (s.payment_status !== "paid") return "not paid yet";
  const ref = (s.client_reference_id ?? "").toUpperCase();
  if (!/^ETP-[A-Z0-9]{6}$/.test(ref)) return "no Eco Tax Pay reference";
  const payment = (await listPayments(host.id)).find((p) => paymentReference(p) === ref);
  if (!payment) return `no payment ${ref}`;
  if (payment.status !== "pending") return `${ref} already ${payment.status}`;

  const currency = (s.currency ?? "").toUpperCase();
  const paidMinor = s.amount_total ?? 0;
  // Our amounts are stored ×100 for every currency; convert Stripe's minor units to that.
  const paidCents = minorToCents(paidMinor, currency);
  if (currency !== payment.quote.currency.toUpperCase() || paidCents < payment.quote.totalCents) {
    // Paid, but not the full amount (or another currency): flag it for the host to check.
    await updatePayment(payment.id, { paidVia: "card", reportedPaidAt: new Date().toISOString(), stripeSessionId: s.id, amountMismatch: { paidMinor, currency } });
    return `${ref} amount differs`;
  }
  const res = await markPaid(payment.id, { status: "paid", paidVia: "card", stripeSessionId: s.id });
  if (res?.justPaid && (res.record.guestEmail || res.record.guestPhone)) await notifyPaid(res.record).catch(() => undefined);
  return `${ref} confirmed`;
}

export async function recordHookResult(host: Host, result: string) {
  if (!host.stripeHook) return;
  await updateHost(host.id, { stripeHook: { ...host.stripeHook, lastEventAt: new Date().toISOString(), lastResult: result } });
}

export const newHookId = () => randomBytes(12).toString("base64url");
