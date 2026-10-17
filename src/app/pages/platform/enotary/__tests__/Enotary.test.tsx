// LAGDA eNotary inside the app: the entry, the identity gate, the preview of
// the environment, and the page the partner sends the browser back to.
//
// Pinned here:
//
//   - the entry says honestly that the notarial session is not open yet, and
//     offers the two ways in; where eNotary is not offered it offers nothing
//   - the gate shows exactly what the server asks for, for a client and for a
//     notary: approval, the ID, a face check, a profile name, or nothing
//   - a face check that is not passed moves to the ID, and says why
//   - the environment opens only with a grant, names the eight steps with
//     the first current, says it is a preview, and says when access has ended
//   - nothing here simulates a lawyer, a call or a notarized document

import { describe, it, expect, vi, beforeEach, afterEach } from "vitest";
import { act, fireEvent, render, screen, within } from "@testing-library/react";
import { MemoryRouter, Routes, Route, useLocation } from "react-router";

vi.mock("../../../../services/backend-flag", () => ({ USE_REAL_BACKEND: true, API_BASE_URL: "http://api.test" }));

const platform = { sessionStatus: "authenticated" as string, user: { id: "u1", displayName: "Ana", fullName: "Ana Reyes" } };
vi.mock("../../../../context/PlatformContext", () => ({ usePlatform: () => platform }));

const read = vi.fn();
const startSession = vi.fn();
const refresh = vi.fn();
vi.mock("../../../../services/real/enotary-access.service", async (original) => ({
  ...(await original<typeof import("../../../../services/real/enotary-access.service")>()),
  realEnotaryAccessService: {
    read: (...args: unknown[]) => read(...args) as unknown,
    startSession: (...args: unknown[]) => startSession(...args) as unknown,
    refresh: (...args: unknown[]) => refresh(...args) as unknown,
  },
}));

import { EnotaryAccessPage } from "../EnotaryAccessPage";
import { EnotarySessionPage } from "../EnotarySessionPage";
import { EnotaryReturnPage } from "../../identity/ProviderReturnPage";
import { ApiError } from "../../../../services/api-client";
import { resetAccountFeatures } from "../../../../hooks/useAccountFeatures";
import type { EnotaryAccess } from "../../../../services/real/enotary-access.service";
import type { ProviderTab } from "../../../../components/identity/provider-session";
import {
  ENOTARY_ROLE_STORAGE_KEY, identityWhenLabel, providerReturned, providerReturnState, type EnotaryRole,
} from "../../../../models/identity-check";
import { getRouteMeta } from "../../../../config/routes";

const PARTNER_URL = "https://verify.partner.example/session/enotary";
const AGREE = "I agree to the use of my ID and selfie to verify my identity for LAGDA eNotary.";
const NOW = Date.parse("2026-10-12T02:00:00.000Z");
const UNTIL = "2026-10-12T04:00:00.000Z";
const STEPS = [
  "Lawyer selected", "Verify your identity", "Lawyer joins", "Video call", "Your document",
  "Finalized for eNotary", "Notarized", "Certified True Copy",
];
const ROLES: readonly EnotaryRole[] = ["client", "attorney"];

const access = (role: EnotaryRole, over: Partial<EnotaryAccess> = {}): EnotaryAccess => ({
  available: true, role, attorneyApproved: role === "attorney" ? true : null,
  account: { status: "unverified", verifiedName: null, validUntil: null },
  required: "full", granted: false, grantedUntil: null, pendingReview: false, nameMatchesProfile: null, ...over,
});

const granted = (role: EnotaryRole, over: Partial<EnotaryAccess> = {}): EnotaryAccess => access(role, {
  account: { status: "verified", verifiedName: "Ana Maria Reyes", validUntil: "2027-10-12T02:00:00.000Z" },
  required: "none", granted: true, grantedUntil: UNTIL, nameMatchesProfile: "match", ...over,
});

const refusal = (status: number, code: string) =>
  new ApiError(status, { code, message: `server said ${code}` }, `server said ${code}`);

