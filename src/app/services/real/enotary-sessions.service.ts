// Notary sessions: the room where a client and their notary meet, the act the
// notary records, and the certified true copies the client may ask for after.
//
// Workspace realm (apiRequest), about the PERSON: every route is under `/me`,
// except the public check of a verification code.
//
// The video itself is not here: the browsers carry it to each other directly.
// What passes through the server is the set-up (offers, answers, candidates),
// the chat, and the document, which is private to the two parties.
//
// The feature may be off. A switched-off server answers 404 on every route, and
// `lookup` answers `null` for that so a page can ask without showing an error.

import { apiRequest, apiUpload, ApiError } from "../api-client";
import { API_BASE_URL } from "../backend-flag";
import { errorCode, errorStatus } from "./enotary-invitations.service";

export type SessionStatus = "preparing" | "live" | "notarized" | "cancelled";
export type SessionRole = "client" | "notary";
export type ActType = "acknowledgment" | "jurat" | "signature_witnessing";
export type NotarizeBlock =
  | "not_live" | "no_document" | "not_final" | "no_identity" | "no_act" | "not_approved" | "unpaid" | "no_consent" | "client_absent";
export type SessionPaymentStatus = "awaiting" | "proof" | "confirmed" | "not_received" | "waived";
export type CtcStatus = "requested" | "quoted" | "payment_sent" | "paid" | "fulfilled" | "received" | "declined" | "cancelled";
export type CtcMode = "digital" | "physical";

/** What the notary stated, and whether the client has approved it. */
export interface SessionStatement {
  actType: ActType; actTypeLabel: string; feeCentavos: number; note: string; statedAt: string; approvedAt: string | null;
}

/** The fee as the room shows it: the client's carries the notary's QR, the notary's does not. */
export interface SessionPayment {
  status: SessionPaymentStatus; amountCentavos: number; reference: string | null; attemptsLeft: number;
  proofAt: string | null; decidedAt: string | null; note: string | null;
  payee: { name: string; city: string | null } | null; qrPayload: string | null;
}

export interface Session {
  id: string;
  /** The number of the request: EN-2026-000004. Absent from an older server. */
  reference?: string | null;
  invitationId: string;
  role: SessionRole;
  status: SessionStatus;
  notaryName: string;
  clientName: string;
  createdAt: string;
  openedAt: string | null;
  endedAt: string | null;
  document: { name: string; size: number; sha256: string; addedAt: string } | null;
  consent: { text: string; version: string; at: string | null };
  attestations: { key: string; text: string }[];
  presence: { client: boolean; notary: boolean };
  notarizeBlock: NotarizeBlock | null;
  /** Absent from an older server: the order before the 13 October pages. */
  finalizedAt?: string | null;
  identityConfirmedAt?: string | null;
  statement?: SessionStatement | null;
  payment?: SessionPayment | null;
  act: { type: ActType; typeLabel: string; description: string; place: string; at: string; registerRef: string; docNo?: number; pageNo?: number; bookNo?: string; series?: number; notaryName: string } | null;
  notarized: { size: number; sha256: string; originalSha256: string; code: string; verifyUrl: string } | null;
  cancelledBy: SessionRole | null;
  pilotNotice: string;
}

export interface AuditEntry { at: string; code: string; text: string; by: "client" | "notary" | "system"; actor: string }
export interface AuditTrail { reference: string | null; clientName: string; notaryName: string; role: SessionRole; entries: AuditEntry[] }

export interface SessionLookup {
  session: Session | null;
  canStart: boolean;
  reason: "not_accepted" | "payment_pending" | null;
}

export interface RoomMessage { id: string; role: SessionRole; body: string; sentAt: string }
export type SignalKind = "join" | "offer" | "answer" | "candidate" | "hangup";
export interface RoomSignal { seq: number; from: SessionRole; kind: SignalKind; connectionId: string; payload: string }
export interface IceServer { urls: string | string[]; username?: string; credential?: string }

export type ShipmentStage = "prepared" | "handed" | "in_transit" | "out_for_delivery" | "delivered";

/** One notarized document in the notary's register. */
export interface RegisterEntry {
  sessionId: string; invitationId: string; reference: string | null;
  docNo: number; pageNo: number; bookNo: string; series: number; registerRef: string;
  notarizedAt: string; clientName: string; documentName: string; actLabel: string; feeCentavos: number | null;
  documentKindLabel?: string | null; clientPlace?: string | null; clientIdType?: string | null; remarks?: string | null;
  copy: { status: CtcStatus; mode: CtcMode; stage: ShipmentStage | null; trackingNo: string | null } | null;
}

