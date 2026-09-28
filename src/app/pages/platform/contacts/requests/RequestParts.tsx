// The pieces of Requests From Contacts (086): one request's card, its action
// buttons, and the dialogs behind them (Reject, Cancel, Mark as received).
//
// ── Answering writes into the REQUEST's workspace ─────────────────────────
//
// A request lives in the workspace that sent it, which need not be the one
// open right now. "Upload and complete" therefore uploads through the
// ordinary create-then-upload path addressed to `request.workspaceId` (the
// recipient is a member there — that is what in-app delivery means), then
// completes the request with the document it produced. "Open document"
// switches to that workspace before opening preparation.

import { useEffect, useId, useState } from "react";
import { useNavigate } from "react-router";
import {
  FolderOpen, Ban, Clock, Building2, UserRound, MessageSquare, FileText, Inbox,
  PackageCheck, CalendarCheck, CalendarX, type LucideIcon,
} from "lucide-react";
import { usePlatform } from "../../../../context/PlatformContext";
import { useProcessing, buildSteps } from "../../../../services/processing.service";
import { realDocumentService, type RealDocument } from "../../../../services/real/document.service";
import {
  realContactRequestService, contactRequestErrorMessage,
} from "../../../../services/real/contact-request.service";
import {
  CONTACT_REQUEST_KIND_TONES, DECLINE_REASON_MAX, contactRequestGroup,
  type ContactRequest, type ContactRequestView,
} from "../../../../models/contact-requests";
import {
  KindBadge, DeliveryNote, KIND_ICONS, formatRequestDate, isOverdue,
} from "../../../../components/contact-requests/ContactRequestControls";
import { ModalFrame, modalButtonStyle } from "../../../../components/contact-requests/ModalFrame";
import { ACCEPT, UPLOAD_STAGES, uploadIntoWorkspace, uploadError } from "./request-upload";

const GF = { fontFamily: "'Geist', sans-serif" } as const;
const NAVY = "#07111F";
const SLATE = "#475569";
const BORDER = "#E2E8F0";
// ── Small chrome ──────────────────────────────────────────────────────────

function Meta({ icon: Icon, children, tone }: { icon: LucideIcon; children: React.ReactNode; tone?: string }) {
  return (
    <span style={{ ...GF, display: "inline-flex", alignItems: "flex-start", gap: 5, fontSize: 12.5, color: tone ?? SLATE, minWidth: 0, maxWidth: "100%", overflowWrap: "anywhere", lineHeight: 1.45 }}>
      <Icon size={13} aria-hidden style={{ flexShrink: 0, marginTop: 2 }} /> <span style={{ minWidth: 0 }}>{children}</span>
    </span>
  );
}

export function ActionButton({ icon: Icon, label, onClick, variant = "secondary", disabled = false }: {
  icon: LucideIcon; label: string; onClick: () => void;
  variant?: "primary" | "secondary" | "danger"; disabled?: boolean;
}) {
  return (
    <button type="button" onClick={onClick} disabled={disabled} style={{ ...modalButtonStyle(variant, disabled), minHeight: 40, fontSize: 13, padding: "0 12px" }}>
      <Icon size={14} aria-hidden /> {label}
    </button>
  );
}

export function InlineError({ text }: { text: string | null }) {
  if (text === null) return null;
  return (
    <p role="alert" style={{ ...GF, fontSize: 13, color: "#991B1B", background: "#FEF2F2", border: "1px solid #FECACA", borderRadius: 8, padding: "8px 12px", margin: "0 0 12px", overflowWrap: "anywhere" }}>
      {text}
    </p>
  );
}

/** The section's own status wording: Approved / Pending / Rejected, and
 *  "Cancelled by requester" for a cancelled one (filed under Rejected).
 *  Every pair is at least 4.5:1 on its background. */