const tab = { go: vi.fn<ProviderTab["go"]>(), close: vi.fn<ProviderTab["close"]>() };
const openTab = vi.fn<() => ProviderTab | null>(() => tab);
const navigate = vi.fn<(url: string) => void>();

function Elsewhere({ name }: { name: string }) {
  const location = useLocation();
  return <div data-testid="elsewhere">{name}|{location.pathname}{location.search}|{String(providerReturned(location.state))}</div>;
}

/** The real pages at their own addresses; `stub` replaces one with a marker of where the router went. */
function renderAt(entry: string | { pathname: string; search?: string; state?: unknown }, stub: readonly string[] = []) {
  const real = (path: string, element: React.ReactElement, name: string) =>
    <Route path={path} element={stub.includes(name) ? <Elsewhere name={name} /> : element} />;
  return render(
    <MemoryRouter initialEntries={[entry]}>
      <Routes>
        {real("/app/enotary/access", <EnotaryAccessPage openTab={openTab} navigate={navigate} touch={false} />, "gate")}
        {real("/app/enotary/session", <EnotarySessionPage />, "session")}
        <Route path="/app/enotary/return" element={<EnotaryReturnPage />} />
        <Route path="/app/settings/profile" element={<Elsewhere name="profile" />} />
        <Route path="/app/dashboard" element={<Elsewhere name="dashboard" />} />
        <Route path="/sign-in" element={<Elsewhere name="sign-in" />} />
      </Routes>
    </MemoryRouter>,
  );
}

async function pass(ms: number) {
  await act(async () => { await vi.advanceTimersByTimeAsync(ms); });
}

/** A click that does not wait on a timer: this file runs on a held clock. */
function press(element: HTMLElement) {
  // eslint-disable-next-line testing-library/prefer-user-event
  fireEvent.click(element);
}

const h1 = (name: string) => screen.getByRole("heading", { level: 1, name });
const h2 = (name: string) => screen.getByRole("heading", { level: 2, name });
const button = (name: string | RegExp) => screen.getByRole("button", { name });
const text = (testId: string) => (screen.getByTestId(testId).textContent ?? "").replace(/\s+/g, " ").trim();
const elsewhere = () => screen.getByTestId("elsewhere").textContent ?? "";

async function openGate(role: EnotaryRole, first: EnotaryAccess | null, state?: unknown) {
  read.mockResolvedValue(first);
  const view = renderAt({ pathname: "/app/enotary/access", search: `?role=${role}`, state }, ["session"]);
  await pass(0);
  return view;
}

async function agreeAndPress(name: string) {
  press(screen.getByRole("checkbox", { name: AGREE }));
  press(button(name));
  await pass(0);
}

beforeEach(() => {
  vi.useFakeTimers();
  vi.setSystemTime(NOW);
  resetAccountFeatures();
  platform.sessionStatus = "authenticated";
  for (const mock of [read, startSession, refresh]) mock.mockReset();
  for (const mock of [openTab, navigate, tab.go, tab.close]) mock.mockClear();
  startSession.mockResolvedValue({ url: PARTNER_URL, expiresAt: "2026-10-12T03:00:00.000Z", kind: "full" });
  window.sessionStorage.clear();
});

afterEach(() => { vi.useRealTimers(); });

// A client is sent on to the static Notary Directory on this same site (a
// plain link, so a full page load, carrying nothing about the person). The
// notary's desk is not published, so a notary public is offered nothing.
function expectNextStep(role: EnotaryRole): void {
  if (role === "attorney") {
    expect(screen.queryByTestId("enotary-next")).toBeNull();
    expect(screen.queryByText(/notary desk/i)).toBeNull();
    return;
  }
  const link = screen.getByRole("link", { name: "Go to the Notary Directory" });
  expect(link).toHaveAttribute("href", "/enotary-directory/");
  expect(screen.getByTestId("enotary-next").textContent ?? "").toContain("eNotary sessions are not open yet.");
}

