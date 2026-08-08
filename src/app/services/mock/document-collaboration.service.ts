// Mock Document Collaboration service — Command 34.
//
// The ONE canonical service boundary for internal review, comments, mentions, and
// resolution threads. All state is in-memory for the lifetime of the tab. Nothing
// is persisted, delivered, emailed, texted, pushed, notified, or recorded.
//
// A future backend adapter can implement these same signatures and swap in without
// touching a component.
//
// Safety behaviours built in:
//   - Every ID is shape-validated before use.
//   - EVERY read re-resolves visibility server-side. The caller is never trusted to
//     hide something it was handed.
//   - Comment bodies are normalised to plain text and length-capped on the way in.
//   - Mentions are re-checked against eligibility at write time, not just in the
//     picker — a crafted request cannot mention someone without document access.
//   - Nothing touches localStorage or sessionStorage.
//   - Workspace switch and sign-out clear everything.

import {
  COLLAB_COMMENT_MAX,
  COLLAB_NOTE_MAX,
  COLLAB_REVIEW_NAME_MAX,
  COLLAB_SUMMARY_MAX,
  COLLAB_TITLE_MAX,
  collabCommentId,
  collabThreadId,
  isSafeCollaborationId,
  normalizeCollaborationText,
  visibilityAllowsMentions,
  type CollaborationActivityRecord,
  type CollaborationActivityType,
  type CollaborationComment,
  type CollaborationCommentId,
  type CollaborationMention,
  type CollaborationMentionEligibility,
  type CollaborationOverview,
  type CollaborationQuery,
  type CollaborationReview,
  type CollaborationReviewId,
  type CollaborationReviewStatus,
  type CollaborationReviewSummary,
  type CollaborationReviewerStatus,
  type CollaborationScenario,
  type CollaborationThread,
  type CollaborationThreadCategory,
  type CollaborationThreadId,
  type CollaborationThreadPriority,
  type CollaborationThreadSummary,
  type CollaborationVisibility,
  DEFAULT_COLLABORATION_QUERY,
} from "../../models/collaboration";
import {
  ANONYMOUS_VIEWER,
  anchorIsNavigable,
  applyCollaborationQuery,
  buildReviewSummary,
  clampMentions,
  filterVisibleThreads,
  redactComments,
  resolveAnchor,
  resolveMentionEligibility,
  resolveThreadActions,
  resolveThreadVisibility,
  toThreadSummary,
  type AnchorResolutionContext,
  type CollaborationViewer,
  type MentionCandidate,
} from "../collaboration.resolver";
import {
  COLLABORATION_MEMBERS,
  COLLABORATION_MENTION_FIXTURES,
  COLLABORATION_REVIEW_FIXTURES,
  COLLABORATION_THREAD_FIXTURES,
  COLLAB_WORKSPACE_ID,
} from "../../data/mock/collaboration";
import { DOCUMENT_FIXTURES } from "../../data/mock/documents";
import type { ServiceResult } from "../../models/errors";
import { fail, ok } from "../../models/errors";
import { delay } from "./delay";
import { registerSessionCleanup } from "../session-lifecycle";

// ── Request context ───────────────────────────────────────────────────────────

export interface CollaborationContext {
  viewer: CollaborationViewer;
  signal?: AbortSignal;
}

/** Documents whose anchor targets are deliberately missing, to exercise stale anchors. */
const REMOVED_FIELD_IDS = new Set(["fld_removed_initials"]);

const KNOWN_FIELD_IDS  = ["fld_start_date", "fld_salary", "fld_signature", "fld_date_signed"];
const KNOWN_STAGE_IDS  = ["stg_004_first", "stg_008_first", "stg_008_second"];
const KNOWN_ROLE_IDS   = ["role_signer", "role_approver", "role_reviewer"];
const KNOWN_FOLDER_IDS = ["fol_001", "fol_002", "fol_003", "fol_004", "fol_005"];
const KNOWN_TAG_IDS    = ["tag_001", "tag_002", "tag_003", "tag_004", "tag_005", "tag_006"];

function clone<T>(v: T): T {
  return JSON.parse(JSON.stringify(v)) as T;
}

function nowIso(): string {
  return new Date().toISOString();
}

class DocumentCollaborationService {
  private threads:  CollaborationThread[]  = clone(COLLABORATION_THREAD_FIXTURES);
  private reviews:  CollaborationReview[]  = clone(COLLABORATION_REVIEW_FIXTURES);
  private mentions: CollaborationMention[] = clone(COLLABORATION_MENTION_FIXTURES);
  private activity: CollaborationActivityRecord[] = [];
  private scenario: CollaborationScenario = "standard-owner";
  private seq = 0;

  // ── Scenario control (demonstration only) ──────────────────────────────────

  setScenario(scenario: CollaborationScenario): void {
    this.scenario = scenario;
  }

  getScenario(): CollaborationScenario {
    return this.scenario;
  }

  // ── Lifecycle cleanup ─────────────────────────────────────────────────────
  // Called from PlatformContext. Comment text must not survive a sign-out or a
  // workspace switch, because the next account must never see it.

