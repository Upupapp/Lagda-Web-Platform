// Document Collaboration fixtures — Command 34.
//
// Fictional frontend demonstration state. Every person, organization, and discussion
// here is invented; email addresses use reserved example domains only.
//
// Nothing in this file is delivered, persisted, or recorded. No comment here is an
// audit record, Evidence, a notification receipt, or proof that review occurred.
//
// Internal member IDs (wm_*) and the workspace ID match the C37 signing-workflow
// directory exactly, so the Collaboration tab can never disagree with the
// Participants tab about who exists.

import {
  collabAnchorId,
  collabCommentId,
  collabMentionId,
  collabReviewId,
  collabThreadId,
  type CollaborationComment,
  type CollaborationMention,
  type CollaborationReview,
  type CollaborationThread,
} from "../../models/collaboration";
import type { MentionCandidate } from "../../services/collaboration.resolver";

// Collaboration is scoped to the SESSION workspace (the one the signed-in member
// belongs to), not to the workspace ID stamped on a document fixture.
//
// Note a pre-existing repository inconsistency, recorded rather than silently
// absorbed: `MOCK_CURRENT_USER` and the workspace-admin fixtures use `ws_mls_001`,
// while the document fixtures still carry the older `ws_northbridge_001`. Threads
// and members here use the session workspace so the visibility check is live rather
// than vacuous — `WORKSPACE_OTHER` below exists to prove it actually bites.
export const COLLAB_WORKSPACE_ID = "ws_mls_001";
export const WORKSPACE_OTHER     = "ws_southgate_002";

// ── Internal members ──────────────────────────────────────────────────────────
// Being a Workspace Member is NOT the same as having access to a given document.
// `hasDocumentAccess` is tracked separately and is what mention eligibility reads.

export const MEMBER_ANA       = "wm_ana";
export const MEMBER_ANTONIO   = "wm_antonio";
export const MEMBER_RAFAEL    = "wm_rafael";
export const MEMBER_CARMEN    = "wm_carmen";
export const MEMBER_PAOLO     = "wm_paolo";
export const MEMBER_SUSPENDED = "wm_suspended";
export const MEMBER_OTHER_WS  = "wm_other_ws";

export const TEAM_LEGAL_REVIEW = "team_nbl_legal";
export const TEAM_COMPLIANCE   = "team_nbl_compliance";

export const TEAM_NAMES: Record<string, string> = {
  [TEAM_LEGAL_REVIEW]: "Legal Review",
  [TEAM_COMPLIANCE]:   "Compliance",
};

/**
 * The mention candidate pool. Deliberately includes members who must be EXCLUDED,
 * so the exclusion path is demonstrable rather than theoretical:
 *   - Paolo has no access to the document        → excluded, counted only
 *   - Teodoro is suspended                       → excluded, counted only
 *   - Beatriz belongs to another workspace       → excluded, counted only
 */
export const COLLABORATION_MEMBERS: MentionCandidate[] = [
  {
    memberId: MEMBER_ANA, displayName: "Ana Reyes", roleLabel: "Owner",
    teamIds: [TEAM_LEGAL_REVIEW, TEAM_COMPLIANCE], teamName: "Legal Review",
    workspaceId: COLLAB_WORKSPACE_ID, hasDocumentAccess: true, active: true,
  },
  {
    memberId: MEMBER_ANTONIO, displayName: "Antonio Tan", roleLabel: "Administrator",
    teamIds: [TEAM_LEGAL_REVIEW], teamName: "Legal Review",
    workspaceId: COLLAB_WORKSPACE_ID, hasDocumentAccess: true, active: true,
  },
  {
    memberId: MEMBER_RAFAEL, displayName: "Rafael Gomez", roleLabel: "Sender",
    teamIds: [TEAM_LEGAL_REVIEW], teamName: "Legal Review",
    workspaceId: COLLAB_WORKSPACE_ID, hasDocumentAccess: true, active: true,
  },
  {
    memberId: MEMBER_CARMEN, displayName: "Carmen Bautista", roleLabel: "Reviewer / Auditor",
    teamIds: [TEAM_COMPLIANCE], teamName: "Compliance",
    workspaceId: COLLAB_WORKSPACE_ID, hasDocumentAccess: true, active: true,
  },
  {
    memberId: MEMBER_PAOLO, displayName: "Paolo Diaz", roleLabel: "Member",
    teamIds: [], teamName: null,
    workspaceId: COLLAB_WORKSPACE_ID, hasDocumentAccess: false, active: true,
  },
  {
    memberId: MEMBER_SUSPENDED, displayName: "Teodoro Salazar", roleLabel: "Member",
    teamIds: [TEAM_COMPLIANCE], teamName: "Compliance",
    workspaceId: COLLAB_WORKSPACE_ID, hasDocumentAccess: true, active: false,
  },
  {
    memberId: MEMBER_OTHER_WS, displayName: "Beatriz Ocampo", roleLabel: "Administrator",
    teamIds: [], teamName: null,
    workspaceId: WORKSPACE_OTHER, hasDocumentAccess: true, active: true,
  },
];

