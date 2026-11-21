"use client";

import { useRef, useState } from "react";
import { useT } from "@/i18n/client";

export type DocItem = { id: string; fileName: string; size: number };
export type DocumentAsk = { instruction: string; items: string[] };

const kb = (n: number) => (n > 1024 * 1024 ? `${(n / 1024 / 1024).toFixed(1)} MB` : `${Math.max(1, Math.round(n / 1024))} KB`);

/** Guest uploads passport / ID photos or PDFs. Files go straight to the host; the guest can't view them back. */
export default function DocumentUpload({
  paymentId,
  required,
  ask,
  initial,
  canDelete,
  onChange,
}: {
  paymentId: string;
  required: boolean;
  ask: DocumentAsk;
  initial: DocItem[];
  canDelete: boolean;
  onChange?: (docs: DocItem[]) => void;
}) {
  const t = useT();
  const [docs, setDocs] = useState(initial);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const input = useRef<HTMLInputElement>(null);

  const update = (d: DocItem[]) => {
    setDocs(d);
    onChange?.(d);
  };

  async function upload(files: FileList | null) {
    if (!files?.length) return;
    setBusy(true);
    setError(null);
    try {
      for (const file of Array.from(files)) {
        const body = new FormData();
        body.append("file", file);
        const res = await fetch(`/api/p/${paymentId}/documents`, { method: "POST", body });
        const data = await res.json();
        if (!res.ok) throw new Error(`${file.name}: ${data.error}`);
        update(data.documents);
      }
    } catch (e) {
      setError(e instanceof Error ? e.message : t("docs.uploadFailed"));
    } finally {
      setBusy(false);
      if (input.current) input.current.value = "";
    }
  }

  async function remove(docId: string) {
    const res = await fetch(`/api/p/${paymentId}/documents?doc=${docId}`, { method: "DELETE" });
    const data = await res.json();
    if (res.ok) update(data.documents);
    else setError(data.error);
  }

  return (
    <div>
      <div className="flex items-baseline justify-between gap-3">
        <div className="text-sm font-medium">
          {t("docs.title")} {required ? <span className="text-red-300">{t("common.required")}</span> : <span className="font-normal text-[var(--muted)]">{t("common.optional")}</span>}
        </div>
      </div>
      <p className="mt-1 text-sm">{ask.instruction}</p>
      {ask.items.length > 0 && (
        <ul className="mt-1 list-disc ps-5 text-sm">
          {ask.items.map((i) => <li key={i}>{i}</li>)}
        </ul>
      )}
      <p className="mt-2 text-xs text-[var(--muted)]">{t("docs.privacy")}</p>

      {docs.length > 0 && (
        <ul className="mt-3 space-y-2">
          {docs.map((d) => (
            <li key={d.id} className="flex items-center justify-between gap-3 rounded-lg bg-[var(--soft)] px-3 py-2 text-sm">
              <span className="truncate">📎 {d.fileName} <span className="text-[var(--muted)]">· {kb(d.size)}</span></span>
              {canDelete && (
                <button type="button" onClick={() => remove(d.id)} className="shrink-0 text-xs text-[var(--muted)] underline">
                  {t("common.remove")}
                </button>
              )}
            </li>
          ))}
        </ul>
      )}

      <label className={`mt-3 flex cursor-pointer items-center justify-center gap-2 rounded-lg border-2 border-dashed border-[var(--line)] px-4 py-4 text-sm font-medium hover:border-[var(--accent)] ${busy ? "opacity-60" : ""}`}>
        <input
          ref={input}
          type="file"
          className="sr-only"
          accept="image/jpeg,image/png,image/webp,image/heic,image/heif,application/pdf"
          multiple
          disabled={busy}
          onChange={(e) => upload(e.target.files)}
        />
        {busy ? t("docs.uploading") : docs.length ? t("docs.addAnother") : t("docs.choose")}
      </label>
      {error && <p className="mt-2 text-sm text-red-300">{error}</p>}
    </div>
  );
}