  resetCollaborationDemonstration(): void {
    this.threads  = clone(COLLABORATION_THREAD_FIXTURES);
    this.reviews  = clone(COLLABORATION_REVIEW_FIXTURES);
    this.mentions = clone(COLLABORATION_MENTION_FIXTURES);
    this.activity = [];
    this.scenario = "standard-owner";
    this.seq = 0;
  }

  clearWorkspaceScopedCollaboration(workspaceId: string): void {
    this.threads  = this.threads.filter((t) => t.workspaceId === workspaceId);
    this.reviews  = this.reviews.filter((r) => r.workspaceId === workspaceId);
    // Mentions carry document labels and thread titles, so anything outside the
    // new workspace is dropped rather than merely hidden.
    const ids = new Set(this.threads.map((t) => String(t.id)));
    this.mentions = this.mentions.filter((m) => ids.has(String(m.threadId)));
    this.activity = [];
  }

  // ── Internals ─────────────────────────────────────────────────────────────

  private aborted(ctx: CollaborationContext): boolean {
    return ctx.signal?.aborted === true;
  }

  private failIfUnavailable<T>(ctx: CollaborationContext): ServiceResult<T> | null {
    if (this.aborted(ctx)) return fail("CANCELLED");
    if (this.scenario === "full-failure") return fail("DEMO_SERVICE_UNAVAILABLE");
    if (!ctx.viewer.permissions.canViewCollaboration) return fail("PERMISSION_DENIED");
    return null;
  }

  private nextId(prefix: string): string {
    this.seq += 1;
    return `${prefix}_${Date.now().toString(36)}_${this.seq}`;
  }

  private documentLabel(documentId: string): string {
    return DOCUMENT_FIXTURES.find((d) => d.id === documentId)?.title ?? "Untitled document";
  }

  private anchorContext(documentId: string, viewer: CollaborationViewer): AnchorResolutionContext {
    const doc = DOCUMENT_FIXTURES.find((d) => d.id === documentId);
    return {
      documentId,
      knownFieldIds:  KNOWN_FIELD_IDS.filter((f) => !REMOVED_FIELD_IDS.has(f)),
      knownStageIds:  KNOWN_STAGE_IDS,
      knownRoleIds:   KNOWN_ROLE_IDS,
      knownFolderIds: KNOWN_FOLDER_IDS,
      knownTagIds:    KNOWN_TAG_IDS,
      pageCount:      doc?.pageCount ?? 1,
      documentAccessible: viewer.documentAccessible && !!doc,
      canViewVerification: !!doc?.verificationId,
      canViewBulkSend: false,
    };
  }

  /** Re-derives per-viewer fields that must never be trusted from stored state. */
  private hydrate(thread: CollaborationThread, viewer: CollaborationViewer): CollaborationThread {
    const anchor = resolveAnchor(thread.anchor, this.anchorContext(thread.documentId, viewer));
    return {
      ...thread,
      anchor,
      comments: thread.comments.map((c) => ({
        ...c,
        authoredByCurrentUser: c.author.memberId === viewer.memberId,
      })),
    };
  }

  private record(
    documentId: string,
    threadId: CollaborationThreadId | null,
    type: CollaborationActivityType,
    title: string,
    description: string,
    actor: string,
  ): void {
    this.activity.unshift({
      id: this.nextId("cact") as CollaborationActivityRecord["id"],
      documentId,
      threadId,
      type,
      timestamp: nowIso(),
      title,
      // Never carries comment text, note text, or removed content.
      description,
      actorDisplayName: actor,
      demonstrationOnly: true,
    });
    this.activity = this.activity.slice(0, 200);
  }

  private findThread(id: string): CollaborationThread | undefined {
    return this.threads.find((t) => String(t.id) === id);
  }

  private touch(thread: CollaborationThread): void {
    thread.updatedAtDemonstration = nowIso();
    thread.replyCount = Math.max(0, thread.comments.filter((c) => c.status !== "removed-in-demonstration").length - 1);
  }

  // ── Reads ─────────────────────────────────────────────────────────────────

  async listDocumentThreads(
    documentId: string,
    query: Partial<CollaborationQuery>,
    ctx: CollaborationContext,
  ): Promise<ServiceResult<CollaborationThreadSummary[]>> {
    await delay(160);
    const guard = this.failIfUnavailable<CollaborationThreadSummary[]>(ctx);
    if (guard) return guard;
    if (!isSafeCollaborationId(documentId)) return fail("INVALID_ID", "documentId");
    if (!ctx.viewer.documentAccessible) return fail("DOCUMENT_UNAVAILABLE");

    const merged: CollaborationQuery = { ...DEFAULT_COLLABORATION_QUERY, ...query };
    const forDoc = this.threads.filter((t) => t.documentId === documentId);
    const visible = filterVisibleThreads(forDoc, ctx.viewer);

    const summaries = visible.map(({ thread, resolution }) =>
      toThreadSummary(this.hydrate(thread, ctx.viewer), resolution, ctx.viewer, this.documentLabel(documentId)));

    return ok(applyCollaborationQuery(summaries, merged));
  }

