// Webhook from a host's own Stripe account (their Payment Link was paid). See lib/stripeHook.ts.
import { NextResponse } from "next/server";
import { getHostBy } from "@/lib/store";
import { handleStripeEvent, openSecret, recordHookResult, verifyStripeSignature } from "@/lib/stripeHook";

export const dynamic = "force-dynamic";

export async function POST(req: Request, { params }: { params: Promise<{ hookId: string }> }) {
  const { hookId } = await params;
  const host = await getHostBy((h) => h.stripeHook?.id === hookId);
  const secret = host?.stripeHook?.secret ? openSecret(host.stripeHook.secret) : null;
  const raw = await req.text();
  if (!host || !secret || !verifyStripeSignature(raw, req.headers.get("stripe-signature"), secret)) {
    return NextResponse.json({ error: "invalid signature" }, { status: 400 });
  }
  let result = "ignored";
  try {
    result = await handleStripeEvent(host, JSON.parse(raw));
  } catch (e) {
    console.error("[stripe-hook]", e);
    result = "error";
  }
  await recordHookResult(host, result);
  return NextResponse.json({ received: true, result });
}
