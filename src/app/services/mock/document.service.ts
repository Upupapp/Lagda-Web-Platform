// Mock Document service for the authenticated /app/documents workspace.
// All state is in-memory — no backend, no persistence, no real mutations.
// Archive, restore, rename, tag, and folder operations mutate a local copy
// of the fixture data only. Changes are lost on page refresh.
// No real document content, no real participant data, no audit evidence.

import type {
  DocumentListQuery,
  DocumentListItem,
  DocumentListResult,
  DocumentFolder,
  DocumentTag,
  DocumentView,
  DocumentScenario,
  DocumentSortField,
  DocumentSortDirection,
} from "../../models/documents";
import {
  VALID_DOCUMENT_VIEWS,
  VIEW_STATUS_SET,
  ACTIVE_TRANSACTION_STATUSES,
  DEFAULT_QUERY,
  VALID_DOC_SCENARIOS,
} from "../../models/documents";
import {
  DOCUMENT_FIXTURES,
  DOCUMENT_FOLDERS,
  DOCUMENT_TAGS,
  VALID_FOLDER_IDS,
  VALID_TAG_IDS,
} from "../../data/mock/documents";
import { delay } from "./delay";

const PAGE_SIZE = 20;
const EXPIRY_WINDOW_MS = 14 * 24 * 60 * 60 * 1000; // 14 days

// ── In-memory mutable store ───────────────────────────────────────────────────
// Deep-copied from fixtures so mutations don't affect the original constants.

function deepCopy<T>(v: T): T {
  return JSON.parse(JSON.stringify(v)) as T;
}

let store: DocumentListItem[] = deepCopy(DOCUMENT_FIXTURES);

// ── Filter helpers ─────────────────────────────────────────────────────────────

function matchesView(item: DocumentListItem, view: DocumentView, now: Date): boolean {
  switch (view) {
    case "all":
      return item.status !== "archived";
    case "needs-attention": {
      const statuses = VIEW_STATUS_SET["needs-attention"]!;
      return statuses.includes(item.status);
    }
    case "drafts": {
      const statuses = VIEW_STATUS_SET["drafts"]!;
      return statuses.includes(item.status);
    }
    case "in-progress": {
      const statuses = VIEW_STATUS_SET["in-progress"]!;
      return statuses.includes(item.status);
    }
    case "awaiting-my-action":
      return item.isMyAction && item.status === "awaiting-signature";
    case "completed":
      return item.status === "completed";
    case "expiring": {
      if (!item.expiresAt) return false;
      const exp = new Date(item.expiresAt).getTime();
      const nowT = now.getTime();
      return (
        ACTIVE_TRANSACTION_STATUSES.includes(item.status) &&
        exp > nowT &&
        exp <= nowT + EXPIRY_WINDOW_MS
      );
    }
    case "failed-delivery":
      return item.status === "failed-delivery";
    case "archived":
      return item.status === "archived";
    default:
      return true;
  }
}

function matchesSearch(item: DocumentListItem, q: string): boolean {
  if (!q) return true;
  const lower = q.toLowerCase().trim();
  // Search title and owner name only — never document content
  return (
    item.title.toLowerCase().includes(lower) ||
    item.ownerName.toLowerCase().includes(lower)
  );
}

function matchesFolder(item: DocumentListItem, folderId: string | null): boolean {
  if (!folderId) return true;
  if (!VALID_FOLDER_IDS.has(folderId)) return true; // invalid ID → ignore
  return item.folderIds.includes(folderId);
}

function matchesTag(item: DocumentListItem, tagId: string | null): boolean {
  if (!tagId) return true;
  if (!VALID_TAG_IDS.has(tagId)) return true; // invalid ID → ignore
  return item.tags.some(t => t.id === tagId);
}

// ── Sort helper ───────────────────────────────────────────────────────────────

function sortItems(
  items: DocumentListItem[],
  sort: DocumentSortField,
  dir: DocumentSortDirection,
): DocumentListItem[] {
  const sorted = [...items];
  sorted.sort((a, b) => {
    let cmp = 0;
    switch (sort) {
      case "updated":
        cmp = new Date(a.updatedAt).getTime() - new Date(b.updatedAt).getTime();
        break;
      case "created":
        cmp = new Date(a.createdAt).getTime() - new Date(b.createdAt).getTime();
        break;
      case "title":
        cmp = a.title.localeCompare(b.title);
        break;
      case "status":
        cmp = a.status.localeCompare(b.status);
        break;
      case "expiry": {
        const aExp = a.expiresAt ? new Date(a.expiresAt).getTime() : Infinity;
        const bExp = b.expiresAt ? new Date(b.expiresAt).getTime() : Infinity;
        cmp = aExp - bExp;
        break;
      }
    }
    return dir === "asc" ? cmp : -cmp;
  });
  return sorted;
}

// ── View counts ───────────────────────────────────────────────────────────────

function computeViewCounts(items: DocumentListItem[], now: Date): Partial<Record<DocumentView, number>> {
  const counts: Partial<Record<DocumentView, number>> = {};
  for (const view of VALID_DOCUMENT_VIEWS) {
    counts[view] = items.filter(i => matchesView(i, view, now)).length;
  }
  return counts;
}

// ── Folder counts ─────────────────────────────────────────────────────────────

function computeFolderCounts(items: DocumentListItem[]): Record<string, number> {
  const counts: Record<string, number> = {};
  for (const item of items) {
    if (item.status === "archived") continue;
    for (const fid of item.folderIds) {
      counts[fid] = (counts[fid] ?? 0) + 1;
    }
  }
  return counts;
}