  async getThread(
    threadId: string,
    ctx: CollaborationContext,
  ): Promise<ServiceResult<{ thread: CollaborationThread; comments: CollaborationComment[] }>> {
    await delay(150);
    const guard = this.failIfUnavailable<{ thread: CollaborationThread; comments: CollaborationComment[] }>(ctx);
    if (guard) return guard;
    if (!isSafeCollaborationId(threadId)) return fail("INVALID_ID", "threadId");

    const found = this.findThread(threadId);
    if (!found) return fail("NOT_FOUND");

    const thread = this.hydrate(found, ctx.viewer);
    const resolution = resolveThreadVisibility(thread, ctx.viewer);

    // "Restricted" and "unavailable" are both refused at the service boundary. The
    // existence hint belongs to the LIST response, never to a detail read.
    if (resolution.outcome !== "allowed") return fail("PERMISSION_DENIED");

    return ok({ thread, comments: redactComments(thread, resolution) });
  }

  async getReviewSummary(
    documentId: string,
    ctx: CollaborationContext,
  ): Promise<ServiceResult<CollaborationReviewSummary>> {
    await delay(120);
    const guard = this.failIfUnavailable<CollaborationReviewSummary>(ctx);
    if (guard) return guard;
    if (!isSafeCollaborationId(documentId)) return fail("INVALID_ID", "documentId");

    const forDoc = this.threads.filter((t) => t.documentId === documentId);
    const review = this.reviews.find((r) => r.documentId === documentId) ?? null;
    const myMentions = this.mentions.filter((m) => m.documentId === documentId);
    return ok(buildReviewSummary(forDoc, ctx.viewer, review, myMentions));
  }

  async getReview(
    documentId: string,
    ctx: CollaborationContext,
  ): Promise<ServiceResult<CollaborationReview | null>> {
    await delay(130);
    const guard = this.failIfUnavailable<CollaborationReview | null>(ctx);
    if (guard) return guard;
    if (!isSafeCollaborationId(documentId)) return fail("INVALID_ID", "documentId");
    const review = this.reviews.find((r) => r.documentId === documentId);
    return ok(review ? clone(review) : null);
  }

  async listMentions(ctx: CollaborationContext): Promise<ServiceResult<CollaborationMention[]>> {
    await delay(140);
    const guard = this.failIfUnavailable<CollaborationMention[]>(ctx);
    if (guard) return guard;

    // A mention whose thread is no longer visible degrades to an unavailable
    // pointer. It is never silently dropped (the user was in fact mentioned) and
    // never becomes a way back in.
    const hydrated = this.mentions.map((m) => {
      const thread = this.findThread(String(m.threadId));
      if (!thread) return m.destination === null ? m : { ...m, destination: null,
        unavailableReason: "The discussion you were mentioned in is no longer available to you." };
      const res = resolveThreadVisibility(thread, ctx.viewer);
      if (res.outcome === "allowed") return m;
      return {
        ...m,
        documentLabel: "Restricted document",
        threadTitle: "Restricted discussion",
        destination: null,
        unavailableReason: "The discussion you were mentioned in is no longer available to you.",
      };
    });
    return ok(hydrated);
  }

  async getOverview(ctx: CollaborationContext): Promise<ServiceResult<CollaborationOverview>> {
    await delay(160);
    const guard = this.failIfUnavailable<CollaborationOverview>(ctx);
    if (guard) return guard;

    const visible = filterVisibleThreads(this.threads, ctx.viewer)
      .filter(({ resolution }) => resolution.outcome === "allowed")
      .map(({ thread }) => thread);

    const assignedReviews = this.reviews.filter((r) =>
      r.reviewers.some((v) => v.memberId === ctx.viewer.memberId)).length;

    return ok({
      assignedReviews,
      unviewedMentions: this.mentions.filter((m) => m.status === "unviewed").length,
      openThreads: visible.filter((t) =>
        t.visibility !== "personal-draft-note" &&
        (t.status === "open" || t.status === "needs-attention" || t.status === "reopened")).length,
      blockingThreads: visible.filter((t) => t.status === "blocking-demonstration").length,
      awaitingMyReview: this.reviews.filter((r) => r.reviewers.some((v) =>
        v.memberId === ctx.viewer.memberId &&
        (v.status === "not-started" || v.status === "in-review"))).length,
      recentlyResolved: visible.filter((t) => t.status === "resolved").length,
      ownedDocuments: new Set(visible.filter((t) => t.createdByMemberId === ctx.viewer.memberId)
        .map((t) => t.documentId)).size,
    });
  }

