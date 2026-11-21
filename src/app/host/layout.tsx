import Link from "next/link";
import LanguagePicker from "@/components/LanguagePicker";
import { getI18n, languageOptions } from "@/i18n/server";
import { currentHost, isSubscribed } from "@/lib/auth";
import { settleDemoSubscription } from "@/lib/billing";
import { site } from "@/lib/config";
import { updateHost } from "@/lib/store";
import { logout } from "./account/actions";
import { Mark } from "@/components/SiteHeader";

export const dynamic = "force-dynamic";
export const metadata = { robots: { index: false, follow: false } };

const NAV = [
  ["/host", "nav.dashboard"],
  ["/host/properties", "nav.apartments"],
  ["/host/rates", "nav.rates"],
  ["/host/account", "nav.account"],
] as const;

export default async function HostLayout({ children }: { children: React.ReactNode }) {
  const found = await currentHost(); // pages redirect to /login themselves if this is null
  const host = found ? await settleDemoSubscription(found) : null;
  const { t, locale } = await getI18n();
  // Remember the host's language for their notification emails.
  if (host && host.locale !== locale) await updateHost(host.id, { locale });

  return (
    <>
      <header className="sticky top-0 z-40 border-b border-[var(--line)] bg-[rgba(5,5,6,0.8)] backdrop-blur-xl">
        <div className="mx-auto flex max-w-6xl flex-wrap items-center justify-between gap-3 px-4 py-3">
          <Link href="/host" className="flex items-center gap-2.5 font-semibold tracking-tight"><Mark size={24} /> {site.name}</Link>
          <nav className="flex flex-wrap items-center gap-1 text-sm">
            {NAV.map(([href, key]) => (
              <Link key={href} href={href} className="rounded-lg px-3 py-1.5 text-[var(--muted)] hover:bg-[var(--bg)] hover:text-[var(--ink)]">{t(key)}</Link>
            ))}
            {host && (
              <form action={logout}>
                <button className="rounded-lg px-3 py-1.5 text-[var(--muted)] hover:bg-[var(--bg)] hover:text-[var(--ink)]">{t("nav.logout")}</button>
              </form>
            )}
            <LanguagePicker options={await languageOptions()} className="ms-1" />
          </nav>
        </div>
      </header>
      {host && !isSubscribed(host) && (
        <div className="bg-amber-400/10 px-4 py-3 text-center text-sm text-amber-100">
          {host.subscription.status === "canceled" ? t("banner.ended") : t("banner.notSubscribed")} {t("banner.body")}{" "}
          <Link href="/host/account" className="font-semibold underline">{t("account.subscribe")}</Link>
        </div>
      )}
      {children}
    </>
  );
}
