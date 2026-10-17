// Real signing-request service — talks to Lagda-Backend's
// /workspaces/:workspaceId/signing-requests surface. Traced directly against
// current source this command (P2); every shape below is a route contract
// that exists today, nothing invented. See signing-request-routes.ts and
// send-routes.ts.

import { apiRequest, ApiError } from "../api-client";
import { API_BASE_URL } from "../backend-flag";
import { changes } from "../live/topics";

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
  /**
   * The document's title as this request carries it. A second request on a
   * document (a re-send) is numbered by the server, so this is the FINAL
   * title. Absent from an older server.
   */
  documentTitle?: string;
  /** True only when creating this request renamed the document: a re-send. */
  titleAdjusted?: boolean;
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
  /**
   * 109. Set only while every signature is in and the final document is
   * being produced (`completion-ready`): still at it, or stopped. Null
   * otherwise, and absent from an older server.
   */
  completion?: CompletionStatus | null;
}

/** 109. Where producing the final document stands. */
export interface CompletionStatus {
  state: "finalizing" | "failed";
  /** Whether asking for it to be produced again would be taken now. */
  canRetry: boolean;
}

/** 111. What the sender chose for one request's reminders. */
export interface ReminderSettings {
  enabled: boolean;
  /** Whole days from the start of a participant's turn to their first reminder. */
  firstAfterDays: number;
  /** Whole days between one reminder and the next. */
  everyDays: number;
}

/** 111. The request's settings with the server's fixed limits beside them. */
export interface RequestReminders extends ReminderSettings {
  /** Automatic reminders per participant's turn. Always 3 today. */
  maxAutomatic: number;
  /** "Remind now" presses per participant's turn. Always 10 today. */
  maxManualPerTurn: number;
}

/** 111. One participant's reminders, for their current turn. */
export interface SignatoryReminders {
  /** Automatic reminders sent this turn. */
  sentCount: number;
  manualSentCount: number;
  lastSentAt: string | null;
  /** Null: nothing more will be sent. In the past: on the next hourly sweep. */
  nextDueAt: string | null;
}

/** 111. What a new request gets when the sender says nothing; the server's own. */
export const REMINDER_DEFAULTS: ReminderSettings = { enabled: true, firstAfterDays: 3, everyDays: 3 };
export const REMINDER_DAYS_MIN = 1;
export const REMINDER_DAYS_MAX = 30;
/** The server's fixed limit on automatic reminders per turn, for copy written before one is read. */
export const REMINDER_MAX_AUTOMATIC = 3;

/** Whether two reminder settings say the same thing. */
export function sameReminderSettings(a: ReminderSettings, b: ReminderSettings): boolean {
  return a.enabled === b.enabled && a.firstAfterDays === b.firstAfterDays && a.everyDays === b.everyDays;
}

// GET /workspaces/:id/signing-requests/:id/signatures — who signed, and when.
//
// A separate call from get() on purpose, mirroring the backend: that route
// returns the immutable snapshot (who was named, where they sign) and
// carries no ceremony state at all, so progress has its own surface. A
// client is therefore always holding exactly one of "what was agreed" or
// "what has happened since".
// `approved` / `skipped` are an APPROVER's outcomes (backend 069). Leaving
// them out of this union made the participants dialog crash the moment an
// approver acted — it looked up a presentation that did not exist.
export type RecipientWorkflowState =
  | "waiting" | "active" | "signed" | "approved" | "skipped" | "declined";

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
  /** 069. When an approver approved / was skipped. May be absent from an
   *  older backend, hence optional. */
  approvedAt?: string | null;
  skippedAt?: string | null;
  declinedAt: string | null;
  declineReason: string | null;
  /** The name/email of the LAGDA account this recipient signed in as, if any. */
  linkedAccountName: string | null;
  linkedAccountEmail: string | null;
  /**
   * 097. When this person's current signing link stops working. Set only for
   * someone the request is waiting on; null or absent otherwise. A value in
   * the past is a link that no longer works.
   */
  linkExpiresAt?: string | null;
  /** 111. This turn's reminders. Absent from an older server. */
  reminders?: SignatoryReminders;
}


