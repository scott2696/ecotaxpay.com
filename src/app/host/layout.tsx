import Link from "next/link";
import LanguagePicker from "@/components/LanguagePicker";
import Icon from "@/components/Icon";
import { getI18n, languageOptions } from "@/i18n/server";
import { currentHost, isSubscribed } from "@/lib/auth";
import { hasPaymentMethods } from "@/lib/payMethods";
import { settleDemoSubscription } from "@/lib/billing";
import { site } from "@/lib/config";
import { updateHost } from "@/lib/store";
import { logout } from "./account/actions";
import { Mark } from "@/components/SiteHeader";
import HostMenu from "./HostMenu";
import { SidebarLinks, TabBar, type NavItem } from "./shell/HostNav";

export const dynamic = "force-dynamic";
export const metadata = { robots: { index: false, follow: false } };

export default async function HostLayout({ children }: { children: React.ReactNode }) {
  const found = await currentHost(); // pages redirect to /login themselves if this is null
  const host = found ? await settleDemoSubscription(found) : null;
  const { t, locale } = await getI18n();
  // Remember the host's language for their notification emails.
  if (host && host.locale !== locale) await updateHost(host.id, { locale });
  const languages = await languageOptions();

  const nav: NavItem[] = [
    { href: "/host", label: t("nav.dashboard"), icon: "dashboard" },
    { href: "/host/properties", label: t("nav.apartments"), icon: "building" },
    { href: "/host/rates", label: t("nav.rates"), icon: "globe" },
    { href: "/host/account", label: t("nav.account"), icon: "user" },
  ];
  const create: NavItem = { href: "/host/new", label: t("dash.newLink"), icon: "plus" };
  const initials = (host?.name || host?.email || "?").split(/\s+/).map((w) => w[0]).slice(0, 2).join("").toUpperCase();

  return (
    <div className="min-h-dvh">
      {/* Desktop: sidebar */}
      <aside className="fixed inset-y-0 start-0 z-40 hidden w-[var(--sidebar-w)] flex-col border-e border-[var(--line)] bg-[linear-gradient(180deg,#0a0b0d_0%,#060607_100%)] lg:flex">
        <div className="flex h-16 items-center px-5">
          <Link href="/host" className="flex items-center gap-2.5 text-[15px] font-semibold tracking-tight">
            <Mark size={26} /> {site.name}
          </Link>
        </div>
        <div className="px-4">
          <Link href={create.href} className="btn btn-primary w-full">
            <Icon name="plus" size={16} strokeWidth={2.25} /> {create.label}
          </Link>
        </div>
        <nav aria-label={t("nav.main")} className="mt-6 flex-1 overflow-y-auto px-4">
          <SidebarLinks items={nav} />
        </nav>
        <div className="space-y-3 border-t border-[var(--line)] p-4">
          <LanguagePicker options={languages} />
          {host && (
            <div className="flex items-center gap-3 rounded-[var(--r-md)] border border-[var(--line)] bg-white/[0.02] p-2.5">
              <span className="flex h-8 w-8 shrink-0 items-center justify-center rounded-full bg-[image:var(--silver-soft)] text-xs font-semibold text-[var(--on-accent)]">{initials}</span>
              <span className="min-w-0 flex-1">
                <span className="block truncate text-sm font-medium">{host.name}</span>
                <span className="block truncate text-xs text-[var(--muted)]">{host.email}</span>
              </span>
              <form action={logout}>
                <button className="btn btn-quiet btn-sm btn-icon" aria-label={t("nav.logout")} title={t("nav.logout")}>
                  <Icon name="logout" size={16} />
                </button>
              </form>
            </div>
          )}
        </div>
      </aside>

      {/* Phone / tablet: top bar */}
      <header className="sticky top-0 z-40 border-b border-[var(--line)] bg-[rgba(5,5,6,0.82)] backdrop-blur-xl lg:hidden">
        <div className="flex h-14 items-center justify-between gap-3 px-4">
          <Link href="/host" className="flex min-w-0 items-center gap-2.5 font-semibold tracking-tight">
            <Mark size={24} /> <span className="truncate">{site.name}</span>
          </Link>
          <div className="flex shrink-0 items-center gap-2">
            <LanguagePicker options={languages} />
            <HostMenu links={[...nav, create].map(({ href, label }) => ({ href, label }))} logout={host ? logout : undefined} />
          </div>
        </div>
      </header>

      <div className="lg:ps-[var(--sidebar-w)]">
        {host && isSubscribed(host) && !hasPaymentMethods(host) && (
          <div className="border-b border-amber-400/20 bg-amber-400/[0.07] px-4 py-2.5 text-center text-sm text-amber-100">
            {t("banner.methods")}{" "}
            <Link href="/host/account#methods" className="font-semibold underline underline-offset-2">{t("methods.add")}</Link>
          </div>
        )}
        <div className="pb-28 lg:pb-12">{children}</div>
      </div>

      {host && <TabBar items={nav} create={create} />}
    </div>
  );
}
