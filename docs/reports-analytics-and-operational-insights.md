# Reports, Analytics, and Operational Insights Center

**Command:** 29  
**Status:** Complete  
**Routes:** `/app/reports` and sub-routes (8 pages)  
**Frontend only — fictional demonstration data — not connected to a production analytics backend**

---

## Overview

Command 29 builds the LAGDA Reports, Analytics, and Operational Insights Center. It provides workspace operators with directional visibility into document operations, participant workflows, template adoption, verification activity, and team/workspace patterns — all from fictional frontend demonstration data aggregated from existing domain fixtures.

This is **not** a live analytics system. All values are demonstration data only. A production version requires backend integration with a real reporting API.

---

## Routes

| Route | Component | Description |
|---|---|---|
| `/app/reports` | `ReportsOverviewPage` | Cross-family overview with workspace summary and family navigation |
| `/app/reports/documents` | `ReportsDocumentsPage` | Document Operations report |
| `/app/reports/participants` | `ReportsParticipantsPage` | Participants & Routing report |
| `/app/reports/templates` | `ReportsTemplatesPage` | Template Adoption report |
| `/app/reports/verification` | `ReportsVerificationPage` | Verification report |
| `/app/reports/teams` | `ReportsTeamsPage` | Workspace & Team Activity report |
| `/app/reports/saved` | `ReportsSavedPage` | Saved views management |
| `/app/reports/:reportId` | `ReportDetailPage` | Individual saved view detail |

All routes require `view_reports` permission and `reportsEnabled` feature flag.

---

## Report Families

### Document Operations (`/app/reports/documents`)
Volume, status distribution, completion direction, turnaround, delivery issues, and evidence availability across document transactions.

### Participants & Routing (`/app/reports/participants`)
Role distribution, routing-stage direction, bottleneck direction, authentication method distribution, consent metrics, and field completion direction.

### Template Adoption (`/app/reports/templates`)
Usage trends, frequently used templates, status distribution, and role-placeholder direction.

### Verification (`/app/reports/verification`)
Verification check direction, outcome distribution, coverage direction, and file match/mismatch simulation.

### Workspace & Team Activity (`/app/reports/teams`)
Workspace operational summary, team comparison, sender activity direction, and member participation direction.

---

## Architecture

### Models
`src/app/models/reports.ts` — Full typed model set including:
- Branded ID types (`ReportId`, `ReportViewId`, `ReportMetricId`, `ReportAnnotationId`)
- `ReportFamily`, `ReportDatePreset`, `ReportTrendDirection`, `ReportMetricCard`
- `ReportDistribution`, `ReportDistributionItem`, `ReportTimeSeries`, `ReportTable`
- `ReportSavedView`, `CreateSavedViewInput`, `ReportResult`
- `ReportExportPreview`, `ReportSharePreview`, `ReportSchedulePreview`
- `ReportQuery`, `DEFAULT_REPORT_QUERY`
- Family-specific data types: `DocumentOperationsData`, `ParticipantReportData`, `TemplateReportData`, `VerificationReportData`, `TeamActivityData`

### Service
`src/app/services/mock/reporting.service.ts` — Mock aggregation service:
- Exports a single `reportingService` object
- Saved views in module-level `_savedViews` array (no localStorage, no sessionStorage)
- Aggregates from `DOCUMENT_FIXTURES` for document/participant metrics
- Deterministic date range computation via `computeDateRange(preset)`
- All 5 family report builders: `getDocumentOperationsReport`, `getParticipantReport`, `getTemplateReport`, `getVerificationReport`, `getTeamActivityReport`
- Saved view CRUD: `createSavedView`, `renameSavedView`, `duplicateSavedView`, `setDefaultSavedView`, `archiveSavedView`, `restoreSavedView`, `removeSavedViewDemonstration`, `updateAnnotation`
- Preview generators: `getExportPreview`, `getSharePreview`, `getSchedulePreview`
- `resetDemonstration()` for workspace switch cleanup (called by consuming components)

