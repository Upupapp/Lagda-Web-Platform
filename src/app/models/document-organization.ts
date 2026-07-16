// Document Organization typed models — Command 31.
// Folders, Tags, Saved Views, Starred, Recently Viewed, Selection, Bulk Operations.
// All organization metadata is frontend-only demonstration state.
// Folders and tags do not grant document access, change ownership, or alter status.
// No eNotary folders, tags, or bulk actions. No Burgundy (#67023B).
// No dangerouslySetInnerHTML. No localStorage persistence.

import type { TransactionStatus } from "./index";

// ── Branded IDs ───────────────────────────────────────────────────────────────

export type OrgFolderId  = string & { readonly __brand: "OrgFolderId" };
export type OrgTagId     = string & { readonly __brand: "OrgTagId" };
export type OrgViewId    = string & { readonly __brand: "OrgViewId" };
export type OrgRecentId  = string & { readonly __brand: "OrgRecentId" };

// ── Folder scope and status ───────────────────────────────────────────────────

export type OrgFolderScope  = "personal" | "workspace";
export type OrgFolderStatus = "active" | "archived" | "unavailable" | "invalid";

export const VALID_FOLDER_SCOPES: readonly OrgFolderScope[] = ["personal", "workspace"];

export const FOLDER_SCOPE_LABELS: Record<OrgFolderScope, string> = {
  personal:  "Personal",
  workspace: "Workspace",
};

// ── Tag scope, status, style ──────────────────────────────────────────────────

export type OrgTagScope  = "workspace";
export type OrgTagStatus = "active" | "archived";

// Design-system style tokens — not arbitrary CSS colors.
// Tag color alone must never be the sole identifier.
export type OrgTagStyle =
  | "neutral"
  | "azure"
  | "navy"
  | "success"
  | "warning"
  | "error"
  | "gold"
  | "violet"
  | "teal"
  | "rose";

export const TAG_STYLE_COLORS: Record<OrgTagStyle, string> = {
  neutral: "#64748B",
  azure:   "#0078D4",
  navy:    "#07111F",
  success: "#16A34A",
  warning: "#D97706",
  error:   "#DC2626",
  gold:    "#C9960C",
  violet:  "#7C3AED",
  teal:    "#0E7490",
  rose:    "#9D174D",
};

export const TAG_STYLE_LABELS: Record<OrgTagStyle, string> = {
  neutral: "Neutral",
  azure:   "Azure",
  navy:    "Navy",
  success: "Green",
  warning: "Amber",
  error:   "Red",
  gold:    "Gold",
  violet:  "Violet",
  teal:    "Teal",
  rose:    "Rose",
};

export const VALID_TAG_STYLES: readonly OrgTagStyle[] = [
  "neutral", "azure", "navy", "success", "warning", "error", "gold", "violet", "teal", "rose",
];

// ── OrgFolder ─────────────────────────────────────────────────────────────────

export interface OrgFolder {
  readonly id:           OrgFolderId;
  readonly name:         string;
  readonly scope:        OrgFolderScope;
  readonly status:       OrgFolderStatus;
  readonly parentId:     OrgFolderId | null;
  readonly workspaceId:  string;
  readonly description?: string;
  readonly position:     number;
  readonly createdAt:    string;
  readonly updatedAt:    string;
  readonly documentCount:    number;
  readonly childCount:       number;
  readonly ownerId?:     string;
}

export interface OrgFolderCountSummary {
  readonly folderId:     OrgFolderId;
  readonly documentCount: number;
  readonly childCount:   number;
}

export type OrgFolderAction =
  | "open" | "create-child" | "rename" | "move" | "reorder"
  | "archive" | "restore" | "remove-demonstration";

export interface OrgFolderActionAvailability {
  readonly action:    OrgFolderAction;
  readonly available: boolean;
  readonly reason?:   string;
}

export interface OrgFolderMutation {
  readonly type: "create" | "rename" | "move" | "reorder" | "archive" | "restore" | "remove";
  readonly folderId: OrgFolderId;
  readonly timestamp: string;
}

// ── OrgTag ────────────────────────────────────────────────────────────────────

export interface OrgTag {
  readonly id:           OrgTagId;
  readonly name:         string;
  readonly style:        OrgTagStyle;
  readonly status:       OrgTagStatus;
  readonly scope:        OrgTagScope;
  readonly workspaceId:  string;
  readonly description?: string;
  readonly usageCount:   number;
  readonly createdAt:    string;
  readonly updatedAt:    string;
}