  async listCenterThreads(
    view: "assigned" | "open" | "blocking" | "resolved" | "owned" | "archived" | "awaiting-my-review",
    ctx: CollaborationContext,
  ): Promise<ServiceResult<CollaborationThreadSummary[]>> {
    await delay(170);
    const guard = this.failIfUnavailable<CollaborationThreadSummary[]>(ctx);
    if (guard) return guard;

    const visible = filterVisibleThreads(this.threads, ctx.viewer);
    const picked = visible.filter(({ thread }) => {
      switch (view) {
        case "assigned":
          return thread.assignedReviewerMemberIds.includes(ctx.viewer.memberId);
        case "blocking":
          return thread.status === "blocking-demonstration";
        case "resolved":
          return thread.status === "resolved";
        case "archived":
          return thread.status === "archived";
        case "owned":
          return thread.createdByMemberId === ctx.viewer.memberId;
        case "awaiting-my-review":
          return this.reviews.some((r) => r.documentId === thread.documentId &&
            r.reviewers.some((v) => v.memberId === ctx.viewer.memberId &&
              (v.status === "not-started" || v.status === "in-review")));
        case "open":
        default:
          return thread.status === "open" || thread.status === "needs-attention" || thread.status === "reopened";
      }
    });

    const summaries = picked.map(({ thread, resolution }) =>
      toThreadSummary(this.hydrate(thread, ctx.viewer), resolution, ctx.viewer, this.documentLabel(thread.documentId)));

    return ok(applyCollaborationQuery(summaries, DEFAULT_COLLABORATION_QUERY));
  }

  async listActivity(
    documentId: string,
    ctx: CollaborationContext,
  ): Promise<ServiceResult<CollaborationActivityRecord[]>> {
    await delay(120);
    const guard = this.failIfUnavailable<CollaborationActivityRecord[]>(ctx);
    if (guard) return guard;
    return ok(this.activity.filter((a) => a.documentId === documentId).slice(0, 50));
  }

  async getMentionEligibility(
    input: { documentId: string; visibility: CollaborationVisibility; teamId: string | null; threadId?: string },
    ctx: CollaborationContext,
  ): Promise<ServiceResult<CollaborationMentionEligibility>> {
    await delay(110);
    const guard = this.failIfUnavailable<CollaborationMentionEligibility>(ctx);
    if (guard) return guard;

    const thread = input.threadId ? this.findThread(input.threadId) : undefined;
    return ok(resolveMentionEligibility(this.candidates(), {
      viewer: ctx.viewer,
      visibility: input.visibility,
      teamId: input.teamId,
      assignedReviewerMemberIds: thread?.assignedReviewerMemberIds ?? [],
      documentOwnerMemberId: thread?.createdByMemberId ?? ctx.viewer.memberId,
    }));
  }

  private candidates(): MentionCandidate[] {
    return COLLABORATION_MEMBERS;
  }

  // ── Writes ────────────────────────────────────────────────────────────────

  async createThread(
    input: {
      documentId: string;
      title: string;
      category: CollaborationThreadCategory;
      visibility: CollaborationVisibility;
      priority: CollaborationThreadPriority;
      teamId: string | null;
      body: string;
      mentionedMemberIds: string[];
      anchor: CollaborationThread["anchor"];
    },
    ctx: CollaborationContext,
  ): Promise<ServiceResult<CollaborationThread>> {
    await delay(220);
    const guard = this.failIfUnavailable<CollaborationThread>(ctx);
    if (guard) return guard;
    if (this.scenario === "partial-failure") return fail("DEMO_SERVICE_UNAVAILABLE");
    if (!isSafeCollaborationId(input.documentId)) return fail("INVALID_ID", "documentId");

    const p = ctx.viewer.permissions;
    if (input.visibility === "personal-draft-note") {
      if (!p.canCreatePersonalDraftNotes) return fail("PERMISSION_DENIED");
    } else if (input.visibility === "participant-visible") {
      // A separate entitlement, checked here and not only in the UI.
      if (!p.canCreateParticipantVisible) return fail("PERMISSION_DENIED");
    } else if (!p.canCreateInternalComments) {
      return fail("PERMISSION_DENIED");
    }

    const title = normalizeCollaborationText(input.title, COLLAB_TITLE_MAX);
    if (!title) return fail("REQUIRED_FIELD", "title");

    const max = input.visibility === "personal-draft-note" ? COLLAB_NOTE_MAX : COLLAB_COMMENT_MAX;
    const body = normalizeCollaborationText(input.body, max);
    if (!body) return fail("REQUIRED_FIELD", "body");

    const mentions = this.acceptMentions(
      input.mentionedMemberIds, input.visibility, input.teamId, [], ctx);

    const id = collabThreadId(this.nextId("thr"));
    const at = nowIso();
    const thread: CollaborationThread = {
      id,
      documentId: input.documentId,
      workspaceId: ctx.viewer.workspaceId || COLLAB_WORKSPACE_ID,
      teamId: input.visibility === "internal-team" ? input.teamId : null,
      teamName: null,
      title,
      category: input.category,
      visibility: input.visibility,
      priority: input.priority,
      status: input.priority === "normal" ? "open" : "needs-attention",
      anchor: input.anchor,
      createdByMemberId: ctx.viewer.memberId,
      createdByDisplayName: ctx.viewer.displayName,
      comments: [{
        id: collabCommentId(this.nextId("cmt")),
        threadId: id,
        author: {
          memberId: ctx.viewer.memberId,
          displayName: ctx.viewer.displayName,
          roleLabel: "You",
          redacted: false,
        },
        body,
        status: "active",
        createdAtDemonstration: at,
        editedAtDemonstration: null,
        mentionedMemberIds: mentions,
        authoredByCurrentUser: true,
      }],
      replyCount: 0,
      blockingReason: null,
      blockingSetByDisplayName: null,
      resolution: null,
      priorResolutions: [],
      reviewId: null,
      assignedReviewerMemberIds: [],
      createdAtDemonstration: at,
      updatedAtDemonstration: at,
      demonstrationOnly: true,
    };

    this.threads.unshift(thread);
    this.record(input.documentId, id, "thread-created", "Discussion started",
      // The title is safe to echo; the body is not, and is never recorded here.
      `A discussion was started in this frontend demonstration.`, ctx.viewer.displayName);

    return ok(this.hydrate(thread, ctx.viewer));
  }

