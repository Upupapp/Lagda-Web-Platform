// "Use my phone instead": the identity check handed from a computer to a phone.
//
// Pinned here, in the order a participant meets them:
//
//   - it is offered where a camera would otherwise be needed, never before
//     they have agreed, and never on a device that is itself a phone
//   - nothing is asked of the server until they press it
//   - the code is a picture with a name, the link is never printed, and the
//     panel says how the phone is getting on
//   - a pass on the phone carries on here by itself, by re-reading the ceremony
//   - the status is read only while the panel is open and the tab is in front

import { describe, it, expect, vi, beforeEach, afterEach } from "vitest";
import { render, screen, waitFor, fireEvent, within, act } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { IdentityCheckStep, type IdentityCheckStepProps } from "../IdentityCheckStep";
import { ApiError } from "../../../services/api-client";
import type {
  CeremonyIdentityCheck, IdentityHandoff, IdentityHandoffStatus,
} from "../../../services/real/signing-access.service";

const pending: CeremonyIdentityCheck = {
  required: true, status: "pending", mode: "live", attemptsRemaining: 3, verifiedAt: null,
  idTypes: ["umid", "philippine-passport"],
};

const TOKEN = "s3cr3t".repeat(7) + "x";
const LINK = `https://lagda.io/sign/identity/handoff#${TOKEN}`;
const POLL_MS = 20;

const LOCKED = "The identity check could not be completed. The sender has been told and can let you "
  + "continue another way. You can come back to this link later.";

const soon = (ms: number) => new Date(Date.now() + ms).toISOString();
const code = (over: Partial<IdentityHandoff> = {}): IdentityHandoff => ({
  handoffId: "idh_1", url: LINK, expiresAt: soon(10 * 60 * 1000), ...over,
});
const standing = (status: IdentityHandoffStatus["status"], attemptsRemaining = 3): IdentityHandoffStatus =>
  ({ status, attemptsRemaining });
const pause = (ms: number) => act(() => new Promise<void>(resolve => { setTimeout(resolve, ms); }));

beforeEach(() => {
  Object.defineProperty(URL, "createObjectURL", { configurable: true, writable: true, value: () => "blob:test/1" });
  Object.defineProperty(URL, "revokeObjectURL", { configurable: true, writable: true, value: () => undefined });
});

afterEach(() => {
  Reflect.deleteProperty(window.navigator, "mediaDevices");
  Reflect.deleteProperty(window.navigator, "maxTouchPoints");
  Reflect.deleteProperty(URL, "createObjectURL");
  Reflect.deleteProperty(URL, "revokeObjectURL");
});

function setup(overrides: Partial<IdentityCheckStepProps> = {}) {
  const create = vi.fn<() => Promise<IdentityHandoff>>().mockResolvedValue(code());
  const status = vi.fn<(handoffId: string) => Promise<IdentityHandoffStatus>>().mockResolvedValue(standing("waiting"));
  const submit = vi.fn<IdentityCheckStepProps["submit"]>()
    .mockResolvedValue({ outcome: "passed", attemptsRemaining: 3, status: "passed" });
  const onReload = vi.fn<IdentityCheckStepProps["onReload"]>().mockResolvedValue(null);
  const props: IdentityCheckStepProps = {
    identityCheck: pending, documentTitle: "Office Lease", submit, onReload,
    handoff: { create, status, pollMs: POLL_MS }, ...overrides,
  };
  const view = render(<IdentityCheckStep {...props} />);
  return { create, status, submit, onReload: props.onReload as typeof onReload, props, ...view };
}

function installCamera() {
  const track = { stop: vi.fn() };
  const getUserMedia = vi.fn(() => Promise.resolve({ getTracks: () => [track] }));
  Object.defineProperty(window.navigator, "mediaDevices", { configurable: true, value: { getUserMedia } });
  vi.spyOn(HTMLMediaElement.prototype, "play").mockResolvedValue(undefined);
  return { track, getUserMedia };
}

async function agree() {
  await userEvent.click(screen.getByRole("checkbox", { name: /I agree to the use of my ID and selfie/ }));
  await userEvent.click(screen.getByRole("button", { name: "Continue" }));
}

