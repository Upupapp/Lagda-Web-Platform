// The Participants dialog's identity line, with the kind of ID presented.
//
// Pinned: the kinds the identity verification partner reports have names
// ("Passport", "Other government ID"); a participant with no ID on record
// shows no such line; and the line never names the vendor.

import { describe, it, expect, vi } from "vitest";
import { render, screen, waitFor } from "@testing-library/react";
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

const record: SigningRequestSignatures = {
  signingRequestId: "sr_1", state: "sent", signedCount: 0, requiredCount: 1,
  signatories: [{
    recipientId: "srr_1", name: "Maria Santos", email: "maria@ayalaland.example", organization: "Ayala Land",
    type: "signer", isRequired: true, routingOrder: 1, state: "active", signedAt: null, declinedAt: null,
    declineReason: null, linkedAccountName: null, linkedAccountEmail: null,
  }],
};

const standing = (over: Partial<RecipientIdentityCheck> = {}): RecipientIdentityCheck => ({
  recipientId: "srr_1", email: "maria@ayalaland.example", required: true, status: "passed", mode: "live",
  lastOutcome: "passed", failedAttempts: 0, verifiedAt: "2026-10-09T03:41:00.000Z", idType: null, waivedAt: null, ...over,
});

function renderDialog(check: RecipientIdentityCheck) {
  signatures.mockResolvedValue(record);
  identityChecks.mockResolvedValue([check]);
  render(<SignatureRecordDialog workspaceId="ws_1" signingRequestId="sr_1" documentTitle="Office Lease" onClose={vi.fn()} />);
}

describe("the kind of ID on the identity line", () => {
  it.each([
    ["passport", "ID: Passport"],
    ["other-id", "ID: Other government ID"],
    ["umid", "ID: UMID (SSS / GSIS)"],
  ])("names %s", async (idType, wording) => {
    renderDialog(standing({ idType }));
    expect((await screen.findByTestId("signatory-identity-id-type")).textContent).toBe(wording);
    const line = screen.getByTestId("signatory-identity-check").textContent;
    expect(line).toMatch(/Passed .*2026/);
    expect(line).not.toMatch(/didit/i);
  });

  it("shows no such line when no ID is on record", async () => {
    renderDialog(standing({ status: "pending", lastOutcome: null, verifiedAt: null }));
    expect((await screen.findByTestId("signatory-identity-check")).textContent).toContain("Required, not done yet");
    await waitFor(() => { expect(identityChecks).toHaveBeenCalled(); });
    expect(screen.queryByTestId("signatory-identity-id-type")).toBeNull();
  });
});