describe.each(ROLES)("/app/enotary/access for a %s", (role) => {
  const roleLabel = role === "attorney" ? "Notary public" : "Client";

  it("asks the server about that role, remembers it for the way back, and says whose gate it is", async () => {
    await openGate(role, access(role));
    expect(read).toHaveBeenCalledWith(role);
    expect(window.sessionStorage.getItem(ENOTARY_ROLE_STORAGE_KEY)).toBe(role);
    expect(h1("LAGDA eNotary")).toBeInTheDocument();
    expect(screen.getByText(roleLabel)).toBeInTheDocument();
    expect(screen.getByTestId("enotary-back")).toHaveAttribute("href", "/app/enotary");
  });

  it("full: explains, says what is kept, and verifies with the ID through to a grant", async () => {
    await openGate(role, access(role));
    expect(h2("Verify your identity")).toBeInTheDocument();
    expect(screen.getByText(/Before you enter LAGDA eNotary, we need to verify who you are with a valid ID and a face\s+check\./)).toBeInTheDocument();
    expect(text("enotary-kept-note")).toBe(
      "Our partner checks your ID and selfie. LAGDA keeps the name shown on your ID, and the result of the check. "
      + "It does not keep your ID number, your photo, or the image of your ID. "
      + "A later face check compares your face with this verification, which our verification partner keeps.",
    );
    expect(screen.queryByTestId("enotary-face-declined")).toBeNull();
    expect(button("Verify my identity")).toBeDisabled();
    refresh.mockResolvedValue(access(role));
    await agreeAndPress("Verify my identity");
    expect(startSession).toHaveBeenCalledWith(role);
    expect(tab.go).toHaveBeenCalledWith(PARTNER_URL);
    expect(h2("Finish the verification in the new tab")).toHaveFocus();
    await pass(3_000);
    expect(refresh).toHaveBeenCalledWith(role);
    expect(refresh).toHaveBeenCalledTimes(1);

    refresh.mockResolvedValue(granted(role));
    await pass(3_000);
    expect(h2("Identity confirmed")).toHaveFocus();
    expect(text("enotary-granted-until")).toBe(`Identity confirmed. You can enter until ${identityWhenLabel(UNTIL) ?? ""}.`);
    expect(screen.getByRole("link", { name: "Enter eNotary" })).toHaveAttribute("href", `/app/enotary/session?role=${role}`);
    expectNextStep(role);
    await pass(30_000);
    expect(refresh).toHaveBeenCalledTimes(2);
  });

  it("face: asks only to confirm it is you, and waits on the face check", async () => {
    await openGate(role, access(role, { required: "face", account: { status: "verified", verifiedName: "Ana Maria Reyes", validUntil: null } }));
    expect(h2("Confirm it is you")).toBeInTheDocument();
    expect(screen.getByText("You verified your identity before. This time we only need a quick face check, with no ID. It takes a few seconds.")).toBeInTheDocument();
    expect(text("enotary-phone-notice")).toBe("Have your phone ready. You will scan a code and take a short selfie with your phone.");
    expect(screen.queryByTestId("enotary-kept-note")).toBeNull();
    expect(button("Continue to face check")).toBeDisabled();
    startSession.mockResolvedValue({ url: PARTNER_URL, expiresAt: "", kind: "face" });
    refresh.mockResolvedValue(access(role, { required: "face" }));
    await agreeAndPress("Continue to face check");
    expect(startSession).toHaveBeenCalledWith(role);
    expect(h2("Finish the face check in the new tab")).toHaveFocus();
    refresh.mockResolvedValue(granted(role));
    await pass(3_000);
    expect(h2("Identity confirmed")).toBeInTheDocument();
  });

  it("a face check that is not passed moves to the ID, and says why", async () => {
    await openGate(role, access(role, { required: "face" }));
    startSession.mockResolvedValue({ url: PARTNER_URL, expiresAt: "", kind: "face" });
    refresh.mockResolvedValue(access(role, { required: "face" }));
    await agreeAndPress("Continue to face check");
    refresh.mockResolvedValue(access(role, { required: "full" }));
    await pass(3_000);
    expect(h2("Verify your identity")).toHaveFocus();
    expect(text("enotary-face-declined")).toBe("We could not confirm it is you from the face check. Verify with your ID instead.");
    // A fresh agreement for the ID, and nothing more asked of the partner meanwhile.
    expect(screen.getByRole("checkbox", { name: AGREE })).not.toBeChecked();
    expect(button("Verify my identity")).toBeDisabled();
    const asked = refresh.mock.calls.length;
    await pass(30_000);
    expect(refresh).toHaveBeenCalledTimes(asked);
  });

  it("says a full check was not passed, with the usual causes, and ignores that word on the next visit", async () => {
    await openGate(role, access(role));
    refresh.mockResolvedValue(access(role, { lastOutcome: null }));
    await agreeAndPress("Verify my identity");
    await pass(3_000);
    expect(h2("Finish the verification in the new tab")).toBeInTheDocument();
    refresh.mockResolvedValue(access(role, { lastOutcome: "declined" }));
    await pass(3_000);
    expect(h2("We could not verify your identity")).toHaveFocus();
    expect(screen.getByText("This usually happens when:")).toBeInTheDocument();
    expect(screen.queryByTestId("enotary-face-declined")).toBeNull();
    // Try again: the server may go on saying "declined" about the old visit.
    press(button("Try again"));
    await pass(0);
    expect(startSession).toHaveBeenCalledTimes(2);
    await pass(6_000);
    expect(h2("Finish the verification in the new tab")).toBeInTheDocument();
    refresh.mockResolvedValueOnce(access(role, { lastOutcome: null }));
    await pass(3_000);
    await pass(3_000);
    expect(h2("We could not verify your identity")).toBeInTheDocument();
  });

  it("shows the profile-name state when a visit is refused because the names do not match", async () => {
    await openGate(role, access(role));
    startSession.mockRejectedValueOnce(refusal(409, "enotary_profile_name_mismatch"));
    read.mockResolvedValue(access(role, { required: "profile-name", account: { status: "verified", verifiedName: "Ana Maria Reyes", validUntil: null } }));
    await agreeAndPress("Verify my identity");
    expect(read).toHaveBeenCalledTimes(2);
    expect(screen.getByTestId("enotary-profile-name")).toBeInTheDocument();
    expect(screen.queryByRole("alert")).toBeNull();
  });

  it.each([["face" as const, "Confirm it is you"], ["full" as const, "Verify your identity"]])(
    "after the profile name is corrected, Check again moves to the %s check with no error", async (required, title) => {
      await openGate(role, access(role, { required: "profile-name", account: { status: "verified", verifiedName: "Ana Maria Reyes", validUntil: null } }));
      read.mockResolvedValue(access(role, { required, nameMatchesProfile: required === "full" ? null : "match" }));
      press(button("Check again"));
      await pass(0);
      expect(h2(title)).toHaveFocus();
      expect(screen.queryByRole("alert")).toBeNull();
      expect(screen.queryByTestId("enotary-recheck-note")).toBeNull();
      expect(screen.getByRole("checkbox", { name: AGREE })).not.toBeChecked();
      expect(refresh).not.toHaveBeenCalled();
    });

  it("does not blame a face check when the server opened the full check after all", async () => {
    await openGate(role, access(role, { required: "face" }));
    // Asked for a face check; the server opened the full one and now says so.
    refresh.mockResolvedValue(access(role, { required: "full" }));
    await agreeAndPress("Continue to face check");
    expect(h2("Finish the verification in the new tab")).toBeInTheDocument();
    await pass(3_000);
    expect(h2("Finish the verification in the new tab")).toBeInTheDocument();
    expect(screen.queryByTestId("enotary-face-declined")).toBeNull();
  });

  it("profile-name: says whose name does not match, links to the profile, and checks again", async () => {
    const stuck = access(role, { required: "profile-name", nameMatchesProfile: "mismatch", account: { status: "verified", verifiedName: "Ana Maria Reyes", validUntil: null } });
    await openGate(role, stuck);
    expect(screen.getByTestId("enotary-profile-name").textContent ?? "").toMatch(
      /The name on your ID \(Ana Maria Reyes\) does not match the name on your profile\.\s+Update your profile name, then come back\./,
    );
    expect(screen.getByRole("link", { name: "Open profile settings" })).toHaveAttribute("href", "/app/settings/profile");
    expect(screen.queryByRole("checkbox")).toBeNull();
    expect(read).toHaveBeenCalledTimes(1);
    press(button("Check again"));
    await pass(0);
    expect(read).toHaveBeenCalledTimes(2);
    expect(text("enotary-recheck-note")).toBe("Nothing has changed yet.");
    read.mockResolvedValue(granted(role));
    press(button("Check again"));
    await pass(0);
    expect(h2("Identity confirmed")).toBeInTheDocument();
    expect(startSession).not.toHaveBeenCalled();
    expect(refresh).not.toHaveBeenCalled();
  });

  it.each([
    ["granted", granted(role)],
    ["nothing is required", granted(role, { granted: false, required: "none" })],
  ])("none: says identity is confirmed and until when, with the way in (%s)", async (_why, first) => {
    await openGate(role, first);
    expect(text("enotary-granted-until")).toBe(`Identity confirmed. You can enter until ${identityWhenLabel(UNTIL) ?? ""}.`);
    expect(screen.getByRole("link", { name: "Enter eNotary" })).toHaveAttribute("href", `/app/enotary/session?role=${role}`);
    expect(screen.queryByRole("checkbox")).toBeNull();
    expect(screen.queryByRole("button")).toBeNull();
  });

  it("says it is not available when a visit cannot be opened, and too many tries on a 429", async () => {
    await openGate(role, access(role));
    startSession.mockRejectedValueOnce(refusal(409, "identity_check_unavailable"));
    await agreeAndPress("Verify my identity");
    expect(tab.close).toHaveBeenCalledTimes(1);
    expect(h2("Identity verification is not available right now")).toBeInTheDocument();
    expect(document.body.textContent ?? "").not.toMatch(/server said/);
    startSession.mockRejectedValueOnce(refusal(429, "rate_limited"));
    press(button("Try again"));
    await pass(0);
    expect(screen.getByRole("alert").textContent ?? "").toContain("Too many tries in a short time. Wait a minute, then try again.");
  });

  it("reads the access again when the server says no check is wanted after all", async () => {
    await openGate(role, access(role));
    startSession.mockRejectedValueOnce(refusal(409, "enotary_access_not_required"));
    read.mockResolvedValue(granted(role));
    await agreeAndPress("Verify my identity");
    expect(read).toHaveBeenCalledTimes(2);
    expect(h2("Identity confirmed")).toBeInTheDocument();
    expect(screen.queryByRole("alert")).toBeNull();
  });

  it("starts asking at once when the person has just come back from the partner", async () => {
    refresh.mockResolvedValue(granted(role));
    await openGate(role, access(role), providerReturnState(NOW));
    expect(refresh).toHaveBeenCalledWith(role);
    expect(startSession).not.toHaveBeenCalled();
    expect(h2("Identity confirmed")).toBeInTheDocument();
  });

  it("shows nothing but 'not available' where eNotary is not offered", async () => {
    await openGate(role, null);
    expect(screen.getByText("Not available on this account yet.")).toBeInTheDocument();
    expect(screen.queryByRole("checkbox")).toBeNull();
    expect(screen.queryByRole("button")).toBeNull();
  });
});

