import { requireHost } from "@/lib/auth";
import Link from "next/link";
import type { MessageKey } from "@/i18n/messages/en";
import { getI18n } from "@/i18n/server";
import { date } from "@/i18n/translate";
import { formatMoney } from "@/lib/calc";
import { capFirst, quoteTitle } from "@/lib/quick";
import { isDemoMode } from "@/lib/config";
import { upcomingStays } from "@/lib/calendar";
import { rememberStays, removedStays } from "@/lib/bookings";
import { listPayments, listProperties, type PaymentStatus } from "@/lib/store";
import { markPaidOffline, refundPaid, removePayment } from "./actions";
import { activeMethods, methodTitle, paymentReference, paysOnArrival, PHONE_APP_NAMES, type PhoneApp } from "@/lib/payMethods";
import { MethodLogo } from "@/components/PayBadges";
import CopyLink from "./CopyLink";
import RemindButton from "./RemindButton";
import { loadMessages } from "@/i18n/server";
import { makeT } from "@/i18n/translate";
import ApartmentFilter from "./ApartmentFilter";
import StayRangeFilter from "./StayRangeFilter";
import UpcomingGuests from "./UpcomingGuests";
import ChooseFirst from "./connect/ChooseFirst";
import { PlatformIcon } from "./BrandIcons";
import { PLATFORMS } from "@/lib/platforms";
import ConnectForm from "./connect/ConnectForm";
import Icon, { type IconName } from "@/components/Icon";
import PageHeader, { PageBody } from "@/components/PageHeader";
import { cookies } from "next/headers";
import { minorToCents } from "@/lib/currencies";
import { TZ_COOKIE } from "@/lib/geo";

export const dynamic = "force-dynamic";

const badge: Record<PaymentStatus, string> = {
  paid: "pill-success",
  paid_offline: "pill-success",
  pending: "pill-warning", // link sent, not paid yet
  refunded: "pill-neutral",
};

const MONTH = /^\d{4}-(0[1-9]|1[0-2])$/;
/** Last day of a YYYY-MM month as YYYY-MM-DD. */
const monthEnd = (m: string) => new Date(Date.UTC(+m.slice(0, 4), +m.slice(5, 7), 0)).toISOString().slice(0, 10);

