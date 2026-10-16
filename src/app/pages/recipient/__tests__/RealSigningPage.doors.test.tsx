// A signing link to a request that ended, or opened by someone who already
// acted, says which (110).
//
// Every one of these used to read "This signing link can no longer be
// opened", and a refused ceremony printed the server's own words — "The
// signing ceremony is not available: already-signed." Each door now has its
// own screen, from the error's code or, on a refused ceremony, its
// `details[0].code`. Not-your-turn and an unusable link keep what they had.

import { describe, it, expect, vi, beforeEach } from "vitest";
import { render, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { MemoryRouter, Routes, Route } from "react-router";
import type { CeremonyView } from "../../../services/real/signing-access.service";

const access = vi.hoisted(() => ({
  bootstrap: vi.fn(), continueFromApp: vi.fn(), enter: vi.fn(), read: vi.fn(), acceptConsent: vi.fn(),
}));
vi.mock("../../../services/real/signing-access.service", async (original) => ({
  ...(await original<typeof import("../../../services/real/signing-access.service")>()),
  realSigningAccessService: { ...access, documentBlob: () => Promise.resolve(new Blob()) },
}));
vi.mock("../../../services/real/signing-submission.service", () => ({
  realSigningSubmissionService: { submit: vi.fn(), skip: vi.fn(), decline: vi.fn() },
}));
vi.mock("../../../services/real/signing-account-link.service", () => ({
  realSigningAccountLinkService: { mintHandoff: vi.fn() },
}));
vi.mock("../../../hooks/useMinimumSplash", () => ({ useMinimumSplash: () => "gone" }));
vi.mock("../../../components/recipient/PositionedSigningSurface", () => ({
  PositionedSigningSurface: () => <div data-testid="signing-surface" />,
}));

import { RealSigningPage } from "../RealSigningPage";
import { ApiError } from "../../../services/api-client";
import { signingDoorOf, doorScreen } from "../signing-door";

const TOKEN = "t".repeat(43);
const SERVER_TEXT = "Server wording that must never be shown";

const doorError = (status: number, code: string) => new ApiError(status, { code, message: SERVER_TEXT }, "x");
const ceremonyRefused = (doorCode: string) => new ApiError(409, {
  code: "signing_ceremony_unavailable",
  message: "The signing ceremony is not available: already-signed.",
  details: [{ field: "signingRequest", code: doorCode, message: SERVER_TEXT }],
}, "x");

function ceremony(type = "signer"): CeremonyView {
  return {
    request: { signingRequestId: "sr_1", documentTitle: "Office Lease" },
    recipient: { recipientId: "srr_1", name: "Maria Santos", email: "maria@example.ph", type },
    accountLink: { maskedEmail: "mar•••@example.ph" },
    access: {
      mayEnter: true, mayViewDocument: false, mayViewAssignedFields: false,
      mayAcceptConsent: true, mayProceedToInput: false, mayDecline: true, maySkip: false,
    },
    consent: { required: true, accepted: false, type: "electronic-records", requiredVersion: "v1", acceptedVersion: null, acceptedAt: null },
    document: null, fields: [], firstEnteredAt: null,
  } as CeremonyView;
}

const open = () => render(
  <MemoryRouter initialEntries={[`/sign/${TOKEN}`]}>
    <Routes><Route path="/sign/:requestId" element={<RealSigningPage />} /></Routes>
  </MemoryRouter>,
);

beforeEach(() => {
  Object.values(access).forEach(fn => fn.mockReset());
});

describe("the door, at the link", () => {
  it.each([
    [410, "signing_request_cancelled", "cancelled", "The sender cancelled this request"],
    [410, "signing_request_declined", "declined", "This request was declined"],
    [410, "signing_request_expired", "expired", "This request has expired"],
    [410, "signing_request_completed", "completed", "This document is complete"],
    [409, "signing_recipient_already_acted", "already-acted", "You have already done your part"],
  ])("%s %s has its own screen", async (status, code, door, title) => {
    access.bootstrap.mockRejectedValue(doorError(status, code));
    open();
    const screenEl = await screen.findByTestId("signing-door");
    expect(screenEl).toHaveAttribute("data-door", door);
    expect(screen.getByRole("heading", { name: title })).toBeInTheDocument();
    expect(screen.queryByText(SERVER_TEXT)).toBeNull();
    expect(screen.queryByText(/This signing link can no longer be opened/)).toBeNull();
    expect(access.enter).not.toHaveBeenCalled();
  });

  it("keeps the one unusable-link screen for an invalid link and for not-your-turn", async () => {
    for (const [status, code] of [[401, "invalid_or_expired_signing_link"], [409, "signing_access_not_active"]] as const) {
      access.bootstrap.mockRejectedValueOnce(doorError(status, code));
      const view = open();
      expect(await screen.findByText(/This signing link can no longer be opened/)).toBeInTheDocument();
      expect(screen.queryByTestId("signing-door")).toBeNull();
      view.unmount();
    }
  });

  it("keeps the session-ended message for a revoked session", async () => {
    access.bootstrap.mockResolvedValue({ authenticated: true });
    access.enter.mockRejectedValue(new ApiError(401, { code: "recipient_session_invalid", message: SERVER_TEXT }, "x"));
    open();
    expect(await screen.findByText("Your signing session has ended. Open your signing link again to continue.")).toBeInTheDocument();
  });
});

describe("the door, at a refused ceremony", () => {
  it("reads the reason from details[0] and replaces the raw already-signed text", async () => {
    access.bootstrap.mockResolvedValue({ authenticated: true });
    access.enter.mockRejectedValue(ceremonyRefused("signing_recipient_already_acted"));
    open();
    expect(await screen.findByTestId("signing-door")).toHaveAttribute("data-door", "already-acted");
    expect(screen.queryByText(/not available: already-signed/)).toBeNull();
    expect(screen.getByText(/Nothing more is needed from you/)).toBeInTheDocument();
  });

  it("says a refused ceremony with no reason in plain words, never the server's", async () => {
    access.bootstrap.mockResolvedValue({ authenticated: true });
    access.enter.mockRejectedValue(new ApiError(409, {
      code: "signing_ceremony_unavailable", message: "The signing ceremony is not available: already-signed.",
    }, "x"));
    open();
    expect(await screen.findByText(/can't be signed from this link any more/)).toBeInTheDocument();
    expect(screen.queryByText(/not available: already-signed/)).toBeNull();
  });
});

describe("signingDoorOf and doorScreen", () => {
  it("names the role when the ceremony knows it", () => {
    expect(doorScreen("already-acted", "signer").title).toBe("You have already signed this document");
    expect(doorScreen("already-acted", "approver").title).toBe("You have already approved this document");
    expect(doorScreen("already-acted", "reviewer").title).toBe("You have already reviewed this document");
    expect(doorScreen("already-acted").description).toBe("Nothing more is needed from you. The document is still waiting for others.");
  });

  it("promises a copy only as the sender's choice", () => {
    expect(doorScreen("completed").description).toMatch(/You will receive a copy if the sender shares it\./);
  });

  it("ignores anything that is not a door", () => {
    expect(signingDoorOf(new Error("x"))).toBeNull();
    expect(signingDoorOf(doorError(409, "signing_access_not_active"))).toBeNull();
    expect(signingDoorOf(new ApiError(409, { code: "signing_ceremony_unavailable", message: "x", details: [{ field: "signingRequest", code: "signing_access_not_active", message: "x" }] }, "x"))).toBeNull();
    expect(signingDoorOf(ceremonyRefused("signing_request_cancelled"))).toBe("cancelled");
  });

  it("names the role when a refusal comes after the ceremony opened", async () => {
    access.bootstrap.mockResolvedValue({ authenticated: true });
    access.enter.mockResolvedValue(ceremony("approver"));
    access.acceptConsent.mockRejectedValue(ceremonyRefused("signing_recipient_already_acted"));
    open();
    await userEvent.click(await screen.findByRole("button", { name: "I consent — continue" }));
    expect(await screen.findByRole("heading", { name: "You have already approved this document" })).toBeInTheDocument();
  });
});
