import { getLocale } from "@/i18n/server";
import { renderReceipt } from "@/lib/receipt";
import { getPayment } from "@/lib/store";

// Credit note for a refunded / cancelled payment (same access rule as the receipt: the payment ID).
export async function GET(_req: Request, { params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const p = await getPayment(id);
  if (!p || !p.creditNoteNumber) return new Response("Credit note not found", { status: 404 });
  const pdf = await renderReceipt(p, await getLocale(), "credit");
  return new Response(Buffer.from(pdf), {
    headers: { "Content-Type": "application/pdf", "Content-Disposition": `inline; filename="credit-note-${p.creditNoteNumber}.pdf"` },
  });
}
