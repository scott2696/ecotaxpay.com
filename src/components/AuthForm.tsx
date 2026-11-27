"use client";

import Link from "next/link";
import { useState } from "react";
import PlanPicker, { type PlanOption } from "./PlanPicker";
import type { MessageKey } from "@/i18n/messages/en";
import { useT } from "@/i18n/client";
import { publicHref } from "@/lib/urls";
import { apiFetch, errorText } from "@/lib/api";

/** Sign-up and log-in form (same layout, different fields and endpoint). */
export default function AuthForm({ mode, next, plans = [], initialPlan }: { mode: "register" | "login"; next?: string; plans?: PlanOption[]; initialPlan?: string }) {
  const t = useT();
  const [name, setName] = useState("");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [acceptTerms, setAcceptTerms] = useState(false);
  const [plan, setPlan] = useState(plans.some((p) => p.id === initialPlan) ? initialPlan! : plans[0]?.id ?? "monthly");
  const chosen = plans.find((p) => p.id === plan);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const register = mode === "register";

  async function submit(e: React.FormEvent) {
    e.preventDefault();
    setBusy(true);
    setError(null);
    try {
      const res = await apiFetch(`/api/auth/${mode}`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ name, email, password, acceptTerms, next, ...(register ? { plan } : {}) }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error);
      window.location.href = data.next;
    } catch (err) {
      setError(errorText(err, t));
      setBusy(false);
    }
  }

  return (
    <form onSubmit={submit} className="space-y-4">
      {register && (
        <label className="block">
          <span className="mb-1.5 block text-sm font-medium">{t("auth.name")}</span>
          <input className="input" value={name} onChange={(e) => setName(e.target.value)} autoComplete="name" required />
        </label>
      )}
      <label className="block">
        <span className="mb-1.5 block text-sm font-medium">{t("common.email")}</span>
        <input type="email" className="input" value={email} onChange={(e) => setEmail(e.target.value)} autoComplete="email" required />
      </label>
      <label className="block">
        <span className="mb-1.5 block text-sm font-medium">{t("auth.password")}</span>
        <input
          type="password"
          className="input"
          value={password}
          onChange={(e) => setPassword(e.target.value)}
          autoComplete={register ? "new-password" : "current-password"}
          minLength={register ? 8 : undefined}
          required
        />
        {register && <span className="mt-1 block text-xs text-[var(--muted)]">{t("auth.passwordHint")}</span>}
      </label>
      {!register && (
        <p className="-mt-2 text-end text-sm">
          <Link href={`/forgot-password${email ? `?email=${encodeURIComponent(email)}` : ""}`} className="text-[var(--muted)] underline hover:text-[var(--ink)]">
            {t("auth.forgot")}
          </Link>
        </p>
      )}
      {register && plans.length > 0 && <PlanPicker plans={plans} value={plan} onChange={setPlan} />}
      {register && (
        <label className="flex items-start gap-2 text-sm">
          <input type="checkbox" className="mt-1 accent-[var(--accent)]" checked={acceptTerms} onChange={(e) => setAcceptTerms(e.target.checked)} required />
          <span>
            {chosen ? t("auth.termsPlan", { amount: chosen.label, period: t(`plan.every.${chosen.id}` as MessageKey) }) : t("auth.terms")}{" "}
            <span className="text-[var(--muted)]">
              {t("auth.readTerms")}{" "}
              <Link href={publicHref("/terms")} target="_blank" className="underline">{t("legal.terms")}</Link>,{" "}
              <Link href={publicHref("/privacy")} target="_blank" className="underline">{t("legal.privacy")}</Link>,{" "}
              <Link href={publicHref("/cookies")} target="_blank" className="underline">{t("legal.cookies")}</Link>.
            </span>
          </span>
        </label>
      )}
      {error && <p className="note note-danger">{error}</p>}
      <button disabled={busy} className="btn btn-primary btn-lg w-full">
        {busy ? t("common.wait") : register ? t("auth.create") : t("auth.login")}
      </button>
      <p className="text-center text-sm text-[var(--muted)]">
        {register ? (
          <>{t("auth.haveAccount")} <Link href="/login" className="font-medium text-[var(--accent)] underline">{t("auth.login")}</Link></>
        ) : (
          <>{t("auth.newHere")} <Link href="/register" className="font-medium text-[var(--accent)] underline">{t("auth.createLink")}</Link></>
        )}
      </p>
    </form>
  );
}
