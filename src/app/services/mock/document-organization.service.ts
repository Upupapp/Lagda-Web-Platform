// Mock Document Organization Service — Command 31.
// Manages folders, tags, saved views, starred, recently viewed, selection, bulk operations.
// ALL state is in-memory only. No localStorage, no sessionStorage, no production API.
// Folders and tags do not grant document access or change transaction status.
// No eNotary folders, tags, or bulk actions. No Burgundy (#67023B).
// No dangerouslySetInnerHTML. No real file export, reminder, cancel, void, or transfer.

import type {
  OrgFolder, OrgFolderId, OrgFolderScope, OrgFolderStatus,
  OrgTag, OrgTagId, OrgTagStyle, OrgTagStatus,
  OrgSavedView, OrgViewId, OrgViewStatus, OrgViewScope,
  OrgViewDefinition, OrgFavoriteItem, OrgRecentItem, OrgRecentId,
  OrgBulkActionType, OrgBulkEligibility, OrgBulkEligibilityResult,
  OrgBulkActionResult, OrgTagAssignment,
  OrgExportPreview, OrgReminderPreview, OrgCancellationPreview,
  OrgOwnershipTransferPreview, OrgRetentionPreview,
  OrgCreateFolderInput, OrgRenameFolderInput,
  OrgCreateTagInput, OrgRenameTagInput, OrgUpdateTagStyleInput,
  OrgCreateViewInput, OrgUpdateViewInput,
  OrgMoveInput, OrgTagMutationInput, OrgFavoriteInput, OrgArchiveInput,
  OrgResult, OrgError, OrgQuery,
} from "../../models/document-organization";
import {
  MAX_FOLDER_DEPTH, MAX_RECENT_ITEMS, TAG_STYLE_COLORS,
} from "../../models/document-organization";
import type { DocumentListItem } from "../../models/documents";

// ── Helpers ───────────────────────────────────────────────────────────────────

function now(): string { return new Date().toISOString(); }
function makeId(prefix: string): string { return `${prefix}_${Date.now()}_${Math.random().toString(36).slice(2, 7)}`; }
function ok<T>(data: T): OrgResult<T> { return { ok: true, data }; }
function fail(code: OrgError["code"], message: string): OrgResult<never> {
  return { ok: false, error: { code, message } };
}

// ── Fixture data ──────────────────────────────────────────────────────────────

const WS_ID = "ws_northbridge_001";
const USER_ID = "usr_ana_reyes";

const INITIAL_FOLDERS: OrgFolder[] = [
  // Workspace folders
  {
    id: "ofol_001" as OrgFolderId, name: "Client Agreements", scope: "workspace",
    status: "active", parentId: null, workspaceId: WS_ID, position: 0,
    createdAt: "2026-01-10T08:00:00Z", updatedAt: "2026-07-01T10:00:00Z",
    documentCount: 3, childCount: 2,
  },
  {
    id: "ofol_002" as OrgFolderId, name: "Active Agreements", scope: "workspace",
    status: "active", parentId: "ofol_001" as OrgFolderId, workspaceId: WS_ID, position: 0,
    createdAt: "2026-01-15T08:00:00Z", updatedAt: "2026-07-02T10:00:00Z",
    documentCount: 2, childCount: 0,
  },
  {
    id: "ofol_003" as OrgFolderId, name: "Completed Agreements", scope: "workspace",
    status: "active", parentId: "ofol_001" as OrgFolderId, workspaceId: WS_ID, position: 1,
    createdAt: "2026-01-15T08:00:00Z", updatedAt: "2026-07-02T10:00:00Z",
    documentCount: 1, childCount: 0,
  },
  {
    id: "ofol_004" as OrgFolderId, name: "Procurement", scope: "workspace",
    status: "active", parentId: null, workspaceId: WS_ID, position: 1,
    createdAt: "2026-02-01T08:00:00Z", updatedAt: "2026-06-20T10:00:00Z",
    documentCount: 2, childCount: 1,
  },
  {
    id: "ofol_005" as OrgFolderId, name: "Vendor Agreements", scope: "workspace",
    status: "active", parentId: "ofol_004" as OrgFolderId, workspaceId: WS_ID, position: 0,
    createdAt: "2026-02-05T08:00:00Z", updatedAt: "2026-06-20T10:00:00Z",
    documentCount: 2, childCount: 0,
  },
  {
    id: "ofol_006" as OrgFolderId, name: "Human Resources", scope: "workspace",
    status: "active", parentId: null, workspaceId: WS_ID, position: 2,
    createdAt: "2026-02-10T08:00:00Z", updatedAt: "2026-06-15T10:00:00Z",
    documentCount: 1, childCount: 0,
  },
  {
    id: "ofol_007" as OrgFolderId, name: "Internal Policies", scope: "workspace",
    status: "active", parentId: null, workspaceId: WS_ID, position: 3,
    createdAt: "2026-03-01T08:00:00Z", updatedAt: "2026-06-01T10:00:00Z",
    documentCount: 0, childCount: 0,
  },
  {
    id: "ofol_008" as OrgFolderId, name: "Archived Organization", scope: "workspace",
    status: "archived", parentId: null, workspaceId: WS_ID, position: 99,
    createdAt: "2025-12-01T08:00:00Z", updatedAt: "2026-03-01T10:00:00Z",
    documentCount: 0, childCount: 0,
  },
  // Personal folders
  {
    id: "ofol_009" as OrgFolderId, name: "Starred Contracts", scope: "personal",
    status: "active", parentId: null, workspaceId: WS_ID, position: 0,
    createdAt: "2026-05-01T08:00:00Z", updatedAt: "2026-07-10T10:00:00Z",
    documentCount: 2, childCount: 0, ownerId: USER_ID,
  },
  {
    id: "ofol_010" as OrgFolderId, name: "Follow Up", scope: "personal",
    status: "active", parentId: null, workspaceId: WS_ID, position: 1,
    createdAt: "2026-05-15T08:00:00Z", updatedAt: "2026-07-08T10:00:00Z",
    documentCount: 1, childCount: 0, ownerId: USER_ID,
  },
  {
    id: "ofol_011" as OrgFolderId, name: "My Draft Reviews", scope: "personal",
    status: "active", parentId: null, workspaceId: WS_ID, position: 2,
    createdAt: "2026-06-01T08:00:00Z", updatedAt: "2026-07-05T10:00:00Z",
    documentCount: 1, childCount: 0, ownerId: USER_ID,
  },
];

