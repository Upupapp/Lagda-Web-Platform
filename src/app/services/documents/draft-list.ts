// What counts as a draft, decided in ONE place.
//
// Two screens list drafts: Documents › Draft, and "Resume a draft" on the
// Prepare entry page. They used to disagree. The entry page listed only
// signing requests still in `draft` state, so a document that was uploaded
// and prepared but never sent (which has NO request: one is created only at
// Send) appeared in Documents and not there.
//
// Both now read the same three lists, under the same live-query keys (so the
// second screen shows what the first already loaded), and decide with the
// same functions below.

import { realDocumentService, type RealDocument, type RealDocumentListResult } from "../real/document.service";
import {
  realSigningRequestService,
  type SigningRequestListItem, type SigningRequestListResult, type SigningRequestState,
} from "../real/signing-request.service";
import { realTemplatesService } from "../real/templates.service";

/** A request that has not gone out yet. */
export const DRAFT_REQUEST_STATES: readonly SigningRequestState[] = ["draft", "ready-to-send"];

// ── Unsent drafts ───────────────────────────────────────────────────────────
//
// A signing request is created only at the final Send step. A document that
// was uploaded and prepared but never sent therefore has NO request. It is
// shown as a Draft row built from the document itself, marked so the actions
// a request would have (history, signers, send again) are not offered for it.

export const UNSENT_DRAFT_PREFIX = "unsent-draft:";

export function isUnsentDraft(item: Pick<SigningRequestListItem, "signingRequestId">): boolean {
  return item.signingRequestId.startsWith(UNSENT_DRAFT_PREFIX);
}

export function unsentDraftRow(document: RealDocument): SigningRequestListItem {
  return {
    signingRequestId: `${UNSENT_DRAFT_PREFIX}${document.documentId}`,
    documentId: document.documentId,
    documentTitle: document.title,
    state: "draft",
    participantCount: 0,
    completedParticipantCount: 0,
    initiator: null,
    createdAt: document.createdAt,
    sentAt: null,
    completedAt: null,
    expiresAt: null,
  };
}

/**
 * The documents that were never sent: no request has ever been made for
 * them, and they are not a workflow template's own document.
 *
 * Empty until BOTH sets are known, so nothing is briefly shown as a draft
 * while the lists are still loading.
 */
export function selectUnsentDraftDocuments(
  documents: readonly RealDocument[],
  requestedDocumentIds: ReadonlySet<string> | null,
  templateDocumentIds: ReadonlySet<string> | null,
): RealDocument[] {
  if (requestedDocumentIds === null || templateDocumentIds === null) return [];
  return documents
    .filter(document => !requestedDocumentIds.has(document.documentId))
    // A template's own document belongs to Templates. Listed here it looked
    // like a draft with a Delete button that could never work.
    .filter(document => !templateDocumentIds.has(document.documentId));
}

// ── The three reads ─────────────────────────────────────────────────────────

/** The live-query keys and reads both screens use. Same key, one fetch. */
export const draftSources = {
  filesKey: (workspaceId: string) => `documents:files:${workspaceId}`,
  readFiles: (workspaceId: string): Promise<RealDocumentListResult> =>
    realDocumentService.list(workspaceId, { perPage: 100 }),

  /** Every request, unfiltered: which documents have EVER had one. */
  requestsKey: (workspaceId: string) => `documents:all:${workspaceId}`,
  readRequests: (workspaceId: string): Promise<SigningRequestListResult> =>
    realSigningRequestService.list(workspaceId, { perPage: 100 }),

  /** The documents that are a workflow template's own. Someone who may not
   *  read templates gets an empty list. */
  templateDocumentsKey: (workspaceId: string) => `documents:template-documents:${workspaceId}`,
  readTemplateDocumentIds: (workspaceId: string): Promise<string[]> =>
    realTemplatesService.list(workspaceId).then(
      items => items.flatMap(template => (template.documentId === null ? [] : [template.documentId])),
      () => [] as string[],
    ),
} as const;

// ── One list of drafts to resume ────────────────────────────────────────────

export interface DraftListEntry {
  /** Stable per row. */
  readonly key: string;
  /** What `?resumeDocumentId=` takes. */
  readonly documentId: string;
  readonly title: string;
  /** The uploaded file's name, when the server recorded one. */
  readonly fileName: string | null;
  /** ISO-8601: when the document last changed. */
  readonly changedAt: string;
}

/**
 * Every draft there is to resume, newest change first: the documents never
 * sent, and the requests made but not sent yet. The same rows Documents ›
 * Draft shows. Empty until all three lists are known.
 */
export function selectDraftList(
  documents: readonly RealDocument[] | undefined,
  requests: readonly SigningRequestListItem[] | undefined,
  templateDocumentIds: readonly string[] | undefined,
): DraftListEntry[] {
  if (documents === undefined || requests === undefined || templateDocumentIds === undefined) return [];
  const byId = new Map(documents.map(document => [document.documentId, document]));
  const entries = new Map<string, DraftListEntry>();

  const unsent = selectUnsentDraftDocuments(
    documents, new Set(requests.map(request => request.documentId)), new Set(templateDocumentIds));
  for (const document of unsent) {
    entries.set(document.documentId, {
      key: `${UNSENT_DRAFT_PREFIX}${document.documentId}`,
      documentId: document.documentId,
      title: document.title,
      fileName: document.originalFilename,
      changedAt: document.updatedAt || document.createdAt,
    });
  }

  for (const request of requests) {
    if (!DRAFT_REQUEST_STATES.includes(request.state) || entries.has(request.documentId)) continue;
    const document = byId.get(request.documentId);
    entries.set(request.documentId, {
      key: request.signingRequestId,
      documentId: request.documentId,
      title: document?.title ?? request.documentTitle,
      fileName: document?.originalFilename ?? null,
      changedAt: document?.updatedAt || request.createdAt,
    });
  }

  return [...entries.values()].sort((a, b) => b.changedAt.localeCompare(a.changedAt));
}
