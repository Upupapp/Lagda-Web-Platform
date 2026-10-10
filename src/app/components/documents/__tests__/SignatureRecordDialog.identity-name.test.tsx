// The Participants dialog and the name read from a participant's ID.
//
// Pinned:
//
//   - a verified participant shows "Name on ID: …", with a small tag for a
//     close match (its differences in plain words) and a name the sender
//     accepted; an exact match has no tag
//   - a name that does not match shows both names, two decisions (accept, or
//     send to someone else), one sentence about signing under the ID's name,
//     and "Allow a lighter method" still below them. There is no button that
//     changes the name: a sent document's names cannot be changed
//   - accepting is confirmed first and needs a reason
//   - after it the checks are read again, the result is announced politely,
//     and focus goes to the line that says it
//   - a refusal is said inside the confirmation, in plain words; one about
//     the reason is said beside the reason
//   - an older server, which sends none of this, renders exactly as before

import { describe, it, expect, vi, beforeEach } from "vitest";
import { render, screen, waitFor, within } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import type { SigningRequestSignatures } from "../../../services/real/signing-request.service";

const signatures = vi.fn();
vi.mock("../../../services/real/signing-request.service", () => ({
  realSigningRequestService: {
    signatures: (...args: unknown[]) => signatures(...args) as unknown,
    reissueLink: vi.fn(),
  },
}));

const identityChecks = vi.fn();
const resolveName = vi.fn();
const waive = vi.fn();
vi.mock("../../../services/real/identity-check.service", async (original) => ({
  ...(await original<typeof import("../../../services/real/identity-check.service")>()),
  realIdentityCheckService: {
    checks: (...args: unknown[]) => identityChecks(...args) as unknown,
    resolveName: (...args: unknown[]) => resolveName(...args) as unknown,
    waive: (...args: unknown[]) => waive(...args) as unknown,
  },
}));

import { SignatureRecordDialog } from "../SignatureRecordDialog";
import type { RecipientIdentityCheck } from "../../../services/real/identity-check.service";
import { ApiError } from "../../../services/api-client";

const ID_NAME = "Maria Clara Santos-Dela Cruz";

const record = (name = "Maria Santos", state: SigningRequestSignatures["state"] = "sent"): SigningRequestSignatures => ({
  signingRequestId: "sr_1", state, signedCount: 0, requiredCount: 1,
  signatories: [{
    recipientId: "srr_1", name, email: "maria@ayalaland.example", organization: "Ayala Land",
    type: "signer", isRequired: true, routingOrder: 1, state: "active", signedAt: null, declinedAt: null,
    declineReason: null, linkedAccountName: null, linkedAccountEmail: null,
  }],
});

const standing = (over: Partial<RecipientIdentityCheck> = {}): RecipientIdentityCheck => ({
  recipientId: "srr_1", email: "maria@ayalaland.example", required: true, status: "passed", mode: "live",
  lastOutcome: "passed", failedAttempts: 0, verifiedAt: "2026-10-09T03:41:00.000Z", idType: "passport", waivedAt: null, ...over,
});

const mismatch = (over: Partial<RecipientIdentityCheck> = {}) => standing({
  status: "name-mismatch", verifiedName: ID_NAME, nameMatch: "mismatch", nameDifferences: [], documentName: "Maria Santos",
  ...over,
});

const refusal = (status: number, code: string, details?: { field: string; code: string; message: string }[]) =>
  new ApiError(status, { code, message: `server said ${code}`, ...(details ? { details } : {}) }, `server said ${code}`);

function renderDialog(check: RecipientIdentityCheck, props: { onSendToSomeoneElse?: () => void; state?: SigningRequestSignatures["state"] } = {}) {
  signatures.mockResolvedValue(record("Maria Santos", props.state));
  identityChecks.mockResolvedValue([check]);
  const onClose = vi.fn();
  render(
    <SignatureRecordDialog
      workspaceId="ws_1" signingRequestId="sr_1" documentTitle="Office Lease" onClose={onClose}
      {...(props.onSendToSomeoneElse === undefined ? {} : { onSendToSomeoneElse: props.onSendToSomeoneElse })}
    />,
  );
  return { onClose };
}

const panel = () => screen.findByRole("group", { name: "Name does not match for Maria Santos" });
const acceptButton = () => screen.getByRole("button", { name: "Accept Maria Santos as the same person" });
const confirmation = () => screen.findByRole("alertdialog");

beforeEach(() => {
  signatures.mockReset();
  identityChecks.mockReset();
  resolveName.mockReset();
  waive.mockReset();
});

