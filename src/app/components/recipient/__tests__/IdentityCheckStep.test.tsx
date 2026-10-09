// The identity check a sender may ask of a participant.
//
// Pinned here, in the order a participant meets them:
//
//   - nothing is asked for until they agree, and nothing but the kind of ID,
//     how the selfie was taken and that agreement is ever sent
//   - the camera is asked for from "Use my camera" and nowhere else, and is
//     let go after the capture, on cancel, when the tab is hidden and on
//     unmount
//   - a result made in TEST mode is never worded as a pass or a verification
//   - a failure says how many attempts are left; a lock says what happens now

import { describe, it, expect, vi, beforeEach, afterEach } from "vitest";
import { render, screen, waitFor, fireEvent, within } from "@testing-library/react";

/** The kinds of ID in a select, as its groups and the options under each. */
function groupsOf(select: HTMLElement): { label: string | null; options: (string | null)[] }[] {
  return within(select).getAllByRole("group").map(group => ({
    label: group.getAttribute("label"),
    options: within(group).getAllByRole("option").map(option => option.textContent),
  }));
}
import userEvent from "@testing-library/user-event";
import { IdentityCheckStep, type IdentityCheckStepProps } from "../IdentityCheckStep";
import { ApiError } from "../../../services/api-client";
import type { CeremonyIdentityCheck } from "../../../services/real/signing-access.service";

const ALL_ID_TYPES = [
  "philsys-national-id", "philippine-passport", "drivers-license", "umid", "sss-id", "gsis-ecard", "prc-id",
  "owwa-ofw-id", "seafarers-book", "postal-id", "voters-id", "senior-citizen-id", "pwd-id", "ibp-id",
  "government-office-id", "foreign-passport", "acr-icard",
];

const pending: CeremonyIdentityCheck = {
  required: true, status: "pending", mode: "test", attemptsRemaining: 3, verifiedAt: null, idTypes: ALL_ID_TYPES,
};

const image = (name = "id-front.jpg", type = "image/jpeg") => new File(["x".repeat(2048)], name, { type });

let createObjectURL: ReturnType<typeof vi.fn>;
let revokeObjectURL: ReturnType<typeof vi.fn>;

beforeEach(() => {
  let n = 0;
  createObjectURL = vi.fn(() => { n += 1; return `blob:test/${String(n)}`; });
  revokeObjectURL = vi.fn();
  Object.defineProperty(URL, "createObjectURL", { configurable: true, writable: true, value: createObjectURL });
  Object.defineProperty(URL, "revokeObjectURL", { configurable: true, writable: true, value: revokeObjectURL });
});

afterEach(() => {
  Reflect.deleteProperty(window.navigator, "mediaDevices");
  Reflect.deleteProperty(URL, "createObjectURL");
  Reflect.deleteProperty(URL, "revokeObjectURL");
});

function setup(overrides: Partial<IdentityCheckStepProps> = {}) {
  const submit = vi.fn<IdentityCheckStepProps["submit"]>()
    .mockResolvedValue({ outcome: "passed", attemptsRemaining: 3, status: "passed" });
  const onReload = vi.fn<IdentityCheckStepProps["onReload"]>().mockResolvedValue(null);
  const props: IdentityCheckStepProps = {
    identityCheck: pending, documentTitle: "Office Lease", submit, onReload, promptMs: 15, ...overrides,
  };
  const view = render(<IdentityCheckStep {...props} />);
  return { submit: props.submit as typeof submit, onReload: props.onReload as typeof onReload, props, ...view };
}

/** A camera whose tracks can be watched. */
function installCamera(getUserMedia?: ReturnType<typeof vi.fn>) {
  const track = { stop: vi.fn() };
  const stream = { getTracks: () => [track] };
  const request = getUserMedia ?? vi.fn(() => Promise.resolve(stream));
  Object.defineProperty(window.navigator, "mediaDevices", { configurable: true, value: { getUserMedia: request } });
  vi.spyOn(HTMLMediaElement.prototype, "play").mockResolvedValue(undefined);
  vi.spyOn(HTMLCanvasElement.prototype, "getContext")
    .mockReturnValue({ drawImage: vi.fn() } as unknown as CanvasRenderingContext2D);
  vi.spyOn(HTMLCanvasElement.prototype, "toDataURL").mockReturnValue("data:image/jpeg;base64,AAAA");
  return { track, getUserMedia: request };
}

