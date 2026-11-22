import { NextResponse } from "next/server";
import { getI18n } from "@/i18n/server";
import { hashPassword, isAdmin, startSession } from "@/lib/auth";
import { startSubscription } from "@/lib/billing";
import { createHost } from "@/lib/store";
import { trackEvent } from "@/lib/tracker";

export async function POST(req: Request) {
  const { t, locale } = await getI18n();
  const body = await req.json().catch(() => ({}));
  const name = String(body.name ?? "").trim().slice(0, 100);
  const email = String(body.email ?? "").trim().toLowerCase().slice(0, 200);
  const password = String(body.password ?? "");
  if (!name) return NextResponse.json({ error: t("err.name") }, { status: 400 });
  if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) return NextResponse.json({ error: t("err.email") }, { status: 400 });
  if (password.length < 8) return NextResponse.json({ error: t("err.password") }, { status: 400 });
  if (body.acceptTerms !== true) return NextResponse.json({ error: t("err.terms") }, { status: 400 });

  const host = await createHost({ name, email, passwordHash: hashPassword(password), locale });
  if (host === "exists") return NextResponse.json({ error: t("err.accountExists") }, { status: 409 });
  await startSession(host.id);
  void trackEvent({ event: "signup", hostId: host.id, ref: `signup-${host.id}` }); // in the background

  // The €3/month subscription is taken here, at sign-up (the host has just agreed to it), and
  // never asked for again at login. Admins have free access and skip it.
  if (isAdmin(host)) return NextResponse.json({ next: "/host/account?welcome=1" });
  try {
    return NextResponse.json({ next: await startSubscription(host) }); // Stripe Checkout (or straight back in demo mode)
  } catch (err) {
    console.error("[register] could not start the subscription checkout", err);
    return NextResponse.json({ next: "/host/account?welcome=1" });
  }
}
