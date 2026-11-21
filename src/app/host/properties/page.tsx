import { guideCount } from "@/lib/guide";
import type { MessageKey } from "@/i18n/messages/en";
import { getI18n } from "@/i18n/server";
import { requireHost } from "@/lib/auth";
import Link from "next/link";
import { listProperties } from "@/lib/store";
import { capSummary, rateSummary } from "@/lib/explain";
import { resolveProperty } from "@/lib/resolve";

export const dynamic = "force-dynamic";

export default async function Properties({ searchParams }: { searchParams: Promise<{ saved?: string }> }) {
  const host = await requireHost();
  const { t } = await getI18n();
  const [properties, { saved }] = await Promise.all([listProperties(host.id), searchParams]);
  return (
    <main className="mx-auto max-w-4xl px-4 py-8">
      <a href="/host" className="text-sm text-[var(--muted)] underline">← {t("nav.dashboard")}</a>
      <div className="mb-6 mt-3 flex flex-wrap items-center justify-between gap-4">
        <div>
          <h1 className="text-2xl font-semibold">{t("nav.apartments")}</h1>
          <p className="mt-1 text-sm text-[var(--muted)]">{t("props.intro")}</p>
        </div>
        <Link href="/host/properties/new" className="rounded-lg bg-[var(--accent)] px-4 py-2 text-sm font-semibold text-[var(--on-accent)]">+ {t("props.add")}</Link>
        <Link href="/host/rates" className="rounded-lg border border-[var(--line)] bg-[var(--surface)] px-4 py-2 text-sm font-medium">🌍 {t("rates.title")}</Link>
      </div>
      {saved && <p className="mb-4 rounded-lg bg-emerald-400/10 p-3 text-sm text-emerald-300">{t("account.notice.saved")}</p>}
      {properties.length === 0 ? (
        <div className="rounded-2xl border border-dashed border-[var(--line)] bg-[var(--surface)] p-10 text-center text-[var(--muted)]">
          {t("props.empty")}
        </div>
      ) : (
        <ul className="space-y-3">
          {properties.map((p) => {
            const r = resolveProperty(p);
            const acc = r?.acc;
            const today = new Date().toISOString().slice(0, 10);
            const count = guideCount(p.guide);
            return (
              <li key={p.id} className="rounded-2xl border border-[var(--line)] bg-[var(--surface)] p-5">
                <div className="flex flex-wrap items-start justify-between gap-3">
                  <div>
                    <div className="font-semibold">{p.name}</div>
                    <div className="mt-1 text-sm text-[var(--muted)]">
                      {r?.country.flag} {r?.region.name.split(" (")[0]}
                      {r?.region.id.startsWith("custom:") ? ` (${t("props.ownRate", { country: r.country.name })})` : ""} · {acc && t.raw(`a:${acc.label}`)}
                    </div>
                    {r && acc && (
                      <div className="mt-1 text-sm">
                        {r.region.taxName}: {rateSummary(r.region, acc, today, t)} ·{" "}
                        <span className={capSummary(r.region, acc, today) ? "text-emerald-300" : "text-[var(--muted)]"}>
                          {capSummary(r.region, acc, today, t) ?? t("props.noCap")}
                        </span>
                      </div>
                    )}
                  </div>
                  <div className="flex gap-2 text-sm">
                    <Link href={`/host/properties/${p.id}`} className="rounded-lg bg-[var(--accent)] px-3 py-1.5 font-semibold text-[var(--on-accent)]">{t("props.edit")}</Link>
                    <Link href={`/host/properties/new?from=${p.id}`} className="rounded-lg border border-[var(--line)] px-3 py-1.5 font-medium hover:bg-[var(--soft)]" title={t("props.copyHint")}>{t("props.copy")}</Link>
                  </div>
                </div>
                <div className="mt-3 flex flex-wrap gap-2 text-xs">
                  <span className={`rounded-full px-2 py-0.5 ${p.calendars?.airbnb || p.calendars?.booking ? "bg-[var(--soft)]" : "bg-white/10 text-zinc-300"}`}>
                    {t("props.calendars", { list: [p.calendars?.airbnb && "Airbnb", p.calendars?.booking && "Booking.com"].filter(Boolean).join(" + ") || t("props.none") })}
                  </span>
                  <span className="rounded-full bg-[var(--soft)] px-2 py-0.5">{t("props.docsBadge", { value: t(`props.docs.${p.documents}` as MessageKey) })}</span>
                  <span className={`rounded-full px-2 py-0.5 ${count ? "bg-[var(--soft)]" : "bg-amber-400/15 text-amber-200"}`}>
                    {count ? t.plural("props.guideItems", count) : t("props.guideEmpty")}
                  </span>
                </div>
              </li>
            );
          })}
        </ul>
      )}
    </main>
  );
}
