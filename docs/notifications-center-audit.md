# Notifications Center — Pre-Implementation Audit (Command 28)

**Date:** 2026-07-16
**Auditor:** Pre-flight read before C28 implementation

---

## Existing notification infrastructure

### `src/app/services/mock/notification.service.ts`
- Simple `MockNotificationService` with `list()`, `markRead(id)`, `markAllRead()`
- Reads from `MOCK_NOTIFICATIONS` in `src/app/data/mock/index.ts`
- Returns old `{ success: true, data: [...] }` shape (NOT `ServiceResult<T>`)
- Uses `delay()` async utility
- **C28 action:** Replace with new `notification-center.service.ts` using `ServiceResult<T>` pattern and rich fixtures. Old file kept for legacy compatibility reference only.

### `src/app/models/index.ts` — existing notification types
- `NotificationType`: 9 values (document-sent, signature-completed, document-completed, document-declined, document-expiring, document-expired, team-invitation, workspace-update, billing-alert)
- `NotificationSummary`: id, type, title, body, isRead, createdAt, linkPath?, transactionId?
- **C28 action:** Keep for backwards compatibility. Add new rich types in `src/app/models/notifications.ts`.

### `src/app/context/PlatformContext.tsx`
- Manages `notifications: NotificationSummary[]` + `unreadCount` + `markNotificationRead` + `markAllNotificationsRead`
- Loads from `MOCK_NOTIFICATIONS` at sign-in (4 simple fixtures)
- `unreadCount` computed from `notifications.filter(n => !n.isRead).length`
- **C28 action:** Leave PlatformContext as-is. Create new `NotificationCenterContext.tsx` alongside it. Sidebar and NotificationMenu will switch to the new context for their unread count/badge.

### `src/app/data/mock/index.ts` — `MOCK_NOTIFICATIONS`
- 4 basic fixtures of type `NotificationSummary[]`
- Loaded into PlatformContext at sign-in
- **C28 action:** Leave unchanged. New fixtures go in notification-center.service.ts.

### `src/app/components/platform/NotificationMenu.tsx`
- Bell button in PlatformHeader
- Dropdown popover, shows up to 5 recent notifications
- Uses `usePlatform()` for notifications/unreadCount/markRead/markAllRead
- Links items to `n.linkPath` (relative paths)
- Footer link: "View all notifications →" → `/app/notifications`
- **C28 action:** Switch to `useNotificationCenter()` hook. Items link to `/app/notifications/:notificationId`. Show rich category+severity info.

### `src/app/components/platform/PlatformSidebar.tsx`
- ICON_MAP missing `Inbox` icon (bug from C27 — inbox nav item has no icon)
- Uses `usePlatform().unreadCount` for the notifications badge
- **C28 action:** (1) Add `Inbox` to ICON_MAP to fix C27 icon bug. (2) Switch to `useNotificationCenter().unreadCount` for badge.

### `src/app/layouts/PlatformLayout.tsx`
- Authenticated shell: sidebar + mobile nav + header + outlet
- **C28 action:** Wrap outlet region with `<NotificationCenterProvider>` so context is available to sidebar, header, and all platform pages.

### `src/router.tsx` — `/app/notifications`
- Currently: `{ path: "notifications", element: <PlatformPlaceholder /> }`
- No `/app/notifications/:notificationId` route
- **C28 action:** Replace placeholder with `NotificationsPage`, add detail route.

---

## Existing violations confirmed absent
- No Burgundy (#67023B) in any notification-related file: **confirmed clean**
- No eNotary notification categories in existing code: **confirmed clean**
- No localStorage/sessionStorage usage in notification files: **confirmed clean**
- No WebSocket/SSE/push in notification files: **confirmed clean**
- No browser notification permission requests: **confirmed clean**

---

## Files to create (C28)

| File | Purpose |
|---|---|
| `src/app/models/notifications.ts` | Rich notification types (NotificationRecord, category, severity, priority, status, delivery class) |
| `src/app/services/mock/notification-center.service.ts` | Module-level service, 15 fixtures, full CRUD |
| `src/app/context/NotificationCenterContext.tsx` | Provider + `useNotificationCenter()` hook |
| `src/app/pages/platform/notifications/NotificationsPage.tsx` | `/app/notifications` list page |
| `src/app/pages/platform/notifications/NotificationDetailPage.tsx` | `/app/notifications/:notificationId` detail |
| `docs/in-app-notifications-and-alerts-center.md` | Feature documentation |

## Files to modify (C28)

| File | Change |
|---|---|
| `src/app/layouts/PlatformLayout.tsx` | Wrap with `NotificationCenterProvider` |
| `src/app/components/platform/PlatformSidebar.tsx` | Add `Inbox` to ICON_MAP; switch unreadCount to new context |
| `src/app/components/platform/NotificationMenu.tsx` | Switch to `useNotificationCenter()`; items link to detail pages |
| `src/router.tsx` | Replace placeholder; add detail route |
| `src/app/pages/platform/PlatformDashboard.tsx` | Add NotificationsSection widget |

---

## eNotary boundary confirmation

- No eNotary notification categories will be implemented
- Burgundy (#67023B) will not appear in any C28 file
- C28 notification categories: my-actions, documents, workspace, security, billing, usage, integrations, system, promotional

---

## Security/privacy properties confirmed for C28

- No localStorage for notification content, status, or dismissal state
- No sessionStorage for notification state
- No browser notification permission request
- No service worker
- No WebSocket, no SSE, no polling production API
- Never claim a notification was delivered, synchronized, or persisted
- Never claim real-time updates
- Notification ID not usable as resource-access credential
- Query parameters cannot create, dismiss, or mutate notifications
- Personal notifications only — no cross-user access
- Workspace Administrators cannot view another member's notifications
