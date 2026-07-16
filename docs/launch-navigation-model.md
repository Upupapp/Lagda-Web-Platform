# Launch Navigation Model

**Version:** C35  
**Date:** 2026-07-16

---

## Navigation Architecture

LAGDA uses a two-tier navigation model: a public marketing site and an authenticated platform app. They share no navigation components.

---

## Public Site Navigation

### Top Navigation (public shell)
```
LAGDA (logo / home)
Products → eSignature, eNotary (Coming Soon)
Features → (sub-menu: 16 features)
Solutions → (sub-menu: 11 industry verticals)
Security
Resources → Blog, Guides, Case Studies, Changelog
Pricing
[ Sign In ]  [ Get Started ]
```

### Footer Navigation (public)
- Company, Product, Legal, Contact
- Social links
- "Active in Demonstration" disclosure notice
- Philippine law references (RA 8792, Rules on Electronic Evidence)

---

## Platform Navigation (Authenticated)

### Structure

The platform uses a sidebar navigation (`PlatformSidebar`) with:
- Primary nav items (main app sections)
- A workspace switcher header
- User menu and settings at bottom
- Collapse/expand on mobile

### Primary Nav Items

All nav items are defined in `src/app/config/platform.nav.ts`. Items are filtered at render time by:
1. `hasPermission(item.permission)` — user must have the required permission
2. `flags[item.featureFlag]` — the feature flag must be `true` (if specified)

| Order | Label | Path | Permission | Feature Flag | Default Visible |
|---|---|---|---|---|---|
| 1 | Dashboard | /app/dashboard | view_dashboard | — | ✅ Always |
| 2 | Documents | /app/documents | view_documents | — | ✅ Always |
| 3 | Templates | /app/templates | manage_templates | — | ✅ (sender+) |
| 4 | Contacts | /app/contacts | manage_contacts | — | ✅ (sender+) |
| 5 | Verify | /app/verify | verify_documents | — | ✅ Always |
| 6 | My Actions | /app/inbox | (none) | — | ✅ Always |
| 7 | Reports | /app/reports | view_reports | — | ✅ (admin+) |
| 8 | Automation | /app/automation | view_workflow_automation | automationEnabled | 🚫 Off by default |

**Automation is hidden by default** because `automationEnabled: false` in `DEFAULT_PLATFORM_FLAGS`. In `enterprise-preview` profile with `automationEnabled: true`, it appears for users with `view_workflow_automation` permission.

---

## Role-Based Nav Visibility

### Owner
All 8 nav items visible (when Automation is enabled)

### Administrator
All 8 nav items visible (when Automation is enabled)

### Sender
- Dashboard ✅
- Documents ✅
- Templates ✅
- Contacts ✅
- Verify ✅
- My Actions ✅
- Reports ✅
- Automation ✅ (if enabled and has permission)

### Viewer
- Dashboard ✅
- Documents ✅ (read-only)
- Verify ✅
- My Actions ✅

---

## Breadcrumb Model

`PageHeader` renders breadcrumbs for all platform pages. Breadcrumb items are passed by each page component. Format:

```
Dashboard > Documents > [Document Title] > Audit Trail
```

The platform shell does not auto-generate breadcrumbs — each page defines its own `BreadcrumbItem[]` array.

---

## Mobile Navigation

`MobileNav` renders a bottom-sheet menu on screens < 768px. It respects the same permission + feature flag gates as the sidebar.

Automation is hidden from mobile nav regardless of profile (`showOnMobile: false` in nav config).

---

## Secondary Navigation (Within Pages)

Some pages have their own tab-based secondary navigation:

| Section | Tabs |
|---|---|
| Transaction Detail | Overview, Recipients, Audit Trail, Fields, History |
| Workspace Admin | Members, Roles, Teams, Audit Log, Branding, Usage, Billing, Danger |
| Settings | Profile, Account, Security, Notifications, Signatures, Billing, Plan, Integrations, API, Webhooks, Appearance, Language, Data, Danger |
| Reports | Signing Activity, Completion Rates, Turnaround Time, Recipient Performance, Template Usage, Team Performance, Compliance |

---

## Navigation Source of Truth

- **Nav item definitions:** `src/app/config/platform.nav.ts`
- **Nav rendering:** `src/app/components/platform/PlatformSidebar.tsx`
- **Feature flags:** `src/app/context/PlatformContext.tsx` (DEFAULT_PLATFORM_FLAGS)
- **Permissions:** `src/app/models/index.ts` (ROLE_PERMISSIONS)
- **Mobile nav:** `src/app/components/platform/MobileNav.tsx`
