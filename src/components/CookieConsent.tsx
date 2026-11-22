"use client";

import Link from "next/link";
import { useEffect, useState } from "react";
import { useT } from "@/i18n/client";
import { publicHref } from "@/lib/urls";

/**
 * Cookie consent. Essential cookies (login, language, time zone) need no consent; the tawk.to live
 * chat sets its own cookies, so it only loads after "Accept". The choice is kept for a year in the
 * `cookie_consent` cookie; "Cookie settings" in the footer reopens the banner.
 */
export const CONSENT_COOKIE = "cookie_consent";
export const OPEN_EVENT = "etp:cookie-settings";

type Choice = "all" | "essential" | null;
const read = (): Choice => {
  const m = document.cookie.match(/(?:^|; )cookie_consent=(all|essential)/);
  return (m?.[1] as Choice) ?? null;
};

function loadChat() {
  const property = process.env.NEXT_PUBLIC_TAWK_PROPERTY_ID;
  const widget = process.env.NEXT_PUBLIC_TAWK_WIDGET_ID || "default";
  if (!property || document.getElementById("tawk-to")) return;
  (window as unknown as { Tawk_API?: object; Tawk_LoadStart?: Date }).Tawk_API ??= {};
  (window as unknown as { Tawk_LoadStart?: Date }).Tawk_LoadStart = new Date();
  const s = document.createElement("script");
  s.id = "tawk-to";
  s.async = true;
  s.src = `https://embed.tawk.to/${encodeURIComponent(property)}/${encodeURIComponent(widget)}`;
  s.charset = "UTF-8";
  s.setAttribute("crossorigin", "*");
  document.body.appendChild(s);
}

export default function CookieConsent() {
  const t = useT();
  const [open, setOpen] = useState(false);

  useEffect(() => {
    const choice = read();
    if (choice === "all") loadChat();
    if (!choice) setOpen(true);
    const reopen = () => setOpen(true);
    window.addEventListener(OPEN_EVENT, reopen);
    return () => window.removeEventListener(OPEN_EVENT, reopen);
  }, []);

  function choose(choice: Exclude<Choice, null>) {
    document.cookie = `${CONSENT_COOKIE}=${choice}; Max-Age=${60 * 60 * 24 * 365}; Path=/; SameSite=Lax${location.protocol === "https:" ? "; Secure" : ""}`;
    setOpen(false);
    if (choice === "all") loadChat();
    // Withdrawing consent: reload so the chat (and its cookies) are no longer used.
    else if (document.getElementById("tawk-to")) location.reload();
  }

  if (!open) return null;
  return (
    <div role="dialog" aria-live="polite" aria-label={t("cookies.title")} className="fixed inset-x-3 bottom-3 z-[60] mx-auto max-w-xl rounded-2xl border border-[var(--line)] bg-[rgba(14,15,18,0.96)] p-4 shadow-2xl backdrop-blur sm:p-5">
      <p className="text-sm font-semibold">{t("cookies.title")}</p>
      <p className="mt-1 text-sm text-[var(--muted)]">
        {t("cookies.text")}{" "}
        <Link href={publicHref("/cookies")} className="underline">{t("legal.cookies")}</Link>
      </p>
      <div className="mt-3 flex flex-wrap justify-end gap-2">
        <button onClick={() => choose("essential")} className="rounded-xl border border-[var(--line)] px-4 py-2 text-sm font-medium hover:bg-[var(--soft)]">
          {t("cookies.essential")}
        </button>
        <button onClick={() => choose("all")} className="rounded-xl bg-[var(--accent)] px-4 py-2 text-sm font-semibold text-[var(--on-accent)] hover:brightness-110">
          {t("cookies.accept")}
        </button>
      </div>
    </div>
  );
}

/** Footer link that reopens the banner. */
export function CookieSettingsLink({ className = "" }: { className?: string }) {
  const t = useT();
  return (
    <button type="button" onClick={() => window.dispatchEvent(new Event(OPEN_EVENT))} className={className}>
      {t("cookies.settings")}
    </button>
  );
}
