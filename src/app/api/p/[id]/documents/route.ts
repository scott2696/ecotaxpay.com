import { NextResponse } from "next/server";
import { getI18n } from "@/i18n/server";
import path from "node:path";
import { addDocument, getPayment, getProperty, newDocId, removeDocument, linkCancelled } from "@/lib/store";

const MAX_BYTES = 10 * 1024 * 1024;
const MAX_DOCS = 12;
const TYPES: Record<string, string> = {
  "image/jpeg": ".jpg",
  "image/png": ".png",
  "image/webp": ".webp",
  "image/heic": ".heic",
  "image/heif": ".heif",
  "application/pdf": ".pdf",
};

async function allowed(id: string) {
  const p = await getPayment(id);
  if (!p || p.status === "refunded" || linkCancelled(p)) return null;
  const prop = p.propertyId ? await getProperty(p.propertyId) : null;
  return prop && prop.documents !== "off" ? p : null;
}

const list = (docs: { id: string; fileName: string; size: number }[] = []) =>
  docs.map(({ id, fileName, size }) => ({ id, fileName, size })); // never expose storage paths

// Guest uploads a passport / ID photo or PDF.
export async function POST(req: Request, { params }: { params: Promise<{ id: string }> }) {
  const { t } = await getI18n();
  const { id } = await params;
  if (!(await allowed(id))) return NextResponse.json({ error: t("err.uploadsOff") }, { status: 404 });
  // Documents are collected together with the payment, before paying, never afterwards.
  if ((await getPayment(id))?.status !== "pending") return NextResponse.json({ error: t("err.docsLocked") }, { status: 400 });

  const form = await req.formData().catch(() => null);
  const file = form?.get("file");
  if (!(file instanceof File)) return NextResponse.json({ error: t("err.noFile") }, { status: 400 });
  const ext = TYPES[file.type];
  if (!ext) return NextResponse.json({ error: t("err.fileType") }, { status: 400 });
  if (file.size > MAX_BYTES) return NextResponse.json({ error: t("err.fileSize") }, { status: 400 });

  const docId = newDocId();
  try {
    const docs = await addDocument(
      id,
      {
        id: docId,
        fileName: path.basename(file.name).slice(0, 120) || `document${ext}`,
        storedAs: `${docId}${ext}`,
        mimeType: file.type,
        size: file.size,
        uploadedAt: new Date().toISOString(),
      },
      Buffer.from(await file.arrayBuffer()),
      MAX_DOCS,
    );
    return NextResponse.json({ documents: list(docs ?? []) });
  } catch (e) {
    return NextResponse.json({ error: e instanceof Error && e.message === "LIMIT" ? t("err.fileLimit", { max: MAX_DOCS }) : t("docs.uploadFailed") }, { status: 400 });
  }
}

// Guest removes a file they uploaded by mistake (only before paying).
export async function DELETE(req: Request, { params }: { params: Promise<{ id: string }> }) {
  const { t } = await getI18n();
  const { id } = await params;
  const p = await allowed(id);
  if (!p) return NextResponse.json({ error: t("err.notFound") }, { status: 404 });
  if (p.status !== "pending") return NextResponse.json({ error: t("err.docsLocked") }, { status: 400 });
  const docs = await removeDocument(id, new URL(req.url).searchParams.get("doc") ?? "");
  return NextResponse.json({ documents: list(docs ?? p.documents) });
}