// ── A verified participant ──────────────────────────────────────────────────

describe("the name on the ID of a verified participant", () => {
  it("is shown without a tag when it matches", async () => {
    renderDialog(standing({ verifiedName: "Maria Santos", nameMatch: "match", nameDifferences: [], documentName: "Maria Santos" }));
    expect((await screen.findByTestId("signatory-identity-name")).textContent ?? "").toBe("Name on ID: Maria Santos");
    expect(screen.queryByTestId("signatory-identity-name-tag")).toBeNull();
    expect(screen.getByTestId("signatory-identity-check").textContent ?? "").toMatch(/Passed .*2026/);
    expect(screen.queryByRole("group", { name: /Name does not match/ })).toBeNull();
  });

  it("is tagged Close match, with the differences in plain words", async () => {
    renderDialog(standing({
      verifiedName: "Maria C. Santos Jr.", nameMatch: "close",
      nameDifferences: ["middle-name-missing", "middle-initial", "suffix", "abbreviation"], documentName: "Maria Santos",
    }));
    const tag = await screen.findByTestId("signatory-identity-name-tag");
    const words = "middle name not on the document, middle initial, suffix (Jr., III…), abbreviation (Ma. for Maria)";
    expect(tag).toHaveAttribute("title", `Differences: ${words}`);
    // Read out too: a tooltip alone is not.
    expect(tag.textContent ?? "").toBe(`Close match: ${words}`);
    expect(screen.getByTestId("signatory-identity-name").textContent ?? "").toContain("Name on ID: Maria C. Santos Jr.");
  });

  it("still reads a difference this build does not know", async () => {
    renderDialog(standing({
      verifiedName: "Maria Santos-Cruz", nameMatch: "close", nameDifferences: ["hyphenated-surname", "order"],
    }));
    const tag = await screen.findByTestId("signatory-identity-name-tag");
    expect(tag).toHaveAttribute("title", "Differences: hyphenated surname, names in a different order");
  });

  it("says Close match alone when the server names no difference", async () => {
    renderDialog(standing({ verifiedName: "Maria Santos", nameMatch: "close" }));
    const tag = await screen.findByTestId("signatory-identity-name-tag");
    expect(tag.textContent ?? "").toBe("Close match");
    expect(tag).not.toHaveAttribute("title");
  });

  it("is tagged for a name the sender accepted", async () => {
    renderDialog(standing({ verifiedName: ID_NAME, nameMatch: "accepted", documentName: "Maria Santos" }));
    expect((await screen.findByTestId("signatory-identity-name-tag")).textContent ?? "").toBe("Accepted by the sender");
    expect(screen.getByTestId("signatory-identity-name").textContent ?? "").toContain(`Name on ID: ${ID_NAME}`);
    expect(screen.queryByRole("button", { name: /as the same person/ })).toBeNull();
  });

  it("says the spacing of a family name in plain words", async () => {
    renderDialog(standing({ verifiedName: "Maria De la Cruz", nameMatch: "close", nameDifferences: ["spacing"] }));
    expect(await screen.findByTestId("signatory-identity-name-tag"))
      .toHaveAttribute("title", "Differences: spacing of the family name (Dela Cruz / De la Cruz)");
  });

  it("shows no tag for a value the server does not send", async () => {
    renderDialog(standing({ verifiedName: ID_NAME, nameMatch: "corrected" as unknown as RecipientIdentityCheck["nameMatch"] }));
    expect((await screen.findByTestId("signatory-identity-name")).textContent ?? "").toBe(`Name on ID: ${ID_NAME}`);
    expect(screen.queryByTestId("signatory-identity-name-tag")).toBeNull();
  });

  it("renders exactly as before for an older server that sends none of it", async () => {
    renderDialog(standing());
    const line = await screen.findByTestId("signatory-identity-check");
    await waitFor(() => { expect(line.textContent ?? "").toMatch(/Passed .*2026/); });
    expect(line.textContent ?? "").toMatch(/^Identity checkPassed .*ID: Passport$/);
    expect(screen.queryByTestId("signatory-identity-name")).toBeNull();
    expect(screen.queryByTestId("signatory-identity-name-tag")).toBeNull();
    expect(screen.queryByRole("group", { name: /Name does not match/ })).toBeNull();
    expect(screen.queryByText(/Name on ID/)).toBeNull();
  });

  it("ignores fields that are not what the contract says", async () => {
    renderDialog(standing({ verifiedName: null, nameMatch: null }));
    await screen.findByTestId("signatory-identity-check");
    await waitFor(() => { expect(identityChecks).toHaveBeenCalled(); });
    expect(screen.queryByTestId("signatory-identity-name")).toBeNull();
  });
});

