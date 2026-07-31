// Document Collaboration domain models — Command 34.
//
// SCOPE: asynchronous INTERNAL review — threads, comments, mentions, review records.
// This is NOT real-time collaboration. Presence, typing indicators, live cursors,
// WebSockets, and Server-Sent Events are all explicitly out of scope.
//
// HARD BOUNDARIES encoded here:
//   - Collaboration never grants document access.
//   - A mention never grants access. Reviewer assignment never grants access.
//   - Internal review is NOT participant approval and NOT legal approval.
//   - Comments never create Evidence, Verification, or transaction Activity.
//   - Personal Draft Notes are private to the current user, including from Admins.
//   - Internal content NEVER becomes Participant Visible automatically.
//
// "Reviewer" is overloaded in this codebase: C20 has a recipient-facing Reviewer
// participant role. Everything here is prefixed Collaboration* and never reuses
// ParticipantRole, so the two can never be confused.
//
// Burgundy (#67023B) is eNotary-only and never appears in this feature.

// ── Branded identity types ────────────────────────────────────────────────────

export type CollaborationThreadId   = string & { readonly __brand: "CollaborationThreadId" };
export type CollaborationCommentId  = string & { readonly __brand: "CollaborationCommentId" };
export type CollaborationMentionId  = string & { readonly __brand: "CollaborationMentionId" };
export type CollaborationReviewId   = string & { readonly __brand: "CollaborationReviewId" };
export type CollaborationAnchorId   = string & { readonly __brand: "CollaborationAnchorId" };
export type CollaborationActivityId = string & { readonly __brand: "CollaborationActivityId" };

export const collabThreadId  = (s: string) => s as CollaborationThreadId;
export const collabCommentId = (s: string) => s as CollaborationCommentId;
export const collabMentionId = (s: string) => s as CollaborationMentionId;
export const collabReviewId  = (s: string) => s as CollaborationReviewId;
export const collabAnchorId  = (s: string) => s as CollaborationAnchorId;

const ID_PATTERN = /^[A-Za-z0-9_-]{1,64}$/;
export function isSafeCollaborationId(v: unknown): v is string {
  return typeof v === "string" && ID_PATTERN.test(v);
}

// ── Limits and text safety ────────────────────────────────────────────────────

export const COLLAB_TITLE_MAX      = 140;
export const COLLAB_COMMENT_MAX    = 2000;
export const COLLAB_SUMMARY_MAX    = 600;
export const COLLAB_REVIEW_NAME_MAX = 120;
export const COLLAB_NOTE_MAX       = 1000;
export const COLLAB_MAX_MENTIONS   = 10;
export const COLLAB_COMMENTS_PER_PAGE = 25;

/**
 * Plain-text normalisation for every user-authored string.
 * Strips control characters, collapses whitespace, caps length.
 * No HTML is ever accepted, stored, or rendered as markup — React escapes on render
 * and `dangerouslySetInnerHTML` is never used anywhere in this feature.
 */
export function normalizeCollaborationText(input: string, maxLength: number): string {
  return input
    .replace(/[\u0000-\u0008\u000B\u000C\u000E-\u001F\u007F]/g, " ")
    .replace(/[ \t]+/g, " ")
    .replace(/\n{3,}/g, "\n\n")
    .trim()
    .slice(0, maxLength);
}

// ── Visibility ────────────────────────────────────────────────────────────────

export type CollaborationVisibility =
  | "internal-workspace"
  | "internal-team"
  | "owner-and-reviewers"
  | "participant-visible"
  | "personal-draft-note";

export const COLLAB_VISIBILITY_LABELS: Record<CollaborationVisibility, string> = {
  "internal-workspace":  "Internal — Workspace",
  "internal-team":       "Internal — Team",
  "owner-and-reviewers": "Owner and Reviewers",
  "participant-visible": "Participant Visible",
  "personal-draft-note": "Personal Draft Note",
};

