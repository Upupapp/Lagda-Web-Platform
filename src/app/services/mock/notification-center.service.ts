// In-App Notifications and Alerts Center — mock service.
// Command 28. Frontend demonstration only.
// All state is module-level in-memory. No localStorage, no backend, no real delivery.

import type {
  NotificationRecord,
  NotificationId,
  NotificationCategory,
  NotificationQuery,
  NotificationListResult,
  NotificationView,
  NotificationSort,
} from "../../models/notifications";
import { ok, fail } from "../../models/errors";
import type { ServiceResult } from "../../models/errors";
import { isCapabilityInActiveProfile } from "../../config/capability-resolver";
import { registerSessionCleanup } from "../session-lifecycle";

// ── Fixtures ──────────────────────────────────────────────────────────────────

const FIXTURES: NotificationRecord[] = [
  {
    id: "notif-action-sign-001" as NotificationId,
    demonstrationOnly: true,
    category: "my-actions",
    severity: "critical",
    priority: "high",
    title: "Signature required: Service Agreement",
    body: "You have been asked to sign the Service Agreement — Mabini Business Services. This document requires your signature today.",
    detailBody: "The sender, Northbridge Legal, has assigned you as the signing party for this agreement. You must sign all required fields before the deadline. Use the Sign Document button below to open the signing environment. Your saved signature representations are available via the Signature Library inside the signing environment.",
    createdAt: "2026-07-16T09:00:00Z",
    workspaceId: "ws_northbridge_001",
    workspaceName: "Northbridge Legal",
    deliveryClass: "email-and-in-app",
    isDismissible: false,
    hasAction: true,
    actionLabel: "Go to Signing Assignment",
    actionPath: "/app/inbox/inbox-service-agreement-001",
    whyReceivedReason: "You received this notification because you have been designated as a signing participant for this document request. My Actions notifications are sent when a document request assigned to you becomes active and requires your input.",
    status: "unread",
  },
  {
    id: "notif-action-approve-002" as NotificationId,
    demonstrationOnly: true,
    category: "my-actions",
    severity: "warning",
    priority: "high",
    title: "Approval requested: Internal Policy Acknowledgment",
    body: "You have been asked to approve the Internal Policy Acknowledgment document. Please review and respond at your earliest convenience.",
    detailBody: "Ana Santos (Northbridge Legal) has assigned you as an approver for this policy acknowledgment. As approver, you are expected to review the document content and provide an explicit approval decision. Use the Go to Signing Assignment button to open your inbox assignment.",
    createdAt: "2026-07-16T08:30:00Z",
    workspaceId: "ws_northbridge_001",
    workspaceName: "Northbridge Legal",
    deliveryClass: "email-and-in-app",
    isDismissible: false,
    hasAction: true,
    actionLabel: "Go to Signing Assignment",
    actionPath: "/app/inbox/inbox-policy-acknowledgment-004",
    whyReceivedReason: "You received this notification because you have been designated as an approver for this document request. Approval notifications are triggered when a document becomes available for your review and response.",
    status: "unread",
  },
  {
    id: "notif-sec-device-001" as NotificationId,
    demonstrationOnly: true,
    category: "security",
    severity: "warning",
    priority: "high",
    title: "New sign-in from unfamiliar device",
    body: "A sign-in to your LAGDA account was detected from Manila, Philippines using a device not previously associated with your account.",
    detailBody: "If this was you, no further action is needed. If you do not recognize this sign-in, we recommend reviewing your active sessions and revoking any sessions you do not recognize. You may also consider enabling two-factor authentication if it is not already active on your account.",
    createdAt: "2026-07-15T22:30:00Z",
    workspaceId: "ws_northbridge_001",
    workspaceName: "Northbridge Legal",
    deliveryClass: "all-channels",
    isDismissible: false,
    hasAction: true,
    actionLabel: "Review Active Sessions",
    actionPath: "/app/settings/security/sessions",
    whyReceivedReason: "You received this notification because LAGDA detected a sign-in event from a device or location that has not been previously associated with your account. Security notifications for new device sign-ins are always sent to keep your account safe.",
    status: "unread",
  },
  {
    id: "notif-billing-001" as NotificationId,
    demonstrationOnly: true,
    category: "billing",
    severity: "warning",
    priority: "high",
    title: "Payment method expiring next month",
    body: "The credit card ending in 4242 on your Northbridge Legal account is expiring next month. Update your payment method to avoid service interruption.",
    detailBody: "Your current payment method (Visa ending in 4242) is scheduled to expire. If not updated before the next billing cycle, your subscription renewal may fail. Navigate to Billing Settings to add or update your payment method.",
    createdAt: "2026-07-15T14:00:00Z",
    workspaceId: "ws_northbridge_001",
    workspaceName: "Northbridge Legal",
    deliveryClass: "email-and-in-app",
    isDismissible: true,
    hasAction: true,
    actionLabel: "Update Payment Method",
    actionPath: "/app/settings/billing",
    whyReceivedReason: "You received this notification because you are the Billing Administrator for this workspace and your payment method is approaching its expiry date. Billing notifications are sent to Billing Administrators and Owners.",
    status: "unread",
  },
  {
    id: "notif-int-001" as NotificationId,
    demonstrationOnly: true,
    category: "integrations",
    severity: "info",
    priority: "normal",
    // Rewritten for frontend-only honesty. The previous copy claimed webhook events
    // "were delivered successfully" and that endpoints "have been receiving and
    // acknowledging" events — no webhook is configured, sent, received, or
    // acknowledged anywhere in this frontend.
    title: "Integration summary (demonstration)",
    body: "This is a sample integration summary in the frontend demonstration. No webhook endpoint is configured, and no event has been sent, delivered, or acknowledged.",
    detailBody: "Integrations are shown as product direction only. This frontend connects to no external service, registers no endpoint, and transmits no document lifecycle event. Nothing here reflects a real integration state.",
    createdAt: "2026-07-15T16:00:00Z",
    workspaceId: "ws_northbridge_001",
    workspaceName: "Northbridge Legal",
    deliveryClass: "in-app-only",
    isDismissible: true,
    hasAction: true,
    actionLabel: "View Integrations",
    actionPath: "/app/settings/integrations",
    whyReceivedReason: "This sample notification illustrates what an integration summary would look like. It does not reflect any configured integration.",
    status: "read",
  },
  {
    id: "notif-doc-expiring-002" as NotificationId,
    demonstrationOnly: true,
    category: "documents",
    severity: "warning",
    priority: "high",
    title: "Document expiring in 12 days",
    body: "Legal Services Agreement — Mabini Business Services expires on July 27, 2026. No signatures have been collected yet.",
    detailBody: "This document was sent for signature on July 13, 2026 and will expire automatically if not completed by July 27, 2026. Consider sending a reminder to the signing parties or extending the expiry date before it lapses.",
    createdAt: "2026-07-14T08:00:00Z",
    workspaceId: "ws_northbridge_001",
    workspaceName: "Northbridge Legal",
    deliveryClass: "email-and-in-app",
    isDismissible: true,
    hasAction: true,
    actionLabel: "View Document",
    actionPath: "/app/documents/txn_005",
    whyReceivedReason: "You received this notification because you are the sender of this document and it is approaching its configured expiry date without all required signatures collected. Document expiry notifications are sent to document senders and workspace administrators.",
    status: "unread",
  },
  {
    id: "notif-ws-member-001" as NotificationId,
    demonstrationOnly: true,
    category: "workspace",
    severity: "info",
    priority: "normal",
    title: "Ana Santos joined your workspace",
    body: "Ana Santos has accepted the invitation and joined Northbridge Legal as a Member.",
    detailBody: "Ana Santos joined after accepting the workspace invitation sent to a.santos@northbridgelegal.ph. They have been assigned the Member role. You can review or modify their role and permissions from the Team Management section.",
    createdAt: "2026-07-13T11:20:00Z",
    workspaceId: "ws_northbridge_001",
    workspaceName: "Northbridge Legal",
    deliveryClass: "email-and-in-app",
    isDismissible: true,
    hasAction: false,
    actionLabel: null,
    actionPath: null,
    whyReceivedReason: "You received this notification because you are a Workspace Administrator for Northbridge Legal and a member accepted an active invitation. Workspace member activity notifications are sent to Administrators and Owners.",
    status: "read",
  },
  {
    id: "notif-usage-001" as NotificationId,
    demonstrationOnly: true,
    category: "usage",
    severity: "warning",
    priority: "normal",
    title: "80% of monthly sending requests used",
    body: "Northbridge Legal has used 80 of 100 sending requests this month. Upgrade your plan to increase your limit.",
    detailBody: "Your workspace is on the Business plan with a limit of 100 sending requests per month. With 80 used, you have 20 remaining for this billing period. If you reach your limit before the month ends, you will not be able to send new document requests until the next billing cycle or until you upgrade your plan.",
    createdAt: "2026-07-12T09:00:00Z",
    workspaceId: "ws_northbridge_001",
    workspaceName: "Northbridge Legal",
    deliveryClass: "email-and-in-app",
    isDismissible: true,
    hasAction: true,
    actionLabel: "View Usage",
    actionPath: "/app/settings/usage",
    whyReceivedReason: "You received this notification because your workspace has consumed 80% of its monthly sending request allowance. Usage threshold notifications are sent to Owners and Billing Administrators at 80% and 100% consumption.",
    status: "read",
  },
  {
    id: "notif-doc-signed-003" as NotificationId,
    demonstrationOnly: true,
    category: "documents",
    severity: "info",
    priority: "normal",
    title: "Maria Reyes signed the Retainer Agreement",
    body: "Maria Reyes (Mabini Business Services) has signed Retainer Agreement — Mabini Business Services. 1 of 2 participants have completed signing.",
    detailBody: "Maria Reyes signed all assigned fields on July 10, 2026 at 9:14 AM. The document is now awaiting signature from the remaining participant. Once all parties have signed, you will receive a completion notification.",
    createdAt: "2026-07-10T09:14:00Z",
    workspaceId: "ws_northbridge_001",
    workspaceName: "Northbridge Legal",
    deliveryClass: "email-and-in-app",
    isDismissible: true,
    hasAction: true,
    actionLabel: "View Document",
    actionPath: "/app/documents/txn_001",
    whyReceivedReason: "You received this notification because you are the sender of this document request and a participant has completed their assigned signing action. Participant activity notifications are sent to the document sender.",
    status: "read",
  },
  {
    id: "notif-ws-settings-002" as NotificationId,
    demonstrationOnly: true,
    category: "workspace",
    severity: "info",
    priority: "low",
    title: "Workspace display name updated",
    body: "The display name for your workspace was updated by an Administrator.",
    detailBody: "A workspace Administrator made a change to the workspace display settings. If you did not authorize this change, review the workspace activity log or contact your workspace Owner.",
    createdAt: "2026-07-10T11:00:00Z",
    workspaceId: "ws_northbridge_001",
    workspaceName: "Northbridge Legal",
    deliveryClass: "in-app-only",
    isDismissible: true,
    hasAction: false,
    actionLabel: null,
    actionPath: null,
    whyReceivedReason: "You received this notification because a change was made to workspace settings and you have workspace change notifications enabled. Workspace setting change notifications are sent to workspace Owners.",
    status: "read",
  },
  {
    id: "notif-sec-email-002" as NotificationId,
    demonstrationOnly: true,
    category: "security",
    severity: "success",
    priority: "normal",
    title: "Email address verified",
    body: "Your email address has been successfully verified. Your LAGDA account is now fully active.",
    detailBody: "Email verification is complete. Your account is confirmed and you have full access to all LAGDA features. If you did not request email verification, contact LAGDA support immediately.",
    createdAt: "2026-07-11T10:00:00Z",
    workspaceId: "ws_northbridge_001",
    workspaceName: "Northbridge Legal",
    deliveryClass: "in-app-only",
    isDismissible: true,
    hasAction: false,
    actionLabel: null,
    actionPath: null,
    whyReceivedReason: "You received this notification because your email address verification was recently completed. Account verification notifications are sent once when email confirmation is processed.",
    status: "read",
  },
  {
    id: "notif-doc-completed-001" as NotificationId,
    demonstrationOnly: true,
    category: "documents",
    severity: "success",
    priority: "normal",
    title: "Document completed: NDA fully signed",
    body: "NDA — Harborline Properties × Northbridge Legal has been signed by all 3 participants and is now complete.",
    detailBody: "All three participants — Jose dela Cruz, Ricardo Buenaventura, and the Northbridge Legal signatory — have completed their assigned signing fields. The document has been finalized and a complete audit record is available.",
    createdAt: "2026-07-09T14:22:00Z",
    workspaceId: "ws_northbridge_001",
    workspaceName: "Northbridge Legal",
    deliveryClass: "email-and-in-app",
    isDismissible: true,
    hasAction: true,
    actionLabel: "View Completed Document",
    actionPath: "/app/documents/txn_002",
    whyReceivedReason: "You received this notification because you are the sender of this document and all participants have completed their assigned actions. Document completion notifications are sent to the document sender.",
    status: "read",
  },
  {
    id: "notif-system-001" as NotificationId,
    demonstrationOnly: true,
    category: "system",
    severity: "info",
    priority: "low",
    title: "Planned maintenance: July 20 at 2:00 AM PHT",
    body: "LAGDA will undergo scheduled maintenance on July 20, 2026 from 2:00 AM to 4:00 AM Philippine Standard Time. Service may be briefly unavailable.",
    detailBody: "This maintenance window is scheduled to improve system performance and apply infrastructure updates. During this window, document sending, signing, and authentication may be temporarily unavailable. Documents already in progress will not be affected. Please plan your document workflows accordingly.",
    createdAt: "2026-07-14T07:00:00Z",
    workspaceId: "ws_northbridge_001",
    workspaceName: "Northbridge Legal",
    deliveryClass: "all-channels",
    isDismissible: true,
    hasAction: false,
    actionLabel: null,
    actionPath: null,
    whyReceivedReason: "You received this notification because you are an active LAGDA account holder. Platform maintenance announcements are sent to all account holders to allow advance planning.",
    status: "read",
  },
  {
    id: "notif-doc-expired-004" as NotificationId,
    demonstrationOnly: true,
    category: "documents",
    severity: "warning",
    priority: "normal",
    title: "Document expired without completion",
    body: "Supplier Agreement — Harborline Properties expired on June 15, 2026. Only 1 of 2 participants completed signing before expiry.",
    detailBody: "This document reached its expiry date without all required signatures. It is no longer active. If you still need signatures on this agreement, you can create a new document using the same template or upload a fresh copy via Prepare Document.",
    createdAt: "2026-06-15T00:05:00Z",
    workspaceId: "ws_northbridge_001",
    workspaceName: "Northbridge Legal",
    deliveryClass: "email-and-in-app",
    isDismissible: true,
    hasAction: true,
    actionLabel: "View Expired Document",
    actionPath: "/app/documents/txn_006",
    whyReceivedReason: "You received this notification because you are the sender of this document and it reached its expiry date without all required signatures. Expiry notifications are sent to document senders.",
    status: "read",
  },
  {
    id: "notif-promo-001" as NotificationId,
    demonstrationOnly: true,
    category: "promotional",
    severity: "info",
    priority: "low",
    title: "New feature: Signature Library",
    body: "You can now save and reuse your signature and initials across documents. Set up your library in Settings → Signatures.",
    detailBody: "The Signature Library lets you save a drawn, typed, or uploaded signature representation for reuse in future signing requests. When signing, select 'From Library' to apply a saved representation. Explicit adoption is still required for each field — representations are not applied automatically. Each representation is private to your account.",
    createdAt: "2026-07-08T12:00:00Z",
    workspaceId: "ws_northbridge_001",
    workspaceName: "Northbridge Legal",
    deliveryClass: "in-app-only",
    isDismissible: true,
    hasAction: true,
    actionLabel: "Set Up Signature Library",
    actionPath: "/app/settings/signatures",
    whyReceivedReason: "You received this notification because a new platform feature was released that is available to your account. Feature announcement notifications can be dismissed and are not delivery-critical.",
    status: "dismissed",
  },
];

