"use client";

import { useState } from "react";
import { useT } from "@/i18n/client";

export default function CopyLink({ path }: { path: string }) {
  const t = useT();
  const [copied, setCopied] = useState(false);
  return (
    <button
      type="button"
      className="text-[var(--accent)] underline"
      onClick={() => {
        navigator.clipboard.writeText(`${window.location.origin}${path}`);
        setCopied(true);
        setTimeout(() => setCopied(false), 1500);
      }}
    >
      {copied ? t("common.copied") : t("common.copyLink")}
    </button>
  );
}
