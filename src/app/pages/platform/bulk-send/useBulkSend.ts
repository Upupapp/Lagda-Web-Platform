// Shared Bulk Send data hook — Command 33.
// Owns capability resolution, permission mapping, batch loading, and cancellation.

import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { usePlatform, useCapability } from "../../../context/PlatformContext";
import type { BulkSendBatch, BulkSendPermissionContext } from "../../../models/bulk-send";
import { buildBulkSendPermissionContext, isSafeBulkSendId } from "../../../models/bulk-send";
import { bulkSendService, type BulkSendContext } from "../../../services/mock/bulk-send.service";

export const BULK_SEND_CAPABILITY_ID = "bulk-send";

export type BulkSendLoadState = "loading" | "ready" | "not-found" | "restricted" | "error";

export function useBulkSendContext() {
  const { hasPermission, currentWorkspace } = usePlatform();
  const capability = useCapability(BULK_SEND_CAPABILITY_ID);

  const permissions: BulkSendPermissionContext = useMemo(
    () => buildBulkSendPermissionContext({
      hasViewDocuments: hasPermission("view_documents"),
      hasPrepareDocuments: hasPermission("prepare_documents"),
      hasManageContacts: hasPermission("manage_contacts"),
      capabilityAvailable: capability.available,
    }),
    [hasPermission, capability.available],
  );

  const ctx: BulkSendContext = useMemo(() => ({
    workspaceId: currentWorkspace?.id ?? "",
    workspaceName: currentWorkspace?.name ?? "",
    teamId: null,
    capabilityAvailable: capability.available,
    canView: permissions.canViewBulkSend,
    canEdit: permissions.canEditBatch || permissions.canCreateBatch,
  }), [currentWorkspace, capability.available, permissions]);

  return { capability, permissions, ctx, workspaceId: currentWorkspace?.id ?? "" };
}

/** Loads one batch with workspace-switch clearing and stale-request cancellation. */
export function useBatch(batchId: string | undefined) {
  const { capability, permissions, ctx, workspaceId } = useBulkSendContext();
  const [batch, setBatch] = useState<BulkSendBatch | null>(null);
  const [state, setState] = useState<BulkSendLoadState>("loading");
  const [errorMessage, setErrorMessage] = useState<string | null>(null);
  const [key, setKey] = useState(0);

  const reload = useCallback(() => setKey(k => k + 1), []);

  // Clear everything the moment the workspace changes so prior-workspace
  // recipient rows and mappings can never flash.
  const wsRef = useRef(workspaceId);
  useEffect(() => {
    if (wsRef.current !== workspaceId) {
      wsRef.current = workspaceId;
      setBatch(null);
      setState("loading");
      setKey(k => k + 1);
    }
  }, [workspaceId]);

  useEffect(() => {
    if (!batchId) { setState("not-found"); return; }
    if (!isSafeBulkSendId(batchId)) { setState("not-found"); return; }
    if (!capability.available || !permissions.canViewBulkSend) { setState("restricted"); return; }

    const controller = new AbortController();
    let cancelled = false;
    setState("loading");
    setErrorMessage(null);

    bulkSendService.getBatch(batchId, { ...ctx, signal: controller.signal }).then(result => {
      if (cancelled) return;
      if (result.ok) { setBatch(result.data); setState("ready"); }
      else if (result.code === "CANCELLED") { /* superseded */ }
      else if (result.code === "NOT_FOUND") { setBatch(null); setState("not-found"); }
      else if (result.code === "PERMISSION_DENIED" || result.code === "FEATURE_UNAVAILABLE"
        || result.code === "WORKSPACE_RESTRICTED") { setBatch(null); setState("restricted"); }
      else { setBatch(null); setErrorMessage(result.message); setState("error"); }
    }).catch(() => {
      if (!cancelled) { setErrorMessage("The batch could not be loaded."); setState("error"); }
    });

    return () => { cancelled = true; controller.abort(); };
  }, [batchId, key, capability.available, permissions.canViewBulkSend, ctx]);

  return { batch, setBatch, state, errorMessage, reload, capability, permissions, ctx };
}

/**
 * Validated internal return path. Only /app/bulk-send/... is accepted, and no
 * recipient value, mapping, or filename can ever travel in it.
 */
export function safeReturnTo(pathname: string): string {
  if (typeof pathname !== "string") return "/app/bulk-send";
  if (!pathname.startsWith("/app/bulk-send")) return "/app/bulk-send";
  if (pathname.includes("//") || pathname.includes("..") || /[<>"']/.test(pathname)) return "/app/bulk-send";
  return pathname.slice(0, 200);
}
