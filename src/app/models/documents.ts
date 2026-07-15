// Document workspace domain models for /app/documents.
// Do NOT add eNotary document types, notarial statuses, or notary participant roles.
// Burgundy (#67023B) is reserved for eNotary and must never appear here.
// Presentation mapping (colors, icons) lives in the component layer.

import type { TransactionStatus, ParticipantRole, ParticipantStatus } from "./index";

// ── Views ─────────────────────────────────────────────────────────────────────

export type DocumentView =
  | "all"
  | "needs-attention"
  | "drafts"
  | "in-progress"
  | "awaiting-my-action"
  | "completed"
  | "expiring"
  | "failed-delivery"
  | "archived";

export const VALID_DOCUMENT_VIEWS: readonly DocumentView[] = [
  "all", "needs-attention", "drafts", "in-progress",
  "awaiting-my-action", "completed", "expiring", "failed-delivery", "archived",
];

export const VIEW_LABELS: Record<DocumentView, string> = {
  "all":                "All Documents",
  "needs-attention":    "Needs Attention",
  "drafts":             "Drafts",
  "in-progress":        "In Progress",
  "awaiting-my-action": "Awaiting My Action",
  "completed":          "Completed",
  "expiring":           "Expiring",
  "failed-delivery":    "Failed Delivery",
  "archived":           "Archived",
};

export const ACTIVE_TRANSACTION_STATUSES: TransactionStatus[] = [
  "sent", "delivered", "viewed", "authentication-completed",
  "awaiting-signature", "awaiting-approval", "partially-completed",
];

// Statuses included by each view (undefined = computed differently, e.g. expiring or all)
export const VIEW_STATUS_SET: Partial<Record<DocumentView, TransactionStatus[]>> = {
  "needs-attention":    ["awaiting-signature", "partially-completed", "failed-delivery", "declined"],
  "drafts":             ["draft", "ready-to-send"],
  "in-progress":        ACTIVE_TRANSACTION_STATUSES,
  "awaiting-my-action": ["awaiting-signature"],
  "completed":          ["completed"],
  "failed-delivery":    ["failed-delivery"],
  "archived":           ["archived"],
};

// ── Sort ──────────────────────────────────────────────────────────────────────

export type DocumentSortField = "updated" | "created" | "title" | "status" | "expiry";
export type DocumentSortDirection = "asc" | "desc";

export const VALID_SORT_FIELDS: readonly DocumentSortField[] = ["updated", "created", "title", "status", "expiry"];

export const SORT_LABELS: Record<DocumentSortField, string> = {
  updated: "Last Updated",
  created: "Date Created",
  title:   "Title (A–Z)",
  status:  "Status",
  expiry:  "Expiry Date",
};

// ── Query state ───────────────────────────────────────────────────────────────

export interface DocumentListQuery {
  view:     DocumentView;
  q:        string;
  folderId: string | null;
  tagId:    string | null;
  sort:     DocumentSortField;
  dir:      DocumentSortDirection;
  page:     number;
}

export const DEFAULT_QUERY: DocumentListQuery = {
  view:     "all",
  q:        "",
  folderId: null,
  tagId:    null,
  sort:     "updated",
  dir:      "desc",
  page:     1,
};

// ── Folders and Tags ──────────────────────────────────────────────────────────

export interface DocumentFolder {
  id:            string;
  name:          string;
  documentCount: number;
  workspaceId:   string;
}

export interface DocumentTag {
  id:    string;
  name:  string;
  color: string; // Hex — never Burgundy (#67023B), which is reserved for eNotary
}

// ── Document list item ────────────────────────────────────────────────────────

export interface DocumentParticipantPreview {
  name:   string;
  role:   ParticipantRole;
  status: ParticipantStatus;
}

export interface DocumentListItem {
  id:                        string;
  title:                     string;
  status:                    TransactionStatus;
  createdAt:                 string;
  updatedAt:                 string;
  sentAt?:                   string;
  completedAt?:              string;
  expiresAt?:                string;
  participantCount:          number;
  completedParticipantCount: number;
  participants:              DocumentParticipantPreview[];
  ownerName:                 string;
  workspaceId:               string;
  folderIds:                 string[];
  tags:                      DocumentTag[];
  pageCount?:                number;
  verificationId?:           string;
  verificationStatus?:       "pending" | "available" | "viewed";
  isMyAction:                boolean;
  preArchiveStatus?:         TransactionStatus;
}

// ── Service result ────────────────────────────────────────────────────────────

export interface DocumentListResult {
  items:        DocumentListItem[];
  total:        number;
  page:         number;
  perPage:      number;
  hasNextPage:  boolean;
  hasPrevPage:  boolean;
  folderCounts: Record<string, number>;
  viewCounts:   Partial<Record<DocumentView, number>>;
}

// ── Demo scenarios ────────────────────────────────────────────────────────────

export type DocumentScenario = "standard" | "new-workspace" | "large-set" | "partial-error" | "full-error";

export const VALID_DOC_SCENARIOS: readonly DocumentScenario[] = [
  "standard", "new-workspace", "large-set", "partial-error", "full-error",
];

// ── Row actions ───────────────────────────────────────────────────────────────

export type DocumentActionId =
  | "view"
  | "continue-draft"
  | "rename-draft"
  | "view-activity"
  | "view-participants"
  | "view-evidence"
  | "archive"
  | "restore";

// ── Status display tones ──────────────────────────────────────────────────────
// Tones are semantic identifiers — resolved to hex values in components.
// No eNotary status types.

export type StatusTone = "neutral" | "info" | "warning" | "success" | "error" | "muted";

export const DOCUMENT_STATUS_TONE: Record<TransactionStatus, StatusTone> = {
  "draft":                    "neutral",
  "ready-to-send":            "info",
  "sent":                     "info",
  "delivered":                "info",
  "viewed":                   "info",
  "authentication-completed": "info",
  "awaiting-signature":       "warning",
  "awaiting-approval":        "warning",
  "partially-completed":      "warning",
  "completed":                "success",
  "declined":                 "error",
  "cancelled":                "muted",
  "expired":                  "error",
  "failed-delivery":          "error",
  "voided":                   "muted",
  "needs-attention":          "warning",
  "archived":                 "muted",
};

export const STATUS_TONE_CSS: Record<StatusTone, { bg: string; text: string; border: string }> = {
  neutral: { bg: "#F8FAFC", text: "#475569", border: "#E2E8F0" },
  info:    { bg: "#EFF6FF", text: "#1D4ED8", border: "#BFDBFE" },
  warning: { bg: "#FFFBEB", text: "#854D0E", border: "#FDE68A" },
  success: { bg: "#F0FDF4", text: "#166534", border: "#BBF7D0" },
  error:   { bg: "#FEF2F2", text: "#991B1B", border: "#FECACA" },
  muted:   { bg: "#F8FAFC", text: "#94A3B8", border: "#E2E8F0" },
};
