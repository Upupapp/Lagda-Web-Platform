// The signer-details record: every field labeled, and the linked account
// (if any) shown distinctly from what the sender wrote in the document.

import { describe, it, expect, vi } from "vitest";
import { render, screen } from "@testing-library/react";
import type { SigningRequestSignatures } from "../../../services/real/signing-request.service";

const signatures = vi.fn();
vi.mock("../../../services/real/signing-request.service", () => ({
  realSigningRequestService: { signatures: (...args: unknown[]) => signatures(...args) },
}));

import { SignatureRecordDialog } from "../SignatureRecordDialog";

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

  it("is titled Participants, not Signature record", async () => {
    signatures.mockResolvedValue(noLinkedAccount);
    renderDialog();
    expect(await screen.findByRole("heading", { name: "Participants" })).toBeTruthy();
  });
});
