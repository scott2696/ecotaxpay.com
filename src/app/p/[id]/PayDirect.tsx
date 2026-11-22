"use client";

import { useState } from "react";
import { useT } from "@/i18n/client";
import PayBadges, { MethodLogo, type CardBrand } from "@/components/PayBadges";
import { paysOnArrival } from "@/lib/payMethods";
import type { PayMethodId } from "@/lib/store";
import DocumentUpload, { type DocItem, type DocumentAsk } from "./DocumentUpload";

export type MethodView = {
  id: PayMethodId;
  title: string;
  icon: string;
  rows: { label: string; value: string; mono?: boolean }[];
  url?: string;
  brands?: CardBrand[];
};

/**
 * The guest pays the host directly with one of the host's methods, then taps "I've paid".
 * Nothing is charged by this site; the host confirms the money arrived and the receipt follows.
 */
export default function PayDirect({
  id,
  amount,
  reference,
  methods,
  note,
  initialEmail,
  initialPhone,
  askName,
  documents,
}: {
  id: string;
  amount: string;
  reference: string;
  methods: MethodView[];
  note?: string;
  initialEmail: string;
  /** The link was sent without a name (e.g. from a Booking.com / Airbnb booking): ask the guest. */
  askName?: boolean;
  initialPhone: string;
  documents: { setting: "optional" | "required"; ask: DocumentAsk; uploaded: DocItem[] } | null;
}) {
  const t = useT();
  const [method, setMethod] = useState(methods.length === 1 ? methods[0].id : "");
  const [email, setEmail] = useState(initialEmail);
  const [name, setName] = useState("");
  const [phone, setPhone] = useState(initialPhone);
  const [docCount, setDocCount] = useState(documents?.uploaded.length ?? 0);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const docsMissing = documents?.setting === "required" && docCount === 0;
  const chosen = methods.find((m) => m.id === method);

  async function report(e: React.FormEvent) {
    e.preventDefault();
    if (!method) return setError(t("pay.chooseMethod"));
    setBusy(true);
    setError(null);
    try {
      const res = await fetch(`/api/p/${id}/reported`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ method, email, phone, locale: t.locale, ...(askName ? { name } : {}) }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error);
      window.location.reload();
    } catch (err) {
      setError(err instanceof Error ? err.message : t("common.error"));
      setBusy(false);
    }
  }

  return (
    <form onSubmit={report} className="space-y-6">
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
        <div className="text-sm font-medium">{t("pay.howToPay", { amount })}</div>
        <p className="mt-1 text-xs text-[var(--muted)]">{t("pay.directHint")}</p>

        <div className="mt-4 space-y-2">
          {methods.map((m) => (
            <label
              key={m.id}
              className={`block cursor-pointer rounded-xl border p-4 transition ${method === m.id ? "border-[var(--accent)] bg-[var(--soft)]" : "border-[var(--line)] hover:bg-[var(--bg)]"}`}
            >
              <span className="flex items-center gap-3">
                <input type="radio" name="method" value={m.id} checked={method === m.id} onChange={() => setMethod(m.id)} className="accent-[var(--accent)]" />
                <MethodLogo id={m.id} />
                <span className="font-medium">{m.title}</span>
                {m.brands && <PayBadges brands={m.brands} className="ms-auto" />}
              </span>
              {method === m.id && (
                <span className="mt-3 block space-y-2">
                  {m.rows.map((r) => (
                    <CopyRow key={r.label} {...r} />
                  ))}
                  {!paysOnArrival(m.id) && <CopyRow label={t("pay.reference")} value={reference} mono />}
                  {m.url && (
                    <a href={m.url} target="_blank" rel="noreferrer noopener" className="mt-1 block rounded-xl bg-[var(--accent)] px-4 py-3 text-center text-sm font-semibold text-[var(--on-accent)] hover:brightness-110">
                      {t("pay.openApp", { method: m.title, amount })} ↗
                    </a>
                  )}
                </span>
              )}
            </label>
          ))}
        </div>
        {note && <p className="mt-4 whitespace-pre-line rounded-xl bg-[var(--bg)] p-3 text-sm text-[var(--muted)]">{note}</p>}
      </div>

      <div className="rounded-2xl border border-[var(--line)] bg-[var(--surface)] p-6 shadow-sm">
        <div className="mb-3 text-sm font-medium">{t("pay.receiptWhere")}</div>
        <div className="grid grid-cols-1 gap-3">
          {askName && (
            <label className="block">
              <span className="mb-1.5 block text-sm">{t("pay.fullName")}</span>
              <input className="input" value={name} onChange={(e) => setName(e.target.value)} autoComplete="name" placeholder={t("pay.fullNamePh")} maxLength={120} required />
            </label>
          )}
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
          {busy ? t("pay.sending") : docsMissing ? t("pay.uploadFirst") : chosen?.id === "cash" ? t("pay.willPayCash") : chosen?.id === "cardOnArrival" ? t("pay.willPayCardOnArrival") : t("pay.iHavePaid", { amount })}
        </button>
        <p className="mt-3 text-center text-xs text-[var(--muted)]">{t("pay.directFooter")}</p>
      </div>
    </form>
  );
}

function CopyRow({ label, value, mono }: { label: string; value: string; mono?: boolean }) {
  const t = useT();
  const [copied, setCopied] = useState(false);
  return (
    <span className="flex items-center justify-between gap-3 rounded-lg bg-[var(--bg)] px-3 py-2 text-sm">
      <span className="min-w-0">
        <span className="block text-xs text-[var(--muted)]">{label}</span>
        <span className={`block break-all ${mono ? "font-mono" : ""}`}>{value}</span>
      </span>
      <button
        type="button"
        onClick={(e) => {
          e.preventDefault();
          navigator.clipboard?.writeText(value.replace(/\s/g, label === "IBAN" ? "" : " ")).then(() => {
            setCopied(true);
            setTimeout(() => setCopied(false), 1500);
          });
        }}
        className="shrink-0 rounded-md border border-[var(--line)] px-2 py-1 text-xs hover:bg-[var(--surface)]"
      >
        {copied ? "✓" : t("pay.copy")}
      </button>
    </span>
  );
}
