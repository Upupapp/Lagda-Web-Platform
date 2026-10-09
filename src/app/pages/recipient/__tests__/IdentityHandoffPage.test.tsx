// The identity check, continued on a phone.
//
// Pinned here:
//
//   - the token comes from the link's fragment, leaves the address bar at
//     once, and is kept nowhere but memory
//   - there is no sign-in: the token is all that is sent, and a link that is
//     wrong, over or used gets one plain answer
//   - the stages are the signing page's own, and a pass ends on "return to
//     your computer", never on a way into the document
//   - `testOutcome` is sent only in test mode

import { describe, it, expect, vi, beforeEach, afterEach } from "vitest";
import { render, screen, waitFor, within } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import type { IdentityHandoffSession } from "../../../services/real/identity-handoff.service";

const open = vi.fn();
const submit = vi.fn();

vi.mock("../../../services/real/identity-handoff.service", async (original) => ({
  ...(await original<typeof import("../../../services/real/identity-handoff.service")>()),
  realIdentityHandoffService: {
    open: (...args: unknown[]) => open(...args) as unknown,
    submit: (...args: unknown[]) => submit(...args) as unknown,
  },
}));

import { IdentityHandoffPage } from "../IdentityHandoffPage";
import { ApiError } from "../../../services/api-client";

const TOKEN = "p".repeat(43);
const ENDED_TITLE = "This link has ended";
const ENDED_NEXT = "Go back to your computer and get a new code.";

const soon = (ms: number) => new Date(Date.now() + ms).toISOString();
const session = (over: Partial<IdentityHandoffSession> = {}): IdentityHandoffSession => ({
  documentTitle: "Office Lease", mode: "live", idTypes: ["umid", "philippine-passport"],
  attemptsRemaining: 3, expiresAt: soon(9 * 60 * 1000), status: "opened", ...over,
});

function arrive(hash = `#${TOKEN}`) {
  window.history.replaceState(null, "", `/sign/identity/handoff${hash}`);
  return render(<IdentityHandoffPage />);
}

async function walkToSelfie() {
  await userEvent.click(await screen.findByRole("checkbox", { name: /I agree to the use of my ID and selfie/ }));
  await userEvent.click(screen.getByRole("button", { name: "Continue" }));
  await userEvent.selectOptions(screen.getByLabelText("Type of ID"), "umid");
  await userEvent.upload(screen.getByLabelText("Front of the ID: choose a file"),
    new File(["x"], "front.jpg", { type: "image/jpeg" }));
  await userEvent.click(screen.getByRole("button", { name: "Continue" }));
  await userEvent.upload(screen.getByLabelText("Selfie: choose a file"),
    new File(["y"], "me.jpg", { type: "image/jpeg" }));
  await screen.findByRole("button", { name: "Retake" });
}

beforeEach(() => {
  open.mockResolvedValue(session());
  submit.mockResolvedValue({ outcome: "passed", attemptsRemaining: 3, status: "passed" });
  Object.defineProperty(URL, "createObjectURL", { configurable: true, writable: true, value: () => "blob:test/1" });
  Object.defineProperty(URL, "revokeObjectURL", { configurable: true, writable: true, value: () => undefined });
  window.localStorage.clear();
  window.sessionStorage.clear();
});

afterEach(() => {
  Reflect.deleteProperty(window.navigator, "mediaDevices");
  Reflect.deleteProperty(URL, "createObjectURL");
  Reflect.deleteProperty(URL, "revokeObjectURL");
  window.history.replaceState(null, "", "/");
});

