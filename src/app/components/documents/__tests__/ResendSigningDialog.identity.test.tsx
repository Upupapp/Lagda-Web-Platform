// Send again, where the workspace has "ID and face verification".
//
// The requirement is kept by email, so a re-send to a new address used to
// carry none and the new person skipped the check. The dialog now lists each
// recipient who will act with a switch (the section Prepare uses), starts a
// new address from what the person it replaces was asked for, and hands the
// complete set to the send. It also says what the title of the new request
// will be.

import { describe, it, expect, vi, beforeEach } from "vitest";
import { render, screen, waitFor, within } from "@testing-library/react";
import userEvent from "@testing-library/user-event";

vi.mock("../../../services/backend-flag", () => ({ USE_REAL_BACKEND: true, API_BASE_URL: "http://api.test" }));

const svc = vi.hoisted(() => ({
  currentParticipants: vi.fn(),
  resendToSame: vi.fn(),
  resend: vi.fn(),
}));
vi.mock("../../../services/real/resend-signing.service", async (original) => ({
  ...(await original<typeof import("../../../services/real/resend-signing.service")>()),
  resendSigningService: svc,
}));

const identity = vi.hoisted(() => ({ availability: vi.fn(), requirements: vi.fn(), checks: vi.fn(), replaceRequirements: vi.fn() }));
vi.mock("../../../services/real/identity-check.service", async (original) => ({
  ...(await original<typeof import("../../../services/real/identity-check.service")>()),
  realIdentityCheckService: identity,
}));

const titleSuggestion = vi.hoisted(() => vi.fn());
vi.mock("../../../services/real/document.service", () => ({
  realDocumentService: { titleSuggestion },
}));

const toastSuccess = vi.hoisted(() => vi.fn());
vi.mock("../../brand/BrandToast", () => ({ toastSuccess }));

vi.mock("../../../config/process-screens", () => ({
  withProcess: (_kind: string, _who: string, work: () => Promise<unknown>) => work(),
}));

import { ResendSigningDialog } from "../ResendSigningDialog";
import { ResendIdentityNotSavedError } from "../../../services/real/resend-signing.service";
import {
  IDENTITY_CHECK_HOSTED_EXPLAINER, IDENTITY_CHECK_TEST_MODE_NOTICE,
} from "../../../models/identity-check";

const person = (id: string, name: string, type: string, routingOrder = 1) => ({
  recipientId: id, name, email: `${id}@x.com`, organization: null, type,
  isRequired: true, orderIndex: 0, routingOrder, sourceContactId: null,
  createdAt: "", updatedAt: "",
});
const ON = { available: true, mode: "live", minimumPlan: "business", planAllows: true, idTypes: ["umid"] };
const held = (email: string, waivedAt: string | null = null) => ({ email, requiredAt: "2026-10-08T01:00:00.000Z", waivedAt });
const check = (id: string, status: string, waivedAt: string | null = null) => ({
  recipientId: id, email: `${id}@x.com`, required: status !== "waived", status, mode: "live",
  lastOutcome: null, failedAttempts: status === "locked" ? 3 : 0, verifiedAt: null, idType: null, waivedAt,
});

function open(props: Partial<Parameters<typeof ResendSigningDialog>[0]> = {}) {
  const onSent = vi.fn();
  render(<ResendSigningDialog workspaceId="ws" documentId="doc" documentTitle="Lease" signingRequestId="sr_old"
    onClose={vi.fn()} onSent={onSent} {...props} />);
  return onSent;
}

const toggle = (who: string) => screen.getByRole("switch", { name: `Require ID and face verification for ${who}` });
const sendButton = () => screen.getByRole("button", { name: /Send links/ });
const emails = () => screen.getByLabelText("Email addresses");
const sameTab = () => screen.getByRole("tab", { name: /Re-send to same participants/ });
/** What the send was told about the identity check. */
const sentIdentity = (mock: typeof svc.resend) =>
  (mock.mock.calls[0]![3] as { identity?: { emails: string[]; askAgain?: string[] } } | undefined)?.identity;

