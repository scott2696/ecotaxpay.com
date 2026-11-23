"use client";

import { useState } from "react";
import Icon from "@/components/Icon";
import { useT } from "@/i18n/client";

/** Reminder for an unpaid link: WhatsApp if we have a number, email if we have an address, otherwise copy the text. */
export default function RemindButton({ path, text, phone, email }: { path: string; text: string; phone?: string; email?: string }) {
  const t = useT();
  const [copied, setCopied] = useState(false);
  const remind = () => {
    const message = `${text} ${window.location.origin}${path}`;
    if (phone) window.open(`https://wa.me/${phone}?text=${encodeURIComponent(message)}`, "_blank", "noopener");
    else if (email) window.location.href = `mailto:${email}?subject=${encodeURIComponent(t("remind.subject"))}&body=${encodeURIComponent(message)}`;
    else {
      navigator.clipboard?.writeText(message);
      setCopied(true);
      setTimeout(() => setCopied(false), 1800);
    }
  };
  const label = copied ? t("common.copied") : t("remind.button");
  return (
    <button type="button" onClick={remind} className="btn btn-secondary btn-sm btn-icon" aria-label={label} title={phone ? t("remind.whatsapp") : email ? t("remind.email") : t("remind.copy")}>
      <Icon name={copied ? "check" : "mail"} size={14} />
    </button>
  );
}
