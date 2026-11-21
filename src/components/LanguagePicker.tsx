"use client";

import { useRouter } from "next/navigation";
import { useT } from "@/i18n/client";

/** Language menu. Saves the choice in a cookie (1 year) and re-renders the page in that language. */
export default function LanguagePicker({ options, className = "" }: { options: { code: string; label: string }[]; className?: string }) {
  const t = useT();
  const router = useRouter();
  const current = options.some((o) => o.code === t.locale) ? t.locale : options.find((o) => t.locale.startsWith(o.code))?.code ?? "en";

  return (
    <label className={`inline-flex items-center gap-1.5 text-sm ${className}`}>
      <span className="sr-only">{t("lang.label")}</span>
      <select
        className="max-w-40 cursor-pointer rounded-full border border-[var(--line)] bg-transparent px-3 py-1.5 text-[13px] text-[var(--muted)] transition-colors hover:border-[var(--line-strong)] hover:text-[var(--ink)]"
        value={current}
        onChange={(e) => {
          document.cookie = `lang=${e.target.value}; path=/; max-age=31536000; samesite=lax`;
          router.refresh();
        }}
      >
        {options.map((o) => (
          <option key={o.code} value={o.code}>
            {o.label}
          </option>
        ))}
      </select>
    </label>
  );
}
