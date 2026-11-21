import { NextResponse } from "next/server";
import { getI18n } from "@/i18n/server";
import { hashPassword, startSession } from "@/lib/auth";
import { createHost } from "@/lib/store";

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
  return NextResponse.json({ next: "/host/account?welcome=1" });
}
