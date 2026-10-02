// The recovery-code page and the authenticator page against a real backend.
//
// The recovery page used to tell everyone, on the live site, that "any
// non-empty recovery code is accepted", lost the page the visitor was heading
// for, said nothing about how many codes were left, and kept offering its form
// after the server had ended the sign-in attempt.

import { describe, it, expect, vi, beforeEach } from "vitest";
import { render, screen, waitFor } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { MemoryRouter, Routes, Route, useLocation } from "react-router";

vi.mock("../../../services/backend-flag", () => ({
  USE_REAL_BACKEND: true,
  API_BASE_URL: "https://example.test/api",
}));

const refreshSessionFromBackend = vi.fn(() => Promise.resolve());

vi.mock("../../../context/PlatformContext", () => ({
  usePlatform: () => ({ refreshSessionFromBackend, signIn: vi.fn() }),
  createMockSignInPayload: () => ({}),
}));

vi.mock("../../../context/OnboardingContext", () => ({
  useOnboarding: () => ({ pendingUser: null }),
}));

import { RecoveryCodes } from "../RecoveryCodes";
import { MfaChallenge } from "../MfaChallenge";

const json = (status: number, body: unknown) =>
  new Response(JSON.stringify(body), { status, headers: { "content-type": "application/json" } });

const sent: { path: string; body: unknown }[] = [];
let answer: () => Response;

function Where() {
  const location = useLocation();
  return <div data-testid="where">{location.pathname + location.search}</div>;
}

function renderAt(path: string) {
  return render(
    <MemoryRouter initialEntries={[path]}>
      <Routes>
        <Route path="/mfa" element={<><MfaChallenge /><Where /></>} />
        <Route path="/mfa/recovery" element={<><RecoveryCodes /><Where /></>} />
        <Route path="/sign-in" element={<Where />} />
        <Route path="/app/*" element={<Where />} />
      </Routes>
    </MemoryRouter>,
  );
}

beforeEach(() => {
  sent.length = 0;
  refreshSessionFromBackend.mockClear();
  answer = () => json(200, { status: "authenticated", userId: "usr_1", recoveryCodesRemaining: 9 });
  vi.stubGlobal("fetch", vi.fn((input: RequestInfo | URL, init?: RequestInit) => {
    const url = new URL(typeof input === "string" ? input : input instanceof URL ? input.href : input.url);
    sent.push({ path: url.pathname.replace(/^\/api/, ""), body: typeof init?.body === "string" ? JSON.parse(init.body) as unknown : undefined });
    return Promise.resolve(answer());
  }));
});

