"use client";

import { useState } from "react";
import { useT } from "@/i18n/client";
import { apiFetch, errorText } from "@/lib/api";

/** Choose a new password from a reset link. */
export default function ResetForm({ token }: { token: string }) {
  const t = useT();
  const [password, setPassword] = useState("");
  const [confirm, setConfirm] = useState("");
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);

  async function submit(e: React.FormEvent) {
    e.preventDefault();
    if (password !== confirm) return setError(t("reset.mismatch"));
    setBusy(true);
    setError(null);
    try {
      const res = await apiFetch("/api/auth/reset", { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ token, password }) });
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
      <label className="block">
        <span className="mb-1.5 block text-sm font-medium">{t("reset.new")}</span>
        <input type="password" className="input" value={password} onChange={(e) => setPassword(e.target.value)} autoComplete="new-password" minLength={8} required autoFocus />
        <span className="mt-1 block text-xs text-[var(--muted)]">{t("auth.passwordHint")}</span>
      </label>
      <label className="block">
        <span className="mb-1.5 block text-sm font-medium">{t("reset.confirm")}</span>
        <input type="password" className="input" value={confirm} onChange={(e) => setConfirm(e.target.value)} autoComplete="new-password" minLength={8} required />
      </label>
      {error && <p className="rounded-lg bg-red-500/10 p-3 text-sm text-red-300">{error}</p>}
      <button disabled={busy} className="w-full rounded-xl bg-[var(--accent)] px-4 py-3.5 font-semibold text-[var(--on-accent)] hover:brightness-110 disabled:opacity-60">
        {busy ? t("common.wait") : t("reset.save")}
      </button>
    </form>
  );
}
