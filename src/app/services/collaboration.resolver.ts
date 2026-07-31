// Collaboration resolvers — Command 34.
//
// FOUR centralized resolvers, one implementation each. No screen, component, or hook
// re-implements any of this logic:
//
//   1. resolveThreadVisibility  — who may see a thread, and how much
//   2. resolveThreadActions     — which actions are available, and why not when they are not
//   3. resolveMentionEligibility— who may be mentioned
//   4. resolveAnchor            — where an anchor points, and whether it is still valid
//
// Plus the shared derivations that must not diverge between screens:
// summary counts, filtering, sorting, and readiness.
//
// SECURITY POSTURE: every one of these fails CLOSED. An unknown viewer, an unknown
// thread, a missing permission, or an inaccessible document all resolve to unavailable
// rather than to a permissive default.

import {
  ACTIVE_THREAD_STATUSES,
  COLLAB_MAX_MENTIONS,
  type CollaborationAction,
  type CollaborationActionAvailability,
  type CollaborationAnchor,
  type CollaborationAnchorAvailability,
  type CollaborationAnchorType,
  type CollaborationComment,
  type CollaborationMention,
  type CollaborationMentionEligibility,
  type CollaborationMentionTarget,
  type CollaborationPermissionContext,
  type CollaborationQuery,
  type CollaborationReview,
  type CollaborationReviewSummary,
  type CollaborationSortField,
  type CollaborationThread,
  type CollaborationThreadPriority,
  type CollaborationThreadStatus,
  type CollaborationThreadSummary,
  type CollaborationVisibilityResolution,
  EMPTY_REVIEW_SUMMARY,
  isSafeCollaborationId,
} from "../models/collaboration";

// ── Viewer context ────────────────────────────────────────────────────────────

export interface CollaborationViewer {
  memberId:    string;
  displayName: string;
  workspaceId: string;
  /** Teams the viewer belongs to. Drives internal-team visibility. */
  teamIds:     string[];
  permissions: CollaborationPermissionContext;
  /** Whether the viewer can open the document at all. Collaboration never widens this. */
  documentAccessible: boolean;
  /** True when the viewer owns or sent the document. */
  isDocumentOwner: boolean;
}

export const ANONYMOUS_VIEWER: CollaborationViewer = {
  memberId: "", displayName: "", workspaceId: "", teamIds: [],
  permissions: {
    canViewCollaboration: false, canCreateInternalComments: false, canReply: false,
    canEditOwnComments: false, canRemoveOwnComments: false, canModerateComments: false,
    canMentionMembers: false, canResolveThreads: false, canReopenThreads: false,
    canManagePriority: false, canManageVisibility: false, canMarkBlocking: false,
    canManageReview: false, canAssignReviewers: false, canUpdateOwnReviewerResponse: false,
    canCreateParticipantVisible: false, canViewCollaborationCenter: false,
    canCreatePersonalDraftNotes: false,
  },
  documentAccessible: false,
  isDocumentOwner: false,
};

// ══════════════════════════════════════════════════════════════════════════════
// RESOLVER 1 — Visibility
// ══════════════════════════════════════════════════════════════════════════════

const RESTRICTED_EXPLANATION =
  "A discussion exists here that is not available to you. Ask the document owner if you need access.";

const HIDDEN_EXPLANATION =
  "This discussion is not available in your current context.";

/**
 * THE visibility resolver. Every read path calls this — list, detail, search,
 * notification, Collaboration Center, and the thread count on Document Details.
 *
 * Order matters and is deliberate:
 *   1. Personal Draft Notes are checked FIRST and are absolute. A Workspace
 *      Administrator, a document owner, and an assigned reviewer are all denied
 *      equally. There is no elevation path and the note's existence is not
 *      disclosed either.
 *   2. Document access is checked BEFORE thread rules. A thread can never be the
 *      reason someone reaches a document they otherwise could not open.
 *   3. Only then does thread visibility apply.
 */
