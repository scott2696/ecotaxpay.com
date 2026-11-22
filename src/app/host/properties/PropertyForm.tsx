"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";
import { useT } from "@/i18n/client";
import type { MessageKey } from "@/i18n/messages/en";
import { useState } from "react";
import type { Property, Guide, GuideNote, GuideTextField, DocumentsSetting } from "@/lib/store";
import { DEFAULT_DOCUMENTS_REQUEST, type DocumentsRequest } from "@/lib/documents";
import { capSummary, rateSummary } from "@/lib/explain";
import { COUNTRIES, DEFAULT_REGION_ID, findRegion } from "@/lib/taxRules";

import CustomTaxFields, { toForm, type CustomTaxForm } from "./CustomTaxFields";
import DocumentsPicker from "./DocumentsPicker";
import { GUIDE_NOTES } from "@/lib/guideLimits";
import { apiFetch, errorText } from "@/lib/api";

// Labels/placeholders are translated: "gf.<key>" and "gf.<key>.ph" in i18n/messages.
const GUIDE: { key: GuideTextField; long?: boolean; latinPlaceholder?: string }[] = [
  { key: "address" },
  { key: "mapsUrl", latinPlaceholder: "https://maps.app.goo.gl/…" },
  { key: "checkInTime", latinPlaceholder: "15:00" },
  { key: "checkOutTime", latinPlaceholder: "10:00" },
  { key: "directions", long: true },
  { key: "access", long: true },
  { key: "wifiName", latinPlaceholder: "Seaview_5G" },
  { key: "wifiPassword", latinPlaceholder: "••••••••" },
  { key: "houseRules", long: true },
  { key: "contact" },
  { key: "other", long: true },
];

const DOC_OPTIONS: DocumentsSetting[] = ["off", "optional", "required"];

