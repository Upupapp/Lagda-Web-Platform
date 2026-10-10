// The draft that is already in progress when somebody starts another.
//
// There is ONE local draft slot (see PrepareContext). Starting a preparation,
// launching a template and reopening a draft from Documents all fill it, and
// each used to replace whatever was there without a word. These are the
// questions every one of those paths now asks first, kept free of React so
// the template page, which sits outside PrepareProvider, can ask them too.

import type { PreparationDraft } from "../../models/prepare";
import { readJSON, removeKey, PERSISTENCE_KEYS } from "../local-persistence";
import { clearAllFileRefs } from "./file-registry";
import { documentLifecycleService } from "../real/document-lifecycle.service";
import { ApiError } from "../api-client";

type DraftLike = Pick<PreparationDraft, "files" | "participants" | "details">;

/** Nothing worth asking about: no file, no participants, no title. */
export function isDraftEmpty(draft: DraftLike | null | undefined): boolean {
  if (!draft) return true;
  return draft.files.length === 0
    && draft.participants.length === 0
    && draft.details.title.trim() === "";
}

/** The server documents this draft has created, each once. */
export function draftServerDocumentIds(draft: Pick<PreparationDraft, "files"> | null | undefined): string[] {
  const ids = (draft?.files ?? []).flatMap(file => (file.backendDocumentId ? [file.backendDocumentId] : []));
  return [...new Set(ids)];
}

/** What to call the draft when asking about it. */
export function draftDisplayTitle(draft: DraftLike): string {
  const title = draft.details.title.trim();
  if (title !== "") return title;
  const fileName = draft.files[0]?.fileName.trim() ?? "";
  return fileName !== "" ? fileName : "Untitled document";
}

/** A draft with documents on the server, and no workspace to delete them in. */
export class DraftDeleteUnavailableError extends Error {
  constructor() { super("The draft could not be deleted."); }
}

/**
 * Deletes the draft's documents on the server, through the same call the
 * Documents list uses for a draft. A draft that never reached the server has
 * nothing to delete. A document that is already gone counts as deleted, so
 * trying again after a partial failure finishes the job.
 *
 * Throws on the first document that could not be deleted; the caller keeps
 * the local draft and says so.
 */
export async function deleteDraftOnServer(
  workspaceId: string | undefined,
  draft: Pick<PreparationDraft, "files"> | null | undefined,
): Promise<void> {
  const ids = draftServerDocumentIds(draft);
  if (ids.length === 0) return;
  if (workspaceId === undefined) throw new DraftDeleteUnavailableError();
  for (const documentId of ids) {
    try {
      await documentLifecycleService.deleteDraftDocument(workspaceId, documentId);
    } catch (error) {
      if (error instanceof ApiError && error.status === 404) continue;
      throw error;
    }
  }
}

/** Why the draft is still here, in plain words. */
export function draftDeleteErrorMessage(error: unknown): string {
  if (error instanceof ApiError && error.status !== 0 && error.message !== "") {
    return `That draft was not deleted, so it has been kept. ${error.message}`;
  }
  return "That draft was not deleted, so it has been kept. Check your connection and try again.";
}

// ── Outside PrepareProvider ─────────────────────────────────────────────────

/** The draft in the local slot, for a page that has no PrepareProvider. */
export function readStoredDraft(): PreparationDraft | null {
  try {
    const raw = readJSON<PreparationDraft>(PERSISTENCE_KEYS.prepareDraft);
    if (!raw || typeof raw !== "object") return null;
    if (!Array.isArray(raw.files) || !Array.isArray(raw.participants)) return null;
    if (typeof raw.details?.title !== "string") return null;
    return raw;
  } catch {
    return null;
  }
}

/** Empties the local slot, for a page that has no PrepareProvider. */
export function clearStoredDraft(): void {
  removeKey(PERSISTENCE_KEYS.prepareDraft);
  clearAllFileRefs();
}
