// Contact requests in Documents (backend 086).
//
//   ReceivedContactRequests   what colleagues asked of ME, from every
//                             workspace — shown at the top of "Others".
//   SentContactRequestsSection  "Requests you sent", with Cancel and, for an
//                             emailed request, "Mark as received".
//
// ── Answering writes into the REQUEST's workspace ─────────────────────────
//
// A request lives in the workspace that sent it, which need not be the one
// open right now. "Upload and complete" therefore uploads through the
// ordinary create-then-upload path addressed to `request.workspaceId` (the
// recipient is a member there — that is what in-app delivery means), then
// completes the request with the document it produced. "Open document"
// switches to that workspace before opening preparation.

import { useCallback, useEffect, useId, useRef, useState } from "react";
import { useNavigate } from "react-router";
import {
  Upload, FolderOpen, Check, Ban, X, Clock, Building2, UserRound, MessageSquare,
  FileText, Inbox, PackageCheck, Loader2,
} from "lucide-react";
import { USE_REAL_BACKEND } from "../../../services/backend-flag";
import { usePlatform } from "../../../context/PlatformContext";
import { useProcessing, buildSteps } from "../../../services/processing.service";
import { realDocumentService, type RealDocument } from "../../../services/real/document.service";
import {
  realContactRequestService, contactRequestErrorMessage,
} from "../../../services/real/contact-request.service";
import type { ContactRequest } from "../../../models/contact-requests";
import {
  KindBadge, RequestStatusBadge, DeliveryNote, KIND_ICONS,
  formatRequestDate, isOverdue,
} from "../../../components/contact-requests/ContactRequestControls";
import { ModalFrame, modalButtonStyle } from "../../../components/contact-requests/ModalFrame";
import { CONTACT_REQUEST_KIND_TONES } from "../../../models/contact-requests";
import { ApiError } from "../../../services/api-client";

const GF = { fontFamily: "'Geist', sans-serif" } as const;
const NAVY = "#07111F";
const SLATE = "#475569";
const BORDER = "#E2E8F0";
const ACCEPT = ".pdf,.doc,.docx,.png,.jpg,.jpeg";

const UPLOAD_STAGES = [
  { id: "transfer", label: "Transferring your file" },
  { id: "process", label: "Securing and preparing it" },
  { id: "answer", label: "Completing the request" },
];

/** Pending first, then newest first — the server's order, re-applied after
 *  a local update so an answered request drops below the open ones. */
export function sortRequests(items: readonly ContactRequest[]): ContactRequest[] {
  return [...items].sort((a, b) => {
    const pa = a.status === "pending" ? 0 : 1;
    const pb = b.status === "pending" ? 0 : 1;
    return pa - pb || b.createdAt.localeCompare(a.createdAt);
  });
}

function useRequestList(load: () => Promise<ContactRequest[]>) {
  const [items, setItems] = useState<ContactRequest[]>([]);
  const [status, setStatus] = useState<"loading" | "ready" | "error">(USE_REAL_BACKEND ? "loading" : "ready");
  const [error, setError] = useState<string | null>(null);
  const reload = useCallback(() => {
    // No backend: nothing can have been asked, and nothing is invented.
    if (!USE_REAL_BACKEND) { setItems([]); setStatus("ready"); return; }
    setStatus("loading");
    load()
      .then(result => { setItems(sortRequests(result)); setStatus("ready"); })
      .catch((err: unknown) => { setError(contactRequestErrorMessage(err, "load")); setStatus("error"); });
  }, [load]);
  useEffect(() => { reload(); }, [reload]);
  const replace = useCallback((next: ContactRequest) => {
    setItems(list => sortRequests(list.map(item => (item.requestId === next.requestId ? next : item))));
  }, []);
  return { items, status, error, reload, replace };
}

/** Scroll to and focus the request a notification linked to. */
function useHighlight(highlightId: string | null | undefined, ready: boolean) {
  const refs = useRef(new Map<string, HTMLElement>());
  useEffect(() => {
    if (!ready || highlightId === null || highlightId === undefined) return;
    const element = refs.current.get(highlightId);
    if (element === undefined) return;
    element.scrollIntoView?.({ block: "center" });
    element.focus({ preventScroll: true });
  }, [highlightId, ready]);
  return (id: string) => (element: HTMLElement | null) => {
    if (element === null) refs.current.delete(id); else refs.current.set(id, element);
  };
}