### Shared UI Components
`src/app/pages/platform/reports/ReportsShared.tsx` — All shared UI primitives:
- `DemoBanner` — prominent demonstration notice
- `MemberPrivacyNotice` — required member reporting disclaimer
- `DataQualityNotices` — per-report quality notices
- `ReportFamilyNav` — family navigation tabs
- `DatePresetSelector` — URL-driven date preset buttons
- `MetricCard` / `MetricGrid` — summary metric display with trend indicators
- `DistributionChart` — CSS horizontal bar chart (no external library)
- `TimeSeriesChart` — CSS vertical bar chart
- `ReportTable` — accessible, sortable-column-header table
- `ExportPreviewPanel`, `SharePreviewPanel`, `SchedulePreviewPanel` — preview panels (no real operations)
- `CreateSavedViewPanel`, `AnnotationEditor` — saved view creation and annotation
- `SavedViewCard` — saved view list item with all actions
- `ReportsRestricted` — permission gate state
- `FamilyCard`, `FamilyIcon`, `SectionCard`, `SectionDivider`, `InsufficientDataState`

---

## Permissions

`view_reports` permission added to:
- `owner`
- `administrator`
- `template_administrator`
- `sender`
- `reviewer`
- `auditor`

NOT added to:
- `billing_administrator`
- `security_administrator`
- `viewer`

`reportsEnabled` feature flag: default `true` in `PlatformContext`.

---

## Saved Views

- Stored in module-level `let _savedViews: ReportSavedView[]` in `reporting.service.ts`
- Reset on page reload (no persistence — demonstration only)
- Pre-loaded with 4 demonstration views (3 active, 1 archived)
- Operations: create, rename, duplicate, set-default, archive, restore, remove-from-demo, annotate
- Accessible at `/app/reports/saved`
- Individual views accessible at `/app/reports/:reportId` (validated against registry)

---

## Export, Share, Schedule

All three operations show **preview panels only** — no file is generated, no link is created, no schedule is registered. Preview panels describe what a production version would do. This satisfies the demo requirement without misleading users or generating real data.

---

## Charts

All charts use CSS/SVG inline implementations — no external chart library. The two chart types:

1. **Distribution bar chart** (`DistributionChart`): Horizontal CSS bars with percentage labels. Accessible via `role="img"` + `aria-label` text summary + separate table alternative.
2. **Time series chart** (`TimeSeriesChart`): Vertical CSS bars with period labels. Accessible via `role="img"` + `aria-label` + text summary below.

