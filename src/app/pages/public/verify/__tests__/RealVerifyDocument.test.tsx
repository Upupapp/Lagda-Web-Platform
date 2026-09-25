// The real /verify page: ID lookup, then a SEPARATE email-gated step before
// the document itself is ever fetched (OD-135) — neither step should imply
// the other succeeded.

import { describe, it, expect, vi, beforeEach } from "vitest";
import { render, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { MemoryRouter } from "react-router";

const lookupVerification = vi.fn();
const requestParticipantAccess = vi.fn();
const fetchParticipantDocument = vi.fn();
vi.mock("../../../../services/real/public-verification.service", () => ({
  lookupVerification: (...args: unknown[]) => lookupVerification(...args),
  requestParticipantAccess: (...args: unknown[]) => requestParticipantAccess(...args),
  fetchParticipantDocument: (...args: unknown[]) => fetchParticipantDocument(...args),
}));
vi.mock("../../../../components/verification/VerificationQRCode", () => ({
  VerificationQRCode: () => <div data-testid="qr-code" />,
}));

import { RealVerifyDocument } from "../RealVerifyDocument";

const RECORD = {
  verificationId: "ver_1", completedAt: 1_770_000_000_000, participantCount: 2,
  finalDocument: { digestAlgorithm: "sha-256" as const, digest: "abc123" },
  seal: { scheme: "lagda-v1", version: 1, digestAlgorithm: "sha-256" as const, description: "Sealed" },
};

function renderPage() {
  render(<MemoryRouter><RealVerifyDocument /></MemoryRouter>);
}

beforeEach(() => {
  lookupVerification.mockReset();
  requestParticipantAccess.mockReset();
  fetchParticipantDocument.mockReset();
  URL.createObjectURL = vi.fn(() => "blob:x");
  URL.revokeObjectURL = vi.fn();
  vi.spyOn(window, "open").mockImplementation(() => null);
});

describe("RealVerifyDocument — ID lookup", () => {
  it("shows the record and a QR code once a completed transaction is found", async () => {
    lookupVerification.mockResolvedValue({ kind: "found", record: RECORD });
    renderPage();
    await userEvent.type(screen.getByLabelText(/Verification ID/), "ver_1");
    await userEvent.click(screen.getByRole("button", { name: /Check Verification Record/ }));

    expect(await screen.findByText("Verified — Completed")).toBeTruthy();
    expect(screen.getByText("abc123")).toBeTruthy();
    expect(screen.getByTestId("qr-code")).toBeTruthy();
    // The document view section is offered, but no document call has fired yet.
    expect(screen.getByText("View the signed document")).toBeTruthy();
    expect(fetchParticipantDocument).not.toHaveBeenCalled();
  });

  it("reports no record found without claiming a reason", async () => {
    lookupVerification.mockResolvedValue({ kind: "not-found" });
    renderPage();
    await userEvent.type(screen.getByLabelText(/Verification ID/), "nope");
    await userEvent.click(screen.getByRole("button", { name: /Check Verification Record/ }));
    expect(await screen.findByText(/No matching, completed LAGDA verification record/)).toBeTruthy();
  });
});

describe("RealVerifyDocument — email-gated document access", () => {
  async function getToFoundRecord() {
    lookupVerification.mockResolvedValue({ kind: "found", record: RECORD });
    renderPage();
    await userEvent.type(screen.getByLabelText(/Verification ID/), "ver_1");
    await userEvent.click(screen.getByRole("button", { name: /Check Verification Record/ }));
    await screen.findByText("View the signed document");
  }

  it("does not fetch the document just from a successful ID lookup", async () => {
    await getToFoundRecord();
    expect(fetchParticipantDocument).not.toHaveBeenCalled();
    expect(requestParticipantAccess).not.toHaveBeenCalled();
  });

  it("grants access on a matching participant email, then requires a second explicit action to view", async () => {
    await getToFoundRecord();
    requestParticipantAccess.mockResolvedValue({
      kind: "granted", documentTitle: "Lease Agreement", recipientType: "signer",
    });
    await userEvent.type(screen.getByLabelText(/Your email address/), "maria@example.com");
    await userEvent.click(screen.getByRole("button", { name: /Verify & Continue/ }));

    expect(await screen.findByText(/Access granted/)).toBeTruthy();
    expect(screen.getByText(/Lease Agreement/)).toBeTruthy();
    expect(requestParticipantAccess).toHaveBeenCalledWith("ver_1", "maria@example.com");
    // Still no document bytes fetched until the explicit "View Document" click.
    expect(fetchParticipantDocument).not.toHaveBeenCalled();

    fetchParticipantDocument.mockResolvedValue({ kind: "ok", blob: new Blob(["%PDF"]), mediaType: "application/pdf" });
    await userEvent.click(screen.getByRole("button", { name: /View Document/ }));
    expect(fetchParticipantDocument).toHaveBeenCalledWith("ver_1", "maria@example.com");
    expect(await screen.findByText(/opened in a new tab/)).toBeTruthy();
  });

  it("denies a non-matching email with one generic message, no oracle", async () => {
    await getToFoundRecord();
    requestParticipantAccess.mockResolvedValue({ kind: "denied" });
    await userEvent.type(screen.getByLabelText(/Your email address/), "stranger@example.com");
    await userEvent.click(screen.getByRole("button", { name: /Verify & Continue/ }));
    expect(await screen.findByText(/doesn't match a participant/)).toBeTruthy();
  });
});
