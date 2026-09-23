// Where templates come from: the workspace's own records, or the fixtures.
//
// ── Why a façade rather than swapping imports in the context ───────────────
//
// The templates pages were written against the mock service's shape, and that
// shape is wider than what the backend stores — categories, tags, variables,
// document placeholders, usage counts. Rewriting every page to the narrower
// wire shape would be a much larger change than connecting the two, and it
// would strand mock mode, which is still how the pages are developed without
// a backend.
//
// So this module answers one question — real or fixtures — and returns the
// SAME shape either way. The context imports from here instead of from
// `mock/templates.service`, and nothing else moves.
//
// ── When each applies ──────────────────────────────────────────────────────
//
//   real       VITE_API_BASE_URL is set AND a workspace is in scope
//   fixtures   otherwise
//
// The workspace matters as much as the flag: every template route is
// `/workspaces/:workspaceId/workflow-templates`, so with no workspace there
// is no URL to call. Falling back to fixtures there is not a silent
// degradation — it is the only thing that can be shown, and it is what the
// pages showed before this existed.

import { USE_REAL_BACKEND } from "./backend-flag";
import {
  realTemplatesService, toDocumentTemplate, toWireWrite,
  type WireFieldInput,
} from "./real/templates.service";
import { realDocumentService } from "./real/document.service";
import { isBackendFieldType } from "./prepare/field-sync";
import {
  asyncListTemplates as mockList,
  asyncGetTemplateById as mockGet,
  type TemplateListResult,
} from "./mock/templates.service";
import type {
  DocumentTemplate, DocumentTemplateId, TemplateListQuery,
  TemplateListItem, TemplateRolePlaceholder, TemplateRoleAssignment, TemplateVariable,
} from "../models/templates";
import type { RoutingMode } from "../models/transaction-detail";

/** Not a React hook despite reading like a question about state — it is a
 *  plain predicate, and naming it `use...` made ESLint's rules-of-hooks
 *  treat every call site as a hook violation. */
export function realTemplatesAvailable(workspaceId: string | undefined): boolean {
  return USE_REAL_BACKEND && workspaceId !== undefined && workspaceId !== "";
}

// ── Reading ─────────────────────────────────────────────────────────────────

/**
 * Filtering and sorting stay CLIENT-SIDE.
 *
 * The backend's list route takes no query parameters — it returns a
 * workspace's templates, most recently changed first. A workspace's template
 * count is bounded by what a person will author, so filtering the returned
 * list costs nothing and avoids inventing a server contract that does not
 * exist.
 */
export async function listTemplates(
  workspaceId: string | undefined, query: TemplateListQuery,
): Promise<TemplateListResult> {
  if (!realTemplatesAvailable(workspaceId)) return mockList(query);

  const wire = await realTemplatesService.list(workspaceId!);
  const all = wire.map(toDocumentTemplate);
  const matching = applyQuery(all, query);

  return {
    items: matching.map(toListItem),
    total: matching.length,
    // ONE page. A workspace's template count is bounded by what a person
    // will author, and the backend's list route does not paginate — showing
    // a pager over a complete list would be a control that does nothing.
    page: 1,
    pageSize: Math.max(matching.length, 1),
    pageCount: 1,
    demonstrationOnly: true,
  };
}

export async function getTemplate(
  workspaceId: string | undefined, id: DocumentTemplateId,
): Promise<DocumentTemplate | null> {
  if (!realTemplatesAvailable(workspaceId)) return mockGet(id);
  try {
    const wire = await realTemplatesService.get(workspaceId!, id);
    const withDocument = await enrichWithDocument(workspaceId!, toDocumentTemplate(wire));
    return await enrichWithFields(workspaceId!, withDocument);
  } catch {
    return null;
  }
}

/**
 * Replaces the bare-reference placeholder `toDocumentTemplate` produces
 * (id and backend ids only) with the document's real filename and page
 * count, read through the same `realDocumentService` every other page
 * uses. One extra read, only when a reference is present — a template with
 * no document does no extra work.
 *
 * A failed read leaves the bare reference in place rather than dropping it:
 * the template DOES have a document attached, and saying otherwise would be
 * wrong even if today this page cannot describe it further.
 */
async function enrichWithDocument(
  workspaceId: string, template: DocumentTemplate,
): Promise<DocumentTemplate> {
  const ref = template.documents[0];
  if (!ref || ref.backendDocumentId === undefined) return template;
  try {
    const doc = await realDocumentService.get(workspaceId, ref.backendDocumentId);
    return {
      ...template,
      documents: [{
        ...ref,
        displayName: doc.originalFilename ?? doc.title,
        pageCount: doc.source?.pageCount ?? 0,
        sizeBytes: doc.source?.sizeBytes,
        mimeType: doc.source?.mediaType,
      }],
    };
  } catch {
    return template;
  }
}

