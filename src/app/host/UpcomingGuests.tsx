import Link from "next/link";
import { getI18n } from "@/i18n/server";
import { date, money } from "@/i18n/translate";
import type { CalendarResult } from "@/lib/calendar";
import { calendarErrorText } from "@/lib/format";
import type { PaymentRecord } from "@/lib/store";
import { hideStay, restoreStay, saveBookingName, syncCalendars } from "./actions";
import { stayKey, type ListedStay } from "@/lib/bookings";
import { AirbnbIcon, BookingIcon, PlatformBadge, PlatformIcon } from "./BrandIcons";
import { platformName } from "@/lib/platforms";
import CopyLink from "./CopyLink";
import Icon from "@/components/Icon";



/** Upcoming stays from connected Airbnb / Booking.com calendars, matched to payment links already created. */
export default async function UpcomingGuests({
  calendar,
  payments,
  connected,
  names = {},
  month,
  view: viewParam,
  at: atParam,
  keep = {},
  apartments = [],
  only,
  removed = [],
}: {
  calendar: CalendarResult;
  payments: PaymentRecord[];
  connected: boolean;
  names?: Record<string, string>;
  month?: string; // older links: ?month=YYYY-MM
  view?: string; // all | month | week | day
  at?: string; // YYYY-MM-DD inside the period shown
  keep?: Record<string, string>; // other dashboard filters to carry along in links
  apartments?: { id: string; name: string }[]; // apartments with a connected calendar
  only?: string; // show one apartment's bookings (?stays=<id>); otherwise all combined
  removed?: ListedStay[]; // bookings the host removed (can be restored)
}) {
  const { t, locale } = await getI18n();
  const fmt = (iso: string) => date(iso, locale, { weekday: "short", day: "numeric", month: "short" });
  if (!connected)
    return (
      <section className="panel panel-pad">
        <div className="flex flex-wrap items-center justify-between gap-5">
          <div className="min-w-0 max-w-xl">
            <h2 className="panel-title">{t("upcoming.title")}</h2>
            <p className="panel-sub">
              {t("upcoming.connectIntro")}
            </p>
            <div className="mt-4 flex flex-wrap gap-2">
              {["airbnb", "booking", "vrbo", "misterbandb", "agoda", "expedia"].map((id) => <PlatformBadge key={id} platform={id} />)}
              <span className="inline-flex items-center rounded-xl border border-dashed border-[var(--line)] px-3 py-2 text-sm text-[var(--muted)]">{t("connect.andMore")}</span>
            </div>
          </div>
          <Link
            href="#calendars"
            className="btn btn-primary btn-lg"
          >
            <span className="flex -space-x-1">
              <span className="rounded-full bg-white p-0.5"><AirbnbIcon size={16} /></span>
              <span className="rounded-full bg-white p-0.5"><BookingIcon size={16} /></span>
            </span>
            {t("upcoming.connect")}
          </Link>
        </div>
      </section>
    );

  // View: all bookings, or the arrivals (check-ins) of one month / week / day, with ‹ › to move.
  const today = new Date().toISOString().slice(0, 10);
  const isDay = (v?: string) => !!v && /^\d{4}-\d{2}-\d{2}$/.test(v);
  const view: "all" | "month" | "week" | "day" =
    viewParam === "all" || viewParam === "week" || viewParam === "day" || viewParam === "month" ? viewParam : month === "all" ? "all" : "month";
  const at = isDay(atParam) ? atParam! : month && /^\d{4}-\d{2}$/.test(month) ? `${month}-01` : today;
  const shift = (iso: string, days: number) => new Date(Date.parse(`${iso}T00:00:00Z`) + days * 86400000).toISOString().slice(0, 10);
  const addMonths = (iso: string, n: number) => {
    const d = new Date(`${iso.slice(0, 7)}-01T00:00:00Z`);
    d.setUTCMonth(d.getUTCMonth() + n);
    return d.toISOString().slice(0, 10);
  };
  const weekStart = (iso: string) => shift(iso, -((new Date(`${iso}T00:00:00Z`).getUTCDay() + 6) % 7)); // Monday
  const [start, end] =
    view === "day" ? [at, at]
    : view === "week" ? [weekStart(at), shift(weekStart(at), 6)]
    : view === "month" ? [`${at.slice(0, 7)}-01`, shift(addMonths(at, 1), -1)]
    : ["0000-00-00", "9999-99-99"];
  // One apartment, or every apartment's bookings combined (the host's choice, kept in ?stays=).
  const onlyApt = apartments.some((a) => a.id === only) ? only : undefined;
  const mine = onlyApt ? calendar.stays.filter((s) => s.propertyId === onlyApt) : calendar.stays;
  const stays = mine.filter((s) => s.checkIn >= start && s.checkIn <= end);
  const step = (dir: 1 | -1) => (view === "day" ? shift(at, dir) : view === "week" ? shift(at, 7 * dir) : addMonths(at, dir));
  const href = (v: string, when?: string, apt = onlyApt) =>
    `/host?${new URLSearchParams({ ...keep, ...(apt ? { stays: apt } : {}), view: v, ...(when && v !== "all" ? { at: when } : {}) })}`;
  const long = { day: "numeric", month: "long", year: "numeric" } as const;
  const periodLabel =
    view === "day" ? date(at, locale, { weekday: "long", ...long })
    : view === "week" ? `${date(start, locale, { day: "numeric", month: "short" })} – ${date(end, locale, { day: "numeric", month: "short", year: "numeric" })}`
    : view === "month" ? date(start, locale, { month: "long", year: "numeric" })
    : "";
  const bookingKey = (s: { source: string; uid: string }) => `${s.source}:${s.uid}`;

  // A booking "has a link" if a payment request exists for the same apartment and check-in date.
  const linkFor = (propertyId: string, checkIn: string) =>
    payments.find((p) => p.propertyId === propertyId && p.quote.checkIn === checkIn && p.status !== "refunded");

  return (
    <section className="panel overflow-hidden">
      <div className="flex flex-wrap items-center justify-between gap-3 px-5 py-4">
        <div className="flex min-w-0 items-center gap-3">
          <span className="icon-chip"><Icon name="calendar" size={17} /></span>
          <div className="min-w-0">
            <h2 className="panel-title">{t("upcoming.title")}</h2>
            <p className="hidden text-xs text-[var(--muted)] sm:block">{t("upcoming.autoRefresh")}</p>
          </div>
        </div>
        <div className="flex items-center gap-1.5">
          <Link href="#calendars" className="btn btn-quiet btn-sm"><Icon name="settings" size={14} /> {t("upcoming.manage")}</Link>
          <form action={syncCalendars}>
            <button className="btn btn-secondary btn-sm"><Icon name="refresh" size={14} /> {t("upcoming.syncNow")}</button>
          </form>
        </div>
      </div>

      {calendar.errors.map((e) => (
        <p key={`${e.propertyName}${e.source}`} className="note note-danger mx-5 mb-3">
          {t("upcoming.calError", { platform: platformName(e.source), name: e.propertyName })} {calendarErrorText(e.error, t)}
        </p>
      ))}

      {apartments.length > 1 && (
        <nav className="flex gap-1.5 overflow-x-auto border-t border-[var(--line)] px-5 py-3 text-sm [scrollbar-width:none]" aria-label={t("upcoming.whichApartments")}>
          {[{ id: "", name: t("upcoming.allApartments") }, ...apartments].map((a) => (
            <Link
              key={a.id || "all"}
              href={href(view, at, a.id || undefined)}
              scroll={false}
              aria-current={(onlyApt ?? "") === a.id ? "page" : undefined}
              className={`inline-flex h-8 shrink-0 items-center gap-2 rounded-full border px-3 transition-colors ${
                (onlyApt ?? "") === a.id ? "border-[var(--line-strong)] bg-white/[0.08] font-medium text-[var(--ink)] shadow-[var(--edge)]" : "border-[var(--line)] text-[var(--muted)] hover:border-[var(--line-strong)] hover:text-[var(--ink)]"
              }`}
            >
              {a.name}
              <span className="rounded-full bg-white/[0.06] px-1.5 text-xs tabular-nums text-[var(--muted)]">{(a.id ? calendar.stays.filter((st) => st.propertyId === a.id) : calendar.stays).length}</span>
            </Link>
          ))}
        </nav>
      )}

      <nav className="flex flex-wrap items-center gap-3 border-y border-[var(--line)] bg-white/[0.012] px-5 py-3 text-sm" aria-label={t("upcoming.view")}>
        <div className="seg">
          {(["all", "month", "week", "day"] as const).map((v) => (
            <Link
              key={v}
              href={href(v, at)}
              scroll={false}
              aria-current={v === view ? "page" : undefined}
            >
              {t(`upcoming.view.${v}`)}
            </Link>
          ))}
        </div>
        {view !== "all" && (
          <div className="flex items-center gap-1">
            <Link href={href(view, step(-1))} scroll={false} aria-label={t("upcoming.prev")} className="btn btn-quiet btn-sm btn-icon"><Icon name="chevronLeft" size={16} /></Link>
            <span className="min-w-36 text-center font-medium">{periodLabel}</span>
            <Link href={href(view, step(1))} scroll={false} aria-label={t("upcoming.next")} className="btn btn-quiet btn-sm btn-icon"><Icon name="chevronRight" size={16} /></Link>
            <Link href={href(view, today)} scroll={false} className="btn btn-secondary btn-sm ms-1 h-7 px-2.5 text-xs">{t("upcoming.today")}</Link>
          </div>
        )}
        <span className="pill pill-neutral pill-plain ms-auto">{t.plural("upcoming.arrivals", stays.length)}</span>
      </nav>

      {stays.length === 0 ? (
        <div className="flex flex-col items-center gap-2 px-5 py-12 text-center text-sm text-[var(--muted)]">
          <span className="icon-chip"><Icon name="calendar" size={17} /></span>
          {view === "all" ? t("upcoming.none") : t("upcoming.noneInPeriod")}
        </div>
      ) : (
        <ul className="divide-y divide-[var(--line)]">
          {stays.map((s) => {
            const link = linkFor(s.propertyId, s.checkIn);
            const paid = link && (link.status === "paid" || link.status === "paid_offline");
            const key = bookingKey(s);
            const typed = names[key];
            const params = new URLSearchParams({
              property: s.propertyId,
              checkin: s.checkIn,
              checkout: s.checkOut,
              ...(s.reservationCode ? { ref: s.reservationCode } : {}),
              ...(typed ? { name: typed } : {}),
            });
            return (
              <li key={`${s.source}${s.uid}`} className="flex flex-wrap items-center justify-between gap-x-4 gap-y-3 px-5 py-4 transition-colors hover:bg-white/[0.015]">
                <div className="flex min-w-0 items-start gap-4">
                <div className="flex w-12 shrink-0 flex-col items-center rounded-[var(--r-md)] border border-[var(--line)] bg-[var(--panel-raised)] py-1.5 shadow-[var(--edge)]" aria-hidden>
                  <span className="text-[0.625rem] font-semibold uppercase tracking-wider text-[var(--muted)]">{date(s.checkIn, locale, { month: "short" })}</span>
                  <span className="text-lg font-semibold leading-tight tabular-nums">{date(s.checkIn, locale, { day: "numeric" })}</span>
                </div>
                <div className="min-w-0">
                  {/* Once a link exists we know who is coming; calendar feeds only share dates. */}
                  {!link?.guestName && <GuestName t={t} bookingKey={key} booking={{ propertyId: s.propertyId, checkIn: s.checkIn }} name={typed} />}
                  {link && (
                    <div className="font-semibold">
                      {link.guestName}{link.guestName ? " " : ""}
                      <span className="font-normal text-[var(--muted)]">
                        {link.guestsToConfirm ? (
                          <>· {t("dash.guestsToConfirm")}</>
                        ) : (
                          <>
                            · {t.plural("guest.adults", link.quote.adults)}
                            {link.quote.childAges.length > 0 && `, ${t.plural("guest.children", link.quote.childAges.length)}`} · {money(link.quote.totalCents, link.quote.currency, locale)}
                          </>
                        )}
                      </span>
                    </div>
                  )}
                  <div className={link ? "text-sm" : "font-medium"}>
                    {fmt(s.checkIn)} → {fmt(s.checkOut)} <span className="font-normal text-[var(--muted)]">· {t.plural("line.nights", s.nights)}</span>
                  </div>
                  <div className="mt-1.5 flex flex-wrap items-center gap-2 text-xs text-[var(--muted)]">
                    <span className="inline-flex h-6 items-center gap-1.5 rounded-full border border-[var(--line)] bg-white/[0.04] px-2 font-medium text-[var(--ink)]">
                      <PlatformIcon id={s.source} size={12} />
                      {platformName(s.source)}
                    </span>
                    <span>{s.propertyName}</span>
                    {s.reservationCode && <span>· {s.reservationCode}</span>}
                    {s.phoneLast4 && <span>· {t("upcoming.phone", { last4: s.phoneLast4 })}</span>}
                    {(s as { missing?: boolean }).missing && (
                      <span className="pill pill-warning" title={t("upcoming.missingHint")}>
                        {t("upcoming.missing", { platform: platformName(s.source) })}
                      </span>
                    )}
                  </div>
                </div>
                </div>
                <div className="flex items-center gap-1.5 text-sm max-sm:w-full max-sm:ps-16">
                  {link ? (
                    <>
                      <span className={`pill me-1 ${paid ? "pill-success" : "pill-warning"}`}>
                        {paid ? t("status.paid") : t("upcoming.linkSent")}
                      </span>
                      {!paid && <CopyLink path={`/p/${link.id}`} compact />}
                    </>
                  ) : (
                    <Link href={`/host/new?${params}`} className="btn btn-primary btn-sm">
                      <Icon name="link" size={14} /> {t("upcoming.createLink")}
                    </Link>
                  )}
                  <form action={hideStay.bind(null, stayKey(s))}>
                    <button className="btn btn-quiet btn-sm btn-icon" title={t("upcoming.removeHint")} aria-label={t("upcoming.remove")}>
                      <Icon name="x" size={15} />
                    </button>
                  </form>
                </div>
              </li>
            );
          })}
        </ul>
      )}
      {removed.length > 0 && (
        <details className="group border-t border-[var(--line)] px-5 py-3 text-sm">
          <summary className="flex cursor-pointer list-none items-center gap-2 text-[var(--muted)] hover:text-[var(--ink)] [&::-webkit-details-marker]:hidden"><Icon name="chevronRight" size={14} className="transition-transform group-open:rotate-90" />{t("upcoming.removedList", { count: removed.length })}</summary>
          <ul className="panel-inset mt-3 divide-y divide-[var(--line)]">
            {removed.map((s) => (
              <li key={s.key} className="flex flex-wrap items-center justify-between gap-3 px-4 py-2.5">
                <span>
                  <span className="font-medium">{fmt(s.checkIn)} → {fmt(s.checkOut)}</span>
                  <span className="text-[var(--muted)]"> · {platformName(s.source)} · {s.propertyName}</span>
                </span>
                <form action={restoreStay.bind(null, s.key)}>
                  <button className="btn btn-secondary btn-sm"><Icon name="refresh" size={13} /> {t("upcoming.restore")}</button>
                </form>
              </li>
            ))}
          </ul>
        </details>
      )}
      {calendar.stays.some((s) => s.source === "booking") && (
        <p className="flex gap-2 border-t border-[var(--line)] px-5 py-3 text-xs text-[var(--muted)]">
          <Icon name="info" size={13} className="mt-px" />
          {t("upcoming.bookingNote")}
        </p>
      )}
    </section>
  );
}

/** The guest's name for a calendar booking: typed once by the host, then shown and used for the payment link. */
function GuestName({ t, bookingKey, booking, name }: { t: Awaited<ReturnType<typeof getI18n>>["t"]; bookingKey: string; booking: { propertyId: string; checkIn: string }; name?: string }) {
  const form = (
    <form action={saveBookingName.bind(null, bookingKey, booking)} className="flex items-center gap-1.5">
      <input
        name="name"
        defaultValue={name ?? ""}
        placeholder={t("upcoming.guestNamePh")}
        aria-label={t("form.guestName")}
        maxLength={120}
        className="input h-8 w-44 rounded-[var(--r-sm)] px-2.5 text-sm"
      />
      <button className="btn btn-secondary btn-sm">{t("upcoming.saveName")}</button>
    </form>
  );
  if (!name) return <div className="mb-1.5">{form}</div>;
  return (
    <details className="group mb-0.5">
      <summary className="flex cursor-pointer list-none items-center gap-2 font-semibold">
        {name}
        <span className="text-xs font-normal text-[var(--muted)] underline group-open:hidden">{t("upcoming.editName")}</span>
      </summary>
      <div className="mt-1.5">{form}</div>
    </details>
  );
}
