"use client";

import { usePathname, useRouter, useSearchParams } from "next/navigation";
import { useT } from "@/i18n/client";

/** "Show guests for: All apartments / <apartment>": kept in the URL (?apartment=) so it survives refresh and can be bookmarked. */
export default function ApartmentFilter({ apartments, value }: { apartments: { id: string; name: string; count: number }[]; value: string }) {
  const t = useT();
  const router = useRouter();
  const pathname = usePathname();
  const params = useSearchParams();

  function change(id: string) {
    const next = new URLSearchParams(params);
    if (id) next.set("apartment", id);
    else next.delete("apartment");
    router.push(next.size ? `${pathname}?${next}` : pathname, { scroll: false });
  }

  const total = apartments.reduce((s, a) => s + a.count, 0);
  return (
    <label className="flex items-center gap-2 text-sm">
      <span className="text-[var(--muted)]">{t("filter.showFor")}</span>
      <select className="input h-10 w-auto min-w-56 text-sm" value={value} onChange={(e) => change(e.target.value)}>
        <option value="">{t("filter.all", { count: total })}</option>
        {apartments.map((a) => (
          <option key={a.id} value={a.id}>
            {a.name} ({a.count})
          </option>
        ))}
      </select>
    </label>
  );
}
