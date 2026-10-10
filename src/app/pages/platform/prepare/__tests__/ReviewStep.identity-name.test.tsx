// Review > Authentication: the sender is told, one last time before sending,
// that the name on a participant's ID must match the name entered for them.
// Only where somebody is asked for the check.

import { describe, it, expect, vi, beforeEach } from "vitest";
import { render, screen, waitFor } from "@testing-library/react";
import { MemoryRouter } from "react-router";

vi.mock("../../../../services/backend-flag", () => ({ USE_REAL_BACKEND: true, API_BASE_URL: "http://api.test" }));

const draft = {
  id: "draft_1",
  files: [{ id: "f1", fileName: "lease.pdf", fileSize: 10, fileState: "ready", backendDocumentId: "doc_1" }],
  auth: { defaultMethod: "none", perParticipant: {} },
  participants: [
    { id: "p1", name: "Ana Reyes", email: "ana@example.ph", role: "signer", organization: "", isRequired: true, routingGroupId: null, authMethodOverride: null },
    { id: "p2", name: "Ben Cruz", email: "ben@example.ph", role: "signer", organization: "", isRequired: true, routingGroupId: null, authMethodOverride: null },
  ],
};

vi.mock("../../../../context/PrepareContext", () => ({
  usePrepare: () => ({
    draft,
    setStep: () => undefined,
    validate: () => ({ issues: [], readyForFieldPlacement: true, stepValidity: {} }),
    markReadyForFieldPlacement: () => undefined,
  }),
}));
vi.mock("../../../../context/PlatformContext", () => ({
  useOptionalPlatform: () => ({ currentWorkspace: { id: "ws_1" } }),
}));

const availability = vi.fn();
const requirements = vi.fn();
vi.mock("../../../../services/real/identity-check.service", async (original) => ({
  ...(await original<typeof import("../../../../services/real/identity-check.service")>()),
  realIdentityCheckService: {
    availability: (...args: unknown[]) => availability(...args) as unknown,
    requirements: (...args: unknown[]) => requirements(...args) as unknown,
  },
}));

import { ReviewStep } from "../ReviewStep";

const renderStep = () => render(<MemoryRouter><ReviewStep /></MemoryRouter>);
const LIVE = { available: true, mode: "live", minimumPlan: "business", planAllows: true, idTypes: [], flow: "hosted" };
const LINE = "The name on the participant's ID must match the name you enter for them here.";

beforeEach(() => {
  availability.mockReset();
  requirements.mockReset();
});

describe("Review > Authentication, the name must match", () => {
  it("is said under the explanation where somebody is asked for the check", async () => {
    availability.mockResolvedValue(LIVE);
    requirements.mockResolvedValue([{ email: "ana@example.ph", requiredAt: "2026-10-08T01:00:00.000Z", waivedAt: null }]);
    renderStep();
    const note = await screen.findByTestId("review-identity-name-note");
    expect(note.textContent ?? "").toBe(LINE);
    const explainer = screen.getByTestId("review-identity-check-explainer");
    expect(explainer.compareDocumentPosition(note) & Node.DOCUMENT_POSITION_FOLLOWING).toBeTruthy();
    expect(screen.getAllByText(LINE)).toHaveLength(1);
  });

  it("is not said where nobody is asked for it", async () => {
    availability.mockResolvedValue(LIVE);
    requirements.mockResolvedValue([]);
    renderStep();
    await waitFor(() => { expect(requirements).toHaveBeenCalled(); });
    expect(screen.queryByTestId("review-identity-name-note")).toBeNull();
    expect(screen.queryByText(LINE)).toBeNull();
  });

  it("is not said where the plan does not include the check, or it is not offered", async () => {
    for (const answer of [{ ...LIVE, planAllows: false }, { ...LIVE, available: false, mode: null }]) {
      availability.mockResolvedValue(answer);
      requirements.mockResolvedValue([{ email: "ana@example.ph", requiredAt: "2026-10-08T01:00:00.000Z", waivedAt: null }]);
      const view = renderStep();
      await waitFor(() => { expect(availability).toHaveBeenCalled(); });
      await Promise.resolve();
      expect(screen.queryByTestId("review-identity-name-note")).toBeNull();
      view.unmount();
      availability.mockClear();
    }
  });
});