export function resolveThreadVisibility(
  thread: CollaborationThread,
  viewer: CollaborationViewer,
): CollaborationVisibilityResolution {
  // 1. Personal Draft Notes — author only, existence not disclosed.
  if (thread.visibility === "personal-draft-note") {
    if (viewer.memberId && thread.createdByMemberId === viewer.memberId) {
      return { outcome: "allowed", explanation: "", maySeeExistence: true };
    }
    return { outcome: "unavailable", explanation: HIDDEN_EXPLANATION, maySeeExistence: false };
  }

  // 2. Capability and document access gate everything else.
  if (!viewer.permissions.canViewCollaboration || !viewer.documentAccessible) {
    return { outcome: "unavailable", explanation: HIDDEN_EXPLANATION, maySeeExistence: false };
  }

  // 3. Workspace boundary.
  if (thread.workspaceId !== viewer.workspaceId) {
    return { outcome: "unavailable", explanation: HIDDEN_EXPLANATION, maySeeExistence: false };
  }

  switch (thread.visibility) {
    case "internal-workspace":
      return { outcome: "allowed", explanation: "", maySeeExistence: true };

    case "internal-team": {
      const inTeam = !!thread.teamId && viewer.teamIds.includes(thread.teamId);
      if (inTeam || viewer.isDocumentOwner) {
        return { outcome: "allowed", explanation: "", maySeeExistence: true };
      }
      // Existence may be shown so the thread count is not silently wrong, but no
      // title, no body, no author, and no participant list.
      return { outcome: "restricted", explanation: RESTRICTED_EXPLANATION, maySeeExistence: true };
    }

    case "owner-and-reviewers": {
      const isAuthor   = thread.createdByMemberId === viewer.memberId;
      const isReviewer = thread.assignedReviewerMemberIds.includes(viewer.memberId);
      if (viewer.isDocumentOwner || isAuthor || isReviewer) {
        return { outcome: "allowed", explanation: "", maySeeExistence: true };
      }
      return { outcome: "restricted", explanation: RESTRICTED_EXPLANATION, maySeeExistence: true };
    }

    case "participant-visible":
      // Internal viewers see it as any other internal thread. The recipient
      // projection is a separate, explicitly confirmed preview — never automatic.
      return { outcome: "allowed", explanation: "", maySeeExistence: true };

    default:
      return { outcome: "unavailable", explanation: HIDDEN_EXPLANATION, maySeeExistence: false };
  }
}

/** Threads the viewer may at least know about, in stable order. */
export function filterVisibleThreads(
  threads: CollaborationThread[],
  viewer: CollaborationViewer,
): Array<{ thread: CollaborationThread; resolution: CollaborationVisibilityResolution }> {
  return threads
    .map((thread) => ({ thread, resolution: resolveThreadVisibility(thread, viewer) }))
    .filter((entry) => entry.resolution.maySeeExistence);
}

/**
 * Comment-level redaction. A restricted thread yields NO comments at all — the
 * caller must never receive bodies it is then trusted to hide in the view layer.
 */
export function redactComments(
  thread: CollaborationThread,
  resolution: CollaborationVisibilityResolution,
): CollaborationComment[] {
  if (resolution.outcome !== "allowed") return [];
  return thread.comments.filter((c) => c.status !== "removed-in-demonstration" || c.authoredByCurrentUser);
}

// ══════════════════════════════════════════════════════════════════════════════
// RESOLVER 2 — Actions
// ══════════════════════════════════════════════════════════════════════════════

const NO_PERMISSION      = "You do not have permission for this action in this workspace.";
const NOT_YOUR_COMMENT   = "You can only edit or remove comments you wrote.";
const THREAD_ARCHIVED    = "This thread is archived. Restore it to continue the discussion.";
const THREAD_RESOLVED    = "This thread is resolved. Reopen it to continue the discussion.";
const NOT_RESOLVED       = "This thread is not resolved.";
const ALREADY_BLOCKING   = "This thread is already marked as blocking in this demonstration.";
const NOT_BLOCKING       = "This thread is not marked as blocking.";
const PERSONAL_NOTE      = "Personal Draft Notes are private to you and support no shared actions.";
const NEEDS_ENTITLEMENT  = "Participant Visible threads require a separate entitlement that is not enabled.";
const NOT_AVAILABLE_HERE = "This action is not available for this thread.";

function av(action: CollaborationAction, available: boolean, reason: string | null): CollaborationActionAvailability {
  return { action, available, reason: available ? null : (reason ?? NOT_AVAILABLE_HERE) };
}

/**
 * THE action resolver. Returns availability AND a reason for every action, so no
 * control anywhere is ever silently disabled — a disabled control with no
 * explanation was a repeat finding in earlier audits.
 */
