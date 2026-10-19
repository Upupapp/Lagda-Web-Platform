// Assign a template (or a completed document) to a team member to prepare, straight from the workspace's
// member list. The request itself is the same contact request as ever (086), which is made against a
// contact, so a member who is not yet in the person's contacts is added first, as a personal contact,
// and the dialog says so before anything is sent.

import { useEffect, useId, useMemo, useState } from "react";
import { AlertCircle, CheckCircle2, Send, Loader2, UserPlus } from "lucide-react";
import { ModalFrame, modalButtonStyle } from "./ModalFrame";
import { dueDateToIso, MESSAGE_MAX, TITLE_MAX } from "./ContactRequestDialog";
import { realWorkspaceMembersService } from "../../services/real/workspace-members.service";
import { realContactService } from "../../services/real/contact.service";
import { realContactRequestService, contactRequestErrorMessage } from "../../services/real/contact-request.service";
import type { WorkspaceMemberOption } from "../../models/organization";
import type { ContactRequest } from "../../models/contact-requests";

const GF = { fontFamily: "'Geist', sans-serif" } as const;
const NAVY = "#07111F";
const SLATE = "#475569";
const BORDER = "#CBD5E1";

export interface AssignToMemberDialogProps {
  readonly workspaceId: string;
  /** What to prepare: the document the template or completed document stands on. */
  readonly document: { readonly documentId: string; readonly title: string };
  /** The name shown to the person, for example the template's name. */
  readonly label?: string;
  readonly onClose: () => void;
  readonly onCreated?: (request: ContactRequest) => void;
}

const sameAddress = (a: string, b: string) => a.trim().toLowerCase() === b.trim().toLowerCase();

/** The member's contact in this workspace (any state but archived), by email, or null. */
async function contactIdForMember(workspaceId: string, member: WorkspaceMemberOption): Promise<string | null> {
  const page = await realContactService.list(workspaceId, { search: member.email, state: "active", perPage: 50 });
  return page.items.find(contact => sameAddress(contact.email, member.email))?.contactId ?? null;
}

