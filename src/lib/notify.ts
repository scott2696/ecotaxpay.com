import { sendPaidEmails } from "./email";
import type { PaymentRecord } from "./store";
import { sendWhatsAppReceipt } from "./whatsapp";

/** Everything that happens once, right after a payment succeeds. */
export async function notifyPaid(p: PaymentRecord) {
  await Promise.all([sendPaidEmails(p), sendWhatsAppReceipt(p)]);
}
