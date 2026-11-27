import CancelGuide from "@/components/CancelGuide";
import Icon, { type IconName } from "@/components/Icon";
import PageHeader, { PageBody } from "@/components/PageHeader";
import CardWalletTip from "./CardWalletTip";
import { getI18n } from "@/i18n/server";
import { date, type T } from "@/i18n/translate";
import { isAdmin, isSubscribed, requireHost } from "@/lib/auth";
import { confirmSubscriptionCheckout, settleDemoSubscription } from "@/lib/billing";
import { activeMethods, METHOD_ORDER, methodTitle, PHONE_APP_NAMES, PHONE_APPS } from "@/lib/payMethods";
import PayBadges, { BRAND_NAMES, CARD_BRANDS, MethodLogo } from "@/components/PayBadges";
import type { CardBrandId } from "@/lib/store";
import { formatPlan, visitorPlans } from "@/lib/pricing";
import PlanPicker from "@/components/PlanPicker";
import { cancel, changePassword, disconnectStripeHook, openBillingPortal, resume, saveProfile, savePaymentMethods, saveStripeHook, subscribe } from "./actions";
import { newHookId } from "@/lib/stripeHook";
import { updateHost } from "@/lib/store";
import { isDemoMode, site } from "@/lib/config";
import ChangePasswordForm from "./ChangePasswordForm";
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
  const months = sub.price?.months ?? 1;
  const periodLabel = t(months === 12 ? "plan.per.year" : months > 1 ? "plan.per.months" : "plan.per.month", { count: months });
  const plans = (await visitorPlans(locale)).map(({ id, months: m, label, perMonthLabel, savePct }) => ({ id, months: m, label, perMonthLabel, savePct }));
  const fmt = (iso?: string) => (iso ? date(iso, locale, { day: "numeric", month: "long", year: "numeric" }) : "-");

  const notice =
    sp.welcome ? t("account.notice.welcome") :
    sp.subscribed ? t("account.notice.subscribed") :
    sp.cancelled ? t("account.notice.cancelled", { date: fmt(sub.currentPeriodEnd) }) :
    sp.resumed ? t("account.notice.resumed") :
    sp.saved ? t("account.notice.saved") :
    sp.cancelled_checkout ? t("account.notice.checkoutCancelled") :
    sp.methodsSaved ? t("methods.saved") :
    sp.passwordChanged ? t("account.notice.passwordChanged") : null;
  const badFields = new Set((sp.methodsError ?? "").split(",").filter(Boolean));
  // Automatic confirmation: each host gets a private webhook address for their own Stripe account.
  let hook = host.stripeHook;
  if (!hook) {
    hook = { id: newHookId() };
    await updateHost(host.id, { stripeHook: hook });
  }
  const hookUrl = `${site.baseUrl}/api/hooks/stripe/${hook.id}`;

  return (
    <PageBody>
      <PageHeader title={t("nav.account")} description={host.email} />
      <div className="grid grid-cols-1 gap-8 lg:grid-cols-[13rem_minmax(0,1fr)]">
      <nav aria-label={t("nav.account")} className="hidden lg:block">
        <ul className="sticky top-8 space-y-0.5 text-sm">
          <li className="eyebrow mb-2 px-3">{t("account.onThisPage")}</li>
          {([
            ["#subscription", "account.subscription", "card"],
            ["#methods", "methods.title", "wallet"],
            ["#auto-confirm", "hook.title", "zap"],
            ["#cancel", "account.howToCancel", "info"],
            ["#details", "account.details", "user"],
            ["#password", "account.password", "lock"],
          ] as const).map(([href, key, icon]) => (
            <li key={href}>
              <a href={href} className="flex h-9 items-center gap-2.5 rounded-[var(--r-md)] px-3 text-[var(--muted)] transition-colors hover:bg-white/[0.035] hover:text-[var(--ink)]">
                <Icon name={icon} size={15} /> {t(key)}
              </a>
            </li>
          ))}
        </ul>
      </nav>
      <div className="min-w-0 space-y-6">
      {notice && <p className="note note-success rise"><Icon name="check" size={16} className="mt-0.5" /> {notice}</p>}

      <section id="subscription" className="panel panel-pad scroll-mt-8">
        <SectionHead icon="card" title={t("account.subscription")} />
        {admin ? (
          <div className="mt-4">
            <span className="pill pill-success">{t("account.badge.admin")}</span>
            <p className="mt-2 text-sm text-[var(--muted)]">{t("account.adminText")}</p>
          </div>
        ) : (
        <>
        <div className="mt-4 flex flex-wrap items-end justify-between gap-4">
          <div>
            <div className="flex items-baseline gap-1.5"><span className="amount-hero text-[2rem]">{price}</span><span className="text-sm text-[var(--muted)]">/ {active ? periodLabel : t("home.month")}</span></div>
            <div className="mt-1 text-sm">
              {t("account.status")} <StatusBadge t={t} status={sub.status} cancelling={!!sub.cancelAtPeriodEnd} />
            </div>
            {active && !sub.cancelAtPeriodEnd && <div className="mt-1 text-sm text-[var(--muted)]">{t("account.nextCharge", { amount: price, date: fmt(sub.currentPeriodEnd) })}</div>}
            {active && sub.cancelAtPeriodEnd && <div className="mt-1 text-sm text-[var(--muted)]">{t("account.accessUntil", { date: fmt(sub.currentPeriodEnd) })}</div>}
            {sub.status === "past_due" && <div className="mt-1 text-sm text-red-300">{t("account.paymentFailed")}</div>}
          </div>
          <div className="flex flex-wrap gap-2">

            {active && sub.cancelAtPeriodEnd && (
              <form action={resume}>
                <button className="btn btn-primary btn-lg">{t("account.keep")}</button>
              </form>
            )}
            {active && !sub.cancelAtPeriodEnd && <CancelButton t={t} />}
            {active && !sub.demo && sub.stripeCustomerId && (
              <form action={openBillingPortal}>
                <button className="btn btn-secondary btn-lg">{t("account.cardInvoices")}</button>
              </form>
            )}
          </div>
        </div>
        {!active && (
          <form action={subscribe} className="mt-5 max-w-md space-y-4">
            <PlanPicker plans={plans} />
            <button className="btn btn-primary btn-lg w-full">{t("account.subscribeFor")}</button>
          </form>
        )}
        {!active && (
          <div className="mt-4 flex flex-wrap items-center gap-3">
            <PayBadges />
            <span className="text-xs text-[var(--muted)]">{t("sub.methods")}</span>
          </div>
        )}
        </>
        )}
        {!admin && (sub.demo || isDemoMode()) && <p className="note note-info mt-4 text-xs">{t("account.demo")}</p>}

      </section>


      <section id="methods" className="panel panel-pad scroll-mt-8">
        <SectionHead
          icon="wallet"
          title={t("methods.title")}
          sub={t("methods.intro")}
          aside={<span className={`pill ${methodsOn ? "pill-success" : "pill-warning"}`}>{methodsOn ? t("methods.badge.on") : t("methods.badge.off")}</span>}
        />
        <MethodsForm
          action={savePaymentMethods}
          labels={{
            save: t("methods.save"),
            saving: t("common.wait"),
            saved: t("methods.saved"),
            invalid: t("methods.invalid"),
            failed: t("methods.failed"),
            reloadKeep: t("methods.reloadKeep"),
            restored: t("methods.restored"),
            savedList: t("methods.savedList"),
            noneSaved: t("methods.noneSaved"),
            guestsSee: t("methods.guestsSee"),
          }}
          methodNames={Object.fromEntries(METHOD_ORDER.map((id) => [id, methodTitle(id, t)]))}
        >
          <Method saveLabel={t("upcoming.saveName")} name="cardOn" logo="card" on={!!pm.card} title={t("method.card")} badges>
            <p className="text-sm text-[var(--muted)] sm:col-span-2">{t("methods.cardHint")}</p>
            <CardWalletTip hasLink={!!pm.card?.url} />
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
                    <label key={v} className="flex h-9 cursor-pointer items-center gap-2 rounded-[var(--r-sm)] border border-[var(--line)] px-3 text-sm transition-colors hover:border-[var(--line-strong)] has-[:checked]:border-[var(--line-strong)] has-[:checked]:bg-white/[0.05]">
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
            <span className="label">{t("methods.note")} <span className="text-[var(--muted)]">{t("common.optional")}</span></span>
            <textarea name="note" className="input min-h-20" defaultValue={pm.note ?? ""} maxLength={500} placeholder={t("methods.notePlaceholder")} />
          </label>
        </MethodsForm>
        <p className="mt-4 flex gap-2 text-xs text-[var(--muted)]"><Icon name="info" size={13} className="mt-px" /> {t("methods.howItWorks")}</p>
      </section>

      <section id="auto-confirm" className="panel panel-pad scroll-mt-8">
        <SectionHead
          icon="zap"
          title={t("hook.title")}
          sub={t("hook.sub")}
          aside={<span className={`pill ${hook?.secret ? "pill-success" : "pill-neutral"}`}>{hook?.secret ? t("hook.on") : t("hook.off")}</span>}
        />
        {sp.hookSaved && <p className="note note-success mt-4">{t("hook.saved")}</p>}
        {sp.hookError && <p className="note note-danger mt-4">{t("hook.invalid")}</p>}
        {hook?.secret ? (
          <div className="mt-4 space-y-3 text-sm">
            <p className="text-[var(--muted)]">
              {hook.lastEventAt ? t("hook.lastEvent", { date: fmt(hook.lastEventAt), result: hook.lastResult ?? "" }) : t("hook.waiting")}
            </p>
            <form action={disconnectStripeHook}>
              <button className="btn btn-quiet btn-sm">{t("hook.disconnect")}</button>
            </form>
          </div>
        ) : (
          <ol className="mt-5 list-decimal space-y-3 ps-5 text-sm">
            <li>{t("hook.step1")}</li>
            <li>
              {t("hook.step2")}
              <code className="mt-2 block break-all rounded-[var(--r-sm)] border border-[var(--line)] bg-white/[0.03] px-3 py-2 font-mono text-xs">{hookUrl}</code>
            </li>
            <li>{t("hook.step3")}</li>
            <li>
              {t("hook.step4")}
              <form action={saveStripeHook} className="mt-2 flex flex-wrap gap-2">
                <input name="whsec" className="input max-w-sm flex-1 font-mono text-sm" placeholder="whsec_…" autoComplete="off" required />
                <button className="btn btn-primary">{t("hook.connect")}</button>
              </form>
            </li>
          </ol>
        )}
        <p className="mt-4 flex gap-2 text-xs text-[var(--muted)]"><Icon name="shield" size={13} className="mt-px" /> {t("hook.safety")}</p>
      </section>

      <section id="cancel" className="panel panel-pad scroll-mt-8">
        <SectionHead icon="info" title={t("account.howToCancel")} />
        <div className="mt-4 text-sm">
          <CancelGuide compact />
        </div>
      </section>

      <section id="details" className="panel panel-pad scroll-mt-8">
        <SectionHead icon="user" title={t("account.details")} sub={t("account.detailsHint")} />
        <form action={saveProfile} className="mt-5 grid grid-cols-1 gap-4 sm:grid-cols-2">
          <label className="block">
            <span className="label">{t("auth.name")}</span>
            <input name="name" className="input" defaultValue={host.name} required />
          </label>
          <label className="block">
            <span className="label">{t("common.email")}</span>
            <input className="input" value={host.email} readOnly />
          </label>
          <label className="block">
            <span className="label">{t("account.business")}</span>
            <input name="businessName" className="input" defaultValue={host.businessName ?? ""} placeholder="Seaview Rentals Ltd" />
          </label>
          <label className="block">
            <span className="label">{t("account.taxId")}</span>
            <input name="taxId" className="input" defaultValue={host.taxId ?? ""} />
          </label>
          <label className="block">
            <span className="label">{t("account.guestContact")}</span>
            <input name="guestContact" className="input" defaultValue={host.guestContact ?? ""} placeholder={host.email} />
            <span className="help block">{t("account.guestContactHint")}</span>
          </label>
          <label className="block sm:col-span-2">
            <span className="label">{t("account.guestPolicy")}</span>
            <textarea name="guestPolicy" className="input" defaultValue={host.guestPolicy ?? ""} placeholder={t("account.guestPolicyPh")} maxLength={1500} />
            <span className="help block">{t("account.guestPolicyHint")}</span>
          </label>
          <div className="sm:col-span-2">
            <button className="btn btn-primary">{t("account.save")}</button>
          </div>
        </form>
      </section>

      <section id="password" className="panel panel-pad scroll-mt-8">
        <SectionHead icon="lock" title={t("account.password")} sub={t("account.passwordHint")} />
        <ChangePasswordForm action={changePassword} />
        <p className="mt-4 text-xs text-[var(--muted)]">
          {t("account.forgotHint")}{" "}
          <a href={`/forgot-password?email=${encodeURIComponent(host.email)}`} className="link">{t("auth.forgot")}</a>
        </p>
      </section>
      </div>
      </div>
    </PageBody>
  );
}

