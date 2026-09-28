// Contact requests (backend 086) — asking a contact for a signed copy, an
// upload, or (members only) a document's preparation.
//
// ── Delivery is the backend's decision, not ours ─────────────────────────
//
// The server matches the contact's address against the workspace's CURRENT
// member directory when the request is made. A member gets it in-app (their
// Contacts → Requests From Contacts and their notification feed, no email); anyone else is
// emailed and the requester records the outcome. The UI explains which will
// happen using the contact's `workspaceMember`, but the request's own
// `delivery` field is the truth once it exists.
//
// Like upload-requests-source, there is no fixture twin: a request names a
// real colleague and may send a real email, so there is nothing honest to
// demonstrate without a backend.

import { USE_REAL_BACKEND } from "../backend-flag";
import { apiRequest, ApiError } from "../api-client";
import type {
  ContactRequest, ContactRequestStatus, CreateContactRequestInput,
} from "../../models/contact-requests";

export function contactRequestsAvailable(workspaceId: string | undefined): boolean {
  return USE_REAL_BACKEND && workspaceId !== undefined && workspaceId !== "";
}

const ws = (workspaceId: string) => `/workspaces/${encodeURIComponent(workspaceId)}`;
const one = (workspaceId: string, requestId: string) =>
  `${ws(workspaceId)}/contact-requests/${encodeURIComponent(requestId)}`;
const statusQuery = (status?: ContactRequestStatus) =>
  status === undefined ? "" : `?status=${encodeURIComponent(status)}`;

class RealContactRequestService {
  async create(workspaceId: string, input: CreateContactRequestInput): Promise<ContactRequest> {
    const message = input.message?.trim() ?? "";
    const documentId = input.documentId?.trim() ?? "";
    return apiRequest<ContactRequest>(`${ws(workspaceId)}/contact-requests`, {
      method: "POST",
      body: {
        kind: input.kind,
        contactId: input.contactId,
        title: input.title.trim(),
        // Omitted rather than sent empty — the backend stores "" literally.
        ...(message === "" ? {} : { message }),
        ...(documentId === "" || input.kind === "upload" ? {} : { documentId }),
        ...(input.dueAt === undefined || input.dueAt === "" ? {} : { dueAt: input.dueAt }),
      },
    });
  }

  async get(workspaceId: string, requestId: string): Promise<ContactRequest> {
    return apiRequest<ContactRequest>(one(workspaceId, requestId));
  }

  /** `documentId` answers an upload / signed-document request; a preparation
   *  request is completed without one. */
  async complete(workspaceId: string, requestId: string, documentId?: string): Promise<ContactRequest> {
    return apiRequest<ContactRequest>(`${one(workspaceId, requestId)}/complete`, {
      method: "POST",
      body: documentId === undefined ? {} : { documentId },
    });
  }

  /** A reason is REQUIRED (1–500 characters after trimming); the backend
   *  answers 422 validation_failed without one. It is always sent, so an
   *  empty one fails on the server rather than being silently dropped. */
  async decline(workspaceId: string, requestId: string, reason: string): Promise<ContactRequest> {
    return apiRequest<ContactRequest>(`${one(workspaceId, requestId)}/decline`, {
      method: "POST",
      body: { reason: reason.trim() },
    });
  }

  async cancel(workspaceId: string, requestId: string): Promise<ContactRequest> {
    return apiRequest<ContactRequest>(`${one(workspaceId, requestId)}/cancel`, { method: "POST" });
  }

  async listForContact(workspaceId: string, contactId: string): Promise<ContactRequest[]> {
    const result = await apiRequest<{ items: ContactRequest[] }>(
      `${ws(workspaceId)}/contacts/${encodeURIComponent(contactId)}/requests`);
    return result.items;
  }

  /** What has been asked of ME, from every workspace ("Received"). Pending first. */
  async listReceived(status?: ContactRequestStatus): Promise<ContactRequest[]> {
    const result = await apiRequest<{ items: ContactRequest[] }>(`/me/contact-requests${statusQuery(status)}`);
    return result.items;
  }

  /** What I asked of my contacts, from every workspace ("Sent"). */
  async listSent(status?: ContactRequestStatus): Promise<ContactRequest[]> {
    const result = await apiRequest<{ items: ContactRequest[] }>(`/me/contact-requests/sent${statusQuery(status)}`);
    return result.items;
  }
}

export const realContactRequestService = new RealContactRequestService();

// ── Friendly errors ───────────────────────────────────────────────────────

export type ContactRequestOperation = "create" | "complete" | "decline" | "cancel" | "load";

/**
 * A sentence a person can act on, keyed on the backend's stable error codes
 * rather than its prose (which is free to change).
 */
export function contactRequestErrorMessage(error: unknown, operation: ContactRequestOperation): string {
  if (!(error instanceof ApiError)) {
    return "Something went wrong. Please try again.";
  }
  const code = error.body?.code;
  if (error.status === 0) return "We couldn't reach LAGDA. Check your connection and try again.";
  if (error.status === 401) return "Your session has ended. Sign in again to continue.";
  if (code === "contact_request_members_only") {
    return "Only a member of this workspace can be assigned to prepare a document. "
      + "Invite them to the workspace first, or ask them for an upload instead.";
  }
  if (code === "contact_request_recipient_cannot_act") {
    return "This member can't do that in this workspace yet. Give them a role or "
      + "privilege that allows it, then send the request again.";
  }
  if (error.status === 409 || code === "resource_conflict") {
    return "This request has already been answered or cancelled. Refresh to see its current status.";
  }
  if (error.status === 404) {
    return operation === "create"
      ? "You can't send requests from this workspace, or this contact or document is no longer available."
      : "This request is no longer available to you.";
  }
  if (error.status === 403) {
    return "You don't have permission to do that in this workspace.";
  }
  if (error.status === 422 || error.status === 400 || code === "validation_failed") {
    switch (operation) {
      case "create":
        return "This request couldn't be sent. Check that the due date is in the future, "
          + "the contact isn't archived, and you aren't sending it to yourself.";
      case "complete":
        return "This request couldn't be completed. Make sure you attach a document you uploaded, "
          + "or that you still have permission to prepare documents.";
      case "decline":
        return "Please give a reason for rejecting this request, between 1 and 500 characters.";
      case "cancel":
        return "Only the person who sent a request can cancel it.";
      default:
        return "That didn't work. Please try again.";
    }
  }
  return operation === "load"
    ? "Couldn't load requests. Try again in a moment."
    : "Something went wrong. Please try again.";
}