const INITIAL_TAGS: OrgTag[] = [
  { id: "otag_001" as OrgTagId, name: "Priority",          style: "gold",    status: "active",   scope: "workspace", workspaceId: WS_ID, usageCount: 3, createdAt: "2026-01-10T08:00:00Z", updatedAt: "2026-07-01T10:00:00Z" },
  { id: "otag_002" as OrgTagId, name: "Client",            style: "azure",   status: "active",   scope: "workspace", workspaceId: WS_ID, usageCount: 5, createdAt: "2026-01-10T08:00:00Z", updatedAt: "2026-07-01T10:00:00Z" },
  { id: "otag_003" as OrgTagId, name: "Internal",          style: "navy",    status: "active",   scope: "workspace", workspaceId: WS_ID, usageCount: 2, createdAt: "2026-02-01T08:00:00Z", updatedAt: "2026-06-15T10:00:00Z" },
  { id: "otag_004" as OrgTagId, name: "Procurement",       style: "teal",    status: "active",   scope: "workspace", workspaceId: WS_ID, usageCount: 2, createdAt: "2026-02-01T08:00:00Z", updatedAt: "2026-06-15T10:00:00Z" },
  { id: "otag_005" as OrgTagId, name: "Human Resources",   style: "violet",  status: "active",   scope: "workspace", workspaceId: WS_ID, usageCount: 1, createdAt: "2026-02-10T08:00:00Z", updatedAt: "2026-06-10T10:00:00Z" },
  { id: "otag_006" as OrgTagId, name: "Renewal",           style: "warning", status: "active",   scope: "workspace", workspaceId: WS_ID, usageCount: 1, createdAt: "2026-03-01T08:00:00Z", updatedAt: "2026-06-01T10:00:00Z" },
  { id: "otag_007" as OrgTagId, name: "Needs Review",      style: "error",   status: "active",   scope: "workspace", workspaceId: WS_ID, usageCount: 2, createdAt: "2026-03-15T08:00:00Z", updatedAt: "2026-07-05T10:00:00Z" },
  { id: "otag_008" as OrgTagId, name: "Standard Agreement",style: "neutral", status: "active",   scope: "workspace", workspaceId: WS_ID, usageCount: 4, createdAt: "2026-04-01T08:00:00Z", updatedAt: "2026-06-20T10:00:00Z" },
  { id: "otag_009" as OrgTagId, name: "Follow Up",         style: "rose",    status: "active",   scope: "workspace", workspaceId: WS_ID, usageCount: 1, createdAt: "2026-04-15T08:00:00Z", updatedAt: "2026-06-25T10:00:00Z" },
  { id: "otag_010" as OrgTagId, name: "Archived Reference",style: "neutral", status: "archived", scope: "workspace", workspaceId: WS_ID, usageCount: 0, createdAt: "2025-12-01T08:00:00Z", updatedAt: "2026-03-01T10:00:00Z" },
  { id: "otag_011" as OrgTagId, name: "Unused Tag",        style: "neutral", status: "active",   scope: "workspace", workspaceId: WS_ID, usageCount: 0, createdAt: "2026-06-01T08:00:00Z", updatedAt: "2026-06-01T10:00:00Z" },
];

const INITIAL_SAVED_VIEWS: OrgSavedView[] = [
  {
    id: "oview_001" as OrgViewId, name: "Awaiting Others", scope: "personal", status: "active",
    isDefault: true, workspaceId: WS_ID, ownerId: USER_ID,
    definition: {
      filters: { statuses: ["sent", "delivered", "viewed", "awaiting-signature", "awaiting-approval", "partially-completed"] },
      sort: "updated", sortDir: "asc", grouping: "none",
    },
    createdAt: "2026-05-01T08:00:00Z", updatedAt: "2026-07-10T10:00:00Z",
  },
  {
    id: "oview_002" as OrgViewId, name: "Completed This Month", scope: "personal", status: "active",
    isDefault: false, workspaceId: WS_ID, ownerId: USER_ID,
    definition: {
      filters: { statuses: ["completed"], dateFrom: "2026-07-01", dateTo: "2026-07-31" },
      sort: "updated", sortDir: "desc", grouping: "none",
    },
    createdAt: "2026-06-01T08:00:00Z", updatedAt: "2026-07-08T10:00:00Z",
  },
  {
    id: "oview_003" as OrgViewId, name: "Procurement Agreements", scope: "personal", status: "active",
    isDefault: false, workspaceId: WS_ID, ownerId: USER_ID,
    definition: {
      filters: { tagIds: ["otag_004" as OrgTagId], folderId: "ofol_004" as OrgFolderId },
      sort: "updated", sortDir: "desc", grouping: "none",
    },
    createdAt: "2026-06-10T08:00:00Z", updatedAt: "2026-07-01T10:00:00Z",
  },
  {
    id: "oview_004" as OrgViewId, name: "My Drafts", scope: "personal", status: "active",
    isDefault: false, workspaceId: WS_ID, ownerId: USER_ID,
    definition: {
      filters: { statuses: ["draft", "ready-to-send"], ownerId: USER_ID },
      sort: "created", sortDir: "desc", grouping: "none",
    },
    createdAt: "2026-06-15T08:00:00Z", updatedAt: "2026-07-05T10:00:00Z",
  },
  {
    id: "oview_005" as OrgViewId, name: "Needs Follow Up", scope: "personal", status: "active",
    isDefault: false, workspaceId: WS_ID, ownerId: USER_ID,
    definition: {
      filters: { tagIds: ["otag_009" as OrgTagId] },
      sort: "updated", sortDir: "asc", grouping: "none",
    },
    createdAt: "2026-06-20T08:00:00Z", updatedAt: "2026-07-02T10:00:00Z",
  },
  {
    id: "oview_006" as OrgViewId, name: "Archived Reference", scope: "personal", status: "archived",
    isDefault: false, workspaceId: WS_ID, ownerId: USER_ID,
    definition: {
      filters: { statuses: ["archived"] },
      sort: "updated", sortDir: "desc", grouping: "none",
    },
    createdAt: "2026-04-01T08:00:00Z", updatedAt: "2026-05-01T10:00:00Z",
  },
  {
    id: "oview_007" as OrgViewId, name: "Old Team View", scope: "personal", status: "stale",
    isDefault: false, workspaceId: WS_ID, ownerId: USER_ID,
    definition: {
      filters: { teamId: "team_dissolved_001", tagIds: ["otag_010" as OrgTagId] },
      sort: "updated", sortDir: "desc", grouping: "none",
    },
    staleReasons: ["Referenced team no longer exists", "Referenced tag is archived"],
    createdAt: "2026-03-01T08:00:00Z", updatedAt: "2026-03-01T10:00:00Z",
  },
];

