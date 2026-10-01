// Signing out of a paid account and into a Free one on the same tab must show
// the Free account's plan at once — never the previous account's until a
// reload. The plan store keeps each answer with the account it was read for,
// sign-out wipes it, and an answer still on its way for the old account is
// dropped when it lands.

import { describe, it, expect, vi, beforeEach } from "vitest";
import { act, render, screen, waitFor } from "@testing-library/react";

vi.mock("../../services/backend-flag", () => ({ USE_REAL_BACKEND: true, API_BASE_URL: "http://api.test" }));

const platform = {
  user: { id: "u_paid" } as { id: string } | null,
  currentWorkspace: { id: "ws_1", name: "Reyes Law Office" } as { id: string; name: string } | null,
};
vi.mock("../../context/PlatformContext", () => ({ usePlatform: () => platform }));

import { useMyPlan, useWorkspacePlan, resetPlanStore } from "../usePlans";
import { runSignOutCleanup, __registeredCleanupIds } from "../../services/session-lifecycle";
import "../useNavCounts";
import "../usePendingInvitationCount";
import "../workspace-branding-store";
import "../../services/ready-made-library";

function json(body: unknown): Response {
  return new Response(JSON.stringify(body), { status: 200, headers: { "content-type": "application/json" } });
}

const plan = (p: string) => ({
  plan: p, storedPlan: p, paidUntil: null, autoRenew: false, freeDocumentsUsed: 0, freeDocumentLimit: 1,
  pendingRequest: null, approver: false, upgradesAvailable: true,
});

/** Who the backend thinks is signed in, and a way to hold an answer back. */
let signedIn = "u_paid";
let hold: Promise<void> | null = null;

function Probe() {
  const { plan: mine } = useMyPlan();
  const { info: ws } = useWorkspacePlan();
  return <p data-testid="probe">{mine?.plan ?? "none"}/{ws?.plan ?? "none"}/{ws?.ownerIsYou ? "owner" : "member"}</p>;
}

beforeEach(() => {
  resetPlanStore();
  signedIn = "u_paid";
  hold = null;
  platform.user = { id: "u_paid" };
  vi.stubGlobal("BroadcastChannel", class { postMessage() {} close() {} onmessage = null; });
  vi.stubGlobal("fetch", vi.fn(async (input: RequestInfo | URL) => {
    const url = typeof input === "string" ? input : input instanceof URL ? input.toString() : input.url;
    const who = signedIn;
    if (hold) await hold;
    const paid = who === "u_paid";
    if (url.endsWith("/me/plan")) return json(plan(paid ? "business" : "free"));
    if (url.endsWith("/workspaces/ws_1/plan")) {
      return json({ plan: paid ? "business" : "free", ownerIsYou: paid, ownerName: "Ana Reyes", paidUntil: null });
    }
    return new Response(null, { status: 404 });
  }));
});

const probe = () => screen.getByTestId("probe").textContent;

describe("plans across accounts on one tab", () => {
  it("sign-out wipes the plans, and the next account sees its own at once", async () => {
    const view = render(<Probe />);
    await waitFor(() => { expect(probe()).toBe("business/business/owner"); });

    // Sign out, then a Free account signs in (no reload).
    act(() => { runSignOutCleanup(); platform.user = null; });
    view.rerender(<Probe />);
    expect(probe()).toBe("none/none/member");

    signedIn = "u_free";
    platform.user = { id: "u_free" };
    view.rerender(<Probe />);
    expect(probe()).not.toContain("business");
    await waitFor(() => { expect(probe()).toBe("free/free/member"); });
  });

  it("a different account without a sign-out (expired session) never sees the previous plans", async () => {
    const view = render(<Probe />);
    await waitFor(() => { expect(probe()).toBe("business/business/owner"); });

    signedIn = "u_free";
    platform.user = { id: "u_free" };
    view.rerender(<Probe />);
    expect(probe()).toBe("none/none/member");
    await waitFor(() => { expect(probe()).toBe("free/free/member"); });
  });

  it("an answer for the old account that lands after the switch is dropped", async () => {
    let release: () => void = () => undefined;
    hold = new Promise<void>(r => { release = r; });
    const view = render(<Probe />);   // the paid account's requests are on their way

    hold = null;                      // the Free account's answers come straight back
    signedIn = "u_free";
    platform.user = { id: "u_free" };
    view.rerender(<Probe />);
    await waitFor(() => { expect(probe()).toBe("free/free/member"); });

    await act(async () => { release(); await new Promise(r => setTimeout(r, 0)); });
    expect(probe()).toBe("free/free/member");
  });

  it("every store holding an account's data is wiped on sign-out", () => {
    expect(__registeredCleanupIds()).toEqual(expect.arrayContaining([
      "plans", "nav-counts", "pending-invitation-count", "workspace-branding", "ready-made-library",
    ]));
  });
});
