// Tells LAGDA eNotary the colour of the banner this person's workspace shows, so the other party of a request sees the
// same banner on their card. Only a colour is sent, and only when it changes. On a Free plan the banner is LAGDA's own
// (no colour), as on the dashboard.

import { useEffect, useRef } from "react";
import { usePlatform } from "../context/PlatformContext";
import { useWorkspacePlan } from "./usePlans";
import { useWorkspaceBrandingSnapshot } from "./workspace-branding-store";
import { realEnotarySessionsService } from "../services/real/enotary-sessions.service";

export function useEnotaryCardSync(enabled: boolean): void {
  const { currentWorkspace } = usePlatform();
  const workspaceId = currentWorkspace?.id ?? null;
  const saved = useWorkspaceBrandingSnapshot(workspaceId);
  const { plan } = useWorkspacePlan(workspaceId);
  const color = plan === null || plan === "free" ? null : saved?.primaryColor ?? null;
  const sent = useRef<string | null | undefined>(undefined);
  const known = plan !== null;
  useEffect(() => {
    if (!enabled || !known || sent.current === color) return;
    sent.current = color;
    realEnotarySessionsService.saveCard(color !== null && /^#[0-9A-Fa-f]{6}$/.test(color) ? color : null).catch(() => { sent.current = undefined; });
  }, [enabled, known, color]);
}
