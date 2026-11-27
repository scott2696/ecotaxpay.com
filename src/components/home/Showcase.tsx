"use client";

import { createContext, useContext, useEffect, useRef, useState } from "react";
import type { MessageKey } from "@/i18n/messages/en";
import { useT } from "@/i18n/client";
import { AirbnbIcon, BookingIcon } from "@/app/host/BrandIcons";
import type { DemoCard } from "@/lib/demoQuote";
import LazyVideo from "./LazyVideo";

// The visitor's sample stay (their country's tax, currency and a local property), shared by every screen.
const DemoCtx = createContext<DemoCard>(null!);
const useDemo = () => useContext(DemoCtx);

// Message-key ids (how.<id>.title/body/tip), in order; `guest` marks screens shown from the guest's side.
const STEPS = [
  { id: "s1" },
  { id: "sync" },
  { id: "s2" },
  { id: "s3" },
  { id: "s4", guest: true },
  { id: "s5", guest: true },
  { id: "s6" },
] as const;

/**
 * "How it works": six steps from setup to arrival. On desktop a phone stays in view and shows the
 * real screen for the step being read; on mobile each step carries its own screen. Every step ends
 * with a practical tip for hosts.
 */
export default function Showcase({ demo }: { demo: DemoCard }) {
  const t = useT();
  const k = (key: string) => t(key as MessageKey);
  const [step, setStep] = useState(0);
  const steps = useRef<(HTMLDivElement | null)[]>([]);

  useEffect(() => {
    const io = new IntersectionObserver(
      (entries) => entries.forEach((e) => e.isIntersecting && setStep(Number((e.target as HTMLElement).dataset.step))),
      { rootMargin: "-45% 0px -45% 0px" },
    );
    steps.current.forEach((s) => s && io.observe(s));
    return () => io.disconnect();
  }, []);

  return (
    <DemoCtx.Provider value={demo}>
    <section id="how" className="relative isolate scroll-mt-16 overflow-clip border-t border-[var(--line)]" aria-labelledby="how-title">
      <LazyVideo src="/media/ribbons.mp4" poster="/media/ribbons-poster.jpg" className="absolute inset-0 -z-10 h-full w-full object-cover opacity-30" />
      <div className="absolute inset-0 -z-10 bg-gradient-to-b from-[var(--bg)] via-[rgba(5,5,6,0.6)] to-[var(--bg)]" />

      <div className="mx-auto grid max-w-7xl gap-12 px-5 py-24 sm:px-8 lg:grid-cols-[1fr_minmax(0,400px)] lg:gap-24 lg:py-32">
        <div>
          <p data-reveal className="text-[12px] font-medium uppercase tracking-[0.28em] text-[var(--muted)]">{t("home.how")}</p>
          <h2 id="how-title" data-reveal className="mt-6 max-w-xl text-[clamp(2.4rem,5vw,4.5rem)] font-semibold leading-[0.95] tracking-[-0.045em]">
            <span className="text-silver">{t("show.title1")}</span> <span className="font-serif-italic text-silver-soft">{t("show.title2")}</span>
          </h2>
          <p data-reveal className="mt-6 max-w-lg text-lg text-[var(--muted)]">{t("how.intro")}</p>
          {/* No setup at all: an amount is enough */}
          <div data-reveal className="mt-8 flex max-w-lg gap-4 rounded-2xl border border-[var(--line-strong)] bg-white/[0.04] p-5">
            <span className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl bg-white text-lg text-black" aria-hidden>⚡</span>
            <div>
              <p className="font-medium text-[var(--ink)]">{t("how.quick.title")}</p>
              <p className="mt-1 text-sm leading-relaxed text-[var(--muted)]">{t("how.quick.body")}</p>
            </div>
          </div>

          {/* Progress rail (desktop) */}
          <ol className="mt-10 hidden gap-1.5 lg:flex" aria-hidden>
            {STEPS.map((st, i) => (
              <li key={st.id} className={`h-1 flex-1 rounded-full transition-colors duration-500 ${i <= step ? "bg-[var(--accent)]" : "bg-white/10"}`} />
            ))}
          </ol>

          <div className="mt-10">
            {STEPS.map((st, i) => (
              <div
                key={st.id}
                ref={(el) => {
                  steps.current[i] = el;
                }}
                data-step={i}
                className={`border-t border-[var(--line)] py-10 transition-opacity duration-700 lg:flex lg:min-h-[58vh] lg:flex-col lg:justify-center ${step === i ? "opacity-100" : "lg:opacity-35"}`}
              >
                <div className="flex items-baseline gap-5">
                  <span className="font-mono text-sm text-[var(--muted)]">0{i + 1}</span>
                  <h3 className="text-2xl font-medium tracking-tight sm:text-3xl">{k(`how.${st.id}.title`)}</h3>
                </div>
                <p className="mt-4 max-w-md ps-10 leading-relaxed text-[var(--muted)]">{k(`how.${st.id}.body`)}</p>
                <p className="ms-10 mt-5 flex max-w-md gap-3 rounded-2xl border border-[var(--line)] bg-white/[0.03] p-4 text-sm leading-relaxed text-[var(--ink)]/85">
                  <span className="h-fit shrink-0 self-start rounded-full bg-white/10 px-2 py-0.5 text-[11px] font-semibold uppercase tracking-wider text-[var(--ink)]">{t("how.tipLabel")}</span>
                  {k(`how.${st.id}.tip`)}
                </p>
                {/* On small screens each step shows its own screen inline */}
                <div className="mt-10 flex justify-center lg:hidden">
                  <Phone step={i} />
                </div>
              </div>
            ))}
          </div>
        </div>
        <div className="hidden lg:block">
          <div className="sticky top-[13vh]">
            <Phone step={step} />
            <p className="mt-6 text-center text-[12px] uppercase tracking-[0.22em] text-[var(--muted)]">
              {t("guest" in STEPS[step] ? "how.viewGuest" : "how.viewHost")}
            </p>
          </div>
        </div>
      </div>
    </section>
    </DemoCtx.Provider>
  );
}

