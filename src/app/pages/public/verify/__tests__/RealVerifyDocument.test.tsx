// The real verification flow: /verify search → dedicated /verify/:id page →
// email → 6-digit code → unlocked document view; plus "Check a file".
// Seeing a completed record must never imply the document was fetched.

import { describe, it, expect, vi, beforeEach } from "vitest";
import { render, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { MemoryRouter, Routes, Route } from "react-router";

const lookupVerification = vi.fn();
const requestAccessCode = vi.fn();
const submitAccessCode = vi.fn();
const fetchSignedDocument = vi.fn();
const checkVerificationFile = vi.fn();
const requestMemberAccess = vi.fn();
vi.mock("../../../../services/real/public-verification.service", () => ({
  lookupVerification: (...a: unknown[]) => lookupVerification(...a),
  requestAccessCode: (...a: unknown[]) => requestAccessCode(...a),
  submitAccessCode: (...a: unknown[]) => submitAccessCode(...a),
  fetchSignedDocument: (...a: unknown[]) => fetchSignedDocument(...a),
  checkVerificationFile: (...a: unknown[]) => checkVerificationFile(...a),
  requestMemberAccess: (...a: unknown[]) => requestMemberAccess(...a),
  verificationPageUrl: (id: string) => `https://lagda.test/verify/${encodeURIComponent(id)}`,
}));
vi.mock("../../../../components/verification/VerificationQRCode", () => ({
  VerificationQRCode: ({ url }: { url: string }) => <div data-testid="qr-code" data-url={url} />,
}));

import { RealVerifyDocument, RealVerifyRecord } from "../RealVerifyDocument";

const RECORD = {
  verificationId: "ver_1", completedAt: 1_770_000_000_000, participantCount: 2,
  finalDocument: { digestAlgorithm: "sha-256" as const, digest: "abc123" },
  seal: { scheme: "lagda-v1", version: 1, digestAlgorithm: "sha-256" as const, description: "Sealed" },
};

function grant(expiresAt = Date.now() + 10 * 60_000) {
  return {
    accessToken: "tok_1", expiresAt, documentTitle: "Lease Agreement", recipientType: "signer",
    details: {
      documentTitle: "Lease Agreement", completedAt: 1_770_000_000_000, sealedDigest: "sealed-digest-xyz",
      participants: [
        { name: "Second Signer", maskedEmail: "s***@example.com", recipientType: "signer", status: "signed", actedAt: 1_770_000_000_000, routingOrder: 2 },
        { name: "First Approver", maskedEmail: "f***@example.com", recipientType: "approver", status: "approved", actedAt: null, routingOrder: 1 },
      ],
      events: [{ type: "completed", label: "Transaction completed", at: 1_770_000_000_000 }],
    },
  };
}

function renderSearch() {
  render(
    <MemoryRouter initialEntries={["/verify"]}>
      <Routes>
        <Route path="/verify" element={<RealVerifyDocument />} />
        <Route path="/verify/:verificationId" element={<div>Dedicated page</div>} />
      </Routes>
    </MemoryRouter>,
  );
}

function renderRecord(id = "ver_1") {
  render(
    <MemoryRouter initialEntries={[`/verify/${id}`]}>
      <Routes>
        <Route path="/verify/:verificationId" element={<RealVerifyRecord />} />
        <Route path="/verify" element={<div>Search page</div>} />
      </Routes>
    </MemoryRouter>,
  );
}

async function reachCodeStep() {
  lookupVerification.mockResolvedValue({ kind: "found", record: RECORD });
  requestAccessCode.mockResolvedValue({ kind: "sent", expiresInSeconds: 600 });
  renderRecord();
  await screen.findByText("Completed record found");
  await userEvent.type(screen.getByLabelText("Participant email"), "maria@example.com");
  await userEvent.click(screen.getByRole("button", { name: "Send code" }));
  await screen.findByText(/If that email is a participant, we’ve sent a code\./);
}

async function typeCode(code = "123456") {
  await userEvent.click(screen.getByLabelText("Digit 1 of 6"));
  await userEvent.paste(code);
}

beforeEach(() => {
  vi.clearAllMocks();
  URL.createObjectURL = vi.fn(() => "blob:signed");
  URL.revokeObjectURL = vi.fn();
  fetchSignedDocument.mockResolvedValue({ kind: "ok", blob: new Blob(["%PDF"], { type: "application/pdf" }), mediaType: "application/pdf" });
});

describe("/verify search", () => {
  it("shows the record, a QR code for the dedicated page URL, and an Open verification page link", async () => {
    lookupVerification.mockResolvedValue({ kind: "found", record: RECORD });
    renderSearch();
    await userEvent.type(screen.getByLabelText("Verification ID"), "ver_1");
    await userEvent.click(screen.getByRole("button", { name: "Check record" }));
    expect(await screen.findByText("Completed record found")).toBeTruthy();
    expect(screen.getByTestId("qr-code").getAttribute("data-url")).toBe("https://lagda.test/verify/ver_1");
    const link = screen.getByRole("link", { name: "Open verification page" });
    expect(link.getAttribute("href")).toBe("/verify/ver_1");
    expect(fetchSignedDocument).not.toHaveBeenCalled();
    await userEvent.click(link);
    expect(await screen.findByText("Dedicated page")).toBeTruthy();
  });

  it("reports not found and rate-limited lookups", async () => {
    lookupVerification.mockResolvedValueOnce({ kind: "not-found" }).mockResolvedValueOnce({ kind: "rate-limited" });
    renderSearch();
    await userEvent.type(screen.getByLabelText("Verification ID"), "nope");
    await userEvent.click(screen.getByRole("button", { name: "Check record" }));
    expect(await screen.findByText(/No completed LAGDA verification record was found/)).toBeTruthy();
    await userEvent.click(screen.getByRole("button", { name: "Check record" }));
    expect(await screen.findByText(/Too many attempts/)).toBeTruthy();
  });
});

describe("/verify/:id access flow", () => {
  it("sends a code with neutral copy regardless of participation", async () => {
    await reachCodeStep();
    expect(requestAccessCode).toHaveBeenCalledWith("ver_1", "maria@example.com");
    expect(screen.getByText(/expires in 10 minutes/)).toBeTruthy();
    expect(screen.getByRole("button", { name: /Resend code \(60s\)/ })).toHaveProperty("disabled", true);
  });

  it("a correct code unlocks the document, participants in routing order, and details", async () => {
    submitAccessCode.mockResolvedValue({ kind: "granted", grant: grant() });
    await reachCodeStep();
    await typeCode();
    await userEvent.click(screen.getByRole("button", { name: "Verify code" }));
    expect(submitAccessCode).toHaveBeenCalledWith("ver_1", "maria@example.com", "123456");
    expect(await screen.findByTitle("Signed document: Lease Agreement")).toBeTruthy();
    expect(fetchSignedDocument).toHaveBeenCalledWith("ver_1", "tok_1");
    const list = screen.getByRole("list", { name: "Participants in routing order" });
    const items = list.querySelectorAll("li");
    expect(items[0]?.textContent).toContain("First Approver");
    expect(items[1]?.textContent).toContain("Second Signer");
    expect(list.textContent).toContain("s***@example.com");
    expect(screen.getByText("sealed-digest-xyz")).toBeTruthy();
    expect(screen.getByText("Transaction completed")).toBeTruthy();
    // Nothing lands in storage.
    expect(JSON.stringify({ ...localStorage })).not.toContain("tok_1");
    expect(JSON.stringify({ ...sessionStorage })).not.toContain("tok_1");
  });

  it("Download signed document saves the fetched PDF", async () => {
    submitAccessCode.mockResolvedValue({ kind: "granted", grant: grant() });
    const click = vi.spyOn(HTMLAnchorElement.prototype, "click").mockImplementation(() => {});
    await reachCodeStep();
    await typeCode();
    await userEvent.click(screen.getByRole("button", { name: "Verify code" }));
    await screen.findByTitle("Signed document: Lease Agreement");
    await userEvent.click(screen.getByRole("button", { name: "Download signed document" }));
    expect(click).toHaveBeenCalled();
    const anchor = click.mock.contexts[0] as HTMLAnchorElement;
    expect(anchor.download).toBe("Lease Agreement.pdf");
    expect(anchor.href).toBe("blob:signed");
    click.mockRestore();
  });

  it("a wrong code (401) stays on the code step with a clear message", async () => {
    submitAccessCode.mockResolvedValue({ kind: "denied" });
    await reachCodeStep();
    await typeCode("000000");
    await userEvent.click(screen.getByRole("button", { name: "Verify code" }));
    expect(await screen.findByText(/That code is not valid or has expired/)).toBeTruthy();
    expect(screen.getByLabelText("Digit 1 of 6")).toBeTruthy();
    expect(fetchSignedDocument).not.toHaveBeenCalled();
  });

  it("a 429 on code entry shows the rate-limit message", async () => {
    submitAccessCode.mockResolvedValue({ kind: "rate-limited" });
    await reachCodeStep();
    await typeCode();
    await userEvent.click(screen.getByRole("button", { name: "Verify code" }));
    expect(await screen.findByText(/Too many attempts/)).toBeTruthy();
  });

  it("a 429 or network failure when sending the code is reported", async () => {
    lookupVerification.mockResolvedValue({ kind: "found", record: RECORD });
    requestAccessCode.mockResolvedValueOnce({ kind: "rate-limited" }).mockResolvedValueOnce({ kind: "error" });
    renderRecord();
    await screen.findByText("Completed record found");
    await userEvent.type(screen.getByLabelText("Participant email"), "maria@example.com");
    await userEvent.click(screen.getByRole("button", { name: "Send code" }));
    expect(await screen.findByText(/Too many attempts/)).toBeTruthy();
    await userEvent.click(screen.getByRole("button", { name: "Send code" }));
    expect(await screen.findByText(/could not reach LAGDA/)).toBeTruthy();
  });

  it("an expired grant returns to the email step", async () => {
    submitAccessCode.mockResolvedValue({ kind: "granted", grant: grant() });
    fetchSignedDocument.mockResolvedValue({ kind: "expired" });
    await reachCodeStep();
    await typeCode();
    await userEvent.click(screen.getByRole("button", { name: "Verify code" }));
    expect(await screen.findByText(/Your access to this document has expired/)).toBeTruthy();
    expect(screen.getByLabelText("Participant email")).toBeTruthy();
  });

  it("the grant expiry time itself returns to the email step", async () => {
    submitAccessCode.mockResolvedValue({ kind: "granted", grant: grant(Date.now() + 50) });
    await reachCodeStep();
    await typeCode();
    await userEvent.click(screen.getByRole("button", { name: "Verify code" }));
    expect(await screen.findByText(/Your access to this document has expired/, undefined, { timeout: 2000 })).toBeTruthy();
  });

  it("shows not found for an unknown ID", async () => {
    lookupVerification.mockResolvedValue({ kind: "not-found" });
    renderRecord("nope");
    expect(await screen.findByText(/No completed LAGDA verification record was found/)).toBeTruthy();
    expect(screen.getByRole("link", { name: "Search another Verification ID" })).toBeTruthy();
  });
});

describe("Check a file", () => {
  async function chooseFile() {
    lookupVerification.mockResolvedValue({ kind: "found", record: RECORD });
    renderRecord();
    await screen.findByText("Completed record found");
    const file = new File(["%PDF-1.7"], "lease.pdf", { type: "application/pdf" });
    await userEvent.upload(screen.getByLabelText("PDF file to check"), file);
    return file;
  }

  it("does not upload until Check file is clicked; reports an exact match", async () => {
    checkVerificationFile.mockResolvedValue({ kind: "result", matches: true, authoritativeDigest: "abc", uploadedDigest: "abc" });
    const file = await chooseFile();
    expect(screen.getByText("lease.pdf")).toBeTruthy();
    expect(checkVerificationFile).not.toHaveBeenCalled();
    await userEvent.click(screen.getByRole("button", { name: "Check file" }));
    expect(checkVerificationFile).toHaveBeenCalledWith("ver_1", file);
    expect(await screen.findByText("This is the exact sealed document.")).toBeTruthy();
    expect(screen.getAllByText(/not a determination of legal validity/).length).toBeGreaterThan(0);
  });

  it("reports a mismatch", async () => {
    checkVerificationFile.mockResolvedValue({ kind: "result", matches: false, authoritativeDigest: "abc", uploadedDigest: "def" });
    await chooseFile();
    await userEvent.click(screen.getByRole("button", { name: "Check file" }));
    expect(await screen.findByText(/This file does not match the sealed document — it may have been altered\./)).toBeTruthy();
  });

  it("rejects a non-PDF before any upload", async () => {
    lookupVerification.mockResolvedValue({ kind: "found", record: RECORD });
    renderRecord();
    await screen.findByText("Completed record found");
    const user = userEvent.setup({ applyAccept: false });
    await user.upload(screen.getByLabelText("PDF file to check"), new File(["x"], "a.txt", { type: "text/plain" }));
    expect(screen.getByText("Choose a PDF file.")).toBeTruthy();
    expect(screen.getByRole("button", { name: "Check file" })).toHaveProperty("disabled", true);
  });
});
