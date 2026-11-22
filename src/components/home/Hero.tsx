"use client";

import Link from "next/link";
import { useEffect, useRef, useState } from "react";
import { useT } from "@/i18n/client";
import type { DemoCard } from "@/lib/demoQuote";

/**
 * Hero that sells in one glance: plain headline, one-line promise with the price,
 * three proof points and the actual guest payment card the host sends.
 * The door film plays quietly behind it; reduced motion shows the still frame.
 */
export default function Hero({ card: demo }: { card: DemoCard }) {
  const t = useT();
  const video = useRef<HTMLVideoElement>(null);
  const card = useRef<HTMLDivElement>(null);
  const [filmReady, setFilmReady] = useState(false);

  // Keep the film invisible until it is really playing, so the door opens in one
  // smooth take instead of flashing the open-door still, snapping shut and stuttering.
  useEffect(() => {
    const v = video.current;
    if (!v) return;
    if (matchMedia("(prefers-reduced-motion: reduce)").matches) {
      v.poster = "/media/hero-still.jpg";
      setFilmReady(true);
      return;
    }
    const mobile = matchMedia("(max-aspect-ratio: 4/5)").matches;
    v.poster = mobile ? "/media/hero-mobile-poster.jpg" : "/media/hero-poster.jpg";
    const show = () => setFilmReady(true);
    const start = () => v.play().catch(show);
    v.addEventListener("playing", show, { once: true });
    v.addEventListener("canplaythrough", start, { once: true });
    v.addEventListener("error", show, { once: true });
    v.src = mobile ? "/media/hero-mobile.mp4" : "/media/hero.mp4";
    v.load();

    // The slow, even ending is built into the video files (re-timed and frame-interpolated),
    // so it plays at normal speed: changing playbackRate made it stutter on phones.

    return () => {
      v.removeEventListener("playing", show);
      v.removeEventListener("canplaythrough", start);
      v.removeEventListener("error", show);
    };
  }, []);

  // Gentle 3D tilt of the payment card toward the pointer (desktop only).
  useEffect(() => {
    if (matchMedia("(prefers-reduced-motion: reduce), (pointer: coarse)").matches) return;
    const onMove = (e: PointerEvent) => {
      if (!card.current) return;
      const x = (e.clientX / innerWidth - 0.5) * 2;
      const y = (e.clientY / innerHeight - 0.5) * 2;
      card.current.style.transform = `perspective(1200px) rotateY(${x * -5}deg) rotateX(${y * 4}deg)`;
    };
    window.addEventListener("pointermove", onMove, { passive: true });
    return () => window.removeEventListener("pointermove", onMove);
  }, []);

  const points = [t("hero.b1"), t("hero.b2"), t("hero.b3")];

  return (
    <section className="grain relative isolate overflow-hidden bg-black" aria-labelledby="hero-title">
      {/* Film */}
      <div className="absolute inset-0 -z-10">
        <video
          ref={video}
          className={`h-full w-full object-cover object-[70%_50%] transition-opacity duration-[1400ms] [filter:brightness(0.55)_contrast(1.08)] [transition-timing-function:var(--ease-out)] ${filmReady ? "opacity-100" : "opacity-0"}`}
          muted
          playsInline
          preload="auto"
          aria-hidden
        />
        <div className="absolute inset-0 bg-gradient-to-r from-[rgba(5,5,6,0.92)] via-[rgba(5,5,6,0.7)] to-[rgba(5,5,6,0.25)] rtl:bg-gradient-to-l" />
        <div className="absolute inset-x-0 bottom-0 h-40 bg-gradient-to-t from-[var(--bg)] to-transparent" />
        <div className="absolute inset-x-0 top-0 h-32 bg-gradient-to-b from-[rgba(5,5,6,0.85)] to-transparent" />
      </div>

      <div className="mx-auto grid w-full max-w-7xl items-center gap-12 px-5 pb-16 pt-[88px] sm:px-8 lg:grid-cols-[1.15fr_0.85fr] lg:gap-10 lg:pb-24 lg:pt-24">
        <div>
          <p className="hero-fade inline-flex items-center gap-2 rounded-full border border-[var(--line-strong)] bg-black/40 px-3.5 py-1.5 text-[13px] text-[var(--muted)] backdrop-blur-sm" style={{ animationDelay: "0.05s" }}>
            <span className="h-1.5 w-1.5 rounded-full bg-emerald-400 shadow-[0_0_10px_2px_rgba(52,211,153,0.6)]" />
            {t("hero.eyebrow")}
          </p>
          <h1 id="hero-title" className="mt-5 text-[clamp(2.7rem,6.2vw,5.6rem)] font-semibold leading-[0.98] tracking-[-0.045em]">
            <span className="block overflow-hidden pb-[0.06em]">
              <span className="hero-rise block text-silver" style={{ animationDelay: "0.1s" }}>{t("hero.line1")}</span>
            </span>
            <span className="block overflow-hidden pb-[0.1em]">
              <span className="hero-rise block" style={{ animationDelay: "0.2s" }}>
                <span className="font-serif-italic text-silver-soft">{t("hero.line2")}</span> <span className="text-silver">{t("hero.line3")}</span>
              </span>
            </span>
          </h1>
          <p className="hero-fade mt-6 max-w-xl text-lg leading-relaxed text-[var(--ink)]/80 sm:text-xl" style={{ animationDelay: "0.35s" }}>
            {t("hero.sub")}
          </p>
          <ul className="hero-fade mt-7 grid gap-2.5 text-[15px] text-[var(--ink)]" style={{ animationDelay: "0.45s" }}>
            {points.map((p) => (
              <li key={p} className="flex items-center gap-3">
                <span className="flex h-5 w-5 shrink-0 items-center justify-center rounded-full bg-white/10 text-[11px]" aria-hidden>✓</span>
                {p}
              </li>
            ))}
          </ul>
          <div className="hero-fade mt-9 flex flex-wrap items-center gap-3" style={{ animationDelay: "0.55s" }}>
            <Link href="/register" className="btn-silver h-14 px-8 text-[15px]">
              {t("home.start")} <Arrow />
            </Link>
            <Link href="#how" className="btn-ghost h-14 px-7 text-[15px]">{t("home.how")}</Link>
          </div>
          <p className="hero-fade mt-4 text-sm text-[var(--muted)]" style={{ animationDelay: "0.6s" }}>{t("home.noContract")}</p>
        </div>

        {/* What the guest receives */}
        <div className="hero-fade relative mx-auto w-full max-w-[400px]" style={{ animationDelay: "0.3s" }}>
          <p className="mb-4 text-center text-[12px] font-medium uppercase tracking-[0.24em] text-[var(--muted)]">{t("hero.cardLabel")}</p>
          <div ref={card} className="transition-transform duration-700 [transition-timing-function:var(--ease-out)] will-change-transform">
            <PayCard c={demo} />
          </div>
        </div>
      </div>
    </section>
  );
}

