# Documents Workspace — Command 15

Reference documentation for the authenticated `/app/documents` workspace.

---

## 1. Documents Workspace Purpose

The Documents Workspace is the primary screen where authenticated users view, search, filter, sort, and manage their eSignature document transactions. It is an eSignature-only feature; eNotary documents are out of scope.

---

## 2. Canonical Route

`/app/documents` — lists the workspace.
`/app/documents/new` — prepare flow (Command 16 target, currently PlatformPlaceholder).
`/app/documents/:id` — document detail (Command 16 target, currently PlatformPlaceholder).

---

## 3. Route and Query-State Design

Query state is managed entirely in the URL using `useSearchParams()` from react-router.

| Param | Values | Default | Notes |
|---|---|---|---|
| `view` | DocumentView | `all` | Validated against VALID_DOCUMENT_VIEWS |
| `q` | string | `""` | Title/owner search |
| `folder` | folder ID | none | Validated against VALID_FOLDER_IDS (invalid → ignored) |
| `tag` | tag ID | none | Validated against VALID_TAG_IDS (invalid → ignored) |
| `sort` | DocumentSortField | `updated` | Validated against VALID_SORT_FIELDS |
| `dir` | `asc` \| `desc` | `desc` | Any other value → `desc` |
| `page` | integer | `1` | Non-integer or ≤ 0 → 1 |
| `scenario` | DocumentScenario | `standard` | Dev override only |

All URL params are validated via `parseQuery()` in DocumentsPage.tsx before use. Invalid values silently fall back to defaults — they never propagate to the service layer.

---

## 4. Information Architecture

```
PageHeader (title: Documents, action: Prepare Document)
  ViewTabStrip (9 tabs with live counts)
  Toolbar (SearchBar | SortControl | Refresh)
  ActiveFilterChips (when filters are active)
  Layout
    FolderPanel (sidebar, hidden on ≤ 900px)
    Main content
      SelectionBar (when items are selected)
      [loading]       → SkeletonDocRows
      [full-error]    → DocErrorView + Retry
      [empty]         → DocEmptyView (context-aware)
      [ready + items] → DocumentTable (desktop) / DocumentCardList (mobile) + PaginationControls
  RenameDraftDialog (overlay, when rename action triggered)
```

---

## 5. Page Header

- Title: "Documents"
- Primary action: "Prepare Document" (link to `/app/documents/new`) — gated behind `prepare_documents` permission.
- Implemented via `PageHeader` from `src/app/components/platform`.

---

## 6. Document Views

| View | Label | Filter logic |
|---|---|---|
| `all` | All Documents | status ≠ archived |
| `needs-attention` | Needs Attention | awaiting-signature, partially-completed, failed-delivery, declined |
| `drafts` | Drafts | draft, ready-to-send |
| `in-progress` | In Progress | sent, delivered, viewed, authentication-completed, awaiting-signature, awaiting-approval, partially-completed |
| `awaiting-my-action` | Awaiting My Action | awaiting-signature where `isMyAction === true` |
| `completed` | Completed | completed |
| `expiring` | Expiring | active status + expiresAt ≤ now + 14 days + not yet expired |
| `failed-delivery` | Failed Delivery | failed-delivery |
| `archived` | Archived | archived |

View counts appear as badges on the tab strip, computed from the full unfiltered dataset via `getViewCounts()` in the service.

---

## 7. Search

- `SearchBar` component — input type="search" with a label (visually hidden).
- Searches `item.title` and `item.ownerName` only. Never searches document content.
- Triggered on each keystroke; updates URL `?q=` param.
- Clear button (×) appears when a value is present.
- No sensitive terms are logged or stored.

---

## 8. Filters

Active in this command:
- **Folder filter** — via FolderPanel sidebar click (sets `?folder=`).
- **Tag filter** — not yet a separate control; accessible via bulk-tag flow. URL `?tag=` supported.
- **Search** — via `?q=`.