async function agree() {
  await userEvent.click(screen.getByRole("checkbox", { name: /I agree to the use of my ID and selfie/ }));
  await userEvent.click(screen.getByRole("button", { name: "Continue" }));
}

async function giveId(idType = "umid") {
  await userEvent.selectOptions(screen.getByLabelText("Type of ID"), idType);
  await userEvent.upload(screen.getByLabelText("Front of the ID: choose a file"), image());
  await userEvent.click(screen.getByRole("button", { name: "Continue" }));
}

async function toFace(idType?: string) {
  await agree();
  await giveId(idType);
  await screen.findByRole("heading", { name: "Your face" });
}

async function uploadSelfie() {
  await userEvent.upload(screen.getByLabelText("Selfie: choose a file"), image("me.png", "image/png"));
  await screen.findByAltText("Your selfie");
}

describe("consent", () => {
  it("says why, what is collected, and holds Continue until the box is ticked", async () => {
    setup();
    expect(screen.getByRole("heading", { level: 1, name: "Identity check" })).toBeInTheDocument();
    expect(screen.getByText(/The sender asked that you confirm who you are before you sign/)).toBeInTheDocument();
    expect(screen.getByText("A photo of your ID")).toBeInTheDocument();
    expect(screen.getByText("A selfie")).toBeInTheDocument();
    expect(screen.getByText(/The result of the check/)).toBeInTheDocument();
    expect(screen.getByText(/In test mode nothing leaves this device/)).toBeInTheDocument();

    const next = screen.getByRole("button", { name: "Continue" });
    expect(next).toBeDisabled();
    await userEvent.click(screen.getByRole("checkbox", {
      name: "I agree to the use of my ID and selfie to verify my identity for this document.",
    }));
    expect(next).toBeEnabled();
  });

  it("shows where they are among the four stages", () => {
    setup();
    const rail = screen.getByRole("list", { name: "Identity check progress" });
    expect(within(rail).getAllByRole("listitem").map(item => item.textContent)).toEqual(
      ["1Consent", "2Your ID", "3Your face", "4Result"]);
    expect(within(rail).getByText("Consent")).toHaveAttribute("aria-current", "step");
    expect(within(rail).getByText("Your ID")).not.toHaveAttribute("aria-current");
  });

  it("keeps Decline to sign within reach where the page offers it, and not otherwise", async () => {
    const onDecline = vi.fn();
    const { unmount } = setup({ onDecline });
    await userEvent.click(screen.getByRole("button", { name: "Decline to sign" }));
    expect(onDecline).toHaveBeenCalledTimes(1);
    unmount();
    setup();
    expect(screen.queryByRole("button", { name: "Decline to sign" })).toBeNull();
  });

  it("moves focus to each stage's heading", async () => {
    setup();
    expect(screen.getByRole("heading", { name: "Before you start" })).toHaveFocus();
    await agree();
    expect(screen.getByRole("heading", { name: "Your ID" })).toHaveFocus();
  });
});