/** The ordinary create-then-upload path, into the request's workspace. */
async function uploadIntoWorkspace(
  workspaceId: string, file: File,
  update: (steps: ReturnType<typeof buildSteps>) => void,
): Promise<string> {
  // A failed capacity probe is not a refusal; the upload itself is the gate.
  const capacity = await realDocumentService.checkUploadCapacity().catch((): { available: boolean; message?: string } => ({ available: true }));
  if (!capacity.available) throw new Error(capacity.message ?? "Uploads are temporarily unavailable.");
  const created = await realDocumentService.create(workspaceId, file.name);
  update(buildSteps(UPLOAD_STAGES, "process"));
  await realDocumentService.upload(workspaceId, created.documentId, file);
  update(buildSteps(UPLOAD_STAGES, "answer"));
  return created.documentId;
}

function uploadError(err: unknown, fallbackOp: "complete"): string {
  // The capacity refusal, and the upload route's own file refusals (too
  // large, unsupported type), already say exactly what is wrong.
  if (err instanceof ApiError) {
    if ((err.status === 413 || err.status === 415) && err.message !== "") return err.message;
    return contactRequestErrorMessage(err, fallbackOp);
  }
  if (err instanceof Error && err.message !== "") return err.message;
  return contactRequestErrorMessage(err, fallbackOp);
}

// ── Shared card chrome ────────────────────────────────────────────────────

function Meta({ icon: Icon, children, tone }: { icon: typeof Clock; children: React.ReactNode; tone?: string }) {
  return (
    <span style={{ ...GF, display: "inline-flex", alignItems: "center", gap: 5, fontSize: 12.5, color: tone ?? SLATE, minWidth: 0, overflowWrap: "anywhere" }}>
      <Icon size={13} aria-hidden style={{ flexShrink: 0 }} /> <span style={{ minWidth: 0 }}>{children}</span>
    </span>
  );
}

function ActionButton({ icon: Icon, label, onClick, variant = "secondary", disabled = false }: {
  icon: typeof Upload; label: string; onClick: () => void;
  variant?: "primary" | "secondary" | "danger"; disabled?: boolean;
}) {
  return (
    <button type="button" onClick={onClick} disabled={disabled} style={{ ...modalButtonStyle(variant, disabled), minHeight: 36, fontSize: 13, padding: "0 12px" }}>
      <Icon size={14} aria-hidden /> {label}
    </button>
  );
}

