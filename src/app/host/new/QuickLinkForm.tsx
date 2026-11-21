"use client";

import { useEffect, useState } from "react";
import { useT } from "@/i18n/client";
import { money } from "@/i18n/translate";
import { capFirst, QUICK_CURRENCIES, QUICK_MIN_CENTS } from "@/lib/quick";
import SendPanel, { type GuestTemplates } from "../SendPanel";

/** Quick link: the host types the amount and gets a payment link. Nothing else is required. */
export default function QuickLinkForm({ templates, defaultCurrency }: { templates: GuestTemplates; defaultCurrency: string }) {
  const t = useT();
  const [amount, setAmount] = useState("");
  const [currency, setCurrency] = useState(defaultCurrency);
  const [description, setDescription] = useState("");
  const [guestName, setGuestName] = useState("");
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [created, setCreated] = useState<{ url: string } | null>(null);

  // Most hosts charge in the same currency every time.
  useEffect(() => {
    try {
      const last = localStorage.getItem("etp:quickCurrency");
      if (last && (QUICK_CURRENCIES as readonly string[]).includes(last)) setCurrency(last);
    } catch {}
  }, []);

  const cents = Math.round(Number(amount.replace(",", ".")) * 100);
  const valid = Number.isFinite(cents) && cents >= QUICK_MIN_CENTS;
  const symbol =
    new Intl.NumberFormat("en-GB", { style: "currency", currency, currencyDisplay: "narrowSymbol" }).formatToParts(0).find((p) => p.type === "currency")?.value ?? currency;

  async function create(e: React.FormEvent) {
    e.preventDefault();
    setSubmitting(true);
    setError(null);
    try {
      const res = await fetch("/api/host/requests", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ quick: true, amount, currency, description, guestName }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error);
      try {
        localStorage.setItem("etp:quickCurrency", currency);
      } catch {}
      setCreated({ url: `${window.location.origin}${data.path}` });
      window.scrollTo({ top: 0, behavior: "smooth" });
    } catch (err) {
      setError(err instanceof Error ? err.message : t("common.error"));
    } finally {
      setSubmitting(false);
    }
  }

  if (created) {
    return (
      <div className="max-w-2xl">
        <SendPanel
          url={created.url}
          guestName={guestName}
          amount={money(cents, currency, t.locale)}
          taxName={description || ""}
          checkIn=""
          checkOut=""
          propertyName=""
          templates={templates}
          quick
        />
        <div className="mt-4 flex gap-3">
          <button
            type="button"
            onClick={() => {
              setCreated(null);
              setAmount("");
              setDescription("");
              setGuestName("");
            }}
            className="rounded-lg bg-[var(--accent)] px-4 py-2.5 text-sm font-semibold text-[var(--on-accent)]"
          >
            + {t("form.another")}
          </button>
          <a href="/host" className="rounded-lg border border-[var(--line)] bg-[var(--surface)] px-4 py-2.5 text-sm font-medium">
            {t("form.backToDashboard")}
          </a>
        </div>
      </div>
    );
  }

  return (
    <form onSubmit={create} className="max-w-xl rounded-2xl border border-[var(--line)] bg-[var(--surface)] p-6 shadow-sm">
      <p className="text-sm text-[var(--muted)]">{t("quick.intro")}</p>

      <div className="mt-5 grid grid-cols-[minmax(0,1fr)_auto] gap-3">
        <label className="block">
          <span className="mb-1.5 block text-sm font-medium">{t("quick.amount")}</span>
          <div className="relative">
            <span className="pointer-events-none absolute start-3 top-1/2 -translate-y-1/2 text-[var(--muted)]">{symbol}</span>
            <input
              type="number"
              inputMode="decimal"
              min="0.5"
              step="0.01"
              className={`input text-lg tabular-nums ${symbol.length > 1 ? "ps-12" : "ps-7"}`}
              placeholder="18.00"
              value={amount}
              onChange={(e) => setAmount(e.target.value)}
              autoFocus
              required
            />
          </div>
        </label>
        <label className="block">
          <span className="mb-1.5 block text-sm font-medium">{t("quick.currency")}</span>
          <select className="input w-auto" value={currency} onChange={(e) => setCurrency(e.target.value)}>
            {QUICK_CURRENCIES.map((c) => (
              <option key={c} value={c}>{c}</option>
            ))}
          </select>
        </label>
      </div>

      <label className="mt-4 block">
        <span className="mb-1.5 block text-sm font-medium">{t("quick.description")}</span>
        <input className="input" maxLength={80} value={description} onChange={(e) => setDescription(e.target.value)} placeholder={capFirst(t("quick.defaultTax"))} />
        <span className="mt-1 block text-xs text-[var(--muted)]">{t("quick.descriptionHint")}</span>
      </label>

      <label className="mt-4 block">
        <span className="mb-1.5 block text-sm font-medium">{t("quick.guestName")}</span>
        <input className="input" maxLength={120} value={guestName} onChange={(e) => setGuestName(e.target.value)} />
      </label>

      {error && <p className="mt-4 rounded-lg bg-red-500/10 p-3 text-sm text-red-300">{error}</p>}
      <button
        type="submit"
        disabled={!valid || submitting}
        className="mt-6 w-full rounded-xl bg-[var(--accent)] px-4 py-3.5 font-semibold text-[var(--on-accent)] transition hover:brightness-110 disabled:cursor-not-allowed disabled:opacity-50"
      >
        {submitting ? t("form.creating") : valid ? t("quick.create", { amount: money(cents, currency, t.locale) }) : t("quick.createEmpty")}
      </button>
    </form>
  );
}
