import { describe, it, expect, vi, beforeEach, afterEach } from "vitest";
import { render, screen, waitFor, within } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { Link, MemoryRouter, Route, Routes } from "react-router";

// Typing-heavy flows; under a full parallel run the 5s default is too tight.
vi.setConfig({ testTimeout: 20_000 });

// Real-backend mode for every test here: each step must SAVE on Continue.
vi.mock("../../../services/backend-flag", () => ({ USE_REAL_BACKEND: true, API_BASE_URL: "http://api.test" }));
vi.mock("../../../hooks/useSignOutFlow", () => ({
  useSignOutFlow: () => ({ requestSignOut: vi.fn(), confirmDialog: null }),
}));

interface FakePlatform {
  user: { id: string; email: string; displayName: string; fullName?: string; role: "owner" } | null;
  workspaceStatus: "initializing" | "ready" | "empty" | "error";
  currentWorkspace: { id: string; name: string } | null;
  createWorkspace: ReturnType<typeof vi.fn>;
  refreshSessionFromBackend: ReturnType<typeof vi.fn>;
  signIn: ReturnType<typeof vi.fn>;
}
const platform: FakePlatform = {
  user: null, workspaceStatus: "empty", currentWorkspace: null,
  createWorkspace: vi.fn(), refreshSessionFromBackend: vi.fn(), signIn: vi.fn(),
};
vi.mock("../../../context/PlatformContext", () => ({
  usePlatform: () => platform,
  announceProfileChanged: vi.fn(),
  createMockSignInPayload: vi.fn(),
}));

import { OnboardingProvider } from "../../../context/OnboardingContext";
import { OnboardingProfile } from "../OnboardingProfile";
import { OnboardingWorkspace } from "../OnboardingWorkspace";
import { OnboardingSecurity } from "../OnboardingSecurity";
import { OnboardingReview } from "../OnboardingReview";
import { createDefaultOnboardingDraft, type OnboardingDraft, type OnboardingProgress } from "../../../models/auth";
import { PERSISTENCE_KEYS } from "../../../services/local-persistence";

// ── Fixtures ──────────────────────────────────────────────────────────────────

const ME = {
  userId: "usr_1", email: "ana@example.com", emailVerified: true,
  profile: { fullName: null, displayName: "", jobTitle: null, department: null, preferredSenderName: null },
  preferences: { timezone: "Asia/Manila", dateFormat: null, timeFormat: null },
  security: { mfaEnabled: false },
  avatar: null, createdAt: "2026-01-01T00:00:00Z",
};

function json(status: number, body: unknown): Response {
  return new Response(JSON.stringify(body), { status, headers: { "content-type": "application/json" } });
}

type Handler = (method: string, path: string, body: unknown) => Response | undefined;
const calls: { method: string; path: string; body: unknown }[] = [];
let handler: Handler = () => undefined;

beforeEach(() => {
  calls.length = 0;
  handler = () => undefined;
  vi.stubGlobal("fetch", vi.fn((url: string, init?: RequestInit) => {
    const method = init?.method ?? "GET";
    const path = url.replace("http://api.test", "");
    const body: unknown = init?.body ? JSON.parse(init.body as string) : undefined;
    calls.push({ method, path, body });
    const custom = handler(method, path, body);
    if (custom) return Promise.resolve(custom);
    if (method === "GET" && path === "/me") return Promise.resolve(json(200, ME));
    if (method === "PATCH" && path === "/me/profile") return Promise.resolve(json(200, ME));
    if (method === "PATCH" && path === "/me/preferences") return Promise.resolve(json(200, ME));
    return Promise.resolve(json(404, { error: { code: "not_found", message: `No handler for ${method} ${path}` } }));
  }));
  platform.user = null;
  platform.workspaceStatus = "empty";
  platform.currentWorkspace = null;
  platform.createWorkspace = vi.fn((name: string) => Promise.resolve({ ok: true, workspace: { id: "ws_new", name } }));
  platform.refreshSessionFromBackend = vi.fn(() => Promise.resolve({ status: "authenticated", workspaceStatus: "ready" }));
  platform.signIn = vi.fn();
});

afterEach(() => {
  Object.defineProperty(window, "innerWidth", { value: 1024, configurable: true, writable: true });
});