// ── Bulk Send preparation notifications (Gap Closure Command 5) ───────────────
//
// AUDIENCE — the single most important constraint here.
//
// These go to the person doing the preparation work. They NEVER go to a
// recipient, a Contact, or a Contact Group member. Being named in a batch is not
// a relationship with the platform: a Contact has no account, no session, and no
// notification inbox, and preparing a batch must never be the thing that creates
// one. Workspace Administrators are not added either — a batch in progress is not
// an administrative event, and a blanket admin audience would turn ordinary
// preparation work into something watched.
//
// BODY CONTENT — batch names, statuses and counts only. No recipient name, email
// address, organization, Contact, Contact Group, uploaded file name, or pasted
// value appears in a title, body, detail body, or action path. Notification
// bodies are the easiest place in a platform to leak data, because they travel:
// they are read in lists, in previews, and out of context.
//
// LANGUAGE — nothing here may imply a send. A batch produces frontend Draft
// Projections. "Ready for review" is not "sent", "delivered", or "signed", and
// the detail body says so explicitly.
//
// DEDUPLICATION — one notification per batch per condition. A batch that is
// edited repeatedly does not produce a stream; the condition either holds or it
// does not.
const PREPARATION_FIXTURES: NotificationRecord[] = [
  {
    id: "notif-prep-attention-001" as NotificationId,
    demonstrationOnly: true,
    category: "documents",
    severity: "warning",
    priority: "normal",
    title: "Bulk Send batch needs attention",
    body: "Vendor Renewals — Draft has recipient rows that need correcting before the batch can be reviewed.",
    detailBody:
      "Some recipient rows in this batch did not pass validation, or a required role mapping is incomplete. " +
      "Open the batch to see which rows need attention. " +
      "Nothing has been sent — a batch produces frontend Draft Projections only. No request was sent, no recipient " +
      "was notified, and no transaction was created.",
    createdAt: "2026-07-29T09:15:00Z",
    workspaceId: "ws_mls_001",
    workspaceName: "Mabini Legal Solutions",
    // In-app only. A preparation state is not worth an email, and this
    // demonstration sends no email regardless.
    deliveryClass: "in-app-only",
    isDismissible: true,
    hasAction: true,
    actionLabel: "Open Batch",
    actionPath: "/app/bulk-send/bsb_issues",
    whyReceivedReason:
      "You received this notification because you are preparing this Bulk Send batch and it has unresolved recipient " +
      "row issues. Preparation notifications go only to the people preparing a batch. They are never sent to " +
      "recipients, Contacts, or Contact Group members, and being included in a batch never causes anyone to be notified.",
    status: "unread",
  },
  {
    id: "notif-prep-ready-001" as NotificationId,
    demonstrationOnly: true,
    category: "documents",
    severity: "info",
    priority: "low",
    title: "Bulk Send batch ready for review",
    body: "Q3 Engagement Letters has passed validation and is ready for you to review.",
    detailBody:
      "All included recipient rows passed validation and required role mappings are complete. " +
      "Ready for review means the batch can now be checked before Draft Projections are created. " +
      "It does not mean anything was sent, delivered, or signed.",
    createdAt: "2026-07-28T14:40:00Z",
    workspaceId: "ws_mls_001",
    workspaceName: "Mabini Legal Solutions",
    deliveryClass: "in-app-only",
    isDismissible: true,
    hasAction: true,
    actionLabel: "Review Batch",
    actionPath: "/app/bulk-send/bsb_ready/review",
    whyReceivedReason:
      "You received this notification because you are preparing this Bulk Send batch and it reached a reviewable state. " +
      "Preparation notifications go only to the people preparing a batch, never to recipients or Contacts.",
    status: "read",
  },
];

