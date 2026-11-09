// Notary on-ramp: a client asks a listed notary to take a request, and the
// notary opens the invitation, proves who they are, and accepts or declines,
// naming a fee. The client pays the notary directly by the notary's own payment
// QR and sends the transfer's reference; the notary confirms from their own bank
// or e-wallet app. LAGDA never holds the money. No video, no document yet.
//
// Workspace realm (apiRequest), about the PERSON: every route is under `/me`,
// except the one public lookup the notary's landing page makes before signing in.
//
// ── The feature may be off ─────────────────────────────────────────────────
//
// Both switches are off by default and a switched-off server answers 404 on
// every route here. `list` and `desk` answer `null` for that, so navigation
// and the directory can ask without ever showing an error.
//
// All API access for this feature is in this file and notary-applications.service.ts,
// so a change of path or shape is made in one place.

import { apiRequest, apiUpload, ApiError } from "../api-client";
import { API_BASE_URL } from "../backend-flag";

export type InvitationStatus = "awaiting" | "claimed" | "accepted" | "declined" | "expired" | "revoked";

export interface InvitationNotary {
  directoryId: string;
  name: string;
  /**
   * The notary's name as their valid ID reads, from LAGDA's identity check when they took the request (never typed by
   * them). Null before a notary takes it; absent from an older server.
   */
  verifiedName?: string | null;
  firm: string;
  city: string;
  province: string;
  /** The server already has an email for this notary: the client may not add one. */
  emailOnRecord: boolean;
  /** The notary has a verified, approved account: they are told in LAGDA. */
  accountKnown: boolean;
}

export interface InvitationTimelineEntry {
  at: string;
  code: string;
  text: string;
}

export type PaymentStatus = "awaiting" | "proof" | "confirmed" | "not_received" | "waived";

/** What the client sees of the fee. The QR's text is present only while there is something to pay. */
export interface InvitationPayment {
  status: PaymentStatus;
  /** Whole centavos. 0 with status "waived": the notary charges nothing. */
  amountCentavos: number;
  payee: { name: string; city: string | null } | null;
  qrPayload: string | null;
  reference: string | null;
  attemptsLeft: number;
  requestedAt: string;
  proofAt: string | null;
  decidedAt: string | null;
  /** The notary's short note when the payment was not received. */
  note: string | null;
}

/** What the notary sees of the same fee: never the QR, which is theirs. */
export interface DeskPayment {
  status: PaymentStatus;
  amountCentavos: number;
  reference: string | null;
  attemptsLeft: number;
  proofAt: string | null;
  decidedAt: string | null;
}

/** The notary's own payment QR, as the server read it. */
export interface PaymentProfile {
  payeeName: string;
  payeeCity: string | null;
  qrPayload: string;
  updatedAt: string;
}

/** What the client asked for: the act, the kind of document and where they will be (the Philippines only for now). */
export interface RequestDetails {
  actWanted: string;
  actWantedLabel: string;
  documentKind: string;
  documentLabel: string;
  /** A notice for a kind of document that may need more than a remote notarization. */
  documentNote: string | null;
  city: string;
  province: string;
  usedAbroad: boolean;
}

/** When the client wants the notary (130): right now (answered within 15 minutes), a booked 30-minute time, or neither (older requests). */
export type BookingKind = "standard" | "now" | "scheduled";
export interface RequestBooking {
  kind: BookingKind;
  /** The booked time's start; only for a booking. */
  at: string | null;
  /** By when the notary is asked to answer; only for "right now". */
  answerBy: string | null;
}

/** 131. The PDF the client attached to a request, for the notary to read before the call. */
export interface RequestDocument {
  name: string;
  /** Bytes. */
  size: number;
  addedAt: string;
}

