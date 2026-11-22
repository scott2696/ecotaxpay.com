import CancelGuide from "@/components/CancelGuide";
import { getI18n } from "@/i18n/server";
import { date, type T } from "@/i18n/translate";
import { isAdmin, isSubscribed, requireHost } from "@/lib/auth";
import { confirmSubscriptionCheckout, settleDemoSubscription } from "@/lib/billing";
import { isDemoMode } from "@/lib/config";
import { activeMethods, PHONE_APP_NAMES, PHONE_APPS } from "@/lib/payMethods";
import PayBadges, { BRAND_NAMES, CARD_BRANDS, MethodLogo } from "@/components/PayBadges";
import type { CardBrandId } from "@/lib/store";
import { formatPlan } from "@/lib/pricing";
import { cancel, openBillingPortal, resume, saveProfile, savePaymentMethods, subscribe } from "./actions";
import MethodsForm from "./MethodsForm";

export async function generateMetadata() {
  const { t } = await getI18n();
  return { title: t("nav.account") };
}

type SP = Record<string, string | undefined>;

export default async function Account({ searchParams }: { searchParams: Promise<SP> }) {
  const sp0 = await searchParams;
  let host = await settleDemoSubscription(await requireHost());
  // Back from Stripe Checkout: activate straight away (the webhook will confirm the same thing).
  if (sp0.session_id) host = await confirmSubscriptionCheckout(host, sp0.session_id);
  const pm = host.paymentMethods ?? {};
  const methodsOn = activeMethods(host.paymentMethods).length > 0;
  const { t, locale, plan } = await getI18n();
  const sp = await searchParams;
  const sub = host.subscription;
  const admin = isAdmin(host);
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
    sp.cancelled_checkout ? t("account.notice.checkoutCancelled") :
    sp.methodsSaved ? t("methods.saved") : null;
  const badFields = new Set((sp.methodsError ?? "").split(",").filter(Boolean));

  return (
    <main className="mx-auto max-w-3xl space-y-6 px-4 py-8">
      <h1 className="text-2xl font-semibold">{t("nav.account")}</h1>
      {notice && <p className="rounded-lg bg-emerald-400/10 p-3 text-sm text-emerald-300">{notice}</p>}

      <section className="rounded-2xl border border-[var(--line)] bg-[var(--surface)] p-6 shadow-sm">
        <h2 className="text-lg font-semibold">{t("account.subscription")}</h2>
        {admin ? (
          <div className="mt-3">
            <span className="rounded-full bg-emerald-400/15 px-2.5 py-1 text-xs font-medium text-emerald-300">{t("account.badge.admin")}</span>
            <p className="mt-2 text-sm text-[var(--muted)]">{t("account.adminText")}</p>
          </div>
        ) : (
        <>
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
        {!active && (
          <div className="mt-4 flex flex-wrap items-center gap-3">
            <PayBadges />
            <span className="text-xs text-[var(--muted)]">{t("sub.methods")}</span>
          </div>
        )}
        </>
        )}
        {!admin && (sub.demo || isDemoMode()) && <p className="mt-4 rounded-lg bg-sky-400/10 p-3 text-xs text-sky-200">{t("account.demo")}</p>}

      </section>


      <section id="methods" className="rounded-2xl border border-[var(--line)] bg-[var(--surface)] p-6 shadow-sm">
        <div className="flex flex-wrap items-center justify-between gap-2">
          <h2 className="text-lg font-semibold">{t("methods.title")}</h2>
          <span className={`rounded-full px-2 py-0.5 text-xs font-medium ${methodsOn ? "bg-emerald-400/15 text-emerald-300" : "bg-amber-400/15 text-amber-200"}`}>
            {methodsOn ? t("methods.badge.on") : t("methods.badge.off")}
          </span>
        </div>
        <p className="mt-1 text-sm text-[var(--muted)]">{t("methods.intro")}</p>
        <MethodsForm
          action={savePaymentMethods}
          labels={{ save: t("methods.save"), saving: t("common.wait"), saved: t("methods.saved"), invalid: t("methods.invalid") }}
        >
          <Method saveLabel={t("upcoming.saveName")} name="cardOn" logo="card" on={!!pm.card} title={t("method.card")} badges>
            <p className="text-sm text-[var(--muted)] sm:col-span-2">{t("methods.cardHint")}</p>
            <Input name="cardProvider" label={t("methods.cardProvider")} value={pm.card?.provider} placeholder="SumUp, Square, Viva Wallet, myPOS, Stripe…" />
            <Input name="cardUrl" label={t("methods.linkUrl")} value={pm.card?.url} bad={badFields.has("cardUrl")} placeholder="https://pay.sumup.com/…" />
            <Brands prefix="card" selected={pm.card?.brands} legend={t("methods.brands")} />
          </Method>
          <Method saveLabel={t("upcoming.saveName")} name="bankOn" logo="bank" on={!!pm.bank} title={t("method.bank")}>
            <p className="text-sm text-[var(--muted)] sm:col-span-2">{t("methods.bankHint")}</p>
            <Input name="holder" label={t("methods.holder")} value={pm.bank?.holder} bad={badFields.has("holder")} />
            <Input name="holderAddress" label={t("methods.holderAddress")} value={pm.bank?.holderAddress} bad={badFields.has("holderAddress")} placeholder={t("methods.townCountryPh")} />
            {/* Account format: IBAN (Europe and most countries), UK sort code, or US routing number. */}
            <div className="group/bank grid grid-cols-1 gap-3 sm:col-span-2 sm:grid-cols-2">
              <fieldset className="sm:col-span-2">
                <legend className="mb-1.5 text-sm">{t("methods.accountType")}</legend>
                <div className="flex flex-wrap gap-2">
                  {([["iban", t("methods.type.iban")], ["uk", t("methods.type.uk")], ["us", t("methods.type.us")]] as const).map(([v, label]) => (
                    <label key={v} className="flex cursor-pointer items-center gap-2 rounded-lg border border-[var(--line)] px-3 py-1.5 text-sm has-[:checked]:border-[var(--accent)]">
                      <input type="radio" id={`bt-${v}`} name="bankType" value={v} defaultChecked={(pm.bank?.accountType ?? "iban") === v} className="accent-[var(--accent)]" />
                      {label}
                    </label>
                  ))}
                </div>
              </fieldset>
              <div className="hidden sm:col-span-2 group-has-[#bt-iban:checked]/bank:block">
                <Input name="iban" label="IBAN" value={pm.bank?.iban} bad={badFields.has("iban")} placeholder="MT84 MALT 0110 0001 2345 MTLC AST0 01S" mono />
              </div>
              <div className="hidden group-has-[#bt-uk:checked]/bank:block">
                <Input name="sortCode" label={t("methods.sortCode")} value={pm.bank?.sortCode} bad={badFields.has("sortCode")} placeholder="12-34-56" mono />
              </div>
              <div className="hidden group-has-[#bt-us:checked]/bank:block">
                <Input name="routingNumber" label={t("methods.routing")} value={pm.bank?.routingNumber} bad={badFields.has("routingNumber")} placeholder="021000021" mono />
              </div>
              <div className="hidden group-has-[#bt-uk:checked]/bank:block group-has-[#bt-us:checked]/bank:block">
                <Input name="accountNumber" label={t("methods.accountNumber")} value={pm.bank?.accountNumber} bad={badFields.has("accountNumber")} placeholder="12345678" mono />
              </div>
            </div>
            <Input name="bic" label="BIC / SWIFT" value={pm.bank?.bic} bad={badFields.has("bic")} placeholder="VALLMTMT" mono />
            <Input name="bankName" label={t("methods.bankName")} value={pm.bank?.bankName} bad={badFields.has("bankName")} placeholder="Bank of Valletta" />
            <div className="sm:col-span-2">
              <Input name="bankAddress" label={t("methods.bankAddress")} value={pm.bank?.bankAddress} bad={badFields.has("bankAddress")} placeholder={t("methods.bankAddressPh")} />
            </div>
          </Method>
          <Method saveLabel={t("upcoming.saveName")} name="revolutOn" logo="revolut" on={!!pm.revolut} title={t("method.revolut")}>
            <Input name="revolut" label={t("methods.revtag")} value={pm.revolut ? `@${pm.revolut}` : ""} bad={badFields.has("revolut")} placeholder="@yourname" />
          </Method>
          <Method saveLabel={t("upcoming.saveName")} name="paypalOn" logo="paypal" on={!!pm.paypal} title={t("method.paypal")}>
            <Input name="paypal" label={t("methods.paypalMe")} value={pm.paypal ? `paypal.me/${pm.paypal}` : ""} bad={badFields.has("paypal")} placeholder="paypal.me/yourname" />
          </Method>
          <Method saveLabel={t("upcoming.saveName")} name="wiseOn" logo="wise" on={!!pm.wise} title={t("method.wise")}>
            <Input name="wise" label={t("methods.wiseLink")} value={pm.wise} bad={badFields.has("wise")} placeholder="https://wise.com/pay/me/yourname" />
          </Method>
          {PHONE_APPS.map((app) => (
            <Method saveLabel={t("upcoming.saveName")} key={app} name={`${app}On`} logo={app} on={!!pm[app]} title={PHONE_APP_NAMES[app]}>
              <Input name={app} label={app === "wero" ? t("methods.phoneOrEmail") : t("methods.phone")} value={pm[app]} bad={badFields.has(app)} placeholder={app === "wero" ? "+356 9912 3456 / you@example.com" : "+34 612 345 678"} />
            </Method>
          ))}
          <Method saveLabel={t("upcoming.saveName")} name="linkOn" logo="link" on={!!pm.link} title={t("method.link")}>
            <Input name="linkLabel" label={t("methods.linkLabel")} value={pm.link?.label} placeholder="SumUp, Satispay, …" />
            <Input name="linkUrl" label={t("methods.linkUrl")} value={pm.link?.url} bad={badFields.has("linkUrl")} placeholder="https://…" />
          </Method>
          <label className="block">
            <span className="mb-1.5 block text-sm font-medium">{t("methods.note")} <span className="text-[var(--muted)]">{t("common.optional")}</span></span>
            <textarea name="note" className="input min-h-20" defaultValue={pm.note ?? ""} maxLength={500} placeholder={t("methods.notePlaceholder")} />
          </label>
        </MethodsForm>
        <p className="mt-4 text-xs text-[var(--muted)]">{t("methods.howItWorks")}</p>
      </section>

      <section id="cancel" className="rounded-2xl border border-[var(--line)] bg-[var(--surface)] p-6 shadow-sm">
        <h2 className="text-lg font-semibold">{t("account.howToCancel")}</h2>
        <div className="mt-2 text-sm">
          <CancelGuide compact />
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

/** One payment method: a checkbox that reveals its fields (no JS needed). */
function Method({ name, logo, on, title, badges, saveLabel, children }: { name: string; logo: string; on: boolean; title: string; badges?: boolean; saveLabel: string; children: React.ReactNode }) {
  return (
    <div className="group rounded-xl border border-[var(--line)] p-4 has-[.method-toggle:checked]:border-[var(--accent)]">
      <label className="flex cursor-pointer items-center gap-3 font-medium">
        <input type="checkbox" name={name} defaultChecked={on} className="method-toggle h-4 w-4 accent-[var(--accent)]" />
        <MethodLogo id={logo} />
        {title}
        {badges && <PayBadges className="ms-auto" />}
      </label>
      <div className="mt-3 hidden grid-cols-1 gap-3 group-has-[.method-toggle:checked]:grid sm:grid-cols-2">
        {children}
        <div className="flex justify-end sm:col-span-2">
          <button className="rounded-lg border border-[var(--line-strong)] px-4 py-2 text-sm font-semibold hover:bg-[var(--soft)]">{saveLabel}</button>
        </div>
      </div>
    </div>
  );
}

/** Which cards / wallets the host's provider accepts (defaults to Visa, Mastercard, Apple Pay, Google Pay). */
function Brands({ prefix, selected, legend }: { prefix: string; selected?: CardBrandId[]; legend: string }) {
  const on = new Set(selected ?? ["visa", "mastercard", "applepay", "googlepay"]);
  return (
    <fieldset className="sm:col-span-2">
      <legend className="mb-1.5 text-sm">{legend}</legend>
      <div className="flex flex-wrap gap-2">
        {CARD_BRANDS.map((b) => (
          <label key={b} className="flex cursor-pointer items-center gap-2 rounded-lg border border-[var(--line)] px-2.5 py-1.5 text-sm has-[:checked]:border-[var(--accent)]">
            <input type="checkbox" name={`${prefix}_${b}`} defaultChecked={on.has(b)} className="accent-[var(--accent)]" />
            <PayBadges brands={[b]} />
            <span className="sr-only">{BRAND_NAMES[b]}</span>
          </label>
        ))}
      </div>
    </fieldset>
  );
}

function Input({ name, label, value, bad, placeholder, mono }: { name: string; label: string; value?: string; bad?: boolean; placeholder?: string; mono?: boolean }) {
  return (
    <label className="block">
      <span className="mb-1.5 block text-sm">{label}</span>
      <input name={name} className={`input ${mono ? "font-mono text-sm" : ""} ${bad ? "border-red-400" : ""}`} defaultValue={value ?? ""} placeholder={placeholder} aria-invalid={bad || undefined} />
    </label>
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
