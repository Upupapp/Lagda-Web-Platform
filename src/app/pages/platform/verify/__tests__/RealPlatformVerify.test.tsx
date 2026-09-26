// In-app verification (real mode): member access unlocks automatically when
// the signed-in account is a participant; otherwise the email + code flow.

import { describe, it, expect, vi, beforeEach } from "vitest";
import { render, screen } from "@testing-library/react";
import { MemoryRouter, Routes, Route } from "react-router";

vi.mock("../../../../services/backend-flag", () => ({ API_BASE_URL: "/api", USE_REAL_BACKEND: true }));
vi.mock("../../../../context/PlatformContext", () => ({
  usePlatform: () => ({ hasPermission: () => true }),
}));

const lookupVerification = vi.fn();
const requestMemberAccess = vi.fn();
const fetchSignedDocument = vi.fn();
vi.mock("../../../../services/real/public-verification.service", () => ({
  lookupVerification: (...a: unknown[]) => lookupVerification(...a),
  requestMemberAccess: (...a: unknown[]) => requestMemberAccess(...a),
  fetchSignedDocument: (...a: unknown[]) => fetchSignedDocument(...a),
  requestAccessCode: vi.fn(), submitAccessCode: vi.fn(), checkVerificationFile: vi.fn(),
  verificationPageUrl: (id: string) => `https://lagda.test/verify/${id}`,
}));
vi.mock("../../../../components/verification/VerificationQRCode", () => ({
  VerificationQRCode: () => <div data-testid="qr-code" />,
}));

import { VerifyRecordPage, RealPlatformVerify } from "../RealPlatformVerify";
import { VerifyPage } from "../../VerifyPage";

const RECORD = {
  verificationId: "ver_1", completedAt: 1_770_000_000_000, participantCount: 1,
  finalDocument: { digestAlgorithm: "sha-256", digest: "abc123" },
  seal: { scheme: "lagda-v1", version: 1, digestAlgorithm: "sha-256", description: "Sealed" },
};
const GRANT = {
  accessToken: "tok_m", expiresAt: Date.now() + 600_000, documentTitle: "Board Resolution", recipientType: "signer",
  details: {
    documentTitle: "Board Resolution", completedAt: 1_770_000_000_000, sealedDigest: "abc123",
    participants: [{ name: "Maria Santos", maskedEmail: "m***@example.com", recipientType: "signer", status: "signed", actedAt: 1_770_000_000_000, routingOrder: 1 }],
    events: [],
  },
};

function renderAt(path: string) {
  render(
    <MemoryRouter initialEntries={[path]}>
      <Routes>
        <Route path="/app/verify" element={<VerifyPage />} />
        <Route path="/app/verify/:verificationId" element={<VerifyRecordPage />} />
      </Routes>
    </MemoryRouter>,
  );
}

beforeEach(() => {
  vi.clearAllMocks();
  URL.createObjectURL = vi.fn(() => "blob:m");
  URL.revokeObjectURL = vi.fn();
  lookupVerification.mockResolvedValue({ kind: "found", record: RECORD });
  fetchSignedDocument.mockResolvedValue({ kind: "ok", blob: new Blob(["%PDF"], { type: "application/pdf" }), mediaType: "application/pdf" });
});

describe("/app/verify (real mode)", () => {
  it("replaces the demo page with the real search, linking to the in-app record page", async () => {
    renderAt("/app/verify?verificationId=ver_1");
    expect(await screen.findByText("Completed record found")).toBeTruthy();
    expect(screen.getByRole("link", { name: "Open verification page" }).getAttribute("href")).toBe("/app/verify/ver_1");
    expect(screen.queryByText(/DEMO/)).toBeNull();
    expect(RealPlatformVerify).toBeTypeOf("function");
  });

  it("unlocks instantly via member access when the account is a participant", async () => {
    requestMemberAccess.mockResolvedValue({ kind: "granted", grant: GRANT });
    renderAt("/app/verify/ver_1");
    expect(await screen.findByTitle("Signed document: Board Resolution")).toBeTruthy();
    expect(requestMemberAccess).toHaveBeenCalledWith("ver_1");
    expect(screen.getByText("Maria Santos")).toBeTruthy();
    expect(screen.queryByLabelText("Participant email")).toBeNull();
  });

  it("falls back to the email + code flow when member access is denied", async () => {
    requestMemberAccess.mockResolvedValue({ kind: "denied" });
    renderAt("/app/verify/ver_1");
    expect(await screen.findByLabelText("Participant email")).toBeTruthy();
    expect(fetchSignedDocument).not.toHaveBeenCalled();
  });
});
