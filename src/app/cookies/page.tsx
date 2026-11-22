import type { Metadata } from "next";
import Link from "next/link";
import LegalPage from "@/components/LegalPage";
import { getI18n } from "@/i18n/server";
import { site } from "@/lib/config";
import { pageMeta } from "@/lib/seo";

const DESC = `The cookies ${site.name} uses and why. Essential cookies, live chat only with your consent, no tracking or advertising.`;

export async function generateMetadata(): Promise<Metadata> {
  const { t } = await getI18n();
  return pageMeta("/cookies", `${t("legal.cookies")} | ${site.name}`, DESC);
}

export default function Cookies() {
  return (
    <LegalPage path="/cookies" titleKey="legal.cookies" description={DESC}>
      <p>
        Cookies are small text files a website stores in your browser. {site.name} uses <strong>essential cookies</strong>, which are needed for the site to
        work and do not require consent. Our <strong>live chat</strong> (tawk.to) sets its own cookies, so it is only loaded if you choose <strong>Accept</strong> in the
        cookie banner. We use <strong>no analytics, tracking or advertising cookies</strong>.
      </p>

      <h2>Cookies we set</h2>
      <table>
        <thead><tr><th>Name</th><th>Purpose</th><th>Duration</th></tr></thead>
        <tbody>
          <tr><td><code>etp_session</code></td><td>Keeps a host logged in. Signed and HTTP-only, so it cannot be read by scripts or forged.</td><td>30 days, or until you log out</td></tr>
          <tr><td><code>lang</code></td><td>Remembers the language you chose in the 🌐 menu (or the language a host set in your link).</td><td>1 year</td></tr>
          <tr><td><code>cookie_consent</code></td><td>Remembers your choice in the cookie banner (&quot;Accept&quot; or &quot;Essential only&quot;).</td><td>1 year</td></tr>
          <tr><td><code>tz</code></td><td>Your device&apos;s time zone (e.g. Europe/Malta), so prices and examples are shown in your local currency. Not used to track you.</td><td>1 year</td></tr>
        </tbody>
      </table>

      <h2>Third-party cookies</h2>
      <p>
        When a host pays their subscription, the card payment takes place on <strong>Stripe</strong>&apos;s secure checkout page, and Stripe sets its own
        essential cookies there to prevent fraud. Guests pay their host directly, through the host&apos;s own bank or payment app. These are governed by <a href="https://stripe.com/cookie-settings" rel="noreferrer" target="_blank">Stripe&apos;s cookie policy</a>.
      </p>
      <p>
        Our live chat is provided by <strong>tawk.to</strong> and loads <strong>only after you accept</strong> in the cookie banner. It then sets its own cookies
        (such as <code>__tawkuuid</code> and <code>TawkConnectionTime</code>) so a conversation continues as you move between pages. See <a href="https://www.tawk.to/privacy-policy/" rel="noreferrer" target="_blank">tawk.to&apos;s privacy policy</a>.
      </p>

      <h2>Managing cookies</h2>
      <p>
        You can change your choice at any time with <strong>Cookie settings</strong> in the footer of every page. You can also delete or block cookies in your
        browser settings; if you block essential cookies, logging in and remembering your language will not work.
      </p>

      <p>
        More about how we handle data: <Link href="/privacy">Privacy Policy</Link>. Questions: <a href={`mailto:${site.supportEmail}`}>{site.supportEmail}</a>.
      </p>
    </LegalPage>
  );
}