// ── Helpers ───────────────────────────────────────────────────────────────────

let commentSeq = 0;

function comment(input: {
  threadId: string;
  memberId: string;
  displayName: string;
  roleLabel: string;
  body: string;
  at: string;
  mentions?: string[];
  status?: CollaborationComment["status"];
  editedAt?: string;
}): CollaborationComment {
  commentSeq += 1;
  return {
    id: collabCommentId(`cmt_${String(commentSeq).padStart(3, "0")}`),
    threadId: collabThreadId(input.threadId),
    author: {
      memberId: input.memberId,
      displayName: input.displayName,
      roleLabel: input.roleLabel,
      redacted: false,
    },
    body: input.body,
    status: input.status ?? "active",
    createdAtDemonstration: input.at,
    editedAtDemonstration: input.editedAt ?? null,
    mentionedMemberIds: input.mentions ?? [],
    // Recomputed per viewer by the service; the fixture value reflects the default
    // demonstration identity (Ana Reyes).
    authoredByCurrentUser: input.memberId === MEMBER_ANA,
  };
}

function anchor(input: {
  id: string;
  type: CollaborationThread["anchor"]["type"];
  resourceId?: string | null;
  label: string;
  page?: number | null;
}): CollaborationThread["anchor"] {
  return {
    id: collabAnchorId(input.id),
    type: input.type,
    resourceId: input.resourceId ?? null,
    label: input.label,
    pageDirection: input.page ?? null,
    // Recomputed by resolveAnchor() against the live document; these are the
    // unresolved defaults.
    availability: "available",
    destination: null,
    unavailableReason: null,
  };
}

// ── Threads ───────────────────────────────────────────────────────────────────
//
// txn_004 (draft, Faculty Employment Contract) carries the richest set, because it
// is the only fixture still in `draft` and therefore the only one where preparation
// is genuinely in progress. txn_004 is deliberately reserved as the from-scratch
// document by the C37 audit; collaboration threads do not change its status.

const T4 = "txn_004";
const T1 = "txn_001";
const T3 = "txn_003";
const T5 = "txn_005";
const T7 = "txn_007";
const T8 = "txn_008";

