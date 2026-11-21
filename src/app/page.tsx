import type { Metadata } from "next";
import JsonLd from "@/components/JsonLd";
import SiteFooter from "@/components/SiteFooter";
import SiteHeader from "@/components/SiteHeader";
import Hero from "@/components/home/Hero";
import { AfterPayment, FAQ_IDS, Faq, Features, FinalCta, Global, Pricing } from "@/components/home/Sections";
import Showcase from "@/components/home/Showcase";
import Statement from "@/components/home/Statement";
import type { MessageKey } from "@/i18n/messages/en";
import { getI18n } from "@/i18n/server";
import { currentHost } from "@/lib/auth";
import { demoCard } from "@/lib/demoQuote";
import { visitorCountry } from "@/lib/geo";
import { site } from "@/lib/config";
import { graph, pageMeta, pageSchema, siteSchema } from "@/lib/seo";

export async function generateMetadata(): Promise<Metadata> {
  const { t } = await getI18n();
  const meta = pageMeta("/", t("home.metaTitle", { brand: site.name }), t("home.metaDescription"));
  return { ...meta, openGraph: { ...meta.openGraph, images: [{ url: "/media/og.jpg", width: 1200, height: 630 }] } };
}

export default async function Home() {
  const host = await currentHost();
  const { t, locale, plan } = await getI18n();
  // Sample stay for the visitor's country (?country=ES previews another one).
  const card = demoCard(await visitorCountry(), t);
  const k = (key: string) => t(key as MessageKey);
  const primary = host ? { href: "/host", label: t("home.toDashboard") } : { href: "/register", label: t("home.start") };

  // Product + FAQ structured data (the FAQ text matches what's shown on the page).
  const faqText = (id: string) => (id === "cancel" ? [1, 2, 3].map((n) => k(`cancel.step${n}`).replace(/\*\*/g, "")).join(" ") : k(`home.faq.${id}.a`));
  const schema = graph(siteSchema(), pageSchema("WebPage", "/", t("home.metaTitle", { brand: site.name }), t("home.metaDescription"), locale), [
    {
      "@type": "SoftwareApplication",
      name: site.name,
      applicationCategory: "BusinessApplication",
      operatingSystem: "Web",
      description: t("home.metaDescription"),
      url: site.baseUrl,
      image: `${site.baseUrl}/media/og.jpg`,
      offers: {
        "@type": "Offer",
        price: "3.00",
        priceCurrency: "EUR",
        priceSpecification: { "@type": "UnitPriceSpecification", price: "3.00", priceCurrency: "EUR", billingDuration: "P1M", unitText: "MONTH" },
      },
      publisher: { "@id": `${site.baseUrl}/#organization` },
    },
    {
      "@type": "FAQPage",
      mainEntity: FAQ_IDS.map((id) => ({ "@type": "Question", name: k(`home.faq.${id}.q`), acceptedAnswer: { "@type": "Answer", text: faqText(id) } })),
    },
  ]);

  return (
    <div className="bg-[var(--bg)]">
      <JsonLd data={schema} />
      <SiteHeader />
      <main>
        <Hero card={card} />
        <Showcase demo={card} />
        <AfterPayment t={t} demo={card} />
        <Statement eyebrow={t("statement.eyebrow")} text={t("statement.text")} />
        <Features t={t} demo={card} />
        <Global t={t} />
        <Pricing t={t} href={primary.href} cta={primary.label} plan={plan} />
        <Faq t={t} />
        <FinalCta t={t} href={primary.href} cta={primary.label} />
      </main>
      <SiteFooter />
    </div>
  );
}