/** `property` = edit it; `template` = new one prefilled from another apartment. */
export default function PropertyForm({ property, template, connectAfter, returnToCalendars }: { property?: Property; template?: Property; connectAfter?: string; returnToCalendars?: boolean }) {
  const base = property ?? template;
  const t = useT();
  const k = (key: string, vars?: Record<string, string | number>) => t(key as MessageKey, vars);
  const router = useRouter();
  const startRegion = findRegion(base?.regionId ?? DEFAULT_REGION_ID) ?? findRegion(COUNTRIES[0].regions[0].id)!;
  const [name, setName] = useState(property?.name ?? "");
  const [countryCode, setCountryCode] = useState(startRegion.country.code);
  const country = COUNTRIES.find((c) => c.code === countryCode)!;
  const [regionId, setRegionId] = useState(startRegion.region.id);
  const region = country.regions.find((r) => r.id === regionId) ?? country.regions[0];
  const [accId, setAccId] = useState(base?.accommodationTypeId ?? region.accommodationTypes[0].id);
  const acc = region.accommodationTypes.find((a) => a.id === accId) ?? region.accommodationTypes[0];
  const [documents, setDocuments] = useState<DocumentsSetting>(base?.documents ?? "off");
  const [documentsRequest, setDocumentsRequest] = useState<DocumentsRequest>(base?.documentsRequest ?? DEFAULT_DOCUMENTS_REQUEST);
  const [guide, setGuide] = useState<Guide>({ ...(base?.guide ?? {}) });
  // Calendar links are specific to one listing, so they are never copied from another apartment.
  // Calendar links are managed on the "Connect calendars" page (any number of platforms).
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);
  // "Other destination": the host sets their own rate.
  const [custom, setCustom] = useState(base?.regionId === "custom");
  const [customForm, setCustomForm] = useState<CustomTaxForm>(toForm(base?.customTax));
  const countryName = (code: string, fallback: string) => {
    try {
      return new Intl.DisplayNames([t.locale], { type: "region" }).of(code) ?? fallback;
    } catch {
      return fallback;
    }
  };
  const sortedCountries = [...COUNTRIES].sort((a, b) => countryName(a.code, a.name).localeCompare(countryName(b.code, b.name), t.locale));
  const today = new Date().toISOString().slice(0, 10);

  function pickCountry(code: string) {
    if (code === "__custom") return setCustom(true);
    setCustom(false);
    const c = COUNTRIES.find((x) => x.code === code)!;
    setCountryCode(code);
    setRegionId(c.regions[0].id);
    setAccId(c.regions[0].accommodationTypes[0].id);
  }

  async function save(e: React.FormEvent) {
    e.preventDefault();
    setSaving(true);
    setError(null);
    try {
      const res = await apiFetch("/api/host/properties", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          id: property?.id,
          name,
          ...(custom
            ? { regionId: "custom", accommodationTypeId: "custom", customTax: customForm }
            : { regionId: region.id, accommodationTypeId: acc.id }),
          documents,
          documentsRequest,
          guide,
        }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error);
      router.push(
        connectAfter
          ? `/host?apt=${encodeURIComponent(data.id)}&platform=${encodeURIComponent(connectAfter)}#calendars`
          : returnToCalendars
            ? "/host#calendars"
            : "/host/properties?saved=1",
      );
      router.refresh();
    } catch (err) {
      setError(errorText(err, t));
      setSaving(false);
    }
  }

  return (
    <form onSubmit={save} className="space-y-6">
      <Card title={t("pf.apartment")}>
        <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
          <Field label={t("pf.name")} className="sm:col-span-2" hint={t("pf.nameHint")}>
            <input className="input" value={name} onChange={(e) => setName(e.target.value)} placeholder={t("pf.namePh")} required />
          </Field>
          <Field label={t("pf.country")}>
            <select className="input" value={custom ? "__custom" : countryCode} onChange={(e) => pickCountry(e.target.value)}>
              {sortedCountries.map((c) => (
                <option key={c.code} value={c.code}>
                  {c.flag} {countryName(c.code, c.name)}
                </option>
              ))}
              <option value="__custom">🌍 {t("pf.other")}</option>
            </select>
            {/* The manual option, visible without opening the list. */}
            <button
              type="button"
              onClick={() => pickCountry(custom ? countryCode : "__custom")}
              className="mt-2 text-start text-sm text-[var(--accent)] underline underline-offset-2 hover:brightness-125"
            >
              {custom ? t("pf.backToList") : t("pf.notListed")}
            </button>
          </Field>
          {custom ? (
            <CustomTaxFields value={customForm} onChange={setCustomForm} />
          ) : (
          <>
          <Field label={t("pf.city")}>
            <select
              className="input"
              value={region.id}
              onChange={(e) => {
                setRegionId(e.target.value);
                setAccId(country.regions.find((r) => r.id === e.target.value)!.accommodationTypes[0].id);
              }}
              disabled={country.regions.length === 1}
            >
              {country.regions.map((r) => (
                <option key={r.id} value={r.id}>
                  {r.name}
                </option>
              ))}
            </select>
          </Field>
          <fieldset className="sm:col-span-2">
            <legend className="mb-1.5 text-sm font-medium">{t("pf.accType")}</legend>
            <div className="grid grid-cols-1 gap-2 sm:grid-cols-2">
              {region.accommodationTypes.map((a) => (
                <Choice key={a.id} checked={a.id === acc.id} onChange={() => setAccId(a.id)} name="acc">
                  {t.raw(`a:${a.label}`)}
                </Choice>
              ))}
            </div>
          </fieldset>
          <div className="rounded-lg bg-[var(--bg)] p-3 text-sm sm:col-span-2">
            <div className="font-medium">{region.taxName}</div>
            <div>{rateSummary(region, acc, today, t)}</div>
            {(() => {
              // A rate change is scheduled (e.g. Malta 1 Jan 2027): show what this type will pay from then.
              const next = acc.seasons
                ?.map((x) => x.validFrom)
                .filter((d): d is string => !!d && d > today)
                .sort()[0];
              if (!next) return null;
              const cap = capSummary(region, acc, next, t);
              return (
                <div className="mt-1 text-amber-200">
                  {t("pf.fromDate", { date: new Date(next + "T00:00:00").toLocaleDateString(t.locale, { day: "numeric", month: "long", year: "numeric" }) })}{" "}
                  {rateSummary(region, acc, next, t)}
                  {cap ? ` · ${t("pf.capped", { cap })}` : ""}
                </div>
              );
            })()}
            <div className={capSummary(region, acc, today) ? "text-emerald-300" : "text-[var(--muted)]"}>
              {capSummary(region, acc, today, t) ? t("pf.capped", { cap: capSummary(region, acc, today, t)! }) : t("explain.noCap")}
            </div>
            <div className="mt-1 text-xs text-[var(--muted)]">
              {region.minTaxableAge ? `${t("explain.childrenFree", { age: region.minTaxableAge })} ` : ""}
              {region.childReduction ? `${t("explain.reduced", { from: region.childReduction.fromAge, to: region.childReduction.toAge, pct: Math.round(region.childReduction.multiplier * 100) })} ` : ""}
              {t("pf.checked", { date: region.verifiedOn })} <Link href="/host/rates" className="underline">{t("pf.seeRates")}</Link>
            </div>
          </div>
          </>
          )}
        </div>
      </Card>


      <Card title={t("pf.docs")} subtitle={t("pf.docsSub")}>
        <div className="grid grid-cols-1 gap-2 sm:grid-cols-3">
          {DOC_OPTIONS.map((o) => (
            <Choice key={o} checked={documents === o} onChange={() => setDocuments(o)} name="docs">
              <span className="font-medium">{k(`pf.docs.${o}`)}</span>
              <span className="block text-xs text-[var(--muted)]">{k(`pf.docs.${o}.hint`)}</span>
            </Choice>
          ))}
        </div>
        {documents !== "off" && (
          <div className="mt-5">
            <DocumentsPicker value={documentsRequest} onChange={setDocumentsRequest} />
          </div>
        )}
      </Card>

      <Card title={t("guest.guideTitle")} subtitle={t("pf.guideSub")}>
        <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
          {GUIDE.map((f) => (
            <Field key={f.key} label={k(`gf.${f.key}`)} className={f.long ? "sm:col-span-2" : ""}>
              {f.long ? (
                <textarea
                  className="input h-auto min-h-24 py-2 leading-relaxed"
                  value={guide[f.key] ?? ""}
                  placeholder={f.latinPlaceholder ?? k(`gf.${f.key}.ph`)}
                  onChange={(e) => setGuide({ ...guide, [f.key]: e.target.value })}
                />
              ) : (
                <input
                  className="input"
                  value={guide[f.key] ?? ""}
                  placeholder={f.latinPlaceholder ?? k(`gf.${f.key}.ph`)}
                  onChange={(e) => setGuide({ ...guide, [f.key]: e.target.value })}
                />
              )}
            </Field>
          ))}
        </div>
        <GuideNotes notes={guide.notes ?? []} onChange={(notes) => setGuide({ ...guide, notes })} />
      </Card>

      {error && <p className="rounded-lg bg-red-500/10 p-3 text-sm text-red-300">{error}</p>}
      <div className="flex gap-3">
        <button disabled={saving} className="rounded-xl bg-[var(--accent)] px-6 py-3 font-semibold text-[var(--on-accent)] hover:brightness-110 disabled:opacity-60">
          {saving ? t("pf.saving") : property ? t("pf.saveChanges") : t("pf.save")}
        </button>
        <Link href="/host/properties" className="rounded-xl border border-[var(--line)] bg-[var(--surface)] px-6 py-3 font-medium">
          {t("pf.cancel")}
        </Link>
      </div>
    </form>
  );
}