const SCREENS = [ScreenProperty, ScreenSync, ScreenGuideEdit, ScreenSend, ScreenGuest, ScreenGuide, ScreenDash];

function Phone({ step }: { step: number }) {
  return (
    <div className="relative mx-auto aspect-[9/19] w-[280px] rounded-[48px] bg-gradient-to-b from-[#3a3c42] via-[#16171a] to-[#2b2d32] p-[3px] shadow-[0_60px_120px_-30px_rgba(0,0,0,0.9),0_0_0_1px_rgba(255,255,255,0.08)] sm:w-[300px]">
      <div className="relative h-full w-full overflow-hidden rounded-[45px] bg-[#08090a]">
        <div className="absolute left-1/2 top-3 z-10 h-6 w-24 -translate-x-1/2 rounded-full bg-black" />
        {SCREENS.map((Screen, i) => (
          <div
            key={i}
            className="absolute inset-0 px-5 pb-6 pt-14 transition-[opacity,transform,filter] duration-700 [transition-timing-function:var(--ease-out)]"
            style={{ opacity: step === i ? 1 : 0, transform: step === i ? "none" : `translateY(${i < step ? -24 : 24}px)`, filter: step === i ? "none" : "blur(6px)" }}
            aria-hidden={step !== i}
          >
            <Screen />
          </div>
        ))}
        <div className="pointer-events-none absolute inset-0 bg-[linear-gradient(115deg,rgba(255,255,255,0.08)_0%,transparent_35%)]" />
      </div>
    </div>
  );
}

const Label = ({ children }: { children: React.ReactNode }) => (
  <p className="text-[10px] uppercase tracking-[0.2em] text-[var(--muted)]">{children}</p>
);
const Field = ({ label, value, mono }: { label: string; value: string; mono?: boolean }) => (
  <div>
    <p className="mb-0.5 text-[10px] text-[var(--muted)]">{label}</p>
    <div className={`truncate rounded-lg border border-white/[0.08] bg-white/[0.04] px-3 py-1.5 text-[12px] ${mono ? "font-mono" : ""}`}>{value}</div>
  </div>
);
const Row = ({ k, v }: { k: string; v: string }) => (
  <div className="flex items-center justify-between border-b border-white/[0.06] py-2 text-[11px]">
    <span className="text-[var(--muted)]">{k}</span>
    <span className="font-medium">{v}</span>
  </div>
);