async function toFace() {
  await agree();
  await userEvent.selectOptions(screen.getByLabelText("Type of ID"), "umid");
  await userEvent.upload(screen.getByLabelText("Front of the ID: choose a file"),
    new File(["x".repeat(64)], "id-front.jpg", { type: "image/jpeg" }));
  await userEvent.click(screen.getByRole("button", { name: "Continue" }));
  await screen.findByRole("heading", { name: "Your face" });
}

/** Agrees, then asks for the phone from the "Your ID" stage. */
async function openPanel() {
  await agree();
  await userEvent.click(screen.getByRole("button", { name: "Use my phone instead" }));
  await screen.findByRole("img", { name: /QR code/ });
}

const liveRegion = () => {
  const step = screen.getByTestId("identity-check-step");
  return within(step).getAllByRole("status").find(node => node.getAttribute("aria-live") === "polite" && !node.hasAttribute("data-testid"));
};

describe("where it is offered", () => {
  it("is not offered, and asks the server nothing, before the participant has agreed", async () => {
    const { create, status } = setup();
    expect(screen.getByRole("heading", { name: "Before you start" })).toBeInTheDocument();
    expect(screen.queryByRole("button", { name: "Use my phone instead" })).toBeNull();
    await userEvent.click(screen.getByRole("checkbox", { name: /I agree to the use of my ID and selfie/ }));
    expect(screen.queryByRole("button", { name: "Use my phone instead" })).toBeNull();
    expect(create).not.toHaveBeenCalled();
    expect(status).not.toHaveBeenCalled();
  });

  it("is a secondary choice on Your ID, and makes no code until it is pressed", async () => {
    const { create } = setup();
    await agree();
    expect(screen.getByRole("heading", { name: "Your ID" })).toBeInTheDocument();
    expect(screen.getByRole("button", { name: "Use my phone instead" })).toBeInTheDocument();
    expect(create).not.toHaveBeenCalled();
    await userEvent.click(screen.getByRole("button", { name: "Use my phone instead" }));
    expect(create).toHaveBeenCalledTimes(1);
  });

  it("comes after the camera and the upload on Your face when there is a camera", async () => {
    installCamera();
    setup();
    await toFace();
    const names = screen.getAllByRole("button").map(button => button.textContent);
    expect(names.indexOf("Use my camera")).toBeGreaterThan(-1);
    expect(names.indexOf("Use my phone instead")).toBeGreaterThan(names.indexOf("Upload a selfie instead"));
    expect(names.indexOf("Upload a selfie instead")).toBeGreaterThan(names.indexOf("Use my camera"));
  });

  it("is the first choice on Your face when this computer has no camera", async () => {
    setup();
    await toFace();
    expect(screen.queryByRole("button", { name: "Use my camera" })).toBeNull();
    const names = screen.getAllByRole("button").map(button => button.textContent);
    expect(names.indexOf("Use my phone instead")).toBeGreaterThan(-1);
    expect(names.indexOf("Use my phone instead")).toBeLessThan(names.indexOf("Upload a selfie"));
  });

  it("is not offered on a touch device, which is already a phone", async () => {
    Object.defineProperty(window.navigator, "maxTouchPoints", { configurable: true, value: 5 });
    const { create } = setup();
    await agree();
    expect(screen.queryByRole("button", { name: "Use my phone instead" })).toBeNull();
    await userEvent.selectOptions(screen.getByLabelText("Type of ID"), "umid");
    await userEvent.upload(screen.getByLabelText("Front of the ID: choose a file"),
      new File(["x"], "id-front.jpg", { type: "image/jpeg" }));
    await userEvent.click(screen.getByRole("button", { name: "Continue" }));
    await screen.findByRole("heading", { name: "Your face" });
    expect(screen.queryByRole("button", { name: "Use my phone instead" })).toBeNull();
    expect(create).not.toHaveBeenCalled();
  });

  it("is not offered where the page gave no way to hand over", async () => {
    const first = setup();
    first.unmount();
    const { handoff: _none, ...rest } = first.props;
    render(<IdentityCheckStep {...rest} />);
    await agree();
    expect(screen.queryByRole("button", { name: "Use my phone instead" })).toBeNull();
  });

  it("lets go of a camera that answers after the phone was chosen instead", async () => {
    const track = { stop: vi.fn() };
    let grant: (stream: unknown) => void = () => undefined;
    Object.defineProperty(window.navigator, "mediaDevices", {
      configurable: true, value: { getUserMedia: vi.fn(() => new Promise(resolve => { grant = resolve; })) },
    });
    setup();
    await toFace();
    await userEvent.click(screen.getByRole("button", { name: "Use my camera" }));
    await userEvent.click(screen.getByRole("button", { name: "Use my phone instead" }));
    await screen.findByRole("img", { name: /QR code/ });
    grant({ getTracks: () => [track] });
    await waitFor(() => { expect(track.stop).toHaveBeenCalledTimes(1); });
    expect(screen.queryByLabelText("Camera preview")).toBeNull();
  });
});

