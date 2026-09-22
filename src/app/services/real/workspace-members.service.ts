// Real workspace-member DIRECTORY service — talks to Lagda-Backend's
// GET /workspaces/:id/members.
//
// Distinct from services/real/workspace.service.ts, which is bounded to
// "which workspaces can I see, and creating one" (its own header says so
// explicitly). This is the roster of ONE workspace's people — used today to
// populate the "add to unit" picker in the organization-units page, since
// a unit may only be staffed with someone already a member of the
// workspace (the backend enforces this with a compound FK).

import { apiRequest } from "../api-client";
import type { WorkspaceMemberOption } from "../../models/organization";

interface WireMember {
  membershipId: string;
  userId: string;
  email: string;
  displayName: string;
  role: string;
  joinedAt: number;
  isCurrentUser: boolean;
}

class RealWorkspaceMembersService {
  async list(workspaceId: string): Promise<WorkspaceMemberOption[]> {
    const result = await apiRequest<{ members: WireMember[] }>(
      `/workspaces/${encodeURIComponent(workspaceId)}/members`,
    );
    return result.members.map(m => ({
      userId: m.userId, displayName: m.displayName, email: m.email, role: m.role,
    }));
  }
}

export const realWorkspaceMembersService = new RealWorkspaceMembersService();
