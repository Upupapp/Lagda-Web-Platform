// Behaviour coverage for the Preparation Help FAB — open/close via the button,
// close via the X, close on Escape, close on outside click, and navigating on
// an item click. Not a render-only test: every assertion is about an actual
// interaction contract the component promises.

import { describe, it, expect, vi, beforeEach } from "vitest";
import { render, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";

const mockNavigate = vi.fn();
vi.mock("react-router", async (orig) => ({
  ...(await orig<typeof import("react-router")>()),
  useNavigate: () => mockNavigate,
}));

const usePrepareMock = vi.fn();
vi.mock("../../../context/PrepareContext", () => ({
  usePrepare: () => usePrepareMock(),
}));

// Forced explicitly rather than left to the ambient VITE_API_BASE_URL — that
// env var is set in a gitignored .env.local for local dev but NOT in CI, so
// a test that implicitly depended on it passed locally and failed in CI
// (the FAB silently took the other, unmocked code path). This test targets
// the real-backend / computeSendReadiness path specifically; the ready/not-
// ready assertions below only hold under that path.
vi.mock("../../../services/backend-flag", () => ({ USE_REAL_BACKEND: true }));

import { PreparationHelpFab } from "../PreparationHelpFab";
import type { PreparationStepId, PreparationStepState } from "../../../models/prepare";

const ALL_AVAILABLE: Record<PreparationStepId, PreparationStepState> = {
  upload: "available", participants: "available", routing: "available",
  authentication: "available", settings: "available", review: "available", fields: "available",
};

// Tests run with USE_REAL_BACKEND true (VITE_API_BASE_URL is set), so the FAB
// takes the computeSendReadiness path — the draft must have the shape that
// function reads (files/participants/auth). A single missing-participants
// blocker is the predictable fixture below.
function makeDraft(over: Record<string, unknown> = {}) {
  return {
    id: "d1",
    files: [{ id: "f1", backendDocumentId: "doc1" }],
    participants: [],
    auth: { defaultMethod: "none", perParticipant: {} },
    ...over,
  };
}

function setPrepare(over: Record<string, unknown> = {}) {
  usePrepareMock.mockReturnValue({
    draft: makeDraft(),
    validate: () => ({ errors: [], warnings: [] }),
    stepStates: ALL_AVAILABLE,
    syncError: null,
    multiDocumentSigningGap: false,
    fieldsSnapshot: [],
    ...over,
  });
}

beforeEach(() => {
  vi.clearAllMocks();
  setPrepare();
});

describe("PreparationHelpFab", () => {
  it("renders nothing when there is no draft", () => {
    setPrepare({ draft: null });
    render(<PreparationHelpFab />);
    expect(screen.queryByRole("button")).toBeNull();
  });

  it("opens the panel on FAB click and shows the blocker item", async () => {
    const user = userEvent.setup();
    render(<PreparationHelpFab />);
    expect(screen.queryByRole("dialog")).toBeNull();
    await user.click(screen.getByRole("button", { name: /open preparation guide/i }));
    expect(screen.getByRole("dialog")).toBeInTheDocument();
    expect(screen.getByText("No participants have been added.")).toBeInTheDocument();
  });

  it("closes when the FAB is clicked again", async () => {
    const user = userEvent.setup();
    render(<PreparationHelpFab />);
    const fab = screen.getByRole("button", { name: /open preparation guide/i });
    await user.click(fab);
    expect(screen.getByRole("dialog")).toBeInTheDocument();
    await user.click(screen.getByRole("button", { name: /close preparation guide/i }));
    expect(screen.queryByRole("dialog")).toBeNull();
  });

  it("closes via the panel's close button", async () => {
    const user = userEvent.setup();
    render(<PreparationHelpFab />);
    await user.click(screen.getByRole("button", { name: /open preparation guide/i }));
    await user.click(screen.getByRole("button", { name: "Close" }));
    expect(screen.queryByRole("dialog")).toBeNull();
  });

  it("closes on Escape", async () => {
    const user = userEvent.setup();
    render(<PreparationHelpFab />);
    await user.click(screen.getByRole("button", { name: /open preparation guide/i }));
    await user.keyboard("{Escape}");
    expect(screen.queryByRole("dialog")).toBeNull();
  });

  it("closes on an outside click", async () => {
    const user = userEvent.setup();
    render(<><div data-testid="outside">outside</div><PreparationHelpFab /></>);
    await user.click(screen.getByRole("button", { name: /open preparation guide/i }));
    expect(screen.getByRole("dialog")).toBeInTheDocument();
    await user.click(screen.getByTestId("outside"));
    expect(screen.queryByRole("dialog")).toBeNull();
  });

  it("navigates and closes when an item is clicked", async () => {
    const user = userEvent.setup();
    render(<PreparationHelpFab />);
    await user.click(screen.getByRole("button", { name: /open preparation guide/i }));
    await user.click(screen.getByText("No participants have been added."));
    expect(mockNavigate).toHaveBeenCalledWith("/app/prepare/participants");
    expect(screen.queryByRole("dialog")).toBeNull();
  });

  it("shows the ready state when there are no blockers", async () => {
    setPrepare({ draft: makeDraft({ participants: [{ id: "rcp_1", role: "signer" }] }) });
    const user = userEvent.setup();
    render(<PreparationHelpFab />);
    await user.click(screen.getByRole("button", { name: /open preparation guide/i }));
    expect(screen.getByText(/Ready for signing/i)).toBeInTheDocument();
  });
});
