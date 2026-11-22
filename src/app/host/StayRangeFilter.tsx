"use client";

import { usePathname, useRouter, useSearchParams } from "next/navigation";
import { useT } from "@/i18n/client";

/**
 * "Stays from <month> to <month>": which guests checked in during a period (e.g. April–September),
 * for the accountant / the tax return. Kept in the URL (?from=YYYY-MM&to=YYYY-MM).
 */
export default function StayRangeFilter({ months, from, to }: { months: { value: string; label: string }[]; from: string; to: string }) {
  const t = useT();
  const router = useRouter();
  const pathname = usePathname();
  const params = useSearchParams();

  function apply(nextFrom: string, nextTo: string) {
    const next = new URLSearchParams(params);
    // Keep the range the right way round.
    if (nextFrom && nextTo && nextFrom > nextTo) [nextFrom, nextTo] = [nextTo, nextFrom];
    for (const [k, v] of [["from", nextFrom], ["to", nextTo]] as const) {
      if (v) next.set(k, v);
      else next.delete(k);
    }
    router.push(next.size ? `${pathname}?${next}` : pathname, { scroll: false });
  }

  const year = new Date().getFullYear();
  const presets: [string, string, string][] = [
    [t("range.aprSep", { year }), `${year}-04`, `${year}-09`],
    [t("range.year", { year }), `${year}-01`, `${year}-12`],
    [t("range.year", { year: year - 1 }), `${year - 1}-01`, `${year - 1}-12`],
  ];
  const select = "input h-10 w-auto min-w-36 text-sm";

  return (
    <div className="flex flex-wrap items-center gap-2 text-sm">
      <span className="text-[var(--muted)]">{t("range.label")}</span>
      <select className={select} value={from} onChange={(e) => apply(e.target.value, to)} aria-label={t("range.from")}>
        <option value="">{t("range.start")}</option>
        {months.map((m) => <option key={m.value} value={m.value}>{m.label}</option>)}
      </select>
      <span className="text-[var(--muted)]">→</span>
      <select className={select} value={to} onChange={(e) => apply(from, e.target.value)} aria-label={t("range.to")}>
        <option value="">{t("range.end")}</option>
        {months.map((m) => <option key={m.value} value={m.value}>{m.label}</option>)}
      </select>
      {presets.map(([label, f, tt]) => (
        <button
          key={label}
          type="button"
          onClick={() => apply(f, tt)}
          className={`rounded-full border px-3 py-1.5 text-xs transition-colors ${from === f && to === tt ? "border-[var(--accent)] bg-[var(--soft)] font-medium" : "border-[var(--line)] text-[var(--muted)] hover:text-[var(--ink)]"}`}
        >
          {label}
        </button>
      ))}
      {(from || to) && (
        <button type="button" onClick={() => apply("", "")} className="px-2 text-xs text-[var(--muted)] underline">
          {t("range.clear")}
        </button>
      )}
    </div>
  );
}
