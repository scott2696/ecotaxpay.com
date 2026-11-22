import PageShell, { Prose } from "./PageShell";
import { getI18n } from "@/i18n/server";
import { graph, pageSchema, siteSchema } from "@/lib/seo";

export const LEGAL_UPDATED = "2026-11-22";

/** Legal pages: written in English (the binding version); other languages see a short notice. */
export default async function LegalPage({ path, titleKey, description, children }: { path: string; titleKey: "legal.terms" | "legal.privacy" | "legal.cookies"; description: string; children: React.ReactNode }) {
  const { t, locale } = await getI18n();
  const title = t(titleKey);
  return (
    <PageShell title={title} lead={t("legal.updated", { date: new Date(`${LEGAL_UPDATED}T00:00:00Z`).toLocaleDateString(locale === "en" ? "en-GB" : locale, { day: "numeric", month: "long", year: "numeric", timeZone: "UTC" }) })} schema={graph(siteSchema(), pageSchema("WebPage", path, title, description, "en"))}>
      {locale !== "en" && <p className="mb-8 rounded-lg bg-[var(--soft)] p-4 text-sm">{t("legal.englishOnly")}</p>}
      <div lang="en">
        <Prose>{children}</Prose>
      </div>
    </PageShell>
  );
}