export function resolveThreadActions(
  thread: CollaborationThread,
  viewer: CollaborationViewer,
  resolution?: CollaborationVisibilityResolution,
): Record<CollaborationAction, CollaborationActionAvailability> {
  const vis = resolution ?? resolveThreadVisibility(thread, viewer);
  const p = viewer.permissions;
  const readable  = vis.outcome === "allowed";
  const isPersonal = thread.visibility === "personal-draft-note";
  const isAuthor  = thread.createdByMemberId === viewer.memberId;
  const archived  = thread.status === "archived";
  const resolved  = thread.status === "resolved";
  const blocking  = thread.status === "blocking-demonstration";

  // A Personal Draft Note supports only its author's own edit/remove. It cannot be
  // resolved, assigned, mentioned in, made blocking, or made visible to anyone.
  const personalBlocked = (a: CollaborationAction) =>
    av(a, false, isPersonal ? PERSONAL_NOTE : NOT_AVAILABLE_HERE);

  const writable = readable && !archived && !isPersonal;
  const writeReason = !readable ? vis.explanation || NO_PERMISSION
    : archived ? THREAD_ARCHIVED
    : isPersonal ? PERSONAL_NOTE
    : NO_PERMISSION;

  return {
    "view-thread": av("view-thread", readable, vis.explanation || NO_PERMISSION),

    "create-thread": av("create-thread", p.canCreateInternalComments, NO_PERMISSION),

    "create-comment": av("create-comment",
      (writable || (isPersonal && isAuthor && !archived)) && p.canCreateInternalComments,
      writeReason),

    "reply-to-thread": isPersonal ? personalBlocked("reply-to-thread")
      : av("reply-to-thread",
          writable && p.canReply && !resolved,
          resolved ? THREAD_RESOLVED : writeReason),

    "edit-own-comment": av("edit-own-comment",
      readable && !archived && p.canEditOwnComments,
      archived ? THREAD_ARCHIVED : NO_PERMISSION),

    "remove-own-comment-demonstration": av("remove-own-comment-demonstration",
      readable && !archived && p.canRemoveOwnComments,
      archived ? THREAD_ARCHIVED : NO_PERMISSION),

    "moderate-comment": isPersonal ? personalBlocked("moderate-comment")
      : av("moderate-comment", readable && p.canModerateComments, NO_PERMISSION),

    "resolve-thread": isPersonal ? personalBlocked("resolve-thread")
      : av("resolve-thread",
          writable && p.canResolveThreads && !resolved,
          resolved ? "This thread is already resolved." : writeReason),

    "reopen-thread": isPersonal ? personalBlocked("reopen-thread")
      : av("reopen-thread",
          readable && !archived && p.canReopenThreads && resolved,
          !resolved ? NOT_RESOLVED : archived ? THREAD_ARCHIVED : NO_PERMISSION),

    "archive-thread": isPersonal
      ? av("archive-thread", readable && isAuthor && !archived, archived ? THREAD_ARCHIVED : PERSONAL_NOTE)
      : av("archive-thread", readable && p.canResolveThreads && !archived,
          archived ? THREAD_ARCHIVED : NO_PERMISSION),

    "restore-thread": av("restore-thread",
      readable && archived && (isPersonal ? isAuthor : p.canResolveThreads),
      !archived ? "This thread is not archived." : NO_PERMISSION),

    "change-visibility": isPersonal ? personalBlocked("change-visibility")
      : av("change-visibility", writable && p.canManageVisibility, writeReason),

    "mark-blocking-demonstration": isPersonal ? personalBlocked("mark-blocking-demonstration")
      : av("mark-blocking-demonstration",
          writable && p.canMarkBlocking && !blocking && !resolved,
          blocking ? ALREADY_BLOCKING : resolved ? THREAD_RESOLVED : writeReason),

    "remove-blocking-demonstration": isPersonal ? personalBlocked("remove-blocking-demonstration")
      : av("remove-blocking-demonstration",
          writable && p.canMarkBlocking && blocking,
          !blocking ? NOT_BLOCKING : writeReason),

    "change-priority": isPersonal ? personalBlocked("change-priority")
      : av("change-priority", writable && p.canManagePriority, writeReason),

    "change-category": isPersonal ? personalBlocked("change-category")
      : av("change-category", writable && p.canManagePriority, writeReason),

    "mention-member": isPersonal
      ? av("mention-member", false, PERSONAL_NOTE)
      : av("mention-member", writable && p.canMentionMembers, writeReason),

    "create-participant-visible-thread": av("create-participant-visible-thread",
      p.canCreateParticipantVisible, NEEDS_ENTITLEMENT),

    "create-personal-draft-note": av("create-personal-draft-note",
      p.canCreatePersonalDraftNotes, NO_PERMISSION),

    "manage-review": av("manage-review", p.canManageReview, NO_PERMISSION),

    "assign-reviewers": av("assign-reviewers", p.canAssignReviewers, NO_PERMISSION),

    "update-own-reviewer-response": av("update-own-reviewer-response",
      p.canUpdateOwnReviewerResponse, NO_PERMISSION),
  };
}

