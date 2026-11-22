import { getI18n } from "@/i18n/server";
import { date } from "@/i18n/translate";
import PageHeader, { PageBody } from "@/components/PageHeader";
import { capSummary, rateSummary } from "@/lib/explain";
import { regionNote } from "@/lib/format";
import { COUNTRIES, type AccommodationType } from "@/lib/taxRules";

export async function generateMetadata() {
  const { t } = await getI18n();
  return { title: t("rates.title") };
}

/** Every built-in destination with its rate, exemptions and whether it's capped. */
export default async function Rates() {
  const { t, locale } = await getI18n();
  const countryName = (code: string, fallback: string) => {
    try {
      return new Intl.DisplayNames([locale], { type: "region" }).of(code) ?? fallback;
    } catch {
      return fallback;
    }
  };
  const today = new Date().toISOString().slice(0, 10);
  const countries = [...COUNTRIES].sort((a, b) => countryName(a.code, a.name).localeCompare(countryName(b.code, b.name), locale));

  return (
    <PageBody>
      <PageHeader
        title={t("rates.title")}
        description={t("rates.intro", { other: t("pf.other"), date: date(today, locale, { day: "numeric", month: "long", year: "numeric" }) })}
      />

      <div className="panel overflow-x-auto">
        <table className="table-pro min-w-[900px]">
          <thead>
            <tr>
              {[t("dash.col.destination"), t("rates.col.tax"), t("rates.col.appliesTo"), t("rates.col.rate"), t("rates.col.whoPays"), t("rates.col.capped"), t("rates.col.checked")].map((h) => (
                <th key={h}>{h}</th>
              ))}
            </tr>
          </thead>
          <tbody>
            {countries.flatMap((c) =>
              c.regions.flatMap((r) => {
                // One row per tax category (types that pay the same are grouped).
                const groups = new Map<string, AccommodationType>();
                for (const a of r.accommodationTypes) if (!groups.has(a.guestLabel ?? a.label)) groups.set(a.guestLabel ?? a.label, a);
                return [...groups].map(([label, acc], i) => {
                  const cap = capSummary(r, acc, today, t);
                  const who = acc.basis === "person_night"
                    ? [r.minTaxableAge ? `${r.minTaxableAge}+` : t("rates.everyone"), r.childReduction ? `(${r.childReduction.fromAge}–${r.childReduction.toAge}: ${Math.round(r.childReduction.multiplier * 100)}%)` : ""].join(" ")
                    : acc.basis === "unit_night" ? t("rates.perProperty") : t("rates.perBooking");
                  return (
                    <tr key={`${r.id}-${label}`} className="border-b border-[var(--line)] align-top last:border-0">
                      <td className="font-medium">{i === 0 ? <>{c.flag} {r.name.split(" (")[0]}<div className="text-xs font-normal text-[var(--muted)]">{countryName(c.code, c.name)}</div></> : ""}</td>
                      <td>{i === 0 ? r.taxName : ""}</td>
                      <td className="text-[var(--muted)]">{t.raw(`g:${label}`)}</td>
                      <td>{rateSummary(r, acc, today, t)}</td>
                      <td>{who}</td>
                      <td>
                        {cap ? <span className="text-emerald-300">✓ {cap}</span> : <span className="text-[var(--muted)]">{t("props.noCap")}</span>}
                      </td>
                      <td className="text-xs text-[var(--muted)]">
                        {i === 0 && (
                          <>
                            {r.verifiedOn}
                            {r.sources.slice(0, 2).map((s, n) => (
                              <a key={s} href={s} target="_blank" rel="noreferrer" className="ml-1 underline">[{n + 1}]</a>
                            ))}
                            {r.notes && <div className="mt-1 max-w-xs">{regionNote(r.id, r.notes, t)}</div>}
                          </>
                        )}
                      </td>
                    </tr>
                  );
                });
              }),
            )}
          </tbody>
        </table>
      </div>
    </PageBody>
  );
}