describe("the code", () => {
  it("is a picture with a name, an instruction and a countdown, under a focused heading", async () => {
    setup();
    await openPanel();
    expect(screen.getByRole("heading", { name: "Continue on your phone" })).toHaveFocus();
    const qr = screen.getByRole("img", { name: "QR code that continues the identity check on your phone" });
    expect(qr).toHaveAccessibleName("QR code that continues the identity check on your phone");
    expect(screen.getByText(/Scan this code with your phone’s camera/)).toBeInTheDocument();
    expect(screen.getByTestId("identity-handoff-status").textContent).toBe("Waiting for your phone");
    expect(screen.getByTestId("identity-handoff-countdown").textContent).toMatch(/^This code expires in (10:00|9:5\d)$/);
    // Still inside the step, with the stage it was opened from marked on the rail.
    const rail = screen.getByRole("list", { name: "Identity check progress" });
    expect(within(rail).getByText("Your ID")).toHaveAttribute("aria-current", "step");
  });

  it("is drawn sharp, dark on white, with a quiet zone around it", async () => {
    setup();
    await openPanel();
    const qr = screen.getByTestId("identity-handoff-qr");
    expect(qr.tagName.toLowerCase()).toBe("svg");
    expect(qr).toHaveAttribute("shape-rendering", "crispEdges");
    const side = Number(qr.getAttribute("viewBox")?.split(" ")[2]);
    // A version-1 symbol is 21 modules; four quiet modules on every side.
    expect(side).toBeGreaterThanOrEqual(21 + 8);
    expect((side - 8 - 21) % 4).toBe(0);
    const drawing = qr.innerHTML;
    expect(drawing).toContain(`<rect width="${String(side)}" height="${String(side)}" fill="#FFFFFF">`);
    expect(drawing).toMatch(/<path d="[^"]+" fill="#07111F">/);
    // Nothing is drawn in the quiet zone: every square starts four modules in.
    const starts = [...drawing.matchAll(/M(\d+) (\d+)h1v1h-1z/g)]
      .flatMap(match => [Number(match[1]), Number(match[2])]);
    expect(starts.length).toBeGreaterThan(200);
    expect(Math.min(...starts)).toBe(4);
    expect(Math.max(...starts)).toBe(side - 5);
  });

  it("never prints the link, and copies it on request", async () => {
    const user = userEvent.setup();
    setup();
    await openPanel();
    expect(document.body.innerHTML).not.toContain(TOKEN);
    expect(screen.queryByRole("textbox")).toBeNull();
    await user.click(screen.getByRole("button", { name: "Copy link" }));
    expect(await screen.findByRole("button", { name: "Link copied" })).toBeInTheDocument();
    await expect(navigator.clipboard.readText()).resolves.toBe(LINK);
    expect(liveRegion()?.textContent).toBe("Link copied. Open it on your phone.");
    expect(document.body.innerHTML).not.toContain(TOKEN);
  });

  it("shows the link to copy by hand only where the clipboard cannot be used", async () => {
    const user = userEvent.setup();
    setup();
    await openPanel();
    // After the setup above, which puts a working clipboard in place.
    const was = Object.getOwnPropertyDescriptor(window.navigator, "clipboard");
    Object.defineProperty(window.navigator, "clipboard", {
      configurable: true, value: { writeText: () => Promise.reject(new Error("denied")) },
    });
    try {
      await user.click(screen.getByRole("button", { name: "Copy link" }));
      expect(await screen.findByLabelText("Link to open on your phone")).toHaveValue(LINK);
    } finally {
      if (was !== undefined) Object.defineProperty(window.navigator, "clipboard", was);
      else Reflect.deleteProperty(window.navigator, "clipboard");
    }
  });

  it("says so through the step's live region when the code is ready", async () => {
    setup();
    await openPanel();
    expect(liveRegion()?.textContent).toBe("Your code is ready. Scan it with your phone's camera.");
  });

  it("gets a new code on request, and watches the new one", async () => {
    const { create, status } = setup();
    create.mockResolvedValueOnce(code()).mockResolvedValueOnce(code({ handoffId: "idh_2" }));
    await openPanel();
    await waitFor(() => { expect(status).toHaveBeenCalledWith("idh_1"); });
    await userEvent.click(screen.getByRole("button", { name: "Get a new code" }));
    await waitFor(() => { expect(status).toHaveBeenCalledWith("idh_2"); });
    expect(create).toHaveBeenCalledTimes(2);
    const before = status.mock.calls.filter(call => call[0] === "idh_1").length;
    await pause(POLL_MS * 4);
    expect(status.mock.calls.filter(call => call[0] === "idh_1").length).toBe(before);
  });

  it("goes back to doing it on this computer, with what was already chosen", async () => {
    const { status } = setup();
    await agree();
    await userEvent.selectOptions(screen.getByLabelText("Type of ID"), "umid");
    await userEvent.click(screen.getByRole("button", { name: "Use my phone instead" }));
    await screen.findByRole("img", { name: /QR code/ });
    await userEvent.click(screen.getByRole("button", { name: "Back" }));
    expect(screen.getByRole("heading", { name: "Your ID" })).toHaveFocus();
    expect(screen.getByLabelText("Type of ID")).toHaveValue("umid");
    expect(screen.queryByTestId("identity-handoff-panel")).toBeNull();
    const calls = status.mock.calls.length;
    await pause(POLL_MS * 4);
    expect(status.mock.calls.length).toBe(calls);
  });
});

