// My Settings › Identity verification: a person verifying their own account.
//
// Pinned here, state by state: not verified (what it is for, what is kept,
// the agreement), the wait and its outcomes, verified (name, dates, badge,
// the face-check line, the name warning), verifying again, removing with a
// confirmation, expired, and "not available" where the server does not offer
// it. And the page the partner sends the browser back to.

import { describe, it, expect, vi, beforeEach, afterEach } from "vitest";
import { act, fireEvent, render, screen, within } from "@testing-library/react";
import { MemoryRouter, Routes, Route, useLocation } from "react-router";

vi.mock("../../../../services/backend-flag", () => ({ USE_REAL_BACKEND: true, API_BASE_URL: "http://api.test" }));

const platform = {
  sessionStatus: "authenticated" as string,
  user: { id: "u1", email: "ana@example.com", displayName: "Ana R.", fullName: "Ana Reyes" },
};
vi.mock("../../../../context/PlatformContext", () => ({ usePlatform: () => platform }));

const read = vi.fn();
const startSession = vi.fn();
const refresh = vi.fn();
const remove = vi.fn();
vi.mock("../../../../services/real/account-identity.service", async (original) => ({
  ...(await original<typeof import("../../../../services/real/account-identity.service")>()),
  realAccountIdentityService: {
    read: (...args: unknown[]) => read(...args) as unknown,
    startSession: (...args: unknown[]) => startSession(...args) as unknown,
    refresh: (...args: unknown[]) => refresh(...args) as unknown,
    remove: (...args: unknown[]) => remove(...args) as unknown,
  },
}));

import { IdentityVerificationPage } from "../IdentityVerificationPage";
import { IdentityVerificationReturnPage } from "../../identity/ProviderReturnPage";
import { formatDate } from "../settings-data";
import { ApiError } from "../../../../services/api-client";
import { resetAccountFeatures } from "../../../../hooks/useAccountFeatures";
import type { AccountIdentity } from "../../../../services/real/account-identity.service";
import type { ProviderTab } from "../../../../components/identity/provider-session";
import {
  ACCOUNT_IDENTITY_STORAGE_KEY, providerReturned, providerReturnState,
} from "../../../../models/identity-check";
import { getRouteMeta } from "../../../../config/routes";

const PARTNER_URL = "https://verify.partner.example/session/account";
const AGREE = "I agree to the use of my ID and selfie to verify my identity for my LAGDA account.";
const VERIFIED_AT = "2026-10-12T02:00:00.000Z";
const VALID_UNTIL = "2027-10-12T02:00:00.000Z";

const identity = (over: Partial<AccountIdentity> = {}): AccountIdentity => ({
  available: true, status: "unverified", verifiedName: null, verifiedAt: null, validUntil: null,
  pendingReview: false, canUseFaceCheck: false, nameMatchesProfile: null, ...over,
});

