// Minimal JSON-file store for the MVP. Works locally and on any server with a disk.
// For Vercel/serverless, swap this module for Postgres (Supabase/Neon). The
// function signatures are the only contract the rest of the app depends on.
import { promises as fs, readFileSync } from "node:fs";
import path from "node:path";
import { customAlphabet } from "nanoid";
import type { Quote } from "./calc";
import type { CustomTax } from "./custom";
import type { DocumentsRequest } from "./documents";

export type DocumentsSetting = "off" | "optional" | "required";

/** Arrival information, shown to the guest only after payment. All fields optional. */
export type Guide = {
  address?: string;
  mapsUrl?: string;
  checkInTime?: string;
  checkOutTime?: string;
  directions?: string;
  access?: string; // keys, lockbox codes, door codes
  wifiName?: string;
  wifiPassword?: string;
  houseRules?: string;
  contact?: string;
  other?: string;
  /** Host's own extra sections, each with a heading (e.g. "Parking", "Rubbish and recycling"). */
  notes?: GuideNote[];
};

export type GuideNote = { title: string; body: string };
export type GuideTextField = Exclude<keyof Guide, "notes">;

export type SubscriptionStatus = "none" | "incomplete" | "active" | "trialing" | "past_due" | "unpaid" | "canceled";

export type Host = {
  id: string;
  email: string; // lower-case, unique
  passwordHash: string;
  name: string;
  locale?: string; // host's interface language (used for their notification emails)
  businessName?: string; // shown as "Issued by" on receipts
  taxId?: string;
  createdAt: string;
  subscription: {
    status: SubscriptionStatus;
    stripeCustomerId?: string;
    stripeSubscriptionId?: string;
    currentPeriodEnd?: string; // ISO date: next charge, or end of access after cancelling
    cancelAtPeriodEnd?: boolean;
    demo?: boolean; // simulated (no Stripe key configured)
    /** What this host pays each month, fixed when they subscribed (€3 or the local equivalent). */
    price?: { currency: string; amount: number };
  };
  /** How guests pay this host directly (shown on the guest's payment page). Never via the platform. */
  paymentMethods?: PaymentMethods;
  /** Guest names the host typed for calendar bookings (iCal feeds never include names), by booking key. */
  bookingNames?: Record<string, string>;
};

/**
 * Everything a guest's bank needs for a transfer: SEPA (EUR in Europe) only needs holder + IBAN, but
 * international (SWIFT) transfers also need the BIC, the bank's name and address, and the account
 * holder's town and country. UK / US accounts without an IBAN use sort code / routing number instead.
 */
export type BankDetails = {
  holder: string;
  holderAddress?: string; // town and country of the account holder (SWIFT)
  accountType?: "iban" | "uk" | "us"; // missing = "iban" (older records)
  iban?: string;
  sortCode?: string; // UK, "12-34-56"
  accountNumber?: string; // UK (8 digits) / US (4–17 digits)
  routingNumber?: string; // US ABA, 9 digits
  bic?: string;
  bankName?: string;
  bankAddress?: string; // town and country of the bank
};

export type CardBrandId = "visa" | "mastercard" | "amex" | "maestro" | "applepay" | "googlepay";

export type PaymentMethods = {
  /** Card payment link from the host's own provider (SumUp, Square, Viva, myPOS, Stripe Payment Link, …). */
  card?: { url: string; provider?: string; brands: CardBrandId[] };
  /** Card machine at check-in. */
  cardOnArrival?: { brands: CardBrandId[] };
  bank?: BankDetails;
  // Phone-number payment apps (international format, digits only).
  bizum?: string; // Spain
  mbway?: string; // Portugal
  satispay?: string; // Italy
  twint?: string; // Switzerland
  wero?: string; // EU (phone or email)
  revolut?: string; // Revtag without "@"
  paypal?: string; // PayPal.Me username
  wise?: string; // https://wise.com/pay/... link
  link?: { label?: string; url: string }; // any other payment link (SumUp, own Stripe link, …)
  cash?: boolean; // pay in cash on arrival
  note?: string; // extra instructions from the host
};

export type PayMethodId =
  | "card" | "bank" | "revolut" | "paypal" | "wise" | "bizum" | "mbway" | "satispay" | "twint" | "wero" | "link" | "cardOnArrival" | "cash";

export type Property = {
  id: string;
  hostId?: string;
  name: string;
  regionId: string;
  accommodationTypeId: string;
  documents: DocumentsSetting;
  documentsNote?: string; // legacy free text (before documentsRequest)
  documentsRequest?: DocumentsRequest;
  guide: Guide;
  /** iCal export links, used to list upcoming guests. */
  /** iCal export links by platform id (see platforms.ts): { airbnb: "https://…", vrbo: "https://…", … }. */
  calendars?: Record<string, string | undefined>;
  /** Host-defined tax when regionId === "custom" (destination not in the built-in list). */
  customTax?: CustomTax;
  createdAt: string;
  updatedAt: string;
};

export type GuestDocument = { id: string; fileName: string; storedAs: string; mimeType: string; size: number; uploadedAt: string };

