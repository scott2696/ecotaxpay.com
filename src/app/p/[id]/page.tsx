import Icon from "@/components/Icon";
import type { Metadata } from "next";
import { notFound } from "next/navigation";
import LanguagePicker from "@/components/LanguagePicker";
import { getI18n, languageOptions } from "@/i18n/server";
import { date, money, type T } from "@/i18n/translate";
import { site } from "@/lib/config";
import { DEFAULT_DOCUMENTS_REQUEST, documentLabels, documentsInstruction } from "@/lib/documents";
import { explainRules } from "@/lib/explain";
import { describeLine, guestNotes } from "@/lib/format";
import { guideItems, translateGuide } from "@/lib/guide";
import { resolveProperty } from "@/lib/resolve";
import { activeMethods, METHOD_ICONS, methodUrl, PHONE_APP_NAMES, PHONE_APPS, paymentReference, paysOnArrival, type PhoneApp } from "@/lib/payMethods";
import type { MessageKey } from "@/i18n/messages/en";
import { getHost, getPayment, getProperty, issuerFor, type Guide, type PaymentMethods, type PaymentRecord, linkCancelled, DOCUMENT_RETENTION_DAYS } from "@/lib/store";
import GuestCount from "./GuestCount";
import PayDirect, { type MethodView } from "./PayDirect";
import { capFirst, quoteTitle } from "@/lib/quick";

export const dynamic = "force-dynamic";

export async function generateMetadata(): Promise<Metadata> {
  const { t } = await getI18n();
  return { title: t("guest.metaTitle"), robots: { index: false } };
}

