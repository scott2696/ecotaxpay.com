"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import Icon, { type IconName } from "@/components/Icon";

export type NavItem = { href: string; label: string; icon: IconName };

/** "/host" is only active on the dashboard itself; the others also cover their sub-pages. */
const isActive = (pathname: string, href: string) => (href === "/host" ? pathname === "/host" : pathname.startsWith(href));

/** Desktop sidebar links. */
export function SidebarLinks({ items }: { items: NavItem[] }) {
  const pathname = usePathname();
  return (
    <ul className="space-y-0.5">
      {items.map((i) => {
        const on = isActive(pathname, i.href);
        return (
          <li key={i.href}>
            <Link
              href={i.href}
              aria-current={on ? "page" : undefined}
              className={`group relative flex h-9 items-center gap-3 rounded-[var(--r-md)] px-3 text-sm transition-colors ${
                on ? "bg-white/[0.07] font-medium text-[var(--ink)] shadow-[var(--edge)]" : "text-[var(--muted)] hover:bg-white/[0.035] hover:text-[var(--ink)]"
              }`}
            >
              {on && <span aria-hidden className="absolute -start-3 top-2 bottom-2 w-[3px] rounded-full bg-[image:var(--silver)]" />}
              <Icon name={i.icon} size={17} className={on ? "" : "opacity-80 group-hover:opacity-100"} />
              {i.label}
            </Link>
          </li>
        );
      })}
    </ul>
  );
}

/** Phone / tablet: bottom tab bar with the main create action in the middle. */
export function TabBar({ items, create }: { items: NavItem[]; create: NavItem }) {
  const pathname = usePathname();
  const half = Math.ceil(items.length / 2);
  const tab = (i: NavItem) => {
    const on = isActive(pathname, i.href);
    return (
      <Link
        key={i.href}
        href={i.href}
        aria-current={on ? "page" : undefined}
        className={`flex min-w-0 flex-1 flex-col items-center justify-center gap-1 py-2 text-[0.6875rem] font-medium transition-colors ${on ? "text-[var(--ink)]" : "text-[var(--muted)]"}`}
      >
        <Icon name={i.icon} size={20} strokeWidth={on ? 2 : 1.75} />
        <span className="max-w-full truncate px-1">{i.label}</span>
      </Link>
    );
  };
  return (
    <nav
      aria-label="Tabs"
      className="fixed inset-x-0 bottom-0 z-40 border-t border-[var(--line)] bg-[rgba(8,8,10,0.88)] pb-[env(safe-area-inset-bottom)] backdrop-blur-xl lg:hidden"
    >
      <div className="mx-auto flex max-w-xl items-stretch px-2">
        {items.slice(0, half).map(tab)}
        <div className="flex flex-1 items-center justify-center">
          <Link href={create.href} aria-label={create.label} className="btn btn-primary btn-icon -mt-5 h-12 w-12 rounded-2xl shadow-[0_12px_30px_-10px_rgba(220,224,232,0.55)]">
            <Icon name={create.icon} size={22} strokeWidth={2.25} />
          </Link>
        </div>
        {items.slice(half).map(tab)}
      </div>
    </nav>
  );
}
