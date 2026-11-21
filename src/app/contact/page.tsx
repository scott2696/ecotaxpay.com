import type { Metadata } from "next";
import PageShell from "@/components/PageShell";
import { getI18n } from "@/i18n/server";
import { site } from "@/lib/config";
import { graph, pageMeta, pageSchema, siteSchema } from "@/lib/seo";
import ContactForm from "./ContactForm";

export async function generateMetadata(): Promise<Metadata> {
  const { t } = await getI18n();
  return pageMeta("/contact", t("contact.metaTitle", { brand: site.name }), t("contact.metaDescription"));
}

export default async function Contact() {
  const { t, locale } = await getI18n();
  return (
    <PageShell
      title={t("contact.title")}
      lead={t("contact.lead")}
      schema={graph(siteSchema(), pageSchema("ContactPage", "/contact", t("contact.title"), t("contact.metaDescription"), locale))}
    >
      <div className="grid gap-10 md:grid-cols-[1fr_260px]">
        <ContactForm />
        <aside className="space-y-6 text-sm">
          <div>
            <h2 className="font-semibold">{t("common.email")}</h2>
            <a href={`mailto:${site.supportEmail}`} className="mt-1 block text-[var(--accent)] underline">{site.supportEmail}</a>
          </div>
          <div>
            <h2 className="font-semibold">{t("contact.responseTitle")}</h2>
            <p className="mt-1 text-[var(--muted)]">{t("contact.responseBody")}</p>
          </div>
          <div>
            <h2 className="font-semibold">{t("contact.guestsTitle")}</h2>
            <p className="mt-1 text-[var(--muted)]">{t("contact.guestsBody")}</p>
          </div>
          {site.companyAddress && (
            <div>
              <h2 className="font-semibold">{t("contact.address")}</h2>
              <p className="mt-1 whitespace-pre-line text-[var(--muted)]">{site.company}{"\n"}{site.companyAddress}</p>
            </div>
          )}
        </aside>
      </div>
    </PageShell>
  );
}
