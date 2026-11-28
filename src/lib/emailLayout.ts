// One look for every email: the website's obsidian background, silver type and the polished
// silver button. Built with tables and inline styles so it holds up in Gmail, Outlook and Apple
// Mail; gradients are extras on top of solid fallback colours (Outlook shows the solid colour).
import { site } from "./config";

export const esc = (s: string) => s.replace(/[&<>"']/g, (c) => ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#39;" })[c]!);

const ASSETS = "https://ecotaxpay.com";
const C = {
  bg: "#050506",
  card: "#0d0e10",
  edge: "#1f2125",
  ink: "#f1f2f4",
  text: "#b4b7be",
  muted: "#7f838b",
  soft: "#16181b",
  link: "#e4e6ea",
};
const FONT = "-apple-system,BlinkMacSystemFont,'Segoe UI',Geist,Helvetica,Arial,sans-serif";

/** A paragraph of body text (already-escaped HTML allowed). */
export const para = (html: string, style = "") =>
  `<p style="margin:0 0 16px;font-size:15px;line-height:1.65;color:${C.text};${style}">${html}</p>`;

/** Small grey print. */
export const small = (html: string) => `<p style="margin:16px 0 0;font-size:13px;line-height:1.6;color:${C.muted}">${html}</p>`;

/** A big polished number, e.g. the amount paid. */
export const bigAmount = (amount: string, caption?: string) => `
  <table role="presentation" cellpadding="0" cellspacing="0" width="100%" style="margin:4px 0 24px">
    <tr><td style="padding:22px 24px;background:${C.soft};background-image:linear-gradient(180deg,#1b1d21,#111214);border:1px solid ${C.edge};border-radius:14px">
      ${caption ? `<div style="font-size:11px;letter-spacing:.16em;text-transform:uppercase;color:${C.muted};margin-bottom:6px">${esc(caption)}</div>` : ""}
      <div style="font-size:38px;line-height:1.1;font-weight:700;letter-spacing:-.02em;color:${C.ink}">${esc(amount)}</div>
    </td></tr></table>`;

/** Numbered steps (title + one line each). */
export const steps = (items: { title: string; body: string }[]) => `
  <table role="presentation" cellpadding="0" cellspacing="0" width="100%" style="margin:8px 0 24px">
    ${items
      .map(
        (s, i) => `<tr><td style="padding:0 0 12px">
      <table role="presentation" cellpadding="0" cellspacing="0" width="100%" style="background:${C.soft};border:1px solid ${C.edge};border-radius:12px">
        <tr><td width="44" valign="top" style="padding:16px 0 16px 16px">
          <div style="width:28px;height:28px;line-height:28px;text-align:center;border-radius:999px;background:#e4e6ea;background-image:linear-gradient(180deg,#ffffff,#c9ccd2);color:#0a0a0b;font-size:13px;font-weight:700">${i + 1}</div>
        </td><td valign="top" style="padding:16px 16px 16px 12px">
          <div style="font-size:15px;font-weight:600;color:${C.ink};margin-bottom:2px">${esc(s.title)}</div>
          <div style="font-size:14px;line-height:1.55;color:${C.text}">${esc(s.body)}</div>
        </td></tr></table></td></tr>`,
      )
      .join("")}
  </table>`;

/** A soft panel for extra details (e.g. arrival-guide items). `highlight` adds a silver edge. */
export const panel = (title: string, bodyHtml: string, highlight = false) => `
  <table role="presentation" cellpadding="0" cellspacing="0" width="100%" style="margin:0 0 12px">
    <tr><td style="padding:14px 16px;background:${C.soft};border:1px solid ${highlight ? "#5b5e65" : C.edge};border-radius:12px">
      <div style="font-size:14px;font-weight:600;color:${C.ink};margin-bottom:4px">${title}</div>
      <div style="font-size:14px;line-height:1.6;color:${C.text}">${bodyHtml}</div>
    </td></tr></table>`;

/** The polished silver button. */
export const button = (label: string, href: string) => `
  <table role="presentation" cellpadding="0" cellspacing="0" style="margin:8px 0 8px">
    <tr><td align="center" bgcolor="#e4e6ea" style="border-radius:999px;background:#e4e6ea;background-image:linear-gradient(180deg,#ffffff 0%,#dfe1e5 45%,#b8bbc2 100%);box-shadow:0 0 0 1px rgba(255,255,255,.35),0 8px 24px rgba(255,255,255,.08)">
      <a href="${esc(href)}" style="display:inline-block;padding:14px 30px;font-family:${FONT};font-size:15px;font-weight:700;color:#0a0a0b;text-decoration:none;border-radius:999px">${esc(label)}&nbsp;&rarr;</a>
    </td></tr></table>`;

