import type { Metadata } from "next";
import Link from "next/link";
import { notFound } from "next/navigation";
import PageShell from "@/components/PageShell";
import Icon from "@/components/Icon";
import { getI18n } from "@/i18n/server";
import { date } from "@/i18n/translate";
import { DESTINATIONS, destinationBySlug, destinationPath, placeName } from "@/lib/destinations";
import { capSummary, explainRules, rateSummary } from "@/lib/explain";
import { regionNote } from "@/lib/format";
import { localCountryName, localizeRegion } from "@/i18n/places";
import { graph, pageMeta, pageSchema, pageUrl, siteSchema } from "@/lib/seo";
import { appHref } from "@/lib/urls";
import type { AccommodationType } from "@/lib/taxRules";
import DestinationCalculator from "../DestinationCalculator";

export const dynamicParams = false;
export function generateStaticParams() {
  return DESTINATIONS.map((d) => ({ slug: d.slug }));
}

export async function generateMetadata({ params }: { params: Promise<{ slug: string }> }): Promise<Metadata> {
  const d = destinationBySlug((await params).slug);
  if (!d) return {};
  const { t, locale } = await getI18n();
  const year = new Date().getFullYear();
  const region = localizeRegion(d.region, locale);
  const vars = { place: placeName(region), tax: region.taxName, year };
  return pageMeta(destinationPath(d), t("dest.metaTitle", vars), t("dest.metaDescription", vars));
}

