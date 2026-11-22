"use client";

import { useState } from "react";
import { useT } from "@/i18n/client";
import { apiFetch, errorText } from "@/lib/api";

/**
 * "How many people are staying?" The host didn't know the party size (e.g. a calendar booking),
 * so the guest enters it and the server recalculates the tax from the official rules.
 */
export default function GuestCount({
  id,
  initial,
  minTaxableAge,
  editing = false,
}: {
  id: string;
  initial?: { adults: number; childAges: number[] };
  minTaxableAge?: number;
  editing?: boolean;
}) {
  const t = useT();
  const [open, setOpen] = useState(!editing);
  const [adults, setAdults] = useState(initial?.adults ?? 2);
  const [ages, setAges] = useState<number[]>(initial?.childAges ?? []);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);

  async function save(e: React.FormEvent) {
    e.preventDefault();
    setBusy(true);
    setError(null);
    try {
      const res = await apiFetch(`/api/p/${id}/guests`, { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ adults, childAges: ages }) });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error);
      window.location.reload();
    } catch (err) {
      setError(errorText(err, t));
      setBusy(false);
    }
  }

  if (!open)
    return (
      <p className="text-center text-sm">
        <button type="button" onClick={() => setOpen(true)} className="text-[var(--muted)] underline hover:text-[var(--ink)]">{t("guests.change")}</button>
      </p>
    );

  const step = (value: number, set: (n: number) => void, min: number, max: number, label: string) => (
    <div className="flex items-center gap-2" role="group" aria-label={label}>
      <button type="button" onClick={() => set(Math.max(min, value - 1))} disabled={value <= min} className="btn btn-secondary btn-icon h-11 w-11 text-lg">−</button>
      <span className="w-10 text-center text-lg font-semibold tabular-nums">{value}</span>
      <button type="button" onClick={() => set(Math.min(max, value + 1))} disabled={value >= max} className="btn btn-secondary btn-icon h-11 w-11 text-lg">+</button>
    </div>
  );

  return (
    <form onSubmit={save} className="panel panel-pad space-y-5">
      <div>
        <h2 className="text-lg font-semibold">{t("guests.title")}</h2>
        <p className="mt-1 text-sm text-[var(--muted)]">{t("guests.sub")}</p>
      </div>
      <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
        <div>
          <div className="mb-1.5 text-sm font-medium">{t("form.adults")}</div>
          {step(adults, setAdults, 1, 20, t("form.adults"))}
        </div>
        <div>
          <div className="mb-1.5 text-sm font-medium">{t("form.children")}</div>
          {step(ages.length, (n) => setAges(n > ages.length ? [...ages, ...Array(n - ages.length).fill(10)] : ages.slice(0, n)), 0, 10, t("form.children"))}
        </div>
      </div>
      {ages.length > 0 && (
        <div>
          <div className="mb-2 text-sm font-medium">{t("form.childAges")}</div>
          <div className="flex flex-wrap gap-2">
            {ages.map((age, i) => (
              <select key={i} className="input h-10 w-auto text-sm" value={age} onChange={(e) => setAges(ages.map((a, j) => (j === i ? Number(e.target.value) : a)))} aria-label={`${t("form.childAges")} ${i + 1}`}>
                {Array.from({ length: 18 }, (_, a) => (
                  <option key={a} value={a}>{t.plural("guests.age", a)}</option>
                ))}
              </select>
            ))}
          </div>
          {minTaxableAge ? <p className="mt-2 text-xs text-[var(--muted)]">{t("explain.childrenFree", { age: minTaxableAge })}</p> : null}
        </div>
      )}
      {error && <p className="note note-danger">{error}</p>}
      <button disabled={busy} className="btn btn-primary btn-lg w-full">
        {busy ? t("common.wait") : t("guests.calculate")}
      </button>
    </form>
  );
}