export interface Invitation {
  id: string;
  /** 131. The PDF attached to the request; null: none. Absent from an older server. */
  document?: RequestDocument | null;
  /** 131. Why the notary declined, as they gave it. Absent from an older server. */
  declineReason?: string | null;
  /** When the client wants the notary. Absent from an older server. */
  booking?: RequestBooking | null;
  /** The request's number, EN-2026-000004. Absent from an older server. */
  reference?: string | null;
  /** What the client asked for. Null on a request made before it was asked. */
  details?: RequestDetails | null;
  /** The room this request became, if it has begun. */
  session?: { id: string; status: "preparing" | "live" | "notarized" | "cancelled"; hasDocument: boolean } | null;
  status: InvitationStatus;
  notary: InvitationNotary;
  notaryEmail: string | null;
  /** The secret link. Null once the invitation is no longer awaiting. */
  link: string | null;
  createdAt: string;
  expiresAt: string;
  /** Counted by the server when it answered; the page counts down from it. */
  secondsLeft: number;
  claimedAt: string | null;
  decidedAt: string | null;
  /** The fee of an accepted request; null before a notary accepts. */
  payment?: InvitationPayment | null;
  timeline: InvitationTimelineEntry[];
}

/** An invitation can still be acted on (revoked, or waiting for the notary). */
export function invitationIsOpen(status: InvitationStatus): boolean {
  return status === "awaiting" || status === "claimed";
}

export type PublicLookupState = "open" | "expired" | "revoked" | "used" | "unknown";

export interface PublicLookup {
  state: PublicLookupState;
  /** Only when the state is open. */
  notaryName?: string;
  expiresAt?: string;
}

export type NotaryApplicationStatus = "none" | "draft" | "submitted" | "approved" | "rejected" | "withdrawn" | "expired";

export interface ClaimResult {
  invitation: Invitation;
  notary: { applicationStatus: NotaryApplicationStatus; canAccept: boolean };
}

export interface DeskRequest {
  id: string;
  /** 131. The PDF the client attached to the request. Absent from an older server. */
  document?: RequestDocument | null;
  booking?: RequestBooking | null;
  details?: RequestDetails | null;
  status: InvitationStatus;
  client: { name: string; identityVerified: boolean };
  receivedAt: string;
  expiresAt: string;
  secondsLeft: number;
  decidedAt: string | null;
  payment?: DeskPayment | null;
  /** The request's number, EN-2026-000004. Absent from an older server. */
  reference?: string | null;
  /** The room this request became. */
  session?: { id: string; status: "preparing" | "live" | "notarized" | "cancelled"; hasDocument: boolean } | null;
  /** What the case holds once there is a room. */
  case?: {
    documentName: string | null; actLabel: string | null; feeCentavos: number | null;
    copy: { status: string; mode: "digital" | "physical"; stage: string | null } | null;
  } | null;
}

/** A request sent to this notary's own listing that they have not taken yet. */
export interface DeskIncoming {
  id: string;
  /** 131. The PDF the client attached to the request. Absent from an older server. */
  document?: RequestDocument | null;
  booking?: RequestBooking | null;
  details?: RequestDetails | null;
  client: { name: string; identityVerified: boolean };
  receivedAt: string;
  expiresAt: string;
  secondsLeft: number;
}

export interface NotaryDesk {
  /** Requests addressed to this notary's listing, waiting to be taken. Absent from an older server. */
  incoming?: DeskIncoming[];
  /** 130. Requests to this notary's listing that ran out before they were taken, the last seven days. Absent from an older server. */
  missed?: DeskIncoming[];
  applicationStatus: NotaryApplicationStatus;
  canAccept: boolean;
  /** The payee a client would pay; null while the notary has saved no QR. */
  paymentProfile?: { payeeName: string; payeeCity: string | null } | null;
  requests: DeskRequest[];
}

/** 100 pesos is the smallest fee; 50,000 the largest. The server enforces both. */
export const FEE_MIN_PESOS = 1;
export const FEE_MAX_PESOS = 50_000;

/** `1,500.00`: pesos with thousands separators and two decimals, from whole centavos. */
export function formatPesos(centavos: number): string {
  const pesos = Math.floor(centavos / 100);
  const rest = String(centavos % 100).padStart(2, "0");
  return `${String(pesos).replace(/\B(?=(\d{3})+(?!\d))/g, ",")}.${rest}`;
}

/**
 * Whole centavos from what a person typed as pesos ("1500", "1,500.50"), or null
 * when it is not a sum of money the server would take. "" and "0" are 0: no fee.
 */