export default async function GuestPage({
  params,
  searchParams,
}: {
  params: Promise<{ id: string }>;
  searchParams: Promise<Record<string, string | undefined>>;
}) {
  const { id } = await params;
  await searchParams;
  const p = await getPayment(id);
  if (!p) notFound();
  if (p.status === "refunded") {
    const { t } = await getI18n();
    const issuer = await issuerFor(p);
    return (
      <main className="mx-auto max-w-md px-4 py-20 text-center">
        <h1 className="text-xl font-semibold">{t("guest.refundedTitle")}</h1>
        <p className="mt-2 text-sm text-[var(--muted)]">{t("guest.refundedText", { name: issuer.name })}</p>
        <div className="mt-6 flex flex-wrap justify-center gap-2">
          {p.creditNoteNumber && <a href={`/api/credit-note/${p.id}`} target="_blank" className="btn btn-primary">{t("dash.creditNote")}</a>}
          {p.receiptNumber && <a href={`/api/receipt/${p.id}`} target="_blank" className="btn btn-secondary">{t("dash.receipt")}</a>}
        </div>
      </main>
    );
  }
  if (linkCancelled(p)) {
    const { t } = await getI18n();
    return (
      <main className="mx-auto max-w-md px-4 py-20 text-center">
        <h1 className="text-xl font-semibold">{t("guest.linkRemovedTitle")}</h1>
        <p className="mt-2 text-sm text-[var(--muted)]">{t("guest.linkRemovedText")}</p>
      </main>
    );
  }
  const property = p.propertyId ? await getProperty(p.propertyId) : null;
  const issuer = await issuerFor(p);
  const { t, locale } = await getI18n();
  const languages = await languageOptions();
  const host = p.hostId ? await getHost(p.hostId) : null;
  const pm = host?.paymentMethods;

  const q = p.quote;
  const m = (n: number) => money(n, q.currency, locale);
  const fmtDate = (iso: string) => date(iso, locale, { weekday: "short", day: "numeric", month: "short", year: "numeric" });
  const paid = p.status === "paid" || p.status === "paid_offline";
  // The host left the party size to the guest: ask for it before showing the amount.
  const askGuests = !paid && !p.reportedPaidAt && !!p.guestsToConfirm && !p.quote.manual;
  const canChangeGuests = !paid && !p.reportedPaidAt && !!p.guestsConfirmedAt && !p.quote.manual;
  const first = p.guestName.split(/\s+/)[0];
  const title = quoteTitle(q, t);
  const tax = title.replace(/\s*\(.*\)\s*$/, "");
  const who = [t.plural("guest.adults", q.adults), q.childAges.length ? t.plural("guest.children", q.childAges.length) : ""].filter(Boolean).join(", ");

  // The law, written in the guest's language (falls back to the English text stored when the link was made).
  const rules = property ? resolveProperty(property) : null;
  const explanation = rules ? explainRules(rules.region, rules.acc, q.checkIn, t) : q.explanation;
  const notes = guestNotes(q, t);

  const docs = property && property.documents !== "off" ? property : null;
  const uploaded = (p.documents ?? []).map(({ id, fileName, size }) => ({ id, fileName, size }));
  const docRequest = docs?.documentsRequest ?? DEFAULT_DOCUMENTS_REQUEST;
  const docAsk = docs
    ? docs.documentsRequest || !docs.documentsNote
      ? { instruction: documentsInstruction(docRequest, t), items: documentLabels(docRequest, t) }
      : { instruction: `${docs.documentsNote}.`, items: [] } // apartments saved before the checklist existed
    : null;

  return (
    <main className="mx-auto max-w-lg space-y-6 px-4 py-8 sm:py-12">
      <div className="flex justify-end">
        <LanguagePicker options={languages} />
      </div>
      <header className="text-center">
        <div className="text-sm font-semibold text-[var(--accent)]">{p.propertyName}</div>
        <h1 className="mt-2 text-2xl font-semibold tracking-tight">
          {first
            ? paid ? t("guest.allSet", { name: first }) : t("guest.hello", { name: first, tax })
            : paid ? t("guest.allSetAnon") : t("guest.helloAnon", { tax })}
        </h1>
        {!q.manual && (
          <p className="mt-1 text-sm text-[var(--muted)]">
            {fmtDate(q.checkIn)} → {fmtDate(q.checkOut)} · {t.plural("line.nights", q.nights)}{askGuests ? "" : ` · ${who}`}
          </p>
        )}
      </header>

      {!paid && p.reportedPaidAt && (
        <p className="note note-success">
          {paysOnArrival(p.paidVia) ? t("guest.cashNoted", { name: issuer.name }) : t("guest.reported", { name: issuer.name })}
        </p>
      )}

      {askGuests ? (
        <GuestCount id={p.id} minTaxableAge={q.minTaxableAge} />
      ) : paid ? (
        <PaidCard t={t} id={p.id} amount={m(q.totalCents)} receiptNumber={p.receiptNumber} guestPhone={p.guestPhone} whatsappSent={!!p.whatsappSentAt} taxName={tax} hasGuide={!!property} />
      ) : (
        <section className="panel panel-pad text-center">
          <div className="text-sm text-[var(--muted)]">{capFirst(title)}</div>
          <div className="mt-1 text-5xl font-semibold tabular-nums tracking-tight">{m(q.totalCents)}</div>

          {!q.manual && <div className="mt-5 rounded-xl bg-[var(--bg)] p-4 text-start text-sm leading-relaxed">
            <div className="mb-1 font-medium">{t("guest.why")}</div>
            <p className="text-[var(--muted)]">{explanation.join(" ")}</p>
            <div className="my-3 border-t border-[var(--line)]" />
            <ul className="space-y-1">
              {q.lines.map((l, i) => (
                <li key={i} className="flex justify-between gap-4">
                  <span>{describeLine(l, q.currency, t)}</span>
                  <span className="tabular-nums">{m(l.amountCents)}</span>
                </li>
              ))}
              {q.feeCents > 0 && (
                <li className="flex justify-between gap-4">
                  <span>{t("common.serviceFee")}</span>
                  <span className="tabular-nums">{m(q.feeCents)}</span>
                </li>
              )}
            </ul>
            {notes.length > 0 && <p className="mt-2 text-xs text-[var(--muted)]">{notes.join(" ")}</p>}
          </div>}
        </section>
      )}

      {!paid && <HostCard t={t} name={issuer.name} contact={host?.guestContact || host?.email} policy={host?.guestPolicy} />}

      {canChangeGuests && <GuestCount id={p.id} editing initial={{ adults: q.adults, childAges: q.childAges }} minTaxableAge={q.minTaxableAge} />}

      {!askGuests && !paid && !p.reportedPaidAt && pm && activeMethods(pm).length > 0 && (
        <PayDirect
          id={p.id}
          amount={m(q.totalCents)}
          reference={paymentReference(p)}
          methods={methodViews(pm, p, t)}
          note={pm.note}
          initialEmail={p.guestEmail ?? ""}
          askName={!p.guestName}
          initialPhone={p.guestPhone ? `+${p.guestPhone}` : ""}
          documents={docs && docAsk ? { setting: docs.documents as "optional" | "required", ask: docAsk, uploaded, retentionDays: DOCUMENT_RETENTION_DAYS } : null}
        />
      )}

      {!askGuests && !paid && !p.reportedPaidAt && !(pm && activeMethods(pm).length) && (
        <p className="note note-warning">{t("guest.noMethods", { name: issuer.name })}</p>
      )}

      {paid && property && <ArrivalGuide t={t} guide={await translateGuide(property.guide, locale)} propertyName={property.name} />}

      <p className="text-center text-xs text-[var(--muted)]">
        {paid ? (property ? `${t("guest.bookmark")} ` : "") : `${t("guest.detailsWrong")} `}{t("guest.collectedBy", { name: issuer.name })}
      </p>
    </main>
  );
}

