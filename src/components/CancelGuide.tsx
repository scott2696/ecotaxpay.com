"use client";

import { useT } from "@/i18n/client";

/** How to unsubscribe: shown on the homepage FAQ and the Account page so the two never disagree. */
export default function CancelGuide({ compact = false }: { compact?: boolean }) {
  const t = useT();
  const b = (s: string) => s.split(/\*\*(.+?)\*\*/g).map((part, i) => (i % 2 ? <strong key={i}>{part}</strong> : part));
  return (
    <div className={compact ? "text-sm" : ""}>
      <ol className="list-decimal space-y-1.5 ps-5">
        <li>{b(t("cancel.step1"))}</li>
        <li>{b(t("cancel.step2"))}</li>
        <li>{b(t("cancel.step3"))}</li>
      </ol>
      <ul className="mt-3 list-disc space-y-1 ps-5 text-[var(--muted)]">
        <li>{b(t("cancel.note1"))}</li>
        <li>{b(t("cancel.note2"))}</li>
        <li>{b(t("cancel.note3"))}</li>
        <li>{b(t("cancel.note4"))}</li>
      </ul>
    </div>
  );
}