// ── Capability gating ─────────────────────────────────────────────────────────
//
// A notification must never be the way a user discovers a capability that is not in
// the active product profile, and must never link to a capability-guarded route —
// following it would land on a "not available" page.
//
// Categories map onto capabilities. Anything not listed here belongs to a
// launch-core capability and is always shown.
const CATEGORY_CAPABILITY: Partial<Record<NotificationRecord["category"], string>> = {
  "integrations": "integrations",
};

function categoryIsInActiveProfile(category: NotificationRecord["category"]): boolean {
  const capability = CATEGORY_CAPABILITY[category];
  return !capability || isCapabilityInActiveProfile(capability);
}

// ── Module-level state (no localStorage, no persistence) ──────────────────────

// Preparation notifications live in the launch-core "documents" category, so the
// category gate above cannot reach them — a per-feature gate is required.
//
// Without it, a profile without Bulk Send would show a notification whose action
// leads to a capability-guarded route, and following it would land on a "not
// available" page. Worse, the notification itself would be how the user learned
// the feature exists.
function buildInitialItems(): NotificationRecord[] {
  const base = isCapabilityInActiveProfile("bulk-send")
    ? [...FIXTURES, ...PREPARATION_FIXTURES]
    : FIXTURES;
  return base
    .filter((f) => categoryIsInActiveProfile(f.category))
    .map((f) => ({ ...f }));
}

