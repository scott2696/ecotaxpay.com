// Sends host signups and subscription payments to the FTD Tracker dashboard
// (https://ftd-tracker.onrender.com), using its universal /postback endpoint.
//   signup  : a host creates an account
//   ftd     : the host's first subscription payment
//   deposit : every renewal after that
// Off unless FTD_TRACKER_KEY is set. Never throws: tracking must not break sign-up or billing.

type TrackerEvent = {
  event: "signup" | "ftd" | "deposit";
  hostId: string;
  /** Unique per event (Stripe invoice id, or the host id for signups): the tracker ignores repeats. */
  ref: string;
  amountCents?: number;
  currency?: string;
  date?: string; // YYYY-MM-DD, defaults to today
};

export async function trackEvent(e: TrackerEvent): Promise<void> {
  const key = process.env.FTD_TRACKER_KEY;
  if (!key) return;
  const base = process.env.FTD_TRACKER_URL || "https://ftd-tracker.onrender.com/postback";
  const amount = e.amountCents != null ? (e.amountCents / 100).toFixed(2) : "0";
  const params = new URLSearchParams({
    key,
    operator: process.env.FTD_TRACKER_OPERATOR || "ecotaxpay",
    event_type: e.event,
    player_id: e.hostId,
    click_id: e.ref,
    amount,
    // Subscription revenue is ours in full, so it is also the "commission".
    commission: amount,
    ...(e.currency ? { currency: e.currency.toUpperCase() } : {}),
    date: e.date ?? new Date().toISOString().slice(0, 10),
  });
  try {
    // Render's free tier can take ~30s to wake up; don't hold up the request for longer than that.
    const res = await fetch(base, { method: "POST", body: params, signal: AbortSignal.timeout(30_000) });
    if (!res.ok) console.error(`[tracker] ${e.event} for ${e.hostId}: HTTP ${res.status}`);
  } catch (err) {
    console.error(`[tracker] ${e.event} for ${e.hostId} failed`, err);
  }
}
