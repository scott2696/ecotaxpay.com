"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { useEffect, useRef, useState } from "react";
import { useT } from "@/i18n/client";

/** Host-area navigation behind a hamburger button (the language picker stays outside it). */
export default function HostMenu({ links, logout }: { links: { href: string; label: string }[]; logout?: () => Promise<void> }) {
  const t = useT();
  const pathname = usePathname();
  const [open, setOpen] = useState(false);
  const box = useRef<HTMLDivElement>(null);

  useEffect(() => setOpen(false), [pathname]);
  useEffect(() => {
    if (!open) return;
    const onDown = (e: PointerEvent) => {
      if (box.current && !box.current.contains(e.target as Node)) setOpen(false);
    };
    const onKey = (e: KeyboardEvent) => e.key === "Escape" && setOpen(false);
    document.addEventListener("pointerdown", onDown);
    document.addEventListener("keydown", onKey);
    return () => {
      document.removeEventListener("pointerdown", onDown);
      document.removeEventListener("keydown", onKey);
    };
  }, [open]);

  // "/host" is only active on the dashboard itself; the others also cover their sub-pages.
  const active = (href: string) => (href === "/host" ? pathname === "/host" : pathname.startsWith(href));
  const item = "block w-full rounded-lg px-3 py-2.5 text-start text-sm transition-colors";

  return (
    <div ref={box} className="relative">
      <button
        type="button"
        onClick={() => setOpen(!open)}
        aria-expanded={open}
        aria-controls="host-menu"
        aria-label={open ? t("nav.close") : t("nav.menu")}
        className="btn btn-secondary btn-icon relative h-9 w-9"
      >
        <span className={`absolute h-px w-4 bg-[var(--ink)] transition-transform duration-300 ${open ? "rotate-45" : "-translate-y-[4px]"}`} />
        <span className={`absolute h-px w-4 bg-[var(--ink)] transition-opacity duration-300 ${open ? "opacity-0" : ""}`} />
        <span className={`absolute h-px w-4 bg-[var(--ink)] transition-transform duration-300 ${open ? "-rotate-45" : "translate-y-[4px]"}`} />
      </button>
      <div
        id="host-menu"
        className={`absolute end-0 top-full z-50 mt-2 w-60 origin-top-right rounded-xl border border-[var(--line)] bg-[var(--surface)] p-1.5 shadow-2xl transition-[opacity,transform,visibility] duration-200 ${
          open ? "visible scale-100 opacity-100" : "invisible scale-95 opacity-0"
        }`}
      >
        <nav aria-label={t("nav.main")}>
          {links.map((l) => (
            <Link
              key={l.href}
              href={l.href}
              aria-current={active(l.href) ? "page" : undefined}
              className={`${item} ${active(l.href) ? "bg-[var(--soft)] font-medium text-[var(--ink)]" : "text-[var(--muted)] hover:bg-[var(--bg)] hover:text-[var(--ink)]"}`}
            >
              {l.label}
            </Link>
          ))}
        </nav>
        {logout && (
          <form action={logout} className="mt-1.5 border-t border-[var(--line)] pt-1.5">
            <button className={`${item} text-[var(--muted)] hover:bg-[var(--bg)] hover:text-[var(--ink)]`}>{t("nav.logout")}</button>
          </form>
        )}
      </div>
    </div>
  );
}
