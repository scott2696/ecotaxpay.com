import { NextResponse } from "next/server";
import { stripe } from "@/lib/config";
import { applySubscription } from "@/lib/billing";
import { confirmStripeSession } from "@/lib/payments";

// Stripe → POST /api/webhook
// Events: checkout.session.completed, checkout.session.async_payment_succeeded,
//         customer.subscription.created / .updated / .deleted
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
    case "customer.subscription.deleted":
      await applySubscription(event.data.object);
      break;
  }
  return NextResponse.json({ received: true });
}
