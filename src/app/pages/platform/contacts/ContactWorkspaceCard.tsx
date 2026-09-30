// A contact's place in the current workspace, and what can be done about it:
//
//   not in the workspace   → Invite to workspace (with a role)
//   invited, not joined    → Resend, Withdraw
//   a member               → Ask to prepare a document, Add to team
//
// Everything here uses routes that already exist — workspace invitations,
// 086's preparation request, and team membership — gated exactly as those
// pages gate them. Once an invitee accepts, the backend starts matching the
// contact to the member on its next read, so this card changes on its own at
// the next refresh.

import { useCallback, useEffect, useId, useState } from "react";
import { Link } from "react-router";
import {
  Building2, Send, RotateCw, XCircle, FilePenLine, Network, CheckCircle2, MailCheck, Clock3,
} from "lucide-react";
import { useWorkspaceAccess } from "../../../hooks/useWorkspaceAccess";
import { usePlatform } from "../../../context/PlatformContext";
import {
  realWorkspaceAdminService, ASSIGNABLE_ROLES, REAL_ROLE_LABELS,
} from "../../../services/real/workspace-admin.service";
import { realOrganizationService } from "../../../services/real/organization.service";
import type { WorkspaceInvitation, WorkspaceRoleId } from "../../../models/workspace-admin";
import type { Contact } from "../../../models/contacts";
import { Dialog, ErrorNote } from "../workspace/join/join-ui";
import { buttonStyle, inputStyle, labelStyle, hintStyle } from "../workspace/join/join-styles";
import { C, useLiveRefresh } from "./contacts-ui";

const normal = (email: string) => email.trim().toLowerCase();

