// Behaviour coverage for the Preparation Help FAB — open/close via the button,
// close via the X, close on Escape, close on outside click, and navigating on
// an item click. Not a render-only test: every assertion is about an actual
// interaction contract the component promises.

import { describe, it, expect, vi, beforeEach } from "vitest";
import { render, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { MemoryRouter } from "react-router";

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

/**
 * Renders at a route, because the panel is now scoped to the step you are on.
 *
 * The FAB reads `useLocation()` to decide which guide to lead with and which
 * blockers count as "here" — so a test that rendered it outside a router was
 * not just unmounted, it had no step at all.
 */
function renderAt(path: string, extra?: React.ReactNode) {
  return render(
    <MemoryRouter initialEntries={[path]}>
      {extra}
      <PreparationHelpFab />
    </MemoryRouter>,
  );
}

const PARTICIPANTS = "/app/prepare/participants";

beforeEach(() => {
  vi.clearAllMocks();
  setPrepare();
});

describe("PreparationHelpFab", () => {
  it("renders nothing when there is no draft", () => {
    setPrepare({ draft: null });
    renderAt(PARTICIPANTS);
    expect(screen.queryByRole("button")).toBeNull();
  });

  it("opens the panel on FAB click and shows the blocker item", async () => {
    const user = userEvent.setup();
    renderAt(PARTICIPANTS);
    expect(screen.queryByRole("dialog")).toBeNull();
    await user.click(screen.getByRole("button", { name: /open preparation guide/i }));
    expect(screen.getByRole("dialog")).toBeInTheDocument();
    expect(screen.getByText("No participants have been added.")).toBeInTheDocument();
  });

  it("closes when the FAB is clicked again", async () => {
    const user = userEvent.setup();
    renderAt(PARTICIPANTS);
    const fab = screen.getByRole("button", { name: /open preparation guide/i });
    await user.click(fab);
    expect(screen.getByRole("dialog")).toBeInTheDocument();
    await user.click(screen.getByRole("button", { name: /close preparation guide/i }));
    expect(screen.queryByRole("dialog")).toBeNull();
  });

  it("closes via the panel's close button", async () => {
    const user = userEvent.setup();
    renderAt(PARTICIPANTS);
    await user.click(screen.getByRole("button", { name: /open preparation guide/i }));
    await user.click(screen.getByRole("button", { name: "Close" }));
    expect(screen.queryByRole("dialog")).toBeNull();
  });

  it("closes on Escape", async () => {
    const user = userEvent.setup();
    renderAt(PARTICIPANTS);
    await user.click(screen.getByRole("button", { name: /open preparation guide/i }));
    await user.keyboard("{Escape}");
    expect(screen.queryByRole("dialog")).toBeNull();
  });

  it("closes on an outside click", async () => {
    const user = userEvent.setup();
    renderAt(PARTICIPANTS, <div data-testid="outside">outside</div>);
    await user.click(screen.getByRole("button", { name: /open preparation guide/i }));
    expect(screen.getByRole("dialog")).toBeInTheDocument();
    await user.click(screen.getByTestId("outside"));
    expect(screen.queryByRole("dialog")).toBeNull();
  });

  it("navigates and closes when an item is clicked", async () => {
    const user = userEvent.setup();
    renderAt(PARTICIPANTS);
    await user.click(screen.getByRole("button", { name: /open preparation guide/i }));
    await user.click(screen.getByText("No participants have been added."));
    expect(mockNavigate).toHaveBeenCalledWith("/app/prepare/participants");
    expect(screen.queryByRole("dialog")).toBeNull();
  });

  it("shows the ready state when there are no blockers", async () => {
    setPrepare({ draft: makeDraft({ participants: [{ id: "rcp_1", role: "signer" }] }) });
    const user = userEvent.setup();
    renderAt(PARTICIPANTS);
    await user.click(screen.getByRole("button", { name: /open preparation guide/i }));
    expect(screen.getByText(/Ready for signing/i)).toBeInTheDocument();
  });
  // ── The step guide ────────────────────────────────────────────────────────
  //
  // The panel's reason for existing changed: it used to answer only "what is
  // left before I can send", which is the wrong first answer for someone who
  // has just arrived on a step they have never seen.

  it("leads with the guide for the step you are actually on", async () => {
    const user = userEvent.setup();
    renderAt(PARTICIPANTS);
    await user.click(screen.getByRole("button", { name: /open preparation guide/i }));

    expect(screen.getByRole("heading", { name: "Participants" })).toBeInTheDocument();
    expect(screen.getByText(/who receives this document/i)).toBeInTheDocument();
  });

  it("shows a different guide on a different step", async () => {
    // The guide is keyed off the route, so this is the assertion that it is
    // genuinely per-step rather than one fixed block of copy.
    const user = userEvent.setup();
    renderAt("/app/prepare/routing");
    await user.click(screen.getByRole("button", { name: /open preparation guide/i }));

    expect(screen.getByRole("heading", { name: "Routing" })).toBeInTheDocument();
    expect(screen.queryByRole("heading", { name: "Participants" })).toBeNull();
  });

  it("marks which of the step's requirements are required", async () => {
    // The whole point of the checklist: a list of field names does not tell
    // anyone which ones they must fill in.
    const user = userEvent.setup();
    renderAt(PARTICIPANTS);
    await user.click(screen.getByRole("button", { name: /open preparation guide/i }));

    expect(screen.getByText("Email address")).toBeInTheDocument();
    expect(screen.getAllByText("Required").length).toBeGreaterThan(0);
  });

  it("still shows the guide when the step has nothing wrong with it", async () => {
    // A guide that only appeared alongside an error would be back to
    // speaking only to correct you.
    setPrepare({ draft: makeDraft({ participants: [{ id: "rcp_1", role: "signer" }] }) });
    const user = userEvent.setup();
    renderAt(PARTICIPANTS);
    await user.click(screen.getByRole("button", { name: /open preparation guide/i }));

    expect(screen.getByRole("heading", { name: "Participants" })).toBeInTheDocument();
  });

  // ── Scoping ───────────────────────────────────────────────────────────────

  it("keeps another step's blockers out of the way, without dropping them", async () => {
    // On Settings, the missing-participants blocker belongs to a different
    // question. It must still be REACHABLE — the panel is also how someone
    // asks "can I send yet" — just not competing with this step's own guide.
    const user = userEvent.setup();
    renderAt("/app/prepare/settings");
    await user.click(screen.getByRole("button", { name: /open preparation guide/i }));

    expect(screen.queryByText("No participants have been added.")).toBeNull();

    await user.click(screen.getByRole("button", { name: /1 item on another step/i }));
    expect(screen.getByText("No participants have been added.")).toBeInTheDocument();
  });

  it("shows this step's own blockers without making you expand anything", async () => {
    const user = userEvent.setup();
    renderAt(PARTICIPANTS);
    await user.click(screen.getByRole("button", { name: /open preparation guide/i }));

    expect(screen.getByText("No participants have been added.")).toBeInTheDocument();
    expect(screen.getByText(/needs attention on this step/i)).toBeInTheDocument();
  });
  // ── Clearance above the nav bar ────────────────────────────────────────────

  it("clears the nav bar by its measured height, not a guess", async () => {
    // The old constants were 80/96px. At 320px the bar reached 131px on two
    // steps, and the FAB sat on top of Continue. jsdom has no layout, so the
    // bar's height is stubbed; what is asserted is that the FAB READS it.
    const bar = document.createElement("div");
    bar.className = "prep-nav-bar";
    Object.defineProperty(bar, "getBoundingClientRect", {
      value: () => ({ height: 131, width: 320, top: 0, left: 0, right: 320, bottom: 131, x: 0, y: 0, toJSON: () => ({}) }),
    });
    document.body.appendChild(bar);
    try {
      renderAt(PARTICIPANTS);
      const fab = screen.getByRole("button", { name: /open preparation guide/i });
      await new Promise(resolve => setTimeout(resolve, 0));
      // 131px bar + 16px gap.
      expect(fab.style.bottom).toContain("147px");
    } finally {
      bar.remove();
    }
  });

  it("falls back to a fixed clearance when there is no nav bar", () => {
    // The Fields step hides the bar entirely.
    renderAt(PARTICIPANTS);
    const fab = screen.getByRole("button", { name: /open preparation guide/i });
    expect(fab.style.bottom).toMatch(/calc\((96|80)px/);
  });
});
