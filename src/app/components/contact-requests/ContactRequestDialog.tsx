// Asking a contact for something (backend 086): a signed document, an
// upload, or — members only — a document's preparation.
//
// ── Delivery is said out loud, before sending ────────────────────────────
//
// The single most surprising thing about this feature is that the same
// button emails one contact and does not email another. So the dialog says
// which will happen, in words, using the server's own membership answer
// (`workspaceMember`), and the confirmation repeats it.
//
// ── The document picker ─────────────────────────────────────────────────
//
//   preparation      required — the document that needs preparing
//   signed-document  optional — "the signed copy of THIS one"
//   upload           absent   — the document does not exist yet

import { useEffect, useId, useState } from "react";
import { AlertCircle, CheckCircle2, Mail, Bell, Send, Loader2 } from "lucide-react";
import { ModalFrame, modalButtonStyle } from "./ModalFrame";
import {
  realContactRequestService, contactRequestErrorMessage,
} from "../../services/real/contact-request.service";
import { realDocumentService, type RealDocument } from "../../services/real/document.service";
import {
  CONTACT_REQUEST_KIND_LABELS,
  type ContactRequest, type ContactRequestKind,
} from "../../models/contact-requests";
import type { ContactWorkspaceMember } from "../../models/contacts";

const GF = { fontFamily: "'Geist', sans-serif" } as const;
const NAVY = "#07111F";
const SLATE = "#475569";
const BORDER = "#CBD5E1";

export const TITLE_MAX = 200;
export const MESSAGE_MAX = 2000;

export const DELIVERY_COPY = {
  member: "They'll see it in Contacts → Requests From Contacts and their notifications. No email is sent.",
  external: "We'll email them. They'll reply to you, and you mark it complete here.",
} as const;

export interface ContactRequestDialogProps {
  readonly workspaceId: string;
  readonly kind: ContactRequestKind;
  readonly contact: {
    readonly id: string; readonly name: string; readonly email: string;
    readonly workspaceMember?: ContactWorkspaceMember | null;
  };
  readonly onClose: () => void;
  readonly onCreated?: (request: ContactRequest) => void;
}

/** Local end-of-day for a `yyyy-mm-dd` value, as ISO — "due on the 3rd"
 *  means by the end of the 3rd, not its first minute. */
export function dueDateToIso(value: string): string | null {
  const match = /^(\d{4})-(\d{2})-(\d{2})$/.exec(value);
  if (match === null) return null;
  const date = new Date(Number(match[1]), Number(match[2]) - 1, Number(match[3]), 23, 59, 0, 0);
  return Number.isNaN(date.getTime()) ? null : date.toISOString();
}

function todayInputValue(): string {
  const now = new Date();
  const pad = (n: number) => String(n).padStart(2, "0");
  return `${String(now.getFullYear())}-${pad(now.getMonth() + 1)}-${pad(now.getDate())}`;
}

const TITLE_PLACEHOLDER: Record<ContactRequestKind, string> = {
  "signed-document": "e.g. Your signed employment contract",
  upload: "e.g. A copy of your 2026 business permit",
  preparation: "e.g. Prepare the lease for signing",
};