beforeEach(() => {
  svc.currentParticipants.mockResolvedValue([
    person("ana", "Ana", "signer", 1), person("ben", "Ben", "approver", 2), person("val", "Val", "viewer", 2),
  ]);
  svc.resendToSame.mockResolvedValue({ signingRequestId: "sr_new", sentTo: 2, documentTitle: "Lease (2)" });
  svc.resend.mockResolvedValue({ signingRequestId: "sr_new", sentTo: 1, documentTitle: "Lease (2)" });
  identity.availability.mockResolvedValue(ON);
  identity.requirements.mockResolvedValue([held("ana@x.com")]);
  identity.checks.mockResolvedValue([]);
});

describe("the same participants", () => {
  it("lists everyone who will act, each switch starting from what the document holds", async () => {
    open();
    await userEvent.click(sameTab());
    const section = await screen.findByTestId("identity-check-section");
    expect(within(section).getByText("ID and face verification")).toBeInTheDocument();
    expect(toggle("Ana")).toBeChecked();
    expect(toggle("Ben")).not.toBeChecked();
    // A viewer does not act, and is not listed.
    expect(within(section).queryByText("Val")).toBeNull();
    expect(identity.requirements).toHaveBeenCalledWith("ws", "doc");
  });

  it("hands the complete set to the send, as the sender left it", async () => {
    const onSent = open();
    await userEvent.click(sameTab());
    await screen.findByTestId("identity-check-section");
    await userEvent.click(toggle("Ben"));
    await userEvent.click(sendButton());
    await waitFor(() => { expect(onSent).toHaveBeenCalledWith("sr_new", 2); });
    expect(svc.resendToSame).toHaveBeenCalledTimes(1);
    expect(sentIdentity(svc.resendToSame)).toEqual({ emails: ["ana@x.com", "ben@x.com"], askAgain: [] });
    // Nothing is saved by the dialog itself; the send does it, in order.
    expect(identity.replaceRequirements).not.toHaveBeenCalled();
  });

  it("drops a participant who is unticked from the set", async () => {
    open();
    await userEvent.click(sameTab());
    await screen.findByTestId("identity-check-section");
    await userEvent.click(screen.getByRole("checkbox", { name: "Include Ana" }));
    expect(screen.queryByRole("switch", { name: /for Ana/ })).toBeNull();
    await userEvent.click(sendButton());
    await waitFor(() => { expect(svc.resendToSame).toHaveBeenCalled(); });
    expect(sentIdentity(svc.resendToSame)).toEqual({ emails: [], askAgain: [] });
  });

  it("says a locked participant stays locked, and what to do about it", async () => {
    // A lock carried over from the earlier request, as the server reports it:
    // locked, three failed attempts, and no outcome of its own yet.
    identity.checks.mockResolvedValue([{ ...check("ana", "locked"), failedAttempts: 3, lastOutcome: null }]);
    open();
    await userEvent.click(sameTab());
    expect((await screen.findByTestId("resend-identity-note-ana@x.com")).textContent ?? "").toBe(
      "Locked after 3 attempts today. Resending does not give more attempts. Allow a lighter method if they cannot pass.");
    expect(identity.checks).toHaveBeenCalledWith("ws", "sr_old");
  });

  it("says when a lighter method was allowed, and that off-and-on asks again", async () => {
    identity.requirements.mockResolvedValue([held("ana@x.com", "2026-10-08T03:00:00.000Z")]);
    open();
    await userEvent.click(sameTab());
    const note = await screen.findByTestId("resend-identity-note-ana@x.com");
    expect(note.textContent ?? "").toMatch(/^Lighter method allowed .*2026\. They will not be asked for it again\. Switch off and on to ask again\.$/);

    // Off and on: they are asked again, and the send is told so.
    await userEvent.click(toggle("Ana"));
    expect(screen.queryByTestId("resend-identity-note-ana@x.com")).toBeNull();
    await userEvent.click(toggle("Ana"));
    expect(screen.getByTestId("resend-identity-note-ana@x.com").textContent ?? "").toBe(
      "They will be asked for it again on this resend.");
    await userEvent.click(sendButton());
    await waitFor(() => { expect(svc.resendToSame).toHaveBeenCalled(); });
    expect(sentIdentity(svc.resendToSame)).toEqual({ emails: ["ana@x.com"], askAgain: ["ana@x.com"] });
  });
});