export interface SigningRequestSignatures {
  signingRequestId: string;
  state: SigningRequestState;
  /** REQUIRED participants only — they are what the request waits on.
   *  Counts everyone whose part is DONE: signed, approved or skipped. */
  signedCount: number;
  requiredCount: number;
  signatories: Signatory[];
  /** 109. As on the list row. */
  completion?: CompletionStatus | null;
  /** 111. Absent from an older server. */
  reminders?: RequestReminders;
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
  /**
   * 105. One identity check attempt. `mode: "test"` means it was SIMULATED:
   * nothing was verified, and the entry must never be shown as if it were.
   */
  | {
    kind: "identity-check";
    mode: "test" | "live";
    outcome: "passed" | "failed";
    idType: string | null;
    /**
     * `provider`: checked on the identity verification partner's page.
     * `provider-face`: a face check only, against an earlier verification.
     */
    capture: "camera" | "upload" | "provider" | "provider-face" | null;
    /** Live events only: who checked it, and their reference for the check. */
    provider?: string;
    providerReference?: string;
    /**
     * The full name read from the ID, and how it compares with the
     * document's. `unavailable`: the name could not be read, and there is none.
     */
    verifiedName?: string | null;
    nameMatch?: "match" | "close" | "mismatch" | "accepted" | "unavailable" | null;
    nameDifferences?: string[];
  }
  /** The name read from the ID is not the name on the document. */
  | { kind: "identity-name-mismatch"; verifiedName?: string | null; documentName?: string | null }
  /** The sender accepted that the two names are the same person. */
  | { kind: "identity-name-accepted"; verifiedName?: string | null; documentName?: string | null; reason?: string | null }
  /** 105. The sender let a participant continue without the identity check. */
  | { kind: "identity-check-waived"; reason: string | null }
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
    return changes("documents", apiRequest<SigningRequestCreated>(
      `/workspaces/${encodeURIComponent(workspaceId)}/documents/${encodeURIComponent(documentId)}/signing-requests`,
      { method: "POST", headers: { "Idempotency-Key": idempotencyKey }, body: {} },
    ));
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

  // Always a body object (the route requires one). `shareFinalCopy` (073):
  // email every participant the final signed copy on completion — the
  // server's default is yes, so only an explicit `false` changes anything.
  // `reminders` (111) likewise: sent only when the caller passes it, and the
  // server reads a missing member as its default (on, 3 days, 3 days). What
  // is not sent is not in the idempotency fingerprint either, so a send that
  // keeps every default is the same request it always was.
  async send(
    workspaceId: string, signingRequestId: string, idempotencyKey: string,
    options: { shareFinalCopy?: boolean; reminders?: Partial<ReminderSettings> } = {},
  ): Promise<SentResponse> {
    // The documents list (and its counts) change the moment this lands.
    return changes("documents", apiRequest<SentResponse>(
      `/workspaces/${encodeURIComponent(workspaceId)}/signing-requests/${encodeURIComponent(signingRequestId)}/send`,
      {
        method: "POST", headers: { "Idempotency-Key": idempotencyKey },
        body: {
          ...(options.shareFinalCopy === false ? { shareFinalCopy: false } : {}),
          ...(options.reminders === undefined ? {} : { reminders: options.reminders }),
        },
      },
    ));
  }

  /**
   * Sets the request's deadline, or clears it with null. The server takes it
   * only while the request is out for signing (sent, or partly signed), and
   * only as a future instant; it then expires the request itself.
   */
  async setExpiry(workspaceId: string, signingRequestId: string, expiresAt: string | null): Promise<{ expiresAt: string | null }> {
    return changes("documents", apiRequest<{ expiresAt: string | null }>(
      `/workspaces/${encodeURIComponent(workspaceId)}/signing-requests/${encodeURIComponent(signingRequestId)}/expiry`,
      { method: "PUT", body: { expiresAt } },
    ));
  }