export function ContactRequestDialog({ workspaceId, kind, contact, onClose, onCreated }: ContactRequestDialogProps) {
  const ids = { title: useId(), message: useId(), due: useId(), doc: useId(), delivery: useId(), error: useId() };
  const labels = CONTACT_REQUEST_KIND_LABELS[kind];
  const isMember = contact.workspaceMember !== null && contact.workspaceMember !== undefined;
  const pickDocument = kind !== "upload";
  const documentRequired = kind === "preparation";

  const [title, setTitle] = useState("");
  const [message, setMessage] = useState("");
  const [due, setDue] = useState("");
  const [documentId, setDocumentId] = useState("");
  const [documents, setDocuments] = useState<RealDocument[] | null>(null);
  const [documentsFailed, setDocumentsFailed] = useState(false);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [fieldErrors, setFieldErrors] = useState<{ title?: string; due?: string; doc?: string }>({});
  const [sent, setSent] = useState<ContactRequest | null>(null);

  useEffect(() => {
    if (!pickDocument) return;
    let cancelled = false;
    realDocumentService.list(workspaceId, { perPage: 100 })
      .then(result => { if (!cancelled) setDocuments(result.items); })
      .catch(() => { if (!cancelled) { setDocuments([]); setDocumentsFailed(true); } });
    return () => { cancelled = true; };
  }, [pickDocument, workspaceId]);

  const validate = (): boolean => {
    const next: typeof fieldErrors = {};
    if (title.trim() === "") next.title = "Enter what you're asking for.";
    if (due !== "") {
      const iso = dueDateToIso(due);
      if (iso === null || new Date(iso).getTime() <= Date.now()) next.due = "Choose a due date in the future.";
    }
    if (documentRequired && documentId === "") next.doc = "Choose the document to prepare.";
    setFieldErrors(next);
    return Object.keys(next).length === 0;
  };

  const submit = () => {
    if (busy || !validate()) return;
    void (async () => {
      setBusy(true);
      setError(null);
      try {
        const dueIso = due === "" ? undefined : dueDateToIso(due) ?? undefined;
        const created = await realContactRequestService.create(workspaceId, {
          kind, contactId: contact.id, title, message,
          ...(pickDocument && documentId !== "" ? { documentId } : {}),
          ...(dueIso === undefined ? {} : { dueAt: dueIso }),
        });
        setSent(created);
        onCreated?.(created);
      } catch (err) {
        setError(contactRequestErrorMessage(err, "create"));
      } finally {
        setBusy(false);
      }
    })();
  };

  const inputStyle = (invalid: boolean): React.CSSProperties => ({
    ...GF, width: "100%", boxSizing: "border-box", minHeight: 42, padding: "9px 12px",
    border: `1px solid ${invalid ? "#B91C1C" : BORDER}`, borderRadius: 8, fontSize: 14,
    color: NAVY, background: "#FFFFFF",
  });
  const labelStyle: React.CSSProperties = { ...GF, display: "block", fontSize: 13, fontWeight: 600, color: NAVY, marginBottom: 6 };
  const hintStyle: React.CSSProperties = { ...GF, fontSize: 12, color: SLATE, margin: "4px 0 0" };
  const fieldErrorStyle: React.CSSProperties = { ...GF, fontSize: 12, color: "#B91C1C", margin: "4px 0 0" };

  if (sent !== null) {
    const inApp = sent.delivery === "in-app";
    return (
      <ModalFrame
        title="Request sent"
        subtitle={sent.title}
        onClose={onClose}
        footer={<button type="button" onClick={onClose} style={modalButtonStyle("primary")} data-autofocus>Done</button>}
      >
        <div role="status" style={{ display: "flex", gap: 10, alignItems: "flex-start" }}>
          <CheckCircle2 size={18} color="#047857" aria-hidden style={{ flexShrink: 0, marginTop: 1 }} />
          <p style={{ ...GF, fontSize: 14, color: NAVY, margin: 0, lineHeight: 1.6 }}>
            {inApp
              ? <>{sent.recipient?.displayName ?? contact.name} will see it in Contacts → Requests From Contacts and their notifications. No email was sent.</>
              : <>We emailed {contact.name} ({contact.email}). When they reply to you, mark it received from Contacts → Requests From Contacts → Sent.</>}
          </p>
        </div>
      </ModalFrame>
    );
  }

  return (
    <ModalFrame
      title={labels.action}
      subtitle={`${contact.name} · ${contact.email}`}
      onClose={onClose}
      busy={busy}
      footer={<>
        <button type="button" onClick={onClose} disabled={busy} style={modalButtonStyle("secondary", busy)}>Cancel</button>
        <button type="button" onClick={submit} disabled={busy} aria-busy={busy} style={modalButtonStyle("primary", busy)}>
          {busy ? <Loader2 size={15} aria-hidden /> : <Send size={15} aria-hidden />}
          {busy ? "Sending…" : "Send request"}
        </button>
      </>}
    >
      <form noValidate onSubmit={event => { event.preventDefault(); submit(); }} aria-describedby={ids.delivery}>
        <div
          id={ids.delivery}
          style={{
            display: "flex", gap: 10, alignItems: "flex-start", padding: "10px 12px", borderRadius: 8,
            background: isMember ? "#EFF6FF" : "#F8FAFC", border: `1px solid ${isMember ? "#BFDBFE" : "#E2E8F0"}`,
            marginBottom: 16,
          }}
        >
          {isMember
            ? <Bell size={16} aria-hidden style={{ color: "#1E40AF", flexShrink: 0, marginTop: 2 }} />
            : <Mail size={16} aria-hidden style={{ color: "#334155", flexShrink: 0, marginTop: 2 }} />}
          <p style={{ ...GF, fontSize: 13, color: isMember ? "#1E3A8A" : "#1E293B", margin: 0, lineHeight: 1.55 }}>
            <strong>{isMember ? "Workspace member." : "External contact."}</strong>{" "}
            {isMember ? DELIVERY_COPY.member : DELIVERY_COPY.external}
          </p>
        </div>

        {error !== null && (
          <div id={ids.error} role="alert" style={{
            display: "flex", gap: 8, marginBottom: 14, padding: "10px 12px",
            background: "#FEF2F2", border: "1px solid #FECACA", borderRadius: 8,
          }}>
            <AlertCircle size={15} color="#991B1B" aria-hidden style={{ flexShrink: 0, marginTop: 2 }} />
            <p style={{ ...GF, fontSize: 13, color: "#991B1B", margin: 0, lineHeight: 1.55 }}>{error}</p>
          </div>
        )}

        <div style={{ marginBottom: 14 }}>
          <label htmlFor={ids.title} style={labelStyle}>
            Title <span aria-hidden style={{ color: "#B91C1C" }}>*</span>
          </label>
          <input
            id={ids.title} type="text" value={title} maxLength={TITLE_MAX} required aria-required="true"
            data-autofocus
            aria-invalid={fieldErrors.title !== undefined}
            aria-describedby={fieldErrors.title !== undefined ? `${ids.title}-err` : undefined}
            onChange={event => { setTitle(event.target.value); }}
            placeholder={TITLE_PLACEHOLDER[kind]}
            style={inputStyle(fieldErrors.title !== undefined)}
          />
          {fieldErrors.title !== undefined && <p id={`${ids.title}-err`} style={fieldErrorStyle}>{fieldErrors.title}</p>}
        </div>

        {pickDocument && (
          <div style={{ marginBottom: 14 }}>
            <label htmlFor={ids.doc} style={labelStyle}>
              Document {documentRequired
                ? <span aria-hidden style={{ color: "#B91C1C" }}>*</span>
                : <span style={{ fontWeight: 400, color: SLATE }}>(optional)</span>}
            </label>
            <select
              id={ids.doc} value={documentId} disabled={documents === null}
              aria-required={documentRequired}
              aria-invalid={fieldErrors.doc !== undefined}
              aria-describedby={`${ids.doc}-hint`}
              onChange={event => { setDocumentId(event.target.value); }}
              style={{ ...inputStyle(fieldErrors.doc !== undefined), textOverflow: "ellipsis" }}
            >
              <option value="">
                {documents === null ? "Loading documents…" : documentRequired ? "Choose a document" : "No specific document"}
              </option>
              {(documents ?? []).map(document => (
                <option key={document.documentId} value={document.documentId}>{document.title}</option>
              ))}
            </select>
            <p id={`${ids.doc}-hint`} style={fieldErrors.doc !== undefined ? fieldErrorStyle : hintStyle}>
              {fieldErrors.doc
                ?? (documentsFailed
                  ? "Couldn't load this workspace's documents."
                  : documentRequired
                    ? "The workspace document they should prepare."
                    : "Pick one if you want the signed copy of a particular document.")}
            </p>
          </div>
        )}

        <div style={{ marginBottom: 14 }}>
          <label htmlFor={ids.message} style={labelStyle}>
            Message <span style={{ fontWeight: 400, color: SLATE }}>(optional)</span>
          </label>
          <textarea
            id={ids.message} value={message} rows={3} maxLength={MESSAGE_MAX}
            onChange={event => { setMessage(event.target.value); }}
            placeholder="Anything that helps them get it right"
            style={{ ...inputStyle(false), resize: "vertical", minHeight: 80 }}
          />
        </div>

        <div>
          <label htmlFor={ids.due} style={labelStyle}>
            Due date <span style={{ fontWeight: 400, color: SLATE }}>(optional)</span>
          </label>
          <input
            id={ids.due} type="date" value={due} min={todayInputValue()}
            aria-invalid={fieldErrors.due !== undefined}
            aria-describedby={fieldErrors.due !== undefined ? `${ids.due}-err` : undefined}
            onChange={event => { setDue(event.target.value); }}
            style={inputStyle(fieldErrors.due !== undefined)}
          />
          {fieldErrors.due !== undefined && <p id={`${ids.due}-err`} style={fieldErrorStyle}>{fieldErrors.due}</p>}
        </div>
      </form>
    </ModalFrame>
  );
}