describe("how the phone is getting on", () => {
  it("waits, sees the phone connect, and carries on by itself when the phone passes", async () => {
    const { status, onReload, submit } = setup();
    let answer: IdentityHandoffStatus = standing("waiting");
    status.mockImplementation(() => Promise.resolve(answer));
    await openPanel();
    expect(screen.getByTestId("identity-handoff-status").textContent).toBe("Waiting for your phone");
    await waitFor(() => { expect(status).toHaveBeenCalled(); });
    expect(onReload).not.toHaveBeenCalled();

    answer = standing("opened");
    await waitFor(() => {
      expect(screen.getByTestId("identity-handoff-status").textContent).toBe("Phone connected. Continue there.");
    });
    expect(liveRegion()?.textContent).toBe("Phone connected. Continue there.");
    // The code has done its job: it is not left on the screen.
    expect(screen.queryByRole("img", { name: /QR code/ })).toBeNull();
    expect(screen.queryByRole("button", { name: "Copy link" })).toBeNull();
    expect(screen.getByRole("button", { name: "Get a new code" })).toBeInTheDocument();

    answer = standing("completed");
    // The same handling a pass on this computer gets: the ceremony is re-read.
    await waitFor(() => { expect(onReload).toHaveBeenCalledTimes(1); });
    expect(submit).not.toHaveBeenCalled();
    expect(screen.queryByTestId("identity-handoff-panel")).toBeNull();
    expect(screen.getByRole("heading", { name: "Identity check passed" })).toBeInTheDocument();
    const calls = status.mock.calls.length;
    await pause(POLL_MS * 4);
    expect(status.mock.calls.length).toBe(calls);
    expect(onReload).toHaveBeenCalledTimes(1);
  });

  it("leaves Continue within reach when the ceremony cannot be read after the phone passed", async () => {
    const { status, onReload } = setup({
      onReload: vi.fn<IdentityCheckStepProps["onReload"]>()
        .mockResolvedValueOnce("Your signing session has ended. Open your signing link again to continue.")
        .mockResolvedValue(null),
    });
    status.mockResolvedValue(standing("completed"));
    await openPanel();
    expect((await screen.findByRole("alert")).textContent)
      .toBe("Your signing session has ended. Open your signing link again to continue.");
    await userEvent.click(screen.getByRole("button", { name: "Continue" }));
    expect(onReload).toHaveBeenCalledTimes(2);
  });

  it("never words a simulated pass on the phone as a real one", async () => {
    const { status } = setup({
      identityCheck: { ...pending, mode: "test" },
      onReload: vi.fn<IdentityCheckStepProps["onReload"]>().mockResolvedValue("could not read"),
    });
    status.mockResolvedValue(standing("completed"));
    await openPanel();
    expect(await screen.findByRole("heading", { name: "Identity check completed (test mode)" })).toBeInTheDocument();
    expect(screen.queryByText(/Identity check passed/)).toBeNull();
  });

  it("says how many attempts are left when the phone's try fails, and offers a new code or this computer", async () => {
    const { status, create } = setup();
    status.mockResolvedValue(standing("failed", 2));
    await openPanel();
    expect((await screen.findByTestId("identity-handoff-attempts-left")).textContent).toBe("2 attempts left");
    expect(screen.getByRole("alert").textContent).toBe("The check on your phone was not completed.");
    expect(liveRegion()?.textContent).toBe("The check on your phone was not completed. 2 attempts left.");
    expect(screen.queryByRole("img", { name: /QR code/ })).toBeNull();

    await userEvent.click(screen.getByRole("button", { name: "Get a new code" }));
    expect(create).toHaveBeenCalledTimes(2);
    status.mockResolvedValue(standing("failed", 1));
    expect(await screen.findByText("1 attempt left")).toBeInTheDocument();

    await userEvent.click(screen.getByRole("button", { name: "Back" }));
    expect(screen.getByRole("heading", { name: "Your ID" })).toBeInTheDocument();
  });

  it("keeps watching after a failed try, in case the next one on the same phone passes", async () => {
    const { status, onReload } = setup();
    let answer: IdentityHandoffStatus = standing("failed", 2);
    status.mockImplementation(() => Promise.resolve(answer));
    await openPanel();
    await screen.findByTestId("identity-handoff-attempts-left");
    answer = standing("completed", 2);
    await waitFor(() => { expect(onReload).toHaveBeenCalledTimes(1); });
  });

  it("offers a new code when the server says this one has expired", async () => {
    const { status, create } = setup();
    create.mockResolvedValueOnce(code()).mockResolvedValueOnce(code({ handoffId: "idh_2" }));
    status.mockImplementation(id => Promise.resolve(standing(id === "idh_1" ? "expired" : "waiting")));
    await openPanel();
    expect(await screen.findByText("This code has expired. Get a new code to continue on your phone.")).toBeInTheDocument();
    expect(screen.queryByRole("img", { name: /QR code/ })).toBeNull();
    // Nothing more is asked about a code that is over.
    const calls = status.mock.calls.length;
    await pause(POLL_MS * 4);
    expect(status.mock.calls.length).toBe(calls);

    await userEvent.click(screen.getByRole("button", { name: "Get a new code" }));
    expect(await screen.findByRole("img", { name: /QR code/ })).toBeInTheDocument();
    expect(create).toHaveBeenCalledTimes(2);
    expect(screen.getByRole("button", { name: "Back" })).toBeInTheDocument();
  });

  it("expires the code by its own clock when the time runs out", async () => {
    const { create } = setup();
    // Dated when it is asked for, as the server would.
    create.mockImplementation(() => Promise.resolve(code({ expiresAt: soon(150) })));
    await agree();
    await userEvent.click(screen.getByRole("button", { name: "Use my phone instead" }));
    expect(await screen.findByText(
      "This code has expired. Get a new code to continue on your phone.", undefined, { timeout: 3000 })).toBeInTheDocument();
    expect(liveRegion()?.textContent).toBe("This code has expired.");
    expect(screen.getByRole("button", { name: "Get a new code" })).toBeInTheDocument();
  });

  it("does not call a fresh code expired because this computer's clock is wrong", async () => {
    const { create } = setup();
    create.mockResolvedValue(code({ expiresAt: soon(-60_000) }));
    await openPanel();
    await pause(120);
    expect(screen.getByRole("img", { name: /QR code/ })).toBeInTheDocument();
    expect(screen.getByTestId("identity-handoff-countdown").textContent).toMatch(/expires in (10:00|9:5\d)$/);
  });

  it("offers a new code when this one was replaced or withdrawn", async () => {
    const { status } = setup();
    status.mockResolvedValue(standing("revoked"));
    await openPanel();
    expect(await screen.findByText("This code no longer works. Get a new code to continue on your phone.")).toBeInTheDocument();
    expect(screen.getByRole("button", { name: "Get a new code" })).toBeInTheDocument();
    expect(screen.getByRole("button", { name: "Back" })).toBeInTheDocument();
  });

  it("treats a hand-off the server no longer knows as one that no longer works", async () => {
    const { status } = setup();
    status.mockRejectedValue(new ApiError(404, { code: "not_found", message: "m" }, "x"));
    await openPanel();
    expect(await screen.findByText("This code no longer works. Get a new code to continue on your phone.")).toBeInTheDocument();
  });

  it("shows the locked stage when the phone used the last attempt", async () => {
    const { status } = setup();
    status.mockResolvedValue(standing("failed", 0));
    await openPanel();
    expect(await screen.findByText(LOCKED)).toBeInTheDocument();
    expect(screen.getByRole("heading", { name: "The identity check is closed for now" })).toHaveFocus();
    expect(screen.getByRole("button", { name: "Check again" })).toBeInTheDocument();
    expect(screen.queryByTestId("identity-handoff-panel")).toBeNull();
  });

  it("shows the locked stage when the server says the check is locked", async () => {
    const { status } = setup();
    status.mockRejectedValue(new ApiError(409, { code: "identity_check_locked", message: "m" }, "x"));
    await openPanel();
    expect(await screen.findByText(LOCKED)).toBeInTheDocument();
  });

  it("carries on over a passing failure to read the status", async () => {
    const { status } = setup();
    status.mockRejectedValueOnce(new ApiError(0, undefined, "offline")).mockResolvedValue(standing("opened"));
    await openPanel();
    await waitFor(() => {
      expect(screen.getByTestId("identity-handoff-status").textContent).toBe("Phone connected. Continue there.");
    });
    expect(screen.queryByRole("alert")).toBeNull();
  });
});

