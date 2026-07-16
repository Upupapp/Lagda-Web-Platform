# Reports and Analytics — Pre-Implementation Audit

**Command:** 29
**Date:** 2026-07-16
**Auditor:** Frontend audit before implementation

---

## Summary

No `/app/reports` route family exists. All eight planned report routes (`/app/reports`, `/app/reports/documents`, `/app/reports/participants`, `/app/reports/templates`, `/app/reports/verification`, `/app/reports/teams`, `/app/reports/saved`, `/app/reports/:reportId`) are currently unregistered and would render the platform 404 page.

No reporting service, reporting model, aggregation layer, or saved-view store exists. C29 creates all of these from scratch.

---

## 1. Existing Metric / Dashboard Code

### PlatformDashboard.tsx
- Renders: Status Summary cards (counts by status group), Quick Actions, Needs Attention, Recent Documents, My Actions, Notifications sections
- Status counts come from `dashboard.service.ts` → `MockDashboardService` → scenario-based static fixture
- Usage Snapshot: signing requests used/remaining, storage, team seats — from `dashboard.service.ts`
- `NotificationsSection`: top 3 high-priority unread from `useNotificationCenter()`
- `MyActionsSection`: top 3 action-required from `inbox.service.ts`
- **Assessment:** Dashboard metrics are purposefully concise. C29 must NOT duplicate them as separate aggregation outputs. Dashboard cards should link to `/app/reports` for deeper detail.

### settings/UsagePage.tsx
- Shows plan allocation: signing requests, storage, templates, contacts, team seats
- Source: `settings.service.ts` → `MOCK_USAGE_METRICS`
- **Assessment:** Usage is plan-consumption, not operational reporting. C29 reports must not replicate Usage metrics. They may link to `/app/settings/usage`.

### workspace/ActivityPage.tsx
- Chronological administrative event log (invitations, member changes, role changes)
- **Assessment:** Administrative activity is separate from document transaction reporting. C29 reports do not duplicate this log but may summarize its patterns.

---

## 2. Existing Document / Transaction Data

### documents.ts (model)
- `TransactionStatus` union: 17 statuses including draft/ready-to-send/sent/delivered/viewed/authentication-completed/awaiting-signature/awaiting-approval/partially-completed/completed/declined/cancelled/expired/failed-delivery/voided/needs-attention/archived
- `DocumentListItem` with: id, title, status, createdAt, updatedAt, sentAt, completedAt, expiresAt, participantCount, completedParticipantCount, ownerName, workspaceId, verificationId, verificationStatus
- `DOCUMENT_STATUS_TONE` mapping all statuses to semantic tones

### data/mock/documents.ts (fixtures)
- 8 document fixtures (txn_001 through txn_008)
- Statuses represented: awaiting-signature (2), completed (2), partially-completed (1), declined (1), draft (1), failed-delivery (1)
- Date range: 2026-06-18 through 2026-07-15
- Workspace: ws_northbridge_001 (documents), ws_uut_001 (other)
- Owners: Ana Reyes, Marco Dela Cruz, Sofia Aquino
- Team associations: not directly present on DocumentListItem (C29 aggregation layer will map via workspace-admin fixture IDs)

### data/mock/transaction-detail.ts (fixtures)
- txn_001 through txn_008 with full participant arrays, routing configurations, evidence availability, activity logs
- Authentication methods: secure-invitation (4), email-otp (3), sms-otp (1), enterprise-sso (1)
- Evidence availability: present on completed and in-progress transactions
- Participant roles: signer (12), approver (2), reviewer (1), acknowledgment-recipient (1), viewer (2), carbon-copy (1)

### models/verification.ts
- `TransactionRecordStatus`: 11 values
- `FileMatchStatus`: 9 values

### data/mock/verification.ts (fixtures)
- 10 verification records (VRF-2026-NBL-001 through VRF-2026-NBL-010)
- Outcomes: record-found-completed (4), record-found-in-progress (2), record-found-cancelled (1), record-found-expired (1), record-not-found (1), record-restricted (1)
- File match states: match (4), mismatch (1), comparison-unavailable (2), file-not-provided (2), comparison-error (1)

---

## 3. Existing Template Data

### models/templates.ts
- 7 template scenarios (3 available, 2 draft, 1 archived, 1 unavailable — as per TEMPLATE_SCENARIOS)
- `TemplateUsageSummary` with `timesUsed`, `lastUsedDate`, `recentDraftStarts`, `relatedFixtureIds`
- `TemplateListItem` with `usageCount`, `lastUsedDate`, `placeholderCount`, `routingMode`

---

## 4. Existing Workspace / Team Data

### data/mock/workspace-admin.ts
- 8 members (MBR_ANA through MBR_DEACT), 5 teams (TEAM_LEGAL/COMPLY/HR/VENDOR/ARCHIVE)
- Active members: 6; suspended: 1; deactivated: 1
- Team sizes: Legal (3), Compliance (2), HR (3), Vendor (2), Archive (archived)
- Member roles: owner (Ana), admin (Daniel), sender×3, reviewer-auditor, billing-admin, suspended

