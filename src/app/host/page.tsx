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
import { markPaidOffline, removePayment } from "./actions";
import { activeMethods, methodTitle, paymentReference, paysOnArrival, PHONE_APP_NAMES, type PhoneApp } from "@/lib/payMethods";
import { MethodLogo } from "@/components/PayBadges";
import CopyLink from "./CopyLink";
import ApartmentFilter from "./ApartmentFilter";
import StayRangeFilter from "./StayRangeFilter";
import UpcomingGuests from "./UpcomingGuests";
import ChooseFirst from "./connect/ChooseFirst";
import { PlatformIcon } from "./BrandIcons";
import { PLATFORMS } from "@/lib/platforms";
import ConnectForm from "./connect/ConnectForm";

export const dynamic = "force-dynamic";

const badge: Record<PaymentStatus, string> = {
  paid: "bg-emerald-400/15 text-emerald-300",
  paid_offline: "bg-emerald-400/10 text-emerald-300",
  pending: "bg-amber-400/15 text-amber-200", // link sent, not paid yet
  refunded: "bg-white/10 text-zinc-300",
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
  const methods = activeMethods(host.paymentMethods);
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
                        <a key={d.id} href={`/api/host/documents/${p.id}/${d.id}`} target="_blank" className="text-[var(--accent)] underline">
                          📎 {d.fileName}
                        </a>
                      ))}
                    </div>
                  )}
      </>
    ),
    destination: <>{p.quote.manual ? <>⚡ {capFirst(quoteTitle(p.quote, t))}</> : p.quote.regionName.split(" (")[0]}</>,
    stay: (
      <>
                  {p.quote.manual
                    ? t("quick.created", { date: date(p.createdAt, locale, { day: "numeric", month: "short", year: "numeric" }) })
                    : `${date(p.quote.checkIn, locale, { day: "numeric", month: "short", year: "numeric" })} · ${t.plural("line.nights", p.quote.nights)}`}
      </>
    ),
    guests: <>{p.quote.manual ? "—" : p.guestsToConfirm ? <span className="text-sky-200">{t("dash.guestsToConfirm")}</span> : t("dash.guestsTaxable", { total: p.quote.adults + p.quote.childAges.length, taxable: p.quote.taxableGuests })}</>,
    total: fm(p.quote.totalCents, p.quote.currency),
    status: (
      <>
                  {p.status === "pending" && p.reportedPaidAt ? (
                    <span className="rounded-full bg-sky-400/15 px-2 py-0.5 text-xs font-medium text-sky-200">
                      {t(paysOnArrival(p.paidVia) ? "status.cashPromised" : "status.reported")}
                    </span>
                  ) : (
                    <span className={`rounded-full px-2 py-0.5 text-xs font-medium ${badge[p.status]}`}>{t(`status.${p.status}` as MessageKey)}</span>
                  )}
                  {p.paidVia && <div className="mt-1 text-xs text-[var(--muted)]">{p.paidVia in PHONE_APP_NAMES ? PHONE_APP_NAMES[p.paidVia as PhoneApp] : t(`method.${p.paidVia}` as MessageKey)} · {paymentReference(p)}</div>}
                  {p.receiptNumber && <div className="mt-1 text-xs text-[var(--muted)]">#{p.receiptNumber}</div>}
      </>
    ),
    actions: (
                  <div className="flex flex-wrap items-center justify-end gap-3">
                  {p.receiptNumber ? (
                    <a href={`/api/receipt/${p.id}`} target="_blank" className="text-[var(--accent)] underline">{t("dash.receipt")}</a>
                  ) : (
                    <>
                      <CopyLink path={`/p/${p.id}`} />
                      <form action={markPaidOffline.bind(null, p.id)}>
                        <button className={p.reportedPaidAt ? "rounded-lg bg-[var(--accent)] px-3 py-1.5 text-xs font-semibold text-[var(--on-accent)]" : "text-[var(--muted)] underline"}>
                          {t(p.reportedPaidAt ? "dash.confirmReceived" : "dash.markCash")}
                        </button>
                      </form>
                    </>
                  )}
                  {/* Opens inside the row (never clipped by the table, even on the last row). */}
                  <details className="group open:w-full">
                    <summary className="cursor-pointer list-none text-end text-[var(--muted)] hover:text-red-300 group-open:text-red-300" aria-label={t("dash.remove")} title={t("dash.remove")}>
                      ✕
                    </summary>
                    <div className="ms-auto mt-2 w-72 max-w-full whitespace-normal rounded-xl border border-red-400/30 bg-red-500/5 p-3 text-start text-sm">
                      <p>{t(p.status === "pending" ? "dash.removeConfirmPending" : "dash.removeConfirmPaid")}</p>
                      <form action={removePayment.bind(null, p.id)} className="mt-3">
                        <button className="rounded-lg bg-red-500/90 px-3 py-1.5 text-xs font-semibold text-white hover:bg-red-500">{t("dash.removeYes")}</button>
                      </form>
                    </div>
                  </details>
                  </div>
    ),
  });

  return (
    <main className="mx-auto max-w-6xl px-4 py-8">
      <div className="mb-6 flex flex-wrap items-center justify-between gap-4">
        <h1 className="text-2xl font-semibold">{t("dash.title")}</h1>
        <div className="flex flex-wrap gap-2">
          <Link href="/host/properties" className="rounded-lg border border-[var(--line)] bg-[var(--surface)] px-4 py-2 text-sm font-medium hover:bg-[var(--soft)]">
            🏠 {t("nav.apartments")}
          </Link>
          <a href="/api/host/export" className="rounded-lg border border-[var(--line)] bg-[var(--surface)] px-4 py-2 text-sm font-medium hover:bg-[var(--soft)]">
            ⬇ {t("dash.export")}
          </a>
          <a href="/host/new?quick=1" className="rounded-lg border border-[var(--line)] bg-[var(--surface)] px-4 py-2 text-sm font-medium hover:bg-[var(--soft)]">
            ⚡ {t("quick.tab.quick")}
          </a>
          <a href="/host/new" className="rounded-lg bg-[var(--accent)] px-4 py-2 text-sm font-semibold text-[var(--on-accent)] hover:brightness-110">
            + {t("dash.newLink")}
          </a>
        </div>
      </div>
      {isDemoMode() && <p className="mb-6 rounded-lg bg-sky-400/10 p-3 text-sm text-sky-200">{t("dash.demo")}</p>}

      <div className="mb-8 grid grid-cols-2 gap-2.5 sm:grid-cols-4 sm:gap-4">
        <Stat label={t("dash.stat.paid")} value={String(paid.length)} />
        <Stat label={t("dash.stat.awaiting")} value={String(payments.length - paid.length)} />
        <Stat label={t("dash.stat.tax")} value={taxTotal} />
        <Stat label={t("dash.stat.fees")} value={feeTotal} />
      </div>

      {/* Payment methods shortcut: what guests can pay with, and a direct link to change it. */}
      <section className={`mb-8 rounded-2xl border p-5 ${methods.length ? "border-[var(--line)] bg-[var(--surface)]" : "border-amber-400/30 bg-amber-400/5"}`}>
        <div className="flex flex-wrap items-center justify-between gap-3">
          <div className="min-w-0">
            <h2 className="font-semibold">{t("methods.title")}</h2>
            <p className="mt-0.5 text-sm text-[var(--muted)]">{methods.length ? t("dash.methodsOn") : t("banner.methods")}</p>
          </div>
          <Link
            href="/host/account#methods"
            className={methods.length ? "rounded-lg border border-[var(--line)] px-4 py-2 text-sm font-medium hover:bg-[var(--soft)]" : "rounded-lg bg-[var(--accent)] px-4 py-2 text-sm font-semibold text-[var(--on-accent)] hover:brightness-110"}
          >
            {methods.length ? t("dash.editMethods") : t("methods.add")} →
          </Link>
        </div>
        {methods.length > 0 && (
          <ul className="mt-3 flex flex-wrap gap-2">
            {methods.map((id) => (
              <li key={id} className="inline-flex items-center gap-2 rounded-lg bg-[var(--bg)] px-2.5 py-1.5 text-sm">
                <MethodLogo id={id} />
                {methodTitle(id, t)}
                <span className="text-emerald-300" aria-label={t("methods.savedChip")}>✓</span>
              </li>
            ))}
          </ul>
        )}
      </section>

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

      {/* Connect calendars: choose a channel from the list, paste its iCal link, Save. Only here on the dashboard. */}
      <section id="calendars" className="mb-8 scroll-mt-24 rounded-2xl border border-[var(--line)] bg-[var(--surface)] p-5">
        <div className="flex flex-wrap items-center gap-x-3 gap-y-2">
          <h2 className="font-semibold">{t("upcoming.connect")}</h2>
          {/* A few logos so it's clear at a glance which calendars this is about. */}
          <span className="flex flex-wrap items-center gap-1.5" aria-hidden>
            {["airbnb", "booking", "vrbo", "misterbandb", "expedia", "agoda"].map((id) => (
              <PlatformIcon key={id} id={id} size={20} />
            ))}
            <span className="text-xs text-[var(--muted)]">{t("connect.nMore", { count: PLATFORMS.length - 7 })}</span>
          </span>
        </div>
        <p className="mb-4 mt-1 text-sm text-[var(--muted)]">{t("pf.calendarsSub")}</p>
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
          <Link href="/host/properties/new?then=calendars" className="mt-4 inline-flex rounded-lg border border-dashed border-[var(--line-strong)] px-3 py-2 text-sm font-medium hover:bg-[var(--bg)]">
            + {t("connect.addApartment")}
          </Link>
        ) : (
          <ChooseFirst />
        )}
      </section>


      {byRegion.size > 0 && (
        <section className="mb-8 rounded-2xl border border-[var(--line)] bg-[var(--surface)] p-6">
          <h2 className="mb-3 font-semibold">{t("dash.byDestination")}</h2>
          <ul className="space-y-1 text-sm">
            {[...byRegion].map(([r, c]) => (
              <li key={r} className="flex justify-between">
                <span>{r}</span>
                <span className="tabular-nums font-medium">{fm(c.cents, c.currency)}</span>
              </li>
            ))}
          </ul>
        </section>
      )}

      <div className="mb-3 flex flex-wrap items-center justify-between gap-3">
        <h2 className="text-lg font-semibold">{t("dash.guestsPayments")}</h2>
        <ApartmentFilter
          value={selected ? apartment : ""}
          apartments={properties.map((p) => ({ id: p.id, name: p.name, count: payments.filter((x) => x.propertyId === p.id).length }))}
        />
      </div>
      <div className="mb-3">
        <StayRangeFilter months={rangeMonths} from={from} to={to} />
      </div>
      {(from || to) && (
        <div className="mb-3 flex flex-wrap items-center justify-between gap-3 rounded-xl border border-[var(--line)] bg-[var(--surface)] px-4 py-3 text-sm">
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
          <a href={exportHref} className="rounded-lg bg-[var(--accent)] px-3 py-1.5 text-xs font-semibold text-[var(--on-accent)] hover:brightness-110">⬇ {t("range.export")}</a>
        </div>
      )}
      {/* Phones: one card per transaction (every field visible). Wider screens: the table. */}
      <section className="space-y-3 md:hidden">
        {shown.length === 0 && <p className="rounded-2xl border border-[var(--line)] bg-[var(--surface)] px-4 py-8 text-center text-sm text-[var(--muted)]">{from || to ? t("range.none") : selected ? t("dash.noGuestsFor", { name: selected.name }) : t("dash.noLinks")}</p>}
        {shown.map((p) => {
          const c = rowCells(p);
          return (
            <article key={p.id} className="rounded-2xl border border-[var(--line)] bg-[var(--surface)] p-4 text-sm">
              <div className="flex items-start justify-between gap-3">
                <div className="min-w-0">{c.guest}</div>
                <div className="shrink-0 text-end text-base font-semibold tabular-nums">{c.total}</div>
              </div>
              <dl className="mt-3 grid grid-cols-[auto_1fr] gap-x-3 gap-y-1.5 border-t border-[var(--line)] pt-3">
                <dt className="text-[var(--muted)]">{t("dash.col.destination")}</dt><dd>{c.destination}</dd>
                <dt className="text-[var(--muted)]">{t("dash.col.stay")}</dt><dd>{c.stay}</dd>
                <dt className="text-[var(--muted)]">{t("receipt.guests")}</dt><dd>{c.guests}</dd>
                <dt className="text-[var(--muted)]">{t("dash.col.status")}</dt><dd>{c.status}</dd>
              </dl>
              <div className="mt-3 border-t border-[var(--line)] pt-3">{c.actions}</div>
            </article>
          );
        })}
      </section>
      <section className="hidden overflow-x-auto rounded-2xl border border-[var(--line)] bg-[var(--surface)] md:block">
        <table className="w-full min-w-[800px] text-sm">
          <thead className="border-b border-[var(--line)] text-start text-[var(--muted)]">
            <tr>
              {[t("dash.col.guest"), t("dash.col.destination"), t("dash.col.stay"), t("receipt.guests"), t("dash.col.total"), t("dash.col.status"), ""].map((h, i) => (
                <th key={i} className="px-4 py-3 text-start font-medium">{h}</th>
              ))}
            </tr>
          </thead>
          <tbody>
            {shown.length === 0 && (
              <tr><td colSpan={7} className="px-4 py-8 text-center text-[var(--muted)]">{from || to ? t("range.none") : selected ? t("dash.noGuestsFor", { name: selected.name }) : t("dash.noLinks")}</td></tr>
            )}
            {shown.map((p) => {
              const c = rowCells(p);
              return (
                <tr key={p.id} className="border-b border-[var(--line)] last:border-0">
                  <td className="px-4 py-3">{c.guest}</td>
                  <td className="px-4 py-3">{c.destination}</td>
                  <td className="px-4 py-3 whitespace-nowrap">{c.stay}</td>
                  <td className="px-4 py-3">{c.guests}</td>
                  <td className="px-4 py-3 tabular-nums font-medium">{c.total}</td>
                  <td className="px-4 py-3">{c.status}</td>
                  <td className="px-4 py-3 text-end whitespace-nowrap">{c.actions}</td>
                </tr>
              );
            })}
          </tbody>
        </table>
      </section>
    </main>
  );
}

function Stat({ label, value }: { label: string; value: string }) {
  return (
    <div className="min-w-0 rounded-xl border border-[var(--line)] bg-[var(--surface)] px-3.5 py-3 sm:rounded-2xl sm:p-5">
      <div className="truncate text-xs text-[var(--muted)] sm:text-sm">{label}</div>
      <div className="mt-0.5 truncate text-lg font-semibold tabular-nums sm:mt-1 sm:text-2xl">{value}</div>
    </div>
  );
}
