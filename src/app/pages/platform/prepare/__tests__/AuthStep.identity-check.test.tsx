// Prepare › Authentication › "ID and face verification".
//
// The first thing pinned here is what does NOT change: a workspace the check
// is not offered to sees the step exactly as before, with nothing new on it.
// Then the option itself: it mirrors the set the server holds, saves the
// complete set on every change, and puts a switch back when the server
// refuses. And the test-mode notice, because a simulated check must never be
// taken for a real one.

import { describe, it, expect, vi, beforeEach } from "vitest";
import { render, screen, waitFor, within } from "@testing-library/react";
import userEvent from "@testing-library/user-event";

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
import { ApiError } from "../../../../services/api-client";

const ON = { available: true, mode: "test", minimumPlan: "business", planAllows: true, idTypes: ["umid"] };
const item = (email: string, waivedAt: string | null = null) => ({ email, requiredAt: "2026-10-08T01:00:00.000Z", waivedAt });
const toggle = (name: string) => screen.getByRole("switch", { name: `Require ID and face verification for ${name}` });

beforeEach(() => {
  availability.mockResolvedValue(ON);
  requirements.mockResolvedValue([]);
  replaceRequirements.mockImplementation((_ws: string, _doc: string, emails: string[]) =>
    Promise.resolve(emails.map(email => item(email))));
});

describe("when the check is not offered", () => {
  it("renders nothing new, and the step reads as it did", async () => {
    availability.mockResolvedValue({ available: false, mode: null, minimumPlan: "business", planAllows: true, idTypes: [] });
    render(<AuthStep />);
    await waitFor(() => { expect(availability).toHaveBeenCalledWith("ws_1"); });
    expect(screen.getByTestId("auth-only-link-note").textContent).toContain(
      "Every participant opens the document through a secure invitation link that is theirs alone.");
    expect(screen.getByText("Default authentication method")).toBeInTheDocument();
    expect(screen.queryByTestId("identity-check-section")).toBeNull();
    expect(screen.queryByText("ID and face verification")).toBeNull();
    expect(screen.queryByRole("switch")).toBeNull();
    expect(requirements).not.toHaveBeenCalled();
    // The rail keeps the one method every participant has today.
    expect(screen.getAllByText("Secure Invitation Link").length).toBeGreaterThan(0);
    expect(screen.queryByTestId("auth-rail-identity-check")).toBeNull();
  });

  it("renders nothing new when the answer cannot be read", async () => {
    availability.mockRejectedValue(new Error("offline"));
    render(<AuthStep />);
    await waitFor(() => { expect(availability).toHaveBeenCalled(); });
    expect(screen.queryByTestId("identity-check-section")).toBeNull();
  });

  it("renders nothing new when the requirement routes do not exist", async () => {
    requirements.mockResolvedValue(null);
    render(<AuthStep />);
    await waitFor(() => { expect(requirements).toHaveBeenCalledWith("ws_1", "doc_1"); });
    await waitFor(() => { expect(screen.queryByTestId("identity-check-section")).toBeNull(); });
  });
});

describe("when the plan does not include it", () => {
  it("shows the option switched off, with the plan it needs", async () => {
    availability.mockResolvedValue({ ...ON, planAllows: false });
    render(<AuthStep />);
    expect((await screen.findByTestId("identity-check-plan-note")).textContent).toBe("Available on the Business plan.");
    for (const control of screen.getAllByRole("switch")) expect(control).toBeDisabled();
    expect(screen.getByRole("button", { name: "Require for all signers" })).toBeDisabled();
    expect(requirements).not.toHaveBeenCalled();
    await userEvent.click(toggle("Ana Reyes"));
    expect(replaceRequirements).not.toHaveBeenCalled();
  });
});