  /**
   * Re-validates mentions at WRITE time. The picker already filters, but a caller
   * that skipped the picker must not be able to mention someone who has no access.
   */
  private acceptMentions(
    requested: string[],
    visibility: CollaborationVisibility,
    teamId: string | null,
    assignedReviewerMemberIds: string[],
    ctx: CollaborationContext,
  ): string[] {
    if (!visibilityAllowsMentions(visibility)) return [];
    if (!ctx.viewer.permissions.canMentionMembers) return [];

    const eligibility = resolveMentionEligibility(this.candidates(), {
      viewer: ctx.viewer,
      visibility,
      teamId,
      assignedReviewerMemberIds,
      documentOwnerMemberId: ctx.viewer.memberId,
    });
    const allowed = new Set(eligibility.eligible.map((e) => e.memberId));
    return clampMentions(requested.filter((id) => allowed.has(id))).accepted;
  }

  async addComment(
    input: { threadId: string; body: string; mentionedMemberIds: string[] },
    ctx: CollaborationContext,
  ): Promise<ServiceResult<CollaborationComment>> {
    await delay(200);
    const guard = this.failIfUnavailable<CollaborationComment>(ctx);
    if (guard) return guard;
    if (!isSafeCollaborationId(input.threadId)) return fail("INVALID_ID", "threadId");

    const thread = this.findThread(input.threadId);
    if (!thread) return fail("NOT_FOUND");

    const actions = resolveThreadActions(thread, ctx.viewer);
    const gate = thread.visibility === "personal-draft-note"
      ? actions["create-comment"] : actions["reply-to-thread"];
    if (!gate.available) return fail("PERMISSION_DENIED");

    const max = thread.visibility === "personal-draft-note" ? COLLAB_NOTE_MAX : COLLAB_COMMENT_MAX;
    const body = normalizeCollaborationText(input.body, max);
    if (!body) return fail("REQUIRED_FIELD", "body");

    const mentions = this.acceptMentions(
      input.mentionedMemberIds, thread.visibility, thread.teamId,
      thread.assignedReviewerMemberIds, ctx);

    const comment: CollaborationComment = {
      id: collabCommentId(this.nextId("cmt")),
      threadId: thread.id,
      author: {
        memberId: ctx.viewer.memberId,
        displayName: ctx.viewer.displayName,
        roleLabel: "You",
        redacted: false,
      },
      body,
      status: "active",
      createdAtDemonstration: nowIso(),
      editedAtDemonstration: null,
      mentionedMemberIds: mentions,
      authoredByCurrentUser: true,
    };

    thread.comments.push(comment);
    this.touch(thread);
    this.record(thread.documentId, thread.id, "comment-added", "Comment added",
      "A comment was added in this frontend demonstration.", ctx.viewer.displayName);

    if (mentions.length > 0) {
      this.record(thread.documentId, thread.id, "member-mentioned", "Member mentioned",
        `${mentions.length} ${mentions.length === 1 ? "member was" : "members were"} mentioned. No message was delivered.`,
        ctx.viewer.displayName);
    }

    return ok(comment);
  }

  async editComment(
    input: { threadId: string; commentId: string; body: string },
    ctx: CollaborationContext,
  ): Promise<ServiceResult<CollaborationComment>> {
    await delay(180);
    const guard = this.failIfUnavailable<CollaborationComment>(ctx);
    if (guard) return guard;

    const thread = this.findThread(input.threadId);
    if (!thread) return fail("NOT_FOUND");
    const comment = thread.comments.find((c) => String(c.id) === input.commentId);
    if (!comment) return fail("NOT_FOUND");

    // Authorship is enforced here, not in the view layer.
    if (comment.author.memberId !== ctx.viewer.memberId) return fail("PERMISSION_DENIED");
    if (comment.status === "removed-in-demonstration") return fail("INVALID_STATE");
    if (!resolveThreadActions(thread, ctx.viewer)["edit-own-comment"].available) return fail("PERMISSION_DENIED");

    const max = thread.visibility === "personal-draft-note" ? COLLAB_NOTE_MAX : COLLAB_COMMENT_MAX;
    const body = normalizeCollaborationText(input.body, max);
    if (!body) return fail("REQUIRED_FIELD", "body");

    comment.body = body;
    comment.status = "edited";
    comment.editedAtDemonstration = nowIso();
    this.touch(thread);
    this.record(thread.documentId, thread.id, "comment-edited", "Comment edited",
      "A comment was edited in this frontend demonstration.", ctx.viewer.displayName);
    return ok(comment);
  }