describe("your ID", () => {
  it("offers the server's kinds of ID, grouped, and only those", async () => {
    setup({ identityCheck: { ...pending, idTypes: ["umid", "philippine-passport", "acr-icard", "brand-new-id"] } });
    await agree();
    expect(groupsOf(screen.getByLabelText("Type of ID"))).toEqual([
      { label: "National and travel", options: ["Philippine Passport"] },
      { label: "Social security and employment", options: ["UMID (SSS / GSIS)"] },
      { label: "For foreign nationals", options: ["Alien Certificate of Registration (ACR I-Card)"] },
      { label: "Other", options: ["brand new id"] },
    ]);
  });

  it("groups the full list the way the sender's country expects", async () => {
    setup();
    await agree();
    const counts = groupsOf(screen.getByLabelText("Type of ID")).map(group => [group.label, group.options.length]);
    expect(counts).toEqual([
      ["National and travel", 3], ["Social security and employment", 6],
      ["Civil and sectoral", 6], ["For foreign nationals", 2],
    ]);
  });

  it("shows no photo boxes until a type of ID is chosen", async () => {
    setup();
    await agree();
    expect(screen.queryByRole("group", { name: /Front of the ID/ })).toBeNull();
    expect(screen.queryByRole("group", { name: /Back of the ID/ })).toBeNull();
    expect(screen.queryByText("JPEG, PNG or WebP, up to 8 MB.")).toBeNull();
    await userEvent.selectOptions(screen.getByLabelText("Type of ID"), "umid");
    expect(screen.getByRole("group", { name: /Front of the ID/ })).toBeInTheDocument();
    expect(screen.getByRole("group", { name: /Back of the ID/ })).toBeInTheDocument();
    // Going back to "Choose one" takes them away again.
    await userEvent.selectOptions(screen.getByLabelText("Type of ID"), "");
    expect(screen.queryByRole("group", { name: /Front of the ID/ })).toBeNull();
  });

  it("asks for the type first, then for the front, in plain words tied to their fields", async () => {
    setup();
    await agree();
    await userEvent.click(screen.getByRole("button", { name: "Continue" }));
    // Shown beside the field (and announced, which is why it is found by role).
    expect(screen.getByRole("alert")).toHaveTextContent("Choose the type of ID.");
    // The photo boxes are not there yet, so nothing is said about them.
    expect(screen.queryByText("Add a photo of the front of your ID.")).toBeNull();
    const select = screen.getByLabelText("Type of ID");
    expect(select).toHaveAttribute("aria-invalid", "true");
    expect(select).toHaveAccessibleDescription("Choose the type of ID.");
    expect(screen.getByRole("heading", { name: "Your ID" })).toBeInTheDocument();

    await userEvent.selectOptions(select, "umid");
    await userEvent.click(screen.getByRole("button", { name: "Continue" }));
    expect(screen.getByRole("alert")).toHaveTextContent("Add a photo of the front of your ID.");
    expect(screen.getByRole("heading", { name: "Your ID" })).toBeInTheDocument();
  });

  it("asks for no name, number or date", async () => {
    setup();
    await agree();
    expect(screen.queryByRole("textbox")).toBeNull();
    expect(screen.queryByRole("spinbutton")).toBeNull();
    expect(screen.queryByLabelText(/name|number|birth|expir/i)).toBeNull();
  });

  it("refuses a file that is not an image, and one over 8 MB", async () => {
    setup();
    await agree();
    await userEvent.selectOptions(screen.getByLabelText("Type of ID"), "umid");
    const input = screen.getByLabelText("Front of the ID: choose a file");
    // As a drop or a permissive picker would hand it over: `accept` is only a hint.
    const user = userEvent.setup({ applyAccept: false });
    await user.upload(input, new File(["%PDF"], "id.pdf", { type: "application/pdf" }));
    expect(screen.getByText("Use a JPEG, PNG or WebP image.")).toBeInTheDocument();
    expect(createObjectURL).not.toHaveBeenCalled();

    const big = image("huge.jpg");
    Object.defineProperty(big, "size", { value: 8 * 1024 * 1024 + 1 });
    await user.upload(input, big);
    expect(screen.getByText("This image is larger than 8 MB. Choose a smaller one.")).toBeInTheDocument();
    expect(screen.queryByAltText("Front of the ID preview")).toBeNull();
  });

  it("shows a preview with the name and size, and lets it be replaced or removed", async () => {
    setup();
    await agree();
    await userEvent.selectOptions(screen.getByLabelText("Type of ID"), "umid");
    const input = screen.getByLabelText("Front of the ID: choose a file");
    await userEvent.upload(input, image("front-one.jpg"));
    expect(screen.getByAltText("Front of the ID preview")).toHaveAttribute("src", "blob:test/1");
    expect(screen.getByText("front-one.jpg")).toBeInTheDocument();
    expect(screen.getByText(/2 KB/)).toBeInTheDocument();
    expect(screen.getByRole("button", { name: "Replace front of the id" })).toBeInTheDocument();

    // Replacing lets the old picture go.
    await userEvent.upload(input, image("front-two.webp", "image/webp"));
    expect(revokeObjectURL).toHaveBeenCalledWith("blob:test/1");
    expect(screen.getByText("front-two.webp")).toBeInTheDocument();

    await userEvent.click(screen.getByRole("button", { name: "Remove front of the id" }));
    expect(revokeObjectURL).toHaveBeenCalledWith("blob:test/2");
    expect(screen.queryByAltText("Front of the ID preview")).toBeNull();
  });

  it("asks for the back as optional, and not at all for a passport", async () => {
    setup();
    await agree();
    await userEvent.selectOptions(screen.getByLabelText("Type of ID"), "umid");
    expect(screen.getByRole("group", { name: /Back of the ID/ }).textContent).toContain("(optional)");
    await userEvent.upload(screen.getByLabelText("Back of the ID: choose a file"), image("back.jpg"));
    await userEvent.selectOptions(screen.getByLabelText("Type of ID"), "philippine-passport");
    expect(screen.queryByRole("group", { name: /Back of the ID/ })).toBeNull();
    // The back chosen for another ID is not kept around.
    expect(revokeObjectURL).toHaveBeenCalledWith("blob:test/1");
  });

  it("lets the pictures go when the screen goes away", async () => {
    const { unmount } = setup();
    await agree();
    await userEvent.selectOptions(screen.getByLabelText("Type of ID"), "umid");
    await userEvent.upload(screen.getByLabelText("Front of the ID: choose a file"), image());
    expect(revokeObjectURL).not.toHaveBeenCalled();
    unmount();
    expect(revokeObjectURL).toHaveBeenCalledWith("blob:test/1");
  });

  it("offers Take a photo on a touch device, using the rear camera", async () => {
    Object.defineProperty(window.navigator, "maxTouchPoints", { configurable: true, value: 5 });
    try {
      setup();
      await agree();
      await userEvent.selectOptions(screen.getByLabelText("Type of ID"), "umid");
      expect(screen.getAllByRole("button", { name: "Take a photo" }).length).toBeGreaterThan(0);
      expect(screen.getByLabelText("Front of the ID: take a photo")).toHaveAttribute("capture", "environment");
      // And the selfie upload opens the front camera there.
      await giveId();
      expect(screen.getByLabelText("Selfie: choose a file")).toHaveAttribute("capture", "user");
    } finally {
      Reflect.deleteProperty(window.navigator, "maxTouchPoints");
    }
  });

  it("offers no Take a photo, and no capture hint, on a desktop", async () => {
    setup();
    await agree();
    expect(screen.queryByRole("button", { name: "Take a photo" })).toBeNull();
    await giveId();
    expect(screen.getByLabelText("Selfie: choose a file")).not.toHaveAttribute("capture");
  });
});