---

## 5. Existing Chart / Visualization Infrastructure

**None.** No chart components, SVG chart utilities, or canvas-based visualization code exists in the platform authenticated shell. The Dashboard uses plain CSS progress bars (`<div style={{ width: pct% }}>`) for the Usage Snapshot.

**C29 Decision:** Build CSS/SVG horizontal bar charts inline in page components. No external chart library required for the scope.

---

## 6. Existing Saved-View / Export Infrastructure

**None.** No saved-view store, export modal, share modal, or schedule preview modal exists.

**C29 Action:** Create saved-view store using module-level `let _savedViews` pattern (same as `notification-center.service.ts`).

---

## 7. Existing Permission System

`PlatformContext` has `hasPermission(p: PlatformPermission)` where `PlatformPermission` is defined in `models/index.ts`. Current permissions include `view_documents`, `view_dashboard`, `manage_templates`, `verify_documents`, `manage_team`.

**C29 Action:** Add `view_reports` to `PlatformPermission` union and to `ROLE_PERMISSIONS` in models/index.ts. Sub-permissions for each report family will be gated by `view_reports` initially (single gate is appropriate for demo scope).

---

## 8. Existing Feature Flags

`PlatformFlags` in models/index.ts includes `dashboardEnabled`, `documentsEnabled`, `templatesEnabled`, `verificationEnabled`, `notificationsEnabled`, `teamEnabled`.

**C29 Action:** Add `reportsEnabled: boolean` to `PlatformFlags` and default it `true` in `PlatformContext.tsx`.

---

## 9. Existing Nav Configuration

`platform.nav.ts` PRIMARY_NAV has 6 items: Dashboard, Documents, Templates, Contacts, Verify Document, My Actions. No Reports item exists.

**C29 Action:** Add Reports to PRIMARY_NAV with `BarChart2` icon, `view_reports` permission, `reportsEnabled` flag.

---

## 10. Route / Router Status

`router.tsx` has no `/app/reports` family. `routes.ts` PLATFORM_ROUTES has no `/app/reports` entries.

**C29 Action:** Add 8 lazy-imported pages + routes to router; add 8 route metadata entries to routes.ts.

---

## 11. Privacy and Security Findings

- No reports, metrics, or aggregation outputs currently expose signatures, authentication secrets, field values, or personal My Actions data. ✓
- No existing reporting code writes to localStorage. ✓
- No URL query parameters in existing reports routes (none exist yet). ✓
- Private data in Documents uses ownerName (display name only — no raw email in URLs or metadata). ✓

**C29 Requirements:**
- All report query state via `useSearchParams` — only stable IDs, no emails, no signatures, no participant names
- Module-level saved views never persist to localStorage
- Report IDs in URL (/reports/:reportId) validated against known saved-view registry before render
- Team/sender filters use ID values only

---

## 12. Duplicate Calculation Risks

- Dashboard `StatusSummary` computes `completed`, `inProgress`, `needsAttention`, `draft` counts from `MockDashboardService` static fixture
- Document Operations Report will compute the same counts from `DOCUMENT_FIXTURES` directly
- **Decision:** These are separate concerns. Dashboard uses a scenario-based static snapshot; Reports compute live from fixture arrays. No shared aggregation function is needed between them. Reports will import `DOCUMENT_FIXTURES` directly.

---

## 13. Findings to Address

| Finding | Severity | Action |
|---|---|---|
| No `/app/reports` route exists | Blocker | Create all 8 routes in C29 |
| No reporting model | Blocker | Create `src/app/models/reports.ts` |
| No aggregation layer | Blocker | Inline in service |
| No saved-view store | Blocker | Module-level in service |
| No chart infrastructure | Blocker | CSS bars + SVG inline |
| `PlatformPermission` missing `view_reports` | Blocker | Add to models/index.ts |
| `PlatformFlags` missing `reportsEnabled` | Blocker | Add to models/index.ts and PlatformContext |
| Nav missing Reports item | Minor | Add to platform.nav.ts |
| routes.ts missing 8 entries | Minor | Add in C29 |
| Duplicate Usage metrics risk | Managed | Link to /settings/usage, don't duplicate |
| Dashboard summary separate from Reports | Managed | Dashboard stays static; Reports aggregate live |

---

## 14. eNotary Boundary Check

Searched for `enotary`, `notary`, `notarial`, `#67023B`, `Burgundy` across all existing platform authenticated pages and models — zero occurrences outside explicitly labeled eNotary public pages and models. ✓

**C29 Constraint:** No eNotary report family, metrics, rankings, or workflows. Burgundy is not used in any C29 file.

---

## 15. Legal and Ethical Findings

No existing authenticated platform page makes:
- Legal validity claims
- Productivity or ranking claims
- Fraud or identity-confidence claims
- Predictive legal outcomes

C29 must maintain these constraints across all report pages.
