// Asking a member to supply a document (backend 067).
//
// ── Why this is not a façade like templates-source or contacts-source ─────
//
// Those two exist to reconcile a fixture service with a narrower backend.
// This feature has no fixture twin: it did not exist before the backend did.
// So there is nothing to fall back to, and inventing a mock would mean
// inventing colleagues, assignments and notifications that never happened.
//
// A workspace with no real backend therefore cannot use this at all, and
// every function here refuses rather than pretending. The UI asks
// `uploadRequestsAvailable` first and explains, rather than offering a
// control that can only fail.

import { USE_REAL_BACKEND } from "./backend-flag";
import { apiRequest } from "./api-client";
import type {
  UploadRequest, UploadRequestStatus, CreateUploadRequestInput,
} from "../models/upload-requests";

/** Not a React hook despite the shape of the question — a plain predicate,
 *  matching `realTemplatesAvailable` and `realContactsAvailable`. */
export function uploadRequestsAvailable(workspaceId: string | undefined): boolean {
  return USE_REAL_BACKEND && workspaceId !== undefined && workspaceId !== "";
}

export class UploadRequestsUnavailableError extends Error {
  constructor() {
    super("Document requests need an open workspace.");
  }
}

const base = (workspaceId: string) =>
  `/workspaces/${encodeURIComponent(workspaceId)}/upload-requests`;

export interface ListUploadRequestsFilter {
  /** Narrows to what is being asked of the CALLER — their own queue, which
   *  is where the notification sends them. */
  assignedToMe?: boolean;
  status?:       UploadRequestStatus;
}

export async function listUploadRequests(
  workspaceId: string | undefined, filter: ListUploadRequestsFilter = {},
): Promise<UploadRequest[]> {
  if (!uploadRequestsAvailable(workspaceId)) throw new UploadRequestsUnavailableError();
  const params = new URLSearchParams();
  if (filter.assignedToMe === true) params.set("assignedToMe", "true");
  if (filter.status !== undefined) params.set("status", filter.status);
  const query = params.toString();
  const result = await apiRequest<{ items: UploadRequest[] }>(
    `${base(workspaceId!)}${query === "" ? "" : `?${query}`}`);
  return result.items;
}

export async function createUploadRequest(
  workspaceId: string | undefined, input: CreateUploadRequestInput,
): Promise<UploadRequest> {
  if (!uploadRequestsAvailable(workspaceId)) throw new UploadRequestsUnavailableError();
  return apiRequest<UploadRequest>(base(workspaceId!), {
    method: "POST",
    body: {
      title: input.title.trim(),
      // Omitted rather than sent empty: the backend's schema treats an absent
      // note as "there isn't one", and "" would be stored as a note that is
      // blank.
      ...(input.note === undefined || input.note.trim() === ""
        ? {} : { note: input.note.trim() }),
      contactId: input.contactId,
    },
  });
}

/** Withdraws a request. The record survives — it is evidence that something
 *  was asked and withdrawn — which is why this is not a DELETE. */
export async function cancelUploadRequest(
  workspaceId: string | undefined, requestId: string,
): Promise<UploadRequest> {
  if (!uploadRequestsAvailable(workspaceId)) throw new UploadRequestsUnavailableError();
  return apiRequest<UploadRequest>(
    `${base(workspaceId!)}/${encodeURIComponent(requestId)}/cancel`,
    { method: "POST" });
}

/**
 * Answers a request with a document that has ALREADY been uploaded.
 *
 * Takes a documentId, not a file: the ordinary create-then-upload path is
 * the only one that knows how to admit bytes safely, and this chains onto
 * its result rather than becoming a second upload route.
 */
export async function fulfilUploadRequest(
  workspaceId: string | undefined, requestId: string, documentId: string,
): Promise<UploadRequest> {
  if (!uploadRequestsAvailable(workspaceId)) throw new UploadRequestsUnavailableError();
  return apiRequest<UploadRequest>(
    `${base(workspaceId!)}/${encodeURIComponent(requestId)}/fulfil`,
    { method: "POST", body: { documentId } });
}
