// The session boundary.
//
// ── Why this is worth covering ─────────────────────────────────────────────
//
// `refreshSessionFromBackend` is the only place identity enters the
// application. It answers two separate questions from two separate calls —
// GET /me proves WHO is signed in, GET /workspaces proves WHAT they may
// reach — and the whole platform shell gates on the pair. Nothing local ever
// substitutes for either: there is no cached session in real-backend mode,
// by design.
//
// The states it can land in are not interchangeable, and the difference
// between two of them is the interesting part:
//
//   "empty"  — this account genuinely has no workspace. Send them to
//              onboarding to make one.
//   "error"  — identity is proven but workspace access could not be
//              determined right now. Do NOT send them to onboarding; they
//              may well have workspaces they simply cannot see this second,
//              and creating a second one on top would be a real mess.
//
// Collapsing those two is the failure this file exists to prevent. It is
// invisible in the happy path and only bites the person whose network
// blipped at the wrong moment.
//
// ── Shape of these tests ───────────────────────────────────────────────────
//
// The provider is rendered for real with only the two HTTP services stubbed,
// and a probe component reports the context values. That keeps the assertions
// on observable context state rather than on internals.

import { describe, it, expect, vi, beforeEach, afterEach } from "vitest";
import { render, screen, waitFor, act } from "@testing-library/react";

const me = vi.fn();
const list = vi.fn();
const create = vi.fn();

vi.mock("../../services/backend-flag", () => ({
  USE_REAL_BACKEND: true,
  API_BASE_URL: "/api",
}));

vi.mock("../../services/real/auth.service", () => ({
  realAuthService: { me: () => me(), signOut: vi.fn() },
}));

vi.mock("../../services/real/workspace.service", () => ({
  realWorkspaceService: {
    list: () => list(),
    create: (name: string, key: string) => create(name, key),
  },
}));

import { PlatformProvider, usePlatform } from "../PlatformContext";

const profile = (displayName = "Ana Reyes") => ({
  userId: "usr_1",
  email: "ana@example.com",
  emailVerified: true,
  profile: {
    fullName: "Ana Reyes", displayName, jobTitle: null,
    department: null, preferredSenderName: null,
  },
});

const workspace = (id: string, name: string) => ({
  workspaceId: id, name, role: "owner",
  joinedAt: 1_700_000_000_000, createdAt: 1_700_000_000_000,
});

/** Reports the context values the shell actually gates on. */
function Probe() {
  const p = usePlatform();
  return (
    <div>
      <span data-testid="session">{p.sessionStatus}</span>
      <span data-testid="workspace">{p.workspaceStatus}</span>
      <span data-testid="current">{p.currentWorkspace?.name ?? "-"}</span>
      <span data-testid="count">{String(p.workspaces.length)}</span>
      <span data-testid="user">{p.user?.displayName ?? "-"}</span>
      <span data-testid="role">{p.role ?? "-"}</span>
    </div>
  );
}

function renderProvider() {
  return render(<PlatformProvider><Probe /></PlatformProvider>);
}

const settled = () =>
  waitFor(() => {
    expect(screen.getByTestId("session").textContent).not.toBe("initializing");
  });

beforeEach(() => {
  vi.clearAllMocks();
  try { window.localStorage.clear(); } catch { /* not available in some envs */ }
});

afterEach(() => {
  vi.restoreAllMocks();
});

describe("bootstrapping a real session", () => {
  it("authenticates and selects a workspace", async () => {
    me.mockResolvedValue(profile());
    list.mockResolvedValue([workspace("ws_1", "Mabini Legal")]);

    renderProvider();
    await settled();

    expect(screen.getByTestId("session").textContent).toBe("authenticated");
    expect(screen.getByTestId("workspace").textContent).toBe("ready");
    expect(screen.getByTestId("current").textContent).toBe("Mabini Legal");
    expect(screen.getByTestId("user").textContent).toBe("Ana Reyes");
    expect(screen.getByTestId("role").textContent).not.toBe("-");
  });

  it("reports an account with no workspaces as empty, not as an error", async () => {
    // This is the signal onboarding keys off. Zero workspaces is a normal
    // state for a brand-new account, not a failure.
    me.mockResolvedValue(profile());
    list.mockResolvedValue([]);

    renderProvider();
    await settled();

    expect(screen.getByTestId("session").textContent).toBe("authenticated");
    expect(screen.getByTestId("workspace").textContent).toBe("empty");
    expect(screen.getByTestId("current").textContent).toBe("-");
    expect(screen.getByTestId("role").textContent).toBe("-");
  });

  it("keeps a proven identity when workspace access cannot be determined", async () => {
    // The distinction that matters. Identity is proven; the workspace list
    // failed. Reporting "empty" here would push somebody with real
    // workspaces into creating a duplicate one, because a network blip and
    // a genuinely-new account would look identical.
    me.mockResolvedValue(profile());
    list.mockRejectedValue(new Error("network"));

    renderProvider();
    await settled();

    expect(screen.getByTestId("session").textContent).toBe("authenticated");
    expect(screen.getByTestId("workspace").textContent).toBe("error");
    expect(screen.getByTestId("workspace").textContent).not.toBe("empty");
    expect(screen.getByTestId("user").textContent).toBe("Ana Reyes");
  });

  it("does not authenticate on an unprovable session", async () => {
    // A 401 from /me. Never authenticate on an assumption — there is no
    // local fallback in real-backend mode precisely so this cannot be
    // papered over.
    me.mockRejectedValue(new Error("401"));

    renderProvider();
    await settled();

    expect(screen.getByTestId("session").textContent).toBe("unauthenticated");
    expect(screen.getByTestId("user").textContent).toBe("-");
  });

  it("does not ask for workspaces when there is no session", async () => {
    me.mockRejectedValue(new Error("401"));

    renderProvider();
    await settled();

    expect(list).not.toHaveBeenCalled();
  });

  it("picks one workspace when the account has several", async () => {
    me.mockResolvedValue(profile());
    list.mockResolvedValue([
      workspace("ws_1", "Mabini Legal"),
      workspace("ws_2", "Second Office"),
    ]);

    renderProvider();
    await settled();

    expect(screen.getByTestId("count").textContent).toBe("2");
    expect(screen.getByTestId("current").textContent).not.toBe("-");
  });
});