export function parsePesos(text: string): number | null {
  const cleaned = text.trim().replace(/^(php|₱)\s*/i, "").replace(/,/g, "");
  if (cleaned === "") return null;
  if (!/^\d{1,6}(\.\d{1,2})?$/.test(cleaned)) return null;
  const centavos = Math.round(Number(cleaned) * 100);
  if (centavos === 0) return 0;
  return centavos >= FEE_MIN_PESOS * 100 && centavos <= FEE_MAX_PESOS * 100 ? centavos : null;
}

/** The error code the server gave, or "" for anything that is not a structured refusal. */
export function errorCode(error: unknown): string {
  return error instanceof ApiError ? error.body?.code ?? "" : "";
}

export function errorStatus(error: unknown): number {
  return error instanceof ApiError ? error.status : -1;
}

/** Reads one string from the extra properties a refusal may carry. */
function extra(error: unknown, key: string): string | null {
  if (!(error instanceof ApiError) || error.body === undefined) return null;
  const bag = error.body as unknown as Record<string, unknown>;
  const direct = bag[key];
  if (typeof direct === "string" && direct !== "") return direct;
  const detail = error.body.details?.find(item => item.field === key);
  return detail !== undefined && detail.message !== "" ? detail.message : null;
}

/** The id the server returns with 409 `enotary_invitation_open`, when it does. */
export function existingInvitationId(error: unknown): string | null {
  return extra(error, "invitationId") ?? extra(error, "id");
}

/** The lookup state a refused claim carries (`enotary_invitation_unavailable`), when it does. */
export function refusedState(error: unknown): PublicLookupState | null {
  const state = extra(error, "state");
  return state === "open" || state === "expired" || state === "revoked" || state === "used" || state === "unknown"
    ? state : null;
}

async function orNull<T>(request: Promise<T>): Promise<T | null> {
  try {
    return await request;
  } catch (error) {
    if (errorStatus(error) === 404 && errorCode(error) !== "enotary_notary_not_listed") return null;
    throw error;
  }
}

class RealEnotaryInvitationsService {
  /** The client's invitations, newest first. `null`: the feature is not offered. */
  async list(): Promise<Invitation[] | null> {
    const answer = await orNull(apiRequest<{ invitations: Invitation[] }>("/me/enotary/invitations"));
    return answer === null ? null : answer.invitations;
  }

  async get(id: string): Promise<Invitation | null> {
    const answer = await orNull(apiRequest<{ invitation: Invitation } | Invitation>(`/me/enotary/invitations/${encodeURIComponent(id)}`));
    if (answer === null) return null;
    return "invitation" in answer ? answer.invitation : answer;
  }

  /**
   * Asks a listed notary. 403 `client_identity_required`, 404
   * `enotary_notary_not_listed`, 409 `enotary_invitation_open` |
   * `enotary_invitation_limit`, 422 `notary_email_not_allowed`.
   */
  async create(directoryId: string, notaryEmail?: string): Promise<Invitation> {
    const body: { directoryId: string; notaryEmail?: string } = { directoryId };
    if (notaryEmail !== undefined && notaryEmail.trim() !== "") body.notaryEmail = notaryEmail.trim();
    const answer = await apiRequest<{ invitation: Invitation }>("/me/enotary/invitations", { method: "POST", body });
    return answer.invitation;
  }

  /** 131. Attaches (or replaces) the PDF to be notarized. 422 `session_document_rejected` says what is wrong with it. */
  async attachDocument(id: string, file: File): Promise<RequestDocument | null> {
    const form = new FormData();
    form.append("file", file, file.name);
    return (await apiUpload<{ document: RequestDocument | null }>(`/me/enotary/requests/${encodeURIComponent(id)}/document`, form)).document;
  }

  /** 131. Takes the attached PDF off the request. */
  async removeDocument(id: string): Promise<void> {
    await apiRequest(`/me/enotary/requests/${encodeURIComponent(id)}/document`, { method: "DELETE" });
  }