export interface NotaryRegister {
  notaryName: string; commissionNo: string | null; commissionValidUntil: string | null; place: string | null;
  entries: RegisterEntry[];
}

export interface CertifiedCopy {
  id: string;
  sessionId: string;
  status: CtcStatus;
  mode: CtcMode;
  copies: number;
  delivery: { name: string; phone: string; address: string } | null;
  feeCentavos: number | null;
  payee: { name: string; city: string | null } | null;
  qrPayload: string | null;
  reference: string | null;
  shipment: { courier: string; trackingNo: string } | null;
  /** Where a printed copy is on its way. Absent from an older server. */
  stage?: ShipmentStage | null;
  stageAt?: string | null;
  hasFile: boolean;
  verificationCode: string | null;
  note: string | null;
  createdAt: string;
  updatedAt: string;
  quotedAt: string | null;
  proofAt: string | null;
  paidAt: string | null;
  fulfilledAt: string | null;
  receivedAt: string | null;
}

/** A point on a page of the document: a 1-based page, and fractions of its width and height from the top left. */
export interface PagePoint { page: number; x: number; y: number }

export interface Counterpart {
  role: "client" | "notary"; brandColor: string | null; hasAvatar: boolean; avatarVersion: string | null;
}

export interface NotarizeInput {
  actType: ActType;
  description: string;
  place: string;
  attestations: Record<string, boolean>;
  /** Where the notary dropped the seal and the signature. Left out, the seal goes lower right of the last page. */
  placements?: { seal?: PagePoint; signature?: PagePoint };
  remarks?: string;
}

/** The notary's signature picture. */
export interface NotarySignature {
  mediaType: "image/png" | "image/jpeg";
  sizeBytes: number;
  updatedAt: string;
  /** The picture, base64. */
  image: string;
}

export interface CopyRequestInput {
  mode: CtcMode;
  copies?: number;
  deliveryName?: string;
  deliveryPhone?: string;
  deliveryAddress?: string;
}

export type Verification =
  | { state: "unknown" }
  | {
    state: "notarization"; code: string; actLabel: string; notaryName: string; registerRef: string; performedAt: string;
    notarizedSha256: string; originalSha256: string;
  }
  | {
    state: "ctc"; code: string; notaryName: string; registerRef: string; issuedAt: string; mode: CtcMode;
    copySha256: string | null; notarizationCode: string; notarizedSha256: string;
  };

const id = encodeURIComponent;

class RealEnotarySessionsService {
  /** The session of a request (either party), and whether one can start. `null`: the feature is not offered. */
  async lookup(invitationId: string): Promise<SessionLookup | null> {
    try {
      return await apiRequest<SessionLookup>(`/me/enotary/requests/${id(invitationId)}/session`);
    } catch (error) {
      if (errorStatus(error) === 404) return null;
      throw error;
    }
  }

  /** The client begins the session of an accepted request whose fee is settled. 409 `session_unavailable`. */
  async start(invitationId: string): Promise<Session> {
    return (await apiRequest<{ session: Session }>(`/me/enotary/requests/${id(invitationId)}/session`, { method: "POST" })).session;
  }

  async get(sessionId: string): Promise<Session> {
    return (await apiRequest<{ session: Session }>(`/me/enotary/sessions/${id(sessionId)}`)).session;
  }

  /** Says "I am here". Answers the session as it now stands. */
  async ping(sessionId: string): Promise<Session> {
    return (await apiRequest<{ session: Session }>(`/me/enotary/sessions/${id(sessionId)}/ping`, { method: "POST" })).session;
  }

  /** The scanned PDF. 422 `session_document_rejected` says what is wrong with it. */
  async addDocument(sessionId: string, file: File): Promise<Session> {
    const form = new FormData();
    form.append("file", file, file.name);
    return (await apiUpload<{ session: Session }>(`/me/enotary/sessions/${id(sessionId)}/document`, form)).session;
  }

  async open(sessionId: string): Promise<Session> {
    return (await apiRequest<{ session: Session }>(`/me/enotary/sessions/${id(sessionId)}/open`, { method: "POST" })).session;
  }

