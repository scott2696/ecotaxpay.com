// Health check for the host (Render pings this; it is never redirected). It also runs the hourly
// housekeeping: deleting guest ID documents past their retention period.
import { purgeExpiredDocuments } from "@/lib/store";

export const dynamic = "force-dynamic";

let lastPurge = 0;

export async function GET() {
  if (Date.now() - lastPurge > 3600_000) {
    lastPurge = Date.now();
    purgeExpiredDocuments()
      .then((n) => n && console.log(`[privacy] deleted ${n} expired guest document(s)`))
      .catch((e) => console.error("[privacy] document purge failed", e));
  }
  return Response.json({ ok: true });
}
