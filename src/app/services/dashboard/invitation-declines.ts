// Which "declined your invitation" notices belong in the dashboard's Needs
// attention list.
//
// The notices come from the account feed (`/me/notifications`,
// WORKSPACE_INVITATION_DECLINED — sent to the INVITER). One stays in Needs
// attention while it is unread, not dismissed and recent: opening it marks it
// read and the "Dismiss" control dismisses it — both persisted server-side
// (090), so it stays gone after a reload or on another device — and a decline
// older than the window is history, not something waiting on you.

import type { NotificationRecord, InvitationDeclineDetail } from "../../models/notifications";
import { SENT_INVITATIONS_PATH, sentInvitationPath } from "../real/my-invitations.service";

/** How long an unread decline stays in Needs attention. */
export const DECLINE_ATTENTION_WINDOW_DAYS = 14;

const DAY_MS = 86_400_000;

export interface DeclineAttentionEntry {
  readonly notice: NotificationRecord;
  readonly decline: InvitationDeclineDetail;
}

/** Unread, not dismissed, and within the window; newest first. */
export function invitationDeclinesNeedingAttention(
  items: readonly NotificationRecord[], now = Date.now(),
): DeclineAttentionEntry[] {
  const cutoff = now - DECLINE_ATTENTION_WINDOW_DAYS * DAY_MS;
  return items
    .filter((n): n is NotificationRecord & { invitationDecline: InvitationDeclineDetail } =>
      n.invitationDecline !== undefined && n.status === "unread")
    .filter(n => {
      const at = Date.parse(n.createdAt);
      return Number.isFinite(at) && at >= cutoff;
    })
    .sort((a, b) => Date.parse(b.createdAt) - Date.parse(a.createdAt))
    .map(notice => ({ notice, decline: notice.invitationDecline }));
}

/** Manage → Invitations, focused on the declined invitation when known. */
export function declineReviewPath(decline: InvitationDeclineDetail): string {
  return decline.invitationId === null ? SENT_INVITATIONS_PATH : sentInvitationPath(decline.invitationId);
}