export function isActionAvailable(
  actions: Record<CollaborationAction, CollaborationActionAvailability>,
  action: CollaborationAction,
): boolean {
  return actions[action]?.available === true;
}

/** Comment-scoped narrowing: authorship is checked here, not in the view layer. */
export function resolveCommentActions(
  comment: CollaborationComment,
  threadActions: Record<CollaborationAction, CollaborationActionAvailability>,
): { canEdit: CollaborationActionAvailability; canRemove: CollaborationActionAvailability } {
  const own = comment.authoredByCurrentUser;
  const gone = comment.status === "removed-in-demonstration";
  const base = threadActions["edit-own-comment"];
  const rem  = threadActions["remove-own-comment-demonstration"];
  return {
    canEdit: {
      action: "edit-own-comment",
      available: own && !gone && base.available,
      reason: !own ? NOT_YOUR_COMMENT : gone ? "This comment was removed from the demonstration." : base.reason,
    },
    canRemove: {
      action: "remove-own-comment-demonstration",
      available: own && !gone && rem.available,
      reason: !own ? NOT_YOUR_COMMENT : gone ? "This comment was already removed." : rem.reason,
    },
  };
}

// ══════════════════════════════════════════════════════════════════════════════
// RESOLVER 3 — Mention eligibility
// ══════════════════════════════════════════════════════════════════════════════

export interface MentionCandidate {
  memberId:    string;
  displayName: string;
  roleLabel:   string;
  teamIds:     string[];
  teamName:    string | null;
  workspaceId: string;
  /** Whether this member can already open the document. A mention never changes this. */
  hasDocumentAccess: boolean;
  /** Suspended and deactivated members are never mentionable. */
  active: boolean;
}

/**
 * THE mention-eligibility resolver.
 *
 * A mention is a pointer, never a grant. Only members who ALREADY have access to
 * this document AND would already be able to read a thread at this visibility are
 * eligible. Everyone else is excluded by COUNT ONLY — listing their names would
 * itself leak Workspace membership to someone not entitled to see it.
 *
 * Contacts are deliberately not candidates: a Contact is a directory entry, not a
 * Workspace Member, and mentioning one would imply an access relationship that
 * does not exist.
 */
export function resolveMentionEligibility(
  candidates: MentionCandidate[],
  context: {
    viewer: CollaborationViewer;
    visibility: CollaborationThread["visibility"];
    teamId: string | null;
    assignedReviewerMemberIds: string[];
    documentOwnerMemberId: string;
  },
): CollaborationMentionEligibility {
  const { viewer, visibility } = context;

  if (visibility === "personal-draft-note") {
    return {
      eligible: [],
      excludedCount: 0,
      notice: "Personal Draft Notes are private to you and cannot mention anyone.",
    };
  }

  if (!viewer.permissions.canMentionMembers) {
    return {
      eligible: [],
      excludedCount: 0,
      notice: "You do not have permission to mention members in this workspace.",
    };
  }

  const eligible: CollaborationMentionTarget[] = [];
  let excluded = 0;

  for (const c of candidates) {
    if (!isSafeCollaborationId(c.memberId)) { excluded++; continue; }
    if (c.workspaceId !== viewer.workspaceId) { excluded++; continue; }
    if (!c.active) { excluded++; continue; }
    if (!c.hasDocumentAccess) { excluded++; continue; }

    let reason: string;
    if (visibility === "internal-team") {
      const inTeam = !!context.teamId && c.teamIds.includes(context.teamId);
      const isOwner = c.memberId === context.documentOwnerMemberId;
      if (!inTeam && !isOwner) { excluded++; continue; }
      reason = inTeam
        ? `Member of ${c.teamName ?? "this team"} with access to this document.`
        : "Document owner with access to this document.";
    } else if (visibility === "owner-and-reviewers") {
      const isOwner    = c.memberId === context.documentOwnerMemberId;
      const isReviewer = context.assignedReviewerMemberIds.includes(c.memberId);
      if (!isOwner && !isReviewer) { excluded++; continue; }
      reason = isOwner ? "Document owner." : "Assigned internal reviewer with existing access.";
    } else {
      reason = "Workspace member with access to this document.";
    }

    eligible.push({
      memberId: c.memberId,
      displayName: c.displayName,
      roleLabel: c.roleLabel,
      teamName: c.teamName,
      accessReason: reason,
    });
  }

  eligible.sort((a, b) => a.displayName.localeCompare(b.displayName));

  const notice = excluded > 0
    ? `${excluded} workspace ${excluded === 1 ? "member is" : "members are"} not shown because they do not already have access to this document. Mentioning someone never grants access.`
    : "Only members who already have access to this document are shown. Mentioning someone never grants access.";

  return { eligible, excludedCount: excluded, notice };
}

