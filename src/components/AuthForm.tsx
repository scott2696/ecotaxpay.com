"use client";

import Link from "next/link";
import { useState } from "react";
import { useT } from "@/i18n/client";
import { publicHref } from "@/lib/urls";
import { apiFetch, errorText } from "@/lib/api";

/** Sign-up and log-in form (same layout, different fields and endpoint). */
export default function AuthForm({ mode, next }: { mode: "register" | "login"; next?: string }) {
  const t = useT();
  const [name, setName] = useState("");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [acceptTerms, setAcceptTerms] = useState(false);
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
        body: JSON.stringify({ name, email, password, acceptTerms, next }),
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
      {register && (
        <label className="flex items-start gap-2 text-sm">
          <input type="checkbox" className="mt-1 accent-[var(--accent)]" checked={acceptTerms} onChange={(e) => setAcceptTerms(e.target.checked)} required />
          <span>
            {t("auth.terms")}{" "}
            <span className="text-[var(--muted)]">
              {t("auth.readTerms")}{" "}
              <Link href={publicHref("/terms")} target="_blank" className="underline">{t("legal.terms")}</Link>,{" "}
              <Link href={publicHref("/privacy")} target="_blank" className="underline">{t("legal.privacy")}</Link>,{" "}
              <Link href={publicHref("/cookies")} target="_blank" className="underline">{t("legal.cookies")}</Link>.
            </span>
          </span>
        </label>
      )}
      {error && <p className="rounded-lg bg-red-500/10 p-3 text-sm text-red-300">{error}</p>}
      <button disabled={busy} className="w-full rounded-xl bg-[var(--accent)] px-4 py-3.5 font-semibold text-[var(--on-accent)] hover:brightness-110 disabled:opacity-60">
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