// ── Document → folder assignments (in-memory) ─────────────────────────────────

const INITIAL_DOC_FOLDERS: Record<string, OrgFolderId[]> = {
  "txn_001": ["ofol_001" as OrgFolderId, "ofol_002" as OrgFolderId],
  "txn_002": ["ofol_001" as OrgFolderId, "ofol_003" as OrgFolderId],
  "txn_003": ["ofol_004" as OrgFolderId, "ofol_005" as OrgFolderId],
  "txn_004": ["ofol_006" as OrgFolderId],
  "txn_005": ["ofol_001" as OrgFolderId],
  "txn_006": [],
  "txn_007": ["ofol_004" as OrgFolderId, "ofol_005" as OrgFolderId],
  "txn_008": ["ofol_009" as OrgFolderId, "ofol_010" as OrgFolderId],
};

// ── Document → tag assignments (in-memory) ────────────────────────────────────

const INITIAL_DOC_TAGS: Record<string, OrgTagId[]> = {
  "txn_001": ["otag_001" as OrgTagId, "otag_002" as OrgTagId],
  "txn_002": ["otag_002" as OrgTagId, "otag_008" as OrgTagId],
  "txn_003": ["otag_004" as OrgTagId, "otag_008" as OrgTagId],
  "txn_004": ["otag_005" as OrgTagId],
  "txn_005": ["otag_001" as OrgTagId],
  "txn_006": [],
  "txn_007": ["otag_004" as OrgTagId, "otag_006" as OrgTagId],
  "txn_008": ["otag_009" as OrgTagId],
};

// ── Module-level in-memory state ───────────────────────────────────────────────

let _folders: OrgFolder[] = JSON.parse(JSON.stringify(INITIAL_FOLDERS)) as OrgFolder[];
let _tags:    OrgTag[]    = JSON.parse(JSON.stringify(INITIAL_TAGS)) as OrgTag[];
let _views:   OrgSavedView[] = JSON.parse(JSON.stringify(INITIAL_SAVED_VIEWS)) as OrgSavedView[];
let _docFolders: Record<string, OrgFolderId[]> = JSON.parse(JSON.stringify(INITIAL_DOC_FOLDERS));
let _docTags:    Record<string, OrgTagId[]>    = JSON.parse(JSON.stringify(INITIAL_DOC_TAGS));
let _starred: OrgFavoriteItem[] = [
  { documentId: "txn_001", starredAt: "2026-07-10T09:00:00Z" },
  { documentId: "txn_003", starredAt: "2026-07-05T09:00:00Z" },
];
let _recents: OrgRecentItem[] = [
  { id: "recent_001" as OrgRecentId, documentId: "txn_001", title: "Retainer Agreement", workspaceId: WS_ID, viewedAt: "2026-07-16T08:30:00Z" },
  { id: "recent_002" as OrgRecentId, documentId: "txn_002", title: "NDA — Harborline", workspaceId: WS_ID, viewedAt: "2026-07-16T07:00:00Z" },
  { id: "recent_003" as OrgRecentId, documentId: "txn_003", title: "Equipment Lease Agreement", workspaceId: WS_ID, viewedAt: "2026-07-15T14:00:00Z" },
];

// ── Hierarchy helpers ─────────────────────────────────────────────────────────

function getFolderDepth(folderId: OrgFolderId): number {
  let depth = 0;
  let current: OrgFolder | undefined = _folders.find(f => f.id === folderId);
  while (current?.parentId) {
    depth++;
    const parent = current.parentId;
    current = _folders.find(f => f.id === parent);
    if (depth > MAX_FOLDER_DEPTH + 2) break; // safety
  }
  return depth;
}

function isDescendant(ancestorId: OrgFolderId, possibleDescendantId: OrgFolderId): boolean {
  let cur = _folders.find(f => f.id === possibleDescendantId);
  const visited = new Set<string>();
  while (cur?.parentId) {
    if (visited.has(cur.id)) break;
    visited.add(cur.id);
    if (cur.parentId === ancestorId) return true;
    cur = _folders.find(f => f.id === cur!.parentId!);
  }
  return false;
}

function getChildren(folderId: OrgFolderId): OrgFolder[] {
  return _folders.filter(f => f.parentId === folderId);
}

// ── DocumentOrganizationService ───────────────────────────────────────────────

class DocumentOrganizationService {

  // ── FOLDERS ────────────────────────────────────────────────────────────────

