"use client";

import Icon from "@/components/Icon";
import { useEffect, useState } from "react";
import { useT } from "@/i18n/client";
import { money } from "@/i18n/translate";
import { capFirst, QUICK_CURRENCIES, QUICK_MIN_CENTS } from "@/lib/quick";
import { currencyDecimals } from "@/lib/currencies";
import CurrencySelect from "@/components/CurrencySelect";
import SendPanel, { type GuestTemplates } from "../SendPanel";
import { apiFetch, errorText } from "@/lib/api";

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

  const decimals = currencyDecimals(currency); // JPY 0, EUR 2…
  const cents = Math.round(Number(amount.replace(",", ".")) * 100);
  const valid = Number.isFinite(cents) && cents >= QUICK_MIN_CENTS;
  const symbol =
    new Intl.NumberFormat("en-GB", { style: "currency", currency, currencyDisplay: "narrowSymbol" }).formatToParts(0).find((p) => p.type === "currency")?.value ?? currency;

  async function create(e: React.FormEvent) {
    e.preventDefault();
    setSubmitting(true);
    setError(null);
    try {
      const res = await apiFetch("/api/host/requests", {
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
      setError(errorText(err, t));
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
            className="btn btn-primary"
          >
            <Icon name="plus" size={15} /> {t("form.another")}
          </button>
          <a href="/host" className="btn btn-secondary">
            {t("form.backToDashboard")}
          </a>
        </div>
      </div>
    );
  }

  return (
    <form onSubmit={create} className="panel panel-pad max-w-xl">
      <p className="text-sm text-[var(--muted)]">{t("quick.intro")}</p>

      <div className="mt-5 grid grid-cols-[minmax(0,1fr)_auto] gap-3">
        <label className="block">
          <span className="mb-1.5 block text-sm font-medium">{t("quick.amount")}</span>
          <div className="relative">
            <span className="pointer-events-none absolute start-3 top-1/2 -translate-y-1/2 text-[var(--muted)]">{symbol}</span>
            <input
              type="number"
              inputMode="decimal"
              min={decimals ? 1 / 10 ** decimals : 1}
              step={decimals ? 1 / 10 ** decimals : 1}
              className={`input text-lg tabular-nums ${symbol.length > 1 ? "ps-12" : "ps-7"}`}
              placeholder={decimals ? (18).toFixed(decimals) : "1800"}
              value={amount}
              onChange={(e) => setAmount(e.target.value)}
              autoFocus
              required
            />
          </div>
        </label>
        <label className="block">
          <span className="mb-1.5 block text-sm font-medium">{t("quick.currency")}</span>
          <CurrencySelect value={currency} onChange={setCurrency} className="input w-auto max-w-[14rem]" />
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

      {error && <p className="note note-danger mt-4">{error}</p>}
      <button
        type="submit"
        disabled={!valid || submitting}
        className="btn btn-primary btn-lg mt-6 w-full disabled:cursor-not-allowed"
      >
        {submitting ? t("form.creating") : valid ? t("quick.create", { amount: money(cents, currency, t.locale) }) : t("quick.createEmpty")}
      </button>
    </form>
  );
}
