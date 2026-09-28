// Manage → Invitations honours ?invitation=<id>: it widens the list filter if
// the current one would hide that invitation, scrolls to it, focuses and
// highlights it, and shows the invitee's decline reason (from the decline
// notice). It also marks that notice read, and opens the notice's workspace
// when the invitation is not in the current one.

import { describe, it, expect, vi, beforeEach } from "vitest";
import { render, screen, waitFor, within } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { MemoryRouter, Routes, Route, Link } from "react-router";
import type { NotificationRecord, NotificationId } from "../../../../models/notifications";

vi.setConfig({ testTimeout: 20_000 });
vi.mock("../../../../services/backend-flag", () => ({ USE_REAL_BACKEND: true, API_BASE_URL: "http://api.test" }));

const platform = {
  role: "owner" as string | null,
  currentWorkspace: { id: "ws_1", name: "Reyes Law Office" } as { id: string; name: string } | null,
  workspaces: [
    { id: "ws_1", name: "Reyes Law Office", role: "owner", initials: "RL", accentColor: "#0078D4" },
    { id: "ws_2", name: "Cebu Branch", role: "owner", initials: "CB", accentColor: "#15803D" },
  ],
  switchWorkspace: vi.fn(),
};
vi.mock("../../../../context/PlatformContext", () => ({ usePlatform: () => platform }));

let noticeItems: NotificationRecord[] = [];
const markRead = vi.fn((id: string) => {
  noticeItems = noticeItems.map(n => (n.id === id ? { ...n, status: "read" } : n));
});
vi.mock("../../../../context/NotificationCenterContext", () => ({
  useOptionalNotificationCenter: () => ({ items: noticeItems, markRead }),
}));

import { InvitationsPage } from "../InvitationsPage";

const NOW = Date.now();
const DAY = 86_400_000;
const INVITATIONS = [
  { invitationId: "inv_1", email: "soon@example.com", role: "sender", state: "pending", createdAt: NOW - DAY, expiresAt: NOW + 6 * DAY },
  { invitationId: "inv_7", email: "paul@example.com", role: "member", state: "declined", createdAt: NOW - 3 * DAY, expiresAt: NOW + 4 * DAY },
  { invitationId: "inv_3", email: "gone@example.com", role: "member", state: "revoked", createdAt: NOW - 9 * DAY, expiresAt: NOW - DAY },
];

function notice(invitationId: string, workspaceId = "ws_1", reason: string | null = "Wrong team"): NotificationRecord {
  return {
    id: `ntf_${invitationId}` as NotificationId, demonstrationOnly: true, category: "workspace", severity: "warning",
    priority: "normal", title: "t", body: "b", detailBody: null, createdAt: new Date(NOW - DAY).toISOString(),
    workspaceId, workspaceName: "x", deliveryClass: "in-app-only", isDismissible: true, hasAction: true,
    actionLabel: "View invitation", actionPath: null, whyReceivedReason: "w", status: "unread",
    invitationDecline: { invitationId, invitee: "Paul Cruz", reason, workspaceName: "x", workspaceId },
  };
}

const scrolled = vi.fn();

beforeEach(() => {
  platform.currentWorkspace = { id: "ws_1", name: "Reyes Law Office" };
  platform.switchWorkspace.mockReset();
  markRead.mockClear();
  scrolled.mockClear();
  noticeItems = [notice("inv_7")];
  Element.prototype.scrollIntoView = scrolled;
  vi.stubGlobal("fetch", vi.fn((url: string) => {
    const path = url.replace("http://api.test", "").replace(/\?.*$/, "");
    const ok = (b: unknown) => Promise.resolve(new Response(JSON.stringify(b), { status: 200, headers: { "content-type": "application/json" } }));
    if (path === "/workspaces/ws_1/invitations") return ok({ invitations: INVITATIONS });
    if (path === "/workspaces/ws_2/invitations") return ok({ invitations: [] });
    if (path === "/workspaces/ws_1/access") return ok({ workspaceId: "ws_1", membershipId: "m", role: "owner", capabilities: [], roleTitle: null });
    return Promise.resolve(new Response(JSON.stringify({ error: { code: "resource_not_found", message: path } }), { status: 404, headers: { "content-type": "application/json" } }));
  }));
});

function renderAt(path: string) {
  return render(
    <MemoryRouter initialEntries={[path]}>
      <Routes>
        <Route path="/app/workspace/invitations" element={<><Link to="/app/workspace/invitations?invitation=inv_7">open inv_7</Link><InvitationsPage /></>} />
      </Routes>
    </MemoryRouter>,
  );
}

describe("Manage → Invitations ?invitation=", () => {
  it("scrolls to, focuses and highlights the invitation, with the decline reason", async () => {
    renderAt("/app/workspace/invitations?invitation=inv_7");
    const row = await screen.findByTestId("invitation-inv_7");
    await waitFor(() => expect(document.activeElement).toBe(row));
    expect(row.getAttribute("data-focused")).toBe("true");
    expect(row.className).toContain("invitation-focus");
    expect(scrolled).toHaveBeenCalled();
    expect(within(row).getByTestId("decline-reason").textContent).toBe("Declined. Reason: “Wrong team”");
    // Other rows are not highlighted.
    expect(screen.getByTestId("invitation-inv_1")).not.toHaveAttribute("data-focused");
    expect(markRead).toHaveBeenCalledWith("ntf_inv_7");
  });

  it("switches the list filter to show the invitation when the current one would hide it", async () => {
    renderAt("/app/workspace/invitations");
    await screen.findByTestId("invitation-inv_7");
    await userEvent.click(screen.getByRole("button", { name: "Pending" }));
    expect(screen.queryByTestId("invitation-inv_7")).toBeNull();
    // A notice link followed while the page is open.
    await userEvent.click(screen.getByRole("link", { name: "open inv_7" }));
    const row = await screen.findByTestId("invitation-inv_7");
    expect(screen.getByRole("button", { name: "Declined" }).getAttribute("aria-pressed")).toBe("true");
    await waitFor(() => expect(document.activeElement).toBe(row));
    expect(within(row).getByTestId("decline-reason")).toBeTruthy();
  });

  it("says so when the invitation is not in this workspace and no notice names another", async () => {
    noticeItems = [];
    renderAt("/app/workspace/invitations?invitation=inv_missing");
    expect(await screen.findByText(/That invitation is not in this workspace/)).toBeTruthy();
    expect(platform.switchWorkspace).not.toHaveBeenCalled();
  });

  it("opens the notice's workspace when the invitation belongs to another of this account's workspaces", async () => {
    noticeItems = [notice("inv_elsewhere", "ws_2")];
    renderAt("/app/workspace/invitations?invitation=inv_elsewhere");
    await waitFor(() => expect(platform.switchWorkspace).toHaveBeenCalledWith("ws_2"));
    expect(platform.switchWorkspace).toHaveBeenCalledTimes(1);
  });
});
