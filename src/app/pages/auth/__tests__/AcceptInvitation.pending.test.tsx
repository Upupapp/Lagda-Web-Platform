// 078: accepting an emailed invitation files a request that waits for an
// owner's approval — `pending: true` — instead of joining.

import { describe, it, expect, vi, beforeEach } from "vitest";
import { render, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { MemoryRouter, Route, Routes } from "react-router";

vi.mock("../../../services/backend-flag", () => ({ USE_REAL_BACKEND: true, API_BASE_URL: "http://api.test" }));

const platform = {
  sessionStatus: "authenticated" as string,
  refreshSessionFromBackend: vi.fn(() => Promise.resolve({ status: "authenticated" })),
};
vi.mock("../../../context/PlatformContext", () => ({ usePlatform: () => platform }));

import { AcceptInvitation } from "../AcceptInvitation";

function json(status: number, body: unknown): Response {
  return new Response(JSON.stringify(body), { status, headers: { "content-type": "application/json" } });
}

const calls: { path: string; body: unknown }[] = [];

beforeEach(() => {
  calls.length = 0;
  platform.sessionStatus = "authenticated";
  vi.stubGlobal("fetch", vi.fn((url: string, init?: RequestInit) => {
    const path = url.replace("http://api.test", "");
    calls.push({ path, body: init?.body ? JSON.parse(init.body as string) : undefined });
    if (path === "/invitations/preview") {
      return Promise.resolve(json(200, { workspaceName: "Mabini Legal Solutions", role: "member", inviteeEmail: "ana@example.com", expiresAt: 1 }));
    }
    if (path === "/invitations/accept") {
      return Promise.resolve(json(200, { workspaceId: "ws_1", workspaceName: "Mabini Legal Solutions", role: "member", joined: false, pending: true }));
    }
    return Promise.resolve(json(404, { error: { code: "not_found", message: "x" } }));
  }));
});

function renderAt(path: string) {
  return render(
    <MemoryRouter initialEntries={[path]}>
      <Routes>
        <Route path="/invitations/accept" element={<AcceptInvitation />} />
        <Route path="/sign-in" element={<p>SIGN IN</p>} />
      </Routes>
    </MemoryRouter>,
  );
}

describe("AcceptInvitation (real link)", () => {
  it("shows 'Request sent — waiting for approval' when the backend answers pending", async () => {
    const user = userEvent.setup();
    renderAt("/invitations/accept?token=invTOKEN123456");
    await user.click(await screen.findByRole("button", { name: "Accept invitation" }));
    expect(await screen.findByText("Request sent — waiting for approval")).toBeInTheDocument();
    expect(screen.queryByText(/You have joined/)).toBeNull();
    expect(calls.find((c) => c.path === "/invitations/accept")?.body).toEqual({ token: "invTOKEN123456" });
    expect(screen.getByRole("link", { name: "Go to dashboard" })).toHaveAttribute("href", "/app/dashboard");
  });

  it("sends a signed-out visitor to sign in first", async () => {
    platform.sessionStatus = "unauthenticated";
    const user = userEvent.setup();
    renderAt("/invitations/accept?token=invTOKEN123456");
    await user.click(await screen.findByRole("button", { name: "Sign in to accept" }));
    expect(screen.getByText("SIGN IN")).toBeInTheDocument();
    expect(calls.some((c) => c.path === "/invitations/accept")).toBe(false);
  });
});
