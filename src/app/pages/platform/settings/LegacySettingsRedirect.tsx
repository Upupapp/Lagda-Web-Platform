// Sends an old /app/settings/* address for a workspace-wide setting to its
// new home under Workspace, keeping the rest of the path, the query and the
// hash — so bookmarks, emails and links from before the move still land on
// the right page (an invoice, an integration) rather than a list.

import { Navigate, useLocation } from "react-router";
import { SETTINGS_ROOT } from "./sections";

/** Old first segment under /app/settings → its new root. */
const MOVED: Record<string, string> = {
  branding: "/app/workspace/settings/branding",
  billing: "/app/workspace/settings/billing",
  usage: "/app/workspace/settings/usage",
  integrations: "/app/workspace/settings/integrations",
  organization: "/app/workspace/organization",
};

/** The new address for an old settings path, or null when it did not move. */
export function movedSettingsPath(pathname: string): string | null {
  if (!pathname.startsWith(`${SETTINGS_ROOT}/`)) return null;
  const [first, ...rest] = pathname.slice(SETTINGS_ROOT.length + 1).split("/");
  const root = first === undefined ? undefined : MOVED[first];
  if (root === undefined) return null;
  const tail = rest.filter(Boolean).join("/");
  return tail ? `${root}/${tail}` : root;
}

export function LegacySettingsRedirect() {
  const { pathname, search, hash } = useLocation();
  const to = movedSettingsPath(pathname) ?? SETTINGS_ROOT;
  return <Navigate to={`${to}${search}${hash}`} replace />;
}