  async removeComment(
    input: { threadId: string; commentId: string },
    ctx: CollaborationContext,
  ): Promise<ServiceResult<CollaborationCommentId>> {
    await delay(180);
    const guard = this.failIfUnavailable<CollaborationCommentId>(ctx);
    if (guard) return guard;

    const thread = this.findThread(input.threadId);
    if (!thread) return fail("NOT_FOUND");
    const comment = thread.comments.find((c) => String(c.id) === input.commentId);
    if (!comment) return fail("NOT_FOUND");

    const own = comment.author.memberId === ctx.viewer.memberId;
    const actions = resolveThreadActions(thread, ctx.viewer);
    const allowed = own
      ? actions["remove-own-comment-demonstration"].available
      : actions["moderate-comment"].available;
    if (!allowed) return fail("PERMISSION_DENIED");

    // Removal clears the body immediately. A removed comment must not keep its text
    // anywhere it could later be read back.
    comment.body = "";
    comment.mentionedMemberIds = [];
    comment.status = "removed-in-demonstration";
    this.touch(thread);
    this.record(thread.documentId, thread.id, "comment-removed", "Comment removed",
      "A comment was removed from this frontend demonstration. Removed content is not shown.",
      ctx.viewer.displayName);
    return ok(comment.id);
  }

  async resolveThread(
    input: { threadId: string; summary: string },
    ctx: CollaborationContext,
  ): Promise<ServiceResult<CollaborationThread>> {
    await delay(200);
    const guard = this.failIfUnavailable<CollaborationThread>(ctx);
    if (guard) return guard;

    const thread = this.findThread(input.threadId);
    if (!thread) return fail("NOT_FOUND");
    if (!resolveThreadActions(thread, ctx.viewer)["resolve-thread"].available) return fail("PERMISSION_DENIED");

    const summary = normalizeCollaborationText(input.summary, COLLAB_SUMMARY_MAX);
    if (!summary) return fail("REQUIRED_FIELD", "summary");

    thread.status = "resolved";
    thread.blockingReason = null;
    thread.blockingSetByDisplayName = null;
    thread.resolution = {
      summary,
      resolvedByDisplayName: ctx.viewer.displayName,
      resolvedAtDemonstration: nowIso(),
      relatedDestination: null,
      relatedLabel: null,
    };
    this.touch(thread);
    this.record(thread.documentId, thread.id, "thread-resolved", "Discussion resolved",
      "Resolved in frontend state. This does not complete the transaction and is not proof that review occurred.",
      ctx.viewer.displayName);
    return ok(this.hydrate(thread, ctx.viewer));
  }

  async reopenThread(
    input: { threadId: string },
    ctx: CollaborationContext,
  ): Promise<ServiceResult<CollaborationThread>> {
    await delay(180);
    const guard = this.failIfUnavailable<CollaborationThread>(ctx);
    if (guard) return guard;

    const thread = this.findThread(input.threadId);
    if (!thread) return fail("NOT_FOUND");
    if (!resolveThreadActions(thread, ctx.viewer)["reopen-thread"].available) return fail("PERMISSION_DENIED");

    // The prior resolution is preserved rather than discarded, so reopening never
    // erases the record that a resolution was once recorded.
    if (thread.resolution) thread.priorResolutions.push(thread.resolution);
    thread.resolution = null;
    thread.status = "reopened";
    this.touch(thread);
    this.record(thread.documentId, thread.id, "thread-reopened", "Discussion reopened",
      "Reopened in frontend state.", ctx.viewer.displayName);
    return ok(this.hydrate(thread, ctx.viewer));
  }

  async setBlocking(
    input: { threadId: string; blocking: boolean; reason: string },
    ctx: CollaborationContext,
  ): Promise<ServiceResult<CollaborationThread>> {
    await delay(180);
    const guard = this.failIfUnavailable<CollaborationThread>(ctx);
    if (guard) return guard;

    const thread = this.findThread(input.threadId);
    if (!thread) return fail("NOT_FOUND");
    const actions = resolveThreadActions(thread, ctx.viewer);
    const gate = input.blocking
      ? actions["mark-blocking-demonstration"] : actions["remove-blocking-demonstration"];
    if (!gate.available) return fail("PERMISSION_DENIED");

    if (input.blocking) {
      const reason = normalizeCollaborationText(input.reason, COLLAB_SUMMARY_MAX);
      if (!reason) return fail("REQUIRED_FIELD", "reason");
      thread.status = "blocking-demonstration";
      thread.blockingReason = reason;
      thread.blockingSetByDisplayName = ctx.viewer.displayName;
      this.record(thread.documentId, thread.id, "thread-marked-blocking", "Marked as blocking",
        "Blocking in Demonstration affects frontend preparation warnings only. It enforces nothing in production.",
        ctx.viewer.displayName);
    } else {
      thread.status = "open";
      thread.blockingReason = null;
      thread.blockingSetByDisplayName = null;
      this.record(thread.documentId, thread.id, "thread-blocking-removed", "Blocking removed",
        "The blocking marker was removed in frontend state.", ctx.viewer.displayName);
    }
    this.touch(thread);
    return ok(this.hydrate(thread, ctx.viewer));
  }

