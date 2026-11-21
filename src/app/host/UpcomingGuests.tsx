import Link from "next/link";
import { getI18n } from "@/i18n/server";
import { date, money } from "@/i18n/translate";
import type { CalendarResult } from "@/lib/calendar";
import { calendarErrorText } from "@/lib/format";
import type { PaymentRecord } from "@/lib/store";
import { syncCalendars } from "./actions";
import { AirbnbIcon, BookingIcon, PlatformBadge } from "./BrandIcons";
import CopyLink from "./CopyLink";


const SOURCE = {
  airbnb: { label: "Airbnb", cls: "bg-rose-400/15 text-rose-200" },
  booking: { label: "Booking.com", cls: "bg-blue-400/15 text-blue-200" },
};

/** Upcoming stays from connected Airbnb / Booking.com calendars, matched to payment links already created. */
export default async function UpcomingGuests({ calendar, payments, connected }: { calendar: CalendarResult; payments: PaymentRecord[]; connected: boolean }) {
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
              <PlatformBadge platform="airbnb" />
              <PlatformBadge platform="booking" />
            </div>
          </div>
          <Link
            href="/host/connect"
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

  // A booking "has a link" if a payment request exists for the same apartment and check-in date.
  const linkFor = (propertyId: string, checkIn: string) =>
    payments.find((p) => p.propertyId === propertyId && p.quote.checkIn === checkIn && p.status !== "refunded");

  return (
    <section className="mb-8 rounded-2xl border border-[var(--line)] bg-[var(--surface)]">
      <div className="flex flex-wrap items-center justify-between gap-3 border-b border-[var(--line)] px-5 py-4">
        <div className="flex items-center gap-3">
          <h2 className="font-semibold">{t("upcoming.title")}</h2>
          <span className="flex items-center gap-1"><AirbnbIcon size={18} /><BookingIcon size={18} /></span>
        </div>
        <div className="flex items-center gap-3 text-sm">
          <span className="hidden text-xs text-[var(--muted)] sm:inline">{t("upcoming.autoRefresh")}</span>
          <Link href="/host/connect" className="text-[var(--muted)] underline">{t("upcoming.manage")}</Link>
          <form action={syncCalendars}>
            <button className="rounded-lg border border-[var(--line)] bg-[var(--surface)] px-3 py-1.5 font-medium hover:bg-[var(--soft)]">↻ {t("upcoming.syncNow")}</button>
          </form>
        </div>
      </div>

      {calendar.errors.map((e) => (
        <p key={`${e.propertyName}${e.source}`} className="mx-5 mt-3 rounded-lg bg-red-500/10 p-2 text-sm text-red-300">
          {t("upcoming.calError", { platform: SOURCE[e.source].label, name: e.propertyName })} {calendarErrorText(e.error, t)}
        </p>
      ))}

      {calendar.stays.length === 0 ? (
        <p className="px-5 py-8 text-center text-sm text-[var(--muted)]">{t("upcoming.none")}</p>
      ) : (
        <ul className="divide-y divide-[var(--line)]">
          {calendar.stays.map((s) => {
            const link = linkFor(s.propertyId, s.checkIn);
            const paid = link && (link.status === "paid" || link.status === "paid_offline");
            const params = new URLSearchParams({ property: s.propertyId, checkin: s.checkIn, checkout: s.checkOut, ...(s.reservationCode ? { ref: s.reservationCode } : {}) });
            return (
              <li key={`${s.source}${s.uid}`} className="flex flex-wrap items-center justify-between gap-3 px-5 py-3">
                <div className="min-w-0">
                  {/* Once a link exists we know who is coming; calendar feeds only share dates. */}
                  {link && (
                    <div className="font-semibold">
                      {link.guestName}{" "}
                      <span className="font-normal text-[var(--muted)]">
                        · {t.plural("guest.adults", link.quote.adults)}
                        {link.quote.childAges.length > 0 && `, ${t.plural("guest.children", link.quote.childAges.length)}`} · {money(link.quote.totalCents, link.quote.currency, locale)}
                      </span>
                    </div>
                  )}
                  <div className={link ? "text-sm" : "font-medium"}>
                    {fmt(s.checkIn)} → {fmt(s.checkOut)} <span className="font-normal text-[var(--muted)]">· {t.plural("line.nights", s.nights)}</span>
                  </div>
                  <div className="mt-0.5 flex flex-wrap items-center gap-2 text-xs text-[var(--muted)]">
                    <span className={`inline-flex items-center gap-1 rounded-full px-2 py-0.5 font-medium ${SOURCE[s.source].cls}`}>
                      {s.source === "airbnb" ? <AirbnbIcon size={12} /> : <BookingIcon size={12} />}
                      {SOURCE[s.source].label}
                    </span>
                    <span>{s.propertyName}</span>
                    {s.reservationCode && <span>· {s.reservationCode}</span>}
                    {s.phoneLast4 && <span>· {t("upcoming.phone", { last4: s.phoneLast4 })}</span>}
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

