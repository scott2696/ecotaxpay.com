import type { MessageKey } from "@/i18n/messages/en";
import { site } from "./config";
import { capFirst, quoteTitle } from "./quick";
import { renderReceipt } from "./receipt";
import { dirOf } from "@/i18n/config";
import { getI18n } from "@/i18n/server";
import { date, money } from "@/i18n/translate";
import { guideItems, translateGuide } from "./guide";
import { paymentReference, paysOnArrival, PHONE_APP_NAMES, type PhoneApp } from "./payMethods";
import { getProperty, issuerFor, updatePayment, type PaymentRecord } from "./store";

async function send(body: Record<string, unknown>) {
  const res = await fetch("https://api.resend.com/emails", {
    method: "POST",
    headers: { Authorization: `Bearer ${process.env.RESEND_API_KEY}`, "Content-Type": "application/json" },
    body: JSON.stringify(body),
  });
  if (!res.ok) throw new Error(`Resend ${res.status}: ${await res.text()}`);
}

/** Sends the guest receipt + host notification. No-op (logged) if Resend isn't configured. */
export async function sendPaidEmails(p: PaymentRecord) {
  const from = process.env.EMAIL_FROM;
  if (!process.env.RESEND_API_KEY || !from) {
    console.log(`[email] skipped for ${p.id}: RESEND_API_KEY / EMAIL_FROM not set`);
    return;
  }
  const q = p.quote;
  const first = p.guestName.split(/\s+/)[0];
  const issuer = await issuerFor(p);
  // The guest's email in the guest's language; the host's notification in the host's language.
  const { t, locale } = await getI18n(p.locale ?? "en");
  const { t: th, locale: hostLocale } = await getI18n(issuer.locale ?? "en");
  const total = money(q.totalCents, q.currency, locale);
  const pdf = Buffer.from(await renderReceipt(p)).toString("base64");
  const property = p.propertyId ? await getProperty(p.propertyId) : null;
  // Host-written guide text is machine-translated for the guest when that's switched on.
  const guide = property?.guide ? await translateGuide(property.guide, locale) : undefined;
  const items = guide ? guideItems(guide, t) : [];
  const d = (iso: string, l: string) => date(iso, l, { day: "numeric", month: "long", year: "numeric" });
  const nl2br = (s: string) => escape(s).replace(/\n/g, "<br>");
  const guideHtml = items.length
    ? `<h2 style="font-size:18px;margin:28px 0 4px">${escape(t("guest.guideTitle"))}</h2>
       <p style="color:#5f6b65;margin:0 0 12px">${escape(property!.name)}</p>
       ${items
         .map(
           (i) => `<div style="margin:0 0 14px;${i.highlight ? "background:#e9f3ee;padding:12px;border-radius:8px;" : ""}">
             <strong>${i.icon} ${escape(i.title)}</strong><br><span style="color:#3b4540">${nl2br(i.body)}</span></div>`,
         )
         .join("")}
       ${guide!.mapsUrl ? `<p><a href="${escape(guide!.mapsUrl)}">${escape(t("guest.openMaps"))}</a></p>` : ""}`
    : "";
  try {
    if (p.guestEmail) await send({
      from,
      to: p.guestEmail,
      subject: items.length
        ? t("email.subjectGuide", { property: p.propertyName ?? q.taxName })
        : t("email.subjectReceipt", { number: p.receiptNumber ?? "", tax: capFirst(quoteTitle(q, t)) }),
      html: `<div dir="${dirOf(locale)}" style="font-family:system-ui,sans-serif;font-size:15px;line-height:1.5;color:#16201b;max-width:560px">
        <p>${escape(first ? t("email.hi", { name: first }) : t("email.hiAnon"))}</p>
        <p>${escape(q.manual ? t("email.thanksQuick", { amount: total, tax: quoteTitle(q, t) }) : t("email.thanks", { amount: total, tax: q.taxName, from: d(q.checkIn, locale), to: d(q.checkOut, locale) }))}</p>
        ${guideHtml}
        <p style="margin-top:24px"><a href="${site.baseUrl}/p/${p.id}?lang=${locale}">${escape(t("email.viewOnline"))}</a></p>
        <p>${escape(t("email.seeYou"))}<br>${escape(issuer.name)}</p></div>`,
      attachments: [{ filename: `receipt-${p.receiptNumber}.pdf`, content: pdf }],
    });
    if (issuer.email) {
      const hostTotal = money(q.totalCents, q.currency, hostLocale);
      await send({
        from,
        to: issuer.email,
        subject: th("email.hostSubject", { amount: hostTotal, name: p.guestName || p.guestEmail, date: d(q.checkIn, hostLocale) }),
        html: `<p>${escape(
          q.manual
            ? th("email.hostBodyQuick", { name: p.guestName || p.guestEmail, amount: hostTotal, tax: quoteTitle(q, th) })
            : th("email.hostBody", { name: p.guestName, amount: hostTotal, property: p.propertyName ?? "", from: d(q.checkIn, hostLocale), to: d(q.checkOut, hostLocale), nights: th.plural("line.nights", q.nights) }),
        )}
          ${p.bookingRef ? escape(th("receipt.bookingRef", { ref: p.bookingRef })) : ""}</p>
          <p><a href="${site.baseUrl}/host">${escape(th("email.openDashboard"))}</a></p>`,
      });
    }
    await updatePayment(p.id, { emailSentAt: new Date().toISOString() });
  } catch (err) {
    console.error(`[email] failed for ${p.id}`, err);
  }
}

