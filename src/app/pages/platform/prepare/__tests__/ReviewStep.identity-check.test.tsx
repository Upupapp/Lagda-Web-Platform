// Review › Authentication, with "ID and face verification".
//
// The summary names both methods for a participant the sender asked the check
// of, says nothing new for a document where nobody was asked, and never
// stands in the way of sending.

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

beforeEach(() => {
  availability.mockResolvedValue({ available: true, mode: "test", minimumPlan: "business", planAllows: true, idTypes: [] });
  requirements.mockResolvedValue([{ email: "ana@example.ph", requiredAt: "2026-10-08T01:00:00.000Z", waivedAt: null }]);
});

describe("Review › Authentication", () => {
  it("names both methods for a participant asked for the check, and says it is simulated", async () => {
    renderStep();
    const list = await screen.findByTestId("review-identity-check");
    expect(list.textContent).toContain("Ana Reyes: Secure Invitation Link + ID and face verification");
    expect(list.textContent).not.toContain("Ben Cruz");
    expect(list.textContent).toContain("Test mode: the check is simulated and no identity is actually verified.");
  });

  it("adds nothing when nobody was asked", async () => {
    requirements.mockResolvedValue([]);
    renderStep();
    await waitFor(() => { expect(requirements).toHaveBeenCalledWith("ws_1", "doc_1"); });
    expect(screen.queryByTestId("review-identity-check")).toBeNull();
    expect(screen.getByText("Secure Invitation Link")).toBeInTheDocument();
  });

  it("adds nothing, and asks for nothing more, when the check is not offered", async () => {
    availability.mockResolvedValue({ available: false, mode: null, minimumPlan: "business", planAllows: false, idTypes: [] });
    renderStep();
    await waitFor(() => { expect(availability).toHaveBeenCalled(); });
    expect(requirements).not.toHaveBeenCalled();
    expect(screen.queryByTestId("review-identity-check")).toBeNull();
    expect(screen.queryByText(/ID and face verification/)).toBeNull();
  });
});