  /**
   * Sends one participant a new signing link on the SAME request (097). The
   * link they had stops working; nothing else about the request changes.
   */
  async reissueLink(workspaceId: string, signingRequestId: string, recipientId: string): Promise<{ recipientId: string; linkExpiresAt: string }> {
    return changes("documents", apiRequest<{ recipientId: string; linkExpiresAt: string }>(
      `/workspaces/${encodeURIComponent(workspaceId)}/signing-requests/${encodeURIComponent(signingRequestId)}`
      + `/recipients/${encodeURIComponent(recipientId)}/reissue-link`,
      { method: "POST", body: {} },
    ));
  }

  /**
   * 109. Asks for the final document to be produced again, for a request
   * whose every signature is in and whose finalization stopped. Asking while
   * it is already under way is answered `restarted: false`, not refused.
   * Refused with 409 `signing_completion_not_retryable`; hidden (404) from a
   * member who may not send.
   */
  async retryCompletion(workspaceId: string, signingRequestId: string): Promise<{
    signingRequestId: string; restarted: boolean; completion: CompletionStatus;
  }> {
    return changes("documents", apiRequest(
      `/workspaces/${encodeURIComponent(workspaceId)}/signing-requests/${encodeURIComponent(signingRequestId)}/completion/retry`,
      { method: "POST", body: {} },
    ));
  }

  /**
   * 111. Switches a sent request's reminders on or off, or changes the days.
   * Only while it is out for signing and before its deadline: 409
   * `signing_reminders_not_configurable` otherwise, 422
   * `reminder_settings_invalid` for a day outside 1–30.
   */
  async setReminders(
    workspaceId: string, signingRequestId: string,
    settings: { enabled: boolean; firstAfterDays?: number; everyDays?: number },
  ): Promise<{ signingRequestId: string; reminders: ReminderSettings }> {
    return changes("documents", apiRequest(
      `/workspaces/${encodeURIComponent(workspaceId)}/signing-requests/${encodeURIComponent(signingRequestId)}/reminders`,
      { method: "PUT", body: settings },
    ));
  }

  /**
   * 111. Reminds one participant now. Refused with 409
   * `signing_reminder_not_sendable`, whose `details[0].code` says why.
   */
  async remind(workspaceId: string, signingRequestId: string, recipientId: string): Promise<{
    recipientId: string; sentAt: string; manualSentCount: number;
  }> {
    return apiRequest(
      `/workspaces/${encodeURIComponent(workspaceId)}/signing-requests/${encodeURIComponent(signingRequestId)}`
      + `/recipients/${encodeURIComponent(recipientId)}/remind`,
      { method: "POST", body: {} },
    );
  }

  // Not called from any UI entry point yet this command (no cancel affordance
  // exists in the traced Prepare/Confirmation flow) — included because the
  // route is real and a future command may need it without re-tracing.
  async cancel(workspaceId: string, signingRequestId: string, reason: string): Promise<{ signingRequestId: string; state: "cancelled"; cancelledAt: number }> {
    return changes("documents", apiRequest(
      `/workspaces/${encodeURIComponent(workspaceId)}/signing-requests/${encodeURIComponent(signingRequestId)}/cancel`,
      { method: "POST", body: { reason } },
    ));
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

  // The SIGNED document, as a blob, for the in-app viewer. The same route as
  // `downloadUrl` (completed-document, Content-Disposition attachment); read
  // with the session cookie so the viewer can draw it instead of the browser
  // saving it. Only a completed request has one.
  async completedDocumentBlob(workspaceId: string, signingRequestId: string): Promise<Blob> {
    if (!API_BASE_URL) {
      throw new Error("completedDocumentBlob called with no VITE_API_BASE_URL configured.");
    }
    const response = await fetch(this.downloadUrl(workspaceId, signingRequestId),
      { method: "GET", credentials: "include", cache: "no-store" });
    if (!response.ok) {
      throw new ApiError(response.status, undefined, "Could not load the signed document.");
    }
    return response.blob();
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
      // The same URL serves whatever file is CURRENTLY behind the document,
      // and a replaced file keeps its document id. Never let a browser or
      // proxy cache answer with the previous upload's bytes.
      { method: "GET", credentials: "include", cache: "no-store" },
    );
    if (!response.ok) {
      throw new ApiError(response.status, undefined, "Could not load the document.");
    }
    return response.blob();
  }
}

export const realSigningRequestService = new RealSigningRequestService();
