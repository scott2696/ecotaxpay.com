"use client";

import { useRouter } from "next/navigation";
import { useRef, useState, useTransition } from "react";

export type SaveResult = { ok: true } | { ok: false; bad: string[] };

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
  labels: { save: string; saving: string; saved: string; invalid: string };
  children: React.ReactNode;
}) {
  const router = useRouter();
  const form = useRef<HTMLFormElement>(null);
  const [pending, start] = useTransition();
  const [status, setStatus] = useState<"idle" | "saved" | "error">("idle");

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
      const res = await action(data);
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
        <p role="status" aria-live="polite" className={`text-sm ${status === "error" ? "text-red-300" : "text-emerald-300"}`}>
          {status === "saved" ? `✓ ${labels.saved}` : status === "error" ? labels.invalid : ""}
        </p>
        <button disabled={pending} className="ms-auto rounded-xl bg-[var(--accent)] px-5 py-2.5 font-semibold text-[var(--on-accent)] hover:brightness-110 disabled:opacity-60">
          {pending ? labels.saving : labels.save}
        </button>
      </div>
    </form>
  );
}
