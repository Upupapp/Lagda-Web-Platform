// Session cleanup registry.
//
// WHY THIS EXISTS: `PlatformContext` is mounted at the application root, so
// everything it imports lands in the entry chunk. It used to import eight
// feature services — global search, document organization, workflow automation,
// signing workflow, bulk send, collaboration, contacts and notifications —
// purely so that `signOut` and `switchWorkspace` could call reset methods on
// them. That is roughly 350 KB of source, plus every fixture those services
// reach, downloaded by every visitor on every page for two functions most
// sessions never call. It also inverted the dependency: the shell had to know
// the name of every feature that would ever hold session state.
//
// Now each service registers its own cleanup when it loads, and the shell only
// knows about this registry.
//
// CORRECTNESS: a service that was never loaded has no module-level state, so
// having no cleanup registered for it is not a gap — there is nothing to clear.
// State and registration are created by the same module evaluation, so they
// cannot come apart. Anything that holds session state MUST register here in the
// same module that declares that state, never from a component or a route.

export interface SessionCleanup {
  /**
   * Stable identifier. Also de-duplicates, so a module re-evaluated by HMR
   * replaces its own entry instead of stacking a second copy.
   */
  readonly id: string;
  /** Runs on sign-out. Must leave no data from the signed-out account behind. */
  readonly onSignOut?: () => void;
  /** Runs when the active workspace changes, with the workspace being entered. */
  readonly onWorkspaceSwitch?: (workspaceId: string) => void;
}

const registry = new Map<string, SessionCleanup>();

export function registerSessionCleanup(cleanup: SessionCleanup): void {
  registry.set(cleanup.id, cleanup);
}

/**
 * Runs every registered sign-out cleanup.
 *
 * One throwing handler must not prevent the rest from running: a half-cleared
 * session would leak one feature's data into the next account, which is worse
 * than the original failure. Failures are collected and rethrown together after
 * every handler has had its turn.
 */
export function runSignOutCleanup(): void {
  runAll(c => c.onSignOut?.(), "sign-out");
}

export function runWorkspaceSwitchCleanup(workspaceId: string): void {
  runAll(c => c.onWorkspaceSwitch?.(workspaceId), "workspace-switch");
}

function runAll(invoke: (c: SessionCleanup) => void, phase: string): void {
  const failures: Array<{ id: string; error: unknown }> = [];
  for (const cleanup of registry.values()) {
    try {
      invoke(cleanup);
    } catch (error) {
      failures.push({ id: cleanup.id, error });
    }
  }
  if (failures.length > 0) {
    // Plain Error rather than AggregateError: this project targets ES2020, and
    // the individual causes are carried on the error so nothing is lost.
    const error = new Error(
      `${failures.length} ${phase} cleanup handler(s) failed: ${failures.map(f => f.id).join(", ")}`,
    );
    (error as Error & { causes?: unknown[] }).causes = failures.map(f => f.error);
    throw error;
  }
}

/** Test seam. Never call from application code. */
export function __resetSessionCleanupRegistry(): void {
  registry.clear();
}

/** Test seam: which features currently have cleanup registered. */
export function __registeredCleanupIds(): string[] {
  return [...registry.keys()];
}
