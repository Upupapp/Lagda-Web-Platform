// Real organization-unit service — talks to Lagda-Backend's workspace-scoped
// unit routes (migration 039, member titles added in 061).
//
//   GET    /workspaces/:id/units
//   POST   /workspaces/:id/units
//   PATCH  /workspaces/:id/units/:unitId
//   POST   /workspaces/:id/units/:unitId/archive
//   GET    /workspaces/:id/units/:unitId/members
//   POST   /workspaces/:id/units/:unitId/members
//   PATCH  /workspaces/:id/units/:unitId/members/:userId
//   DELETE /workspaces/:id/units/:unitId/members/:userId
//
// No mock fallback — see models/organization.ts's header. This file does
// CRUD and nothing else; the page that renders a tree from a flat list is
// organization/OrganizationUnitsPage.tsx.

import { apiRequest } from "../api-client";
import type {
  OrganizationUnit, OrganizationUnitKind, OrganizationUnitMember,
} from "../../models/organization";

interface WireUnit {
  unitId: string;
  parentUnitId: string | null;
  kind: OrganizationUnitKind;
  name: string;
  createdAt: number;
  archivedAt: number | null;
}

interface WireMember {
  userId: string;
  title: string | null;
  displayName: string;
  email: string;
}

const base = (workspaceId: string) => `/workspaces/${encodeURIComponent(workspaceId)}/units`;
const memberBase = (workspaceId: string, unitId: string) =>
  `${base(workspaceId)}/${encodeURIComponent(unitId)}/members`;

class RealOrganizationService {
  async listUnits(workspaceId: string): Promise<OrganizationUnit[]> {
    const result = await apiRequest<{ units: WireUnit[] }>(base(workspaceId));
    return result.units;
  }

  async createUnit(
    workspaceId: string,
    input: { name: string; kind: OrganizationUnitKind; parentUnitId?: string },
  ): Promise<OrganizationUnit> {
    return apiRequest<WireUnit>(base(workspaceId), { method: "POST", body: input });
  }

  /** `parentUnitId` absent leaves the unit where it is; `null` promotes it
   *  to a root. The two are different requests — see the backend schema's
   *  own header on why this file never collapses them. */
  async updateUnit(
    workspaceId: string, unitId: string,
    input: { name: string; parentUnitId?: string | null },
  ): Promise<OrganizationUnit> {
    return apiRequest<WireUnit>(
      `${base(workspaceId)}/${encodeURIComponent(unitId)}`,
      { method: "PATCH", body: input },
    );
  }

  /** Archives, never deletes. The row survives — see the model's header. */
  async archiveUnit(workspaceId: string, unitId: string): Promise<void> {
    await apiRequest<void>(
      `${base(workspaceId)}/${encodeURIComponent(unitId)}/archive`,
      { method: "POST" },
    );
  }

  async listMembers(workspaceId: string, unitId: string): Promise<OrganizationUnitMember[]> {
    const result = await apiRequest<{ members: WireMember[] }>(memberBase(workspaceId, unitId));
    return result.members;
  }

  /** Adds an EXISTING workspace member to the unit, optionally with a
   *  title. A second add of the same person is a no-op on the backend,
   *  not an error — this call may be retried freely. */
  async addMember(
    workspaceId: string, unitId: string,
    input: { userId: string; title?: string | null },
  ): Promise<void> {
    await apiRequest<void>(memberBase(workspaceId, unitId), { method: "POST", body: input });
  }

  /** Removes membership entirely. To change a title without removing
   *  someone, use `setMemberTitle`. */
  async removeMember(workspaceId: string, unitId: string, userId: string): Promise<void> {
    await apiRequest<void>(
      `${memberBase(workspaceId, unitId)}/${encodeURIComponent(userId)}`,
      { method: "DELETE" },
    );
  }

  /** `title: null` clears it — the member stays, they simply no longer
   *  hold a distinguished role in this unit. */
  async setMemberTitle(
    workspaceId: string, unitId: string, userId: string, title: string | null,
  ): Promise<void> {
    await apiRequest<void>(
      `${memberBase(workspaceId, unitId)}/${encodeURIComponent(userId)}`,
      { method: "PATCH", body: { title } },
    );
  }
}

export const realOrganizationService = new RealOrganizationService();