function seed(draft: Partial<OnboardingDraft>, progress: Partial<OnboardingProgress>, mfaSetupDone = false) {
  const base = createDefaultOnboardingDraft();
  window.localStorage.setItem(PERSISTENCE_KEYS.onboardingState, JSON.stringify({
    version: 2,
    pendingUser: { email: "ana@example.com", displayName: "Ana Reyes", authStatus: "onboarding-required" },
    draft: { ...base, ...draft },
    progress: { profile: false, workspace: false, security: false, complete: false, ...progress },
    mfaSetupDone,
    returnTo: null,
  }));
}

function renderAt(path: string) {
  return render(
    <OnboardingProvider>
      <MemoryRouter initialEntries={[path]}>
        <Routes>
          <Route path="/onboarding/profile" element={<OnboardingProfile />} />
          <Route path="/onboarding/workspace" element={<OnboardingWorkspace />} />
          <Route path="/onboarding/security" element={<OnboardingSecurity />} />
          <Route path="/onboarding/review" element={<OnboardingReview />} />
          <Route path="/mfa/setup" element={<p>MFA SETUP</p>} />
          <Route path="/onboarding/complete" element={<p>COMPLETE</p>} />
        </Routes>
      </MemoryRouter>
    </OnboardingProvider>,
  );
}

/** A stand-in Security page with a way back, for revisit tests. */
function renderWorkspaceWithStubSecurity() {
  return render(
    <OnboardingProvider>
      <MemoryRouter initialEntries={["/onboarding/workspace"]}>
        <Routes>
          <Route path="/onboarding/workspace" element={<OnboardingWorkspace />} />
          <Route path="/onboarding/security" element={<Link to="/onboarding/workspace">SECURITY — back</Link>} />
        </Routes>
      </MemoryRouter>
    </OnboardingProvider>,
  );
}

const continueButton = () => screen.getByRole("button", { name: "Continue" });

// ── Profile ───────────────────────────────────────────────────────────────────

describe("Profile step", () => {
  it("requires full name and display name before saving anything", async () => {
    const user = userEvent.setup();
    renderAt("/onboarding/profile");
    await user.click(continueButton());
    expect(await screen.findByText(/Enter your full name/)).toBeInTheDocument();
    expect(screen.getByText("Enter a display name.")).toBeInTheDocument();
    expect(calls.filter((c) => c.method === "PATCH")).toHaveLength(0);
  });

  it("saves the profile and preferences with the right bodies, then moves on", async () => {
    const user = userEvent.setup();
    renderAt("/onboarding/profile");
    await user.type(screen.getByLabelText(/Full name/), "Ana Reyes");
    // Display name follows full name until edited.
    expect(screen.getByLabelText(/Display name/)).toHaveValue("Ana Reyes");
    expect(screen.getByLabelText(/Time zone/)).toHaveValue("Asia/Manila");

    await user.click(screen.getByRole("button", { name: /More details/ }));
    await user.type(screen.getByLabelText(/Job title/), "Associate");
    await user.click(screen.getByRole("radio", { name: "24-hour" }));
    await user.click(continueButton());

    expect(await screen.findByText(/How will you use LAGDA/)).toBeInTheDocument();
    expect(calls.find((c) => c.method === "PATCH" && c.path === "/me/profile")?.body).toEqual({
      fullName: "Ana Reyes", displayName: "Ana Reyes", jobTitle: "Associate",
      department: null, preferredSenderName: null,
    });
    expect(calls.find((c) => c.method === "PATCH" && c.path === "/me/preferences")?.body).toEqual({
      timezone: "Asia/Manila", dateFormat: null, timeFormat: "24h",
    });
    expect(platform.refreshSessionFromBackend).toHaveBeenCalled();
  });

  it("stays on the step and shows the server's message when saving fails", async () => {
    handler = (method, path) => method === "PATCH" && path === "/me/profile"
      ? json(422, { error: { code: "invalid", message: "Full name must be at least 2 characters." } })
      : undefined;
    const user = userEvent.setup();
    renderAt("/onboarding/profile");
    await user.type(screen.getByLabelText(/Full name/), "Ana Reyes");
    await user.click(continueButton());
    expect(await screen.findByText("Full name must be at least 2 characters.")).toBeInTheDocument();
    expect(screen.getByText("Tell us about you")).toBeInTheDocument();
  });
});

// ── Workspace ─────────────────────────────────────────────────────────────────