describe("new emails", () => {
  it("starts a new address ON when the person it replaces had to pass the check", async () => {
    open();
    await screen.findByTestId("identity-check-section");
    await userEvent.type(emails(), "new1@x.com, new2@x.com");
    // new1 takes Ana's place (required), new2 takes Ben's (not required).
    expect(toggle("new1@x.com")).toBeChecked();
    expect(toggle("new2@x.com")).not.toBeChecked();
    expect(screen.getByTestId("resend-identity-note-new1@x.com").textContent ?? "").toBe(
      "On because Ana, who they replace, was asked for it.");
  });

  it("keeps an address that is already on the document with its own setting", async () => {
    identity.requirements.mockResolvedValue([held("ben@x.com")]);
    open();
    await screen.findByTestId("identity-check-section");
    await userEvent.type(emails(), "new1@x.com, ben@x.com");
    // Ben stays as he was; new1 replaces Ana, who was not asked.
    expect(toggle("ben@x.com")).toBeChecked();
    expect(toggle("new1@x.com")).not.toBeChecked();
  });

  it("lets the sender change any of them, and sends exactly what they chose", async () => {
    open();
    await screen.findByTestId("identity-check-section");
    await userEvent.type(emails(), "new1@x.com, new2@x.com");
    await userEvent.click(toggle("new1@x.com"));
    await userEvent.click(toggle("new2@x.com"));
    await userEvent.click(sendButton());
    await waitFor(() => { expect(svc.resend).toHaveBeenCalled(); });
    expect(svc.resend.mock.calls[0]![2]).toEqual([{ name: "", email: "new1@x.com" }, { name: "", email: "new2@x.com" }]);
    expect(sentIdentity(svc.resend)).toEqual({ emails: ["new2@x.com"], askAgain: [] });
  });

  it("sends the inherited requirement when the sender changes nothing", async () => {
    open();
    await screen.findByTestId("identity-check-section");
    await userEvent.type(emails(), "new1@x.com");
    await userEvent.click(sendButton());
    await waitFor(() => { expect(svc.resend).toHaveBeenCalled(); });
    expect(sentIdentity(svc.resend)).toEqual({ emails: ["new1@x.com"], askAgain: [] });
  });

  it("shows the error and sends nothing more when the set could not be saved; trying again works", async () => {
    svc.resend.mockRejectedValueOnce(new ResendIdentityNotSavedError("Check your connection and try again."));
    const onSent = open();
    await screen.findByTestId("identity-check-section");
    await userEvent.type(emails(), "new1@x.com");
    await userEvent.click(sendButton());
    expect((await screen.findByText(/could not be saved, so nothing was sent/)).textContent ?? "").toBe(
      "ID and face verification could not be saved, so nothing was sent. Check your connection and try again.");
    expect(onSent).not.toHaveBeenCalled();
    expect(toastSuccess).not.toHaveBeenCalled();
    // The dialog is still open, with the choice kept, and can be sent again.
    expect(toggle("new1@x.com")).toBeChecked();
    await userEvent.click(sendButton());
    await waitFor(() => { expect(onSent).toHaveBeenCalledWith("sr_new", 1); });
  });
});

describe("the wording follows Prepare's", () => {
  it("shows the test notice in test mode", async () => {
    identity.availability.mockResolvedValue({ ...ON, mode: "test" });
    open();
    expect((await screen.findByTestId("identity-check-test-notice")).textContent ?? "").toBe(IDENTITY_CHECK_TEST_MODE_NOTICE);
  });

  it("shows no test notice when live, and the hosted sentence where the flow is hosted", async () => {
    identity.availability.mockResolvedValue({ ...ON, flow: "hosted" });
    open();
    expect((await screen.findByTestId("identity-check-explainer")).textContent ?? "").toBe(IDENTITY_CHECK_HOSTED_EXPLAINER);
    expect(screen.queryByTestId("identity-check-test-notice")).toBeNull();
  });
});