describe("arriving from the QR code", () => {
  it("takes the token from the fragment, clears the address bar, and opens the link with it", async () => {
    const replace = vi.spyOn(window.history, "replaceState");
    arrive();
    expect(await screen.findByRole("heading", { level: 1, name: "Identity check" })).toBeInTheDocument();

    expect(open).toHaveBeenCalledTimes(1);
    expect(open).toHaveBeenCalledWith(TOKEN);
    expect(window.location.hash).toBe("");
    expect(window.location.href).not.toContain(TOKEN);
    expect(window.location.pathname).toBe("/sign/identity/handoff");
    expect(replace).toHaveBeenCalledWith(null, "", "/sign/identity/handoff");
  });

  it("keeps the token in memory only", async () => {
    arrive();
    await screen.findByRole("heading", { level: 1, name: "Identity check" });
    expect(window.localStorage.length).toBe(0);
    expect(window.sessionStorage.length).toBe(0);
    expect(document.cookie).not.toContain(TOKEN);
    expect(document.body.innerHTML).not.toContain(TOKEN);
  });

  it("names the page and keeps it out of search engines", async () => {
    arrive();
    await screen.findByRole("heading", { level: 1, name: "Identity check" });
    expect(document.title).toBe("Identity Check — LAGDA eSignature");
    expect(document.head.innerHTML).toContain('<meta name="robots" content="noindex, nofollow">');
  });

  it("starts on consent, for the document the computer is opening, with no sign-in and no way into the document", async () => {
    arrive();
    expect(await screen.findByRole("heading", { name: "Before you start" })).toBeInTheDocument();
    expect(screen.getByText(/The sender asked for this before you open "Office Lease"/)).toBeInTheDocument();
    const rail = screen.getByRole("list", { name: "Identity check progress" });
    expect(within(rail).getAllByRole("listitem").map(item => item.textContent)).toEqual(
      ["1Consent", "2Your ID", "3Your face", "4Result"]);
    expect(screen.queryByRole("button", { name: /sign in/i })).toBeNull();
    expect(screen.queryByRole("textbox")).toBeNull();
    expect(screen.queryByRole("button", { name: "Decline to sign" })).toBeNull();
    // A phone is not sent to find another phone.
    await userEvent.click(screen.getByRole("checkbox", { name: /I agree to the use of my ID and selfie/ }));
    await userEvent.click(screen.getByRole("button", { name: "Continue" }));
    expect(screen.queryByRole("button", { name: "Use my phone instead" })).toBeNull();
  });

  it("offers only the kinds of ID the server listed", async () => {
    arrive();
    await userEvent.click(await screen.findByRole("checkbox", { name: /I agree to the use of my ID and selfie/ }));
    await userEvent.click(screen.getByRole("button", { name: "Continue" }));
    expect(within(screen.getByLabelText("Type of ID")).getAllByRole("option").map(option => option.textContent))
      .toEqual(["Choose one", "Philippine Passport", "UMID (SSS / GSIS)"]);
  });

  it("reads correctly in live mode: no test banner, no simulated result", async () => {
    arrive();
    await screen.findByRole("heading", { name: "Before you start" });
    expect(screen.queryByTestId("identity-check-test-banner")).toBeNull();
    expect(screen.queryByText(/test mode/i)).toBeNull();
    await walkToSelfie();
    expect(screen.queryByTestId("identity-check-test-panel")).toBeNull();
    expect(screen.queryByText(/simulated/i)).toBeNull();
  });

  it("says in test mode that the check is simulated", async () => {
    open.mockResolvedValue(session({ mode: "test" }));
    arrive();
    expect((await screen.findByTestId("identity-check-test-banner")).textContent)
      .toBe("Test mode: this identity check is simulated.");
  });
});

describe("a link that will not open", () => {
  it.each([
    ["a wrong, expired or used token", new ApiError(404, { code: "identity_handoff_not_found", message: "m" }, "x")],
    ["a token of the wrong shape", new ApiError(422, { code: "validation_failed", message: "m" }, "x")],
  ])("says the link has ended for %s", async (_name, refusal) => {
    open.mockRejectedValue(refusal);
    arrive();
    expect(await screen.findByRole("heading", { level: 1, name: ENDED_TITLE })).toBeInTheDocument();
    expect(screen.getByText(ENDED_NEXT)).toBeInTheDocument();
    expect(screen.queryByRole("button")).toBeNull();
    expect(screen.queryByTestId("identity-check-step")).toBeNull();
    // Gone from the address bar all the same.
    expect(window.location.hash).toBe("");
  });

  it("says the link has ended, and asks the server nothing, when there is no token at all", async () => {
    arrive("");
    expect(await screen.findByRole("heading", { level: 1, name: ENDED_TITLE })).toBeInTheDocument();
    expect(screen.getByText(ENDED_NEXT)).toBeInTheDocument();
    expect(open).not.toHaveBeenCalled();
  });

  it("lets a dropped connection be tried again with the same token", async () => {
    open.mockRejectedValueOnce(new ApiError(0, undefined, "offline")).mockResolvedValue(session());
    arrive();
    expect(await screen.findByRole("heading", { level: 1, name: "The identity check could not be opened" })).toBeInTheDocument();
    expect(screen.queryByRole("heading", { name: ENDED_TITLE })).toBeNull();
    await userEvent.click(screen.getByRole("button", { name: "Try again" }));
    expect(await screen.findByRole("heading", { name: "Before you start" })).toBeInTheDocument();
    expect(open).toHaveBeenCalledTimes(2);
    expect(open).toHaveBeenLastCalledWith(TOKEN);
  });
});

