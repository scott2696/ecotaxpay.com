"use client";

import { useState } from "react";
import { useT } from "@/i18n/client";
import type { MessageKey } from "@/i18n/messages/en";

export type PlanOption = { id: string; months: number; label: string; perMonthLabel: string; savePct: number };

/** Choose a subscription plan: 1, 3, 6 or 12 months. Works in a client form (onChange) or a server form (name). */
export default function PlanPicker({ plans, value, onChange, name = "plan" }: { plans: PlanOption[]; value?: string; onChange?: (id: string) => void; name?: string }) {
  const t = useT();
  const [own, setOwn] = useState(value ?? plans[0]?.id);
  const selected = value ?? own;
  const best = plans.reduce((a, b) => (b.savePct > a.savePct ? b : a), plans[0]);
  return (
    <fieldset>
      <legend className="label">{t("plan.choose")}</legend>
      <div className="grid grid-cols-2 gap-2">
        {plans.map((p) => {
          const on = p.id === selected;
          return (
            <label
              key={p.id}
              className={`relative flex cursor-pointer flex-col rounded-[var(--r-md)] border p-3 transition-colors ${
                on ? "border-[var(--line-strong)] bg-white/[0.07] shadow-[var(--edge)]" : "border-[var(--line)] hover:border-[var(--line-strong)]"
              }`}
            >
              <input
                type="radio"
                name={name}
                value={p.id}
                checked={on}
                onChange={() => {
                  setOwn(p.id);
                  onChange?.(p.id);
                }}
                className="sr-only"
              />
              <span className="flex items-center justify-between gap-2 text-xs text-[var(--muted)]">
                {t(`plan.name.${p.id}` as MessageKey)}
                {p.savePct > 0 && <span className={`pill ${p.id === best.id ? "pill-success" : "pill-neutral"} pill-plain h-5 px-1.5 text-[10px]`}>{t("plan.save", { pct: p.savePct })}</span>}
              </span>
              <span className="mt-1 text-lg font-semibold tabular-nums tracking-tight">{p.label}</span>
              <span className="text-[11px] text-[var(--muted)]">{p.months > 1 ? t("plan.perMonth", { amount: p.perMonthLabel }) : t("plan.every.monthly")}</span>
              {p.id === best.id && p.savePct > 0 && <span className="absolute -top-2 end-2 rounded-full bg-[image:var(--silver-soft)] px-2 py-0.5 text-[9px] font-semibold uppercase tracking-wide text-[var(--on-accent)]">{t("plan.best")}</span>}
            </label>
          );
        })}
      </div>
    </fieldset>
  );
}