describe("/app/enotary/access for a notary who is not approved", () => {
  it("says so, and offers nothing but the way back", async () => {
    await openGate("attorney", access("attorney", { attorneyApproved: false, required: "attorney-approval" }));
    expect(text("enotary-attorney-approval")).toBe(
      "Not yet approved to notarizeYour account is not yet approved to notarize on LAGDA. Approval of notaries is not open yet.",
    );
    expect(screen.queryByRole("button")).toBeNull();
    expect(screen.queryByRole("checkbox")).toBeNull();
    expect(screen.getAllByRole("link").map(link => link.getAttribute("href"))).toEqual(["/app/enotary"]);
    expect(startSession).not.toHaveBeenCalled();
  });

  it("reads the access again when the server refuses a visit for want of approval", async () => {
    await openGate("attorney", access("attorney"));
    startSession.mockRejectedValueOnce(refusal(409, "enotary_attorney_not_approved"));
    read.mockResolvedValue(access("attorney", { attorneyApproved: false, required: "attorney-approval" }));
    await agreeAndPress("Verify my identity");
    expect(screen.getByTestId("enotary-attorney-approval")).toBeInTheDocument();
  });
});

describe("/app/enotary/access without a believable role", () => {
  it("is the client's gate", async () => {
    read.mockResolvedValue(access("client"));
    renderAt("/app/enotary/access?role=admin");
    await pass(0);
    expect(read).toHaveBeenCalledWith("client");
    expect(screen.getByText("Client")).toBeInTheDocument();
  });
});