/**
 * Replaces `toDocumentTemplate`'s permanent `fields: []` (the backend has
 * no field-storage endpoint for a template's SHAPE object — 060 gave it a
 * separate one, `GET .../fields`) with the template's real field layout,
 * mapped from backend `slotId`s to this template's own placeholder ids via
 * each placeholder's `backendSlotId`.
 *
 * A field whose slotId names no CURRENT placeholder is dropped rather than
 * shown pointing at nothing — this can happen only for a moment between an
 * edit that removed a slot and 060's own orphan cleanup, never for long.
 */
async function enrichWithFields(
  workspaceId: string, template: DocumentTemplate,
): Promise<DocumentTemplate> {
  try {
    const wire = await realTemplatesService.getFields(workspaceId, template.id);
    if (wire.length === 0) return template;

    const placeholderIdBySlot = new Map(
      template.placeholders
        .filter(p => p.backendSlotId !== undefined)
        .map(p => [p.backendSlotId!, p.id]));
    const documentId = template.documents[0]?.id ?? "doc-1";

    const fields = wire
      .map((f): DocumentTemplate["fields"][number] | null => {
        const placeholderId = placeholderIdBySlot.get(f.slotId);
        if (placeholderId === undefined) return null;
        return {
          id: f.fieldId,
          type: f.type,
          documentId,
          pageId: `page-${String(f.pageNumber)}`,
          rect: f.rect,
          placeholderId,
          label: f.label,
          required: f.required,
          layer: f.layer,
          demonstrationOnly: false,
        };
      })
      .filter((f): f is DocumentTemplate["fields"][number] => f !== null);

    return { ...template, fields };
  } catch {
    return template;
  }
}

// ── Writing ─────────────────────────────────────────────────────────────────
//
// No mock fallback on purpose. A save that silently wrote to an in-memory map
// and vanished on reload is the defect this whole piece of work exists to
// close; refusing is the honest answer when there is nowhere real to write.

export class TemplatesNotWritableError extends Error {
  constructor() {
    super("Templates can only be saved when a workspace is open.");
  }
}

export interface TemplateDraft {
  name: string;
  routingMode: RoutingMode;
  placeholders: readonly TemplateRolePlaceholder[];
  notifySenderOnComplete: boolean;
  variables: readonly TemplateVariable[];
}

export async function createTemplate(
  workspaceId: string | undefined, draft: TemplateDraft,
): Promise<DocumentTemplate> {
  if (!realTemplatesAvailable(workspaceId)) throw new TemplatesNotWritableError();
  return toDocumentTemplate(
    await realTemplatesService.create(workspaceId!, toWireWrite(draft)));
}

export async function updateTemplate(
  workspaceId: string | undefined, id: DocumentTemplateId, draft: TemplateDraft,
): Promise<DocumentTemplate> {
  if (!realTemplatesAvailable(workspaceId)) throw new TemplatesNotWritableError();
  return toDocumentTemplate(
    await realTemplatesService.update(workspaceId!, id, toWireWrite(draft)));
}

export async function deleteTemplate(
  workspaceId: string | undefined, id: DocumentTemplateId,
): Promise<void> {
  if (!realTemplatesAvailable(workspaceId)) throw new TemplatesNotWritableError();
  await realTemplatesService.remove(workspaceId!, id);
}

/**
 * Creates a new, independent template with the same shape.
 *
 * Copies name (suffixed), routing mode, role slots (as fresh slots — never
 * carrying the source's `backendSlotId`, or this would try to overwrite the
 * ORIGINAL template's roles) and completion settings. Also re-attaches the
 * source's document, when it has one — a document is a reference, not
 * bytes, so pointing two templates at the same one costs nothing and is
 * exactly what a sender duplicating "the same contract, different roles"
 * wants.
 *
 * Deliberately does NOT copy the field layout. A field belongs to a slot id
 * that no longer exists on the new template the moment `createTemplate`
 * mints fresh ones, and remapping old-slot geometry onto new slots by
 * position is a real feature with its own edge cases (slots added, removed
 * or reordered since the last field save) — scoped out of this first cut
 * rather than guessed at. The new template opens exactly like any other
 * newly created one: shaped, with fields still to place.
 */