  listFolders(query: OrgQuery = {}, userId?: string): OrgResult<OrgFolder[]> {
    let result = [..._folders];
    if (query.scope) result = result.filter(f => f.scope === query.scope);
    if (query.status) result = result.filter(f => f.status === query.status);
    if (query.q) {
      const q = query.q.toLowerCase();
      result = result.filter(f => f.name.toLowerCase().includes(q));
    }
    // Personal folders: only show current user's own
    if (userId) {
      result = result.filter(f => f.scope === "workspace" || f.ownerId === userId);
    }
    result = [...result].sort((a, b) => a.position - b.position || a.name.localeCompare(b.name));
    return ok(result);
  }

  getFolder(folderId: OrgFolderId): OrgResult<OrgFolder> {
    const f = _folders.find(f => f.id === folderId);
    if (!f) return fail("folder-not-found", `Folder ${folderId} not found in demonstration state.`);
    return ok(f);
  }

  createFolder(input: OrgCreateFolderInput): OrgResult<OrgFolder> {
    const name = input.name.trim().replace(/\s+/g, " ");
    if (!name) return fail("invalid-scope", "Folder name is required.");
    if (name.length > 120) return fail("invalid-scope", "Folder name must be 120 characters or fewer.");

    if (input.parentId) {
      const parent = _folders.find(f => f.id === input.parentId);
      if (!parent) return fail("folder-not-found", "Parent folder not found.");
      if (parent.workspaceId !== input.workspaceId) return fail("cross-workspace-parent", "Parent folder belongs to a different workspace.");
      const depth = getFolderDepth(input.parentId);
      if (depth >= MAX_FOLDER_DEPTH - 1) return fail("max-depth-exceeded", `Maximum folder depth of ${MAX_FOLDER_DEPTH} levels reached.`);
    }

    // Duplicate name warning (non-fatal — returns ok with new folder)
    const siblings = _folders.filter(f => f.parentId === (input.parentId ?? null) && f.scope === input.scope && f.workspaceId === input.workspaceId);
    const hasDuplicate = siblings.some(f => f.name.toLowerCase() === name.toLowerCase() && f.status === "active");

    const folder: OrgFolder = {
      id: makeId("ofol") as OrgFolderId,
      name,
      scope: input.scope,
      status: "active",
      parentId: input.parentId ?? null,
      workspaceId: input.workspaceId,
      description: input.description,
      position: siblings.length,
      createdAt: now(),
      updatedAt: now(),
      documentCount: 0,
      childCount: 0,
      ownerId: input.scope === "personal" ? input.ownerId : undefined,
    };

    _folders = [..._folders, folder];
    if (hasDuplicate) {
      return ok({ ...folder, _warning: "A folder with this name already exists at this level." } as unknown as OrgFolder);
    }
    return ok(folder);
  }

  renameFolder(folderId: OrgFolderId, input: OrgRenameFolderInput): OrgResult<OrgFolder> {
    const name = input.name.trim().replace(/\s+/g, " ");
    if (!name) return fail("invalid-scope", "Folder name is required.");
    if (name.length > 120) return fail("invalid-scope", "Folder name must be 120 characters or fewer.");

    const idx = _folders.findIndex(f => f.id === folderId);
    if (idx < 0) return fail("folder-not-found", "Folder not found.");

    const updated = { ..._folders[idx]!, name, updatedAt: now() };
    _folders = [..._folders.slice(0, idx), updated, ..._folders.slice(idx + 1)];
    return ok(updated);
  }

  moveFolder(folderId: OrgFolderId, newParentId: OrgFolderId | null): OrgResult<OrgFolder> {
    const folderIdx = _folders.findIndex(f => f.id === folderId);
    if (folderIdx < 0) return fail("folder-not-found", "Folder not found.");
    const folder = _folders[folderIdx]!;

    if (newParentId) {
      if (newParentId === folderId) return fail("cycle-detected", "A folder cannot be its own parent.");
      if (isDescendant(folderId, newParentId)) return fail("cycle-detected", "Cannot move a folder into one of its own descendants.");
      const newParent = _folders.find(f => f.id === newParentId);
      if (!newParent) return fail("folder-not-found", "Target parent folder not found.");
      if (newParent.workspaceId !== folder.workspaceId) return fail("cross-workspace-parent", "Cannot move folder to a different workspace.");
      const depth = getFolderDepth(newParentId);
      if (depth >= MAX_FOLDER_DEPTH - 1) return fail("max-depth-exceeded", `Maximum folder depth of ${MAX_FOLDER_DEPTH} levels would be exceeded.`);
    }

    const updated = { ...folder, parentId: newParentId, updatedAt: now() };
    _folders = [..._folders.slice(0, folderIdx), updated, ..._folders.slice(folderIdx + 1)];
    return ok(updated);
  }

  reorderFolder(folderId: OrgFolderId, position: number): OrgResult<OrgFolder> {
    const idx = _folders.findIndex(f => f.id === folderId);
    if (idx < 0) return fail("folder-not-found", "Folder not found.");
    const updated = { ..._folders[idx]!, position, updatedAt: now() };
    _folders = [..._folders.slice(0, idx), updated, ..._folders.slice(idx + 1)];
    return ok(updated);
  }

  archiveFolder(folderId: OrgFolderId): OrgResult<OrgFolder> {
    const idx = _folders.findIndex(f => f.id === folderId);
    if (idx < 0) return fail("folder-not-found", "Folder not found.");
    if (_folders[idx]!.status === "archived") return fail("invalid-scope", "Folder is already archived.");
    const updated = { ..._folders[idx]!, status: "archived" as OrgFolderStatus, updatedAt: now() };
    _folders = [..._folders.slice(0, idx), updated, ..._folders.slice(idx + 1)];
    return ok(updated);
  }

  restoreFolder(folderId: OrgFolderId): OrgResult<OrgFolder> {
    const idx = _folders.findIndex(f => f.id === folderId);
    if (idx < 0) return fail("folder-not-found", "Folder not found.");
    // Check if parent is still valid
    let parentId = _folders[idx]!.parentId;
    if (parentId) {
      const parent = _folders.find(f => f.id === parentId);
      if (!parent || parent.status !== "active") { parentId = null; }
    }
    const updated = { ..._folders[idx]!, status: "active" as OrgFolderStatus, parentId, updatedAt: now() };
    _folders = [..._folders.slice(0, idx), updated, ..._folders.slice(idx + 1)];
    return ok(updated);
  }