describe("when a code cannot be made", () => {
  it("shows the locked stage for 409 identity_check_locked", async () => {
    const { create } = setup();
    create.mockRejectedValue(new ApiError(409, { code: "identity_check_locked", message: "m" }, "x"));
    await agree();
    await userEvent.click(screen.getByRole("button", { name: "Use my phone instead" }));
    expect(await screen.findByText(LOCKED)).toBeInTheDocument();
  });

  it.each([
    "identity_check_not_required", "identity_check_unavailable",
  ])("re-reads the ceremony for 409 %s, as an attempt would", async refusal => {
    const { create, onReload } = setup();
    create.mockRejectedValue(new ApiError(409, { code: refusal, message: "m" }, "x"));
    await agree();
    await userEvent.click(screen.getByRole("button", { name: "Use my phone instead" }));
    await waitFor(() => { expect(onReload).toHaveBeenCalledTimes(1); });
    // The page did not move on: say why there is no code, and keep the way back.
    expect((await screen.findByRole("alert")).textContent)
      .toBe("Your phone cannot be used for this right now. Go back and continue on this computer.");
    await userEvent.click(screen.getByRole("button", { name: "Back" }));
    expect(screen.getByRole("heading", { name: "Your ID" })).toBeInTheDocument();
  });

  it("re-reads the ceremony when the server has no such route", async () => {
    const { create, onReload } = setup();
    create.mockRejectedValue(new ApiError(404, { code: "not_found", message: "m" }, "x"));
    await agree();
    await userEvent.click(screen.getByRole("button", { name: "Use my phone instead" }));
    await waitFor(() => { expect(onReload).toHaveBeenCalledTimes(1); });
  });

  it("says so in plain words otherwise, and lets them try again or go back", async () => {
    const { create } = setup();
    create.mockRejectedValueOnce(new ApiError(0, undefined, "offline")).mockResolvedValue(code());
    await agree();
    await userEvent.click(screen.getByRole("button", { name: "Use my phone instead" }));
    expect((await screen.findByRole("alert")).textContent)
      .toBe("Could not reach the server. Check your connection and try again.");
    expect(screen.getByRole("button", { name: "Back" })).toBeInTheDocument();
    await userEvent.click(screen.getByRole("button", { name: "Get a new code" }));
    expect(await screen.findByRole("img", { name: /QR code/ })).toBeInTheDocument();
  });
});