export const COLLABORATION_THREAD_FIXTURES: CollaborationThread[] = [
  // ── txn_004 — open discussion on a required field ──────────────────────────
  {
    id: collabThreadId("thr_001"),
    documentId: T4,
    workspaceId: COLLAB_WORKSPACE_ID,
    teamId: null,
    teamName: null,
    title: "Start date field should be required before we prepare",
    category: "required-fields",
    visibility: "internal-workspace",
    priority: "attention",
    status: "needs-attention",
    anchor: anchor({
      id: "anc_001", type: "template-field", resourceId: "fld_start_date",
      label: "Start Date field",
    }),
    createdByMemberId: MEMBER_ANTONIO,
    createdByDisplayName: "Antonio Tan",
    comments: [
      comment({
        threadId: "thr_001", memberId: MEMBER_ANTONIO, displayName: "Antonio Tan",
        roleLabel: "Administrator", at: "2026-07-15T08:12:00Z",
        body: "The start date is currently optional. For a faculty contract we should not send this out without it, otherwise payroll has nothing to work from.",
        mentions: [MEMBER_ANA],
      }),
      comment({
        threadId: "thr_001", memberId: MEMBER_ANA, displayName: "Ana Reyes",
        roleLabel: "Owner", at: "2026-07-15T08:40:00Z",
        body: "Agreed. I will mark it required in field placement before this goes anywhere.",
      }),
    ],
    replyCount: 1,
    blockingReason: null,
    blockingSetByDisplayName: null,
    resolution: null,
    priorResolutions: [],
    reviewId: collabReviewId("rev_001"),
    assignedReviewerMemberIds: [MEMBER_ANTONIO, MEMBER_CARMEN],
    createdAtDemonstration: "2026-07-15T08:12:00Z",
    updatedAtDemonstration: "2026-07-15T08:40:00Z",
    demonstrationOnly: true,
  },

  // ── txn_004 — blocking thread ──────────────────────────────────────────────
  {
    id: collabThreadId("thr_002"),
    documentId: T4,
    workspaceId: COLLAB_WORKSPACE_ID,
    teamId: null,
    teamName: null,
    title: "Confirm the authentication direction for the signer",
    category: "authentication-direction",
    visibility: "owner-and-reviewers",
    priority: "high-attention",
    status: "blocking-demonstration",
    anchor: anchor({
      id: "anc_002", type: "participant-role", resourceId: "role_signer",
      label: "Signer role",
    }),
    createdByMemberId: MEMBER_CARMEN,
    createdByDisplayName: "Carmen Bautista",
    comments: [
      comment({
        threadId: "thr_002", memberId: MEMBER_CARMEN, displayName: "Carmen Bautista",
        roleLabel: "Reviewer / Auditor", at: "2026-07-15T09:05:00Z",
        body: "Before preparation continues, we should agree internally on which authentication method we are directing for the signer. This is a direction for the team, not a determination that any method is sufficient.",
        mentions: [MEMBER_ANA, MEMBER_ANTONIO],
      }),
      comment({
        threadId: "thr_002", memberId: MEMBER_ANA, displayName: "Ana Reyes",
        roleLabel: "Owner", at: "2026-07-15T09:22:00Z",
        body: "Noted. Leaving this marked as blocking in the demonstration so nobody prepares past it while we discuss.",
      }),
    ],
    replyCount: 1,
    blockingReason: "Internal reviewers want the authentication direction settled before preparation continues.",
    blockingSetByDisplayName: "Carmen Bautista",
    resolution: null,
    priorResolutions: [],
    reviewId: collabReviewId("rev_001"),
    assignedReviewerMemberIds: [MEMBER_ANTONIO, MEMBER_CARMEN],
    createdAtDemonstration: "2026-07-15T09:05:00Z",
    updatedAtDemonstration: "2026-07-15T09:22:00Z",
    demonstrationOnly: true,
  },

  // ── txn_004 — resolved, then reopened, keeping prior resolution history ────
  {
    id: collabThreadId("thr_003"),
    documentId: T4,
    workspaceId: COLLAB_WORKSPACE_ID,
    teamId: null,
    teamName: null,
    title: "Which folder should this contract live in?",
    category: "folder-and-tag-organization",
    visibility: "internal-workspace",
    priority: "normal",
    status: "reopened",
    anchor: anchor({
      id: "anc_003", type: "folder", resourceId: "fol_003",
      label: "Employment folder",
    }),
    createdByMemberId: MEMBER_RAFAEL,
    createdByDisplayName: "Rafael Gomez",
    comments: [
      comment({
        threadId: "thr_003", memberId: MEMBER_RAFAEL, displayName: "Rafael Gomez",
        roleLabel: "Sender", at: "2026-07-15T10:00:00Z",
        body: "Putting this under Employment for now.",
      }),
      comment({
        threadId: "thr_003", memberId: MEMBER_ANA, displayName: "Ana Reyes",
        roleLabel: "Owner", at: "2026-07-15T11:30:00Z",
        body: "Reopening — we may want a separate folder per institution rather than one shared Employment folder.",
      }),
    ],
    replyCount: 1,
    blockingReason: null,
    blockingSetByDisplayName: null,
    resolution: null,
    priorResolutions: [
      {
        summary: "Filed under the existing Employment folder.",
        resolvedByDisplayName: "Rafael Gomez",
        resolvedAtDemonstration: "2026-07-15T10:20:00Z",
        relatedDestination: null,
        relatedLabel: null,
      },
    ],
    reviewId: null,
    assignedReviewerMemberIds: [],
    createdAtDemonstration: "2026-07-15T10:00:00Z",
    updatedAtDemonstration: "2026-07-15T11:30:00Z",
    demonstrationOnly: true,
  },

  // ── txn_004 — stale anchor: the referenced field no longer exists ──────────
  {
    id: collabThreadId("thr_004"),
    documentId: T4,
    workspaceId: COLLAB_WORKSPACE_ID,
    teamId: null,
    teamName: null,
    title: "Probation clause initials block",
    category: "content-question",
    visibility: "internal-workspace",
    priority: "normal",
    status: "open",
    anchor: anchor({
      id: "anc_004", type: "template-field", resourceId: "fld_removed_initials",
      label: "Probation initials field (removed)",
    }),
    createdByMemberId: MEMBER_ANTONIO,
    createdByDisplayName: "Antonio Tan",
    comments: [
      comment({
        threadId: "thr_004", memberId: MEMBER_ANTONIO, displayName: "Antonio Tan",
        roleLabel: "Administrator", at: "2026-07-15T12:00:00Z",
        body: "This referred to an initials block that has since been taken out of the layout. Keeping the discussion for context.",
      }),
    ],
    replyCount: 0,
    blockingReason: null,
    blockingSetByDisplayName: null,
    resolution: null,
    priorResolutions: [],
    reviewId: null,
    assignedReviewerMemberIds: [],
    createdAtDemonstration: "2026-07-15T12:00:00Z",
    updatedAtDemonstration: "2026-07-15T12:00:00Z",
    demonstrationOnly: true,
  },

  // ── txn_004 — Personal Draft Note (private to Ana, including from Admins) ──
  {
    id: collabThreadId("thr_005"),
    documentId: T4,
    workspaceId: COLLAB_WORKSPACE_ID,
    teamId: null,
    teamName: null,
    title: "My note — check the salary figure against the offer letter",
    category: "other",
    visibility: "personal-draft-note",
    priority: "normal",
    status: "open",
    anchor: anchor({ id: "anc_005", type: "document", label: "This document" }),
    createdByMemberId: MEMBER_ANA,
    createdByDisplayName: "Ana Reyes",
    comments: [
      comment({
        threadId: "thr_005", memberId: MEMBER_ANA, displayName: "Ana Reyes",
        roleLabel: "Owner", at: "2026-07-15T13:15:00Z",
        body: "Reminder to myself: confirm the figure matches the signed offer letter before I hand this to Antonio.",
      }),
    ],
    replyCount: 0,
    blockingReason: null,
    blockingSetByDisplayName: null,
    resolution: null,
    priorResolutions: [],
    reviewId: null,
    assignedReviewerMemberIds: [],
    createdAtDemonstration: "2026-07-15T13:15:00Z",
    updatedAtDemonstration: "2026-07-15T13:15:00Z",
    demonstrationOnly: true,
  },

  // ── txn_001 — resolved thread with a resolution summary ────────────────────
  {
    id: collabThreadId("thr_006"),
    documentId: T1,
    workspaceId: COLLAB_WORKSPACE_ID,
    teamId: null,
    teamName: null,
    title: "Retainer scope wording on page 2",
    category: "content-question",
    visibility: "internal-workspace",
    priority: "normal",
    status: "resolved",
    anchor: anchor({ id: "anc_006", type: "page-direction", label: "Page 2", page: 2 }),
    createdByMemberId: MEMBER_ANA,
    createdByDisplayName: "Ana Reyes",
    comments: [
      comment({
        threadId: "thr_006", memberId: MEMBER_ANA, displayName: "Ana Reyes",
        roleLabel: "Owner", at: "2026-07-09T15:00:00Z",
        body: "The scope paragraph on page 2 reads a little broadly. Flagging it before this went out.",
      }),
      comment({
        threadId: "thr_006", memberId: MEMBER_ANTONIO, displayName: "Antonio Tan",
        roleLabel: "Administrator", at: "2026-07-09T16:10:00Z",
        body: "Tightened before upload. Nothing further needed on our side.",
        editedAt: "2026-07-09T16:14:00Z", status: "edited",
      }),
      comment({
        threadId: "thr_006", memberId: MEMBER_RAFAEL, displayName: "Rafael Gomez",
        roleLabel: "Sender", at: "2026-07-09T16:30:00Z",
        body: "",
        status: "removed-in-demonstration",
      }),
    ],
    replyCount: 2,
    blockingReason: null,
    blockingSetByDisplayName: null,
    resolution: {
      summary: "Wording tightened before the document was uploaded. No change needed to the sent version.",
      resolvedByDisplayName: "Ana Reyes",
      resolvedAtDemonstration: "2026-07-09T17:00:00Z",
      relatedDestination: null,
      relatedLabel: null,
    },
    priorResolutions: [],
    reviewId: null,
    assignedReviewerMemberIds: [],
    createdAtDemonstration: "2026-07-09T15:00:00Z",
    updatedAtDemonstration: "2026-07-09T17:00:00Z",
    demonstrationOnly: true,
  },

  // ── txn_003 — team-scoped: restricted for anyone outside Compliance ────────
  {
    id: collabThreadId("thr_007"),
    documentId: T3,
    workspaceId: COLLAB_WORKSPACE_ID,
    teamId: TEAM_COMPLIANCE,
    teamName: "Compliance",
    title: "Compliance question on the property description",
    category: "internal-review",
    visibility: "internal-team",
    priority: "attention",
    status: "open",
    anchor: anchor({ id: "anc_007", type: "page-direction", label: "Page 5", page: 5 }),
    createdByMemberId: MEMBER_CARMEN,
    createdByDisplayName: "Carmen Bautista",
    comments: [
      comment({
        threadId: "thr_007", memberId: MEMBER_CARMEN, displayName: "Carmen Bautista",
        roleLabel: "Reviewer / Auditor", at: "2026-07-13T09:00:00Z",
        body: "Raising this within Compliance only for now. It is an internal question and not a determination about the transaction.",
      }),
    ],
    replyCount: 0,
    blockingReason: null,
    blockingSetByDisplayName: null,
    resolution: null,
    priorResolutions: [],
    reviewId: null,
    assignedReviewerMemberIds: [MEMBER_CARMEN],
    createdAtDemonstration: "2026-07-13T09:00:00Z",
    updatedAtDemonstration: "2026-07-13T09:00:00Z",
    demonstrationOnly: true,
  },

  // ── txn_008 — blocking on delivery preparation ─────────────────────────────
  {
    id: collabThreadId("thr_008"),
    documentId: T8,
    workspaceId: COLLAB_WORKSPACE_ID,
    teamId: null,
    teamName: null,
    title: "Re-check the recipient address direction before retrying",
    category: "delivery-preparation",
    visibility: "internal-workspace",
    priority: "high-attention",
    status: "blocking-demonstration",
    anchor: anchor({ id: "anc_008", type: "preparation-step", label: "Preparation" }),
    createdByMemberId: MEMBER_ANA,
    createdByDisplayName: "Ana Reyes",
    comments: [
      comment({
        threadId: "thr_008", memberId: MEMBER_ANA, displayName: "Ana Reyes",
        roleLabel: "Owner", at: "2026-07-11T11:00:00Z",
        body: "Delivery did not go through in this demonstration. Let us confirm the intended recipient details internally before anyone retries.",
        mentions: [MEMBER_RAFAEL],
      }),
    ],
    replyCount: 0,
    blockingReason: "Internal check requested before any retry.",
    blockingSetByDisplayName: "Ana Reyes",
    resolution: null,
    priorResolutions: [],
    reviewId: null,
    assignedReviewerMemberIds: [],
    createdAtDemonstration: "2026-07-11T11:00:00Z",
    updatedAtDemonstration: "2026-07-11T11:00:00Z",
    demonstrationOnly: true,
  },

  // ── txn_005 — Participant Visible: exists, but requires a separate entitlement ─
  {
    id: collabThreadId("thr_009"),
    documentId: T5,
    workspaceId: COLLAB_WORKSPACE_ID,
    teamId: null,
    teamName: null,
    title: "Note intended for the recipient about the renewal term",
    category: "general-discussion",
    visibility: "participant-visible",
    priority: "normal",
    status: "open",
    anchor: anchor({ id: "anc_009", type: "document", label: "This document" }),
    createdByMemberId: MEMBER_ANA,
    createdByDisplayName: "Ana Reyes",
    comments: [
      comment({
        threadId: "thr_009", memberId: MEMBER_ANA, displayName: "Ana Reyes",
        roleLabel: "Owner", at: "2026-07-13T15:00:00Z",
        body: "The renewal term follows the same schedule as the original agreement. Nothing here has been delivered to anyone.",
      }),
    ],
    replyCount: 0,
    blockingReason: null,
    blockingSetByDisplayName: null,
    resolution: null,
    priorResolutions: [],
    reviewId: null,
    assignedReviewerMemberIds: [],
    createdAtDemonstration: "2026-07-13T15:00:00Z",
    updatedAtDemonstration: "2026-07-13T15:00:00Z",
    demonstrationOnly: true,
  },

  // ── txn_007 — archived thread, kept for reference ──────────────────────────
  {
    id: collabThreadId("thr_010"),
    documentId: T7,
    workspaceId: COLLAB_WORKSPACE_ID,
    teamId: null,
    teamName: null,
    title: "Old vendor terms discussion",
    category: "template-use",
    visibility: "internal-workspace",
    priority: "normal",
    status: "archived",
    anchor: anchor({ id: "anc_010", type: "document", label: "This document" }),
    createdByMemberId: MEMBER_RAFAEL,
    createdByDisplayName: "Rafael Gomez",
    comments: [
      comment({
        threadId: "thr_010", memberId: MEMBER_RAFAEL, displayName: "Rafael Gomez",
        roleLabel: "Sender", at: "2026-05-15T09:00:00Z",
        body: "Archiving this. Kept for reference rather than deleted.",
      }),
    ],
    replyCount: 0,
    blockingReason: null,
    blockingSetByDisplayName: null,
    resolution: null,
    priorResolutions: [],
    reviewId: null,
    assignedReviewerMemberIds: [],
    createdAtDemonstration: "2026-05-15T09:00:00Z",
    updatedAtDemonstration: "2026-05-22T00:00:00Z",
    demonstrationOnly: true,
  },

  // ── Another workspace entirely — must never be visible or counted ──────────
  // Present so the workspace boundary in resolveThreadVisibility() is exercised
  // rather than merely asserted.
  {
    id: collabThreadId("thr_011"),
    documentId: T1,
    workspaceId: WORKSPACE_OTHER,
    teamId: null,
    teamName: null,
    title: "Southgate internal note",
    category: "general-discussion",
    visibility: "internal-workspace",
    priority: "normal",
    status: "open",
    anchor: anchor({ id: "anc_011", type: "document", label: "This document" }),
    createdByMemberId: MEMBER_OTHER_WS,
    createdByDisplayName: "Beatriz Ocampo",
    comments: [
      comment({
        threadId: "thr_011", memberId: MEMBER_OTHER_WS, displayName: "Beatriz Ocampo",
        roleLabel: "Administrator", at: "2026-07-10T09:00:00Z",
        body: "This belongs to a different workspace and must never appear in Mabini Legal Solutions.",
      }),
    ],
    replyCount: 0,
    blockingReason: null,
    blockingSetByDisplayName: null,
    resolution: null,
    priorResolutions: [],
    reviewId: null,
    assignedReviewerMemberIds: [],
    createdAtDemonstration: "2026-07-10T09:00:00Z",
    updatedAtDemonstration: "2026-07-10T09:00:00Z",
    demonstrationOnly: true,
  },
];

