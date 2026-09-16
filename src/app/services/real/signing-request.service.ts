// Real signing-request service — talks to Lagda-Backend's
// /workspaces/:workspaceId/signing-requests surface. Traced directly against
// current source this command (P2); every shape below is a route contract
// that exists today, nothing invented. See signing-request-routes.ts and
// send-routes.ts.

import { apiRequest } from "../api-client";
import { API_BASE_URL } from "../backend-flag";

export type SigningRequestState =
  | "draft" | "ready-to-send" | "sent" | "partially-completed"
  | "completion-ready" | "completed" | "declined" | "cancelled" | "expired";

export interface SigningRequestCreated {
  signingRequestId: string;
  documentId: string;
  state: SigningRequestState;
  recipientCount: number;
  fieldCount: number;
  createdAt: string;
}

export interface SigningRequestRecipient {
  recipientId: string;
  name: string;
  email: string;
  organization: string | null;
  type: string;
  isRequired: boolean;
  orderIndex: number;
  routingOrder: number;
}

export interface SigningRequestField {
  fieldId: string;
  type: string;
  pageNumber: number;
  rect: { x: number; y: number; width: number; height: number };
  required: boolean;
  label: string;
  layer: number;
  recipientId: string | null;
}

export interface SigningRequestDetail {
  signingRequestId: string;
  documentId: string;
  documentTitle: string;
  state: SigningRequestState;
  recipients: SigningRequestRecipient[];
  fields: SigningRequestField[];
  createdAt: string;
}

export interface SentResponse {
  signingRequestId: string;
  state: "sent";
  sentAt: string;
  activatedRecipientCount: number;
  waitingRecipientCount: number;
}

class RealSigningRequestService {
  // The body is a deliberately empty/closed schema server-side (recipients
  // and fields are snapshotted from the already-saved preparation, never
  // sent by the client) — but "empty schema" means the route's Typebox
  // schema is `Type.Object({})`, which still requires an actual `{}` on the
  // wire. Omitting the body entirely (as this used to) sends no body at
  // all, which fails Ajv's root "must be object" check with a generic,
  // undiagnosable 422 — reported live as "One or more fields contain
  // invalid values. Expected a value of type object." with no field name,
  // because the error is about the whole request, not a field. `body: {}`
  // is the actual empty-but-present object the schema requires.
  async create(workspaceId: string, documentId: string, idempotencyKey: string): Promise<SigningRequestCreated> {
    return apiRequest<SigningRequestCreated>(
      `/workspaces/${encodeURIComponent(workspaceId)}/documents/${encodeURIComponent(documentId)}/signing-requests`,
      { method: "POST", headers: { "Idempotency-Key": idempotencyKey }, body: {} },
    );
  }

  async get(workspaceId: string, signingRequestId: string): Promise<SigningRequestDetail> {
    return apiRequest<SigningRequestDetail>(
      `/workspaces/${encodeURIComponent(workspaceId)}/signing-requests/${encodeURIComponent(signingRequestId)}`,
    );
  }

  // Pure state-flag flip server-side — no body, no completeness check (that
  // already happened at create()).
  async markReadyToSend(workspaceId: string, signingRequestId: string): Promise<{ state: "ready-to-send" }> {
    return apiRequest(
      `/workspaces/${encodeURIComponent(workspaceId)}/signing-requests/${encodeURIComponent(signingRequestId)}/readiness`,
      { method: "POST" },
    );
  }

  // Same reasoning as create() above — the route's schema is `Type.Object({})`,
  // which requires an actual `{}` on the wire, not an absent body.
  async send(workspaceId: string, signingRequestId: string, idempotencyKey: string): Promise<SentResponse> {
    return apiRequest<SentResponse>(
      `/workspaces/${encodeURIComponent(workspaceId)}/signing-requests/${encodeURIComponent(signingRequestId)}/send`,
      { method: "POST", headers: { "Idempotency-Key": idempotencyKey }, body: {} },
    );
  }

  // Not called from any UI entry point yet this command (no cancel affordance
  // exists in the traced Prepare/Confirmation flow) — included because the
  // route is real and a future command may need it without re-tracing.
  async cancel(workspaceId: string, signingRequestId: string, reason: string): Promise<{ signingRequestId: string; state: "cancelled"; cancelledAt: number }> {
    return apiRequest(
      `/workspaces/${encodeURIComponent(workspaceId)}/signing-requests/${encodeURIComponent(signingRequestId)}/cancel`,
      { method: "POST", body: { reason } },
    );
  }

  // Phase 1-C. Not a JSON call — this URL is meant for a plain <a href> or
  // window.open, so the browser handles the download natively (session
  // cookie included automatically, same-origin via the Netlify /api/*
  // proxy). Not yet called from any UI entry point: the page a completed
  // document's status would naturally appear on (TransactionDetailPage) is
  // still entirely mock-backed, and wiring a real download button onto
  // fabricated transaction data would be incoherent — that page's own
  // migration to real data is a separate, unstarted, undecided scope this
  // does not assume. Included exactly like `cancel()` above, so the route is
  // one call away for whichever future page actually needs it.
  downloadUrl(workspaceId: string, signingRequestId: string): string {
    return `${API_BASE_URL ?? ""}/workspaces/${encodeURIComponent(workspaceId)}`
      + `/signing-requests/${encodeURIComponent(signingRequestId)}/completed-document`;
  }
}

export const realSigningRequestService = new RealSigningRequestService();