/** One payment method: a checkbox that reveals its fields (no JS needed). */
function Method({ name, logo, on, title, badges, saveLabel, children }: { name: string; logo: string; on: boolean; title: string; badges?: boolean; saveLabel: string; children: React.ReactNode }) {
  const savedLabel = on ? <SavedChip /> : null;
  return (
    <div className="group rounded-[var(--r-lg)] border border-[var(--line)] bg-white/[0.012] p-4 transition-colors hover:border-[var(--line-strong)] has-[.method-toggle:checked]:border-[var(--line-strong)] has-[.method-toggle:checked]:bg-white/[0.03] has-[.method-toggle:checked]:shadow-[var(--edge)]">
      <label className="flex cursor-pointer flex-wrap items-center gap-3 font-medium">
        <input type="checkbox" name={name} defaultChecked={on} className="method-toggle h-4 w-4 accent-[var(--accent)]" />
        <MethodLogo id={logo} />
        {title}
        {savedLabel}
        {badges && <PayBadges className="ms-auto" />}
      </label>
      <div className="mt-4 hidden grid-cols-1 gap-4 border-t border-[var(--line)] pt-4 group-has-[.method-toggle:checked]:grid sm:grid-cols-2">
        {children}
        <div className="flex justify-end sm:col-span-2">
          <button className="btn btn-secondary btn-sm">{saveLabel}</button>
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
      <legend className="label">{legend}</legend>
      <div className="flex flex-wrap gap-2">
        {CARD_BRANDS.map((b) => (
          <label key={b} className="flex cursor-pointer items-center gap-2 rounded-[var(--r-sm)] border border-[var(--line)] px-2.5 py-1.5 text-sm transition-colors hover:border-[var(--line-strong)] has-[:checked]:border-[var(--line-strong)] has-[:checked]:bg-white/[0.05]">
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
      <span className="label">{label}</span>
      <input name={name} className={`input ${mono ? "font-mono text-sm" : ""} ${bad ? "border-red-400" : ""}`} defaultValue={value ?? ""} placeholder={placeholder} aria-invalid={bad || undefined} />
    </label>
  );
}

function StatusBadge({ t, status, cancelling }: { t: T; status: string; cancelling: boolean }) {
  const [label, cls] =
    cancelling ? [t("account.badge.cancelling"), "pill-warning"] :
    status === "active" || status === "trialing" ? [t("account.badge.active"), "pill-success"] :
    status === "past_due" ? [t("account.badge.failed"), "pill-danger"] :
    status === "canceled" ? [t("account.badge.ended"), "pill-neutral"] :
    [t("account.badge.none"), "pill-neutral"];
  return <span className={`pill ${cls}`}>{label}</span>;
}

/** Two-step cancel (no JS dialogs): open the details, then confirm. */
function CancelButton({ t }: { t: T }) {
  return (
    <details className="relative">
      <summary className="btn btn-secondary btn-lg list-none [&::-webkit-details-marker]:hidden">{t("account.cancel")}</summary>
      <div className="dialog absolute end-0 z-10 mt-2 w-72 p-4 text-sm">
        <p>{t("account.cancelConfirmText")}</p>
        <form action={cancel} className="mt-3">
          <button className="btn btn-danger-solid w-full">{t("account.cancelConfirm")}</button>
        </form>
      </div>
    </details>
  );
}

/** Shown on a payment method that is stored on the account (re-rendered after each save). */
async function SavedChip() {
  const { t } = await getI18n();
  return <span className="pill pill-success">{t("methods.savedChip")}</span>;
}

/** Section title with an icon, optional subtitle and something on the right. */
function SectionHead({ icon, title, sub, aside }: { icon: IconName; title: string; sub?: string; aside?: React.ReactNode }) {
  return (
    <div className="panel-head">
      <div className="flex min-w-0 items-start gap-3">
        <span className="icon-chip"><Icon name={icon} size={17} /></span>
        <div className="min-w-0">
          <h2 className="panel-title text-base">{title}</h2>
          {sub && <p className="panel-sub max-w-xl">{sub}</p>}
        </div>
      </div>
      {aside}
    </div>
  );
}