let _items: NotificationRecord[] = buildInitialItems();

// ── Filtering helpers ─────────────────────────────────────────────────────────

function matchesView(item: NotificationRecord, view: NotificationView): boolean {
  if (view === "dismissed") return item.status === "dismissed";
  if (item.status === "dismissed") return false;
  switch (view) {
    case "all":             return true;
    case "unread":          return item.status === "unread";
    case "action-required": return item.priority === "high" && item.hasAction;
    case "documents":       return item.category === "documents";
    case "my-actions":      return item.category === "my-actions";
    case "workspace":       return item.category === "workspace";
    case "security":        return item.category === "security";
    case "billing-usage":   return item.category === "billing" || item.category === "usage";
    case "integrations":    return item.category === "integrations";
    case "system":          return item.category === "system";
    default:                return true;
  }
}

function matchesCategory(item: NotificationRecord, cat: NotificationCategory | ""): boolean {
  if (!cat) return true;
  return item.category === cat;
}

function matchesSearch(item: NotificationRecord, q: string): boolean {
  if (!q.trim()) return true;
  const lower = q.toLowerCase();
  return (
    item.title.toLowerCase().includes(lower) ||
    item.body.toLowerCase().includes(lower) ||
    item.workspaceName.toLowerCase().includes(lower)
  );
}

