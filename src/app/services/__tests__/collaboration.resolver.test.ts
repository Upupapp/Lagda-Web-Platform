import { describe, it, expect } from "vitest";
import {
  ANONYMOUS_VIEWER,
  type CollaborationViewer,
  resolveThreadVisibility,
  filterVisibleThreads,
  redactComments,
  resolveThreadActions,
  isActionAvailable,
  resolveCommentActions,
  resolveMentionEligibility,
  clampMentions,
  resolveAnchor,
  anchorIsNavigable,
  describeAnchor,
  isActiveThread,
  buildReviewSummary,
  resolvePreparationReadiness,
  toThreadSummary,
  applyCollaborationQuery,
  sortThreadSummaries,
  anchorAvailabilityTone,
  anchorTypeIsInternalOnly,
  type MentionCandidate,
  type AnchorResolutionContext,
} from "../collaboration.resolver";
import type {
  CollaborationThread, CollaborationComment, CollaborationAnchor,
  CollaborationReview, CollaborationQuery, CollaborationThreadSummary,
} from "../../models/collaboration";

function viewer(overrides: Partial<CollaborationViewer> = {}): CollaborationViewer {
  return {
    ...ANONYMOUS_VIEWER,
    memberId: "mem_viewer",
    displayName: "Viewer",
    workspaceId: "ws_1",
    teamIds: [],
    documentAccessible: true,
    permissions: {
      ...ANONYMOUS_VIEWER.permissions,
      canViewCollaboration: true,
      canCreateInternalComments: true,
      canReply: true,
      canEditOwnComments: true,
      canRemoveOwnComments: true,
      canResolveThreads: true,
      canReopenThreads: true,
      canManageVisibility: true,
      canMarkBlocking: true,
      canManagePriority: true,
      canMentionMembers: true,
    },
    ...overrides,
  };
}

function anchor(overrides: Partial<CollaborationAnchor> = {}): CollaborationAnchor {
  return {
    id: "anc_1" as CollaborationAnchor["id"],
    type: "document",
    resourceId: null,
    label: "Document",
    pageDirection: null,
    availability: "available",
    destination: "/app/documents/doc_1",
    unavailableReason: null,
    ...overrides,
  };
}

function comment(overrides: Partial<CollaborationComment> = {}): CollaborationComment {
  return {
    id: "cmt_1" as CollaborationComment["id"],
    threadId: "thr_1" as CollaborationComment["threadId"],
    author: { memberId: "mem_viewer", displayName: "Viewer", roleLabel: "Owner", redacted: false },
    body: "Looks good.",
    status: "active",
    createdAtDemonstration: "2026-01-01T00:00:00.000Z",
    editedAtDemonstration: null,
    mentionedMemberIds: [],
    authoredByCurrentUser: true,
    ...overrides,
  };
}

function thread(overrides: Partial<CollaborationThread> = {}): CollaborationThread {
  return {
    id: "thr_1" as CollaborationThread["id"],
    documentId: "doc_1",
    workspaceId: "ws_1",
    teamId: null,
    teamName: null,
    title: "A discussion",
    category: "general" as CollaborationThread["category"],
    visibility: "internal-workspace",
    priority: "normal",
    status: "open",
    anchor: anchor(),
    createdByMemberId: "mem_author",
    createdByDisplayName: "Author",
    comments: [],
    replyCount: 0,
    blockingReason: null,
    blockingSetByDisplayName: null,
    resolution: null,
    priorResolutions: [],
    reviewId: null,
    assignedReviewerMemberIds: [],
    createdAtDemonstration: "2026-01-01T00:00:00.000Z",
    updatedAtDemonstration: "2026-01-01T00:00:00.000Z",
    demonstrationOnly: true,
    ...overrides,
  };
}