describe("the check on the phone", () => {
  it("passes: says to return to the computer, and offers no way into the document", async () => {
    arrive();
    await walkToSelfie();
    await userEvent.click(screen.getByRole("button", { name: "Check my identity" }));

    expect(await screen.findByRole("heading", { name: "Done" })).toHaveFocus();
    expect(screen.getByText("You can return to your computer. It will continue by itself.")).toBeInTheDocument();
    expect(screen.queryByRole("button", { name: "Continue" })).toBeNull();
    expect(screen.queryByRole("button")).toBeNull();
    expect(screen.queryByText(/simulated/i)).toBeNull();

    expect(submit).toHaveBeenCalledTimes(1);
    // Live mode: the token, and the same three facts as on the computer. No testOutcome.
    expect(submit).toHaveBeenCalledWith(TOKEN, { idType: "umid", capture: "upload", consent: true });
  });

  it("sends testOutcome only in test mode, and never words a simulated result as a pass", async () => {
    open.mockResolvedValue(session({ mode: "test" }));
    arrive();
    await walkToSelfie();
    await userEvent.click(screen.getByRole("radio", { name: "Pass" }));
    await userEvent.click(screen.getByRole("button", { name: "Check my identity" }));

    expect(await screen.findByRole("heading", { name: "Done" })).toBeInTheDocument();
    expect(screen.getByText("This was a simulated check. No identity was verified.")).toBeInTheDocument();
    expect(screen.queryByText(/passed/i)).toBeNull();
    expect(submit).toHaveBeenCalledWith(TOKEN, { idType: "umid", capture: "upload", consent: true, testOutcome: "pass" });
  });

  it("fails, says how many attempts are left, and passes on the next try", async () => {
    submit
      .mockResolvedValueOnce({ outcome: "failed", attemptsRemaining: 2, status: "pending" })
      .mockResolvedValueOnce({ outcome: "passed", attemptsRemaining: 2, status: "passed" });
    arrive();
    await walkToSelfie();
    await userEvent.click(screen.getByRole("button", { name: "Check my identity" }));

    expect(await screen.findByRole("heading", { name: "We could not complete the identity check" })).toBeInTheDocument();
    expect(screen.getByTestId("identity-check-attempts-left").textContent).toBe("2 attempts left");

    await userEvent.click(screen.getByRole("button", { name: "Try again" }));
    expect(screen.getByRole("heading", { name: "Your face" })).toHaveFocus();
    await userEvent.upload(screen.getByLabelText("Selfie: choose a file"),
      new File(["z"], "me-again.jpg", { type: "image/jpeg" }));
    await screen.findByRole("button", { name: "Retake" });
    await userEvent.click(screen.getByRole("button", { name: "Check my identity" }));

    expect(await screen.findByRole("heading", { name: "Done" })).toBeInTheDocument();
    expect(submit).toHaveBeenCalledTimes(2);
    expect(submit).toHaveBeenLastCalledWith(TOKEN, { idType: "umid", capture: "upload", consent: true });
    expect(open).toHaveBeenCalledTimes(1);
  });

  it("locks when the last attempt fails, with nothing to re-read and no promise about this link", async () => {
    submit.mockResolvedValue({ outcome: "failed", attemptsRemaining: 0, status: "locked" });
    arrive();
    await walkToSelfie();
    await userEvent.click(screen.getByRole("button", { name: "Check my identity" }));

    expect(await screen.findByRole("heading", { name: "The identity check is closed for now" })).toHaveFocus();
    expect(screen.getByText(
      "The identity check could not be completed. The sender has been told and can let you "
      + "continue another way. You can return to your computer.")).toBeInTheDocument();
    expect(screen.queryByText(/come back to this link later/)).toBeNull();
    expect(screen.queryByRole("button", { name: "Check again" })).toBeNull();
  });

  it("locks when the server says the allowance is spent", async () => {
    submit.mockRejectedValue(new ApiError(409, { code: "identity_check_locked", message: "m" }, "x"));
    arrive();
    await walkToSelfie();
    await userEvent.click(screen.getByRole("button", { name: "Check my identity" }));
    expect(await screen.findByRole("heading", { name: "The identity check is closed for now" })).toBeInTheDocument();
  });

  it("opens on the locked wording when no attempt is left to begin with", async () => {
    open.mockResolvedValue(session({ attemptsRemaining: 0 }));
    arrive();
    expect(await screen.findByRole("heading", { name: "The identity check is closed for now" })).toBeInTheDocument();
    expect(screen.queryByRole("checkbox")).toBeNull();
  });

  it("explains an ID the server will not take, on the same screen", async () => {
    submit.mockRejectedValue(new ApiError(422, {
      code: "identity_check_invalid", message: "m", details: [{ field: "idType", code: "not-offered", message: "m" }],
    }, "x"));
    arrive();
    await walkToSelfie();
    await userEvent.click(screen.getByRole("button", { name: "Check my identity" }));
    expect((await screen.findByRole("alert")).textContent)
      .toBe("That type of ID cannot be used here. Go back and choose another.");
    expect(screen.getByRole("button", { name: "Check my identity" })).toBeEnabled();
  });
});

