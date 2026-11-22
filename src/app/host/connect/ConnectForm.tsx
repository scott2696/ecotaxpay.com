"use client";

import { useRouter } from "next/navigation";
import { useEffect, useState } from "react";
import { useT } from "@/i18n/client";
import type { CalendarError } from "@/lib/calendar";
import { calendarErrorText } from "@/lib/format";
import { platformById } from "@/lib/platforms";
import { PlatformIcon } from "../BrandIcons";
import PlatformPicker from "./PlatformPicker";
import { apiFetch, errorText } from "@/lib/api";

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
  const router = useRouter();
  // Once calendars are set up the section stays small: a one-line summary per apartment, "Edit" to open.
  const [collapsed, setCollapsed] = useState(!focus && apartments.every((a) => Object.values(a.calendars).some(Boolean)));
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const update = (apt: string, rows: [string, string][]) => setLinks({ ...links, [apt]: rows });

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
      const res = await apiFetch("/api/host/calendars", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ calendars }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error);
      setResults(data.results);
      // Saved: fold the section back to its summary and refresh the bookings below.
      setCollapsed(true);
      router.refresh();
    } catch (err) {
      setError(errorText(err, t));
    } finally {
      setBusy(false);
    }
  }

  const allOk = Object.keys(results).length > 0 && Object.values(results).every((r) => Object.values(r).every((c) => c?.ok));

  if (collapsed)
    return (
      <div className="space-y-2">
        {apartments.map((a) => {
          const rows = links[a.id].filter(([, v]) => v.trim());
          return (
            <div key={a.id} className="flex flex-wrap items-center gap-x-3 gap-y-1.5 rounded-[var(--r-md)] border border-[var(--line)] bg-white/[0.02] px-4 py-3 text-sm">
              <span className="font-medium">{a.name}</span>
              {rows.length === 0 && <span className="text-[var(--muted)]">{t("props.none")}</span>}
              {rows.map(([id]) => {
                const r = results[a.id]?.[id];
                return (
                  <span key={id} className="inline-flex items-center gap-1.5" title={r && !r.ok ? calendarErrorText(r.error, t) : undefined}>
                    <PlatformIcon id={id} size={16} />
                    {platformById(id)?.name}
                    {r ? (r.ok ? <span className="text-emerald-300">✓ {r.upcoming}</span> : <span className="text-red-300">✗</span>) : <span className="text-emerald-300">✓</span>}
                  </span>
                );
              })}
            </div>
          );
        })}
        {Object.keys(results).length > 0 && <p className="text-xs text-emerald-300">✓ {t("connect.savedSynced")}</p>}
        <button type="button" onClick={() => setCollapsed(false)} className="btn btn-secondary btn-sm">
          {t("connect.editCalendars")}
        </button>
      </div>
    );

  return (
    <form onSubmit={sync} className="space-y-4">
      {apartments.map((a) => {
        const used = new Set(links[a.id].map(([id]) => id));
        return (
          <section key={a.id} className="panel-inset p-4 sm:p-5">
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
              <label className="block">
                <span className="label">+ {t("connect.addPlatform")}</span>
                <PlatformPicker
                  disabled={[...used]}
                  onPick={(p) => {
                    add(a.id, p.id);
                    setTimeout(() => document.getElementById(`link-${a.id}-${p.id}`)?.focus(), 50);
                  }}
                />
              </label>
            </div>
          </section>
        );
      })}

      {error && <p className="note note-danger">{error}</p>}
      <div className="flex flex-wrap items-center gap-3">
        <button disabled={busy} className="btn btn-primary btn-lg">
          {busy ? t("connect.syncing") : t("connect.save")}
        </button>
        {allOk && (
          <a href="/host" className="btn btn-secondary btn-lg">
            {t("connect.seeUpcoming")} →
          </a>
        )}
      </div>
    </form>
  );
}
