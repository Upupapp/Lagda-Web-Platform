// Real contact service — talks to Lagda-Backend's workspace-scoped contact
// routes (migration 015).
//
// ── What a stored contact is, and is not ───────────────────────────────────
//
// An ADDRESS-BOOK ENTRY owned by a workspace: a name, an email, and three
// optional descriptive fields. It is explicitly NOT a LAGDA user account, and
// nothing about it has been verified — the backend's own `ContactSchema` says
// so in its description. Selecting one grants nobody access to anything.
//
// ── The wire shape is NARROWER than the frontend's model ───────────────────
//
// `Contact` in models/contacts.ts carries tags, groups, notes, a scope, an
// owner, a source and usage counters. The backend has columns for none of
// them: `ContactSchema` is declared `additionalProperties: false` with
// exactly nine fields, so sending an extra one is REFUSED, not ignored.
//
// Those extras are therefore presentational — they survive in the session and
// are lost on reload. `contacts-source.ts` fills them with honest defaults
// rather than pretending a round trip preserved them.

import { apiRequest } from "../api-client";

/** The nine fields `ContactSchema` returns on a READ. */
export interface WireContact {
  contactId: string;
  name: string;
  email: string;
  phone: string | null;
  organization: string | null;
  title: string | null;
  state: "active" | "archived";
  createdAt: string;
  updatedAt: string;
  archivedAt: string | null;
}

/**
 * The body both POST and PUT take.
 *
 * The three optional fields are nullable AND optional, and the two mean
 * different things on a replace: absent is "leave it", explicit `null` is
 * "clear it". On create they are identical.
 */
export interface WireContactWrite {
  name: string;
  email: string;
  phone?: string | null;
  organization?: string | null;
  title?: string | null;
}

/**
 * A duplicate warning returned alongside a SUCCESSFUL write — the address
 * already belongs to another contact. Never an error: the backend stores it
 * and reports the collision, leaving the judgement to a person.
 */
export interface WireDuplicateWarning {
  contactId: string;
  name: string;
  organization: string | null;
}

export interface WireContactWriteResult {
  contact: WireContact;
  duplicates: WireDuplicateWarning[];
}

export interface WireContactPage {
  items: WireContact[];
  total: number;
  page: number;
  perPage: number;
  hasNextPage: boolean;
}

/** Only what the backend actually indexes. The product's `lastUsedAt` and
 *  `usageCount` sorts are deliberately absent — nothing writes those columns,
 *  so sorting by either would order every contact identically. */
export type WireContactSort = "name" | "organization" | "updatedAt";

export interface WireContactListQuery {
  search?: string;
  state?: "active" | "archived";
  sort?: WireContactSort;
  direction?: "asc" | "desc";
  page?: number;
  perPage?: number;
}

const base = (workspaceId: string) =>
  `/workspaces/${encodeURIComponent(workspaceId)}/contacts`;

function queryString(query: WireContactListQuery): string {
  const params = new URLSearchParams();
  for (const [key, value] of Object.entries(query)) {
    if (value === undefined || value === "") continue;
    params.set(key, String(value));
  }
  const rendered = params.toString();
  return rendered === "" ? "" : `?${rendered}`;
}

class RealContactService {
  async list(workspaceId: string, query: WireContactListQuery = {}): Promise<WireContactPage> {
    return apiRequest<WireContactPage>(`${base(workspaceId)}${queryString(query)}`);
  }

  async get(workspaceId: string, contactId: string): Promise<WireContact> {
    return apiRequest<WireContact>(
      `${base(workspaceId)}/${encodeURIComponent(contactId)}`,
    );
  }

  async create(workspaceId: string, input: WireContactWrite): Promise<WireContactWriteResult> {
    return apiRequest<WireContactWriteResult>(base(workspaceId), {
      method: "POST", body: input,
    });
  }

  /** Whole-record replace — the backend has no PATCH for a contact. */
  async update(
    workspaceId: string, contactId: string, input: WireContactWrite,
  ): Promise<WireContactWriteResult> {
    return apiRequest<WireContactWriteResult>(
      `${base(workspaceId)}/${encodeURIComponent(contactId)}`,
      { method: "PUT", body: input },
    );
  }

  /** Archiving keeps the record and its history; it leaves the active book. */
  async archive(workspaceId: string, contactId: string): Promise<WireContact> {
    return apiRequest<WireContact>(
      `${base(workspaceId)}/${encodeURIComponent(contactId)}/archive`,
      { method: "POST" },
    );
  }

  async restore(workspaceId: string, contactId: string): Promise<WireContact> {
    return apiRequest<WireContact>(
      `${base(workspaceId)}/${encodeURIComponent(contactId)}/restore`,
      { method: "POST" },
    );
  }
}

export const realContactService = new RealContactService();