  removeFolderDemonstration(folderId: OrgFolderId): OrgResult<void> {
    const folder = _folders.find(f => f.id === folderId);
    if (!folder) return fail("folder-not-found", "Folder not found.");
    const children = getChildren(folderId);
    if (children.length > 0) return fail("invalid-scope", "Cannot remove a folder that has child folders. Archive or remove child folders first.");
    // Clear document assignments to this folder
    for (const docId of Object.keys(_docFolders)) {
      _docFolders[docId] = (_docFolders[docId] ?? []).filter(id => id !== folderId);
    }
    _folders = _folders.filter(f => f.id !== folderId);
    return ok(undefined);
  }

  listFolderDocuments(folderId: OrgFolderId, items: DocumentListItem[]): DocumentListItem[] {
    const folder = _folders.find(f => f.id === folderId);
    if (!folder || folder.status !== "active") return [];
    return items.filter(item => (_docFolders[item.id] ?? []).includes(folderId));
  }

  moveDocumentsToFolder(documentIds: readonly string[], folderId: OrgFolderId): OrgResult<OrgBulkActionResult> {
    const folder = _folders.find(f => f.id === folderId);
    if (!folder) return fail("folder-not-found", "Target folder not found.");
    if (folder.status !== "active") return fail("invalid-scope", "Cannot move documents to an archived folder.");
    const succeeded: string[] = [];
    const failed: string[] = [];
    for (const id of documentIds) {
      const existing = _docFolders[id] ?? [];
      if (!existing.includes(folderId)) {
        _docFolders[id] = [...existing, folderId];
      }
      succeeded.push(id);
    }
    return ok({
      action: "bulk-move-folder",
      succeeded,
      failed,
      demonstrationOnly: true,
      notice: "Documents have been moved in frontend demonstration state only. No storage movement occurred.",
    });
  }

  // ── TAGS ──────────────────────────────────────────────────────────────────

  listTags(query: OrgQuery = {}): OrgResult<OrgTag[]> {
    let result = [..._tags];
    if (query.status) result = result.filter(t => t.status === query.status);
    if (query.q) {
      const q = query.q.toLowerCase();
      result = result.filter(t => t.name.toLowerCase().includes(q));
    }
    return ok(result.sort((a, b) => a.name.localeCompare(b.name)));
  }

  getTag(tagId: OrgTagId): OrgResult<OrgTag> {
    const t = _tags.find(t => t.id === tagId);
    if (!t) return fail("tag-not-found", `Tag ${tagId} not found in demonstration state.`);
    return ok(t);
  }

  createTag(input: OrgCreateTagInput): OrgResult<OrgTag> {
    const name = input.name.trim().replace(/\s+/g, " ");
    if (!name) return fail("invalid-scope", "Tag name is required.");
    if (name.length > 60) return fail("invalid-scope", "Tag name must be 60 characters or fewer.");
    const duplicate = _tags.find(t => t.name.toLowerCase() === name.toLowerCase() && t.status === "active" && t.workspaceId === input.workspaceId);
    if (duplicate) return fail("duplicate-name", "A tag with this name already exists.");
    const tag: OrgTag = {
      id: makeId("otag") as OrgTagId,
      name,
      style: input.style,
      status: "active",
      scope: "workspace",
      workspaceId: input.workspaceId,
      description: input.description,
      usageCount: 0,
      createdAt: now(),
      updatedAt: now(),
    };
    _tags = [..._tags, tag];
    return ok(tag);
  }

  renameTag(tagId: OrgTagId, input: OrgRenameTagInput): OrgResult<OrgTag> {
    const name = input.name.trim().replace(/\s+/g, " ");
    if (!name) return fail("invalid-scope", "Tag name is required.");
    const idx = _tags.findIndex(t => t.id === tagId);
    if (idx < 0) return fail("tag-not-found", "Tag not found.");
    const updated = { ..._tags[idx]!, name, updatedAt: now() };
    _tags = [..._tags.slice(0, idx), updated, ..._tags.slice(idx + 1)];
    return ok(updated);
  }

  updateTagStyle(tagId: OrgTagId, input: OrgUpdateTagStyleInput): OrgResult<OrgTag> {
    const idx = _tags.findIndex(t => t.id === tagId);
    if (idx < 0) return fail("tag-not-found", "Tag not found.");
    const updated = { ..._tags[idx]!, style: input.style, updatedAt: now() };
    _tags = [..._tags.slice(0, idx), updated, ..._tags.slice(idx + 1)];
    return ok(updated);
  }

  archiveTag(tagId: OrgTagId): OrgResult<OrgTag> {
    const idx = _tags.findIndex(t => t.id === tagId);
    if (idx < 0) return fail("tag-not-found", "Tag not found.");
    if (_tags[idx]!.status === "archived") return fail("invalid-scope", "Tag is already archived.");
    const updated = { ..._tags[idx]!, status: "archived" as OrgTagStatus, updatedAt: now() };
    _tags = [..._tags.slice(0, idx), updated, ..._tags.slice(idx + 1)];
    return ok(updated);
  }

  restoreTag(tagId: OrgTagId): OrgResult<OrgTag> {
    const idx = _tags.findIndex(t => t.id === tagId);
    if (idx < 0) return fail("tag-not-found", "Tag not found.");
    const updated = { ..._tags[idx]!, status: "active" as OrgTagStatus, updatedAt: now() };
    _tags = [..._tags.slice(0, idx), updated, ..._tags.slice(idx + 1)];
    return ok(updated);
  }

