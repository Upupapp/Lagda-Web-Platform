// Document sharing (backend 087): sharing a completed document with an email
// address, asking for access to one, and answering both.
//
//   Owner      /workspaces/:ws/documents/:documentId/shares[/:shareId]
//              /workspaces/:ws/access-requests[/:requestId[/approve|reject|withdraw-rejection|remove]]
//              /workspaces/:ws/shared-by-me?scope=mine|workspace
//   Recipient  /me/shared-documents[/:id[/accept|reject|withdraw-rejection|remove-access|details|document]]
//   Requester  /verifications/:verificationId/access-requests, /my-access
//
// A share names an EMAIL, never an account, and nothing is emailed: it shows
// up in Shared Documents → Shared With Me once an account with that verified
// address signs in. Every action is re-authorized by the backend; what the UI
// offers is only a presentation of `actions` / the caller's role.
//
// Like contact requests there is no fixture twin: a share names a real person,
// so without a backend there is nothing honest to demonstrate.

import { API_BASE_URL, USE_REAL_BACKEND } from "../backend-flag";
import { apiRequest, ApiError, extractErrorBody } from "../api-client";
import { changesNavCounts } from "../nav-counts-signal";

// ── Wire types ────────────────────────────────────────────────────────────

export interface SharingPerson { readonly userId: string; readonly displayName: string }

export interface SharedCompletedDocument {
  readonly documentId: string;
  readonly verificationId: string;
  readonly documentTitle: string;
  readonly completedAt: string;
  readonly owner: SharingPerson;
  readonly participantCount: number;
}

export type ShareStatus = "pending" | "accepted" | "rejected" | "removed";
export type AccessRequestStatus = "pending" | "approved" | "rejected" | "removed";

export interface DocumentShare {
  readonly shareId: string;
  readonly documentId: string;
  readonly verificationId: string;
  readonly email: string;
  readonly fullName: string | null;
  readonly status: ShareStatus;
  readonly recipient: SharingPerson | null;
  readonly sharedBy: SharingPerson;
  readonly removedBy: "owner" | "recipient" | "email-changed" | null;
  readonly replacesShareId: string | null;
  readonly recipientDeleted: boolean;
  readonly createdAt: string;
  readonly updatedAt: string;
  readonly respondedAt: string | null;
  readonly removedAt: string | null;
}

/** A participant of the completed document — they always keep their own access. */
export interface DocumentParticipant {
  readonly name: string;
  readonly email: string;
  readonly organization: string | null;
  /** The signing role, e.g. SIGNER, APPROVER, CC. */
  readonly role: string;
}

export interface DocumentShares {
  readonly document: SharedCompletedDocument;
  readonly shares: readonly DocumentShare[];
  /** Absent from an older backend. */
  readonly participants?: readonly DocumentParticipant[];
}

export interface UpdatedShare {
  readonly share: DocumentShare;
  /** The share an address change ended; `share` is then the new pending one. */
  readonly previous: DocumentShare | null;
}

export interface AccessRequest {
  readonly requestId: string;
  readonly document: SharedCompletedDocument;
  readonly requester: { readonly userId: string; readonly displayName: string; readonly email: string };
  readonly note: string | null;
  readonly status: AccessRequestStatus;
  readonly decidedBy: SharingPerson | null;
  readonly decidedAt: string | null;
  readonly removedAt: string | null;
  readonly createdAt: string;
  readonly updatedAt: string;
}

export interface SharedByMeItem {
  readonly document: SharedCompletedDocument;
  readonly acceptedShares: number;
  readonly pendingShares: number;
  readonly rejectedShares: number;
  readonly approvedRequests: number;
  readonly pendingRequests: number;
}

export type SharedStatus = "accepted" | "pending" | "rejected";
export type SharedAction = "accept" | "reject" | "withdraw-rejection" | "delete" | "remove-access" | "open";

