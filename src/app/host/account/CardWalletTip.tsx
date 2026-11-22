"use client";

import { useEffect, useRef } from "react";
import { useT } from "@/i18n/client";

const APPS = [
  { name: "Stripe", url: "https://stripe.com/payments/payment-links" },
  { name: "SumUp", url: "https://www.sumup.com/" },
  { name: "Viva Wallet", url: "https://www.vivawallet.com/" },
  { name: "myPOS", url: "https://www.mypos.com/" },
];

/**
 * Card method: recommends a payment app ("wallet") that accepts every credit/debit card, Apple Pay and
 * Google Pay. Opens by itself the first time the host switches Card on without a link; a button reopens it.
 */
export default function CardWalletTip({ hasLink }: { hasLink: boolean }) {
  const t = useT();
  const dialog = useRef<HTMLDialogElement>(null);

  useEffect(() => {
    const toggle = document.querySelector<HTMLInputElement>('input[name="cardOn"]');
    if (!toggle) return;
    const onChange = () => {
      const link = document.querySelector<HTMLInputElement>('input[name="cardUrl"]')?.value.trim();
      let seen = false;
      try {
        seen = sessionStorage.getItem("etp:cardTip") === "1";
        sessionStorage.setItem("etp:cardTip", "1");
      } catch {}
      if (toggle.checked && !link && !hasLink && !seen) dialog.current?.showModal();
    };
    toggle.addEventListener("change", onChange);
    return () => toggle.removeEventListener("change", onChange);
  }, [hasLink]);

  return (
    <>
      <button
        type="button"
        onClick={() => dialog.current?.showModal()}
        className="justify-self-start text-sm font-medium text-[var(--accent)] underline sm:col-span-2"
      >
        💡 {t("cardTip.open")}
      </button>
      <dialog
        ref={dialog}
        onClick={(e) => e.target === dialog.current && dialog.current?.close()}
        className="m-auto w-[min(32rem,calc(100vw-2rem))] rounded-2xl border border-[var(--line)] bg-[var(--surface)] p-0 text-[var(--ink)] backdrop:bg-black/60"
      >
        <div className="p-6">
          <h2 className="text-lg font-semibold">💳 {t("cardTip.title")}</h2>
          <p className="mt-2 text-sm text-[var(--muted)]">{t("cardTip.intro")}</p>
          <div className="mt-4 grid grid-cols-2 gap-2">
            {APPS.map((a) => (
              <a key={a.name} href={a.url} target="_blank" rel="noreferrer noopener" className="rounded-xl border border-[var(--line)] px-3 py-2.5 text-sm font-medium hover:bg-[var(--soft)]">
                {a.name} ↗
              </a>
            ))}
          </div>
          <ol className="mt-4 list-decimal space-y-1.5 ps-5 text-sm">
            <li>{t("cardTip.step1")}</li>
            <li>{t("cardTip.step2")}</li>
            <li>{t("cardTip.step3")}</li>
          </ol>
          <p className="mt-4 rounded-lg bg-[var(--bg)] p-3 text-xs text-[var(--muted)]">{t("cardTip.note")}</p>
          <div className="mt-5 text-end">
            <button type="button" onClick={() => dialog.current?.close()} className="rounded-xl bg-[var(--accent)] px-5 py-2.5 text-sm font-semibold text-[var(--on-accent)] hover:brightness-110">
              {t("cardTip.ok")}
            </button>
          </div>
        </div>
      </dialog>
    </>
  );
}
