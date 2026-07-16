# In-App Notifications and Alerts Center

**Feature:** In-App Notifications and Alerts Center
**Command:** 28
**Status:** Frontend demonstration — no backend connected, no real delivery

---

## Overview

The Notifications Center is the personal alerts hub for the authenticated LAGDA user. It provides a categorized, filterable view of account activity, document events, workspace changes, security alerts, billing notifications, usage thresholds, integrations health, system announcements, and feature updates.

**Key principle:** These notifications and their read/dismissed states are fictional frontend demonstration data. No notification, reminder, email, SMS, push message, or real-time event is delivered, synchronized, or persisted.

---

## Routes

| Path | Purpose |
|---|---|
| `/app/notifications` | Full Notifications Center list with tabs, search, sort, and controls |
| `/app/notifications/:notificationId` | Notification detail: full body, "Why You Received This", delivery class summary |

Both routes are accessible from the authenticated platform shell (`/app/*`).

---

## Shell integration

### Header bell (NotificationMenu)
- Location: `PlatformHeader` → `NotificationMenu`
- Displays: unread count badge, compact popover with 5 most recent non-dismissed notifications
- Each popover item links to its detail page (`/app/notifications/:id`)
- "Mark all read" button in popover header
- "View all notifications →" link in popover footer
- Uses `useNotificationCenter()` hook (switches from PlatformContext.notifications)

### Sidebar badge
- Location: `PlatformSidebar` → UTILITY_NAV → "Notifications" item badge
- Displays: unreadCount from `useNotificationCenter()`
- Updated by: any markRead / markAllRead / dismiss / restore operation through the context

### Dashboard section
- Location: `PlatformDashboard` → `NotificationsSection`
- Displays: up to 3 high-priority unread notifications
- Links each item to its detail page
- Hidden when no high-priority unread items exist
- "View all" → `/app/notifications`

---

## NotificationCenterContext

`src/app/context/NotificationCenterContext.tsx` provides:

- `items: NotificationRecord[]` — all notifications (all statuses, including dismissed)
- `unreadCount: number` — computed from items where status === 'unread'
- `markRead(id)` — flip status unread → read
- `markUnread(id)` — flip status read → unread
- `markAllRead()` — mark all unread items as read
- `dismiss(id)` — mark dismissible item as dismissed
- `restore(id)` — un-dismiss a dismissed item (status → read)
- `reload()` — re-sync React state from service module state

Provider is mounted inside `PlatformLayout` so all platform pages share the same state.

---

## Notification categories

| Category | Label | Typical content |
|---|---|---|
| my-actions | My Actions | Document signing/approval requests assigned to you |
| documents | Documents | Signature received, completion, expiry, expiration |
| workspace | Workspace | Member joins, settings changes |
| security | Security | New device sign-in, email verification, MFA events |
| billing | Billing | Payment method expiry, invoice issues |
| usage | Usage | Sending request quota thresholds (80%, 100%) |
| integrations | Integrations | Webhook delivery summaries |
| system | System | Planned maintenance, platform announcements |
| promotional | Feature Update | New feature announcements (dismissible) |

**No eNotary categories** — eNotary is a future product and is not represented in any notification category.

---

## Notification statuses

| Status | Description |
|---|---|
| unread | New, not yet viewed in detail |
| read | Opened or explicitly marked read |
| dismissed | Hidden from main views (restorable) |

---

## Views (tabs)

| View | URL param | What it shows |
|---|---|---|
| All | `?view=all` | All non-dismissed notifications |
| Unread | `?view=unread` | Only unread items |
| Action Required | `?view=action-required` | High-priority items with an action |
| Documents | `?view=documents` | Category: documents |
| My Actions | `?view=my-actions` | Category: my-actions |
| Workspace | `?view=workspace` | Category: workspace |
| Security | `?view=security` | Category: security |
| Billing & Usage | `?view=billing-usage` | Category: billing or usage |
| Integrations | `?view=integrations` | Category: integrations |
| System | `?view=system` | Category: system |
| Dismissed | `?view=dismissed` | Dismissed items only |

---

## Sort options

| Sort | URL param | Behavior |
|---|---|---|
| Newest first (default) | `?sort=newest` | descending createdAt |
| Oldest first | `?sort=oldest` | ascending createdAt |
| Priority | `?sort=priority` | high → normal → low, then newest-first within tier |

---

## Grouping

Within each view, notifications are grouped by date:
- Today
- Yesterday
- This Week (last 7 days, not today or yesterday)
- Earlier

---

## Fixture notifications (15 items)

