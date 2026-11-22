"use client";

import { useEffect, useRef, useState } from "react";
import { useT } from "@/i18n/client";
import {
  DOCUMENT_OPTIONS,
  whoLabel,
  documentLabels,
  documentsInstruction,
  type DocumentOptionId,
  type DocumentsFor,
  type DocumentsRequest,
} from "@/lib/documents";

/** Dropdown checklist of documents the host wants, plus who uploads and whether any one / all are needed. */
export default function DocumentsPicker({ value, onChange }: { value: DocumentsRequest; onChange: (v: DocumentsRequest) => void }) {
  const t = useT();
  const [open, setOpen] = useState(false);
  const box = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (!open) return;
    const close = (e: MouseEvent | KeyboardEvent) => {
      if (e instanceof KeyboardEvent ? e.key === "Escape" : !box.current?.contains(e.target as Node)) setOpen(false);
    };
    document.addEventListener("mousedown", close);
    document.addEventListener("keydown", close);
    return () => {
      document.removeEventListener("mousedown", close);
      document.removeEventListener("keydown", close);
    };
  }, [open]);

  const toggle = (id: DocumentOptionId) =>
    onChange({ ...value, items: value.items.includes(id) ? value.items.filter((i) => i !== id) : [...value.items, id] });

  const labels = documentLabels(value, t);
  const summary = value.items.length === 0 ? t("dp.choose") : labels.length ? labels.join(", ") : t("dp.otherBelow");

  return (
    <div className="space-y-4">
      <div>
        <span className="mb-1.5 block text-sm font-medium">{t("dp.what")}</span>
        <div ref={box} className="relative">
          <button
            type="button"
            onClick={() => setOpen(!open)}
            aria-expanded={open}
            className="input flex items-center justify-between gap-3 text-left"
          >
            <span className={`truncate ${value.items.length ? "" : "text-[var(--muted)]"}`}>{summary}</span>
            <span className="shrink-0 text-xs text-[var(--muted)]">
              {value.items.length > 0 && `${t("dp.selected", { count: value.items.length })} `}
              {open ? "▲" : "▼"}
            </span>
          </button>
          {open && (
            <div className="dialog absolute z-20 mt-1 w-full p-2">
              {DOCUMENT_OPTIONS.map((o) => (
                <label key={o.id} className="flex cursor-pointer items-center gap-3 rounded-lg px-3 py-2 text-sm hover:bg-[var(--soft)]">
                  <input
                    type="checkbox"
                    className="h-4 w-4 accent-[var(--accent)]"
                    checked={value.items.includes(o.id)}
                    onChange={() => toggle(o.id)}
                  />
                  {t(`doc.${o.id}`)}
                </label>
              ))}
              <div className="flex justify-end border-t border-[var(--line)] px-2 pt-2">
                <button type="button" onClick={() => setOpen(false)} className="btn btn-primary btn-sm">
                  Done
                </button>
              </div>
            </div>
          )}
        </div>
        {value.items.includes("other") && (
          <input
            className="input mt-2"
            placeholder={t("dp.otherPh")}
            value={value.other ?? ""}
            onChange={(e) => onChange({ ...value, other: e.target.value })}
          />
        )}
      </div>

      <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
        <label className="block">
          <span className="mb-1.5 block text-sm font-medium">{t("dp.who")}</span>
          <select className="input" value={value.who} onChange={(e) => onChange({ ...value, who: e.target.value as DocumentsFor })}>
            {(["lead", "adults", "everyone"] as DocumentsFor[]).map((w) => (
              <option key={w} value={w}>
                {whoLabel(w, t)[0].toLocaleUpperCase(t.locale) + whoLabel(w, t).slice(1)}
              </option>
            ))}
          </select>
        </label>
        {labels.length > 1 && (
          <label className="block">
            <span className="mb-1.5 block text-sm font-medium">{t("dp.mode")}</span>
            <select className="input" value={value.mode} onChange={(e) => onChange({ ...value, mode: e.target.value === "all" ? "all" : "any" })}>
              <option value="any">{t("dp.any")}</option>
              <option value="all">{t("dp.all")}</option>
            </select>
          </label>
        )}
      </div>

      {labels.length > 0 && (
        <div className="rounded-lg bg-[var(--bg)] p-3 text-sm">
          <div className="mb-1 text-xs font-medium uppercase tracking-wide text-[var(--muted)]">{t("dp.preview")}</div>
          <p>{documentsInstruction(value, t)}</p>
          <ul className="mt-1 list-disc ps-5">
            {labels.map((l) => <li key={l}>{l}</li>)}
          </ul>
        </div>
      )}
    </div>
  );
}
