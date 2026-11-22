"use client";

import Icon from "@/components/Icon";
import { useEffect, useRef, useState } from "react";
import { useT } from "@/i18n/client";
import PayBadges, { MethodLogo, type CardBrand } from "@/components/PayBadges";
import { paysOnArrival } from "@/lib/payMethods";
import type { PayMethodId } from "@/lib/store";
import DocumentUpload, { type DocItem, type DocumentAsk } from "./DocumentUpload";
import { apiFetch, errorText } from "@/lib/api";

export type MethodView = {
  id: PayMethodId;
  title: string;
  icon: string;
  rows: { label: string; value: string; mono?: boolean }[];
  url?: string;
  brands?: CardBrand[];
  note?: string; // plain instructions (not something to copy)
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
  const [folded, setFolded] = useState(false); // chosen method's details hidden (click its header again)
  const pick = (id: PayMethodId) => {
    if (id === method) setFolded((f) => !f);
    else {
      setMethod(id);
      setFolded(false);
    }
  };
  const [email, setEmail] = useState(initialEmail);
  const [name, setName] = useState("");
  const [phone, setPhone] = useState(initialPhone);
  const [docCount, setDocCount] = useState(documents?.uploaded.length ?? 0);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const docsMissing = documents?.setting === "required" && docCount === 0;
  const form = useRef<HTMLFormElement>(null);
  const back = useRef<HTMLDialogElement>(null);
  const emailInput = useRef<HTMLInputElement>(null);
  // Guests pay in another tab or app (Stripe, PayPal, their bank…) and often never come back to say so.
  // When they return after opening a payment button, or after being away a while, ask once.
  const away = useRef<{ since: number; clicked: boolean } | null>(null);
  useEffect(() => {
    const onVisibility = () => {
      if (document.visibilityState === "hidden") {
        if (method && !paysOnArrival(method as PayMethodId)) away.current = { since: Date.now(), clicked: away.current?.clicked ?? false };
      } else if (away.current) {
        const { since, clicked } = away.current;
        away.current = null;
        if ((clicked || Date.now() - since > 20_000) && !busy) back.current?.showModal();
      }
    };
    document.addEventListener("visibilitychange", onVisibility);
    return () => document.removeEventListener("visibilitychange", onVisibility);
  }, [method, busy]);
  const confirmBack = () => {
    back.current?.close();
    if (form.current?.checkValidity()) form.current.requestSubmit();
    else {
      emailInput.current?.scrollIntoView({ block: "center", behavior: "smooth" });
      setTimeout(() => emailInput.current?.focus(), 300);
      setError(t("pay.backNeedEmail"));
    }
  };
  const chosen = methods.find((m) => m.id === method);

  async function report(e: React.FormEvent) {
    e.preventDefault();
    if (!method) return setError(t("pay.chooseMethod"));
    setBusy(true);
    setError(null);
    try {
      const res = await apiFetch(`/api/p/${id}/reported`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ method, email, phone, locale: t.locale, ...(askName ? { name } : {}) }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error);
      window.location.reload();
    } catch (err) {
      setError(errorText(err, t));
      setBusy(false);
    }
  }

  return (
    <form ref={form} onSubmit={report} className="space-y-6">
      <dialog
        ref={back}
        onClick={(e) => e.target === back.current && back.current?.close()}
        className="dialog w-[min(26rem,calc(100vw-2rem))]"
      >
        <div className="p-6 text-center">
          <div className="mx-auto mb-3 flex h-12 w-12 items-center justify-center rounded-full bg-[var(--soft)] text-xl">✓</div>
          <h2 className="text-lg font-semibold">{t("pay.backTitle", { amount })}</h2>
          <p className="mt-2 text-sm text-[var(--muted)]">{t("pay.backText")}</p>
          <button type="button" onClick={confirmBack} className="btn btn-primary btn-lg mt-5 w-full">
            {t("pay.backYes")}
          </button>
          <button type="button" onClick={() => back.current?.close()} className="mt-2 w-full rounded-xl px-4 py-2.5 text-sm text-[var(--muted)] hover:bg-[var(--soft)]">
            {t("pay.backNotYet")}
          </button>
        </div>
      </dialog>
      {documents && (
        <div className="panel panel-pad">
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

      <div className="panel panel-pad">
        <div className="text-sm font-medium">{t("pay.howToPay", { amount })}</div>
        <p className="mt-1 text-xs text-[var(--muted)]">{t("pay.directHint")}</p>

        <div className="mt-4 space-y-2">
          {methods.map((m) => (
            <div
              key={m.id}
              className={`rounded-xl border p-4 transition ${method === m.id ? "border-[var(--accent)] bg-[var(--soft)]" : "border-[var(--line)] hover:bg-[var(--bg)]"}`}
            >
              <label className="flex cursor-pointer flex-wrap items-center gap-3">
                <input
                  type="radio"
                  name="method"
                  value={m.id}
                  checked={method === m.id}
                  onChange={() => {}}
                  onClick={() => pick(m.id)}
                  className="accent-[var(--accent)]"
                />
                <MethodLogo id={m.id} />
                <span className="min-w-0 flex-1 font-medium">{m.title}</span>
                {m.brands && <PayBadges brands={m.brands} className="max-sm:order-last max-sm:basis-full max-sm:ps-7" />}
                <Icon name="chevronDown" size={16} className={`text-[var(--muted)] transition-transform ${method === m.id && !folded ? "rotate-180" : ""}`} />
              </label>
              {method === m.id && !folded && (
                <span className="mt-3 block space-y-2">
                  {m.note && <span className="block text-sm text-[var(--muted)]">{m.note}</span>}
                  {m.rows.map((r) => (
                    <CopyRow key={r.label} {...r} />
                  ))}
                  {!paysOnArrival(m.id) && <CopyRow label={t("pay.reference")} value={reference} mono />}
                  {m.url && (
                    <a href={m.url} target="_blank" rel="noreferrer noopener" onClick={() => (away.current = { since: Date.now(), clicked: true })} className="btn btn-primary btn-lg mt-1 flex text-center">
                      {t("pay.openApp", { method: m.title, amount })} ↗
                    </a>
                  )}
                </span>
              )}
            </div>
          ))}
        </div>
        {note && <p className="mt-4 whitespace-pre-line rounded-xl bg-[var(--bg)] p-3 text-sm text-[var(--muted)]">{note}</p>}
      </div>

      <div className="panel panel-pad">
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
            <input ref={emailInput} type="email" className="input" value={email} onChange={(e) => setEmail(e.target.value)} autoComplete="email" placeholder={t("pay.emailPlaceholder")} required />
          </label>
          <label className="block">
            <span className="mb-1.5 block text-sm">
              {t("pay.whatsapp")} <span className="text-[var(--muted)]">{t("common.optional")}</span>
            </span>
            <input type="tel" className="input" value={phone} onChange={(e) => setPhone(e.target.value)} autoComplete="tel" placeholder="+44 7700 900123" />
            <span className="mt-1 block text-xs text-[var(--muted)]">{t("pay.whatsappHint")}</span>
          </label>
        </div>
        {error && <p className="note note-danger mt-4">{error}</p>}
        <button
          type="submit"
          disabled={busy || docsMissing}
          className="btn btn-primary btn-lg mt-5 w-full disabled:cursor-not-allowed"
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