export type PaymentStatus = "pending" | "paid" | "paid_offline" | "refunded";

export type PaymentRecord = {
  id: string;
  hostId?: string;
  locale?: string; // guest's language (receipt + emails)
  createdAt: string;
  status: PaymentStatus;
  guestName: string;
  guestEmail: string;
  guestPhone?: string; // digits, international format (for WhatsApp)
  bookingRef?: string;
  propertyId?: string;
  propertyName?: string;
  documents?: GuestDocument[];
  quote: Quote; // immutable snapshot of the calculation used
  stripeSessionId?: string;
  stripePaymentIntentId?: string;
  paidAt?: string;
  /** How the guest paid the host directly (set when the guest reports it, or the host confirms). */
  paidVia?: PayMethodId;
  /** The guest said they paid; waiting for the host to confirm the money arrived. */
  reportedPaidAt?: string;
  receiptNumber?: string;
  emailSentAt?: string;
  whatsappSentAt?: string;
};

export type ContactMessage = { id: string; createdAt: string; name: string; email: string; topic: string; message: string; locale: string };

type DB = { payments: PaymentRecord[]; properties?: Property[]; hosts?: Host[]; contactMessages?: ContactMessage[]; receiptCounter: Record<string, number> };

const FILE = path.join(process.cwd(), "data", "db.json");
const newId = customAlphabet("23456789abcdefghjkmnpqrstuvwxyz", 16);

let queue: Promise<unknown> = Promise.resolve();
/** Serialize all writes so concurrent requests can't clobber each other. */
function withLock<T>(fn: () => Promise<T>): Promise<T> {
  const run = queue.then(fn, fn);
  queue = run.catch(() => undefined);
  return run;
}

// Synchronous read on purpose: React's dev tools record the results of async I/O
// in Server Components and would embed the raw file (every guest!) in dev pages.
async function load(): Promise<DB> {
  try {
    return JSON.parse(readFileSync(FILE, "utf8"));
  } catch {
    return { payments: [], receiptCounter: {} };
  }
}

async function save(db: DB) {
  await fs.mkdir(path.dirname(FILE), { recursive: true });
  const tmp = `${FILE}.tmp`;
  await fs.writeFile(tmp, JSON.stringify(db, null, 2));
  await fs.rename(tmp, FILE);
}

export async function createPayment(
  data: Pick<PaymentRecord, "hostId" | "guestName" | "guestEmail" | "guestPhone" | "bookingRef" | "propertyId" | "propertyName" | "quote">,
): Promise<PaymentRecord> {
  return withLock(async () => {
    const db = await load();
    const rec: PaymentRecord = { id: newId(), createdAt: new Date().toISOString(), status: "pending", ...data };
    db.payments.push(rec);
    await save(db);
    return rec;
  });
}

export async function getPayment(id: string): Promise<PaymentRecord | null> {
  const db = await load();
  return db.payments.find((p) => p.id === id) ?? null;
}

/** A host's payment links (all of them when hostId is omitted: internal use only). */
export async function listPayments(hostId?: string): Promise<PaymentRecord[]> {
  const db = await load();
  return db.payments.filter((p) => !hostId || p.hostId === hostId).sort((a, b) => b.createdAt.localeCompare(a.createdAt));
}

export async function updatePayment(id: string, patch: Partial<PaymentRecord>): Promise<PaymentRecord | null> {
  return withLock(async () => {
    const db = await load();
    const rec = db.payments.find((p) => p.id === id);
    if (!rec) return null;
    Object.assign(rec, patch);
    await save(db);
    return rec;
  });
}

/**
 * Idempotently mark a payment as paid and assign a gapless receipt number.
 * Returns { record, justPaid } — justPaid is true only the first time.
 */
export async function markPaid(
  id: string,
  extra: Partial<PaymentRecord> & { status?: "paid" | "paid_offline" } = {},
): Promise<{ record: PaymentRecord; justPaid: boolean } | null> {
  return withLock(async () => {
    const db = await load();
    const rec = db.payments.find((p) => p.id === id);
    if (!rec) return null;
    if (rec.status === "paid" || rec.status === "paid_offline") return { record: rec, justPaid: false };
    // Gapless numbering per host and year (each host has their own receipt sequence).
    const year = new Date().getUTCFullYear().toString();
    const key = rec.hostId ? `${rec.hostId}:${year}` : year;
    const next = (db.receiptCounter[key] ?? 0) + 1;
    db.receiptCounter[key] = next;
    Object.assign(rec, {
      status: "paid",
      paidAt: new Date().toISOString(),
      receiptNumber: `${year}-${String(next).padStart(6, "0")}`,
      ...extra,
    });
    await save(db);
    return { record: rec, justPaid: true };
  });
}

// ---------- Properties ----------

export async function listProperties(hostId?: string): Promise<Property[]> {
  const db = await load();
  return (db.properties ?? []).filter((p) => !hostId || p.hostId === hostId).sort((a, b) => a.name.localeCompare(b.name));
}

export async function getProperty(id: string): Promise<Property | null> {
  const db = await load();
  return db.properties?.find((p) => p.id === id) ?? null;
}

