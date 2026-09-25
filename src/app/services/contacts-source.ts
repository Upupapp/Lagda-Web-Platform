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
// ── What genuinely round-trips, and what does not (074) ─────────────────────────────────────
//
// Round-trips: name, email, phone, organization, title, archived-or-not,
// SCOPE, NOTE and TAGS. The Edit Contact form showed the last three and
// silently dropped every one of them on save -- reported as a bug, fixed
// by 074's migration and this file no longer defaulting them away.
//
// Still does NOT round-trip: groups, a source beyond "manual", usage
// counts. Those genuinely have no column. They are filled below with
// defaults that are TRUE of a stored contact rather than invented --
// empty lists, zero counts -- so nothing on screen claims a value the
// next reload will contradict.
//
// Group membership, merging and usage history remain fixture-only for
// the same reason: there is no backend for them yet, and a facade cannot
// invent one.

import { USE_REAL_BACKEND } from "./backend-flag";
import {
  realContactService,
  type WireContact, type WireContactListQuery, type WireContactSort,
  type WireContactWrite, type WireContactCreate, type WireContactScope,
  type WireContactTagId,
} from "./real/contact.service";
import { mockContactService } from "./mock/contacts.service";
import type {
  Contact, ContactId, ContactListItem, ContactListQuery, ContactListResult,
  ContactCreateInput, ContactUpdateInput, ContactTagId,
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
    // The backend mints `cnt_...`; `ContactId` is a branded string and this
    // is the one place a raw wire id crosses into it.
    id: wire.contactId as ContactId,
    status: wire.state,
    scope: wire.scope,
    source: "manually-created",
    workspaceId,
    // The caller's own account when personal; no column for it otherwise --
    // "" is what an ownerless workspace contact has always meant here.
    ownerId: wire.ownerUserId ?? "",
    name: wire.name,
    email: wire.email,
    ...(wire.phone === null ? {} : { phone: wire.phone }),
    ...(wire.organization === null ? {} : { organization: wire.organization }),
    ...(wire.title === null ? {} : { title: wire.title }),
    ...(wire.note === null ? {} : { note: wire.note }),
    tagIds: wire.tagIds as ContactTagId[],
    groupIds: [],
    createdAt: wire.createdAt,
    updatedAt: wire.updatedAt,
    usageCount: 0,
    // A STORED contact is not a demonstration -- it is the workspace's own
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
    tagIds: contact.tagIds,
    groupIds: [],
    usageCount: 0,
    updatedAt: contact.updatedAt,
    workspaceId,
    demonstrationOnly: false,
  };
}

/**
 * The write body. Groups are dropped deliberately -- no column, see the
 * header. An empty optional string is sent as `null` ("clear it") rather
 * than as `""`, which the backend would store literally.
 */
function toWireWrite(input: ContactCreateInput | ContactUpdateInput): WireContactWrite {
  const optional = (value: string | undefined) =>
    value === undefined ? undefined : (value.trim() === "" ? null : value.trim());
  return {
    name: (input.name ?? "").trim(),
    email: (input.email ?? "").trim(),
    ...(input.phone === undefined ? {} : { phone: optional(input.phone) }),
    ...(input.organization === undefined ? {} : { organization: optional(input.organization) }),
    ...(input.title === undefined ? {} : { title: optional(input.title) }),
    ...(input.note === undefined ? {} : { note: optional(input.note) }),
    ...(input.tagIds === undefined ? {} : { tagIds: input.tagIds as WireContactTagId[] }),
  };
}

/** CREATE only: also carries `scope`, refused by the PUT schema. Absent
 *  means workspace-shared, matching `ContactCreateInput.scope`'s own
 *  required-with-a-product-default shape. */
function toWireCreate(input: ContactCreateInput): WireContactCreate {
  return { ...toWireWrite(input), scope: input.scope as WireContactScope };
}

// // ── Reading ─────────────────────────────────────────────────────────────────

