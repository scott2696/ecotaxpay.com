"use client";

import { useState } from "react";
import { useT } from "@/i18n/client";
import { appHref } from "@/lib/urls";
import { apiFetch, errorText } from "@/lib/api";

const TOPICS = ["general", "account", "billing", "tax", "bug", "partnership"] as const;

export default function ContactForm() {
  const t = useT();
  const [form, setForm] = useState({ name: "", email: "", topic: "general", message: "", website: "" });
  const [state, setState] = useState<"idle" | "sending" | "sent">("idle");
  const [error, setError] = useState<string | null>(null);
  const set = (k: keyof typeof form) => (e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement | HTMLSelectElement>) => setForm({ ...form, [k]: e.target.value });

  async function submit(e: React.FormEvent) {
    e.preventDefault();
    setState("sending");
    setError(null);
    try {
      const res = await apiFetch(appHref("/api/contact"), { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify(form) });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error);
      setState("sent");
    } catch (err) {
      setError(errorText(err, t));
      setState("idle");
    }
  }

  if (state === "sent")
    return (
      <div className="rounded-2xl border border-[var(--line)] bg-[var(--soft)] p-8 text-center">
        <div className="text-2xl">✓</div>
        <h2 className="mt-2 text-lg font-semibold">{t("contact.sentTitle")}</h2>
        <p className="mt-1 text-sm text-[var(--muted)]">{t("contact.sentBody")}</p>
      </div>
    );

  return (
    <form onSubmit={submit} className="space-y-4 rounded-2xl border border-[var(--line)] p-6 shadow-sm">
      <div className="grid gap-4 sm:grid-cols-2">
        <label className="block">
          <span className="mb-1.5 block text-sm font-medium">{t("auth.name")}</span>
          <input className="input" value={form.name} onChange={set("name")} autoComplete="name" required maxLength={100} />
        </label>
        <label className="block">
          <span className="mb-1.5 block text-sm font-medium">{t("common.email")}</span>
          <input type="email" className="input" value={form.email} onChange={set("email")} autoComplete="email" required maxLength={200} />
        </label>
      </div>
      <label className="block">
        <span className="mb-1.5 block text-sm font-medium">{t("contact.topic")}</span>
        <select className="input" value={form.topic} onChange={set("topic")}>
          {TOPICS.map((k) => <option key={k} value={k}>{t(`contact.topic.${k}`)}</option>)}
        </select>
      </label>
      <label className="block">
        <span className="mb-1.5 block text-sm font-medium">{t("contact.message")}</span>
        <textarea className="input h-auto min-h-36 py-2 leading-relaxed" value={form.message} onChange={set("message")} required minLength={10} maxLength={5000} />
      </label>
      {/* Honeypot: hidden from people, filled in by bots. */}
      <input type="text" name="website" value={form.website} onChange={set("website")} tabIndex={-1} autoComplete="off" aria-hidden className="hidden" />
      {error && <p className="rounded-lg bg-red-500/10 p-3 text-sm text-red-300">{error}</p>}
      <button disabled={state === "sending"} className="w-full rounded-xl bg-[var(--accent)] px-6 py-3.5 font-semibold text-[var(--on-accent)] hover:brightness-110 disabled:opacity-60">
        {state === "sending" ? t("contact.sending") : t("contact.send")}
      </button>
      <p className="text-xs text-[var(--muted)]">{t("contact.privacyNote")}</p>
    </form>
  );
}
