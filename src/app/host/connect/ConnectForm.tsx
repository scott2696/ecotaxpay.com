"use client";

import Link from "next/link";
import { useState } from "react";
import { useT } from "@/i18n/client";
import type { MessageKey } from "@/i18n/messages/en";
import type { CalendarError } from "@/lib/calendar";
import { calendarErrorText } from "@/lib/format";
import { AirbnbIcon, BookingIcon } from "../BrandIcons";

type Source = "airbnb" | "booking";
type Apt = { id: string; name: string; airbnb: string; booking: string };
type Check = { ok: true; upcoming: number } | { ok: false; error: CalendarError };

const PLACEHOLDER: Record<Source, string> = {
  airbnb: "https://www.airbnb.com/calendar/ical/…ics?s=…",
  booking: "https://admin.booking.com/hotel/hoteladmin/ical.html?t=…",
};

export default function ConnectForm({ apartments }: { apartments: Apt[] }) {
  const t = useT();
  const k = (key: string) => t(key as MessageKey);
  const [links, setLinks] = useState<Record<string, Record<Source, string>>>(
    Object.fromEntries(apartments.map((a) => [a.id, { airbnb: a.airbnb, booking: a.booking }])),
  );
  const [results, setResults] = useState<Record<string, Partial<Record<Source, Check>>>>({});
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const set = (id: string, src: Source, v: string) => setLinks({ ...links, [id]: { ...links[id], [src]: v } });

  async function sync(e: React.FormEvent) {
    e.preventDefault();
    setBusy(true);
    setError(null);
    setResults({});
    try {
      const res = await fetch("/api/host/calendars", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ calendars: links }),
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
      <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
        {(["airbnb", "booking"] as Source[]).map((src) => (
          <div key={src} className="rounded-2xl border border-[var(--line)] bg-[var(--surface)] p-5">
            <div className="flex items-center gap-2 font-semibold">
              {src === "airbnb" ? <AirbnbIcon size={22} /> : <BookingIcon size={22} />} {t(`connect.${src}.where`)}
            </div>
            <ol className="mt-2 list-decimal space-y-0.5 ps-5 text-sm text-[var(--muted)]">
              {[1, 2, 3].map((n) => <li key={n}>{k(`connect.${src}.step${n}`)}</li>)}
            </ol>
          </div>
        ))}
      </div>

      <h2 className="pt-2 text-lg font-semibold">{t("nav.apartments")}</h2>
      {apartments.map((a) => (
        <section key={a.id} className="rounded-2xl border border-[var(--line)] bg-[var(--surface)] p-6 shadow-sm">
          <h3 className="font-semibold">{a.name}</h3>
          <div className="mt-4 space-y-4">
            {(["airbnb", "booking"] as Source[]).map((src) => {
              const r = results[a.id]?.[src];
              return (
                <label key={src} className="block">
                  <span className="mb-1.5 flex items-center gap-2 text-sm font-medium">
                    {src === "airbnb" ? <AirbnbIcon size={18} /> : <BookingIcon size={18} />}
                    {src === "airbnb" ? t("connect.airbnbLink") : t("connect.bookingLink")}
                  </span>
                  <input
                    className="input font-mono text-sm"
                    value={links[a.id][src]}
                    onChange={(e) => set(a.id, src, e.target.value)}
                    placeholder={PLACEHOLDER[src]}
                  />
                  {r && (
                    <span className={`mt-1 block text-sm ${r.ok ? "text-emerald-300" : "text-red-300"}`}>
                      {r.ok ? `✓ ${t.plural("connect.found", r.upcoming)}` : `✗ ${calendarErrorText(r.error, t)}`}
                    </span>
                  )}
                </label>
              );
            })}
          </div>
        </section>
      ))}

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
