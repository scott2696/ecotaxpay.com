"use client";

import QRCode from "qrcode";
import { useEffect, useState } from "react";
import { useT } from "@/i18n/client";

/** The guest message in each hand-translated language (the host picks the guest's language). */
export type GuestTemplates = Record<string, { label: string; message: string; subject: string; quickMessage: string; quickMessageAnon: string; defaultTax: string }>;

/** Link + ready-to-send message for the guest (copy, WhatsApp, email, QR), in the guest's language. */
export default function SendPanel(props: {
  url: string;
  guestName: string;
  guestEmail?: string;
  guestPhone?: string;
  amount: string;
  taxName: string;
  checkIn: string;
  checkOut: string;
  propertyName: string;
  templates: GuestTemplates;
  /** Quick link: no stay or property, so a shorter message. */
  quick?: boolean;
}) {
  const t = useT();
  const { guestName, guestEmail, guestPhone, amount, taxName, checkIn, checkOut, propertyName, templates } = props;
  const [lang, setLang] = useState(templates[t.locale] ? t.locale : "en");
  const tpl = templates[lang] ?? templates.en;
  // The link opens in the chosen language (?lang=…), and the guest can still switch on the page.
  const url = `${props.url}?lang=${lang}`;
  const first = guestName.trim().split(/\s+/)[0] || "";
  const fmt = (iso: string) => new Date(`${iso}T00:00:00Z`).toLocaleDateString(lang === "en" ? "en-GB" : lang, { day: "numeric", month: "long", timeZone: "UTC" });
  const tax = taxName || tpl.defaultTax;
  const fill = (s: string) =>
    s.replace(/\{(\w+)\}/g, (m, k: string) =>
      ({ name: first, property: propertyName, from: checkIn && fmt(checkIn), to: checkOut && fmt(checkOut), tax, amount, url } as Record<string, string>)[k] ?? m);
  const subject = fill(tpl.subject).replace(/^./, (c) => c.toLocaleUpperCase());
  const message = fill(props.quick ? (first ? tpl.quickMessage : tpl.quickMessageAnon) : tpl.message);

  const [qr, setQr] = useState("");
  const [copied, setCopied] = useState<"link" | "msg" | null>(null);
  useEffect(() => {
    QRCode.toDataURL(url, { margin: 1, width: 280 }).then(setQr);
  }, [url]);

  const copy = (text: string, which: "link" | "msg") => {
    navigator.clipboard.writeText(text);
    setCopied(which);
    setTimeout(() => setCopied(null), 1500);
  };

  const phone = (guestPhone ?? "").replace(/[^\d]/g, "");
  const whatsapp = `https://wa.me/${phone}?text=${encodeURIComponent(message)}`;
  const mailto = `mailto:${guestEmail ?? ""}?subject=${encodeURIComponent(subject)}&body=${encodeURIComponent(message)}`;
  const btn = "inline-flex items-center justify-center gap-2 rounded-lg border border-[var(--line)] bg-[var(--surface)] px-4 py-2.5 text-sm font-medium hover:bg-[var(--soft)]";

  return (
    <section className="rounded-2xl border border-[var(--line)] bg-[var(--surface)] p-6 shadow-sm">
      <div className="mb-4 flex items-center gap-3">
        <span className="flex h-9 w-9 items-center justify-center rounded-full bg-[var(--soft)] text-[var(--accent)]">✓</span>
        <div>
          <h2 className="font-semibold">{t("send.ready", { amount })}</h2>
          <p className="text-sm text-[var(--muted)]">{props.quick ? t("send.forQuick") : t("send.forProperty", { property: propertyName, name: first || t("send.yourGuest") })}</p>
        </div>
      </div>

      <label className="mb-4 flex flex-wrap items-center gap-2 text-sm">
        <span className="font-medium">{t("send.guestLanguage")}</span>
        <select className="input h-10 w-auto text-sm" value={lang} onChange={(e) => setLang(e.target.value)}>
          {Object.entries(templates).map(([code, v]) => (
            <option key={code} value={code}>{v.label}</option>
          ))}
        </select>
      </label>

      <div className="flex gap-2">
        <input className="input font-mono text-xs" readOnly value={url} onFocus={(e) => e.target.select()} />
        <button type="button" onClick={() => copy(url, "link")} className="shrink-0 rounded-lg bg-[var(--accent)] px-4 text-sm font-semibold text-[var(--on-accent)]">
          {copied === "link" ? t("common.copied") : t("common.copyLink")}
        </button>
      </div>

      <div className="mt-5">
        <div className="mb-1.5 text-sm font-medium">{t("send.messageTitle")}</div>
        <textarea readOnly className="input h-auto min-h-28 py-2 text-sm leading-relaxed" value={message} onFocus={(e) => e.target.select()} dir="auto" />
      </div>

      <div className="mt-3 grid grid-cols-1 gap-2 sm:grid-cols-3">
        <button type="button" className={btn} onClick={() => copy(message, "msg")}>
          {copied === "msg" ? t("common.copied") : t("send.copyMessage")}
        </button>
        <a className={btn} href={whatsapp} target="_blank" rel="noreferrer">WhatsApp</a>
        <a className={btn} href={mailto}>{t("common.email")}</a>
      </div>

      {qr && (
        <div className="mt-5 flex items-center gap-4 rounded-lg bg-[var(--bg)] p-4">
          {/* eslint-disable-next-line @next/next/no-img-element */}
          <img src={qr} alt={t("send.qrAlt")} width={120} height={120} className="rounded bg-white" />
          <div className="text-sm text-[var(--muted)]">
            {t("send.qr")}{" "}
            <a href={qr} download="payment-qr.png" className="text-[var(--accent)] underline">{t("common.download")}</a>
          </div>
        </div>
      )}
    </section>
  );
}