describe("your face", () => {
  it("does not touch the camera until Use my camera is pressed", async () => {
    const { getUserMedia } = installCamera();
    setup();
    await toFace();
    expect(getUserMedia).not.toHaveBeenCalled();

    await userEvent.click(screen.getByRole("button", { name: "Use my camera" }));
    expect(getUserMedia).toHaveBeenCalledTimes(1);
    expect(getUserMedia).toHaveBeenCalledWith({ video: { facingMode: "user" }, audio: false });
  });

  it("gives the three prompts one at a time, takes one frame, and stops the camera", async () => {
    const { track } = installCamera();
    setup({ promptMs: 60 });
    await toFace();
    await userEvent.click(screen.getByRole("button", { name: "Use my camera" }));

    const seen: string[] = [];
    await waitFor(() => {
      const prompt = screen.queryByTestId("identity-check-prompt")?.textContent;
      if (prompt !== undefined && prompt !== null && seen.at(-1) !== prompt) seen.push(prompt);
      expect(screen.getByAltText("Your selfie")).toBeInTheDocument();
    }, { timeout: 3000, interval: 10 });
    expect(seen).toEqual([
      "Look straight at the camera", "Turn your head slowly to the left", "Blink twice",
    ]);
    expect(track.stop).toHaveBeenCalledTimes(1);
    expect(screen.getByAltText("Your selfie")).toHaveAttribute("src", "data:image/jpeg;base64,AAAA");
    // Side by side with the ID, and it can be taken again.
    expect(screen.getByAltText("Your ID")).toBeInTheDocument();
    expect(screen.getByRole("button", { name: "Retake" })).toBeInTheDocument();
    expect(screen.queryByLabelText("Camera preview")).toBeNull();
  });

  it("stops the camera on Cancel", async () => {
    const { track } = installCamera();
    setup({ promptMs: 60_000 });
    await toFace();
    await userEvent.click(screen.getByRole("button", { name: "Use my camera" }));
    await screen.findByLabelText("Camera preview");
    expect(track.stop).not.toHaveBeenCalled();
    await userEvent.click(screen.getByRole("button", { name: "Cancel" }));
    expect(track.stop).toHaveBeenCalledTimes(1);
    expect(screen.getByRole("button", { name: "Use my camera" })).toBeInTheDocument();
  });

  it("stops the camera on unmount", async () => {
    const { track } = installCamera();
    const { unmount } = setup({ promptMs: 60_000 });
    await toFace();
    await userEvent.click(screen.getByRole("button", { name: "Use my camera" }));
    await screen.findByLabelText("Camera preview");
    unmount();
    expect(track.stop).toHaveBeenCalledTimes(1);
  });

  it("stops the camera when the stage changes", async () => {
    const { track } = installCamera();
    setup({ promptMs: 60_000 });
    await toFace();
    await userEvent.click(screen.getByRole("button", { name: "Use my camera" }));
    await screen.findByLabelText("Camera preview");
    await userEvent.click(screen.getByRole("button", { name: "Back" }));
    expect(track.stop).toHaveBeenCalledTimes(1);
  });

  it("stops the camera when the tab is hidden, and when the page is put away", async () => {
    const { track } = installCamera();
    setup({ promptMs: 60_000 });
    await toFace();
    await userEvent.click(screen.getByRole("button", { name: "Use my camera" }));
    await screen.findByLabelText("Camera preview");

    const hidden = vi.spyOn(document, "hidden", "get").mockReturnValue(true);
    fireEvent(document, new Event("visibilitychange"));
    expect(track.stop).toHaveBeenCalledTimes(1);
    hidden.mockRestore();
    await screen.findByRole("button", { name: "Use my camera" });

    await userEvent.click(screen.getByRole("button", { name: "Use my camera" }));
    await screen.findByLabelText("Camera preview");
    fireEvent(window, new Event("pagehide"));
    expect(track.stop).toHaveBeenCalledTimes(2);
  });

  it("stops a camera that answers after the participant has left", async () => {
    const track = { stop: vi.fn() };
    let grant: (stream: unknown) => void = () => undefined;
    installCamera(vi.fn(() => new Promise(resolve => { grant = resolve; })));
    const { unmount } = setup();
    await toFace();
    await userEvent.click(screen.getByRole("button", { name: "Use my camera" }));
    unmount();
    grant({ getTracks: () => [track] });
    await waitFor(() => { expect(track.stop).toHaveBeenCalledTimes(1); });
  });

  it("says so when the camera is refused, and still offers the upload", async () => {
    installCamera(vi.fn(() => Promise.reject(new DOMException("denied", "NotAllowedError"))));
    setup();
    await toFace();
    await userEvent.click(screen.getByRole("button", { name: "Use my camera" }));
    expect((await screen.findByRole("alert")).textContent)
      .toBe("Camera access was not allowed. You can upload a selfie instead.");
    expect(screen.getByRole("button", { name: "Upload a selfie instead" })).toBeInTheDocument();
  });

  it("offers only the upload where there is no camera to ask", async () => {
    setup();
    await toFace();
    expect(screen.queryByRole("button", { name: "Use my camera" })).toBeNull();
    expect(screen.getByRole("button", { name: "Upload a selfie" })).toBeInTheDocument();
    expect(screen.getByRole("button", { name: "Check my identity" })).toBeDisabled();
    await uploadSelfie();
    expect(screen.getByRole("button", { name: "Check my identity" })).toBeEnabled();
  });
});

