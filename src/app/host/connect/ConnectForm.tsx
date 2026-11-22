"use client";

import Link from "next/link";
import { useEffect, useState } from "react";
import { useT } from "@/i18n/client";
import type { CalendarError } from "@/lib/calendar";
import { calendarErrorText } from "@/lib/format";
import { PLATFORMS, platformById } from "@/lib/platforms";
import { PlatformIcon } from "../BrandIcons";
import PlatformPicker from "./PlatformPicker";

type Apt = { id: string; name: string; calendars: Record<string, string> };
type Check = { ok: true; upcoming: number } | { ok: false; error: CalendarError };


/** Paste each apartment's calendar links (any number of platforms), then save & test them live. */
export default function ConnectForm({ apartments, focus }: { apartments: Apt[]; focus?: { apt: string; platform: string } }) {
  const t = useT();
  // Per apartment: ordered list of [platformId, link].
  const [links, setLinks] = useState<Record<string, [string, string][]>>(
    Object.fromEntries(
      apartments.map((a) => {
        const rows: [string, string][] = Object.entries(a.calendars).filter(([id, v]) => v && platformById(id));
        // Arrived with a chosen platform for this apartment: make sure its link box is there.
        if (focus?.apt === a.id && platformById(focus.platform) && !rows.some(([id]) => id === focus.platform)) rows.push([focus.platform, ""]);
        return [a.id, rows.length ? rows : [["airbnb", ""], ["booking", ""]]];
      }),
    ),
  );
  const [results, setResults] = useState<Record<string, Record<string, Check>>>({});
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const update = (apt: string, rows: [string, string][]) => setLinks({ ...links, [apt]: rows });
  const [picking, setPicking] = useState<string | null>(null);

  // Bring the chosen platform's link box into view, ready to paste into.
  useEffect(() => {
    if (!focus) return;
    const el = document.getElementById(`link-${focus.apt}-${focus.platform}`) as HTMLInputElement | null;
    el?.scrollIntoView({ behavior: "smooth", block: "center" });
    el?.focus({ preventScroll: true });
  }, [focus]);
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
                      id={`link-${a.id}-${id}`}
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
              {picking === a.id ? (
                <div className="rounded-xl border border-[var(--line)] bg-[var(--bg)] p-4">
                  <div className="mb-3 flex items-center justify-between gap-2">
                    <p className="text-sm font-medium">{t("connect.whichChannel")}</p>
                    <button type="button" onClick={() => setPicking(null)} className="text-xs text-[var(--muted)] underline">{t("common.cancel")}</button>
                  </div>
                  <PlatformPicker
                    compact
                    disabled={[...used]}
                    onPick={(p) => {
                      add(a.id, p.id);
                      setPicking(null);
                      setTimeout(() => document.getElementById(`link-${a.id}-${p.id}`)?.focus(), 50);
                    }}
                  />
                </div>
              ) : (
                <button type="button" onClick={() => setPicking(a.id)} className="rounded-lg border border-dashed border-[var(--line-strong)] px-3 py-2 text-sm font-medium hover:bg-[var(--bg)]">
                  + {t("connect.addPlatform")}
                </button>
              )}
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