// ── The environment ──────────────────────────────────────────────────────────

describe.each(ROLES)("/app/enotary/session for a %s", (role) => {
  const roleLabel = role === "attorney" ? "Notary public" : "Client";

  async function openSession(first: EnotaryAccess | null) {
    read.mockResolvedValue(first);
    const view = renderAt(`/app/enotary/session?role=${role}`, ["gate"]);
    await pass(0);
    return view;
  }

  it("reads the access again, and with a grant shows the preview shell", async () => {
    await openSession(granted(role));
    expect(read).toHaveBeenCalledWith(role);
    expect(h1("LAGDA eNotary")).toBeInTheDocument();
    const rail = screen.getByRole("list", { name: "eNotary steps" });
    const items = within(rail).getAllByRole("listitem");
    expect(items.map(item => (item.textContent ?? "").replace(/^[\d✓]+/, ""))).toEqual(STEPS);
    // The first step is the current one; none is marked done.
    const current = rail.querySelectorAll('[aria-current="step"]');
    expect(current).toHaveLength(1);
    expect(current[0]?.textContent ?? "").toContain("Lawyer selected");
    expect(rail.textContent ?? "").not.toContain("✓");

    expect(text("enotary-preview-notice")).toBe(
      "Preview. The notarial session (choosing a lawyer, the video call, the document and notarization) is not available yet.",
    );
    const shell = screen.getByTestId("enotary-session");
    expect(shell.textContent ?? "").toContain(roleLabel);
    expect(shell.textContent ?? "").toContain("Ana Maria Reyes");
    expect(shell.textContent ?? "").toContain(`Access valid until ${identityWhenLabel(UNTIL) ?? ""}`);
    expectNextStep(role);
    // No fake functionality: nothing to press, play or join.
    expect(screen.queryByRole("button")).toBeNull();
    expect(document.querySelector("video, audio, iframe, canvas")).toBeNull();
  });

  it.each([
    ["no grant", access(role, { required: "full" })],
    ["only a face check away", access(role, { required: "face" })],
    ["a grant that has already run out", granted(role, { grantedUntil: "2026-10-12T01:00:00.000Z" })],
    ["approval removed, even with time left", granted(role, { required: "attorney-approval", granted: false, attorneyApproved: false })],
    ["a stale `granted` beside removed approval", granted(role, { required: "attorney-approval" })],
  ])("sends them to the gate with %s", async (_why, first) => {
    await openSession(first);
    expect(elsewhere()).toBe(`gate|/app/enotary/access?role=${role}|false`);
    expect(screen.queryByTestId("enotary-session")).toBeNull();
  });

  it("says when access has ended while the page is open, with the way back to the gate", async () => {
    await openSession(granted(role));
    expect(screen.getByTestId("enotary-session")).toBeInTheDocument();
    await pass(Date.parse(UNTIL) - NOW - 1);
    expect(screen.getByTestId("enotary-session")).toBeInTheDocument();
    await pass(1);
    expect(screen.queryByTestId("enotary-session")).toBeNull();
    expect(h2("Your access has ended")).toHaveFocus();
    expect(screen.getByText("Your access has ended. Confirm it is you again.")).toBeInTheDocument();
    expect(screen.getByRole("link", { name: "Confirm it is you" })).toHaveAttribute("href", `/app/enotary/access?role=${role}`);
    expect(screen.queryByRole("list", { name: "eNotary steps" })).toBeNull();
  });

  it("shows that the person is verified, without a name, where the ID's name could not be read", async () => {
    await openSession(granted(role, { account: { status: "verified", verifiedName: null, validUntil: null }, nameMatchesProfile: null }));
    const shell = screen.getByTestId("enotary-session");
    expect(shell.textContent ?? "").toContain("IdentityVerified");
    expect(shell.textContent ?? "").not.toMatch(/Not available|null/);
  });

  it("reads the access again every minute, and sends them to the gate when the grant is taken away", async () => {
    await openSession(granted(role));
    expect(read).toHaveBeenCalledTimes(1);
    await pass(60_000);
    expect(read).toHaveBeenCalledTimes(2);
    expect(screen.getByTestId("enotary-session")).toBeInTheDocument();
    // Still within the time once given, but no longer granted.
    read.mockResolvedValue(access(role, { required: "attorney-approval", attorneyApproved: false, granted: false, grantedUntil: UNTIL }));
    await pass(60_000);
    expect(elsewhere()).toBe(`gate|/app/enotary/access?role=${role}|false`);
  });

  it("keeps the environment open through a re-read that fails", async () => {
    await openSession(granted(role));
    read.mockRejectedValue(refusal(0, "network"));
    await pass(180_000);
    expect(screen.getByTestId("enotary-session")).toBeInTheDocument();
  });

  it("notices the end when the tab comes back after its timer slept", async () => {
    await openSession(granted(role));
    vi.setSystemTime(Date.parse(UNTIL) + 1_000);
    act(() => { window.dispatchEvent(new Event("focus")); });
    expect(h2("Your access has ended")).toBeInTheDocument();
  });

  it("shows nothing but 'not available' where eNotary is not offered", async () => {
    await openSession(null);
    expect(screen.getByText("Not available on this account yet.")).toBeInTheDocument();
    expect(screen.queryByTestId("enotary-session")).toBeNull();
  });
});