describe("the result", () => {
  it("sends the kind of ID, how the selfie was taken and the agreement, and nothing of the pictures", async () => {
    const { submit } = setup({ identityCheck: { ...pending, mode: "live" } });
    await toFace("drivers-license");
    await uploadSelfie();
    await userEvent.click(screen.getByRole("button", { name: "Check my identity" }));
    await screen.findByRole("heading", { name: "Identity check passed" });
    expect(submit).toHaveBeenCalledTimes(1);
    expect(submit).toHaveBeenCalledWith({ idType: "drivers-license", capture: "upload", consent: true });
  });

  it("records a camera capture as such", async () => {
    installCamera();
    const { submit } = setup();
    await toFace();
    await userEvent.click(screen.getByRole("button", { name: "Use my camera" }));
    await screen.findByAltText("Your selfie", undefined, { timeout: 3000 });
    await userEvent.click(screen.getByRole("button", { name: "Check my identity" }));
    await waitFor(() => { expect(submit).toHaveBeenCalledTimes(1); });
    expect(submit.mock.calls[0]?.[0]).toMatchObject({ capture: "camera", idType: "umid" });
  });

  it("shows Checking while the answer is on its way, and cannot be sent twice", async () => {
    let finish: (value: { outcome: "passed"; attemptsRemaining: number; status: "passed" }) => void = () => undefined;
    const submit = vi.fn<IdentityCheckStepProps["submit"]>(() => new Promise(resolve => { finish = resolve; }));
    setup({ submit });
    await toFace();
    await uploadSelfie();
    await userEvent.click(screen.getByRole("button", { name: "Check my identity" }));
    expect(screen.getByRole("heading", { name: "Checking…" })).toBeInTheDocument();
    expect(screen.queryByRole("button", { name: "Check my identity" })).toBeNull();
    expect(submit).toHaveBeenCalledTimes(1);
    finish({ outcome: "passed", attemptsRemaining: 3, status: "passed" });
    await screen.findByRole("heading", { name: "Identity check completed (test mode)" });
  });

  it("never words a test-mode result as a pass, and Continue re-reads the ceremony", async () => {
    const { submit, onReload } = setup();
    await toFace();
    await uploadSelfie();
    await userEvent.click(screen.getByRole("button", { name: "Check my identity" }));

    const heading = await screen.findByRole("heading", { name: "Identity check completed (test mode)" });
    expect(heading).toHaveFocus();
    expect(screen.getByText("This was a simulated check. No identity was verified.")).toBeInTheDocument();
    expect(screen.queryByText(/Identity check passed/)).toBeNull();
    expect(submit).toHaveBeenCalledWith({ idType: "umid", capture: "upload", consent: true, testOutcome: "pass" });
    expect(document.body.textContent).not.toMatch(/biometric/i);

    await userEvent.click(screen.getByRole("button", { name: "Continue" }));
    expect(onReload).toHaveBeenCalledTimes(1);
  });

  it("says Identity check passed only for a real check, with no test controls anywhere", async () => {
    setup({ identityCheck: { ...pending, mode: "live" } });
    expect(screen.queryByTestId("identity-check-test-banner")).toBeNull();
    expect(screen.queryByText(/In test mode/)).toBeNull();
    await toFace();
    expect(screen.queryByTestId("identity-check-test-panel")).toBeNull();
    expect(screen.queryByRole("radiogroup", { name: "Simulated result" })).toBeNull();
    await uploadSelfie();
    await userEvent.click(screen.getByRole("button", { name: "Check my identity" }));
    await screen.findByRole("heading", { name: "Identity check passed" });
    expect(screen.queryByText(/simulated/i)).toBeNull();
  });

  it("says how many attempts are left after a failure, and tries again with the same ID", async () => {
    const submit = vi.fn<IdentityCheckStepProps["submit"]>()
      .mockResolvedValue({ outcome: "failed", attemptsRemaining: 2, status: "pending" });
    setup({ submit });
    await toFace();
    await uploadSelfie();
    await userEvent.click(within(screen.getByRole("radiogroup", { name: "Simulated result" })).getByRole("radio", { name: "Fail" }));
    await userEvent.click(screen.getByRole("button", { name: "Check my identity" }));

    await screen.findByRole("heading", { name: "We could not complete the identity check" });
    expect(submit).toHaveBeenCalledWith({ idType: "umid", capture: "upload", consent: true, testOutcome: "fail" });
    expect(screen.getByTestId("identity-check-attempts-left").textContent).toBe("2 attempts left");
    expect(screen.getByText(/blurry, dark or cut off/)).toBeInTheDocument();

    await userEvent.click(screen.getByRole("button", { name: "Try again" }));
    expect(screen.getByRole("heading", { name: "Your face" })).toHaveFocus();
    // A new selfie is asked for; the ID is still there.
    expect(screen.queryByAltText("Your selfie")).toBeNull();
    await userEvent.click(screen.getByRole("button", { name: "Back" }));
    expect(screen.getByText("id-front.jpg")).toBeInTheDocument();
    expect(screen.getByLabelText("Type of ID")).toHaveValue("umid");
  });

  it("says 1 attempt left in the singular", async () => {
    setup({ submit: vi.fn<IdentityCheckStepProps["submit"]>().mockResolvedValue({ outcome: "failed", attemptsRemaining: 1, status: "pending" }) });
    await toFace();
    await uploadSelfie();
    await userEvent.click(screen.getByRole("button", { name: "Check my identity" }));
    expect((await screen.findByTestId("identity-check-attempts-left")).textContent).toBe("1 attempt left");
  });

  it("explains a plain refusal on the same screen and lets them try again", async () => {
    const submit = vi.fn<IdentityCheckStepProps["submit"]>()
      .mockRejectedValue(new ApiError(429, { code: "rate_limited", message: "slow down" }, "x"));
    setup({ submit });
    await toFace();
    await uploadSelfie();
    await userEvent.click(screen.getByRole("button", { name: "Check my identity" }));
    expect((await screen.findByRole("alert")).textContent).toBe("Too many tries in a short time. Wait a minute, then try again.");
    expect(screen.getByRole("button", { name: "Check my identity" })).toBeEnabled();
  });
});

