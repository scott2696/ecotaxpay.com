import Link from "next/link";
import CancelGuide from "@/components/CancelGuide";
import PayBadges from "@/components/PayBadges";
import type { MessageKey } from "@/i18n/messages/en";
import type { T } from "@/i18n/translate";
import { AirbnbIcon, BookingIcon } from "@/app/host/BrandIcons";
import { Arrow } from "./Hero";
import type { DemoCard } from "@/lib/demoQuote";
import type { Plan } from "@/lib/pricing";
import { COUNTRIES } from "@/lib/taxRules";
import LazyVideo from "./LazyVideo";

const k = (t: T, key: string, vars?: Record<string, string | number>) => t(key as MessageKey, vars);

const Eyebrow = ({ children }: { children: React.ReactNode }) => (
  <p data-reveal className="text-[12px] font-medium uppercase tracking-[0.28em] text-[var(--muted)]">{children}</p>
);

/** Features: an asymmetric, lit grid instead of identical cards. */
export function Features({ t, demo }: { t: T; demo: DemoCard }) {
  // Visitors outside the eurozone see their own destination first, and only percentage rates, never euro amounts.
  const tiles: string[][] =
    demo.currency === "EUR"
      ? [
          ["Malta", "€1.50", t("cap.amount", { amount: "€22.50" })],
          ["Lisbon", "€4.00", t("cap.nights.other", { count: 7 })],
          ["Amsterdam", "12.5%", t("explain.noCap").split(":")[0]],
        ]
      : [demo.tile, ["Amsterdam", "12.5%", t("explain.noCap").split(":")[0]], ["Berlin", "7.5%", t("explain.noCap").split(":")[0]]];
  const tile = "lit overflow-hidden rounded-[28px] p-8";
  return (
    <section className="mx-auto max-w-7xl px-5 py-28 sm:px-8 lg:py-40" aria-labelledby="features-title">
      <Eyebrow>{t("home.featuresTitle")}</Eyebrow>
      <h2 id="features-title" data-reveal className="mt-6 max-w-3xl text-[clamp(2.2rem,4.6vw,4rem)] font-semibold leading-[0.98] tracking-[-0.045em]">
        <span className="text-silver">{t("feat.title1")}</span> <span className="font-serif-italic text-silver-soft">{t("feat.title2")}</span>
      </h2>

      <div className="mt-16 grid gap-4 md:grid-cols-6">
        {/* Large: correct amount, with a live-looking calculation */}
        <article data-reveal className={`${tile} md:col-span-4 md:row-span-2`}>
          <h3 className="text-2xl font-medium tracking-tight">{t("home.feature.calc.title")}</h3>
          <p className="mt-3 max-w-md text-[var(--muted)]">{t("home.feature.calc.body")}</p>
          <div className="mt-10 grid gap-3 font-mono text-sm sm:grid-cols-3">
            {tiles.map(([city, rate, cap], i) => (
              <div key={city} className="rounded-2xl border border-[var(--line)] bg-black/30 p-4" style={{ ["--delay" as string]: `${i * 0.08}s` }}>
                <p className="font-sans text-xs uppercase tracking-[0.2em] text-[var(--muted)]">{city}</p>
                <p className="mt-3 text-3xl font-semibold text-silver">{rate}</p>
                <p className="mt-2 font-sans text-xs leading-snug text-[var(--muted)]">{cap}</p>
              </div>
            ))}
          </div>
        </article>

        <article data-reveal className={`${tile} md:col-span-2`} style={{ ["--delay" as string]: "0.08s" }}>
          <p className="text-6xl font-semibold tracking-[-0.05em] text-silver">{COUNTRIES.reduce((n, c) => n + c.regions.length, 0)}</p>
          <p className="mt-2 text-[var(--muted)]">{t("bento.destinations")}</p>
        </article>
        <article data-reveal className={`${tile} md:col-span-2`} style={{ ["--delay" as string]: "0.14s" }}>
          <p className="text-6xl font-semibold tracking-[-0.05em] text-silver">
            6<span className="font-serif-italic text-4xl text-silver-soft"> +130</span>
          </p>
          <p className="mt-2 text-[var(--muted)]">{t("bento.languages")}</p>
        </article>

        <article data-reveal className={`${tile} md:col-span-3`}>
          <div className="flex items-center gap-3">
            <span className="flex h-11 w-11 items-center justify-center rounded-2xl bg-white"><AirbnbIcon size={24} /></span>
            <span className="flex h-11 w-11 items-center justify-center rounded-2xl bg-white"><BookingIcon size={26} /></span>
          </div>
          <h3 className="mt-6 text-xl font-medium tracking-tight">{t("home.feature.calendars.title")}</h3>
          <p className="mt-2 text-[var(--muted)]">{t("home.feature.calendars.body")}</p>
        </article>
        <article data-reveal className={`${tile} md:col-span-3`} style={{ ["--delay" as string]: "0.08s" }}>
          <div className="flex h-11 items-center gap-2 font-mono text-xs text-[var(--muted)]">
            <span className="rounded-md border border-[var(--line)] px-2 py-1">RECEIPT</span>
            <span>No. 2026-000142</span>
          </div>
          <h3 className="mt-6 text-xl font-medium tracking-tight">{t("home.feature.receipts.title")}</h3>
          <p className="mt-2 text-[var(--muted)]">{t("home.feature.receipts.body")}</p>
        </article>

        <article data-reveal className={`${tile} md:col-span-2`}>
          <h3 className="text-xl font-medium tracking-tight">{t("home.feature.guide.title")}</h3>
          <p className="mt-2 text-[var(--muted)]">{t("home.feature.guide.body")}</p>
        </article>
        <article data-reveal className={`${tile} md:col-span-2`} style={{ ["--delay" as string]: "0.08s" }}>
          <h3 className="text-xl font-medium tracking-tight">{t("home.feature.docs.title")}</h3>
          <p className="mt-2 text-[var(--muted)]">{t("home.feature.docs.body")}</p>
        </article>
        <article data-reveal className={`${tile} md:col-span-2`} style={{ ["--delay" as string]: "0.16s" }}>
          <p className="text-6xl font-semibold tracking-[-0.05em] text-silver">0</p>
          <p className="mt-2 text-[var(--muted)]">{t("bento.cash")}</p>
        </article>
      </div>
    </section>
  );
}

