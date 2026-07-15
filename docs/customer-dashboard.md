# Customer Dashboard — LAGDA Platform

**Command 14 | Status: Implemented | Build: clean**

---

## 1. Dashboard Purpose

The authenticated LAGDA Customer Dashboard is the primary landing screen for signed-in users. It surfaces the most actionable document-workflow information, provides quick entry points to platform features, and adapts its visible sections to the user's workspace role and permissions.

This is the LAGDA **eSignature and Document Verification** platform dashboard. It contains no eNotary features, widgets, task lists, or billing lines. eNotary is a separate, Coming Soon product subject to Supreme Court Accreditation.

---

## 2. Canonical Route

| Path | Purpose |
|------|---------|
| `/app` | Redirects to `/app/dashboard` via `<Navigate replace />` |
| `/app/dashboard` | **Canonical authenticated Dashboard** |

Both routes are guarded by `PlatformLayout`, which redirects unauthenticated or expired sessions to `/sign-in?returnTo=<current path>`.

---

## 3. Route Behavior

- `/app` → `<Navigate to="/app/dashboard" replace />` — no loop.
- `/app/dashboard` renders `<PlatformDashboard />` inside `<PlatformLayout />`.
- Unknown paths under `/app/*` reach `<PlatformNotFound />`.
- `usePageMeta()` fires on every route change; Dashboard title is **"Dashboard | LAGDA"**, `isIndexable: false`.

---

## 4. Information Architecture

```
PlatformLayout (sidebar + header)
└── AppContent (max-width: 1280px)
    ├── PageHeader (greeting + workspace context + Refresh button)
    ├── Quick Actions (role-aware grid)
    ├── [New-user welcome, if empty state]
    └── Two-column layout (CSS grid, single column <900px)
        ├── Main column
        │   ├── Needs Attention
        │   ├── Document Status Summary
        │   ├── Recent Documents
        │   └── Recent Activity
        └── Side panel
            ├── Template Shortcuts
            ├── Document Verification Access
            ├── Usage & Plan Snapshot
            └── Workspace & Team Summary
```

---

## 5. Page Header

Component: `<PageHeader>` from `src/app/components/platform/PageHeader.tsx`.

- **Title**: "Welcome back, {firstName}" — first name only, from `user.displayName`.
- **Description**: "{workspaceName} — {planLabel} Plan".
- **Action**: Refresh button (`aria-label="Refresh dashboard"`, disabled while loading).
- No workspace name in page `<title>` or Open Graph metadata (prevents PII in crawlable meta).

---

## 6. Quick Actions

Role-aware grid of action cards. Each card is a `<Link>` with accessible `aria-label`.

| Action | Route | Permission Required |
|--------|-------|---------------------|
| Prepare a Document | `/app/documents/new` | `prepare_documents` |
| My Documents | `/app/documents` | *(always shown)* |
| Use a Template | `/app/templates` | `manage_templates` |
| Verify a Document | `/app/verify` | `verify_documents` |
| Invite Team Member | `/app/team/invitations` | `manage_team` |

No eNotary action exists or will ever appear in this section.
Actions hidden when the user lacks permission, rather than disabled.

Responsive: 2-column grid on mobile, auto-fill on wider screens.

---

## 7. Needs Attention

Section label: "Needs Attention" | Link: "View all" → `/app/documents`.

Shows attention items derived from document transaction status:
- **awaiting-signature** — documents waiting on one or more signers.
- **expiring-soon** — sent/awaiting-signature documents with `expiresAt` within 14 days.
- **declined** — documents declined by a participant.

Each item shows:
- Icon (Clock = awaiting, AlertTriangle = expiring, XCircle = declined)
- Document title
- Detail text (e.g., "1 of 2 participants have signed")
- Expiry date if applicable (human-readable, not just color)
- "View →" link to `/app/documents/{transactionId}`

**Zero-attention state**: Renders a `<CheckCircle2>` icon with "No items need your attention right now." Status is communicated in text, not by color alone.

Loading state: 2-row skeleton.
Error state: `<SectionErrorCard>` with Retry button.

---

## 8. Document Status Summary

Section label: "Document Status" | Link: "All documents" → `/app/documents`.

Four `<StatCard>` tiles, each linking to `/app/documents?status={key}`:

