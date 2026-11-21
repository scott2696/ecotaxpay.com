"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { useEffect, useState } from "react";
import { useT } from "@/i18n/client";

type NavLink = { href: string; label: string };

/** Transparent over the hero → solid on scroll; hides on scroll down, returns on scroll up; full-screen menu on mobile. */
export default function HeaderChrome({
  brand,
  links,
  actions,
  mobileActions,
}: {
  brand: React.ReactNode;
  links: NavLink[];
  actions: React.ReactNode;
  mobileActions: React.ReactNode;
}) {
  const t = useT();
  const pathname = usePathname();
  const [scrolled, setScrolled] = useState(false);
  const [hidden, setHidden] = useState(false);
  const [open, setOpen] = useState(false);

  useEffect(() => {
    let last = window.scrollY;
    const onScroll = () => {
      const y = window.scrollY;
      setScrolled(y > 24);
      setHidden(y > 400 && y > last + 4);
      if (y < last - 4) setHidden(false);
      last = y;
    };
    onScroll();
    window.addEventListener("scroll", onScroll, { passive: true });
    return () => window.removeEventListener("scroll", onScroll);
  }, []);

  useEffect(() => setOpen(false), [pathname]);
  useEffect(() => {
    document.documentElement.style.overflow = open ? "hidden" : "";
  }, [open]);

  return (
    <>
      <header
        className={`fixed inset-x-0 top-0 z-50 transition-[transform,background-color,border-color] duration-500 [transition-timing-function:var(--ease-out)] ${
          hidden && !open ? "-translate-y-full" : ""
        } ${scrolled || open ? "border-b border-[var(--line)] bg-[rgba(5,5,6,0.78)] backdrop-blur-xl" : "border-b border-transparent"}`}
      >
        <div className="mx-auto flex h-16 w-full max-w-7xl items-center justify-between gap-6 px-5 sm:px-8">
          {brand}
          <nav aria-label={t("nav.main")} className="hidden items-center gap-1 lg:flex">
            {links.map((l) => (
              <Link
                key={l.href}
                href={l.href}
                className="group relative px-3 py-2 text-[13px] font-medium tracking-wide text-[var(--muted)] transition-colors hover:text-[var(--ink)]"
              >
                {l.label}
                <span className="absolute inset-x-3 bottom-1 h-px origin-left scale-x-0 bg-[var(--accent)] transition-transform duration-500 [transition-timing-function:var(--ease-out)] group-hover:scale-x-100" />
              </Link>
            ))}
          </nav>
          <div className="hidden items-center gap-2 lg:flex">{actions}</div>
          <button
            type="button"
            className="relative flex h-10 w-10 items-center justify-center lg:hidden"
            aria-expanded={open}
            aria-controls="mobile-menu"
            aria-label={open ? t("nav.close") : t("nav.menu")}
            onClick={() => setOpen(!open)}
          >
            <span className={`absolute h-px w-6 bg-[var(--ink)] transition-transform duration-500 ${open ? "rotate-45" : "-translate-y-[4px]"}`} />
            <span className={`absolute h-px w-6 bg-[var(--ink)] transition-transform duration-500 ${open ? "-rotate-45" : "translate-y-[4px]"}`} />
          </button>
        </div>
      </header>

      {/* Mobile menu */}
      <div
        id="mobile-menu"
        className={`fixed inset-0 z-40 flex flex-col bg-[var(--bg)] px-6 pb-10 pt-24 transition-[opacity,visibility] duration-500 lg:hidden ${
          open ? "visible opacity-100" : "invisible opacity-0"
        }`}
      >
        <nav aria-label={t("nav.main")} className="flex flex-col">
          {links.map((l, i) => (
            <Link
              key={l.href}
              href={l.href}
              onClick={() => setOpen(false)}
              className="border-b border-[var(--line)] py-5 text-3xl font-medium tracking-tight transition-[transform,opacity] duration-700 [transition-timing-function:var(--ease-out)]"
              style={{ transitionDelay: open ? `${80 + i * 60}ms` : "0ms", transform: open ? "none" : "translateY(20px)", opacity: open ? 1 : 0 }}
            >
              {l.label}
            </Link>
          ))}
        </nav>
        <div className="mt-auto flex flex-col gap-3">{mobileActions}</div>
      </div>
      {/* Spacer so content isn't hidden under the fixed header (the homepage hero sits underneath on purpose). */}
      {pathname !== "/" && <div className="h-16" aria-hidden />}
    </>
  );
}
