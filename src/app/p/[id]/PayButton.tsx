"use client";

import { useState } from "react";
import { useT } from "@/i18n/client";
import DocumentUpload, { type DocItem, type DocumentAsk } from "./DocumentUpload";

/** Guest uploads ID (if the host asks), confirms where to receive the receipt, then pays. */
export default function PayButton({
  id,
  label,
  initialEmail,
  initialPhone,
  documents,
}: {
  id: string;
  label: string;
  initialEmail: string;
  initialPhone: string;
  documents: { setting: "optional" | "required"; ask: DocumentAsk; uploaded: DocItem[] } | null;
}) {
  const t = useT();
  const [email, setEmail] = useState(initialEmail);
  const [phone, setPhone] = useState(initialPhone);
  const [docCount, setDocCount] = useState(documents?.uploaded.length ?? 0);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const docsMissing = documents?.setting === "required" && docCount === 0;

  async function pay(e: React.FormEvent) {
    e.preventDefault();
    setBusy(true);
    setError(null);
    try {
      const res = await fetch("/api/checkout", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ id, email, phone, locale: t.locale }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error);
      window.location.href = data.url;
    } catch (err) {
      setError(err instanceof Error ? err.message : t("common.error"));
      setBusy(false);
    }
  }

  return (
    <form onSubmit={pay} className="space-y-6">
      {documents && (
        <div className="rounded-2xl border border-[var(--line)] bg-[var(--surface)] p-6 shadow-sm">
          <DocumentUpload
            paymentId={id}
            required={documents.setting === "required"}
            ask={documents.ask}
            initial={documents.uploaded}
            canDelete
            onChange={(d) => setDocCount(d.length)}
          />
        </div>
      )}

      <div className="rounded-2xl border border-[var(--line)] bg-[var(--surface)] p-6 shadow-sm">
        <div className="mb-3 text-sm font-medium">{t("pay.receiptWhere")}</div>
        <div className="grid grid-cols-1 gap-3">
          <label className="block">
            <span className="mb-1.5 block text-sm">{t("common.email")}</span>
            <input type="email" className="input" value={email} onChange={(e) => setEmail(e.target.value)} autoComplete="email" placeholder={t("pay.emailPlaceholder")} required />
          </label>
          <label className="block">
            <span className="mb-1.5 block text-sm">
              {t("pay.whatsapp")} <span className="text-[var(--muted)]">{t("common.optional")}</span>
            </span>
            <input type="tel" className="input" value={phone} onChange={(e) => setPhone(e.target.value)} autoComplete="tel" placeholder="+44 7700 900123" />
            <span className="mt-1 block text-xs text-[var(--muted)]">{t("pay.whatsappHint")}</span>
          </label>
        </div>
        {error && <p className="mt-4 rounded-lg bg-red-500/10 p-3 text-sm text-red-300">{error}</p>}
        <button
          type="submit"
          disabled={busy || docsMissing}
          className="mt-5 w-full rounded-xl bg-[var(--accent)] px-4 py-3.5 font-semibold text-[var(--on-accent)] transition hover:brightness-110 disabled:cursor-not-allowed disabled:opacity-50"
        >
          {busy ? t("pay.redirecting") : docsMissing ? t("pay.uploadFirst") : label}
        </button>
        <p className="mt-3 text-center text-xs text-[var(--muted)]">{t("pay.secure")}</p>
      </div>
    </form>
  );
}