export const COLLAB_VISIBILITY_DESCRIPTIONS: Record<CollaborationVisibility, string> = {
  "internal-workspace":  "Visible to permitted Workspace Members who already have access to this document.",
  "internal-team":       "Visible to permitted Members of the selected Team who already have document access.",
  "owner-and-reviewers": "Visible to the document owner, the sender, and explicitly assigned internal reviewers who already have access.",
  "participant-visible": "May appear in a controlled recipient projection. Requires separate permission and explicit confirmation.",
  "personal-draft-note": "Visible only to you. Not shown to Workspace Administrators, reviewers, or participants.",
};

export const VALID_COLLAB_VISIBILITIES: readonly CollaborationVisibility[] = [
  "internal-workspace", "internal-team", "owner-and-reviewers",
  "participant-visible", "personal-draft-note",
];

/** The safest applicable default. Participant Visible is NEVER a default. */
export const DEFAULT_COLLAB_VISIBILITY: CollaborationVisibility = "internal-workspace";

export function isInternalVisibility(v: CollaborationVisibility): boolean {
  return v === "internal-workspace" || v === "internal-team" || v === "owner-and-reviewers";
}

export function visibilityAllowsMentions(v: CollaborationVisibility): boolean {
  // Personal Draft Notes can never mention anyone — they create no notification
  // and are visible to nobody else, so a mention would be meaningless and misleading.
  return v !== "personal-draft-note";
}

export function parseVisibility(v: unknown): CollaborationVisibility | "all" {
  return VALID_COLLAB_VISIBILITIES.includes(v as CollaborationVisibility)
    ? (v as CollaborationVisibility) : "all";
}

// ── Thread status ─────────────────────────────────────────────────────────────

export type CollaborationThreadStatus =
  | "open" | "needs-attention" | "blocking-demonstration"
  | "resolved" | "reopened" | "archived" | "unavailable";

export const COLLAB_THREAD_STATUS_LABELS: Record<CollaborationThreadStatus, string> = {
  "open":                   "Open",
  "needs-attention":        "Needs Attention",
  "blocking-demonstration": "Blocking in Demonstration",
  "resolved":               "Resolved in Frontend State",
  "reopened":               "Reopened",
  "archived":               "Archived",
  "unavailable":            "Unavailable",
};

export const COLLAB_THREAD_STATUS_DESCRIPTIONS: Record<CollaborationThreadStatus, string> = {
  "open":                   "Under discussion.",
  "needs-attention":        "Flagged for someone to look at.",
  "blocking-demonstration": "Marked as blocking in this frontend demonstration. This is workflow direction only and enforces nothing in production.",
  "resolved":               "Resolved in frontend state. This does not complete the transaction and is not proof that review occurred.",
  "reopened":               "Reopened after a previous resolution.",
  "archived":               "Kept for reference. Archiving is not deletion.",
  "unavailable":            "This thread is not available in the current context.",
};

export const VALID_THREAD_STATUSES: readonly CollaborationThreadStatus[] = [
  "open", "needs-attention", "blocking-demonstration", "resolved",
  "reopened", "archived", "unavailable",
];

export const ACTIVE_THREAD_STATUSES: readonly CollaborationThreadStatus[] = [
  "open", "needs-attention", "blocking-demonstration", "reopened",
];

export function parseThreadStatus(v: unknown): CollaborationThreadStatus | "all" {
  return VALID_THREAD_STATUSES.includes(v as CollaborationThreadStatus)
    ? (v as CollaborationThreadStatus) : "all";
}

// ── Review status ─────────────────────────────────────────────────────────────

export type CollaborationReviewStatus =
  | "draft" | "review-requested-demonstration" | "in-review"
  | "changes-requested" | "ready-for-preparation" | "resolved"
  | "archived" | "unavailable";

