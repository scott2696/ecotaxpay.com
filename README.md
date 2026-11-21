# Eco Tax Pay (ecotaxpay.com): pay tourist / eco tax before arrival

**The host** fills in the stay on `/host/new`: property, country/region, accommodation type, check-in, nights, adults and children's ages.
The app calculates the tax and creates a personal link. **The host sends the link** by copy-paste into the Airbnb/Booking.com chat, WhatsApp, email or QR code.
**The guest** opens `/p/{id}`, sees a read-only summary and pays with Stripe. The amount is fixed on the server, so the guest can't change it.

## Run it

```bash
npm install
cp .env.example .env.local   # leave STRIPE_SECRET_KEY empty for demo mode
npm run dev                  # http://localhost:3000/host
npm test                     # tax-calculation tests
```

| URL | Who | What |
|---|---|---|
| `/` | Everyone | Homepage: how it works, €3/month pricing, FAQ (incl. how to unsubscribe) |
| `/register`, `/login` | Hosts | Create an account / log in |
| `/host` | Host | Dashboard: upcoming guests, payment links, totals, CSV export |
| `/host/new` | Host | Create a payment link (needs an active subscription) |
| `/host/properties` | Host | Apartments & rooms: tax destination, ID documents, arrival guide, calendars |
| `/host/account` | Host | Subscription (subscribe / cancel / keep), details shown on receipts |
| `/p/{id}` | Guest | Personal payment page |

### Accounts & subscription
- Each host has their own account and only ever sees their own apartments, guests and documents.
- €3/month via Stripe Billing (Checkout in subscription mode, renewing automatically). Without a Stripe key, subscribing is simulated.
- Cancelling sets "cancel at period end": no further charges, access until the paid month ends. Guests can still pay links already sent.
- The **first account created** takes over everything made before accounts existed (apartments, links, receipt numbering).
- Optional: switch on Stripe's **Customer portal** (Dashboard → Settings → Billing) for the "Card & invoices" button.

## Public pages & SEO
- `/about`, `/contact` (form saved to `data/db.json`, forwarded to `SUPPORT_EMAIL` when Resend is set), `/terms`, `/privacy`, `/cookies`, all in the header navigation and/or footer.
- `/sitemap.xml` and `/robots.txt` are generated (`src/app/sitemap.ts`, `src/app/robots.ts`); robots.txt blocks the SEO crawlers listed there, keeps the host area, guest links and APIs out of search, and links the sitemap.
- Every public page has a self-referencing canonical URL and schema.org JSON-LD (Organization, WebSite, WebPage/AboutPage/ContactPage, BreadcrumbList; the homepage adds SoftwareApplication with the €3/month offer and FAQPage). Host and guest pages are `noindex`.
- Favicon: `src/app/favicon.ico` (48 + 96 px) and `icon1–4.png` (48, 96, 144, 192 px) + `apple-icon.png`.
- Legal texts are in English (binding version) and should be reviewed by a lawyer before launch.

## Languages
- Hand-translated: **English, Español, Italiano, Français, Deutsch, Malti** (`src/i18n/messages/*.ts`). Run `npm run check:i18n` after changing texts: it lists missing keys and broken `{placeholders}`.
- Everyone gets a 🌐 language menu. Guests' pages open in their browser language; links can force one with `?lang=xx` (the host's "Guest's language" picker adds it).
- **Any other language:** set `GOOGLE_TRANSLATE_API_KEY` (Google Cloud Translation v2). The menu then lists all ~130 Google languages; the interface is machine-translated once per language and cached in `data/i18n/`, and hosts' arrival guides are translated for guests. Right-to-left languages are laid out right-to-left.
- Receipts (PDF) are issued in the guest's language for Latin, Greek and Cyrillic scripts (Noto Sans, `assets/fonts/`); other scripts fall back to English.

## Going live with Stripe
1. Set `STRIPE_SECRET_KEY` (start with `sk_test_…`).
2. Add a webhook at `https://YOUR_DOMAIN/api/webhook` for `checkout.session.completed` and `checkout.session.async_payment_succeeded`, then set `STRIPE_WEBHOOK_SECRET`.
   Local testing: `stripe listen --forward-to localhost:3000/api/webhook`.
3. Set `SESSION_SECRET` and `NEXT_PUBLIC_BASE_URL`.
4. Add the subscription events to the webhook too (see `.env.example`).

## Tax rates
All rules live in `src/lib/taxRules.ts`: per-person or per-property per-night rates, seasons, exempt ages, night caps, long-stay discounts and percentage taxes.
**Every rate has `verifiedOn` + `sources`. Confirm each with the official authority before taking real payments.** Amsterdam and Berlin are marked `unverified`.
Add a destination by copying a region block, then add a test in `scripts/test-calc.ts`.

## Hosting note
Payments are stored in `data/db.json` (fine for a single server or VPS, e.g. Railway, Render or Fly.io with a volume).
**Vercel/serverless has no persistent disk.** Before deploying there, replace `src/lib/store.ts` with Postgres (Supabase/Neon). The rest of the app only uses the functions it exports.