export type OrgTagAction =
  | "view-usage" | "rename" | "change-style"
  | "archive" | "restore" | "remove-demonstration";

export interface OrgTagActionAvailability {
  readonly action:    OrgTagAction;
  readonly available: boolean;
  readonly reason?:   string;
}

// ── Tag assignment ────────────────────────────────────────────────────────────

export type OrgTagAssignmentState = "all" | "some" | "none";

export interface OrgTagAssignment {
  readonly tagId:      OrgTagId;
  readonly tagName:    string;
  readonly style:      OrgTagStyle;
  readonly state:      OrgTagAssignmentState;
}

// ── Starred / Favorites ───────────────────────────────────────────────────────

export type OrgFavoriteState = "starred" | "unstarred";

export interface OrgFavoriteItem {
  readonly documentId: string;
  readonly starredAt:  string;
}

// ── Recently Viewed ───────────────────────────────────────────────────────────

export interface OrgRecentItem {
  readonly id:          OrgRecentId;
  readonly documentId:  string;
  readonly title:       string;
  readonly workspaceId: string;
  readonly viewedAt:    string;
}

export const MAX_RECENT_ITEMS = 20;

// ── Saved Views ───────────────────────────────────────────────────────────────

export type OrgViewStatus = "active" | "archived" | "stale";
export type OrgViewScope  = "personal";

export const VALID_VIEW_STATUSES: readonly OrgViewStatus[] = ["active", "archived", "stale"];

export interface OrgViewFilter {
  readonly statuses?:    readonly TransactionStatus[];
  readonly folderId?:    OrgFolderId | null;
  readonly tagIds?:      readonly OrgTagId[];
  readonly ownerId?:     string | null;
  readonly teamId?:      string | null;
  readonly templateId?:  string | null;
  readonly dateFrom?:    string | null;
  readonly dateTo?:      string | null;
  readonly q?:           string;
}

export type OrgViewSortField = "updated" | "created" | "title" | "status" | "expiry";
export type OrgViewSortDir   = "asc" | "desc";
export type OrgViewGrouping  = "none" | "status" | "folder" | "tag" | "owner";

export interface OrgViewDefinition {
  readonly filters:   OrgViewFilter;
  readonly sort:      OrgViewSortField;
  readonly sortDir:   OrgViewSortDir;
  readonly grouping:  OrgViewGrouping;
  readonly columns?:  readonly string[];
}

export interface OrgSavedView {
  readonly id:          OrgViewId;
  readonly name:        string;
  readonly scope:       OrgViewScope;
  readonly status:      OrgViewStatus;
  readonly isDefault:   boolean;
  readonly workspaceId: string;
  readonly ownerId:     string;
  readonly definition:  OrgViewDefinition;
  readonly createdAt:   string;
  readonly updatedAt:   string;
  readonly staleReasons?: readonly string[];
}

export type OrgViewAction =
  | "open" | "rename" | "duplicate" | "set-default"
  | "update-from-current" | "archive" | "restore" | "remove-demonstration";

export interface OrgViewActionAvailability {
  readonly action:    OrgViewAction;
  readonly available: boolean;
  readonly reason?:   string;
}

// ── Document selection ────────────────────────────────────────────────────────

export type OrgSelectionMode = "none" | "partial" | "all";

export interface OrgSelection {
  readonly ids:         ReadonlySet<string>;
  readonly mode:        OrgSelectionMode;
  readonly workspaceId: string;
}

// ── Bulk eligibility ──────────────────────────────────────────────────────────

export type OrgBulkActionType =
  | "bulk-move-folder"
  | "bulk-add-tags"
  | "bulk-remove-tags"
  | "bulk-star"
  | "bulk-unstar"
  | "bulk-archive"
  | "bulk-restore"
  | "preview-bulk-export"
  | "preview-bulk-reminders"
  | "preview-bulk-cancel"
  | "preview-bulk-void"
  | "preview-bulk-ownership-transfer"
  | "preview-bulk-retention";

export const VALID_BULK_ACTIONS: readonly OrgBulkActionType[] = [
  "bulk-move-folder", "bulk-add-tags", "bulk-remove-tags",
  "bulk-star", "bulk-unstar", "bulk-archive", "bulk-restore",
  "preview-bulk-export", "preview-bulk-reminders", "preview-bulk-cancel",
  "preview-bulk-void", "preview-bulk-ownership-transfer", "preview-bulk-retention",
];

