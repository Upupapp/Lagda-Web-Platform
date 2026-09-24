// Where contacts come from: the workspace's own address book, or the fixtures.
//
// ── Why a façade rather than swapping imports in the context ───────────────
//
// The same shape mismatch `templates-source.ts` documents. The contacts pages
// were written against the mock service, whose `Contact` carries tags,
// groups, notes, a scope, an owner, a source and usage counters. The backend
// stores nine fields and refuses anything else (`additionalProperties:
// false`). Rewriting every page to the narrower shape would be a far larger
// change than connecting the two, and it would strand fixture mode, which is
// still how these pages are developed without a backend.
//
// So this module answers one question — real or fixtures — and returns the
// SAME shape either way.
//
// ── What genuinely round-trips, and what does not ──────────────────────────
//
// Round-trips: name, email, phone, organization, title, archived-or-not.
// Does NOT: tags, groups, note, scope, usage counts. Those have no column.
// They are filled below with defaults that are TRUE of a stored contact
// rather than invented — empty lists, zero counts — so nothing on screen
// claims a value the next reload will contradict.
//
// Group membership, tagging, merging and usage history remain fixture-only
// for the same reason: there is no backend for them yet, and a façade cannot
// invent one.

import { USE_REAL_BACKEND } from "./backend-flag";
import {
  realContactService,
  type WireContact, type WireContactListQuery, type WireContactSort,
} from "./real/contact.service";
import { mockContactService } from "./mock/contacts.service";
import type {
  Contact, ContactId, ContactListItem, ContactListQuery, ContactListResult,
  ContactCreateInput, ContactUpdateInput,
} from "../models/contacts";

/** Not a React hook despite the shape of the question — a plain predicate,
 *  matching `realTemplatesAvailable`. Every contact route is
 *  `/workspaces/:workspaceId/contacts`, so with no workspace there is no URL
 *  to call and fixtures are the only thing that can be shown. */
export function realContactsAvailable(workspaceId: string | undefined): boolean {
  return USE_REAL_BACKEND && workspaceId !== undefined && workspaceId !== "";
}

export class ContactsNotWritableError extends Error {
  constructor() {
    super("Contacts can only be saved when a workspace is open.");
  }
}

// ── Mapping ─────────────────────────────────────────────────────────────────

/** The backend's three sortable columns. The product also offers `lastUsedAt`
 *  and `usageCount`; neither has a backend writer, so both fall back to the
 *  one sort that is always meaningful rather than ordering every row alike. */
function toWireSort(sort: ContactListQuery["sort"]): WireContactSort {
  if (sort === "name" || sort === "organization") return sort;
  return "updatedAt";
}

function toContact(wire: WireContact, workspaceId: string): Contact {
  return {
    // The backend mints `cnt_…`; `ContactId` is a branded string and this is
    // the one place a raw wire id crosses into it.
    id: wire.contactId as ContactId,
    status: wire.state,
    // No column. Every stored contact belongs to the WORKSPACE that owns the
    // route it was read through — "personal" is a fixture-only distinction.
    scope: "workspace",
    source: "manually-created",
    workspaceId,
    ownerId: "",
    name: wire.name,
    email: wire.email,
    ...(wire.phone === null ? {} : { phone: wire.phone }),
    ...(wire.organization === null ? {} : { organization: wire.organization }),
    ...(wire.title === null ? {} : { title: wire.title }),
    tagIds: [],
    groupIds: [],
    createdAt: wire.createdAt,
    updatedAt: wire.updatedAt,
    usageCount: 0,
    // A STORED contact is not a demonstration — it is the workspace's own
    // data, round-tripped through the real API.
    demonstrationOnly: false,
  };
}

function toListItem(wire: WireContact, workspaceId: string): ContactListItem {
  const contact = toContact(wire, workspaceId);
  return {
    id: contact.id,
    status: contact.status,
    scope: contact.scope,
    name: contact.name,
    email: contact.email,
    ...(contact.phone === undefined ? {} : { phone: contact.phone }),
    ...(contact.organization === undefined ? {} : { organization: contact.organization }),
    ...(contact.title === undefined ? {} : { title: contact.title }),
    tagIds: [],
    groupIds: [],
    usageCount: 0,
    updatedAt: contact.updatedAt,
    workspaceId,
    demonstrationOnly: false,
  };
}

