// Invitation rows shaped like GET /me/invitations, for tests.

export const T = "2026-09-20T08:00:00.000Z";
const FAR = "2099-01-01T00:00:00.000Z";

export const invitation = (over: Record<string, unknown> = {}) => ({
  invitationId: "inv_1",
  workspaceId: "ws_globex",
  workspaceName: "Globex Legal",
  role: "sender",
  invitedBy: { displayName: "Olivia Owner" },
  status: "pending",
  createdAt: T,
  expiresAt: FAR,
  declinedAt: null,
  declineReason: null,
  branding: { displayName: "Globex Legal", primaryColor: "#7C2D12", logo: { version: "v2", url: "/me/invitations/inv_1/branding/logo?v=v2" } },
  ...over,
});
