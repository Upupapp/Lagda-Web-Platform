// Keeps the current workspace's branding (082) on its badge everywhere.
//
// "Real time" in three layers, cheapest first:
//   1. this tab — the Branding page applies what the server returned the
//      moment a save succeeds (publishWorkspaceBranding);
//   2. this browser's other tabs — the same call announces the `workspace`
//      topic (services/live/topics.ts), and they re-read at once;
//   3. everyone else — a re-read once a minute on the app's heartbeat
//      (services/live/heartbeat.ts), so another member's change arrives soon
//      after it is made without anyone reloading.

import { useEffect } from "react";
import { usePlatform } from "../context/PlatformContext";
import { useWorkspaceMode } from "./useWorkspaceAccess";
import {
  realWorkspaceBrandingService, workspaceLogoUrl, type RealWorkspaceBranding,
} from "../services/real/workspace-branding.service";
import { setWorkspaceBrandingSnapshot } from "./workspace-branding-store";
import { onHeartbeat } from "../services/live/heartbeat";
import { announce, onTopic } from "../services/live/topics";
import { SETTINGS_TTL_MS } from "../services/live/live-query";

export const BRANDING_POLL_MS = SETTINGS_TTL_MS;

type ApplyFn = ReturnType<typeof usePlatform>["applyWorkspaceBranding"];
type RenameFn = ReturnType<typeof usePlatform>["applyWorkspaceRename"];

function apply(
  workspaceId: string, branding: RealWorkspaceBranding,
  applyBranding: ApplyFn, applyRename: RenameFn, currentName: string | undefined,
): void {
  const logoUrl = branding.logo === null ? null : workspaceLogoUrl(workspaceId, branding.logo.version);
  applyBranding(workspaceId, { brandColor: branding.primaryColor, logoUrl });
  // The full branding, for the Overview card and anything else that shows it.
  setWorkspaceBrandingSnapshot(workspaceId, {
    displayName: branding.displayName,
    senderDisplayName: branding.senderDisplayName,
    footerTagline: branding.footerTagline,
    primaryColor: branding.primaryColor,
    logoUrl,
    canEdit: branding.canEdit,
  });
  if (currentName !== undefined && currentName !== branding.displayName) {
    applyRename(workspaceId, branding.displayName);
  }
}

/**
 * Called by whoever just saved branding: applies it in this tab and tells
 * this browser's other tabs.
 */
export function publishWorkspaceBranding(
  workspaceId: string, branding: RealWorkspaceBranding,
  platform: Pick<ReturnType<typeof usePlatform>, "applyWorkspaceBranding" | "applyWorkspaceRename" | "currentWorkspace">,
): void {
  apply(workspaceId, branding, platform.applyWorkspaceBranding, platform.applyWorkspaceRename,
    platform.currentWorkspace?.id === workspaceId ? platform.currentWorkspace.name : undefined);
  announce("workspace", { remoteOnly: true });
}

/** Mounted once, in the platform layout. Does nothing in the demo. */
export function useWorkspaceBrandingSync(): void {
  const platform = usePlatform();
  const { isReal, workspaceId } = useWorkspaceMode();
  const { applyWorkspaceBranding, applyWorkspaceRename } = platform;
  const currentName = platform.currentWorkspace?.name;

  useEffect(() => {
    if (!isReal || workspaceId === null) return;
    let cancelled = false;
    const load = () => {
      realWorkspaceBrandingService.get(workspaceId)
        .then(branding => {
          if (!cancelled) apply(workspaceId, branding, applyWorkspaceBranding, applyWorkspaceRename, currentName);
        })
        // A failed read leaves the last known branding in place; the badge
        // falls back to the workspace colour, never to an error.
        .catch(() => { /* keep what is shown */ });
    };
    load();

    const offs = [onHeartbeat(load, { every: BRANDING_POLL_MS }), onTopic("workspace", load)];
    return () => {
      cancelled = true;
      for (const off of offs) off();
    };
    // currentName deliberately excluded: a rename this hook applied must not
    // restart the subscription and trigger another read.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [isReal, workspaceId, applyWorkspaceBranding, applyWorkspaceRename]);
}
