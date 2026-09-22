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
} from "./real/templates.service";
import { realDocumentService } from "./real/document.service";
import {
  asyncListTemplates as mockList,
  asyncGetTemplateById as mockGet,
  type TemplateListResult,
} from "./mock/templates.service";
import type {
  DocumentTemplate, DocumentTemplateId, TemplateListQuery,
  TemplateListItem, TemplateRolePlaceholder,
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
    return await enrichWithDocument(workspaceId!, toDocumentTemplate(wire));
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
