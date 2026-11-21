import type { Metadata } from "next";
import Link from "next/link";
import PageShell from "@/components/PageShell";
import { getI18n } from "@/i18n/server";
import { site } from "@/lib/config";
import { graph, pageMeta, pageSchema, siteSchema } from "@/lib/seo";

export async function generateMetadata(): Promise<Metadata> {
  const { t } = await getI18n();
  return pageMeta("/about", t("about.metaTitle", { brand: site.name }), t("about.metaDescription"));
}

const VALUES = ["accurate", "simple", "private", "fair"] as const;

export default async function About() {
  const { t, locale } = await getI18n();
  return (
    <PageShell
      title={t("about.title")}
      lead={t("about.lead")}
      schema={graph(siteSchema(), pageSchema("AboutPage", "/about", t("about.title"), t("about.metaDescription"), locale))}
    >
      <div className="space-y-12">
        <section>
          <h2 className="text-2xl font-semibold">{t("about.why.title")}</h2>
          <p className="mt-3 text-[var(--muted)]">{t("about.why.p1")}</p>
          <p className="mt-3 text-[var(--muted)]">{t("about.why.p2")}</p>
        </section>
        <section>
          <h2 className="text-2xl font-semibold">{t("about.what.title")}</h2>
          <p className="mt-3 text-[var(--muted)]">{t("about.what.p1")}</p>
        </section>
        <section>
          <h2 className="text-2xl font-semibold">{t("about.values.title")}</h2>
          <div className="mt-6 grid gap-4 sm:grid-cols-2">
            {VALUES.map((v) => (
              <div key={v} className="rounded-2xl border border-[var(--line)] p-6">
                <h3 className="font-semibold">{t(`about.value.${v}.title`)}</h3>
                <p className="mt-1 text-sm text-[var(--muted)]">{t(`about.value.${v}.body`)}</p>
              </div>
            ))}
          </div>
        </section>
        <section className="rounded-3xl bg-[var(--soft)] p-8 text-center">
          <h2 className="text-2xl font-semibold">{t("about.cta.title")}</h2>
          <p className="mt-2 text-[var(--muted)]">{t("about.cta.body")}</p>
          <div className="mt-6 flex flex-wrap justify-center gap-3">
            <Link href="/register" className="rounded-xl bg-[var(--accent)] px-6 py-3 font-semibold text-[var(--on-accent)] hover:brightness-110">{t("home.start")}</Link>
            <Link href="/contact" className="rounded-xl border border-[var(--line)] bg-[var(--surface)] px-6 py-3 font-medium">{t("nav.contact")}</Link>
          </div>
        </section>
      </div>
    </PageShell>
  );
}
