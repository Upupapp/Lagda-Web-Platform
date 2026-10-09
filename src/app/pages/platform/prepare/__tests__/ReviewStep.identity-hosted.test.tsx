// Review > Authentication, where the server says the identity check is done
// on the identity verification partner's page.

import { describe, it, expect, vi, beforeEach } from "vitest";
import { render, screen } from "@testing-library/react";
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

const LIVE = { available: true, mode: "live", minimumPlan: "business", planAllows: true, idTypes: [] };

beforeEach(() => {
  requirements.mockResolvedValue([{ email: "ana@example.ph", requiredAt: "2026-10-08T01:00:00.000Z", waivedAt: null }]);
});

describe("Review > Authentication, where the check is done on the partner's page", () => {
  it("says the participant is taken to a secure verification page, in addition to the link", async () => {
    availability.mockResolvedValue({ ...LIVE, flow: "hosted" });
    renderStep();
    const list = await screen.findByTestId("review-identity-check");
    expect(list.textContent).toContain("Ana Reyes: Secure Invitation Link + ID and face verification");
    expect(screen.getByTestId("review-identity-check-explainer").textContent).toBe(
      "The participant is taken to a secure verification page to show an ID and complete a face check "
      + "before they can open the document. This is in addition to their secure invitation link, not instead of it.");
    expect(list.textContent).not.toMatch(/Test mode|simulated|didit/i);
  });

  it("adds no such sentence where the check is done on LAGDA's own screens", async () => {
    availability.mockResolvedValue(LIVE);
    renderStep();
    const list = await screen.findByTestId("review-identity-check");
    expect(list.textContent).toBe("Ana Reyes: Secure Invitation Link + ID and face verification");
    expect(screen.queryByTestId("review-identity-check-explainer")).toBeNull();
  });
});