describe("creating the first workspace", () => {
  /** Runs `createWorkspace` and hands back the context's result. */
  function CreateProbe({ name }: { name: string }) {
    const p = usePlatform();
    return (
      <div>
        <span data-testid="workspace">{p.workspaceStatus}</span>
        <span data-testid="current">{p.currentWorkspace?.name ?? "-"}</span>
        <button onClick={() => { void p.createWorkspace(name); }}>create</button>
      </div>
    );
  }

  it("adopts the created workspace as the active one", async () => {
    me.mockResolvedValue(profile());
    list.mockResolvedValue([]);
    create.mockResolvedValue({
      workspaceId: "ws_new", name: "Santos Legal",
      role: "owner", createdAt: 1_700_000_000_000,
    });

    render(<PlatformProvider><CreateProbe name="Santos Legal" /></PlatformProvider>);
    await waitFor(() => {
      expect(screen.getByTestId("workspace").textContent).toBe("empty");
    });

    await act(async () => { screen.getByRole("button", { name: "create" }).click(); });

    await waitFor(() => {
      expect(screen.getByTestId("workspace").textContent).toBe("ready");
    });
    expect(screen.getByTestId("current").textContent).toBe("Santos Legal");
  });

  it("reuses the idempotency key when the same creation is retried", async () => {
    // A lost RESPONSE and a genuine failure are indistinguishable from here.
    // Retrying the same logical creation must carry the same key, or a
    // request that actually succeeded server-side mints a second tenant
    // with the same name on the retry.
    me.mockResolvedValue(profile());
    list.mockResolvedValue([]);
    create.mockRejectedValueOnce(new Error("timeout"));
    create.mockResolvedValue({
      workspaceId: "ws_new", name: "Santos Legal",
      role: "owner", createdAt: 1_700_000_000_000,
    });

    render(<PlatformProvider><CreateProbe name="Santos Legal" /></PlatformProvider>);
    await waitFor(() => {
      expect(screen.getByTestId("workspace").textContent).toBe("empty");
    });

    const button = screen.getByRole("button", { name: "create" });
    await act(async () => { button.click(); });
    await act(async () => { button.click(); });

    expect(create).toHaveBeenCalledTimes(2);
    const [firstName, firstKey] = create.mock.calls[0] as [string, string];
    const [secondName, secondKey] = create.mock.calls[1] as [string, string];
    expect(firstName).toBe(secondName);
    expect(secondKey).toBe(firstKey);
  });

  it("mints a new key for a different workspace name", async () => {
    // A name change is a different operation. Reusing the key would make the
    // backend dedupe against something the visitor is no longer creating.
    me.mockResolvedValue(profile());
    list.mockResolvedValue([]);
    create.mockRejectedValue(new Error("timeout"));

    function TwoNames() {
      const p = usePlatform();
      return (
        <>
          <span data-testid="workspace">{p.workspaceStatus}</span>
          <button onClick={() => { void p.createWorkspace("First Name"); }}>a</button>
          <button onClick={() => { void p.createWorkspace("Second Name"); }}>b</button>
        </>
      );
    }

    render(<PlatformProvider><TwoNames /></PlatformProvider>);
    await waitFor(() => {
      expect(screen.getByTestId("workspace").textContent).toBe("empty");
    });

    await act(async () => { screen.getByRole("button", { name: "a" }).click(); });
    await act(async () => { screen.getByRole("button", { name: "b" }).click(); });

    const [, keyA] = create.mock.calls[0] as [string, string];
    const [, keyB] = create.mock.calls[1] as [string, string];
    expect(keyB).not.toBe(keyA);
  });

  it("leaves the workspace status alone when creation fails", async () => {
    // Reporting "ready" on a failed creation would send somebody into
    // workspace-scoped pages with no workspace behind them.
    me.mockResolvedValue(profile());
    list.mockResolvedValue([]);
    create.mockRejectedValue(new Error("refused"));

    render(<PlatformProvider><CreateProbe name="Santos Legal" /></PlatformProvider>);
    await waitFor(() => {
      expect(screen.getByTestId("workspace").textContent).toBe("empty");
    });

    await act(async () => { screen.getByRole("button", { name: "create" }).click(); });

    expect(screen.getByTestId("workspace").textContent).toBe("empty");
    expect(screen.getByTestId("current").textContent).toBe("-");
  });
});
