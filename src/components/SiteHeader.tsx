import Link from "next/link";
import LanguagePicker from "@/components/LanguagePicker";
import { getI18n, languageOptions } from "@/i18n/server";
import { currentHost } from "@/lib/auth";
import { site } from "@/lib/config";
import HeaderChrome from "./HeaderChrome";

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
    <Link href="/host" className="btn-silver h-10 px-5 text-sm">{t("nav.dashboard")}</Link>
  ) : (
    <>
      <Link href="/login" className="px-3 py-2 text-[13px] font-medium text-[var(--muted)] hover:text-[var(--ink)]">{t("auth.login")}</Link>
      <Link href="/register" className="btn-silver h-10 px-5 text-sm">{t("auth.signup")}</Link>
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
            <Link href="/host" className="btn-silver h-12 text-base">{t("nav.dashboard")}</Link>
          ) : (
            <>
              <Link href="/register" className="btn-silver h-12 text-base">{t("auth.signup")}</Link>
              <Link href="/login" className="btn-ghost h-12 text-base">{t("auth.login")}</Link>
            </>
          )}
        </>
      }
    />
  );
}

/** Brand mark: a polished-silver leaf in a graphite tile (Eco Tax Pay). */
export function Mark({ size = 26 }: { size?: number }) {
  return (
    <svg width={size} height={size} viewBox="0 0 32 32" aria-hidden>
      <defs>
        <linearGradient id="mk-s" x1="0" x2="1" y1="0" y2="1">
          <stop offset="0" stopColor="#ffffff" />
          <stop offset="0.55" stopColor="#b9bcc3" />
          <stop offset="1" stopColor="#eceef1" />
        </linearGradient>
      </defs>
      <rect x="0.5" y="0.5" width="31" height="31" rx="8" fill="#111215" stroke="rgba(255,255,255,0.14)" />
      <path d="M24 8c-9 0-15 4.5-15 11.5 0 1.6.4 3 1 4.2C12 17 16.5 13.5 21 12c-4 2.4-7.4 6-9.6 12.2C13 25.3 14.6 26 16.6 26 22 26 24.6 20 24 8Z" fill="url(#mk-s)" />
    </svg>
  );
}

/** Kept for existing imports. */
export function Leaf({ size = 20 }: { size?: number }) {
  return <Mark size={size} />;
}
