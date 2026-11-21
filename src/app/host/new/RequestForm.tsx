"use client";

import Link from "next/link";
import { useEffect, useMemo, useState } from "react";
import type { Quote } from "@/lib/calc";
import { useT } from "@/i18n/client";
import { date, money as fmtMoney } from "@/i18n/translate";
import { describeLine, guestNotes, regionNote } from "@/lib/format";
import SendPanel, { type GuestTemplates } from "../SendPanel";


const todayIso = () => new Date().toISOString().slice(0, 10);
const addDays = (iso: string, n: number) => {
  const d = new Date(`${iso}T00:00:00Z`);
  d.setUTCDate(d.getUTCDate() + n);
  return d.toISOString().slice(0, 10);
};
const nightsBetween = (a: string, b: string) =>
  a && b ? Math.round((Date.parse(`${b}T00:00:00Z`) - Date.parse(`${a}T00:00:00Z`)) / 86_400_000) : 0;

/** An apartment plus a summary of the tax that applies to it (resolved on the server, incl. custom destinations). */
export type PropertyOption = {
  id: string;
  name: string;
  info: { flag: string; place: string; accLabel: string; taxName: string; basis: string; percent?: number; currency: string; minTaxableAge?: number };
};

/** Host fills in the stay; the guest only ever sees the resulting payment page. */
export type Prefill = { propertyId?: string; checkIn?: string; checkOut?: string; bookingRef?: string };