export function ContactWorkspaceCard({ contact, workspaceId, onAskToPrepare, canAskToPrepare }: {
  contact: Contact; workspaceId: string;
  onAskToPrepare: () => void;
  /** 086's own gate for a preparation request (real workspace, the privilege). */
  canAskToPrepare: boolean;
}) {
  const access = useWorkspaceAccess();
  const platform = usePlatform();
  const workspaceName = platform.currentWorkspace?.name ?? "this workspace";
  const canInvite = access.can("invitation.create");
  const canSeeInvitations = access.can("invitation.view");
  const canManageTeams = access.can("unit.member.manage");
  const member = contact.workspaceMember ?? null;

  const [invitation, setInvitation] = useState<WorkspaceInvitation | null>(null);
  const [loaded, setLoaded] = useState(!canSeeInvitations);
  const [notice, setNotice] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);
  const [dialog, setDialog] = useState<"invite" | "withdraw" | "team" | null>(null);

  const loadInvitation = useCallback(async () => {
    if (!canSeeInvitations || member !== null) { setLoaded(true); return; }
    try {
      const all = await realWorkspaceAdminService.listInvitations(workspaceId);
      setInvitation(all.find(i => i.status === "pending" && normal(i.email) === normal(contact.email)) ?? null);
    } catch {
      // The card still offers what it can; an unknown invitation state is not an error to show.
    } finally {
      setLoaded(true);
    }
  }, [canSeeInvitations, member, workspaceId, contact.email]);

  useEffect(() => { void loadInvitation(); }, [loadInvitation]);
  useLiveRefresh(() => { void loadInvitation(); });

  const resend = async () => {
    if (!invitation) return;
    setBusy(true); setError(null);
    try {
      await realWorkspaceAdminService.resendInvitation(workspaceId, invitation.id, crypto.randomUUID());
      setNotice(`Invitation sent again to ${contact.email}.`);
      await loadInvitation();
    } catch { setError("The invitation could not be sent again. Please try again."); }
    setBusy(false);
  };

  const status = member !== null ? "member" : invitation !== null ? "invited" : "outside";

  return (
    <section aria-labelledby="ws-card-title" className="cw-card" id="workspace" data-testid="contact-workspace-card" data-status={status}>
      <div className="cw-head">
        <span aria-hidden className="cw-icon"><Building2 size={18} strokeWidth={2} /></span>
        <div style={{ minWidth: 0 }}>
          <h2 id="ws-card-title" className="cw-title">Workspace</h2>
          <p className="cw-sub">{workspaceName}</p>
        </div>
      </div>

      {notice && <p role="status" className="cw-notice"><CheckCircle2 size={15} aria-hidden /> {notice}</p>}
      {error && <ErrorNote>{error}</ErrorNote>}

      {status === "member" && (
        <>
          <p className="cw-state" data-tone="member"><CheckCircle2 size={16} aria-hidden /> <span><strong>Member</strong> · {member?.displayName}</span></p>
          <div className="cw-actions">
            {canAskToPrepare && (
              <button type="button" className="cw-btn" data-variant="primary" onClick={onAskToPrepare}>
                <FilePenLine size={15} aria-hidden /> Ask to prepare a document
              </button>
            )}
            {canManageTeams && member !== null && (
              <button type="button" className="cw-btn" onClick={() => { setDialog("team"); }}>
                <Network size={15} aria-hidden /> Add to team
              </button>
            )}
          </div>
          {!canAskToPrepare && !canManageTeams && (
            <p className="cw-hint">They can be given work from Prepare Document and Teams by those who manage them.</p>
          )}
        </>
      )}

      {status === "invited" && invitation && (
        <>
          <p className="cw-state" data-tone="invited">
            <MailCheck size={16} aria-hidden />
            <span><strong>Invited</strong> · {REAL_ROLE_LABELS[invitation.roleId as keyof typeof REAL_ROLE_LABELS] ?? invitation.roleName}
              {" · "}sent {new Date(invitation.sentAt).toLocaleDateString("en-PH", { month: "short", day: "numeric" })}</span>
          </p>
          <p className="cw-hint"><Clock3 size={13} aria-hidden /> Once they accept, you can ask them to prepare documents and add them to a team.</p>
          {canInvite && (
            <div className="cw-actions">
              <button type="button" className="cw-btn" disabled={busy} onClick={() => { void resend(); }}>
                <RotateCw size={15} aria-hidden /> Resend
              </button>
              <button type="button" className="cw-btn" data-variant="danger" disabled={busy} onClick={() => { setDialog("withdraw"); }}>
                <XCircle size={15} aria-hidden /> Withdraw
              </button>
            </div>
          )}
        </>
      )}

      {status === "outside" && loaded && (
        <>
          <p className="cw-state" data-tone="outside"><Building2 size={16} aria-hidden /> <span>Not in this workspace</span></p>
          {canInvite ? (
            <>
              <p className="cw-hint">Invite them to work with you here — then you can ask them to prepare documents and add them to a team.</p>
              <div className="cw-actions">
                <button type="button" className="cw-btn" data-variant="primary" onClick={() => { setDialog("invite"); }} data-testid="invite-contact">
                  <Send size={15} aria-hidden /> Invite to workspace
                </button>
              </div>
            </>
          ) : (
            <p className="cw-hint">An owner or administrator can invite them to this workspace.</p>
          )}
        </>
      )}

      {dialog === "invite" && (
        <InviteDialog email={contact.email} name={contact.name} workspaceId={workspaceId} workspaceName={workspaceName}
          onClose={() => { setDialog(null); }}
          onSent={() => { setDialog(null); setNotice(`Invitation sent to ${contact.email}.`); void loadInvitation(); }} />
      )}
      {dialog === "withdraw" && invitation && (
        <Dialog title="Withdraw the invitation?" onClose={() => { setDialog(null); }}
          footer={<>
            <button type="button" onClick={() => { setDialog(null); }} style={buttonStyle("secondary")}>Keep it</button>
            <button type="button" disabled={busy} style={{ ...buttonStyle("primary", busy), background: "#B42318", borderColor: "#B42318" }}
              onClick={() => {
                setBusy(true);
                void realWorkspaceAdminService.revokeInvitation(workspaceId, invitation.id)
                  .then(() => { setNotice("Invitation withdrawn."); setInvitation(null); })
                  .catch(() => { setError("The invitation could not be withdrawn. Please try again."); })
                  .finally(() => { setBusy(false); setDialog(null); });
              }}>Withdraw</button>
          </>}>
          <p style={{ ...C.GF, fontSize: 14, color: C.INK, margin: 0, lineHeight: 1.55 }}>
            The link in {contact.email}'s invitation will stop working. You can invite them again later.
          </p>
        </Dialog>
      )}
      {dialog === "team" && member !== null && (
        <AddToTeamDialog workspaceId={workspaceId} userId={member.userId} name={member.displayName}
          onClose={() => { setDialog(null); }}
          onAdded={team => { setDialog(null); setNotice(`${member.displayName} was added to ${team}.`); }} />
      )}

      <style>{CARD_CSS}</style>
    </section>
  );
}

