// Host subscription: €3/month (or the equivalent in the host's currency) via Stripe Billing.
// Without a Stripe key (demo mode) it is simulated.
import type Stripe from "stripe";
import { isDemoMode, site, stripe } from "./config";
import { visitorPlan } from "./pricing";
import { getHostBy, updateHost, type Host, type SubscriptionStatus } from "./store";

export const PLAN = { interval: "month" as const };

const addMonth = (d = new Date()) => {
  const n = new Date(d);
  n.setUTCMonth(n.getUTCMonth() + 1);
  return n.toISOString();
};

/** Start a subscription. Returns the URL to send the host to (Stripe Checkout, or straight back in demo mode). */
export async function startSubscription(host: Host): Promise<string> {
  // Priced in the host's local currency at today's ECB rate; Stripe keeps that amount for the subscription.
  const plan = await visitorPlan("en");
  const price = { currency: plan.currency, amount: plan.amount };
  if (isDemoMode()) {
    await updateHost(host.id, { subscription: { status: "active", demo: true, currentPeriodEnd: addMonth(), cancelAtPeriodEnd: false, price } });
    return "/host/account?subscribed=1";
  }
  const s = stripe()!;
  let customerId = host.subscription.stripeCustomerId;
  if (!customerId) {
    const customer = await s.customers.create({ email: host.email, name: host.businessName || host.name, metadata: { hostId: host.id } });
    customerId = customer.id;
    await updateHost(host.id, { subscription: { stripeCustomerId: customerId } });
  }
  await updateHost(host.id, { subscription: { price } });
  const session = await s.checkout.sessions.create({
    mode: "subscription",
    customer: customerId,
    client_reference_id: host.id,
    line_items: [
      {
        quantity: 1,
        price_data: {
          currency: plan.currency.toLowerCase(),
          unit_amount: plan.stripeUnitAmount,
          recurring: { interval: PLAN.interval },
          product_data: { name: `${site.name} host subscription` },
        },
      },
    ],
    subscription_data: { metadata: { hostId: host.id } },
    success_url: `${site.baseUrl}/host/account?subscribed=1`,
    cancel_url: `${site.baseUrl}/host/account?cancelled_checkout=1`,
  });
  return session.url!;
}

/** Cancel at the end of the paid month: no further charges, access continues until then. */
export async function cancelSubscription(host: Host) {
  if (host.subscription.demo || isDemoMode()) return updateHost(host.id, { subscription: { cancelAtPeriodEnd: true } });
  if (!host.subscription.stripeSubscriptionId) return null;
  const sub = await stripe()!.subscriptions.update(host.subscription.stripeSubscriptionId, { cancel_at_period_end: true });
  return applySubscription(sub);
}

/** Undo a cancellation before the month ends. */
export async function resumeSubscription(host: Host) {
  if (host.subscription.demo || isDemoMode()) return updateHost(host.id, { subscription: { cancelAtPeriodEnd: false } });
  if (!host.subscription.stripeSubscriptionId) return null;
  const sub = await stripe()!.subscriptions.update(host.subscription.stripeSubscriptionId, { cancel_at_period_end: false });
  return applySubscription(sub);
}

/** Stripe's billing portal (update card, download invoices). Needs to be switched on once in the Stripe dashboard. */
export async function billingPortalUrl(host: Host): Promise<string | null> {
  if (isDemoMode() || !host.subscription.stripeCustomerId) return null;
  const session = await stripe()!.billingPortal.sessions.create({
    customer: host.subscription.stripeCustomerId,
    return_url: `${site.baseUrl}/host/account`,
  });
  return session.url;
}

/** Store Stripe's view of a subscription on the host (called from the webhook and after changes). */
export async function applySubscription(sub: Stripe.Subscription) {
  const customerId = typeof sub.customer === "string" ? sub.customer : sub.customer.id;
  const host =
    (sub.metadata?.hostId && (await getHostBy((h) => h.id === sub.metadata.hostId))) ||
    (await getHostBy((h) => h.subscription.stripeCustomerId === customerId));
  if (!host) return null;
  // Newer Stripe API versions moved current_period_end onto the subscription item.
  const item = sub.items?.data?.[0] as unknown as { current_period_end?: number } | undefined;
  const periodEnd = (sub as unknown as { current_period_end?: number }).current_period_end ?? item?.current_period_end;
  return updateHost(host.id, {
    subscription: {
      status: sub.status as SubscriptionStatus,
      stripeCustomerId: customerId,
      stripeSubscriptionId: sub.id,
      cancelAtPeriodEnd: sub.cancel_at_period_end,
      currentPeriodEnd: periodEnd ? new Date(periodEnd * 1000).toISOString() : undefined,
      demo: false,
    },
  });
}

/** In demo mode, a cancelled subscription ends once its month is over. */
export async function settleDemoSubscription(host: Host): Promise<Host> {
  const s = host.subscription;
  if (s.demo && s.cancelAtPeriodEnd && s.currentPeriodEnd && s.currentPeriodEnd < new Date().toISOString())
    return (await updateHost(host.id, { subscription: { status: "canceled" } })) ?? host;
  return host;
}