// ── A name that does not match ──────────────────────────────────────────────

describe("a name that does not match", () => {
  it("shows both names, the two decisions, how to sign under the ID's name, and the lighter method below", async () => {
    renderDialog(mismatch(), { onSendToSomeoneElse: vi.fn() });
    const box = await panel();
    expect(screen.getByTestId("signatory-identity-check").textContent ?? "").toContain("Name does not match");
    expect(within(box).getByText("Name on ID:").nextSibling?.textContent ?? "").toBe(ID_NAME);
    expect(within(box).getByText("On this document:").nextSibling?.textContent ?? "").toBe("Maria Santos");
    const actions = within(box).getAllByRole("button").map(button => button.textContent ?? "");
    expect(actions).toEqual(["Accept as the same person", "Send to someone else"]);
    // Nothing offers to change the name: said as a sentence, above the decisions.
    expect(screen.queryByRole("button", { name: /Use the name on the ID/ })).toBeNull();
    const hint = within(box).getByTestId("signatory-identity-name-resend-hint");
    expect(hint.textContent ?? "").toBe("To have them sign under the name on their ID, send the document again with that name.");
    expect(hint.compareDocumentPosition(acceptButton()) & Node.DOCUMENT_POSITION_FOLLOWING).toBeTruthy();
    const lighter = screen.getByRole("button", { name: "Allow a lighter method for Maria Santos" });
    expect(box.compareDocumentPosition(lighter) & Node.DOCUMENT_POSITION_FOLLOWING).toBeTruthy();
    // The name is not also shown as a verified participant's.
    expect(screen.queryByTestId("signatory-identity-name")).toBeNull();
  });

  it("lets both names wrap instead of overflowing", async () => {
    const long = "Maria Clara Concepcion Esperanza ".repeat(6).trim();
    renderDialog(mismatch({ verifiedName: long, documentName: `${long} Jr.` }));
    const box = await panel();
    for (const label of ["Name on ID:", "On this document:"]) {
      const value = within(box).getByText(label).nextSibling as HTMLElement;
      expect(value.style.overflowWrap).toBe("anywhere");
      expect(value.style.minWidth).toBe("0");
    }
  });

  it("does not offer Send to someone else where the page cannot open it", async () => {
    renderDialog(mismatch());
    const box = await panel();
    expect(within(box).queryByRole("button", { name: /someone else/ })).toBeNull();
    expect(within(box).getAllByRole("button")).toHaveLength(1);
  });

  it("offers no decision once the request is no longer out for signing", async () => {
    renderDialog(mismatch(), { state: "cancelled", onSendToSomeoneElse: vi.fn() });
    const box = await panel();
    expect(within(box).queryAllByRole("button")).toHaveLength(0);
    expect(within(box).queryByTestId("signatory-identity-name-resend-hint")).toBeNull();
    expect(screen.queryByRole("button", { name: /Allow a lighter method/ })).toBeNull();
  });

  it("falls back to the participant's name on the document, and says when it was given no ID name", async () => {
    const { verifiedName: _name, documentName: _document, ...bare } = mismatch();
    renderDialog(bare);
    const box = await panel();
    expect(within(box).getByText("Name on ID:").nextSibling?.textContent ?? "").toBe("Not available");
    expect(within(box).getByText("On this document:").nextSibling?.textContent ?? "").toBe("Maria Santos");
    expect(acceptButton()).toBeInTheDocument();
  });

  it("closes this dialog and hands over to the send-again dialog for Send to someone else", async () => {
    const user = userEvent.setup();
    const onSendToSomeoneElse = vi.fn();
    const { onClose } = renderDialog(mismatch(), { onSendToSomeoneElse });
    await panel();
    await user.click(screen.getByRole("button", { name: "Send this document to someone else instead of Maria Santos" }));
    expect(onClose).toHaveBeenCalledTimes(1);
    expect(onSendToSomeoneElse).toHaveBeenCalledTimes(1);
    expect(resolveName).not.toHaveBeenCalled();
  });

  it("still allows a lighter method, as for a lock", async () => {
    const user = userEvent.setup();
    waive.mockResolvedValue({ recipientId: "srr_1", status: "waived", waivedAt: "2026-10-10T03:00:00.000Z" });
    renderDialog(mismatch());
    await panel();
    await user.click(screen.getByRole("button", { name: "Allow a lighter method for Maria Santos" }));
    const dialog = await confirmation();
    expect(within(dialog).getByRole("heading", { name: "Allow a lighter method?" })).toBeInTheDocument();
    await user.click(within(dialog).getByRole("button", { name: "Continue" }));
    await waitFor(() => { expect(waive).toHaveBeenCalledWith("ws_1", "sr_1", "srr_1", ""); });
  });
});

