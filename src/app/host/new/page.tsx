import { isSubscribed, requireHost } from "@/lib/auth";
import { hasPaymentMethods } from "@/lib/payMethods";
import Link from "next/link";
import Icon from "@/components/Icon";
import PageHeader, { PageBody } from "@/components/PageHeader";
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
    <PageBody>
      <PageHeader back={{ href: "/host", label: t("nav.dashboard") }} title={t("dash.newLink")} description={t("form.pageSub")} />
      {!isSubscribed(host) ? (
        <div className="panel flex flex-col items-center p-10 text-center">
          <span className="icon-chip mb-4"><Icon name="lock" size={17} /></span>
          <p className="font-medium">{t("form.subscribeFirst")}</p>
          <p className="mt-1 text-sm text-[var(--muted)]">{t("auth.registerSub")}</p>
          <Link href="/host/account" className="btn btn-primary mt-4">{t("account.subscribe")}</Link>
        </div>
      ) : !hasPaymentMethods(host) ? (
        <div className="panel flex flex-col items-center p-10 text-center">
          <span className="icon-chip mb-4"><Icon name="wallet" size={17} /></span>
          <p className="font-medium">{t("err.methodsFirst")}</p>
          <p className="mt-1 text-sm text-[var(--muted)]">{t("methods.intro")}</p>
          <Link href="/host/account#methods" className="btn btn-primary mt-4">{t("methods.add")}</Link>
        </div>
      ) : (
        <>
          <nav className="seg mb-6 max-w-full" aria-label={t("dash.newLink")}>
            {[
              { href: "/host/new", label: t("quick.tab.full"), active: !quick, icon: "calendar" as const },
              { href: "/host/new?quick=1", label: t("quick.tab.quick"), active: quick, icon: "zap" as const },
            ].map((tab) => (
              <Link key={tab.href} href={tab.href} aria-current={tab.active ? "page" : undefined} className="!h-9 !px-4">
                <Icon name={tab.icon} size={15} /> {tab.label}
              </Link>
            ))}
          </nav>
          {quick ? (
            <QuickLinkForm templates={templates} defaultCurrency={(QUICK_CURRENCIES as readonly string[]).includes(plan.currency) ? plan.currency : "EUR"} />
          ) : properties.length ? (
            <RequestForm properties={properties} prefill={prefill} templates={templates} />
          ) : (
            <div className="panel flex flex-col items-center border-dashed p-10 text-center">
              <span className="icon-chip mb-4"><Icon name="building" size={17} /></span>
              <p className="text-[var(--muted)]">{t("form.addFirst")}</p>
              <div className="mt-5 flex flex-wrap justify-center gap-2">
                <Link href="/host/properties/new" className="btn btn-primary"><Icon name="plus" size={15} /> {t("props.add")}</Link>
                <Link href="/host/new?quick=1" className="btn btn-secondary"><Icon name="zap" size={15} /> {t("quick.orQuick")}</Link>
              </div>
            </div>
          )}
        </>
      )}
    </PageBody>
  );
}
