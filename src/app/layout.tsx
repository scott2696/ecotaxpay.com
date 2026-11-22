import type { Metadata } from "next";
import { Geist, Geist_Mono, Instrument_Serif } from "next/font/google";
import MotionRoot from "@/components/motion/MotionRoot";
import TimeZoneCookie from "@/components/TimeZoneCookie";
import CookieConsent from "@/components/CookieConsent";
import { I18nProvider } from "@/i18n/client";
import { getI18n } from "@/i18n/server";
import { site } from "@/lib/config";
import "./globals.css";

const geistSans = Geist({
  variable: "--font-geist-sans",
  subsets: ["latin", "latin-ext"],
});

// Editorial italic for emotive accent words (paired with Geist's tight geometric sans).
const serif = Instrument_Serif({
  variable: "--font-serif",
  subsets: ["latin", "latin-ext"],
  weight: "400",
  style: ["italic", "normal"],
});

const geistMono = Geist_Mono({
  variable: "--font-geist-mono",
  subsets: ["latin"],
});

export async function generateMetadata(): Promise<Metadata> {
  const { t } = await getI18n();
  return {
    metadataBase: new URL(site.baseUrl),
    title: t("meta.title"),
    description: t("meta.description"),
    other: { "theme-color": "#050506" },
  };
}

export default async function RootLayout({ children }: Readonly<{ children: React.ReactNode }>) {
  const { locale, dir, messages, vars } = await getI18n();
  return (
    <html lang={locale} dir={dir}>
      <body className={`${geistSans.variable} ${geistMono.variable} ${serif.variable} antialiased`}>
        <I18nProvider locale={locale} messages={messages} vars={vars}>
          <MotionRoot />
          <TimeZoneCookie />
          {children}
          {/* Also loads the tawk.to live chat, only after consent. */}
          <CookieConsent />
        </I18nProvider>
      </body>
    </html>
  );
}