describe("resolveThreadVisibility", () => {
  it("shows a personal draft note only to its author, without disclosing it to anyone else", () => {
    const note = thread({ visibility: "personal-draft-note", createdByMemberId: "mem_viewer" });
    expect(resolveThreadVisibility(note, viewer()).outcome).toBe("allowed");

    const strangerNote = thread({ visibility: "personal-draft-note", createdByMemberId: "mem_other" });
    const resolution = resolveThreadVisibility(strangerNote, viewer());
    expect(resolution.outcome).toBe("unavailable");
    expect(resolution.maySeeExistence).toBe(false);
  });

  it("denies everything when the viewer cannot view collaboration or cannot open the document", () => {
    const t = thread();
    expect(resolveThreadVisibility(t, viewer({ documentAccessible: false })).outcome).toBe("unavailable");
    expect(
      resolveThreadVisibility(
        t,
        viewer({ permissions: { ...viewer().permissions, canViewCollaboration: false } }),
      ).outcome,
    ).toBe("unavailable");
  });

  it("never crosses a workspace boundary", () => {
    const other = thread({ workspaceId: "ws_other" });
    expect(resolveThreadVisibility(other, viewer()).outcome).toBe("unavailable");
  });

  it("restricts internal-team threads to team members and the document owner, but keeps existence visible", () => {
    const t = thread({ visibility: "internal-team", teamId: "team_a" });
    expect(resolveThreadVisibility(t, viewer({ teamIds: ["team_a"] })).outcome).toBe("allowed");
    expect(resolveThreadVisibility(t, viewer({ isDocumentOwner: true })).outcome).toBe("allowed");

    const outsider = resolveThreadVisibility(t, viewer({ teamIds: ["team_b"] }));
    expect(outsider.outcome).toBe("restricted");
    expect(outsider.maySeeExistence).toBe(true);
  });

  it("restricts owner-and-reviewers threads to the owner, author, and assigned reviewers", () => {
    const t = thread({
      visibility: "owner-and-reviewers",
      createdByMemberId: "mem_author",
      assignedReviewerMemberIds: ["mem_reviewer"],
    });
    expect(resolveThreadVisibility(t, viewer({ memberId: "mem_author" })).outcome).toBe("allowed");
    expect(resolveThreadVisibility(t, viewer({ memberId: "mem_reviewer" })).outcome).toBe("allowed");
    expect(resolveThreadVisibility(t, viewer({ isDocumentOwner: true })).outcome).toBe("allowed");
    expect(resolveThreadVisibility(t, viewer({ memberId: "mem_stranger" })).outcome).toBe("restricted");
  });

  it("allows participant-visible threads to any internal viewer with collaboration access", () => {
    const t = thread({ visibility: "participant-visible" });
    expect(resolveThreadVisibility(t, viewer()).outcome).toBe("allowed");
  });
});

describe("filterVisibleThreads", () => {
  it("keeps threads the viewer may at least know about, and drops fully unavailable ones", () => {
    const visibleThread = thread({ id: "thr_visible" as CollaborationThread["id"] });
    const hiddenThread = thread({
      id: "thr_hidden" as CollaborationThread["id"],
      visibility: "personal-draft-note",
      createdByMemberId: "mem_other",
    });
    const result = filterVisibleThreads([visibleThread, hiddenThread], viewer());
    expect(result.map((r) => r.thread.id)).toEqual(["thr_visible"]);
  });
});

describe("redactComments", () => {
  it("yields nothing at all for a restricted thread", () => {
    const t = thread({ comments: [comment()] });
    const restricted = { outcome: "restricted" as const, explanation: "x", maySeeExistence: true };
    expect(redactComments(t, restricted)).toEqual([]);
  });

  it("hides removed comments unless the viewer authored them", () => {
    const removedByOther = comment({ id: "cmt_removed" as CollaborationComment["id"], status: "removed-in-demonstration", authoredByCurrentUser: false });
    const removedByMe = comment({ id: "cmt_mine" as CollaborationComment["id"], status: "removed-in-demonstration", authoredByCurrentUser: true });
    const active = comment({ id: "cmt_active" as CollaborationComment["id"] });
    const t = thread({ comments: [removedByOther, removedByMe, active] });
    const allowed = { outcome: "allowed" as const, explanation: "", maySeeExistence: true };
    expect(redactComments(t, allowed).map((c) => c.id)).toEqual(["cmt_mine", "cmt_active"]);
  });
});

describe("resolveThreadActions", () => {
  it("blocks every shared action on a personal draft note except the author's own edit/remove", () => {
    const note = thread({ visibility: "personal-draft-note", createdByMemberId: "mem_viewer" });
    const actions = resolveThreadActions(note, viewer());
    expect(actions["resolve-thread"].available).toBe(false);
    expect(actions["resolve-thread"].reason).toMatch(/private to you/);
    expect(actions["mention-member"].available).toBe(false);
  });

  it("blocks writes on an archived thread with a clear reason", () => {
    const t = thread({ status: "archived" });
    const actions = resolveThreadActions(t, viewer());
    expect(actions["reply-to-thread"].available).toBe(false);
    expect(actions["reply-to-thread"].reason).toMatch(/archived/i);
  });

  it("requires the create-comment permission even on an otherwise-writable thread", () => {
    const t = thread();
    const actions = resolveThreadActions(
      t,
      viewer({ permissions: { ...viewer().permissions, canCreateInternalComments: false } }),
    );
    expect(actions["create-comment"].available).toBe(false);
  });

  it("every action carries a non-null reason whenever it is unavailable", () => {
    const t = thread({ status: "resolved" });
    const actions = resolveThreadActions(t, viewer());
    for (const availability of Object.values(actions)) {
      if (!availability.available) expect(availability.reason).not.toBeNull();
    }
  });
});

