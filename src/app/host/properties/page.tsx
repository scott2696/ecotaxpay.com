import { platformName } from "@/lib/platforms";
import { removeProperty } from "../actions";
import { guideCount } from "@/lib/guide";
import type { MessageKey } from "@/i18n/messages/en";
import { getI18n } from "@/i18n/server";
import { requireHost } from "@/lib/auth";
import Link from "next/link";
import Icon from "@/components/Icon";
import PageHeader, { PageBody } from "@/components/PageHeader";
import { listProperties } from "@/lib/store";
import { capSummary, rateSummary } from "@/lib/explain";
import { resolveProperty } from "@/lib/resolve";

export const dynamic = "force-dynamic";

export default async function Properties({ searchParams }: { searchParams: Promise<{ saved?: string; deleted?: string }> }) {
  const host = await requireHost();
  const { t } = await getI18n();
  const [properties, { saved, deleted }] = await Promise.all([listProperties(host.id), searchParams]);
  return (
    <PageBody>
      <PageHeader
        title={t("nav.apartments")}
        description={t("props.intro")}
        actions={
          <>
            <Link href="/host/rates" className="btn btn-secondary"><Icon name="globe" size={15} /> {t("rates.title")}</Link>
            <Link href="/host/properties/new" className="btn btn-primary"><Icon name="plus" size={15} strokeWidth={2.25} /> {t("props.add")}</Link>
          </>
        }
      />
      {saved && <p className="note note-success rise mb-5"><Icon name="check" size={16} className="mt-0.5" /> {t("account.notice.saved")}</p>}
      {deleted && <p className="note note-success rise mb-5"><Icon name="check" size={16} className="mt-0.5" /> {t("props.deleted")}</p>}
      {properties.length === 0 ? (
        <div className="panel flex flex-col items-center border-dashed p-12 text-center">
          <span className="icon-chip mb-4"><Icon name="building" size={17} /></span>
          <p className="max-w-sm text-sm text-[var(--muted)]">{t("props.empty")}</p>
          <Link href="/host/properties/new" className="btn btn-primary mt-5"><Icon name="plus" size={15} /> {t("props.add")}</Link>
        </div>
      ) : (
        <ul className="stagger grid grid-cols-1 gap-4 lg:grid-cols-2">
          {properties.map((p) => {
            const r = resolveProperty(p);
            const acc = r?.acc;
            const today = new Date().toISOString().slice(0, 10);
            const count = guideCount(p.guide);
            const cals = Object.entries(p.calendars ?? {}).filter(([, v]) => v).map(([id]) => platformName(id));
            const cap = r && acc ? capSummary(r.region, acc, today, t) : null;
            return (
              <li key={p.id} className="panel flex flex-col transition-colors hover:border-[var(--line-strong)]">
                <div className="flex items-start gap-4 p-5 sm:p-6">
                  <span className="icon-chip h-11 w-11"><Icon name="building" size={19} /></span>
                  <div className="min-w-0 flex-1">
                    <h2 className="truncate text-base font-semibold tracking-tight">{p.name}</h2>
                    <p className="mt-0.5 text-sm text-[var(--muted)]">
                      {r?.country.flag} {r?.region.name.split(" (")[0]}
                      {r?.region.id.startsWith("custom:") ? ` (${t("props.ownRate", { country: r.country.name })})` : ""} · {acc && t.raw(`a:${acc.label}`)}
                    </p>
                  </div>
                </div>
                {r && acc && (
                  <div className="mx-5 rounded-[var(--r-md)] border border-[var(--line)] bg-white/[0.02] px-4 py-3 sm:mx-6">
                    <div className="eyebrow">{r.region.taxName}</div>
                    <div className="mt-1 text-sm font-medium">{rateSummary(r.region, acc, today, t)}</div>
                    <div className={`mt-0.5 text-xs ${cap ? "text-emerald-300" : "text-[var(--muted)]"}`}>{cap ?? t("props.noCap")}</div>
                  </div>
                )}
                <div className="flex flex-wrap gap-1.5 px-5 pb-5 pt-4 sm:px-6">
                  <span className={`pill ${cals.length ? "pill-success" : "pill-neutral"}`}>{t("props.calendars", { list: cals.join(" + ") || t("props.none") })}</span>
                  <span className="pill pill-neutral pill-plain"><Icon name="file" size={12} /> {t("props.docsBadge", { value: t(`props.docs.${p.documents}` as MessageKey) })}</span>
                  <span className={`pill ${count ? "pill-neutral pill-plain" : "pill-warning"}`}>{count ? t.plural("props.guideItems", count) : t("props.guideEmpty")}</span>
                </div>
                <div className="mt-auto flex flex-wrap items-center gap-1.5 border-t border-[var(--line)] px-5 py-3 sm:px-6">
                  <Link href={`/host/properties/${p.id}`} className="btn btn-secondary btn-sm"><Icon name="edit" size={14} /> {t("props.edit")}</Link>
                  <Link href={`/host/properties/new?from=${p.id}`} className="btn btn-quiet btn-sm" title={t("props.copyHint")}><Icon name="copy" size={14} /> {t("props.copy")}</Link>
                  {/* Two-step delete (no browser dialogs): open, then confirm. */}
                  <details className="group ms-auto">
                    <summary className="btn btn-quiet btn-sm list-none hover:text-red-300 group-open:bg-red-500/10 group-open:text-red-300 [&::-webkit-details-marker]:hidden">
                      <Icon name="trash" size={14} /> {t("props.delete")}
                    </summary>
                  </details>
                </div>
                <DeleteConfirm id={p.id} name={p.name} text={t("props.deleteConfirmText", { name: p.name })} confirm={t("props.deleteConfirm")} />
              </li>
            );
          })}
        </ul>
      )}
    </PageBody>
  );
}

/** Confirmation strip shown under a card while its Delete is open (CSS :has, no browser dialogs). */
function DeleteConfirm({ id, text, confirm }: { id: string; name: string; text: string; confirm: string }) {
  return (
    <div className="hidden border-t border-red-400/20 bg-red-500/[0.05] px-5 py-4 text-sm sm:px-6 [li:has(details[open])_&]:block">
      <p className="text-red-100">{text}</p>
      <form action={removeProperty.bind(null, id)} className="mt-3">
        <button className="btn btn-danger-solid btn-sm">{confirm}</button>
      </form>
    </div>
  );
}
