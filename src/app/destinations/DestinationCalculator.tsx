"use client";

import { useMemo, useState } from "react";
import { useT } from "@/i18n/client";
import { money } from "@/i18n/translate";
import { calculate, LIMITS, QuoteError } from "@/lib/calc";
import { describeLine } from "@/lib/format";

/** Try the tax for a stay at this destination (runs in the browser, same rules as the app). */
export default function DestinationCalculator({ regionId, types, currency }: { regionId: string; types: { id: string; label: string; percent: boolean }[]; currency: string }) {
  const t = useT();
  const [type, setType] = useState(types[0]?.id ?? "");
  const [checkIn, setCheckIn] = useState(() => new Date().toISOString().slice(0, 10));
  const [nights, setNights] = useState(3);
  const [adults, setAdults] = useState(2);
  const [childAges, setChildAges] = useState<number[]>([]);
  const [price, setPrice] = useState("150");
  const percent = types.find((a) => a.id === type)?.percent ?? false;

  const result = useMemo(() => {
    try {
      return { quote: calculate({ regionId, accommodationTypeId: type, checkIn, nights, adults, childAges, nightlyPriceCents: Math.round(Number(price.replace(",", ".")) * 100) || undefined }, () => 0) };
    } catch (e) {
      return { error: e instanceof QuoteError ? e.message : String(e) };
    }
  }, [regionId, type, checkIn, nights, adults, childAges, price]);

  const step = "h-10 w-10 shrink-0 rounded-[var(--r-sm)] border border-[var(--line-strong)] text-lg hover:bg-white/[0.06] disabled:opacity-40";
  const Stepper = ({ value, set, min, max }: { value: number; set: (n: number) => void; min: number; max: number }) => (
    <div className="flex items-center gap-2">
      <button type="button" className={step} onClick={() => set(Math.max(min, value - 1))} disabled={value <= min} aria-label="−">−</button>
      <span className="min-w-8 text-center text-lg font-semibold tabular-nums">{value}</span>
      <button type="button" className={step} onClick={() => set(Math.min(max, value + 1))} disabled={value >= max} aria-label="+">+</button>
    </div>
  );

  return (
    <div className="panel panel-pad grid grid-cols-1 gap-6 md:grid-cols-2">
      <div className="space-y-4">
        {types.length > 1 && (
          <label className="block">
            <span className="label">{t("rates.col.appliesTo")}</span>
            <select className="input" value={type} onChange={(e) => setType(e.target.value)}>
              {types.map((a) => <option key={a.id} value={a.id}>{a.label}</option>)}
            </select>
          </label>
        )}
        <label className="block">
          <span className="label">{t("form.checkIn")}</span>
          <input type="date" className="input" value={checkIn} onChange={(e) => e.target.value && setCheckIn(e.target.value)} />
        </label>
        {percent && (
          <label className="block">
            <span className="label">{t("dest.nightlyPrice", { currency })}</span>
            <input type="number" inputMode="decimal" min="1" className="input" value={price} onChange={(e) => setPrice(e.target.value)} />
          </label>
        )}
        <div className="grid grid-cols-2 gap-4">
          <div><span className="label">{t("dest.nights")}</span><Stepper value={nights} set={setNights} min={1} max={LIMITS.maxNights} /></div>
          <div><span className="label">{t("form.adults")}</span><Stepper value={adults} set={setAdults} min={1} max={LIMITS.maxAdults} /></div>
        </div>
        <div>
          <span className="label">{t("form.children")}</span>
          <Stepper value={childAges.length} set={(n) => setChildAges((a) => (n > a.length ? [...a, 8] : a.slice(0, n)))} min={0} max={LIMITS.maxChildren} />
          {childAges.length > 0 && (
            <div className="mt-3 flex flex-wrap gap-2">
              {childAges.map((age, i) => (
                <select key={i} className="input h-9 w-auto text-sm" value={age} onChange={(e) => setChildAges((a) => a.map((v, j) => (j === i ? Number(e.target.value) : v)))} aria-label={t("form.childAges")}>
                  {Array.from({ length: 18 }, (_, n) => <option key={n} value={n}>{t.plural("guests.age", n)}</option>)}
                </select>
              ))}
            </div>
          )}
        </div>
      </div>
      <div className="flex flex-col rounded-[var(--r-lg)] border border-[var(--line)] bg-white/[0.02] p-5">
        <div className="eyebrow">{t("dest.youCollect")}</div>
        {"quote" in result && result.quote ? (
          <>
            <ul className="mt-4 space-y-2 text-sm">
              {result.quote.lines.map((l, i) => (
                <li key={i} className="flex justify-between gap-4">
                  <span className="text-[var(--muted)]">{describeLine(l, result.quote.currency, t)}</span>
                  <span className="tabular-nums">{money(l.amountCents, result.quote.currency, t.locale)}</span>
                </li>
              ))}
            </ul>
            <div className="divider my-5" />
            <div className="mt-auto flex items-end justify-between gap-3">
              <span className="pb-1 text-sm text-[var(--muted)]">{t("dash.col.total")}</span>
              <span className="amount-hero">{money(result.quote.totalCents, result.quote.currency, t.locale)}</span>
            </div>
          </>
        ) : (
          <p className="mt-4 text-sm text-[var(--muted)]">{t("q.invalid")}</p>
        )}
      </div>
    </div>
  );
}
