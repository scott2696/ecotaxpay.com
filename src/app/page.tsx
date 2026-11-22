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
import { graph, LANGUAGES, pageMeta, pageSchema, siteSchema } from "@/lib/seo";
import { PLATFORMS } from "@/lib/platforms";
import { COUNTRIES } from "@/lib/taxRules";
import { appHref } from "@/lib/urls";

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
  const primary = host ? { href: appHref("/host"), label: t("home.toDashboard") } : { href: appHref("/register"), label: t("home.start") };

  // Product + FAQ structured data (the FAQ text matches what's shown on the page).
  const faqText = (id: string) => (id === "cancel" ? [1, 2, 3].map((n) => k(`cancel.step${n}`).replace(/\*\*/g, "")).join(" ") : k(`home.faq.${id}.a`));
  const schema = graph(siteSchema(), pageSchema("WebPage", "/", t("home.metaTitle", { brand: site.name }), t("home.metaDescription"), locale), [
    {
      "@type": "SoftwareApplication",
      "@id": `${site.baseUrl}/#app`,
      name: site.name,
      applicationCategory: "BusinessApplication",
      applicationSubCategory: "Tourist tax collection for holiday rentals",
      operatingSystem: "Web browser (desktop and mobile)",
      description: t("home.metaDescription"),
      url: site.baseUrl,
      image: `${site.baseUrl}/media/og.jpg`,
      screenshot: `${site.baseUrl}/media/og.jpg`,
      inLanguage: LANGUAGES,
      audience: { "@type": "BusinessAudience", audienceType: "Holiday-rental hosts, guest houses, B&Bs and small hotels" },
      areaServed: [...COUNTRIES.map((c) => ({ "@type": "Country", name: c.name })), { "@type": "Place", name: "Worldwide (custom tax rates)" }],
      featureList: [
        `Automatic tourist / eco tax calculation for ${COUNTRIES.length} countries, or a custom rate anywhere`,
        "Personal payment links for guests in their own language",
        "Guests pay the host directly: Visa, Mastercard, Amex, Apple Pay, Google Pay (via the host's card link), bank transfer, Revolut, PayPal, Wise, Bizum, MB WAY, Satispay, TWINT, Wero",
        `Calendar sync with ${PLATFORMS.length - 1}+ platforms: Airbnb, Booking.com, Vrbo, Misterb&b, Expedia, Agoda, channel managers and any iCal link`,
        "Numbered PDF receipts by email and WhatsApp",
        "Optional passport / ID collection",
        "Private arrival guide after payment",
        "Stays by period and CSV export for accountants",
      ],
      offers: {
        "@type": "Offer",
        url: `${site.baseUrl}/register`,
        price: "3.00",
        priceCurrency: "EUR",
        availability: "https://schema.org/InStock",
        category: "subscription",
        priceSpecification: { "@type": "UnitPriceSpecification", price: "3.00", priceCurrency: "EUR", billingDuration: "P1M", unitText: "MONTH", referenceQuantity: { "@type": "QuantitativeValue", value: 1, unitCode: "MON" } },
        seller: { "@id": `${site.baseUrl}/#organization` },
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