// ── The way back from the partner ────────────────────────────────────────────

describe("/app/enotary/return", () => {
  const QUERY = "?verificationSessionId=vs_SECRET123&status=Approved";

  function arriveBack() {
    window.history.replaceState(null, "", `/app/enotary/return${QUERY}`);
    return renderAt(`/app/enotary/return${QUERY}`, ["gate"]);
  }

  afterEach(() => { window.history.replaceState(null, "", "/"); });

  it.each(ROLES)("strips the partner's values and routes back to the %s gate, saying they just came back", (role) => {
    window.sessionStorage.setItem(ENOTARY_ROLE_STORAGE_KEY, role);
    arriveBack();
    expect(window.location.search).toBe("");
    expect(elsewhere()).toBe(`gate|/app/enotary/access?role=${role}|true`);
    expect(document.body.textContent ?? "").not.toMatch(/vs_SECRET123|Approved/);
    expect(read).not.toHaveBeenCalled();
  });

  it("is the client's gate where no role was kept, or what was kept is not one", () => {
    window.sessionStorage.setItem(ENOTARY_ROLE_STORAGE_KEY, "admin");
    arriveBack();
    expect(elsewhere()).toBe("gate|/app/enotary/access?role=client|true");
  });

  it("sends a signed-out device to sign-in, with the gate (never this address) as the way back", () => {
    platform.sessionStatus = "unauthenticated";
    window.sessionStorage.setItem(ENOTARY_ROLE_STORAGE_KEY, "attorney");
    arriveBack();
    expect(window.location.search).toBe("");
    expect(elsewhere()).toBe(`sign-in|/sign-in?returnTo=${encodeURIComponent("/app/enotary/access?role=attorney")}|false`);
  });

  it("gives every eNotary route its own metadata, signed-in and unindexed", () => {
    for (const path of ["/app/enotary", "/app/enotary/access", "/app/enotary/session", "/app/enotary/return"]) {
      expect(getRouteMeta(path), path).toMatchObject({ requiresAuth: true, isPublic: false, isIndexable: false, product: "enotary" });
    }
  });
});