export default async function Host({ searchParams }: { searchParams: Promise<{ apartment?: string; month?: string; from?: string; to?: string; view?: string; at?: string; apt?: string; platform?: string; stays?: string }> }) {
  const sp = await searchParams;
  const { apartment = "", month } = sp;
  // Stay range for the accountant: guests whose check-in falls between these months (inclusive).
  const from = sp.from && MONTH.test(sp.from) ? sp.from : "";
  const to = sp.to && MONTH.test(sp.to) ? sp.to : "";
  const host = await requireHost();
  const [payments, properties] = await Promise.all([listPayments(host.id), listProperties(host.id)]);
  // Table filter: one apartment, or all of them.
  const selected = properties.find((p) => p.id === apartment);
  const stayDate = (p: (typeof payments)[number]) => p.quote.checkIn || p.createdAt.slice(0, 10); // quick links: date sent
  const fromDate = from ? `${from}-01` : "";
  const toDate = to ? monthEnd(to) : "";
  const inRange = (p: (typeof payments)[number]) => (!fromDate || stayDate(p) >= fromDate) && (!toDate || stayDate(p) <= toDate);
  const shown = payments.filter((p) => (!selected || p.propertyId === selected.id) && inRange(p));
  const connected = properties.some((p) => Object.values(p.calendars ?? {}).some(Boolean));
  const live = connected ? await upcomingStays(properties) : { stays: [], errors: [] };
  // Bookings stay until the host removes them, even if a feed hiccups or a booking leaves a calendar.
  const calendar = { stays: connected ? await rememberStays(host, properties, live) : [], errors: live.errors };
  const { t, locale } = await getI18n();
  const tzRaw = (await cookies()).get(TZ_COOKIE)?.value;
  const tz = (() => {
    try {
      const z = tzRaw ? decodeURIComponent(tzRaw) : "Europe/Malta";
      new Intl.DateTimeFormat("en", { timeZone: z });
      return z;
    } catch {
      return "Europe/Malta";
    }
  })();
  const methods = activeMethods(host.paymentMethods);
  // Reminder text in each guest's own language (the language they opened their link in).
  const guestLangs = [...new Set(payments.filter((p) => p.status === "pending").map((p) => p.locale ?? locale))];
  const guestT = new Map(await Promise.all(guestLangs.map(async (l) => { const m = await loadMessages(l); return [l, makeT(m.locale, m.messages)] as const; })));
  const tg = (l?: string) => guestT.get(l ?? locale) ?? t;
  const fm = (n: number, cur = "EUR") => formatMoney(n, cur, locale);

  // Month choices for the range: every month from the first stay's year to next year.
  const years = payments.map((p) => +stayDate(p).slice(0, 4));
  const thisYear = new Date().getFullYear();
  const firstYear = Math.min(thisYear - 1, ...years);
  const lastYear = Math.max(thisYear + 1, ...years);
  const rangeMonths: { value: string; label: string }[] = [];
  for (let y = firstYear; y <= lastYear; y++)
    for (let m = 1; m <= 12; m++) {
      const value = `${y}-${String(m).padStart(2, "0")}`;
      rangeMonths.push({ value, label: date(`${value}-01`, locale, { month: "long", year: "numeric" }) });
    }
  // Totals for the period shown (paid stays only for money; everything for the guest count).
  const rangePaid = shown.filter((p) => p.status === "paid" || p.status === "paid_offline");
  const rangeTax = (() => {
    const m = new Map<string, number>();
    for (const p of rangePaid) m.set(p.quote.currency, (m.get(p.quote.currency) ?? 0) + p.quote.taxCents);
    return [...m].map(([cur, v]) => fm(v, cur)).join(" + ") || fm(0);
  })();
  const exportHref = `/api/host/export?${new URLSearchParams({
    ...(fromDate ? { from: fromDate } : {}),
    ...(toDate ? { to: toDate } : {}),
    ...(selected ? { apartment: selected.id } : {}),
  })}`;
  const paid = payments.filter((p) => p.status === "paid" || p.status === "paid_offline");
  // Totals per currency (destinations can use €, £, Kč…).
  const sumBy = (pick: (q: (typeof paid)[number]["quote"]) => number) => {
    const m = new Map<string, number>();
    for (const p of paid) m.set(p.quote.currency, (m.get(p.quote.currency) ?? 0) + pick(p.quote));
    return [...m].map(([cur, v]) => fm(v, cur)).join(" + ") || fm(0);
  };
  const taxTotal = sumBy((q) => q.taxCents);
  const feeTotal = sumBy((q) => q.feeCents);

  const byRegion = new Map<string, { cents: number; currency: string }>();
  for (const p of paid) {
    if (p.quote.manual) continue; // quick links have no destination
    const r = byRegion.get(p.quote.regionName) ?? { cents: 0, currency: p.quote.currency };
    r.cents += p.quote.taxCents;
    byRegion.set(p.quote.regionName, r);
  }

  // The pieces of one transaction, shown as a table row (desktop) or a card (phone).
  const rowCells = (p: (typeof shown)[number]) => ({
    guest: (
      <>
                  <div className="font-medium">{p.guestName || <span className="text-[var(--muted)]">—</span>}</div>
                  {p.propertyName && <div className="text-xs text-[var(--muted)]">{p.propertyName}</div>}
                  <div className="text-xs text-[var(--muted)]">{[p.guestEmail, p.guestPhone && `+${p.guestPhone}`, p.bookingRef].filter(Boolean).join(" · ")}</div>
                  {p.documents && p.documents.length > 0 && (
                    <div className="mt-1 flex flex-wrap gap-x-2 text-xs">
                      {p.documents.map((d) => (
                        <a key={d.id} href={`/api/host/documents/${p.id}/${d.id}`} target="_blank" className="link inline-flex items-center gap-1">
                          <Icon name="paperclip" size={12} /> {d.fileName}
                        </a>
                      ))}
                    </div>
                  )}
      </>
    ),
    destination: <>{p.quote.manual ? <span className="inline-flex items-center gap-1.5"><Icon name="zap" size={14} className="text-[var(--muted)]" /> {capFirst(quoteTitle(p.quote, t))}</span> : p.quote.regionName.split(" (")[0]}</>,
    stay: (
      <>
                  <div className="whitespace-nowrap">
                  {p.quote.manual
                    ? t("quick.created", { date: date(p.createdAt, locale, { day: "numeric", month: "short", year: "numeric" }) })
                    : `${date(p.quote.checkIn, locale, { day: "numeric", month: "short", year: "numeric" })} · ${t.plural("line.nights", p.quote.nights)}`}
                  </div>
                  <div className="mt-0.5 text-xs text-[var(--muted)]">{p.quote.manual ? <span className="inline-flex items-center gap-1"><Icon name="zap" size={11} /> {capFirst(quoteTitle(p.quote, t))}</span> : p.quote.regionName.split(" (")[0]}</div>
      </>
    ),
    guests: <>{p.quote.manual ? "—" : p.guestsToConfirm ? <span className="text-sky-200">{t("dash.guestsToConfirm")}</span> : t("dash.guestsTaxable", { total: p.quote.adults + p.quote.childAges.length, taxable: p.quote.taxableGuests })}</>,
    total: fm(p.quote.totalCents, p.quote.currency),
    status: (
      <>
                  {p.status === "pending" && p.reportedPaidAt ? (
                    <span className="pill pill-info">{t(paysOnArrival(p.paidVia) ? "status.cashPromised" : "status.reported")}</span>
                  ) : (
                    <span className={`pill ${badge[p.status]}`}>{t(`status.${p.status}` as MessageKey)}</span>
                  )}
                  {p.paidVia && <div className="mt-1 text-xs text-[var(--muted)]">{p.paidVia in PHONE_APP_NAMES ? PHONE_APP_NAMES[p.paidVia as PhoneApp] : t(`method.${p.paidVia}` as MessageKey)} · {paymentReference(p)}</div>}
                  {p.receiptNumber && <div className="mt-1 text-xs text-[var(--muted)]">#{p.receiptNumber}{p.creditNoteNumber ? ` · ${p.creditNoteNumber}` : ""}</div>}
                  {p.amountMismatch && p.status === "pending" && (
                    <div className="mt-1 text-xs text-amber-200">{t("hook.mismatch", { amount: fm(minorToCents(p.amountMismatch.paidMinor, p.amountMismatch.currency), p.amountMismatch.currency) })}</div>
                  )}
      </>
    ),
    actions: (
                  <div className="flex items-center justify-end gap-1.5 max-md:flex-wrap max-md:justify-start">
                  {p.receiptNumber ? (
                    <>
                      <a href={`/api/receipt/${p.id}`} target="_blank" className="btn btn-secondary btn-sm">
                        <Icon name="receipt" size={14} /> {t("dash.receipt")}
                      </a>
                      {p.creditNoteNumber && (
                        <a href={`/api/credit-note/${p.id}`} target="_blank" className="btn btn-secondary btn-sm">
                          <Icon name="file" size={14} /> {t("dash.creditNote")}
                        </a>
                      )}
                      {!p.creditNoteNumber && (
                        <details className="group open:w-full">
                          <summary className="btn btn-quiet btn-sm btn-icon ms-auto list-none group-open:bg-white/[0.06] [&::-webkit-details-marker]:hidden" aria-label={t("dash.refund")} title={t("dash.refund")}>
                            <Icon name="refresh" size={14} />
                          </summary>
                          <form action={refundPaid.bind(null, p.id)} className="note ms-auto mt-2 w-72 max-w-full flex-col whitespace-normal text-start">
                            <p className="font-medium">{t("dash.refund")}</p>
                            <p className="text-xs text-[var(--muted)]">{t("dash.refundText")}</p>
                            <input name="reason" className="input h-9 text-sm" placeholder={t("dash.refundReasonPh")} maxLength={200} />
                            <button className="btn btn-secondary btn-sm">{t("dash.refundYes")}</button>
                          </form>
                        </details>
                      )}
                    </>
                  ) : (
                    <>
                      <RemindButton
                        path={`/p/${p.id}`}
                        phone={p.guestPhone}
                        email={p.guestEmail || undefined}
                        text={tg(p.locale)("remind.text", { name: p.guestName ? ` ${p.guestName}` : "", amount: fm(p.quote.totalCents, p.quote.currency) })}
                      />
                      <span className="md:hidden"><CopyLink path={`/p/${p.id}`} /></span>
                      <span className="max-md:hidden"><CopyLink path={`/p/${p.id}`} compact /></span>
                      <form action={markPaidOffline.bind(null, p.id)}>
                        <button className={`btn btn-sm ${p.reportedPaidAt ? "btn-primary" : "btn-secondary"}`}>
                          <Icon name="check" size={14} /> {t(p.reportedPaidAt ? "dash.confirmReceived" : "dash.markCash")}
                        </button>
                      </form>
                    </>
                  )}
                  {/* Opens inside the row (never clipped by the table, even on the last row). */}
                  <details className="group open:w-full">
                    <summary className="btn btn-quiet btn-sm btn-icon ms-auto list-none hover:text-red-300 group-open:bg-red-500/10 group-open:text-red-300 [&::-webkit-details-marker]:hidden" aria-label={t("dash.remove")} title={t("dash.remove")}>
                      <Icon name="trash" size={15} />
                    </summary>
                    <div className="note note-danger ms-auto mt-2 w-72 max-w-full flex-col whitespace-normal text-start">
                      <p>{t(p.status === "pending" ? "dash.removeConfirmPending" : "dash.removeConfirmPaid")}</p>
                      <form action={removePayment.bind(null, p.id)}>
                        <button className="btn btn-danger-solid btn-sm">{t("dash.removeYes")}</button>
                      </form>
                    </div>
                  </details>
                  </div>
    ),
  });

  const hour = Number(new Intl.DateTimeFormat("en-GB", { hour: "numeric", hour12: false, timeZone: tz }).format(new Date()));
  const greeting = t(hour < 12 ? "dash.hello.morning" : hour < 18 ? "dash.hello.afternoon" : "dash.hello.evening", { name: host.name.split(/\s+/)[0] || host.name });
  const today = new Intl.DateTimeFormat(locale, { weekday: "long", day: "numeric", month: "long", timeZone: tz }).format(new Date());

  const methodsCard = (
    <section className={`panel panel-pad ${methods.length ? "" : "border-amber-400/30"}`}>
      <div className="panel-head">
        <div className="flex min-w-0 items-start gap-3">
          <span className="icon-chip"><Icon name="wallet" size={17} /></span>
          <div className="min-w-0">
            <h2 className="panel-title">{t("methods.title")}</h2>
            <p className="panel-sub">{methods.length ? t("dash.methodsOn") : t("banner.methods")}</p>
          </div>
        </div>
      </div>
      {methods.length > 0 && (
        <ul className="mt-4 space-y-1.5">
          {methods.map((id) => (
            <li key={id} className="flex items-center gap-2.5 rounded-[var(--r-md)] border border-[var(--line)] bg-white/[0.02] px-3 py-2 text-sm">
              <MethodLogo id={id} />
              <span className="min-w-0 flex-1 truncate">{methodTitle(id, t)}</span>
              <Icon name="check" size={15} className="text-emerald-300" />
            </li>
          ))}
        </ul>
      )}
      <Link href="/host/account#methods" className={`btn btn-sm mt-4 w-full ${methods.length ? "btn-secondary" : "btn-primary"}`}>
        {methods.length ? t("dash.editMethods") : t("methods.add")} <Icon name="arrowRight" size={14} />
      </Link>
    </section>
  );

  const regionCard = byRegion.size > 0 && (
    <section className="panel panel-pad">
      <div className="flex items-center gap-3">
        <span className="icon-chip"><Icon name="globe" size={17} /></span>
        <h2 className="panel-title">{t("dash.byDestination")}</h2>
      </div>
      <ul className="mt-4 divide-y divide-[var(--line)] text-sm">
        {[...byRegion].map(([r, c]) => (
          <li key={r} className="flex items-center justify-between gap-3 py-2.5 first:pt-0 last:pb-0">
            <span className="text-[var(--muted)]">{r}</span>
            <span className="font-semibold tabular-nums">{fm(c.cents, c.currency)}</span>
          </li>
        ))}
      </ul>
    </section>
  );

  // Connect calendars: choose a channel from the list, paste its iCal link, Save. Only here on the dashboard.
  const calendarsCard = (
      <section id="calendars" className="panel panel-pad scroll-mt-24">
        <div className="flex flex-wrap items-center gap-x-3 gap-y-2">
          <span className="icon-chip"><Icon name="calendar" size={17} /></span>
          <h2 className="panel-title">{t("upcoming.connect")}</h2>
          {/* A few logos so it's clear at a glance which calendars this is about (while setting up). */}
          {!connected && <span className="flex flex-wrap items-center gap-1.5" aria-hidden>
            {["airbnb", "booking", "vrbo", "misterbandb", "expedia", "agoda"].map((id) => (
              <PlatformIcon key={id} id={id} size={20} />
            ))}
            <span className="text-xs text-[var(--muted)]">{t("connect.nMore", { count: PLATFORMS.length - 7 })}</span>
          </span>}
        </div>
        <p className="panel-sub mb-4 mt-2">{t("pf.calendarsSub")}</p>
        {properties.length ? (
          <ConnectForm
            apartments={properties.map((p) => ({
              id: p.id,
              name: p.name,
              calendars: Object.fromEntries(Object.entries(p.calendars ?? {}).filter((e): e is [string, string] => !!e[1])),
            }))}
            focus={sp.apt && sp.platform ? { apt: sp.apt, platform: sp.platform } : undefined}
          />
        ) : null}
        {properties.length ? (
          <Link href="/host/properties/new?then=calendars" className="btn btn-quiet btn-sm mt-3 border border-dashed border-[var(--line-strong)]">
            <Icon name="plus" size={14} /> {t("connect.addApartment")}
          </Link>
        ) : (
          <ChooseFirst />
        )}
      </section>
  );

  return (
    <PageBody>
      <PageHeader
        eyebrow={today}
        title={greeting}
        description={t("dash.subtitle")}
        actions={
          <>
            <a href={exportHref} className="btn btn-secondary">
              <Icon name="download" size={15} /> <span className="hidden sm:inline">{t("dash.export")}</span>
            </a>
            <a href="/host/new?quick=1" className="btn btn-secondary">
              <Icon name="zap" size={15} /> {t("quick.tab.quick")}
            </a>
            <a href="/host/new" className="btn btn-primary">
              <Icon name="plus" size={15} strokeWidth={2.25} /> {t("dash.newLink")}
            </a>
          </>
        }
      />
      {isDemoMode() && (
        <p className="note note-info mb-6"><Icon name="info" size={16} className="mt-0.5" /> {t("dash.demo")}</p>
      )}

      <div className="stagger mb-8 grid grid-cols-2 gap-3 lg:grid-cols-4 lg:gap-4">
        <Stat icon="check" label={t("dash.stat.paid")} value={String(paid.length)} />
        <Stat icon="clock" label={t("dash.stat.awaiting")} value={String(payments.length - paid.length)} />
        <Stat icon="coins" label={t("dash.stat.tax")} value={taxTotal} />
        <Stat icon="receipt" label={t("dash.stat.fees")} value={feeTotal} />
      </div>

      <div className="mb-10 grid grid-cols-1 gap-6 xl:grid-cols-3">
        <div className="min-w-0 space-y-6 xl:col-span-2">
          {connected && (
            <UpcomingGuests
              calendar={calendar}
              removed={removedStays(host, properties)}
              payments={payments}
              connected={connected}
              names={host.bookingNames ?? {}}
              month={month}
              view={sp.view}
              at={sp.at}
              keep={{ ...(apartment ? { apartment } : {}), ...(from ? { from } : {}), ...(to ? { to } : {}) }}
              apartments={properties.filter((p) => Object.values(p.calendars ?? {}).some(Boolean)).map((p) => ({ id: p.id, name: p.name }))}
              only={sp.stays}
            />
          )}

          {!connected && calendarsCard}
        </div>
        <aside className="min-w-0 space-y-6">
          {methodsCard}
          {connected && calendarsCard}
          {regionCard}
        </aside>
      </div>

      <div id="payments" className="mb-4 flex flex-wrap items-end justify-between gap-3 scroll-mt-24">
        <div>
          <div className="eyebrow mb-1">{t.plural("range.stays", shown.length)}</div>
          <h2 className="text-lg font-semibold tracking-tight">{t("dash.guestsPayments")}</h2>
        </div>
        <ApartmentFilter
          value={selected ? apartment : ""}
          apartments={properties.map((p) => ({ id: p.id, name: p.name, count: payments.filter((x) => x.propertyId === p.id).length }))}
        />
      </div>
      <div className="panel mb-4 px-4 py-3">
        <StayRangeFilter months={rangeMonths} from={from} to={to} />
      </div>
      {(from || to) && (
        <div className="note mb-4 flex-wrap items-center justify-between gap-3">
          <div className="flex flex-wrap gap-x-5 gap-y-1">
            <span className="font-medium">
              {t("range.summary", {
                from: from ? date(`${from}-01`, locale, { month: "long", year: "numeric" }) : t("range.start"),
                to: to ? date(`${to}-01`, locale, { month: "long", year: "numeric" }) : t("range.end"),
              })}
            </span>
            <span>{t.plural("range.stays", shown.length)}</span>
            <span>{t.plural("line.nights", shown.reduce((s, p) => s + (p.quote.manual ? 0 : p.quote.nights), 0))}</span>
            <span>{t.plural("range.taxable", shown.reduce((s, p) => s + (p.quote.manual ? 0 : p.quote.taxableGuests), 0))}</span>
            <span>{t("range.paidTax", { amount: rangeTax, count: rangePaid.length })}</span>
            {shown.length > rangePaid.length && <span className="text-amber-200">{t.plural("range.unpaid", shown.length - rangePaid.length)}</span>}
          </div>
          <a href={exportHref} className="btn btn-primary btn-sm"><Icon name="download" size={14} /> {t("range.export")}</a>
        </div>
      )}
      {/* Phones: one card per transaction (every field visible). Wider screens: the table. */}
      <section className="space-y-3 md:hidden">
        {shown.length === 0 && <p className="panel px-4 py-10 text-center text-sm text-[var(--muted)]">{from || to ? t("range.none") : selected ? t("dash.noGuestsFor", { name: selected.name }) : t("dash.noLinks")}</p>}
        {shown.map((p) => {
          const c = rowCells(p);
          return (
            <article key={p.id} className="panel p-4 text-sm">
              <div className="flex items-start justify-between gap-3">
                <div className="min-w-0">{c.guest}</div>
                <div className="shrink-0 text-end text-base font-semibold tabular-nums">{c.total}</div>
              </div>
              <dl className="mt-3 grid grid-cols-[auto_1fr] gap-x-3 gap-y-1.5 border-t border-[var(--line)] pt-3">
                <dt className="text-[var(--muted)]">{t("dash.col.stay")}</dt><dd>{c.stay}</dd>
                <dt className="text-[var(--muted)]">{t("receipt.guests")}</dt><dd>{c.guests}</dd>
                <dt className="text-[var(--muted)]">{t("dash.col.status")}</dt><dd>{c.status}</dd>
              </dl>
              <div className="mt-3 border-t border-[var(--line)] pt-3">{c.actions}</div>
            </article>
          );
        })}
      </section>
      <section className="panel hidden overflow-x-auto md:block">
        <table className="table-pro min-w-[760px]">
          <thead>
            <tr>
              {[t("dash.col.guest"), t("dash.col.stay"), t("receipt.guests"), t("dash.col.total"), t("dash.col.status"), ""].map((h, i) => (
                <th key={i}>{h}</th>
              ))}
            </tr>
          </thead>
          <tbody>
            {shown.length === 0 && (
              <tr><td colSpan={6} className="py-12 text-center text-[var(--muted)]">{from || to ? t("range.none") : selected ? t("dash.noGuestsFor", { name: selected.name }) : t("dash.noLinks")}</td></tr>
            )}
            {shown.map((p) => {
              const c = rowCells(p);
              return (
                <tr key={p.id}>
                  <td>{c.guest}</td>
                  <td>{c.stay}</td>
                  <td className="whitespace-nowrap">{c.guests}</td>
                  <td className="font-semibold tabular-nums">{c.total}</td>
                  <td>{c.status}</td>
                  <td className="text-end whitespace-nowrap">{c.actions}</td>
                </tr>
              );
            })}
          </tbody>
        </table>
      </section>
    </PageBody>
  );
}

function Stat({ label, value, icon }: { label: string; value: string; icon: IconName }) {
  return (
    <div className="kpi min-w-0">
      <div className="flex items-center justify-between gap-2">
        <div className="truncate text-xs font-medium text-[var(--muted)] sm:text-[0.8125rem]">{label}</div>
        <span className="flex h-7 w-7 items-center justify-center rounded-lg border border-[var(--line)] bg-white/[0.03] text-[var(--muted)]">
          <Icon name={icon} size={14} />
        </span>
      </div>
      <div className="kpi-value mt-3 truncate">{value}</div>
    </div>
  );
}
