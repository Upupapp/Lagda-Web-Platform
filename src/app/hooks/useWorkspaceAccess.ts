// Real-or-demo mode for the workspace administration pages, and what the
// signed-in person may do in the current workspace.
//
// ── Mode ───────────────────────────────────────────────────────────────────
//
// "Real" means a backend is configured AND a real workspace is active — the
// same rule WorkspaceAdminContext uses. The demo build (no API base URL)
// keeps its fictional data and never reaches the real branch.
//
// ── Access ─────────────────────────────────────────────────────────────────
//
// Starts from the role the session already knows (so nothing flashes while
// loading), then refines it from GET /workspaces/:id/access, which also
// counts the privileges an owner or administrator granted. Any member may
// ask about themselves. The answer only decides what to SHOW; the backend
// re-checks every action on its own.

import { useEffect, useMemo, useState } from "react";
import { usePlatform } from "../context/PlatformContext";
import { USE_REAL_BACKEND } from "../services/backend-flag";
import { realWorkspaceService } from "../services/real/workspace.service";
import type { BackendWorkspaceRole } from "../services/real/workspace-admin.service";
import { ROLE_CAPABILITIES, isBackendWorkspaceRole, type WorkspaceCapabilityId } from "../models/workspace-role-policy";

export interface WorkspaceMode {
  isReal: boolean;
  /** The active real workspace's id; null in the demo build. */
  workspaceId: string | null;
}

export function useWorkspaceMode(): WorkspaceMode {
  const platform = usePlatform();
  const id = platform.currentWorkspace?.id;
  const isReal = USE_REAL_BACKEND && id !== undefined;
  return { isReal, workspaceId: isReal ? id : null };
}

/** The session's platform role, in the backend's vocabulary. */
export function backendRoleFromPlatform(role: string | null | undefined): BackendWorkspaceRole | null {
  if (role === "viewer") return "member";
  return isBackendWorkspaceRole(role ?? undefined) ? (role as BackendWorkspaceRole) : null;
}

export interface WorkspaceAccess {
  role: BackendWorkspaceRole | null;
  capabilities: readonly string[];
  /** The caller's own typed title from the backend, or null. */
  roleTitle: string | null;
  /** True once the backend's own answer has arrived (always true in the demo). */
  confirmed: boolean;
  can: (capability: WorkspaceCapabilityId) => boolean;
}

export function useWorkspaceAccess(): WorkspaceAccess {
  const platform = usePlatform();
  const { isReal, workspaceId } = useWorkspaceMode();
  const fallbackRole = backendRoleFromPlatform(platform.role);
  const [fetched, setFetched] = useState<{ workspaceId: string; role: BackendWorkspaceRole; capabilities: string[]; roleTitle: string | null } | null>(null);

  useEffect(() => {
    if (!isReal || workspaceId === null) return;
    let cancelled = false;
    realWorkspaceService.getAccess(workspaceId)
      .then(access => {
        if (cancelled || !isBackendWorkspaceRole(access.role)) return;
        setFetched({
          workspaceId, role: access.role,
          capabilities: Array.isArray(access.capabilities) ? access.capabilities : [],
          roleTitle: typeof access.roleTitle === "string" && access.roleTitle.trim() !== "" ? access.roleTitle : null,
        });
      })
      .catch(() => { /* keep the session's role; the backend still re-checks every action */ });
    return () => { cancelled = true; };
  }, [isReal, workspaceId]);

  return useMemo(() => {
    const current = fetched !== null && fetched.workspaceId === workspaceId ? fetched : null;
    const role = current?.role ?? fallbackRole;
    const capabilities: readonly string[] = current?.capabilities ?? (role ? ROLE_CAPABILITIES[role] : []);
    return {
      role,
      capabilities,
      roleTitle: current?.roleTitle ?? null,
      confirmed: !isReal || current !== null,
      can: (capability: WorkspaceCapabilityId) => capabilities.includes(capability),
    };
  }, [fetched, workspaceId, fallbackRole, isReal]);
}
