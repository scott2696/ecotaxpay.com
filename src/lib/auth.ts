// Host accounts: scrypt password hashes + an HMAC-signed session cookie (no third-party auth needed).
import { createHmac, randomBytes, scryptSync, timingSafeEqual } from "node:crypto";
import { existsSync, mkdirSync, readFileSync, writeFileSync } from "node:fs";
import path from "node:path";
import { cookies } from "next/headers";
import { redirect } from "next/navigation";
import { getHost, type Host } from "./store";

export const SESSION_COOKIE = "etp_session";
const SESSION_DAYS = 30;

/** SESSION_SECRET in production; in development a random secret is generated once and kept in data/. */
function secret(): string {
  if (process.env.SESSION_SECRET) return process.env.SESSION_SECRET;
  if (process.env.NODE_ENV === "production") throw new Error("SESSION_SECRET must be set in production");
  const file = path.join(process.cwd(), "data", ".session-secret");
  if (!existsSync(file)) {
    mkdirSync(path.dirname(file), { recursive: true });
    writeFileSync(file, randomBytes(32).toString("hex"), { mode: 0o600 });
  }
  return readFileSync(file, "utf8");
}

export function hashPassword(password: string): string {
  const salt = randomBytes(16);
  return `scrypt$${salt.toString("hex")}$${scryptSync(password, salt, 64).toString("hex")}`;
}

export function verifyPassword(password: string, stored: string): boolean {
  const [scheme, saltHex, hashHex] = stored.split("$");
  if (scheme !== "scrypt" || !saltHex || !hashHex) return false;
  const expected = Buffer.from(hashHex, "hex");
  const actual = scryptSync(password, Buffer.from(saltHex, "hex"), expected.length);
  return timingSafeEqual(actual, expected);
}

const sign = (data: string) => createHmac("sha256", secret()).update(data).digest("base64url");

export async function startSession(hostId: string) {
  const expires = Date.now() + SESSION_DAYS * 86_400_000;
  const payload = `${hostId}.${expires}`;
  (await cookies()).set(SESSION_COOKIE, `${payload}.${sign(payload)}`, {
    httpOnly: true,
    sameSite: "lax",
    secure: process.env.NODE_ENV === "production",
    path: "/",
    expires: new Date(expires),
  });
}

export async function endSession() {
  (await cookies()).delete(SESSION_COOKIE);
}

/** The logged-in host, or null. Verifies the signature and expiry on every call. */
export async function currentHost(): Promise<Host | null> {
  const raw = (await cookies()).get(SESSION_COOKIE)?.value;
  if (!raw) return null;
  const [hostId, expires, sig] = raw.split(".");
  if (!hostId || !expires || !sig) return null;
  const expected = sign(`${hostId}.${expires}`);
  if (sig.length !== expected.length || !timingSafeEqual(Buffer.from(sig), Buffer.from(expected))) return null;
  if (Number(expires) < Date.now()) return null;
  return getHost(hostId);
}

/** For host pages: the logged-in host, or redirect to the login page. */
export async function requireHost(): Promise<Host> {
  const host = await currentHost();
  if (!host) redirect("/login");
  return host;
}

export const isSubscribed = (h: Host) => ["active", "trialing", "past_due"].includes(h.subscription.status);

/** Simple in-memory brake on password guessing: 10 failed attempts per email per 15 minutes. */
const failures = new Map<string, { count: number; until: number }>();
export function loginBlocked(email: string): boolean {
  const f = failures.get(email);
  return !!f && f.count >= 10 && f.until > Date.now();
}
export function recordLoginFailure(email: string) {
  const f = failures.get(email);
  const fresh = !f || f.until < Date.now();
  failures.set(email, { count: fresh ? 1 : f!.count + 1, until: Date.now() + 15 * 60_000 });
}
export function clearLoginFailures(email: string) {
  failures.delete(email);
}
