// A document's life after it is made: cancel and restore, the Recycle Bin,
// permanent deletion (the owner's alone), deletion requests, and what is left
// for the people who had access when a document is erased.
//
// Rules the server keeps, and which the screens only reflect:
//   · Out for signature: cancel first. Cancelled or completed: Move to Trash,
//     then the OWNER may permanently delete with a reason. A sender or
//     administrator pressing delete in the bin files a deletion request.
//   · Draft, declined, expired: deleted directly.
//   · A Free workspace cannot delete (403 `plan_required_for_deletion`),
//     except drafts and "remove from my own list".

import { apiRequest, ApiError } from "../api-client";
import { API_BASE_URL } from "../backend-flag";
import { changes } from "../live/topics";
import { changesNavCounts } from "../nav-counts-signal";

const ws = (workspaceId: string) => `/workspaces/${encodeURIComponent(workspaceId)}`;
const sr = (workspaceId: string, id: string) => `${ws(workspaceId)}/signing-requests/${encodeURIComponent(id)}`;
const bin = (workspaceId: string, id: string) => `${ws(workspaceId)}/recycle-bin/${encodeURIComponent(id)}`;

/** The error code that means "this needs Personal or higher". */
export const PLAN_REQUIRED_FOR_DELETION = "plan_required_for_deletion";
export function isPlanRequired(err: unknown): boolean {
  return err instanceof ApiError && err.body?.code === PLAN_REQUIRED_FOR_DELETION;
}

export interface BinPerson { userId: string; displayName: string; avatarVersion: string | null }
export interface DeletionRequestSummary {
  requestId: string; status: "pending"; requestedAt: string; requestedBy: BinPerson;
  /** Filled for the owner and for the requester; null for anyone else. */
  reason: string | null;
}
export type BinAction = "restore" | "delete" | "request-deletion";
export interface RecycleBinItem {
  signingRequestId: string; documentId: string; documentTitle: string;
  state: "cancelled" | "completed";
  trashedAt: string; trashedBy: BinPerson;
  /** Why it was moved here. Asked for a completed document; null otherwise. */
  trashedReason?: string | null;
  completedAt: string | null; cancelledAt: string | null; participantCount: number;
  deletionRequest: DeletionRequestSummary | null;
  actions: BinAction[];
}
export interface DeletionRequest {
  requestId: string; signingRequestId: string | null; documentTitle: string;
  state: "cancelled" | "completed";
  status: "pending" | "approved" | "disapproved" | "withdrawn";
  reason: string | null; requestedBy: BinPerson; requestedAt: string;
  trashedAt: string | null; decidedAt: string | null;
}
export type DeletedOrigin = "shared-with-me" | "signed-by-me" | "to-sign" | "sent";
export interface DeletedDocumentRecord {
  id: string; documentTitle: string;
  kind: "draft" | "declined" | "expired" | "cancelled" | "completed";
  deletedAt: string; reason: string | null;
  workspace: { name: string; primaryColor: string | null; logo: { version: string; width: number; height: number; url: string } | null };
  deletedBy: { displayName: string; avatarVersion: string | null; avatarUrl: string | null };
  signingRequestId: string | null; verificationId: string | null;
  origin: DeletedOrigin;
}
export interface InboxCounts { sign: number; approve: number; review: number; acknowledge: number }

/** A member's photo inside their workspace. */
export function memberAvatarUrl(workspaceId: string, person: BinPerson): string | undefined {
  if (person.avatarVersion === null) return undefined;
  return `${API_BASE_URL ?? ""}${ws(workspaceId)}/members/${encodeURIComponent(person.userId)}/avatar?v=${encodeURIComponent(person.avatarVersion)}`;
}
/** A path the server handed back (`/me/…`), as an address the browser can load. */
export function apiAssetUrl(path: string | null | undefined): string | undefined {
  if (path === null || path === undefined || path === "") return undefined;
  return /^https?:/.test(path) ? path : `${API_BASE_URL ?? ""}${path}`;
}

