// The signer-details record: every field labeled, and the linked account
// (if any) shown distinctly from what the sender wrote in the document.

import { describe, it, expect, vi } from "vitest";
import { render, screen, waitFor, within } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import type { SigningRequestSignatures } from "../../../services/real/signing-request.service";

const signatures = vi.fn();
const reissueLink = vi.fn();
vi.mock("../../../services/real/signing-request.service", () => ({
  realSigningRequestService: {
    signatures: (...args: unknown[]) => signatures(...args),
    reissueLink: (...args: unknown[]) => reissueLink(...args),
  },
}));

// 105. The identity check has its own routes, which exist only where the
// check is switched on. Unless a test says otherwise they answer as a
// deployment without the feature does: nothing (the service's `null`).
const identityChecks = vi.fn();
const waiveIdentityCheck = vi.fn();
vi.mock("../../../services/real/identity-check.service", async (original) => ({
  ...(await original<typeof import("../../../services/real/identity-check.service")>()),
  realIdentityCheckService: {
    checks: (...args: unknown[]) => (identityChecks(...args) as Promise<unknown> | undefined) ?? Promise.resolve(null),
    waive: (...args: unknown[]) => waiveIdentityCheck(...args) as unknown,
  },
}));

import { SignatureRecordDialog } from "../SignatureRecordDialog";
import { ApiError } from "../../../services/api-client";
import type { RecipientIdentityCheck } from "../../../services/real/identity-check.service";

const withLinkedAccount: SigningRequestSignatures = {
  signingRequestId: "sr_1",
  state: "completed",
  signedCount: 1,
  requiredCount: 1,
  signatories: [
    {
      recipientId: "srr_1",
      name: "Maria Santos",
      email: "maria@ayalaland.example",
      organization: "Ayala Land",
      type: "signer",
      isRequired: true,
      routingOrder: 1,
      state: "signed",
      signedAt: "2026-09-22T03:41:00.000Z",
      declinedAt: null,
      declineReason: null,
      linkedAccountName: "Ma. Teresa Santos",
      linkedAccountEmail: "maria.signer@example.com",
    },
  ],
};

const noLinkedAccount: SigningRequestSignatures = {
  ...withLinkedAccount,
  signatories: [{
    ...withLinkedAccount.signatories[0]!,
    linkedAccountName: null,
    linkedAccountEmail: null,
  }],
};

function renderDialog() {
  render(
    <SignatureRecordDialog
      workspaceId="ws_1" signingRequestId="sr_1"
      documentTitle="Office Lease" onClose={vi.fn()}
    />,
  );
}

