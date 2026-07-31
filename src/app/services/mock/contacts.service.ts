// MockContactService — in-memory contact CRUD with SESSION_MUTATIONS overlay.
// Frontend-only. No backend calls, no persistence, no real sync or import.
// SESSION_MUTATIONS resets on page reload. demonstrationOnly: true on all writes.

import type {
  Contact,
  ContactId,
  ContactGroupId,
  ContactTagId,
  ContactListQuery,
  ContactListResult,
  ContactListItem,
  ContactGroup,
  ContactGroupSummary,
  ContactUsageSummary,
  ContactDuplicateCandidate,
  ContactMergePreview,
  ContactCreateInput,
  ContactUpdateInput,
  ContactActionAvailability,
  ContactValidationResult,
  ContactImportPreview,
  ContactView,
  ContactPickerResult,
  ContactActionId,
} from "../../models/contacts";
import {
  CONTACT_VIEWS,
} from "../../models/contacts";
import {
  ALL_BASE_CONTACTS,
  CONTACT_GROUPS,
  CONTACT_USAGE_SUMMARIES,
  MOCK_IMPORT_PREVIEW,
  getMockContact,
  toListItem,
  CID_MARCO,
  CID_MARCO_ALT,
} from "../../../app/data/mock/contacts";

// ── Session mutation store ────────────────────────────────────────────────────

const SESSION_CONTACTS   = new Map<ContactId,      Contact>();
const SESSION_GROUPS     = new Map<ContactGroupId,  ContactGroup>();
const SESSION_PICKER_LOG: { contactId: ContactId; usedAt: string }[] = [];

let _sessionGroupsInitialized = false;

function ensureGroupsInit() {
  if (_sessionGroupsInitialized) return;
  _sessionGroupsInitialized = true;
  for (const g of CONTACT_GROUPS) {
    SESSION_GROUPS.set(g.id, { ...g });
  }
}

function resolveContact(id: ContactId): Contact | undefined {
  if (SESSION_CONTACTS.has(id)) return SESSION_CONTACTS.get(id)!;
  return getMockContact(id);
}

function resolveAllContacts(): Contact[] {
  const base = ALL_BASE_CONTACTS.filter(c => !SESSION_CONTACTS.has(c.id));
  const session = Array.from(SESSION_CONTACTS.values());
  return [...base, ...session];
}

function resolveGroup(id: ContactGroupId): ContactGroup | undefined {
  ensureGroupsInit();
  return SESSION_GROUPS.get(id);
}

function resolveAllGroups(): ContactGroup[] {
  ensureGroupsInit();
  return Array.from(SESSION_GROUPS.values());
}

// ── Helpers ───────────────────────────────────────────────────────────────────

function delay(ms: number): Promise<void> {
  return new Promise(resolve => setTimeout(resolve, ms));
}

const EMAIL_RE = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
const WS_ID    = "ws_northbridge_001";
const OWNER_ID = "user_ana_reyes_001";
const PAGE_SIZE = 20;

function normalizeEmail(email: string): string {
  return email.trim().toLowerCase();
}

function applySearch(items: ContactListItem[], q: string): ContactListItem[] {
  if (!q.trim()) return items;
  const lq = q.toLowerCase();
  return items.filter(c =>
    c.name.toLowerCase().includes(lq) ||
    c.email.toLowerCase().includes(lq) ||
    (c.organization ?? "").toLowerCase().includes(lq) ||
    (c.title ?? "").toLowerCase().includes(lq)
  );
}

function applyViewFilter(contacts: Contact[], view: ContactView): Contact[] {
  switch (view) {
    case "workspace":   return contacts.filter(c => c.scope === "workspace" && c.status === "active");
    case "personal":    return contacts.filter(c => c.scope === "personal"  && c.status === "active");
    case "archived":    return contacts.filter(c => c.status === "archived");
    case "recent":      return contacts.filter(c => c.status === "active" && !!c.lastUsedAt)
                                       .sort((a, b) => (b.lastUsedAt! > a.lastUsedAt! ? 1 : -1))
                                       .slice(0, 10);
    case "frequent":    return contacts.filter(c => c.status === "active" && c.usageCount > 0)
                                       .sort((a, b) => b.usageCount - a.usageCount)
                                       .slice(0, 10);
    case "duplicates":  return contacts.filter(c => c.status === "active" && isDuplicateCandidate(c, contacts));
    case "all":
    default:
      return contacts.filter(c => c.status !== "archived");
  }
}