const OUTCOME_BADGES = {
  completed: { label: "Approved", bg: "#ECFDF5", fg: "#065F46", border: "#A7F3D0" },
  pending: { label: "Pending", bg: "#FFFBEB", fg: "#92400E", border: "#FDE68A" },
  declined: { label: "Rejected", bg: "#FEF2F2", fg: "#991B1B", border: "#FECACA" },
  cancelled: { label: "Cancelled by requester", bg: "#F1F5F9", fg: "#334155", border: "#CBD5E1" },
} as const;

export function OutcomeBadge({ status }: { status: ContactRequest["status"] }) {
  const tone = OUTCOME_BADGES[status];
  return (
    <span style={{
      ...GF, display: "inline-flex", alignItems: "center", fontSize: 11, fontWeight: 700, borderRadius: 999,
      padding: "2px 8px", lineHeight: 1.5, background: tone.bg, color: tone.fg, border: `1px solid ${tone.border}`,
    }}>
      {tone.label}
    </span>
  );
}

// ── The card ──────────────────────────────────────────────────────────────

export function RequestCard({ request, view, highlighted, children }: {
  request: ContactRequest; view: ContactRequestView; highlighted: boolean; children?: React.ReactNode;
}) {
  const Icon = KIND_ICONS[request.kind];
  const tone = CONTACT_REQUEST_KIND_TONES[request.kind];
  const overdue = isOverdue(request);
  const rejected = contactRequestGroup(request.status) === "rejected";
  return (
    <li
      tabIndex={-1}
      data-request-id={request.requestId}
      aria-label={`${request.title}, ${OUTCOME_BADGES[request.status].label}`}
      aria-current={highlighted ? "true" : undefined}
      className="rfc-card"
      style={{
        listStyle: "none", background: "#FFFFFF", borderRadius: 10, padding: "12px 14px",
        border: `1px solid ${highlighted ? "#0078D4" : BORDER}`,
        boxShadow: highlighted ? "0 0 0 3px rgba(0,120,212,0.20)" : "none",
        display: "flex", gap: 12, minWidth: 0,
      }}
    >
      <div aria-hidden className="rfc-card-icon" style={{
        width: 34, height: 34, borderRadius: 8, background: tone.bg, color: tone.fg, border: `1px solid ${tone.border}`,
        display: "flex", alignItems: "center", justifyContent: "center", flexShrink: 0,
      }}>
        <Icon size={17} />
      </div>
      <div style={{ flex: 1, minWidth: 0 }}>
        <div style={{ display: "flex", gap: 6, flexWrap: "wrap", alignItems: "center", marginBottom: 4 }}>
          <KindBadge kind={request.kind} />
          <OutcomeBadge status={request.status} />
          {overdue && (
            <span style={{ ...GF, fontSize: 11, fontWeight: 700, color: "#991B1B", background: "#FEF2F2", border: "1px solid #FECACA", borderRadius: 999, padding: "2px 8px" }}>
              Overdue
            </span>
          )}
        </div>
        <h3 style={{ ...GF, fontSize: 14.5, fontWeight: 700, color: NAVY, margin: "0 0 6px", overflowWrap: "anywhere" }}>{request.title}</h3>
        <div style={{ display: "flex", flexWrap: "wrap", gap: "4px 14px", marginBottom: 4 }}>
          {view === "received"
            ? <Meta icon={UserRound}>From {request.requestedBy.displayName}</Meta>
            : <Meta icon={UserRound}>To {request.contact.name} ({request.contact.email})</Meta>}
          <Meta icon={Building2}>{request.workspaceName}</Meta>
          {request.documentTitle !== null && <Meta icon={FileText}>Document: {request.documentTitle}</Meta>}
          {request.dueAt !== null && (
            <Meta icon={Clock} tone={overdue ? "#991B1B" : undefined}>Due {formatRequestDate(request.dueAt)}</Meta>
          )}
          {view === "sent" && <DeliveryNote delivery={request.delivery} />}
          <Meta icon={Inbox}>{view === "received" ? "Received" : "Sent"} {formatRequestDate(request.createdAt)}</Meta>
          {request.status === "completed" && (
            <Meta icon={CalendarCheck} tone="#065F46">Approved {formatRequestDate(request.completedAt)}</Meta>
          )}
          {request.status === "declined" && (
            <Meta icon={CalendarX} tone="#991B1B">Rejected {formatRequestDate(request.declinedAt)}</Meta>
          )}
          {request.status === "cancelled" && (
            <Meta icon={CalendarX}>Cancelled {formatRequestDate(request.cancelledAt)}</Meta>
          )}
        </div>
        {request.message !== null && (
          <div style={{ display: "flex", gap: 8, marginTop: 8, padding: "8px 10px", background: "#F8FAFC", borderRadius: 8, border: `1px solid ${BORDER}` }}>
            <MessageSquare size={13} aria-hidden style={{ color: SLATE, flexShrink: 0, marginTop: 3 }} />
            <p style={{ ...GF, fontSize: 13, color: "#1E293B", margin: 0, lineHeight: 1.55, whiteSpace: "pre-wrap", overflowWrap: "anywhere", minWidth: 0 }}>
              {request.message}
            </p>
          </div>
        )}
        {rejected && (
          <p data-testid="rejection-reason" style={{
            ...GF, fontSize: 13, margin: "8px 0 0", padding: "8px 10px", borderRadius: 8, lineHeight: 1.5,
            background: request.status === "declined" ? "#FEF2F2" : "#F8FAFC",
            border: `1px solid ${request.status === "declined" ? "#FECACA" : BORDER}`,
            color: request.status === "declined" ? "#7F1D1D" : "#334155",
            whiteSpace: "pre-wrap", overflowWrap: "anywhere",
          }}>
            <strong>Reason: </strong>
            {request.status === "declined" && request.declineReason !== null && request.declineReason.trim() !== ""
              ? request.declineReason
              : "No reason given"}
          </p>
        )}
        {children !== undefined && (
          <div style={{ display: "flex", gap: 8, flexWrap: "wrap", marginTop: 10 }}>{children}</div>
        )}
      </div>
    </li>
  );
}

