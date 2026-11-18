import { beforeEach, describe, expect, it, vi } from "vitest";
import { render, screen } from "@testing-library/react";
import { MemoryRouter } from "react-router";
import { RoutingStep } from "../RoutingStep";
import type { PrepRoutingConfig, RoutingMode } from "../../../../models/prepare";

const state = vi.hoisted(() => ({
  real: true,
  draft: {
    id: "qa-routing",
    participants: [
      { id: "a", name: "QA Approver", role: "approver", isRequired: true },
      { id: "r", name: "QA Reviewer", role: "reviewer", isRequired: true },
      { id: "s", name: "QA Signer", role: "signer", isRequired: true },
    ],
    routing: { mode: "approval-based", groups: [] } as PrepRoutingConfig,
  },
  updateRouting: vi.fn(),
  setStep: vi.fn(),
  validate: () => ({ errors: [], warnings: [] }),
}));
vi.mock("../../../../services/backend-flag", () => ({ get USE_REAL_BACKEND() { return state.real; } }));
vi.mock("../../../../context/PrepareContext", () => ({ usePrepare: () => state }));
function open(mode: RoutingMode = "approval-based") {
  state.draft.routing = {
    mode,
    groups: mode === "parallel" ? [
      { id: "all", label: "All participants", stepNumber: 1, participantIds: ["a", "r", "s"], requiredCompletionRule: "any" },
    ] : [
      { id: "approval", label: "Approval", stepNumber: 1, participantIds: ["a", "r"], requiredCompletionRule: "any" },
      { id: "signing", label: "Signing", stepNumber: 2, participantIds: ["s"], requiredCompletionRule: "all" },
    ],
  };
  render(<MemoryRouter><RoutingStep /></MemoryRouter>);
}
beforeEach(() => { state.real = true; state.updateRouting.mockClear(); });
describe("real backend routing completion contract", () => {
  it.each<RoutingMode>(["parallel", "sequential", "mixed", "approval-based"])("does not offer an unsupported any-one rule in %s", mode => {
    open(mode);
    expect(screen.queryByRole("radio", { name: "Any one participant completes" })).not.toBeInTheDocument();
    expect(screen.queryByText("Any one completes")).not.toBeInTheDocument();
    expect(screen.getAllByText(/All required participants must complete/).length).toBeGreaterThan(0);
    const updated = state.updateRouting.mock.lastCall?.[0] as PrepRoutingConfig | undefined;
    expect(updated?.mode).toBe(mode);
    expect(updated?.groups.every(g => g.requiredCompletionRule === "all")).toBe(true);
    expect(updated?.groups.flatMap(g => g.participantIds).sort()).toEqual(["a", "r", "s"]);
  });
  it("describes recorded approval decisions without a legal certification claim", () => {
    open();
    expect(screen.getByText(/Approval, review and skip decisions are recorded in the audit trail/)).toBeInTheDocument();
    expect(screen.getByText(/does not certify the document.s legal validity/)).toBeInTheDocument();
    expect(screen.queryByText(/does not record a separate legal or audit approval/)).not.toBeInTheDocument();
  });
  it("retains the demo's any-one selection and does not rewrite it", () => {
    state.real = false;
    open("mixed");
    expect(screen.getAllByRole("radio", { name: "Any one participant completes" })[0]).toBeChecked();
    expect(state.updateRouting).not.toHaveBeenCalled();
  });
});
