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

import { describe, it, expect, vi, beforeEach, afterEach } from "vitest";
import { render, screen } from "@testing-library/react";
import { MemoryRouter, Routes, Route, useLocation } from "react-router";

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

/**
 * Reports the navigation state it was reached with.
 *
 * The marker is the whole point of the fix below, and it is invisible in the
 * DOM — asserting only that the right route rendered would pass just as well
 * with the marker dropped.
 */
function DestinationProbe() {
  const state = useLocation().state as { viaReturnTo?: boolean } | null;
  return <div>{`APP_DOCUMENTS via-return-to=${String(state?.viaReturnTo === true)}`}</div>;
}

function renderAt(path: string) {
  return render(
    <MemoryRouter initialEntries={[path]}>
      <Routes>
        <Route path="/sign-in" element={<SignIn />} />
        <Route path="/onboarding/profile" element={<div>ONBOARDING_PROFILE</div>} />
        <Route path="/app/dashboard" element={<div>APP_DASHBOARD</div>} />
        <Route path="/app/documents" element={<DestinationProbe />} />
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

    expect(await screen.findByText(/^APP_DOCUMENTS/)).toBeTruthy();
    expect(setReturnTo).not.toHaveBeenCalled();
  });

  // ── The destination marker ────────────────────────────────────────────────
  //
  // The product tour auto-starts for a first-time account and its first step
  // carries `route: "/app/dashboard"`, so it navigated on top of an explicit
  // returnTo: somebody who deep-linked to /app/documents, hit the sign-in
  // wall and authenticated was put on the dashboard instead, with no
  // explanation. Reproduced in a real browser before this was written.
  //
  // SignIn marks the navigations that are honouring a requested destination;
  // TourContext declines to auto-start on top of one.

  it("marks a redirect that is honouring a requested destination", async () => {
    mockPlatform = { sessionStatus: "authenticated", workspaceStatus: "ready" };
    renderAt("/sign-in?returnTo=%2Fapp%2Fdocuments");

    expect(await screen.findByText("APP_DOCUMENTS via-return-to=true")).toBeTruthy();
  });

  it("marks nothing when the visitor asked for no particular page", async () => {
    // The organic first visit the tour was built for. Sending the marker here
    // too would suppress the tour for everyone and quietly delete a feature.
    mockPlatform = { sessionStatus: "authenticated", workspaceStatus: "ready" };
    renderAt("/sign-in?returnTo=%2Fapp%2Fdashboard");

    expect(await screen.findByText("APP_DASHBOARD")).toBeTruthy();
  });

  it("defaults a zero-workspace account with no returnTo param to a null stash", async () => {
    mockPlatform = { sessionStatus: "authenticated", workspaceStatus: "empty" };
    renderAt("/sign-in");

    expect(await screen.findByText("ONBOARDING_PROFILE")).toBeTruthy();
    expect(setReturnTo).toHaveBeenCalledWith(null);
  });
});

// The static Notary Directory sends a signed-out visitor to sign in and back.
// It is not a route of this app, so the way back is a full page load.
describe("SignIn — back to the Notary Directory", () => {
  const original = window.location;
  let replace: ReturnType<typeof vi.fn>;
  beforeEach(() => {
    setReturnTo.mockClear();
    replace = vi.fn();
    Object.defineProperty(window, "location", { configurable: true, value: { ...original, replace } });
  });
  afterEach(() => {
    Object.defineProperty(window, "location", { configurable: true, value: original });
  });

  it("loads the directory in full, with the chosen notary, for a signed-in account", () => {
    mockPlatform = { sessionStatus: "authenticated", workspaceStatus: "ready" };
    renderAt(`/sign-in?returnTo=${encodeURIComponent("/enotary-directory/?select=maria-santos")}`);
    expect(replace).toHaveBeenCalledWith("/enotary-directory/?select=maria-santos");
    expect(screen.getByRole("link", { name: "Go to the LAGDA Notary Directory" }))
      .toHaveAttribute("href", "/enotary-directory/?select=maria-santos");
  });

  it("keeps the directory as the way back through onboarding", () => {
    mockPlatform = { sessionStatus: "authenticated", workspaceStatus: "empty" };
    renderAt(`/sign-in?returnTo=${encodeURIComponent("/enotary-directory/")}`);
    expect(screen.getByText("ONBOARDING_PROFILE")).toBeTruthy();
    expect(setReturnTo).toHaveBeenCalledWith("/enotary-directory/");
    expect(replace).not.toHaveBeenCalled();
  });

  it("does not honour anything else outside /app", () => {
    mockPlatform = { sessionStatus: "authenticated", workspaceStatus: "ready" };
    renderAt(`/sign-in?returnTo=${encodeURIComponent("/enotary-directory/?select=x&next=//evil.example")}`);
    expect(screen.getByText("APP_DASHBOARD")).toBeTruthy();
    expect(replace).not.toHaveBeenCalled();
  });
});
