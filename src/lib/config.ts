import Stripe from "stripe";

export const site = {
  name: process.env.BRAND_NAME || "Eco Tax Pay",
  hostName: process.env.HOST_LEGAL_NAME || "Your Name / Business",
  hostTaxId: process.env.HOST_TAX_ID || "",
  hostEmail: process.env.HOST_NOTIFY_EMAIL || "",
  baseUrl: (process.env.NEXT_PUBLIC_BASE_URL || (process.env.NODE_ENV === "production" ? "https://ecotaxpay.com" : "http://localhost:3000")).replace(/\/$/, ""),
  // The company behind the platform (legal pages, contact page, schema markup).
  company: process.env.COMPANY_LEGAL_NAME || "EcoTaxPay",
  companyAddress: process.env.COMPANY_ADDRESS || "05, The George Residences\nTriq L-Imrejkba\nSt Paul’s Bay, Qawra SPB 1441\nMalta",
  /** The same address in parts, for schema markup. */
  companyPostal: {
    streetAddress: "05, The George Residences, Triq L-Imrejkba",
    addressLocality: "St Paul’s Bay",
    addressRegion: "Qawra",
    postalCode: "SPB 1441",
    addressCountry: "MT",
  },
  domain: "ecotaxpay.com",
  supportEmail: process.env.SUPPORT_EMAIL || "support@ecotaxpay.com",
};

let stripeClient: Stripe | null = null;
export function stripe(): Stripe | null {
  if (!process.env.STRIPE_SECRET_KEY) return null;
  stripeClient ??= new Stripe(process.env.STRIPE_SECRET_KEY);
  return stripeClient;
}

/** Demo mode = no Stripe key configured: payments are simulated (never in production). */
export const isDemoMode = () => !process.env.STRIPE_SECRET_KEY;