/** The write body. Tags, groups, note and scope are dropped deliberately —
 *  see the header. An empty optional string is sent as `null` ("clear it")
 *  rather than as `""`, which the backend would store literally. */
function toWireWrite(input: ContactCreateInput | ContactUpdateInput) {
  const optional = (value: string | undefined) =>
    value === undefined ? undefined : (value.trim() === "" ? null : value.trim());
  return {
    name: (input.name ?? "").trim(),
    email: (input.email ?? "").trim(),
    ...(input.phone === undefined ? {} : { phone: optional(input.phone) }),
    ...(input.organization === undefined ? {} : { organization: optional(input.organization) }),
    ...(input.title === undefined ? {} : { title: optional(input.title) }),
  };
}

// ── Reading ─────────────────────────────────────────────────────────────────

/**
 * The backend paginates, searches and sorts; the view filter is applied on
 * top of what it returns.
 *
 * `archived` maps to the backend's `state` filter, which is a real query
 * parameter. The other views (`recent`, `frequent`, `duplicates`) rest on
 * usage data the backend does not keep, so they return the active book
 * rather than silently showing an empty list that looks like a bug.
 */
export async function listContacts(
  workspaceId: string | undefined, query: ContactListQuery,
): Promise<ContactListResult> {
  if (!realContactsAvailable(workspaceId)) return mockContactService.listContacts(query);

  const wireQuery: WireContactListQuery = {
    ...(query.search.trim() === "" ? {} : { search: query.search.trim() }),
    state: query.view === "archived" || query.statusFilter === "archived"
      ? "archived"
      : "active",
    sort: toWireSort(query.sort),
    direction: query.direction,
    page: query.page,
    perPage: query.perPage,
  };

  const page = await realContactService.list(workspaceId!, wireQuery);
  const items = page.items.map(wire => toListItem(wire, workspaceId!));

  return {
    items,
    total: page.total,
    page: page.page,
    perPage: page.perPage,
    hasNextPage: page.hasNextPage,
    hasPrevPage: page.page > 1,
    // Counts for the views the backend can actually answer. The rest are
    // reported as the totals they filter from rather than as zero, which
    // would read as "you have none" instead of "this view is not stored".
    viewCounts: {
      all: page.total, workspace: page.total, personal: 0,
      recent: page.total, frequent: page.total, duplicates: 0,
      archived: query.view === "archived" ? page.total : 0,
    },
  };
}

export async function getContact(
  workspaceId: string | undefined, id: ContactId,
): Promise<Contact | null> {
  if (!realContactsAvailable(workspaceId)) return mockContactService.getContact(id);
  try {
    return toContact(await realContactService.get(workspaceId!, id), workspaceId!);
  } catch {
    return null;
  }
}

// ── Writing ─────────────────────────────────────────────────────────────────
//
// No mock fallback, for the reason `templates-source.ts` gives: a save that
// silently wrote to an in-memory map and vanished on reload is the defect
// this work exists to close. Refusing is the honest answer when there is
// nowhere real to write.

export async function createContact(
  workspaceId: string | undefined, input: ContactCreateInput,
): Promise<Contact> {
  if (!realContactsAvailable(workspaceId)) throw new ContactsNotWritableError();
  const result = await realContactService.create(workspaceId!, toWireWrite(input));
  return toContact(result.contact, workspaceId!);
}

export async function updateContact(
  workspaceId: string | undefined, id: ContactId, input: ContactUpdateInput,
): Promise<Contact> {
  if (!realContactsAvailable(workspaceId)) throw new ContactsNotWritableError();
  const result = await realContactService.update(workspaceId!, id, toWireWrite(input));
  return toContact(result.contact, workspaceId!);
}

export async function archiveContact(
  workspaceId: string | undefined, id: ContactId,
): Promise<Contact> {
  if (!realContactsAvailable(workspaceId)) throw new ContactsNotWritableError();
  return toContact(await realContactService.archive(workspaceId!, id), workspaceId!);
}

export async function restoreContact(
  workspaceId: string | undefined, id: ContactId,
): Promise<Contact> {
  if (!realContactsAvailable(workspaceId)) throw new ContactsNotWritableError();
  return toContact(await realContactService.restore(workspaceId!, id), workspaceId!);
}