  removeTagDemonstration(tagId: OrgTagId): OrgResult<void> {
    if (!_tags.find(t => t.id === tagId)) return fail("tag-not-found", "Tag not found.");
    // Clear all assignments
    for (const docId of Object.keys(_docTags)) {
      _docTags[docId] = (_docTags[docId] ?? []).filter(id => id !== tagId);
    }
    _tags = _tags.filter(t => t.id !== tagId);
    return ok(undefined);
  }

  addTagsToDocuments(documentIds: readonly string[], tagIds: readonly OrgTagId[]): OrgResult<OrgBulkActionResult> {
    const activeTags = tagIds.filter(id => _tags.find(t => t.id === id && t.status === "active"));
    const succeeded: string[] = [];
    for (const docId of documentIds) {
      const existing = _docTags[docId] ?? [];
      const merged = [...new Set([...existing, ...activeTags])];
      _docTags[docId] = merged;
      succeeded.push(docId);
    }
    return ok({ action: "bulk-add-tags", succeeded, failed: [], demonstrationOnly: true, notice: "Tags applied in frontend demonstration state." });
  }

  removeTagsFromDocuments(documentIds: readonly string[], tagIds: readonly OrgTagId[]): OrgResult<OrgBulkActionResult> {
    const succeeded: string[] = [];
    for (const docId of documentIds) {
      _docTags[docId] = (_docTags[docId] ?? []).filter(id => !tagIds.includes(id));
      succeeded.push(docId);
    }
    return ok({ action: "bulk-remove-tags", succeeded, failed: [], demonstrationOnly: true, notice: "Tags removed in frontend demonstration state." });
  }

  getDocumentTags(documentId: string): OrgTag[] {
    const ids = _docTags[documentId] ?? [];
    return ids.map(id => _tags.find(t => t.id === id)!).filter(Boolean);
  }

  getDocumentTagAssignments(documentIds: readonly string[], availableTags: OrgTag[]): OrgTagAssignment[] {
    return availableTags.filter(t => t.status === "active").map(tag => {
      const assigned = documentIds.filter(id => (_docTags[id] ?? []).includes(tag.id as OrgTagId));
      let state: OrgTagAssignment["state"] = "none";
      if (assigned.length === documentIds.length) state = "all";
      else if (assigned.length > 0) state = "some";
      return { tagId: tag.id as OrgTagId, tagName: tag.name, style: tag.style, state };
    });
  }

  // ── STARRED ───────────────────────────────────────────────────────────────

  listStarredDocuments(): OrgFavoriteItem[] { return [..._starred]; }

  isStarred(documentId: string): boolean { return _starred.some(s => s.documentId === documentId); }

  starDocuments(documentIds: readonly string[]): OrgResult<OrgBulkActionResult> {
    for (const id of documentIds) {
      if (!_starred.find(s => s.documentId === id)) {
        _starred = [..._starred, { documentId: id, starredAt: now() }];
      }
    }
    return ok({ action: "bulk-star", succeeded: [...documentIds], failed: [], demonstrationOnly: true, notice: "Documents starred in frontend demonstration state." });
  }

  unstarDocuments(documentIds: readonly string[]): OrgResult<OrgBulkActionResult> {
    _starred = _starred.filter(s => !documentIds.includes(s.documentId));
    return ok({ action: "bulk-unstar", succeeded: [...documentIds], failed: [], demonstrationOnly: true, notice: "Documents unstarred in frontend demonstration state." });
  }

  // ── RECENTS ───────────────────────────────────────────────────────────────

  listRecentDocuments(workspaceId?: string): OrgRecentItem[] {
    let result = [..._recents];
    if (workspaceId) result = result.filter(r => r.workspaceId === workspaceId);
    return result.sort((a, b) => b.viewedAt.localeCompare(a.viewedAt));
  }

  recordRecentDocument(documentId: string, title: string, workspaceId: string): void {
    _recents = _recents.filter(r => r.documentId !== documentId);
    _recents = [{ id: makeId("recent") as OrgRecentId, documentId, title, workspaceId, viewedAt: now() }, ..._recents];
    if (_recents.length > MAX_RECENT_ITEMS) _recents = _recents.slice(0, MAX_RECENT_ITEMS);
  }

  removeRecentDocument(recentId: OrgRecentId): void {
    _recents = _recents.filter(r => r.id !== recentId);
  }

  clearRecentDocuments(): void { _recents = []; }

  clearWorkspaceScopedRecents(workspaceId: string): void {
    _recents = _recents.filter(r => r.workspaceId !== workspaceId);
  }

  // ── SAVED VIEWS ───────────────────────────────────────────────────────────

  listSavedViews(userId?: string): OrgResult<OrgSavedView[]> {
    let result = [..._views];
    if (userId) result = result.filter(v => v.ownerId === userId || v.scope !== "personal");
    return ok(result.sort((a, b) => {
      if (a.isDefault && !b.isDefault) return -1;
      if (!a.isDefault && b.isDefault) return 1;
      return a.name.localeCompare(b.name);
    }));
  }

  getSavedView(viewId: OrgViewId): OrgResult<OrgSavedView> {
    const v = _views.find(v => v.id === viewId);
    if (!v) return fail("view-not-found", `Saved view ${viewId} not found in demonstration state.`);
    return ok(v);
  }

  createSavedView(input: OrgCreateViewInput): OrgResult<OrgSavedView> {
    const name = input.name.trim().replace(/\s+/g, " ");
    if (!name) return fail("invalid-scope", "View name is required.");
    if (name.length > 80) return fail("invalid-scope", "View name must be 80 characters or fewer.");
    // Enforce one default
    if (input.isDefault) {
      _views = _views.map(v => v.ownerId === input.ownerId && v.isDefault ? { ...v, isDefault: false, updatedAt: now() } : v);
    }
    const view: OrgSavedView = {
      id: makeId("oview") as OrgViewId,
      name,
      scope: input.scope,
      status: "active",
      isDefault: input.isDefault,
      workspaceId: input.workspaceId,
      ownerId: input.ownerId,
      definition: input.definition,
      createdAt: now(),
      updatedAt: now(),
    };
    _views = [..._views, view];
    return ok(view);
  }