describe("the recovery-code page with a backend", () => {
  it("does not claim that any code is accepted", () => {
    renderAt("/mfa/recovery");
    expect(screen.queryByText(/FRONTEND DEMONSTRATION/)).toBeNull();
    expect(screen.queryByText(/any non-empty recovery code is accepted/)).toBeNull();
    expect(screen.getByLabelText(/Recovery code/)).toHaveAttribute("placeholder", "XXXX-XXXX-XXXX");
  });

  it("sends the code to the server, says how many are left, then goes where the visitor was heading", async () => {
    const user = userEvent.setup();
    renderAt("/mfa/recovery?returnTo=%2Fapp%2Fdocuments");
    await user.type(screen.getByLabelText(/Recovery code/), "abcd-efgh-jkmn");
    await user.click(screen.getByRole("button", { name: "Verify code" }));

    expect(await screen.findByTestId("recovery-remaining")).toHaveTextContent("You have 9 recovery codes left.");
    expect(sent).toEqual([{ path: "/auth/mfa/verifications", body: { code: "abcd-efgh-jkmn" } }]);
    expect(refreshSessionFromBackend).toHaveBeenCalledTimes(1);
    await waitFor(() => expect(screen.getByTestId("where")).toHaveTextContent("/app/documents"), { timeout: 4000 });
  });

  it("says so when the last code has been spent", async () => {
    const user = userEvent.setup();
    answer = () => json(200, { status: "authenticated", userId: "usr_1", recoveryCodesRemaining: 0 });
    renderAt("/mfa/recovery");
    await user.type(screen.getByLabelText(/Recovery code/), "ABCD-EFGH-JKMN");
    await user.click(screen.getByRole("button", { name: "Verify code" }));
    expect(await screen.findByTestId("recovery-remaining")).toHaveTextContent("That was your last recovery code.");
  });

  it("lets a wrong code be tried again", async () => {
    const user = userEvent.setup();
    answer = () => json(422, { error: { code: "INVALID_MFA_CODE", message: "That code is incorrect." } });
    renderAt("/mfa/recovery");
    await user.type(screen.getByLabelText(/Recovery code/), "ABCD-EFGH-JKMN");
    await user.click(screen.getByRole("button", { name: "Verify code" }));
    expect(await screen.findByRole("alert")).toHaveTextContent("That code is incorrect.");
    expect(screen.getByRole("button", { name: "Verify code" })).toBeInTheDocument();
    expect(screen.queryByTestId("mfa-sign-in-again")).toBeNull();
  });

  it.each([
    ["MFA_ATTEMPTS_EXHAUSTED", 422, "Too many incorrect attempts. Please sign in again."],
    ["PRE_AUTH_EXPIRED", 401, "That sign-in attempt has expired. Please sign in again."],
    ["PRE_AUTH_REQUIRED", 401, "Sign in again to continue."],
  ])("stops offering the form once the attempt is over (%s)", async (code, status, message) => {
    const user = userEvent.setup();
    answer = () => json(status, { error: { code, message } });
    renderAt("/mfa/recovery?returnTo=%2Fapp%2Fdocuments");
    await user.type(screen.getByLabelText(/Recovery code/), "ABCD-EFGH-JKMN");
    await user.click(screen.getByRole("button", { name: "Verify code" }));

    expect(await screen.findByRole("alert")).toHaveTextContent(message);
    expect(screen.queryByRole("button", { name: "Verify code" })).toBeNull();
    expect(screen.getByLabelText(/Recovery code/)).toBeDisabled();
    expect(screen.getByTestId("mfa-sign-in-again")).toHaveAttribute("href", "/sign-in?returnTo=%2Fapp%2Fdocuments");
  });

  it("keeps the destination when switching to the authenticator page", () => {
    renderAt("/mfa/recovery?returnTo=%2Fapp%2Fdocuments");
    expect(screen.getByRole("link", { name: "Use authenticator app instead" })).toHaveAttribute("href", "/mfa?returnTo=%2Fapp%2Fdocuments");
  });

  it("never follows a destination outside the app", async () => {
    const user = userEvent.setup();
    answer = () => json(200, { status: "authenticated", userId: "usr_1" });
    renderAt("/mfa/recovery?returnTo=https%3A%2F%2Fevil.example");
    await user.type(screen.getByLabelText(/Recovery code/), "ABCD-EFGH-JKMN");
    await user.click(screen.getByRole("button", { name: "Verify code" }));
    await waitFor(() => expect(screen.getByTestId("where")).toHaveTextContent("/app/dashboard"), { timeout: 3000 });
  });
});

describe("the authenticator page with a backend", () => {
  it("keeps the destination on the way to the recovery page", () => {
    renderAt("/mfa?returnTo=%2Fapp%2Fdocuments");
    expect(screen.getByRole("link", { name: "Use a recovery code" })).toHaveAttribute("href", "/mfa/recovery?returnTo=%2Fapp%2Fdocuments");
  });

  it("stops offering the form once the attempt is over", async () => {
    const user = userEvent.setup();
    answer = () => json(401, { error: { code: "PRE_AUTH_REQUIRED", message: "Sign in again to continue." } });
    renderAt("/mfa");
    await user.type(screen.getByLabelText(/Authenticator code/), "123456");
    await user.click(screen.getByRole("button", { name: "Verify" }));

    expect(await screen.findByTestId("mfa-sign-in-again")).toHaveAttribute("href", "/sign-in");
    expect(screen.queryByRole("button", { name: "Verify" })).toBeNull();
    expect(screen.queryByRole("link", { name: "Use a recovery code" })).toBeNull();
  });
});