  async setVisibility(
    input: { threadId: string; visibility: CollaborationVisibility; teamId: string | null },
    ctx: CollaborationContext,
  ): Promise<ServiceResult<CollaborationThread>> {
    await delay(190);
    const guard = this.failIfUnavailable<CollaborationThread>(ctx);
    if (guard) return guard;

    const thread = this.findThread(input.threadId);
    if (!thread) return fail("NOT_FOUND");
    if (!resolveThreadActions(thread, ctx.viewer)["change-visibility"].available) return fail("PERMISSION_DENIED");

    // Two directions are refused outright rather than confirmed:
    //   - into Participant Visible without the separate entitlement
    //   - into or out of Personal Draft Note, which would either expose a private
    //     note or quietly hide shared discussion from everyone who was in it
    if (input.visibility === "participant-visible" && !ctx.viewer.permissions.canCreateParticipantVisible) {
      return fail("PERMISSION_DENIED");
    }
    if (input.visibility === "personal-draft-note") return fail("INVALID_STATE", "visibility");
    if (thread.visibility === "personal-draft-note") return fail("INVALID_STATE", "visibility");

    thread.visibility = input.visibility;
    thread.teamId = input.visibility === "internal-team" ? input.teamId : null;
    this.touch(thread);
    this.record(thread.documentId, thread.id, "visibility-changed", "Visibility changed",
      "Thread visibility was changed in frontend state. No content was delivered to anyone.",
      ctx.viewer.displayName);
    return ok(this.hydrate(thread, ctx.viewer));
  }

  async setPriority(
    input: { threadId: string; priority: CollaborationThreadPriority; category?: CollaborationThreadCategory },
    ctx: CollaborationContext,
  ): Promise<ServiceResult<CollaborationThread>> {
    await delay(150);
    const guard = this.failIfUnavailable<CollaborationThread>(ctx);
    if (guard) return guard;

    const thread = this.findThread(input.threadId);
    if (!thread) return fail("NOT_FOUND");
    if (!resolveThreadActions(thread, ctx.viewer)["change-priority"].available) return fail("PERMISSION_DENIED");

    thread.priority = input.priority;
    if (input.category) thread.category = input.category;
    if (thread.status === "open" && input.priority !== "normal") thread.status = "needs-attention";
    if (thread.status === "needs-attention" && input.priority === "normal") thread.status = "open";
    this.touch(thread);
    return ok(this.hydrate(thread, ctx.viewer));
  }

  async setArchived(
    input: { threadId: string; archived: boolean },
    ctx: CollaborationContext,
  ): Promise<ServiceResult<CollaborationThread>> {
    await delay(170);
    const guard = this.failIfUnavailable<CollaborationThread>(ctx);
    if (guard) return guard;

    const thread = this.findThread(input.threadId);
    if (!thread) return fail("NOT_FOUND");
    const actions = resolveThreadActions(thread, ctx.viewer);
    const gate = input.archived ? actions["archive-thread"] : actions["restore-thread"];
    if (!gate.available) return fail("PERMISSION_DENIED");

    // Archiving is not deletion. Content is retained exactly as it was.
    thread.status = input.archived ? "archived" : (thread.resolution ? "resolved" : "open");
    this.touch(thread);
    return ok(this.hydrate(thread, ctx.viewer));
  }

  // ── Review ────────────────────────────────────────────────────────────────