export const COLLAB_REVIEW_STATUS_LABELS: Record<CollaborationReviewStatus, string> = {
  "draft":                          "Draft",
  "review-requested-demonstration": "Review Requested in Demonstration",
  "in-review":                      "In Review",
  "changes-requested":              "Changes Requested",
  "ready-for-preparation":          "Ready for Preparation",
  "resolved":                       "Resolved in Frontend State",
  "archived":                       "Archived",
  "unavailable":                    "Unavailable",
};

export const COLLAB_REVIEW_STATUS_DESCRIPTIONS: Record<CollaborationReviewStatus, string> = {
  "draft":                          "Being set up. No reviewer has been asked yet.",
  "review-requested-demonstration": "Review was requested in this frontend demonstration. No notification was delivered.",
  "in-review":                      "At least one reviewer has started.",
  "changes-requested":              "A reviewer asked for changes before preparation continues.",
  "ready-for-preparation":          "Internal reviewers indicated the document is ready to prepare. This is not participant approval and not legal approval.",
  "resolved":                       "Closed in frontend state.",
  "archived":                       "Kept for reference.",
  "unavailable":                    "This review is not available in the current context.",
};

export const VALID_REVIEW_STATUSES: readonly CollaborationReviewStatus[] = [
  "draft", "review-requested-demonstration", "in-review", "changes-requested",
  "ready-for-preparation", "resolved", "archived", "unavailable",
];

// ── Reviewer response ─────────────────────────────────────────────────────────

export type CollaborationReviewerStatus =
  | "not-started" | "in-review" | "changes-requested"
  | "ready-for-preparation" | "unavailable";

export const COLLAB_REVIEWER_STATUS_LABELS: Record<CollaborationReviewerStatus, string> = {
  "not-started":           "Not Started",
  "in-review":             "In Review",
  "changes-requested":     "Changes Requested",
  "ready-for-preparation": "Ready for Preparation",
  "unavailable":           "Unavailable",
};

// ── Categories ────────────────────────────────────────────────────────────────

export type CollaborationThreadCategory =
  | "general-discussion" | "content-question" | "participant-configuration"
  | "routing" | "authentication-direction" | "consent-direction"
  | "required-fields" | "template-use" | "folder-and-tag-organization"
  | "verification-direction" | "delivery-preparation" | "internal-review" | "other";

export const COLLAB_CATEGORY_LABELS: Record<CollaborationThreadCategory, string> = {
  "general-discussion":          "General Discussion",
  "content-question":            "Content Question",
  "participant-configuration":   "Participant Configuration",
  "routing":                     "Routing",
  "authentication-direction":    "Authentication Direction",
  "consent-direction":           "Consent Direction",
  "required-fields":             "Required Fields",
  "template-use":                "Template Use",
  "folder-and-tag-organization": "Folder and Tag Organization",
  "verification-direction":      "Verification Direction",
  "delivery-preparation":        "Delivery Preparation",
  "internal-review":             "Internal Review",
  "other":                       "Other",
};

export const VALID_CATEGORIES: readonly CollaborationThreadCategory[] =
  Object.keys(COLLAB_CATEGORY_LABELS) as CollaborationThreadCategory[];

/** Categories are organizational only. They imply no legal finding and grant no access. */
export const CATEGORY_NOTICE =
  "Categories organize discussion. They do not imply a legal finding and do not grant access.";

// ── Priority ──────────────────────────────────────────────────────────────────

export type CollaborationThreadPriority = "normal" | "attention" | "high-attention";

export const COLLAB_PRIORITY_LABELS: Record<CollaborationThreadPriority, string> = {
  "normal":         "Normal",
  "attention":      "Needs Attention",
  "high-attention": "High Attention",
};

export const VALID_PRIORITIES: readonly CollaborationThreadPriority[] =
  ["normal", "attention", "high-attention"];

// ── Anchors ───────────────────────────────────────────────────────────────────

export type CollaborationAnchorType =
  | "document" | "page-direction" | "template-field" | "participant-role"
  | "routing-stage" | "transaction-setting" | "verification-summary"
  | "folder" | "tag" | "bulk-send-review" | "preparation-step";

