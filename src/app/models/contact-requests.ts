// Contact requests (backend 086): something a workspace user asked of a
// contact — a signed copy, an upload, or (members only) a document's
// preparation.
//
// The wire shape is used as-is: every field below is exactly what
// `ContactRequestSchema` returns, so there is no mapping layer to drift.

export type ContactRequestKind = "signed-document" | "upload" | "preparation";
export type ContactRequestStatus = "pending" | "completed" | "declined" | "cancelled";
export type ContactRequestDelivery = "in-app" | "email";

export interface ContactRequestPerson {
  readonly userId: string;
  readonly displayName: string;
}

export interface ContactRequest {
  readonly requestId: string;
  readonly workspaceId: string;
  readonly workspaceName: string;
  readonly kind: ContactRequestKind;
  readonly status: ContactRequestStatus;
  readonly title: string;
  readonly message: string | null;
  readonly documentId: string | null;
  readonly documentTitle: string | null;
  readonly dueAt: string | null;
  readonly contact: { readonly contactId: string; readonly name: string; readonly email: string };
  /** `in-app`: a workspace member, no email. `email`: anyone else. */
  readonly delivery: ContactRequestDelivery;
  readonly recipient: ContactRequestPerson | null;
  readonly requestedBy: ContactRequestPerson;
  readonly responseDocumentId: string | null;
  readonly declineReason: string | null;
  readonly createdAt: string;
  readonly updatedAt: string;
  readonly completedAt: string | null;
  readonly declinedAt: string | null;
  readonly cancelledAt: string | null;
}

export interface CreateContactRequestInput {
  readonly kind: ContactRequestKind;
  readonly contactId: string;
  readonly title: string;
  readonly message?: string;
  readonly documentId?: string;
  /** ISO-8601, in the future. */
  readonly dueAt?: string;
}

/** The action wording, used on buttons, badges and dialog titles alike. */
export const CONTACT_REQUEST_KIND_LABELS: Record<ContactRequestKind, {
  readonly action: string; readonly badge: string; readonly noun: string;
}> = {
  "signed-document": { action: "Request a signed document", badge: "Signed document", noun: "a signed document" },
  upload: { action: "Assign for document upload", badge: "Upload", noun: "a document upload" },
  preparation: { action: "Assign for document preparation", badge: "Preparation", noun: "a document's preparation" },
};

export const CONTACT_REQUEST_STATUS_LABELS: Record<ContactRequestStatus, string> = {
  pending: "Pending",
  completed: "Completed",
  declined: "Declined",
  cancelled: "Cancelled",
};

/**
 * Status colours. Every pair is at least 4.5:1 (WCAG AA for small text):
 * amber-800 on amber-50, emerald-800 on emerald-50, red-800 on red-50,
 * slate-700 on slate-100.
 */
export const CONTACT_REQUEST_STATUS_TONES: Record<ContactRequestStatus, { readonly bg: string; readonly fg: string; readonly border: string }> = {
  pending: { bg: "#FFFBEB", fg: "#92400E", border: "#FDE68A" },
  completed: { bg: "#ECFDF5", fg: "#065F46", border: "#A7F3D0" },
  declined: { bg: "#FEF2F2", fg: "#991B1B", border: "#FECACA" },
  cancelled: { bg: "#F1F5F9", fg: "#334155", border: "#CBD5E1" },
};

/** Kind badge colours, same AA rule (blue-800 / violet-800 / teal-800 on their 50s). */
export const CONTACT_REQUEST_KIND_TONES: Record<ContactRequestKind, { readonly bg: string; readonly fg: string; readonly border: string }> = {
  "signed-document": { bg: "#EFF6FF", fg: "#1E40AF", border: "#BFDBFE" },
  upload: { bg: "#F5F3FF", fg: "#5B21B6", border: "#DDD6FE" },
  preparation: { bg: "#F0FDFA", fg: "#115E59", border: "#99F6E4" },
};
