"use client";

import { useEffect } from "react";

/**
 * Shown instead of a blank "Application error" if a page fails in the browser.
 * After a new version is deployed, an open page can call code that no longer exists: reload once.
 */
const STALE = /Server action not found|Failed to find Server Action|ChunkLoadError|Loading chunk|dynamically imported module|Failed to fetch/i;

export default function Error({ error, reset }: { error: Error & { digest?: string }; reset: () => void }) {
  useEffect(() => {
    if (STALE.test(error.message) && !sessionStorage.getItem("etp:auto-reloaded")) {
      sessionStorage.setItem("etp:auto-reloaded", "1");
      location.reload();
    }
  }, [error]);

  return (
    <main className="mx-auto flex min-h-[60vh] max-w-md flex-col items-center justify-center gap-4 px-6 text-center">
      <h1 className="text-xl font-semibold">Something went wrong</h1>
      <p className="text-sm text-[var(--muted)]">The page couldn&apos;t finish loading, often because the site was just updated. Reloading usually fixes it.</p>
      <div className="flex gap-2">
        <button onClick={() => location.reload()} className="rounded-xl bg-[var(--accent)] px-5 py-2.5 font-semibold text-[var(--on-accent)]">Reload</button>
        <button onClick={reset} className="rounded-xl border border-[var(--line)] px-5 py-2.5 font-medium">Try again</button>
      </div>
    </main>
  );
}