`VIEW_STATUS_SET` in `models/documents.ts` defines which statuses each view covers — this is the centralized filter source for the service.

---

## 9. Active Filter Summary

`ActiveFilterChips` renders one chip per active filter (`q`, `folderId`, `tagId`). Each chip shows a readable label and an × remove button. "Clear all" removes all three at once.

---

## 10. Sorting

`SortControl` shows the current sort field; clicking opens a dropdown listing all sort options.

| Field | Label | Notes |
|---|---|---|
| `updated` | Last Updated | Default |
| `created` | Date Created | |
| `title` | Title (A–Z) | locale-aware |
| `status` | Status | lexicographic |
| `expiry` | Expiry Date | null → Infinity (sorted last) |

Clicking the currently active field toggles direction. Clicking a new field defaults to `desc`.

---

## 11. Desktop Results Table

`DocumentTable` renders with `role="table"` and full ARIA semantics:
- `role="rowgroup"` for header and body.
- `role="columnheader"` for each header cell.
- `role="row"` for each document row.
- `role="cell"` for each data cell.

Columns: ☐ | Document (title + tags + expiry + verification) | Status | Progress | Updated | ⋯

The "Updated" column hides at ≤ 900px via `.doc-col-updated { display: none }`.
The entire table is replaced by card list at ≤ 640px.

---

## 12. Mobile Results Presentation

`DocumentCardList` renders as a `<ul>` (`aria-label="Documents"`) with `<li>` per document. Hidden at > 640px via `display: none` CSS — not rendered in DOM simultaneously with the desktop table (no duplicate content accessible to screen readers).

Each card shows: checkbox, title (truncated), status badge, participant progress, updated date, expiry note, and action menu.

---

## 13. Document List Items

Type: `DocumentListItem` in `src/app/models/documents.ts`.

Fields beyond `DocumentTransactionSummary`: `participants` (preview array, names only), `ownerName`, `folderIds`, `tags`, `verificationId`, `verificationStatus`, `isMyAction`, `preArchiveStatus`.

No document content, no email, no phone, no IP, no device, no location.

---

## 14. Participant Progress

`ParticipantProgress` renders:
- A `role="meter"` div with `aria-valuenow`, `aria-valuemin`, `aria-valuemax`, `aria-label`.
- A text label "N/M" alongside the meter.
- Status is never communicated by color alone.

---

## 15. Verification State

`VerificationBadge` shows a shield icon when `verificationStatus === "available"` or `"viewed"`. It uses `aria-label` to describe the state. Never shown for eNotary — verification here means document authenticity (hash-based), not notarization.

---

## 16. Row Actions

`RowActionMenu` renders:
- A trigger `<button>` with `aria-haspopup="menu"` and `aria-expanded`.
- A popup `role="menu"` with `role="menuitem"` items.
- ESC closes the menu and returns focus to the trigger.
- Outside mousedown closes the menu.

Actions available per document:

| Action | Availability |
|---|---|
| View | Always |
| Continue Editing | draft + canPrepare |
| Rename | draft + canPrepare |
| View Activity | Always |
| Participants | participantCount > 0 and not draft |
| View Evidence | verificationStatus=available + canVerify |
| Archive | Completed/declined/expired/voided/failed-delivery |
| Restore | status=archived |

**No eNotary actions exist here.** No "Apply as Notary", no "Notarial Register", no "Electronic Seal".

---

## 17. Multi-Select

- Each row has a `<input type="checkbox">` with `aria-label="Select <title>"`.
- `selectedIds` is a `Set<string>` in component state.
- `SelectionBar` appears (aria-live="polite") when any item is selected.
- "Select all N visible" selects items on the current page only.
- Query changes (view, search, etc.) clear selection.
- Workspace switch clears selection.

---

## 18. Bulk Actions

