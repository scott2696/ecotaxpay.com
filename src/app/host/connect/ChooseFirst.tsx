"use client";

import Link from "next/link";
import { useState } from "react";
import { useT } from "@/i18n/client";
import { type Platform } from "@/lib/platforms";
import { PlatformIcon } from "../BrandIcons";
import PlatformPicker from "./PlatformPicker";

/** No apartment yet: pick the channel first, see where its link is, then add the apartment. */
export default function ChooseFirst() {
  const t = useT();
  const [p, setP] = useState<Platform | null>(null);
  return (
    <div className="space-y-5 rounded-2xl border border-[var(--line)] bg-[var(--surface)] p-6">
      <div>
        <h2 className="font-semibold">{t("connect.whichChannel")}</h2>
        <p className="mt-1 text-sm text-[var(--muted)]">{t("connect.whichChannelSub")}</p>
      </div>
      <PlatformPicker selected={p?.id} onPick={setP} />
      {p && (
        <div className="rounded-xl border border-[var(--line)] bg-[var(--bg)] p-4">
          <div className="flex items-center gap-2 font-medium">
            <PlatformIcon id={p.id} size={20} /> {t("connect.linkFor", { platform: p.name })}
          </div>
          <p className="mt-1 text-sm text-[var(--muted)]">{p.where ? `${p.name}: ${p.where}` : t("connect.whereGeneric", { platform: p.name })}</p>
          <p className="mt-3 text-sm">{t("connect.addApartmentFirst")}</p>
          <Link
            href={`/host/properties/new?connect=${encodeURIComponent(p.id)}`}
            className="mt-3 inline-block rounded-lg bg-[var(--accent)] px-4 py-2 text-sm font-semibold text-[var(--on-accent)] hover:brightness-110"
          >
            {t("connect.addAndConnect", { platform: p.name })} →
          </Link>
        </div>
      )}
    </div>
  );
}
