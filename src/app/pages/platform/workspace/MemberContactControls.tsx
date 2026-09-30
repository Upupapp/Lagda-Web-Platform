// The controls for adding workspace members to Contacts: a per-member button
// (or "In contacts ✓" once they are), and the short confirmation that shows
// what will be saved and asks whether to share it with the workspace. The
// logic lives in member-contacts.ts.

import { useId, useState } from "react";
import { Link } from "react-router";
import { Check, UserPlus } from "lucide-react";
import { usePlatform } from "../../../context/PlatformContext";
import type { ContactScope } from "../../../models/contacts";
import type { WorkspaceMemberSummary } from "../../../models/workspace-admin";
import { Dialog } from "./join/join-ui";
import { buttonStyle } from "./join/join-styles";
import { describeContactsResult, type MemberContacts, type MemberContactsResult } from "./member-contacts";

const GF = { fontFamily: "'Geist', sans-serif" };
const NAVY = "#07111F";
const AZURE = "#0078D4";
const SLATE = "#64748B";
const SUCCESS = "#15803D";

/**
 * "Add to contacts" for one member, "In contacts ✓" when they already are,
 * and nothing when the member cannot be added (you, or no contacts access).
 */
export function AddToContactsButton({ member, contacts, onAdd, variant = "link" }: {
  member: WorkspaceMemberSummary; contacts: MemberContacts; onAdd: () => void;
  /** "link": a quiet text button for table rows; "button": a bordered one for cards and headers. */
  variant?: "link" | "button";
}) {
  if (!contacts.eligible(member)) return null;
  const existing = contacts.contactIdFor(member);
  if (existing !== null) {
    return (
      <Link to={`/app/contacts/${existing}`} data-testid={`in-contacts-${member.id}`}
        aria-label={`${member.displayName} is in contacts — open their contact`}
        style={{ ...GF, fontSize: variant === "link" ? 12 : 13, fontWeight: 600, color: SUCCESS, textDecoration: "none",
          display: "inline-flex", alignItems: "center", gap: 4, padding: variant === "link" ? "4px 8px" : "8px 4px", whiteSpace: "nowrap" }}>
        <Check size={14} strokeWidth={2.4} aria-hidden /> In contacts
      </Link>
    );
  }
  const style = variant === "link"
    ? { ...GF, fontSize: 12, fontWeight: 600, color: AZURE, background: "none", border: "none", cursor: "pointer", padding: "4px 8px",
        display: "inline-flex", alignItems: "center", gap: 4, whiteSpace: "nowrap" as const }
    : { ...buttonStyle("secondary"), display: "inline-flex", alignItems: "center", gap: 6 };
  return (
    <button type="button" onClick={onAdd} disabled={contacts.checking} data-testid={`add-contact-${member.id}`}
      aria-label={`Add ${member.displayName} to contacts`} style={{ ...style, opacity: contacts.checking ? 0.55 : 1 }}>
      <UserPlus size={14} strokeWidth={2} aria-hidden /> Add to contacts
    </button>
  );
}

/** Confirms what will be saved, for one member or several, and saves it. */
export function AddToContactsDialog({ members, contacts, onClose, onDone }: {
  members: readonly WorkspaceMemberSummary[]; contacts: MemberContacts;
  onClose: () => void; onDone: (message: string, result: MemberContactsResult) => void;
}) {
  const platform = usePlatform();
  const [share, setShare] = useState(false);
  const [busy, setBusy] = useState(false);
  const shareId = useId();
  const addable = members.filter(m => contacts.eligible(m));
  const already = addable.filter(m => contacts.contactIdFor(m) !== null).length;
  const fresh = addable.length - already;
  const single = members.length === 1 ? members[0] : undefined;
  const organization = platform.currentWorkspace?.name ?? null;

  async function save() {
    setBusy(true);
    const scope: ContactScope = share ? "workspace" : "personal";
    const result = await contacts.add(addable, scope);
    onDone(describeContactsResult(result, scope), result);
  }

  const row = (label: string, value: string) => (
    <div style={{ display: "flex", gap: 12, padding: "6px 0", borderTop: "1px solid #F1F5F9" }}>
      <dt style={{ ...GF, fontSize: 12.5, color: SLATE, flex: "0 0 96px" }}>{label}</dt>
      <dd style={{ ...GF, fontSize: 13, color: NAVY, margin: 0, minWidth: 0, overflowWrap: "anywhere" }}>{value}</dd>
    </div>
  );

  return (
    <Dialog title={single ? `Add ${single.displayName} to contacts` : `Add ${String(addable.length)} members to contacts`} onClose={onClose}
      footer={<>
        <button type="button" onClick={onClose} style={buttonStyle("secondary")}>Cancel</button>
        <button type="button" onClick={() => void save()} disabled={busy || fresh === 0} style={buttonStyle("primary", busy || fresh === 0)}
          data-testid="confirm-add-contacts">
          {busy ? "Adding…" : "Add to contacts"}
        </button>
      </>}>
      {single ? (
        <dl style={{ margin: "0 0 14px" }}>
          {row("Name", single.displayName)}
          {row("Email", single.email)}
          {single.roleTitle?.trim() ? row("Title", single.roleTitle.trim()) : null}
          {organization ? row("Organisation", organization) : null}
          {row("Tag", "Internal")}
        </dl>
      ) : (
        <p style={{ ...GF, fontSize: 13.5, color: NAVY, margin: "0 0 14px", lineHeight: 1.55 }}>
          Each is saved with their name, email and title{organization ? `, ${organization} as the organisation,` : ""} and the Internal tag.
          {already > 0 && <> {String(already)} {already === 1 ? "is" : "are"} already in contacts and will be skipped.</>}
          {members.length > addable.length && <> You and anyone who is no longer active are left out.</>}
        </p>
      )}
      <label htmlFor={shareId} style={{ ...GF, fontSize: 13.5, color: NAVY, display: "flex", gap: 10, alignItems: "flex-start", cursor: "pointer" }}>
        <input id={shareId} type="checkbox" checked={share} onChange={e => setShare(e.target.checked)}
          style={{ marginTop: 3, width: 16, height: 16, flexShrink: 0 }} />
        <span>
          Share with the workspace
          <span style={{ display: "block", fontSize: 12.5, color: SLATE, marginTop: 2 }}>
            Everyone in the workspace can pick {single ? "this contact" : "these contacts"}. Otherwise only you can.
          </span>
        </span>
      </label>
    </Dialog>
  );
}
