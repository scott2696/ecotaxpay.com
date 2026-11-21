import { getLocale } from "@/i18n/server";
import { renderReceipt } from "@/lib/receipt";
import { getPayment } from "@/lib/store";

// Payment IDs are 16 random chars (~80 bits) and act as the access token.
export async function GET(_req: Request, { params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const p = await getPayment(id);
  if (!p || !p.receiptNumber) return new Response("Receipt not found", { status: 404 });
  // The guest's language (saved at payment), otherwise the language of whoever is opening it.
  const pdf = await renderReceipt(p, await getLocale());
  return new Response(Buffer.from(pdf), {
    headers: {
      "Content-Type": "application/pdf",
      "Content-Disposition": `inline; filename="receipt-${p.receiptNumber}.pdf"`,
    },
  });
}