/** Enforced at the model boundary, not just in the picker UI. */
export function clampMentions(memberIds: string[]): { accepted: string[]; droppedCount: number } {
  const unique = Array.from(new Set(memberIds.filter(isSafeCollaborationId)));
  return {
    accepted: unique.slice(0, COLLAB_MAX_MENTIONS),
    droppedCount: Math.max(0, unique.length - COLLAB_MAX_MENTIONS),
  };
}

// ══════════════════════════════════════════════════════════════════════════════
// RESOLVER 4 — Anchors
// ══════════════════════════════════════════════════════════════════════════════

export interface AnchorResolutionContext {
  documentId:   string;
  /** IDs still present in the current document, per anchor type. */
  knownFieldIds:   string[];
  knownStageIds:   string[];
  knownRoleIds:    string[];
  knownFolderIds:  string[];
  knownTagIds:     string[];
  pageCount:       number;
  documentAccessible: boolean;
  canViewVerification: boolean;
  canViewBulkSend:     boolean;
}

const STALE_REASON =
  "The item this discussion referred to is no longer part of this document. The discussion is kept for reference.";
const RESTRICTED_ANCHOR_REASON =
  "You do not have access to the item this discussion refers to.";

/**
 * THE anchor resolver. Anchors are references, never annotations — nothing here
 * modifies a PDF, and no anchor ever carries document text or a field value.
 *
 * A stale anchor never breaks the thread: the thread stays readable and the anchor
 * degrades to a labelled, non-navigable reference.
 */
export function resolveAnchor(
  anchor: CollaborationAnchor,
  ctx: AnchorResolutionContext,
): CollaborationAnchor {
  const base = `/app/documents/${encodeURIComponent(ctx.documentId)}`;

  if (!ctx.documentAccessible || !isSafeCollaborationId(ctx.documentId)) {
    return { ...anchor, availability: "unavailable", destination: null, unavailableReason: RESTRICTED_ANCHOR_REASON };
  }

  const stale = (): CollaborationAnchor =>
    ({ ...anchor, availability: "stale", destination: null, unavailableReason: STALE_REASON });
  const restricted = (): CollaborationAnchor =>
    ({ ...anchor, availability: "restricted", destination: null, unavailableReason: RESTRICTED_ANCHOR_REASON });
  const ok = (destination: string): CollaborationAnchor =>
    ({ ...anchor, availability: "available", destination, unavailableReason: null });

  const id = anchor.resourceId;
  const known = (list: string[]) => !!id && isSafeCollaborationId(id) && list.includes(id);

  switch (anchor.type) {
    case "document":
      return ok(base);

    case "page-direction": {
      const page = anchor.pageDirection;
      if (page === null || page < 1 || page > Math.max(1, ctx.pageCount)) return stale();
      return ok(base);
    }

    case "template-field":
      return known(ctx.knownFieldIds) ? ok(`${base}/fields`) : stale();

    case "routing-stage":
      return known(ctx.knownStageIds) ? ok(`${base}/workflow/${encodeURIComponent(id as string)}`) : stale();

    case "participant-role":
      return known(ctx.knownRoleIds) ? ok(`${base}/participants`) : stale();

    case "transaction-setting":
      return ok(base);

    case "preparation-step":
      return ok(`${base}/prepare`);

    case "verification-summary":
      if (!ctx.canViewVerification) return restricted();
      return ok(`${base}/verification`);

    case "folder":
      return known(ctx.knownFolderIds) ? ok(`/app/documents?folder=${encodeURIComponent(id as string)}`) : stale();

    case "tag":
      return known(ctx.knownTagIds) ? ok(`/app/documents?tag=${encodeURIComponent(id as string)}`) : stale();

    case "bulk-send-review":
      if (!ctx.canViewBulkSend) return restricted();
      if (!id || !isSafeCollaborationId(id)) return stale();
      return ok(`/app/bulk-send/${encodeURIComponent(id)}/review`);

    default:
      return stale();
  }
}