export default function RequestForm({ properties, prefill = {}, templates }: { properties: PropertyOption[]; prefill?: Prefill; templates: GuestTemplates }) {
  const t = useT();
  const money = (c: number, cur = "EUR") => fmtMoney(c, cur, t.locale);
  const fmtLong = (iso: string) => date(iso, t.locale, { weekday: "short", day: "numeric", month: "short", year: "numeric" });
  const [propertyId, setPropertyId] = useState(
    properties.some((p) => p.id === prefill.propertyId) ? prefill.propertyId! : properties[0].id,
  );
  const property = properties.find((p) => p.id === propertyId) ?? properties[0];
  const info = property.info;
  const currencySymbol =
    new Intl.NumberFormat("en-GB", { style: "currency", currency: info.currency }).formatToParts(0).find((p) => p.type === "currency")?.value ?? info.currency;

  const validDates = !!prefill.checkIn && !!prefill.checkOut && prefill.checkOut > prefill.checkIn;
  const [checkIn, setCheckIn] = useState(validDates ? prefill.checkIn! : todayIso());
  const [checkOut, setCheckOut] = useState(validDates ? prefill.checkOut! : addDays(todayIso(), 7));
  const nights = nightsBetween(checkIn, checkOut);

  function changeCheckIn(v: string) {
    // Keep the stay length when moving check-in; never let check-out fall on/before check-in.
    if (v && checkIn) setCheckOut(addDays(v, Math.max(1, nights)));
    setCheckIn(v);
  }
  const [adults, setAdults] = useState(2);
  const [childAges, setChildAges] = useState<number[]>([]);
  const [nightlyPrice, setNightlyPrice] = useState("");
  const [guestName, setGuestName] = useState("");
  const [guestEmail, setGuestEmail] = useState("");
  const [guestPhone, setGuestPhone] = useState("");
  const [bookingRef, setBookingRef] = useState(prefill.bookingRef ?? "");

  const [quote, setQuote] = useState<Quote | null>(null);
  const [quoteError, setQuoteError] = useState<string | null>(null);
  const [submitting, setSubmitting] = useState(false);
  const [submitError, setSubmitError] = useState<string | null>(null);
  const [created, setCreated] = useState<{ url: string } | null>(null);

  // Remember the last property used: most hosts send links for the same place every time.
  useEffect(() => {
    try {
      if (prefill.propertyId) return; // came from an imported booking: keep its apartment
      const last = localStorage.getItem("etp:lastProperty");
      if (last && properties.some((p) => p.id === last)) setPropertyId(last);
    } catch {}
  }, [properties, prefill.propertyId]);

  const stay = useMemo(
    () => ({ propertyId, checkIn, nights, adults, childAges, nightlyPrice }),
    [propertyId, checkIn, nights, adults, childAges, nightlyPrice],
  );

  useEffect(() => {
    if (stay.nights < 1) {
      setQuote(null);
      setQuoteError(t("form.checkoutAfter"));
      return;
    }
    const ctrl = new AbortController();
    const timer = setTimeout(async () => {
      try {
        const res = await fetch("/api/host/quote", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify(stay),
          signal: ctrl.signal,
        });
        const data = await res.json();
        if (res.ok) {
          setQuote(data);
          setQuoteError(null);
        } else {
          setQuote(null);
          setQuoteError(data.error);
        }
      } catch {
        /* aborted */
      }
    }, 200);
    return () => {
      clearTimeout(timer);
      ctrl.abort();
    };
  }, [stay, t]);

  async function create(e: React.FormEvent) {
    e.preventDefault();
    setSubmitting(true);
    setSubmitError(null);
    try {
      const res = await fetch("/api/host/requests", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ ...stay, propertyId, guestName, guestEmail, guestPhone, bookingRef }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error);
      try {
        localStorage.setItem("etp:lastProperty", propertyId);
      } catch {}
      setCreated({ url: `${window.location.origin}${data.path}` });
      window.scrollTo({ top: 0, behavior: "smooth" });
    } catch (err) {
      setSubmitError(err instanceof Error ? err.message : t("common.error"));
    } finally {
      setSubmitting(false);
    }
  }

  function reset() {
    setCreated(null);
    setGuestName("");
    setGuestEmail("");
    setGuestPhone("");
    setBookingRef("");
    setChildAges([]);
    setNightlyPrice("");
  }

  if (created && quote) {
    return (
      <div className="mx-auto max-w-2xl">
        <SendPanel
          url={created.url}
          guestName={guestName}
          guestEmail={guestEmail}
          guestPhone={guestPhone}
          amount={money(quote.totalCents, quote.currency)}
          taxName={quote.taxName}
          checkIn={quote.checkIn}
          checkOut={quote.checkOut}
          propertyName={property.name}
          templates={templates}
        />
        <div className="mt-4 flex gap-3">
          <button type="button" onClick={reset} className="rounded-lg bg-[var(--accent)] px-4 py-2.5 text-sm font-semibold text-[var(--on-accent)]">
            + {t("form.another")}
          </button>
          <a href="/host" className="rounded-lg border border-[var(--line)] bg-[var(--surface)] px-4 py-2.5 text-sm font-medium">
            {t("form.backToDashboard")}
          </a>
        </div>
      </div>
    );
  }

  const setChildCount = (n: number) =>
    setChildAges((prev) => (n > prev.length ? [...prev, ...Array(n - prev.length).fill(8)] : prev.slice(0, n)));

  return (
    <form onSubmit={create} className="grid grid-cols-1 gap-6 lg:grid-cols-[minmax(0,1fr)_380px] lg:items-start">
      <div className="min-w-0 space-y-6">
        <Card step={1} title={t("form.whichApartment")}>
          <div className="grid grid-cols-1 gap-2 sm:grid-cols-2">
            {properties.map((p) => (
              <label
                key={p.id}
                className={`flex cursor-pointer items-start gap-3 rounded-lg border p-3 text-sm transition ${
                  p.id === propertyId ? "border-[var(--accent)] bg-[var(--soft)]" : "border-[var(--line)] hover:bg-[var(--bg)]"
                }`}
              >
                <input type="radio" name="property" className="mt-0.5 accent-[var(--accent)]" checked={p.id === propertyId} onChange={() => setPropertyId(p.id)} />
                <span className="font-medium">{p.name}</span>
              </label>
            ))}
          </div>
          <p className="mt-3 text-xs text-[var(--muted)]">
            {info.flag} {info.place} · {info.accLabel} · {info.taxName} ·{" "}
            <Link href={`/host/properties/${property.id}`} className="underline">{t("form.editGuide")}</Link> ·{" "}
            <Link href="/host/properties/new" className="underline">+ {t("form.addAnother")}</Link>
          </p>
        </Card>

        <Card step={2} title={t("form.stay")}>
          <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
            <Field label={t("form.checkIn")}>
              <input type="date" className="input" value={checkIn} onChange={(e) => changeCheckIn(e.target.value)} required />
            </Field>
            <Field label={t("form.checkOut")}>
              <input
                type="date"
                className="input"
                value={checkOut}
                min={checkIn ? addDays(checkIn, 1) : undefined}
                onChange={(e) => setCheckOut(e.target.value)}
                required
              />
            </Field>
            <p className="-mt-1 text-sm text-[var(--muted)] sm:col-span-2">
              {nights >= 1 ? (
                <>
                  <span className="font-medium text-[var(--ink)]">{t.plural("line.nights", nights)}</span> · {fmtLong(checkIn)} → {fmtLong(checkOut)}
                </>
              ) : (
                <span className="text-red-300">{t("form.checkoutAfter")}</span>
              )}
            </p>
            {info.basis === "percent" && (
              <Field label={t("form.pricePerNight")} className="sm:col-span-2" hint={t("form.percentHint", { pct: info.percent ?? "" })}>
                <div className="relative">
                  <span className="pointer-events-none absolute start-3 top-1/2 -translate-y-1/2 text-[var(--muted)]">{currencySymbol}</span>
                  <input type="number" inputMode="decimal" min="1" step="0.01" className={`input ${currencySymbol.length > 1 ? "ps-12" : "ps-7"}`} placeholder="150.00" value={nightlyPrice} onChange={(e) => setNightlyPrice(e.target.value)} required />
                </div>
              </Field>
            )}
            <Field label={t("form.adults")}>
              <Stepper value={adults} min={1} max={20} onChange={setAdults} />
            </Field>
            <Field label={t("form.children")}>
              <Stepper value={childAges.length} min={0} max={10} onChange={setChildCount} />
            </Field>
          </div>
          {childAges.length > 0 && (
            <div className="mt-4">
              <div className="mb-2 text-sm font-medium">{t("form.childAges")}</div>
              <div className="flex flex-wrap gap-2">
                {childAges.map((age, i) => (
                  <select
                    key={i}
                    aria-label={t("form.childAge", { n: i + 1 })}
                    className="input w-auto"
                    value={age}
                    onChange={(e) => setChildAges((prev) => prev.map((a, j) => (j === i ? Number(e.target.value) : a)))}
                  >
                    {Array.from({ length: 18 }, (_, a) => (
                      <option key={a} value={a}>
                        {t.plural("form.years", a)}
                      </option>
                    ))}
                  </select>
                ))}
              </div>
              {!!info.minTaxableAge && <p className="mt-2 text-xs text-[var(--muted)]">{t("explain.childrenFree", { age: info.minTaxableAge })}</p>}
            </div>
          )}
        </Card>

        <Card step={3} title={t("receipt.guest")}>
          <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
            <Field label={t("form.guestName")}>
              <input className="input" value={guestName} onChange={(e) => setGuestName(e.target.value)} required />
            </Field>
            <Field label={t("form.bookingRef")} hint={t("form.bookingRefHint")}>
              <input className="input" value={bookingRef} onChange={(e) => setBookingRef(e.target.value)} />
            </Field>
            <Field label={t("form.guestEmail")} hint={t("form.guestEmailHint")}>
              <input type="email" className="input" value={guestEmail} onChange={(e) => setGuestEmail(e.target.value)} />
            </Field>
            <Field label={t("form.guestMobile")} hint={t("form.guestMobileHint")}>
              <input type="tel" className="input" value={guestPhone} onChange={(e) => setGuestPhone(e.target.value)} placeholder="+356 …" />
            </Field>
          </div>
        </Card>
      </div>

      <aside className="lg:sticky lg:top-6">
        <div className="rounded-2xl border border-[var(--line)] bg-[var(--surface)] p-6 shadow-sm">
          <h2 className="text-sm font-semibold uppercase tracking-wide text-[var(--muted)]">{t("form.guestWillPay")}</h2>
          {quote ? (
            <>
              <ul className="mt-4 space-y-2 text-sm">
                {quote.lines.map((l, i) => (
                  <li key={i} className="flex justify-between gap-4">
                    <span className="text-[var(--muted)]">{describeLine(l, quote.currency, t)}</span>
                    <span className="tabular-nums">{money(l.amountCents, quote.currency)}</span>
                  </li>
                ))}
                {quote.feeCents > 0 && (
                  <li className="flex justify-between gap-4">
                    <span className="text-[var(--muted)]">{t("common.serviceFee")}</span>
                    <span className="tabular-nums">{money(quote.feeCents, quote.currency)}</span>
                  </li>
                )}
              </ul>
              <div className="my-4 border-t border-[var(--line)]" />
              <div className="flex items-baseline justify-between">
                <span className="font-semibold">{t("dash.col.total")}</span>
                <span className="text-3xl font-semibold tabular-nums">{money(quote.totalCents, quote.currency)}</span>
              </div>
              {quote.hostNotes.length > 0 && (
                <p className="mt-3 rounded-lg bg-amber-400/10 p-2 text-xs text-amber-200">{t("form.noteForYou")} {regionNote(quote.regionId, quote.hostNotes.join(" "), t)}</p>
              )}
              {guestNotes(quote, t).length > 0 && (
                <ul className="mt-3 space-y-1 text-xs text-[var(--muted)]">
                  {guestNotes(quote, t).map((n) => (
                    <li key={n}>• {n}</li>
                  ))}
                </ul>
              )}
            </>
          ) : (
            <p className="mt-4 text-sm text-[var(--muted)]">{quoteError ?? t("form.calculating")}</p>
          )}
          {submitError && <p className="mt-4 rounded-lg bg-red-500/10 p-3 text-sm text-red-300">{submitError}</p>}
          <button
            type="submit"
            disabled={!quote || quote.totalCents === 0 || submitting}
            className="mt-6 w-full rounded-xl bg-[var(--accent)] px-4 py-3.5 font-semibold text-[var(--on-accent)] transition hover:brightness-110 disabled:cursor-not-allowed disabled:opacity-50"
          >
            {submitting ? t("form.creating") : quote && quote.totalCents === 0 ? t("form.noTax") : t("form.createFor", { name: property.name })}
          </button>
        </div>
      </aside>
    </form>
  );
}


