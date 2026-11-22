// Keeps hosts logged in: renews the session cookie (rolling expiry) from the middleware.
// Runs in the Edge runtime, so it uses Web Crypto; the signature format matches lib/auth.ts
// (HMAC-SHA256 of "<hostId>.<expires>.<passwordStamp>", base64url, keyed with SESSION_SECRET).

export const SESSION_COOKIE = "etp_session";
export const SESSION_DAYS = 180;
const DAY = 86_400_000;

const enc = new TextEncoder();
const b64url = (buf: ArrayBuffer) => btoa(String.fromCharCode(...new Uint8Array(buf))).replace(/\+/g, "-").replace(/\//g, "_").replace(/=+$/, "");

async function sign(data: string, secret: string) {
  const key = await crypto.subtle.importKey("raw", enc.encode(secret), { name: "HMAC", hash: "SHA-256" }, false, ["sign"]);
  return b64url(await crypto.subtle.sign("HMAC", key, enc.encode(data)));
}

/**
 * If the cookie is genuine, not expired, and was last renewed more than a day ago,
 * return a fresh value valid for another SESSION_DAYS (same host and password stamp). Otherwise null.
 * The server still checks the password stamp and the host on every request (lib/auth.ts).
 */
export async function renewedSession(raw: string | undefined): Promise<{ value: string; expires: Date } | null> {
  const secret = process.env.SESSION_SECRET;
  if (!raw || !secret) return null; // local development uses a file-based secret: no renewal needed there
  const [hostId, expires, stamp, sig] = raw.split(".");
  if (!hostId || !expires || !stamp || !sig) return null;
  const exp = Number(expires);
  const now = Date.now();
  if (!Number.isFinite(exp) || exp < now) return null;
  if (exp > now + (SESSION_DAYS - 1) * DAY) return null; // renewed within the last day
  if ((await sign(`${hostId}.${expires}.${stamp}`, secret)) !== sig) return null; // forged or old format
  const next = now + SESSION_DAYS * DAY;
  const payload = `${hostId}.${next}.${stamp}`;
  return { value: `${payload}.${await sign(payload, secret)}`, expires: new Date(next) };
}