describe("when the status is read", () => {
  it("stops while the tab is hidden, and looks again at once when it comes back", async () => {
    const { status } = setup();
    await openPanel();
    await waitFor(() => { expect(status.mock.calls.length).toBeGreaterThanOrEqual(2); });

    const hidden = vi.spyOn(document, "hidden", "get").mockReturnValue(true);
    fireEvent(document, new Event("visibilitychange"));
    // A look already on its way may land; nothing new is asked after that.
    await pause(POLL_MS * 2);
    const whileHidden = status.mock.calls.length;
    await pause(POLL_MS * 6);
    expect(status.mock.calls.length).toBe(whileHidden);

    hidden.mockReturnValue(false);
    fireEvent(document, new Event("visibilitychange"));
    await waitFor(() => { expect(status.mock.calls.length).toBeGreaterThan(whileHidden); });
    hidden.mockRestore();
  });

  it("stops for good on unmount", async () => {
    const { status, unmount } = setup();
    await openPanel();
    await waitFor(() => { expect(status).toHaveBeenCalled(); });
    unmount();
    const calls = status.mock.calls.length;
    await new Promise(resolve => { setTimeout(resolve, POLL_MS * 6); });
    expect(status.mock.calls.length).toBe(calls);
  });

  it("is not started by a code that arrives after the participant has left", async () => {
    let hand: (value: IdentityHandoff) => void = () => undefined;
    const { create, status, unmount } = setup();
    create.mockImplementation(() => new Promise(resolve => { hand = resolve; }));
    await agree();
    await userEvent.click(screen.getByRole("button", { name: "Use my phone instead" }));
    expect(screen.getByText("Getting your code…")).toBeInTheDocument();
    unmount();
    hand(code());
    await new Promise(resolve => { setTimeout(resolve, POLL_MS * 4); });
    expect(status).not.toHaveBeenCalled();
  });

  it("waits about three seconds between looks unless told otherwise", async () => {
    const create = vi.fn<() => Promise<IdentityHandoff>>().mockImplementation(() => Promise.resolve(code()));
    const status = vi.fn<(handoffId: string) => Promise<IdentityHandoffStatus>>().mockResolvedValue(standing("waiting"));
    render(<IdentityCheckStep
      identityCheck={pending} documentTitle="Office Lease"
      submit={vi.fn<IdentityCheckStepProps["submit"]>()} onReload={vi.fn<IdentityCheckStepProps["onReload"]>()}
      handoff={{ create, status }}
    />);
    await agree();
    vi.useFakeTimers();
    try {
      // userEvent waits on a timer of its own, which a stopped clock never fires.
      // eslint-disable-next-line testing-library/prefer-user-event
      fireEvent.click(screen.getByRole("button", { name: "Use my phone instead" }));
      await act(async () => { await vi.advanceTimersByTimeAsync(0); });
      expect(screen.getByRole("img", { name: /QR code/ })).toBeInTheDocument();
      await act(async () => { await vi.advanceTimersByTimeAsync(2900); });
      expect(status).not.toHaveBeenCalled();
      await act(async () => { await vi.advanceTimersByTimeAsync(200); });
      expect(status).toHaveBeenCalledTimes(1);
      await act(async () => { await vi.advanceTimersByTimeAsync(3000); });
      expect(status).toHaveBeenCalledTimes(2);
    } finally {
      vi.useRealTimers();
    }
  });
});
