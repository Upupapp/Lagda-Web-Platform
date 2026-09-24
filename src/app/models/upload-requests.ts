// Documents this workspace has asked a member to supply (backend 067).
//
// The inverse of everything else in this product: every other flow starts
// with a file the sender already holds. This one starts with a file they do
// NOT have, and a colleague who does.
//
// ── No fixture twin ────────────────────────────────────────────────────────
//
// Unlike Contacts or Templates, there is no mock service behind this and no
// demonstration data. The feature did not exist before the backend did, so
// there is nothing to fall back to — a workspace with no real backend simply
// cannot use it, and the UI says so rather than inventing rows.

export type UploadRequestId = string;

/**
 * Where a request is.
 *
 * Three states and no "expired": nothing sweeps these yet, and a status the
 * product cannot reach would be dead vocabulary a reader assumes is live.
 */
export type UploadRequestStatus = "pending" | "fulfilled" | "cancelled";

export const UPLOAD_REQUEST_STATUS_LABELS: Record<UploadRequestStatus, string> = {
  pending:   "Waiting",
  fulfilled: "Uploaded",
  cancelled: "Cancelled",
};

export interface UploadRequest {
  requestId:        UploadRequestId;
  /** What was asked for, in the requester's words — NOT a document title.
   *  The document does not exist until the request is fulfilled. */
  title:            string;
  note:             string | null;
  requestedByUserId:string;
  /** The member who must upload. Resolved from a contact when the request
   *  was made; a contact alone can never be assigned one. */
  assigneeUserId:   string;
  /** Which address-book entry the requester picked. Provenance only. */
  assigneeContactId:string | null;
  status:           UploadRequestStatus;
  /** The document that answered it. Present only once fulfilled. */
  documentId:       string | null;
  createdAt:        string;
  updatedAt:        string;
  fulfilledAt:      string | null;
  cancelledAt:      string | null;
}

export interface CreateUploadRequestInput {
  title:     string;
  note?:     string;
  /** The contact to ask. The backend resolves it to a workspace member and
   *  REFUSES if that address belongs to nobody — see its own header. */
  contactId: string;
}