export function anchorIsNavigable(anchor: CollaborationAnchor): boolean {
  return anchor.availability === "available" && typeof anchor.destination === "string";
}

export function describeAnchor(anchor: CollaborationAnchor): string {
  if (anchor.type === "page-direction" && anchor.pageDirection !== null) {
    return `Page ${anchor.pageDirection} (direction only)`;
  }
  return anchor.label;
}

// ══════════════════════════════════════════════════════════════════════════════
// Shared derivations — counts, filtering, sorting
// ══════════════════════════════════════════════════════════════════════════════

const PRIORITY_WEIGHT: Record<CollaborationThreadPriority, number> = {
  "high-attention": 0, "attention": 1, "normal": 2,
};

const STATUS_WEIGHT: Record<CollaborationThreadStatus, number> = {
  "blocking-demonstration": 0, "needs-attention": 1, "reopened": 2, "open": 3,
  "resolved": 4, "archived": 5, "unavailable": 6,
};

export function isActiveThread(status: CollaborationThreadStatus): boolean {
  return ACTIVE_THREAD_STATUSES.includes(status);
}

/**
 * THE summary builder. Document Details, the Collaboration tab, the Review screen,
 * and the Collaboration Center all read these same numbers — a count shown in one
 * place can never disagree with the same count in another.
 *
 * Counts include only threads the viewer may at least know about, so a badge never
 * reveals the existence of something the viewer may not see.
 */
export function buildReviewSummary(
  threads: CollaborationThread[],
  viewer: CollaborationViewer,
  review: CollaborationReview | null,
  mentions: CollaborationMention[] = [],
): CollaborationReviewSummary {
  const visible = filterVisibleThreads(threads, viewer);

  let open = 0, blocking = 0, resolved = 0, attention = 0, participantVisible = 0;
  for (const { thread } of visible) {
    if (thread.visibility === "personal-draft-note") continue; // never counted as review work
    if (thread.status === "blocking-demonstration") blocking++;
    if (thread.status === "resolved") resolved++;
    if (thread.status === "needs-attention" || thread.priority !== "normal") attention++;
    if (isActiveThread(thread.status)) open++;
    if (thread.visibility === "participant-visible") participantVisible++;
  }

  const responded = review
    ? review.reviewers.filter((r) => r.status === "ready-for-preparation" || r.status === "changes-requested").length
    : 0;
  const required = review ? Math.min(review.requiredReviewerCount, review.reviewers.length) : 0;

  return {
    ...EMPTY_REVIEW_SUMMARY,
    reviewId:   review?.id ?? null,
    reviewName: review?.name ?? null,
    status:     review?.status ?? null,
    openThreads: open,
    blockingThreads: blocking,
    resolvedThreads: resolved,
    needsAttention: attention,
    participantVisibleThreads: participantVisible,
    myUnviewedMentions: mentions.filter((m) => m.status === "unviewed").length,
    assignedReviewerCount: review?.reviewers.length ?? 0,
    respondedReviewerCount: responded,
    requiredReviewerCount: required,
    missingReviewerResponses: Math.max(0, required - responded),
  };
}

/**
 * Preparation readiness. This is DIRECTION ONLY: it produces a frontend warning and
 * enforces nothing. It never blocks a participant action and is not an approval.
 */