function isDuplicateCandidate(c: Contact, all: Contact[]): boolean {
  const norm = normalizeEmail(c.email);
  return all.some(other =>
    other.id !== c.id &&
    other.status !== "archived" &&
    normalizeEmail(other.email) === norm
  );
}

function computeViewCounts(all: Contact[]): Record<ContactView, number> {
  const result = {} as Record<ContactView, number>;
  for (const v of CONTACT_VIEWS) {
    result[v] = applyViewFilter(all, v).length;
  }
  return result;
}

// ── Actions availability ──────────────────────────────────────────────────────

function getContactActionAvailability(c: Contact): ContactActionAvailability[] {
  const isActive    = c.status === "active";
  const isArchived  = c.status === "archived";
  const isInvalid   = c.status === "invalid";
  const isWorkspace = c.scope  === "workspace";

  const actions: { a: ContactActionId; enabled: boolean; reason?: string }[] = [
    { a: "view",                  enabled: true },
    { a: "use-as-participant",    enabled: isActive && !isInvalid, reason: isInvalid ? "Contact has a validation issue that must be resolved first." : isArchived ? "Restore this contact before using it." : undefined },
    { a: "edit",                  enabled: isActive || isInvalid, reason: isArchived ? "Restore this contact before editing." : undefined },
    { a: "add-tag",               enabled: isActive, reason: isArchived ? "Not available for archived contacts." : undefined },
    { a: "remove-tag",            enabled: isActive, reason: isArchived ? "Not available for archived contacts." : undefined },
    { a: "add-to-group",          enabled: isActive && !isInvalid },
    { a: "remove-from-group",     enabled: true },
    { a: "archive",               enabled: isActive || isInvalid, reason: isArchived ? "Already archived." : undefined },
    { a: "restore",               enabled: isArchived, reason: isActive ? "Already active." : undefined },
    { a: "review-duplicate",      enabled: isActive && isDuplicateCandidate(c, resolveAllContacts()) },
    { a: "merge-demonstration",   enabled: isActive && isWorkspace, reason: !isWorkspace ? "Only workspace contacts can be merged." : undefined },
    { a: "import-readiness",      enabled: true },
  ];

  return actions.map(({ a, enabled, reason }) => ({ action: a, enabled, reason }));
}

// ── Validation ────────────────────────────────────────────────────────────────

function validateContactInput(input: Partial<ContactCreateInput>, existingId?: ContactId): ContactValidationResult {
  const issues: ContactValidationResult["issues"] = [];

  if (!input.name?.trim()) {
    issues.push({ field: "name", severity: "error", message: "Full name is required." });
  }
  if (!input.email?.trim()) {
    issues.push({ field: "email", severity: "error", message: "Email address is required." });
  } else if (!EMAIL_RE.test(input.email.trim())) {
    issues.push({ field: "email", severity: "error", message: "Enter a valid email address." });
  }

  return { valid: issues.filter(i => i.severity === "error").length === 0, issues };
}

// ── Duplicate detection ───────────────────────────────────────────────────────

function findPotentialDuplicates(name: string, email: string, excludeId?: ContactId): ContactDuplicateCandidate[] {
  const normEmail = normalizeEmail(email);
  const all = resolveAllContacts().filter(c => c.status !== "archived" && c.id !== excludeId);
  const candidates: ContactDuplicateCandidate[] = [];

  for (const c of all) {
    const reasons: ContactDuplicateCandidate["reasons"] = [];
    const normC = normalizeEmail(c.email);

    if (normC === normEmail) {
      reasons.push(email === c.email ? "exact-email-match" : "case-insensitive-email-match");
    }
    if (
      reasons.length === 0 &&
      c.name.trim().toLowerCase() === name.trim().toLowerCase() &&
      c.email.split("@")[1] === email.split("@")[1]
    ) {
      reasons.push("same-name-similar-email-domain");
    }

    if (reasons.length > 0) {
      candidates.push({
        existingContactId: c.id,
        existingName:      c.name,
        existingEmail:     c.email,
        existingOrg:       c.organization,
        existingScope:     c.scope,
        reasons,
        severity:          reasons.includes("exact-email-match") || reasons.includes("case-insensitive-email-match") ? "high" : "medium",
      });
    }
  }

  return candidates;
}