/* 01: host adds the property */
function ScreenProperty() {
  const t = useT();
  const d = useDemo();
  return (
    <div className="flex h-full flex-col gap-3 text-[var(--ink)]">
      <Label>{t("pf.apartment")}</Label>
      <Field label={t("pf.name")} value={d.property} />
      <div className="grid grid-cols-2 gap-2">
        <Field label={t("pf.country")} value={`${d.flag} ${d.place}`} />
        <Field label={t("pf.city")} value={d.regionName} />
      </div>
      <Field label={t("pf.accType")} value="Apartment" />
      <div className="rounded-lg border border-emerald-400/20 bg-emerald-400/10 px-3 py-2 text-[11px] leading-snug text-emerald-200">
        <span className="font-semibold">{d.taxName}</span>: {d.rate}
        {d.cap && ` · ${d.cap}`}
      </div>
      <div>
        <p className="mb-1 text-[10px] text-[var(--muted)]">{t("pf.docs")}</p>
        <div className="grid grid-cols-3 gap-1 text-center text-[10px]">
          {(["pf.docs.off", "pf.docs.optional", "pf.docs.required"] as const).map((key, i) => (
            <span key={key} className={`rounded-md border px-1 py-1.5 ${i === 2 ? "border-white/40 bg-white/10" : "border-white/[0.08] text-[var(--muted)]"}`}>{t(key)}</span>
          ))}
        </div>
      </div>
      <div className="btn-silver mt-auto h-11 w-full text-[13px]">{t("pf.save")}</div>
    </div>
  );
}

/* 02: Airbnb + Booking.com calendars, imported into the dashboard as a guest-by-guest breakdown */
function ScreenSync() {
  const t = useT();
  const d = useDemo();
  const count = (st: string) => d.upcoming.filter((b) => b.status === st).length;
  const STATUS = {
    paid: { label: t("how.sum.paid"), cls: "bg-emerald-400/15 text-emerald-300" },
    sent: { label: t("how.awaiting"), cls: "bg-amber-400/15 text-amber-200" },
  } as const;
  return (
    <div className="flex h-full flex-col gap-2.5 text-[var(--ink)]">
      <div className="flex items-center justify-between">
        <Label>{t("upcoming.title")}</Label>
        <span className="flex items-center gap-1">
          <span className="rounded-full bg-white p-0.5"><AirbnbIcon size={13} /></span>
          <span className="rounded-full bg-white p-0.5"><BookingIcon size={13} /></span>
        </span>
      </div>
      {/* Summary */}
      <div className="grid grid-cols-3 gap-1.5 text-center">
        {([["paid", "text-emerald-300"], ["sent", "text-amber-200"], ["new", "text-[var(--ink)]"]] as const).map(([st, cls]) => (
          <div key={st} className="rounded-lg border border-white/[0.08] bg-white/[0.03] py-1.5">
            <p className={`text-[15px] font-semibold leading-none ${cls}`}>{count(st)}</p>
            <p className="mt-1 text-[8.5px] uppercase tracking-wider text-[var(--muted)]">{t(`how.sum.${st}`)}</p>
          </div>
        ))}
      </div>

      <div className="space-y-1.5">
        {d.upcoming.map((b) => (
          <div key={b.dates} className="rounded-xl border border-white/[0.08] bg-white/[0.03] px-2.5 py-2">
            <div className="flex items-center gap-2">
              <span className="shrink-0 rounded-full bg-white p-0.5">{b.src === "airbnb" ? <AirbnbIcon size={12} /> : <BookingIcon size={12} />}</span>
              <span className={`min-w-0 flex-1 truncate text-[11.5px] font-semibold ${b.name ? "" : "text-[var(--muted)]"}`}>
                {b.name ?? (b.src === "airbnb" ? "Airbnb" : "Booking.com")}
              </span>
              {b.status === "new" ? (
                <span className="shrink-0 rounded-md bg-white/90 px-1.5 py-0.5 text-[9px] font-semibold text-black">{t("upcoming.createLink")}</span>
              ) : (
                <span className={`shrink-0 rounded-full px-1.5 py-0.5 text-[9px] font-medium ${STATUS[b.status].cls}`}>{STATUS[b.status].label}</span>
              )}
            </div>
            <p className="mt-1 ps-6 text-[10.5px]">
              {t("how.arrives", { date: b.arrives })} · {t.plural("line.nights", b.nights)}
              {b.people > 0 && <> · {t.plural("guest.adults", b.people)}</>}
            </p>
            <p className="mt-0.5 flex justify-between gap-2 ps-6 text-[9.5px] text-[var(--muted)]">
              <span className="truncate font-mono">
                {[b.ref, b.phoneLast4 && t("upcoming.phone", { last4: b.phoneLast4.slice(-2) })].filter(Boolean).join(" · ") || d.propertyShort}
              </span>
              {b.amount && <span className="shrink-0 font-medium text-[var(--ink)]">{b.amount}</span>}
            </p>
          </div>
        ))}
      </div>
      <p className="mt-auto text-center text-[9.5px] leading-snug text-[var(--muted)]">
        ↻ {t("upcoming.autoRefresh")}
        <br />
        {t("how.nameNote")}
      </p>
    </div>
  );
}

