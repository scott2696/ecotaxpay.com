import Link from "next/link";
import LanguagePicker from "@/components/LanguagePicker";
import { getI18n, languageOptions } from "@/i18n/server";
import { currentHost, isSubscribed } from "@/lib/auth";
import { hasPaymentMethods } from "@/lib/payMethods";
import { settleDemoSubscription } from "@/lib/billing";
import { site } from "@/lib/config";
import { updateHost } from "@/lib/store";
import { logout } from "./account/actions";
import { Mark } from "@/components/SiteHeader";
import HostMenu from "./HostMenu";

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
        <div className="mx-auto flex max-w-6xl items-center justify-between gap-3 px-4 py-3">
          <Link href="/host" className="flex min-w-0 items-center gap-2.5 font-semibold tracking-tight"><Mark size={24} /> <span className="truncate">{site.name}</span></Link>
          <div className="flex shrink-0 items-center gap-2">
            <LanguagePicker options={await languageOptions()} />
            <HostMenu links={NAV.map(([href, key]) => ({ href, label: t(key) }))} logout={host ? logout : undefined} />
          </div>
        </div>
      </header>
      {host && isSubscribed(host) && !hasPaymentMethods(host) && (
        <div className="bg-amber-400/10 px-4 py-3 text-center text-sm text-amber-100">
          {t("banner.methods")}{" "}
          <Link href="/host/account#methods" className="font-semibold underline">{t("methods.add")}</Link>
        </div>
      )}
      {children}
    </>
  );
}