  async consent(sessionId: string): Promise<Session> {
    return (await apiRequest<{ session: Session }>(`/me/enotary/sessions/${id(sessionId)}/consent`, { method: "POST" })).session;
  }

  /** The client finalizes the document: it cannot be replaced after this. */
  async finalize(sessionId: string): Promise<Session> {
    return (await apiRequest<{ session: Session }>(`/me/enotary/sessions/${id(sessionId)}/finalize`, { method: "POST" })).session;
  }

  /** The notary confirms, on the call, that the person in the room is the client LAGDA verified. */
  async confirmIdentity(sessionId: string): Promise<Session> {
    return (await apiRequest<{ session: Session }>(`/me/enotary/sessions/${id(sessionId)}/identity`, { method: "POST" })).session;
  }

  /** The notary states the act and the fee (0 for none). 409 `payment_profile_required` for a fee without a saved QR. */
  async stateAct(sessionId: string, input: { actType: ActType; feeCentavos: number; note: string }): Promise<Session> {
    return (await apiRequest<{ session: Session }>(`/me/enotary/sessions/${id(sessionId)}/act`, { method: "POST", body: input })).session;
  }

  /** The client approves the act and the fee, and so confirms they act freely. A fee opens its payment. */
  async approve(sessionId: string): Promise<Session> {
    return (await apiRequest<{ session: Session }>(`/me/enotary/sessions/${id(sessionId)}/approve`, { method: "POST" })).session;
  }

  /** Everything that happened to the request, from both sides. */
  async auditTrail(invitationId: string): Promise<AuditTrail> {
    return apiRequest<AuditTrail>(`/me/enotary/requests/${id(invitationId)}/audit`);
  }

  /** The other party's card: their role, the colour of their banner, and whether they have a profile photo. */
  async counterpart(invitationId: string): Promise<Counterpart> {
    return apiRequest<Counterpart>(`/me/enotary/requests/${id(invitationId)}/counterpart`);
  }

  /** The other party's profile photo. */
  counterpartAvatar(invitationId: string): Promise<Blob> { return fetchFile(`/me/enotary/requests/${id(invitationId)}/counterpart/avatar`); }

  /** Tells LAGDA the colour of the banner this person's workspace shows (null: LAGDA's own), for the other party's card. */
  async saveCard(brandColor: string | null): Promise<void> {
    await apiRequest<unknown>("/me/enotary/card", { method: "PUT", body: { brandColor } });
  }

  /** The invoice of the notarial service, with the fee the notary named. */
  async invoicePdf(invitationId: string): Promise<Blob> {
    return fetchPdf(`/me/enotary/requests/${id(invitationId)}/invoice.pdf`);
  }

  /** The trail as a PDF. */
  async auditPdf(invitationId: string): Promise<Blob> {
    return fetchPdf(`/me/enotary/requests/${id(invitationId)}/audit.pdf`);
  }

  async cancel(sessionId: string): Promise<Session> {
    return (await apiRequest<{ session: Session }>(`/me/enotary/sessions/${id(sessionId)}/cancel`, { method: "POST" })).session;
  }

  /** 122. The client asks the notary to open a called-off session again; the notary is told by email. 409 `session_state` when it is too soon to ask again. */
  async requestReopen(sessionId: string): Promise<Session> {
    return (await apiRequest<{ session: Session }>(`/me/enotary/sessions/${id(sessionId)}/reopen-request`, { method: "POST" })).session;
  }

  /** 122. The notary opens a called-off session again. */
  async reopen(sessionId: string): Promise<Session> {
    return (await apiRequest<{ session: Session }>(`/me/enotary/sessions/${id(sessionId)}/reopen`, { method: "POST" })).session;
  }

  /** 409 `notarize_blocked` (with the reason), 422 for an incomplete act. */
  async notarize(sessionId: string, input: NotarizeInput): Promise<Session> {
    return (await apiRequest<{ session: Session }>(`/me/enotary/sessions/${id(sessionId)}/notarize`, { method: "POST", body: input })).session;
  }

  async messages(sessionId: string): Promise<RoomMessage[]> {
    return (await apiRequest<{ messages: RoomMessage[] }>(`/me/enotary/sessions/${id(sessionId)}/messages`)).messages;
  }

  async say(sessionId: string, body: string): Promise<RoomMessage> {
    return (await apiRequest<{ message: RoomMessage }>(`/me/enotary/sessions/${id(sessionId)}/messages`, { method: "POST", body: { body } })).message;
  }

