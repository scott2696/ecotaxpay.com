"use client";

import { useEffect, useRef } from "react";

/** A large statement whose words light up from graphite to silver as the reader scrolls through it. */
export default function Statement({ eyebrow, text }: { eyebrow: string; text: string }) {
  const ref = useRef<HTMLParagraphElement>(null);

  useEffect(() => {
    const el = ref.current;
    if (!el) return;
    const words = [...el.querySelectorAll<HTMLElement>("[data-w]")];
    if (matchMedia("(prefers-reduced-motion: reduce)").matches) return words.forEach((w) => (w.style.opacity = "1"));
    let raf = 0;
    const update = () => {
      const r = el.getBoundingClientRect();
      // 0 when the paragraph's top reaches 85% of the viewport, 1 when its bottom reaches 45%.
      const start = innerHeight * 0.85;
      const end = innerHeight * 0.45;
      const p = Math.min(1, Math.max(0, (start - r.top) / (start - end + r.height)));
      const lit = p * words.length;
      words.forEach((w, i) => (w.style.opacity = String(Math.min(1, Math.max(0.16, lit - i + 0.16)))));
    };
    const onScroll = () => {
      cancelAnimationFrame(raf);
      raf = requestAnimationFrame(update);
    };
    update();
    window.addEventListener("scroll", onScroll, { passive: true });
    return () => window.removeEventListener("scroll", onScroll);
  }, []);

  return (
    <section className="mx-auto max-w-7xl px-5 py-32 sm:px-8 sm:py-44">
      <p data-reveal className="mb-10 text-[12px] font-medium uppercase tracking-[0.28em] text-[var(--muted)]">{eyebrow}</p>
      <p ref={ref} className="max-w-6xl text-[clamp(2rem,4.6vw,4.2rem)] font-medium leading-[1.08] tracking-[-0.035em]">
        {text.split(" ").map((w, i) => (
          <span key={i} data-w className="text-silver transition-opacity duration-300" style={{ opacity: 0.16 }}>
            {w}{" "}
          </span>
        ))}
      </p>
    </section>
  );
}
