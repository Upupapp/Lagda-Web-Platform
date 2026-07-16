# Document Organization — Folders, Tags, Saved Views, and Bulk Actions

**Command 31 — Design & Architecture Specification**

---

## 1. Overview

C31 adds a personal and workspace-scoped document organization layer on top of the existing document model. It does **not** change document access, ownership, signing order, workflow status, or legal records. Organization is purely a metadata and navigation layer.

### In scope
- Personal and workspace folders (max depth 3)
- Tags with typed design-system styles (10 style tokens)
- Starred documents (per-user, in-memory)
- Recently viewed documents (per-workspace, in-memory)
- Saved views (personal named filter/sort configurations)
- Bulk operations: move to folder, add/remove tags, star/unstar, archive
- Organization views on the Documents page: Starred, Recently Viewed, Owned by Me, Shared with Me, Awaiting Others
- Folder detail, tag management, and saved-view detail pages

### Out of scope
- No eNotary folders, tags, views, or bulk actions
- No Burgundy (#67023B) anywhere
- No backend persistence (all in-memory module-level state)
- No WebSockets or SSE
- No real file export, ZIP generation, or reminder delivery
- No automatic cancellation, void, ownership transfer, or retention enforcement
- No raw hex color input for tags (design-system tokens only)

---

## 2. Security Constraints

These constraints are absolute and must be preserved when connecting a real backend:

1. **Folders and tags do not grant or restrict document access.** A user who cannot see a document via their role permissions cannot see it by navigating to a folder that "contains" it.
2. **Personal folders are private.** Workspace Administrators must never gain access to a user's personal folders through organization controls.
3. **Shared with Me must remain separate from My Actions.** Shared-with-me is a passive relationship (participant); My Actions is an active assignment (recipient inbox).
4. **Workspace Administrator cannot bypass private-document visibility through org controls.**
5. **All preview/bulk actions include explicit "no mutation occurred" notices.** Bulk actions in demonstration mode describe what would happen; they do not mutate signing status, delivery records, or legal timelines.

---

## 3. Files Created or Modified

### New models
| File | Purpose |
|------|---------|
| `src/app/models/document-organization.ts` | All org types: `OrgFolder`, `OrgTag`, `OrgSavedView`, `OrgFavoriteItem`, `OrgRecentItem`, branded IDs, `OrgResult<T>`, `TAG_STYLE_COLORS`, `TAG_STYLE_LABELS`, `FOLDER_SCOPE_LABELS`, constants |

### New service
| File | Purpose |
|------|---------|
| `src/app/services/mock/document-organization.service.ts` | All org CRUD operations, in-memory state, fixture data |

### New pages
| File | Route | Purpose |
|------|-------|---------|
| `src/app/pages/platform/documents/folders/DocumentFoldersPage.tsx` | `/app/documents/folders` | Folder tree management (workspace + personal), CRUD |
| `src/app/pages/platform/documents/folders/FolderDetailPage.tsx` | `/app/documents/folders/:folderId` | Documents in a specific folder |
| `src/app/pages/platform/documents/tags/DocumentTagsPage.tsx` | `/app/documents/tags` | Tag management with design-system style picker |
| `src/app/pages/platform/documents/saved-views/DocumentSavedViewsPage.tsx` | `/app/documents/saved-views` | Personal saved-view list, CRUD |
| `src/app/pages/platform/documents/saved-views/SavedViewDetailPage.tsx` | `/app/documents/saved-views/:viewId` | View definition + document preview |

### Modified files
| File | Changes |
|------|---------|
| `src/app/models/documents.ts` | Added 5 org `DocumentView` values; added `ORG_FILTERED_VIEWS` constant; updated `VIEW_LABELS` and `VALID_DOCUMENT_VIEWS` |
| `src/app/pages/platform/documents/DocumentsPage.tsx` | Added `OrgSidePanel` (folders, saved views, org views, manage links); added `OrgBulkBar`; added org-view client-side filtering; added org state loading |
| `src/app/pages/platform/documents/TransactionDetailPage.tsx` | Added Organization section card to `OverviewTab` (star toggle, org-tag chips, folder/tag management links) |
| `src/app/services/mock/global-search.service.ts` | Added folder, tag, saved-view search result builders; added 3 Command Palette commands |
| `src/app/context/PlatformContext.tsx` | Added `resetDocumentOrganizationDemonstration()` on sign-out; added `clearWorkspaceScopedOrganization()` on workspace switch |
| `src/router.tsx` | Added 5 lazy-loaded routes before `documents/:transactionId` |
| `src/app/config/routes.ts` | Added 5 route entries with analytics names |

---

## 4. Data Model

### OrgFolder

```typescript
interface OrgFolder {
  id: OrgFolderId;               // branded string
  name: string;
  scope: OrgFolderScope;         // "personal" | "workspace"
  parentId: OrgFolderId | null;  // null = top-level
  depth: number;                 // 0-indexed; max = MAX_FOLDER_DEPTH - 1 = 2
  status: "active" | "archived";
  createdAt: string;             // ISO 8601
  updatedAt: string;
  createdByUserId: string;
  workspaceId: string;
  demonstrationOnly: true;
}
```

**Depth enforcement:** `MAX_FOLDER_DEPTH = 3` (root at depth 0, max child at depth 2). `createFolder` returns `OrgError` with code `"max-depth-exceeded"` if violated.

### OrgTag

```typescript
interface OrgTag {
  id: OrgTagId;
  name: string;
  style: OrgTagStyle;  // "neutral"|"azure"|"navy"|"success"|"warning"|"error"|"gold"|"violet"|"teal"|"rose"
  status: "active" | "archived";
  createdAt: string;
  updatedAt: string;
  demonstrationOnly: true;
}
```

Tags use `TAG_STYLE_COLORS` for visual rendering — never raw hex input. The style picker in `DocumentTagsPage` shows 10 swatches mapped to design-system tokens.

### OrgSavedView

```typescript
interface OrgSavedView {
  id: OrgViewId;
  name: string;
  description?: string;
  isDefault: boolean;
  status: "active" | "stale" | "archived";
  staleReasons?: string[];
  definition: {
    filters: {
      statuses?: TransactionStatus[];
      folderId?: string;
      tagIds?: OrgTagId[];
      q?: string;
      ownerId?: string;
      dateFrom?: string;
      dateTo?: string;
    };
    sort: string;
    sortDir: "asc" | "desc";
    grouping: "none" | "status" | "folder" | "tag";
  };
  createdAt: string;
  updatedAt: string;
  demonstrationOnly: true;
}
```

### OrgResult\<T\>

All service mutations return:

```typescript
type OrgResult<T> = { readonly ok: true; readonly data: T } | { readonly ok: false; readonly error: OrgError };
```

`OrgError` always carries `code`, `message`, and optional `field`.

---

## 5. Service API

All methods on `documentOrganizationService`:

### Folders
| Method | Returns | Notes |
|--------|---------|-------|
| `listFolders(query?, userId?)` | `OrgResult<OrgFolder[]>` | Filters by scope, status, parentId |
| `getFolder(folderId)` | `OrgResult<OrgFolder>` | |
| `createFolder(input)` | `OrgResult<OrgFolder>` | Enforces MAX_FOLDER_DEPTH |
| `renameFolder(folderId, input)` | `OrgResult<OrgFolder>` | |
| `archiveFolder(folderId)` | `OrgResult<OrgFolder>` | |
| `restoreFolder(folderId)` | `OrgResult<OrgFolder>` | |
| `removeFolderDemonstration(folderId)` | `OrgResult<void>` | Fixture cleanup only |
| `listFolderDocuments(folderId, items)` | `DocumentListItem[]` | Client-side filter of passed items |

**Critical:** `listFolderDocuments` requires two arguments — the folder ID and the full document list to filter from.

### Tags
| Method | Returns | Notes |
|--------|---------|-------|
| `listTags(query?)` | `OrgResult<OrgTag[]>` | |
| `createTag(input)` | `OrgResult<OrgTag>` | |
| `renameTag(tagId, input)` | `OrgResult<OrgTag>` | |
| `updateTagStyle(tagId, input)` | `OrgResult<OrgTag>` | |
| `archiveTag(tagId)` | `OrgResult<OrgTag>` | |
| `restoreTag(tagId)` | `OrgResult<OrgTag>` | |
| `removeTagDemonstration(tagId)` | `OrgResult<void>` | |
| `addTagsToDocuments(documentIds, tagIds)` | `OrgResult<OrgBulkActionResult>` | Demonstration |
| `removeTagsFromDocuments(documentIds, tagIds)` | `OrgResult<OrgBulkActionResult>` | Demonstration |

### Starred / Favorites
| Method | Returns | Notes |
|--------|---------|-------|
| `listStarredDocuments()` | `OrgFavoriteItem[]` | No params |
| `starDocuments(documentIds)` | `OrgResult<OrgBulkActionResult>` | No userId param |
| `unstarDocuments(documentIds)` | `OrgResult<OrgBulkActionResult>` | No userId param |

### Recently Viewed
| Method | Returns | Notes |
|--------|---------|-------|
| `listRecentDocuments(workspaceId?)` | `OrgRecentItem[]` | workspaceId only, no userId |

### Saved Views
| Method | Returns | Notes |
|--------|---------|-------|
| `listSavedViews(userId?)` | `OrgResult<OrgSavedView[]>` | userId only, no workspaceId |
| `getSavedView(viewId)` | `OrgResult<OrgSavedView>` | |
| `renameSavedView(viewId, name)` | `OrgResult<OrgSavedView>` | |
| `duplicateSavedView(viewId)` | `OrgResult<OrgSavedView>` | No extra params |
| `setDefaultSavedView(viewId)` | `OrgResult<OrgSavedView>` | No userId param |
| `archiveSavedView(viewId)` | `OrgResult<OrgSavedView>` | |
| `restoreSavedView(viewId)` | `OrgResult<OrgSavedView>` | |
| `removeSavedViewDemonstration(viewId)` | `OrgResult<void>` | |

### Lifecycle
| Method | Purpose |
|--------|---------|
| `resetDocumentOrganizationDemonstration()` | Called on sign-out — resets all in-memory state |
| `clearWorkspaceScopedOrganization(workspaceId)` | Called on workspace switch — clears workspace-scoped state |

---

## 6. Document Views (org-filtered)

Five new `DocumentView` values are handled client-side in `DocumentsPage.tsx`:

| View | Filter logic |
|------|-------------|
| `"starred"` | `starredIds.has(doc.id)` |
| `"recently-viewed"` | `recentIds` ordered list, matched by doc ID |
| `"owned-by-me"` | `!doc.isMyAction && doc.status !== "archived"` |
| `"shared-with-me"` | `doc.participantCount > 0 && !doc.isMyAction` |
| `"awaiting-others"` | `["sent","delivered","viewed","awaiting-signature"].includes(doc.status)` |

These are grouped under `ORG_FILTERED_VIEWS` and receive special handling in the `loadDocs` effect: the base query always uses `view: "all"` to get the full list, then filters client-side.

The `OrgSidePanel` in `DocumentsPage` provides navigation to all org views plus folder/saved-view management. The existing `ViewTabStrip` is unchanged.

---

## 7. Routes

All routes are registered before `documents/:transactionId` to prevent route shadowing:

```
/app/documents/folders                  → DocumentFoldersPage
/app/documents/folders/:folderId        → FolderDetailPage
/app/documents/tags                     → DocumentTagsPage
/app/documents/saved-views              → DocumentSavedViewsPage
/app/documents/saved-views/:viewId      → SavedViewDetailPage
```

All are lazy-loaded with `Suspense` fallback `null`.

---

## 8. Tag Style System

Tags use `OrgTagStyle` tokens mapped to hex via `TAG_STYLE_COLORS`:

| Token | Color |
|-------|-------|
| `neutral` | #64748B |
| `azure` | #0078D4 |
| `navy` | #07111F |
| `success` | #16A34A |
| `warning` | #D97706 |
| `error` | #DC2626 |
| `gold` | #C9960C |
| `violet` | #7C3AED |
| `teal` | #0D9488 |
| `rose` | #E11D48 |

Tags are always rendered as `background: TAG_STYLE_COLORS[style] + "22"` (10% alpha fill) with `color: TAG_STYLE_COLORS[style]` and `border: TAG_STYLE_COLORS[style] + "44"` (27% alpha border).

---

## 9. Global Search Integration

Three new Command Palette commands:

| ID | Label | Destination |
|----|-------|------------|
| `cmd_doc_folders` | Open Document Folders | `/app/documents/folders` |
| `cmd_doc_tags` | Open Document Tags | `/app/documents/tags` |
| `cmd_doc_savedviews` | Open Saved Views | `/app/documents/saved-views` |

Three new search result builders feed the `"documents"` scope:
- `buildFolderResults` — matches folder names from `documentOrganizationService.listFolders()`
- `buildOrgTagResults` — matches tag names from `documentOrganizationService.listTags()`
- `buildOrgSavedViewResults` — matches saved-view names/descriptions from `documentOrganizationService.listSavedViews()`

---

## 10. Backend Integration Handoff

When connecting a real backend, the following operations need server-side endpoints. All of these currently run against in-memory state.

### Folders

| Operation | Suggested route | Notes |
|-----------|----------------|-------|
| List folders | `GET /api/workspaces/:wsId/folders` | Filter by `scope`, `parentId`, `status` |
| Get folder | `GET /api/workspaces/:wsId/folders/:folderId` | |
| Create folder | `POST /api/workspaces/:wsId/folders` | Enforce depth server-side |
| Rename folder | `PATCH /api/workspaces/:wsId/folders/:folderId` | |
| Archive folder | `DELETE /api/workspaces/:wsId/folders/:folderId` | Soft delete |
| Restore folder | `POST /api/workspaces/:wsId/folders/:folderId/restore` | |
| List folder documents | `GET /api/workspaces/:wsId/folders/:folderId/documents` | Returns document IDs or summaries |

**Access rule:** Personal folders must never be returned to other users or workspace admins. Server must verify `folder.ownerId === requestingUserId` for personal scope.

### Tags

| Operation | Suggested route | Notes |
|-----------|----------------|-------|
| List tags | `GET /api/workspaces/:wsId/tags` | |
| Create tag | `POST /api/workspaces/:wsId/tags` | Validate style token server-side |
| Rename tag | `PATCH /api/workspaces/:wsId/tags/:tagId` | |
| Update style | `PATCH /api/workspaces/:wsId/tags/:tagId/style` | |
| Archive tag | `DELETE /api/workspaces/:wsId/tags/:tagId` | |
| Restore tag | `POST /api/workspaces/:wsId/tags/:tagId/restore` | |
| Add tags to documents | `POST /api/workspaces/:wsId/documents/bulk/add-tags` | Body: `{ documentIds, tagIds }` |
| Remove tags from documents | `POST /api/workspaces/:wsId/documents/bulk/remove-tags` | Body: `{ documentIds, tagIds }` |

### Starred / Favorites

| Operation | Suggested route | Notes |
|-----------|----------------|-------|
| List starred | `GET /api/users/:userId/starred-documents` | Per-user, not workspace |
| Star documents | `POST /api/users/:userId/starred-documents` | Body: `{ documentIds }` |
| Unstar documents | `DELETE /api/users/:userId/starred-documents` | Body: `{ documentIds }` |

### Recently Viewed

| Operation | Suggested route | Notes |
|-----------|----------------|-------|
| List recent | `GET /api/users/:userId/recently-viewed?workspaceId=` | Server appends on each document open |
| Record view | `POST /api/users/:userId/recently-viewed` | Called on document detail page mount |

### Saved Views

| Operation | Suggested route | Notes |
|-----------|----------------|-------|
| List saved views | `GET /api/users/:userId/saved-views` | Personal, per-user |
| Get saved view | `GET /api/users/:userId/saved-views/:viewId` | |
| Create saved view | `POST /api/users/:userId/saved-views` | |
| Rename | `PATCH /api/users/:userId/saved-views/:viewId/name` | |
| Duplicate | `POST /api/users/:userId/saved-views/:viewId/duplicate` | |
| Set default | `PATCH /api/users/:userId/saved-views/:viewId/default` | Clears previous default |
| Archive | `DELETE /api/users/:userId/saved-views/:viewId` | |
| Restore | `POST /api/users/:userId/saved-views/:viewId/restore` | |

### Bulk operations

| Operation | Suggested route | Notes |
|-----------|----------------|-------|
| Bulk move to folder | `POST /api/workspaces/:wsId/documents/bulk/move` | Body: `{ documentIds, folderId }` |
| Bulk add tags | `POST /api/workspaces/:wsId/documents/bulk/add-tags` | Body: `{ documentIds, tagIds }` |
| Bulk remove tags | `POST /api/workspaces/:wsId/documents/bulk/remove-tags` | |
| Bulk star | `POST /api/users/:userId/starred-documents` | |
| Bulk unstar | `DELETE /api/users/:userId/starred-documents` | |
| Bulk archive | `POST /api/workspaces/:wsId/documents/bulk/archive` | Existing status-mutation endpoint |

---

## 11. Design Rules (must survive backend stitching)

1. Burgundy (#67023B) is NEVER used in organization UI — it is reserved for eNotary only.
2. All tag colors come from `TAG_STYLE_COLORS[style]` — never accept raw hex from user input.
3. `MAX_FOLDER_DEPTH = 3` is enforced both client-side (service) and must be enforced server-side.
4. All bulk-action previews display a demonstration notice before any mutation description.
5. `demonstrationOnly: true` must be set on all fixture/preview data; the backend handoff must strip this flag from real server responses.
6. The org side panel must not render Burgundy folder icons or eNotary folder categories.
7. Personal folder privacy must be enforced at the API layer, not only in the frontend.
8. `ORG_FILTERED_VIEWS` are client-side only until the backend exposes filter endpoints that accept `starred`, `owned-by-me`, etc. as first-class query parameters.
