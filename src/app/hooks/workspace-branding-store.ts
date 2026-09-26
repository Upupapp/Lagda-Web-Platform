// One shared, in-memory copy of each workspace's full branding (082).
//
// Written by useWorkspaceBrandingSync (initial read, focus, 60 s poll,
// other tabs via BroadcastChannel) and by publishWorkspaceBranding right
// after a save on the Branding page; read by anything that shows the
// branding — the Manage → Overview card — so a save appears everywhere at
// once without another request.

import { useSyncExternalStore } from "react";
import type { WorkspaceBranding } from "../models/settings";

export interface WorkspaceBrandingSnapshot {
  readonly displayName: string;
  /** Null when each sender's own name is used. */
  readonly senderDisplayName: string | null;
  readonly footerTagline: string | null;
  /** Null when the workspace keeps the default LAGDA colour. */
  readonly primaryColor: string | null;
  readonly logoUrl: string | null;
  /** Whether the viewer may change the branding. */
  readonly canEdit: boolean;
}

type Listener = () => void;

let snapshots: ReadonlyMap<string, WorkspaceBrandingSnapshot> = new Map();
const listeners = new Set<Listener>();

function emit(): void {
  for (const listener of listeners) listener();
}

export function setWorkspaceBrandingSnapshot(workspaceId: string, snapshot: WorkspaceBrandingSnapshot): void {
  const next = new Map(snapshots);
  next.set(workspaceId, snapshot);
  snapshots = next;
  emit();
}

export function getWorkspaceBrandingSnapshot(workspaceId: string): WorkspaceBrandingSnapshot | null {
  return snapshots.get(workspaceId) ?? null;
}

/** The demo build's single, session-local workspace. */
export const DEMO_BRANDING_KEY = "demo";
const DEMO_DEFAULT_COLOR = "#0078D4";

/** Stores the demo (mock service) branding so the Overview card follows a save. */
export function publishDemoBranding(branding: WorkspaceBranding): void {
  setWorkspaceBrandingSnapshot(DEMO_BRANDING_KEY, {
    displayName: branding.displayName,
    senderDisplayName: branding.senderDisplayName || null,
    footerTagline: branding.footerTagline || null,
    primaryColor: branding.primaryColor === DEMO_DEFAULT_COLOR ? null : branding.primaryColor,
    // A demo logo is a blob: URL the Branding page revokes when it unmounts,
    // so it cannot be shown anywhere else.
    logoUrl: branding.logoPreviewUrl?.startsWith("blob:") ? null : branding.logoPreviewUrl,
    canEdit: true,
  });
}

/** Tests only. */
export function resetWorkspaceBrandingStore(): void {
  snapshots = new Map();
  emit();
}

function subscribe(listener: Listener): () => void {
  listeners.add(listener);
  return () => { listeners.delete(listener); };
}

/** The latest known branding for a workspace, or null before the first read. */
export function useWorkspaceBrandingSnapshot(workspaceId: string | null): WorkspaceBrandingSnapshot | null {
  return useSyncExternalStore(
    subscribe,
    () => (workspaceId === null ? null : snapshots.get(workspaceId) ?? null),
    () => null,
  );
}
