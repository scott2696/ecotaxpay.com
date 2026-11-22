"use client";

import { useMemo } from "react";
import { useT } from "@/i18n/client";
import { ALL_CURRENCIES, POPULAR_CURRENCIES, currencyLabel } from "@/lib/currencies";

/** Every currency: the common ones first, then all A–Z, labelled "EUR · Euro" in the host's language. */
export default function CurrencySelect({ value, onChange, name, className = "input w-auto" }: { value: string; onChange?: (v: string) => void; name?: string; className?: string }) {
  const t = useT();
  const [popular, rest] = useMemo(() => {
    const label = (c: string) => ({ code: c, label: currencyLabel(c, t.locale) });
    const pop = POPULAR_CURRENCIES.map(label);
    const others = ALL_CURRENCIES.filter((c) => !(POPULAR_CURRENCIES as readonly string[]).includes(c)).map(label);
    return [pop, others];
  }, [t.locale]);
  return (
    <select name={name} className={className} value={value} onChange={(e) => onChange?.(e.target.value)} aria-label={t("quick.currency")}>
      <optgroup label={t("currency.popular")}>
        {popular.map((c) => <option key={c.code} value={c.code} suppressHydrationWarning>{c.label}</option>)}
      </optgroup>
      <optgroup label={t("currency.all")}>
        {rest.map((c) => <option key={c.code} value={c.code} suppressHydrationWarning>{c.label}</option>)}
      </optgroup>
    </select>
  );
}
