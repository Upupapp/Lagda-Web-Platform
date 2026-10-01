// /app/contacts/pending — requests to add each other as contacts (091).
//
// "Waiting for you": accept (into the workspace you choose — defaulting to
// the one you have open) or decline. Declining is quiet: the sender is never
// told. "You sent": cancel any you no longer want. The lists refresh every
// minute and when you come back to the tab.

import { useState, useId } from "react";
import { Link } from "react-router";
import { Check, X, Inbox, Send, Building2, UserSearch, PartyPopper, Clock3 } from "lucide-react";
import { usePlatform } from "../../../context/PlatformContext";
import {
  contactConnectionsService, connectionErrorMessage, personAvatarUrl, type ContactConnection,
} from "../../../services/real/contact-connections.service";
import { C, ContactsHeader, PersonAvatar, useConnectionLists, FIND_PEOPLE_ROUTE } from "./contacts-ui";
import { withProcess } from "../../../config/process-screens";

const when = (iso: string) => new Date(iso).toLocaleDateString("en-PH", { month: "short", day: "numeric", year: "numeric" });

interface Accepted { name: string; contactId: string | null; workspaceId: string }

export function PendingContactsPage() {
  const platform = usePlatform();
  const { available, lists, error, refresh } = useConnectionLists();
  const [busy, setBusy] = useState<string | null>(null);
  const [actionError, setActionError] = useState<string | null>(null);
  const [accepted, setAccepted] = useState<Accepted | null>(null);
  const [declined, setDeclined] = useState<string | null>(null);
  const workspaces = platform.workspaces;
  const [target, setTarget] = useState<Record<string, string>>({});
  const currentId = platform.currentWorkspace?.id ?? workspaces[0]?.id ?? "";

  const act = async (c: ContactConnection, action: "accept" | "decline" | "cancel") => {
    setBusy(c.connectionId); setActionError(null); setAccepted(null); setDeclined(null);
    try {
      if (action === "accept") {
        const workspaceId = target[c.connectionId] ?? currentId;
        const result = await withProcess("contact-request-accept", c.person.displayName, () => contactConnectionsService.accept(c.connectionId, workspaceId));
        setAccepted({ name: c.person.displayName, contactId: result.contactId, workspaceId: result.workspaceId });
      } else if (action === "decline") {
        await withProcess("contact-request-decline", "", () => contactConnectionsService.decline(c.connectionId));
        setDeclined(c.person.displayName);
      } else {
        await withProcess("contact-request-cancel", "", () => contactConnectionsService.cancel(c.connectionId));
      }
      refresh();
    } catch (err) {
      setActionError(connectionErrorMessage(err, "That didn't work. Please try again."));
    }
    setBusy(null);
  };

  const received = lists?.received ?? [];
  const sent = lists?.sent ?? [];

  return (
    <div style={{ minHeight: "100vh", background: C.CANVAS }}>
      <ContactsHeader section="pending" pendingCount={received.length}
        subtitle="People who asked to add you as a contact, and the requests you sent. Accepting adds you to each other's contacts." />

      <main className="pc-main">
        {!available && (
          <p className="pc-info"><Inbox size={15} aria-hidden /> Contact requests are available in a connected LAGDA workspace.</p>
        )}
        {error && <p role="alert" className="pc-alert">{error}</p>}
        {actionError && <p role="alert" className="pc-alert">{actionError}</p>}

        {accepted && (
          <div role="status" className="pc-success" data-testid="accepted-banner">
            <span aria-hidden className="pc-success-icon"><PartyPopper size={18} /></span>
            <div style={{ flex: "1 1 220px", minWidth: 0 }}>
              <strong>You and {accepted.name} are now contacts.</strong>
              <span>
                {accepted.workspaceId === platform.currentWorkspace?.id
                  ? " You can invite them to this workspace from their profile."
                  : ` They were added to your contacts in ${workspaces.find(w => w.id === accepted.workspaceId)?.name ?? "the workspace you chose"}.`}
              </span>
            </div>
            {accepted.contactId && accepted.workspaceId === platform.currentWorkspace?.id && (
              <div className="pc-row-actions">
                <Link to={`/app/contacts/${accepted.contactId}`} className="pc-btn">View contact</Link>
                <Link to={`/app/contacts/${accepted.contactId}#workspace`} className="pc-btn" data-variant="primary">
                  <Building2 size={15} aria-hidden /> Invite to workspace
                </Link>
              </div>
            )}
          </div>
        )}
        {declined && <p role="status" className="pc-quiet">Declined. {declined} isn't told.</p>}

        <section aria-labelledby="pc-received" className="pc-section">
          <h2 id="pc-received" className="pc-h2"><Inbox size={17} aria-hidden /> Waiting for you
            {received.length > 0 && <span className="pc-count">{received.length}</span>}</h2>
          {lists === null && available && <div className="pc-skeleton" aria-busy="true" aria-label="Loading requests" />}
          {lists !== null && received.length === 0 && (
            <p className="pc-empty">No one is waiting for an answer. When someone asks to add you, it appears here and in your notifications.</p>
          )}
          <ul className="pc-list">
            {received.map(c => (
              <li key={c.connectionId} className="pc-card" data-testid={`received-${c.connectionId}`}>
                <PersonAvatar name={c.person.displayName} avatarUrl={personAvatarUrl(c.person)} size={56} />
                <div className="pc-text">
                  <strong className="pc-name">{c.person.displayName}</strong>
                  {(c.person.jobTitle || c.person.organization) && (
                    <span className="pc-role">{[c.person.jobTitle, c.person.organization].filter(Boolean).join(" · ")}</span>
                  )}
                  <span className="pc-meta"><Building2 size={12} aria-hidden /> From {c.workspaceName} · <Clock3 size={12} aria-hidden /> {when(c.createdAt)}</span>
                </div>
                <div className="pc-row-actions">
                  {workspaces.length > 1 && (
                    <WorkspacePicker value={target[c.connectionId] ?? currentId} workspaces={workspaces}
                      onChange={v => { setTarget(t => ({ ...t, [c.connectionId]: v })); }} />
                  )}
                  <button type="button" className="pc-btn" data-variant="primary" disabled={busy !== null}
                    onClick={() => { void act(c, "accept"); }} aria-label={`Accept ${c.person.displayName}'s request`}>
                    <Check size={15} aria-hidden /> Accept
                  </button>
                  <button type="button" className="pc-btn" data-variant="quiet" disabled={busy !== null}
                    onClick={() => { void act(c, "decline"); }} aria-label={`Decline ${c.person.displayName}'s request`}>
                    <X size={15} aria-hidden /> Decline
                  </button>
                </div>
              </li>
            ))}
          </ul>
        </section>

        <section aria-labelledby="pc-sent" className="pc-section">
          <h2 id="pc-sent" className="pc-h2"><Send size={16} aria-hidden /> You sent</h2>
          {lists !== null && sent.length === 0 && (
            <p className="pc-empty">
              No requests waiting. <Link to={FIND_PEOPLE_ROUTE} style={{ color: C.AZURE_TEXT, fontWeight: 700, textDecoration: "none" }}>
                <UserSearch size={13} aria-hidden style={{ verticalAlign: "-2px" }} /> Find people</Link> to add someone on LAGDA.
            </p>
          )}
          <ul className="pc-list">
            {sent.map(c => (
              <li key={c.connectionId} className="pc-card" data-testid={`sent-${c.connectionId}`}>
                <PersonAvatar name={c.person.displayName} avatarUrl={personAvatarUrl(c.person)} size={48} />
                <div className="pc-text">
                  <strong className="pc-name">{c.person.displayName}</strong>
                  {(c.person.jobTitle || c.person.organization) && (
                    <span className="pc-role">{[c.person.jobTitle, c.person.organization].filter(Boolean).join(" · ")}</span>
                  )}
                  <span className="pc-meta"><Clock3 size={12} aria-hidden /> Requested {when(c.createdAt)}</span>
                </div>
                <div className="pc-row-actions">
                  <span className="pc-pill"><Check size={13} aria-hidden /> Requested</span>
                  <button type="button" className="pc-btn" data-variant="quiet" disabled={busy !== null}
                    onClick={() => { void act(c, "cancel"); }} aria-label={`Cancel your request to ${c.person.displayName}`}>
                    <X size={15} aria-hidden /> Cancel
                  </button>
                </div>
              </li>
            ))}
          </ul>
        </section>
      </main>
      <style>{CSS}</style>
    </div>
  );
}

function WorkspacePicker({ value, workspaces, onChange }: {
  value: string; workspaces: readonly { id: string; name: string }[]; onChange: (id: string) => void;
}) {
  const id = useId();
  return (
    <span className="pc-picker">
      <label htmlFor={id}>Add to</label>
      <select id={id} value={value} onChange={e => { onChange(e.target.value); }}>
        {workspaces.map(w => <option key={w.id} value={w.id}>{w.name}</option>)}
      </select>
    </span>
  );
}

const CSS = `
.pc-main { max-width: 900px; padding: 20px 24px 48px; box-sizing: border-box; display: flex; flex-direction: column; gap: 18px; }
.pc-section { display: flex; flex-direction: column; gap: 10px; }
.pc-h2 { display: flex; align-items: center; gap: 8px; font-family: 'Geist', sans-serif; font-size: 16px; font-weight: 800; color: ${C.NAVY}; margin: 0; }
.pc-count { font-family: 'Geist Mono', monospace; font-size: 11px; font-weight: 700; min-width: 20px; height: 20px; padding: 0 6px; box-sizing: border-box; border-radius: 999px;
  display: inline-flex; align-items: center; justify-content: center; background: #FFF8E1; color: #8A5A00; border: 1px solid #F5D98B; }
.pc-list { list-style: none; margin: 0; padding: 0; display: flex; flex-direction: column; gap: 10px; }
.pc-card { display: flex; align-items: center; gap: 14px; flex-wrap: wrap; background: #FFFFFF; border: 1.5px solid ${C.BORDER}; border-radius: 14px; padding: 14px 16px; }
.pc-text { flex: 1 1 220px; min-width: 0; display: flex; flex-direction: column; gap: 2px; font-family: 'Geist', sans-serif; }
.pc-name { font-size: 15px; color: ${C.NAVY}; overflow-wrap: anywhere; }
.pc-role { font-size: 13px; color: ${C.SLATE}; }
.pc-meta { display: inline-flex; align-items: center; gap: 4px; flex-wrap: wrap; font-size: 12px; color: ${C.MUTED}; margin-top: 3px; }
.pc-row-actions { display: flex; align-items: center; gap: 8px; flex-wrap: wrap; }
.pc-btn { display: inline-flex; align-items: center; justify-content: center; gap: 6px; min-height: 40px; padding: 0 14px; border-radius: 9px; border: 1.5px solid #CBD5E1;
  background: #FFFFFF; color: ${C.INK}; font-family: 'Geist', sans-serif; font-size: 13px; font-weight: 700; cursor: pointer; text-decoration: none; white-space: nowrap; }
.pc-btn:hover:not(:disabled) { border-color: ${C.AZURE}; color: ${C.AZURE_TEXT}; }
.pc-btn:disabled { opacity: 0.55; cursor: not-allowed; }
.pc-btn:focus-visible { outline: 3px solid rgba(0,120,212,0.35); outline-offset: 1px; }
.pc-btn[data-variant="primary"] { background: ${C.AZURE}; border-color: ${C.AZURE}; color: #FFFFFF; }
.pc-btn[data-variant="primary"]:hover:not(:disabled) { background: #006CBE; color: #FFFFFF; }
.pc-btn[data-variant="quiet"] { color: ${C.SLATE}; }
.pc-pill { display: inline-flex; align-items: center; gap: 5px; font-family: 'Geist', sans-serif; font-size: 12px; font-weight: 700; color: #166534;
  background: #ECFDF3; border: 1px solid #BBF7D0; border-radius: 999px; padding: 4px 10px; }
.pc-picker { display: inline-flex; align-items: center; gap: 6px; font-family: 'Geist', sans-serif; font-size: 12.5px; color: ${C.SLATE}; }
.pc-picker select { font-family: 'Geist', sans-serif; font-size: 13px; color: ${C.NAVY}; min-height: 40px; max-width: 200px; border: 1.5px solid #CBD5E1; border-radius: 9px; padding: 0 10px; background: #FFFFFF; }
.pc-empty { font-family: 'Geist', sans-serif; font-size: 13.5px; color: ${C.SLATE}; background: #FFFFFF; border: 1.5px dashed #CBD5E1; border-radius: 12px; padding: 14px 16px; margin: 0; line-height: 1.55; }
.pc-skeleton { height: 84px; border-radius: 14px; background: linear-gradient(90deg, #EEF2F6, #F8FAFC, #EEF2F6); }
.pc-alert { font-family: 'Geist', sans-serif; font-size: 13.5px; color: #991B1B; background: #FEF2F2; border: 1px solid #FECACA; border-radius: 10px; padding: 10px 14px; margin: 0; }
.pc-info { display: flex; align-items: center; gap: 8px; font-family: 'Geist', sans-serif; font-size: 13px; color: #1E3A8A; background: #EFF6FF; border: 1px solid #BFDBFE; border-radius: 10px; padding: 10px 12px; margin: 0; }
.pc-success { display: flex; align-items: center; gap: 12px; flex-wrap: wrap; font-family: 'Geist', sans-serif; font-size: 13.5px; color: #14532D;
  background: linear-gradient(180deg, #F0FDF4 0%, #ECFDF3 100%); border: 1.5px solid #BBF7D0; border-radius: 14px; padding: 14px 16px; }
.pc-success strong { display: block; font-size: 14.5px; }
.pc-success-icon { width: 40px; height: 40px; border-radius: 12px; background: #FFFFFF; color: #15803D; display: flex; align-items: center; justify-content: center; flex-shrink: 0; }
.pc-quiet { font-family: 'Geist', sans-serif; font-size: 13px; color: ${C.SLATE}; margin: 0; }
@media (max-width: 600px) {
  .pc-main { padding: 14px 16px 40px; }
  .pc-row-actions { width: 100%; }
  .pc-row-actions .pc-btn { flex: 1 1 0; }
  .pc-picker { width: 100%; }
  .pc-picker select { flex: 1 1 auto; max-width: none; }
}
`;