Available in `SelectionBar`:
- **Archive** (requires `prepare_documents`) — calls `mockDocumentService.archive(ids)` then reloads.
- **Add Tag** (requires `prepare_documents`) — opens an inline tag picker dropdown; calls `mockDocumentService.addTag(ids, tagId)` then reloads.

Archive does not claim deletion or storage reduction. No backend persistence claim is made.

---

## 19. Folders

`FolderPanel` (desktop sidebar, 220px, hidden at ≤ 900px):
- Lists all workspace folders with live document counts.
- "All Folders" item deselects folder filter.
- Clicking a folder sets `?folder=folderId` in URL.
- Clicking the active folder deselects it.
- Invalid folder IDs in URL are silently ignored.
- Workspace switch clears invalid folder state (query reset on ws change).
- Frontend-only: no persistence, no drag-and-drop, no folder creation in this command.

---

## 20. Tags

`TagChip` renders a pill with the tag name (color is decorative, never the only indicator).

Tags can be filtered via `?tag=tagId` URL param. Bulk add-tag is accessible from the SelectionBar. Individual tag management (create/delete) is deferred to a future command.

---

## 21. Archive and Restore

Archive sets `item.status = "archived"` and saves `preArchiveStatus` in-memory. Restore reverses this. Changes are lost on page refresh (no backend).

Archive does not claim deletion. Archive does not appear for active workflows (sent, awaiting-signature, etc.) — only terminal statuses. The "Archived" view shows archived documents only.

---

## 22. Rename Draft

`RenameDraftDialog` is a `role="dialog" aria-modal="true"` overlay:
- Appears when "Rename" is selected from a draft's action menu.
- Input is focused and selected on open.
- ESC or backdrop click cancels.
- Enter key submits.
- Title capped at 200 characters (service enforces).
- Not rendered as plain text/innerHTML — safe from XSS.

---

## 23. Pagination

`PaginationControls` renders with `<nav aria-label="Pagination">`. Shows "Showing X–Y of N" and Prev/Next buttons.

Page size: 20 per page (set in service as `PAGE_SIZE`). Pagination only appears when there are multiple pages. Query changes reset page to 1.

---

## 24. Empty States

| Context | Component | Description |
|---|---|---|
| New workspace | `DocEmptyView` | "No documents yet" + Prepare action (if permitted) |
| Filtered, no results | `DocEmptyView` | "No matching documents" + Clear filters |
| Archived view, empty | `DocEmptyView` | "No archived documents" |
| Expiring view, empty | `DocEmptyView` | "No documents expiring soon" |
| Awaiting My Action, empty | `DocEmptyView` | "No pending actions" |

---

## 25. Loading States

`SkeletonDocRows` renders 5 skeleton rows with `SKELETON_STYLE` pulse animation. `role="status" aria-label="Loading documents"` for screen reader announcements. Motion is static under `prefers-reduced-motion: reduce`.

---

## 26. Partial Errors

The `"partial-error"` scenario is not separately rendered in the list UI (the service layer handles it by returning whatever data is available). The `DocumentListResult` interface has no partial-error flag — partial failures at the section level are deferred to Command 16 (detail page).

---

## 27. Full Error State

`DocErrorView` renders with `role="alert"`. Shows a description that no live network service is required (demo context). Includes a "Retry" button that increments `loadKey` to retrigger the load effect.

---

## 28. Read-Only and Restricted States

Users without `view_documents` see `AccessDeniedView` (EmptyStateLayout with ShieldCheck icon). No list data is loaded or displayed.

The "Prepare Document" header action is hidden for users without `prepare_documents`. Archive/restore in SelectionBar are hidden without `prepare_documents`. Tag actions are hidden without `prepare_documents`.

---

## 29. Workspace Switching

`currentWorkspace?.id` is included in the load `useEffect` deps. Switching workspace resets the document list (loadState → loading, selectedIds → empty, openMenuId → null). Invalid folder/tag from the previous workspace are ignored by the service (validated against VALID_FOLDER_IDS / VALID_TAG_IDS).