  updateSavedView(viewId: OrgViewId, input: OrgUpdateViewInput): OrgResult<OrgSavedView> {
    const idx = _views.findIndex(v => v.id === viewId);
    if (idx < 0) return fail("view-not-found", "Saved view not found.");
    const existing = _views[idx]!;
    if (input.isDefault) {
      _views = _views.map(v => v.ownerId === existing.ownerId && v.isDefault ? { ...v, isDefault: false, updatedAt: now() } : v);
    }
    const updated = {
      ..._views.find(v => v.id === viewId)!,
      ...(input.name       ? { name: input.name.trim() } : {}),
      ...(input.definition ? { definition: input.definition } : {}),
      ...(input.isDefault !== undefined ? { isDefault: input.isDefault } : {}),
      status: "active" as OrgViewStatus,
      updatedAt: now(),
    };
    const newIdx = _views.findIndex(v => v.id === viewId);
    _views = [..._views.slice(0, newIdx), updated, ..._views.slice(newIdx + 1)];
    return ok(updated);
  }

  renameSavedView(viewId: OrgViewId, name: string): OrgResult<OrgSavedView> {
    return this.updateSavedView(viewId, { name });
  }

  duplicateSavedView(viewId: OrgViewId): OrgResult<OrgSavedView> {
    const r = this.getSavedView(viewId);
    if (!r.ok) return r;
    const original = r.data;
    return this.createSavedView({
      name: `${original.name} (Copy)`,
      scope: original.scope,
      definition: original.definition,
      isDefault: false,
      workspaceId: original.workspaceId,
      ownerId: original.ownerId,
    });
  }

  setDefaultSavedView(viewId: OrgViewId): OrgResult<OrgSavedView> {
    const v = _views.find(v => v.id === viewId);
    if (!v) return fail("view-not-found", "Saved view not found.");
    if (v.status !== "active") return fail("invalid-scope", "Only active views can be set as default.");
    return this.updateSavedView(viewId, { isDefault: true });
  }

  archiveSavedView(viewId: OrgViewId): OrgResult<OrgSavedView> {
    const idx = _views.findIndex(v => v.id === viewId);
    if (idx < 0) return fail("view-not-found", "Saved view not found.");
    if (_views[idx]!.isDefault) {
      _views = [..._views.slice(0, idx), { ..._views[idx]!, isDefault: false }, ..._views.slice(idx + 1)];
    }
    return this.updateSavedView(viewId, { isDefault: false });
  }

  restoreSavedView(viewId: OrgViewId): OrgResult<OrgSavedView> {
    const idx = _views.findIndex(v => v.id === viewId);
    if (idx < 0) return fail("view-not-found", "Saved view not found.");
    const updated = { ..._views[idx]!, status: "active" as OrgViewStatus, updatedAt: now() };
    _views = [..._views.slice(0, idx), updated, ..._views.slice(idx + 1)];
    return ok(updated);
  }

  removeSavedViewDemonstration(viewId: OrgViewId): OrgResult<void> {
    if (!_views.find(v => v.id === viewId)) return fail("view-not-found", "Saved view not found.");
    _views = _views.filter(v => v.id !== viewId);
    return ok(undefined);
  }

  // ── BULK ELIGIBILITY ──────────────────────────────────────────────────────

  getBulkActionAvailability(
    action: OrgBulkActionType,
    documentIds: readonly string[],
    items: DocumentListItem[],
  ): OrgBulkEligibility {
    const eligible: OrgBulkEligibilityResult[] = [];
    const ineligible: OrgBulkEligibilityResult[] = [];
    const previewActions: OrgBulkActionType[] = [
      "preview-bulk-export", "preview-bulk-reminders", "preview-bulk-cancel",
      "preview-bulk-void", "preview-bulk-ownership-transfer", "preview-bulk-retention",
    ];
    const isPreview = previewActions.includes(action);

    for (const id of documentIds) {
      const item = items.find(i => i.id === id);
      if (!item) { ineligible.push({ documentId: id, reason: "unavailable" }); continue; }

      let reason: OrgBulkEligibilityResult["reason"] = "eligible";

      if (action === "bulk-archive") {
        const archivableStatuses = ["completed", "declined", "expired", "voided", "failed-delivery", "cancelled"];
        if (item.status === "archived") reason = "archived-only";
        else if (!archivableStatuses.includes(item.status)) reason = "ineligible-status";
      } else if (action === "bulk-restore") {
        if (item.status !== "archived") reason = "active-only";
      } else if (action === "bulk-star") {
        if (this.isStarred(id)) reason = "ineligible-status"; // already starred
        else reason = "eligible";
      } else if (action === "bulk-unstar") {
        if (!this.isStarred(id)) reason = "ineligible-status"; // not starred
        else reason = "eligible";
      } else if (action === "preview-bulk-reminders") {
        const ineligibleForReminder = ["draft", "completed", "archived", "expired", "cancelled", "voided"];
        if (ineligibleForReminder.includes(item.status)) reason = "ineligible-status";
        else reason = "preview-only";
      } else if (action === "preview-bulk-cancel") {
        const cancellableStatuses = ["sent", "delivered", "viewed", "authentication-completed", "awaiting-signature", "awaiting-approval", "partially-completed"];
        if (!cancellableStatuses.includes(item.status)) reason = "ineligible-status";
        else reason = "preview-only";
      } else if (isPreview) {
        reason = "preview-only";
      }

      if (reason === "eligible" || reason === "preview-only") {
        eligible.push({ documentId: id, reason });
      } else {
        ineligible.push({ documentId: id, reason });
      }
    }

    return { action, eligible, ineligible, previewOnly: isPreview };
  }

  // ── BULK PREVIEWS ─────────────────────────────────────────────────────────

