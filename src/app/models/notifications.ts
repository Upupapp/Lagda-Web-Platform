// In-App Notifications and Alerts Center — domain types.
// Command 28. Frontend demonstration only. No real delivery, persistence, or sync.

export type NotificationId = string & { readonly __brand: "NotificationId" };

export type NotificationCategory =
  | "my-actions"
  | "documents"
  | "workspace"
  | "security"
  | "billing"
  | "usage"
  | "integrations"
  | "system"
  | "promotional";

export type NotificationSeverity = "info" | "warning" | "critical" | "success";
export type NotificationPriority = "high" | "normal" | "low";

// "unread" | "read" | "dismissed" — dismissed items are hidden from most views
export type NotificationStatus = "unread" | "read" | "dismissed";

// Informational reference for the detail page. Never claims actual delivery.
export type NotificationDeliveryClass =
  | "in-app-only"
  | "email-and-in-app"
  | "sms-and-in-app"
  | "all-channels";

// ── View tabs ─────────────────────────────────────────────────────────────────

export type NotificationView =
  | "all"
  | "unread"
  | "action-required"
  | "documents"
  | "my-actions"
  | "workspace"
  | "security"
  | "billing-usage"
  | "integrations"
  | "system"
  | "dismissed";

export const NOTIFICATION_VIEW_LABELS: Record<NotificationView, string> = {
  "all":              "All",
  "unread":           "Unread",
  "action-required":  "Action Required",
  "documents":        "Documents",
  "my-actions":       "My Actions",
  "workspace":        "Workspace",
  "security":         "Security",
  "billing-usage":    "Billing & Usage",
  "integrations":     "Integrations",
  "system":           "System",
  "dismissed":        "Dismissed",
};

export type NotificationSort = "newest" | "oldest" | "priority";

export const NOTIFICATION_SORT_LABELS: Record<NotificationSort, string> = {
  newest:   "Newest first",
  oldest:   "Oldest first",
  priority: "Priority",
};

// ── Category metadata ─────────────────────────────────────────────────────────

export const NOTIFICATION_CATEGORY_LABELS: Record<NotificationCategory, string> = {
  "my-actions":   "My Actions",
  "documents":    "Documents",
  "workspace":    "Workspace",
  "security":     "Security",
  "billing":      "Billing",
  "usage":        "Usage",
  "integrations": "Integrations",
  "system":       "System",
  "promotional":  "Feature Update",
};

// ── Core record ───────────────────────────────────────────────────────────────

export interface NotificationRecord {
  readonly id: NotificationId;
  readonly demonstrationOnly: true;
  readonly category: NotificationCategory;
  readonly severity: NotificationSeverity;
  readonly priority: NotificationPriority;
  readonly title: string;
  readonly body: string;
  readonly detailBody: string | null;
  readonly createdAt: string;
  readonly workspaceId: string;
  readonly workspaceName: string;
  readonly deliveryClass: NotificationDeliveryClass;
  readonly isDismissible: boolean;
  readonly hasAction: boolean;
  readonly actionLabel: string | null;
  readonly actionPath: string | null;
  readonly whyReceivedReason: string;
  status: NotificationStatus;
}

// ── Query + result ────────────────────────────────────────────────────────────

export interface NotificationQuery {
  view: NotificationView;
  q: string;
  category: NotificationCategory | "";
  sort: NotificationSort;
}

export interface NotificationListResult {
  items: NotificationRecord[];
  totalCount: number;
  unreadCount: number;
  dismissedCount: number;
}

// ── Date group ────────────────────────────────────────────────────────────────

export type NotificationDateGroup = "today" | "yesterday" | "this-week" | "earlier";

export const NOTIFICATION_DATE_GROUP_LABELS: Record<NotificationDateGroup, string> = {
  "today":     "Today",
  "yesterday": "Yesterday",
  "this-week": "This Week",
  "earlier":   "Earlier",
};