---

## 30. Query Validation

All URL params are validated in `parseQuery()` before being passed to the service:
- `view`: validated against `VALID_DOCUMENT_VIEWS`
- `sort`: validated against `VALID_SORT_FIELDS`
- `dir`: only `asc` | `desc` accepted
- `page`: must be positive integer
- `folder`: validated by service against `VALID_FOLDER_IDS`
- `tag`: validated by service against `VALID_TAG_IDS`
- `scenario`: validated against `VALID_DOC_SCENARIOS`

Unknown values fall back to defaults silently.

---

## 31. Document Status Model

Defined in `src/app/models/index.ts` (`TransactionStatus`, `TRANSACTION_STATUS_LABELS`). Documents workspace does NOT create a second status union — it imports the canonical model.

Display mapping: `DOCUMENT_STATUS_TONE` (models/documents.ts) maps each status to a `StatusTone`, and `STATUS_TONE_CSS` maps each tone to bg/text/border hex values. StatusBadge renders text + color. Color is never the only indicator.

---

## 32. Action Availability Model

`getDocActions()` in DocumentsPage.tsx centralizes all row action logic. It accepts the item, `canPrepare`, and `canVerify` booleans, and returns an ordered array of available actions.

`ARCHIVABLE_STATUSES` defines which terminal statuses can be archived.

---

## 33. Typed Document Models

| File | Exports |
|---|---|
| `src/app/models/documents.ts` | DocumentView, DocumentListQuery, DocumentListItem, DocumentFolder, DocumentTag, DocumentListResult, DocumentScenario, DocumentActionId, StatusTone, STATUS_TONE_CSS, DOCUMENT_STATUS_TONE, VIEW_LABELS, VIEW_STATUS_SET, ACTIVE_TRANSACTION_STATUSES, VALID_DOCUMENT_VIEWS, VALID_SORT_FIELDS, SORT_LABELS, DEFAULT_QUERY, VALID_DOC_SCENARIOS |
| `src/app/models/index.ts` | TransactionStatus, TRANSACTION_STATUS_LABELS, DocumentTransactionSummary (reused) |

---

## 34. Document Service Boundary

`src/app/services/mock/document.service.ts` exports `mockDocumentService` (singleton).

Public API:
- `list(query, scenario?)` → `Promise<DocumentListResult>`
- `getFolders()` → `Promise<DocumentFolder[]>`
- `getTags()` → `Promise<DocumentTag[]>`
- `archive(ids)` → `Promise<void>`
- `restore(ids)` → `Promise<void>`
- `renameDraft(id, title)` → `Promise<void>`
- `addTag(ids, tagId)` → `Promise<void>`
- `moveToFolder(ids, folderId)` → `Promise<void>`
- `reset()` → `void`

All methods return Promises (mock delays via `delay()`). Replacing this service with a real HTTP client in a future command requires no changes to DocumentsPage.tsx.

---

## 35. Mock Document Scenarios

| Scenario | Behaviour |
|---|---|
| `standard` | 8 fixture documents (default) |
| `new-workspace` | Returns empty list |
| `large-set` | ~48 documents (fixtures × 6 + base), tests pagination |
| `partial-error` | Service returns normally (no partial-error in list; see C16) |
| `full-error` | Service throws; page shows full-error state |

Activate via `?scenario=<name>` in the URL.

---

## 36. Mock Data

| File | Contents |
|---|---|
| `src/app/data/mock/documents.ts` | `DOCUMENT_FOLDERS` (5), `DOCUMENT_TAGS` (6), `DOCUMENT_FIXTURES` (8 DocumentListItem records), `VALID_FOLDER_IDS`, `VALID_TAG_IDS`, `VALID_ITEM_IDS` |
| `src/app/data/mock/index.ts` | `MOCK_TRANSACTIONS` (used by Dashboard + notification linkPaths; IDs txn_001–006 match `DOCUMENT_FIXTURES`) |