export async function duplicateTemplate(
  workspaceId: string | undefined, source: DocumentTemplate,
): Promise<DocumentTemplate> {
  if (!realTemplatesAvailable(workspaceId)) throw new TemplatesNotWritableError();

  const created = await createTemplate(workspaceId, {
    name: `${source.name} (Copy)`,
    routingMode: source.routing.mode,
    placeholders: source.placeholders.map(p => ({
      ...p,
      backendSlotId: undefined,
    })),
    // The only completion flag with a real backend producer — see
    // real/templates.service.ts's defaultSettings for why the rest don't
    // round-trip at all.
    notifySenderOnComplete: source.settings.completionCopySender,
    // Variables have no slot-remapping problem the way fields do — a key is
    // unique per TEMPLATE, not globally, so reusing the source's keys on a
    // brand-new template is safe. Copied plainly.
    variables: source.variables,
  });

  const doc = source.documents[0];
  if (doc && !doc.isPlaceholder && doc.backendDocumentId && doc.backendArtifactId) {
    try {
      return await attachTemplateDocument(workspaceId, created.id, {
        documentId: doc.backendDocumentId, artifactId: doc.backendArtifactId,
      });
    } catch {
      // The COPY already exists and is usable without its document — a
      // failed attach here must not look like a failed duplicate.
      return created;
    }
  }
  return created;
}

/**
 * Attaches an ALREADY-uploaded document to a template.
 *
 * Takes ids, never a file — the caller uploads through
 * `realDocumentService.create` + `.upload` first (mirroring the Prepare
 * flow's own upload sequence) and hands the resulting pair here.
 */
export async function attachTemplateDocument(
  workspaceId: string | undefined, id: DocumentTemplateId,
  document: { documentId: string; artifactId: string },
): Promise<DocumentTemplate> {
  if (!realTemplatesAvailable(workspaceId)) throw new TemplatesNotWritableError();
  const wire = await realTemplatesService.attachDocument(workspaceId!, id, document);
  return enrichWithDocument(workspaceId!, toDocumentTemplate(wire));
}

/** Clears the reference. The document and its artifact are untouched. */
export async function detachTemplateDocument(
  workspaceId: string | undefined, id: DocumentTemplateId,
): Promise<DocumentTemplate> {
  if (!realTemplatesAvailable(workspaceId)) throw new TemplatesNotWritableError();
  const wire = await realTemplatesService.detachDocument(workspaceId!, id);
  return toDocumentTemplate(wire);
}

export interface SaveTemplateFieldsResult {
  fields: DocumentTemplate["fields"];
  /**
   * How many of the fields handed in were NOT sent to the backend, because
   * they cannot be: a "Sender Prefill" field (`placeholderId: null`) has no
   * role to attach to — the backend's field is FOR A SLOT, always — or a
   * type the backend does not persist (`isBackendFieldType`'s boundary,
   * the same one `field-sync.ts` draws for a real preparation). The caller
   * tells the sender rather than silently dropping their work.
   */
  skipped: number;
}

/**
 * Replaces a template's WHOLE field layout — the backend has no per-field
 * endpoint, the same one-atomic-write model a real document preparation
 * uses and for the same reason (the editor autosaves a drag-and-drop
 * canvas).
 *
 * `placeholders` is the template's CURRENT slots, needed to translate each
 * field's `placeholderId` to the backend's `slotId` it actually stores —
 * the inverse of `enrichWithFields`'s slotId-to-placeholderId map.
 */
export async function saveTemplateFields(
  workspaceId: string | undefined, id: DocumentTemplateId,
  fields: readonly DocumentTemplate["fields"][number][],
  placeholders: readonly TemplateRolePlaceholder[],
): Promise<SaveTemplateFieldsResult> {
  if (!realTemplatesAvailable(workspaceId)) throw new TemplatesNotWritableError();

  const slotByPlaceholder = new Map(
    placeholders
      .filter(p => p.backendSlotId !== undefined)
      .map(p => [p.id, p.backendSlotId!]));

  const inputs: WireFieldInput[] = [];
  let skipped = 0;
  for (const f of fields) {
    const slotId = f.placeholderId === null ? undefined : slotByPlaceholder.get(f.placeholderId);
    if (slotId === undefined || !isBackendFieldType(f.type)) { skipped++; continue; }
    const pageNumber = Number(f.pageId.replace(/^page-/, ""));
    inputs.push({
      // Backend-issued ids from `enrichWithFields` pass through unprefixed;
      // an editor-local id the sender just created is never sent back —
      // the write schema mints a fresh one, exactly "this is new".
      ...(f.id.startsWith("wff_") ? { fieldId: f.id } : {}),
      slotId,
      type: f.type,
      pageNumber,
      rect: { x: f.rect.x, y: f.rect.y, width: f.rect.width, height: f.rect.height },
      required: f.required,
      label: f.label,
      layer: f.layer,
    });
  }

  const wire = await realTemplatesService.saveFields(workspaceId!, id, inputs);
  const placeholderBySlot = new Map(
    placeholders
      .filter(p => p.backendSlotId !== undefined)
      .map(p => [p.backendSlotId!, p.id]));
  const documentId = f0DocumentId(fields);

  return {
    skipped,
    fields: wire.map(w => ({
      id: w.fieldId,
      type: w.type,
      documentId,
      pageId: `page-${String(w.pageNumber)}`,
      rect: w.rect,
      placeholderId: placeholderBySlot.get(w.slotId) ?? null,
      label: w.label,
      required: w.required,
      layer: w.layer,
      demonstrationOnly: false,
    })),
  };
}

