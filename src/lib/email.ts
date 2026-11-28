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
import { bigAmount, button, esc as escape, link as textLink, panel, para, renderEmail, small, steps } from "./emailLayout";

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
    ? `<h2 style="margin:28px 0 4px;font-size:18px;font-weight:700;color:#f1f2f4">${escape(t("guest.guideTitle"))}</h2>
       <p style="margin:0 0 14px;font-size:14px;color:#7f838b">${escape(property!.name)}</p>
       ${items.map((i) => panel(`${i.icon} ${escape(i.title)}`, nl2br(i.body), i.highlight)).join("")}
       ${guide!.mapsUrl ? para(textLink(t("guest.openMaps"), guide!.mapsUrl)) : ""}`
    : "";
  try {
    if (p.guestEmail) await send({
      from,
      to: p.guestEmail,
      subject: items.length
        ? t("email.subjectGuide", { property: p.propertyName ?? q.taxName })
        : t("email.subjectReceipt", { number: p.receiptNumber ?? "", tax: capFirst(quoteTitle(q, t)) }),
      html: renderEmail({
        lang: locale,
        dir: dirOf(locale) as "ltr" | "rtl",
        preheader: q.manual ? t("email.thanksQuick", { amount: total, tax: quoteTitle(q, t) }) : t("email.thanks", { amount: total, tax: q.taxName, from: d(q.checkIn, locale), to: d(q.checkOut, locale) }),
        eyebrow: t("email.eyebrowReceipt", { number: p.receiptNumber ?? "" }),
        title: first ? t("email.hi", { name: first }) : t("email.hiAnon"),
        body: `${bigAmount(total, capFirst(quoteTitle(q, t)))}
          ${para(escape(q.manual ? t("email.thanksQuick", { amount: total, tax: quoteTitle(q, t) }) : t("email.thanks", { amount: total, tax: q.taxName, from: d(q.checkIn, locale), to: d(q.checkOut, locale) })))}
          ${guideHtml}
          ${button(t("email.viewOnline"), `${site.baseUrl}/p/${p.id}?lang=${locale}`)}
          ${para(`${escape(t("email.seeYou"))}<br><strong style="color:#f1f2f4">${escape(issuer.name)}</strong>`, "margin-top:24px")}`,
        note: t("email.sentOnBehalf", { company: site.company, host: issuer.name }),
      }),
      attachments: [{ filename: `receipt-${p.receiptNumber}.pdf`, content: pdf }],
    });
    if (issuer.email) {
      const hostTotal = money(q.totalCents, q.currency, hostLocale);
      await send({
        from,
        to: issuer.email,
        subject: th("email.hostSubject", { amount: hostTotal, name: p.guestName || p.guestEmail, date: d(q.checkIn, hostLocale) }),
        html: renderEmail({
          lang: hostLocale,
          eyebrow: th("email.eyebrowPaid"),
          title: th("email.hostSubject", { amount: hostTotal, name: p.guestName || p.guestEmail, date: d(q.checkIn, hostLocale) }),
          preheader: th(q.manual ? "email.hostBodyQuick" : "email.hostBody", { name: p.guestName || p.guestEmail, amount: hostTotal, tax: quoteTitle(q, th), property: p.propertyName ?? "", from: d(q.checkIn, hostLocale), to: d(q.checkOut, hostLocale), nights: th.plural("line.nights", q.nights) }),
          body: `${bigAmount(hostTotal, p.receiptNumber ? th("email.eyebrowReceipt", { number: p.receiptNumber }) : undefined)}
            ${para(escape(
              q.manual
                ? th("email.hostBodyQuick", { name: p.guestName || p.guestEmail, amount: hostTotal, tax: quoteTitle(q, th) })
                : th("email.hostBody", { name: p.guestName, amount: hostTotal, property: p.propertyName ?? "", from: d(q.checkIn, hostLocale), to: d(q.checkOut, hostLocale), nights: th.plural("line.nights", q.nights) }),
            ) + (p.bookingRef ? `<br>${escape(th("receipt.bookingRef", { ref: p.bookingRef }))}` : ""))}
            ${button(th("email.openDashboard"), `${site.baseUrl}/host`)}`,
        }),
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
      html: renderEmail({
        lang: t.locale,
        eyebrow: t("email.eyebrowSecurity"),
        title: t("reset.title"),
        preheader: t("email.resetBody", { brand: site.name }),
        body: `${para(escape(t("email.hi", { name: to.name.split(/\s+/)[0] || "" })))}
          ${para(escape(t("email.resetBody", { brand: site.name })))}
          ${button(t("reset.title"), link)}
          ${small(escape(t("email.resetIgnore")))}`,
      }),
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
      html: renderEmail({
        lang: t.locale,
        eyebrow: t("email.eyebrowReported"),
        title: t(onArrival ? "email.reportedCashSubject" : "email.reportedSubject", { name, amount }),
        preheader: t(onArrival ? "email.reportedCashBody" : "email.reportedBody", { name, amount, method, ref: paymentReference(p) }),
        body: `${bigAmount(amount, method || undefined)}
          ${para(escape(t(onArrival ? "email.reportedCashBody" : "email.reportedBody", { name, amount, method, ref: paymentReference(p) })))}
          ${button(t("email.openDashboard"), `${site.baseUrl}/host`)}`,
      }),
    });
  } catch (err) {
    console.error(`[email] reported-payment notice failed for ${p.id}`, err);
  }
}


/** First sign-up: a welcome with the three steps to the first payment link. */
export async function sendWelcomeEmail(to: { email: string; name: string; locale?: string }) {
  const from = process.env.EMAIL_FROM;
  if (!process.env.RESEND_API_KEY || !from) {
    console.log(`[email] welcome for ${to.email} skipped (RESEND_API_KEY / EMAIL_FROM not set)`);
    return;
  }
  const { t } = await getI18n(to.locale ?? "en");
  const first = to.name.split(/\s+/)[0] || to.name;
  try {
    await send({
      from,
      to: to.email,
      reply_to: site.supportEmail,
      subject: t("email.welcomeSubject", { brand: site.name, name: first }),
      html: renderEmail({
        lang: t.locale,
        eyebrow: t("email.welcomeEyebrow"),
        title: t("email.welcomeTitle", { name: first }),
        preheader: t("email.welcomeIntro"),
        body: `${para(escape(t("email.welcomeIntro")))}
          ${steps([
            { title: t("email.welcomeStep1Title"), body: t("email.welcomeStep1") },
            { title: t("email.welcomeStep2Title"), body: t("email.welcomeStep2") },
            { title: t("email.welcomeStep3Title"), body: t("email.welcomeStep3") },
          ])}
          ${button(t("email.welcomeCta"), `${site.baseUrl}/host`)}
          ${small(escape(t("email.welcomeHelp", { email: site.supportEmail })))}`,
      }),
    });
  } catch (err) {
    console.error(`[email] welcome for ${to.email} failed`, err);
  }
}