/** Who the guest is paying, how to reach them, their cancellation & refund policy, and why this page is safe. */
function HostCard({ t, name, contact, policy }: { t: T; name: string; contact?: string; policy?: string }) {
  const initials = name.split(/\s+/).map((w) => w[0]).slice(0, 2).join("").toUpperCase();
  const isEmail = !!contact && contact.includes("@");
  const tel = contact && !isEmail ? contact.replace(/[^\d+]/g, "") : "";
  return (
    <section className="panel panel-pad">
      <div className="flex items-center gap-3">
        <span className="flex h-11 w-11 shrink-0 items-center justify-center rounded-full bg-[image:var(--silver-soft)] text-sm font-semibold text-[var(--on-accent)]">{initials}</span>
        <div className="min-w-0 flex-1">
          <div className="eyebrow">{t("guest.youPay")}</div>
          <div className="truncate font-semibold">{name}</div>
        </div>
        {contact && (
          <a href={isEmail ? `mailto:${contact}` : `tel:${tel}`} className="btn btn-secondary btn-sm shrink-0">
            {t("guest.contactHost")}
          </a>
        )}
      </div>
      <p className="mt-4 flex gap-2 text-xs leading-relaxed text-[var(--muted)]">
        <Icon name="lock" size={13} className="mt-px" />
        {t("guest.trust", { name })}
      </p>
      {policy && (
        <details className="group mt-3 border-t border-[var(--line)] pt-3 text-sm">
          <summary className="flex cursor-pointer list-none items-center justify-between font-medium [&::-webkit-details-marker]:hidden">
            {t("guest.policy")} <Icon name="chevronDown" size={15} className="text-[var(--muted)] transition-transform group-open:rotate-180" />
          </summary>
          <p className="mt-2 whitespace-pre-line text-[var(--muted)]">{policy}</p>
        </details>
      )}
    </section>
  );
}

/** What the guest sees for each of the host's payment methods. */
function methodViews(pm: PaymentMethods, p: PaymentRecord, t: T): MethodView[] {
  const cents = p.quote.totalCents;
  const views: MethodView[] = activeMethods(pm).map((id) => {
    let rows: MethodView["rows"] = [];
    let title = t(`method.${id}` as MessageKey);
    let brands: MethodView["brands"];
    if (id === "bank") {
      const b = pm.bank!;
      const type = b.accountType ?? "iban";
      const opt = (label: string, value?: string, mono?: boolean) => (value ? [{ label, value, mono }] : []);
      rows = [
        { label: t("methods.holder"), value: b.holder },
        ...opt(t("methods.holderAddress"), b.holderAddress),
        ...(type === "iban" ? opt("IBAN", b.iban, true) : []),
        ...(type === "uk" ? [...opt(t("methods.sortCode"), b.sortCode, true), ...opt(t("methods.accountNumber"), b.accountNumber, true)] : []),
        ...(type === "us" ? [...opt(t("methods.routing"), b.routingNumber, true), ...opt(t("methods.accountNumber"), b.accountNumber, true)] : []),
        ...opt("BIC / SWIFT", b.bic, true),
        ...opt(t("methods.bankName"), b.bankName),
        ...opt(t("methods.bankAddress"), b.bankAddress),
      ];
    }
    else if (id === "revolut") rows = [{ label: "Revtag", value: `@${pm.revolut}` }];
    else if (id === "paypal") rows = [{ label: "PayPal.Me", value: `paypal.me/${pm.paypal}` }];
    else if ((PHONE_APPS as readonly string[]).includes(id)) {
      const app = id as PhoneApp;
      title = PHONE_APP_NAMES[app];
      rows = [{ label: t(app === "wero" && pm.wero!.includes("@") ? "common.email" : "methods.phone"), value: pm[app]!, mono: true }];
    } else if (id === "card") {
      brands = pm.card!.brands;
      rows = [{ label: t("method.card"), value: t("pay.cardHint", { provider: pm.card!.provider || t("pay.cardProviderFallback") }) }];
    } else if (id === "cardOnArrival") {
      brands = pm.cardOnArrival!.brands;
      rows = [{ label: t("method.cardOnArrival"), value: t("pay.cardOnArrivalHint") }];
    } else if (id === "cash") rows = [{ label: t("method.cash"), value: t("pay.cashHint") }];
    if (id === "link" && pm.link?.label) title = pm.link.label;
    return { id, icon: METHOD_ICONS[id], title, rows, brands, url: methodUrl(id, pm, cents, p.quote.currency, paymentReference(p)) ?? undefined };
  });
  return views;
}