| ID | Category | Severity | Priority | Status |
|---|---|---|---|---|
| `notif-action-sign-001` | my-actions | critical | high | unread |
| `notif-action-approve-002` | my-actions | warning | high | unread |
| `notif-sec-device-001` | security | warning | high | unread |
| `notif-billing-001` | billing | warning | high | unread |
| `notif-doc-expiring-002` | documents | warning | high | unread |
| `notif-int-001` | integrations | info | normal | read |
| `notif-ws-member-001` | workspace | info | normal | read |
| `notif-usage-001` | usage | warning | normal | read |
| `notif-doc-signed-003` | documents | info | normal | read |
| `notif-ws-settings-002` | workspace | info | low | read |
| `notif-sec-email-002` | security | success | normal | read |
| `notif-doc-completed-001` | documents | success | normal | read |
| `notif-system-001` | system | info | low | read |
| `notif-doc-expired-004` | documents | warning | normal | read |
| `notif-promo-001` | promotional | info | low | **dismissed** |

Total: 15 notifications, 5 unread, 9 read, 1 dismissed.

---

## Delivery classes

Each notification record has a `deliveryClass` field for reference only. Never claims actual delivery.

| Class | Description |
|---|---|
| in-app-only | Appears in Notifications Center only |
| email-and-in-app | In-app + email (per notification preferences) |
| sms-and-in-app | In-app + SMS (per notification preferences) |
| all-channels | In-app + email + SMS (per preferences) |

---

## Detail page

The detail page (`/app/notifications/:notificationId`) shows:

1. Full notification title, body, detail body
2. Category + severity + priority badges
3. Priority accent bar (high-priority items)
4. Action button (if `hasAction: true` and `actionPath` is set)
5. Mark as read/unread toggle
6. Dismiss / Restore (for dismissible items)
7. "Why You Received This" section — personalized reason from the `whyReceivedReason` field
8. Delivery class summary — descriptive reference, never claims real delivery
9. Link to Notification Preferences (`/app/settings/notifications`)
10. Demo notice at top

Auto-marks-as-read on mount (unread items only).

### Safe deep links

The `actionPath` on a notification is a trusted internal relative path set in the service fixtures. It is:
- Never constructed from user input
- Never derived from query parameters
- Never used as a resource-access credential
- Always a client-side navigation target (no implicit authorization)

Navigation to an `actionPath` does not grant access beyond what the destination page's own access controls allow.

---

## Dismissal behavior

- Items with `isDismissible: true` can be dismissed by the user
- Dismissed items move to the "Dismissed" view; they are hidden from all other views
- Dismissed items can be restored (status → read, appear in "All" view again)
- Items with `isDismissible: false` cannot be dismissed (e.g., my-actions notifications)

---

## Security and privacy properties

| Property | Value |
|---|---|
| localStorage | Not used |
| sessionStorage | Not used |
| Notification IDs in URL | Read-only; do not convey private data; not usable as access credentials |
| Real-time updates | Not implemented (no WebSocket, no SSE, no polling) |
| Browser push permission | Not requested |
| Service worker | Not used |
| Cross-user access | Not implemented |
| Workspace admin access to member notifications | Not implemented |
| Backend | Not connected |

---

## eNotary boundary

The Notifications Center contains no eNotary content. The Burgundy color (`#67023B`) is not used in any C28 file. No eNotary notification categories are defined. eNotary is a separate future product.

---

## Backend handoff notes

When connecting to a production backend:

1. **Notifications endpoint:** `GET /api/notifications` — paginated, scoped to the authenticated user. Must enforce server-side ownership.
2. **Detail endpoint:** `GET /api/notifications/:id` — single notification. Server must verify ownership.
3. **Mark read:** `PATCH /api/notifications/:id/read`
4. **Mark all read:** `POST /api/notifications/mark-all-read`
5. **Dismiss:** `PATCH /api/notifications/:id/dismiss`
6. **Restore:** `PATCH /api/notifications/:id/restore`
7. **Real-time:** In production, notification badge updates can use Server-Sent Events or WebSocket, but this demo does not implement either. The SSE/WS integration is a backend concern.
8. **Privacy:** All notification endpoints must enforce that only the authenticated user can read or mutate their own notifications. No admin override for reading member notifications.

---

## Related files

| File | Role |
|---|---|
| `src/app/models/notifications.ts` | Domain types: `NotificationRecord`, categories, views, sort, etc. |
| `src/app/services/mock/notification-center.service.ts` | In-memory service, 15 fixture notifications |
| `src/app/context/NotificationCenterContext.tsx` | Provider + `useNotificationCenter()` hook |
| `src/app/pages/platform/notifications/NotificationsPage.tsx` | `/app/notifications` list page |
| `src/app/pages/platform/notifications/NotificationDetailPage.tsx` | `/app/notifications/:notificationId` detail |
| `src/app/components/platform/NotificationMenu.tsx` | Header bell popover (updated to use new context) |
| `src/app/components/platform/PlatformSidebar.tsx` | Sidebar badge (updated to use new context; Inbox icon added) |
| `src/app/layouts/PlatformLayout.tsx` | Wraps with `NotificationCenterProvider` |
| `src/app/pages/platform/PlatformDashboard.tsx` | `NotificationsSection` widget |
| `src/router.tsx` | Routes: `notifications` and `notifications/:notificationId` |
| `docs/notifications-center-audit.md` | Pre-implementation audit |
