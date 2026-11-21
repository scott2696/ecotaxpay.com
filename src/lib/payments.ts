import { stripe } from "./config";
import { notifyPaid } from "./notify";
import { getPayment, markPaid } from "./store";

/**
 * Confirms a Stripe Checkout Session with Stripe (never trusts the redirect alone)
 * and marks the matching payment as paid. Safe to call from both the webhook and
 * the success page — only the first call sends emails.
 */
export async function confirmStripeSession(sessionId: string) {
  const s = stripe();
  if (!s) return null;
  const session = await s.checkout.sessions.retrieve(sessionId);
  const paymentId = session.metadata?.paymentId;
  if (!paymentId || session.payment_status !== "paid") return null;
  // Quick links may be sent without a name: take it from the card payment.
  const needsName = !(await getPayment(paymentId))?.guestName && session.customer_details?.name;
  const res = await markPaid(paymentId, {
    stripeSessionId: session.id,
    stripePaymentIntentId: typeof session.payment_intent === "string" ? session.payment_intent : session.payment_intent?.id,
    ...(needsName ? { guestName: session.customer_details!.name!.slice(0, 120) } : {}),
  });
  if (res?.justPaid) await notifyPaid(res.record);
  return res?.record ?? null;
}
