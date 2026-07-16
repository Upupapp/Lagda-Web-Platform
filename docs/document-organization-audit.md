# Document Organization — Pre-Implementation Audit
# Command 31 — LAGDA Frontend

**Date:** 2026-07-16  
**Auditor:** C31 pre-flight inspection  
**Purpose:** Establish baseline before implementing folders, tags, saved views, starred, recents, and bulk operations

---

## 1. Existing Document-Organization Code

### 1.1 Folder Model (`src/app/models/documents.ts`)

```typescript
export interface DocumentFolder {
  id:            string;
  name:          string;
  documentCount: number;
  workspaceId:   string;
}
```

**Assessment:** Minimal. No scope (personal vs workspace), no status (active/archived), no parentId, no depth. Sufficient for the basic folder panel that existed in C15 but must be extended significantly for C31.

### 1.2 Tag Model (`src/app/models/documents.ts`)

```typescript
export interface DocumentTag {
  id:    string;
  name:  string;
  color: string; // Hex — never Burgundy (#67023B)
}
```

**Assessment:** Minimal. No status, no scope, no style token reference, no usage count. Color is raw hex — C31 will migrate to design-system style tokens while maintaining color display.

### 1.3 `DocumentListItem` Fields

- `folderIds: string[]` — supports multiple-folder membership (not used in display yet)
- `tags: DocumentTag[]` — tags already attached to items
- `isMyAction: boolean` — present for My Actions separation

**Assessment:** Correct foundation. C31 will reuse these fields.

### 1.4 Fixture Data (`src/app/data/mock/documents.ts`)

Existing fixtures:
- 5 folders: Clients, Real Estate, HR & Employment, Suppliers, Archive
- 6 tags: Urgent (Gold), High Value (Azure), Mabini (Violet), Harborline (Emerald), Sampaguita (Teal), Renewal (Rose)
- 8 document fixtures (txn_001–008)

**Assessment:** Good foundation. C31 will add a `DocumentOrganizationService` that manages richer folder/tag fixtures (with scope, status, hierarchy) separately from the base document fixtures, to avoid disrupting `DocumentsPage` behavior.

### 1.5 `FolderPanel` Component (`src/app/pages/platform/documents/DocumentsPage.tsx`)

```tsx
function FolderPanel({ folders, selectedId, counts, onChange }) { ... }
```

**Assessment:** Simple flat list of folders. No scope labels, no archive state, no child folders, no management links. C31 will preserve this component and add links to `/app/documents/folders` for management. The folder panel itself will be extended.

### 1.6 Selection and Bulk Actions (existing)

- `DocCheckbox` — checkboxes on rows and cards
- `SelectionBar` — shows count, Select All, Deselect All, Archive, Add Tag
- Bulk archive and bulk tag-add are wired to `mockDocumentService.archive()` and `mockDocumentService.addTag()`

**Assessment:** Existing selection is functional but limited. C31 will extend the bulk action bar with: Move to Folder, Remove Tags, Star, Unstar, Restore, Export Preview, Reminder Preview, Cancellation Preview. Eligibility will be calculated per document via `DocumentOrganizationService`.

### 1.7 `mockDocumentService` Methods

- `list(query, scenario)` — paginated filtered list
- `getFolders()` — returns `DOCUMENT_FOLDERS`
- `getTags()` — returns `DOCUMENT_TAGS`
- `archive([ids])` — marks items archived in memory
- `restore([ids])` — restores archived items
- `renameDraft(id, title)` — renames draft
- `addTag([ids], tagId)` — adds tag to multiple items

**Assessment:** Already has archive/restore/addTag at service level. C31 will add organization service methods on top without modifying the base document service.

### 1.8 Document View Types

Current views: all | needs-attention | drafts | in-progress | awaiting-my-action | completed | expiring | failed-delivery | archived

**Assessment:** Missing C31 views: `starred`, `recently-viewed`. Will add these to `VALID_DOCUMENT_VIEWS` and `VIEW_LABELS`.

---

## 2. Missing / Not Implemented

