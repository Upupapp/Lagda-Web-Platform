# Templates and Reusable Workflows

Command 21 — shipped 2026-07-15.

## Overview

The Templates module lets workspace members build, manage, and reuse document signing workflows. A template captures document configuration, role placeholders, routing, authentication requirements, field placement, and custom variables — so the same workflow can be instantiated repeatedly without re-configuring from scratch.

This is a **frontend-only** demonstration. All data is in-memory fixtures that reset on page reload. No documents are fetched, no PDFs rendered, no backend calls made. Every fixture carries `demonstrationOnly: true`.

---

## Route Family

All routes live under `/app/templates`.

| Route | Page | Layout |
|---|---|---|
| `/app/templates` | Template library (grid + list views) | Platform |
| `/app/templates/new` | Create template | Platform |
| `/app/templates/:templateId` | Template detail | Platform |
| `/app/templates/:templateId/edit` | Tab editor (7 tabs) | Platform |
| `/app/templates/:templateId/fields` | Field placement editor | Fullscreen |
| `/app/templates/:templateId/preview` | Read-only preview | Platform |
| `/app/templates/:templateId/use` | Use Template wizard | Platform |

---

## Architecture

### Models (`src/app/models/templates.ts`)

Core types:

- **`DocumentTemplate`** — full template record with all configuration, documents, role placeholders, fields, variables, validation errors
- **`TemplateListItem`** — lightweight list shape (no fields array)
- **`TemplateRolePlaceholder`** — named role slot (label, role, routingStep, authMethod override)
- **`TemplateField`** — extends `FieldDefinition` with `placeholderId` instead of `participantId`
- **`TemplateVariable`** — named variable injected at use-time (text/date/number/boolean/select)
- **`TemplateInstantiationResult`** — returned by `instantiateTemplate()`

Enums: `TemplateStatus` (draft/available/archived), `TemplateScope` (personal/workspace/organization), `TemplateCategory` (14 categories), `TemplateView` (my-templates/workspace/favorites/recent/all/archived).

### Fixtures (`src/app/data/mock/templates.ts`)

7 demonstration templates:

| ID | Name | Status | Scope | Category |
|---|---|---|---|---|
| `TPL_ENGAGEMENT_STANDARD` | Client Engagement Agreement | available | workspace | Legal Services |
| `TPL_VENDOR_AGREEMENT` | Vendor Agreement | available | workspace | Vendor Management |
| `TPL_POLICY_ACKNOWLEDGMENT` | Policy Acknowledgment Form | available | workspace | HR |
| `TPL_PROFESSIONAL_SERVICES` | Professional Services Agreement | draft | personal | Contracts |
| `TPL_PROCUREMENT_APPROVAL` | Procurement Approval Chain | available | workspace | Procurement |
| `TPL_ONBOARDING_PACKAGE` | Employee Onboarding Package | draft | workspace | HR |
| `TPL_NDA_ARCHIVED` | Standard NDA | archived | personal | Legal Services |

### Service (`src/app/services/mock/templates.service.ts`)

In-memory service with `SESSION_MUTATIONS` Map for write operations (reset on page reload).

Key operations:
- `listTemplates(query)` — filters, search, sort, pagination
- `getTemplateById(id)` — resolves mutations over base fixtures
- `getTemplateActionAvailability(template)` — 10 contextual actions
- `validateTemplate(template)` — returns field-level validation errors
- `makeTemplateAvailable` / `returnTemplateToDraft` / `archiveTemplate` / `restoreTemplate` — status transitions
- `duplicateTemplate(id)` — clones as personal draft in session
- `saveTemplateFields(id, fields)` — persists field state in session
- `instantiateTemplate(...)` — returns fictional `prepDraftId` and start route
- `createBlankTemplate(name, category)` — creates blank draft in session

### Context (`src/app/context/TemplateContext.tsx`)

`TemplateProvider` wraps the library and detail pages. `useTemplates()` exposes:

