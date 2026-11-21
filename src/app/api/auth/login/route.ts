import { NextResponse } from "next/server";
import { clearLoginFailures, loginBlocked, recordLoginFailure, startSession, verifyPassword } from "@/lib/auth";
import { getI18n } from "@/i18n/server";
import { getHostByEmail } from "@/lib/store";

export async function POST(req: Request) {
  const { t } = await getI18n();
  const body = await req.json().catch(() => ({}));
  const email = String(body.email ?? "").trim().toLowerCase();
  const password = String(body.password ?? "");
  if (loginBlocked(email)) return NextResponse.json({ error: t("err.tooMany") }, { status: 429 });

  const host = await getHostByEmail(email);
  if (!host || !verifyPassword(password, host.passwordHash)) {
    recordLoginFailure(email);
    return NextResponse.json({ error: t("err.wrongLogin") }, { status: 401 });
  }
  clearLoginFailures(email);
  await startSession(host.id);
  // Only allow redirects inside the host area.
  const next = typeof body.next === "string" && body.next.startsWith("/host") ? body.next : "/host";
  return NextResponse.json({ next });
}
