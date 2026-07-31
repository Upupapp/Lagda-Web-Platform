// Shared component-render helpers (Gap Closure Command 6).
//
// These reuse the PRODUCTION providers rather than reimplementing them. A test
// that renders against a hand-built fake context proves nothing about the real
// application — the point of a component test here is that the real
// PlatformContext, the real capability resolver, and the real permission
// resolver all agree.
//
// Deliberately small. There is no bespoke test framework layered on top of
// Testing Library; the helpers below only handle router setup and signing a
// deterministic session in.

import type { ReactElement, ReactNode } from "react";
import { render, screen, waitFor } from "@testing-library/react";
import type { RenderOptions, RenderResult } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { createMemoryRouter, RouterProvider, MemoryRouter } from "react-router";

import { PlatformProvider, usePlatform } from "../app/context/PlatformContext";
import {
  MOCK_CURRENT_USER,
  MOCK_WORKSPACES,
  MOCK_CURRENT_WORKSPACE,
} from "../app/data/mock/workspaces";

/**
 * Signs a deterministic session in as soon as the provider mounts.
 *
 * PlatformProvider starts `initializing` and falls back to `unauthenticated`
 * after 350ms. Component tests for authenticated screens need a session without
 * waiting on that timer, and without stubbing the provider.
 */
function AutoSignIn({
  children,
  workspaceId,
}: {
  children: ReactNode;
  workspaceId?: string;
}) {
  const { sessionStatus, signIn, switchWorkspace } = usePlatform();

  // `MOCK_CURRENT_WORKSPACE` is `MOCK_WORKSPACES[0]`, which is possibly-undefined
  // under noUncheckedIndexedAccess. The fixture list is never empty, so this is a
  // guard for the type system rather than a reachable branch — but failing loudly
  // beats signing in with an undefined workspace if the fixtures ever change.
  const ws = MOCK_CURRENT_WORKSPACE;
  if (!ws) throw new Error("Test fixtures contain no workspace — cannot sign in.");

  if (sessionStatus !== "authenticated") {
    const sub = {
      plan: ws.plan,
      status: "active" as const,
      seatsUsed: ws.memberCount,
      seatsTotal: ws.memberCount + 2,
      renewsOn: "2027-01-01",
    };
    // Synchronous during render is intentional: it puts the tree into its
    // authenticated state before any child effect runs, so tests never observe
    // an intermediate unauthenticated frame.
    signIn(MOCK_CURRENT_USER, MOCK_WORKSPACES, ws, sub as never, []);
    return null;
  }

  if (workspaceId && workspaceId !== ws.id) {
    switchWorkspace(workspaceId);
  }

  return <>{children}</>;
}

export interface AppRenderOptions extends Omit<RenderOptions, "wrapper"> {
  /** Initial URL. Defaults to the platform root. */
  route?: string;
  /** Sign a session in before rendering. Defaults to true. */
  authenticated?: boolean;
  /** Switch to this workspace after signing in. */
  workspaceId?: string;
}

/**
 * Renders a component inside the real platform providers and a memory router.
 *
 * Use for screens that read session, workspace, permission, or capability state.
 * For pure logic, prefer calling the service directly — it is faster and the
 * failure message points at the defect instead of at a render tree.
 */
export function renderWithAppProviders(
  ui: ReactElement,
  options: AppRenderOptions = {},
): RenderResult & { user: ReturnType<typeof userEvent.setup> } {
  const { route = "/app/dashboard", authenticated = true, workspaceId, ...rest } = options;

  const user = userEvent.setup();

  const result = render(
    <MemoryRouter initialEntries={[route]}>
      <PlatformProvider>
        {authenticated ? (
          <AutoSignIn workspaceId={workspaceId}>{ui}</AutoSignIn>
        ) : (
          ui
        )}
      </PlatformProvider>
    </MemoryRouter>,
    rest,
  );

  return { ...result, user };
}

/**
 * Renders with a real route table so route params, guards and fallbacks resolve
 * the way they do in the application.
 */
export function renderWithRouter(
  routes: Parameters<typeof createMemoryRouter>[0],
  options: { route?: string; authenticated?: boolean } = {},
) {
  const { route = "/", authenticated = true } = options;
  const user = userEvent.setup();
  const router = createMemoryRouter(routes, { initialEntries: [route] });

  const result = render(
    <PlatformProvider>
      {authenticated ? (
        <AutoSignIn>
          <RouterProvider router={router} />
        </AutoSignIn>
      ) : (
        <RouterProvider router={router} />
      )}
    </PlatformProvider>,
  );

  return { ...result, user, router };
}

/**
 * Waits until the loading affordances have gone.
 *
 * Prefer this over an arbitrary timeout. LAGDA's mock services use `delay()`, so
 * screens genuinely have a loading phase, and asserting before it clears is the
 * main source of flakiness in this codebase.
 */
export async function waitForStableApp(): Promise<void> {
  await waitFor(() => {
    expect(screen.queryByRole("status", { name: /loading/i })).not.toBeInTheDocument();
  });
}

export { screen, waitFor, userEvent };
export { within, fireEvent } from "@testing-library/react";
