// The Participants dialog's "Verified account" tag: shown beside a
// participant's name where the server says that person has verified their own
// LAGDA account, and nowhere else.

import { describe, it, expect, vi, beforeEach } from "vitest";
import { render, screen, waitFor, within } from "@testing-library/react";
import type { SigningRequestSignatures } from "../../../services/real/signing-request.service";

const signatures = vi.fn();
vi.mock("../../../services/real/signing-request.service", () => ({
  realSigningRequestService: {
    signatures: (...args: unknown[]) => signatures(...args) as unknown,
    reissueLink: vi.fn(),
  },
}));

const identityChecks = vi.fn();
vi.mock("../../../services/real/identity-check.service", async (original) => ({
  ...(await original<typeof import("../../../services/real/identity-check.service")>()),
  realIdentityCheckService: {
    checks: (...args: unknown[]) => identityChecks(...args) as unknown,
    waive: vi.fn(),
  },
}));

import { SignatureRecordDialog } from "../SignatureRecordDialog";
import type { RecipientIdentityCheck } from "../../../services/real/identity-check.service";

type Signatory = SigningRequestSignatures["signatories"][number];

const signatory = (recipientId: string, name: string, email: string): Signatory => ({
  recipientId, name, email, organization: null, type: "signer", isRequired: true, routingOrder: 1,
  state: "active", signedAt: null, declinedAt: null, declineReason: null,
  linkedAccountName: null, linkedAccountEmail: null,
});

const record: SigningRequestSignatures = {
  signingRequestId: "sr_1", state: "sent", signedCount: 0, requiredCount: 2,
  signatories: [
    signatory("srr_1", "Maria Santos", "maria@ayalaland.example"),
    signatory("srr_2", "Jose Rizal", "jose@ayalaland.example"),
  ],
};

const standing = (over: Partial<RecipientIdentityCheck> = {}): RecipientIdentityCheck => ({
  recipientId: "srr_1", email: "maria@ayalaland.example", required: true, status: "pending", mode: "live",
  lastOutcome: null, failedAttempts: 0, verifiedAt: null, idType: null, waivedAt: null, ...over,
});

const other = (over: Partial<RecipientIdentityCheck> = {}) =>
  standing({ recipientId: "srr_2", email: "jose@ayalaland.example", ...over });

function renderDialog(checks: RecipientIdentityCheck[] | null) {
  signatures.mockResolvedValue(record);
  identityChecks.mockResolvedValue(checks);
  render(<SignatureRecordDialog workspaceId="ws_1" signingRequestId="sr_1" documentTitle="Office Lease" onClose={vi.fn()} />);
}

function row(name: string): HTMLElement {
  const item = screen.getByText(name).closest("li");
  if (item === null) throw new Error(`no row for ${name}`);
  return item;
}

beforeEach(() => { signatures.mockReset(); identityChecks.mockReset(); });

describe("the Verified account tag", () => {
  it("is shown beside the name of a participant whose account is verified, with what it means", async () => {
    renderDialog([standing({ accountVerified: true }), other({ accountVerified: false })]);
    const tag = await screen.findByTestId("signatory-account-verified");
    expect(tag.textContent ?? "").toBe("Verified account");
    expect(tag).toHaveAttribute("title", "This person has verified their LAGDA account");
    expect(within(row("Maria Santos")).getByTestId("signatory-account-verified")).toBe(tag);
    // One participant is verified; the other shows nothing.
    expect(screen.getAllByTestId("signatory-account-verified")).toHaveLength(1);
    expect(within(row("Jose Rizal")).queryByTestId("signatory-account-verified")).toBeNull();
  });

  it("is shown for a verified participant no identity check was asked of, and adds no identity line", async () => {
    renderDialog([standing({ required: false, status: "not-required", mode: null, accountVerified: true })]);
    expect(await screen.findByTestId("signatory-account-verified")).toBeInTheDocument();
    expect(screen.queryByTestId("signatory-identity-check")).toBeNull();
  });

  it("is absent where the server says nothing, or says false", async () => {
    renderDialog([standing(), other({ accountVerified: false })]);
    expect(await screen.findAllByTestId("signatory-identity-check")).toHaveLength(2);
    expect(screen.queryByTestId("signatory-account-verified")).toBeNull();
    expect(screen.queryByText("Verified account")).toBeNull();
  });

  it("is absent where the identity check is switched off", async () => {
    renderDialog(null);
    expect(await screen.findByText("Maria Santos")).toBeInTheDocument();
    await waitFor(() => { expect(identityChecks).toHaveBeenCalled(); });
    expect(screen.queryByTestId("signatory-account-verified")).toBeNull();
  });
});
