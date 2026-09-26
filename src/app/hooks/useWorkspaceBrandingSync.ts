// Keeps the current workspace's branding (082) on its badge everywhere.
//
// "Real time" in three layers, cheapest first:
//   1. this tab — the Branding page applies what the server returned the
//      moment a save succeeds (publishWorkspaceBranding);
//   2. this browser's other tabs — the same call broadcasts on a
//      BroadcastChannel, so they apply it without a request;
//   3. everyone else — a re-read when the window regains focus and once a
//      minute while it is visible, so another member's change arrives soon
//      after it is made without anyone reloading.

import { useEffect } from "react";
import { usePlatform } from "../context/PlatformContext";
import { useWorkspaceMode } from "./useWorkspaceAccess";
import {
  realWorkspaceBrandingService, workspaceLogoUrl, type RealWorkspaceBranding,
} from "../services/real/workspace-branding.service";

const CHANNEL = "lagda.workspace-branding";
export const BRANDING_POLL_MS = 60_000;

interface BrandingMessage {
  readonly workspaceId: string;
  readonly branding: RealWorkspaceBranding;
}

function openChannel(): BroadcastChannel | null {
  try {
    return typeof BroadcastChannel === "undefined" ? null : new BroadcastChannel(CHANNEL);
  } catch {
    return null;
  }
}

type ApplyFn = ReturnType<typeof usePlatform>["applyWorkspaceBranding"];
type RenameFn = ReturnType<typeof usePlatform>["applyWorkspaceRename"];

function apply(
  workspaceId: string, branding: RealWorkspaceBranding,
  applyBranding: ApplyFn, applyRename: RenameFn, currentName: string | undefined,
): void {
  applyBranding(workspaceId, {
    brandColor: branding.primaryColor,
    logoUrl: branding.logo === null ? null : workspaceLogoUrl(workspaceId, branding.logo.version),
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
  const channel = openChannel();
  if (channel === null) return;
  try {
    channel.postMessage({ workspaceId, branding } satisfies BrandingMessage);
  } finally {
    channel.close();
  }
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

    const onFocus = () => { load(); };
    const onVisible = () => { if (document.visibilityState === "visible") load(); };
    window.addEventListener("focus", onFocus);
    document.addEventListener("visibilitychange", onVisible);
    const timer = window.setInterval(() => {
      if (document.visibilityState === "visible") load();
    }, BRANDING_POLL_MS);

    const channel = openChannel();
    if (channel !== null) {
      channel.onmessage = (event: MessageEvent<BrandingMessage>) => {
        const message = event.data;
        if (message.workspaceId === workspaceId) {
          apply(workspaceId, message.branding, applyWorkspaceBranding, applyWorkspaceRename, currentName);
        }
      };
    }

    return () => {
      cancelled = true;
      window.removeEventListener("focus", onFocus);
      document.removeEventListener("visibilitychange", onVisible);
      window.clearInterval(timer);
      channel?.close();
    };
    // currentName deliberately excluded: a rename this hook applied must not
    // restart the subscription and trigger another read.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [isReal, workspaceId, applyWorkspaceBranding, applyWorkspaceRename]);
}
