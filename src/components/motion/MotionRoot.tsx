"use client";

import Lenis from "lenis";
import { usePathname } from "next/navigation";
import { useEffect } from "react";

/**
 * Site-wide motion layer:
 *  - Lenis smooth scrolling (skipped for "reduce motion" and the host app's forms),
 *  - reveal-on-scroll for [data-reveal] elements,
 *  - pointer spotlight for .lit panels (sets --mx/--my).
 * Everything degrades to plain, static behaviour without JavaScript or with reduced motion.
 */
export default function MotionRoot({ smooth = true }: { smooth?: boolean }) {
  const pathname = usePathname();

  // Smooth scroll: marketing pages only. The host app and guest pages are forms, where native
  // scrolling (including inside text boxes) must just work.
  const appPage = /^\/(host|p)(\/|$)/.test(pathname);
  useEffect(() => {
    if (!smooth || appPage || matchMedia("(prefers-reduced-motion: reduce)").matches) return;
    const lenis = new Lenis({
      duration: 1.15,
      easing: (t) => 1 - Math.pow(1 - t, 4),
      touchMultiplier: 1.4,
      // Let text boxes, menus and anything marked data-lenis-prevent scroll on their own.
      prevent: (node) => !!(node as HTMLElement).closest?.("textarea, select, [data-lenis-prevent]"),
    });
    (window as unknown as { __lenis?: Lenis }).__lenis = lenis;
    let raf = requestAnimationFrame(function loop(time) {
      lenis.raf(time);
      raf = requestAnimationFrame(loop);
    });
    // In-page anchors (#pricing, #faq) glide instead of jumping.
    const onClick = (e: MouseEvent) => {
      const a = (e.target as HTMLElement).closest("a[href*='#']") as HTMLAnchorElement | null;
      if (!a || a.pathname !== location.pathname) return;
      const target = document.querySelector(a.hash);
      if (target) {
        e.preventDefault();
        lenis.scrollTo(target as HTMLElement, { offset: -80 });
      }
    };
    document.addEventListener("click", onClick);
    return () => {
      cancelAnimationFrame(raf);
      document.removeEventListener("click", onClick);
      lenis.destroy();
    };
  }, [smooth, appPage]);

  // Text boxes grow with their content (CSS field-sizing where supported; this covers the rest).
  useEffect(() => {
    if (CSS.supports?.("field-sizing", "content")) return;
    const fit = (el: HTMLTextAreaElement) => {
      el.style.height = "auto";
      el.style.height = `${el.scrollHeight + 2}px`; // max-height in CSS still caps it
    };
    const onInput = (e: Event) => e.target instanceof HTMLTextAreaElement && fit(e.target);
    const fitAll = () => document.querySelectorAll<HTMLTextAreaElement>("textarea.input").forEach(fit);
    const timer = setTimeout(fitAll, 50); // after React has filled in saved text
    document.addEventListener("input", onInput);
    return () => {
      clearTimeout(timer);
      document.removeEventListener("input", onInput);
    };
  }, [pathname]);

  // Reveal on scroll (re-scanned on every route change)
  useEffect(() => {
    const els = document.querySelectorAll<HTMLElement>("[data-reveal]:not(.is-in)");
    if (!("IntersectionObserver" in window)) return els.forEach((el) => el.classList.add("is-in"));
    const io = new IntersectionObserver(
      (entries) =>
        entries.forEach((en) => {
          if (en.isIntersecting) {
            en.target.classList.add("is-in");
            io.unobserve(en.target);
          }
        }),
      { rootMargin: "0px 0px -10% 0px", threshold: 0.12 },
    );
    els.forEach((el) => io.observe(el));
    return () => io.disconnect();
  }, [pathname]);

  // Pointer spotlight on .lit panels
  useEffect(() => {
    const onMove = (e: PointerEvent) => {
      const el = (e.target as HTMLElement).closest?.(".lit") as HTMLElement | null;
      if (!el) return;
      const r = el.getBoundingClientRect();
      el.style.setProperty("--mx", `${e.clientX - r.left}px`);
      el.style.setProperty("--my", `${e.clientY - r.top}px`);
    };
    window.addEventListener("pointermove", onMove, { passive: true });
    return () => window.removeEventListener("pointermove", onMove);
  }, []);

  return null;
}
