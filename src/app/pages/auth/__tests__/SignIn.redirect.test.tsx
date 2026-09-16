// B2 regression coverage.
//
// Before this fix, SignIn's top-level "already authenticated" guard sent a
// freshly-authenticated visitor straight to `redirectTo` (typically
// /app/dashboard) with no regard for whether their account had a workspace
// yet. A zero-workspace real-backend account could hit this guard — a race
// against handleRealSubmit's own post-await onboarding redirect — and land
// on the dashboard shell instead of the onboarding wizard.
//
// These tests render SignIn with `usePlatform`/`useOnboarding` mocked
// directly (no real sign-in submission is exercised — that's covered live,
// per the audit's real-runtime-verification requirement for this class of
// bug) to pin down what the guard does for an ALREADY-authenticated render,
// which is exactly the state the race can leave the component in.

import { describe, it, expect, vi, beforeEach } from "vitest";
import { render, screen } from "@testing-library/react";
import { MemoryRouter, Routes, Route } from "react-router";

vi.mock("../../../services/backend-flag", () => ({
  USE_REAL_BACKEND: true,
  API_BASE_URL: "https://example.test/api",
}));

const setReturnTo = vi.fn();
const setPendingUser = vi.fn();

vi.mock("../../../context/OnboardingContext", () => ({
  useOnboarding: () => ({ setReturnTo, setPendingUser }),
}));

let mockPlatform: { sessionStatus: string; workspaceStatus: string };

vi.mock("../../../context/PlatformContext", () => ({
  usePlatform: () => mockPlatform,
  createMockSignInPayload: () => ({}),
}));

import { SignIn } from "../SignIn";

function renderAt(path: string) {
  return render(
    <MemoryRouter initialEntries={[path]}>
      <Routes>
        <Route path="/sign-in" element={<SignIn />} />
        <Route path="/onboarding/profile" element={<div>ONBOARDING_PROFILE</div>} />
        <Route path="/app/dashboard" element={<div>APP_DASHBOARD</div>} />
        <Route path="/app/documents" element={<div>APP_DOCUMENTS</div>} />
      </Routes>
    </MemoryRouter>,
  );
}

describe("SignIn — already-authenticated redirect (B2)", () => {
  beforeEach(() => {
    setReturnTo.mockClear();
    setPendingUser.mockClear();
  });

  it("sends a zero-workspace authenticated account to onboarding, not the raw redirectTo", async () => {
    mockPlatform = { sessionStatus: "authenticated", workspaceStatus: "empty" };
    renderAt("/sign-in?returnTo=%2Fapp%2Fdocuments");

    expect(await screen.findByText("ONBOARDING_PROFILE")).toBeTruthy();
    expect(setReturnTo).toHaveBeenCalledWith("/app/documents");
  });

  it("sends an authenticated account WITH a workspace straight to redirectTo", async () => {
    mockPlatform = { sessionStatus: "authenticated", workspaceStatus: "ready" };
    renderAt("/sign-in?returnTo=%2Fapp%2Fdocuments");

    expect(await screen.findByText("APP_DOCUMENTS")).toBeTruthy();
    expect(setReturnTo).not.toHaveBeenCalled();
  });

  it("defaults a zero-workspace account with no returnTo param to a null stash", async () => {
    mockPlatform = { sessionStatus: "authenticated", workspaceStatus: "empty" };
    renderAt("/sign-in");

    expect(await screen.findByText("ONBOARDING_PROFILE")).toBeTruthy();
    expect(setReturnTo).toHaveBeenCalledWith(null);
  });
});