const docs = <T>(work: Promise<T>) => changesNavCounts(changes("documents", work));

export const documentLifecycleService = {
  inboxCounts(): Promise<InboxCounts> {
    return apiRequest<InboxCounts>("/me/inbox-counts");
  },

  // ── Cancel and restore ────────────────────────────────────────────────
  restore(workspaceId: string, signingRequestId: string): Promise<{ state: string; reissuedLinkCount: number; expiryCleared: boolean }> {
    return docs(apiRequest(`${sr(workspaceId, signingRequestId)}/restore`, { method: "POST" }));
  },

  // ── Deleting directly ─────────────────────────────────────────────────
  /** A document that was never sent. */
  deleteDraftDocument(workspaceId: string, documentId: string): Promise<void> {
    return docs(apiRequest<undefined>(`${ws(workspaceId)}/documents/${encodeURIComponent(documentId)}`, { method: "DELETE" })).then(() => undefined);
  },
  /** A draft, declined or expired request. */
  deleteRequest(workspaceId: string, signingRequestId: string): Promise<void> {
    return docs(apiRequest(`${sr(workspaceId, signingRequestId)}/delete`, { method: "POST", body: {} })).then(() => undefined);
  },

  // ── The Recycle Bin ───────────────────────────────────────────────────
  /** A completed document needs a reason; a cancelled one already has its own. */
  moveToTrash(workspaceId: string, signingRequestId: string, reason = ""): Promise<void> {
    const body = reason === "" ? {} : { reason };
    return docs(apiRequest(`${sr(workspaceId, signingRequestId)}/trash`, { method: "POST", body })).then(() => undefined);
  },
  async recycleBin(workspaceId: string): Promise<RecycleBinItem[]> {
    return (await apiRequest<{ items: RecycleBinItem[] }>(`${ws(workspaceId)}/recycle-bin`)).items;
  },
  restoreFromBin(workspaceId: string, signingRequestId: string): Promise<void> {
    return docs(apiRequest(`${bin(workspaceId, signingRequestId)}/restore`, { method: "POST" })).then(() => undefined);
  },
  /** The owner: erased. A member: a deletion request to the owner. */
  deleteFromBin(workspaceId: string, signingRequestId: string, reason: string): Promise<{ outcome: "deleted" | "deletion-requested" }> {
    return docs(apiRequest(`${bin(workspaceId, signingRequestId)}/delete`, { method: "POST", body: { reason } }));
  },

  // ── Deletion requests (the owner's) ───────────────────────────────────
  async deletionRequests(workspaceId: string): Promise<DeletionRequest[]> {
    return (await apiRequest<{ items: DeletionRequest[] }>(`${ws(workspaceId)}/deletion-requests?status=pending`)).items;
  },
  approveDeletion(workspaceId: string, requestId: string, reason: string): Promise<void> {
    return docs(apiRequest(`${ws(workspaceId)}/deletion-requests/${encodeURIComponent(requestId)}/approve`, { method: "POST", body: { reason } })).then(() => undefined);
  },
  disapproveDeletion(workspaceId: string, requestId: string): Promise<void> {
    return docs(apiRequest(`${ws(workspaceId)}/deletion-requests/${encodeURIComponent(requestId)}/disapprove`, { method: "POST" })).then(() => undefined);
  },

  // ── My own lists ──────────────────────────────────────────────────────
  removeFromSignedByMe(signingRequestId: string): Promise<void> {
    return docs(apiRequest<undefined>(`/me/signed-documents/${encodeURIComponent(signingRequestId)}`, { method: "DELETE" })).then(() => undefined);
  },
  async deletedDocuments(): Promise<DeletedDocumentRecord[]> {
    return (await apiRequest<{ items: DeletedDocumentRecord[] }>("/me/deleted-documents")).items;
  },
  removeDeletedDocument(id: string): Promise<void> {
    return docs(apiRequest<undefined>(`/me/deleted-documents/${encodeURIComponent(id)}`, { method: "DELETE" })).then(() => undefined);
  },
};
