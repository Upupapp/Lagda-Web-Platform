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

// ── Which request actions are offered ─────────────────────────────────────
//
// Only preparation is offered when starting a new request. The other two
// kinds are kept whole — model, dialog, backend, and the answering flow for
// requests that already exist — and come back by adding them here.
export const ENABLED_CONTACT_REQUEST_KINDS: readonly ContactRequestKind[] = ["preparation"];

// ── Requests From Contacts (Contacts → Requests From Contacts) ─────────────

export const DECLINE_REASON_MAX = 500;

/** The two sides of the section. */
export type ContactRequestView = "received" | "sent";
/** The three sub-sections, in the order they are shown. */
export type ContactRequestGroup = "approved" | "pending" | "rejected";
export const CONTACT_REQUEST_GROUPS: readonly ContactRequestGroup[] = ["approved", "pending", "rejected"];
export const CONTACT_REQUEST_GROUP_LABELS: Record<ContactRequestGroup, string> = {
  approved: "Approved",
  pending: "Pending",
  rejected: "Rejected",
};
export const CONTACT_REQUEST_VIEW_LABELS: Record<ContactRequestView, string> = {
  received: "Received",
  sent: "Sent",
};

/** Completed is "Approved"; declined and cancelled both sit under "Rejected". */
export function contactRequestGroup(status: ContactRequestStatus): ContactRequestGroup {
  switch (status) {
    case "completed": return "approved";
    case "pending": return "pending";
    case "declined":
    case "cancelled":
      return "rejected";
  }
}

export const CONTACT_REQUESTS_ROUTE = "/app/contacts/requests";

export function isContactRequestView(value: string | null): value is ContactRequestView {
  return value === "received" || value === "sent";
}
export function isContactRequestGroup(value: string | null): value is ContactRequestGroup {
  return value === "approved" || value === "pending" || value === "rejected";
}

export function isContactRequestsLink(path: string | null): path is string {
  return path !== null && (path === CONTACT_REQUESTS_ROUTE || path.startsWith(`${CONTACT_REQUESTS_ROUTE}?`));
}

/** A link into the section, optionally focused on one request. */
export function contactRequestsPath(target: {
  view: ContactRequestView; group?: ContactRequestGroup; requestId?: string | null;
}): string {
  const params = new URLSearchParams({ view: target.view });
  if (target.group !== undefined) params.set("status", target.group);
  if (target.requestId !== undefined && target.requestId !== null && target.requestId !== "") {
    params.set("request", target.requestId);
  }
  return `${CONTACT_REQUESTS_ROUTE}?${params.toString()}`;
}

/**
 * Old Documents deep links — `?list=requests-sent` and `?request=<id>` — now
 * belong to the Requests From Contacts section. Null when nothing moved.
 */
export function legacyContactRequestRedirect(params: URLSearchParams): string | null {
  const list = params.get("list");
  const requestId = params.get("request");
  if (list === "requests-sent") return contactRequestsPath({ view: "sent", requestId });
  if (requestId !== null && requestId !== "") return contactRequestsPath({ view: "received", requestId });
  return null;
}

/** Pending first, then newest first — re-applied after a local update. */
export function sortRequests(items: readonly ContactRequest[]): ContactRequest[] {
  return [...items].sort((a, b) => {
    const pa = a.status === "pending" ? 0 : 1;
    const pb = b.status === "pending" ? 0 : 1;
    return pa - pb || b.createdAt.localeCompare(a.createdAt);
  });
}

/** How many requests sit in each sub-section. */
export function countByGroup(items: readonly ContactRequest[]): Record<ContactRequestGroup, number> {
  const counts: Record<ContactRequestGroup, number> = { approved: 0, pending: 0, rejected: 0 };
  for (const item of items) counts[contactRequestGroup(item.status)] += 1;
  return counts;
}