export interface SharedDocument {
  readonly id: string;
  readonly kind: "share" | "access-request";
  readonly status: SharedStatus;
  readonly verificationId: string;
  readonly documentTitle: string;
  readonly completedAt: string;
  readonly owner: { readonly displayName: string };
  readonly sharedBy: { readonly displayName: string } | null;
  readonly fullName: string | null;
  readonly email: string;
  readonly note: string | null;
  readonly progress: { readonly participants: number; readonly completed: number };
  readonly branding: {
    readonly displayName: string;
    readonly primaryColor: string | null;
    readonly logo: { readonly version: string; readonly width: number; readonly height: number; readonly url: string } | null;
  };
  readonly actions: readonly SharedAction[];
  readonly createdAt: string;
  readonly updatedAt: string;
  readonly respondedAt: string | null;
}

export interface SharedDocumentDetails {
  readonly documentTitle: string;
  readonly completedAt: number;
  readonly sealedDigest: string;
  readonly participants: readonly {
    readonly name: string;
    readonly maskedEmail: string;
    readonly recipientType: string;
    readonly status: "signed" | "approved" | "declined" | "skipped" | "viewed" | "no-action";
    readonly actedAt: number | null;
    readonly routingOrder: number;
  }[];
  readonly events: readonly { readonly type: string; readonly label: string; readonly at: number }[];
}

export type MyAccessRelation =
  | "owner" | "admin" | "participant"
  | "shared-accepted" | "shared-pending" | "shared-rejected"
  | "request-pending" | "request-rejected" | "none";

export interface MyDocumentAccess {
  readonly verificationId: string;
  readonly relation: MyAccessRelation;
  readonly shareId: string | null;
  readonly requestId: string | null;
  readonly canRequestAccess: boolean;
}

export interface MyAccessRequest {
  readonly requestId: string;
  readonly verificationId: string;
  readonly documentTitle: string;
  readonly status: AccessRequestStatus;
  readonly note: string | null;
  readonly createdAt: string;
}

/** The relations the signed-in member-access unlock admits without a code. */
export const UNLOCKING_RELATIONS: readonly MyAccessRelation[] = ["owner", "admin", "participant", "shared-accepted"];

export const MAX_NOTE_LENGTH = 500;
export const MAX_FULL_NAME_LENGTH = 200;

// ── Paths ─────────────────────────────────────────────────────────────────

const enc = encodeURIComponent;
const ws = (workspaceId: string) => `/workspaces/${enc(workspaceId)}`;
const shares = (workspaceId: string, documentId: string) => `${ws(workspaceId)}/documents/${enc(documentId)}/shares`;
const request = (workspaceId: string, requestId: string) => `${ws(workspaceId)}/access-requests/${enc(requestId)}`;
const mine = (id: string) => `/me/shared-documents/${enc(id)}`;
const query = (key: string, value: string | undefined) => (value === undefined ? "" : `?${key}=${enc(value)}`);

export function sharingAvailable(): boolean {
  return USE_REAL_BACKEND;
}

/** The absolute URL of a recipient-safe logo route (relative on the wire). */
export function sharedLogoUrl(item: SharedDocument): string | null {
  const logo = item.branding.logo;
  if (logo === null || API_BASE_URL === null) return null;
  return /^https?:\/\//i.test(logo.url) ? logo.url : `${API_BASE_URL}${logo.url}`;
}

// ── Owner ─────────────────────────────────────────────────────────────────

