"use client";

import { useT } from "@/i18n/client";
import { CURRENCIES, type CustomTax } from "@/lib/custom";

export type CustomTaxForm = {
  countryName: string;
  placeName: string;
  taxName: string;
  currency: string;
  basis: "person_night" | "unit_night" | "percent";
  rate: string;
  percent: string;
  minTaxableAge: string;
  capType: "none" | "nights" | "amount";
  maxNights: string;
  capAmount: string;
};

export function toForm(t?: CustomTax): CustomTaxForm {
  return {
    countryName: t?.countryName ?? "",
    placeName: t?.placeName ?? "",
    taxName: t?.taxName ?? "Tourist Tax",
    currency: t?.currency ?? "EUR",
    basis: t?.basis ?? "person_night",
    rate: t?.rateCents ? (t.rateCents / 100).toFixed(2) : "",
    percent: t?.percent ? String(t.percent) : "",
    minTaxableAge: t?.minTaxableAge ? String(t.minTaxableAge) : "",
    capType: t?.capPerPersonCents ? "amount" : t?.maxNights ? "nights" : "none",
    maxNights: t?.maxNights ? String(t.maxNights) : "",
    capAmount: t?.capPerPersonCents ? (t.capPerPersonCents / 100).toFixed(2) : "",
  };
}

/** "Other destination": the host enters their local tax themselves. */
export default function CustomTaxFields({ value, onChange }: { value: CustomTaxForm; onChange: (v: CustomTaxForm) => void }) {
  const t = useT();
  const set = <K extends keyof CustomTaxForm>(k: K, v: CustomTaxForm[K]) => onChange({ ...value, [k]: v });
  const label = "mb-1.5 block text-sm font-medium";

  return (
    <div className="grid grid-cols-1 gap-4 rounded-xl bg-[var(--bg)] p-4 sm:col-span-2 sm:grid-cols-2">
      <p className="text-sm text-[var(--muted)] sm:col-span-2">
        {t("ct.intro")}
      </p>
      <label className="block">
        <span className={label}>{t("pf.country")}</span>
        <input className="input" value={value.countryName} onChange={(e) => set("countryName", e.target.value)} placeholder={t("ct.countryPh")} required />
      </label>
      <label className="block">
        <span className={label}>{t("ct.city")}</span>
        <input className="input" value={value.placeName} onChange={(e) => set("placeName", e.target.value)} placeholder={t("ct.cityPh")} required />
      </label>
      <label className="block">
        <span className={label}>{t("ct.taxName")}</span>
        <input className="input" value={value.taxName} onChange={(e) => set("taxName", e.target.value)} placeholder={t("ct.taxNamePh")} />
      </label>
      <label className="block">
        <span className={label}>{t("ct.currency")}</span>
        <select className="input" value={value.currency} onChange={(e) => set("currency", e.target.value)}>
          {CURRENCIES.map((c) => <option key={c} value={c}>{c}</option>)}
        </select>
      </label>

      <label className="block sm:col-span-2">
        <span className={label}>{t("ct.how")}</span>
        <select className="input" value={value.basis} onChange={(e) => {
          const basis = e.target.value as CustomTaxForm["basis"];
          onChange({ ...value, basis, capType: basis !== "person_night" && value.capType === "amount" ? "none" : value.capType });
        }}>
          <option value="person_night">{t("ct.basis.person")}</option>
          <option value="unit_night">{t("ct.basis.unit")}</option>
          <option value="percent">{t("ct.basis.percent")}</option>
        </select>
      </label>

      {value.basis === "percent" ? (
        <label className="block">
          <span className={label}>{t("ct.percent")}</span>
          <div className="relative">
            <input type="number" min="0" max="50" step="0.01" className="input pe-8" value={value.percent} onChange={(e) => set("percent", e.target.value)} placeholder="5" required />
            <span className="pointer-events-none absolute end-3 top-1/2 -translate-y-1/2 text-[var(--muted)]">%</span>
          </div>
        </label>
      ) : (
        <label className="block">
          <span className={label}>{t("ct.amount", { currency: value.currency })}</span>
          <input type="number" min="0.01" step="0.01" className="input" value={value.rate} onChange={(e) => set("rate", e.target.value)} placeholder="2.50" required />
        </label>
      )}
      {value.basis === "person_night" && (
        <label className="block">
          <span className={label}>{t("ct.freeUnder")}</span>
          <input type="number" min="0" max="18" step="1" className="input" value={value.minTaxableAge} onChange={(e) => set("minTaxableAge", e.target.value)} placeholder={t("ct.freeUnderPh")} />
        </label>
      )}

      <fieldset className="sm:col-span-2">
        <legend className={label}>{t("ct.capped")}</legend>
        <div className="grid grid-cols-1 gap-2 sm:grid-cols-3">
          {([
            ["none", t("ct.cap.none"), t("ct.cap.noneHint")],
            ["nights", t("ct.cap.nights"), t("ct.cap.nightsHint")],
            ...(value.basis === "person_night" ? [["amount", t("ct.cap.amount"), t("ct.cap.amountHint")]] : []),
          ] as [CustomTaxForm["capType"], string, string][]).map(([v, t, h]) => (
            <label key={v} className={`flex cursor-pointer items-start gap-3 rounded-lg border bg-[var(--surface)] p-3 text-sm ${value.capType === v ? "border-[var(--accent)]" : "border-[var(--line)]"}`}>
              <input type="radio" name="capType" className="mt-0.5 accent-[var(--accent)]" checked={value.capType === v} onChange={() => set("capType", v)} />
              <span><span className="font-medium">{t}</span><span className="block text-xs text-[var(--muted)]">{h}</span></span>
            </label>
          ))}
        </div>
        {value.capType === "nights" && (
          <input type="number" min="1" step="1" className="input mt-2" value={value.maxNights} onChange={(e) => set("maxNights", e.target.value)} placeholder={t("ct.maxNightsPh")} required />
        )}
        {value.capType === "amount" && (
          <input type="number" min="0.01" step="0.01" className="input mt-2" value={value.capAmount} onChange={(e) => set("capAmount", e.target.value)} placeholder={t("ct.capAmountPh", { currency: value.currency })} required />
        )}
      </fieldset>
    </div>
  );
}
