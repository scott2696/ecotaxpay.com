"use client";

import Icon from "@/components/Icon";
import Link from "next/link";
import { useState } from "react";
import { useT } from "@/i18n/client";
import { apiFetch, errorText } from "@/lib/api";

/** Ask for a reset link. The reply is the same whether or not the email has an account. */
export default function ForgotForm({ initialEmail, supportEmail }: { initialEmail: string; supportEmail: string }) {
  const t = useT();
  const [email, setEmail] = useState(initialEmail);
  const [busy, setBusy] = useState(false);
  const [sent, setSent] = useState(false);
  const [error, setError] = useState<string | null>(null);

  async function submit(e: React.FormEvent) {
    e.preventDefault();
    setBusy(true);
    setError(null);
    try {
      const res = await apiFetch("/api/auth/forgot", { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ email }) });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error);
      setSent(true);
    } catch (err) {
      setError(errorText(err, t));
    } finally {
      setBusy(false);
    }
  }

  if (sent)
    return (
      <div className="space-y-4">
        <p className="rounded-lg bg-emerald-400/10 p-3 text-sm text-emerald-200">{t("forgot.sent", { email })}</p>
        <p className="text-sm text-[var(--muted)]">
          {t("forgot.noEmail")} <a href={`mailto:${supportEmail}`} className="underline">{supportEmail}</a>
        </p>
        <Link href="/login" className="flex items-center justify-center gap-1.5 text-sm font-medium text-[var(--muted)] hover:text-[var(--ink)]"><Icon name="arrowLeft" size={14} /> {t("auth.login")}</Link>
      </div>
    );

  return (
    <form onSubmit={submit} className="space-y-4">
      <label className="block">
        <span className="mb-1.5 block text-sm font-medium">{t("common.email")}</span>
        <input type="email" className="input" value={email} onChange={(e) => setEmail(e.target.value)} autoComplete="email" required autoFocus />
      </label>
      {error && <p className="note note-danger">{error}</p>}
      <button disabled={busy} className="btn btn-primary btn-lg w-full">
        {busy ? t("common.wait") : t("forgot.send")}
      </button>
      <p className="text-center text-sm text-[var(--muted)]">
        <Link href="/login" className="link font-medium">{t("auth.login")}</Link>
      </p>
    </form>
  );
}
