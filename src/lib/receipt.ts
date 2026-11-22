import fontkit from "@pdf-lib/fontkit";
import { readFileSync } from "node:fs";
import path from "node:path";
import { PDFDocument, rgb, type PDFFont } from "pdf-lib";
import { getI18n } from "@/i18n/server";
import { date, money } from "@/i18n/translate";
import { describeLine, guestNotes } from "./format";
import { issuerFor, type PaymentRecord } from "./store";
import { capFirst, quoteTitle } from "./quick";

// Noto Sans covers Latin (incl. Maltese ċ ġ ħ ż), Greek and Cyrillic. Other scripts fall back to English.
const FONT_DIR = path.join(process.cwd(), "assets", "fonts");
const PDF_SCRIPTS = /^(en|es|it|fr|de|mt|pt|nl|ca|da|sv|no|nb|fi|et|lv|lt|pl|cs|sk|sl|hr|bs|sr|hu|ro|sq|tr|el|ru|uk|bg|vi|id|ms|af|ga|cy)(-|$)/;

export async function renderReceipt(p: PaymentRecord, requestedLocale?: string): Promise<Uint8Array> {
  const wanted = p.locale ?? requestedLocale ?? "en";
  const { t, locale } = await getI18n(PDF_SCRIPTS.test(wanted) ? wanted : "en");
  const q = p.quote;
  const issuer = await issuerFor(p);
  // A currency symbol the font can't draw (e.g. ฿) would print as an empty box: use the code then ("THB 300.00").
  const glyphs = fontkit.create(readFileSync(path.join(FONT_DIR, "NotoSans-Regular.ttf"))) as unknown as { hasGlyphForCodePoint(cp: number): boolean };
  const printable = (s: string) => [...s].every((ch) => /\s/.test(ch) || glyphs.hasGlyphForCodePoint(ch.codePointAt(0)!));
  const m = (n: number) => {
    const s = money(n, q.currency, locale);
    if (printable(s)) return s;
    return new Intl.NumberFormat(locale, { style: "currency", currency: q.currency, currencyDisplay: "code" }).format(n / 100);
  };
  const d = (iso: string) => date(iso, locale, { day: "numeric", month: "long", year: "numeric" });

  const doc = await PDFDocument.create();
  doc.registerFontkit(fontkit);
  const font = await doc.embedFont(readFileSync(path.join(FONT_DIR, "NotoSans-Regular.ttf")), { subset: true });
  const bold = await doc.embedFont(readFileSync(path.join(FONT_DIR, "NotoSans-Bold.ttf")), { subset: true });
  const page = doc.addPage([595, 842]); // A4
  const ink = rgb(0.1, 0.12, 0.15);
  const muted = rgb(0.42, 0.45, 0.5);
  const accent = rgb(0.06, 0.42, 0.33);
  let y = 780;

  const clean = (s: string) => s.replace(/★/g, "*");
  const text = (s: string, x: number, size = 10, f: PDFFont = font, color = ink) => page.drawText(clean(s), { x, y, size, font: f, color });
  const right = (s: string, xRight: number, size = 10, f: PDFFont = font, color = ink) =>
    page.drawText(clean(s), { x: xRight - f.widthOfTextAtSize(clean(s), size), y, size, font: f, color });
  const rule = () => page.drawLine({ start: { x: 50, y }, end: { x: 545, y }, thickness: 0.6, color: rgb(0.85, 0.86, 0.88) });
  const wrap = (s: string, size: number, width: number) => {
    const lines: string[] = [];
    let cur = "";
    for (const word of clean(s).split(" ")) {
      const next = cur ? `${cur} ${word}` : word;
      if (font.widthOfTextAtSize(next, size) > width && cur) {
        lines.push(cur);
        cur = word;
      } else cur = next;
    }
    if (cur) lines.push(cur);
    return lines;
  };

  const title = capFirst(quoteTitle(q, t));
  text(title.replace(/\s*\(.*\)\s*$/, ""), 50, 11, bold, accent);
  right(t("receipt.title"), 545, 20, bold);
  y -= 22;
  right(t("receipt.no", { number: p.receiptNumber ?? "-" }), 545, 10, font, muted);
  y -= 14;
  right(t("receipt.paid", { date: d(p.paidAt ?? p.createdAt) }), 545, 10, font, muted);

  y -= 40;
  text(t("receipt.issuedBy"), 50, 9, bold, muted);
  text(t("receipt.guest"), 320, 9, bold, muted);
  y -= 14;
  text(issuer.name, 50);
  text(p.guestName || p.guestEmail, 320); // quick links may have no name
  y -= 14;
  if (issuer.taxId) text(t("receipt.taxId", { id: issuer.taxId }), 50);
  if (p.guestName) text(p.guestEmail, 320);
  if (p.bookingRef) {
    y -= 14;
    text(t("receipt.bookingRef", { ref: p.bookingRef }), 320);
  }

  y -= 36;
  text(title, 50, 13, bold);
  y -= 16;
  if (!q.manual) text(`${q.regionName}, ${q.countryName}`, 50, 10, font, muted);
  y -= 26;
  const guests = [t.plural("guest.adults", q.adults), q.childAges.length ? `${t.plural("guest.children", q.childAges.length)} (${q.childAges.join(", ")})` : ""].filter(Boolean).join(", ");
  const stay: [string, string][] = q.manual ? [] : [
    ...(p.propertyName ? [[t("receipt.property"), p.propertyName] as [string, string]] : []),
    [t("receipt.accommodation"), t.raw(`a:${q.accommodationLabel}`)],
    [t("receipt.checkIn"), d(q.checkIn)],
    [t("receipt.checkOut"), d(q.checkOut)],
    [t("receipt.nights"), String(q.nights)],
    [t("receipt.guests"), guests],
  ];
  for (const [k, v] of stay) {
    text(k, 50, 10, font, muted);
    text(v, 170);
    y -= 15;
  }

  y -= 16;
  rule();
  y -= 18;
  text(t("receipt.description"), 50, 9, bold, muted);
  right(t("receipt.amount"), 545, 9, bold, muted);
  y -= 8;
  rule();
  if (q.manual) {
    y -= 18;
    text(title, 50);
    right(m(q.taxCents), 545);
  }
  for (const l of q.lines) {
    y -= 18;
    text(describeLine(l, q.currency, t), 50);
    right(m(l.amountCents), 545);
  }
  if (q.feeCents > 0) {
    y -= 18;
    text(t("receipt.serviceFee"), 50);
    right(m(q.feeCents), 545);
  }
  y -= 12;
  rule();
  y -= 22;
  text(t("receipt.total"), 50, 12, bold);
  right(m(q.totalCents), 545, 12, bold);
  if (q.feeCents > 0) {
    y -= 16;
    text(t("receipt.ofWhichTax", { amount: m(q.taxCents) }), 50, 9, font, muted);
  }

  y -= 40;
  for (const n of guestNotes(q, t)) {
    text(`* ${n}`, 50, 8, font, muted);
    y -= 12;
  }

  y = 70;
  for (const line of wrap(t("receipt.footer", { name: issuer.name }), 7.5, 495)) {
    text(line, 50, 7.5, font, muted);
    y -= 10;
  }
  return doc.save();
}
