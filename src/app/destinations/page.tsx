import type { Metadata } from "next";
import Link from "next/link";
import PageShell from "@/components/PageShell";
import Icon from "@/components/Icon";
import { getI18n } from "@/i18n/server";
import { DESTINATIONS, destinationPath, placeName } from "@/lib/destinations";
import { rateSummary } from "@/lib/explain";
import { graph, pageMeta, pageSchema, siteSchema } from "@/lib/seo";

export async function generateMetadata(): Promise<Metadata> {
  const { t } = await getI18n();
  const year = new Date().getFullYear();
  return pageMeta("/destinations", t("dest.index.metaTitle", { year }), t("dest.index.metaDescription", { count: DESTINATIONS.length }));
}

export default async function Destinations() {
  const { t, locale } = await getI18n();
  const today = new Date().toISOString().slice(0, 10);
  const year = new Date().getFullYear();
  return (
    <PageShell
      title={t("dest.index.title")}
      lead={t("dest.index.lead", { count: DESTINATIONS.length, year })}
      schema={graph(siteSchema(), pageSchema("WebPage", "/destinations", t("dest.index.title"), t("dest.index.metaDescription", { count: DESTINATIONS.length }), locale))}
    >
      <ul className="stagger grid grid-cols-1 gap-3 sm:grid-cols-2">
        {DESTINATIONS.map((d) => (
          <li key={d.slug}>
            <Link href={destinationPath(d)} className="panel group flex h-full items-start gap-4 p-5 transition-colors hover:border-[var(--line-strong)]">
              <span className="text-2xl leading-none" aria-hidden>{d.country.flag}</span>
              <span className="min-w-0 flex-1">
                <span className="block font-semibold">{placeName(d.region)}</span>
                <span className="block text-sm text-[var(--muted)]">{d.region.taxName}</span>
                <span className="mt-2 block text-sm">{rateSummary(d.region, d.region.accommodationTypes[0], today, t)}</span>
              </span>
              <Icon name="arrowRight" size={16} className="mt-1 text-[var(--muted)] transition-transform group-hover:translate-x-0.5" />
            </Link>
          </li>
        ))}
      </ul>
      <p className="mt-8 text-center text-sm text-[var(--muted)]">{t("dest.index.other")}</p>
    </PageShell>
  );
}