  previewBulkExport(documentIds: readonly string[], items: DocumentListItem[]): OrgExportPreview {
    const elig = this.getBulkActionAvailability("preview-bulk-export", documentIds, items);
    return {
      eligibleCount: elig.eligible.length,
      ineligibleCount: elig.ineligible.length,
      proposedContents: ["Document titles", "Status", "Updated date", "Created date", "Participant count"],
      privacyExclusions: ["Signatures and initials", "Authentication evidence", "Consent records", "Participant field values", "Verification evidence"],
      notice: "This preview does not generate, download, or deliver any files.",
      demonstrationOnly: true,
    };
  }

  previewBulkReminders(documentIds: readonly string[], items: DocumentListItem[]): OrgReminderPreview {
    const elig = this.getBulkActionAvailability("preview-bulk-reminders", documentIds, items);
    return {
      eligibleCount: elig.eligible.length,
      ineligibleCount: elig.ineligible.length,
      ineligibleReasons: ["Completed documents do not need reminders", "Draft documents have not been sent", "Archived, expired, cancelled, or voided documents are ineligible"],
      notice: "No reminder, email, SMS message, or notification is sent from this frontend preview.",
      demonstrationOnly: true,
    };
  }

  previewBulkCancellation(documentIds: readonly string[], items: DocumentListItem[]): OrgCancellationPreview {
    const elig = this.getBulkActionAvailability("preview-bulk-cancel", documentIds, items);
    return {
      eligibleCount: elig.eligible.length,
      ineligibleCount: elig.ineligible.length,
      ineligibleReasons: ["Completed documents cannot be cancelled", "Draft documents have not been sent", "Already cancelled or voided"],
      consequenceSummary: "Cancellation would stop the signing request and notify participants. Signed portions would not be legally finalized.",
      notice: "This frontend preview does not cancel, void, notify, or modify any transaction.",
      demonstrationOnly: true,
    };
  }

  previewOwnershipTransfer(documentIds: readonly string[], items: DocumentListItem[]): OrgOwnershipTransferPreview {
    const elig = this.getBulkActionAvailability("preview-bulk-ownership-transfer", documentIds, items);
    return {
      eligibleCount: elig.eligible.length,
      ineligibleCount: elig.ineligible.length,
      ineligibleReasons: ["Cross-workspace transfer is not supported", "Recipient documents cannot have ownership transferred"],
      notice: "This preview does not transfer ownership or change document access.",
      demonstrationOnly: true,
    };
  }

  previewRetention(documentIds: readonly string[], items: DocumentListItem[]): OrgRetentionPreview {
    const elig = this.getBulkActionAvailability("preview-bulk-retention", documentIds, items);
    return {
      eligibleCount: elig.eligible.length,
      ineligibleCount: elig.ineligible.length,
      policyNotice: "Retention policies are managed by your workspace administrator in accordance with applicable law. This preview does not constitute legal, compliance, or records-management advice.",
      notice: "This preview does not enforce retention, create legal holds, or delete records.",
      demonstrationOnly: true,
    };
  }

  // ── BULK MUTATIONS (frontend state only) ──────────────────────────────────

  applyFrontendBulkMove(input: OrgMoveInput): OrgResult<OrgBulkActionResult> {
    return this.moveDocumentsToFolder(input.documentIds, input.folderId);
  }

  applyFrontendBulkTagMutation(input: OrgTagMutationInput): OrgResult<OrgBulkActionResult> {
    if (input.operation === "add") return this.addTagsToDocuments(input.documentIds, input.tagIds);
    return this.removeTagsFromDocuments(input.documentIds, input.tagIds);
  }

  applyFrontendBulkFavoriteMutation(input: OrgFavoriteInput): OrgResult<OrgBulkActionResult> {
    if (input.operation === "star") return this.starDocuments(input.documentIds);
    return this.unstarDocuments(input.documentIds);
  }

  applyFrontendBulkArchiveMutation(_input: OrgArchiveInput): OrgResult<OrgBulkActionResult> {
    // Archive state is managed by the base document service; this returns the result shape
    return ok({
      action: "bulk-archive",
      succeeded: [..._input.documentIds],
      failed: [],
      demonstrationOnly: true,
      notice: "Archive applied in frontend demonstration state. Archive is not deletion. Documents remain accessible and can be restored.",
    });
  }

  // ── DOCUMENT METADATA HELPERS ─────────────────────────────────────────────

  getDocumentFolders(documentId: string): OrgFolder[] {
    const ids = _docFolders[documentId] ?? [];
    return ids.map(id => _folders.find(f => f.id === id)!).filter(Boolean);
  }

  getTagColor(tag: OrgTag): string {
    return TAG_STYLE_COLORS[tag.style];
  }

  // ── RESET ─────────────────────────────────────────────────────────────────

  resetDocumentOrganizationDemonstration(): void {
    _folders    = JSON.parse(JSON.stringify(INITIAL_FOLDERS)) as OrgFolder[];
    _tags       = JSON.parse(JSON.stringify(INITIAL_TAGS)) as OrgTag[];
    _views      = JSON.parse(JSON.stringify(INITIAL_SAVED_VIEWS)) as OrgSavedView[];
    _docFolders = JSON.parse(JSON.stringify(INITIAL_DOC_FOLDERS));
    _docTags    = JSON.parse(JSON.stringify(INITIAL_DOC_TAGS));
    _starred    = [
      { documentId: "txn_001", starredAt: "2026-07-10T09:00:00Z" },
      { documentId: "txn_003", starredAt: "2026-07-05T09:00:00Z" },
    ];
    _recents = [
      { id: "recent_001" as OrgRecentId, documentId: "txn_001", title: "Retainer Agreement", workspaceId: WS_ID, viewedAt: "2026-07-16T08:30:00Z" },
    ];
  }

  clearWorkspaceScopedOrganization(workspaceId: string): void {
    this.clearWorkspaceScopedRecents(workspaceId);
    // Workspace-scoped folders, tags, and views remain (they're Workspace fixtures)
    // but any selection state is managed at the component level
  }
}

export const documentOrganizationService = new DocumentOrganizationService();
