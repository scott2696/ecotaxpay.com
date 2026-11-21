import { promises as fs } from "node:fs";
import path from "node:path";
import { currentHost } from "@/lib/auth";
import { getPayment, UPLOAD_DIR } from "@/lib/store";

// Host-only (protected by middleware): view a guest's uploaded document.
export async function GET(_req: Request, { params }: { params: Promise<{ paymentId: string; docId: string }> }) {
  const host = await currentHost();
  if (!host) return new Response("Please log in", { status: 401 });
  const { paymentId, docId } = await params;
  const payment = await getPayment(paymentId);
  if (!payment || payment.hostId !== host.id) return new Response("Not found", { status: 404 });
  const doc = payment.documents?.find((d) => d.id === docId);
  if (!doc) return new Response("Not found", { status: 404 });
  const bytes = await fs.readFile(path.join(UPLOAD_DIR, paymentId, doc.storedAs)).catch(() => null);
  if (!bytes) return new Response("File missing", { status: 404 });
  return new Response(new Uint8Array(bytes), {
    headers: {
      "Content-Type": doc.mimeType,
      "Content-Disposition": `inline; filename="${doc.fileName.replace(/[^\w.\- ]/g, "_")}"`,
      "Cache-Control": "private, no-store",
      "X-Content-Type-Options": "nosniff",
    },
  });
}
