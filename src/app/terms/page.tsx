import type { Metadata } from "next";
import Link from "next/link";
import LegalPage from "@/components/LegalPage";
import { getI18n } from "@/i18n/server";
import { site } from "@/lib/config";
import { pageMeta } from "@/lib/seo";
import { appHref } from "@/lib/urls";

const DESC = `The terms that apply when hosts and guests use ${site.name}.`;

export async function generateMetadata(): Promise<Metadata> {
  const { t } = await getI18n();
  return pageMeta("/terms", `${t("legal.terms")} | ${site.name}`, DESC);
}

export default function Terms() {
  const c = site.company;
  return (
    <LegalPage path="/terms" titleKey="legal.terms" description={DESC}>
      <p>
        These terms apply to the {site.name} website and service (the &quot;Service&quot;), operated by {c} (&quot;we&quot;, &quot;us&quot;). By creating an account or
        paying through a {site.name} link you agree to them. If you do not agree, please do not use the Service.
      </p>

      <h2>1. What the Service does</h2>
      <p>
        {site.name} lets accommodation providers (&quot;Hosts&quot;) calculate local tourist, eco or visitor taxes, send their guests (&quot;Guests&quot;) a payment link
        showing the amount and the Host&apos;s own payment details, issue receipts once the Host confirms payment, optionally collect identity documents, import
        bookings from the Host&apos;s calendars, and share an arrival guide after payment.
      </p>
      <p>
        We provide software only. We are not a tax authority, tax adviser or law firm, and we are not the collector of any tax. Each Host remains solely
        responsible for registering with, declaring to and paying over tax to the relevant authority, and for complying with local law.
      </p>

      <h2>2. Tax rates</h2>
      <p>
        Built-in rates are researched from public sources and dated on the <Link href={appHref("/host/rates")}>Destinations &amp; rates</Link> page, but rates and rules change
        and sources sometimes disagree. Hosts must check that the rate, exemptions and caps applied to each stay are correct before sending a link. Rates entered
        by a Host (&quot;Other destination&quot;) are the Host&apos;s responsibility. We are not liable for tax under- or over-charged because of an incorrect rate.
      </p>

      <h2>3. Host accounts</h2>
      <ul>
        <li>You must be at least 18 and provide accurate details. You are responsible for everything done with your account and for keeping your password secret.</li>
        <li>You may only add accommodation you are entitled to let, and only send links to your own guests.</li>
        <li>You must have a lawful basis for any guest data you ask for, including identity documents, and tell guests why you collect them.</li>
        <li>Calendar links you connect (for example Airbnb, Booking.com, Vrbo, Misterb&amp;b or a channel manager) are used only to show your upcoming bookings to you. Booking platforms do not share guest names through these links.</li>
        <li>The payment details you add (bank account, Revolut, PayPal, card payment link and similar) are shown to the Guests you send links to. You are responsible for keeping them correct.</li>
      </ul>

      <h2>4. Subscription, billing and cancellation</h2>
      <ul>
        <li>The subscription starts when you create your account and complete payment on Stripe&apos;s secure checkout page. Payments are processed by Stripe; we never see your full card details.</li>
        <li>Hosts pay a subscription of <strong>€3 per month</strong>, or the equivalent in their local currency at the European Central Bank reference rate on the day they subscribe (the exact amount is shown before payment and stays the same for that subscription), charged automatically to the payment method on file at the start of each monthly period until cancelled. Stripe emails a receipt for each payment, and invoices are available under <strong>Account → Payment method and invoices</strong>. Prices include or exclude VAT as shown at checkout.</li>
        <li>You can cancel at any time from <strong>Account → Cancel subscription</strong>. Cancellation takes effect at the end of the current paid month: you will not be charged again and you keep access until then. We do not refund partial months, except where the law requires it.</li>
        <li>If a payment fails we may retry it, and we may suspend the creation of new payment links until it succeeds.</li>
        <li>We may change the price with at least 30 days&apos; notice by email. If you do not agree, you can cancel before the change applies.</li>
        <li>Consumers in the EU/UK may have a 14-day right of withdrawal from the subscription; by starting to use the Service straight away you ask us to begin immediately, and a withdrawal within 14 days is refunded pro rata for the time used.</li>
      </ul>

      <h2>5. Guest payments</h2>
      <p>
        Guests pay the Host directly before arrival, using the payment methods the Host lists (for example a card payment link, bank transfer, Revolut, PayPal,
        Wise, Bizum or Wero). We never receive,
        hold or transfer guests&apos; money, and we are not a party to the payment. A receipt is issued only when the Host confirms the payment has arrived.
        The amount is set by the Host&apos;s link and cannot be changed by the Guest. Questions about the amount, payment, refunds
        (for example after a cancelled or shortened stay) and the stay itself should go to the Host, who is responsible for them. Receipts are issued in the
        Host&apos;s name and are not government documents.
      </p>

      <h2>6. Cookies and live chat</h2>
      <p>
        We use essential cookies to run the Service. Our live chat (tawk.to) is only loaded if you accept it in the cookie banner. See the{" "}
        <Link href="/cookies">Cookie Policy</Link> for details; you can change your choice at any time under &quot;Cookie settings&quot; in the footer.
      </p>

      <h2>7. Acceptable use</h2>
      <p>
        You must not misuse the Service: no unlawful, fraudulent or misleading use, no attempts to access other users&apos; data, no interference with the Service,
        and no use to collect tax you are not entitled to collect. We may suspend or close accounts that break these terms.
      </p>

      <h2>8. Availability and changes</h2>
      <p>
        We aim to keep the Service available but do not guarantee it will be uninterrupted or error-free. We may change or improve features. We will give
        reasonable notice of changes that materially reduce what you pay for.
      </p>

      <h2>9. Liability</h2>
      <p>
        Nothing in these terms limits liability that cannot be limited by law. Otherwise, we are not liable for indirect or consequential losses, lost profits,
        or tax, penalties or interest owed by a Host, and our total liability to a Host in any 12 months is limited to the subscription fees that Host paid in
        that period.
      </p>

      <h2>10. Ending the contract</h2>
      <p>
        You can stop using the Service and cancel at any time. We may end the Service for you on 30 days&apos; notice, or immediately for a serious breach. After
        an account ends we keep and delete data as described in the <Link href="/privacy">Privacy Policy</Link>.
      </p>

      <h2>11. Law and disputes</h2>
      <p>
        These terms are governed by the laws of the country where {c} is established, without depriving consumers of the protection of the mandatory laws of
        their own country. Contact us first at <a href={`mailto:${site.supportEmail}`}>{site.supportEmail}</a>; we will try to resolve any problem quickly.
      </p>
    </LegalPage>
  );
}
