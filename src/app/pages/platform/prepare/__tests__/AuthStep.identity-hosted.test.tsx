// Prepare > Authentication > "ID and face verification", where the server
// says the check is done on the identity verification partner's page.
//
// Only the explanatory sentence changes, and only then.

import { describe, it, expect, vi, beforeEach } from "vitest";
import { render, screen, waitFor } from "@testing-library/react";

vi.mock("../../../../services/backend-flag", () => ({ USE_REAL_BACKEND: true, API_BASE_URL: "http://api.test" }));

const draft = {
  id: "draft_1",
  files: [{ id: "f1", backendDocumentId: "doc_1" }],
  auth: { defaultMethod: "none", perParticipant: {} },
  participants: [
    { id: "p1", name: "Ana Reyes", email: "Ana@Example.ph", role: "signer", organization: "", isRequired: true, routingGroupId: null, authMethodOverride: null },
    { id: "p2", name: "Ben Cruz", email: "ben@example.ph", role: "signer", organization: "", isRequired: true, routingGroupId: null, authMethodOverride: null },
    { id: "p3", name: "Dan Lim", email: "dan@example.ph", role: "approver", organization: "", isRequired: true, routingGroupId: null, authMethodOverride: null },
    { id: "p4", name: "Val Ong", email: "val@example.ph", role: "viewer", organization: "", isRequired: false, routingGroupId: null, authMethodOverride: null },
  ],
};

vi.mock("../../../../context/PrepareContext", () => ({
  usePrepare: () => ({
    draft,
    updateAuth: () => undefined,
    setStep: () => undefined,
    validate: () => ({ errors: [], warnings: [], issues: [] }),
  }),
}));
vi.mock("../../../../context/PlatformContext", () => ({
  useOptionalPlatform: () => ({ currentWorkspace: { id: "ws_1" } }),
}));

const availability = vi.fn();
const requirements = vi.fn();
const replaceRequirements = vi.fn();
vi.mock("../../../../services/real/identity-check.service", async (original) => ({
  ...(await original<typeof import("../../../../services/real/identity-check.service")>()),
  realIdentityCheckService: {
    availability: (...args: unknown[]) => availability(...args) as unknown,
    requirements: (...args: unknown[]) => requirements(...args) as unknown,
    replaceRequirements: (...args: unknown[]) => replaceRequirements(...args) as unknown,
  },
}));

import { AuthStep } from "../AuthStep";

const LIVE = { available: true, mode: "live", minimumPlan: "business", planAllows: true, idTypes: [] };
const INLINE_SENTENCE = "Ask a participant to show an ID and take a selfie before they can open the document.";
const HOSTED_SENTENCE =
  "The participant is taken to a secure verification page to show an ID and complete a face check "
  + "before they can open the document. This is in addition to their secure invitation link, not instead of it.";

beforeEach(() => {
  requirements.mockResolvedValue([]);
  replaceRequirements.mockResolvedValue([]);
});

describe("Prepare > Authentication, where the check is done on the partner's page", () => {
  it("says the participant is taken to a secure verification page, still in addition to the link", async () => {
    availability.mockResolvedValue({ ...LIVE, flow: "hosted" });
    render(<AuthStep />);
    const explainer = await screen.findByTestId("identity-check-explainer");
    await waitFor(() => { expect(explainer.textContent).toBe(HOSTED_SENTENCE); });
    expect(explainer.textContent).toContain("in addition to their secure invitation link");
    expect(explainer.textContent).not.toContain("take a selfie");
    // Live: nothing is simulated, so nothing says so. And never the vendor's name.
    expect(screen.queryByTestId("identity-check-test-notice")).toBeNull();
    expect(screen.getByTestId("identity-check-section").textContent).not.toMatch(/didit/i);
    // Nothing else about the option changes.
    expect(screen.getAllByRole("switch")).toHaveLength(3);
    expect(screen.getByRole("button", { name: "Require for all signers" })).toBeInTheDocument();
  });

  it("says it on a plan that does not include the check too", async () => {
    availability.mockResolvedValue({ ...LIVE, flow: "hosted", planAllows: false });
    render(<AuthStep />);
    expect((await screen.findByTestId("identity-check-explainer")).textContent).toBe(HOSTED_SENTENCE);
  });

  it.each([
    ["a server that does not say where the check is done", LIVE],
    ["a server that says inline", { ...LIVE, flow: "inline" }],
    ["test mode", { ...LIVE, mode: "test" }],
  ])("keeps the sentence it always had with %s", async (_name, answer) => {
    availability.mockResolvedValue(answer);
    render(<AuthStep />);
    const explainer = await screen.findByTestId("identity-check-explainer");
    expect(explainer.textContent).toContain(INLINE_SENTENCE);
    expect(explainer.textContent).toContain("This is in addition to their secure invitation link, not instead of it.");
    expect(explainer.textContent).not.toContain("secure verification page");
  });
});