// ── Reviews ───────────────────────────────────────────────────────────────────

export const COLLABORATION_REVIEW_FIXTURES: CollaborationReview[] = [
  {
    id: collabReviewId("rev_001"),
    documentId: T4,
    workspaceId: COLLAB_WORKSPACE_ID,
    teamId: TEAM_LEGAL_REVIEW,
    teamName: "Legal Review",
    name: "Pre-preparation internal review",
    description: "Internal check before this contract is prepared. Not participant approval and not legal approval.",
    status: "changes-requested",
    reviewers: [
      {
        memberId: MEMBER_ANTONIO, displayName: "Antonio Tan", roleLabel: "Administrator",
        status: "changes-requested", respondedAtDemonstration: "2026-07-15T08:12:00Z",
        hasDocumentAccess: true, unavailableReason: null,
      },
      {
        memberId: MEMBER_CARMEN, displayName: "Carmen Bautista", roleLabel: "Reviewer / Auditor",
        status: "in-review", respondedAtDemonstration: null,
        hasDocumentAccess: true, unavailableReason: null,
      },
      {
        // Demonstrates the boundary: assignment never grants access, so a reviewer
        // without access is shown as unavailable rather than silently granted entry.
        memberId: MEMBER_PAOLO, displayName: "Paolo Diaz", roleLabel: "Member",
        status: "unavailable", respondedAtDemonstration: null,
        hasDocumentAccess: false,
        unavailableReason: "This member does not have access to this document. Assigning a reviewer does not grant access.",
      },
    ],
    requiredReviewerCount: 2,
    dueDateDirection: "2026-07-18",
    includedCategories: ["required-fields", "authentication-direction", "internal-review"],
    blockingPolicyEnabled: true,
    createdByDisplayName: "Ana Reyes",
    createdAtDemonstration: "2026-07-15T08:00:00Z",
    updatedAtDemonstration: "2026-07-15T09:22:00Z",
    demonstrationOnly: true,
  },
  {
    id: collabReviewId("rev_002"),
    documentId: T8,
    workspaceId: COLLAB_WORKSPACE_ID,
    teamId: null,
    teamName: null,
    name: "Delivery preparation check",
    description: null,
    status: "review-requested-demonstration",
    reviewers: [
      {
        memberId: MEMBER_RAFAEL, displayName: "Rafael Gomez", roleLabel: "Sender",
        status: "not-started", respondedAtDemonstration: null,
        hasDocumentAccess: true, unavailableReason: null,
      },
    ],
    requiredReviewerCount: 1,
    dueDateDirection: null,
    includedCategories: ["delivery-preparation"],
    blockingPolicyEnabled: true,
    createdByDisplayName: "Ana Reyes",
    createdAtDemonstration: "2026-07-11T11:00:00Z",
    updatedAtDemonstration: "2026-07-11T11:00:00Z",
    demonstrationOnly: true,
  },
];