Fixture IDs txn_001–008 are used in:
- Dashboard "Needs Attention" attention items (txn_001, txn_005)
- Dashboard "Recent Documents" list
- Notification `linkPath` values (`/app/documents/txn_001` etc.)
- Documents workspace fixture records

---

## 37. Date Formatting

Native `Date` API only — no external library. Two formatters in DocumentsPage.tsx:
- `fmtRelative(iso)` — "Just now", "2h ago", "3d ago", "Jul 14"
- `fmtShort(iso)` — "Jul 14, 2026"

`date-fns` (v3.6.0) is installed but not used in this command.

---

## 38. Accessibility Behavior

- Single `<h1>` via PageHeader.
- View tabs: `role="tablist"`, `role="tab"`, `aria-selected`.
- Sort dropdown: `aria-haspopup="listbox"`, `role="listbox"`, `role="option"`.
- Table: `role="table"`, `role="rowgroup"`, `role="columnheader"`, `role="row"`, `role="cell"`, `aria-label="Documents"`.
- Checkboxes: `<input type="checkbox">` with `aria-label`.
- Selection bar: `aria-live="polite"` for count updates.
- Action menus: `aria-haspopup="menu"`, `aria-expanded`, `role="menu"`, `role="menuitem"`, ESC to close + focus return.
- Folder panel: `<nav aria-label="Document folders">`, `aria-current`.
- Meter: `role="meter"`, `aria-valuenow/min/max/label`.
- Dialog: `role="dialog"`, `aria-modal="true"`, `aria-labelledby`, focus on open.
- Error: `role="alert"` for full-error state.
- Status badge: always includes text, not color-only.
- Progress: always includes "N/M" text, not meter-only.
- `prefers-reduced-motion`: skeleton pulse reduced, transitions removed.

---

## 39. Responsive Behavior

| Breakpoint | Changes |
|---|---|
| > 900px | Full layout: folder panel + table with all columns |
| ≤ 900px | Folder panel hidden; "Updated" column hidden |
| ≤ 640px | Desktop table hidden; mobile card list shown |
| 320–640px | Full card list, search wraps, tabs scroll horizontally |

No full-page horizontal scrolling introduced.

---

## 40. Motion and Reduced-Motion

`SKELETON_STYLE` (imported from AppContentLayout) provides the skeleton pulse animation. Under `prefers-reduced-motion: reduce`, the pulse is set to static opacity (no movement). Row hover transition is removed under reduced motion. No other animation is used in this command.

---

## 41. Performance Decisions

- DocumentsPage is lazy-loaded as its own Vite chunk: `DocumentsPage-*.js` = 43KB (11.8KB gzip).
- No heavy data-grid library. Custom role="table" semantics.
- No virtualization — fixture dataset is small (≤ 48 in large-set scenario); PAGE_SIZE = 20.
- Desktop table and mobile cards are CSS-hidden from each other (`display: none`), not both rendered as live DOM. Neither is keyboard-accessible while hidden.
- Stale-result guard: `cancelled` flag in useEffect prevents state updates from resolved stale Promises.
- Date formatting: two stable named functions, not inline lambdas in render loops.
- Action menu state: `openMenuId` (string | null) prevents re-rendering the entire list for menu open/close on individual rows.
- No global `window` event listeners leak: all event listeners added in `useEffect` are removed in the cleanup return.
- No image assets. No layout shift from images.

---

## 42. Client-Side Security and Privacy

- No passwords, OTPs, recovery codes, invitation tokens, or reset tokens.
- No IP addresses, device details, or exact location in list items.
- No confidential document content in the list view.
- No real customer data. All names and organizations are fictional.
- Participant names are display-only (no email, phone, or ID numbers in list).
- Tag/folder mutations use `VALID_FOLDER_IDS` / `VALID_TAG_IDS` sets to reject arbitrary IDs.
- Title rename capped at 200 characters; stored as a plain string (no innerHTML).
- URL params are validated before use — cannot alter permissions or workspace role.
- `scenario` param accepted only from `VALID_DOC_SCENARIOS`.
- Frontend permission checks (canPrepare, canVerify) gate UI presentation only; they are not security enforcement.
- No live network request required.