export const documentSharingService = {
  listShares(workspaceId: string, documentId: string, status?: ShareStatus): Promise<DocumentShares> {
    return apiRequest<DocumentShares>(`${shares(workspaceId, documentId)}${query("status", status)}`);
  },

  createShare(workspaceId: string, documentId: string, input: { email: string; fullName?: string | null }): Promise<DocumentShare> {
    const fullName = input.fullName?.trim() ?? "";
    return apiRequest<DocumentShare>(shares(workspaceId, documentId), {
      method: "POST",
      body: { email: input.email.trim(), ...(fullName === "" ? {} : { fullName }) },
    });
  },

  /** Send only what changed. A new email ends the old share and starts a pending one. */
  updateShare(
    workspaceId: string, documentId: string, shareId: string,
    changes: { email?: string; fullName?: string | null },
  ): Promise<UpdatedShare> {
    const body: { email?: string; fullName?: string | null } = {};
    if (changes.email !== undefined) body.email = changes.email.trim();
    if (changes.fullName !== undefined) {
      const trimmed = changes.fullName?.trim() ?? "";
      body.fullName = trimmed === "" ? null : trimmed;
    }
    return apiRequest<UpdatedShare>(`${shares(workspaceId, documentId)}/${enc(shareId)}`, { method: "PATCH", body });
  },

  removeShare(workspaceId: string, documentId: string, shareId: string): Promise<DocumentShare> {
    return apiRequest<DocumentShare>(`${shares(workspaceId, documentId)}/${enc(shareId)}`, { method: "DELETE" });
  },

  async listAccessRequests(workspaceId: string, status?: AccessRequestStatus): Promise<AccessRequest[]> {
    const result = await apiRequest<{ items: AccessRequest[] }>(`${ws(workspaceId)}/access-requests${query("status", status)}`);
    return result.items;
  },

  decideAccessRequest(
    workspaceId: string, requestId: string, verb: "approve" | "reject" | "withdraw-rejection" | "remove",
  ): Promise<AccessRequest> {
    return changesNavCounts(apiRequest<AccessRequest>(`${request(workspaceId, requestId)}/${verb}`, { method: "POST" }));
  },

  deleteAccessRequest(workspaceId: string, requestId: string): Promise<void> {
    return changesNavCounts(apiRequest<void>(request(workspaceId, requestId), { method: "DELETE" }));
  },

  async sharedByMe(workspaceId: string, scope: "mine" | "workspace" = "mine"): Promise<SharedByMeItem[]> {
    const result = await apiRequest<{ items: SharedByMeItem[] }>(`${ws(workspaceId)}/shared-by-me${query("scope", scope)}`);
    return result.items;
  },

  // ── Recipient ───────────────────────────────────────────────────────────

  async sharedWithMe(status: SharedStatus): Promise<SharedDocument[]> {
    const result = await apiRequest<{ items: SharedDocument[] }>(`/me/shared-documents${query("status", status)}`);
    return result.items;
  },

  actOnShared(id: string, verb: "accept" | "reject" | "withdraw-rejection"): Promise<SharedDocument> {
    return changesNavCounts(apiRequest<SharedDocument>(`${mine(id)}/${verb}`, { method: "POST" }));
  },

  removeMyAccess(id: string): Promise<void> {
    return changesNavCounts(apiRequest<void>(`${mine(id)}/remove-access`, { method: "POST" }));
  },

  deleteShared(id: string): Promise<void> {
    return changesNavCounts(apiRequest<void>(mine(id), { method: "DELETE" }));
  },

  async sharedDetails(id: string): Promise<SharedDocumentDetails> {
    const result = await apiRequest<{ details: SharedDocumentDetails }>(`${mine(id)}/details`);
    return result.details;
  },

  /** The signed PDF, as a blob. Not JSON, so not through apiRequest. */
  async sharedDocumentFile(id: string): Promise<Blob> {
    if (API_BASE_URL === null) throw new ApiError(0, undefined, "No backend is configured.");
    let response: Response;
    try {
      response = await fetch(`${API_BASE_URL}${mine(id)}/document`, { method: "GET", credentials: "include" });
    } catch {
      throw new ApiError(0, undefined, "Could not reach the server. Check your connection and try again.");
    }
    if (!response.ok) {
      const isJson = response.headers.get("content-type")?.includes("application/json");
      const payload: unknown = isJson ? await response.json().catch(() => undefined) : undefined;
      throw new ApiError(response.status, extractErrorBody(payload), `Request failed with status ${response.status}.`);
    }
    const blob = await response.blob();
    return blob.type ? blob : new Blob([blob], { type: response.headers.get("Content-Type") ?? "application/pdf" });
  },

  // ── Requester ───────────────────────────────────────────────────────────

  myAccess(verificationId: string): Promise<MyDocumentAccess> {
    return apiRequest<MyDocumentAccess>(`/verifications/${enc(verificationId)}/my-access`);
  },

  requestAccess(verificationId: string, note?: string): Promise<MyAccessRequest> {
    const trimmed = note?.trim() ?? "";
    return apiRequest<MyAccessRequest>(`/verifications/${enc(verificationId)}/access-requests`, {
      method: "POST",
      body: trimmed === "" ? {} : { note: trimmed },
    });
  },
};

