// Public verification × 429 verification_rate_limited: say how long, count it
// down, keep the button disabled until then, and never say whether the email
// took part.

import { describe, it, expect, vi, beforeEach, afterEach } from "vitest";
import { render, screen, act } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { MemoryRouter, Routes, Route } from "react-router";

const lookupVerification = vi.fn();
const requestAccessCode = vi.fn();
const submitAccessCode = vi.fn();
vi.mock("../../../services/real/public-verification.service", () => ({
  lookupVerification: (...a: unknown[]) => lookupVerification(...a) as unknown,
  requestAccessCode: (...a: unknown[]) => requestAccessCode(...a) as unknown,
  submitAccessCode: (...a: unknown[]) => submitAccessCode(...a) as unknown,
  fetchSignedDocument: vi.fn(),
  checkVerificationFile: vi.fn(),
  requestMemberAccess: vi.fn(),
  verificationPageUrl: (id: string) => `https://lagda.test/verify/${id}`,
}));
vi.mock("../VerificationQRCode", () => ({ VerificationQRCode: () => <div /> }));

import { VerificationRecordView, VerificationSearch, rateLimitText } from "../VerificationFlow";

const RECORD = {
  verificationId: "ver_1", completedAt: 1_770_000_000_000, participantCount: 2,
  finalDocument: { digestAlgorithm: "sha-256" as const, digest: "abc123" },
  seal: { scheme: "lagda-v1", version: 1, digestAlgorithm: "sha-256" as const, description: "Sealed" },
};

beforeEach(() => {
  vi.useFakeTimers({ shouldAdvanceTime: true });
  lookupVerification.mockResolvedValue({ kind: "found", record: RECORD });
});
afterEach(() => { vi.useRealTimers(); });

const user = () => userEvent.setup({ advanceTimers: vi.advanceTimersByTime.bind(vi) });

function renderRecord() {
  render(
    <MemoryRouter initialEntries={["/verify/ver_1"]}>
      <Routes><Route path="/verify/:id" element={<VerificationRecordView verificationId="ver_1" basePath="/verify" />} /></Routes>
    </MemoryRouter>,
  );
}

describe("rateLimitText", () => {
  it("counts seconds for a short wait and rounds long ones to minutes or hours", () => {
    expect(rateLimitText(1)).toBe("Please wait 1 second before requesting a new code.");
    expect(rateLimitText(42)).toBe("Please wait 42 seconds before requesting a new code.");
    expect(rateLimitText(42, "retry")).toBe("Please wait 42 seconds before trying again.");
    expect(rateLimitText(600)).toBe("Too many attempts. Try again in about 10 minutes.");
    expect(rateLimitText(3600)).toBe("Too many attempts. Try again in about 1 hour.");
    expect(rateLimitText(3 * 3600 + 100)).toBe("Too many attempts. Try again in about 3 hours.");
  });
});

describe("requesting a code while rate limited", () => {
  it("shows a live countdown, keeps Send code disabled, then allows it again", async () => {
    requestAccessCode.mockResolvedValueOnce({ kind: "rate-limited", retryAfterSeconds: 3 })
      .mockResolvedValueOnce({ kind: "sent", expiresInSeconds: 600 });
    renderRecord();
    await screen.findByText("Completed record found");
    const u = user();
    await u.type(screen.getByLabelText("Email address"), "someone@example.com");
    await u.click(screen.getByRole("button", { name: "Send code" }));

    expect(await screen.findByText("Please wait 3 seconds before requesting a new code.", { selector: "span[aria-hidden]" })).toBeTruthy();
    const button = screen.getByRole("button", { name: /Send code \(3s\)/ });
    expect(button).toHaveProperty("disabled", true);
    // Announced once to assistive tech, not every tick.
    expect(screen.getByRole("status").textContent).toBe("Please wait 3 seconds before requesting a new code.");

    act(() => { vi.advanceTimersByTime(1000); });
    expect(screen.getByText("Please wait 2 seconds before requesting a new code.")).toBeTruthy();
    expect(screen.getByRole("status").textContent).toBe("Please wait 3 seconds before requesting a new code.");

    act(() => { vi.advanceTimersByTime(2500); });
    expect(screen.queryByTestId("rate-limit-notice")).toBeNull();
    const again = screen.getByRole("button", { name: "Send code" });
    expect(again).toHaveProperty("disabled", false);
    await u.click(again);
    expect(await screen.findByText(/If this email has access, we've sent a 6-digit code\./)).toBeTruthy();
  });

  it("words a long wait in hours and never mentions the address", async () => {
    requestAccessCode.mockResolvedValue({ kind: "rate-limited", retryAfterSeconds: 3600 });
    renderRecord();
    await screen.findByText("Completed record found");
    const u = user();
    await u.type(screen.getByLabelText("Email address"), "someone@example.com");
    await u.click(screen.getByRole("button", { name: "Send code" }));
    const notice = await screen.findByTestId("rate-limit-notice");
    expect(notice.textContent).toContain("Too many attempts. Try again in about 1 hour.");
    expect(notice.textContent).not.toMatch(/someone@example\.com|participant/i);
    expect(screen.getByRole("button", { name: /Send code \(1 hr\)/ })).toHaveProperty("disabled", true);
  });

  it("keeps the old wording when the server gives no wait", async () => {
    requestAccessCode.mockResolvedValue({ kind: "rate-limited" });
    renderRecord();
    await screen.findByText("Completed record found");
    const u = user();
    await u.type(screen.getByLabelText("Email address"), "someone@example.com");
    await u.click(screen.getByRole("button", { name: "Send code" }));
    expect(await screen.findByText(/Please wait a few minutes/)).toBeTruthy();
    expect(screen.getByRole("button", { name: "Send code" })).toHaveProperty("disabled", false);
  });
});

describe("code entry and resend while rate limited", () => {
  it("blocks Verify and Resend for the server's wait", async () => {
    requestAccessCode.mockResolvedValue({ kind: "sent", expiresInSeconds: 600 });
    submitAccessCode.mockResolvedValue({ kind: "rate-limited", retryAfterSeconds: 300 });
    renderRecord();
    await screen.findByText("Completed record found");
    const u = user();
    await u.type(screen.getByLabelText("Email address"), "someone@example.com");
    await u.click(screen.getByRole("button", { name: "Send code" }));
    await u.click(await screen.findByLabelText("Digit 1 of 6"));
    await u.paste("123456");
    await u.click(screen.getByRole("button", { name: "Verify code" }));
    expect(await screen.findByText("Too many attempts. Try again in about 5 minutes.", { selector: "span[aria-hidden]" })).toBeTruthy();
    expect(screen.getByRole("button", { name: "Verify code" })).toHaveProperty("disabled", true);
    expect(screen.getByRole("button", { name: /Resend code \(5 min\)/ })).toHaveProperty("disabled", true);
  });
});

describe("lookup while rate limited", () => {
  it("counts down on the search page and disables Check record", async () => {
    lookupVerification.mockResolvedValue({ kind: "rate-limited", retryAfterSeconds: 30 });
    render(<MemoryRouter><VerificationSearch basePath="/verify" /></MemoryRouter>);
    const u = user();
    await u.type(screen.getByLabelText("Verification ID"), "ver_1");
    await u.click(screen.getByRole("button", { name: "Check record" }));
    expect(await screen.findByText("Please wait 30 seconds before trying again.", { selector: "span[aria-hidden]" })).toBeTruthy();
    expect(screen.getByRole("button", { name: /Check record \(30s\)/ })).toHaveProperty("disabled", true);
  });
});
