// One received workspace invitation, drawn as a letter in an envelope.
//
//   ┌──────────────────────────────── brand colour ─┐
//   │ [logo] Workspace name              ┌stamp┐     │  ← the SAME BrandBand the
//   │        Workspace invitation        └─────┘     │    Completed document cards use
//   └───────────────╲──────── flap ──────╱───────────┘
//     FROM     Ana Reyes · Reyes Law Office
//     SUBJECT  Invitation to join Reyes Law Office as Sender
//     RECEIVED Sep 20, 2026        EXPIRES Sep 27, 2026
//     [ status note ]                 [ actions ]
//   ▚▚▚▚▚▚▚▚▚▚▚▚▚▚▚▚▚ airmail edge ▚▚▚▚▚▚▚▚▚▚▚▚▚▚▚▚▚
//
// The flap, stamp and airmail edge are decoration and hidden from assistive
// technology; the letter itself is an <article> named by its subject line.

import { useId, type ReactNode } from "react";
import { Mail, Clock, MessageSquare, CircleCheck, Hourglass, Ban } from "lucide-react";
import { BrandBand } from "../settings/branding-preview";
import { StatusChip, type ChipTone } from "../../../components/document-sharing/SharingPrimitives";
import {
  formatInvitationDate, invitationLogoUrl, invitationRoleLabel, isInvitationExpired, toIsoOrNull,
  type MyInvitation,
} from "../../../services/real/my-invitations.service";

const GM = { fontFamily: "'Geist Mono', monospace" } as const;
const DEFAULT_COLOR = "#0078D4";

export function invitationSubject(item: MyInvitation): string {
  return `Invitation to join ${item.workspaceName} as ${invitationRoleLabel(item.role)}`;
}

function Stamp() {
  return (
    <span aria-hidden className="inv-stamp">
      <Mail size={18} strokeWidth={2} />
      <span style={{ ...GM, fontSize: 8, letterSpacing: "0.08em", fontWeight: 700 }}>LAGDA</span>
    </span>
  );
}

function statusChip(item: MyInvitation, joined: boolean): { tone: ChipTone; text: string; icon: ReactNode } {
  if (item.status === "declined") return { tone: "danger", text: "Rejected", icon: <Ban size={11} aria-hidden /> };
  if (item.status === "accepted") {
    return joined
      ? { tone: "success", text: "Joined", icon: <CircleCheck size={11} aria-hidden /> }
      : { tone: "info", text: "Waiting for approval", icon: <Hourglass size={11} aria-hidden /> };
  }
  if (isInvitationExpired(item)) return { tone: "neutral", text: "Expired", icon: <Clock size={11} aria-hidden /> };
  return { tone: "warning", text: "Awaiting your answer", icon: <Mail size={11} aria-hidden /> };
}

export function InvitationLetter({ item, joined, highlighted, children }: {
  item: MyInvitation;
  /** The account is already a member of the inviting workspace. */
  joined: boolean;
  highlighted: boolean;
  /** The actions for this letter's tab. */
  children?: ReactNode;
}) {
  const subjectId = useId();
  const color = item.branding?.primaryColor ?? DEFAULT_COLOR;
  const brandName = item.branding?.displayName || item.workspaceName;
  const chip = statusChip(item, joined);
  const expired = item.status === "pending" && isInvitationExpired(item);
  const inviter = item.invitedBy?.displayName ?? "A workspace administrator";

  return (
    <li id={`invitation-${item.invitationId}`} className={`inv-letter${highlighted ? " inv-letter--highlighted" : ""}`}
      data-testid="invitation-card" data-status={item.status}>
      <article aria-labelledby={subjectId} style={{ display: "flex", flexDirection: "column", minWidth: 0, height: "100%" }}>
        <div className="inv-envelope-top">
          <BrandBand variant="card" compact testId="invitation-banner" subtitle="Workspace invitation"
            branding={{ displayName: brandName, primaryColor: color, logoPreviewUrl: invitationLogoUrl(item) }}
            headerAside={<Stamp />} />
          <svg className="inv-flap" viewBox="0 0 100 10" preserveAspectRatio="none" aria-hidden focusable="false">
            <path d="M0 0 H100 L50 10 Z" fill={color} />
            <path d="M0 0 L50 10 L100 0" fill="none" stroke="rgba(7,17,31,0.18)" strokeWidth="0.6" vectorEffect="non-scaling-stroke" />
          </svg>
        </div>

        <div className="inv-letter-body">
          <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", gap: 8, flexWrap: "wrap" }}>
            <StatusChip tone={chip.tone}>{chip.icon}{chip.text}</StatusChip>
          </div>

          <dl className="inv-meta">
            <div className="inv-meta-row">
              <dt>From</dt>
              <dd data-testid="invitation-from">{inviter} · {item.workspaceName}</dd>
            </div>
            <div className="inv-meta-row">
              <dt>Subject</dt>
              <dd><h3 id={subjectId} className="inv-subject">{invitationSubject(item)}</h3></dd>
            </div>
            <div className="inv-meta-dates">
              <div className="inv-meta-row">
                <dt>Received</dt>
                <dd><time dateTime={toIsoOrNull(item.createdAt)}>{formatInvitationDate(item.createdAt)}</time></dd>
              </div>
              {item.expiresAt !== null && (
                <div className="inv-meta-row">
                  <dt>{expired ? "Expired" : "Expires"}</dt>
                  <dd><time dateTime={toIsoOrNull(item.expiresAt)}>{formatInvitationDate(item.expiresAt)}</time></dd>
                </div>
              )}
            </div>
          </dl>

          {item.status === "declined" && (
            <div className="inv-note inv-note--declined" data-testid="invitation-reason">
              <MessageSquare size={14} aria-hidden style={{ flexShrink: 0, marginTop: 2 }} />
              <div style={{ minWidth: 0 }}>
                <strong style={{ display: "block", fontWeight: 700 }}>
                  Your reason{item.declinedAt !== null ? <> · rejected {formatInvitationDate(item.declinedAt)}</> : null}
                </strong>
                <span style={{ overflowWrap: "anywhere" }}>“{item.declineReason ?? "No reason recorded."}”</span>
              </div>
            </div>
          )}
          {item.status === "accepted" && (
            <div className={`inv-note ${joined ? "inv-note--joined" : "inv-note--waiting"}`} data-testid="invitation-accepted-note">
              {joined ? <CircleCheck size={14} aria-hidden style={{ flexShrink: 0, marginTop: 2 }} /> : <Hourglass size={14} aria-hidden style={{ flexShrink: 0, marginTop: 2 }} />}
              <span>
                {joined
                  ? <>Joined — you are a member of <strong>{item.workspaceName}</strong>.</>
                  : <>Waiting for approval — the workspace owner will approve your access.</>}
              </span>
            </div>
          )}
          {expired && (
            <div className="inv-note inv-note--expired">
              <Clock size={14} aria-hidden style={{ flexShrink: 0, marginTop: 2 }} />
              <span>This invitation has expired. Ask {item.workspaceName} to send a new one.</span>
            </div>
          )}

          {children && <div className="inv-actions">{children}</div>}
        </div>
        <div className="inv-airmail" aria-hidden />
      </article>
    </li>
  );
}

