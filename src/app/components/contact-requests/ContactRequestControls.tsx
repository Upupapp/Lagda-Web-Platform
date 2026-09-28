// Shared pieces for contact requests (086): the member/external badge, the
// kind and status badges, the three request actions, and a contact's
// request history.

import { useCallback, useEffect, useState } from "react";
import { FileSignature, Upload, FilePen, Clock, UserCheck, Globe, Mail, Bell } from "lucide-react";
import {
  CONTACT_REQUEST_KIND_LABELS, CONTACT_REQUEST_KIND_TONES,
  CONTACT_REQUEST_STATUS_LABELS, CONTACT_REQUEST_STATUS_TONES, ENABLED_CONTACT_REQUEST_KINDS,
  type ContactRequest, type ContactRequestKind, type ContactRequestStatus,
} from "../../models/contact-requests";
import type { ContactWorkspaceMember } from "../../models/contacts";
import {
  realContactRequestService, contactRequestErrorMessage,
} from "../../services/real/contact-request.service";

const GF = { fontFamily: "'Geist', sans-serif" } as const;
const NAVY = "#07111F";
const SLATE = "#475569";

export const CONTACT_REQUEST_KINDS: readonly ContactRequestKind[] = ["signed-document", "upload", "preparation"];

export const KIND_ICONS: Record<ContactRequestKind, typeof FileSignature> = {
  "signed-document": FileSignature,
  upload: Upload,
  preparation: FilePen,
};

const pill: React.CSSProperties = {
  ...GF, display: "inline-flex", alignItems: "center", gap: 4, fontSize: 11, fontWeight: 700,
  borderRadius: 999, padding: "2px 8px", whiteSpace: "nowrap", lineHeight: 1.5,
};

/** "Workspace member" (blue-800 on blue-50, 8.6:1) or "External" (slate-700
 *  on slate-100, 9.6:1). Nothing when membership is unknown. */
export function MembershipBadge({ member }: { member: ContactWorkspaceMember | null | undefined }) {
  if (member === undefined) return null;
  const isMember = member !== null;
  const Icon = isMember ? UserCheck : Globe;
  return (
    <span
      title={isMember ? `Workspace member: ${member.displayName}` : "Not a member of this workspace"}
      style={{
        ...pill,
        background: isMember ? "#EFF6FF" : "#F1F5F9",
        color: isMember ? "#1E40AF" : "#334155",
        border: `1px solid ${isMember ? "#BFDBFE" : "#CBD5E1"}`,
      }}
    >
      <Icon size={11} aria-hidden /> {isMember ? "Workspace member" : "External"}
    </span>
  );
}

export function KindBadge({ kind }: { kind: ContactRequestKind }) {
  const tone = CONTACT_REQUEST_KIND_TONES[kind];
  const Icon = KIND_ICONS[kind];
  return (
    <span style={{ ...pill, background: tone.bg, color: tone.fg, border: `1px solid ${tone.border}` }}>
      <Icon size={11} aria-hidden /> {CONTACT_REQUEST_KIND_LABELS[kind].badge}
    </span>
  );
}

export function RequestStatusBadge({ status }: { status: ContactRequestStatus }) {
  const tone = CONTACT_REQUEST_STATUS_TONES[status];
  return (
    <span style={{ ...pill, background: tone.bg, color: tone.fg, border: `1px solid ${tone.border}` }}>
      {CONTACT_REQUEST_STATUS_LABELS[status]}
    </span>
  );
}

export function DeliveryNote({ delivery }: { delivery: ContactRequest["delivery"] }) {
  const Icon = delivery === "in-app" ? Bell : Mail;
  return (
    <span style={{ ...GF, display: "inline-flex", alignItems: "center", gap: 4, fontSize: 12, color: SLATE }}>
      <Icon size={12} aria-hidden /> {delivery === "in-app" ? "In-app, no email" : "Emailed"}
    </span>
  );
}

export function formatRequestDate(iso: string | null): string {
  if (iso === null) return "—";
  const date = new Date(iso);
  if (Number.isNaN(date.getTime())) return "—";
  return date.toLocaleDateString("en-PH", { month: "short", day: "numeric", year: "numeric" });
}

export function isOverdue(request: Pick<ContactRequest, "status" | "dueAt">, now = Date.now()): boolean {
  return request.status === "pending" && request.dueAt !== null && new Date(request.dueAt).getTime() < now;
}

// ── Availability ──────────────────────────────────────────────────────────

export interface RequestAvailability {
  readonly enabled: boolean;
  readonly reason?: string;
}

export function requestAvailability(
  contact: { workspaceMember?: ContactWorkspaceMember | null; status: string },
  kind: ContactRequestKind,
  currentUserId: string | undefined,
): RequestAvailability {
  if (contact.status !== "active") return { enabled: false, reason: "Restore this contact to send it a request." };
  const member = contact.workspaceMember;
  if (member !== null && member !== undefined && currentUserId !== undefined && member.userId === currentUserId) {
    return { enabled: false, reason: "This contact is you." };
  }
  if (kind === "preparation" && (member === null || member === undefined)) {
    return {
      enabled: false,
      reason: member === null
        ? "Only workspace members can be assigned to prepare a document. Invite them to the workspace first."
        : "Preparation can only be assigned to a workspace member.",
    };
  }
  return { enabled: true };
}

/** The request actions as buttons (contact detail). Only the kinds in
 *  `ENABLED_CONTACT_REQUEST_KINDS` are offered unless `kinds` says otherwise.
 *  A disabled action keeps its place and says why, visibly, rather than
 *  vanishing. */