function priorityWeight(p: NotificationRecord["priority"]): number {
  return p === "high" ? 0 : p === "normal" ? 1 : 2;
}

function sortItems(items: NotificationRecord[], sort: NotificationSort): NotificationRecord[] {
  return [...items].sort((a, b) => {
    if (sort === "oldest") return a.createdAt.localeCompare(b.createdAt);
    if (sort === "priority") {
      const pw = priorityWeight(a.priority) - priorityWeight(b.priority);
      if (pw !== 0) return pw;
    }
    return b.createdAt.localeCompare(a.createdAt); // newest first (default)
  });
}

// ── Service ───────────────────────────────────────────────────────────────────

export const notificationCenterService = {
  getAllItems(): NotificationRecord[] {
    return _items;
  },

  list(query: NotificationQuery): ServiceResult<NotificationListResult> {
    try {
      let filtered = _items
        .filter((n) => matchesView(n, query.view))
        .filter((n) => matchesCategory(n, query.category))
        .filter((n) => matchesSearch(n, query.q));

      filtered = sortItems(filtered, query.sort);

      const allNonDismissed = _items.filter((n) => n.status !== "dismissed");

      return ok({
        items: filtered,
        totalCount: allNonDismissed.length,
        unreadCount: _items.filter((n) => n.status === "unread").length,
        dismissedCount: _items.filter((n) => n.status === "dismissed").length,
      });
    } catch {
      return fail("UNKNOWN");
    }
  },

  getById(id: string): ServiceResult<NotificationRecord> {
    const item = _items.find((n) => n.id === id);
    if (!item) return fail("NOT_FOUND");
    return ok(item);
  },

  getRecent(limit: number): ServiceResult<NotificationRecord[]> {
    const recent = [..._items]
      .filter((n) => n.status !== "dismissed")
      .sort((a, b) => b.createdAt.localeCompare(a.createdAt))
      .slice(0, limit);
    return ok(recent);
  },

  getUnreadCount(): number {
    return _items.filter((n) => n.status === "unread").length;
  },

  countByView(view: NotificationView): number {
    return _items.filter((n) => matchesView(n, view)).length;
  },

  markRead(id: string): ServiceResult<NotificationRecord> {
    const item = _items.find((n) => n.id === id);
    if (!item) return fail("NOT_FOUND");
    if (item.status === "unread") item.status = "read";
    return ok(item);
  },

  markUnread(id: string): ServiceResult<NotificationRecord> {
    const item = _items.find((n) => n.id === id);
    if (!item) return fail("NOT_FOUND");
    if (item.status === "read") item.status = "unread";
    return ok(item);
  },

  markAllRead(): ServiceResult<{ updated: number }> {
    let count = 0;
    for (const item of _items) {
      if (item.status === "unread") {
        item.status = "read";
        count++;
      }
    }
    return ok({ updated: count });
  },

  dismiss(id: string): ServiceResult<NotificationRecord> {
    const item = _items.find((n) => n.id === id);
    if (!item) return fail("NOT_FOUND");
    if (!item.isDismissible) return fail("INVALID_STATE");
    item.status = "dismissed";
    return ok(item);
  },

  restore(id: string): ServiceResult<NotificationRecord> {
    const item = _items.find((n) => n.id === id);
    if (!item) return fail("NOT_FOUND");
    if (item.status === "dismissed") item.status = "read";
    return ok(item);
  },

  /**
   * Rebuilds the notification store from fixtures (Gap Closure Command 5).
   *
   * Read and dismissed state belongs to one signed-in session in one workspace.
   * Carrying it across a sign-out, an account switch, or a workspace switch would
   * mean the next session inherits which notifications the previous one had seen
   * — and, for preparation notifications, would leave a batch reference from a
   * workspace the new session may not be in.
   *
   * Called from PlatformContext on signOut() and switchWorkspace().
   */
  clearSessionState(): void {
    _items = buildInitialItems();
  },
};

// Notification read/dismiss state is per-session, and it holds preparation
// notifications that name batches in the workspace being left.
registerSessionCleanup({
  id: "notification-center",
  onSignOut: () => notificationCenterService.clearSessionState(),
  onWorkspaceSwitch: () => notificationCenterService.clearSessionState(),
});