export const BULK_ACTION_LABELS: Record<OrgBulkActionType, string> = {
  "bulk-move-folder":              "Move to Folder",
  "bulk-add-tags":                 "Add Tags",
  "bulk-remove-tags":              "Remove Tags",
  "bulk-star":                     "Star",
  "bulk-unstar":                   "Unstar",
  "bulk-archive":                  "Archive",
  "bulk-restore":                  "Restore",
  "preview-bulk-export":           "Preview Export",
  "preview-bulk-reminders":        "Preview Reminders",
  "preview-bulk-cancel":           "Preview Cancellation",
  "preview-bulk-void":             "Preview Void Direction",
  "preview-bulk-ownership-transfer": "Preview Ownership Transfer",
  "preview-bulk-retention":        "Preview Retention",
};

export type OrgBulkEligibilityReason =
  | "eligible"
  | "ineligible-permission"
  | "ineligible-status"
  | "ineligible-workspace"
  | "ineligible-team"
  | "ineligible-ownership"
  | "ineligible-feature"
  | "archived-only"
  | "active-only"
  | "preview-only"
  | "unavailable"
  | "stale";

export const BULK_ELIGIBILITY_LABELS: Record<OrgBulkEligibilityReason, string> = {
  "eligible":               "Eligible",
  "ineligible-permission":  "Insufficient permission",
  "ineligible-status":      "Document status prevents this action",
  "ineligible-workspace":   "Workspace restriction",
  "ineligible-team":        "Team restriction",
  "ineligible-ownership":   "Ownership restriction",
  "ineligible-feature":     "Feature not available on current plan",
  "archived-only":          "Only archived documents can be restored",
  "active-only":            "Only active documents can be archived",
  "preview-only":           "Preview only — no mutation occurs",
  "unavailable":            "Action temporarily unavailable",
  "stale":                  "Organization reference is stale",
};

export interface OrgBulkEligibilityResult {
  readonly documentId: string;
  readonly reason:     OrgBulkEligibilityReason;
}

export interface OrgBulkEligibility {
  readonly action:     OrgBulkActionType;
  readonly eligible:   readonly OrgBulkEligibilityResult[];
  readonly ineligible: readonly OrgBulkEligibilityResult[];
  readonly previewOnly: boolean;
}

// ── Bulk action previews ──────────────────────────────────────────────────────

export interface OrgExportPreview {
  readonly eligibleCount:  number;
  readonly ineligibleCount: number;
  readonly proposedContents: readonly string[];
  readonly privacyExclusions: readonly string[];
  readonly notice: "This preview does not generate, download, or deliver any files.";
  readonly demonstrationOnly: true;
}

export interface OrgReminderPreview {
  readonly eligibleCount:    number;
  readonly ineligibleCount:  number;
  readonly ineligibleReasons: readonly string[];
  readonly notice: "No reminder, email, SMS message, or notification is sent from this frontend preview.";
  readonly demonstrationOnly: true;
}

export interface OrgCancellationPreview {
  readonly eligibleCount:    number;
  readonly ineligibleCount:  number;
  readonly ineligibleReasons: readonly string[];
  readonly consequenceSummary: string;
  readonly notice: "This frontend preview does not cancel, void, notify, or modify any transaction.";
  readonly demonstrationOnly: true;
}

export interface OrgOwnershipTransferPreview {
  readonly eligibleCount:    number;
  readonly ineligibleCount:  number;
  readonly ineligibleReasons: readonly string[];
  readonly notice: "This preview does not transfer ownership or change document access.";
  readonly demonstrationOnly: true;
}

export interface OrgRetentionPreview {
  readonly eligibleCount:    number;
  readonly ineligibleCount:  number;
  readonly policyNotice: string;
  readonly notice: "This preview does not enforce retention, create legal holds, or delete records.";
  readonly demonstrationOnly: true;
}

// ── Bulk mutation inputs ──────────────────────────────────────────────────────

export interface OrgMoveInput {
  readonly documentIds: readonly string[];
  readonly folderId:    OrgFolderId;
}

export interface OrgTagMutationInput {
  readonly documentIds: readonly string[];
  readonly tagIds:      readonly OrgTagId[];
  readonly operation:   "add" | "remove";
}

export interface OrgFavoriteInput {
  readonly documentIds: readonly string[];
  readonly operation:   "star" | "unstar";
}

