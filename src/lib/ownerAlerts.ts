// Emails to the platform owner: new sign-ups, new subscribers, renewals, cancellations and failed
// payments. Sent to OWNER_ALERT_EMAIL (comma-separated), else ADMIN_EMAILS, else the support inbox.
// Off until RESEND_API_KEY and EMAIL_FROM are set. Never throws: an alert must not break sign-up or billing.
import { site } from "./config";
import { countSubscribers, type Host } from "./store";
import { button, para, renderEmail } from "./emailLayout";

const PERIOD: Record<number, string> = { 1: "Monthly", 3: "3 months", 6: "6 months", 12: "Yearly" };

function recipients(): string[] {
  const list = process.env.OWNER_ALERT_EMAIL || process.env.ADMIN_EMAILS || site.supportEmail;
  return list.split(",").map((e) => e.trim()).filter(Boolean);
}

const esc = (s: string) => s.replace(/[&<>"']/g, (c) => ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#39;" })[c]!);

export function formatAmount(cents: number, currency: string) {
  try {
    return new Intl.NumberFormat("en-GB", { style: "currency", currency: currency.toUpperCase() }).format(cents / 100);
  } catch {
    return `${(cents / 100).toFixed(2)} ${currency.toUpperCase()}`;
  }
}

/** The host's plan in words, e.g. "Yearly (€30)". */
export function planText(host: Host) {
  const p = host.subscription.price;
  if (!p) return "";
  return `${PERIOD[p.months ?? 1] ?? `${p.months} months`} (${formatAmount(Math.round(p.amount * 100), p.currency)})`;
}

type Alert = {
  /** Short subject after the "[Eco Tax Pay]" tag, e.g. "New subscriber: Ana López, Yearly (€30)". */
  subject: string;
  host: Host;
  lines?: (string | undefined | false)[];
};

export async function alertOwner({ subject, host, lines = [] }: Alert): Promise<void> {
  const from = process.env.EMAIL_FROM;
  const to = recipients();
  if (!process.env.RESEND_API_KEY || !from || !to.length) {
    console.log(`[owner-alert] skipped (email not set up): ${subject}`);
    return;
  }
  try {
    const subscribers = await countSubscribers();
    const rows = [
      `<strong style="color:#f1f2f4">${esc(host.name)}</strong> &lt;${esc(host.email)}&gt;`,
      host.businessName && `Business: ${esc(host.businessName)}`,
      ...lines.filter((l): l is string => !!l).map(esc),
      `Signed up: ${new Date(host.createdAt).toUTCString().slice(5, 16)}`,
      `Paying subscribers now: <strong style="color:#f1f2f4">${subscribers}</strong>`,
    ].filter(Boolean);
    const res = await fetch("https://api.resend.com/emails", {
      method: "POST",
      headers: { Authorization: `Bearer ${process.env.RESEND_API_KEY}`, "Content-Type": "application/json" },
      body: JSON.stringify({
        from,
        to,
        reply_to: host.email,
        subject: `[${site.name}] ${subject}`,
        html: renderEmail({
          eyebrow: "Owner alert",
          title: subject,
          preheader: `${host.name} · ${host.email}`,
          body: `${para(rows.join("<br>"))}${host.subscription.stripeCustomerId ? button("Open in Stripe", `https://dashboard.stripe.com/customers/${encodeURIComponent(host.subscription.stripeCustomerId)}`) : ""}`,
        }),
      }),
      signal: AbortSignal.timeout(15_000),
    });
    if (!res.ok) console.error(`[owner-alert] Resend ${res.status}: ${await res.text()}`);
  } catch (err) {
    console.error("[owner-alert] failed", err);
  }
}