function PayCard({ c }: { c: DemoCard }) {
  const t = useT();
  return (
    <div className="relative rounded-[28px] border border-white/[0.12] bg-[rgba(14,15,18,0.78)] p-6 shadow-[0_50px_120px_-30px_rgba(0,0,0,0.95),inset_0_1px_0_rgba(255,255,255,0.08)] backdrop-blur-xl sm:p-7">
      <div className="flex items-center justify-between gap-3 text-[13px]">
        <span className="truncate font-medium">{c.property}</span>
        <span className="shrink-0 rounded-full border border-white/10 px-2 py-0.5 text-[11px] text-[var(--muted)]">{c.flag} {c.place}</span>
      </div>
      <p className="mt-1 text-[12px] text-[var(--muted)]">{c.stay}</p>
      <div className="mt-6 text-center">
        <p className="text-[11px] uppercase tracking-[0.22em] text-[var(--muted)]">{c.taxName}</p>
        <p className="mt-2 text-6xl font-semibold tabular-nums tracking-[-0.04em] text-silver">{c.amount}</p>
        <p className="mt-2 text-[12px] text-[var(--muted)]">
          {c.formula}
          {c.cap && ` · ${c.cap}`}
        </p>
      </div>
      <div className="mt-6 rounded-2xl border border-white/[0.08] bg-white/[0.03] p-4">
        <p className="text-[12px] font-medium">{t("guest.why")}</p>
        <p className="mt-1 text-[12px] leading-relaxed text-[var(--muted)]">{c.explanation}</p>
      </div>
      <div className="btn-silver mt-5 h-12 w-full text-[14px]" aria-hidden>{c.pay}</div>
      <p className="mt-3 text-center text-[11px] text-[var(--muted)]">{t("home.preview.methods")}</p>
      {/* Result chip */}
      <div className="absolute -bottom-5 -end-3 flex items-center gap-2 rounded-full border border-emerald-400/25 bg-[rgba(10,22,17,0.92)] px-4 py-2 text-[12px] text-emerald-200 shadow-xl backdrop-blur sm:-end-6">
        <span aria-hidden>✓</span> {t("hero.paidChip")}
      </div>
    </div>
  );
}

export function Arrow() {
  return (
    <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" aria-hidden className="rtl:-scale-x-100">
      <path d="M5 12h14M13 6l6 6-6 6" />
    </svg>
  );
}