export function ContactRequestButtons({ contact, currentUserId, onChoose, kinds = ENABLED_CONTACT_REQUEST_KINDS }: {
  contact: { workspaceMember?: ContactWorkspaceMember | null; status: string; id: string };
  currentUserId: string | undefined;
  onChoose: (kind: ContactRequestKind) => void;
  kinds?: readonly ContactRequestKind[];
}) {
  return (
    <div role="group" aria-label="Request actions" style={{ display: "flex", flexWrap: "wrap", gap: 8 }}>
      {kinds.map(kind => {
        const availability = requestAvailability(contact, kind, currentUserId);
        const Icon = KIND_ICONS[kind];
        const reasonId = `req-${kind}-${contact.id}-why`;
        return (
          <div key={kind} style={{ display: "flex", flexDirection: "column", gap: 4, maxWidth: "100%" }}>
            <button
              type="button"
              aria-disabled={!availability.enabled}
              aria-describedby={availability.enabled ? undefined : reasonId}
              title={availability.reason}
              onClick={() => { if (availability.enabled) onChoose(kind); }}
              style={{
                ...GF, display: "inline-flex", alignItems: "center", gap: 7, minHeight: 38,
                padding: "0 14px", borderRadius: 8, fontSize: 13, fontWeight: 600, maxWidth: "100%",
                cursor: availability.enabled ? "pointer" : "not-allowed",
                border: `1.5px solid ${availability.enabled ? "#0078D4" : "#CBD5E1"}`,
                background: availability.enabled ? "#FFFFFF" : "#F8FAFC",
                color: availability.enabled ? "#005A9E" : "#475569",
                textAlign: "left",
              }}
            >
              <Icon size={15} aria-hidden style={{ flexShrink: 0 }} />
              {CONTACT_REQUEST_KIND_LABELS[kind].action}
            </button>
            {!availability.enabled && (
              <span id={reasonId} style={{ ...GF, fontSize: 11.5, color: SLATE, maxWidth: 260, lineHeight: 1.4 }}>
                {availability.reason}
              </span>
            )}
          </div>
        );
      })}
    </div>
  );
}

// ── A contact's request history ───────────────────────────────────────────

export function ContactRequestHistory({ workspaceId, contactId, refreshKey = 0 }: {
  workspaceId: string; contactId: string; refreshKey?: number;
}) {
  const [items, setItems] = useState<ContactRequest[] | null>(null);
  const [error, setError] = useState<string | null>(null);

  const load = useCallback(() => {
    setError(null);
    realContactRequestService.listForContact(workspaceId, contactId)
      .then(result => { setItems(result); })
      .catch((err: unknown) => { setItems([]); setError(contactRequestErrorMessage(err, "load")); });
  }, [workspaceId, contactId]);

  useEffect(() => { load(); }, [load, refreshKey]);

  if (items === null) {
    return <p role="status" style={{ ...GF, fontSize: 13, color: SLATE, margin: 0 }}>Loading requests…</p>;
  }
  if (error !== null) {
    return (
      <div>
        <p role="alert" style={{ ...GF, fontSize: 13, color: "#991B1B", margin: "0 0 8px" }}>{error}</p>
        <button type="button" onClick={load} style={{ ...GF, fontSize: 13, color: "#005A9E", background: "none", border: "1px solid #CBD5E1", borderRadius: 8, padding: "6px 12px", cursor: "pointer" }}>
          Try again
        </button>
      </div>
    );
  }
  if (items.length === 0) {
    return <p style={{ ...GF, fontSize: 13, color: SLATE, margin: 0 }}>No requests have been sent to this contact yet.</p>;
  }
  return (
    <ul aria-label="Requests sent to this contact" style={{ listStyle: "none", margin: 0, padding: 0, display: "flex", flexDirection: "column", gap: 10 }}>
      {items.map(request => (
        <li key={request.requestId} style={{ border: "1px solid #E2E8F0", borderRadius: 10, padding: "10px 12px", minWidth: 0 }}>
          <div style={{ display: "flex", gap: 8, alignItems: "flex-start", justifyContent: "space-between", flexWrap: "wrap" }}>
            <span style={{ ...GF, fontSize: 13.5, fontWeight: 600, color: NAVY, overflowWrap: "anywhere", minWidth: 0, flex: "1 1 160px" }}>
              {request.title}
            </span>
            <RequestStatusBadge status={request.status} />
          </div>
          <div style={{ display: "flex", gap: 8, flexWrap: "wrap", alignItems: "center", marginTop: 6 }}>
            <KindBadge kind={request.kind} />
            <DeliveryNote delivery={request.delivery} />
            <span style={{ ...GF, fontSize: 12, color: SLATE }}>
              Sent {formatRequestDate(request.createdAt)} by {request.requestedBy.displayName}
            </span>
            {request.dueAt !== null && (
              <span style={{ ...GF, display: "inline-flex", alignItems: "center", gap: 4, fontSize: 12, color: isOverdue(request) ? "#991B1B" : SLATE }}>
                <Clock size={12} aria-hidden /> {isOverdue(request) ? "Overdue · " : "Due "}{formatRequestDate(request.dueAt)}
              </span>
            )}
          </div>
          {request.documentTitle !== null && (
            <p style={{ ...GF, fontSize: 12, color: SLATE, margin: "6px 0 0", overflowWrap: "anywhere" }}>Document: {request.documentTitle}</p>
          )}
          {request.status === "declined" && request.declineReason !== null && (
            <p style={{ ...GF, fontSize: 12, color: "#991B1B", margin: "6px 0 0", overflowWrap: "anywhere" }}>Reason: {request.declineReason}</p>
          )}
        </li>
      ))}
    </ul>
  );
}