// ── Large-set scenario ────────────────────────────────────────────────────────

function makeLargeSet(): DocumentListItem[] {
  const base = deepCopy(DOCUMENT_FIXTURES).filter(i => i.status !== "archived");
  const result: DocumentListItem[] = [];
  for (let i = 0; i < 6; i++) {
    for (const item of base) {
      result.push({ ...item, id: `${item.id}_r${i}`, title: `${item.title} (copy ${i + 1})` });
    }
  }
  return [...base, ...result].slice(0, 48);
}

// ── Service class ─────────────────────────────────────────────────────────────

class MockDocumentService {
  async list(query: DocumentListQuery, scenario: DocumentScenario = "standard"): Promise<DocumentListResult> {
    await delay(200);

    if (scenario === "full-error") {
      throw new Error("Document service unavailable (demo full-error scenario).");
    }

    if (scenario === "new-workspace") {
      return this._emptyResult(query);
    }

    const source = scenario === "large-set" ? makeLargeSet() : store;
    const now = new Date();

    const filtered = source.filter(item =>
      matchesView(item, query.view, now) &&
      matchesSearch(item, query.q) &&
      matchesFolder(item, query.folderId) &&
      matchesTag(item, query.tagId)
    );

    const sorted  = sortItems(filtered, query.sort, query.dir);
    const total   = sorted.length;
    const page    = Math.max(1, query.page);
    const start   = (page - 1) * PAGE_SIZE;
    const items   = sorted.slice(start, start + PAGE_SIZE);

    const viewCounts   = computeViewCounts(source, now);
    const folderCounts = computeFolderCounts(source);

    return {
      items,
      total,
      page,
      perPage:     PAGE_SIZE,
      hasNextPage: start + PAGE_SIZE < total,
      hasPrevPage: page > 1,
      folderCounts,
      viewCounts,
    };
  }

  async getFolders(): Promise<DocumentFolder[]> {
    await delay(50);
    return deepCopy(DOCUMENT_FOLDERS);
  }

  async getTags(): Promise<DocumentTag[]> {
    await delay(50);
    return deepCopy(DOCUMENT_TAGS);
  }

  async archive(ids: string[]): Promise<void> {
    await delay(100);
    for (const item of store) {
      if (ids.includes(item.id) && item.status !== "archived") {
        item.preArchiveStatus = item.status;
        item.status = "archived";
        item.updatedAt = new Date().toISOString();
      }
    }
  }

  async restore(ids: string[]): Promise<void> {
    await delay(100);
    for (const item of store) {
      if (ids.includes(item.id) && item.status === "archived") {
        item.status = item.preArchiveStatus ?? "sent";
        item.preArchiveStatus = undefined;
        item.updatedAt = new Date().toISOString();
      }
    }
  }

  async renameDraft(id: string, title: string): Promise<void> {
    await delay(80);
    const item = store.find(i => i.id === id);
    if (item && item.status === "draft") {
      item.title = title.slice(0, 200); // hard cap — no XSS via innerHTML anywhere
      item.updatedAt = new Date().toISOString();
    }
  }

  async addTag(ids: string[], tagId: string): Promise<void> {
    await delay(80);
    const tag = DOCUMENT_TAGS.find(t => t.id === tagId);
    if (!tag) return;
    for (const item of store) {
      if (ids.includes(item.id) && !item.tags.some(t => t.id === tagId)) {
        item.tags = [...item.tags, { ...tag }];
        item.updatedAt = new Date().toISOString();
      }
    }
  }

  async moveToFolder(ids: string[], folderId: string): Promise<void> {
    await delay(80);
    if (!VALID_FOLDER_IDS.has(folderId)) return;
    for (const item of store) {
      if (ids.includes(item.id) && !item.folderIds.includes(folderId)) {
        item.folderIds = [...item.folderIds, folderId];
        item.updatedAt = new Date().toISOString();
      }
    }
  }

  /**
   * Bulk Send (C33) Draft Projections.
   *
   * Documents stays the single source of truth for transactions: Bulk Send does NOT
   * keep its own transaction store. It hands finished Draft records here and they
   * appear in the normal Documents workspace from then on.
   *
   * These are Drafts and nothing more — no invitation, no recipient session, no
   * My Actions assignment, no Evidence, no Verification, and no delivery of any kind.
   */
  addDraftProjections(items: DocumentListItem[]): void {
    const existing = new Set(store.map(i => i.id));
    for (const item of items) {
      if (existing.has(item.id)) continue;
      store = [deepCopy(item), ...store];
    }
  }

  /** Removes Draft Projections created by one Bulk Send batch (demonstration only). */
  removeDraftProjectionsForBatch(batchId: string): void {
    store = store.filter(i => i.bulkSendSource?.batchId !== batchId);
  }

  // Resets in-memory store to the original fixtures (useful for dev/demo)
  reset(): void {
    store = deepCopy(DOCUMENT_FIXTURES);
  }

  private _emptyResult(query: DocumentListQuery): DocumentListResult {
    return {
      items: [],
      total: 0,
      page: query.page,
      perPage: PAGE_SIZE,
      hasNextPage: false,
      hasPrevPage: false,
      folderCounts: {},
      viewCounts: {},
    };
  }
}

export const mockDocumentService = new MockDocumentService();

// Re-export tag and folder fixtures for use in the page component
export { DOCUMENT_TAGS as DOC_MOCK_TAGS, DOCUMENT_FOLDERS as DOC_MOCK_FOLDERS };
