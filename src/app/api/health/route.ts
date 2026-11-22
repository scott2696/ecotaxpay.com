// Health check for the host (Render pings this; it is never redirected).
export const dynamic = "force-dynamic";
export const GET = () => Response.json({ ok: true });