describe("SignatureRecordDialog", () => {
  it("labels the document-provided name, email and company", async () => {
    signatures.mockResolvedValue(withLinkedAccount);
    renderDialog();

    expect(await screen.findByText("(name in document)")).toBeInTheDocument();
    expect(screen.getByText("Maria Santos")).toBeInTheDocument();
    expect(screen.getByText("Email in document")).toBeInTheDocument();
    expect(screen.getAllByText("maria@ayalaland.example").length).toBeGreaterThan(0);
    expect(screen.getByText("Company")).toBeInTheDocument();
    expect(screen.getByText("Ayala Land")).toBeInTheDocument();
  });

  it("shows the linked account's own name and email, distinct from the document's", async () => {
    signatures.mockResolvedValue(withLinkedAccount);
    renderDialog();

    expect(await screen.findByText("Signed in with a LAGDA account")).toBeInTheDocument();
    expect(screen.getByText("Account name")).toBeInTheDocument();
    expect(screen.getByText("Ma. Teresa Santos")).toBeInTheDocument();
    expect(screen.getByText("Account email")).toBeInTheDocument();
    expect(screen.getByText("maria.signer@example.com")).toBeInTheDocument();
    // Distinct from what the sender wrote.
    expect(screen.getByText("Maria Santos")).toBeInTheDocument();
    expect(screen.getByText("maria@ayalaland.example")).toBeInTheDocument();
  });

  it("omits the account block entirely when no account is linked", async () => {
    signatures.mockResolvedValue(noLinkedAccount);
    renderDialog();

    await screen.findByText("(name in document)");
    expect(screen.queryByText("Signed in with a LAGDA account")).toBeNull();
    expect(screen.queryByText("Account name")).toBeNull();
  });

  it("flags an account name that differs from the name in the document", async () => {
    signatures.mockResolvedValue(withLinkedAccount);
    renderDialog();

    expect((await screen.findByTestId("signatory-name-mismatch")).textContent)
      .toBe("Name differs from the LAGDA account (Ma. Teresa Santos)");
  });

  it("does not flag a name that differs only in case or spacing", async () => {
    signatures.mockResolvedValue({
      ...withLinkedAccount,
      signatories: [{ ...withLinkedAccount.signatories[0]!, linkedAccountName: "  maria   SANTOS " }],
    });
    renderDialog();

    await screen.findByText("Signed in with a LAGDA account");
    expect(screen.queryByTestId("signatory-name-mismatch")).toBeNull();
  });

  // Approvers used to crash this dialog: `approved`/`skipped` had no
  // presentation, and the row read a property of undefined.
  it("shows an approver who approved and one who was skipped, with their roles", async () => {
    signatures.mockResolvedValue({
      ...noLinkedAccount,
      signatories: [
        { ...noLinkedAccount.signatories[0]!, recipientId: "srr_a", name: "Ben Cruz",
          type: "approver", state: "approved", signedAt: null,
          approvedAt: "2026-09-22T04:00:00.000Z" },
        { ...noLinkedAccount.signatories[0]!, recipientId: "srr_b", name: "Lia Tan",
          type: "approver", state: "skipped", signedAt: null,
          skippedAt: "2026-09-22T05:00:00.000Z" },
      ],
    });
    renderDialog();

    expect(await screen.findByText("Approved")).toBeTruthy();
    expect(screen.getByText("Skipped")).toBeTruthy();
    expect(screen.getAllByText("Approver")).toHaveLength(2);
    expect(screen.getByText(/^Approved .+/)).toBeTruthy();
  });

  it("says Reviewed and Acknowledged, not Signed, for those roles", async () => {
    signatures.mockResolvedValue({
      ...noLinkedAccount,
      signatories: [
        { ...noLinkedAccount.signatories[0]!, recipientId: "srr_r", name: "Rey Dela", type: "reviewer" },
        { ...noLinkedAccount.signatories[0]!, recipientId: "srr_k", name: "Kim Uy", type: "acknowledgment-recipient" },
      ],
    });
    renderDialog();

    expect(await screen.findByText("Reviewed")).toBeTruthy();
    expect(screen.getByText("Acknowledged")).toBeTruthy();
    expect(screen.getByText(/^Reviewed .+/)).toBeTruthy();
    expect(screen.getByText(/^Acknowledged .+/)).toBeTruthy();
    expect(screen.queryByText(/^Signed/)).toBeNull();
  });

  it("says what a viewer and a copy recipient get, never Awaiting", async () => {
    signatures.mockResolvedValue({
      ...noLinkedAccount,
      signatories: [
        { ...noLinkedAccount.signatories[0]!, recipientId: "srr_v", name: "Val Ong",
          type: "viewer", state: "active", signedAt: null },
        { ...noLinkedAccount.signatories[0]!, recipientId: "srr_c", name: "Cy Lim",
          type: "carbon-copy", state: "waiting", signedAt: null },
      ],
    });
    renderDialog();

    expect(await screen.findByText("View only")).toBeTruthy();
    expect(screen.getByText("Gets the final copy")).toBeTruthy();
    expect(screen.queryByText("Awaiting")).toBeNull();
    expect(screen.queryByText("Not yet due")).toBeNull();
  });

  it("shows why a signer declined, in the words they chose", async () => {
    signatures.mockResolvedValue({
      ...noLinkedAccount,
      signatories: [{
        ...noLinkedAccount.signatories[0]!, state: "declined", signedAt: null,
        declinedAt: "2026-09-22T05:00:00.000Z", declineReason: "needs-correction",
      }],
    });
    renderDialog();
    expect(await screen.findByText("Reason for declining")).toBeTruthy();
    expect(screen.getByText("The document requires correction")).toBeTruthy();
  });

  it("is titled Participants, not Signature record", async () => {
    signatures.mockResolvedValue(noLinkedAccount);
    renderDialog();
    expect(await screen.findByRole("heading", { name: "Participants" })).toBeTruthy();
  });
});

