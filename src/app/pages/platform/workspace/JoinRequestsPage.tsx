// /app/workspace/join-requests — people waiting to join (078).
//
// Owner / administrator only; the backend refuses everyone else regardless.
// The list itself is JoinRequestsSection, the same component the Members
// page used to carry inline.

import { useState } from "react";
import { Link } from "react-router";
import { usePlatform } from "../../../context/PlatformContext";
import { USE_REAL_BACKEND } from "../../../services/backend-flag";
import { JoinRequestsSection } from "./join/JoinRequestsSection";
import { ManagePage, NotAvailable, GF, AZURE } from "./real/manage-ui";

const CRUMBS = [{ label: "Manage", to: "/app/workspace" }, { label: "Join requests" }];

export function JoinRequestsPage() {
  const platform = usePlatform();
  const canManageJoin = platform.role === "owner" || platform.role === "administrator";
  // The demo build has no real workspace id; its join service ignores it.
  const workspaceId = platform.currentWorkspace?.id ?? (USE_REAL_BACKEND ? null : "demo");
  const [pending, setPending] = useState(0);

  if (!canManageJoin || workspaceId === null) {
    return <NotAvailable crumbs={CRUMBS} title="Join requests"
      message="Only the workspace's owner and administrators can review join requests." />;
  }

  return (
    <ManagePage crumbs={CRUMBS} title="Join requests" maxWidth={900}
      badge={pending > 0 ? (
        <span data-testid="pending-requests-badge" style={{ ...GF, fontSize: 12, fontWeight: 700, color: "#8A5A00", background: "#FFF8E1", border: "1px solid #F5D98B", borderRadius: 999, padding: "3px 10px" }}>
          {pending} waiting
        </span>
      ) : undefined}
      actions={<Link to="/app/workspace/join-links" style={{ ...GF, fontSize: 13, fontWeight: 600, color: AZURE, textDecoration: "none", padding: "8px 0" }}>Join links →</Link>}>
      <JoinRequestsSection workspaceId={workspaceId} onPendingCount={setPending} flush />
    </ManagePage>
  );
}
