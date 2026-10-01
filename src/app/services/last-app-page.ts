// The last page of the app this tab was on, outside Workspace — where a Free
// account is sent back to when it opens /app/workspace (it has no Workspace
// to manage). Kept in memory only (nothing is written to browser storage), so
// a typed-in URL, which reloads the app, has none: WorkspaceShell then uses
// the browser's own Back. Sign-out forgets it.

import { registerSessionCleanup } from "./session-lifecycle";

export const WORKSPACE_ROOT = "/app/workspace";
export const DEFAULT_APP_PAGE = "/app/dashboard";

let last: string | null = null;

export function isWorkspacePath(pathname: string): boolean {
  return pathname === WORKSPACE_ROOT || pathname.startsWith(`${WORKSPACE_ROOT}/`);
}

/** Remembers an app page (Workspace pages are never "back"). */
export function rememberAppPage(pathname: string, search = ""): void {
  if (!pathname.startsWith("/app/") || isWorkspacePath(pathname)) return;
  last = pathname + search;
}

/** The last app page seen in this tab since it loaded, if any. */
export function lastAppPage(): string | null {
  return last;
}

export function forgetAppPage(): void {
  last = null;
}

registerSessionCleanup({ id: "last-app-page", onSignOut: forgetAppPage });