// ── Mentions for the demonstration identity (Ana Reyes) ───────────────────────
// A mention is a pointer. None of these was delivered by email, SMS, or push, and
// none of them granted access to anything.

export const COLLABORATION_MENTION_FIXTURES: CollaborationMention[] = [
  {
    id: collabMentionId("mnt_001"),
    threadId: collabThreadId("thr_001"),
    commentId: collabCommentId("cmt_001"),
    documentId: T4,
    documentLabel: "Faculty Employment Contract — Sampaguita Learning Institute",
    threadTitle: "Start date field should be required before we prepare",
    mentionedByDisplayName: "Antonio Tan",
    visibility: "internal-workspace",
    status: "unviewed",
    createdAtDemonstration: "2026-07-15T08:12:00Z",
    destination: "/app/documents/txn_004/collaboration/thr_001",
    unavailableReason: null,
  },
  {
    id: collabMentionId("mnt_002"),
    threadId: collabThreadId("thr_002"),
    commentId: collabCommentId("cmt_003"),
    documentId: T4,
    documentLabel: "Faculty Employment Contract — Sampaguita Learning Institute",
    threadTitle: "Confirm the authentication direction for the signer",
    mentionedByDisplayName: "Carmen Bautista",
    visibility: "owner-and-reviewers",
    status: "unviewed",
    createdAtDemonstration: "2026-07-15T09:05:00Z",
    destination: "/app/documents/txn_004/collaboration/thr_002",
    unavailableReason: null,
  },
  {
    // The mention survives, the destination does not. The mention must never become
    // a way back into something the viewer can no longer open.
    id: collabMentionId("mnt_003"),
    threadId: collabThreadId("thr_011_removed"),
    commentId: collabCommentId("cmt_removed"),
    documentId: "txn_restricted",
    documentLabel: "Restricted document",
    threadTitle: "Restricted discussion",
    mentionedByDisplayName: "Carmen Bautista",
    visibility: "internal-team",
    status: "viewed",
    createdAtDemonstration: "2026-07-12T10:00:00Z",
    destination: null,
    unavailableReason: "The discussion you were mentioned in is no longer available to you.",
  },
];

/** Documents with no collaboration at all — the empty state must be reachable. */
export const DOCUMENTS_WITHOUT_COLLABORATION = ["txn_002", "txn_006"];
