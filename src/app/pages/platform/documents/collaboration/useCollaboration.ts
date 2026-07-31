// Document Collaboration — shared data hooks for every collaboration route.
//
// ONE place builds the viewer identity and permission context. Pages never assemble
// a viewer themselves, because a page that got that wrong would be a visibility bug
// rather than a cosmetic one.

import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { useCapability, usePlatform } from "../../../../context/PlatformContext";
import {
  buildCollaborationPermissionContext,
  type CollaborationMention,
  type CollaborationOverview,
  type CollaborationQuery,
  type CollaborationReview,
  type CollaborationReviewSummary,
  type CollaborationThreadSummary,
  DEFAULT_COLLABORATION_QUERY,
} from "../../../../models/collaboration";
import {
  documentCollaborationService,
  type CollaborationContext,
} from "../../../../services/mock/document-collaboration.service";
import type { CollaborationViewer } from "../../../../services/collaboration.resolver";
import { COLLAB_WORKSPACE_ID, MEMBER_ANA } from "../../../../data/mock/collaboration";

export const COLLABORATION_CAPABILITY_ID = "document-collaboration";

export type CollaborationLoadState = "loading" | "ready" | "restricted" | "not-found" | "error";

/**
 * Builds the viewer once from platform state.
 *
 * `documentAccessible` is passed in by the caller rather than assumed: a document
 * route already resolved whether the transaction could be opened, and collaboration
 * must never widen that answer.
 */
export function useCollaborationViewer(documentAccessible: boolean, isDocumentOwner = false): {
  viewer: CollaborationViewer;
  capabilityAvailable: boolean;
  capabilityReason: string;
  capabilityFallback: string;
} {
  const { user, hasPermission, currentWorkspace } = usePlatform();
  const capability = useCapability(COLLABORATION_CAPABILITY_ID);

  const viewer = useMemo<CollaborationViewer>(() => ({
    // The demonstration identity maps onto the collaboration member directory so
    // authorship, mentions, and reviewer responses line up with the fixtures.
    memberId: user ? MEMBER_ANA : "",
    displayName: user?.displayName ?? "",
    workspaceId: currentWorkspace?.id ?? COLLAB_WORKSPACE_ID,
    teamIds: ["team_nbl_legal", "team_nbl_compliance"],
    permissions: buildCollaborationPermissionContext({
      hasViewDocuments:    hasPermission("view_documents"),
      hasPrepareDocuments: hasPermission("prepare_documents"),
      hasManageTeam:       hasPermission("manage_team"),
      documentAccessible,
      capabilityAvailable: capability.available,
      // Deliberately absent in every current scenario. Participant Visible threads
      // are readable but cannot be created without this separate entitlement.
      participantVisibleEntitlement: false,
    }),
    documentAccessible,
    isDocumentOwner,
  }), [user, currentWorkspace, hasPermission, capability.available, documentAccessible, isDocumentOwner]);

  return {
    viewer,
    capabilityAvailable: capability.available,
    capabilityReason: capability.reasonLabel,
    capabilityFallback: capability.safeFallbackRoute,
  };
}

/** Wraps a service read with abort handling and a stable load state. */
function useServiceRead<T>(
  run: (ctx: CollaborationContext) => Promise<{ ok: true; data: T } | { ok: false; code: string; message: string }>,
  viewer: CollaborationViewer,
  enabled: boolean,
  deps: unknown[],
): { data: T | null; state: CollaborationLoadState; error: string | null; reload: () => void } {
  const [data, setData] = useState<T | null>(null);
  const [state, setState] = useState<CollaborationLoadState>("loading");
  const [error, setError] = useState<string | null>(null);
  const [nonce, setNonce] = useState(0);
  const runRef = useRef(run);
  runRef.current = run;

  useEffect(() => {
    if (!enabled) { setState("restricted"); return; }
    const controller = new AbortController();
    let live = true;
    setState("loading");
    setError(null);

    runRef.current({ viewer, signal: controller.signal }).then((result) => {
      if (!live) return;
      if (result.ok) {
        setData(result.data);
        setState("ready");
      } else if (result.code === "CANCELLED") {
        // A superseded request is not an error the user should ever see.
      } else if (result.code === "PERMISSION_DENIED" || result.code === "DOCUMENT_UNAVAILABLE") {
        setState("restricted");
        setError(result.message);
      } else if (result.code === "NOT_FOUND") {
        setState("not-found");
        setError(result.message);
      } else {
        setState("error");
        setError(result.message);
      }
    });

    return () => { live = false; controller.abort(); };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [enabled, nonce, ...deps]);

  return { data, state, error, reload: useCallback(() => setNonce((n) => n + 1), []) };
}

// ── Document-scoped ───────────────────────────────────────────────────────────

export function useDocumentThreads(
  documentId: string,
  viewer: CollaborationViewer,
  enabled: boolean,
  query: CollaborationQuery = DEFAULT_COLLABORATION_QUERY,
) {
  const q = JSON.stringify(query);
  return useServiceRead<CollaborationThreadSummary[]>(
    (ctx) => documentCollaborationService.listDocumentThreads(documentId, query, ctx),
    viewer, enabled, [documentId, q, viewer.memberId],
  );
}

export function useReviewSummary(documentId: string, viewer: CollaborationViewer, enabled: boolean) {
  return useServiceRead<CollaborationReviewSummary>(
    (ctx) => documentCollaborationService.getReviewSummary(documentId, ctx),
    viewer, enabled, [documentId, viewer.memberId],
  );
}

export function useReview(documentId: string, viewer: CollaborationViewer, enabled: boolean) {
  return useServiceRead<CollaborationReview | null>(
    (ctx) => documentCollaborationService.getReview(documentId, ctx),
    viewer, enabled, [documentId, viewer.memberId],
  );
}

export function useThread(threadId: string, viewer: CollaborationViewer, enabled: boolean) {
  return useServiceRead(
    (ctx) => documentCollaborationService.getThread(threadId, ctx),
    viewer, enabled, [threadId, viewer.memberId],
  );
}

// ── Workspace-scoped (Collaboration Center) ───────────────────────────────────

export function useCollaborationOverview(viewer: CollaborationViewer, enabled: boolean) {
  return useServiceRead<CollaborationOverview>(
    (ctx) => documentCollaborationService.getOverview(ctx),
    viewer, enabled, [viewer.memberId],
  );
}

export function useCenterThreads(
  view: "assigned" | "open" | "blocking" | "resolved" | "owned" | "archived" | "awaiting-my-review",
  viewer: CollaborationViewer,
  enabled: boolean,
) {
  return useServiceRead<CollaborationThreadSummary[]>(
    (ctx) => documentCollaborationService.listCenterThreads(view, ctx),
    viewer, enabled, [view, viewer.memberId],
  );
}

export function useMentions(viewer: CollaborationViewer, enabled: boolean) {
  return useServiceRead<CollaborationMention[]>(
    (ctx) => documentCollaborationService.listMentions(ctx),
    viewer, enabled, [viewer.memberId],
  );
}