/** Opens preparation for the request's document, in the request's own
 *  workspace (switching to it first when another one is open). */
export function OpenDocumentButton({ request, disabled }: { request: ContactRequest; disabled: boolean }) {
  const navigate = useNavigate();
  const platform = usePlatform();
  const documentId = request.documentId;
  return (
    <ActionButton icon={FolderOpen} label="Open document" variant="primary" disabled={disabled || documentId === null}
      onClick={() => {
        if (documentId === null) return;
        if (platform.currentWorkspace?.id !== request.workspaceId) platform.switchWorkspace(request.workspaceId);
        void navigate(`/app/prepare/upload?resumeDocumentId=${encodeURIComponent(documentId)}`);
      }} />
  );
}

// ── Reject (a required reason) ────────────────────────────────────────────

export function RejectDialog({ request, onClose, onRejected }: {
  request: ContactRequest; onClose: () => void; onRejected: (next: ContactRequest) => void;
}) {
  const ids = { field: useId(), counter: useId(), hint: useId() };
  const [reason, setReason] = useState("");
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const trimmed = reason.trim();
  const valid = trimmed.length >= 1 && trimmed.length <= DECLINE_REASON_MAX;

  const submit = () => {
    if (busy || !valid) return;
    void (async () => {
      setBusy(true); setError(null);
      try {
        const next = await realContactRequestService.decline(request.workspaceId, request.requestId, trimmed);
        onRejected(next);
        onClose();
      } catch (err) {
        setError(contactRequestErrorMessage(err, "decline"));
      } finally { setBusy(false); }
    })();
  };

  return (
    <ModalFrame
      title="Reject this request"
      subtitle={request.title}
      onClose={onClose}
      busy={busy}
      footer={<>
        <button type="button" onClick={onClose} disabled={busy} style={modalButtonStyle("secondary", busy)}>Keep it</button>
        <button type="button" onClick={submit} disabled={busy || !valid} style={modalButtonStyle("danger", busy || !valid)}>
          <Ban size={14} aria-hidden /> {busy ? "Rejecting…" : "Reject request"}
        </button>
      </>}
    >
      <form onSubmit={event => { event.preventDefault(); submit(); }}>
        <p style={{ ...GF, fontSize: 13.5, color: "#1E293B", margin: "0 0 12px", lineHeight: 1.55 }}>
          {request.requestedBy.displayName} will be notified that you rejected this request, together with your reason.
        </p>
        <InlineError text={error} />
        <label htmlFor={ids.field} style={{ ...GF, display: "block", fontSize: 13, fontWeight: 600, color: NAVY, marginBottom: 6 }}>
          Reason for rejecting <span style={{ fontWeight: 500, color: "#991B1B" }}>(required)</span>
        </label>
        <textarea
          id={ids.field} data-autofocus value={reason} maxLength={DECLINE_REASON_MAX} rows={4}
          required aria-required="true"
          aria-describedby={`${ids.hint} ${ids.counter}`}
          onChange={event => { setReason(event.target.value); }}
          style={{ ...GF, width: "100%", boxSizing: "border-box", padding: "9px 12px", border: "1px solid #94A3B8", borderRadius: 8, fontSize: 14, color: NAVY, resize: "vertical", minHeight: 96 }}
        />
        <div style={{ display: "flex", justifyContent: "space-between", gap: 8, flexWrap: "wrap", marginTop: 4 }}>
          <p id={ids.hint} style={{ ...GF, fontSize: 12, color: SLATE, margin: 0 }}>
            Between 1 and {DECLINE_REASON_MAX} characters.
          </p>
          <p id={ids.counter} style={{ ...GF, fontSize: 12, color: SLATE, margin: 0 }}>
            {reason.length}/{DECLINE_REASON_MAX}
          </p>
        </div>
      </form>
    </ModalFrame>
  );
}