/** How many active contacts to pull back for the "Potential Duplicates" scan.
 *  There is no backend duplicate-detection endpoint, so this module does the
 *  comparison itself over one bounded page — the backend's own maximum
 *  (`MAX_PER_PAGE`, contracts/api/pagination) — rather than paging through
 *  the whole book. A workspace with more active contacts than this misses
 *  duplicates past the first page; that is a real, disclosed limitation, not
 *  a silent one — see the comment on `findDuplicateContactIds`. */
const DUPLICATE_SCAN_SIZE = 100;

/** Two contacts collide when their emails match case-insensitively — the
 *  same identity check the backend itself uses for its own duplicate
 *  warning on create/update (`WireDuplicateWarning`). Returns the ids of
 *  every contact that shares its email with at least one other. */
function findDuplicateContactIds(items: readonly WireContact[]): Set<string> {
  const byEmail = new Map<string, string[]>();
  for (const item of items) {
    const key = item.email.trim().toLowerCase();
    const bucket = byEmail.get(key);
    if (bucket) bucket.push(item.contactId); else byEmail.set(key, [item.contactId]);
  }
  const duplicateIds = new Set<string>();
  for (const ids of byEmail.values()) {
    if (ids.length > 1) for (const id of ids) duplicateIds.add(id);
  }
  return duplicateIds;
}

/**
 * The backend paginates, searches and sorts; the view filter is applied on
 * top of what it returns.
 *
 * `archived` maps to the backend's `state` filter, a real query parameter.
 * `recent` is real too, just not a separate dataset — the backend keeps no
 * `lastUsedAt`, so "recent" is honestly answered by re-sorting the same
 * active book by `updatedAt` descending (the closest true signal for "which
 * of these did I touch last"), overriding whatever sort the toolbar has
 * selected while this view is active.
 * `duplicates` is answered by `findDuplicateContactIds` above, scanning a
 * bounded page rather than the whole book (see `DUPLICATE_SCAN_SIZE`).
 * `personal`/`frequent` have no backing data at all — no ownership column,
 * no usage column — so ContactsPage does not offer them in real-backend
 * mode; this function still answers them honestly (empty) if ever called.
 */
export async function listContacts(
  workspaceId: string | undefined, query: ContactListQuery,
): Promise<ContactListResult> {
  if (!realContactsAvailable(workspaceId)) return mockContactService.listContacts(query);

  if (query.view === "duplicates") {
    const scan = await realContactService.list(workspaceId!, {
      state: "active", sort: "updatedAt", direction: "desc", page: 1, perPage: DUPLICATE_SCAN_SIZE,
    });
    const duplicateIds = findDuplicateContactIds(scan.items);
    const items = scan.items.filter(wire => duplicateIds.has(wire.contactId)).map(wire => toListItem(wire, workspaceId!));
    return {
      items, total: items.length, page: 1, perPage: DUPLICATE_SCAN_SIZE,
      hasNextPage: false, hasPrevPage: false,
      viewCounts: {
        all: 0, workspace: 0, personal: 0, recent: 0, frequent: 0,
        duplicates: items.length, archived: 0,
      },
    };
  }

  const wireQuery: WireContactListQuery = {
    ...(query.search.trim() === "" ? {} : { search: query.search.trim() }),
    state: query.view === "archived" || query.statusFilter === "archived"
      ? "archived"
      : "active",
    ...(query.view === "recent"
      ? { sort: "updatedAt" as const, direction: "desc" as const }
      : { sort: toWireSort(query.sort), direction: query.direction }),
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
    // Counts for the views the backend can actually answer. `personal` and
    // `frequent` stay 0 — ContactsPage hides both tabs in real mode, so
    // these values are never shown, only kept honest for callers that don't.
    viewCounts: {
      all: page.total, workspace: page.total, personal: 0,
      recent: page.total, frequent: 0, duplicates: 0,
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
  const result = await realContactService.create(workspaceId!, toWireCreate(input));
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
