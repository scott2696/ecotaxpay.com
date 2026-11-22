"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";
import { useState } from "react";
import { useT } from "@/i18n/client";
import type { CalendarError } from "@/lib/calendar";
import { calendarErrorText } from "@/lib/format";
import { type Platform } from "@/lib/platforms";
import { DEFAULT_REGION_ID, findRegion } from "@/lib/taxRules";
import { PlatformIcon } from "../BrandIcons";
import PlatformPicker from "./PlatformPicker";
import { apiFetch, errorText } from "@/lib/api";

type Check = { ok: true; upcoming: number } | { ok: false; error: CalendarError };

/**
 * Dashboard, no apartment yet: click a platform logo, paste its iCal link, name the apartment, Save.
 * The apartment is created with the default destination (changeable later), the link is saved and
 * tested straight away, all on the same page.
 */
export default function ChooseFirst() {
  const t = useT();
  const router = useRouter();
  const [p, setP] = useState<Platform | null>(null);
  const [url, setUrl] = useState("");
  const [name, setName] = useState("");
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [done, setDone] = useState<{ id: string; check?: Check } | null>(null);

  const region = findRegion(DEFAULT_REGION_ID)!.region;

  function pick(next: Platform) {
    setP(next);
    setError(null);
    setDone(null);
    setTimeout(() => document.getElementById("first-ical")?.focus(), 50);
  }

  async function save(e: React.FormEvent) {
    e.preventDefault();
    if (!p) return;
    setBusy(true);
    setError(null);
    try {
      const res = await apiFetch("/api/host/properties", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          name,
          regionId: region.id,
          accommodationTypeId: region.accommodationTypes[0].id,
          documents: "off",
          guide: {},
          calendars: { [p.id]: url.trim() },
        }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error);
      // Test the link straight away and show what was found.
      const test = await apiFetch("/api/host/calendars", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ calendars: { [data.id]: { [p.id]: url.trim() } } }),
      }).then((r) => r.json()).catch(() => ({}));
      setDone({ id: data.id, check: test.results?.[data.id]?.[p.id] });
    } catch (err) {
      setError(errorText(err, t));
    } finally {
      setBusy(false);
    }
  }

  return (
    <div className="space-y-4">
      <div>
        <h3 className="font-semibold">{t("connect.whichChannel")}</h3>
        <p className="mt-0.5 text-sm text-[var(--muted)]">{t("connect.whichChannelSub")}</p>
      </div>

      <PlatformPicker value={p?.id ?? ""} onPick={pick} />

      {p && !done && (
        <form onSubmit={save} className="space-y-3 rounded-xl border border-[var(--line)] bg-[var(--bg)] p-4">
          <div className="flex items-center gap-2 font-medium">
            <PlatformIcon id={p.id} size={20} /> {t("connect.linkFor", { platform: p.name })}
          </div>
          <input
            id="first-ical"
            className="input font-mono text-sm"
            value={url}
            onChange={(e) => setUrl(e.target.value)}
            placeholder={p.placeholder ?? "https://….ics"}
            inputMode="url"
            required
          />
          <p className="text-xs text-[var(--muted)]">{p.where ? `${p.name}: ${p.where}` : t("connect.whereGeneric", { platform: p.name })}</p>
          <label className="block">
            <span className="mb-1.5 block text-sm font-medium">{t("connect.apartmentName")}</span>
            <input className="input" value={name} onChange={(e) => setName(e.target.value)} placeholder={t("pf.namePh")} required maxLength={120} />
            <span className="mt-1 block text-xs text-[var(--muted)]">{t("connect.apartmentDefault", { place: region.name })}</span>
          </label>
          {error && <p className="rounded-lg bg-red-500/10 p-3 text-sm text-red-300">{error}</p>}
          <button disabled={busy} className="rounded-xl bg-[var(--accent)] px-5 py-2.5 font-semibold text-[var(--on-accent)] hover:brightness-110 disabled:opacity-60">
            {busy ? t("connect.syncing") : t("connect.saveFirst")}
          </button>
        </form>
      )}

      {done && p && (
        <div role="status" className="space-y-2 rounded-xl border border-emerald-400/30 bg-emerald-400/10 p-4 text-sm">
          <p className="font-semibold text-emerald-200">✓ {t("connect.savedFirst", { platform: p.name, name })}</p>
          {done.check && (
            <p className={done.check.ok ? "text-emerald-300" : "text-red-300"}>
              {done.check.ok ? `✓ ${t.plural("connect.found", done.check.upcoming)}` : `✗ ${calendarErrorText(done.check.error, t)}`}
            </p>
          )}
          <div className="flex flex-wrap gap-3 pt-1">
            <button type="button" onClick={() => router.refresh()} className="rounded-lg bg-[var(--accent)] px-4 py-2 font-semibold text-[var(--on-accent)]">
              {t("connect.seeUpcoming")} →
            </button>
            <Link href={`/host/properties/${done.id}`} className="rounded-lg border border-[var(--line)] px-4 py-2 font-medium">{t("connect.editApartment")}</Link>
          </div>
        </div>
      )}
    </div>
  );
}