export default async function Destination({ params }: { params: Promise<{ slug: string }> }) {
  const d = destinationBySlug((await params).slug);
  if (!d) notFound();
  const { t, locale } = await getI18n();
  const { country: c } = d;
  const r = localizeRegion(d.region, locale);
  const today = new Date().toISOString().slice(0, 10);
  const year = new Date().getFullYear();
  const place = placeName(r);
  const path = destinationPath(d);

  // One row per tax category (types that pay the same are grouped), as on the in-app rates page.
  const groups = new Map<string, AccommodationType>();
  for (const a of r.accommodationTypes) if (!groups.has(a.guestLabel ?? a.label)) groups.set(a.guestLabel ?? a.label, a);
  const rows = [...groups].map(([label, acc]) => ({
    label: t.raw(`g:${label}`),
    rate: rateSummary(r, acc, today, t),
    who: acc.basis === "person_night"
      ? [r.minTaxableAge ? t("dest.ageAndOver", { age: r.minTaxableAge }) : t("rates.everyone"), r.childReduction ? `(${r.childReduction.fromAge}–${r.childReduction.toAge}: ${Math.round(r.childReduction.multiplier * 100)}%)` : ""].join(" ")
      : acc.basis === "unit_night" ? t("rates.perProperty") : t("rates.perBooking"),
    cap: capSummary(r, acc, today, t),
  }));
  const main = r.accommodationTypes[0];
  const explanation = explainRules(r, main, today, t);
  const anyCap = rows.find((x) => x.cap)?.cap;

  const faqs = [
    { q: t("dest.faq.how.q", { tax: r.taxName }), a: explanation.join(" ") },
    { q: t("dest.faq.children.q"), a: r.minTaxableAge ? t("dest.faq.children.exempt", { age: r.minTaxableAge }) : t("dest.faq.children.notExempt") },
    { q: t("dest.faq.cap.q"), a: anyCap ? t("dest.faq.cap.yes", { cap: anyCap }) : t("dest.faq.cap.no") },
    { q: t("dest.faq.collect.q", { tax: r.taxName, place }), a: t("dest.faq.collect.a", { tax: r.taxName }) },
  ];

  const schema = graph(
    siteSchema(),
    pageSchema("WebPage", path, t("dest.title", { place, year }), t("dest.metaDescription", { place, tax: r.taxName, year }), locale),
    [
      {
        "@type": "BreadcrumbList",
        "@id": `${pageUrl(path)}#breadcrumb`,
        itemListElement: [
          { "@type": "ListItem", position: 1, name: "Eco Tax Pay", item: pageUrl("/") },
          { "@type": "ListItem", position: 2, name: t("dest.index.title"), item: pageUrl("/destinations") },
          { "@type": "ListItem", position: 3, name: place, item: pageUrl(path) },
        ],
      },
      { "@type": "FAQPage", mainEntity: faqs.map((f) => ({ "@type": "Question", name: f.q, acceptedAnswer: { "@type": "Answer", text: f.a } })) },
    ],
  );
  // pageSchema adds a two-level breadcrumb; the three-level one above replaces it.
  const nodes = (schema as { "@graph": { "@type": string; "@id"?: string }[] })["@graph"];
  const firstCrumb = nodes.findIndex((n) => n["@type"] === "BreadcrumbList");
  if (firstCrumb >= 0) nodes.splice(firstCrumb, 1);

  return (
    <PageShell title={t("dest.title", { place, year })} lead={t("dest.lead", { tax: r.taxName, place, country: localCountryName(c.code, c.name, locale) })} schema={schema}>
      <div className="space-y-12">
        <nav aria-label="Breadcrumb" className="-mt-6 flex flex-wrap items-center justify-center gap-1.5 text-sm text-[var(--muted)]">
          <Link href="/destinations" className="hover:text-[var(--ink)]">{t("dest.index.title")}</Link>
          <Icon name="chevronRight" size={13} />
          <span>{c.flag} {place}</span>
        </nav>

        <section>
          <h2 className="text-2xl font-semibold tracking-tight">{t("dest.ratesHeading", { year })}</h2>
          <div className="panel mt-4 overflow-x-auto">
            <table className="table-pro min-w-[560px]">
              <thead>
                <tr>{[t("rates.col.appliesTo"), t("rates.col.rate"), t("rates.col.whoPays"), t("rates.col.capped")].map((h) => <th key={h}>{h}</th>)}</tr>
              </thead>
              <tbody>
                {rows.map((x) => (
                  <tr key={x.label}>
                    <td className="font-medium">{x.label}</td>
                    <td>{x.rate}</td>
                    <td className="text-[var(--muted)]">{x.who}</td>
                    <td>{x.cap ? <span className="text-emerald-300">{x.cap}</span> : <span className="text-[var(--muted)]">{t("props.noCap")}</span>}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
          {r.notes && <p className="note note-info mt-4"><Icon name="info" size={16} className="mt-0.5" /> {regionNote(r.id, r.notes, t)}</p>}
        </section>

        <section>
          <h2 className="text-2xl font-semibold tracking-tight">{t("dest.calcHeading")}</h2>
          <p className="mt-2 text-[var(--muted)]">{t("dest.calcSub", { tax: r.taxName })}</p>
          <div className="mt-5">
            <DestinationCalculator regionId={r.id} currency={r.currency} types={r.accommodationTypes.map((a) => ({ id: a.id, label: t.raw(`a:${a.label}`), percent: a.basis === "percent" }))} />
          </div>
        </section>

        <section className="panel panel-pad flex flex-wrap items-center justify-between gap-5">
          <div className="max-w-md">
            <h2 className="text-lg font-semibold">{t("dest.cta.title", { tax: r.taxName })}</h2>
            <p className="mt-1 text-sm text-[var(--muted)]">{t("dest.cta.text")}</p>
          </div>
          <a href={appHref("/register")} className="btn btn-primary btn-lg">{t("home.start")} <Icon name="arrowRight" size={16} /></a>
        </section>

        <section>
          <h2 className="text-2xl font-semibold tracking-tight">{t("dest.faqHeading")}</h2>
          <div className="mt-4 space-y-3">
            {faqs.map((f) => (
              <details key={f.q} className="panel group px-5 py-4">
                <summary className="flex cursor-pointer list-none items-center justify-between gap-4 font-medium [&::-webkit-details-marker]:hidden">
                  {f.q} <Icon name="chevronDown" size={16} className="shrink-0 text-[var(--muted)] transition-transform group-open:rotate-180" />
                </summary>
                <p className="mt-3 text-sm leading-relaxed text-[var(--muted)]">{f.a}</p>
              </details>
            ))}
          </div>
        </section>

        <section className="text-sm text-[var(--muted)]">
          <h2 className="text-base font-semibold text-[var(--ink)]">{t("dest.sourcesHeading")}</h2>
          <p className="mt-2">{t("dest.verified", { date: date(r.verifiedOn, locale, { day: "numeric", month: "long", year: "numeric" }) })}</p>
          <ul className="mt-2 space-y-1">
            {r.sources.map((s) => (
              <li key={s}><a href={s} target="_blank" rel="noreferrer noopener" className="link break-all">{s.replace(/^https?:\/\//, "")}</a></li>
            ))}
          </ul>
          <p className="mt-3 text-xs">{t("dest.disclaimer")}</p>
        </section>

        <section>
          <h2 className="text-base font-semibold">{t("dest.others")}</h2>
          <div className="mt-3 flex flex-wrap gap-2">
            {DESTINATIONS.filter((o) => o.slug !== d.slug).map((o) => (
              <Link key={o.slug} href={destinationPath(o)} className="btn btn-secondary btn-sm">{o.country.flag} {placeName(localizeRegion(o.region, locale))}</Link>
            ))}
          </div>
        </section>
      </div>
    </PageShell>
  );
}
