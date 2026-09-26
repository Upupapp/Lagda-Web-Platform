// Sends the invites collected by TeamInvitesSlot once the onboarding
// workspace exists (078). Plain module so Fast Refresh keeps working on the
// slot component.

import type { TeamInviteDraft } from "../../models/auth";
import { createJoinTicket, sendJoinTicket, JoinActionError } from "../../services/real/workspace-join.service";

/**
 * Creates (and, where asked, emails) every invite not yet done. Returns the
 * updated list; entries that failed carry `status: "failed"` and a message.
 */
export async function sendTeamInvites(workspaceId: string, invites: TeamInviteDraft[]): Promise<TeamInviteDraft[]> {
  const out: TeamInviteDraft[] = [];
  for (const invite of invites) {
    if (invite.status === "done") { out.push(invite); continue; }
    let ticketId = invite.ticketId;
    try {
      if (!ticketId) {
        const ticket = await createJoinTicket(workspaceId, { label: invite.label, recipientEmail: invite.email });
        ticketId = ticket.ticketId;
      }
      if (invite.email && invite.sendEmail) {
        await sendJoinTicket(workspaceId, ticketId, { email: true });
      }
      out.push({ ...invite, ticketId, status: "done", error: undefined });
    } catch (err) {
      out.push({
        ...invite, ...(ticketId ? { ticketId } : {}), status: "failed",
        error: err instanceof JoinActionError ? err.message : "We couldn't create this link.",
      });
    }
  }
  return out;
}