export async function saveProperty(
  data: Omit<Property, "id" | "createdAt" | "updatedAt"> & { id?: string },
): Promise<Property> {
  return withLock(async () => {
    const db = await load();
    db.properties ??= [];
    const now = new Date().toISOString();
    const existing = data.id ? db.properties.find((p) => p.id === data.id) : undefined;
    if (existing) {
      Object.assign(existing, data, { updatedAt: now });
      await save(db);
      return existing;
    }
    const rec: Property = { ...data, id: newId(), createdAt: now, updatedAt: now };
    db.properties.push(rec);
    await save(db);
    return rec;
  });
}

// ---------- Guest documents (ID / passports) ----------
// Files live in data/uploads/<paymentId>/ — never in /public. Only the host can download them.

export const UPLOAD_DIR = path.join(process.cwd(), "data", "uploads");

export async function addDocument(paymentId: string, doc: GuestDocument, bytes: Buffer, maxDocs: number) {
  return withLock(async () => {
    const db = await load();
    const rec = db.payments.find((p) => p.id === paymentId);
    if (!rec) return null;
    rec.documents ??= [];
    if (rec.documents.length >= maxDocs) throw new Error("LIMIT");
    const dir = path.join(UPLOAD_DIR, paymentId);
    await fs.mkdir(dir, { recursive: true });
    await fs.writeFile(path.join(dir, doc.storedAs), bytes);
    rec.documents.push(doc);
    await save(db);
    return rec.documents;
  });
}

export async function removeDocument(paymentId: string, docId: string) {
  return withLock(async () => {
    const db = await load();
    const rec = db.payments.find((p) => p.id === paymentId);
    const doc = rec?.documents?.find((d) => d.id === docId);
    if (!rec || !doc) return null;
    rec.documents = rec.documents!.filter((d) => d.id !== docId);
    await fs.rm(path.join(UPLOAD_DIR, paymentId, doc.storedAs), { force: true });
    await save(db);
    return rec.documents;
  });
}

export const newDocId = () => newId();

// ---------- Hosts (accounts) ----------

export async function getHost(id: string): Promise<Host | null> {
  const db = await load();
  return db.hosts?.find((h) => h.id === id) ?? null;
}

export async function getHostByEmail(email: string): Promise<Host | null> {
  const db = await load();
  return db.hosts?.find((h) => h.email === email.trim().toLowerCase()) ?? null;
}

export async function getHostBy(match: (h: Host) => boolean): Promise<Host | null> {
  const db = await load();
  return db.hosts?.find(match) ?? null;
}

/**
 * Create an account. The very first account also takes ownership of anything created
 * before accounts existed (apartments, payment links, receipt numbering).
 */
export async function createHost(data: Pick<Host, "email" | "passwordHash" | "name" | "locale">): Promise<Host | "exists"> {
  return withLock(async () => {
    const db = await load();
    db.hosts ??= [];
    const email = data.email.trim().toLowerCase();
    if (db.hosts.some((h) => h.email === email)) return "exists";
    const host: Host = { ...data, email, id: newId(), createdAt: new Date().toISOString(), subscription: { status: "none" } };
    if (db.hosts.length === 0) {
      for (const p of db.properties ?? []) p.hostId ??= host.id;
      for (const p of db.payments) p.hostId ??= host.id;
      for (const [k, v] of Object.entries(db.receiptCounter)) if (/^\d{4}$/.test(k)) db.receiptCounter[`${host.id}:${k}`] = v;
    }
    db.hosts.push(host);
    await save(db);
    return host;
  });
}

export async function updateHost(id: string, patch: Partial<Omit<Host, "subscription">> & { subscription?: Partial<Host["subscription"]> }) {
  return withLock(async () => {
    const db = await load();
    const host = db.hosts?.find((h) => h.id === id);
    if (!host) return null;
    const { subscription, ...rest } = patch;
    Object.assign(host, rest);
    if (subscription) host.subscription = { ...host.subscription, ...subscription };
    await save(db);
    return host;
  });
}

/** Who issues a payment's receipt: the host's business name (or name), falling back to the env defaults. */
export async function issuerFor(p: Pick<PaymentRecord, "hostId">): Promise<{ name: string; taxId?: string; email?: string; locale?: string }> {
  const host = p.hostId ? await getHost(p.hostId) : null;
  return {
    name: host?.businessName || host?.name || process.env.HOST_LEGAL_NAME || "Your host",
    taxId: host?.taxId || process.env.HOST_TAX_ID || undefined,
    email: host?.email || process.env.HOST_NOTIFY_EMAIL || undefined,
    locale: host?.locale,
  };
}

// ---------- Contact form ----------

export async function saveContactMessage(m: Omit<ContactMessage, "id" | "createdAt">): Promise<ContactMessage> {
  return withLock(async () => {
    const db = await load();
    db.contactMessages ??= [];
    const rec: ContactMessage = { ...m, id: newId(), createdAt: new Date().toISOString() };
    db.contactMessages.push(rec);
    await save(db);
    return rec;
  });
}
