// The ready-made template library, read from `assets/ready_made_template.json`.
//
// Bundled, not stored: a card and its preview cost nothing until someone
// chooses "Use this template", and only then does ONE copy land in their
// workspace as an ordinary template they own and can edit.
//
// Only documents with a Signer step are offered. The rest are approval-only
// forms, which the signing flow is not built around.
//
// How a `signing_workflow` step becomes a role:
//   Preparer  -> not a role. It is the sender, who starts the document.
//   Reviewer  -> reviewer
//   Signer    -> signer (and the only role given signature and date fields)
//   Approver  -> approver
//   Archiver  -> carbon-copy (receives the completed document)
// Steps are renumbered from 1 once the Preparer is dropped, because the
// backend refuses a template whose routing steps skip a number.

import library from "../../assets/ready_made_template.json";
import type { PrepParticipantRole } from "../models/prepare";
import type {
  DocumentBlock, FlowDocument, TemplateRolePlaceholder,
} from "../models/templates";

interface RawStep { step: number; role: string; action_type: string }
interface RawDocument { document_type: string; title: string; body_content: string; signing_workflow: RawStep[] }
interface RawLibrary { categories: { category: string; documents: RawDocument[] }[] }

export interface ReadyMadeRole {
  readonly label: string;
  readonly role: PrepParticipantRole;
  readonly routingStep: number;
}

export interface ReadyMadeTemplate {
  readonly id: string;
  readonly category: string;
  readonly categoryId: string;
  readonly documentType: string;
  readonly title: string;
  readonly body: string;
  /** Who starts the document — the sender, not a mapped participant. */
  readonly preparedBy: string | null;
  readonly roles: readonly ReadyMadeRole[];
}

export interface ReadyMadeCategory {
  readonly id: string;
  readonly label: string;
  readonly count: number;
}

const ROLE_BY_ACTION: Record<string, PrepParticipantRole | undefined> = {
  Reviewer: "reviewer",
  Signer:   "signer",
  Approver: "approver",
  Archiver: "carbon-copy",
};

export function slugify(value: string): string {
  return value.toLowerCase().replace(/&/g, " and ").replace(/[^a-z0-9]+/g, "-").replace(/^-+|-+$/g, "");
}

function toTemplate(category: string, doc: RawDocument): ReadyMadeTemplate | null {
  const steps = [...doc.signing_workflow].sort((a, b) => a.step - b.step);
  if (!steps.some(s => s.action_type === "Signer")) return null;

  const roles: ReadyMadeRole[] = [];
  for (const s of steps) {
    const role = ROLE_BY_ACTION[s.action_type];
    if (role === undefined) continue;
    roles.push({ label: s.role.trim(), role, routingStep: roles.length + 1 });
  }

  const preparer = steps.find(s => s.action_type === "Preparer");
  const categoryId = slugify(category);
  return {
    id: `${categoryId}--${slugify(doc.title)}`,
    category,
    categoryId,
    documentType: doc.document_type,
    title: doc.title.trim(),
    body: doc.body_content.trim(),
    preparedBy: preparer ? preparer.role.trim() : null,
    roles,
  };
}

export function parseReadyMadeLibrary(raw: RawLibrary): ReadyMadeTemplate[] {
  return raw.categories.flatMap(c =>
    c.documents.map(d => toTemplate(c.category, d)).filter((t): t is ReadyMadeTemplate => t !== null));
}

export const READY_MADE_TEMPLATES: readonly ReadyMadeTemplate[] =
  parseReadyMadeLibrary(library);

export const READY_MADE_CATEGORIES: readonly ReadyMadeCategory[] = (() => {
  const seen = new Map<string, ReadyMadeCategory>();
  for (const t of READY_MADE_TEMPLATES) {
    const prev = seen.get(t.categoryId);
    seen.set(t.categoryId, { id: t.categoryId, label: t.category, count: (prev?.count ?? 0) + 1 });
  }
  return [...seen.values()];
})();

export function findReadyMadeTemplate(id: string | undefined): ReadyMadeTemplate | undefined {
  return id === undefined ? undefined : READY_MADE_TEMPLATES.find(t => t.id === id);
}

