// Host subscription: €3/month (or the equivalent in the host's currency) via Stripe Billing.
// Without a Stripe key (demo mode) it is simulated.
import type Stripe from "stripe";
import { isDemoMode, site, stripe } from "./config";
import { visitorPlan, type Plan, type PlanId } from "./pricing";
import { getHostBy, updateHost, type Host, type SubscriptionStatus } from "./store";
import { trackEvent } from "./tracker";

const addMonths = (months: number, d = new Date()) => {
  const n = new Date(d);
  n.setUTCMonth(n.getUTCMonth() + months);
  return n.toISOString();
};

/** One product in Stripe for the host subscription (fixed id, so it is created only once). */
const PRODUCT_ID = "ecotaxpay_host_subscription";
const priceCache = new Map<string, string>();

/**
 * The Stripe price for a plan in this currency and amount, created the first time it's needed and
 * found again by its lookup key after that (no new price per sign-up, so reports stay clean).
 */
async function planPrice(s: Stripe, plan: Plan): Promise<string> {
  const { currency, stripeUnitAmount: unitAmount, months, id } = plan;
  const key = `etp_host_${id}_${currency.toLowerCase()}_${unitAmount}`; // monthly keeps its original key
  const cached = priceCache.get(key);
  if (cached) return cached;
  const found = (await s.prices.list({ lookup_keys: [key], active: true, limit: 1 })).data[0];
  if (found) {
    priceCache.set(key, found.id);
    return found.id;
  }
  try {
    await s.products.retrieve(PRODUCT_ID);
  } catch {
    await s.products.create({
      id: PRODUCT_ID,
      name: `${site.name} host subscription`,
      description: "Unlimited properties and tourist-tax payment links. Billed per period, cancel any time.",
    });
  }
  const price = await s.prices.create({
    product: PRODUCT_ID,
    currency: currency.toLowerCase(),
    unit_amount: unitAmount,
    recurring: months === 12 ? { interval: "year" } : { interval: "month", interval_count: months },
    lookup_key: key,
    nickname: `${PERIOD_EN[id]} (${currency.toUpperCase()})`,
  });
  priceCache.set(key, price.id);
  return price.id;
}

const PERIOD_EN: Record<PlanId, string> = { monthly: "Monthly", quarterly: "Every 3 months", semiannual: "Every 6 months", yearly: "Yearly" };
const RENEWS_EN: Record<PlanId, string> = { monthly: "per month, renewing monthly", quarterly: "every 3 months, renewing every 3 months", semiannual: "every 6 months, renewing every 6 months", yearly: "per year, renewing yearly" };

/** Start a subscription. Returns the URL to send the host to (Stripe Checkout, or straight back in demo mode). */
export async function startSubscription(host: Host, planId: PlanId = "monthly"): Promise<string> {
  // Priced in the host's local currency at today's ECB rate; Stripe keeps that amount for the subscription.
  const plan = await visitorPlan("en", planId);
  const price = { currency: plan.currency, amount: plan.amount, months: plan.months };
  if (isDemoMode()) {
    await updateHost(host.id, { subscription: { status: "active", demo: true, currentPeriodEnd: addMonths(plan.months), cancelAtPeriodEnd: false, price } });
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
    line_items: [{ quantity: 1, price: await planPrice(s, plan) }],
    subscription_data: { metadata: { hostId: host.id, plan: plan.id } },
    // Proper invoices for business hosts: billing address and (optional) VAT number, saved on the customer.
    billing_address_collection: "auto",
    tax_id_collection: { enabled: true },
    customer_update: { address: "auto", name: "auto" },
    allow_promotion_codes: true,
    // Shown just above Stripe's Pay button.
    custom_text: {
      submit: {
        message: `By subscribing you agree to the ${site.name} Terms & Conditions (${site.baseUrl}/terms) and Privacy Policy (${site.baseUrl}/privacy). ${plan.label} ${RENEWS_EN[plan.id]} until you cancel from your Account page.`,
      },
    },
    locale: "auto",
    // Coming back, the session id lets the site confirm the payment with Stripe straight away.
    success_url: `${site.baseUrl}/host/account?subscribed=1&session_id={CHECKOUT_SESSION_ID}`,
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

/**
 * Webhook `invoice.paid`: a host's subscription was charged. The first charge counts as an FTD
 * in the FTD Tracker, renewals as deposits.
 */
export async function recordSubscriptionPayment(invoice: Stripe.Invoice) {
  if (!invoice.amount_paid || !invoice.id) return;
  const customerId = typeof invoice.customer === "string" ? invoice.customer : invoice.customer?.id;
  const host = customerId ? await getHostBy((h) => h.subscription.stripeCustomerId === customerId) : null;
  if (!host) return;
  await trackEvent({
    event: invoice.billing_reason === "subscription_create" ? "ftd" : "deposit",
    hostId: host.id,
    ref: invoice.id,
    amountCents: invoice.amount_paid,
    currency: invoice.currency,
    date: new Date((invoice.status_transitions?.paid_at ?? invoice.created) * 1000).toISOString().slice(0, 10),
  });
}

/**
 * The host is back from Stripe Checkout: confirm with Stripe (never trust the redirect alone) and
 * switch the subscription on now, without waiting for the webhook. Safe to repeat.
 */
export async function confirmSubscriptionCheckout(host: Host, sessionId: string): Promise<Host> {
  const s = stripe();
  if (!s || !/^cs_[A-Za-z0-9_]+$/.test(sessionId)) return host;
  try {
    const session = await s.checkout.sessions.retrieve(sessionId, { expand: ["subscription"] });
    if (session.mode !== "subscription" || session.client_reference_id !== host.id) return host;
    const sub = session.subscription;
    if (!sub || typeof sub === "string") return host;
    return (await applySubscription(sub)) ?? host;
  } catch (err) {
    console.error("[billing] could not confirm checkout session", err);
    return host;
  }
}

/** In demo mode, a cancelled subscription ends once its month is over. */
export async function settleDemoSubscription(host: Host): Promise<Host> {
  const s = host.subscription;
  if (s.demo && s.cancelAtPeriodEnd && s.currentPeriodEnd && s.currentPeriodEnd < new Date().toISOString())
    return (await updateHost(host.id, { subscription: { status: "canceled" } })) ?? host;
  return host;
}
