// In-app verification (real mode): member access unlocks automatically when
// the signed-in account is a participant; otherwise the email + code flow.

import { describe, it, expect, vi, beforeEach } from "vitest";
import { render, screen, waitFor } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { ApiError } from "../../../../services/api-client";
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
const myAccess = vi.fn();
const requestAccess = vi.fn();
vi.mock("../../../../services/real/document-sharing.service", async importOriginal => {
  const actual = await importOriginal<typeof import("../../../../services/real/document-sharing.service")>();
  return {
    ...actual,
    documentSharingService: {
      ...actual.documentSharingService,
      myAccess: (...a: unknown[]) => myAccess(...a) as unknown,
      requestAccess: (...a: unknown[]) => requestAccess(...a) as unknown,
    },
  };
});
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
  myAccess.mockResolvedValue({ verificationId: "ver_1", relation: "participant", shareId: null, requestId: null, canRequestAccess: false });
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
    expect(screen.queryByLabelText("Email address")).toBeNull();
  });

  it("falls back to the email + code flow when member access is denied", async () => {
    requestMemberAccess.mockResolvedValue({ kind: "denied" });
    renderAt("/app/verify/ver_1");
    expect(await screen.findByLabelText("Email address")).toBeTruthy();
    expect(fetchSignedDocument).not.toHaveBeenCalled();
  });
});

const access = (relation: string, canRequestAccess = false) =>
  ({ verificationId: "ver_1", relation, shareId: null, requestId: null, canRequestAccess });

describe("/app/verify/:id — the signed-in caller's own access (087)", () => {
  it.each(["owner", "admin", "shared-accepted"])("%s unlocks through member access, with no code", async (relation) => {
    myAccess.mockResolvedValue(access(relation));
    requestMemberAccess.mockResolvedValue({ kind: "granted", grant: GRANT });
    renderAt("/app/verify/ver_1");
    expect(await screen.findByTitle("Signed document: Board Resolution")).toBeTruthy();
    expect(myAccess).toHaveBeenCalledWith("ver_1");
  });

  it("shared-pending points to Shared With Me instead of asking for a code", async () => {
    myAccess.mockResolvedValue(access("shared-pending"));
    renderAt("/app/verify/ver_1");
    expect(await screen.findByText(/This document was shared with you\./)).toBeTruthy();
    expect(screen.getByRole("link", { name: "Shared With Me" }).getAttribute("href")).toBe("/app/shared-documents/with-me?section=pending");
    expect(requestMemberAccess).not.toHaveBeenCalled();
    expect(screen.queryByLabelText("Email address")).toBeNull();
  });

  it("request-pending says the request is waiting for the owner", async () => {
    myAccess.mockResolvedValue(access("request-pending"));
    renderAt("/app/verify/ver_1");
    expect(await screen.findByText(/Your request is waiting for the owner’s approval/)).toBeTruthy();
    expect(screen.queryByRole("button", { name: "Request access" })).toBeNull();
  });

  it.each(["request-rejected", "shared-rejected"])("%s gets a neutral not-approved message", async (relation) => {
    myAccess.mockResolvedValue(access(relation));
    renderAt("/app/verify/ver_1");
    expect(await screen.findByText(/Access to this document was not approved for this account\./)).toBeTruthy();
    expect(screen.queryByRole("button", { name: "Request access" })).toBeNull();
  });

  it("none + canRequestAccess sends a request with an optional note, then shows it pending", async () => {
    myAccess.mockResolvedValue(access("none", true));
    requestAccess.mockResolvedValue({ requestId: "req_9", verificationId: "ver_1", documentTitle: "Board Resolution", status: "pending", note: "For the audit", createdAt: "2026-09-27T00:00:00.000Z" });
    renderAt("/app/verify/ver_1");
    const note = await screen.findByLabelText(/Note to the owner/);
    await userEvent.type(note, "For the audit");
    await userEvent.click(screen.getByRole("button", { name: "Request access" }));
    await waitFor(() => expect(requestAccess).toHaveBeenCalledWith("ver_1", "For the audit"));
    expect(await screen.findByText(/Request sent\. Your request is waiting for the owner’s approval/)).toBeTruthy();
    expect(screen.queryByRole("button", { name: "Request access" })).toBeNull();
  });

  it("will not send a note over 500 characters", async () => {
    myAccess.mockResolvedValue(access("none", true));
    renderAt("/app/verify/ver_1");
    const note = await screen.findByLabelText(/Note to the owner/);
    await userEvent.click(note);
    await userEvent.paste("x".repeat(501));
    expect(screen.getByText(/501 \/ 500 characters/)).toBeTruthy();
    expect(screen.getByRole("button", { name: "Request access" })).toBeDisabled();
  });

  it("maps request errors to friendly text, and an already-pending request to the pending state", async () => {
    myAccess.mockResolvedValue(access("none", true));
    requestAccess.mockRejectedValueOnce(new ApiError(403, { code: "account_email_unverified", message: "x" }, "x"));
    renderAt("/app/verify/ver_1");
    await userEvent.click(await screen.findByRole("button", { name: "Request access" }));
    expect(await screen.findByText(/Confirm your account's email address first/)).toBeTruthy();
    requestAccess.mockRejectedValueOnce(new ApiError(409, { code: "document_access_already_pending", message: "x" }, "x"));
    await userEvent.click(screen.getByRole("button", { name: "Request access" }));
    expect(await screen.findByText(/Your request is waiting for the owner’s approval/)).toBeTruthy();
  });

  it("none without a way to request falls back to the emailed code", async () => {
    myAccess.mockResolvedValue(access("none", false));
    renderAt("/app/verify/ver_1");
    expect(await screen.findByLabelText("Email address")).toBeTruthy();
    expect(requestMemberAccess).not.toHaveBeenCalled();
  });

  it("offers the emailed code from a status panel", async () => {
    myAccess.mockResolvedValue(access("request-pending"));
    renderAt("/app/verify/ver_1");
    await userEvent.click(await screen.findByRole("button", { name: "Use an emailed code" }));
    expect(await screen.findByLabelText("Email address")).toBeTruthy();
  });

  it("falls back to member access alone when /my-access is unavailable", async () => {
    myAccess.mockRejectedValue(new ApiError(404, undefined, "x"));
    requestMemberAccess.mockResolvedValue({ kind: "granted", grant: GRANT });
    renderAt("/app/verify/ver_1");
    expect(await screen.findByTitle("Signed document: Board Resolution")).toBeTruthy();
  });

  it("the in-app page does not show the public sign-in links", async () => {
    myAccess.mockResolvedValue(access("request-pending"));
    renderAt("/app/verify/ver_1");
    await screen.findByText(/waiting for the owner/);
    expect(screen.queryByTestId("request-access-links")).toBeNull();
  });
});