export function AssignToMemberDialog({ workspaceId, document, label, onClose, onCreated }: AssignToMemberDialogProps) {
  const ids = { member: useId(), title: useId(), message: useId(), due: useId() };
  const shown = label ?? document.title;
  const [members, setMembers] = useState<WorkspaceMemberOption[] | null>(null);
  const [membersFailed, setMembersFailed] = useState(false);
  const [userId, setUserId] = useState("");
  const [title, setTitle] = useState(`Prepare ${shown}`.slice(0, TITLE_MAX));
  const [message, setMessage] = useState("");
  const [due, setDue] = useState("");
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [fieldErrors, setFieldErrors] = useState<{ member?: string; title?: string; due?: string }>({});
  const [sent, setSent] = useState<ContactRequest | null>(null);
  const [knownContact, setKnownContact] = useState<boolean | null>(null);

  useEffect(() => {
    let cancelled = false;
    realWorkspaceMembersService.list(workspaceId)
      .then(list => { if (!cancelled) setMembers(list); })
      .catch(() => { if (!cancelled) { setMembers([]); setMembersFailed(true); } });
    return () => { cancelled = true; };
  }, [workspaceId]);

  const chosen = useMemo(() => (members ?? []).find(member => member.userId === userId) ?? null, [members, userId]);

  // Whether the chosen member is already a contact, so the note under the picker can say what will happen.
  useEffect(() => {
    setKnownContact(null);
    if (chosen === null) return;
    let cancelled = false;
    contactIdForMember(workspaceId, chosen)
      .then(id => { if (!cancelled) setKnownContact(id !== null); })
      .catch(() => { if (!cancelled) setKnownContact(null); });
    return () => { cancelled = true; };
  }, [chosen, workspaceId]);

  const validate = (): boolean => {
    const next: typeof fieldErrors = {};
    if (chosen === null) next.member = "Choose a team member.";
    if (title.trim() === "") next.title = "Enter what you're asking for.";
    if (due !== "") {
      const iso = dueDateToIso(due);
      if (iso === null || new Date(iso).getTime() <= Date.now()) next.due = "Choose a due date in the future.";
    }
    setFieldErrors(next);
    return Object.keys(next).length === 0;
  };

  const submit = () => {
    if (busy || !validate() || chosen === null) return;
    void (async () => {
      setBusy(true);
      setError(null);
      try {
        let contactId = await contactIdForMember(workspaceId, chosen);
        if (contactId === null) {
          const made = await realContactService.create(workspaceId, {
            name: chosen.displayName, email: chosen.email, scope: "personal",
          });
          contactId = made.contact.contactId;
        }
        const dueIso = due === "" ? undefined : dueDateToIso(due) ?? undefined;
        const created = await realContactRequestService.create(workspaceId, {
          kind: "preparation", contactId, title, message, documentId: document.documentId,
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
    border: `1px solid ${invalid ? "#B91C1C" : BORDER}`, borderRadius: 8, fontSize: 14, color: NAVY, background: "#FFFFFF",
  });
  const labelStyle: React.CSSProperties = { ...GF, display: "block", fontSize: 13, fontWeight: 600, color: NAVY, marginBottom: 6 };
  const hintStyle: React.CSSProperties = { ...GF, fontSize: 12, color: SLATE, margin: "4px 0 0" };
  const errorStyle: React.CSSProperties = { ...GF, fontSize: 12, color: "#B91C1C", margin: "4px 0 0" };

  if (sent !== null) {
    return (
      <ModalFrame
        title="Assigned"
        subtitle={sent.title}
        onClose={onClose}
        footer={<button type="button" onClick={onClose} style={modalButtonStyle("primary")} data-autofocus>Done</button>}
      >
        <div role="status" style={{ display: "flex", gap: 10, alignItems: "flex-start" }}>
          <CheckCircle2 size={18} color="#047857" aria-hidden style={{ flexShrink: 0, marginTop: 1 }} />
          <p style={{ ...GF, fontSize: 14, color: NAVY, margin: 0, lineHeight: 1.6 }}>
            {sent.recipient?.displayName ?? chosen?.displayName ?? "They"} will see it in Contacts → Document requests and in their notifications. No email was sent.
            They can prepare and send this one document while the request is open.
          </p>
        </div>
      </ModalFrame>
    );
  }

  return (
    <ModalFrame
      title="Assign to a team member"
      subtitle={shown}
      onClose={onClose}
      busy={busy}
      footer={<>
        <button type="button" onClick={onClose} disabled={busy} style={modalButtonStyle("secondary", busy)}>Cancel</button>
        <button type="button" onClick={submit} disabled={busy} aria-busy={busy} style={modalButtonStyle("primary", busy)}>
          {busy ? <Loader2 size={15} aria-hidden /> : <Send size={15} aria-hidden />}
          {busy ? "Assigning…" : "Assign"}
        </button>
      </>}
    >
      <form noValidate onSubmit={event => { event.preventDefault(); submit(); }}>
        {error !== null && (
          <div role="alert" style={{ display: "flex", gap: 8, marginBottom: 14, padding: "10px 12px", background: "#FEF2F2", border: "1px solid #FECACA", borderRadius: 8 }}>
            <AlertCircle size={15} color="#991B1B" aria-hidden style={{ flexShrink: 0, marginTop: 2 }} />
            <p style={{ ...GF, fontSize: 13, color: "#991B1B", margin: 0, lineHeight: 1.55 }}>{error}</p>
          </div>
        )}

        <div style={{ marginBottom: 14 }}>
          <label htmlFor={ids.member} style={labelStyle}>Team member <span aria-hidden style={{ color: "#B91C1C" }}>*</span></label>
          <select
            id={ids.member} value={userId} disabled={members === null} aria-required
            aria-invalid={fieldErrors.member !== undefined}
            onChange={event => { setUserId(event.target.value); }}
            style={inputStyle(fieldErrors.member !== undefined)}
          >
            <option value="">{members === null ? "Loading team members…" : "Choose a team member"}</option>
            {(members ?? []).filter(member => member.isCurrentUser !== true).map(member => (
              <option key={member.userId} value={member.userId}>{member.displayName} · {member.email}</option>
            ))}
          </select>
          {fieldErrors.member !== undefined
            ? <p style={errorStyle}>{fieldErrors.member}</p>
            : membersFailed
              ? <p style={errorStyle}>Couldn't load your team members.</p>
              : <p style={hintStyle}>Anyone who has joined this workspace. They get access to this one document only.</p>}
          {chosen !== null && knownContact === false && (
            <p data-testid="assign-adds-contact" style={{ ...hintStyle, display: "flex", gap: 6, alignItems: "flex-start", color: "#1E3A8A" }}>
              <UserPlus size={13} aria-hidden style={{ flexShrink: 0, marginTop: 2 }} />
              {chosen.displayName} isn't in your contacts yet. They'll be added to them (visible only to you) so the request can be sent.
            </p>
          )}
        </div>

        <div style={{ marginBottom: 14 }}>
          <label htmlFor={ids.title} style={labelStyle}>Title <span aria-hidden style={{ color: "#B91C1C" }}>*</span></label>
          <input
            id={ids.title} value={title} maxLength={TITLE_MAX} aria-required aria-invalid={fieldErrors.title !== undefined}
            onChange={event => { setTitle(event.target.value); }} style={inputStyle(fieldErrors.title !== undefined)}
          />
          {fieldErrors.title !== undefined && <p style={errorStyle}>{fieldErrors.title}</p>}
        </div>

        <div style={{ marginBottom: 14 }}>
          <label htmlFor={ids.message} style={labelStyle}>Message <span style={{ fontWeight: 400, color: SLATE }}>(optional)</span></label>
          <textarea
            id={ids.message} value={message} rows={3} maxLength={MESSAGE_MAX}
            onChange={event => { setMessage(event.target.value); }}
            placeholder="Anything that helps them get it right"
            style={{ ...inputStyle(false), resize: "vertical", minHeight: 80 }}
          />
        </div>

        <div>
          <label htmlFor={ids.due} style={labelStyle}>Due date <span style={{ fontWeight: 400, color: SLATE }}>(optional)</span></label>
          <input
            id={ids.due} type="date" value={due} aria-invalid={fieldErrors.due !== undefined}
            onChange={event => { setDue(event.target.value); }} style={inputStyle(fieldErrors.due !== undefined)}
          />
          <p style={hintStyle}>A target date they see. The request stays open after it passes.</p>
          {fieldErrors.due !== undefined && <p style={errorStyle}>{fieldErrors.due}</p>}
        </div>
      </form>
    </ModalFrame>
  );
}
