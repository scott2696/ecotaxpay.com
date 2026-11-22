"use client";

import { useRouter } from "next/navigation";
import { MethodLogo } from "@/components/PayBadges";
import { useEffect, useRef, useState, useTransition } from "react";

export type SaveResult = { ok: true; saved: string[] } | { ok: false; bad: string[] };

const DRAFT_KEY = "etp:methods-draft";

/**
 * The payment-methods form. Saves without reloading the page, so nothing typed is lost when a
 * field needs fixing: bad fields turn red and the first one is scrolled into view. A save bar
 * stays pinned to the bottom of the screen; each open method also has its own Save button.
 */
export default function MethodsForm({
  action,
  labels,
  methodNames,
  children,
}: {
  action: (form: FormData) => Promise<SaveResult>;
  labels: { save: string; saving: string; saved: string; invalid: string; failed: string; reloadKeep: string; restored: string; savedList: string; noneSaved: string; guestsSee: string };
  /** Display name of each payment method (for the "Saved: …" confirmation). */
  methodNames: Record<string, string>;
  children: React.ReactNode;
}) {
  const router = useRouter();
  const form = useRef<HTMLFormElement>(null);
  const [pending, start] = useTransition();
  const [status, setStatus] = useState<"idle" | "saved" | "error" | "failed" | "restored">("idle");
  const [savedNow, setSavedNow] = useState<string[]>([]);
  const summary = useRef<HTMLDivElement>(null);

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
        setSavedNow(res.saved);
        setStatus("saved");
        setTimeout(() => summary.current?.scrollIntoView({ behavior: "smooth", block: "center" }), 50);
        router.refresh();
      } else {
        markBad(res.bad);
        setStatus("error");
      }
    });
  }

  return (
    <form ref={form} onSubmit={submit} onInput={() => status === "saved" && setStatus("idle")} className="mt-4 space-y-3 [&_[data-bad]]:!border-red-400 [&_[data-bad]]:!outline-red-400">
      {status === "saved" && (
        <div ref={summary} role="status" className="note note-success flex-col p-4">
          <p className="font-semibold text-emerald-200">✓ {savedNow.length ? labels.savedList : labels.noneSaved}</p>
          {savedNow.length > 0 && (
            <>
              <ul className="mt-2 flex flex-wrap gap-2">
                {savedNow.map((id) => (
                  <li key={id} className="inline-flex items-center gap-2 rounded-lg bg-[var(--surface)] px-2.5 py-1.5 text-sm">
                    <MethodLogo id={id} />
                    {methodNames[id] ?? id}
                    <span className="text-emerald-300">✓</span>
                  </li>
                ))}
              </ul>
              <p className="mt-2 text-xs text-[var(--muted)]">{labels.guestsSee}</p>
            </>
          )}
        </div>
      )}
      {children}
      <div className="sticky bottom-24 z-10 -mx-2 mt-5 flex flex-wrap items-center justify-between gap-3 rounded-[var(--r-lg)] border border-[var(--line-strong)] bg-[rgba(16,17,20,0.9)] px-4 py-3 shadow-[var(--edge),var(--shadow-2)] backdrop-blur-xl lg:bottom-4">
        <p role="status" aria-live="polite" className={`text-sm ${status === "error" || status === "failed" ? "text-red-300" : status === "restored" ? "text-amber-200" : "text-emerald-300"}`}>
          {status === "saved" ? `✓ ${labels.saved}` : status === "error" ? labels.invalid : status === "failed" ? labels.failed : status === "restored" ? labels.restored : ""}
          {status === "failed" && (
            <button type="button" onClick={keepAndReload} className="ms-2 rounded-md border border-red-300/40 px-2 py-0.5 text-xs font-semibold text-red-200 hover:bg-red-500/10">
              {labels.reloadKeep}
            </button>
          )}
        </p>
        <button disabled={pending} className="btn btn-primary ms-auto">
          {pending ? labels.saving : labels.save}
        </button>
      </div>
    </form>
  );
}