| Area | Gap |
|------|-----|
| Folder scope (personal vs workspace) | Missing |
| Folder status (active, archived) | Missing |
| Folder hierarchy (parentId, depth) | Missing |
| Folder management page | Missing |
| Folder detail page | Missing |
| Create / Rename / Move / Archive / Restore folder | Missing |
| Tag scope | Missing |
| Tag status | Missing |
| Tag style tokens | Tags use raw hex, not design-system tokens |
| Tag management page | Missing |
| Create / Rename / Archive / Restore tag | Missing |
| Starred documents | Missing |
| Recently viewed documents | Missing |
| Saved views | Missing |
| Saved view management page | Missing |
| Saved view detail page | Missing |
| Stale saved view handling | Missing |
| Bulk Move to Folder | Missing |
| Bulk Remove Tags | Missing |
| Bulk Star / Unstar | Missing |
| Bulk Restore | Missing (partial — single doc restore exists) |
| Export Preview | Missing |
| Reminder Preview | Missing |
| Cancellation / Void Preview | Missing |
| Ownership Transfer Preview | Missing |
| Retention Preview | Missing |
| Bulk eligibility resolver | Missing |
| Mixed-selection summary | Missing |
| `/app/documents/starred` view | Missing |
| `/app/documents/recently-viewed` view | Missing |
| `/app/documents/folders` management | Missing |
| `/app/documents/folders/:folderId` detail | Missing |
| `/app/documents/tags` management | Missing |
| `/app/documents/saved-views` management | Missing |
| `/app/documents/saved-views/:viewId` detail | Missing |
| Global Search folder/tag/saved-view projections | Missing |
| TransactionDetailPage folder/tag/star controls | Missing |
| Workspace switch cleanup for org state | Missing |
| Sign-out cleanup for org state | Missing |

---

## 3. Existing Code Reused in C31

| Component | Reuse |
|-----------|-------|
| `DocCheckbox` | Reused in extended selection |
| `SelectionBar` | Extended with more bulk actions |
| `FolderPanel` | Extended with scope/status/management link |
| `TagChip` | Reused in all tag displays |
| `StatusBadge` | Reused in folder detail document list |
| `SkeletonBlock` / `SKELETON_STYLE` | Reused in all loading states |
| `EmptyStateLayout` | Reused in all empty states |
| `PageHeader` | Reused in all new pages |
| `AppContent` | Reused in all new pages |
| `usePageMeta` | Reused in all new pages |
| `usePlatform` | Reused for permission/workspace context |
| `useSearchParams` | Reused for URL-driven state |
| `mockDocumentService` | NOT modified; organization service is additive |
| `DOCUMENT_FIXTURES` | Not modified; org service indexes them |
| `ServiceResult<T>` | Reused for service return types |

---

## 4. Duplicate / Conflict Risks

- `DocumentFolder` and `DocumentTag` types exist in `models/documents.ts`. C31 adds rich organization models in `models/document-organization.ts` without removing or conflicting with the base types.
- The base `DocumentFolder` from `models/documents.ts` is still used by the existing `FolderPanel`. C31 new pages use `OrgFolder` from `models/document-organization.ts`. The service bridge converts between them.
- `VIEW_LABELS` and `VALID_DOCUMENT_VIEWS` will be extended in-place to add `starred` and `recently-viewed`.

---

## 5. Privacy and Security Findings

- No localStorage usage found in existing org code. ✓
- No sessionStorage usage found. ✓
- Folder IDs appear in URLs (`?folder=fol_001`) — IDs are opaque, not private. ✓
- Tag IDs appear in URLs (`?tag=tag_001`) — opaque. ✓
- Document titles do not appear in URLs. ✓
- No cross-workspace org data. ✓

---

## 6. Accessibility Findings

- `FolderPanel` uses `role="navigation"` with `aria-current`. ✓
- `DocCheckbox` has `aria-label` on inputs. ✓
- Existing `SelectionBar` uses `aria-live="polite"`. ✓
- Tag color (`tag.color`) is used alongside `tag.name` text — not color-only. ✓
- **Gap:** Tag style should include accessible text token name in C31 (not just raw hex)

---

## 7. Performance Findings

- No heavy drag-and-drop library present. ✓
- No tree library present. ✓
- Folder list is flat (no tree rendering overhead). ✓
- C31 should keep folder management routes lazy-loaded.

---

## 8. Conclusion

The existing Documents workspace has a good foundation (types, service, basic folder panel, selection, bulk archive). C31 extends it cleanly without replacing it. A new `document-organization.service.ts` with richer types in `document-organization.ts` adds all missing capabilities while the base `document.service.ts` and `documents.ts` remain stable.
