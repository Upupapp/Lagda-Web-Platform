// Real signing-request service — talks to Lagda-Backend's
// /workspaces/:workspaceId/signing-requests surface. Traced directly against
// current source this command (P2); every shape below is a route contract
// that exists today, nothing invented. See signing-request-routes.ts and
// send-routes.ts.

import { apiRequest, ApiError } from "../api-client";
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

// GET /workspaces/:workspaceId/signing-requests — the workspace's own
// documents list, backed by real data. Traced against
// signing-request-routes.ts's `present`/list handler: exactly these fields,
// with the same nullable-timestamp convention (null stays null, never "").
export interface SigningRequestListItem {
  signingRequestId: string;
  documentId: string;
  documentTitle: string;
  state: SigningRequestState;
  participantCount: number;
  completedParticipantCount: number;
  /**
   * Who sent it — a workspace member, not a recipient.
   *
   * Null when that account has since been removed: the request is the
   * workspace's record and outlives its sender, so the row stays and only the
   * attribution degrades.
   */
  initiator: { name: string; email: string } | null;
  createdAt: string;
  sentAt: string | null;
  completedAt: string | null;
  expiresAt: string | null;
}

// GET /workspaces/:id/signing-requests/:id/signatures — who signed, and when.
//
// A separate call from get() on purpose, mirroring the backend: that route
// returns the immutable snapshot (who was named, where they sign) and
// carries no ceremony state at all, so progress has its own surface. A
// client is therefore always holding exactly one of "what was agreed" or
// "what has happened since".
export type RecipientWorkflowState = "waiting" | "active" | "signed" | "declined";

export interface Signatory {
  recipientId: string;
  name: string;
  email: string;
  organization: string | null;
  type: string;
  isRequired: boolean;
  routingOrder: number;
  state: RecipientWorkflowState;
  /** The instant they signed. Null unless `state` is "signed". */
  signedAt: string | null;
  declinedAt: string | null;
  declineReason: string | null;
  /** The name/email of the LAGDA account this recipient signed in as, if any. */
  linkedAccountName: string | null;
  linkedAccountEmail: string | null;
}

export interface SigningRequestSignatures {
  signingRequestId: string;
  state: SigningRequestState;
  /** REQUIRED participants only — they are what the request waits on. */
  signedCount: number;
  requiredCount: number;
  signatories: Signatory[];
}

export interface SigningRequestListResult {
  items: SigningRequestListItem[];
  total: number;
  page: number;
  perPage: number;
  hasNextPage: boolean;
}

// ── Audit trail ──────────────────────────────────────────────────────────────
// GET .../signing-requests/:id/audit. Read-only by construction — the backend
// route file forbids ever adding a write verb — and keyed by ONE request: there
// is no workspace-wide event feed, so a page wanting "recent activity" across
// documents would need one call per document, and does not get one here.
//
// Mirrors the closed response schema in audit-routes.ts. The actor carries a
// recipientId only for recipients; a workspace user's id is deliberately never
// on the wire.

export type AuditActorType = "workspace-user" | "recipient" | "system";

export interface AuditActor {
  type: AuditActorType;
  displayName: string;
  recipientId?: string;
}

export type AuditDetails =
  | { kind: "authentication"; method: string }
  | { kind: "consent"; consentType: string; consentVersion: string }
  | { kind: "none" };

export interface AuditEntry {
  id: string;
  type: string;
  eventVersion: number;
  /** ISO-8601. */
  occurredAt: string;
  actor: AuditActor;
  description: string;
  details: AuditDetails;
}

export interface AuditTrail {
  signingRequestId: string;
  state: string;
  /** Chronological, as the backend emits it. */
  entries: AuditEntry[];
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

  /**
   * The workspace's signing requests, newest first.
   *
   * `q`, `states` and `signer` are matched on the SERVER, across every
   * request rather than the page in hand, and `total` counts the matches.
   * `signer` filters by recipient name or email without returning either.
   */
  async list(workspaceId: string, params?: {
    page?: number; perPage?: number;
    q?: string; states?: readonly SigningRequestState[]; signer?: string;
  }): Promise<SigningRequestListResult> {
    const query = new URLSearchParams();
    if (params?.page !== undefined) query.set("page", String(params.page));
    if (params?.perPage !== undefined) query.set("perPage", String(params.perPage));
    const q = params?.q?.trim();
    if (q) query.set("q", q);
    if (params?.states !== undefined && params.states.length > 0) query.set("state", params.states.join(","));
    const signer = params?.signer?.trim();
    if (signer) query.set("signer", signer);
    const qs = query.toString();
    return apiRequest<SigningRequestListResult>(
      `/workspaces/${encodeURIComponent(workspaceId)}/signing-requests${qs ? `?${qs}` : ""}`,
    );
  }

  async get(workspaceId: string, signingRequestId: string): Promise<SigningRequestDetail> {
    return apiRequest<SigningRequestDetail>(
      `/workspaces/${encodeURIComponent(workspaceId)}/signing-requests/${encodeURIComponent(signingRequestId)}`,
    );
  }

  async audit(workspaceId: string, signingRequestId: string): Promise<AuditTrail> {
    return apiRequest<AuditTrail>(
      `/workspaces/${encodeURIComponent(workspaceId)}/signing-requests/${encodeURIComponent(signingRequestId)}/audit`,
    );
  }

  async signatures(workspaceId: string, signingRequestId: string): Promise<SigningRequestSignatures> {
    return apiRequest<SigningRequestSignatures>(
      `/workspaces/${encodeURIComponent(workspaceId)}/signing-requests/${encodeURIComponent(signingRequestId)}/signatures`,
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

  // Viewing a document's own bytes, at any state (not just completed) — the
  // owner-facing counterpart to the recipient ceremony's
  // fetchRecipientDocumentBlob(). Same reasoning: a Blob is what
  // URL.createObjectURL()+<iframe> needs, and apiRequest() is JSON-only, so
  // this bypasses it for a raw credentialed fetch. Backend route is
  // GET /workspaces/:workspaceId/documents/:documentId/content
  // (document-routes.ts) — absent (404) when no object storage is
  // configured in this deployment, same "route doesn't exist" convention as
  // the completed-document download above.
  async documentContentBlob(workspaceId: string, documentId: string): Promise<Blob> {
    if (!API_BASE_URL) {
      throw new Error("documentContentBlob called with no VITE_API_BASE_URL configured.");
    }
    const response = await fetch(
      `${API_BASE_URL}/workspaces/${encodeURIComponent(workspaceId)}`
      + `/documents/${encodeURIComponent(documentId)}/content`,
      { method: "GET", credentials: "include" },
    );
    if (!response.ok) {
      throw new ApiError(response.status, undefined, "Could not load the document.");
    }
    return response.blob();
  }
}

export const realSigningRequestService = new RealSigningRequestService();