/**
 * "Forgot your password?": email the reset link. Returns false if email isn't set up
 * (the link is then logged on the server so an admin can pass it on).
 */
export async function sendPasswordResetEmail(to: { email: string; name: string; locale?: string }, link: string): Promise<boolean> {
  const from = process.env.EMAIL_FROM;
  if (!process.env.RESEND_API_KEY || !from) {
    console.log(`[email] password reset for ${to.email} not sent (RESEND_API_KEY / EMAIL_FROM not set). Link: ${link}`);
    return false;
  }
  const { t } = await getI18n(to.locale ?? "en");
  try {
    await send({
      from,
      to: to.email,
      subject: t("email.resetSubject", { brand: site.name }),
      html: `<div style="font-family:system-ui,sans-serif;font-size:15px;line-height:1.5;color:#16201b;max-width:520px">
        <p>${escape(t("email.hi", { name: to.name.split(/\s+/)[0] || "" }))}</p>
        <p>${escape(t("email.resetBody", { brand: site.name }))}</p>
        <p><a href="${escape(link)}" style="display:inline-block;background:#16201b;color:#fff;padding:12px 20px;border-radius:10px;text-decoration:none;font-weight:600">${escape(t("reset.title"))}</a></p>
        <p style="color:#5f6b65;font-size:13px">${escape(t("email.resetIgnore"))}</p></div>`,
    });
    return true;
  } catch (err) {
    console.error(`[email] password reset for ${to.email} failed`, err);
    return false;
  }
}

/** Tells the host a guest says they paid (or will pay cash), so they can check and confirm. */
export async function sendReportedEmail(p: PaymentRecord) {
  const from = process.env.EMAIL_FROM;
  const issuer = await issuerFor(p);
  if (!process.env.RESEND_API_KEY || !from || !issuer.email) {
    console.log(`[email] reported-payment notice skipped for ${p.id}`);
    return;
  }
  const { t } = await getI18n(issuer.locale ?? "en");
  const amount = money(p.quote.totalCents, p.quote.currency, t.locale);
  const name = p.guestName || p.guestEmail;
  const method = !p.paidVia ? "" : p.paidVia in PHONE_APP_NAMES ? PHONE_APP_NAMES[p.paidVia as PhoneApp] : t(`method.${p.paidVia}` as MessageKey);
  const onArrival = paysOnArrival(p.paidVia);
  try {
    await send({
      from,
      to: issuer.email,
      subject: t(onArrival ? "email.reportedCashSubject" : "email.reportedSubject", { name, amount }),
      html: `<p>${escape(t(onArrival ? "email.reportedCashBody" : "email.reportedBody", { name, amount, method, ref: paymentReference(p) }))}</p>
        <p><a href="${site.baseUrl}/host">${escape(t("email.openDashboard"))}</a></p>`,
    });
  } catch (err) {
    console.error(`[email] reported-payment notice failed for ${p.id}`, err);
  }
}

function escape(s: string) {
  return s.replace(/[&<>"']/g, (c) => ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#39;" })[c]!);
}