function Card({ title, subtitle, children }: { title: string; subtitle?: string; children: React.ReactNode }) {
  return (
    <section className="rounded-2xl border border-[var(--line)] bg-[var(--surface)] p-6 shadow-sm">
      <h2 className="text-lg font-semibold">{title}</h2>
      {subtitle && <p className="mt-1 text-sm text-[var(--muted)]">{subtitle}</p>}
      <div className="mt-4">{children}</div>
    </section>
  );
}

function Field({ label, hint, className = "", children }: { label: string; hint?: string; className?: string; children: React.ReactNode }) {
  return (
    <label className={`block ${className}`}>
      <span className="mb-1.5 block text-sm font-medium">{label}</span>
      {children}
      {hint && <span className="mt-1 block text-xs text-[var(--muted)]">{hint}</span>}
    </label>
  );
}

function Choice({ checked, onChange, name, children }: { checked: boolean; onChange: () => void; name: string; children: React.ReactNode }) {
  return (
    <label
      className={`flex cursor-pointer items-start gap-3 rounded-lg border p-3 text-sm transition ${
        checked ? "border-[var(--accent)] bg-[var(--soft)]" : "border-[var(--line)] hover:bg-[var(--bg)]"
      }`}
    >
      <input type="radio" name={name} className="mt-0.5 accent-[var(--accent)]" checked={checked} onChange={onChange} />
      <span>{children}</span>
    </label>
  );
}