describe("isActionAvailable", () => {
  it("reads availability off the resolved action map", () => {
    const t = thread();
    const actions = resolveThreadActions(t, viewer());
    expect(isActionAvailable(actions, "reply-to-thread")).toBe(true);
    expect(isActionAvailable(actions, "assign-reviewers")).toBe(false);
  });
});

describe("resolveCommentActions", () => {
  it("only lets the author edit or remove their own comment", () => {
    const t = thread();
    const threadActions = resolveThreadActions(t, viewer());
    const mine = comment({ authoredByCurrentUser: true });
    const theirs = comment({ authoredByCurrentUser: false });
    expect(resolveCommentActions(mine, threadActions).canEdit.available).toBe(true);
    expect(resolveCommentActions(theirs, threadActions).canEdit.available).toBe(false);
    expect(resolveCommentActions(theirs, threadActions).canEdit.reason).toMatch(/only edit or remove/);
  });
});

describe("resolveMentionEligibility", () => {
  function candidate(overrides: Partial<MentionCandidate> = {}): MentionCandidate {
    return {
      memberId: "mem_a", displayName: "Alice", roleLabel: "Member",
      teamIds: [], teamName: null, workspaceId: "ws_1",
      hasDocumentAccess: true, active: true,
      ...overrides,
    };
  }

  it("excludes anyone outside the workspace, inactive, or without document access — by count only", () => {
    const result = resolveMentionEligibility(
      [
        candidate({ memberId: "mem_wrong_ws", workspaceId: "ws_other" }),
        candidate({ memberId: "mem_inactive", active: false }),
        candidate({ memberId: "mem_no_access", hasDocumentAccess: false }),
        candidate({ memberId: "mem_ok" }),
      ],
      {
        viewer: viewer(), visibility: "internal-workspace", teamId: null,
        assignedReviewerMemberIds: [], documentOwnerMemberId: "mem_owner",
      },
    );
    expect(result.eligible.map((e) => e.memberId)).toEqual(["mem_ok"]);
    expect(result.excludedCount).toBe(3);
  });

  it("narrows internal-team mentions to team members and the document owner", () => {
    const result = resolveMentionEligibility(
      [candidate({ memberId: "mem_team", teamIds: ["team_a"] }), candidate({ memberId: "mem_outside" })],
      {
        viewer: viewer(), visibility: "internal-team", teamId: "team_a",
        assignedReviewerMemberIds: [], documentOwnerMemberId: "mem_owner",
      },
    );
    expect(result.eligible.map((e) => e.memberId)).toEqual(["mem_team"]);
  });

  it("returns nothing for a personal draft note, without treating it as an error", () => {
    const result = resolveMentionEligibility([candidate()], {
      viewer: viewer(), visibility: "personal-draft-note", teamId: null,
      assignedReviewerMemberIds: [], documentOwnerMemberId: "mem_owner",
    });
    expect(result.eligible).toEqual([]);
  });
});

describe("clampMentions", () => {
  it("dedupes and caps at the maximum, reporting how many were dropped", () => {
    const many = Array.from({ length: 15 }, (_, i) => `mem_${i}`);
    const withDupes = [...many, ...many];
    const result = clampMentions(withDupes);
    expect(result.accepted).toHaveLength(10);
    expect(result.droppedCount).toBe(5);
  });
});

