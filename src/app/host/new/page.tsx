import { isSubscribed, requireHost } from "@/lib/auth";
import { hasPaymentMethods } from "@/lib/payMethods";
import Link from "next/link";
import { listProperties } from "@/lib/store";
import { seasonsInForce } from "@/lib/explain";
import { resolveProperty } from "@/lib/resolve";
import { CURATED } from "@/i18n/config";
import { getI18n, loadMessages } from "@/i18n/server";
import { makeT } from "@/i18n/translate";
import type { GuestTemplates } from "../SendPanel";
import QuickLinkForm from "./QuickLinkForm";
import RequestForm, { type PropertyOption } from "./RequestForm";
import { QUICK_CURRENCIES } from "@/lib/quick";

export const dynamic = "force-dynamic";

type SP = Record<string, string | undefined>;
const isDate = (v?: string) => (v && /^\d{4}-\d{2}-\d{2}$/.test(v) ? v : undefined);

// Opened from "Upcoming guests" with ?property=&checkin=&checkout=&ref= to prefill an imported booking.
export default async function NewRequest({ searchParams }: { searchParams: Promise<SP> }) {
  const sp = await searchParams;
  const prefill = { propertyId: sp.property, checkIn: isDate(sp.checkin), checkOut: isDate(sp.checkout), bookingRef: sp.ref?.slice(0, 60), guestName: sp.name?.slice(0, 120) };
  const quick = sp.quick === "1";
  const host = await requireHost();
  const { t, plan } = await getI18n();
  // The guest message in every hand-translated language, so the host can write to the guest in theirs.
  const templates: GuestTemplates = Object.fromEntries(
    await Promise.all(
      Object.entries(CURATED).map(async ([code, label]) => {
        const tt = makeT(code, (await loadMessages(code)).messages);
        return [
          code,
          {
            label,
            message: tt("send.message"),
            subject: tt("send.subject"),
            quickMessage: tt("send.messageQuick"),
            quickMessageAnon: tt("send.messageQuickAnon"),
            defaultTax: tt("quick.defaultTax"),
          },
        ];
      }),
    ),
  );
  const properties: PropertyOption[] = (await listProperties(host.id)).flatMap((p) => {
    const r = resolveProperty(p);
    if (!r) return [];
    const pct = r.acc.basis === "percent" ? (seasonsInForce(r.acc.seasons ?? [], new Date().toISOString().slice(0, 10))[0]?.percent ?? r.acc.percent) : undefined;
    return [{
      id: p.id,
      name: p.name,
      info: {
        flag: r.country.flag,
        place: r.region.name.split(" (")[0],
        accLabel: t.raw(`a:${r.acc.label}`),
        taxName: r.region.taxName,
        basis: r.acc.basis,
        percent: pct,
        currency: r.region.currency,
        minTaxableAge: r.region.minTaxableAge,
      },
    }];
  });
  return (
    <main className="mx-auto max-w-5xl px-4 py-8">
      <a href="/host" className="text-sm text-[var(--muted)] underline">
        ← {t("nav.dashboard")}
      </a>
      <h1 className="mb-6 mt-3 text-2xl font-semibold">{t("dash.newLink")}</h1>
      {!isSubscribed(host) ? (
        <div className="rounded-2xl border border-[var(--line)] bg-[var(--surface)] p-10 text-center">
          <p className="font-medium">{t("form.subscribeFirst")}</p>
          <p className="mt-1 text-sm text-[var(--muted)]">{t("auth.registerSub")}</p>
          <Link href="/host/account" className="mt-4 inline-block rounded-lg bg-[var(--accent)] px-4 py-2 text-sm font-semibold text-[var(--on-accent)]">{t("account.subscribe")}</Link>
        </div>
      ) : !hasPaymentMethods(host) ? (
        <div className="rounded-2xl border border-[var(--line)] bg-[var(--surface)] p-10 text-center">
          <p className="font-medium">{t("err.methodsFirst")}</p>
          <p className="mt-1 text-sm text-[var(--muted)]">{t("methods.intro")}</p>
          <Link href="/host/account#methods" className="mt-4 inline-block rounded-lg bg-[var(--accent)] px-4 py-2 text-sm font-semibold text-[var(--on-accent)]">{t("methods.add")}</Link>
        </div>
      ) : (
        <>
          <nav className="mb-6 inline-flex max-w-full flex-wrap rounded-xl border border-[var(--line)] bg-[var(--surface)] p-1 text-sm" aria-label={t("dash.newLink")}>
            {[
              { href: "/host/new", label: t("quick.tab.full"), active: !quick },
              { href: "/host/new?quick=1", label: t("quick.tab.quick"), active: quick },
            ].map((tab) => (
              <Link
                key={tab.href}
                href={tab.href}
                aria-current={tab.active ? "page" : undefined}
                className={`rounded-lg px-4 py-2 font-medium transition ${tab.active ? "bg-[var(--accent)] text-[var(--on-accent)]" : "text-[var(--muted)] hover:text-[var(--ink)]"}`}
              >
                {tab.label}
              </Link>
            ))}
          </nav>
          {quick ? (
            <QuickLinkForm templates={templates} defaultCurrency={(QUICK_CURRENCIES as readonly string[]).includes(plan.currency) ? plan.currency : "EUR"} />
          ) : properties.length ? (
            <RequestForm properties={properties} prefill={prefill} templates={templates} />
          ) : (
            <div className="rounded-2xl border border-dashed border-[var(--line)] bg-[var(--surface)] p-10 text-center">
              <p className="text-[var(--muted)]">{t("form.addFirst")}</p>
              <div className="mt-4 flex flex-wrap justify-center gap-3">
                <Link href="/host/properties/new" className="inline-block rounded-lg bg-[var(--accent)] px-4 py-2 text-sm font-semibold text-[var(--on-accent)]">+ {t("props.add")}</Link>
                <Link href="/host/new?quick=1" className="inline-block rounded-lg border border-[var(--line)] px-4 py-2 text-sm font-semibold">{t("quick.orQuick")}</Link>
              </div>
            </div>
          )}
        </>
      )}
    </main>
  );
}