const NOTE_SUGGESTIONS = ["parking", "rubbish", "shops", "climate", "checkout"] as const;

/** Host's own extra guide sections: a heading and text each, added as needed. */
function GuideNotes({ notes, onChange }: { notes: GuideNote[]; onChange: (notes: GuideNote[]) => void }) {
  const t = useT();
  const k = (key: string) => t(key as MessageKey);
  const set = (i: number, patch: Partial<GuideNote>) => onChange(notes.map((n, j) => (j === i ? { ...n, ...patch } : n)));
  const add = (title = "") => notes.length < GUIDE_NOTES.max && onChange([...notes, { title, body: "" }]);
  const used = new Set(notes.map((n) => n.title));
  return (
    <div className="mt-6 border-t border-[var(--line)] pt-5">
      <h3 className="font-semibold">{t("gf.notes")}</h3>
      <p className="mt-1 text-sm text-[var(--muted)]">{t("gf.notesHint")}</p>

      <div className="mt-4 space-y-3">
        {notes.map((n, i) => (
          <div key={i} className="rounded-xl border border-[var(--line)] bg-[var(--soft)] p-4">
            <div className="flex items-end gap-3">
              <label className="block flex-1">
                <span className="mb-1.5 block text-sm font-medium">{t("gf.noteTitle")}</span>
                <input className="input" value={n.title} maxLength={GUIDE_NOTES.title} placeholder={t("gf.noteTitle.ph")} onChange={(e) => set(i, { title: e.target.value })} />
              </label>
              <button
                type="button"
                onClick={() => onChange(notes.filter((_, j) => j !== i))}
                className="h-11 rounded-lg border border-[var(--line)] px-3 text-sm text-[var(--muted)] hover:border-red-400/40 hover:text-red-300"
              >
                {t("common.remove")}
              </button>
            </div>
            <label className="mt-3 block">
              <span className="mb-1.5 block text-sm font-medium">{t("gf.noteBody")}</span>
              <textarea
                className="input h-auto min-h-20 py-2 leading-relaxed"
                value={n.body}
                maxLength={GUIDE_NOTES.body}
                placeholder={t("gf.noteBody.ph")}
                onChange={(e) => set(i, { body: e.target.value })}
              />
            </label>
          </div>
        ))}
      </div>

      {notes.length < GUIDE_NOTES.max && (
        <div className="mt-4 flex flex-wrap items-center gap-2">
          <button type="button" onClick={() => add()} className="rounded-lg border border-[var(--line-strong)] px-4 py-2 text-sm font-medium hover:bg-[var(--soft)]">
            {t("gf.addNote")}
          </button>
          <span className="ms-1 text-sm text-[var(--muted)]">{t("gf.suggest")}</span>
          {NOTE_SUGGESTIONS.map((s) => k(`gf.sugg.${s}`)).filter((title) => !used.has(title)).map((title) => (
            <button key={title} type="button" onClick={() => add(title)} className="rounded-full border border-[var(--line)] px-3 py-1 text-xs text-[var(--muted)] hover:border-[var(--line-strong)] hover:text-[var(--ink)]">
              + {title}
            </button>
          ))}
        </div>
      )}
    </div>
  );
}
