"use client";

import { useT } from "@/i18n/client";
import { PLATFORMS, type Platform } from "@/lib/platforms";
import { PlatformIcon } from "../BrandIcons";

const GROUPS = [
  ["ota", "connect.group.ota"],
  ["manager", "connect.group.manager"],
  ["other", "connect.group.other"],
] as const;

/** Grid of platform logos to choose which channel's calendar to connect. */
export default function PlatformPicker({
  selected,
  disabled = [],
  onPick,
  compact = false,
}: {
  selected?: string;
  disabled?: string[];
  onPick: (p: Platform) => void;
  compact?: boolean;
}) {
  const t = useT();
  return (
    <div className="space-y-3">
      {GROUPS.map(([g, label]) => (
        <div key={g}>
          <p className="mb-1.5 text-xs font-medium uppercase tracking-wide text-[var(--muted)]">{t(label)}</p>
          <div className="flex flex-wrap gap-1.5">
            {PLATFORMS.filter((p) => p.group === g).map((p) => {
              const used = disabled.includes(p.id) && p.id !== "other";
              return (
                <button
                  key={p.id}
                  type="button"
                  disabled={used}
                  onClick={() => onPick(p)}
                  aria-pressed={selected === p.id}
                  title={used ? t("connect.alreadyAdded") : p.name}
                  className={`inline-flex items-center gap-1.5 rounded-lg border px-2.5 ${compact ? "py-1 text-xs" : "py-1.5 text-sm"} transition-colors disabled:cursor-not-allowed disabled:opacity-40 ${
                    selected === p.id ? "border-[var(--accent)] bg-[var(--soft)] font-medium" : "border-[var(--line)] hover:border-[var(--line-strong)] hover:bg-[var(--bg)]"
                  }`}
                >
                  <PlatformIcon id={p.id} size={compact ? 14 : 16} /> {p.name}
                  {used && <span aria-hidden>✓</span>}
                </button>
              );
            })}
          </div>
        </div>
      ))}
    </div>
  );
}
