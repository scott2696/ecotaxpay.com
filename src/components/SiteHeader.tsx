import Link from "next/link";
import LanguagePicker from "@/components/LanguagePicker";
import { getI18n, languageOptions } from "@/i18n/server";
import { currentHost } from "@/lib/auth";
import { site } from "@/lib/config";
import HeaderChrome from "./HeaderChrome";
import { appHref } from "@/lib/urls";

/** Main horizontal navigation for all public pages. */
export default async function SiteHeader() {
  const [{ t }, host, languages] = await Promise.all([getI18n(), currentHost(), languageOptions()]);
  const links = [
    { href: "/about", label: t("nav.about") },
    { href: "/#how", label: t("home.how") },
    { href: "/#pricing", label: t("home.nav.pricing") },
    { href: "/#faq", label: t("home.nav.faq") },
    { href: "/contact", label: t("nav.contact") },
  ];
  const brand = (
    <Link href="/" className="flex items-center gap-2.5 text-[15px] font-semibold tracking-tight text-[var(--ink)]" aria-label={site.name}>
      <Mark /> {site.name}
    </Link>
  );
  const account = host ? (
    <Link href={appHref("/host")} className="btn-silver h-10 px-5 text-sm">{t("nav.dashboard")}</Link>
  ) : (
    <>
      <Link href={appHref("/login")} className="px-3 py-2 text-[13px] font-medium text-[var(--muted)] hover:text-[var(--ink)]">{t("auth.login")}</Link>
      <Link href={appHref("/register")} className="btn-silver h-10 px-5 text-sm">{t("auth.signup")}</Link>
    </>
  );
  return (
    <HeaderChrome
      brand={brand}
      links={links}
      actions={<><LanguagePicker options={languages} />{account}</>}
      mobileActions={
        <>
          <LanguagePicker options={languages} />
          {host ? (
            <Link href={appHref("/host")} className="btn-silver h-12 text-base">{t("nav.dashboard")}</Link>
          ) : (
            <>
              <Link href={appHref("/register")} className="btn-silver h-12 text-base">{t("auth.signup")}</Link>
              <Link href={appHref("/login")} className="btn-ghost h-12 text-base">{t("auth.login")}</Link>
            </>
          )}
        </>
      }
    />
  );
}

/** Brand mark: the polished-silver leaf logo (public/logo.png, transparent background). */
export function Mark({ size = 28 }: { size?: number }) {
  return (
    // eslint-disable-next-line @next/next/no-img-element
    <img
      src="/logo.png"
      width={size}
      height={size}
      alt=""
      aria-hidden
      className="shrink-0 drop-shadow-[0_1px_6px_rgba(255,255,255,0.08)]"
    />
  );
}

/** Kept for existing imports. */
export function Leaf({ size = 20 }: { size?: number }) {
  return <Mark size={size} />;
}
