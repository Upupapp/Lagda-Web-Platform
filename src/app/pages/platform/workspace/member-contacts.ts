// Adding workspace members to Contacts, so a teammate can be picked as a
// participant when preparing a document instead of being typed in again.
//
// ── What it writes ─────────────────────────────────────────────────────────
//
// An ordinary contact through the same façade the Contacts pages use
// (contacts-source.ts): name, email, the member's title, the workspace's name
// as the organisation, and the Internal tag. Personal by default — so one
// colleague's address book is not filled with everyone else's copies — or
// shared with the workspace when the person asks.
//
// ── Knowing who is already a contact ───────────────────────────────────────
//
// There is no "look up these emails" route, so the page reads the active
// address book once, a few pages deep, and matches emails case-insensitively
// — the same identity check the backend uses for its own duplicate warning.
// A book larger than that scan is still safe: before each add, a member not
// seen in the scan is looked up by email on its own.
//
// ── Where it is offered ────────────────────────────────────────────────────
//
// Only with a real workspace (the demo build has nowhere real to write, and
// contacts-source.ts refuses rather than pretend), only to roles that may
// create contacts, and never for your own membership.

import { useCallback, useEffect, useState } from "react";
import { usePlatform } from "../../../context/PlatformContext";
import { useWorkspaceAccess } from "../../../hooks/useWorkspaceAccess";
import { createContact, realContactsAvailable } from "../../../services/contacts-source";
import { realContactService, type WireContact } from "../../../services/real/contact.service";
import type { ContactScope, ContactTagId } from "../../../models/contacts";
import type { WorkspaceMemberSummary } from "../../../models/workspace-admin";

/** Pages of 100 read to learn who is already a contact. */
const SCAN_PAGES = 5;
const PER_PAGE = 100;
const INTERNAL_TAG = "tag-internal" as ContactTagId;

const key = (email: string) => email.trim().toLowerCase();

export interface MemberContactsResult {
  added: number;
  already: number;
  failed: number;
}

export interface MemberContacts {
  /** False where the feature is not offered at all. */
  available: boolean;
  /** Whether this member could be added (not you, has an email, still a member). */
  eligible: (member: WorkspaceMemberSummary) => boolean;
  /** The contact already holding this member's email, if the scan found one. */
  contactIdFor: (member: WorkspaceMemberSummary) => string | null;
  /** True until the first read of the address book has finished. */
  checking: boolean;
  add: (members: readonly WorkspaceMemberSummary[], scope: ContactScope) => Promise<MemberContactsResult>;
}

function activeMatch(list: readonly WireContact[], email: string): WireContact | undefined {
  return list.find(c => c.state === "active" && key(c.email) === key(email));
}

export function useMemberContacts(workspaceId: string | null): MemberContacts {
  const platform = usePlatform();
  const access = useWorkspaceAccess();
  const available = workspaceId !== null && realContactsAvailable(workspaceId) && access.can("contact.create");
  const canRead = access.can("contact.view");
  const [known, setKnown] = useState<ReadonlyMap<string, string>>(new Map());
  const [complete, setComplete] = useState(false);
  const [checking, setChecking] = useState(available && canRead);
  const myEmail = platform.user?.email ? key(platform.user.email) : null;
  const organization = platform.currentWorkspace?.name ?? undefined;

  useEffect(() => {
    if (!available || !canRead || workspaceId === null) { setChecking(false); return; }
    let cancelled = false;
    setChecking(true);
    void (async () => {
      const found = new Map<string, string>();
      let done = false;
      try {
        for (let page = 1; page <= SCAN_PAGES; page += 1) {
          const result = await realContactService.list(workspaceId, { state: "active", sort: "name", direction: "asc", page, perPage: PER_PAGE });
          for (const c of result.items) found.set(key(c.email), c.contactId);
          if (!result.hasNextPage) { done = true; break; }
        }
      } catch {
        // Unknown is not "absent": each add below looks the email up first.
      }
      if (cancelled) return;
      setKnown(found);
      setComplete(done);
      setChecking(false);
    })();
    return () => { cancelled = true; };
  }, [available, canRead, workspaceId]);

  const eligible = useCallback((m: WorkspaceMemberSummary) => {
    if (!available || m.email.trim() === "") return false;
    if (m.isCurrentUser === true || (myEmail !== null && key(m.email) === myEmail)) return false;
    return m.status === "active";
  }, [available, myEmail]);

  const contactIdFor = useCallback((m: WorkspaceMemberSummary) => known.get(key(m.email)) ?? null, [known]);

  const add = useCallback(async (members: readonly WorkspaceMemberSummary[], scope: ContactScope): Promise<MemberContactsResult> => {
    const result: MemberContactsResult = { added: 0, already: 0, failed: 0 };
    if (workspaceId === null) return result;
    const learned = new Map(known);
    for (const m of members) {
      if (!eligible(m)) continue;
      const email = key(m.email);
      if (learned.has(email)) { result.already += 1; continue; }
      try {
        if (!complete && canRead) {
          const hit = activeMatch((await realContactService.list(workspaceId, { search: m.email.trim(), state: "active", perPage: PER_PAGE })).items, m.email);
          if (hit) { learned.set(email, hit.contactId); result.already += 1; continue; }
        }
        const title = m.roleTitle?.trim();
        const contact = await createContact(workspaceId, {
          name: m.displayName.trim() || m.email.trim(),
          email: m.email.trim(),
          ...(title ? { title } : {}),
          ...(organization ? { organization } : {}),
          scope,
          tagIds: [INTERNAL_TAG],
          groupIds: [],
        });
        learned.set(email, contact.id);
        result.added += 1;
      } catch {
        result.failed += 1;
      }
    }
    setKnown(learned);
    return result;
  }, [workspaceId, known, eligible, complete, canRead, organization]);

  return { available, eligible, contactIdFor, checking, add };
}

/** "Added 4 to your contacts · 2 were already there · 1 could not be added." */
export function describeContactsResult(r: MemberContactsResult, scope: ContactScope): string {
  const where = scope === "workspace" ? "the workspace's contacts" : "your contacts";
  const parts: string[] = [];
  if (r.added > 0) parts.push(`Added ${String(r.added)} to ${where}`);
  if (r.already > 0) parts.push(`${String(r.already)} ${r.already === 1 ? "was" : "were"} already in contacts`);
  if (r.failed > 0) parts.push(`${String(r.failed)} could not be added — try again`);
  return parts.length > 0 ? parts.join(" · ") : "No one to add.";
}
