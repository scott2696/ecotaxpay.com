import Link from "next/link";
import { CookieSettingsLink } from "./CookieConsent";
import { getI18n } from "@/i18n/server";
import { site } from "@/lib/config";
import { Leaf } from "./SiteHeader";
import { appHref } from "@/lib/urls";

/** Footer for all public pages: company, product, legal and technical links. */
export default async function SiteFooter() {
  const { t } = await getI18n();
  const cols: [string, [string, string][]][] = [
    [t("footer.product"), [["/destinations", t("nav.destinations")], ["/#pricing", t("home.nav.pricing")], ["/#faq", t("home.nav.faq")], [appHref("/register"), t("auth.signup")], [appHref("/login"), t("auth.login")]]],
    [t("footer.company"), [["/about", t("nav.about")], ["/contact", t("nav.contact")]]],
    [t("footer.legal"), [["/terms", t("legal.terms")], ["/privacy", t("legal.privacy")], ["/cookies", t("legal.cookies")]]],
    [t("footer.site"), [["/sitemap", "Sitemap"], ["/sitemap.xml", "XML sitemap"], ["/robots.txt", "robots.txt"]]],
  ];
  return (
    <footer className="border-t border-[var(--line)] bg-[var(--surface)]">
      <div className="mx-auto grid max-w-6xl gap-8 px-4 py-12 sm:grid-cols-2 lg:grid-cols-5">
        <div className="lg:col-span-1">
          <Link href="/" className="flex items-center gap-2 font-semibold text-[var(--accent)]">
            <Leaf /> {site.name}
          </Link>
          <p className="mt-3 text-sm text-[var(--muted)]">{t("footer.tagline")}</p>
        </div>
        {cols.map(([title, links]) => (
          <nav key={title} aria-label={title}>
            <h2 className="text-sm font-semibold">{title}</h2>
            <ul className="mt-3 space-y-2 text-sm">
              {links.map(([href, label]) => (
                <li key={href}>
                  {href.endsWith(".xml") || href.endsWith(".txt") ? (
                    <a href={href} className="text-[var(--muted)] hover:text-[var(--ink)]">{label}</a>
                  ) : (
                    <Link href={href} className="text-[var(--muted)] hover:text-[var(--ink)]">{label}</Link>
                  )}
                </li>
              ))}
              {title === t("footer.legal") && (
                <li>
                  <CookieSettingsLink className="text-[var(--muted)] hover:text-[var(--ink)]" />
                </li>
              )}
            </ul>
          </nav>
        ))}
      </div>
      <div className="border-t border-[var(--line)] py-6 text-center text-xs text-[var(--muted)]">
        © {new Date().getFullYear()} {site.company} · {t("home.footer")}
      </div>
    </footer>
  );
}