  async signals(sessionId: string, after: number): Promise<RoomSignal[]> {
    return (await apiRequest<{ signals: RoomSignal[] }>(`/me/enotary/sessions/${id(sessionId)}/signals?after=${String(after)}`)).signals;
  }

  async signal(sessionId: string, kind: SignalKind, connectionId: string, payload: string): Promise<void> {
    await apiRequest<unknown>(`/me/enotary/sessions/${id(sessionId)}/signals`, { method: "POST", body: { kind, connectionId, payload } });
  }

  async iceServers(): Promise<IceServer[]> {
    return (await apiRequest<{ iceServers: IceServer[] }>("/me/enotary/room-config")).iceServers;
  }

  // ── Files ────────────────────────────────────────────────────────────────

  /** The document the client added (either party). */
  document(sessionId: string): Promise<Blob> { return fetchPdf(`/me/enotary/sessions/${id(sessionId)}/document`); }
  /** The notarized document, with its certificate page. */
  notarized(sessionId: string): Promise<Blob> { return fetchPdf(`/me/enotary/sessions/${id(sessionId)}/notarized`); }
  /** A digital certified true copy. */
  copyFile(ctcId: string): Promise<Blob> { return fetchPdf(`/me/enotary/ctc/${id(ctcId)}/file`); }

  // ── Certified true copies ────────────────────────────────────────────────

  async copies(sessionId: string): Promise<CertifiedCopy[]> {
    return (await apiRequest<{ copies: CertifiedCopy[] }>(`/me/enotary/sessions/${id(sessionId)}/ctc`)).copies;
  }

  async requestCopy(sessionId: string, input: CopyRequestInput): Promise<CertifiedCopy> {
    return (await apiRequest<{ copy: CertifiedCopy }>(`/me/enotary/sessions/${id(sessionId)}/ctc`, { method: "POST", body: input })).copy;
  }

  private async act(ctcId: string, action: string, body?: unknown): Promise<CertifiedCopy> {
    return (await apiRequest<{ copy: CertifiedCopy }>(`/me/enotary/ctc/${id(ctcId)}/${action}`, {
      method: "POST", ...(body === undefined ? {} : { body }),
    })).copy;
  }
  quote(ctcId: string, feeCentavos: number) { return this.act(ctcId, "quote", { feeCentavos }); }
  decline(ctcId: string, note?: string) { return this.act(ctcId, "decline", note === undefined || note.trim() === "" ? {} : { note: note.trim() }); }
  sendProof(ctcId: string, reference: string) { return this.act(ctcId, "proof", { reference }); }
  confirmPayment(ctcId: string) { return this.act(ctcId, "payment/confirm", {}); }
  paymentNotReceived(ctcId: string, note?: string) {
    return this.act(ctcId, "payment/not-received", note === undefined || note.trim() === "" ? {} : { note: note.trim() });
  }
  fulfil(ctcId: string, shipment?: { courier: string; trackingNo: string }) { return this.act(ctcId, "fulfil", shipment ?? {}); }
  received(ctcId: string) { return this.act(ctcId, "received"); }
  /** The notary moves a printed copy on: prepared, in transit, out for delivery, delivered. */
  setStage(ctcId: string, stage: Exclude<ShipmentStage, "handed">) { return this.act(ctcId, "stage", { stage }); }

  /** The notary's register, in the order of its entries. */
  async register(): Promise<NotaryRegister> {
    return apiRequest<NotaryRegister>("/me/enotary/register");
  }

  /** The register as a spreadsheet, of one year or all of them. */
  async registerCsv(year?: number): Promise<Blob> {
    return fetchFile(`/me/enotary/register.csv${year === undefined ? "" : `?year=${String(year)}`}`);
  }

  /** One month of the register as the report to the Clerk of Court. */
  async registerReport(year: number, month: number): Promise<Blob> {
    return fetchFile(`/me/enotary/register/report.pdf?year=${String(year)}&month=${String(month)}`);
  }

  async signature(): Promise<NotarySignature | null> {
    return (await apiRequest<{ signature: NotarySignature | null }>("/me/notary/signature")).signature;
  }

  async saveSignature(mediaType: NotarySignature["mediaType"], image: string): Promise<NotarySignature | null> {
    return (await apiRequest<{ signature: NotarySignature | null }>("/me/notary/signature", { method: "PUT", body: { mediaType, image } })).signature;
  }