describe("resolveAnchor", () => {
  function ctx(overrides: Partial<AnchorResolutionContext> = {}): AnchorResolutionContext {
    return {
      documentId: "doc_1", knownFieldIds: ["fld_1"], knownStageIds: ["stg_1"],
      knownRoleIds: ["role_1"], knownFolderIds: ["fld_folder"], knownTagIds: ["tag_1"],
      pageCount: 5, documentAccessible: true, canViewVerification: true, canViewBulkSend: true,
      ...overrides,
    };
  }

  it("is unavailable, not navigable, when the document itself is inaccessible", () => {
    const a = resolveAnchor(anchor({ type: "template-field", resourceId: "fld_1" }), ctx({ documentAccessible: false }));
    expect(a.availability).toBe("unavailable");
    expect(a.destination).toBeNull();
  });

  it("degrades to stale rather than breaking the thread when the referenced item is gone", () => {
    const a = resolveAnchor(anchor({ type: "template-field", resourceId: "fld_deleted" }), ctx());
    expect(a.availability).toBe("stale");
  });

  it("resolves a known field anchor to a real destination", () => {
    const a = resolveAnchor(anchor({ type: "template-field", resourceId: "fld_1" }), ctx());
    expect(a.availability).toBe("available");
    expect(a.destination).toBe("/app/documents/doc_1/fields");
  });

  it("gates verification-summary and bulk-send-review anchors on their own permission", () => {
    const denied = resolveAnchor(anchor({ type: "verification-summary" }), ctx({ canViewVerification: false }));
    expect(denied.availability).toBe("restricted");
    const allowed = resolveAnchor(anchor({ type: "verification-summary" }), ctx());
    expect(allowed.availability).toBe("available");
  });
});

describe("anchorIsNavigable / describeAnchor", () => {
  it("is only navigable when available with a real destination", () => {
    expect(anchorIsNavigable(anchor({ availability: "available", destination: "/x" }))).toBe(true);
    expect(anchorIsNavigable(anchor({ availability: "stale", destination: null }))).toBe(false);
  });

  it("labels a page-direction anchor as direction-only, never a page jump", () => {
    const a = anchor({ type: "page-direction", pageDirection: 3, label: "Page reference" });
    expect(describeAnchor(a)).toBe("Page 3 (direction only)");
  });
});

describe("isActiveThread", () => {
  it("treats open/needs-attention/reopened/blocking as active, resolved/archived as not", () => {
    expect(isActiveThread("open")).toBe(true);
    expect(isActiveThread("resolved")).toBe(false);
    expect(isActiveThread("archived")).toBe(false);
  });
});

describe("buildReviewSummary", () => {
  it("counts only visible threads and never counts personal draft notes as review work", () => {
    const blocking = thread({ id: "thr_blocking" as CollaborationThread["id"], status: "blocking-demonstration" });
    const resolved = thread({ id: "thr_resolved" as CollaborationThread["id"], status: "resolved" });
    const note = thread({
      id: "thr_note" as CollaborationThread["id"], visibility: "personal-draft-note",
      createdByMemberId: "mem_viewer", status: "blocking-demonstration",
    });
    const summary = buildReviewSummary([blocking, resolved, note], viewer(), null);
    expect(summary.blockingThreads).toBe(1);
    expect(summary.resolvedThreads).toBe(1);
  });

  it("derives responded/required reviewer counts from the review", () => {
    const review: CollaborationReview = {
      id: "rev_1" as CollaborationReview["id"], documentId: "doc_1", workspaceId: "ws_1",
      teamId: null, teamName: null, name: "Legal review", description: null, status: "in-progress" as CollaborationReview["status"],
      reviewers: [
        { memberId: "mem_a", displayName: "A", roleLabel: "Reviewer", status: "ready-for-preparation", respondedAtDemonstration: "2026-01-01T00:00:00.000Z", hasDocumentAccess: true, unavailableReason: null },
        { memberId: "mem_b", displayName: "B", roleLabel: "Reviewer", status: "pending" as CollaborationReview["reviewers"][number]["status"], respondedAtDemonstration: null, hasDocumentAccess: true, unavailableReason: null },
      ],
      requiredReviewerCount: 2, dueDateDirection: null, includedCategories: [],
      blockingPolicyEnabled: true, createdByDisplayName: "Owner",
      createdAtDemonstration: "2026-01-01T00:00:00.000Z", updatedAtDemonstration: "2026-01-01T00:00:00.000Z",
      demonstrationOnly: true,
    };
    const summary = buildReviewSummary([], viewer(), review);
    expect(summary.respondedReviewerCount).toBe(1);
    expect(summary.missingReviewerResponses).toBe(1);
  });
});