function PaidCard(props: { t: T; id: string; amount: string; receiptNumber?: string; guestPhone?: string; whatsappSent: boolean; taxName: string; hasGuide: boolean }) {
  const { t } = props;
  const receiptUrl = `${site.baseUrl}/api/receipt/${props.id}`;
  const full = t("guest.waText", { tax: props.taxName, number: props.receiptNumber ?? "", receipt: receiptUrl, guide: `${site.baseUrl}/p/${props.id}` });
  const text = props.hasGuide ? full : full.split("\n")[0]; // quick links have no arrival guide
  const wa = `https://wa.me/${props.guestPhone ?? ""}?text=${encodeURIComponent(text)}`;
  return (
    <section className="panel panel-pad text-center">
      <div className="mx-auto mb-3 flex h-12 w-12 items-center justify-center rounded-full bg-[var(--soft)] text-xl text-[var(--accent)]">✓</div>
      <div className="font-semibold">{t("guest.paidLine", { amount: props.amount, number: props.receiptNumber ?? "" })}</div>
      <div className="mt-4 grid grid-cols-1 gap-2 sm:grid-cols-2">
        <a href={`/api/receipt/${props.id}`} target="_blank" className="btn btn-primary btn-lg">
          {t("guest.downloadReceipt")}
        </a>
        {props.whatsappSent ? (
          <span className="rounded-xl bg-[var(--soft)] px-4 py-3 text-sm">{t("guest.sentWhatsapp")}</span>
        ) : (
          <a href={wa} target="_blank" rel="noreferrer" className="btn btn-secondary btn-lg">
            {t("guest.saveWhatsapp")}
          </a>
        )}
      </div>
    </section>
  );
}

function ArrivalGuide({ t, guide, propertyName }: { t: T; guide: Guide & { translated?: boolean }; propertyName: string }) {
  const items = guideItems(guide, t);
  if (!items.length && !guide.mapsUrl) return null;
  return (
    <section className="panel panel-pad">
      <h2 className="text-lg font-semibold">{t("guest.guideTitle")}</h2>
      <p className="mt-1 text-sm text-[var(--muted)]">{propertyName}</p>
      {guide.translated && <p className="mt-1 text-xs text-[var(--muted)]">{t("guest.autoTranslated")}</p>}
      <div className="mt-4 space-y-4">
        {items.map((i, n) => (
          <div key={n} className={i.highlight ? "rounded-xl bg-[var(--soft)] p-4" : ""}>
            <div className="text-sm font-medium">
              {i.icon} {i.title}
            </div>
            <p className="mt-1 whitespace-pre-line text-sm text-[var(--muted)]">{i.body}</p>
          </div>
        ))}
      </div>
      {guide.mapsUrl && (
        <a href={guide.mapsUrl} target="_blank" rel="noreferrer" className="btn btn-secondary btn-lg mt-5 flex text-center">
          {t("guest.openMaps")}
        </a>
      )}
    </section>
  );
}