export const INVITATION_STYLES = `
  .inv-grid { list-style: none; margin: 0; padding: 0; display: grid; gap: 18px; grid-template-columns: repeat(auto-fill, minmax(min(100%, 340px), 1fr)); min-width: 0; }
  .inv-letter { position: relative; min-width: 0; background: #FFFFFF; border: 1px solid #E2E8F0; border-radius: 12px; overflow: hidden;
    box-shadow: 0 1px 2px rgba(7,17,31,0.05), 0 8px 20px -14px rgba(7,17,31,0.35); scroll-margin: 90px; }
  .inv-letter--highlighted { outline: 3px solid #0078D4; outline-offset: 2px; }
  .inv-envelope-top { position: relative; }
  .inv-flap { display: block; width: 100%; height: 16px; margin-top: -1px; }
  .inv-stamp { flex-shrink: 0; width: 42px; height: 50px; display: inline-flex; flex-direction: column; align-items: center; justify-content: center; gap: 3px;
    color: #FFFFFF; border: 2px dashed rgba(255,255,255,0.85); border-radius: 4px; background: rgba(255,255,255,0.14); transform: rotate(4deg); }
  .inv-letter-body { padding: 6px 18px 16px; display: flex; flex-direction: column; gap: 12px; flex: 1; min-width: 0; }
  .inv-meta { margin: 0; display: flex; flex-direction: column; gap: 8px; min-width: 0; border-top: 1px dashed #CBD5E1; padding-top: 10px; }
  .inv-meta-row { display: grid; grid-template-columns: 72px minmax(0, 1fr); gap: 8px; align-items: baseline; min-width: 0; }
  .inv-meta-row dt { font-family: 'Geist Mono', monospace; font-size: 10.5px; font-weight: 700; letter-spacing: 0.08em; text-transform: uppercase; color: #475569; }
  .inv-meta-row dd { margin: 0; font-family: 'Geist', sans-serif; font-size: 13.5px; color: #07111F; overflow-wrap: anywhere; min-width: 0; }
  .inv-meta-dates { display: flex; flex-wrap: wrap; gap: 8px 20px; }
  .inv-meta-dates .inv-meta-row { flex: 1 1 180px; }
  .inv-subject { margin: 0; font-family: 'Geist', sans-serif; font-size: 15px; font-weight: 700; line-height: 1.35; color: #07111F; overflow-wrap: anywhere; }
  .inv-note { display: flex; gap: 8px; align-items: flex-start; border-radius: 8px; padding: 9px 11px; font-family: 'Geist', sans-serif; font-size: 13px; line-height: 1.5; min-width: 0; }
  .inv-note--declined { background: #FEF2F2; border: 1px solid #FECACA; color: #7F1D1D; }
  .inv-note--waiting { background: #EFF6FF; border: 1px solid #BFDBFE; color: #1E3A8A; }
  .inv-note--joined { background: #F0FDF4; border: 1px solid #BBF7D0; color: #14532D; }
  .inv-note--expired { background: #F8FAFC; border: 1px solid #E2E8F0; color: #334155; }
  .inv-actions { display: flex; flex-wrap: wrap; gap: 8px; justify-content: flex-end; margin-top: auto; padding-top: 4px; }
  .inv-airmail { height: 6px; flex-shrink: 0; background: repeating-linear-gradient(135deg, #B42318 0 10px, #FFFFFF 10px 16px, #1E3A8A 16px 26px, #FFFFFF 26px 32px); }
  @media (max-width: 480px) {
    .inv-letter-body { padding: 6px 14px 14px; }
    .inv-meta-row { grid-template-columns: 1fr; gap: 1px; }
    .inv-actions > * { flex: 1 1 auto; }
  }
`;
