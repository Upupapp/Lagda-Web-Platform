// Contact groups, from the workspace's own address book (backend migration 116).
//
// A group is a named set of contacts: personal to the person who made it, or the
// whole workspace's. Archived and restored, never deleted. The contacts named in
// a group's list are ids only; one group's detail also carries its members'
// names and addresses, because the group's page lists them.
//
// All API access for groups is in this file, so a change of path or shape is made
// in one place. `contacts-source.ts` turns these into the shapes the pages use.

import { apiRequest } from "../api-client";
import { changes } from "../live/topics";

export type WireGroupScope = "personal" | "workspace";

export interface WireContactGroup {
  groupId: string;
  name: string;
  description: string | null;
  scope: WireGroupScope;
  ownerUserId: string | null;
  state: "active" | "archived";
  createdAt: string;
  updatedAt: string;
  archivedAt: string | null;
  contactIds: string[];
}

export interface WireGroupMember {
  contactId: string;
  name: string;
  email: string;
  organization: string | null;
  title: string | null;
  state: "active" | "archived";
}

export interface WireContactGroupDetail extends WireContactGroup {
  members: WireGroupMember[];
}

const base = (workspaceId: string) => `/workspaces/${encodeURIComponent(workspaceId)}/contact-groups`;
const one = (workspaceId: string, groupId: string) => `${base(workspaceId)}/${encodeURIComponent(groupId)}`;

class RealContactGroupService {
  async list(workspaceId: string): Promise<WireContactGroup[]> {
    const answer = await apiRequest<{ groups: WireContactGroup[] }>(base(workspaceId));
    return answer.groups;
  }

  async get(workspaceId: string, groupId: string): Promise<WireContactGroupDetail> {
    return apiRequest<WireContactGroupDetail>(one(workspaceId, groupId));
  }

  async create(
    workspaceId: string, input: { name: string; description?: string | null; scope?: WireGroupScope; contactIds?: string[] },
  ): Promise<WireContactGroup> {
    return changes("contacts", apiRequest<WireContactGroup>(base(workspaceId), { method: "POST", body: input }));
  }

  async update(workspaceId: string, groupId: string, input: { name: string; description?: string | null }): Promise<WireContactGroup> {
    return changes("contacts", apiRequest<WireContactGroup>(one(workspaceId, groupId), { method: "PUT", body: input }));
  }

  async archive(workspaceId: string, groupId: string): Promise<WireContactGroup> {
    return changes("contacts", apiRequest<WireContactGroup>(`${one(workspaceId, groupId)}/archive`, { method: "POST" }));
  }

  async restore(workspaceId: string, groupId: string): Promise<WireContactGroup> {
    return changes("contacts", apiRequest<WireContactGroup>(`${one(workspaceId, groupId)}/restore`, { method: "POST" }));
  }

  async addContacts(workspaceId: string, groupId: string, contactIds: string[]): Promise<WireContactGroup> {
    return changes("contacts", apiRequest<WireContactGroup>(`${one(workspaceId, groupId)}/members`, { method: "POST", body: { contactIds } }));
  }

  async removeContacts(workspaceId: string, groupId: string, contactIds: string[]): Promise<WireContactGroup> {
    return changes("contacts", apiRequest<WireContactGroup>(`${one(workspaceId, groupId)}/members/remove`, { method: "POST", body: { contactIds } }));
  }
}

export const realContactGroupService = new RealContactGroupService();