  /** 131. The attached PDF itself, for the client or the notary. */
  async document(id: string): Promise<Blob> {
    if (API_BASE_URL === null || API_BASE_URL === "") throw new ApiError(0, undefined, "No server is configured.");
    let response: Response;
    try {
      response = await fetch(`${API_BASE_URL}/me/enotary/requests/${encodeURIComponent(id)}/document`, { credentials: "include" });
    } catch {
      throw new ApiError(0, undefined, "Could not reach the server. Check your connection and try again.");
    }
    if (!response.ok) throw new ApiError(response.status, undefined, `Request failed with status ${String(response.status)}.`);
    return response.blob();
  }

  async revoke(id: string): Promise<Invitation> {
    const answer = await apiRequest<{ invitation: Invitation } | Invitation>(
      `/me/enotary/invitations/${encodeURIComponent(id)}/revoke`, { method: "POST" });
    return "invitation" in answer ? answer.invitation : answer;
  }

  /** A NEW invitation with a new link; the old one stays as history. */
  async renew(id: string): Promise<Invitation> {
    const answer = await apiRequest<{ invitation: Invitation }>(
      `/me/enotary/invitations/${encodeURIComponent(id)}/renew`, { method: "POST" });
    return answer.invitation;
  }

  async setNotaryEmail(id: string, email: string): Promise<Invitation> {
    const answer = await apiRequest<{ invitation: Invitation } | Invitation>(
      `/me/enotary/invitations/${encodeURIComponent(id)}/notary-email`, { method: "PUT", body: { email: email.trim() } });
    return "invitation" in answer ? answer.invitation : answer;
  }

  /** Public, no session. Anything the server does not recognise is `unknown`. */
  async lookup(token: string): Promise<PublicLookup> {
    return apiRequest<PublicLookup>(`/public/enotary/invitations/lookup?token=${encodeURIComponent(token)}`);
  }

  /**
   * The notary opens an invitation. 404 | 410 `enotary_invitation_unavailable`,
   * 409 `identity_required` | `notary_name_mismatch`.
   */
  async claim(token: string): Promise<ClaimResult> {
    return apiRequest<ClaimResult>("/me/enotary/invitations/claim", { method: "POST", body: { token } });
  }

  /** Takes a request addressed to this notary's listing, without the link. Same refusals as `claim`. */
  async take(invitationId: string): Promise<ClaimResult> {
    return apiRequest<ClaimResult>(`/me/notary/requests/${encodeURIComponent(invitationId)}/take`, { method: "POST" });
  }

  /** The notary's desk. `null`: the feature is not offered. */
  async desk(): Promise<NotaryDesk | null> {
    return orNull(apiRequest<NotaryDesk>("/me/notary/desk"));
  }

  /**
   * 409 `notary_not_approved` | `enotary_invitation_unavailable` | `payment_profile_required`,
   * 422 for a fee the server does not take. `feeCentavos` is 0 for no fee.
   */
  async accept(id: string, feeCentavos?: number): Promise<void> {
    await apiRequest<unknown>(`/me/notary/requests/${encodeURIComponent(id)}/accept`, {
      method: "POST", body: feeCentavos === undefined ? {} : { feeCentavos },
    });
  }

  /** The notary's own payment QR. */
  async paymentProfile(): Promise<PaymentProfile | null> {
    const answer = await apiRequest<{ profile: PaymentProfile | null }>("/me/notary/payment-profile");
    return answer.profile;
  }

  /** The text of a QR the page decoded from a picture. 422 `payment_qr_invalid` says why not. */
  async savePaymentProfile(qrPayload: string): Promise<PaymentProfile> {
    const answer = await apiRequest<{ profile: PaymentProfile }>("/me/notary/payment-profile", {
      method: "PUT", body: { qrPayload },
    });
    return answer.profile;
  }

  async removePaymentProfile(): Promise<void> {
    await apiRequest<unknown>("/me/notary/payment-profile", { method: "DELETE" });
  }

  /** The client gives the transfer's reference. 422 for a reference that cannot be one, 409 `payment_state`. */
  /** The client says they paid: the transfer's reference and a screenshot of the receipt (124), both required. */
  async sendPaymentProof(id: string, reference: string, screenshot: { mediaType: "image/png" | "image/jpeg"; image: string }): Promise<Invitation> {
    const answer = await apiRequest<{ invitation: Invitation }>(
      `/me/enotary/invitations/${encodeURIComponent(id)}/payment-proof`, { method: "POST", body: { reference, screenshot } });
    return answer.invitation;
  }