/** A quiet text link in silver. */
export const link = (label: string, href: string) => `<a href="${esc(href)}" style="color:${C.link};text-decoration:underline;text-underline-offset:3px">${esc(label)}</a>`;

export type EmailOptions = {
  lang?: string;
  dir?: "ltr" | "rtl";
  /** Shown in the inbox list next to the subject. */
  preheader?: string;
  /** Small caps label above the title. */
  eyebrow?: string;
  title: string;
  /** Body HTML built with the helpers above. */
  body: string;
  /** Line above the company details, e.g. "Sent by EcoTaxPay on behalf of …". */
  note?: string;
};

export function renderEmail({ lang = "en", dir = "ltr", preheader = "", eyebrow, title, body, note }: EmailOptions) {
  const addr = site.companyAddress.split("\n").map(esc).join(", ");
  const sheen = `background:#2a2c31;background-image:linear-gradient(90deg,rgba(255,255,255,0) 0%,rgba(255,255,255,.55) 50%,rgba(255,255,255,0) 100%)`;
  return `<!doctype html>
<html lang="${esc(lang)}" dir="${dir}"><head><meta charset="utf-8"><meta name="viewport" content="width=device-width,initial-scale=1">
<meta name="color-scheme" content="dark"><meta name="supported-color-schemes" content="dark">
<title>${esc(title)}</title></head>
<body style="margin:0;padding:0;background:${C.bg}" bgcolor="${C.bg}">
<div style="display:none;max-height:0;overflow:hidden;opacity:0;color:${C.bg}">${esc(preheader)}&#8203;&nbsp;&#8203;&nbsp;&#8203;&nbsp;</div>
<table role="presentation" width="100%" cellpadding="0" cellspacing="0" bgcolor="${C.bg}" style="background:${C.bg};background-image:radial-gradient(ellipse at top,#17181c 0%,${C.bg} 60%)">
<tr><td align="center" style="padding:36px 14px 48px;font-family:${FONT}">
  <table role="presentation" width="100%" cellpadding="0" cellspacing="0" style="max-width:600px">
    <tr><td style="padding:0 4px 22px">
      <a href="${ASSETS}" style="text-decoration:none"><img src="${ASSETS}/email/badge.png" width="159" height="44" alt="${esc(site.name)}" style="display:block;border:0"></a>
    </td></tr>
    <tr><td style="background:${C.card};border:1px solid ${C.edge};border-radius:18px">
      <table role="presentation" width="100%" cellpadding="0" cellspacing="0">
        <tr><td style="height:1px;line-height:1px;font-size:0;${sheen};border-radius:18px 18px 0 0">&nbsp;</td></tr>
        <tr><td dir="${dir}" style="padding:34px 32px 32px">
          ${eyebrow ? `<div style="font-size:11px;letter-spacing:.18em;text-transform:uppercase;color:${C.muted};margin:0 0 10px">${esc(eyebrow)}</div>` : ""}
          <h1 style="margin:0 0 18px;font-size:26px;line-height:1.25;font-weight:700;letter-spacing:-.02em;color:${C.ink}">${esc(title)}</h1>
          ${body}
        </td></tr>
      </table>
    </td></tr>
    <tr><td style="padding:26px 6px 0">
      <table role="presentation" cellpadding="0" cellspacing="0" style="font-size:12px;line-height:1.6;color:${C.muted}">
        <tr><td valign="top" style="padding-right:12px"><img src="${ASSETS}/logo.png" width="32" height="32" alt="" style="display:block;border-radius:8px;border:0"></td>
        <td valign="top">
          ${note ? `<div style="margin-bottom:4px;color:${C.text}">${esc(note)}</div>` : ""}
          <strong style="color:${C.ink}">${esc(site.company)}</strong> · ${addr}<br>
          <a href="mailto:${site.supportEmail}" style="color:${C.muted}">${site.supportEmail}</a> · <a href="${ASSETS}" style="color:${C.muted}">ecotaxpay.com</a>
        </td></tr>
      </table>
    </td></tr>
  </table>
</td></tr></table>
</body></html>`;
}
