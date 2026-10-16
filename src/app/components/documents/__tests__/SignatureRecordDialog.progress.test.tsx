// The Participants record, for a request still moving: a final document that
// could not be produced and the Try again beside it (109), what became of
// telling a participant they may continue (110), and each participant's
// reminders with "Send a reminder now" (111). Every refusal the server can
// give is said in its own sentence; none prints the server's text.

import { describe, it, expect, vi, beforeEach } from "vitest";
import { render, screen, waitFor, within } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import type { SigningRequestSignatures, Signatory } from "../../../services/real/signing-request.service";

const service = vi.hoisted(() => ({
  signatures: vi.fn(), reissueLink: vi.fn(), remind: vi.fn(), retryCompletion: vi.fn(),
}));
vi.mock("../../../services/real/signing-request.service", () => ({ realSigningRequestService: service }));

const identity = vi.hoisted(() => ({ checks: vi.fn(), waive: vi.fn(), resolveName: vi.fn() }));
vi.mock("../../../services/real/identity-check.service", async (original) => ({
  ...(await original<typeof import("../../../services/real/identity-check.service")>()),
  realIdentityCheckService: identity,
}));

import { SignatureRecordDialog } from "../SignatureRecordDialog";
import { ApiError } from "../../../services/api-client";

const NOW = Date.now();
const iso = (offsetMs: number) => new Date(NOW + offsetMs).toISOString();

const ana: Signatory = {
  recipientId: "srr_1", name: "Ana Reyes", email: "ana@example.ph", organization: null,
  type: "signer", isRequired: true, routingOrder: 1, state: "active",
  signedAt: null, declinedAt: null, declineReason: null,
  linkedAccountName: null, linkedAccountEmail: null,
  linkExpiresAt: iso(10 * 24 * 3600_000),
  reminders: { sentCount: 1, manualSentCount: 0, lastSentAt: iso(-3600_000 * 2), nextDueAt: iso(3 * 24 * 3600_000) },
};

const out = (overrides: Partial<SigningRequestSignatures> = {}): SigningRequestSignatures => ({
  signingRequestId: "sr_1", state: "sent", signedCount: 0, requiredCount: 1, signatories: [ana],
  completion: null,
  reminders: { enabled: true, firstAfterDays: 3, everyDays: 3, maxAutomatic: 3, maxManualPerTurn: 10 },
  ...overrides,
});

const refused = (code: string) => new ApiError(409, {
  code: "signing_reminder_not_sendable", message: "server text that must not show",
  details: [{ field: "reminder", code, message: "x" }],
}, "x");

const onChanged = vi.fn();
const open = () => render(
  <SignatureRecordDialog workspaceId="ws_1" signingRequestId="sr_1" documentTitle="Lease"
    onClose={vi.fn()} onChanged={onChanged} />,
);

beforeEach(() => {
  Object.values(service).forEach(fn => fn.mockReset());
  Object.values(identity).forEach(fn => fn.mockReset());
  identity.checks.mockResolvedValue(null);
  onChanged.mockReset();
});

describe("Participants: reminders", () => {
  it("says how many were sent, the last and the next", async () => {
    service.signatures.mockResolvedValue(out());
    open();
    const line = await screen.findByTestId("signatory-reminders");
    expect(line).toHaveTextContent(/Reminders: 1 of 3 sent · last .+ · next .+/);
  });

  it("says no more will be sent, and when they are off", async () => {
    service.signatures.mockResolvedValueOnce(out({
      signatories: [{ ...ana, reminders: { ...ana.reminders!, sentCount: 3, nextDueAt: null } }],
    }));
    const view = open();
    expect(await screen.findByTestId("signatory-reminders")).toHaveTextContent(/3 of 3 sent .* no more reminders/);
    view.unmount();

    service.signatures.mockResolvedValueOnce(out({ reminders: { enabled: false, firstAfterDays: 3, everyDays: 3, maxAutomatic: 3, maxManualPerTurn: 10 } }));
    open();
    expect(await screen.findByTestId("signatory-reminders")).toHaveTextContent("Reminders are off for this document");
  });

  it("sends a reminder now, says so, and reads the record again", async () => {
    service.signatures.mockResolvedValue(out());
    service.remind.mockResolvedValue({ recipientId: "srr_1", sentAt: iso(0), manualSentCount: 1 });
    open();
    await userEvent.click(await screen.findByRole("button", { name: "Send a reminder now to Ana Reyes" }));
    expect(service.remind).toHaveBeenCalledWith("ws_1", "sr_1", "srr_1");
    expect(await screen.findByTestId("signatory-note")).toHaveTextContent("Reminder emailed to ana@example.ph.");
    await waitFor(() => { expect(service.signatures).toHaveBeenCalledTimes(2); });
    expect(onChanged).toHaveBeenCalled();
  });

  it.each([
    ["too-soon", /You can send the next reminder after .+\./],
    ["limit-reached", /most reminders allowed for this turn/],
    ["delivery-failed", /Their last email could not be delivered — check the address\./],
    ["not-their-turn", /It is not their turn yet/],
    ["request-not-open", /no longer out for signature/],
  ])("says %s in its own words, never the server's", async (code, words) => {
    service.signatures.mockResolvedValue(out());
    service.remind.mockRejectedValue(refused(code));
    open();
    await userEvent.click(await screen.findByRole("button", { name: "Send a reminder now to Ana Reyes" }));
    const note = await screen.findByTestId("signatory-note");
    expect(note).toHaveTextContent(words);
    expect(note).not.toHaveTextContent(/server text/);
  });

  it("offers a new link when the refusal is a lapsed link", async () => {
    service.signatures.mockResolvedValue(out());
    service.remind.mockRejectedValue(refused("link-lapsed"));
    service.reissueLink.mockResolvedValue({ recipientId: "srr_1", linkExpiresAt: iso(14 * 24 * 3600_000) });
    open();
    await userEvent.click(await screen.findByRole("button", { name: "Send a reminder now to Ana Reyes" }));
    const note = await screen.findByTestId("signatory-note");
    await userEvent.click(within(note).getByRole("button", { name: "Send a new link to Ana Reyes" }));
    expect(service.reissueLink).toHaveBeenCalledWith("ws_1", "sr_1", "srr_1");
  });

  it("offers no reminder for a request that is no longer out", async () => {
    service.signatures.mockResolvedValue(out({ state: "completed" }));
    open();
    await screen.findByText("Ana Reyes");
    expect(screen.queryByTestId("signatory-reminders")).toBeNull();
  });
});