  /** 124. The screenshot sent with the latest proof: for the client who sent it and the notary of the request. */
  async paymentScreenshot(id: string): Promise<Blob | null> {
    const base = API_BASE_URL ?? "";
    const response = await fetch(`${base}/me/enotary/invitations/${encodeURIComponent(id)}/payment-proof/screenshot`, { credentials: "include" });
    if (response.status === 404) return null;
    if (!response.ok) throw new Error(`Request failed with status ${String(response.status)}.`);
    return response.blob();
  }

  /** The notary, having looked in their own app, confirms the money came. */
  async confirmPayment(id: string): Promise<void> {
    await apiRequest<unknown>(`/me/notary/requests/${encodeURIComponent(id)}/payment/confirm`, { method: "POST", body: {} });
  }

  /** …or says it did not, with an optional short note for the client. */
  async paymentNotReceived(id: string, note?: string): Promise<void> {
    const body: { note?: string } = {};
    if (note !== undefined && note.trim() !== "") body.note = note.trim().slice(0, 120);
    await apiRequest<unknown>(`/me/notary/requests/${encodeURIComponent(id)}/payment/not-received`, { method: "POST", body });
  }

  async decline(id: string, reason?: string): Promise<void> {
    const body: { reason?: string } = {};
    if (reason !== undefined && reason.trim() !== "") body.reason = reason.trim().slice(0, 120);
    await apiRequest<unknown>(`/me/notary/requests/${encodeURIComponent(id)}/decline`, { method: "POST", body });
  }
}

export const realEnotaryInvitationsService = new RealEnotaryInvitationsService();

/** Why a client's action failed, in plain words. */
export function describeInvitationError(error: unknown): string {
  const code = errorCode(error);
  const status = errorStatus(error);
  if (status === 0) return "Could not reach the server. Check your connection and try again.";
  if (status === 401) return "Your session has ended. Sign in again to continue.";
  if (status === 429) return "Too many tries in a short time. Wait a minute, then try again.";
  if (code === "client_identity_required") return "Verify your identity first. Your request is sent once your account shows as verified.";
  if (code === "enotary_notary_not_listed") return "That notary is not listed in the Notary Directory.";
  if (code === "enotary_invitation_open") return "You already have an open request for this notary.";
  if (code === "enotary_invitation_limit") return "You already have 3 open requests. Revoke one, or wait for it to end, then try again.";
  if (code === "notary_email_not_allowed") return "LAGDA already has a way to reach this notary, so an email address is not needed.";
  if (code === "enotary_invitation_unavailable") return "This request has already ended.";
  if (status === 422 || status === 400) return "That email address was not accepted. Check it and try again.";
  return "That could not be done right now. Please try again.";
}

/** Why a payment action failed, in plain words. */
export function describePaymentError(error: unknown): string {
  const code = errorCode(error);
  const status = errorStatus(error);
  if (status === 0) return "Could not reach the server. Check your connection and try again.";
  if (status === 401) return "Your session has ended. Sign in again to continue.";
  if (status === 429) return "Too many tries in a short time. Wait a minute, then try again.";
  if (code === "payment_profile_required") return "Save your payment QR first, so the client knows where to pay.";
  if (code === "payment_state") return "That payment has already moved on. Reload the page to see where it stands.";
  if (code === "payment_qr_invalid") {
    const detail = error instanceof ApiError ? error.body?.details?.find(item => item.field === "qrPayload") : undefined;
    return detail !== undefined && detail.message !== "" ? detail.message : "That is not a payment QR the server can use.";
  }
  if (code === "notary_not_approved") return "Your application is not approved, or your commission has ended, so you cannot answer requests.";
  if (code === "enotary_invitation_unavailable") return "That request is no longer open.";
  if (status === 422) return "That was not accepted. Check what you entered and try again.";
  return "That could not be done right now. Please try again.";
}