// ── Cancel (sent, pending) ────────────────────────────────────────────────

export function CancelRequestDialog({ request, busy, onContinue, onClose }: {
  request: ContactRequest; busy: boolean; onContinue: () => void; onClose: () => void;
}) {
  const who = request.delivery === "in-app"
    ? (request.recipient?.displayName ?? request.contact.name)
    : request.contact.name;
  return (
    <ModalFrame
      title="Cancel this request?"
      subtitle={request.title}
      onClose={onClose}
      busy={busy}
      footer={<>
        <button type="button" data-autofocus onClick={onClose} disabled={busy} style={modalButtonStyle("secondary", busy)}>Cancel</button>
        <button type="button" onClick={onContinue} disabled={busy} style={modalButtonStyle("danger", busy)}>
          {busy ? "Cancelling…" : "Continue"}
        </button>
      </>}
    >
      <p style={{ ...GF, fontSize: 13.5, color: "#1E293B", margin: 0, lineHeight: 1.55 }}>
        {request.delivery === "in-app"
          ? `The request will be withdrawn and ${who} will no longer be asked to act on it. The record is kept under Rejected as cancelled.`
          : `${who} already has the email. Cancelling records that you no longer need it; the record is kept under Rejected as cancelled.`}
      </p>
      <p style={{ ...GF, fontSize: 13, color: SLATE, margin: "10px 0 0", lineHeight: 1.55 }}>
        Select Continue to cancel the request, or Cancel to keep it.
      </p>
    </ModalFrame>
  );
}

// ── Mark as received (sent, emailed) ──────────────────────────────────────