function InviteDialog({ email, name, workspaceId, workspaceName, onClose, onSent }: {
  email: string; name: string; workspaceId: string; workspaceName: string; onClose: () => void; onSent: () => void;
}) {
  const [roleId, setRoleId] = useState<string>("member");
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const roleFieldId = useId();
  const send = async () => {
    setBusy(true); setError(null);
    try {
      await realWorkspaceAdminService.sendInvitation(workspaceId, { email, roleId: roleId as WorkspaceRoleId }, crypto.randomUUID());
      onSent();
    } catch {
      setError("The invitation could not be sent. They may already be invited or a member.");
      setBusy(false);
    }
  };
  return (
    <Dialog title={`Invite ${name} to ${workspaceName}`} onClose={onClose}
      footer={<>
        <button type="button" onClick={onClose} style={buttonStyle("secondary")}>Cancel</button>
        <button type="button" disabled={busy} onClick={() => { void send(); }} style={buttonStyle("primary", busy)} data-testid="confirm-invite-contact">
          {busy ? "Sending…" : "Send invitation"}
        </button>
      </>}>
      {error && <ErrorNote>{error}</ErrorNote>}
      <p style={{ ...C.GF, fontSize: 13.5, color: C.INK, margin: "0 0 14px", lineHeight: 1.55 }}>
        We'll email an invitation to <strong>{email}</strong>. They join once they accept it.
      </p>
      <label htmlFor={roleFieldId} style={labelStyle}>Role</label>
      <select id={roleFieldId} value={roleId} onChange={e => { setRoleId(e.target.value); }} style={inputStyle()}>
        {ASSIGNABLE_ROLES.map(r => <option key={r} value={r}>{REAL_ROLE_LABELS[r]}</option>)}
      </select>
      <p style={hintStyle}>You can change their role or privileges later in People › Members.</p>
    </Dialog>
  );
}

function AddToTeamDialog({ workspaceId, userId, name, onClose, onAdded }: {
  workspaceId: string; userId: string; name: string; onClose: () => void; onAdded: (teamName: string) => void;
}) {
  const [teams, setTeams] = useState<{ unitId: string; name: string }[] | null>(null);
  const [unitId, setUnitId] = useState("");
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const fieldId = useId();
  useEffect(() => {
    realOrganizationService.listUnits(workspaceId)
      .then(list => {
        const live = list.filter(u => u.archivedAt === null).map(u => ({ unitId: u.unitId, name: u.name }))
          .sort((a, b) => a.name.localeCompare(b.name));
        setTeams(live);
        setUnitId(live[0]?.unitId ?? "");
      })
      .catch(() => { setTeams([]); setError("Teams could not be loaded."); });
  }, [workspaceId]);
  const add = async () => {
    const team = teams?.find(t => t.unitId === unitId);
    if (!team) return;
    setBusy(true); setError(null);
    try {
      await realOrganizationService.addMember(workspaceId, unitId, { userId });
      onAdded(team.name);
    } catch {
      setError(`${name} could not be added. They may already be in ${team.name}.`);
      setBusy(false);
    }
  };
  const none = teams !== null && teams.length === 0;
  return (
    <Dialog title={`Add ${name} to a team`} onClose={onClose}
      footer={<>
        <button type="button" onClick={onClose} style={buttonStyle("secondary")}>Cancel</button>
        <button type="button" disabled={busy || none || teams === null} onClick={() => { void add(); }} style={buttonStyle("primary", busy || none)}>
          {busy ? "Adding…" : "Add to team"}
        </button>
      </>}>
      {error && <ErrorNote>{error}</ErrorNote>}
      <label htmlFor={fieldId} style={labelStyle}>Team</label>
      <select id={fieldId} value={unitId} onChange={e => { setUnitId(e.target.value); }} disabled={teams === null || none} style={inputStyle()}>
        {teams === null && <option value="">Loading teams…</option>}
        {none && <option value="">No team created yet</option>}
        {teams?.map(t => <option key={t.unitId} value={t.unitId}>{t.name}</option>)}
      </select>
      {none && (
        <p style={hintStyle}>
          <Link to="/app/workspace/teams" style={{ color: C.AZURE, fontWeight: 600, textDecoration: "none" }}>Create one</Link> in Workspace › Organisation first.
        </p>
      )}
    </Dialog>
  );
}

