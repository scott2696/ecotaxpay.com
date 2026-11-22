import Link from "next/link";
import { getI18n } from "@/i18n/server";
import { date, money } from "@/i18n/translate";
import type { CalendarResult } from "@/lib/calendar";
import { calendarErrorText } from "@/lib/format";
import type { PaymentRecord } from "@/lib/store";
import { hideStay, saveBookingName, syncCalendars } from "./actions";
import { stayKey } from "@/lib/bookings";
import { AirbnbIcon, BookingIcon, PlatformBadge, PlatformIcon } from "./BrandIcons";
import { platformName } from "@/lib/platforms";
import CopyLink from "./CopyLink";



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
}) {
  const { t, locale } = await getI18n();
  const fmt = (iso: string) => date(iso, locale, { weekday: "short", day: "numeric", month: "short" });
  if (!connected)
    return (
      <section className="mb-8 rounded-2xl border border-[var(--line)] bg-[var(--surface)] p-6">
        <div className="flex flex-wrap items-center justify-between gap-5">
          <div className="min-w-0 max-w-xl">
            <h2 className="text-lg font-semibold">{t("upcoming.title")}</h2>
            <p className="mt-1 text-sm text-[var(--muted)]">
              {t("upcoming.connectIntro")}
            </p>
            <div className="mt-4 flex flex-wrap gap-2">
              {["airbnb", "booking", "vrbo", "misterbandb", "agoda", "expedia"].map((id) => <PlatformBadge key={id} platform={id} />)}
              <span className="inline-flex items-center rounded-xl border border-dashed border-[var(--line)] px-3 py-2 text-sm text-[var(--muted)]">{t("connect.andMore")}</span>
            </div>
          </div>
          <Link
            href="#calendars"
            className="inline-flex items-center gap-2 rounded-xl bg-[var(--accent)] px-5 py-3 font-semibold text-[var(--on-accent)] shadow-sm hover:brightness-110"
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
    <section className="mb-8 rounded-2xl border border-[var(--line)] bg-[var(--surface)]">
      <div className="flex flex-wrap items-center justify-between gap-3 border-b border-[var(--line)] px-5 py-4">
        <div className="flex items-center gap-3">
          <h2 className="font-semibold">{t("upcoming.title")}</h2>
          <span className="flex items-center gap-1">{["airbnb", "booking", "vrbo"].map((id) => <PlatformIcon key={id} id={id} size={18} />)}</span>
        </div>
        <div className="flex items-center gap-3 text-sm">
          <span className="hidden text-xs text-[var(--muted)] sm:inline">{t("upcoming.autoRefresh")}</span>
          <Link href="#calendars" className="text-[var(--muted)] underline">{t("upcoming.manage")}</Link>
          <form action={syncCalendars}>
            <button className="rounded-lg border border-[var(--line)] bg-[var(--surface)] px-3 py-1.5 font-medium hover:bg-[var(--soft)]">↻ {t("upcoming.syncNow")}</button>
          </form>
        </div>
      </div>

      {calendar.errors.map((e) => (
        <p key={`${e.propertyName}${e.source}`} className="mx-5 mt-3 rounded-lg bg-red-500/10 p-2 text-sm text-red-300">
          {t("upcoming.calError", { platform: platformName(e.source), name: e.propertyName })} {calendarErrorText(e.error, t)}
        </p>
      ))}

      {apartments.length > 1 && (
        <nav className="flex gap-1.5 overflow-x-auto border-b border-[var(--line)] px-5 py-3 text-sm" aria-label={t("upcoming.whichApartments")}>
          {[{ id: "", name: t("upcoming.allApartments") }, ...apartments].map((a) => (
            <Link
              key={a.id || "all"}
              href={href(view, at, a.id || undefined)}
              scroll={false}
              aria-current={(onlyApt ?? "") === a.id ? "page" : undefined}
              className={`shrink-0 rounded-full border px-3 py-1 transition-colors ${
                (onlyApt ?? "") === a.id ? "border-[var(--accent)] bg-[var(--soft)] font-medium text-[var(--ink)]" : "border-[var(--line)] text-[var(--muted)] hover:text-[var(--ink)]"
              }`}
            >
              {a.name}
              <span className="ms-1 text-[var(--muted)]">{(a.id ? calendar.stays.filter((st) => st.propertyId === a.id) : calendar.stays).length}</span>
            </Link>
          ))}
        </nav>
      )}

      <nav className="flex flex-wrap items-center gap-3 border-b border-[var(--line)] px-5 py-3 text-sm" aria-label={t("upcoming.view")}>
        <div className="inline-flex rounded-lg border border-[var(--line)] p-0.5">
          {(["all", "month", "week", "day"] as const).map((v) => (
            <Link
              key={v}
              href={href(v, at)}
              scroll={false}
              aria-current={v === view ? "page" : undefined}
              className={`rounded-md px-3 py-1 ${v === view ? "bg-[var(--soft)] font-medium text-[var(--ink)]" : "text-[var(--muted)] hover:text-[var(--ink)]"}`}
            >
              {t(`upcoming.view.${v}`)}
            </Link>
          ))}
        </div>
        {view !== "all" && (
          <div className="flex items-center gap-1">
            <Link href={href(view, step(-1))} scroll={false} aria-label={t("upcoming.prev")} className="rounded-md px-2 py-1 text-[var(--muted)] hover:bg-[var(--soft)] hover:text-[var(--ink)]">‹</Link>
            <span className="min-w-40 text-center font-medium">{periodLabel}</span>
            <Link href={href(view, step(1))} scroll={false} aria-label={t("upcoming.next")} className="rounded-md px-2 py-1 text-[var(--muted)] hover:bg-[var(--soft)] hover:text-[var(--ink)]">›</Link>
            <Link href={href(view, today)} scroll={false} className="ms-1 rounded-md border border-[var(--line)] px-2 py-0.5 text-xs text-[var(--muted)] hover:text-[var(--ink)]">{t("upcoming.today")}</Link>
          </div>
        )}
        <span className="ms-auto text-xs text-[var(--muted)]">{t.plural("upcoming.arrivals", stays.length)}</span>
      </nav>

      {stays.length === 0 ? (
        <p className="px-5 py-8 text-center text-sm text-[var(--muted)]">{view === "all" ? t("upcoming.none") : t("upcoming.noneInPeriod")}</p>
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
              <li key={`${s.source}${s.uid}`} className="flex flex-wrap items-center justify-between gap-3 px-5 py-3">
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
                  <div className="mt-0.5 flex flex-wrap items-center gap-2 text-xs text-[var(--muted)]">
                    <span className="inline-flex items-center gap-1 rounded-full bg-white/[0.07] px-2 py-0.5 font-medium text-[var(--ink)]">
                      <PlatformIcon id={s.source} size={12} />
                      {platformName(s.source)}
                    </span>
                    <span>{s.propertyName}</span>
                    {s.reservationCode && <span>· {s.reservationCode}</span>}
                    {s.phoneLast4 && <span>· {t("upcoming.phone", { last4: s.phoneLast4 })}</span>}
                    {(s as { missing?: boolean }).missing && (
                      <span className="rounded-full bg-amber-400/15 px-2 py-0.5 text-amber-200" title={t("upcoming.missingHint")}>
                        {t("upcoming.missing", { platform: platformName(s.source) })}
                      </span>
                    )}
                  </div>
                </div>
                <div className="flex items-center gap-3 text-sm">
                  {link ? (
                    <>
                      <span className={`rounded-full px-2 py-0.5 text-xs font-medium ${paid ? "bg-emerald-400/15 text-emerald-300" : "bg-amber-400/15 text-amber-200"}`}>
                        {paid ? t("status.paid") : t("upcoming.linkSent")}
                      </span>
                      {!paid && <CopyLink path={`/p/${link.id}`} />}
                    </>
                  ) : (
                    <Link href={`/host/new?${params}`} className="rounded-lg bg-[var(--accent)] px-3 py-1.5 text-xs font-semibold text-[var(--on-accent)] hover:brightness-110">
                      {t("upcoming.createLink")}
                    </Link>
                  )}
                  <form action={hideStay.bind(null, stayKey(s))}>
                    <button className="rounded-lg px-2 py-1.5 text-xs text-[var(--muted)] hover:bg-[var(--soft)] hover:text-[var(--ink)]" title={t("upcoming.removeHint")} aria-label={t("upcoming.remove")}>
                      {t("upcoming.remove")}
                    </button>
                  </form>
                </div>
              </li>
            );
          })}
        </ul>
      )}
      {calendar.stays.some((s) => s.source === "booking") && (
        <p className="border-t border-[var(--line)] px-5 py-3 text-xs text-[var(--muted)]">
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
        className="input h-8 w-48 px-2 text-sm"
      />
      <button className="h-8 rounded-lg border border-[var(--line)] px-2.5 text-xs font-medium hover:bg-[var(--soft)]">{t("upcoming.saveName")}</button>
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