  async saveReview(
    input: {
      documentId: string;
      name: string;
      description: string;
      reviewerMemberIds: string[];
      requiredReviewerCount: number;
      includedCategories: CollaborationThreadCategory[];
      blockingPolicyEnabled: boolean;
      teamId: string | null;
    },
    ctx: CollaborationContext,
  ): Promise<ServiceResult<CollaborationReview>> {
    await delay(240);
    const guard = this.failIfUnavailable<CollaborationReview>(ctx);
    if (guard) return guard;
    if (!ctx.viewer.permissions.canManageReview) return fail("PERMISSION_DENIED");
    if (!isSafeCollaborationId(input.documentId)) return fail("INVALID_ID", "documentId");

    const name = normalizeCollaborationText(input.name, COLLAB_REVIEW_NAME_MAX);
    if (!name) return fail("REQUIRED_FIELD", "name");

    const pool = this.candidates();
    const reviewers = input.reviewerMemberIds
      .filter(isSafeCollaborationId)
      .map((id) => pool.find((c) => c.memberId === id))
      .filter((c): c is MentionCandidate => !!c)
      .filter((c) => c.workspaceId === ctx.viewer.workspaceId && c.active)
      .map((c) => ({
        memberId: c.memberId,
        displayName: c.displayName,
        roleLabel: c.roleLabel,
        // Assignment NEVER grants access. Someone without access is recorded as
        // unavailable so the gap is visible rather than silently papered over.
        status: (c.hasDocumentAccess ? "not-started" : "unavailable") as CollaborationReviewerStatus,
        respondedAtDemonstration: null,
        hasDocumentAccess: c.hasDocumentAccess,
        unavailableReason: c.hasDocumentAccess ? null
          : "This member does not have access to this document. Assigning a reviewer does not grant access.",
      }));

    if (reviewers.length === 0) return fail("REQUIRED_FIELD", "reviewerMemberIds");

    const existing = this.reviews.find((r) => r.documentId === input.documentId);
    const at = nowIso();
    const review: CollaborationReview = {
      id: existing?.id ?? (this.nextId("rev") as CollaborationReviewId),
      documentId: input.documentId,
      workspaceId: ctx.viewer.workspaceId || COLLAB_WORKSPACE_ID,
      teamId: input.teamId,
      teamName: null,
      name,
      description: normalizeCollaborationText(input.description, COLLAB_SUMMARY_MAX) || null,
      status: "review-requested-demonstration",
      reviewers: existing
        // Preserve responses already given by reviewers who are still assigned.
        ? reviewers.map((r) => existing.reviewers.find((e) => e.memberId === r.memberId) ?? r)
        : reviewers,
      requiredReviewerCount: Math.max(1, Math.min(input.requiredReviewerCount, reviewers.length)),
      dueDateDirection: existing?.dueDateDirection ?? null,
      includedCategories: input.includedCategories,
      blockingPolicyEnabled: input.blockingPolicyEnabled,
      createdByDisplayName: existing?.createdByDisplayName ?? ctx.viewer.displayName,
      createdAtDemonstration: existing?.createdAtDemonstration ?? at,
      updatedAtDemonstration: at,
      demonstrationOnly: true,
    };

    if (existing) {
      this.reviews = this.reviews.map((r) => r.documentId === input.documentId ? review : r);
    } else {
      this.reviews.push(review);
    }

    this.record(input.documentId, null, "review-requested",
      "Internal review requested",
      "Requested in this frontend demonstration. No notification was delivered and this is not participant approval.",
      ctx.viewer.displayName);

    return ok(clone(review));
  }

  async updateMyReviewerResponse(
    input: { documentId: string; status: CollaborationReviewerStatus },
    ctx: CollaborationContext,
  ): Promise<ServiceResult<CollaborationReview>> {
    await delay(200);
    const guard = this.failIfUnavailable<CollaborationReview>(ctx);
    if (guard) return guard;
    if (!ctx.viewer.permissions.canUpdateOwnReviewerResponse) return fail("PERMISSION_DENIED");

    const review = this.reviews.find((r) => r.documentId === input.documentId);
    if (!review) return fail("NOT_FOUND");

    const me = review.reviewers.find((r) => r.memberId === ctx.viewer.memberId);
    // A viewer can only ever change their OWN response. There is no path here to
    // respond on someone else's behalf.
    if (!me) return fail("PERMISSION_DENIED");
    if (!me.hasDocumentAccess) return fail("DOCUMENT_UNAVAILABLE");

    me.status = input.status;
    me.respondedAtDemonstration = nowIso();

    const responded = review.reviewers.filter((r) =>
      r.status === "ready-for-preparation" || r.status === "changes-requested");
    const readyCount = review.reviewers.filter((r) => r.status === "ready-for-preparation").length;
    const anyChanges = review.reviewers.some((r) => r.status === "changes-requested");

    let next: CollaborationReviewStatus = "in-review";
    if (anyChanges) next = "changes-requested";
    else if (readyCount >= review.requiredReviewerCount) next = "ready-for-preparation";
    else if (responded.length === 0) next = "review-requested-demonstration";
    review.status = next;
    review.updatedAtDemonstration = nowIso();

    if (next === "ready-for-preparation") {
      this.record(input.documentId, null, "review-ready-for-preparation",
        "Internal reviewers indicated ready for preparation",
        "This is internal readiness direction in frontend state. It is not participant approval, legal approval, or Evidence.",
        ctx.viewer.displayName);
    }

    return ok(clone(review));
  }

  async markMentionViewed(mentionId: string, ctx: CollaborationContext): Promise<ServiceResult<true>> {
    await delay(90);
    const guard = this.failIfUnavailable<true>(ctx);
    if (guard) return guard;
    const m = this.mentions.find((x) => String(x.id) === mentionId);
    if (!m) return fail("NOT_FOUND");
    if (m.status === "unviewed") m.status = "viewed";
    return ok(true);
  }
}

export const documentCollaborationService = new DocumentCollaborationService();

// Re-exported so screens import one module rather than reaching into the resolver.
export { ANONYMOUS_VIEWER, anchorIsNavigable, resolveThreadActions, resolveThreadVisibility };
export type { CollaborationViewer };

// Clears every thread, comment body, Personal Draft Note, mention, review
// response and collaboration activity record. Comment text must never survive
// into the next account's session.
registerSessionCleanup({
  id: "document-collaboration",
  onSignOut: () => documentCollaborationService.resetCollaborationDemonstration(),
  onWorkspaceSwitch: (workspaceId) =>
    documentCollaborationService.clearWorkspaceScopedCollaboration(workspaceId),
});