  async removeSignature(): Promise<void> {
    await apiRequest<unknown>("/me/notary/signature", { method: "DELETE" });
  }
  cancelCopy(ctcId: string) { return this.act(ctcId, "cancel"); }

  /** Public, no session. Anything the server does not recognise is `unknown`. */
  async verify(code: string): Promise<Verification> {
    return apiRequest<Verification>(`/public/enotary/verify?code=${encodeURIComponent(code)}`);
  }
}

async function fetchFile(path: string): Promise<Blob> {
  return fetchPdf(path);
}

async function fetchPdf(path: string): Promise<Blob> {
  if (API_BASE_URL === null || API_BASE_URL === "") throw new ApiError(0, undefined, "No server is configured.");
  let response: Response;
  try {
    response = await fetch(`${API_BASE_URL}${path}`, { credentials: "include" });
  } catch {
    throw new ApiError(0, undefined, "Could not reach the server. Check your connection and try again.");
  }
  if (!response.ok) throw new ApiError(response.status, undefined, `Request failed with status ${String(response.status)}.`);
  return response.blob();
}

export const realEnotarySessionsService = new RealEnotarySessionsService();

/** Hands a file to the person's browser to keep. */
export function saveBlobAs(blob: Blob, filename: string): void {
  const url = URL.createObjectURL(blob);
  const link = document.createElement("a");
  link.href = url;
  link.download = filename;
  document.body.appendChild(link);
  link.click();
  link.remove();
  setTimeout(() => { URL.revokeObjectURL(url); }, 1000);
}

/** The SHA-256 of a file, in hex, computed here in the browser: the file is not sent anywhere. */
export async function sha256Hex(blob: Blob): Promise<string> {
  const bytes = typeof blob.arrayBuffer === "function" ? await blob.arrayBuffer() : await new Promise<ArrayBuffer>((resolve, reject) => {
    const reader = new FileReader();
    reader.onload = () => { resolve(reader.result as ArrayBuffer); };
    reader.onerror = () => { reject(new Error("The file could not be read.")); };
    reader.readAsArrayBuffer(blob);
  });
  const digest = await crypto.subtle.digest("SHA-256", bytes);
  return Array.from(new Uint8Array(digest), byte => byte.toString(16).padStart(2, "0")).join("");
}

export const BLOCK_WORDS: Record<NotarizeBlock, string> = {
  not_live: "The room is not open yet.",
  no_document: "There is no document in the room.",
  not_final: "The client has not finalized the document yet.",
  no_identity: "Confirm the client's identity on the call first.",
  no_act: "State the notarial act and your fee first.",
  not_approved: "The client has not approved the act and the fee yet.",
  unpaid: "The fee is not settled yet: the client has not paid, or you have not confirmed the payment.",
  no_consent: "The client has not yet confirmed that they are signing freely.",
  client_absent: "The client has not been in the room in the last two minutes.",
};

export function describeSessionError(error: unknown): string {
  const code = errorCode(error);
  const status = errorStatus(error);
  if (status === 0) return "Could not reach the server. Check your connection and try again.";
  if (status === 401) return "Your session has ended. Sign in again to continue.";
  if (status === 429) return "Too many tries in a short time. Wait a minute, then try again.";
  if (code === "session_unavailable") return "A session cannot start yet. The notary's fee has to be settled first.";
  if (code === "session_state") return "That has already moved on. Reload the page to see where it stands.";
  if (code === "ctc_state") return "That copy has already moved on. Reload the page to see where it stands.";
  if (code === "session_document_rejected") {
    const detail = error instanceof ApiError ? error.body?.message : undefined;
    return detail !== undefined && detail !== "" ? detail : "That file cannot be used. Choose a PDF of the scanned document, up to 20 MB.";
  }
  if (code === "notarize_blocked") {
    const reason = error instanceof ApiError ? error.body?.details?.[0]?.code : undefined;
    return reason !== undefined && reason in BLOCK_WORDS ? BLOCK_WORDS[reason as NotarizeBlock] : "The act cannot be recorded yet.";
  }
  if (status === 404) return "That could not be found.";
  if (status === 422 || status === 400) return "That was not accepted. Check what you entered and try again.";
  return "That could not be done right now. Please try again.";
}