/* 03: arrival guide, written once (standard fields + the host's own additional notes) */
function ScreenGuideEdit() {
  const t = useT();
  const d = useDemo();
  const notes = [
    { title: t("gf.sugg.parking"), body: d.local.parking },
    { title: t("gf.sugg.rubbish"), body: d.local.rubbish },
  ];
  return (
    <div className="flex h-full flex-col gap-1.5 text-[var(--ink)]">
      <div className="flex items-center justify-between">
        <Label>{t("guest.guideTitle")}</Label>
        <span className="rounded-full bg-white/10 px-2 py-0.5 text-[9px]">🔒</span>
      </div>
      <Field label={t("gf.address")} value={d.local.address} />
      <div className="grid grid-cols-2 gap-2">
        <Field label={t("gf.checkInTime")} value="15:00" />
        <Field label={t("gf.checkOutTime")} value="10:00" />
      </div>
      <Field label={t("gf.access")} value="Key box · code 4821" />
      <div className="grid grid-cols-2 gap-2">
        <Field label={t("gf.wifiName")} value={d.local.wifi} />
        <Field label={t("gf.wifiPassword")} value="••••••••" mono />
      </div>
      <Field label={t("gf.houseRules")} value="No smoking · Quiet after 23:00" />

      <div className="mt-1 border-t border-white/[0.08] pt-2">
        <div className="mb-1.5 flex items-center justify-between gap-2">
          <p className="text-[10px] font-medium text-[var(--ink)]">{t("gf.notes")}</p>
          <span className="whitespace-nowrap rounded-md border border-dashed border-white/20 px-1.5 py-0.5 text-[9px]">{t("gf.addNote")}</span>
        </div>
        <div className="space-y-1.5">
          {notes.map((n) => (
            <div key={n.title} className="rounded-lg border border-white/[0.08] bg-white/[0.04] px-2.5 py-1.5">
              <p className="text-[10.5px] font-medium">📝 {n.title}</p>
              <p className="text-[10px] leading-snug text-[var(--muted)]">{n.body}</p>
            </div>
          ))}
        </div>
      </div>
      <p className="mt-auto rounded-lg border border-white/[0.08] bg-white/[0.03] px-3 py-1.5 text-center text-[10px] text-[var(--muted)]">🔒 {t("how.lockedChip")}</p>
    </div>
  );
}

