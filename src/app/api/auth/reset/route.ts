import { NextResponse } from "next/server";
import { getI18n } from "@/i18n/server";
import { hostForReset, setPassword, startSession } from "@/lib/auth";

// Set a new password from a reset link, then log in (all other sessions end).
export async function POST(req: Request) {
  const { t } = await getI18n();
  const body = await req.json().catch(() => ({}));
  const password = String(body.password ?? "");
  if (password.length < 8) return NextResponse.json({ error: t("err.password") }, { status: 400 });
  const host = await hostForReset(String(body.token ?? ""));
  if (!host) return NextResponse.json({ error: t("reset.invalid") }, { status: 400 });
  await setPassword(host, password);
  await startSession(host.id);
  return NextResponse.json({ next: "/host/account?passwordChanged=1" });
}
