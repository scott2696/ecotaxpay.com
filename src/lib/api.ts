"use client";
// fetch() for the app's own JSON APIs, made robust against the app restarting for an update.
// During a deploy (services with a disk restart in place) Render answers with its own HTML
// "unavailable" page (502/503/504) or drops the connection. The app never saw those requests, so
// they are safe to retry; if it is still down, callers get a clear message instead of
// "Unexpected token '<' … is not valid JSON".

const BUSY = "ETP_SERVICE_BUSY";
const RETRY_DELAYS = [1500, 3000, 5000, 8000];
const sleep = (ms: number) => new Promise((r) => setTimeout(r, ms));
const isJson = (res: Response) => (res.headers.get("content-type") ?? "").includes("application/json");
const busyResponse = (status: number) => new Response(JSON.stringify({ error: BUSY }), { status, headers: { "Content-Type": "application/json" } });

export async function apiFetch(input: string, init?: RequestInit): Promise<Response> {
  for (let attempt = 0; ; attempt++) {
    let res: Response;
    try {
      res = await fetch(input, init);
    } catch (err) {
      if (init?.signal?.aborted) throw err; // cancelled on purpose (e.g. a newer quote request): don't retry
      if (attempt < RETRY_DELAYS.length) {
        await sleep(RETRY_DELAYS[attempt]);
        continue;
      }
      return busyResponse(503);
    }
    const unavailable = [502, 503, 504].includes(res.status) || (res.status >= 500 && !isJson(res));
    if (unavailable && attempt < RETRY_DELAYS.length) {
      await sleep(RETRY_DELAYS[attempt]);
      continue;
    }
    // Anything that isn't JSON (an error page) becomes a JSON error the forms understand.
    return isJson(res) ? res : busyResponse(res.ok ? 503 : res.status);
  }
}

/** Message for a failed request, in the reader's language. */
export function errorText(err: unknown, t: (key: "common.serverBusy" | "common.error") => string): string {
  if (err instanceof Error && err.message === BUSY) return t("common.serverBusy");
  return err instanceof Error && err.message ? err.message : t("common.error");
}
