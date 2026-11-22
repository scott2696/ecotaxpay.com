import { NextResponse } from "next/server";
import { getI18n } from "@/i18n/server";
import { createPasswordReset, resetAllowed } from "@/lib/auth";
import { site } from "@/lib/config";
import { sendPasswordResetEmail } from "@/lib/email";
import { getHostByEmail } from "@/lib/store";

// "Forgot your password?": always the same answer, so it can't be used to find out who has an account.
export async function POST(req: Request) {
  const { t } = await getI18n();
  const body = await req.json().catch(() => ({}));
  const email = String(body.email ?? "").trim().toLowerCase().slice(0, 200);
  if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) return NextResponse.json({ error: t("err.email") }, { status: 400 });
  if (resetAllowed(email)) {
    const host = await getHostByEmail(email);
    if (host) {
      const token = await createPasswordReset(host);
      await sendPasswordResetEmail(host, `${site.baseUrl}/reset-password?token=${token}`);
    }
  }
  return NextResponse.json({ ok: true });
}