export const COLLAB_ANCHOR_TYPE_LABELS: Record<CollaborationAnchorType, string> = {
  "document":             "Document",
  "page-direction":       "Page",
  "template-field":       "Template Field",
  "participant-role":     "Participant Role",
  "routing-stage":        "Routing Stage",
  "transaction-setting":  "Transaction Setting",
  "verification-summary": "Verification",
  "folder":               "Folder",
  "tag":                  "Tag",
  "bulk-send-review":     "Bulk Send Review",
  "preparation-step":     "Preparation Step",
};

export const VALID_ANCHOR_TYPES: readonly CollaborationAnchorType[] =
  Object.keys(COLLAB_ANCHOR_TYPE_LABELS) as CollaborationAnchorType[];

export type CollaborationAnchorAvailability = "available" | "stale" | "restricted" | "unavailable";

export const ANCHOR_AVAILABILITY_LABELS: Record<CollaborationAnchorAvailability, string> = {
  available:   "Available",
  stale:       "No longer available",
  restricted:  "Restricted",
  unavailable: "Unavailable",
};

/**
 * A reference, never an annotation. Contains NO PDF text, document body, signature or
 * initials representation, recipient field value, authentication or consent evidence,
 * IP address, device information, access token, or Evidence payload.
 */
export interface CollaborationAnchor {
  id:    CollaborationAnchorId;
  type:  CollaborationAnchorType;
  /** Opaque resource ID — a field ID, folder ID, stage ID. Never a value. */
  resourceId: string | null;
  /** Safe display label only. */
  label: string;
  /** Demonstration page number for page anchors. Never modifies the PDF. */
  pageDirection: number | null;
  availability:  CollaborationAnchorAvailability;
  /** Validated internal destination, or null when the anchor is stale. */
  destination:   string | null;
  unavailableReason: string | null;
}

// ── Comment ───────────────────────────────────────────────────────────────────

export type CollaborationCommentStatus = "active" | "edited" | "removed-in-demonstration";

export const COMMENT_STATUS_LABELS: Record<CollaborationCommentStatus, string> = {
  "active":                   "Posted",
  "edited":                   "Edited in frontend state",
  "removed-in-demonstration": "Removed from demonstration",
};

export interface CollaborationCommentAuthor {
  memberId:    string;
  displayName: string;
  /** Safe role label such as "Owner" or "Reviewer". Never a permission dump. */
  roleLabel:   string;
  /** True when the viewer may not see who this is; displayName is then redacted. */
  redacted:    boolean;
}

export interface CollaborationComment {
  id:        CollaborationCommentId;
  threadId:  CollaborationThreadId;
  author:    CollaborationCommentAuthor;
  /** Plain text. Never rendered as markup. */
  body:      string;
  status:    CollaborationCommentStatus;
  createdAtDemonstration: string;
  editedAtDemonstration:  string | null;
  /** Member IDs mentioned. Resolved to safe labels at render time. */
  mentionedMemberIds: string[];
  /** True when the current viewer authored it — drives edit/remove availability. */
  authoredByCurrentUser: boolean;
}

// ── Mention ───────────────────────────────────────────────────────────────────

export type CollaborationMentionStatus = "unviewed" | "viewed" | "unavailable";

export const MENTION_STATUS_LABELS: Record<CollaborationMentionStatus, string> = {
  unviewed:    "New",
  viewed:      "Viewed",
  unavailable: "Unavailable",
};

export interface CollaborationMentionTarget {
  memberId:    string;
  displayName: string;
  roleLabel:   string;
  teamName:    string | null;
  /** Why this member may be mentioned — surfaced in the picker. */
  accessReason: string;
}

export interface CollaborationMentionEligibility {
  eligible:  CollaborationMentionTarget[];
  /**
   * Count only — never names. Revealing who exists but is inaccessible would
   * itself leak Workspace membership.
   */
  excludedCount: number;
  notice:    string;
}