// ── Accept as the same person ───────────────────────────────────────────────

describe("Accept as the same person", () => {
  it("needs a reason: a labelled, required field, and Continue held until one is given", async () => {
    const user = userEvent.setup();
    renderDialog(mismatch());
    await panel();
    await user.click(acceptButton());
    const dialog = await confirmation();
    expect(within(dialog).getByRole("heading", { name: "Accept as the same person?" })).toBeInTheDocument();
    expect(dialog.textContent ?? "").toContain(`The ID says “${ID_NAME}”. This document says “Maria Santos”`);
    const reason = within(dialog).getByRole("textbox", { name: /Reason/ });
    expect(reason).toHaveAttribute("placeholder", "For example: married name");
    expect(reason).toBeRequired();
    expect(reason).toHaveAccessibleDescription(/Required/);
    expect(reason).toHaveAttribute("maxlength", "500");
    expect(within(dialog).getByRole("button", { name: "Continue" })).toBeDisabled();
    await user.type(reason, "   ");
    expect(within(dialog).getByRole("button", { name: "Continue" })).toBeDisabled();
    expect(resolveName).not.toHaveBeenCalled();
  });

  it("asks first, with Cancel focused, and does nothing on Cancel", async () => {
    const user = userEvent.setup();
    renderDialog(mismatch());
    await panel();
    await user.click(acceptButton());
    const dialog = await confirmation();
    // Cancel is focused first: Enter must not be what confirms.
    expect(within(dialog).getByRole("button", { name: "Cancel" })).toHaveFocus();
    await user.click(within(dialog).getByRole("button", { name: "Cancel" }));
    expect(screen.queryByRole("alertdialog")).toBeNull();
    expect(resolveName).not.toHaveBeenCalled();
    // Focus returns to the button that opened it.
    expect(acceptButton()).toHaveFocus();
  });

  it("posts the reason once, reads the checks again, and announces the result", async () => {
    const user = userEvent.setup();
    const accepted = standing({ verifiedName: ID_NAME, nameMatch: "accepted", documentName: "Maria Santos" });
    let release: (value: RecipientIdentityCheck) => void = () => undefined;
    resolveName.mockImplementation(() => new Promise<RecipientIdentityCheck>(resolve => { release = resolve; }));
    renderDialog(mismatch());
    await panel();
    await user.click(acceptButton());
    const dialog = await confirmation();
    identityChecks.mockResolvedValue([accepted]);
    const before = identityChecks.mock.calls.length;
    await user.type(within(dialog).getByRole("textbox", { name: /Reason/ }), "  Married name ");
    await user.click(within(dialog).getByRole("button", { name: "Continue" }));
    // Busy: neither button can be pressed again while it is in flight.
    expect(within(dialog).getByRole("button", { name: "Working…" })).toBeDisabled();
    expect(within(dialog).getByRole("button", { name: "Cancel" })).toBeDisabled();
    await user.click(within(dialog).getByRole("button", { name: "Working…" }));
    expect(resolveName).toHaveBeenCalledTimes(1);
    expect(resolveName).toHaveBeenCalledWith("ws_1", "sr_1", "srr_1", { action: "accept", reason: "Married name" });

    release(accepted);
    await waitFor(() => { expect(screen.queryByRole("alertdialog")).toBeNull(); });
    expect(identityChecks.mock.calls.length).toBe(before + 1);
    const said = "Accepted as the same person. Maria Santos can now open the document.";
    const line = screen.getByTestId("signatory-name-resolved");
    expect(line.textContent ?? "").toBe(said);
    expect(line).toHaveFocus();
    const live = screen.getByTestId("participants-announcement");
    expect(live).toHaveAttribute("aria-live", "polite");
    expect(live.textContent ?? "").toBe(said);
    // The row now reads as the new state: the panel is gone, the names are as they were.
    expect(screen.getByTestId("signatory-identity-name-tag").textContent ?? "").toBe("Accepted by the sender");
    expect(screen.getByTestId("signatory-identity-check").textContent ?? "").toMatch(/Passed/);
    expect(screen.queryByRole("group", { name: /Name does not match/ })).toBeNull();
  });

  it("shows what the server answered if the re-read fails, instead of losing the row", async () => {
    const user = userEvent.setup();
    resolveName.mockResolvedValue(standing({ verifiedName: ID_NAME, nameMatch: "accepted", documentName: "Maria Santos" }));
    renderDialog(mismatch());
    await panel();
    identityChecks.mockRejectedValue(new Error("offline"));
    await user.click(acceptButton());
    const dialog = await confirmation();
    await user.type(within(dialog).getByRole("textbox", { name: /Reason/ }), "Married name");
    await user.click(within(dialog).getByRole("button", { name: "Continue" }));
    await waitFor(() => { expect(screen.queryByRole("alertdialog")).toBeNull(); });
    expect(screen.getByTestId("signatory-identity-name-tag").textContent ?? "").toBe("Accepted by the sender");
    expect(screen.queryByRole("group", { name: /Name does not match/ })).toBeNull();
  });

  it.each([
    [refusal(404, "not_found"), "You do not have permission to do this, or the document is no longer available."],
    [refusal(0, "network"), "That could not be done. Check your connection and try again."],
  ])("says a refusal inside the confirmation, never in the server's words", async (error, wording) => {
    const user = userEvent.setup();
    resolveName.mockRejectedValue(error);
    renderDialog(mismatch(), { onSendToSomeoneElse: vi.fn() });
    await panel();
    await user.click(acceptButton());
    const dialog = await confirmation();
    await user.type(within(dialog).getByRole("textbox", { name: /Reason/ }), "Married name");
    await user.click(within(dialog).getByRole("button", { name: "Continue" }));
    expect((await within(dialog).findByRole("alert")).textContent ?? "").toBe(wording);
    expect(dialog.textContent ?? "").not.toMatch(/server said/);
    expect(screen.queryByTestId("lifecycle-reason-error")).toBeNull();
    // Still open and usable; nothing was announced as done.
    await user.click(within(dialog).getByRole("button", { name: "Cancel" }));
    expect(await panel()).toBeInTheDocument();
    expect(screen.queryByTestId("signatory-name-resolved")).toBeNull();
    expect(screen.getByTestId("participants-announcement").textContent ?? "").toBe("");
  });

  it("reads the checks again behind the message when the name was decided elsewhere meanwhile", async () => {
    const user = userEvent.setup();
    resolveName.mockRejectedValue(refusal(409, "identity_name_not_pending"));
    renderDialog(mismatch());
    await panel();
    await user.click(acceptButton());
    const dialog = await confirmation();
    identityChecks.mockResolvedValue([standing({ verifiedName: ID_NAME, nameMatch: "accepted", documentName: "Maria Santos" })]);
    await user.type(within(dialog).getByRole("textbox", { name: /Reason/ }), "Married name");
    await user.click(within(dialog).getByRole("button", { name: "Continue" }));
    expect((await within(dialog).findByRole("alert")).textContent ?? "").toBe(
      "This name is no longer waiting for a decision. It may already have been decided.");
    await waitFor(() => { expect(screen.queryByRole("group", { name: /Name does not match/ })).toBeNull(); });
    expect(screen.getByTestId("signatory-identity-name-tag").textContent ?? "").toBe("Accepted by the sender");
  });

  it.each([
    ["required", "Give a reason."],
    ["too-long", "The reason is too long (500 characters at most)."],
  ])("says a reason the server found %s beside the field, and keeps what was typed", async (code, wording) => {
    const user = userEvent.setup();
    resolveName.mockRejectedValue(refusal(422, "identity_requirement_invalid", [{ field: "reason", code, message: "server words" }]));
    renderDialog(mismatch());
    await panel();
    await user.click(acceptButton());
    const dialog = await confirmation();
    const reason = within(dialog).getByRole("textbox", { name: /Reason/ });
    await user.type(reason, "Married name");
    await user.click(within(dialog).getByRole("button", { name: "Continue" }));
    const problem = await within(dialog).findByTestId("lifecycle-reason-error");
    expect(problem.textContent ?? "").toBe(wording);
    // Tied to the field, and the only thing said: no second message below.
    expect(reason).toBeInvalid();
    expect(reason).toHaveAccessibleDescription(new RegExp(wording.replace(/[.()]/g, "\\$&")));
    expect(within(dialog).getAllByRole("alert")).toHaveLength(1);
    expect(dialog.textContent ?? "").not.toMatch(/server words|server said/);
    expect(reason).toHaveValue("Married name");
    expect(within(dialog).getByRole("button", { name: "Continue" })).toBeEnabled();
    // It goes once the reason is changed.
    await user.type(reason, " after the wedding");
    expect(within(dialog).queryByTestId("lifecycle-reason-error")).toBeNull();
    expect(reason).toBeValid();
  });
});
