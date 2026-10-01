// The photos of a workspace's members, for the Workspace's People & Teams
// tree and its activity log.
//
//   GET /workspaces/:id/people                    each current member's photo version
//   GET /workspaces/:id/members/:userId/avatar?v= the photo (members of the workspace only)
//
// One read per workspace, shared by every component that shows a member
// (a module store), refreshed when the workspace is opened again. A member
// with no photo — or a reader with no backend — gets initials instead.
// Sign-out forgets it.

import { useEffect, useSyncExternalStore } from "react";
import { apiRequest } from "../api-client";
import { API_BASE_URL, USE_REAL_BACKEND } from "../backend-flag";
import { registerSessionCleanup } from "../session-lifecycle";

type Versions = ReadonlyMap<string, string | null>;
const EMPTY: Versions = new Map();

let byWorkspace = new Map<string, Versions>();
const loading = new Map<string, Promise<void>>();
const listeners = new Set<() => void>();
const emit = () => { for (const l of listeners) l(); };

export async function listWorkspacePeople(workspaceId: string): Promise<Versions> {
  const result = await apiRequest<{ people: { userId: string; avatarVersion: string | null }[] }>(
    `/workspaces/${encodeURIComponent(workspaceId)}/people`);
  return new Map(result.people.map(p => [p.userId, p.avatarVersion]));
}

/** Re-reads one workspace's photo versions (after a photo or member change). */
export function refreshWorkspacePeople(workspaceId: string): Promise<void> {
  if (!USE_REAL_BACKEND) return Promise.resolve();
  const running = loading.get(workspaceId);
  if (running) return running;
  const next = listWorkspacePeople(workspaceId)
    .then(versions => { const m = new Map(byWorkspace); m.set(workspaceId, versions); byWorkspace = m; emit(); })
    .catch(() => undefined)
    .finally(() => { loading.delete(workspaceId); });
  loading.set(workspaceId, next);
  return next;
}

/** The photo URL for a member, or undefined when they have none (or it is not known yet). */
export function memberAvatarUrl(workspaceId: string, userId: string | null | undefined, versions: Versions): string | undefined {
  if (!userId || !API_BASE_URL) return undefined;
  const version = versions.get(userId);
  if (!version) return undefined;
  return `${API_BASE_URL}/workspaces/${encodeURIComponent(workspaceId)}/members/${encodeURIComponent(userId)}/avatar?v=${encodeURIComponent(version)}`;
}

/** Photo versions for the workspace's members, read once and shared. */
export function useWorkspacePeople(workspaceId: string | null | undefined): Versions {
  const versions = useSyncExternalStore(
    l => { listeners.add(l); return () => { listeners.delete(l); }; },
    () => (workspaceId ? byWorkspace.get(workspaceId) ?? EMPTY : EMPTY),
    () => EMPTY,
  );
  useEffect(() => { if (workspaceId) void refreshWorkspacePeople(workspaceId); }, [workspaceId]);
  return versions;
}

export function resetWorkspacePeople(): void {
  byWorkspace = new Map();
  loading.clear();
  emit();
}

registerSessionCleanup({ id: "workspace-people", onSignOut: resetWorkspacePeople });
