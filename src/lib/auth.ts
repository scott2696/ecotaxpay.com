// Host accounts: scrypt password hashes + an HMAC-signed session cookie (no third-party auth needed).
import { createHash, createHmac, randomBytes, scryptSync, timingSafeEqual } from "node:crypto";
import { existsSync, mkdirSync, readFileSync, writeFileSync } from "node:fs";
import path from "node:path";
import { cookies } from "next/headers";
import { redirect } from "next/navigation";
import { getHost, getHostBy, updateHost, type Host } from "./store";

import { SESSION_COOKIE, SESSION_DAYS } from "./sessionRefresh";
export { SESSION_COOKIE };
// Hosts stay logged in: SESSION_DAYS (180), renewed every day they use the site (middleware).

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

/**
 * Changes whenever the password changes, and is part of every session cookie: changing or
 * resetting the password logs the account out on all other devices.
 */
const passwordStamp = (h: Pick<Host, "passwordHash">) => createHash("sha256").update(h.passwordHash).digest("base64url").slice(0, 12);

export async function startSession(hostId: string) {
  const host = await getHost(hostId);
  if (!host) return;
  const expires = Date.now() + SESSION_DAYS * 86_400_000;
  const payload = `${hostId}.${expires}.${passwordStamp(host)}`;
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
  const [hostId, expires, stamp, sig] = raw.split(".");
  if (!hostId || !expires || !stamp || !sig) return null;
  const expected = sign(`${hostId}.${expires}.${stamp}`);
  if (sig.length !== expected.length || !timingSafeEqual(Buffer.from(sig), Buffer.from(expected))) return null;
  if (Number(expires) < Date.now()) return null;
  const host = await getHost(hostId);
  // Password changed since this session started: it is no longer valid.
  return host && passwordStamp(host) === stamp ? host : null;
}

// ---------- Password reset ("Forgot your password?") ----------

const RESET_MINUTES = 60;
const sha256 = (v: string) => createHash("sha256").update(v).digest("hex");

/** A single-use reset token for this host (only its hash is stored). Valid for an hour. */
export async function createPasswordReset(host: Host): Promise<string> {
  const token = randomBytes(32).toString("base64url");
  await updateHost(host.id, { passwordReset: { tokenHash: sha256(token), expires: new Date(Date.now() + RESET_MINUTES * 60_000).toISOString() } });
  return token;
}

/** The host a reset link belongs to, if it is valid and not expired. */
export async function hostForReset(token: string): Promise<Host | null> {
  if (!/^[A-Za-z0-9_-]{40,60}$/.test(token)) return null;
  const hash = sha256(token);
  const host = await getHostBy((h) => !!h.passwordReset && h.passwordReset.tokenHash.length === hash.length && timingSafeEqual(Buffer.from(h.passwordReset.tokenHash), Buffer.from(hash)));
  if (!host?.passwordReset || host.passwordReset.expires < new Date().toISOString()) return null;
  return host;
}

/** Set a new password (reset link or "Change password"); old sessions and reset links stop working. */
export async function setPassword(host: Host, password: string) {
  await updateHost(host.id, { passwordHash: hashPassword(password), passwordReset: undefined });
}

/** Brake on reset emails: 5 per email address per hour. */
const resetRequests = new Map<string, { count: number; until: number }>();
export function resetAllowed(email: string): boolean {
  const now = Date.now();
  const r = resetRequests.get(email);
  if (!r || r.until < now) {
    resetRequests.set(email, { count: 1, until: now + 3_600_000 });
    return true;
  }
  r.count++;
  return r.count <= 5;
}

/** For host pages: the logged-in host, or redirect to the login page. */
export async function requireHost(): Promise<Host> {
  const host = await currentHost();
  if (!host) redirect("/login");
  return host;
}

/** Platform admins (ADMIN_EMAILS, comma-separated) get full access without a subscription. */
export function isAdmin(h: Pick<Host, "email">): boolean {
  const admins = (process.env.ADMIN_EMAILS ?? "").split(",").map((e) => e.trim().toLowerCase()).filter(Boolean);
  return admins.includes(h.email.toLowerCase());
}

export const isSubscribed = (h: Host) => isAdmin(h) || ["active", "trialing", "past_due"].includes(h.subscription.status);

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
