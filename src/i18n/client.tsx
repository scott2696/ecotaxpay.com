"use client";

import { createContext, useContext, useMemo } from "react";
import type { LocaleMessages } from "./messages/en";
import { makeT, type T, type Vars } from "./translate";

const Ctx = createContext<T | null>(null);

export function I18nProvider({ locale, messages, vars, children }: { locale: string; messages: LocaleMessages; vars?: Vars; children: React.ReactNode }) {
  const t = useMemo(() => makeT(locale, messages, vars), [locale, messages, vars]);
  return <Ctx.Provider value={t}>{children}</Ctx.Provider>;
}

/** Translator for client components. */
export function useT(): T {
  const t = useContext(Ctx);
  if (!t) throw new Error("useT() must be used inside <I18nProvider>");
  return t;
}
