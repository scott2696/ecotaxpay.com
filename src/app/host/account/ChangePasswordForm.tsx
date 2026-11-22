"use client";

import { useRef, useState, useTransition } from "react";
import { useT } from "@/i18n/client";

export type PasswordResult = { ok: true } | { ok: false; error: string };

/** Change password while logged in (current password required). Other devices are logged out. */
export default function ChangePasswordForm({ action }: { action: (form: FormData) => Promise<PasswordResult> }) {
  const t = useT();
  const form = useRef<HTMLFormElement>(null);
  const [pending, start] = useTransition();
  const [msg, setMsg] = useState<{ ok: boolean; text: string } | null>(null);

  function submit(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault();
    const data = new FormData(e.currentTarget);
    if (data.get("password") !== data.get("confirm")) return setMsg({ ok: false, text: t("reset.mismatch") });
    start(async () => {
      let res: PasswordResult;
      try {
        res = await action(data);
      } catch {
        // The site was probably updated while this page was open: reload and try again.
        setMsg({ ok: false, text: t("common.reloadRetry") });
        return;
      }
      if (res.ok) {
        form.current?.reset();
        setMsg({ ok: true, text: t("account.notice.passwordChanged") });
      } else setMsg({ ok: false, text: res.error });
    });
  }

  const field = (name: string, label: string, autoComplete: string) => (
    <label className="block">
      <span className="mb-1.5 block text-sm font-medium">{label}</span>
      <input name={name} type="password" className="input" autoComplete={autoComplete} minLength={name === "current" ? undefined : 8} required />
    </label>
  );

  return (
    <form ref={form} onSubmit={submit} className="mt-4 grid grid-cols-1 gap-4 sm:grid-cols-3">
      {field("current", t("account.currentPassword"), "current-password")}
      {field("password", t("reset.new"), "new-password")}
      {field("confirm", t("reset.confirm"), "new-password")}
      <div className="flex flex-wrap items-center gap-3 sm:col-span-3">
        <button disabled={pending} className="rounded-xl bg-[var(--accent)] px-5 py-2.5 font-semibold text-[var(--on-accent)] hover:brightness-110 disabled:opacity-60">
          {pending ? t("common.wait") : t("account.changePassword")}
        </button>
        {msg && <p role="status" className={`text-sm ${msg.ok ? "text-emerald-300" : "text-red-300"}`}>{msg.ok ? "✓ " : ""}{msg.text}</p>}
      </div>
    </form>
  );
}
