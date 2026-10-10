// Send again, for a document one of whose participants passed the identity
// check under a name that is not the one on the document.
//
// Sending again does not settle that: the sender is told so on that person's
// line, in the place a lock is said, before they confirm. Also pinned: the
// section the dialog shares with Prepare says the name must match.

import { describe, it, expect, vi, beforeEach } from "vitest";
import { render, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";

vi.mock("../../../services/backend-flag", () => ({ USE_REAL_BACKEND: true, API_BASE_URL: "http://api.test" }));

const svc = vi.hoisted(() => ({ currentParticipants: vi.fn(), resendToSame: vi.fn(), resend: vi.fn() }));
vi.mock("../../../services/real/resend-signing.service", async (original) => ({
  ...(await original<typeof import("../../../services/real/resend-signing.service")>()),
  resendSigningService: svc,
}));

const identity = vi.hoisted(() => ({ availability: vi.fn(), requirements: vi.fn(), checks: vi.fn(), replaceRequirements: vi.fn() }));
vi.mock("../../../services/real/identity-check.service", async (original) => ({
  ...(await original<typeof import("../../../services/real/identity-check.service")>()),
  realIdentityCheckService: identity,
}));

vi.mock("../../../services/real/document.service", () => ({ realDocumentService: { titleSuggestion: vi.fn() } }));
vi.mock("../../brand/BrandToast", () => ({ toastSuccess: vi.fn() }));
vi.mock("../../../config/process-screens", () => ({
  withProcess: (_kind: string, _who: string, work: () => Promise<unknown>) => work(),
}));

import { ResendSigningDialog } from "../ResendSigningDialog";

const NOTE = "Name on ID did not match. Sending again does not change that; decide in Participants or send to the right person.";

const person = (id: string, name: string, type: string) => ({
  recipientId: id, name, email: `${id}@x.com`, organization: null, type,
  isRequired: true, orderIndex: 0, routingOrder: 1, sourceContactId: null, createdAt: "", updatedAt: "",
});
const check = (id: string, status: string) => ({
  recipientId: id, email: `${id}@x.com`, required: true, status, mode: "live",
  lastOutcome: "passed", failedAttempts: 0, verifiedAt: "2026-10-10T02:00:00.000Z", idType: "passport", waivedAt: null,
});
const held = (email: string) => ({ email, requiredAt: "2026-10-08T01:00:00.000Z", waivedAt: null });

const open = () => render(
  <ResendSigningDialog workspaceId="ws" documentId="doc" documentTitle="Lease" signingRequestId="sr_old"
    onClose={vi.fn()} onSent={vi.fn()} />);
const sameTab = () => screen.getByRole("tab", { name: /Re-send to same participants/ });

beforeEach(() => {
  svc.currentParticipants.mockResolvedValue([person("ana", "Ana", "signer"), person("ben", "Ben", "signer")]);
  identity.availability.mockResolvedValue({ available: true, mode: "live", minimumPlan: "business", planAllows: true, idTypes: [], flow: "hosted" });
  identity.requirements.mockResolvedValue([held("ana@x.com"), held("ben@x.com")]);
  identity.checks.mockResolvedValue([{ ...check("ana", "name-mismatch"), verifiedName: "Ana Maria Reyes" }, check("ben", "passed")]);
});

describe("send again, where a participant's ID carries another name", () => {
  it("says so on that person's line, and that sending again does not change it", async () => {
    open();
    await userEvent.click(sameTab());
    expect((await screen.findByTestId("resend-identity-note-ana@x.com")).textContent ?? "").toBe(NOTE);
    expect(identity.checks).toHaveBeenCalledWith("ws", "sr_old");
    // Nobody else is told it, and the ID's name is not repeated here.
    expect(screen.queryByTestId("resend-identity-note-ben@x.com")).toBeNull();
    expect(document.body.textContent ?? "").not.toContain("Ana Maria Reyes");
  });

  it("says it for the same address typed as a new one, and not for somebody else", async () => {
    open();
    await userEvent.type(await screen.findByLabelText("Email addresses"), "ana@x.com, cara@x.com");
    expect((await screen.findByTestId("resend-identity-note-ana@x.com")).textContent ?? "").toContain(NOTE);
    expect(screen.queryByTestId("resend-identity-note-cara@x.com")?.textContent ?? "").not.toContain("Name on ID");
  });

  it("is not said once the check is switched off for them", async () => {
    open();
    await userEvent.click(sameTab());
    await screen.findByTestId("resend-identity-note-ana@x.com");
    await userEvent.click(screen.getByRole("switch", { name: "Require ID and face verification for Ana" }));
    expect(screen.queryByTestId("resend-identity-note-ana@x.com")).toBeNull();
  });

  it("says nothing of the kind for a lock, or for an older server", async () => {
    identity.checks.mockResolvedValue([check("ana", "locked"), check("ben", "passed")]);
    open();
    await userEvent.click(sameTab());
    expect((await screen.findByTestId("resend-identity-note-ana@x.com")).textContent ?? "").toMatch(/^Locked after 3 attempts/);
    expect(screen.queryByText(NOTE)).toBeNull();
  });

  it("tells the sender, in the section it shares with Prepare, that the name must match", async () => {
    open();
    await userEvent.click(sameTab());
    expect((await screen.findByTestId("identity-check-name-note")).textContent ?? "")
      .toBe("The name on the participant's ID must match the name you enter for them here.");
  });
});
