import { NextResponse } from "next/server";
import { stripe } from "@/lib/config";
import { applySubscription, recordSubscriptionPayment } from "@/lib/billing";
import { confirmStripeSession } from "@/lib/payments";
import { alertOwner, planText } from "@/lib/ownerAlerts";

// Stripe → POST /api/webhook
// Events: checkout.session.completed, checkout.session.async_payment_succeeded,
//         customer.subscription.created / .updated / .deleted, invoice.paid
export async function POST(req: Request) {
  const s = stripe();
  const secret = process.env.STRIPE_WEBHOOK_SECRET;
  if (!s || !secret) return NextResponse.json({ error: "Webhook not configured" }, { status: 500 });

  let event;
  try {
    event = s.webhooks.constructEvent(await req.text(), req.headers.get("stripe-signature") ?? "", secret);
  } catch {
    return NextResponse.json({ error: "Invalid signature" }, { status: 400 });
  }

  switch (event.type) {
    case "checkout.session.completed":
    case "checkout.session.async_payment_succeeded": {
      const session = event.data.object;
      if (session.mode === "subscription" && session.subscription) {
        // A host just subscribed (€3/month).
        const subId = typeof session.subscription === "string" ? session.subscription : session.subscription.id;
        await applySubscription(await s.subscriptions.retrieve(subId));
      } else {
        await confirmStripeSession(session.id); // a guest paid their tourist tax
      }
      break;
    }
    // Renewals, failed payments, cancellations (incl. from the billing portal), end of subscription.
    case "customer.subscription.created":
    case "customer.subscription.updated":
    case "customer.subscription.deleted": {
      const host = await applySubscription(event.data.object);
      if (!host) break;
      // Tell the owner about cancellations and failed payments (new subscribers come with invoice.paid).
      const sub = event.data.object;
      const before = (event.data as { previous_attributes?: { cancel_at_period_end?: boolean; status?: string } }).previous_attributes ?? {};
      const ends = host.subscription.currentPeriodEnd ? new Date(host.subscription.currentPeriodEnd).toUTCString().slice(5, 16) : "";
      const plan = planText(host) && `Plan: ${planText(host)}`;
      if (event.type === "customer.subscription.deleted")
        await alertOwner({ subject: `Subscription ended: ${host.name}`, host, lines: [plan] });
      else if (before.cancel_at_period_end === false && sub.cancel_at_period_end)
        await alertOwner({ subject: `Cancelled: ${host.name}`, host, lines: ["Cancelled renewal. No further charges.", ends && `Access until: ${ends}`, plan] });
      else if (before.cancel_at_period_end === true && !sub.cancel_at_period_end)
        await alertOwner({ subject: `Resumed: ${host.name}`, host, lines: ["Turned renewal back on.", plan] });
      else if (before.status && before.status !== sub.status && (sub.status === "past_due" || sub.status === "unpaid"))
        await alertOwner({ subject: `Payment failed: ${host.name}`, host, lines: ["Stripe could not charge the card and will retry.", plan] });
      break;
    }
    // A host's subscription was charged (first payment or renewal): report it to the FTD Tracker.
    case "invoice.paid":
      await recordSubscriptionPayment(event.data.object);
      break;
  }
  return NextResponse.json({ received: true });
}