| Card | Status Key | Accent Color |
|------|-----------|--------------|
| Awaiting Signature | `awaiting-signature` | Amber (#D97706) |
| In Progress | `partially-completed` | Cyan (#0891B2) |
| Completed | `completed` | Green (#059669) |
| Expired | `expired` | Slate (#94A3B8) |

Each card's `aria-label` includes the numeric count and the status name.
Status is not communicated by color alone — label text is always present.

Unknown filter values in the URL are safely handled by the documents page (not the dashboard).

---

## 9. Recent Documents

Section label: "Recent Documents" | Link: "View all" → `/app/documents`.

Shows up to 5 documents sorted by `updatedAt` descending.

Table with `role="table"`:
- Column: Document title + "X of Y signed" sub-line
- Column: `<StatusBadge>` (hidden on mobile <640px)
- Column: Relative date (hidden on mobile <640px)

Each row is a `<Link role="row">` to `/app/documents/{id}`.

**Empty state**: "No documents yet" + "Prepare a Document" CTA (only for `prepare_documents` role).

No backend mutation actions (delete, sign) are accessible from this view.
Document IDs used are stable fictional IDs (txn_001 through txn_006).

---

## 10. Recent Activity

Section label: "Recent Activity" | Link: "View documents" → `/app/documents`.

Chronological feed of document events. Activity item types:
- `document-created` — document drafted
- `document-sent` — document sent to participants
- `signature-received` — a participant signed
- `document-completed` — all participants signed
- `document-expired` — document expired without completion

Each item shows:
- Type icon (16px, color-coded)
- Description text (no IP, device, or exact location)
- Relative `<time dateTime={iso}>` timestamp

**Empty state**: "No recent activity" — shown for new users.

Visible to roles with `view_documents` or `view_audit`.

---

## 11. Template Shortcuts

Section label: "Templates" | Link: "All templates" → `/app/templates`.
Shown only for roles with `manage_templates`.

Displays the top 3 templates by fixture order from `MOCK_TEMPLATES`.
Each template row links to `/app/templates/{id}`.

No template-creation success is implied — rows navigate to the template detail page only.

---

## 12. Document Verification Access

Always visible to roles with `verify_documents` (reviewer, sender, owner, administrator, etc.).

A full-width card linking to `/app/verify` with icon, label, and description.
This is LAGDA's **document verification** feature (QR/Verification ID check), not notarization.

---

## 13. Usage and Plan Snapshot

Section label: "Usage & Plan" | Link: "Manage" → `/app/settings/billing`.
Visible to roles with `view_billing` or `view_usage`.

Shows:
- Plan name + renewal date
- **Sending Requests** meter: `aria-valuenow / aria-valuemax`, label + count string
- **Storage** meter: `aria-valuenow / aria-valuemax`, label + formatted byte string

Meters use `role="meter"` with full ARIA attributes. Values are communicated in text alongside the visual bar.

Usage warning (amber color + `role="alert"`) fires when `isNearSendingLimit` or `isNearStorageLimit` is true (≥80% of limit).

No eNotary usage is present. No billing mutation (upgrade, cancel) is accessible from this panel.

---

## 14. Workspace and Team Summary

Section label: "Team" | Link: "Manage" → `/app/team`.
Visible to roles with `manage_team`.

Shows:
- Workspace initials avatar + name + plan label
- Member count (from `currentWorkspace.memberCount`)
- "Invite a team member" link → `/app/team/invitations`

---

## 15. Role-Aware Dashboard Composition

Permission checks use `hasPermission()` from `usePlatform()`, not role labels directly.

| Role | Sections Shown |
|------|---------------|
| owner / administrator | All sections |
| template_administrator | QA + Docs + Activity + Templates + Verify + Usage |
| sender | Docs + Activity + Verify + Usage |
| billing_administrator | Usage + Plan (only if view_usage/view_billing) |
| security_administrator | Status + Docs + Activity |
| reviewer | Status + Docs + Verify |
| viewer | Status + Docs |
| auditor | Status + Docs + Activity (audit emphasis) |

---

## 16. Permission Behavior

- Actions are **hidden** (not rendered) when the user lacks permission, not merely disabled.
- `hasPermission()` is the sole gate — role label is not checked directly in JSX.
- Viewer/Reviewer users see a read-only dashboard: status counts, recent docs, and verification access.
- Auditor users see status counts, recent docs, and the activity feed.
- No "Access Denied" banner appears on the dashboard itself — sections simply don't render.

---

## 17. New-User Empty State

Triggered when `scenario === "new-user"` and total document count is 0.

Renders a welcome card:
- "You're all set" heading
- Description: "Prepare your first document to request signatures."
- "Prepare your first document" CTA (only if `canPrepare`).

All individual sections (Needs Attention, Status Summary, Recent Docs, Activity) render their own empty states when the data arrays are empty.

---

## 18. Loading States

`loadState === "loading"` renders skeleton blocks in each section via `<SkeletonBlock>` and `<SkeletonRows>` helpers.

Skeleton animation: `skeleton-pulse` CSS keyframes in the `<style>` block.
Reduced-motion: animation degraded to static `opacity: 0.7` via `@media (prefers-reduced-motion: reduce)`.

Loading skeletons are `aria-hidden` — screen readers skip decorative placeholders.

---

## 19. Partial-Error Handling

`loadState === "partial-error"` — some sections loaded, others returned errors.

`DashboardSectionErrors` tracks per-section failure:
- Sections with `true` render `<SectionErrorCard>` with a Retry button.
- Sections without errors render their data normally.

This preserves available content when individual service calls fail.

---

## 20. Full Dashboard Error State

`loadState === "full-error"` — the service threw an error (e.g., `scenario === "full-error"`).

Renders a full-screen error with:
- AlertCircle icon (red)
- "Dashboard unavailable" heading + explanation
- "Try again" button (`onRetry()`)

The public shell and platform shell never appear together — the error state is rendered inside `PlatformLayout`.

---

## 21. Usage and Limit Warnings

When `isNearSendingLimit` or `isNearStorageLimit` is `true`:
- Amber color on the affected meter bar
- `role="alert"` paragraph with text: "You are approaching your [X] limit. Contact support to discuss plan options."
- No upgrade button, no billing mutation.

Triggered in the `usage-warning` demo scenario (31→185 sending requests used, storage at 4.5 GB/5 GB).

---

## 22. Workspace Switching

When `currentWorkspace.id` changes (via `switchWorkspace()` in `PlatformContext`):
- `useEffect` detects the ID change via `workspaceKey` state.
- `load()` is called, clearing `data` and re-entering `"loading"` state.
- Stale data from the previous workspace is cleared before the new data arrives.

---

## 23. Dashboard Service Boundary

`src/app/services/mock/dashboard.service.ts`

```typescript
class MockDashboardService {
  async load(scenario: DashboardScenario): Promise<DashboardData>
}
export const mockDashboardService: MockDashboardService;
```

This is the only interface the dashboard component calls. Replacing with a real HTTP client requires only swapping this file — the component and models are unchanged.

No backend is called. No real API credentials are used. No real analytics SDK is present.

---

## 24. Typed Dashboard Models

`src/app/models/dashboard.ts`

Key types:
- `DashboardScenario` — 9 deterministic demo scenarios
- `DashboardLoadState` — "loading" | "ready" | "partial-error" | "full-error"
- `DocumentStatusCount` — per-status document counts
- `AttentionItem` — item in the Needs Attention feed
- `DashboardDocument` — entry in the Recent Documents list
- `ActivityItem` — entry in the Recent Activity feed
- `DashboardUsage` — usage/plan snapshot
- `DashboardSectionErrors` — per-section error flags
- `DashboardData` — the complete dashboard payload

---

## 25. Mock Scenarios

| Scenario | How to Test | Description |
|----------|-------------|-------------|
| `standard-admin` | Default (owner role) | 6 docs, 2 attention items, full data |
| `sender` | Role = sender | Same data, limited actions |
| `viewer` | Role = viewer | Status + docs only |
| `auditor` | Role = auditor | Status + docs + activity |
| `new-user` | `?demo=new-user` | All counts 0, welcome state |
| `partial-failure` | `?demo=partial-failure` | Attention + Activity sections error |
| `full-error` | `?demo=full-error` | Full dashboard error, retry |
| `usage-warning` | `?demo=usage-warning` | Near limit on requests + storage |
| `restricted-workspace` | Role = reviewer | Docs + verify only |

Override scenario via URL: `/app/dashboard?demo=new-user`.

---

## 26. Mock Data

**Transactions** (from `src/app/data/mock/index.ts`):
6 documents across: draft, sent, awaiting-signature, partially-completed, completed, expired.

**Attention items** (computed in service):
- txn_001 awaiting signature (1/2 signed)
- txn_005 expiring July 27, 2026

**Recent documents**: top 5 by updatedAt descending.

**Activity items**: 7 events from July 8–15, 2026. No IP, device, or location.

**Usage** (from `MOCK_SUBSCRIPTION` in `src/app/data/mock/workspaces.ts`):
- Sending: 31/200 (15.5%)
- Storage: 1 GB / 5 GB (20%)
- Plan: Professional, renews 2026-12-31

All names, organizations, and document titles are fictional. No real customer data.

---

## 27. Document Status Presentation

Status badges use `TRANSACTION_STATUS_LABELS` from `src/app/models/index.ts`.
Status is communicated in text, not color alone.

Status color map (eSignature colors only, no Burgundy):
- completed → Green `#059669`
- awaiting-signature / partially-completed → Amber `#D97706`
- sent → Azure `#0078D4`
- declined → Red `#DC2626`
- draft / expired → Slate `#94A3B8`

---

## 28. Date and Time Formatting

All date formatting is inline — no external library added.

- `formatRelativeDate(iso)`: "Just now", "5m ago", "3h ago", "Yesterday", "Jul 10", "Jul 10, 2025"
- `formatShortDate(iso)`: "Jul 27, 2026" (used for expiry dates)
- `formatStorageBytes(bytes)`: "1.0 GB", "512 MB", "128 KB"

`date-fns` (v3.6.0) is installed in the project but was not required for this level of formatting.

---

## 29. Reusable Components

Created inside `PlatformDashboard.tsx` (dashboard-specific, not exported):
- `SectionLabel` — uppercase section heading (`<h2>`)
- `SectionHeader` — section label + optional "View all" link
- `StatusBadge` — inline status chip using `TRANSACTION_STATUS_LABELS`
- `SectionErrorCard` — partial-error card with Retry button
- `SkeletonRows` — N skeleton rows for loading states
- `Card` — white bordered container
- `UsageMeter` — accessible `role="meter"` progress bar

Reused from `src/app/components/platform/`:
- `PageHeader`, `AppContent`, `StatCard`, `DashboardGrid`, `EmptyStateLayout`, `SkeletonBlock`

---

## 30. Accessibility Behavior

- One `<h1>` rendered by `<PageHeader>`.
- Section headings are `<h2>` via `<SectionLabel>`.
- Status communicated in text, not color alone — every status badge includes the text label.
- Loading skeletons are `aria-hidden`.
- Tables use `role="table/rowgroup/row/cell/columnheader"`.
- Usage meters: `role="meter"` with `aria-valuenow`, `aria-valuemin`, `aria-valuemax`, `aria-label`.
- Usage warnings: `role="alert"` + `aria-live="polite"`.
- Full error state has a visible retry button with accessible label.
- All links and buttons have accessible names.
- Focus indicator: `outline: 2px solid #0078D4` on `:focus-visible`.
- Keyboard navigation: all interactive elements are focusable via Tab.

---

## 31. Responsive Behavior

CSS breakpoints via `<style>` tag (inline styles for component values, class names for responsive):

| Breakpoint | Layout |
|-----------|--------|
| <640px | Single column; doc table hides Status and Date columns |
| 640px+ | Doc table shows all columns; Quick Actions fill multi-column |
| <900px | Single-column layout (main + side stacked) |
| 900px+ | Two-column layout (1fr 320px) |

No full-page horizontal scrolling. Wide tables are contained within their cards.
Quick Actions: 2-column grid on mobile, auto-fill on wider screens.

---

## 32. Motion and Reduced-Motion Behavior

- Usage meter bar: `transition: width 0.4s ease`.
- Skeleton blocks: `animation: skeleton-pulse 1.5s ease-in-out infinite`.
- Refresh icon: `animation: spin-anim 1s linear infinite` while loading.
- `@media (prefers-reduced-motion: reduce)`: all transitions/animations → 0.01ms.
- `@keyframes skeleton-pulse` degrades to `opacity: 0.7` under reduced motion.

---

## 33. Performance Decisions

- `PlatformDashboard` is lazy-loaded (code-split from main bundle).
- Dashboard chunk: ~35 KB (9 KB gzip).
- No chart library added (recharts was available but not used).
- No real-time SDK added.
- No analytics SDK fires.
- Service is called once on mount + on workspace change. Not polled.
- `useCallback` stabilizes `load()` reference to avoid re-render loops.

---

## 34. Security and Privacy Safeguards

- No authentication tokens, session secrets, passwords, OTP codes, or recovery codes are rendered.
- No workspace names appear in page `<title>` or Open Graph metadata.
- No real customer data exists — all names, orgs, and documents are fictional.
- No IP address, device fingerprint, or exact-location data appears in activity items.
- Route identifiers (`txn_001`, etc.) are stable fictional IDs, not real UUIDs.
- `scenario = "full-error"` is the only thrown path — no sensitive error stack is shown.
- No live network service is required or contacted.
- Dashboard routes return `noindex, nofollow` and have no canonical public URL.

---

## 35. eSignature and eNotary Separation

The Dashboard is exclusively an **eSignature and Document Verification** platform surface.

**Never present on the Dashboard:**
- eNotary Dashboard widget
- Notary Public task list
- Notarial session widget
- Notary workspace or register
- Electronic seal
- Notary appointment flow
- "Apply as Notary" action
- eNotary transaction type
- eNotary billing or usage metrics
- Accreditation progress widget

**Burgundy (#67023B) is NEVER used on the Dashboard.** It is reserved exclusively for eNotary product surfaces.

**Document Verification** (QR / Verification ID check) is an eSignature authenticity feature, not notarization. It is present on the Dashboard.

If a future help or product-updates section links to an eNotary destination, the required legal text must appear verbatim:
> *"LAGDA eNotary is Coming Soon and Subject to Supreme Court Accreditation and applicable rules."*

---

## 36. Testing Coverage

No automated test framework (Vitest, Jest) is configured in the project as of Command 14. All validation was performed via TypeScript build and manual verification.

**Manual verification checklist (from Step 41):**
- Build passes (✓)
- `/app` redirects to `/app/dashboard` without loop (✓)
- `/app/dashboard` renders inside platform shell (✓)
- Dashboard is `noindex, nofollow` (✓ — `isIndexable: false` in PLATFORM_ROUTES)
- Dashboard excluded from `public/sitemap.xml` (✓ — only public routes in sitemap)
- Public shell does not appear on dashboard (✓ — PlatformLayout, not PublicLayout)
- Quick actions use valid routes (✓)
- Status cards link with `?status=` filter (✓)
- Workspace switching reloads data (✓ — `useEffect` on `currentWorkspace.id`)
- Usage meters are accessible (✓ — `role="meter"`, full ARIA)
- No eNotary content appears (✓)
- No Burgundy color is used (✓)
- No sensitive auth data rendered (✓)
- Responsive at 640px and 900px breakpoints (✓ — CSS class breakpoints)

**Deferred — requires test framework setup:**
- Route renders Vitest/Testing Library tests
- Permission unit tests
- Section-level accessibility automated tests
- CI integration

---

## 37. Deferred Backend Functionality

All items below are intentionally deferred to backend integration phase:

- Real document transaction list API (`GET /workspace/:id/transactions`)
- Real attention item computation (server-side, based on participant status + expiry)
- Real activity feed API (`GET /workspace/:id/activity`)
- Real usage metering (`GET /workspace/:id/usage`)
- Real team member list API
- Real notification push/websocket for live count updates
- Real document status filter navigation (`/app/documents?status=`)
- Real template creation and template usage counting
- Real billing API integration (upgrade/cancel flows)
- Workspace-level audit log access (`view_audit` permission)

---

## 38. Handoff to Command 15

**Command 15 recommended focus: Document Workspace (`/app/documents`)**

Suggested scope:
- List view with status filter (ties into dashboard status summary links)
- Document detail page (`/app/documents/:id`)
- Status badge reuse from dashboard
- Participant progress display
- Basic document actions (view, download — no real signing)
- Empty state when no documents exist

Files to reuse from Command 14:
- `src/app/models/dashboard.ts` — `DashboardDocument`, `DocumentStatusCount`, `ActivityItem`
- Status color/badge helpers (consider extracting to shared component)
- `MOCK_TRANSACTIONS` from `src/app/data/mock/index.ts`
- `TRANSACTION_STATUS_LABELS` from `src/app/models/index.ts`
