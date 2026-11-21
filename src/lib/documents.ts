// What the host asks guests to upload (ID etc.), and how it's explained to the guest.
import type { MessageKey } from "@/i18n/messages/en";
import { tEn, type T } from "@/i18n/translate";

// Labels are translated: see "doc.<id>" in i18n/messages.
export const DOCUMENT_OPTIONS = [
  { id: "passport" },
  { id: "id-card" },
  { id: "driving-licence" },
  { id: "residence-permit" },
  { id: "visa" },
  { id: "children-id" },
  { id: "selfie" },
  { id: "proof-address" },
  { id: "booking-confirmation" },
  { id: "other" },
] as const;

export type DocumentOptionId = (typeof DOCUMENT_OPTIONS)[number]["id"];
export type DocumentsFor = "lead" | "adults" | "everyone";
export type DocumentsMode = "any" | "all";

export type DocumentsRequest = {
  items: DocumentOptionId[];
  other?: string; // free text when "other" is ticked
  who: DocumentsFor;
  mode: DocumentsMode; // any one of the items is enough, or all are needed
};

export const DEFAULT_DOCUMENTS_REQUEST: DocumentsRequest = { items: ["passport", "id-card"], who: "adults", mode: "any" };

/** "every adult guest" etc. in the reader's language. */
export const whoLabel = (who: DocumentsFor, t: T) => t(`docs.who.${who}` as MessageKey);

/** Item labels as the guest sees them ("Other…" replaced by the host's own text). */
export function documentLabels(req: DocumentsRequest, t: T = tEn): string[] {
  return req.items
    .map((id) => (id === "other" ? req.other?.trim() : t(`doc.${id}` as MessageKey)))
    .filter((l): l is string => !!l);
}

/** e.g. "Please upload one of the following for every adult guest:" */
export function documentsInstruction(req: DocumentsRequest, t: T = tEn): string {
  const n = documentLabels(req, t).length;
  const key = n <= 1 ? "docs.instruction.single" : req.mode === "any" ? "docs.instruction.any" : "docs.instruction.all";
  return t(key, { who: whoLabel(req.who, t) });
}

/** Validate untrusted input from the host form. */
export function parseDocumentsRequest(raw: unknown): DocumentsRequest {
  const r = (raw ?? {}) as Partial<DocumentsRequest>;
  const valid = new Set<string>(DOCUMENT_OPTIONS.map((o) => o.id));
  const items = (Array.isArray(r.items) ? r.items : []).filter((i): i is DocumentOptionId => valid.has(i));
  const other = String(r.other ?? "").trim().slice(0, 120);
  return {
    items: [...new Set(items)].filter((i) => i !== "other" || other),
    other: other || undefined,
    who: (["lead", "adults", "everyone"] as const).includes(r.who as DocumentsFor) ? (r.who as DocumentsFor) : "adults",
    mode: r.mode === "all" ? "all" : "any",
  };
}
