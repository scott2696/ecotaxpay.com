"use client";

import { useState } from "react";
import Icon from "@/components/Icon";
import { useT } from "@/i18n/client";

export default function CopyLink({ path, compact = false }: { path: string; compact?: boolean }) {
  const t = useT();
  const [copied, setCopied] = useState(false);
  const label = copied ? t("common.copied") : t("common.copyLink");
  return (
    <button
      type="button"
      className={`btn btn-secondary btn-sm ${compact ? "btn-icon" : ""} ${copied ? "text-emerald-300" : ""}`}
      aria-label={label}
      title={label}
      onClick={() => {
        navigator.clipboard.writeText(`${window.location.origin}${path}`);
        setCopied(true);
        setTimeout(() => setCopied(false), 1500);
      }}
    >
      <Icon name={copied ? "check" : "copy"} size={14} />
      {!compact && label}
    </button>
  );
}