describe("locked", () => {
  const LOCKED = "The identity check could not be completed. The sender has been told and can let you "
    + "continue another way. You can come back to this link later.";

  it("says what happens now, and Check again re-reads the ceremony", async () => {
    const { onReload } = setup({ identityCheck: { ...pending, status: "locked", attemptsRemaining: 0 } });
    expect(screen.getByText(LOCKED)).toBeInTheDocument();
    expect(screen.queryByRole("button", { name: "Continue" })).toBeNull();
    await userEvent.click(screen.getByRole("button", { name: "Check again" }));
    expect(onReload).toHaveBeenCalledTimes(1);
    // Still locked: say that nothing changed rather than nothing at all.
    expect((await screen.findByTestId("identity-check-recheck-note")).textContent)
      .toBe("Nothing has changed yet. You can try again later.");
  });

  it("locks when the last attempt fails", async () => {
    setup({ submit: vi.fn<IdentityCheckStepProps["submit"]>().mockResolvedValue({ outcome: "failed", attemptsRemaining: 0, status: "locked" }) });
    await toFace();
    await uploadSelfie();
    await userEvent.click(screen.getByRole("button", { name: "Check my identity" }));
    expect(await screen.findByText(LOCKED)).toBeInTheDocument();
    expect(screen.getByRole("button", { name: "Check again" })).toBeInTheDocument();
  });

  it("locks when the server says the allowance is spent", async () => {
    setup({ submit: vi.fn<IdentityCheckStepProps["submit"]>().mockRejectedValue(new ApiError(409, { code: "identity_check_locked", message: "m" }, "x")) });
    await toFace();
    await uploadSelfie();
    await userEvent.click(screen.getByRole("button", { name: "Check my identity" }));
    expect(await screen.findByText(LOCKED)).toBeInTheDocument();
  });

  it("re-reads the ceremony when the sender allowed another way meanwhile", async () => {
    const { onReload } = setup({
      submit: vi.fn<IdentityCheckStepProps["submit"]>().mockRejectedValue(new ApiError(409, { code: "identity_check_not_required", message: "m" }, "x")),
    });
    await toFace();
    await uploadSelfie();
    await userEvent.click(screen.getByRole("button", { name: "Check my identity" }));
    await waitFor(() => { expect(onReload).toHaveBeenCalledTimes(1); });
    expect(screen.queryByRole("alert")).toBeNull();
  });
});