describe("when it is available", () => {
  it("is off for everyone by default, and says it is in addition to the link", async () => {
    render(<AuthStep />);
    const section = await screen.findByTestId("identity-check-section");
    await waitFor(() => { expect(toggle("Ana Reyes")).toBeEnabled(); });
    for (const control of screen.getAllByRole("switch")) expect(control).toHaveAttribute("aria-checked", "false");
    expect(section.textContent).toContain("in addition to their secure invitation link");
    // The note about the link is still there, and still true.
    expect(screen.getByTestId("auth-only-link-note")).toBeInTheDocument();
  });

  it("loads the set the server holds, whatever the case of the address", async () => {
    requirements.mockResolvedValue([item("ana@example.ph")]);
    render(<AuthStep />);
    await waitFor(() => { expect(toggle("Ana Reyes")).toHaveAttribute("aria-checked", "true"); });
    expect(toggle("Ben Cruz")).toHaveAttribute("aria-checked", "false");
    expect(requirements).toHaveBeenCalledWith("ws_1", "doc_1");
    // The rail names both methods for her, and only the link for the others.
    const rail = screen.getByTestId("auth-rail-identity-check");
    expect(rail.textContent).toContain("Ana Reyes");
    expect(rail.textContent).toContain("Secure Invitation Link + ID and face verification");
    expect(screen.getAllByTestId("auth-rail-identity-check")).toHaveLength(1);
  });

  it("lists a viewer as not applicable, with no switch", async () => {
    render(<AuthStep />);
    const section = await screen.findByTestId("identity-check-section");
    expect(within(section).getByText("Not applicable")).toBeInTheDocument();
    expect(screen.queryByRole("switch", { name: /Val Ong/ })).toBeNull();
    expect(screen.getAllByRole("switch")).toHaveLength(3);
  });

  it("saves the complete set when a switch changes", async () => {
    requirements.mockResolvedValue([item("ana@example.ph")]);
    render(<AuthStep />);
    await waitFor(() => { expect(toggle("Ana Reyes")).toHaveAttribute("aria-checked", "true"); });

    await userEvent.click(toggle("Ben Cruz"));
    expect(replaceRequirements).toHaveBeenCalledWith("ws_1", "doc_1", ["ana@example.ph", "ben@example.ph"]);
    await waitFor(() => { expect(screen.getByTestId("identity-check-save-status").textContent).toBe("Saved"); });
    expect(toggle("Ben Cruz")).toHaveAttribute("aria-checked", "true");

    await userEvent.click(toggle("Ana Reyes"));
    expect(replaceRequirements).toHaveBeenLastCalledWith("ws_1", "doc_1", ["ben@example.ph"]);
    await waitFor(() => { expect(toggle("Ana Reyes")).toHaveAttribute("aria-checked", "false"); });
  });

  it("drops someone who is no longer on the document from the set it sends", async () => {
    requirements.mockResolvedValue([item("ana@example.ph"), item("gone@example.ph")]);
    render(<AuthStep />);
    await waitFor(() => { expect(toggle("Ana Reyes")).toHaveAttribute("aria-checked", "true"); });
    await userEvent.click(toggle("Dan Lim"));
    expect(replaceRequirements).toHaveBeenCalledWith("ws_1", "doc_1", ["ana@example.ph", "dan@example.ph"]);
  });

  it("shows the change at once, and keeps the status in the layout throughout", async () => {
    let finish: (items: unknown[]) => void = () => undefined;
    replaceRequirements.mockImplementation(() => new Promise(resolve => { finish = resolve; }));
    render(<AuthStep />);
    await waitFor(() => { expect(toggle("Ana Reyes")).toBeEnabled(); });
    // There before anything is saved: nothing is inserted when a save starts.
    expect(screen.getByTestId("identity-check-save-status").textContent).toBe("");

    await userEvent.click(toggle("Ana Reyes"));
    expect(toggle("Ana Reyes")).toHaveAttribute("aria-checked", "true");
    expect(screen.getByTestId("identity-check-save-status").textContent).toBe("Saving…");

    finish([item("ana@example.ph")]);
    await waitFor(() => { expect(screen.getByTestId("identity-check-save-status").textContent).toBe("Saved"); });
  });

  it("puts the switch back and says why when the server refuses", async () => {
    requirements.mockResolvedValue([item("ana@example.ph")]);
    replaceRequirements.mockRejectedValue(new ApiError(422, {
      code: "identity_requirement_invalid", message: "server text",
      details: [{ field: "emails[1]", code: "not-a-participant", message: "That address is not a participant of this document." }],
    }, "x"));
    render(<AuthStep />);
    await waitFor(() => { expect(toggle("Ana Reyes")).toHaveAttribute("aria-checked", "true"); });

    await userEvent.click(toggle("Ben Cruz"));
    const alert = await screen.findByRole("alert");
    expect(alert.textContent).toContain("ben@example.ph is not saved as a participant of this document yet");
    expect(toggle("Ben Cruz")).toHaveAttribute("aria-checked", "false");
    expect(toggle("Ana Reyes")).toHaveAttribute("aria-checked", "true");
    expect(screen.getByTestId("identity-check-save-status").textContent).toBe("Not saved");
  });

  it("requires it for all signers, and clears it", async () => {
    requirements.mockResolvedValue([item("dan@example.ph")]);
    render(<AuthStep />);
    await waitFor(() => { expect(toggle("Dan Lim")).toHaveAttribute("aria-checked", "true"); });

    await userEvent.click(screen.getByRole("button", { name: "Require for all signers" }));
    expect(replaceRequirements).toHaveBeenLastCalledWith(
      "ws_1", "doc_1", ["dan@example.ph", "ana@example.ph", "ben@example.ph"]);
    await waitFor(() => { expect(toggle("Ben Cruz")).toHaveAttribute("aria-checked", "true"); });

    await userEvent.click(screen.getByRole("button", { name: "Clear" }));
    expect(replaceRequirements).toHaveBeenLastCalledWith("ws_1", "doc_1", []);
    await waitFor(() => { expect(toggle("Dan Lim")).toHaveAttribute("aria-checked", "false"); });
  });
});

describe("test mode", () => {
  it("says plainly that the check is simulated", async () => {
    render(<AuthStep />);
    expect((await screen.findByTestId("identity-check-test-notice")).textContent).toBe(
      "Test mode. The check is simulated: no identity is actually verified, and the document's history will say so.");
    expect(document.body.textContent).not.toMatch(/biometric/i);
  });

  it("shows no such notice once a real check is connected", async () => {
    availability.mockResolvedValue({ ...ON, mode: "live" });
    render(<AuthStep />);
    await screen.findByTestId("identity-check-section");
    expect(screen.queryByTestId("identity-check-test-notice")).toBeNull();
  });
});