```typescript
{
  query, setQuery,
  listResult, listLoading, listError,
  activeTemplate, activeLoading, activeError,
  activeActions, activeValidation,
  pendingOp, pendingMessage, pendingError,
  asyncLoadList, asyncLoadTemplate,
  asyncMakeAvailable, asyncReturnToDraft, asyncArchive, asyncRestore,
  asyncDuplicate, asyncInstantiate,
}
```

---

## Pages

### TemplatesPage

Library view with:
- **Views bar**: My Templates / Workspace / Favorites / Recent / All / Archived
- **Search**: 280ms debounce, filters list in real time
- **Filter panel**: status chips, category multi-select, scope toggle
- **Sort**: name / created / updated / usage count, asc/desc
- **Grid / list toggle**
- Pagination at 20 per page
- Empty states for no results and no templates in view

### CreateTemplatePage

Four source cards — only "Blank" is enabled in this demonstration. Submitting the blank form calls `asyncCreateBlank()` then navigates to the new template's edit page.

### TemplateDetailPage

Full detail view with:
- Status badge + action strip (10 contextual actions)
- Op feedback toasts (success / error)
- Validation issues panel (collapsible)
- Description, tags, role placeholders
- Documents list
- Fields summary (count per document)
- Variables list
- Side panel: ownership details, usage statistics

### TemplateEditPage

7-tab editor:

| Tab | Editable in demo |
|---|---|
| Details | Name, description, tags, category, scope |
| Documents | Read-only (demo) |
| Roles | Read-only (demo) |
| Routing | Mode (sequential / parallel / approval-based) |
| Auth | Global default + per-role overrides |
| Settings | Expiry days, reminders, redirect URL, notification flags |
| Variables | Read-only (demo) |

"Save Changes" gives in-session feedback only. No persistence beyond session.

### TemplateFieldsPage

Full-screen dark-themed field placement editor (same pattern as the Prepare workflow's FieldsPage). Self-contained `useReducer` — does not use the C19 `FieldEditorContext` (that context is tightly coupled to `PreparationDraft` initialization and is not reusable here).

Features:
- Fictional page backgrounds
- Click-to-place fields on the canvas
- Drag to reposition
- Right panel: field type picker + property editor (label, required, placeholder, help text, size, validation)
- Assign-to role bar using `PARTICIPANT_ACCENT_COLORS`
- Save persists fields to `SESSION_MUTATIONS` via `saveTemplateFields()`

### TemplatePreviewPage

Read-only preview with:
- Fictional page canvases with field overlays (color-coded by placeholder role)
- Routing diagram with step arrows
- Side panels: role placeholders, routing config, variables, settings snapshot

### UseTemplatePage

3-step wizard:

1. **Map Roles** — assign a real participant (name + email + phone) to each role placeholder
2. **Enter Variables** — fill required template variables
3. **Review & Launch** — summary of all assignments, calls `asyncInstantiate()` on confirm

Success screen shows fictional `prepDraftId` with a link to the (fictional) draft. Templates with `status !== "available"` redirect to the detail page on mount.

---

## Design Notes

- Brand colors: `#07111F` (NAVY), `#0078D4` (AZURE), `#C9960C` (GOLD)
- **No Burgundy (#67023B) anywhere** — Burgundy is eNotary only; this module is entirely eSignature
- Inline styles only (no Tailwind in JSX)
- All demo-only text shown with a `demonstrationOnly` prop / yellow banner

---

## Reused Constants

From `src/app/models/prepare.ts`:
- `PrepParticipantRole`, `PrepAuthMethodId`
- `PREP_PARTICIPANT_ROLE_LABELS`, `PREP_AUTH_METHODS`

From `src/app/models/field-editor.ts`:
- `FIELD_TYPE_LABELS`, `FIELD_TYPE_ICONS`, `FIELD_TYPE_GROUPS`
- `FIELD_SIZE_CONSTRAINTS`, `RESIZE_HANDLES`
- `defaultFieldRect`, `PARTICIPANT_ACCENT_COLORS`