describe("Workspace step", () => {
  const profile = { ...createDefaultOnboardingDraft().profile, fullName: "Ana Reyes", displayName: "Ana" };

  it("creates the workspace once, and renames it on a revisit instead of creating a second", async () => {
    seed({ profile }, { profile: true });
    const user = userEvent.setup();
    renderWorkspaceWithStubSecurity();

    await user.click(screen.getByRole("radio", { name: /Just me/ }));
    expect(screen.getByLabelText(/Workspace name/)).toHaveValue("Ana's Workspace");
    await user.click(continueButton());
    await screen.findByText(/SECURITY — back/);
    expect(platform.createWorkspace).toHaveBeenCalledTimes(1);
    expect(platform.createWorkspace).toHaveBeenCalledWith("Ana's Workspace");

    // The real context flips to "ready" after creating; the step must not
    // depend on that to avoid a duplicate.
    handler = (method, path) => method === "PATCH" && path === "/workspaces/ws_new"
      ? json(200, { workspaceId: "ws_new", name: "Reyes Law" }) : undefined;
    await user.click(screen.getByText(/SECURITY — back/));
    const name = await screen.findByLabelText(/Workspace name/);
    await user.clear(name);
    await user.type(name, "Reyes Law");
    await user.click(continueButton());
    await screen.findByText(/SECURITY — back/);

    expect(platform.createWorkspace).toHaveBeenCalledTimes(1);
    expect(calls.find((c) => c.method === "PATCH" && c.path === "/workspaces/ws_new")?.body).toEqual({ name: "Reyes Law" });
  });

  it("shows the team invites slot for a team workspace and no organisation fields", async () => {
    seed({ profile }, { profile: true });
    const user = userEvent.setup();
    renderAt("/onboarding/workspace");
    await user.click(screen.getByRole("radio", { name: /With a team/ }));
    expect(screen.getByTestId("team-invites-slot")).toHaveTextContent("Workspace → Members");
    expect(screen.queryByText(/Organisation name/)).toBeNull();
    expect(screen.queryByText(/Team size/)).toBeNull();
  });

  it("creates and emails the queued team join links once the workspace exists", async () => {
    seed({ profile }, { profile: true });
    let n = 0;
    handler = (method, path, body) => {
      if (method === "POST" && path === "/workspaces/ws_new/join-tickets") {
        n += 1;
        const b = body as { label: string; recipientEmail: string | null };
        return json(201, {
          ticketId: `jt_${String(n)}`, label: b.label, recipientEmail: b.recipientEmail, state: "draft", linkUrl: null,
          sentAt: null, withdrawnAt: null, usedAt: null, request: null, createdAt: 1, updatedAt: 1,
        });
      }
      if (method === "POST" && path === "/workspaces/ws_new/join-tickets/jt_1/send") {
        return json(200, {
          ticketId: "jt_1", label: "Finance", recipientEmail: "fin@example.com", state: "sent", linkUrl: "https://x/join/abc",
          sentAt: 2, withdrawnAt: null, usedAt: null, request: null, createdAt: 1, updatedAt: 2,
        });
      }
      return undefined;
    };
    const user = userEvent.setup();
    renderAt("/onboarding/workspace");
    await user.click(screen.getByRole("radio", { name: /With a team/ }));
    const slot = screen.getByTestId("team-invites-slot");
    await user.type(within(slot).getByLabelText("Label"), "Finance");
    await user.type(within(slot).getByRole("textbox", { name: /Email/ }), "fin@example.com");
    await user.click(within(slot).getByRole("button", { name: "Add invite" }));
    await user.type(within(slot).getByLabelText("Label"), "Reception");
    await user.click(within(slot).getByRole("button", { name: "Add invite" }));
    expect(within(slot).getByText("Link will be emailed to fin@example.com")).toBeInTheDocument();
    expect(calls.some((c) => c.path.includes("join-tickets"))).toBe(false);

    await user.click(continueButton());
    expect(await screen.findByText("Protect your account", {}, { timeout: 3000 })).toBeInTheDocument();
    const creates = calls.filter((c) => c.method === "POST" && c.path === "/workspaces/ws_new/join-tickets");
    expect(creates.map((c) => c.body)).toEqual([
      { label: "Finance", recipientEmail: "fin@example.com" },
      { label: "Reception", recipientEmail: null },
    ]);
    // Only the invite with an email is sent; the other stays a draft.
    expect(calls.filter((c) => c.path.endsWith("/send")).map((c) => [c.path, c.body])).toEqual([
      ["/workspaces/ws_new/join-tickets/jt_1/send", { email: true }],
    ]);
  });

  it("validates a join link and sends a join request without creating a workspace", async () => {
    seed({ profile }, { profile: true });
    handler = (method, path) => {
      if (path === "/workspace-join/preview") return json(200, { workspaceName: "Mabini Legal Solutions", invitedByName: "Paul Reyes" });
      if (path === "/workspace-join/requests") return json(201, { requestId: "req_1", workspaceName: "Mabini Legal Solutions", state: "pending" });
      return undefined;
    };
    const user = userEvent.setup();
    renderAt("/onboarding/workspace");
    await user.click(screen.getByRole("radio", { name: /Join an existing workspace/ }));
    expect(continueButton()).toBeDisabled();

    await user.click(screen.getByLabelText(/Paste your join link/));
    await user.paste("https://app.lagda.ph/join/tok_abcdef");
    expect(await screen.findByText("✓ Mabini Legal Solutions — invited by Paul Reyes", {}, { timeout: 2000 })).toBeInTheDocument();
    expect(calls.find((c) => c.path === "/workspace-join/preview")?.body).toEqual({ token: "tok_abcdef" });

    await user.click(continueButton());
    expect(await screen.findByText(/Request sent — you'll be notified/)).toBeInTheDocument();
    expect(calls.find((c) => c.path === "/workspace-join/requests")?.body).toEqual({
      token: "tok_abcdef", fullName: "Ana Reyes", reason: null,
    });
    expect(platform.createWorkspace).not.toHaveBeenCalled();
    expect(await screen.findByText("Protect your account", {}, { timeout: 3000 })).toBeInTheDocument();
  });

  it("explains a used join link", async () => {
    seed({ profile }, { profile: true });
    handler = (_m, path) => path === "/workspace-join/preview"
      ? json(410, { error: { code: "join_link_used", message: "used" } }) : undefined;
    const user = userEvent.setup();
    renderAt("/onboarding/workspace");
    await user.click(screen.getByRole("radio", { name: /Join an existing workspace/ }));
    await user.click(screen.getByLabelText(/Paste your join link/));
    await user.paste("tok_abcdef");
    expect(await screen.findByText(/Someone already used this link/, {}, { timeout: 2000 })).toBeInTheDocument();
    expect(continueButton()).toBeDisabled();
  });
});

// ── Security ──────────────────────────────────────────────────────────────────

describe("Security step", () => {
  it("requires the two-step choice and the acknowledgement", async () => {
    seed({}, { profile: true, workspace: true });
    const user = userEvent.setup();
    renderAt("/onboarding/security");
    // Once in the header, once in the account row (from GET /me).
    await waitFor(() => expect(screen.getAllByText("ana@example.com")).toHaveLength(2));
    expect(screen.getByText("✓ Verified")).toBeInTheDocument();

    await user.click(continueButton());
    expect(screen.getByText(/Choose whether to set up two-step verification/)).toBeInTheDocument();
    expect(screen.getByText("Please confirm this to continue.")).toBeInTheDocument();

    await user.click(screen.getByRole("radio", { name: /Remind me later/ }));
    await user.click(continueButton());
    expect(screen.getByText("Please confirm this to continue.")).toBeInTheDocument();

    await user.click(screen.getByRole("checkbox", { name: /keep my password private/ }));
    await user.click(continueButton());
    expect(await screen.findByText("Review your setup")).toBeInTheDocument();
  });

  it("sends 'set it up now' to the MFA flow", async () => {
    seed({}, { profile: true, workspace: true });
    const user = userEvent.setup();
    renderAt("/onboarding/security");
    await user.click(screen.getByRole("radio", { name: /Set it up now/ }));
    await user.click(screen.getByRole("checkbox", { name: /keep my password private/ }));
    await user.click(screen.getByRole("button", { name: "Continue to set up" }));
    expect(await screen.findByText("MFA SETUP")).toBeInTheDocument();
  });

  it("treats the choice as satisfied when two-step is already on", () => {
    seed({}, { profile: true, workspace: true }, true);
    renderAt("/onboarding/security");
    expect(screen.getByText("✓ Two-step verification is on")).toBeInTheDocument();
    expect(screen.queryByRole("radio", { name: /Set it up now/ })).toBeNull();
    expect(screen.getByRole("link", { name: /Review signed-in devices/ })).toHaveAttribute("target", "_blank");
  });
});

// ── Review ────────────────────────────────────────────────────────────────────

describe("Review step", () => {
  const profile = { ...createDefaultOnboardingDraft().profile, fullName: "Ana Reyes", displayName: "Ana", timeZone: "Asia/Manila" };
  const all = { profile: true, workspace: true, security: true };

  it("shows a join request as pending and MFA as not set up", () => {
    seed({
      profile,
      workspace: { ...createDefaultOnboardingDraft().workspace, scenario: "join", joinRequest: { workspaceName: "Mabini Legal Solutions", state: "sent" } },
    }, all);
    renderAt("/onboarding/review");
    expect(screen.getByText("Ana Reyes · Asia/Manila")).toBeInTheDocument();
    expect(screen.getByText("Join request sent to Mabini Legal Solutions")).toBeInTheDocument();
    expect(screen.getByText("Pending approval")).toBeInTheDocument();
    expect(screen.getByText("Two-step verification not set up yet")).toBeInTheDocument();
    expect(screen.getByText(/Notifications use recommended settings/)).toBeInTheDocument();
    expect(document.body.textContent).toContainNoneOf(["No real", "demonstrates the completion flow"]);
  });

  it("shows a created workspace and two-step on, then completes", async () => {
    seed({
      profile,
      workspace: { ...createDefaultOnboardingDraft().workspace, scenario: "personal", workspaceName: "Reyes Law", savedName: "Reyes Law", createdWorkspaceId: "ws_1" },
      security: { mfaChoice: "now", mfaEnabled: true },
    }, all);
    const user = userEvent.setup();
    renderAt("/onboarding/review");
    const list = screen.getByRole("list", { name: "Setup summary" });
    expect(within(list).getByText("Reyes Law")).toBeInTheDocument();
    expect(within(list).getByText("✓ Created")).toBeInTheDocument();
    expect(within(list).getByText("✓ Two-step on")).toBeInTheDocument();
    expect(screen.getByRole("link", { name: "Edit workspace" })).toHaveAttribute("href", "/onboarding/workspace");

    await user.click(screen.getByRole("button", { name: "Go to your dashboard →" }));
    expect(await screen.findByText("COMPLETE")).toBeInTheDocument();
    expect(platform.refreshSessionFromBackend).toHaveBeenCalled();
    expect(platform.signIn).not.toHaveBeenCalled();
  });
});

// ── Information button ────────────────────────────────────────────────────────

describe("About this step", () => {
  it("opens a side panel on wide screens with step-specific content and closes on Esc", async () => {
    const user = userEvent.setup();
    renderAt("/onboarding/profile");
    const fab = screen.getByRole("button", { name: "About this step" });
    await user.click(fab);
    const panel = screen.getByTestId("onboarding-info-panel");
    expect(within(panel).getByText("Why we ask")).toBeInTheDocument();
    expect(within(panel).getByText(/Your profile — change it anytime in Settings → Profile/)).toBeInTheDocument();
    expect(screen.queryByRole("dialog")).toBeNull(); // non-modal

    await user.keyboard("{Escape}");
    expect(screen.queryByTestId("onboarding-info-panel")).toBeNull();
    expect(screen.getByRole("button", { name: "About this step" })).toHaveFocus();
  });

  it("shows the security step's own content", async () => {
    seed({}, { profile: true, workspace: true });
    const user = userEvent.setup();
    renderAt("/onboarding/security");
    await user.click(screen.getByRole("button", { name: "About this step" }));
    expect(within(screen.getByTestId("onboarding-info-panel")).getByText(/manage it in Settings → Security/)).toBeInTheDocument();
  });

  it("opens a modal bottom sheet on phones that closes on Esc and returns focus", async () => {
    Object.defineProperty(window, "innerWidth", { value: 390, configurable: true, writable: true });
    const user = userEvent.setup();
    renderAt("/onboarding/profile");
    expect(screen.getByText(/Step 1 of 4/)).toBeInTheDocument();
    const fab = screen.getByRole("button", { name: "About this step" });
    await user.click(fab);
    const sheet = screen.getByRole("dialog");
    expect(sheet).toHaveAttribute("aria-modal", "true");
    expect(within(sheet).getByRole("button", { name: "Close" })).toHaveFocus();
    await user.keyboard("{Escape}");
    expect(screen.queryByRole("dialog")).toBeNull();
    expect(fab).toHaveFocus();
  });

  it("closes the sheet when tapping outside", async () => {
    Object.defineProperty(window, "innerWidth", { value: 390, configurable: true, writable: true });
    const user = userEvent.setup();
    renderAt("/onboarding/profile");
    await user.click(screen.getByRole("button", { name: "About this step" }));
    await user.click(screen.getByTestId("onboarding-info-scrim"));
    expect(screen.queryByRole("dialog")).toBeNull();
  });
});