/** The editor-local documentId every field in this save shares — there is
 *  exactly one document per template (060), so any field's carries it. */
function f0DocumentId(fields: readonly DocumentTemplate["fields"][number][]): string {
  return fields[0]?.documentId ?? "doc-1";
}

// ── Client-side query ───────────────────────────────────────────────────────

function applyQuery(
  all: DocumentTemplate[], query: TemplateListQuery,
): DocumentTemplate[] {
  const q = query.q.trim().toLowerCase();
  let out = all;

  if (q !== "") {
    out = out.filter(t =>
      t.name.toLowerCase().includes(q)
      // A role's label is what a person searches for when they remember the
      // workflow but not what they called it.
      || t.placeholders.some(p => p.label.toLowerCase().includes(q)));
  }
  if (query.routing !== undefined) {
    out = out.filter(t => t.routing.mode === query.routing);
  }
  if (query.role !== undefined) {
    out = out.filter(t => t.placeholders.some(p => p.role === query.role));
  }

  const direction = query.direction === "asc" ? 1 : -1;
  return [...out].sort((a, b) => {
    if (query.sort === "name") return a.name.localeCompare(b.name) * direction;
    return (Date.parse(a.updatedAt) - Date.parse(b.updatedAt)) * direction;
  });
}

function toListItem(t: DocumentTemplate): TemplateListItem {
  return {
    id: t.id,
    name: t.name,
    category: t.category,
    status: t.status,
    scope: t.scope,
    ownerLabel: t.ownerLabel,
    placeholderCount: t.placeholders.length,
    routingMode: t.routing.mode,
    // A stored template holds at most one document (059) and no fields yet.
    documentCount: t.documents.length,
    fieldCount: 0,
    variableCount: 0,
    lastUsedDate: t.usageSummary.lastUsedDate,
    updatedAt: t.updatedAt,
    usageCount: t.usageSummary.timesUsed,
    // The backend validates on write and REFUSES a malformed template, so
    // anything that came back from it is well-formed by construction. There
    // is no stored-but-invalid state to report.
    hasErrors: false,
    hasWarnings: false,
  };
}

// ── Role resolution (061) ───────────────────────────────────────────────────

/**
 * What every resolved slot means RIGHT NOW, mapped from the backend's
 * slotId to this template's own placeholder ids — the same slotId lookup
 * `enrichWithFields` performs for field placements, for the same reason:
 * the UI addresses a role by the placeholder it already renders, never by
 * the backend's internal id.
 *
 * Fixture mode has no resolution concept at all (mock templates predate
 * 061), so every slot there is reported "manual" — the honest answer for a
 * template with no server to ask.
 */
export async function getTemplateRoleAssignments(
  workspaceId: string | undefined, template: DocumentTemplate,
): Promise<TemplateRoleAssignment[]> {
  const manual: TemplateRoleAssignment[] = template.placeholders.map(p =>
    ({ placeholderId: p.id, status: "manual" }));
  if (!realTemplatesAvailable(workspaceId)) return manual;

  try {
    const wire = await realTemplatesService.getRoleAssignments(workspaceId!, template.id);
    const placeholderIdBySlot = new Map(
      template.placeholders
        .filter(p => p.backendSlotId !== undefined)
        .map(p => [p.backendSlotId!, p.id]));

    return wire
      .map((a): TemplateRoleAssignment | null => {
        const placeholderId = placeholderIdBySlot.get(a.slotId);
        if (placeholderId === undefined) return null;
        if (a.status === "resolved") {
          return {
            placeholderId, status: "resolved",
            userId: a.userId!, displayName: a.displayName!, email: a.email!,
          };
        }
        return { placeholderId, status: a.status };
      })
      .filter((a): a is NonNullable<typeof a> => a !== null);
  } catch {
    // A failed read falls back to "manual" for every slot rather than
    // blocking the page — the sender can still type a name and email by
    // hand, which is exactly what every slot did before this existed.
    return manual;
  }
}