/** Every destination, every language: the orbit film behind oversized type. */
export function Global({ t }: { t: T }) {
  return (
    <section className="grain relative isolate overflow-hidden border-y border-[var(--line)]" aria-labelledby="global-title">
      <LazyVideo src="/media/orbit.mp4" poster="/media/orbit-poster.jpg" className="absolute inset-0 -z-10 h-full w-full object-cover object-bottom" />
      <div className="absolute inset-0 -z-10 bg-gradient-to-b from-[var(--bg)] via-transparent to-[var(--bg)]" />
      <div className="mx-auto flex min-h-[90vh] max-w-7xl flex-col justify-start px-5 pb-[38vh] pt-32 sm:px-8">
        <Eyebrow>{t("global.eyebrow")}</Eyebrow>
        <h2 id="global-title" data-reveal className="mt-6 text-[clamp(2.6rem,7.5vw,7rem)] font-semibold leading-[0.92] tracking-[-0.05em]">
          <span className="block text-silver">{t("global.title1")}</span>
          <span className="block font-serif-italic text-silver-soft">{t("global.title2")}</span>
        </h2>
        <p data-reveal className="mt-8 max-w-xl text-lg leading-relaxed text-[var(--muted)]">{t("global.body")}</p>
        <div data-reveal className="mt-8 flex flex-wrap gap-2 text-sm">
          {["English", "Español", "Italiano", "Français", "Deutsch", "Malti", "+130"].map((l) => (
            <span key={l} className="rounded-full border border-[var(--line-strong)] bg-black/40 px-4 py-1.5 text-[var(--muted)] backdrop-blur-sm">{l}</span>
          ))}
        </div>
      </div>
    </section>
  );
}

const INCLUDED = ["apartments", "links", "calendars", "receipts", "export"] as const;