// 097. A signing link lives fourteen days and is never renewed on its own:
// the sender sees that it ended, who has not acted, and sends a new one.
describe("a signing link that has ended", () => {
  const waiting = (linkExpiresAt: string | null, state: SigningRequestSignatures["state"] = "sent"): SigningRequestSignatures => ({
    ...noLinkedAccount,
    state,
    signedCount: 0,
    signatories: [{ ...noLinkedAccount.signatories[0]!, state: "active", signedAt: null, linkExpiresAt }],
  });

  it("says so, names who has not acted, and sends a new link on the same request", async () => {
    signatures.mockResolvedValue(waiting("2026-01-02T00:00:00.000Z"));
    reissueLink.mockResolvedValue({ recipientId: "srr_1", linkExpiresAt: "2099-01-16T00:00:00.000Z" });
    renderDialog();

    const notice = await screen.findByTestId("signing-link-lapsed");
    expect(notice.textContent).toContain("The signing link has ended");
    expect(notice.textContent).toContain("Maria Santos has not acted");

    await userEvent.click(screen.getByRole("button", { name: "Send a new link to Maria Santos" }));
    expect(reissueLink).toHaveBeenCalledWith("ws_1", "sr_1", "srr_1");
    const sent = await screen.findByTestId("signing-link-sent");
    expect(sent.textContent).toContain("maria@ayalaland.example");
    expect(screen.queryByTestId("signing-link-lapsed")).toBeNull();
  });

  it("says so when a new link cannot be sent", async () => {
    signatures.mockResolvedValue(waiting("2026-01-02T00:00:00.000Z"));
    reissueLink.mockRejectedValue(new Error("offline"));
    renderDialog();
    await userEvent.click(await screen.findByRole("button", { name: "Send a new link to Maria Santos" }));
    expect((await screen.findByRole("alert")).textContent).toContain("could not be sent");
  });

  it("offers nothing while the link still works", async () => {
    signatures.mockResolvedValue(waiting("2099-01-02T00:00:00.000Z"));
    renderDialog();
    expect(await screen.findByText(/Signing link works until/)).toBeTruthy();
    expect(screen.queryByRole("button", { name: /Send a new link/ })).toBeNull();
  });

  it("offers nothing once the request is no longer out for signing", async () => {
    signatures.mockResolvedValue(waiting("2026-01-02T00:00:00.000Z", "expired"));
    renderDialog();
    expect(await screen.findByText("Maria Santos")).toBeTruthy();
    expect(screen.queryByRole("button", { name: /Send a new link/ })).toBeNull();
  });
});