---

## 43. eSignature and eNotary Separation

The Documents Workspace is for eSignature transactions only.

**Not present and must never be added here:**
- eNotary document type
- Notarial document status
- Notary Public participant role
- Electronic seal
- Notarial register
- Accreditation folder
- eNotary filter or bulk action
- eNotary verification badge
- Burgundy (#67023B) as any UI color

Verification (ShieldCheck badge) refers to document authenticity verification (hash-based), not notarization.

If an eNotary informational link is needed, it belongs in Help or Product Updates and must state: "LAGDA eNotary is Coming Soon and Subject to Supreme Court Accreditation and applicable rules."

---

## 44. Route Metadata

Entry in `src/app/config/routes.ts` → `PLATFORM_ROUTES`:

```typescript
{
  path: "/app/documents",
  title: "Documents | LAGDA",
  description: "View, search, and manage your document transactions in LAGDA eSignature.",
  breadcrumb: "Documents",
  section: "platform",
  product: "esignature",
  layout: "platform",
  requiresAuth: true,
  isPublic: false,
  isIndexable: false,
  status: "implemented",
  analyticsName: "platform_documents",
}
```

`isIndexable: false` ensures this route is excluded from the public sitemap and receives `noindex, nofollow` robots meta. Search terms, filter values, workspace names, and document titles are never inserted into page metadata.

---

## 45. Testing Coverage

No test framework (Vitest/Jest) is installed. Tests documented aspirationally. See Steps 42 in the Command 15 specification for the full test matrix (routes, headers, views, search, filters, sort, results, row actions, selection, folders, tags, archive, pagination, states, accessibility, security).

---

## 46. Deferred Backend Functionality

Not implemented (frontend-only):
- Production backend API
- Real document storage, upload, or download
- Real PDF viewer
- Real signing flows
- Real participant notifications / email / SMS delivery
- Real OTP or audit persistence
- Real document verification (hash / QR scanning)
- Real folder or tag persistence
- Real archival persistence (resets on page refresh)
- Real-time collaboration or status updates
- Real billing or usage metering
- Electronic notarization

---

## 47. Handoff to Command 16

Command 16 should implement the Document Detail page (`/app/documents/:id`), replacing the current PlatformPlaceholder. It should include:
- Document header (title, status, send date, expiry)
- Participant list with individual status and auth method
- Document timeline / activity feed
- Verification certificate display (if applicable)
- Document settings (resend, cancel, void)
- Evidence tab (hash, audit trail summary — no IP/device/location)
- Responsive layout within the platform shell
- Consistent use of `DocumentListItem` or a richer `DocumentDetail` type

All row action hrefs in the current workspace already target `/app/documents/:id?tab=activity`, `/app/documents/:id?tab=participants`, etc., so Command 16 just needs to implement the tab routing.

---

## 48. Handoff to Command 17

Command 17 may implement Templates workspace (`/app/templates`). It can reuse:
- `AppContent`, `PageHeader`, `SkeletonBlock` from platform components
- `TRANSACTION_STATUS_LABELS` (for template status if needed)
- `MockDocumentService` pattern (replaceable boundary)
- `usePageMeta()` hook (add `/app/templates` to PLATFORM_ROUTES)
- `delay()` utility

---

## 49. Handoff to Command 18

Command 18 may implement Contacts workspace (`/app/contacts`). Reuse patterns same as C17. Fixture: `MOCK_CONTACTS` in `src/app/data/mock/index.ts` already has 4 contacts to extend.

---

*Command 15 — Documents Workspace. Build: clean. Chunk: 43KB. Commit: 93fb6e2.*