export interface OrgArchiveInput {
  readonly documentIds: readonly string[];
  readonly operation:   "archive" | "restore";
}

// ── Bulk action results ───────────────────────────────────────────────────────

export interface OrgBulkActionResult {
  readonly action:      OrgBulkActionType;
  readonly succeeded:   readonly string[];
  readonly failed:      readonly string[];
  readonly demonstrationOnly: true;
  readonly notice:      string;
}

// ── Folder / tag mutation inputs ──────────────────────────────────────────────

export interface OrgCreateFolderInput {
  readonly name:        string;
  readonly scope:       OrgFolderScope;
  readonly parentId?:   OrgFolderId | null;
  readonly description?: string;
  readonly workspaceId: string;
  readonly ownerId?:    string;
}

export interface OrgRenameFolderInput {
  readonly name: string;
}

export interface OrgMoveFolderInput {
  readonly parentId: OrgFolderId | null;
}

export interface OrgCreateTagInput {
  readonly name:        string;
  readonly style:       OrgTagStyle;
  readonly workspaceId: string;
  readonly description?: string;
}

export interface OrgRenameTagInput {
  readonly name: string;
}

export interface OrgUpdateTagStyleInput {
  readonly style: OrgTagStyle;
}

export interface OrgCreateViewInput {
  readonly name:        string;
  readonly scope:       OrgViewScope;
  readonly definition:  OrgViewDefinition;
  readonly isDefault:   boolean;
  readonly workspaceId: string;
  readonly ownerId:     string;
}

export interface OrgUpdateViewInput {
  readonly name?:       string;
  readonly definition?: OrgViewDefinition;
  readonly isDefault?:  boolean;
}

// ── Organization query and filter ─────────────────────────────────────────────

export interface OrgQuery {
  readonly q?:        string;
  readonly scope?:    OrgFolderScope;
  readonly status?:   OrgFolderStatus | OrgTagStatus | OrgViewStatus;
  readonly page?:     number;
  readonly perPage?:  number;
}

// ── Organization errors ───────────────────────────────────────────────────────

export type OrgErrorCode =
  | "folder-not-found"
  | "tag-not-found"
  | "view-not-found"
  | "max-depth-exceeded"
  | "cycle-detected"
  | "cross-workspace-parent"
  | "permission-denied"
  | "workspace-mismatch"
  | "invalid-scope"
  | "duplicate-name"
  | "service-unavailable";

export interface OrgError {
  readonly code:    OrgErrorCode;
  readonly message: string;
}

export type OrgResult<T> =
  | { readonly ok: true;  readonly data: T }
  | { readonly ok: false; readonly error: OrgError };

// ── Folder hierarchy constants ────────────────────────────────────────────────

export const MAX_FOLDER_DEPTH = 3;

// ── Organization scenario ─────────────────────────────────────────────────────

export type OrgScenario =
  | "standard"
  | "new-workspace"
  | "personal-only"
  | "workspace-organizer"
  | "team-scoped"
  | "high-volume"
  | "archived-organization"
  | "stale-saved-view"
  | "mixed-bulk-selection"
  | "partial-failure"
  | "full-failure";

export const VALID_ORG_SCENARIOS: readonly OrgScenario[] = [
  "standard", "new-workspace", "personal-only", "workspace-organizer",
  "team-scoped", "high-volume", "archived-organization", "stale-saved-view",
  "mixed-bulk-selection", "partial-failure", "full-failure",
];

// ── Extended document views (C31 adds starred + recently-viewed) ──────────────

export type OrgDocumentView =
  | "all"
  | "owned-by-me"
  | "shared-with-me"
  | "awaiting-others"
  | "completed"
  | "drafts"
  | "archived"
  | "starred"
  | "recently-viewed";

export const VALID_ORG_DOCUMENT_VIEWS: readonly OrgDocumentView[] = [
  "all", "owned-by-me", "shared-with-me", "awaiting-others",
  "completed", "drafts", "archived", "starred", "recently-viewed",
];

export const ORG_VIEW_LABELS: Record<OrgDocumentView, string> = {
  "all":             "All Documents",
  "owned-by-me":     "Owned by Me",
  "shared-with-me":  "Shared with Me",
  "awaiting-others": "Awaiting Others",
  "completed":       "Completed",
  "drafts":          "Drafts",
  "archived":        "Archived",
  "starred":         "Starred",
  "recently-viewed": "Recently Viewed",
};