Color system uses design tokens only: AZURE, GREEN, AMBER, RED, SLATE, NAVY, GOLD, VIOLET. **No Burgundy (#67023B) is used anywhere in C29.**

---

## Date Range System

URL-driven date presets via `useSearchParams`. Supported presets:
- `last-7-days`, `last-30-days`, `last-90-days`
- `current-month`, `previous-month`
- `current-quarter`, `previous-quarter`
- `current-year`
- `custom` (with `dateFrom`/`dateTo` params)

Default: `last-30-days`.

---

## Privacy and Safety Constraints

### Must Never Appear in Reports
- Raw participant names in report tables (aggregate only)
- Authentication evidence or OTP values
- Signature representations or canvas data
- Exact location coordinates or device fingerprints
- Field values filled by participants
- Personal My Actions data (separate system, `/app/inbox`)
- Cross-workspace data

### Member Activity Reporting
The Teams report includes a required privacy notice:

> "Member-level information is limited to operational workflow direction and should not be interpreted as a productivity, trust, identity, or legal-quality score."

This notice appears:
1. As `MemberPrivacyNotice` component before the member direction section
2. In `memberActivityNote` field of `TeamActivityData`
3. In `DataQualityNotices` for the `teams` family

### eNotary Boundary
- **No Burgundy (#67023B) is used in any C29 file** — verified in build output
- No eNotary report family exists
- No notarial metrics, rankings, or accreditation reports
- eNotary is a future separate product; its boundary is not crossed in any C29 component

---

## URL Security

- `reportId` in `/app/reports/:reportId` is validated with `/^sv_[a-zA-Z0-9_]+$/` before lookup
- Only existing saved view IDs resolve to data — unrecognized IDs show a not-found state
- Date preset values are validated against `VALID_DATE_PRESETS` via TypeScript type narrowing
- No private values (emails, participant names, field values) appear in URL parameters
- Query parameters cannot expand permissions or scope

---

## Dashboard Integration

`PlatformDashboard.tsx` has a `ReportsDirectionSection` component rendered when `canReports` is true. It shows:
- Description of the Reports Center
- Four quick-links to key report families
- Demonstration data disclaimer
- Uses the same `Card`/`SectionHeader` pattern as other dashboard sections

---

## Navigation

`platform.nav.ts` — Reports added to `PRIMARY_NAV`:
- `id: "reports"`, `icon: "BarChart2"`, `permission: "view_reports"`, `featureFlag: "reportsEnabled"`, `showOnMobile: false`

---

## Notification Integration

The Reports Center uses the existing `view_reports` permission for access control. No new notification types are introduced in C29. Reports-related notifications (e.g., "your scheduled report is ready") are deferred to backend integration.

---

## Domain Boundaries

| Domain | Reports Coverage | What Reports Does NOT Cover |
|---|---|---|
| Document Operations | Volume, status, completion, turnaround | Individual participant authentication |
| Participants | Role aggregates, routing stages, auth methods | Names, field values, signatures |
| Templates | Usage counts, status | Template field content |
| Verification | Check outcomes, match direction | File content, identity evidence |
| Teams | Workspace totals, team comparison | Productivity scores, trust scores |
| Usage/Billing | Not covered (link to /settings/usage) | Plan consumption, billing |
| Activity Log | Not covered (link to /workspace/activity) | Admin event log |
| My Actions | Not covered (link to /app/inbox) | Personal signing queue |
| eNotary | Not covered (eNotary is a future separate product) | — |

---

## Backend Handoff Requirements

See `docs/backend-integration-handoff.md` — Reporting and Analytics section.

Key backend requirements for production Reports Center:
1. **Reporting API** — GET `/api/v1/reports/{family}?workspace_id=...&from=...&to=...`
2. **Saved views persistence** — CRUD on `/api/v1/report-views` (user-scoped)
3. **Export generation** — POST `/api/v1/reports/{family}/export` (async, returns download URL)
4. **Share tokens** — POST `/api/v1/reports/{family}/share` (returns time-limited view URL)
5. **Scheduled reports** — POST `/api/v1/reports/schedules` (configures recurring delivery)
6. **Permission enforcement** — `view_reports` scope enforced server-side
7. **Workspace isolation** — All queries scoped to `workspace_id` from authenticated session
8. **Privacy filtering** — No participant names, authentication evidence, or field values in report outputs
9. **Member activity** — Server must enforce same disclaimer notice before returning member-level aggregates

---

## Files Created or Modified

### New Files
- `docs/reports-and-analytics-audit.md` — Pre-implementation audit
- `src/app/models/reports.ts` — All typed models
- `src/app/services/mock/reporting.service.ts` — Mock aggregation service
- `src/app/pages/platform/reports/ReportsShared.tsx` — Shared UI components
- `src/app/pages/platform/reports/ReportsOverviewPage.tsx` — Overview page
- `src/app/pages/platform/reports/ReportsDocumentsPage.tsx` — Documents report
- `src/app/pages/platform/reports/ReportsParticipantsPage.tsx` — Participants report
- `src/app/pages/platform/reports/ReportsTemplatesPage.tsx` — Templates report
- `src/app/pages/platform/reports/ReportsVerificationPage.tsx` — Verification report
- `src/app/pages/platform/reports/ReportsTeamsPage.tsx` — Teams report
- `src/app/pages/platform/reports/ReportsSavedPage.tsx` — Saved views
- `src/app/pages/platform/reports/ReportDetailPage.tsx` — Saved view detail

### Modified Files
- `src/app/models/index.ts` — Added `view_reports` permission, `reportsEnabled` flag
- `src/app/context/PlatformContext.tsx` — `reportsEnabled: true` in `DEFAULT_PLATFORM_FLAGS`
- `src/app/config/platform.nav.ts` — Added Reports nav item
- `src/app/config/routes.ts` — Added 8 route metadata entries
- `src/router.tsx` — Added 8 lazy imports and route registrations
- `src/app/pages/platform/PlatformDashboard.tsx` — Added `ReportsDirectionSection`

---

## Build

All 8 report pages build successfully as separate lazy-loaded chunks. TypeScript: 0 errors. Gzip sizes: individual family pages 2–4 kB; shared components 15 kB.
