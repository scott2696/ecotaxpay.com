"use client";

import Link from "next/link";
import { useState } from "react";
import { useT } from "@/i18n/client";
import type { CalendarError } from "@/lib/calendar";
import { calendarErrorText } from "@/lib/format";
import { PLATFORMS, platformById } from "@/lib/platforms";
import { PlatformIcon } from "../BrandIcons";

type Apt = { id: string; name: string; calendars: Record<string, string> };
type Check = { ok: true; upcoming: number } | { ok: false; error: CalendarError };

const GROUPS = [
  ["ota", "connect.group.ota"],
  ["manager", "connect.group.manager"],
  ["other", "connect.group.other"],
] as const;

/** Paste each apartment's calendar links (any number of platforms), then save & test them live. */
export default function ConnectForm({ apartments }: { apartments: Apt[] }) {
  const t = useT();
  // Per apartment: ordered list of [platformId, link].
  const [links, setLinks] = useState<Record<string, [string, string][]>>(
    Object.fromEntries(
      apartments.map((a) => {
        const rows = Object.entries(a.calendars).filter(([id, v]) => v && platformById(id));
        return [a.id, rows.length ? rows : [["airbnb", ""], ["booking", ""]]];
      }),
    ),
  );
  const [results, setResults] = useState<Record<string, Record<string, Check>>>({});
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const update = (apt: string, rows: [string, string][]) => setLinks({ ...links, [apt]: rows });
  const setUrl = (apt: string, i: number, v: string) => update(apt, links[apt].map((r, j) => (j === i ? [r[0], v] : r)));
  const remove = (apt: string, i: number) => update(apt, links[apt].filter((_, j) => j !== i));
  const add = (apt: string, id: string) => id && update(apt, [...links[apt], [id, ""]]);

  async function sync(e: React.FormEvent) {
    e.preventDefault();
    setBusy(true);
    setError(null);
    setResults({});
    try {
      const calendars = Object.fromEntries(Object.entries(links).map(([apt, rows]) => [apt, Object.fromEntries(rows.filter(([, v]) => v.trim()))]));
      const res = await fetch("/api/host/calendars", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ calendars }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error);
      setResults(data.results);
    } catch (err) {
      setError(err instanceof Error ? err.message : t("common.error"));
    } finally {
      setBusy(false);
    }
  }

  const allOk = Object.keys(results).length > 0 && Object.values(results).every((r) => Object.values(r).every((c) => c?.ok));

  return (
    <form onSubmit={sync} className="space-y-6">
      <div className="rounded-2xl border border-[var(--line)] bg-[var(--surface)] p-5">
        <div className="font-semibold">{t("connect.supported")}</div>
        <p className="mt-1 text-sm text-[var(--muted)]">{t("connect.howGeneric")}</p>
        <div className="mt-3 flex flex-wrap gap-1.5">
          {PLATFORMS.filter((p) => p.id !== "other").map((p) => (
            <span key={p.id} className="inline-flex items-center gap-1.5 rounded-lg border border-[var(--line)] px-2 py-1 text-xs">
              <PlatformIcon id={p.id} size={14} /> {p.name}
            </span>
          ))}
        </div>
      </div>

      <h2 className="pt-2 text-lg font-semibold">{t("nav.apartments")}</h2>
      {apartments.map((a) => {
        const used = new Set(links[a.id].map(([id]) => id));
        return (
          <section key={a.id} className="rounded-2xl border border-[var(--line)] bg-[var(--surface)] p-6 shadow-sm">
            <h3 className="font-semibold">{a.name}</h3>
            <div className="mt-4 space-y-5">
              {links[a.id].map(([id, url], i) => {
                const p = platformById(id)!;
                const r = results[a.id]?.[id];
                return (
                  <div key={`${id}-${i}`}>
                    <div className="mb-1.5 flex items-center gap-2 text-sm font-medium">
                      <PlatformIcon id={id} size={18} />
                      {t("connect.linkFor", { platform: p.name })}
                      <button type="button" onClick={() => remove(a.id, i)} className="ms-auto text-xs text-[var(--muted)] underline hover:text-[var(--ink)]">
                        {t("common.remove")}
                      </button>
                    </div>
                    <input
                      className="input font-mono text-sm"
                      value={url}
                      onChange={(e) => setUrl(a.id, i, e.target.value)}
                      placeholder={p.placeholder ?? "https://….ics"}
                      inputMode="url"
                      aria-label={t("connect.linkFor", { platform: p.name })}
                    />
                    <span className="mt-1 block text-xs text-[var(--muted)]">
                      {p.where ? `${p.name}: ${p.where}` : t("connect.whereGeneric", { platform: p.name })}
                    </span>
                    {r && (
                      <span className={`mt-1 block text-sm ${r.ok ? "text-emerald-300" : "text-red-300"}`}>
                        {r.ok ? `✓ ${t.plural("connect.found", r.upcoming)}` : `✗ ${calendarErrorText(r.error, t)}`}
                      </span>
                    )}
                  </div>
                );
              })}
              <label className="flex flex-wrap items-center gap-2 text-sm">
                <span className="font-medium">+ {t("connect.addPlatform")}</span>
                <select className="input h-10 w-auto min-w-56 text-sm" value="" onChange={(e) => add(a.id, e.target.value)}>
                  <option value="">{t("connect.choosePlatform")}</option>
                  {GROUPS.map(([g, key]) => (
                    <optgroup key={g} label={t(key)}>
                      {PLATFORMS.filter((p) => p.group === g && (p.id === "other" || !used.has(p.id))).map((p) => (
                        <option key={p.id} value={p.id}>{p.name}</option>
                      ))}
                    </optgroup>
                  ))}
                </select>
              </label>
            </div>
          </section>
        );
      })}

      {error && <p className="rounded-lg bg-red-500/10 p-3 text-sm text-red-300">{error}</p>}
      <div className="flex flex-wrap items-center gap-3">
        <button disabled={busy} className="inline-flex items-center gap-2 rounded-xl bg-[var(--accent)] px-6 py-3 font-semibold text-[var(--on-accent)] hover:brightness-110 disabled:opacity-60">
          {busy ? t("connect.syncing") : t("connect.save")}
        </button>
        {allOk && (
          <Link href="/host" className="rounded-xl border border-[var(--line)] bg-[var(--surface)] px-6 py-3 font-medium">
            {t("connect.seeUpcoming")} →
          </Link>
        )}
      </div>
    </form>
  );
}