export interface CollaborationMention {
  id:          CollaborationMentionId;
  threadId:    CollaborationThreadId;
  commentId:   CollaborationCommentId;
  documentId:  string;
  /** Safe document label. Redacted when the destination is no longer accessible. */
  documentLabel: string;
  threadTitle: string;
  mentionedByDisplayName: string;
  visibility:  CollaborationVisibility;
  status:      CollaborationMentionStatus;
  createdAtDemonstration: string;
  /** Validated internal destination, or null when unavailable. */
  destination: string | null;
  unavailableReason: string | null;
}

// ── Resolution ────────────────────────────────────────────────────────────────

export interface CollaborationResolution {
  summary:     string;
  resolvedByDisplayName: string;
  resolvedAtDemonstration: string;
  /** Optional related preparation step or setting. */
  relatedDestination: string | null;
  relatedLabel: string | null;
}

// ── Thread ────────────────────────────────────────────────────────────────────

export interface CollaborationThread {
  id:          CollaborationThreadId;
  documentId:  string;
  workspaceId: string;
  teamId:      string | null;
  teamName:    string | null;

  title:       string;
  category:    CollaborationThreadCategory;
  visibility:  CollaborationVisibility;
  priority:    CollaborationThreadPriority;
  status:      CollaborationThreadStatus;

  anchor:      CollaborationAnchor;

  /** Owning author. Personal Draft Notes are scoped to this member alone. */
  createdByMemberId: string;
  createdByDisplayName: string;

  comments:    CollaborationComment[];
  replyCount:  number;

  /** Set only when blocking; explains why, and by whom. */
  blockingReason: string | null;
  blockingSetByDisplayName: string | null;

  resolution:  CollaborationResolution | null;
  /** Kept when a thread is reopened, so prior resolution stays visible as history. */
  priorResolutions: CollaborationResolution[];

  reviewId:    CollaborationReviewId | null;
  assignedReviewerMemberIds: string[];

  createdAtDemonstration: string;
  updatedAtDemonstration: string;

  /** Always true. Never persisted, never delivered, never an audit record. */
  demonstrationOnly: true;
}

export interface CollaborationThreadSummary {
  id:         CollaborationThreadId;
  documentId: string;
  documentLabel: string;
  title:      string;
  category:   CollaborationThreadCategory;
  visibility: CollaborationVisibility;
  priority:   CollaborationThreadPriority;
  status:     CollaborationThreadStatus;
  anchorLabel: string;
  anchorType:  CollaborationAnchorType;
  replyCount:  number;
  mentionsCurrentUser: boolean;
  updatedAtDemonstration: string;
  /** True when the viewer may see only that a thread exists, not its content. */
  restricted: boolean;
}

// ── Review ────────────────────────────────────────────────────────────────────

export interface CollaborationReviewer {
  memberId:    string;
  displayName: string;
  roleLabel:   string;
  status:      CollaborationReviewerStatus;
  respondedAtDemonstration: string | null;
  /** Reviewers must ALREADY have document access; assignment never grants it. */
  hasDocumentAccess: boolean;
  unavailableReason: string | null;
}

export interface CollaborationReview {
  id:          CollaborationReviewId;
  documentId:  string;
  workspaceId: string;
  teamId:      string | null;
  teamName:    string | null;

  name:        string;
  description: string | null;
  status:      CollaborationReviewStatus;

  reviewers:   CollaborationReviewer[];
  /** How many reviewers must reach Ready for Preparation. Never exceeds reviewer count. */
  requiredReviewerCount: number;
  dueDateDirection: string | null;

  includedCategories: CollaborationThreadCategory[];
  /** When true, blocking threads prevent Ready for Preparation unless overridden. */
  blockingPolicyEnabled: boolean;

