"use client";

import { useT } from "@/i18n/client";
import { PLATFORMS, platformById, type Platform } from "@/lib/platforms";

const GROUPS = [
  ["ota", "connect.group.ota"],
  ["manager", "connect.group.manager"],
  ["other", "connect.group.other"],
] as const;

/** Dropdown to choose which channel's calendar to connect (grouped; already-added ones disabled). */
export default function PlatformPicker({ disabled = [], onPick, id, value = "" }: { disabled?: string[]; onPick: (p: Platform) => void; id?: string; value?: string }) {
  const t = useT();
  return (
    <select
      id={id}
      className="input h-11 w-full max-w-md text-sm"
      value={value}
      aria-label={t("connect.whichChannel")}
      onChange={(e) => {
        const p = platformById(e.target.value);
        if (p) onPick(p);
      }}
    >
      <option value="">{t("connect.choosePlatform")}</option>
      {GROUPS.map(([g, label]) => (
        <optgroup key={g} label={t(label)}>
          {PLATFORMS.filter((p) => p.group === g).map((p) => {
            const used = disabled.includes(p.id) && p.id !== "other";
            return (
              <option key={p.id} value={p.id} disabled={used}>
                {p.name}
                {used ? ` ✓ ${t("connect.alreadyAdded")}` : ""}
              </option>
            );
          })}
        </optgroup>
      ))}
    </select>
  );
}