function Card({ step, title, children }: { step: number; title: string; children: React.ReactNode }) {
  return (
    <section className="rounded-2xl border border-[var(--line)] bg-[var(--surface)] p-6 shadow-sm">
      <h2 className="mb-4 flex items-center gap-3 text-lg font-semibold">
        <span className="flex h-7 w-7 items-center justify-center rounded-full bg-[var(--soft)] text-sm text-[var(--accent)]">{step}</span>
        {title}
      </h2>
      {children}
    </section>
  );
}

function Field({ label, hint, className = "", children }: { label: string; hint?: string; className?: string; children: React.ReactNode }) {
  return (
    <label className={`block ${className}`}>
      <span className="mb-1.5 block text-sm font-medium">{label}</span>
      {children}
      {hint && <span className="mt-1 block text-xs text-[var(--muted)]">{hint}</span>}
    </label>
  );
}

function Stepper({ value, min, max, onChange }: { value: number; min: number; max: number; onChange: (n: number) => void }) {
  const btn = "h-11 w-11 shrink-0 rounded-lg border border-[var(--line)] text-lg font-medium hover:bg-[var(--soft)] disabled:opacity-40";
  return (
    <div className="flex items-center gap-2">
      <button type="button" className={btn} onClick={() => onChange(Math.max(min, value - 1))} disabled={value <= min} aria-label="−">
        −
      </button>
      <input
        type="number"
        className="input text-center tabular-nums"
        value={value}
        min={min}
        max={max}
        onChange={(e) => {
          const n = parseInt(e.target.value, 10);
          if (!isNaN(n)) onChange(Math.min(max, Math.max(min, n)));
        }}
      />
      <button type="button" className={btn} onClick={() => onChange(Math.min(max, value + 1))} disabled={value >= max} aria-label="+">
        +
      </button>
    </div>
  );
}
