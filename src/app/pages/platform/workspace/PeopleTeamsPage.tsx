// /app/workspace/people — People & Teams: the workspace's members and the
// teams they belong to, on one page (real/RealPeopleTeamsPage.tsx says how).
// The demo build has no real teams to draw, so it shows its demonstration
// member directory and teams one after the other.

import { useWorkspaceMode } from "../../../hooks/useWorkspaceAccess";
import { RealPeopleTeamsPage } from "./real/RealPeopleTeamsPage";
import { MembersPage } from "./MembersPage";
import { TeamsPage } from "./TeamsPage";

export function PeopleTeamsPage() {
  const { isReal, workspaceId } = useWorkspaceMode();
  if (isReal && workspaceId !== null) return <RealPeopleTeamsPage key={workspaceId} workspaceId={workspaceId} />;
  return (
    <>
      <MembersPage />
      <TeamsPage />
    </>
  );
}