export function resolvePreparationReadiness(
  summary: CollaborationReviewSummary,
  blockingPolicyEnabled: boolean,
): { ready: boolean; warnings: string[] } {
  const warnings: string[] = [];
  if (blockingPolicyEnabled && summary.blockingThreads > 0) {
    warnings.push(
      `${summary.blockingThreads} ${summary.blockingThreads === 1 ? "thread is" : "threads are"} marked as blocking in this demonstration.`,
    );
  }
  if (summary.missingReviewerResponses > 0) {
    warnings.push(
      `${summary.missingReviewerResponses} internal ${summary.missingReviewerResponses === 1 ? "reviewer has" : "reviewers have"} not responded.`,
    );
  }
  if (summary.needsAttention > 0) {
    warnings.push(`${summary.needsAttention} ${summary.needsAttention === 1 ? "thread is" : "threads are"} flagged for attention.`);
  }
  return { ready: warnings.length === 0, warnings };
}

export function toThreadSummary(
  thread: CollaborationThread,
  resolution: CollaborationVisibilityResolution,
  viewer: CollaborationViewer,
  documentLabel: string,
): CollaborationThreadSummary {
  const restricted = resolution.outcome !== "allowed";
  return {
    id: thread.id,
    documentId: thread.documentId,
    documentLabel: restricted ? "Restricted document" : documentLabel,
    title: restricted ? "Restricted discussion" : thread.title,
    category: thread.category,
    visibility: thread.visibility,
    priority: restricted ? "normal" : thread.priority,
    status: restricted ? "unavailable" : thread.status,
    anchorLabel: restricted ? "Not available" : describeAnchor(thread.anchor),
    anchorType: thread.anchor.type,
    replyCount: restricted ? 0 : thread.replyCount,
    mentionsCurrentUser: !restricted && thread.comments.some((c) => c.mentionedMemberIds.includes(viewer.memberId)),
    updatedAtDemonstration: thread.updatedAtDemonstration,
    restricted,
  };
}

/** Search matches title, category label, and anchor label only — never comment bodies. */
function threadMatchesQuery(summary: CollaborationThreadSummary, q: string): boolean {
  if (!q) return true;
  const needle = q.toLowerCase();
  return summary.title.toLowerCase().includes(needle)
      || summary.anchorLabel.toLowerCase().includes(needle);
}

export function applyCollaborationQuery(
  summaries: CollaborationThreadSummary[],
  query: CollaborationQuery,
): CollaborationThreadSummary[] {
  const q = query.q.trim().toLowerCase();
  const filtered = summaries.filter((s) => {
    if (!threadMatchesQuery(s, q)) return false;
    if (query.status !== "all" && s.status !== query.status) return false;
    if (query.visibility !== "all" && s.visibility !== query.visibility) return false;
    if (query.category !== "all" && s.category !== query.category) return false;
    if (query.priority !== "all" && s.priority !== query.priority) return false;
    if (query.anchorType !== "all" && s.anchorType !== query.anchorType) return false;
    if (query.mentionedMe && !s.mentionsCurrentUser) return false;
    return true;
  });
  return sortThreadSummaries(filtered, query.sort);
}

export function sortThreadSummaries(
  summaries: CollaborationThreadSummary[],
  sort: CollaborationSortField,
): CollaborationThreadSummary[] {
  const out = [...summaries];
  // Stable tiebreak on id so ordering never flickers between renders.
  const tie = (a: CollaborationThreadSummary, b: CollaborationThreadSummary) => String(a.id).localeCompare(String(b.id));
  switch (sort) {
    case "oldest-open":
      return out.sort((a, b) => a.updatedAtDemonstration.localeCompare(b.updatedAtDemonstration) || tie(a, b));
    case "priority":
      return out.sort((a, b) => PRIORITY_WEIGHT[a.priority] - PRIORITY_WEIGHT[b.priority] || tie(a, b));
    case "status":
      return out.sort((a, b) => STATUS_WEIGHT[a.status] - STATUS_WEIGHT[b.status] || tie(a, b));
    case "category":
      return out.sort((a, b) => a.category.localeCompare(b.category) || tie(a, b));
    case "most-replies":
      return out.sort((a, b) => b.replyCount - a.replyCount || tie(a, b));
    case "recently-updated":
    default:
      return out.sort((a, b) => b.updatedAtDemonstration.localeCompare(a.updatedAtDemonstration) || tie(a, b));
  }
}

export function anchorAvailabilityTone(a: CollaborationAnchorAvailability): "ok" | "warn" | "muted" {
  if (a === "available") return "ok";
  if (a === "stale") return "warn";
  return "muted";
}

export function anchorTypeIsInternalOnly(t: CollaborationAnchorType): boolean {
  return t === "verification-summary" || t === "bulk-send-review" || t === "preparation-step";
}