export function searchReadyMadeTemplates(
  query: string, categoryId: string | null,
): ReadyMadeTemplate[] {
  const q = query.trim().toLowerCase();
  return READY_MADE_TEMPLATES.filter(t =>
    (categoryId === null || t.categoryId === categoryId)
    && (q === "" || [t.title, t.documentType, t.category, ...t.roles.map(r => r.label)]
      .some(v => v.toLowerCase().includes(q))));
}

/** The roles as template slots. `backendSlotId` arrives only once saved. */
export function readyMadePlaceholders(t: ReadyMadeTemplate): TemplateRolePlaceholder[] {
  return t.roles.map((r, i) => ({
    id: `ready-${String(i + 1)}`,
    label: r.label,
    role: r.role,
    required: true,
    routingStep: r.routingStep,
    defaultAuthMethod: "none",
    description: "",
    mustMapToParticipant: true,
  }));
}

const plain = (text: string) => ({ kind: "text" as const, text });
const bold = (text: string) => ({ kind: "text" as const, text, marks: [{ kind: "bold" as const }] });

function signatureBlock(slot: TemplateRolePlaceholder): DocumentBlock[] {
  const signature = slot.backendSlotId
    ? [{ kind: "fieldAnchor" as const, fieldType: "signature" as const, slotId: slot.backendSlotId, required: true, label: `${slot.label} Signature` }]
    : [plain(`[${slot.label} Signature]`)];
  const date = slot.backendSlotId
    ? [{ kind: "fieldAnchor" as const, fieldType: "date-signed" as const, slotId: slot.backendSlotId, required: true, label: `${slot.label} Date` }]
    : [plain("[Date]")];
  return [
    { kind: "paragraph", content: [bold(`${slot.label}:`)] },
    { kind: "paragraph", content: [plain("Signature: "), ...signature] },
    { kind: "paragraph", content: [plain("Date: "), ...date] },
  ];
}

/**
 * Title, the document's summary, and a signature block for each signer —
 * bound to the template's own saved slots when it has them. Reviewers,
 * approvers and copy recipients act in the signing flow, not on the page, so
 * they get no fields.
 */
export function buildReadyMadeDocument(
  t: Pick<ReadyMadeTemplate, "title" | "body" | "preparedBy">,
  placeholders: readonly TemplateRolePlaceholder[],
): FlowDocument {
  const signers = placeholders.filter(p => p.role === "signer");
  const content: DocumentBlock[] = [
    { kind: "heading", level: 1, align: "center", content: [plain(t.title)] },
    { kind: "paragraph", content: [plain(t.body)] },
  ];
  if (t.preparedBy) {
    content.push({ kind: "paragraph", content: [bold("Prepared by: "), plain(t.preparedBy)] });
  }
  if (signers.length > 0) {
    content.push({ kind: "paragraph", content: [] });
    content.push({ kind: "heading", level: 2, content: [plain("Signatures")] });
    signers.forEach((slot, i) => {
      if (i > 0) content.push({ kind: "paragraph", content: [] });
      content.push(...signatureBlock(slot));
    });
  }
  return { kind: "flowDocument", content };
}

/** How many characters the typed reveal has to write. */
export function readyMadeTypingLength(t: Pick<ReadyMadeTemplate, "title" | "body">): number {
  return t.title.length + t.body.length;
}

/**
 * The document part-way through being "typed": the first `chars` characters
 * of the title then the body. Empty runs are left out — the editor cannot
 * hold a zero-length text node. At the end it is exactly the full document.
 */
export function readyMadeTypingFrame(
  t: Pick<ReadyMadeTemplate, "title" | "body" | "preparedBy">,
  placeholders: readonly TemplateRolePlaceholder[],
  chars: number,
): FlowDocument {
  if (chars >= readyMadeTypingLength(t)) return buildReadyMadeDocument(t, placeholders);
  const titleText = t.title.slice(0, Math.max(0, chars));
  const bodyText = t.body.slice(0, Math.max(0, chars - t.title.length));
  return {
    kind: "flowDocument",
    content: [
      { kind: "heading", level: 1, align: "center", content: titleText ? [plain(titleText)] : [] },
      { kind: "paragraph", content: bodyText ? [plain(bodyText)] : [] },
    ],
  };
}
