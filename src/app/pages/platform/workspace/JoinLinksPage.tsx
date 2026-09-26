// /app/workspace/join-links — single-use join links (078).
//
// Owner / administrator only; the backend refuses everyone else regardless.
// The list itself is JoinLinksSection, the same component the Members page
// used to carry inline.

import { Link } from "react-router";
import { usePlatform } from "../../../context/PlatformContext";
import { USE_REAL_BACKEND } from "../../../services/backend-flag";
import { JoinLinksSection } from "./join/JoinLinksSection";
import { ManagePage, NotAvailable, GF, AZURE } from "./real/manage-ui";
import { useWorkspaceShell } from "./shell/workspace-shell-context";

const CRUMBS = [{ label: "Manage", to: "/app/workspace" }, { label: "Join links" }];

export function JoinLinksPage() {
  const platform = usePlatform();
  const canManageJoin = platform.role === "owner" || platform.role === "administrator";
  const workspaceId = platform.currentWorkspace?.id ?? (USE_REAL_BACKEND ? null : "demo");
  // Sending or withdrawing a link changes the banner count; the shell re-reads it.
  const shell = useWorkspaceShell();

  if (!canManageJoin || workspaceId === null) {
    return <NotAvailable crumbs={CRUMBS} title="Join links"
      message="Only the workspace's owner and administrators can create and send join links." />;
  }

  return (
    <ManagePage crumbs={CRUMBS} title="Join links" maxWidth={900}
      actions={<Link to="/app/workspace/join-requests" style={{ ...GF, fontSize: 13, fontWeight: 600, color: AZURE, textDecoration: "none", padding: "8px 0" }}>Join requests →</Link>}>
      <JoinLinksSection workspaceId={workspaceId} onChanged={shell?.refreshCounts} flush />
    </ManagePage>
  );
}
