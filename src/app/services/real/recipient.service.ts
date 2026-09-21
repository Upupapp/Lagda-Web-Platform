// Real recipient service — talks to Lagda-Backend's workspace-scoped
// recipient routes. Recipients ARE participants: the backend's RecipientType
// enum is identical to the frontend's PrepParticipantRole union (signer,
// approver, reviewer, acknowledgment-recipient, viewer, carbon-copy) — no
// translation needed for that field. Bounded to CRUD + reorder; nothing
// about signing-access/ceremony/delivery here.

import { apiRequest } from "../api-client";

export type BackendRecipientType =
  | "signer" | "approver" | "reviewer"
  | "acknowledgment-recipient" | "viewer" | "carbon-copy";

export interface RealRecipient {
  recipientId: string;
  name: string;
  email: string;
  organization: string | null;
  type: BackendRecipientType;
  isRequired: boolean;
  orderIndex: number;
  routingOrder: number;
  sourceContactId: string | null;
  createdAt: string;
  updatedAt: string;
}

export interface AddRecipientInput {
  name: string;
  email: string;
  organization?: string | null;
  type: BackendRecipientType;
  isRequired?: boolean;
  routingOrder?: number;
}

export interface UpdateRecipientInput {
  name?: string;
  email?: string;
  organization?: string | null;
  type?: BackendRecipientType;
  isRequired?: boolean;
  routingOrder?: number;
}

class RealRecipientService {
  async list(workspaceId: string, documentId: string): Promise<RealRecipient[]> {
    const result = await apiRequest<{ recipients: RealRecipient[] }>(
      `/workspaces/${encodeURIComponent(workspaceId)}/documents/${encodeURIComponent(documentId)}/recipients`,
    );
    return result.recipients;
  }

  async add(workspaceId: string, documentId: string, input: AddRecipientInput): Promise<RealRecipient> {
    return apiRequest<RealRecipient>(
      `/workspaces/${encodeURIComponent(workspaceId)}/documents/${encodeURIComponent(documentId)}/recipients`,
      { method: "POST", body: { source: "manual", ...input } },
    );
  }

  async update(
    workspaceId: string, documentId: string, recipientId: string, input: UpdateRecipientInput,
  ): Promise<RealRecipient> {
    return apiRequest<RealRecipient>(
      `/workspaces/${encodeURIComponent(workspaceId)}/documents/${encodeURIComponent(documentId)}/recipients/${encodeURIComponent(recipientId)}`,
      { method: "PATCH", body: input },
    );
  }

  /**
   * Replaces the whole recipient list in ONE transaction.
   *
   * Somebody already on the document is kept — with their fields — and a
   * departing signer's fields pass to their replacement rather than blocking
   * the change. Either the list becomes exactly this, or nothing changes.
   */
  async replaceAll(
    workspaceId: string, documentId: string, recipients: AddRecipientInput[],
  ): Promise<RealRecipient[]> {
    const result = await apiRequest<{ recipients: RealRecipient[] }>(
      `/workspaces/${encodeURIComponent(workspaceId)}/documents/${encodeURIComponent(documentId)}/recipients`,
      {
        method: "PUT",
        body: { recipients: recipients.map(r => ({ source: "manual", ...r })) },
      },
    );
    return result.recipients;
  }

  async remove(workspaceId: string, documentId: string, recipientId: string): Promise<void> {
    await apiRequest<void>(
      `/workspaces/${encodeURIComponent(workspaceId)}/documents/${encodeURIComponent(documentId)}/recipients/${encodeURIComponent(recipientId)}`,
      { method: "DELETE" },
    );
  }

  // PUT .../recipients/order {recipientIds} — sets LIST position
  // (orderIndex), distinct from routingOrder (the signing sequence, set
  // per-recipient via add/update). recipientIds must be every recipient's
  // real id, in the desired order.
  async setOrder(workspaceId: string, documentId: string, recipientIds: string[]): Promise<RealRecipient[]> {
    const result = await apiRequest<{ recipients: RealRecipient[] }>(
      `/workspaces/${encodeURIComponent(workspaceId)}/documents/${encodeURIComponent(documentId)}/recipients/order`,
      { method: "PUT", body: { recipientIds } },
    );
    return result.recipients;
  }
}

export const realRecipientService = new RealRecipientService();