describe("when the check is not there to offer", () => {
  it("shows nothing, and tells the send nothing, where it is not available", async () => {
    identity.availability.mockResolvedValue({ ...ON, available: false, mode: null });
    open();
    await waitFor(() => { expect(identity.availability).toHaveBeenCalledWith("ws"); });
    await userEvent.type(emails(), "new1@x.com");
    await userEvent.click(sendButton());
    await waitFor(() => { expect(svc.resend).toHaveBeenCalled(); });
    expect(screen.queryByTestId("identity-check-section")).toBeNull();
    expect(identity.requirements).not.toHaveBeenCalled();
    expect(svc.resend.mock.calls[0]).toHaveLength(3);
  });

  it("shows nothing where the plan does not include it", async () => {
    identity.availability.mockResolvedValue({ ...ON, planAllows: false });
    open();
    await waitFor(() => { expect(identity.availability).toHaveBeenCalled(); });
    await userEvent.type(emails(), "new1@x.com");
    await waitFor(() => { expect(sendButton()).not.toBeDisabled(); });
    expect(screen.queryByTestId("identity-check-section")).toBeNull();
    expect(screen.queryByText(/Business plan/)).toBeNull();
    expect(identity.requirements).not.toHaveBeenCalled();
  });

  it("shows nothing where the requirement routes do not exist", async () => {
    identity.requirements.mockResolvedValue(null);
    open();
    await waitFor(() => { expect(identity.requirements).toHaveBeenCalled(); });
    await userEvent.type(emails(), "new1@x.com");
    await waitFor(() => { expect(sendButton()).not.toBeDisabled(); });
    expect(screen.queryByTestId("identity-check-section")).toBeNull();
  });

  it("does not send while what the document holds could not be read, and reads again on request", async () => {
    identity.requirements.mockRejectedValueOnce(new Error("offline"));
    open();
    await userEvent.type(emails(), "new1@x.com");
    const alert = await screen.findByTestId("resend-identity-error");
    expect(alert.textContent ?? "").toContain("ID and face verification could not be read, so nothing can be sent yet.");
    expect(sendButton()).toBeDisabled();
    await userEvent.click(within(alert).getByRole("button", { name: "Try again" }));
    await screen.findByTestId("identity-check-section");
    await waitFor(() => { expect(sendButton()).not.toBeDisabled(); });
  });
});

describe("the title of the new request", () => {
  it("says before sending that it gets its own numbered title, without guessing which", async () => {
    open();
    expect(screen.getByTestId("resend-title-note").textContent ?? "").toBe(
      "The new request gets its own numbered title so it can be told apart from the earlier one.");
    // Nothing can answer which title in advance, so nothing is asked.
    await screen.findByTestId("identity-check-section");
    expect(titleSuggestion).not.toHaveBeenCalled();
  });

  it("confirms with the title the server returned for the new request", async () => {
    svc.resend.mockResolvedValue({ signingRequestId: "sr_new", sentTo: 1, documentTitle: "Lease (3)" });
    open();
    await screen.findByTestId("identity-check-section");
    await userEvent.type(emails(), "new1@x.com");
    await userEvent.click(sendButton());
    await waitFor(() => { expect(toastSuccess).toHaveBeenCalledWith("Sent for signing again", "Sent as \"Lease (3)\"."); });
  });

  it("confirms without a title when the server gave none", async () => {
    svc.resend.mockResolvedValue({ signingRequestId: "sr_new", sentTo: 1, documentTitle: null });
    open();
    await screen.findByTestId("identity-check-section");
    await userEvent.type(emails(), "new1@x.com");
    await userEvent.click(sendButton());
    await waitFor(() => { expect(toastSuccess).toHaveBeenCalledWith("Sent for signing again", undefined); });
  });
});

describe("sending once", () => {
  it("cannot be sent twice by pressing twice", async () => {
    let finish!: (value: unknown) => void;
    svc.resend.mockImplementation(() => new Promise(resolve => { finish = resolve; }));
    const onSent = open();
    await screen.findByTestId("identity-check-section");
    await userEvent.type(emails(), "new1@x.com");
    const button = sendButton();
    await userEvent.dblClick(button);
    expect(svc.resend).toHaveBeenCalledTimes(1);
    expect(button).toBeDisabled();
    expect(button.textContent ?? "").toContain("Sending");
    finish({ signingRequestId: "sr_new", sentTo: 1, documentTitle: null });
    await waitFor(() => { expect(onSent).toHaveBeenCalledTimes(1); });
  });
});
