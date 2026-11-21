import type { Metadata } from "next";
import Link from "next/link";
import LegalPage from "@/components/LegalPage";
import { getI18n } from "@/i18n/server";
import { site } from "@/lib/config";
import { pageMeta } from "@/lib/seo";

const DESC = `How ${site.name} collects, uses and protects personal data of hosts and guests.`;

export async function generateMetadata(): Promise<Metadata> {
  const { t } = await getI18n();
  return pageMeta("/privacy", `${t("legal.privacy")} | ${site.name}`, DESC);
}

export default function Privacy() {
  const c = site.company;
  const mail = <a href={`mailto:${site.supportEmail}`}>{site.supportEmail}</a>;
  return (
    <LegalPage path="/privacy" titleKey="legal.privacy" description={DESC}>
      <p>
        This policy explains how {c} (&quot;we&quot;) handles personal data when you use {site.name}. Questions or requests: {mail}.
      </p>

      <h2>1. Our two roles</h2>
      <ul>
        <li><strong>Hosts&apos; account data:</strong> we are the <em>controller</em> of the data you give us to run your account and subscription.</li>
        <li><strong>Guests&apos; data:</strong> when a Host sends a guest a payment link, the Host is the controller of that guest&apos;s data and we act as the Host&apos;s <em>processor</em>, handling it only on the Host&apos;s instructions to provide the Service. Guests should contact their Host first; we will help the Host respond.</li>
      </ul>

      <h2>2. What we collect</h2>
      <table>
        <thead><tr><th>Who</th><th>Data</th><th>Why</th></tr></thead>
        <tbody>
          <tr><td>Hosts</td><td>Name, email, password (stored only as a secure hash), business name, tax/VAT number, language, subscription status</td><td>Account, billing, receipts issued in your name</td></tr>
          <tr><td>Hosts</td><td>Apartments, arrival guides, calendar links, payment links you create</td><td>Providing the Service</td></tr>
          <tr><td>Guests</td><td>Name, email, optional WhatsApp number, stay dates, number and ages of guests, booking reference, language</td><td>Calculating and collecting the tax, sending the receipt and arrival guide</td></tr>
          <tr><td>Guests (only if the Host asks)</td><td>Identity documents such as passport or ID card images</td><td>The Host&apos;s registration or verification obligations</td></tr>
          <tr><td>Anyone</td><td>Contact-form messages</td><td>Answering you</td></tr>
          <tr><td>Anyone</td><td>Technical data (IP address, browser) in server logs</td><td>Security and preventing abuse</td></tr>
        </tbody>
      </table>
      <p>We never receive full card numbers: card payments are handled entirely by Stripe.</p>

      <h2>3. Legal bases</h2>
      <p>
        Performance of a contract (running your account, processing payments), legal obligation (tax and accounting records), and legitimate interests (security,
        preventing fraud, improving the Service). For guest identity documents, the legal basis is the Host&apos;s, typically a legal registration obligation.
      </p>

      <h2>4. Who we share data with</h2>
      <p>We use these service providers, under data-processing agreements:</p>
      <ul>
        <li><strong>Stripe</strong>: card payments and the host subscription.</li>
        <li><strong>Resend</strong>: sending receipt and notification emails.</li>
        <li><strong>Meta (WhatsApp Business)</strong>: only if a WhatsApp number is given and WhatsApp receipts are switched on.</li>
        <li><strong>Google Cloud Translation</strong>: only if automatic translation is switched on; interface text and arrival-guide text are sent for translation, never identity documents.</li>
        <li>Our hosting provider, which stores the data.</li>
      </ul>
      <p>Some providers may process data outside the EEA/UK; where they do, we rely on adequacy decisions or Standard Contractual Clauses. We never sell personal data.</p>

      <h2>5. How long we keep it</h2>
      <ul>
        <li>Payment records and receipts: as long as tax and accounting law requires (often 5–10 years), then deleted.</li>
        <li>Identity documents: until the Host deletes them, and no longer than the Host&apos;s legal retention period; Hosts should delete them as soon as they are no longer needed.</li>
        <li>Host accounts: while active, then up to 12 months after closure (except records we must keep by law).</li>
        <li>Contact messages: up to 24 months.</li>
      </ul>

      <h2>6. Security</h2>
      <p>
        Passwords are hashed, sessions are signed, each Host can only access their own data, uploaded documents are never public and can only be opened by the
        Host, and arrival-guide details (like key-box codes) are shown to guests only after payment.
      </p>

      <h2>7. Your rights</h2>
      <p>
        Under the GDPR / UK GDPR you can ask to access, correct, delete, restrict or port your data, and object to processing based on legitimate interests.
        Email {mail}. You can also complain to your data-protection authority (in Malta: the Information and Data Protection Commissioner).
      </p>

      <h2>8. Cookies</h2>
      <p>We only use essential cookies. See the <Link href="/cookies">Cookie Policy</Link>.</p>

      <h2>9. Changes</h2>
      <p>We will post any changes here and update the date above; for significant changes we will email Hosts.</p>
    </LegalPage>
  );
}
