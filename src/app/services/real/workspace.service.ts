// Real workspace service — talks to Lagda-Backend's /workspaces routes.
// Bounded to exactly what P1 (workspace bootstrap + active workspace) needs:
// list what the signed-in user can access, and create their first one. No
// members/invitations/roles administration here — that's a later, separate
// Team integration phase.

import { apiRequest } from "../api-client";

// Mirrors the backend's WorkspaceRole enum exactly (openapi.json:
// GET/POST /workspaces). "member" has no direct frontend PlatformRole
// equivalent (see mapWorkspaceRole in workspace-bootstrap.ts) — every other
// value maps 1:1.
export type BackendWorkspaceRole =
  | "owner" | "member" | "administrator" | "template_administrator"
  | "sender" | "reviewer" | "auditor";

export interface RealWorkspaceSummary {
  workspaceId: string;
  name: string;
  role: BackendWorkspaceRole;
  joinedAt: number;
  createdAt: number;
}

export interface RealWorkspaceCreated {
  workspaceId: string;
  name: string;
  role: BackendWorkspaceRole;
  createdAt: number;
}

class RealWorkspaceService {
  // GET /workspaces — every workspace the authenticated user actually
  // belongs to, backend-verified. This list IS the access-authority; nothing
  // else the frontend holds is allowed to add to or override it.
  async list(): Promise<RealWorkspaceSummary[]> {
    const result = await apiRequest<{ workspaces: RealWorkspaceSummary[] }>("/workspaces");
    return result.workspaces;
  }

  // POST /workspaces {name} — creates a workspace with the caller as owner.
  //
  // `idempotencyKey` is REQUIRED by the backend (not optional) — see
  // workspace-routes.ts: a lost response to this request is otherwise
  // indistinguishable from a failure, and the natural retry would create a
  // second permanent tenant with the same name that nothing can currently
  // delete. The caller owns the key's LIFECYCLE (one key per logical
  // creation attempt, reused across retries of that same attempt, replaced
  // only when the user starts a genuinely new one) — see
  // PlatformContext.createWorkspace, the sole caller of this method.
  async create(name: string, idempotencyKey: string): Promise<RealWorkspaceCreated> {
    return apiRequest<RealWorkspaceCreated>("/workspaces", {
      method: "POST",
      body: { name },
      headers: { "Idempotency-Key": idempotencyKey },
    });
  }

  // PATCH /workspaces/:workspaceId {name} — renames a workspace the caller
  // may administer. No Idempotency-Key: an absolute PATCH is already
  // idempotent (see the backend's workspace-routes.ts). Onboarding uses this
  // when the person revisits the Workspace step, so going Back and changing
  // the name never creates a second workspace.
  async rename(workspaceId: string, name: string): Promise<{ workspaceId: string; name: string }> {
    return apiRequest<{ workspaceId: string; name: string }>(
      `/workspaces/${encodeURIComponent(workspaceId)}`,
      { method: "PATCH", body: { name } },
    );
  }
}

export const realWorkspaceService = new RealWorkspaceService();