// ── Public service API ────────────────────────────────────────────────────────

export const mockContactService = {

  async listContacts(query: ContactListQuery): Promise<ContactListResult> {
    await delay(120);
    const all    = resolveAllContacts();
    const counts = computeViewCounts(all);

    let filtered = applyViewFilter(all, query.view);

    // scope filter
    if (query.scopeFilter !== "all") {
      filtered = filtered.filter(c => c.scope === query.scopeFilter);
    }
    // status filter (only meaningful when not overriding view)
    if (query.statusFilter !== "all" && query.view === "all") {
      filtered = filtered.filter(c => c.status === query.statusFilter);
    }
    // tag filter
    if (query.tagFilter.length > 0) {
      filtered = filtered.filter(c =>
        query.tagFilter.every(tid => c.tagIds.includes(tid))
      );
    }
    // group filter
    if (query.groupFilter.length > 0) {
      filtered = filtered.filter(c =>
        query.groupFilter.some(gid => c.groupIds.includes(gid))
      );
    }

    let items = filtered.map(toListItem);
    items = applySearch(items, query.search);

    // sort
    items.sort((a, b) => {
      const dir = query.direction === "asc" ? 1 : -1;
      switch (query.sort) {
        case "name":         return dir * a.name.localeCompare(b.name);
        case "organization": return dir * ((a.organization ?? "").localeCompare(b.organization ?? ""));
        case "lastUsedAt":   return dir * ((a.lastUsedAt ?? "").localeCompare(b.lastUsedAt ?? ""));
        case "usageCount":   return dir * (a.usageCount - b.usageCount);
        case "updatedAt":
        default:             return dir * a.updatedAt.localeCompare(b.updatedAt);
      }
    });

    const total    = items.length;
    const start    = (query.page - 1) * query.perPage;
    const pageItems = items.slice(start, start + query.perPage);

    return {
      items:       pageItems,
      total,
      page:        query.page,
      perPage:     query.perPage,
      hasNextPage: start + query.perPage < total,
      hasPrevPage: query.page > 1,
      viewCounts:  counts,
    };
  },

  async getContact(id: ContactId): Promise<Contact | null> {
    await delay(90);
    return resolveContact(id) ?? null;
  },

  async getContactActionAvailability(id: ContactId): Promise<ContactActionAvailability[]> {
    await delay(60);
    const c = resolveContact(id);
    if (!c) return [];
    return getContactActionAvailability(c);
  },

  async validateContact(input: Partial<ContactCreateInput>, existingId?: ContactId): Promise<ContactValidationResult> {
    await delay(40);
    return validateContactInput(input, existingId);
  },

  async findDuplicates(name: string, email: string, excludeId?: ContactId): Promise<ContactDuplicateCandidate[]> {
    await delay(80);
    return findPotentialDuplicates(name, email, excludeId);
  },

  async getDuplicateCandidates(id: ContactId): Promise<ContactDuplicateCandidate[]> {
    await delay(80);
    const c = resolveContact(id);
    if (!c) return [];
    return findPotentialDuplicates(c.name, c.email, c.id);
  },

  async createContact(input: ContactCreateInput): Promise<Contact> {
    await delay(300);
    const now = new Date().toISOString();
    const id  = `contact-session-${Date.now()}` as ContactId;
    const c: Contact = {
      id,
      status:       "active",
      scope:        input.scope,
      source:       "manually-created",
      workspaceId:  WS_ID,
      ownerId:      OWNER_ID,
      name:         input.name.trim(),
      email:        normalizeEmail(input.email),
      phone:        input.phone?.trim() || undefined,
      organization: input.organization?.trim() || undefined,
      title:        input.title?.trim() || undefined,
      tagIds:       input.tagIds,
      groupIds:     input.groupIds,
      note:         input.note?.trim() || undefined,
      createdAt:    now,
      updatedAt:    now,
      usageCount:   0,
      demonstrationOnly: true,
    };
    SESSION_CONTACTS.set(id, c);

    // add to groups
    ensureGroupsInit();
    for (const gid of input.groupIds) {
      const g = SESSION_GROUPS.get(gid);
      if (g && !g.contactIds.includes(id)) {
        SESSION_GROUPS.set(gid, { ...g, contactIds: [...g.contactIds, id], updatedAt: now });
      }
    }

    return c;
  },

  async updateContact(id: ContactId, input: ContactUpdateInput): Promise<Contact> {
    await delay(250);
    const existing = resolveContact(id);
    if (!existing) throw new Error(`Contact not found: ${id}`);
    const now = new Date().toISOString();
    const updated: Contact = {
      ...existing,
      name:         input.name        !== undefined ? input.name.trim()         : existing.name,
      email:        input.email       !== undefined ? normalizeEmail(input.email) : existing.email,
      phone:        input.phone       !== undefined ? (input.phone.trim() || undefined)        : existing.phone,
      organization: input.organization !== undefined ? (input.organization.trim() || undefined) : existing.organization,
      title:        input.title       !== undefined ? (input.title.trim() || undefined)        : existing.title,
      scope:        input.scope       !== undefined ? input.scope        : existing.scope,
      tagIds:       input.tagIds      !== undefined ? input.tagIds       : existing.tagIds,
      groupIds:     input.groupIds    !== undefined ? input.groupIds     : existing.groupIds,
      note:         input.note        !== undefined ? (input.note.trim() || undefined)         : existing.note,
      updatedAt:    now,
    };
    SESSION_CONTACTS.set(id, updated);
    return updated;
  },

  async archiveContact(id: ContactId): Promise<Contact> {
    await delay(200);
    const existing = resolveContact(id);
    if (!existing) throw new Error(`Contact not found: ${id}`);
    const updated: Contact = { ...existing, status: "archived", updatedAt: new Date().toISOString() };
    SESSION_CONTACTS.set(id, updated);
    return updated;
  },

  async restoreContact(id: ContactId): Promise<Contact> {
    await delay(200);
    const existing = resolveContact(id);
    if (!existing) throw new Error(`Contact not found: ${id}`);
    const updated: Contact = { ...existing, status: "active", updatedAt: new Date().toISOString() };
    SESSION_CONTACTS.set(id, updated);
    return updated;
  },

  async addTagToContact(id: ContactId, tagId: ContactTagId): Promise<Contact> {
    await delay(150);
    const existing = resolveContact(id);
    if (!existing) throw new Error(`Contact not found: ${id}`);
    if (existing.tagIds.includes(tagId)) return existing;
    const updated: Contact = {
      ...existing,
      tagIds:    [...existing.tagIds, tagId],
      updatedAt: new Date().toISOString(),
    };
    SESSION_CONTACTS.set(id, updated);
    return updated;
  },

  async removeTagFromContact(id: ContactId, tagId: ContactTagId): Promise<Contact> {
    await delay(150);
    const existing = resolveContact(id);
    if (!existing) throw new Error(`Contact not found: ${id}`);
    const updated: Contact = {
      ...existing,
      tagIds:    existing.tagIds.filter(t => t !== tagId),
      updatedAt: new Date().toISOString(),
    };
    SESSION_CONTACTS.set(id, updated);
    return updated;
  },

  // Groups

  async listGroups(): Promise<ContactGroupSummary[]> {
    await delay(100);
    ensureGroupsInit();
    return Array.from(SESSION_GROUPS.values()).map(g => {
      const count = g.contactIds.filter(id => resolveContact(id)?.status === "active").length;
      return {
        id:           g.id,
        name:         g.name,
        description:  g.description,
        scope:        g.scope,
        contactCount: count,
        memberCount:  count,
        status:       g.status,
        updatedAt:    g.updatedAt,
      };
    });
  },

  async getGroup(id: ContactGroupId): Promise<{ group: ContactGroup; members: ContactListItem[] } | null> {
    await delay(100);
    const g = resolveGroup(id);
    if (!g) return null;
    const members = g.contactIds
      .map(cid => resolveContact(cid))
      .filter((c): c is Contact => !!c)
      .map(toListItem);
    return { group: g, members };
  },

  async createGroup(name: string, description: string, scope: "personal" | "workspace"): Promise<ContactGroup> {
    await delay(250);
    ensureGroupsInit();
    const now = new Date().toISOString();
    const id  = `grp-session-${Date.now()}` as ContactGroupId;
    const g: ContactGroup = {
      id,
      name:        name.trim(),
      description: description.trim(),
      scope,
      workspaceId: WS_ID,
      contactIds:  [],
      status:      "active",
      createdAt:   now,
      updatedAt:   now,
      demonstrationOnly: true,
    };
    SESSION_GROUPS.set(id, g);
    return g;
  },

  async updateGroup(id: ContactGroupId, name: string, description: string): Promise<ContactGroup> {
    await delay(200);
    const g = resolveGroup(id);
    if (!g) throw new Error(`Group not found: ${id}`);
    const updated: ContactGroup = { ...g, name: name.trim(), description: description.trim(), updatedAt: new Date().toISOString() };
    SESSION_GROUPS.set(id, updated);
    return updated;
  },

  async archiveGroup(id: ContactGroupId): Promise<ContactGroup> {
    await delay(200);
    const g = resolveGroup(id);
    if (!g) throw new Error(`Group not found: ${id}`);
    const updated: ContactGroup = { ...g, status: "archived", updatedAt: new Date().toISOString() };
    SESSION_GROUPS.set(id, updated);
    return updated;
  },

  async restoreGroup(id: ContactGroupId): Promise<ContactGroup> {
    await delay(200);
    const g = resolveGroup(id);
    if (!g) throw new Error(`Group not found: ${id}`);
    const updated: ContactGroup = { ...g, status: "active", updatedAt: new Date().toISOString() };
    SESSION_GROUPS.set(id, updated);
    return updated;
  },

  async addContactsToGroup(groupId: ContactGroupId, contactIds: ContactId[]): Promise<ContactGroup> {
    await delay(200);
    const g = resolveGroup(groupId);
    if (!g) throw new Error(`Group not found: ${groupId}`);
    const merged = Array.from(new Set([...g.contactIds, ...contactIds]));
    const updated: ContactGroup = { ...g, contactIds: merged, updatedAt: new Date().toISOString() };
    SESSION_GROUPS.set(groupId, updated);
    return updated;
  },

  async removeContactsFromGroup(groupId: ContactGroupId, contactIds: ContactId[]): Promise<ContactGroup> {
    await delay(200);
    const g = resolveGroup(groupId);
    if (!g) throw new Error(`Group not found: ${groupId}`);
    const filtered = g.contactIds.filter(id => !contactIds.includes(id));
    const updated: ContactGroup = { ...g, contactIds: filtered, updatedAt: new Date().toISOString() };
    SESSION_GROUPS.set(groupId, updated);
    return updated;
  },

  // Usage

  async getUsageSummary(id: ContactId): Promise<ContactUsageSummary | null> {
    await delay(110);
    return CONTACT_USAGE_SUMMARIES[id] ?? null;
  },

  async getRecentContacts(limit = 5): Promise<ContactListItem[]> {
    await delay(90);
    return resolveAllContacts()
      .filter(c => c.status === "active" && !!c.lastUsedAt)
      .sort((a, b) => (b.lastUsedAt! > a.lastUsedAt! ? 1 : -1))
      .slice(0, limit)
      .map(toListItem);
  },

  async getFrequentContacts(limit = 5): Promise<ContactListItem[]> {
    await delay(90);
    return resolveAllContacts()
      .filter(c => c.status === "active" && c.usageCount > 0)
      .sort((a, b) => b.usageCount - a.usageCount)
      .slice(0, limit)
      .map(toListItem);
  },

  // Merge (frontend demonstration only)

  async previewMerge(primaryId: ContactId, secondaryId: ContactId): Promise<ContactMergePreview | null> {
    await delay(150);
    const p = resolveContact(primaryId);
    const s = resolveContact(secondaryId);
    if (!p || !s) return null;
    const mergedTags  = Array.from(new Set([...p.tagIds,   ...s.tagIds]));
    const mergedGroups = Array.from(new Set([...p.groupIds, ...s.groupIds]));
    return {
      primaryId,
      secondaryId,
      resolvedName:  p.name,
      resolvedEmail: p.email,
      resolvedPhone: p.phone ?? s.phone,
      resolvedOrg:   p.organization ?? s.organization,
      resolvedTitle: p.title ?? s.title,
      mergedTagIds:  mergedTags,
      mergedGroupIds: mergedGroups,
      demonstrationOnly: true,
    };
  },

  async mergeContactsDemonstration(primaryId: ContactId, secondaryId: ContactId, preview: ContactMergePreview): Promise<Contact> {
    await delay(400);
    const p = resolveContact(primaryId);
    if (!p) throw new Error(`Primary contact not found: ${primaryId}`);
    const now     = new Date().toISOString();
    const merged: Contact = {
      ...p,
      phone:        preview.resolvedPhone,
      organization: preview.resolvedOrg,
      title:        preview.resolvedTitle,
      tagIds:       preview.mergedTagIds,
      groupIds:     preview.mergedGroupIds,
      updatedAt:    now,
      demonstrationOnly: true,
    };
    SESSION_CONTACTS.set(primaryId, merged);
    // mark secondary as archived in session
    const s = resolveContact(secondaryId);
    if (s) SESSION_CONTACTS.set(secondaryId, { ...s, status: "archived", updatedAt: now });
    return merged;
  },

  // Import preview

  async getImportPreview(): Promise<ContactImportPreview> {
    await delay(200);
    return MOCK_IMPORT_PREVIEW;
  },

  async applyImportRowDemonstration(rowNumber: number, action: "include" | "exclude"): Promise<void> {
    await delay(100);
    // In-session no-op — rows are managed in component state
    void rowNumber; void action;
  },

  // Picker search

  async searchForPicker(query: string, limit = 8): Promise<ContactListItem[]> {
    await delay(80);
    const active = resolveAllContacts().filter(c => c.status === "active");
    const items  = active.map(toListItem);
    return applySearch(items, query).slice(0, limit);
  },

  // Bulk operations

  async bulkAddTag(ids: ContactId[], tagId: ContactTagId): Promise<void> {
    await delay(250);
    const now = new Date().toISOString();
    for (const id of ids) {
      const c = resolveContact(id);
      if (!c || c.status !== "active") continue;
      if (!c.tagIds.includes(tagId)) {
        SESSION_CONTACTS.set(id, { ...c, tagIds: [...c.tagIds, tagId], updatedAt: now });
      }
    }
  },

  async bulkRemoveTag(ids: ContactId[], tagId: ContactTagId): Promise<void> {
    await delay(250);
    const now = new Date().toISOString();
    for (const id of ids) {
      const c = resolveContact(id);
      if (!c) continue;
      SESSION_CONTACTS.set(id, { ...c, tagIds: c.tagIds.filter(t => t !== tagId), updatedAt: now });
    }
  },

  async bulkAddToGroup(ids: ContactId[], groupId: ContactGroupId): Promise<void> {
    await delay(250);
    await this.addContactsToGroup(groupId, ids);
  },

  async bulkArchive(ids: ContactId[]): Promise<void> {
    await delay(300);
    const now = new Date().toISOString();
    for (const id of ids) {
      const c = resolveContact(id);
      if (c && c.status !== "archived") {
        SESSION_CONTACTS.set(id, { ...c, status: "archived", updatedAt: now });
      }
    }
  },

  async bulkRestore(ids: ContactId[]): Promise<void> {
    await delay(300);
    const now = new Date().toISOString();
    for (const id of ids) {
      const c = resolveContact(id);
      if (c && c.status === "archived") {
        SESSION_CONTACTS.set(id, { ...c, status: "active", updatedAt: now });
      }
    }
  },

  // Session utilities

  clearSessionState(): void {
    SESSION_CONTACTS.clear();
    SESSION_GROUPS.clear();
    SESSION_PICKER_LOG.length = 0;
    _sessionGroupsInitialized = false;
  },

  // Known duplicate pairs (for demonstration)
  getKnownDuplicatePairs(): Array<[ContactId, ContactId]> {
    return [[CID_MARCO, CID_MARCO_ALT]];
  },
};
