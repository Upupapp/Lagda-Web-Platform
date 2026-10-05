// The people a sender may pick as participants: the members of their own
// workspace, with the teams each belongs to.
//
// GET /workspaces/:id/participant-directory. Narrower than the member roster
// (`workspace-members.service.ts`, owners and administrators only): names,
// emails and team names, nothing else, for anyone who may prepare a document.
// A member who may not is answered 403, and the picker simply has no team tabs.

import { apiRequest } from "../api-client";
import { USE_REAL_BACKEND } from "../backend-flag";

export interface DirectoryPerson {
  userId: string;
  displayName: string;
  email: string;
  isCurrentUser: boolean;
  units: { unitId: string; name: string }[];
}

export function participantDirectoryAvailable(workspaceId: string | null | undefined): workspaceId is string {
  return USE_REAL_BACKEND && typeof workspaceId === "string" && workspaceId !== "";
}

export const participantDirectoryService = {
  async list(workspaceId: string): Promise<DirectoryPerson[]> {
    const result = await apiRequest<{ people: DirectoryPerson[] }>(
      `/workspaces/${encodeURIComponent(workspaceId)}/participant-directory`,
    );
    return Array.isArray(result.people) ? result.people : [];
  },
};

/**
 * The directory split the way the picker shows it.
 *
 * "My team" is everyone who shares at least one team with the signed-in
 * person, themselves included (a sender may be a participant too). "Other
 * teams" is the rest of the workspace. Someone in no team at all has no team
 * of their own, so their whole workspace is listed under "Other teams".
 */
export function splitDirectory(people: readonly DirectoryPerson[]): { myTeam: DirectoryPerson[]; others: DirectoryPerson[] } {
  const me = people.find(p => p.isCurrentUser);
  const mine = new Set((me?.units ?? []).map(u => u.unitId));
  const myTeam: DirectoryPerson[] = [], others: DirectoryPerson[] = [];
  for (const person of people) {
    const shares = mine.size > 0 && (person.isCurrentUser || person.units.some(u => mine.has(u.unitId)));
    (shares ? myTeam : others).push(person);
  }
  return { myTeam, others };
}