// 105. The sender may ask a participant for an identity check. Where they
// did, each row says how that participant stands, and the sender can let
// them continue with their secure link alone.
describe("the identity check of each participant", () => {
  const out = (state: SigningRequestSignatures["state"] = "sent"): SigningRequestSignatures => ({
    ...noLinkedAccount,
    state,
    signedCount: 0,
    signatories: [{ ...noLinkedAccount.signatories[0]!, state: "active", signedAt: null }],
  });
  const standing = (over: Partial<RecipientIdentityCheck> = {}): RecipientIdentityCheck => ({
    recipientId: "srr_1", email: "maria@ayalaland.example", required: true, status: "pending", mode: "test",
    lastOutcome: null, failedAttempts: 0, verifiedAt: null, idType: null, waivedAt: null, ...over,
  });
  const line = async () => (await screen.findByTestId("signatory-identity-check")).textContent;

  it("shows nothing where the feature is off", async () => {
    signatures.mockResolvedValue(out());
    renderDialog();
    await screen.findByText("(name in document)");
    expect(identityChecks).toHaveBeenCalledWith("ws_1", "sr_1");
    expect(screen.queryByTestId("signatory-identity-check")).toBeNull();
    expect(screen.queryByText("Identity check")).toBeNull();
    expect(screen.queryByRole("button", { name: /lighter method/ })).toBeNull();
  });

  it("shows nothing when the checks cannot be read, and the participants still load", async () => {
    signatures.mockResolvedValue(out());
    identityChecks.mockRejectedValue(new ApiError(500, undefined, "boom"));
    renderDialog();
    expect(await screen.findByText("Maria Santos")).toBeTruthy();
    expect(screen.queryByTestId("signatory-identity-check")).toBeNull();
  });

  it("shows nothing for a participant nothing was asked of", async () => {
    signatures.mockResolvedValue(out());
    identityChecks.mockResolvedValue([standing({ required: false, status: "not-required", mode: null })]);
    renderDialog();
    await screen.findByText("(name in document)");
    await waitFor(() => { expect(identityChecks).toHaveBeenCalled(); });
    expect(screen.queryByTestId("signatory-identity-check")).toBeNull();
  });

  it("says Required, not done yet before any attempt", async () => {
    signatures.mockResolvedValue(out());
    identityChecks.mockResolvedValue([standing()]);
    renderDialog();
    expect(await line()).toContain("Identity check");
    expect(await line()).toContain("Required, not done yet");
    expect(screen.getByRole("button", { name: "Allow a lighter method for Maria Santos" })).toBeInTheDocument();
  });

  it("counts the attempts that were not passed", async () => {
    signatures.mockResolvedValue(out());
    identityChecks.mockResolvedValue([standing({ lastOutcome: "failed", failedAttempts: 2 })]);
    renderDialog();
    expect(await line()).toContain("Not passed, 2 attempts");
  });

  it("never calls a simulated result a pass", async () => {
    signatures.mockResolvedValue(out());
    identityChecks.mockResolvedValue([standing({
      status: "passed", lastOutcome: "passed", verifiedAt: "2026-09-22T03:41:00.000Z", idType: "umid",
    })]);
    renderDialog();
    const text = await line();
    expect(text).toContain("Completed (test mode)");
    expect(text).toMatch(/2026/);
    expect(text).not.toMatch(/Passed|verified/i);
    // Done: nothing lighter is left to allow.
    expect(screen.queryByRole("button", { name: /lighter method/ })).toBeNull();
  });

  it("says Passed, with the date, for a real check", async () => {
    signatures.mockResolvedValue(out());
    identityChecks.mockResolvedValue([standing({
      status: "passed", mode: "live", lastOutcome: "passed", verifiedAt: "2026-09-22T03:41:00.000Z",
    })]);
    renderDialog();
    expect(await line()).toMatch(/Passed .*2026/);
  });

  it("says Lighter method allowed, with the date, once waived", async () => {
    signatures.mockResolvedValue(out());
    identityChecks.mockResolvedValue([standing({ required: false, status: "waived", waivedAt: "2026-09-23T03:41:00.000Z" })]);
    renderDialog();
    expect(await line()).toMatch(/Lighter method allowed .*2026/);
    expect(screen.queryByRole("button", { name: /Allow a lighter method/ })).toBeNull();
  });

  it("offers no lighter method once the request is no longer out for signing", async () => {
    signatures.mockResolvedValue(out("expired"));
    identityChecks.mockResolvedValue([standing({ status: "locked", failedAttempts: 3 })]);
    renderDialog();
    expect(await line()).toContain("Locked after 3 attempts");
    expect(screen.queryByRole("button", { name: /Allow a lighter method/ })).toBeNull();
  });

  it("asks before allowing a lighter method, sends the reason, and shows the new standing", async () => {
    signatures.mockResolvedValue(out());
    identityChecks.mockResolvedValueOnce([standing({ status: "locked", lastOutcome: "failed", failedAttempts: 3 })]);
    waiveIdentityCheck.mockResolvedValue({ recipientId: "srr_1", status: "waived", waivedAt: "2026-09-23T03:41:00.000Z" });
    renderDialog();
    expect(await line()).toContain("Locked after 3 attempts");

    await userEvent.click(screen.getByRole("button", { name: "Allow a lighter method for Maria Santos" }));
    const confirm = screen.getByRole("alertdialog", { name: "Allow a lighter method?" });
    expect(confirm.textContent).toContain("open and sign the document with their secure link alone");
    expect(confirm.textContent).toContain("This is recorded in the document's history.");
    expect(confirm.textContent).toContain("Maria Santos");
    // Cancel and Continue, and the reason is optional: Continue is not held back.
    expect(within(confirm).getByRole("button", { name: "Cancel" })).toHaveFocus();
    expect(within(confirm).getByRole("button", { name: "Continue" })).toBeEnabled();
    expect(within(confirm).getByRole("textbox", { name: /Reason/ })).toHaveAttribute("maxlength", "500");
    expect(waiveIdentityCheck).not.toHaveBeenCalled();

    identityChecks.mockResolvedValueOnce([standing({ required: false, status: "waived", waivedAt: "2026-09-23T03:41:00.000Z" })]);
    await userEvent.type(within(confirm).getByRole("textbox", { name: /Reason/ }), "No ID with them");
    await userEvent.click(within(confirm).getByRole("button", { name: "Continue" }));

    expect(waiveIdentityCheck).toHaveBeenCalledWith("ws_1", "sr_1", "srr_1", "No ID with them");
    await waitFor(() => { expect(screen.queryByRole("alertdialog")).toBeNull(); });
    expect(await line()).toContain("Lighter method allowed");
    expect(identityChecks).toHaveBeenCalledTimes(2);
    expect(screen.queryByRole("button", { name: /Allow a lighter method/ })).toBeNull();
  });

  it("can be allowed before the participant has even tried, with no reason", async () => {
    signatures.mockResolvedValue(out());
    identityChecks.mockResolvedValue([standing()]);
    waiveIdentityCheck.mockResolvedValue({ recipientId: "srr_1", status: "waived", waivedAt: "2026-09-23T03:41:00.000Z" });
    renderDialog();
    await userEvent.click(await screen.findByRole("button", { name: "Allow a lighter method for Maria Santos" }));
    await userEvent.click(screen.getByRole("button", { name: "Continue" }));
    expect(waiveIdentityCheck).toHaveBeenCalledWith("ws_1", "sr_1", "srr_1", "");
  });

  it("changes nothing on Cancel, and Escape closes only the question", async () => {
    const onClose = vi.fn();
    signatures.mockResolvedValue(out());
    identityChecks.mockResolvedValue([standing()]);
    render(
      <SignatureRecordDialog workspaceId="ws_1" signingRequestId="sr_1" documentTitle="Office Lease" onClose={onClose} />,
    );
    await userEvent.click(await screen.findByRole("button", { name: "Allow a lighter method for Maria Santos" }));
    await userEvent.keyboard("{Escape}");
    expect(screen.queryByRole("alertdialog")).toBeNull();
    expect(onClose).not.toHaveBeenCalled();

    await userEvent.click(screen.getByRole("button", { name: "Allow a lighter method for Maria Santos" }));
    await userEvent.click(screen.getByRole("button", { name: "Cancel" }));
    expect(screen.queryByRole("alertdialog")).toBeNull();
    expect(waiveIdentityCheck).not.toHaveBeenCalled();
  });

  it("says why inside the question when it cannot be done", async () => {
    signatures.mockResolvedValue(out());
    identityChecks.mockResolvedValue([standing()]);
    waiveIdentityCheck.mockRejectedValue(new ApiError(409, { code: "identity_check_not_required", message: "m" }, "x"));
    renderDialog();
    await userEvent.click(await screen.findByRole("button", { name: "Allow a lighter method for Maria Santos" }));
    await userEvent.click(screen.getByRole("button", { name: "Continue" }));
    expect((await screen.findByRole("alert")).textContent).toBe("No identity check is required of this participant any more.");
    expect(screen.getByRole("alertdialog")).toBeInTheDocument();
  });
});