export function MarkReceivedDialog({ request, onClose, onCompleted }: {
  request: ContactRequest; onClose: () => void; onCompleted: (next: ContactRequest) => void;
}) {
  const { run } = useProcessing();
  const ids = { doc: useId(), file: useId() };
  const [documents, setDocuments] = useState<RealDocument[] | null>(null);
  const [documentId, setDocumentId] = useState("");
  const [file, setFile] = useState<File | null>(null);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    let cancelled = false;
    realDocumentService.list(request.workspaceId, { perPage: 100 })
      .then(result => { if (!cancelled) setDocuments(result.items); })
      .catch(() => { if (!cancelled) setDocuments([]); });
    return () => { cancelled = true; };
  }, [request.workspaceId]);

  const ready = documentId !== "" || file !== null;
  const submit = () => {
    if (busy) return;
    if (!ready) { setError("Choose the document they sent you, or upload it."); return; }
    void (async () => {
      setBusy(true); setError(null);
      try {
        const next = file !== null
          ? await run(
            { message: `Uploading ${file.name}`, detail: "Large documents can take a moment.", steps: buildSteps(UPLOAD_STAGES, "transfer") },
            async ({ update }) => {
              const uploaded = await uploadIntoWorkspace(request.workspaceId, file, steps => { update({ steps }); });
              return realContactRequestService.complete(request.workspaceId, request.requestId, uploaded);
            })
          : await realContactRequestService.complete(request.workspaceId, request.requestId, documentId);
        onCompleted(next);
        onClose();
      } catch (err) {
        setError(uploadError(err));
      } finally { setBusy(false); }
    })();
  };

  const control: React.CSSProperties = {
    ...GF, width: "100%", boxSizing: "border-box", minHeight: 42, padding: "9px 12px",
    border: "1px solid #94A3B8", borderRadius: 8, fontSize: 14, color: NAVY, background: "#FFFFFF",
  };

  return (
    <ModalFrame
      title="Mark as received"
      subtitle={request.title}
      onClose={onClose}
      busy={busy}
      footer={<>
        <button type="button" onClick={onClose} disabled={busy} style={modalButtonStyle("secondary", busy)}>Cancel</button>
        <button type="button" onClick={submit} disabled={busy} style={modalButtonStyle("primary", busy)}>
          <PackageCheck size={15} aria-hidden /> {busy ? "Saving…" : "Mark complete"}
        </button>
      </>}
    >
      <p style={{ ...GF, fontSize: 13.5, color: "#1E293B", margin: "0 0 14px", lineHeight: 1.55 }}>
        {request.contact.name} was emailed this request. Record what they sent you by choosing the document
        in {request.workspaceName}, or upload the file they sent.
      </p>
      <InlineError text={error} />
      <label htmlFor={ids.doc} style={{ ...GF, display: "block", fontSize: 13, fontWeight: 600, color: NAVY, marginBottom: 6 }}>
        Document they sent
      </label>
      <select id={ids.doc} data-autofocus value={documentId} disabled={documents === null || file !== null}
        onChange={event => { setDocumentId(event.target.value); }} style={control}>
        <option value="">{documents === null ? "Loading documents…" : "Choose a document"}</option>
        {(documents ?? []).map(document => (
          <option key={document.documentId} value={document.documentId}>{document.title}</option>
        ))}
      </select>
      <p style={{ ...GF, fontSize: 12.5, color: SLATE, margin: "12px 0 6px", textAlign: "center" }}>or</p>
      <label htmlFor={ids.file} style={{ ...GF, display: "block", fontSize: 13, fontWeight: 600, color: NAVY, marginBottom: 6 }}>
        Upload the file
      </label>
      <input id={ids.file} type="file" accept={ACCEPT}
        onChange={event => { const next = event.target.files?.[0] ?? null; setFile(next); if (next !== null) setDocumentId(""); }}
        style={{ ...GF, fontSize: 13, maxWidth: "100%" }} />
    </ModalFrame>
  );
}
