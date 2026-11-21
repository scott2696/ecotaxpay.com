import { formatMoney } from "./calc";
import { site } from "./config";
import { updatePayment, type PaymentRecord } from "./store";

/** Digits only, international format without "+" (what WhatsApp expects). Returns null if implausible. */
export function normalizePhone(raw: string): string | null {
  const s = raw.trim();
  if (!s) return null;
  let digits = s.replace(/[^\d]/g, "");
  if (s.startsWith("00")) digits = digits.slice(2);
  return digits.length >= 8 && digits.length <= 15 ? digits : null;
}

export const whatsappConfigured = () => !!(process.env.WHATSAPP_TOKEN && process.env.WHATSAPP_PHONE_NUMBER_ID);

/**
 * Sends the receipt via the WhatsApp Business Cloud API (Meta).
 * Requires an approved message template (default name "payment_receipt") with:
 *   header: DOCUMENT, body: "Hello {{1}}, thank you for paying {{2}}. Receipt no. {{3}} is attached."
 * No-op when WhatsApp isn't configured or the guest gave no number.
 */
export async function sendWhatsAppReceipt(p: PaymentRecord) {
  if (!whatsappConfigured() || !p.guestPhone) return;
  const template = process.env.WHATSAPP_RECEIPT_TEMPLATE || "payment_receipt";
  const lang = process.env.WHATSAPP_TEMPLATE_LANG || "en";
  try {
    const res = await fetch(`https://graph.facebook.com/v21.0/${process.env.WHATSAPP_PHONE_NUMBER_ID}/messages`, {
      method: "POST",
      headers: { Authorization: `Bearer ${process.env.WHATSAPP_TOKEN}`, "Content-Type": "application/json" },
      body: JSON.stringify({
        messaging_product: "whatsapp",
        to: p.guestPhone,
        type: "template",
        template: {
          name: template,
          language: { code: lang },
          components: [
            {
              type: "header",
              parameters: [
                {
                  type: "document",
                  document: { link: `${site.baseUrl}/api/receipt/${p.id}`, filename: `receipt-${p.receiptNumber}.pdf` },
                },
              ],
            },
            {
              type: "body",
              parameters: [
                { type: "text", text: p.guestName.split(/\s+/)[0] || "👋" }, // WhatsApp rejects empty parameters (quick links may have no name)
                { type: "text", text: formatMoney(p.quote.totalCents, p.quote.currency) },
                { type: "text", text: p.receiptNumber ?? "" },
              ],
            },
          ],
        },
      }),
    });
    if (!res.ok) throw new Error(`WhatsApp ${res.status}: ${await res.text()}`);
    await updatePayment(p.id, { whatsappSentAt: new Date().toISOString() });
  } catch (err) {
    console.error(`[whatsapp] failed for ${p.id}`, err);
  }
}