describe("resolvePreparationReadiness", () => {
  it("is ready with no warnings when nothing is outstanding", () => {
    const summary = { ...buildReviewSummary([], viewer(), null) };
    expect(resolvePreparationReadiness(summary, true)).toEqual({ ready: true, warnings: [] });
  });

  it("warns about blocking threads only when the blocking policy is enabled", () => {
    const summary = { ...buildReviewSummary([], viewer(), null), blockingThreads: 2 };
    expect(resolvePreparationReadiness(summary, false).warnings).toEqual([]);
    expect(resolvePreparationReadiness(summary, true).warnings[0]).toMatch(/2 threads are marked as blocking/);
  });

  it("never blocks or enforces — it only produces a direction-only warning", () => {
    const summary = { ...buildReviewSummary([], viewer(), null), missingReviewerResponses: 1 };
    const result = resolvePreparationReadiness(summary, true);
    expect(result.ready).toBe(false);
    expect(result.warnings[0]).toMatch(/1 internal reviewer has not responded/);
  });
});

describe("toThreadSummary", () => {
  it("redacts title, priority, and status for a restricted thread", () => {
    const t = thread({ title: "Sensitive", priority: "high-attention", status: "blocking-demonstration" });
    const restricted = { outcome: "restricted" as const, explanation: "x", maySeeExistence: true };
    const summary = toThreadSummary(t, restricted, viewer(), "Contract.pdf");
    expect(summary.title).toBe("Restricted discussion");
    expect(summary.priority).toBe("normal");
    expect(summary.replyCount).toBe(0);
  });

  it("passes real content through for an allowed thread", () => {
    const t = thread({ title: "Real title", replyCount: 3 });
    const allowed = { outcome: "allowed" as const, explanation: "", maySeeExistence: true };
    const summary = toThreadSummary(t, allowed, viewer(), "Contract.pdf");
    expect(summary.title).toBe("Real title");
    expect(summary.replyCount).toBe(3);
  });
});

describe("applyCollaborationQuery / sortThreadSummaries", () => {
  function summary(overrides: Partial<CollaborationThreadSummary> = {}): CollaborationThreadSummary {
    return {
      id: "thr_1" as CollaborationThreadSummary["id"], documentId: "doc_1", documentLabel: "Doc",
      title: "Discussion about scope", category: "general" as CollaborationThreadSummary["category"],
      visibility: "internal-workspace", priority: "normal", status: "open",
      anchorLabel: "Document", anchorType: "document",
      replyCount: 0, mentionsCurrentUser: false, updatedAtDemonstration: "2026-01-01T00:00:00.000Z",
      restricted: false,
      ...overrides,
    };
  }

  it("filters by free-text query against title and anchor label only", () => {
    const s1 = summary({ id: "a" as CollaborationThreadSummary["id"], title: "Payment terms" });
    const s2 = summary({ id: "b" as CollaborationThreadSummary["id"], title: "Signature block" });
    const query: CollaborationQuery = {
      q: "payment", status: "all", visibility: "all", category: "all",
      priority: "all", anchorType: "all", reviewerId: "all", mentionedMe: false, sort: "recently-updated",
    };
    expect(applyCollaborationQuery([s1, s2], query).map((s) => s.id)).toEqual(["a"]);
  });

  it("sorts by priority weight, high-attention first", () => {
    const low = summary({ id: "low" as CollaborationThreadSummary["id"], priority: "normal" });
    const high = summary({ id: "high" as CollaborationThreadSummary["id"], priority: "high-attention" });
    const sorted = sortThreadSummaries([low, high], "priority");
    expect(sorted.map((s) => s.id)).toEqual(["high", "low"]);
  });

  it("sorts most-replies descending", () => {
    const few = summary({ id: "few" as CollaborationThreadSummary["id"], replyCount: 1 });
    const many = summary({ id: "many" as CollaborationThreadSummary["id"], replyCount: 9 });
    expect(sortThreadSummaries([few, many], "most-replies").map((s) => s.id)).toEqual(["many", "few"]);
  });
});

describe("anchorAvailabilityTone / anchorTypeIsInternalOnly", () => {
  it("maps availability to a display tone", () => {
    expect(anchorAvailabilityTone("available")).toBe("ok");
    expect(anchorAvailabilityTone("stale")).toBe("warn");
    expect(anchorAvailabilityTone("restricted")).toBe("muted");
  });

  it("flags only the internal-only anchor types", () => {
    expect(anchorTypeIsInternalOnly("verification-summary")).toBe(true);
    expect(anchorTypeIsInternalOnly("bulk-send-review")).toBe(true);
    expect(anchorTypeIsInternalOnly("document")).toBe(false);
  });
});
