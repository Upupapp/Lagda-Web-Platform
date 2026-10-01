// Where the Workspace's old paths go now (People & Teams, the Invitations
// hub, and Roles behind the gear), so every bookmark, notice and email link
// still lands somewhere sensible. Query strings are kept: a decline notice's
// `?invitation=<id>` still focuses that invitation.

import { Navigate, useLocation, useParams } from "react-router";

const PEOPLE = "/app/workspace/people";

function withQuery(path: string, extra: Record<string, string>, search: string): string {
  const params = new URLSearchParams(search);
  for (const [k, v] of Object.entries(extra)) params.set(k, v);
  const q = params.toString();
  return q === "" ? path : `${path}?${q}`;
}

/** /members, /teams, /organization → People & Teams. */
export function ToPeople() {
  const { search } = useLocation();
  return <Navigate to={withQuery(PEOPLE, {}, search)} replace />;
}

/** /members/:memberId → People & Teams with that person's panel open. */
export function ToPerson() {
  const { memberId = "" } = useParams();
  const { search } = useLocation();
  return <Navigate to={withQuery(PEOPLE, { member: memberId }, search)} replace />;
}

/** /teams/:teamId → People & Teams, scrolled to that team. */
export function ToTeam() {
  const { teamId = "" } = useParams();
  const { search } = useLocation();
  return <Navigate to={withQuery(PEOPLE, { team: teamId }, search)} replace />;
}

/**
 * /invitations, /invite → Invitations › Sent; /join-links and /join-requests
 * open the Invite people panel on that tab as well.
 */
export function ToSentInvitations({ panel }: { panel?: "links" | "requests" }) {
  const { search } = useLocation();
  return <Navigate to={withQuery("/app/invitations", { view: "sent", ...(panel ? { panel } : {}) }, search)} replace />;
}

/** /roles[/:roleId] → Workspace settings › Roles & permissions. */
export function ToRoles() {
  const { roleId } = useParams();
  const { search } = useLocation();
  const path = roleId ? `/app/workspace/settings/roles/${encodeURIComponent(roleId)}` : "/app/workspace/settings/roles";
  return <Navigate to={withQuery(path, {}, search)} replace />;
}