function RequestCard({ request, highlighted, cardRef, children, audience }: {
  request: ContactRequest; highlighted: boolean; cardRef: (element: HTMLElement | null) => void;
  children?: React.ReactNode; audience: "received" | "sent";
}) {
  const Icon = KIND_ICONS[request.kind];
  const tone = CONTACT_REQUEST_KIND_TONES[request.kind];
  const overdue = isOverdue(request);
  return (
    <li
      ref={cardRef}
      tabIndex={-1}
      data-request-id={request.requestId}
      aria-label={`${request.title}, ${request.status}`}
      style={{
        listStyle: "none", background: "#FFFFFF", borderRadius: 10, padding: "12px 14px",
        border: `1px solid ${highlighted ? "#0078D4" : BORDER}`,
        boxShadow: highlighted ? "0 0 0 3px rgba(0,120,212,0.18)" : "none",
        display: "flex", gap: 12, minWidth: 0, outline: "none",
      }}
    >
      <div aria-hidden style={{
        width: 34, height: 34, borderRadius: 8, background: tone.bg, color: tone.fg, border: `1px solid ${tone.border}`,
        display: "flex", alignItems: "center", justifyContent: "center", flexShrink: 0,
      }}>
        <Icon size={17} />
      </div>
      <div style={{ flex: 1, minWidth: 0 }}>
        <div style={{ display: "flex", gap: 6, flexWrap: "wrap", alignItems: "center", marginBottom: 4 }}>
          <KindBadge kind={request.kind} />
          <RequestStatusBadge status={request.status} />
          {overdue && (
            <span style={{ ...GF, fontSize: 11, fontWeight: 700, color: "#991B1B", background: "#FEF2F2", border: "1px solid #FECACA", borderRadius: 999, padding: "2px 8px" }}>
              Overdue
            </span>
          )}
        </div>
        <h3 style={{ ...GF, fontSize: 14.5, fontWeight: 700, color: NAVY, margin: "0 0 4px", overflowWrap: "anywhere" }}>{request.title}</h3>
        <div style={{ display: "flex", flexWrap: "wrap", gap: "4px 14px", marginBottom: 4 }}>
          {audience === "received"
            ? <Meta icon={UserRound}>From {request.requestedBy.displayName}</Meta>
            : <Meta icon={UserRound}>To {request.contact.name} ({request.contact.email})</Meta>}
          <Meta icon={Building2}>{request.workspaceName}</Meta>
          {request.dueAt !== null && (
            <Meta icon={Clock} tone={overdue ? "#991B1B" : undefined}>Due {formatRequestDate(request.dueAt)}</Meta>
          )}
          {audience === "sent" && <DeliveryNote delivery={request.delivery} />}
          <Meta icon={Inbox}>{audience === "received" ? "Received" : "Sent"} {formatRequestDate(request.createdAt)}</Meta>
        </div>
        {request.documentTitle !== null && (
          <Meta icon={FileText}>Document: {request.documentTitle}</Meta>
        )}
        {request.message !== null && (
          <div style={{ display: "flex", gap: 8, marginTop: 8, padding: "8px 10px", background: "#F8FAFC", borderRadius: 8, border: `1px solid ${BORDER}` }}>
            <MessageSquare size={13} aria-hidden style={{ color: SLATE, flexShrink: 0, marginTop: 3 }} />
            <p style={{ ...GF, fontSize: 13, color: "#1E293B", margin: 0, lineHeight: 1.55, whiteSpace: "pre-wrap", overflowWrap: "anywhere", minWidth: 0 }}>
              {request.message}
            </p>
          </div>
        )}
        {request.status === "declined" && (
          <p style={{ ...GF, fontSize: 12.5, color: "#991B1B", margin: "8px 0 0", overflowWrap: "anywhere" }}>
            Declined {formatRequestDate(request.declinedAt)}{request.declineReason !== null ? ` — “${request.declineReason}”` : ""}
          </p>
        )}
        {request.status === "completed" && (
          <p style={{ ...GF, fontSize: 12.5, color: "#065F46", margin: "8px 0 0" }}>
            Completed {formatRequestDate(request.completedAt)}
          </p>
        )}
        {request.status === "cancelled" && (
          <p style={{ ...GF, fontSize: 12.5, color: SLATE, margin: "8px 0 0" }}>
            Cancelled {formatRequestDate(request.cancelledAt)}
          </p>
        )}
        {children !== undefined && (
          <div style={{ display: "flex", gap: 8, flexWrap: "wrap", marginTop: 10 }}>{children}</div>
        )}
      </div>
    </li>
  );
}

function InlineError({ text }: { text: string | null }) {
  if (text === null) return null;
  return (
    <p role="alert" style={{ ...GF, fontSize: 13, color: "#991B1B", background: "#FEF2F2", border: "1px solid #FECACA", borderRadius: 8, padding: "8px 12px", margin: "0 0 10px" }}>
      {text}
    </p>
  );
}

// ── Decline ───────────────────────────────────────────────────────────────

function DeclineDialog({ request, onClose, onDeclined }: {
  request: ContactRequest; onClose: () => void; onDeclined: (next: ContactRequest) => void;
}) {
  const id = useId();
  const [reason, setReason] = useState("");
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const submit = () => {
    if (busy) return;
    void (async () => {
      setBusy(true); setError(null);
      try {
        const next = await realContactRequestService.decline(request.workspaceId, request.requestId, reason);
        onDeclined(next);
        onClose();
      } catch (err) {
        setError(contactRequestErrorMessage(err, "decline"));
      } finally { setBusy(false); }
    })();
  };
  return (
    <ModalFrame
      title="Decline this request?"
      subtitle={request.title}
      onClose={onClose}
      busy={busy}
      footer={<>
        <button type="button" onClick={onClose} disabled={busy} style={modalButtonStyle("secondary", busy)}>Keep it</button>
        <button type="button" onClick={submit} disabled={busy} style={modalButtonStyle("danger", busy)}>
          <Ban size={14} aria-hidden /> {busy ? "Declining…" : "Decline request"}
        </button>
      </>}
    >
      <p style={{ ...GF, fontSize: 13.5, color: "#1E293B", margin: "0 0 12px", lineHeight: 1.55 }}>
        {request.requestedBy.displayName} will be told you declined.
      </p>
      <InlineError text={error} />
      <label htmlFor={id} style={{ ...GF, display: "block", fontSize: 13, fontWeight: 600, color: NAVY, marginBottom: 6 }}>
        Reason <span style={{ fontWeight: 400, color: SLATE }}>(optional)</span>
      </label>
      <textarea
        id={id} data-autofocus value={reason} maxLength={500} rows={3}
        onChange={event => { setReason(event.target.value); }}
        style={{ ...GF, width: "100%", boxSizing: "border-box", padding: "9px 12px", border: "1px solid #CBD5E1", borderRadius: 8, fontSize: 14, color: NAVY, resize: "vertical" }}
      />
      <p style={{ ...GF, fontSize: 12, color: SLATE, margin: "4px 0 0" }}>{reason.length}/500</p>
    </ModalFrame>
  );
}

