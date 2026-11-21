import CancelGuide from "@/components/CancelGuide";
import { getI18n } from "@/i18n/server";
import { date, type T } from "@/i18n/translate";
import { isSubscribed, requireHost } from "@/lib/auth";
import { settleDemoSubscription } from "@/lib/billing";
import { isDemoMode } from "@/lib/config";
import { formatPlan } from "@/lib/pricing";
import { cancel, openBillingPortal, resume, saveProfile, subscribe } from "./actions";

export async function generateMetadata() {
  const { t } = await getI18n();
  return { title: t("nav.account") };
}

type SP = Record<string, string | undefined>;

export default async function Account({ searchParams }: { searchParams: Promise<SP> }) {
  const host = await settleDemoSubscription(await requireHost());
  const { t, locale, plan } = await getI18n();
  const sp = await searchParams;
  const sub = host.subscription;
  const active = isSubscribed(host);
  // Subscribers see the price they signed up at; everyone else today's price in their currency.
  const price = sub.price && active ? formatPlan(sub.price.currency, sub.price.amount, locale) : plan.label;
  const fmt = (iso?: string) => (iso ? date(iso, locale, { day: "numeric", month: "long", year: "numeric" }) : "-");

  const notice =
    sp.welcome ? t("account.notice.welcome") :
    sp.subscribed ? t("account.notice.subscribed") :
    sp.cancelled ? t("account.notice.cancelled", { date: fmt(sub.currentPeriodEnd) }) :
    sp.resumed ? t("account.notice.resumed") :
    sp.saved ? t("account.notice.saved") :
    sp.cancelled_checkout ? t("account.notice.checkoutCancelled") : null;

  return (
    <main className="mx-auto max-w-3xl space-y-6 px-4 py-8">
      <h1 className="text-2xl font-semibold">{t("nav.account")}</h1>
      {notice && <p className="rounded-lg bg-emerald-400/10 p-3 text-sm text-emerald-300">{notice}</p>}

      <section className="rounded-2xl border border-[var(--line)] bg-[var(--surface)] p-6 shadow-sm">
        <h2 className="text-lg font-semibold">{t("account.subscription")}</h2>
        <div className="mt-3 flex flex-wrap items-baseline justify-between gap-3">
          <div>
            <div className="text-2xl font-semibold">{price} / {t("home.month")}</div>
            <div className="mt-1 text-sm">
              {t("account.status")} <StatusBadge t={t} status={sub.status} cancelling={!!sub.cancelAtPeriodEnd} />
            </div>
            {active && !sub.cancelAtPeriodEnd && <div className="mt-1 text-sm text-[var(--muted)]">{t("account.nextCharge", { amount: price, date: fmt(sub.currentPeriodEnd) })}</div>}
            {active && sub.cancelAtPeriodEnd && <div className="mt-1 text-sm text-[var(--muted)]">{t("account.accessUntil", { date: fmt(sub.currentPeriodEnd) })}</div>}
            {sub.status === "past_due" && <div className="mt-1 text-sm text-red-300">{t("account.paymentFailed")}</div>}
          </div>
          <div className="flex flex-wrap gap-2">
            {!active && (
              <form action={subscribe}>
                <button className="rounded-xl bg-[var(--accent)] px-5 py-3 font-semibold text-[var(--on-accent)] hover:brightness-110">{t("account.subscribeFor")}</button>
              </form>
            )}
            {active && sub.cancelAtPeriodEnd && (
              <form action={resume}>
                <button className="rounded-xl bg-[var(--accent)] px-5 py-3 font-semibold text-[var(--on-accent)] hover:brightness-110">{t("account.keep")}</button>
              </form>
            )}
            {active && !sub.cancelAtPeriodEnd && <CancelButton t={t} />}
            {active && !sub.demo && sub.stripeCustomerId && (
              <form action={openBillingPortal}>
                <button className="rounded-xl border border-[var(--line)] px-5 py-3 font-medium hover:bg-[var(--bg)]">{t("account.cardInvoices")}</button>
              </form>
            )}
          </div>
        </div>
        {(sub.demo || isDemoMode()) && <p className="mt-4 rounded-lg bg-sky-400/10 p-3 text-xs text-sky-200">{t("account.demo")}</p>}

        <div className="mt-6 border-t border-[var(--line)] pt-5">
          <h3 className="font-semibold">{t("account.howToCancel")}</h3>
          <div className="mt-2 text-sm">
            <CancelGuide compact />
          </div>
        </div>
      </section>

      <section className="rounded-2xl border border-[var(--line)] bg-[var(--surface)] p-6 shadow-sm">
        <h2 className="text-lg font-semibold">{t("account.details")}</h2>
        <p className="mt-1 text-sm text-[var(--muted)]">{t("account.detailsHint")}</p>
        <form action={saveProfile} className="mt-4 grid grid-cols-1 gap-4 sm:grid-cols-2">
          <label className="block">
            <span className="mb-1.5 block text-sm font-medium">{t("auth.name")}</span>
            <input name="name" className="input" defaultValue={host.name} required />
          </label>
          <label className="block">
            <span className="mb-1.5 block text-sm font-medium">{t("common.email")}</span>
            <input className="input" value={host.email} readOnly />
          </label>
          <label className="block">
            <span className="mb-1.5 block text-sm font-medium">{t("account.business")}</span>
            <input name="businessName" className="input" defaultValue={host.businessName ?? ""} placeholder="Seaview Rentals Ltd" />
          </label>
          <label className="block">
            <span className="mb-1.5 block text-sm font-medium">{t("account.taxId")}</span>
            <input name="taxId" className="input" defaultValue={host.taxId ?? ""} />
          </label>
          <div className="sm:col-span-2">
            <button className="rounded-xl bg-[var(--accent)] px-5 py-2.5 font-semibold text-[var(--on-accent)] hover:brightness-110">{t("account.save")}</button>
          </div>
        </form>
      </section>
    </main>
  );
}

function StatusBadge({ t, status, cancelling }: { t: T; status: string; cancelling: boolean }) {
  const [label, cls] =
    cancelling ? [t("account.badge.cancelling"), "bg-amber-400/15 text-amber-200"] :
    status === "active" || status === "trialing" ? [t("account.badge.active"), "bg-emerald-400/15 text-emerald-300"] :
    status === "past_due" ? [t("account.badge.failed"), "bg-red-500/15 text-red-300"] :
    status === "canceled" ? [t("account.badge.ended"), "bg-white/10 text-zinc-300"] :
    [t("account.badge.none"), "bg-white/10 text-zinc-300"];
  return <span className={`rounded-full px-2 py-0.5 text-xs font-medium ${cls}`}>{label}</span>;
}

/** Two-step cancel (no JS dialogs): open the details, then confirm. */
function CancelButton({ t }: { t: T }) {
  return (
    <details className="relative">
      <summary className="cursor-pointer list-none rounded-xl border border-[var(--line)] px-5 py-3 font-medium hover:bg-[var(--bg)]">{t("account.cancel")}</summary>
      <div className="absolute end-0 z-10 mt-2 w-72 rounded-xl border border-[var(--line)] bg-[var(--surface)] p-4 text-sm shadow-lg">
        <p>{t("account.cancelConfirmText")}</p>
        <form action={cancel} className="mt-3">
          <button className="w-full rounded-lg bg-red-600 px-4 py-2 font-semibold text-white hover:bg-red-700">{t("account.cancelConfirm")}</button>
        </form>
      </div>
    </details>
  );
}