const CARD_CSS = `
.cw-card { background: #FFFFFF; border: 1.5px solid ${C.BORDER}; border-radius: 14px; padding: 16px 18px; display: flex; flex-direction: column; gap: 12px; min-width: 0; }
.cw-head { display: flex; align-items: center; gap: 10px; min-width: 0; }
.cw-icon { width: 36px; height: 36px; border-radius: 10px; background: ${C.LIGHT}; color: ${C.AZURE_TEXT}; display: flex; align-items: center; justify-content: center; flex-shrink: 0; }
.cw-title { font-family: 'Geist', sans-serif; font-size: 15px; font-weight: 800; color: ${C.NAVY}; margin: 0; }
.cw-sub { font-family: 'Geist', sans-serif; font-size: 12.5px; color: ${C.MUTED}; margin: 1px 0 0; overflow: hidden; text-overflow: ellipsis; white-space: nowrap; }
.cw-state { display: flex; align-items: center; gap: 8px; margin: 0; padding: 10px 12px; border-radius: 10px; font-family: 'Geist', sans-serif; font-size: 13.5px; color: ${C.INK}; }
.cw-state svg { flex-shrink: 0; }
.cw-state[data-tone="member"] { background: #ECFDF3; color: #14532D; }
.cw-state[data-tone="invited"] { background: #EFF6FF; color: #1E3A8A; }
.cw-state[data-tone="outside"] { background: #F8FAFC; color: ${C.SLATE}; }
.cw-hint { display: flex; gap: 6px; align-items: flex-start; font-family: 'Geist', sans-serif; font-size: 12.5px; color: ${C.MUTED}; margin: 0; line-height: 1.5; }
.cw-hint svg { flex-shrink: 0; margin-top: 2px; }
.cw-actions { display: flex; flex-wrap: wrap; gap: 8px; }
.cw-btn { display: inline-flex; align-items: center; gap: 7px; min-height: 40px; padding: 0 14px; border-radius: 9px; border: 1.5px solid #CBD5E1;
  background: #FFFFFF; color: ${C.INK}; font-family: 'Geist', sans-serif; font-size: 13px; font-weight: 700; cursor: pointer; }
.cw-btn:hover:not(:disabled) { border-color: ${C.AZURE}; color: ${C.AZURE_TEXT}; }
.cw-btn:disabled { opacity: 0.55; cursor: not-allowed; }
.cw-btn:focus-visible { outline: 3px solid rgba(0,120,212,0.35); outline-offset: 1px; }
.cw-btn[data-variant="primary"] { background: ${C.AZURE}; border-color: ${C.AZURE}; color: #FFFFFF; }
.cw-btn[data-variant="primary"]:hover:not(:disabled) { background: #006CBE; color: #FFFFFF; }
.cw-btn[data-variant="danger"] { color: #B42318; border-color: #FECACA; }
.cw-notice { display: flex; align-items: center; gap: 7px; margin: 0; font-family: 'Geist', sans-serif; font-size: 13px; color: #14532D; background: #F0FDF4;
  border: 1px solid #BBF7D0; border-radius: 9px; padding: 8px 12px; }
@media (max-width: 480px) { .cw-btn { flex: 1 1 100%; justify-content: center; } }
`;