// ── Received: "Others" ────────────────────────────────────────────────────

const loadReceived = () => realContactRequestService.listReceived();

/** Opens preparation for the request's document, in the request's own
 *  workspace (switching to it first when another one is open). Its own
 *  component so the platform session is read only where it is needed. */
function OpenDocumentButton({ request, disabled }: { request: ContactRequest; disabled: boolean }) {
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

export function ReceivedContactRequests({ highlightId, onCount, onLoaded }: {
  highlightId?: string | null;
  /** Pending requests — the part of the Others badge these contribute. */
  onCount?: (pending: number) => void;
  onLoaded?: (total: number) => void;
}) {
  const { run } = useProcessing();
  const { items, status, error: loadError, reload, replace } = useRequestList(loadReceived);
  const [busyId, setBusyId] = useState<string | null>(null);
  const [actionError, setActionError] = useState<string | null>(null);
  const [declineFor, setDeclineFor] = useState<ContactRequest | null>(null);
  const fileInput = useRef<HTMLInputElement>(null);
  const uploadFor = useRef<ContactRequest | null>(null);
  const setRef = useHighlight(highlightId, status === "ready");

  const pending = items.filter(item => item.status === "pending").length;
  useEffect(() => {
    if (status !== "loading") { onCount?.(pending); onLoaded?.(items.length); }
  }, [status, pending, items.length, onCount, onLoaded]);

  const complete = (request: ContactRequest, documentId?: string) => {
    setBusyId(request.requestId); setActionError(null);
    realContactRequestService.complete(request.workspaceId, request.requestId, documentId)
      .then(replace)
      .catch((err: unknown) => { setActionError(contactRequestErrorMessage(err, "complete")); })
      .finally(() => { setBusyId(null); });
  };

  const onFile = (file: File) => {
    const request = uploadFor.current;
    if (request === null) return;
    setBusyId(request.requestId); setActionError(null);
    void (async () => {
      try {
        const next = await run(
          { message: `Uploading ${file.name}`, detail: "Large documents can take a moment.", steps: buildSteps(UPLOAD_STAGES, "transfer") },
          async ({ update }) => {
            const documentId = await uploadIntoWorkspace(request.workspaceId, file, steps => { update({ steps }); });
            return realContactRequestService.complete(request.workspaceId, request.requestId, documentId);
          },
        );
        replace(next);
      } catch (err) {
        setActionError(uploadError(err, "complete"));
      } finally {
        setBusyId(null);
        uploadFor.current = null;
      }
    })();
  };

  if (!USE_REAL_BACKEND) return null;
  if (status === "loading") {
    return <p role="status" style={{ ...GF, fontSize: 13, color: SLATE, margin: "0 0 12px" }}>Loading requests for you…</p>;
  }
  if (status === "error") {
    return (
      <div style={{ marginBottom: 16 }}>
        <InlineError text={loadError} />
        <button type="button" onClick={reload} style={modalButtonStyle("secondary")}>Try again</button>
      </div>
    );
  }
  if (items.length === 0) return null;

  return (
    <section aria-labelledby="received-requests-heading" style={{ marginBottom: 24 }}>
      <h2 id="received-requests-heading" style={{ ...GF, fontSize: 15, fontWeight: 700, color: NAVY, margin: "0 0 10px", display: "flex", alignItems: "center", gap: 8 }}>
        Requests for you
        {pending > 0 && <span style={{ ...GF, fontSize: 11, fontWeight: 700, color: "#92400E", background: "#FFFBEB", border: "1px solid #FDE68A", borderRadius: 999, padding: "1px 8px" }}>{pending} pending</span>}
      </h2>
      <InlineError text={actionError} />
      <input
        ref={fileInput} type="file" accept={ACCEPT} aria-label="Choose a file to upload" style={{ display: "none" }}
        onChange={event => {
          const file = event.target.files?.[0];
          if (file) onFile(file);
          event.target.value = "";
        }}
      />
      <ul aria-label="Requests for you" style={{ margin: 0, padding: 0, display: "flex", flexDirection: "column", gap: 10 }}>
        {items.map(request => {
          const busy = busyId === request.requestId;
          return (
            <RequestCard key={request.requestId} request={request} audience="received"
              highlighted={highlightId === request.requestId} cardRef={setRef(request.requestId)}>
              {request.status === "pending" ? (<>
                {request.kind === "preparation" ? (<>
                  <OpenDocumentButton request={request} disabled={busy} />
                  <ActionButton icon={Check} label={busy ? "Saving…" : "Mark as done"} disabled={busy}
                    onClick={() => { complete(request); }} />
                </>) : (
                  <ActionButton icon={busy ? Loader2 : Upload} label={busy ? "Uploading…" : "Upload and complete"} variant="primary" disabled={busy}
                    onClick={() => { uploadFor.current = request; fileInput.current?.click(); }} />
                )}
                <ActionButton icon={Ban} label="Decline" variant="danger" disabled={busy}
                  onClick={() => { setDeclineFor(request); }} />
              </>) : undefined}
            </RequestCard>
          );
        })}
      </ul>
      {declineFor !== null && (
        <DeclineDialog request={declineFor} onClose={() => { setDeclineFor(null); }} onDeclined={replace} />
      )}
    </section>
  );
}

// ── Mark as received (emailed requests) ─────────────────────────────────────

function MarkReceivedDialog({ request, onClose, onCompleted }: {
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
        setError(uploadError(err, "complete"));
      } finally { setBusy(false); }
    })();
  };

  const control: React.CSSProperties = {
    ...GF, width: "100%", boxSizing: "border-box", minHeight: 42, padding: "9px 12px",
    border: "1px solid #CBD5E1", borderRadius: 8, fontSize: 14, color: NAVY, background: "#FFFFFF",
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

// ── Sent: "Requests you sent" ─────────────────────────────────────────────

const loadSent = () => realContactRequestService.listSent();

type SentFilter = "all" | "pending" | "completed" | "declined" | "cancelled";

export function SentContactRequestsSection({ highlightId, onCount }: {
  highlightId?: string | null; onCount?: (pending: number) => void;
}) {
  const { items, status, error: loadError, reload, replace } = useRequestList(loadSent);
  const [filter, setFilter] = useState<SentFilter>("all");
  const [busyId, setBusyId] = useState<string | null>(null);
  const [actionError, setActionError] = useState<string | null>(null);
  const [confirmCancel, setConfirmCancel] = useState<ContactRequest | null>(null);
  const [receivedFor, setReceivedFor] = useState<ContactRequest | null>(null);
  const setRef = useHighlight(highlightId, status === "ready");

  const pending = items.filter(item => item.status === "pending").length;
  useEffect(() => { if (status === "ready") onCount?.(pending); }, [status, pending, onCount]);

  const shown = filter === "all" ? items : items.filter(item => item.status === filter);

  const cancel = (request: ContactRequest) => {
    setBusyId(request.requestId); setActionError(null);
    realContactRequestService.cancel(request.workspaceId, request.requestId)
      .then(next => { replace(next); setConfirmCancel(null); })
      .catch((err: unknown) => { setActionError(contactRequestErrorMessage(err, "cancel")); setConfirmCancel(null); })
      .finally(() => { setBusyId(null); });
  };

  return (
    <section aria-labelledby="sent-requests-heading" style={{ marginTop: 20 }}>
      <h2 id="sent-requests-heading" style={{ ...GF, fontSize: 15, fontWeight: 700, color: NAVY, margin: "0 0 4px" }}>Requests you sent</h2>
      <p style={{ ...GF, fontSize: 13, color: SLATE, margin: "0 0 12px", lineHeight: 1.55 }}>
        Members answer in LAGDA and you're notified. Emailed contacts reply to you directly — mark those received here.
      </p>
      {status === "ready" && items.length > 0 && (
        <div role="group" aria-label="Filter by status" style={{ display: "flex", gap: 6, flexWrap: "wrap", marginBottom: 12 }}>
          {(["all", "pending", "completed", "declined", "cancelled"] as const).map(value => (
            <button key={value} type="button" aria-pressed={filter === value} onClick={() => { setFilter(value); }}
              style={{
                ...GF, fontSize: 12.5, fontWeight: 600, minHeight: 32, padding: "0 12px", borderRadius: 999, cursor: "pointer",
                border: `1px solid ${filter === value ? "#0078D4" : "#CBD5E1"}`,
                background: filter === value ? "#EFF6FF" : "#FFFFFF", color: filter === value ? "#005A9E" : "#334155",
              }}>
              {value === "all" ? "All" : value.charAt(0).toUpperCase() + value.slice(1)}
            </button>
          ))}
        </div>
      )}
      <InlineError text={actionError} />
      {status === "loading" && <p role="status" style={{ ...GF, fontSize: 13, color: SLATE, padding: "20px 0", textAlign: "center" }}>Loading…</p>}
      {status === "error" && (
        <div>
          <InlineError text={loadError} />
          <button type="button" onClick={reload} style={modalButtonStyle("secondary")}>Try again</button>
        </div>
      )}
      {status === "ready" && items.length === 0 && (
        <div style={{ textAlign: "center", padding: "36px 12px" }}>
          <Inbox size={28} aria-hidden style={{ color: "#64748B" }} />
          <h3 style={{ ...GF, fontSize: 15, fontWeight: 700, color: NAVY, margin: "10px 0 4px" }}>You haven't sent any requests</h3>
          <p style={{ ...GF, fontSize: 13, color: SLATE, margin: 0, lineHeight: 1.6 }}>
            Ask a contact for a signed document, an upload or a document's preparation from Contacts.
          </p>
        </div>
      )}
      {status === "ready" && items.length > 0 && shown.length === 0 && (
        <p style={{ ...GF, fontSize: 13, color: SLATE }}>No {filter} requests.</p>
      )}
      {status === "ready" && shown.length > 0 && (
        <ul aria-label="Requests you sent" style={{ margin: 0, padding: 0, display: "flex", flexDirection: "column", gap: 10 }}>
          {shown.map(request => {
            const busy = busyId === request.requestId;
            return (
              <RequestCard key={request.requestId} request={request} audience="sent"
                highlighted={highlightId === request.requestId} cardRef={setRef(request.requestId)}>
                {request.status === "pending" ? (<>
                  {request.delivery === "email" && (
                    <ActionButton icon={PackageCheck} label="Mark as received" variant="primary" disabled={busy}
                      onClick={() => { setReceivedFor(request); }} />
                  )}
                  <ActionButton icon={X} label="Cancel request" variant="danger" disabled={busy}
                    onClick={() => { setConfirmCancel(request); }} />
                </>) : undefined}
              </RequestCard>
            );
          })}
        </ul>
      )}
      {confirmCancel !== null && (
        <ModalFrame
          title="Cancel this request?"
          subtitle={confirmCancel.title}
          onClose={() => { setConfirmCancel(null); }}
          busy={busyId === confirmCancel.requestId}
          footer={<>
            <button type="button" data-autofocus onClick={() => { setConfirmCancel(null); }} style={modalButtonStyle("secondary")}>Keep it</button>
            <button type="button" onClick={() => { cancel(confirmCancel); }} disabled={busyId === confirmCancel.requestId}
              style={modalButtonStyle("danger", busyId === confirmCancel.requestId)}>
              {busyId === confirmCancel.requestId ? "Cancelling…" : "Cancel request"}
            </button>
          </>}
        >
          <p style={{ ...GF, fontSize: 13.5, color: "#1E293B", margin: 0, lineHeight: 1.55 }}>
            {confirmCancel.delivery === "in-app"
              ? `It will no longer appear for ${confirmCancel.recipient?.displayName ?? confirmCancel.contact.name}. The record is kept.`
              : `${confirmCancel.contact.name} already has the email. Cancelling records that you no longer need it; the record is kept.`}
          </p>
        </ModalFrame>
      )}
      {receivedFor !== null && (
        <MarkReceivedDialog request={receivedFor} onClose={() => { setReceivedFor(null); }} onCompleted={replace} />
      )}
    </section>
  );
}