describe("a link that ends while they are working", () => {
  it("says so when the attempt is refused because the link is over", async () => {
    submit.mockRejectedValue(new ApiError(404, { code: "identity_handoff_not_found", message: "m" }, "x"));
    arrive();
    await walkToSelfie();
    await userEvent.click(screen.getByRole("button", { name: "Check my identity" }));
    expect(await screen.findByRole("heading", { level: 1, name: ENDED_TITLE })).toBeInTheDocument();
    expect(screen.getByText(ENDED_NEXT)).toBeInTheDocument();
    expect(screen.queryByTestId("identity-check-step")).toBeNull();
  });

  it.each([
    "identity_check_not_required", "identity_check_unavailable",
  ])("says so when the check is no longer wanted (%s)", async code => {
    submit.mockRejectedValue(new ApiError(409, { code, message: "m" }, "x"));
    arrive();
    await walkToSelfie();
    await userEvent.click(screen.getByRole("button", { name: "Check my identity" }));
    expect(await screen.findByRole("heading", { level: 1, name: ENDED_TITLE })).toBeInTheDocument();
  });

  it("says so when the ten minutes run out part-way through", async () => {
    // Dated when the link is opened, as the server would.
    open.mockImplementation(() => Promise.resolve(session({ expiresAt: soon(1500) })));
    arrive();
    expect(await screen.findByRole("heading", { name: "Before you start" })).toBeInTheDocument();
    expect(await screen.findByRole("heading", { level: 1, name: ENDED_TITLE }, { timeout: 6000 })).toBeInTheDocument();
    expect(screen.getByText(ENDED_NEXT)).toBeInTheDocument();
    expect(screen.queryByRole("checkbox")).toBeNull();
    expect(submit).not.toHaveBeenCalled();
  });

  it("does not turn Done into an ended link when the time runs out afterwards", async () => {
    let finish: (value: { outcome: "passed"; attemptsRemaining: number; status: "passed" }) => void = () => undefined;
    submit.mockImplementation(() => new Promise(resolve => { finish = resolve; }));
    arrive();
    await walkToSelfie();
    // The link's time is up while the answer is on its way.
    const realNow = Date.now;
    const later = vi.spyOn(Date, "now").mockImplementation(() => realNow() + 20 * 60 * 1000);
    await userEvent.click(screen.getByRole("button", { name: "Check my identity" }));
    expect(screen.getByRole("heading", { name: "Checking…" })).toBeInTheDocument();
    finish({ outcome: "passed", attemptsRemaining: 3, status: "passed" });
    expect(await screen.findByRole("heading", { name: "Done" })).toBeInTheDocument();
    await new Promise(resolve => { setTimeout(resolve, 60); });
    later.mockRestore();
    expect(screen.getByRole("heading", { name: "Done" })).toBeInTheDocument();
    expect(screen.queryByRole("heading", { name: ENDED_TITLE })).toBeNull();
  });

  it("trusts the server, not this phone's clock, when the clock says a fresh link is already over", async () => {
    open.mockResolvedValue(session({ expiresAt: soon(-5 * 60 * 1000) }));
    arrive();
    await screen.findByRole("heading", { name: "Before you start" });
    await new Promise(resolve => { setTimeout(resolve, 80); });
    expect(screen.getByRole("heading", { name: "Before you start" })).toBeInTheDocument();
    expect(screen.queryByRole("heading", { name: ENDED_TITLE })).toBeNull();
  });
});

describe("the camera on the phone", () => {
  it("is asked for only on the participant's press, and let go when the page goes away", async () => {
    const track = { stop: vi.fn() };
    const getUserMedia = vi.fn(() => Promise.resolve({ getTracks: () => [track] }));
    Object.defineProperty(window.navigator, "mediaDevices", { configurable: true, value: { getUserMedia } });
    vi.spyOn(HTMLMediaElement.prototype, "play").mockResolvedValue(undefined);
    const { unmount } = arrive();
    await userEvent.click(await screen.findByRole("checkbox", { name: /I agree to the use of my ID and selfie/ }));
    await userEvent.click(screen.getByRole("button", { name: "Continue" }));
    await userEvent.selectOptions(screen.getByLabelText("Type of ID"), "umid");
    await userEvent.upload(screen.getByLabelText("Front of the ID: choose a file"),
      new File(["x"], "front.jpg", { type: "image/jpeg" }));
    await userEvent.click(screen.getByRole("button", { name: "Continue" }));
    expect(getUserMedia).not.toHaveBeenCalled();

    await userEvent.click(screen.getByRole("button", { name: "Use my camera" }));
    await screen.findByLabelText("Camera preview");
    expect(getUserMedia).toHaveBeenCalledTimes(1);
    unmount();
    await waitFor(() => { expect(track.stop).toHaveBeenCalledTimes(1); });
  });
});
