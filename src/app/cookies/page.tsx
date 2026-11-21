import type { Metadata } from "next";
import Link from "next/link";
import LegalPage from "@/components/LegalPage";
import { getI18n } from "@/i18n/server";
import { site } from "@/lib/config";
import { pageMeta } from "@/lib/seo";

const DESC = `The cookies ${site.name} uses and why. Only essential cookies, no tracking or advertising.`;

export async function generateMetadata(): Promise<Metadata> {
  const { t } = await getI18n();
  return pageMeta("/cookies", `${t("legal.cookies")} | ${site.name}`, DESC);
}

export default function Cookies() {
  return (
    <LegalPage path="/cookies" titleKey="legal.cookies" description={DESC}>
      <p>
        Cookies are small text files a website stores in your browser. {site.name} uses <strong>only essential cookies</strong>: they are needed for the site
        to work, so they do not require consent. We use <strong>no analytics, tracking or advertising cookies</strong>, so there is no cookie banner.
      </p>

      <h2>Cookies we set</h2>
      <table>
        <thead><tr><th>Name</th><th>Purpose</th><th>Duration</th></tr></thead>
        <tbody>
          <tr><td><code>etp_session</code></td><td>Keeps a host logged in. Signed and HTTP-only, so it cannot be read by scripts or forged.</td><td>30 days, or until you log out</td></tr>
          <tr><td><code>lang</code></td><td>Remembers the language you chose in the 🌐 menu (or the language a host set in your link).</td><td>1 year</td></tr>
          <tr><td><code>tz</code></td><td>Your device&apos;s time zone (e.g. Europe/Malta), so prices and examples are shown in your local currency. Not used to track you.</td><td>1 year</td></tr>
        </tbody>
      </table>

      <h2>Third-party cookies</h2>
      <p>
        When a guest pays, the card payment takes place on <strong>Stripe</strong>&apos;s secure checkout page, and Stripe sets its own essential cookies there
        to prevent fraud. These are governed by <a href="https://stripe.com/cookie-settings" rel="noreferrer" target="_blank">Stripe&apos;s cookie policy</a>.
      </p>

      <h2>Managing cookies</h2>
      <p>
        You can delete or block cookies in your browser settings. If you block essential cookies, logging in and remembering your language will not work.
      </p>

      <p>
        More about how we handle data: <Link href="/privacy">Privacy Policy</Link>. Questions: <a href={`mailto:${site.supportEmail}`}>{site.supportEmail}</a>.
      </p>
    </LegalPage>
  );
}