// ── Friendly errors ───────────────────────────────────────────────────────

export type SharingOperation =
  | "load" | "share" | "edit" | "remove" | "decide" | "respond" | "open" | "request";

/** A sentence a person can act on, keyed on the backend's stable codes. */
export function sharingErrorMessage(error: unknown, operation: SharingOperation): string {
  if (!(error instanceof ApiError)) return "Something went wrong. Please try again.";
  const code = error.body?.code;
  if (error.status === 0) return "We couldn't reach LAGDA. Check your connection and try again.";
  if (error.status === 401) return "Your session has ended. Sign in again to continue.";
  switch (code) {
    case "document_share_exists":
      return "This document is already shared with that email address.";
    case "document_share_recipient_has_access":
      return "That person already has access to this document, as a participant or through earlier access.";
    case "sharing_state_conflict":
      return "This was changed in the meantime. Refresh to see its current status.";
    case "document_not_completed":
      return "Only a completed document can be shared or requested.";
    case "document_access_already_granted":
      return "You already have access to this document.";
    case "document_access_already_pending":
      return "You have already asked for access to this document. The owner has not answered yet.";
    case "document_access_already_rejected":
      return "Your earlier request for access to this document was not approved.";
    case "account_email_unverified":
      return "Confirm your account's email address first. Sharing and access requests need a verified email address.";
    default:
      break;
  }
  if (error.status === 409) return "This was changed in the meantime. Refresh to see its current status.";
  if (error.status === 404) {
    return operation === "request"
      ? "No completed document was found for this Verification ID."
      : "This document is no longer available to you. Refresh to see the current list.";
  }
  if (error.status === 403) return "You don't have permission to do that for this document.";
  if (error.status === 429) return "Too many attempts. Please wait a few minutes before trying again.";
  if (error.status === 422 || error.status === 400 || code === "validation_failed") {
    if (operation === "request") return `Keep the note to ${MAX_NOTE_LENGTH} characters or fewer.`;
    if (operation === "share" || operation === "edit") {
      return `Enter a valid email address, and keep the full name to ${MAX_FULL_NAME_LENGTH} characters or fewer.`;
    }
    return "That didn't work. Please try again.";
  }
  if (operation === "load") return "Couldn't load shared documents. Try again in a moment.";
  if (operation === "open") return "The signed document could not be loaded. Try again shortly.";
  return "Something went wrong. Please try again.";
}

export function isValidShareEmail(value: string): boolean {
  return /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(value.trim());
}

export function formatSharingDate(iso: string | number | null | undefined): string {
  if (iso === null || iso === undefined || iso === "") return "—";
  const date = new Date(iso);
  if (Number.isNaN(date.getTime())) return "—";
  return date.toLocaleDateString("en-PH", { month: "short", day: "numeric", year: "numeric" });
}

export function formatSharingDateTime(iso: string | number | null | undefined): string {
  if (iso === null || iso === undefined || iso === "") return "—";
  const date = new Date(iso);
  if (Number.isNaN(date.getTime())) return "—";
  return date.toLocaleString("en-PH", { month: "short", day: "numeric", year: "numeric", hour: "numeric", minute: "2-digit" });
}

/** Where each surface of Shared Documents lives. */
export const SHARED_DOCUMENTS_PATH = "/app/shared-documents";
export const sharedByMePath = (section?: "approved" | "pending" | "rejected") =>
  `${SHARED_DOCUMENTS_PATH}/by-me${section === undefined ? "" : `?section=${section}`}`;
export const sharedWithMePath = (section?: "accepted" | "pending" | "rejected") =>
  `${SHARED_DOCUMENTS_PATH}/with-me${section === undefined ? "" : `?section=${section}`}`;