  createdByDisplayName: string;
  createdAtDemonstration: string;
  updatedAtDemonstration: string;

  demonstrationOnly: true;
}

export interface CollaborationReviewSummary {
  reviewId:   CollaborationReviewId | null;
  reviewName: string | null;
  status:     CollaborationReviewStatus | null;
  openThreads:     number;
  blockingThreads: number;
  resolvedThreads: number;
  needsAttention:  number;
  participantVisibleThreads: number;
  myUnviewedMentions: number;
  assignedReviewerCount: number;
  respondedReviewerCount: number;
  requiredReviewerCount: number;
  missingReviewerResponses: number;
}

export const EMPTY_REVIEW_SUMMARY: CollaborationReviewSummary = {
  reviewId: null, reviewName: null, status: null,
  openThreads: 0, blockingThreads: 0, resolvedThreads: 0, needsAttention: 0,
  participantVisibleThreads: 0, myUnviewedMentions: 0,
  assignedReviewerCount: 0, respondedReviewerCount: 0,
  requiredReviewerCount: 0, missingReviewerResponses: 0,
};

// ── Activity ──────────────────────────────────────────────────────────────────

export type CollaborationActivityType =
  | "thread-created" | "comment-added" | "comment-edited" | "comment-removed"
  | "member-mentioned" | "reviewer-assigned" | "review-requested"
  | "thread-marked-blocking" | "thread-blocking-removed" | "thread-resolved"
  | "thread-reopened" | "visibility-changed" | "review-ready-for-preparation"
  | "review-archived";

export interface CollaborationActivityRecord {
  id:        CollaborationActivityId;
  documentId: string;
  threadId:  CollaborationThreadId | null;
  type:      CollaborationActivityType;
  timestamp: string;
  title:     string;
  /** Never contains comment text, Personal Draft Note text, or removed content. */
  description: string;
  actorDisplayName: string;
  /** Always true. Not immutable, not Evidence, not transaction Activity. */
  demonstrationOnly: true;
}

// ── Visibility resolution ─────────────────────────────────────────────────────

export type CollaborationVisibilityOutcome = "allowed" | "restricted" | "unavailable";

export interface CollaborationVisibilityResolution {
  outcome: CollaborationVisibilityOutcome;
  /** Safe user-facing sentence. Never names a restricted resource. */
  explanation: string;
  /** True when the viewer may know a thread exists but not read it. */
  maySeeExistence: boolean;
}

// ── Actions ───────────────────────────────────────────────────────────────────

export type CollaborationAction =
  | "view-thread" | "create-thread" | "create-comment" | "reply-to-thread"
  | "edit-own-comment" | "remove-own-comment-demonstration" | "moderate-comment"
  | "resolve-thread" | "reopen-thread" | "archive-thread" | "restore-thread"
  | "change-visibility" | "mark-blocking-demonstration" | "remove-blocking-demonstration"
  | "change-priority" | "change-category" | "mention-member"
  | "create-participant-visible-thread" | "create-personal-draft-note"
  | "manage-review" | "assign-reviewers" | "update-own-reviewer-response";

export interface CollaborationActionAvailability {
  action:    CollaborationAction;
  available: boolean;
  /** Always populated when unavailable — no control is silently disabled. */
  reason:    string | null;
}

// ── Permissions ───────────────────────────────────────────────────────────────
// Reuses existing platform permissions rather than adding a parallel system.

export interface CollaborationPermissionContext {
  canViewCollaboration:        boolean;
  canCreateInternalComments:   boolean;
  canReply:                    boolean;
  canEditOwnComments:          boolean;
  canRemoveOwnComments:        boolean;
  canModerateComments:         boolean;
  canMentionMembers:           boolean;
  canResolveThreads:           boolean;
  canReopenThreads:            boolean;
  canManagePriority:           boolean;
  canManageVisibility:         boolean;
  canMarkBlocking:             boolean;
  canManageReview:             boolean;
  canAssignReviewers:          boolean;
  canUpdateOwnReviewerResponse: boolean;
  /** Deliberately separate and rarely granted. */
  canCreateParticipantVisible: boolean;
  canViewCollaborationCenter:  boolean;
  canCreatePersonalDraftNotes: boolean;
}