/* 04: link sent over WhatsApp: a realistic chat, newest message near the top */
function ScreenSend() {
  const t = useT();
  const d = useDemo();
  const url = "ecotaxpay.com/p/7naxetcg";
  const msg = t("send.message", { name: d.guestFirst, property: d.propertyShort, from: d.fromShort, to: d.toShort, tax: d.taxName, amount: d.amount, url });
  const [before, after] = msg.split(url);
  return (
    <div className="-mx-5 -mb-6 -mt-14 flex h-[calc(100%+5rem)] flex-col bg-[#0b141a] text-[#e9edef]">
      {/* Header */}
      <div className="flex items-center gap-2 bg-[#202c33] px-3 pb-2.5 pt-11">
        <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" aria-hidden className="text-[#aebac1] rtl:-scale-x-100"><path d="M15 18l-6-6 6-6" /></svg>
        <span className="flex h-8 w-8 items-center justify-center rounded-full bg-[#6a7f8a] text-[11px] font-semibold text-white">{d.guest.split(" ").map((w) => w[0]).join("")}</span>
        <div className="min-w-0 flex-1">
          <p className="truncate text-[12.5px] font-medium leading-tight">{d.guest}</p>
          <p className="text-[9.5px] text-[#8696a0]">online</p>
        </div>
        <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="#aebac1" strokeWidth="2" aria-hidden><path d="M15 10l5-3v10l-5-3z" /><rect x="3" y="6" width="12" height="12" rx="2" /></svg>
        <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="#aebac1" strokeWidth="2" aria-hidden className="ms-2"><path d="M22 16.9v3a2 2 0 0 1-2.2 2 19.8 19.8 0 0 1-8.6-3.1 19.5 19.5 0 0 1-6-6A19.8 19.8 0 0 1 2.1 4.2 2 2 0 0 1 4.1 2h3a2 2 0 0 1 2 1.7c.1.9.4 1.8.7 2.7a2 2 0 0 1-.5 2.1L8 9.8a16 16 0 0 0 6 6l1.3-1.3a2 2 0 0 1 2.1-.4c.9.3 1.8.6 2.7.7a2 2 0 0 1 1.7 2Z" /></svg>
      </div>

      {/* Conversation */}
      <div
        className="flex flex-1 flex-col gap-1.5 overflow-hidden px-2.5 py-3"
        style={{ backgroundImage: "radial-gradient(rgba(255,255,255,0.035) 1px, transparent 1px)", backgroundSize: "14px 14px" }}
      >
        <span className="mx-auto mb-1 rounded-md bg-[#182229] px-2.5 py-1 text-[9.5px] uppercase tracking-wide text-[#8696a0]">{t("how.today")}</span>

        {/* Incoming */}
        <div className="relative me-10 self-start rounded-lg rounded-tl-none bg-[#202c33] px-2.5 pb-1.5 pt-1.5 text-[11px] leading-snug">
          <span className="absolute -start-1.5 top-0 h-0 w-0 border-e-[6px] border-t-[6px] border-e-[#202c33] border-t-transparent rtl:border-e-transparent" aria-hidden />
          Hi! We just booked {d.fromShort} – {d.toShort}. Looking forward to it 😊
          <span className="ms-2 inline-block translate-y-0.5 text-[8.5px] text-[#8696a0]">10:38</span>
        </div>

        {/* Outgoing with link preview */}
        <div className="relative ms-7 self-end rounded-lg rounded-tr-none bg-[#005c4b] p-1 text-[10.5px] leading-[1.45]">
          <span className="absolute -end-1.5 top-0 h-0 w-0 border-s-[6px] border-t-[6px] border-s-[#005c4b] border-t-transparent" aria-hidden />
          <div className="flex overflow-hidden rounded-md bg-[#025144]">
            <div className="flex w-14 shrink-0 items-center justify-center bg-[#111215]">
              <svg width="24" height="24" viewBox="0 0 32 32" aria-hidden>
                <path d="M24 8c-9 0-15 4.5-15 11.5 0 1.6.4 3 1 4.2C12 17 16.5 13.5 21 12c-4 2.4-7.4 6-9.6 12.2C13 25.3 14.6 26 16.6 26 22 26 24.6 20 24 8Z" fill="#d9dbe0" />
              </svg>
            </div>
            <div className="min-w-0 px-2 py-1.5">
              <p className="truncate text-[10.5px] font-semibold">{d.taxName} · {d.amount}</p>
              <p className="line-clamp-2 text-[9.5px] leading-snug text-[#c6d4d0]">{d.property} · {d.fromShort} – {d.toShort}</p>
              <p className="text-[9px] text-[#9ab3ad]">ecotaxpay.com</p>
            </div>
          </div>
          <p className="px-1.5 pt-1.5">
            {before}
            <span className="text-[#53bdeb] underline underline-offset-2">{url}</span>
            {after}
          </p>
          <p className="flex items-center justify-end gap-1 px-1.5 pb-0.5 text-[8.5px] text-[#a6c5be]">
            10:42
            <svg width="14" height="9" viewBox="0 0 16 10" fill="none" stroke="#53bdeb" strokeWidth="1.6" aria-hidden><path d="M1 5.5l2.8 2.8L9.5 2.5M6.5 8.3l.6.6L13 2.5" /></svg>
          </p>
        </div>
      </div>

      {/* Composer */}
      <div className="flex items-center gap-2 bg-[#0b141a] px-2 pb-4 pt-1.5">
        <div className="flex h-8 flex-1 items-center gap-2 rounded-full bg-[#202c33] px-3 text-[11px] text-[#8696a0]">
          <span aria-hidden>☺</span> Message
        </div>
        <span className="flex h-8 w-8 items-center justify-center rounded-full bg-[#00a884]" aria-hidden>
          <svg width="13" height="13" viewBox="0 0 24 24" fill="#0b141a"><path d="M12 15a3 3 0 0 0 3-3V6a3 3 0 0 0-6 0v6a3 3 0 0 0 3 3Zm5-3a5 5 0 0 1-10 0H5a7 7 0 0 0 6 6.9V21h2v-2.1A7 7 0 0 0 19 12Z" /></svg>
        </span>
      </div>
    </div>
  );
}

/* 05: guest payment page */
function ScreenGuest() {
  const t = useT();
  const d = useDemo();
  return (
    <div className="flex h-full flex-col text-center text-[var(--ink)]">
      <p className="text-[10px] uppercase tracking-[0.2em] text-[var(--muted)]">{d.taxName}</p>
      <p className="mt-2 text-[2.6rem] font-semibold leading-none tabular-nums tracking-tight text-silver">{d.amount}</p>
      <div className="mt-4 rounded-2xl border border-white/[0.08] bg-white/[0.03] p-3 text-start">
        <p className="text-[11px] font-medium">{t("guest.why")}</p>
        <p className="mt-1 line-clamp-4 text-[10.5px] leading-relaxed text-[var(--muted)]">{d.explanation}</p>
      </div>
      <div className="mt-3 rounded-2xl border border-white/[0.08] bg-white/[0.03] p-3 text-start">
        <p className="text-[11px] font-medium">{t("docs.title")}</p>
        <div className="mt-2 flex items-center justify-between rounded-lg bg-white/[0.05] px-2.5 py-2 text-[10.5px]">
          <span>📄 {t("doc.passport")}</span>
          <span className="text-emerald-300">✓ {t("how.uploaded")}</span>
        </div>
      </div>
      <div className="mt-3 flex justify-center gap-1.5 text-[10px] text-[var(--muted)]">
        {["EN", "ES", "IT", "FR", "DE", "MT"].map((l) => (
          <span key={l} className="rounded-full border border-white/[0.1] px-2 py-0.5">{l}</span>
        ))}
      </div>
      <div className="btn-silver mt-auto h-12 w-full text-[13px]">{d.pay}</div>
      <p className="mt-2 text-[10px] text-[var(--muted)]">Bank transfer · Revolut · PayPal · Wise</p>
    </div>
  );
}

/* 06: after payment, receipt + the complete arrival guide */
function ScreenGuide() {
  const t = useT();
  const d = useDemo();
  return (
    <div className="flex h-full flex-col text-[var(--ink)]">
      <div className="flex items-center gap-3">
        <span className="flex h-9 w-9 items-center justify-center rounded-full bg-emerald-400/15 text-sm text-emerald-300">✓</span>
        <div>
          <p className="text-[12px] font-semibold leading-tight">{t("guest.allSet", { name: d.guestFirst })}</p>
          <p className="text-[10px] text-[var(--muted)]">{t("guest.paidLine", { amount: d.amount, number: d.receiptNo })}</p>
        </div>
      </div>
      <div className="mt-3 grid grid-cols-2 gap-1.5 text-[10px]">
        <span className="rounded-lg bg-white/90 px-2 py-1.5 text-center font-medium text-black">{t("guest.downloadReceipt")}</span>
        <span className="rounded-lg border border-white/15 px-2 py-1.5 text-center">{t("guest.saveWhatsapp")}</span>
      </div>
      {/* The full arrival guide, exactly as the guest sees it once the tax is paid */}
      <p className="mt-4 text-[10px] uppercase tracking-[0.2em] text-[var(--muted)]">{t("guest.guideTitle")}</p>
      <div className="mt-2 space-y-2 text-[10.5px] leading-snug">
        <div className="flex items-start justify-between gap-2">
          <div><p className="font-medium">📍 {t("guide.address")}</p><p className="text-[var(--muted)]">{d.local.address}</p></div>
          <span className="shrink-0 rounded-md border border-white/15 px-1.5 py-0.5 text-[9px]">{t("guide.directions")} ↗</span>
        </div>
        <div className="grid grid-cols-2 gap-2">
          <div><p className="font-medium">🕒 {t("guide.checkInFrom", { time: "15:00" })}</p></div>
          <div><p className="font-medium">🕙 {t("guide.checkOutBy", { time: "10:00" })}</p></div>
        </div>
        <div className="rounded-xl border border-white/[0.1] bg-white/[0.05] p-2">
          <p className="font-medium">🔑 {t("guide.access")}</p>
          <p className="text-[var(--muted)]">Key box · <span className="font-mono text-[var(--ink)]">4821</span></p>
        </div>
        <div className="rounded-xl border border-white/[0.1] bg-white/[0.05] p-2">
          <p className="font-medium">📶 {t("guide.wifi")}</p>
          <p className="text-[var(--muted)]">{t("guide.wifiNetwork", { name: d.local.wifi })} · <span className="font-mono text-[var(--ink)]">welcome-2026</span></p>
        </div>
        <div><p className="font-medium">📋 {t("guide.houseRules")}</p><p className="text-[var(--muted)]">No smoking · Quiet after 23:00</p></div>
        <div><p className="font-medium">📝 {t("gf.sugg.parking")}</p><p className="text-[var(--muted)]">{d.local.parking}</p></div>
        <div><p className="font-medium">📝 {t("gf.sugg.rubbish")}</p><p className="text-[var(--muted)]">{d.local.rubbish}</p></div>
      </div>
    </div>
  );
}

/* 07: host dashboard */
function ScreenDash() {
  const t = useT();
  const d = useDemo();
  return (
    <div className="flex h-full flex-col gap-3 text-[var(--ink)]">
      <Label>{t("dash.title")}</Label>
      <div className="grid grid-cols-2 gap-2">
        <div className="rounded-xl border border-white/[0.08] bg-white/[0.03] p-2.5">
          <p className="text-[10px] text-[var(--muted)]">{t("dash.stat.paid")}</p>
          <p className="text-lg font-semibold">2</p>
        </div>
        <div className="rounded-xl border border-white/[0.08] bg-white/[0.03] p-2.5">
          <p className="text-[10px] text-[var(--muted)]">{t("dash.stat.tax")}</p>
          <p className={`font-semibold leading-tight tabular-nums ${d.totalAmount.length > 9 ? "text-[14px]" : "text-lg"}`}>{d.totalAmount}</p>
        </div>
      </div>
      <div className="rounded-xl border border-emerald-400/20 bg-emerald-400/10 p-2.5 text-[10.5px] text-emerald-200">
        ✉ {t("email.hostSubject", { amount: d.amount, name: d.guest, date: t("how.today") })}
      </div>
      <div className="rounded-xl border border-white/[0.08] bg-white/[0.03] px-3 py-1">
        <Row k={d.guest} v={`${d.amount} · ${t("status.paid")}`} />
        <Row k="Kyle Brown" v={`${d.secondAmount} · ${t("status.paid")}`} />
        <Row k="Emma Schmidt" v={t("status.pending")} />
      </div>
      <div className="rounded-xl border border-white/[0.08] bg-white/[0.03] p-2.5">
        <p className="text-[10px] text-[var(--muted)]">{t("dash.byDestination")}</p>
        <div className="mt-1 flex justify-between text-[11px]"><span className="truncate">{d.regionName}</span><span className="font-medium">{d.totalAmount}</span></div>
      </div>
      <div className="btn-ghost mt-auto h-10 w-full text-[12px]">⬇ {t("dash.export")}</div>
    </div>
  );
}