export function Pricing({ t, href, cta, plan }: { t: T; href: string; cta: string; plan: Plan }) {
  // Split "$3.30" / "3,30 €" into symbol and number, so the number can be set large.
  const parts = new Intl.NumberFormat(t.locale === "en" ? "en-GB" : t.locale, {
    style: "currency",
    currency: plan.currency,
    currencyDisplay: "narrowSymbol",
    minimumFractionDigits: Number.isInteger(plan.amount) ? 0 : 2,
    maximumFractionDigits: Number.isInteger(plan.amount) ? 0 : 2,
  }).formatToParts(plan.amount);
  const symbol = parts.filter((p) => p.type === "currency").map((p) => p.value).join("");
  const number = parts.filter((p) => !["currency", "literal"].includes(p.type)).map((p) => p.value).join("");
  const symbolAfter = parts.findIndex((p) => p.type === "currency") > parts.findIndex((p) => p.type === "integer");
  const big = number.length > 4 ? "text-[clamp(4rem,9vw,7rem)]" : "text-[clamp(6rem,14vw,10rem)]";
  return (
    <section id="pricing" className="mx-auto max-w-7xl scroll-mt-20 px-5 py-28 sm:px-8 lg:py-40" aria-labelledby="pricing-title">
      <div className="grid items-center gap-16 lg:grid-cols-2">
        <div>
          <Eyebrow>{t("home.nav.pricing")}</Eyebrow>
          <h2 id="pricing-title" data-reveal className="mt-6 text-[clamp(2.4rem,5vw,4.5rem)] font-semibold leading-[0.95] tracking-[-0.045em]">
            <span className="text-silver">{t("price.title1")}</span> <span className="font-serif-italic text-silver-soft">{t("price.title2")}</span>
          </h2>
          <p data-reveal className="mt-6 max-w-md text-lg text-[var(--muted)]">{t("home.pricingNote")}</p>
        </div>
        <div data-reveal className="lit rounded-[32px] p-10 sm:p-12">
          <div className="flex flex-wrap items-start gap-2" aria-label={`${plan.label} / ${t("home.month")}`}>
            {!symbolAfter && <span className="mt-4 text-3xl text-[var(--muted)]" aria-hidden>{symbol}</span>}
            <span className={`${big} font-semibold leading-[0.8] tracking-[-0.07em] text-silver`} aria-hidden>{number}</span>
            {symbolAfter && <span className="mt-4 text-3xl text-[var(--muted)]" aria-hidden>{symbol}</span>}
            <span className="mt-auto pb-3 text-lg text-[var(--muted)]" aria-hidden>/ {t("home.month")}</span>
          </div>
          {plan.currency !== "EUR" && <p className="mt-4 text-sm text-[var(--muted)]">{t("price.equiv")}</p>}
          <div className="hairline my-8" />
          <ul className="space-y-3">
            {INCLUDED.map((f) => (
              <li key={f} className="flex items-center gap-3 text-[var(--ink)]">
                <span className="flex h-5 w-5 items-center justify-center rounded-full border border-[var(--line-strong)] text-[10px]">✓</span>
                {k(t, `home.included.${f}`)}
              </li>
            ))}
          </ul>
          <Link href={href} className="btn-silver mt-10 h-14 w-full text-[15px]">{cta} <Arrow /></Link>
          <p className="mt-4 text-center text-sm text-[var(--muted)]">{t("home.noContract")}</p>
          <div className="mt-6 flex flex-col items-center gap-2 border-t border-[var(--line)] pt-5">
            <PayBadges />
            <p className="text-center text-xs text-[var(--muted)]">{t("sub.methods")}</p>
          </div>
        </div>
      </div>
    </section>
  );
}

export const FAQ_IDS = ["cost", "quick", "who", "pay", "where", "calendars", "cancel", "contract"] as const;

export function Faq({ t }: { t: T }) {
  return (
    <section id="faq" className="mx-auto max-w-4xl scroll-mt-20 px-5 py-28 sm:px-8 lg:py-36" aria-labelledby="faq-title">
      <Eyebrow>{t("home.nav.faq")}</Eyebrow>
      <h2 id="faq-title" data-reveal className="mt-6 text-[clamp(2.2rem,4.5vw,3.8rem)] font-semibold tracking-[-0.045em] text-silver">{t("home.faqTitle")}</h2>
      <div className="mt-12 border-t border-[var(--line)]">
        {FAQ_IDS.map((id) => (
          <details key={id} className="group border-b border-[var(--line)]" open={id === "cancel" || id === "quick"}>
            <summary className="flex cursor-pointer list-none items-center justify-between gap-6 py-7 text-lg font-medium tracking-tight sm:text-xl">
              {k(t, `home.faq.${id}.q`)}
              <span className="relative flex h-8 w-8 shrink-0 items-center justify-center rounded-full border border-[var(--line-strong)] transition-transform duration-500 group-open:rotate-45" aria-hidden>
                <span className="absolute h-px w-3 bg-[var(--ink)]" />
                <span className="absolute h-3 w-px bg-[var(--ink)]" />
              </span>
            </summary>
            <div className="max-w-2xl pb-8 leading-relaxed text-[var(--muted)]">{id === "cancel" ? <CancelGuide /> : k(t, `home.faq.${id}.a`)}</div>
          </details>
        ))}
      </div>
    </section>
  );
}

