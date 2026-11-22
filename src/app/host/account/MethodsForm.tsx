"use client";

import { useRouter } from "next/navigation";
import { useEffect, useRef, useState, useTransition } from "react";

export type SaveResult = { ok: true } | { ok: false; bad: string[] };

const DRAFT_KEY = "etp:methods-draft";

/**
 * The payment-methods form. Saves without reloading the page, so nothing typed is lost when a
 * field needs fixing: bad fields turn red and the first one is scrolled into view. A save bar
 * stays pinned to the bottom of the screen; each open method also has its own Save button.
 */
export default function MethodsForm({
  action,
  labels,
  children,
}: {
  action: (form: FormData) => Promise<SaveResult>;
  labels: { save: string; saving: string; saved: string; invalid: string; failed: string; reloadKeep: string; restored: string };
  children: React.ReactNode;
}) {
  const router = useRouter();
  const form = useRef<HTMLFormElement>(null);
  const [pending, start] = useTransition();
  const [status, setStatus] = useState<"idle" | "saved" | "error" | "failed" | "restored">("idle");

  // After "Reload and keep my changes": put back what was typed before the reload.
  useEffect(() => {
    const raw = sessionStorage.getItem(DRAFT_KEY);
    if (!raw || !form.current) return;
    sessionStorage.removeItem(DRAFT_KEY);
    try {
      const entries = JSON.parse(raw) as [string, string][];
      const el = form.current;
      el.querySelectorAll<HTMLInputElement>("input[type=checkbox]").forEach((c) => (c.checked = entries.some(([k]) => k === c.name)));
      for (const [name, value] of entries) {
        const input = el.querySelector<HTMLInputElement | HTMLTextAreaElement>(`[name="${CSS.escape(name)}"]${name === "bankType" ? `[value="${CSS.escape(value)}"]` : ""}`);
        if (!input) continue;
        if (input instanceof HTMLInputElement && input.type === "radio") input.checked = true;
        else if (!(input instanceof HTMLInputElement && input.type === "checkbox")) input.value = value;
      }
      setStatus("restored");
    } catch {}
  }, []);

  function keepAndReload() {
    if (form.current) sessionStorage.setItem(DRAFT_KEY, JSON.stringify([...new FormData(form.current).entries()].filter(([, v]) => typeof v === "string")));
    location.reload();
  }

  function markBad(bad: string[]) {
    const el = form.current!;
    el.querySelectorAll("[data-bad]").forEach((n) => {
      n.removeAttribute("data-bad");
      n.removeAttribute("aria-invalid");
    });
    bad.forEach((name) => {
      const input = el.querySelector<HTMLInputElement>(`[name="${name}"]`);
      input?.setAttribute("data-bad", "");
      input?.setAttribute("aria-invalid", "true");
    });
    const first = bad.map((n) => el.querySelector<HTMLInputElement>(`[name="${n}"]`)).find(Boolean);
    if (first) {
      first.scrollIntoView({ behavior: "smooth", block: "center" });
      first.focus({ preventScroll: true });
    }
  }

  function submit(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault();
    const data = new FormData(e.currentTarget);
    start(async () => {
      let res: SaveResult;
      try {
        res = await action(data);
      } catch {
        // Usually: the site was updated while this page was open, so this page's save no longer exists.
        setStatus("failed");
        return;
      }
      if (res.ok) {
        markBad([]);
        setStatus("saved");
        router.refresh();
      } else {
        markBad(res.bad);
        setStatus("error");
      }
    });
  }

  return (
    <form ref={form} onSubmit={submit} onInput={() => status === "saved" && setStatus("idle")} className="mt-4 space-y-3 [&_[data-bad]]:!border-red-400 [&_[data-bad]]:!outline-red-400">
      {children}
      <div className="sticky bottom-3 z-10 -mx-2 mt-4 flex flex-wrap items-center justify-between gap-3 rounded-xl border border-[var(--line)] bg-[rgba(14,15,18,0.92)] px-4 py-3 shadow-2xl backdrop-blur">
        <p role="status" aria-live="polite" className={`text-sm ${status === "error" || status === "failed" ? "text-red-300" : status === "restored" ? "text-amber-200" : "text-emerald-300"}`}>
          {status === "saved" ? `✓ ${labels.saved}` : status === "error" ? labels.invalid : status === "failed" ? labels.failed : status === "restored" ? labels.restored : ""}
          {status === "failed" && (
            <button type="button" onClick={keepAndReload} className="ms-2 rounded-md border border-red-300/40 px-2 py-0.5 text-xs font-semibold text-red-200 hover:bg-red-500/10">
              {labels.reloadKeep}
            </button>
          )}
        </p>
        <button disabled={pending} className="ms-auto rounded-xl bg-[var(--accent)] px-5 py-2.5 font-semibold text-[var(--on-accent)] hover:brightness-110 disabled:opacity-60">
          {pending ? labels.saving : labels.save}
        </button>
      </div>
    </form>
  );
}