export const NO_COLLABORATION_PERMISSIONS: CollaborationPermissionContext = {
  canViewCollaboration: false, canCreateInternalComments: false, canReply: false,
  canEditOwnComments: false, canRemoveOwnComments: false, canModerateComments: false,
  canMentionMembers: false, canResolveThreads: false, canReopenThreads: false,
  canManagePriority: false, canManageVisibility: false, canMarkBlocking: false,
  canManageReview: false, canAssignReviewers: false, canUpdateOwnReviewerResponse: false,
  canCreateParticipantVisible: false, canViewCollaborationCenter: false,
  canCreatePersonalDraftNotes: false,
};

/**
 * Maps existing platform permissions onto the C34 vocabulary in exactly one place.
 *
 * `manage_workspace` is deliberately NOT sufficient for private thread access:
 * being a Workspace Administrator never automatically grants access to a private
 * document thread or to anyone's Personal Draft Notes.
 */
export function buildCollaborationPermissionContext(input: {
  hasViewDocuments:    boolean;
  hasPrepareDocuments: boolean;
  hasManageTeam:       boolean;
  documentAccessible:  boolean;
  capabilityAvailable: boolean;
  /** Separate entitlement; false in every current fixture scenario. */
  participantVisibleEntitlement?: boolean;
}): CollaborationPermissionContext {
  const view = input.capabilityAvailable && input.hasViewDocuments && input.documentAccessible;
  const write = view && input.hasPrepareDocuments;
  return {
    canViewCollaboration:        view,
    canCreateInternalComments:   write,
    canReply:                    write,
    canEditOwnComments:          write,
    canRemoveOwnComments:        write,
    canModerateComments:         write && input.hasManageTeam,
    canMentionMembers:           write,
    canResolveThreads:           write,
    canReopenThreads:            write,
    canManagePriority:           write,
    canManageVisibility:         write,
    canMarkBlocking:             write && input.hasManageTeam,
    canManageReview:             write,
    canAssignReviewers:          write,
    canUpdateOwnReviewerResponse: view,
    canCreateParticipantVisible: write && input.participantVisibleEntitlement === true,
    canViewCollaborationCenter:  input.capabilityAvailable && input.hasViewDocuments,
    canCreatePersonalDraftNotes: view,
  };
}

// ── Query ─────────────────────────────────────────────────────────────────────

export type CollaborationSortField =
  | "recently-updated" | "oldest-open" | "priority" | "status" | "category" | "most-replies";

export const COLLAB_SORT_LABELS: Record<CollaborationSortField, string> = {
  "recently-updated": "Recently Updated",
  "oldest-open":      "Oldest Open",
  "priority":         "Priority",
  "status":           "Status",
  "category":         "Category",
  "most-replies":     "Most Replies",
};

export const VALID_COLLAB_SORTS: readonly CollaborationSortField[] =
  ["recently-updated", "oldest-open", "priority", "status", "category", "most-replies"];

export function parseCollaborationSort(v: unknown): CollaborationSortField {
  return VALID_COLLAB_SORTS.includes(v as CollaborationSortField)
    ? (v as CollaborationSortField) : "recently-updated";
}

export interface CollaborationQuery {
  q:          string;
  status:     CollaborationThreadStatus | "all";
  visibility: CollaborationVisibility | "all";
  category:   CollaborationThreadCategory | "all";
  priority:   CollaborationThreadPriority | "all";
  anchorType: CollaborationAnchorType | "all";
  reviewerId: string | "all";
  mentionedMe: boolean;
  sort:       CollaborationSortField;
}