/** Closing call to action over the black-marble corridor. */
export function FinalCta({ t, href, cta }: { t: T; href: string; cta: string }) {
  return (
    <section className="grain relative isolate overflow-hidden" aria-labelledby="final-title">
      <picture>
        <source srcSet="/media/corridor.avif" type="image/avif" />
        <img src="/media/corridor.jpg" alt="" loading="lazy" decoding="async" width={1920} height={1080} className="absolute inset-0 -z-10 h-full w-full object-cover" />
      </picture>
      <div className="absolute inset-0 -z-10 bg-gradient-to-b from-[var(--bg)] via-[rgba(5,5,6,0.35)] to-[var(--bg)]" />
      <div className="mx-auto flex min-h-[80vh] max-w-5xl flex-col items-center justify-center px-5 py-32 text-center">
        <h2 id="final-title" data-reveal className="text-[clamp(2.8rem,8vw,7rem)] font-semibold leading-[0.95] tracking-[-0.055em]">
          <span className="block text-silver">{t("final.title1")}</span>
          <span className="block font-serif-italic text-silver-soft">{t("final.title2")}</span>
        </h2>
        <p data-reveal className="mt-8 max-w-lg text-lg text-[var(--muted)]">{t("final.body")}</p>
        <div data-reveal className="mt-10 flex flex-wrap justify-center gap-3">
          <Link href={href} className="btn-silver h-14 px-8 text-[15px]">{cta} <Arrow /></Link>
          <Link href="/contact" className="btn-ghost h-14 px-7 text-[15px]">{t("nav.contact")}</Link>
        </div>
      </div>
    </section>
  );
}

