import { NextResponse } from "next/server";
import { getI18n } from "@/i18n/server";
import { site } from "@/lib/config";
import { saveContactMessage } from "@/lib/store";

const TOPICS = new Set(["general", "account", "billing", "tax", "bug", "partnership"]);
const recent = new Map<string, number[]>(); // ip → timestamps (simple flood protection: 5 per hour)

const esc = (s: string) => s.replace(/[&<>"']/g, (c) => ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#39;" })[c]!);

// The public site (ecotaxpay.com, static) posts its contact form here on the app domain.
const ALLOWED_ORIGIN = (process.env.NEXT_PUBLIC_MARKETING_URL ?? "").replace(/\/$/, "");
const cors = (res: Response) => {
  if (ALLOWED_ORIGIN) {
    res.headers.set("Access-Control-Allow-Origin", ALLOWED_ORIGIN);
    res.headers.set("Vary", "Origin");
  }
  return res;
};

export function OPTIONS() {
  return cors(new Response(null, { status: 204, headers: { "Access-Control-Allow-Methods": "POST", "Access-Control-Allow-Headers": "Content-Type", "Access-Control-Max-Age": "86400" } }));
}

export async function POST(req: Request) {
  return cors(await handle(req));
}

async function handle(req: Request): Promise<Response> {
  const { t, locale } = await getI18n();
  const body = await req.json().catch(() => ({}));
  if (body.website) return NextResponse.json({ ok: true }); // honeypot filled: silently drop bots

  const ip = (req.headers.get("x-forwarded-for") ?? "local").split(",")[0].trim();
  const now = Date.now();
  const hits = (recent.get(ip) ?? []).filter((x) => now - x < 3_600_000);
  if (hits.length >= 5) return NextResponse.json({ error: t("err.tooMany") }, { status: 429 });

  const name = String(body.name ?? "").trim().slice(0, 100);
  const email = String(body.email ?? "").trim().slice(0, 200);
  const message = String(body.message ?? "").trim().slice(0, 5000);
  const topic = TOPICS.has(body.topic) ? String(body.topic) : "general";
  if (!name) return NextResponse.json({ error: t("err.name") }, { status: 400 });
  if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) return NextResponse.json({ error: t("err.email") }, { status: 400 });
  if (message.length < 10) return NextResponse.json({ error: t("contact.err.message") }, { status: 400 });

  recent.set(ip, [...hits, now]);
  const saved = await saveContactMessage({ name, email, topic, message, locale });

  // Forward to the support inbox when email sending is configured (otherwise it's kept in data/db.json).
  if (process.env.RESEND_API_KEY && process.env.EMAIL_FROM) {
    await fetch("https://api.resend.com/emails", {
      method: "POST",
      headers: { Authorization: `Bearer ${process.env.RESEND_API_KEY}`, "Content-Type": "application/json" },
      body: JSON.stringify({
        from: process.env.EMAIL_FROM,
        to: site.supportEmail,
        reply_to: email,
        subject: `[${site.name} contact · ${topic}] ${name}`,
        html: `<p><strong>${esc(name)}</strong> &lt;${esc(email)}&gt; · ${esc(topic)} · ${esc(locale)}</p><p style="white-space:pre-wrap">${esc(message)}</p><p style="color:#888">#${saved.id}</p>`,
      }),
    }).catch((e) => console.error("[contact] email failed", e));
  }
  return NextResponse.json({ ok: true });
}