describe("Participants: a final document that could not be produced", () => {
  const failed = () => out({ state: "completion-ready", signedCount: 1, completion: { state: "failed", canRetry: true },
    signatories: [{ ...ana, state: "signed", signedAt: iso(-60_000) }] });

  it("says it plainly, with Try again", async () => {
    service.signatures.mockResolvedValue(failed());
    open();
    const banner = await screen.findByTestId("completion-status");
    expect(banner).toHaveAttribute("data-state", "failed");
    expect(banner).toHaveTextContent("Could not finalize.");
    expect(banner).toHaveTextContent("Every signature is safe");
    expect(within(banner).getByRole("button", { name: "Try again to finalize this document" })).toBeInTheDocument();
  });

  it("retries, and says so", async () => {
    service.signatures.mockResolvedValueOnce(failed()).mockResolvedValue(out({ state: "completion-ready", completion: { state: "finalizing", canRetry: false } }));
    service.retryCompletion.mockResolvedValue({ signingRequestId: "sr_1", restarted: true, completion: { state: "finalizing", canRetry: false } });
    open();
    await userEvent.click(await screen.findByRole("button", { name: "Try again to finalize this document" }));
    expect(service.retryCompletion).toHaveBeenCalledWith("ws_1", "sr_1");
    expect(await screen.findByText("Trying again. The final document is being produced.")).toBeInTheDocument();
    expect(onChanged).toHaveBeenCalled();
  });

  it("says when it was already under way", async () => {
    service.signatures.mockResolvedValue(failed());
    service.retryCompletion.mockResolvedValue({ signingRequestId: "sr_1", restarted: false, completion: { state: "failed", canRetry: true } });
    open();
    await userEvent.click(await screen.findByRole("button", { name: "Try again to finalize this document" }));
    expect(await screen.findByText("It is already being produced. Check again in a minute.")).toBeInTheDocument();
  });

  it("says a refusal in its own words", async () => {
    service.signatures.mockResolvedValue(failed());
    service.retryCompletion.mockRejectedValue(new ApiError(409, { code: "signing_completion_not_retryable", message: "nope" }, "x"));
    open();
    await userEvent.click(await screen.findByRole("button", { name: "Try again to finalize this document" }));
    expect(await screen.findByText(/can't be finalized again right now/)).toBeInTheDocument();
    expect(screen.queryByText("nope")).toBeNull();
  });

  it("offers no Try again when it cannot be taken, or while finalizing", async () => {
    service.signatures.mockResolvedValue(out({ state: "completion-ready", completion: { state: "finalizing", canRetry: false } }));
    open();
    expect(await screen.findByTestId("completion-status")).toHaveTextContent("The final signed document is being produced.");
    expect(screen.queryByRole("button", { name: /Try again/ })).toBeNull();
  });
});

describe("Participants: after allowing a lighter method", () => {
  const pending = { recipientId: "srr_1", email: "ana@example.ph", required: true, status: "locked", mode: "live",
    lastOutcome: "failed", failedAttempts: 3, verifiedAt: null, idType: null, waivedAt: null };

  it.each([
    ["sent", "We emailed Ana Reyes that they can continue.", false],
    ["already-sent", "Ana Reyes has already been emailed that they can continue.", false],
    ["not-waiting", "Nothing is waiting on Ana Reyes right now, so no email was sent.", false],
    ["link-lapsed", "Ana Reyes's signing link has ended, so they were not emailed. Send them a new link to continue.", true],
  ])("says what became of telling them: %s", async (notice, words, offersLink) => {
    service.signatures.mockResolvedValue(out());
    identity.checks.mockResolvedValue([pending]);
    identity.waive.mockResolvedValue({ recipientId: "srr_1", status: "waived", waivedAt: iso(0), participantNotice: notice });
    open();
    await userEvent.click(await screen.findByRole("button", { name: "Allow a lighter method for Ana Reyes" }));
    await userEvent.click(await screen.findByRole("button", { name: /Continue/ }));
    const note = await screen.findByTestId("signatory-note");
    expect(note).toHaveTextContent(words);
    expect(within(note).queryByRole("button", { name: "Send a new link to Ana Reyes" }) !== null).toBe(offersLink);
  });
});