export const DEFAULT_COLLABORATION_QUERY: CollaborationQuery = {
  q: "", status: "all", visibility: "all", category: "all", priority: "all",
  anchorType: "all", reviewerId: "all", mentionedMe: false, sort: "recently-updated",
};

// ── Center views ──────────────────────────────────────────────────────────────

export type CollaborationCenterView =
  | "overview" | "assigned" | "mentions" | "open" | "blocking"
  | "awaiting-my-review" | "resolved" | "owned" | "archived";

export const COLLAB_CENTER_VIEW_LABELS: Record<CollaborationCenterView, string> = {
  "overview":           "Overview",
  "assigned":           "Assigned to Me",
  "mentions":           "My Mentions",
  "open":               "Open Threads",
  "blocking":           "Blocking Threads",
  "awaiting-my-review": "Awaiting My Review",
  "resolved":           "Recently Resolved",
  "owned":              "Documents I Own",
  "archived":           "Archived",
};

export interface CollaborationOverview {
  assignedReviews:   number;
  unviewedMentions:  number;
  openThreads:       number;
  blockingThreads:   number;
  awaitingMyReview:  number;
  recentlyResolved:  number;
  ownedDocuments:    number;
}

// ── Errors and scenarios ──────────────────────────────────────────────────────

export type CollaborationError =
  | "thread-not-found" | "review-not-found" | "comment-not-found"
  | "restricted-thread" | "document-restricted" | "stale-anchor"
  | "participant-visible-unavailable" | "collaboration-unavailable"
  | "permission-denied" | "invalid-input" | "partial-error" | "full-error";

export type CollaborationScenario =
  | "standard-owner" | "assigned-reviewer" | "team-scoped-reviewer"
  | "workspace-collaboration-manager" | "participant-visible-author"
  | "personal-notes-user" | "read-only-auditor" | "restricted-member"
  | "stale-anchor" | "partial-failure" | "full-failure";

export const VALID_COLLABORATION_SCENARIOS: readonly CollaborationScenario[] = [
  "standard-owner", "assigned-reviewer", "team-scoped-reviewer",
  "workspace-collaboration-manager", "participant-visible-author",
  "personal-notes-user", "read-only-auditor", "restricted-member",
  "stale-anchor", "partial-failure", "full-failure",
];

// ── Honest frontend-only language ─────────────────────────────────────────────

export const COLLAB_DEMONSTRATION_NOTICE =
  "Collaboration uses fictional frontend demonstration state. No comment, mention, email, SMS " +
  "message, push notification, participant message, review record, or production audit entry is " +
  "delivered or persisted.";

export const COLLAB_SCOPE_NOTICE =
  "Collaboration does not grant access, act for participants, create Evidence, verify identity, " +
  "determine legal effect, or replace required professional review.";

export const COLLAB_ACTIVITY_NOTICE =
  "Collaboration history is fictional frontend demonstration state. It is not an immutable audit " +
  "trail, Evidence record, delivery receipt, or proof of review.";

export const COLLAB_PARTICIPANT_PREVIEW_NOTICE =
  "This preview does not deliver a comment, invitation, email, SMS message, push notification, " +
  "or recipient session.";

export const COLLAB_BLOCKING_NOTICE =
  "Blocking in Demonstration affects frontend preparation warnings only. It enforces nothing in " +
  "production and never blocks a participant action.";

export const COLLAB_REVIEW_NOTICE =
  "Internal review is not participant approval, legal approval, or Evidence. It records internal " +
  "readiness direction in frontend state only.";

export const COLLAB_LEGAL_NOTICE =
  "Legal effect depends on the document, the parties, the circumstances, and applicable " +
  "requirements. This does not constitute legal, compliance, security, employment, or " +
  "records-management advice.";

export const COLLAB_PERSONAL_NOTE_NOTICE =
  "Personal Draft Notes are visible only to you. They are not shown to Workspace Administrators, " +
  "reviewers, or participants, they cannot mention anyone, and they create no notification.";