describe("test mode", () => {
  it("carries the banner on every stage", async () => {
    const BANNER = "Test mode: this identity check is simulated.";
    const submit = vi.fn<IdentityCheckStepProps["submit"]>()
      .mockResolvedValue({ outcome: "failed", attemptsRemaining: 2, status: "pending" });
    const { unmount } = setup({ submit });
    expect(screen.getByTestId("identity-check-test-banner").textContent).toBe(BANNER);
    await agree();
    expect(screen.getByTestId("identity-check-test-banner").textContent).toBe(BANNER);
    await giveId();
    expect(screen.getByTestId("identity-check-test-banner").textContent).toBe(BANNER);
    expect(screen.getByTestId("identity-check-test-panel")).toBeInTheDocument();
    await uploadSelfie();
    await userEvent.click(screen.getByRole("button", { name: "Check my identity" }));
    await screen.findByRole("heading", { name: "We could not complete the identity check" });
    expect(screen.getByTestId("identity-check-test-banner").textContent).toBe(BANNER);
    expect(screen.getByTestId("identity-check-test-panel")).toBeInTheDocument();
    unmount();

    setup({ identityCheck: { ...pending, status: "locked", attemptsRemaining: 0 } });
    expect(screen.getByTestId("identity-check-test-banner").textContent).toBe(BANNER);
  });
});