const verified = (over: Partial<AccountIdentity> = {}): AccountIdentity => identity({
  status: "verified", verifiedName: "Ana Maria Reyes", verifiedAt: VERIFIED_AT, validUntil: VALID_UNTIL,
  canUseFaceCheck: true, nameMatchesProfile: "match", ...over,
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

function renderPage({ state, touch = false }: { state?: unknown; touch?: boolean } = {}) {
  return render(
    <MemoryRouter initialEntries={[{ pathname: "/app/settings/identity", state }]}>
      <Routes>
        <Route path="/app/settings/identity" element={<IdentityVerificationPage openTab={openTab} navigate={navigate} touch={touch} />} />
        <Route path="/app/settings/profile" element={<Elsewhere name="profile" />} />
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

const h3 = (name: string) => screen.getByRole("heading", { level: 3, name });
const button = (name: string | RegExp) => screen.getByRole("button", { name });
const text = (testId: string) => (screen.getByTestId(testId).textContent ?? "").replace(/\s+/g, " ").trim();

async function arrive(first: AccountIdentity | null, options?: Parameters<typeof renderPage>[0]) {
  read.mockResolvedValue(first);
  const view = renderPage(options);
  await pass(0);
  return view;
}

/** Agrees, presses the button, and lets the page settle into its wait. */
async function agreeAndPress(name: string) {
  press(screen.getByRole("checkbox", { name: AGREE }));
  press(button(name));
  await pass(0);
}

beforeEach(() => {
  vi.useFakeTimers();
  resetAccountFeatures();
  platform.sessionStatus = "authenticated";
  for (const mock of [read, startSession, refresh, remove, openTab, navigate, tab.go, tab.close]) mock.mockClear();
  read.mockReset();
  refresh.mockReset();
  remove.mockReset();
  startSession.mockReset();
  startSession.mockResolvedValue({ url: PARTNER_URL, expiresAt: "2026-10-12T03:00:00.000Z", kind: "full" });
  refresh.mockResolvedValue(identity({ status: "pending" }));
  remove.mockResolvedValue(undefined);
  window.sessionStorage.clear();
});

afterEach(() => { vi.useRealTimers(); });

// ── Not offered ──────────────────────────────────────────────────────────────

describe("where it is not offered", () => {
  it.each([
    ["the route is not there", null],
    ["the server says it is not available", identity({ available: false })],
  ])("says so plainly when %s, with nothing to press", async (_why, first) => {
    await arrive(first);
    expect(screen.getByRole("heading", { level: 2, name: "Identity verification" })).toBeInTheDocument();
    expect(text("identity-unavailable")).toBe("Not available on this account yet.");
    expect(screen.queryByRole("button")).toBeNull();
    expect(screen.queryByRole("checkbox")).toBeNull();
    expect(startSession).not.toHaveBeenCalled();
    expect(refresh).not.toHaveBeenCalled();
  });

  it("says it could not be loaded when the read fails, and tries again", async () => {
    read.mockRejectedValueOnce(refusal(500, "server_error"));
    renderPage();
    await pass(0);
    expect(screen.getByRole("alert").textContent ?? "").toContain("Your identity verification could not be loaded.");
    read.mockResolvedValue(identity());
    press(button("Try again"));
    await pass(0);
    expect(h3("Verify your identity")).toBeInTheDocument();
  });
});

// ── Not verified ─────────────────────────────────────────────────────────────

describe("not verified yet", () => {
  it("says what it is for and what is kept, and holds the button until they agree", async () => {
    await arrive(identity());
    expect(h3("Verify your identity")).toBeInTheDocument();
    expect(screen.getByText(
      /Verify once with a valid ID and a face check\. Your account shows as verified, and later checks\s+only need a quick face check instead of your ID\./,
    )).toBeInTheDocument();
    expect(text("identity-kept-note")).toBe(
      "Our partner checks your ID and selfie. LAGDA keeps the name shown on your ID, and the result of the check. "
      + "It does not keep your ID number, your photo, or the image of your ID. "
      + "A later face check compares your face with this verification, which our verification partner keeps.",
    );
    expect(screen.getByText(/Have your phone ready/)).toBeInTheDocument();
    expect(screen.getByRole("checkbox", { name: AGREE })).not.toBeChecked();
    expect(button("Verify my identity")).toBeDisabled();
    expect(startSession).not.toHaveBeenCalled();
    // No count of attempts here.
    expect(screen.queryByText(/attempts? left/)).toBeNull();
    expect(screen.getByTestId("identity-state-start")).toBeInTheDocument();
  });

  it("on a phone says the check is done on this device", async () => {
    await arrive(identity(), { touch: true });
    expect(screen.getByText(/with this\s+device, and then you will be brought back here/)).toBeInTheDocument();
    expect(screen.queryByText(/Have your phone ready/)).toBeNull();
  });

  it("opens the partner's page in a new tab, waits asking every 3 s, and shows the result by itself", async () => {
    await arrive(identity());
    await agreeAndPress("Verify my identity");
    expect(startSession).toHaveBeenCalledTimes(1);
    expect(openTab).toHaveBeenCalledTimes(1);
    expect(tab.go).toHaveBeenCalledWith(PARTNER_URL);
    expect(navigate).not.toHaveBeenCalled();
    expect(h3("Finish the verification in the new tab")).toHaveFocus();
    expect(refresh).not.toHaveBeenCalled();
    await pass(3_000);
    expect(refresh).toHaveBeenCalledTimes(1);
    await pass(3_000);
    expect(refresh).toHaveBeenCalledTimes(2);

    refresh.mockResolvedValue(verified());
    await pass(3_000);
    expect(h3("Verified as Ana Maria Reyes")).toHaveFocus();
    expect(screen.getAllByRole("status").map(node => node.textContent ?? "")).toContain("Your identity is verified.");
    expect(window.sessionStorage.getItem(ACCOUNT_IDENTITY_STORAGE_KEY)).toBeNull();
    // Verified: nothing more is asked.
    await pass(30_000);
    expect(refresh).toHaveBeenCalledTimes(3);
  });

  it("on a phone goes to the partner's page in this tab", async () => {
    await arrive(identity(), { touch: true });
    await agreeAndPress("Verify my identity");
    expect(openTab).not.toHaveBeenCalled();
    expect(navigate).toHaveBeenCalledWith(PARTNER_URL);
  });

  it("cannot be submitted twice", async () => {
    let release: (value: unknown) => void = () => undefined;
    startSession.mockImplementation(() => new Promise(resolve => { release = resolve; }));
    await arrive(identity());
    press(screen.getByRole("checkbox", { name: AGREE }));
    press(button("Verify my identity"));
    expect(button("Opening…")).toBeDisabled();
    press(button("Opening…"));
    expect(startSession).toHaveBeenCalledTimes(1);
    await act(async () => { release({ url: PARTNER_URL, expiresAt: "", kind: "full" }); await Promise.resolve(); });
  });
});

// ── The wait and its outcomes ────────────────────────────────────────────────

describe("the wait and its outcomes", () => {
  it("shows a review by a person, and the result when it ends", async () => {
    await arrive(identity());
    await agreeAndPress("Verify my identity");
    refresh.mockResolvedValue(identity({ status: "pending", pendingReview: true }));
    await pass(3_000);
    expect(h3("Your verification is being reviewed")).toHaveFocus();
    refresh.mockResolvedValue(verified());
    await pass(10_000);
    expect(h3("Verified as Ana Maria Reyes")).toBeInTheDocument();
  });

  it("says it could not verify, with the usual causes and no attempt counter, and tries again", async () => {
    await arrive(identity());
    await agreeAndPress("Verify my identity");
    refresh.mockResolvedValue(identity({ lastOutcome: "declined" }));
    await pass(3_000);
    expect(h3("We could not verify your identity")).toHaveFocus();
    expect(screen.getByText("This usually happens when:")).toBeInTheDocument();
    expect(screen.queryByText(/attempts? left/)).toBeNull();
    refresh.mockResolvedValue(identity({ status: "pending" }));
    press(button("Try again"));
    await pass(0);
    expect(startSession).toHaveBeenCalledTimes(2);
    expect(h3("Finish the verification in the new tab")).toBeInTheDocument();
  });

  it("ignores the old 'declined' after Try again, until the server has said something else", async () => {
    await arrive(identity());
    await agreeAndPress("Verify my identity");
    refresh.mockResolvedValue(identity({ lastOutcome: "declined" }));
    await pass(3_000);
    expect(h3("We could not verify your identity")).toBeInTheDocument();
    // The server goes on saying "declined" about the visit before this one.
    press(button("Try again"));
    await pass(0);
    expect(startSession).toHaveBeenCalledTimes(2);
    await pass(6_000);
    expect(h3("Finish the verification in the new tab")).toBeInTheDocument();
    // The new visit is under way: the old word is gone. A later one is this visit's.
    refresh.mockResolvedValueOnce(identity({ status: "pending", lastOutcome: null }));
    await pass(3_000);
    expect(h3("Finish the verification in the new tab")).toBeInTheDocument();
    await pass(3_000);
    expect(h3("We could not verify your identity")).toBeInTheDocument();
  });

  it("keeps waiting on a renewal while the account still reads verified, never pending", async () => {
    await arrive(verified());
    press(button("Verify again"));
    await agreeAndPress("Verify again");
    // `verified` wins over `pending` on the server: the visit's own state is what is shown.
    refresh.mockResolvedValue(verified({ lastOutcome: null }));
    await pass(9_000);
    expect(h3("Finish the verification in the new tab")).toBeInTheDocument();
    refresh.mockResolvedValue(verified({ lastOutcome: "declined" }));
    await pass(3_000);
    expect(h3("We could not verify your identity")).toBeInTheDocument();
  });

  it("after 15 minutes says nothing has arrived, with Check again", async () => {
    await arrive(identity());
    await agreeAndPress("Verify my identity");
    await pass(15 * 60 * 1000);
    expect(h3("We have not received your result yet")).toBeInTheDocument();
    const asked = refresh.mock.calls.length;
    await pass(30_000);
    expect(refresh).toHaveBeenCalledTimes(asked);
    press(button("Check again"));
    await pass(0);
    expect(refresh).toHaveBeenCalledTimes(asked + 1);
  });

  it("says it is not available when a visit cannot be opened, and too many tries on a 429", async () => {
    await arrive(identity());
    startSession.mockRejectedValueOnce(refusal(409, "identity_check_unavailable"));
    await agreeAndPress("Verify my identity");
    expect(tab.close).toHaveBeenCalledTimes(1);
    expect(h3("Identity verification is not available right now")).toBeInTheDocument();
    expect(document.body.textContent ?? "").not.toMatch(/server said/);
    startSession.mockRejectedValueOnce(refusal(429, "rate_limited"));
    press(button("Try again"));
    await pass(0);
    expect(screen.getByRole("alert").textContent ?? "").toContain("Too many tries in a short time. Wait a minute, then try again.");
  });

  it("starts asking at once when the person has just come back from the partner", async () => {
    refresh.mockResolvedValue(verified());
    await arrive(identity(), { state: providerReturnState(Date.now()) });
    expect(refresh).toHaveBeenCalledTimes(1);
    expect(startSession).not.toHaveBeenCalled();
    expect(h3("Verified as Ana Maria Reyes")).toBeInTheDocument();
  });

  it("shows a visit that is still open, or under review, instead of Start", async () => {
    const first = await arrive(identity({ status: "pending" }));
    expect(h3("We have not received your result yet")).toBeInTheDocument();
    expect(button("Check again")).toBeInTheDocument();
    expect(button("Continue verification")).toBeInTheDocument();
    first.unmount();
    await arrive(identity({ status: "pending", pendingReview: true }));
    expect(h3("Your verification is being reviewed")).toBeInTheDocument();
  });
});

// ── Verified ─────────────────────────────────────────────────────────────────

describe("verified", () => {
  it("shows a calm panel: who, when, until when, the badge and the face-check line", async () => {
    await arrive(verified());
    const panel = screen.getByTestId("identity-verified");
    expect(h3("Verified as Ana Maria Reyes")).toBeInTheDocument();
    expect(within(panel).getByText("Verified")).toBeInTheDocument();
    expect(panel.textContent ?? "").toContain(`Verified on ${formatDate(Date.parse(VERIFIED_AT))}`);
    expect(panel.textContent ?? "").toContain(`Valid until ${formatDate(Date.parse(VALID_UNTIL))}`);
    expect(text("identity-face-later")).toBe("Later checks will use a quick face check.");
    expect(screen.queryByTestId("identity-name-mismatch")).toBeNull();
    expect(screen.queryByRole("checkbox")).toBeNull();
    expect(button("Verify again")).toBeEnabled();
    expect(button("Remove my verification")).toBeEnabled();
    // Nothing is asked of the partner just for looking.
    expect(refresh).not.toHaveBeenCalled();
  });

  it("says nothing about a face check where the server does not offer one", async () => {
    await arrive(verified({ canUseFaceCheck: false }));
    expect(screen.queryByTestId("identity-face-later")).toBeNull();
  });

  it("warns when the name on the ID is not the profile's, with the way to the profile", async () => {
    await arrive(verified({ nameMatchesProfile: "mismatch" }));
    expect(text("identity-name-mismatch")).toBe(
      "The name on your ID (Ana Maria Reyes) is different from the name on your profile (Ana R.). "
      + "Documents that ask for an identity check compare these names. Update your profile name if it is wrong. "
      + "Open profile settings",
    );
    expect(screen.getByRole("link", { name: "Open profile settings" })).toHaveAttribute("href", "/app/settings/profile");
  });

  it("says nothing about a name that is only close", async () => {
    await arrive(verified({ nameMatchesProfile: "close" }));
    expect(screen.queryByTestId("identity-name-mismatch")).toBeNull();
  });
});

describe("verifying again", () => {
  it("asks for the agreement again, and is not taken for done by the verification already held", async () => {
    await arrive(verified());
    press(button("Verify again"));
    expect(h3("Verify your identity again")).toHaveFocus();
    expect(button("Verify again")).toBeDisabled();
    await agreeAndPress("Verify again");
    expect(startSession).toHaveBeenCalledTimes(1);
    // The old verification still stands: that is not the new one's result.
    refresh.mockResolvedValue(verified());
    await pass(3_000);
    expect(h3("Finish the verification in the new tab")).toBeInTheDocument();
    refresh.mockResolvedValue(verified({ verifiedAt: "2026-10-12T05:00:00.000Z", validUntil: "2027-10-12T05:00:00.000Z" }));
    await pass(3_000);
    expect(h3("Verified as Ana Maria Reyes")).toBeInTheDocument();
    expect(screen.getByTestId("identity-verified").textContent ?? "")
      .toContain(`Valid until ${formatDate(Date.parse("2027-10-12T05:00:00.000Z"))}`);
  });

  it("can be cancelled, leaving the verification as it was", async () => {
    await arrive(verified());
    press(button("Verify again"));
    press(button("Cancel"));
    expect(h3("Verified as Ana Maria Reyes")).toBeInTheDocument();
    expect(startSession).not.toHaveBeenCalled();
  });
});

describe("removing the verification", () => {
  it("asks first, in plain words, and does nothing on Cancel", async () => {
    await arrive(verified());
    press(button("Remove my verification"));
    const dialog = screen.getByRole("alertdialog", { name: "Remove your identity verification?" });
    expect(dialog.textContent ?? "").toContain(
      "Your account will no longer show as verified, and your next check will need your ID again.",
    );
    expect(within(dialog).getByRole("button", { name: "Remove my verification" })).toHaveFocus();
    press(within(dialog).getByRole("button", { name: "Cancel" }));
    expect(screen.queryByRole("alertdialog")).toBeNull();
    expect(remove).not.toHaveBeenCalled();
    expect(h3("Verified as Ana Maria Reyes")).toBeInTheDocument();
  });

  it("removes it on confirmation, and goes back to not verified", async () => {
    await arrive(verified());
    press(button("Remove my verification"));
    read.mockResolvedValue(identity());
    press(within(screen.getByRole("alertdialog")).getByRole("button", { name: "Remove my verification" }));
    await pass(0);
    expect(remove).toHaveBeenCalledTimes(1);
    expect(screen.queryByRole("alertdialog")).toBeNull();
    expect(h3("Verify your identity")).toBeInTheDocument();
    expect(screen.getByText("Your identity verification was removed.", { selector: "span" })).toBeInTheDocument();
    expect(screen.queryByTestId("identity-verified")).toBeNull();
  });

  it("shows not verified even if the read after removing fails", async () => {
    await arrive(verified());
    press(button("Remove my verification"));
    read.mockRejectedValue(refusal(0, "network"));
    press(within(screen.getByRole("alertdialog")).getByRole("button", { name: "Remove my verification" }));
    await pass(0);
    expect(h3("Verify your identity")).toBeInTheDocument();
  });

  it("says so in plain words when it cannot be removed, and keeps the verification shown", async () => {
    await arrive(verified());
    remove.mockRejectedValueOnce(refusal(500, "server_error"));
    press(button("Remove my verification"));
    press(within(screen.getByRole("alertdialog")).getByRole("button", { name: "Remove my verification" }));
    await pass(0);
    expect(screen.getByRole("alert").textContent ?? "").toContain("That could not be done right now. Please try again.");
    expect(h3("Verified as Ana Maria Reyes")).toBeInTheDocument();
    expect(button("Remove my verification")).toBeEnabled();
  });
});

describe("expired", () => {
  it("says when it expired, and offers to verify again with a fresh agreement", async () => {
    await arrive(identity({ status: "expired", verifiedName: "Ana Maria Reyes", verifiedAt: "2025-10-01T02:00:00.000Z", validUntil: "2026-10-01T02:00:00.000Z" }));
    expect(text("identity-expired")).toBe(`Your verification expired on ${formatDate(Date.parse("2026-10-01T02:00:00.000Z"))}.`);
    expect(button("Verify again")).toBeDisabled();
    expect(screen.queryByRole("button", { name: "Remove my verification" })).toBeNull();
    await agreeAndPress("Verify again");
    expect(startSession).toHaveBeenCalledTimes(1);
  });
});

// ── The way back from the partner ────────────────────────────────────────────

describe("/app/settings/identity/return", () => {
  const QUERY = "?verificationSessionId=vs_SECRET123&status=Approved";

  function arriveBack() {
    window.history.replaceState(null, "", `/app/settings/identity/return${QUERY}`);
    return render(
      <MemoryRouter initialEntries={[`/app/settings/identity/return${QUERY}`]}>
        <Routes>
          <Route path="/app/settings/identity/return" element={<IdentityVerificationReturnPage />} />
          <Route path="/app/settings/identity" element={<Elsewhere name="identity" />} />
          <Route path="/sign-in" element={<Elsewhere name="sign-in" />} />
        </Routes>
      </MemoryRouter>,
    );
  }

  afterEach(() => { window.history.replaceState(null, "", "/"); });

  it("strips the partner's values at once and routes to the section, saying they just came back", () => {
    arriveBack();
    expect(window.location.search).toBe("");
    expect(window.location.pathname).toBe("/app/settings/identity/return");
    expect(screen.getByTestId("elsewhere").textContent ?? "").toBe("identity|/app/settings/identity|true");
    expect(document.body.textContent ?? "").not.toMatch(/vs_SECRET123|Approved/);
    expect(window.sessionStorage.length).toBe(0);
    expect(read).not.toHaveBeenCalled();
    expect(refresh).not.toHaveBeenCalled();
  });

  it("sends a signed-out device to sign-in, with the section (never this address) as the way back", () => {
    platform.sessionStatus = "unauthenticated";
    arriveBack();
    expect(window.location.search).toBe("");
    expect(screen.getByTestId("elsewhere").textContent ?? "")
      .toBe(`sign-in|/sign-in?returnTo=${encodeURIComponent("/app/settings/identity")}|false`);
    expect(document.body.textContent ?? "").not.toMatch(/vs_SECRET123/);
  });

  it("waits, with the address already clean, while the session is still being read", () => {
    platform.sessionStatus = "initializing";
    arriveBack();
    expect(window.location.search).toBe("");
    expect(screen.getByRole("status").textContent ?? "").toContain("Returning…");
    expect(screen.queryByTestId("elsewhere")).toBeNull();
  });

  // The Notary Directory (a static page) starts the same check and marks the
  // tab before it leaves: the way back is then to the directory, in full.
  it.each(["authenticated", "unauthenticated", "initializing"])(
    "offers the way back to the Notary Directory where the directory started the check (%s)",
    (status) => {
      platform.sessionStatus = status;
      window.sessionStorage.setItem("lagda-directory-check", JSON.stringify({ at: Date.now() }));
      try {
        arriveBack();
        expect(window.location.search).toBe("");
        const back = screen.getByRole("link", { name: "Back to the Notary Directory" });
        expect(back).toHaveAttribute("href", "/enotary-directory/");
        expect(screen.queryByTestId("elsewhere")).toBeNull();
        expect(document.body.textContent ?? "").not.toMatch(/vs_SECRET123|Approved/);
        // The mark is the directory's own: left for it to read.
        expect(window.sessionStorage.getItem("lagda-directory-check")).not.toBeNull();
      } finally {
        window.sessionStorage.removeItem("lagda-directory-check");
      }
    },
  );

  it("routes on as usual, with no directory button, where no directory mark is kept", () => {
    window.sessionStorage.setItem("lagda-directory-check", "null");
    try {
      arriveBack();
      expect(screen.queryByRole("link", { name: "Back to the Notary Directory" })).toBeNull();
      expect(screen.getByTestId("elsewhere").textContent ?? "").toBe("identity|/app/settings/identity|true");
    } finally {
      window.sessionStorage.removeItem("lagda-directory-check");
    }
  });

  it("is a signed-in app route that is not indexed", () => {
    expect(getRouteMeta("/app/settings/identity/return")).toMatchObject({ requiresAuth: true, isPublic: false, isIndexable: false });
    expect(getRouteMeta("/app/settings/identity")).toMatchObject({ requiresAuth: true, isIndexable: false });
    platform.sessionStatus = "initializing";
    arriveBack();
    expect(document.querySelector('meta[name="robots"]')?.getAttribute("content")).toBe("noindex, nofollow");
  });
});