/** After payment: the three things every guest receives automatically. */
export function AfterPayment({ t, demo: d }: { t: T; demo: DemoCard }) {
  const card = "lit flex flex-col overflow-hidden rounded-[28px] p-6 sm:p-7";
  return (
    <section className="mx-auto max-w-7xl px-5 py-24 sm:px-8 lg:py-32" aria-labelledby="after-title">
      <Eyebrow>{t("after.eyebrow")}</Eyebrow>
      <h2 id="after-title" data-reveal className="mt-6 max-w-3xl text-[clamp(2.2rem,4.6vw,4rem)] font-semibold leading-[0.98] tracking-[-0.045em]">
        <span className="text-silver">{t("after.title1")}</span> <span className="font-serif-italic text-silver-soft">{t("after.title2")}</span>
      </h2>
      <p data-reveal className="mt-6 max-w-xl text-lg text-[var(--muted)]">{t("after.intro")}</p>

      <div className="mt-14 grid gap-4 lg:grid-cols-3">
        {/* 1. Confirmation email */}
        <article data-reveal className={card}>
          <div className="rounded-2xl border border-[var(--line)] bg-black/40 p-4 text-[12px]">
            <div className="flex items-center gap-2.5">
              <span className="flex h-8 w-8 items-center justify-center rounded-full bg-white/10 text-[11px] font-semibold">ET</span>
              <div className="min-w-0">
                <p className="font-semibold">Eco Tax Pay</p>
                <p className="truncate text-[var(--muted)]">{t("email.subjectGuide", { property: d.propertyShort })}</p>
              </div>
            </div>
            <p className="mt-3 leading-relaxed text-[var(--muted)]">
              {t("email.hi", { name: d.guestFirst })} {t("email.thanks", { amount: d.amount, tax: d.taxName, from: d.fromShort, to: d.toShort })}
            </p>
            <div className="mt-3 flex items-center gap-2 rounded-lg border border-[var(--line)] bg-white/[0.04] px-3 py-2">
              <span className="rounded bg-red-500/80 px-1.5 py-0.5 text-[9px] font-bold text-white">PDF</span>
              <span className="truncate">receipt-{d.receiptNo}.pdf</span>
            </div>
            <p className="mt-3 text-[var(--accent)] underline underline-offset-2">{t("email.viewOnline")}</p>
          </div>
          <h3 className="mt-6 text-xl font-medium tracking-tight">{t("after.email.title")}</h3>
          <p className="mt-2 text-[var(--muted)]">{t("after.email.body")}</p>
        </article>

        {/* 2. PDF receipt (printed on paper, so it stays light) */}
        <article data-reveal className={card} style={{ ["--delay" as string]: "0.08s" }}>
          <div className="rotate-[-1.5deg] rounded-xl bg-[#f5f5f2] p-5 font-sans text-[11px] text-[#1b1c1f] shadow-[0_30px_60px_-20px_rgba(0,0,0,0.8)]">
            <div className="flex items-start justify-between">
              <div>
                <p className="text-[13px] font-bold tracking-tight">{d.taxName}</p>
                <p className="text-[#6b6e75]">{t("receipt.title")} · {t("receipt.no", { number: d.receiptNo })}</p>
              </div>
              <span className="rounded border border-emerald-700/30 bg-emerald-50 px-1.5 py-0.5 text-[9px] font-semibold text-emerald-800">PAID</span>
            </div>
            <div className="mt-3 grid grid-cols-2 gap-2 border-y border-black/10 py-2 text-[10px]">
              <div><p className="text-[#6b6e75]">{t("receipt.guest")}</p><p className="font-medium">{d.guest}</p></div>
              <div><p className="text-[#6b6e75]">{t("receipt.property")}</p><p className="font-medium">{d.propertyShort}</p></div>
              <div><p className="text-[#6b6e75]">{t("receipt.checkIn")}</p><p className="font-medium">{d.fromLong}</p></div>
              <div><p className="text-[#6b6e75]">{t("receipt.checkOut")}</p><p className="font-medium">{d.toLong}</p></div>
            </div>
            <div className="mt-2 flex justify-between text-[10px]"><span className="me-3">{d.formula}</span><span className="whitespace-nowrap">{d.amount}</span></div>
            <div className="mt-2 flex justify-between border-t border-black/10 pt-2 text-[12px] font-bold"><span>{t("receipt.total")}</span><span>{d.amount}</span></div>
          </div>
          <h3 className="mt-7 text-xl font-medium tracking-tight">{t("after.receipt.title")}</h3>
          <p className="mt-2 text-[var(--muted)]">{t("after.receipt.body")}</p>
        </article>

        {/* 3. Arrival guide */}
        <article data-reveal className={card} style={{ ["--delay" as string]: "0.16s" }}>
          <div className="space-y-2.5 rounded-2xl border border-[var(--line)] bg-black/40 p-4 text-[12px]">
            <p className="text-[10px] uppercase tracking-[0.2em] text-[var(--muted)]">{t("guest.guideTitle")}</p>
            <div className="flex justify-between gap-3">
              <div><p className="font-medium">📍 {t("guide.address")}</p><p className="text-[var(--muted)]">{d.local.address}</p></div>
              <span className="self-start whitespace-nowrap rounded-full border border-[var(--line-strong)] px-2 py-0.5 text-[10px]">Maps ↗</span>
            </div>
            <div><p className="font-medium">🚕 {t("guide.directions")}</p><p className="text-[var(--muted)]">{d.local.directions}</p></div>
            <div className="rounded-xl border border-white/[0.1] bg-white/[0.05] p-2.5"><p className="font-medium">🔑 {t("guide.access")}</p><p className="text-[var(--muted)]">Key box · <span className="font-mono text-[var(--ink)]">4821</span></p></div>
            <div><p className="font-medium">📶 {t("guide.wifi")}</p><p className="text-[var(--muted)]">{d.local.wifi}</p></div>
            <div><p className="font-medium">📞 {t("guide.contact")}</p><p className="text-[var(--muted)]">{d.local.phone}</p></div>
            <div><p className="font-medium">📝 {t("gf.sugg.parking")}</p><p className="text-[var(--muted)]">{d.local.parking}</p></div>
          </div>
          <h3 className="mt-6 text-xl font-medium tracking-tight">{t("after.guide.title")}</h3>
          <p className="mt-2 text-[var(--muted)]">{t("after.guide.body")}</p>
        </article>
      </div>
    </section>
  );
}
