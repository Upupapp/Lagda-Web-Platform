// Contact and Contact Group recipient source — THE centralized logic.
//
// Gap Closure Command 1. Wires the canonical Contacts system into the Bulk Send
// recipient-source selector. Frontend demonstration only.
//
// This module owns, in ONE place:
//   1. Contact eligibility for use as a recipient (resolveContactEligibility)
//   2. Deterministic Contact Group expansion into individual people (expandSelection)
//   3. De-duplication across direct picks and multiple groups
//   4. Construction of the index-aligned payload for applyRecipientSource
//
// It creates NO second Contacts system, NO second group-membership model, and NO
// second recipient-row constructor. Rows are always built by the canonical
// `bulkSendService.applyRecipientSource`.
//
// HARD BOUNDARIES:
//   - Selecting a Contact sends nothing, invites nobody, and grants no access.
//   - Group membership is never modified. Excluding someone here is a selection
//     decision only; the Contact stays in the Contact Group.
//   - A Contact Group never becomes a single recipient row and never signs.
//   - Contacts outside the session workspace never appear anywhere: not in the
//     list, not in a count, not in a group expansion, not in a projection.
//   - Private Contact fields (notes, phone, tags, history, owner) are never copied
//     into a recipient row.

import type { ContactGroupId, ContactId, ContactListItem } from "../models/contacts";
import { isValidEmailDirection, normalizeEmailForComparison } from "../utils/tabular-import";

// ── Column headers ────────────────────────────────────────────────────────────
//
// These literal header strings matter. `buildSchema` derives column IDs from
// normalized header text and the deterministic role/variable suggestion tables
// match on those same aliases ("name", "email", "organization"). Emitting field
// keys such as `displayName` instead would produce columns that match no alias,
// and every projected row would land in `invalid-mapping`.
export const CONTACT_SOURCE_HEADERS = ["Name", "Email", "Organization"] as const;

// ── Eligibility ───────────────────────────────────────────────────────────────

export type ContactRecipientEligibilityReason =
  | "eligible"
  | "missing-email"
  | "invalid-email"
  | "archived-contact"
  | "restricted-contact"
  | "cross-workspace"
  | "duplicate-in-selection"
  | "duplicate-across-groups"
  | "ambiguous-shared-email"
  | "excluded-by-user";

/** User-facing labels. No raw internal error text ever reaches the UI. */
export const CONTACT_ELIGIBILITY_LABELS: Record<ContactRecipientEligibilityReason, string> = {
  "eligible":                "Ready to add",
  "missing-email":           "No email address",
  "invalid-email":           "Email address is not valid",
  "archived-contact":        "Archived Contact",
  "restricted-contact":      "Not available to you",
  "cross-workspace":         "Not available to you",
  "duplicate-in-selection":  "Already selected",
  "duplicate-across-groups": "Also in another selected group",
  "ambiguous-shared-email":  "Shares an email with another Contact",
  "excluded-by-user":        "Excluded",
};

/** Short explanations shown beside a blocked Contact. */
export const CONTACT_ELIGIBILITY_HINTS: Partial<Record<ContactRecipientEligibilityReason, string>> = {
  "missing-email":           "A recipient needs an email address. Add one in Contacts first.",
  "invalid-email":           "Correct the address in Contacts before using this Contact.",
  "archived-contact":        "Restore the Contact in Contacts if you still need it.",
  "duplicate-in-selection":  "This person is already in the selection. They will be added once.",
  "duplicate-across-groups": "This person is in more than one selected group. They will be added once.",
  "ambiguous-shared-email":  "Two different Contact records share this address. Both will be added and flagged for review — check which one you meant.",
};

export function isBlockingReason(reason: ContactRecipientEligibilityReason): boolean {
  return reason !== "eligible"
      && reason !== "duplicate-in-selection"
      && reason !== "duplicate-across-groups"
      // Shared-email conflicts are surfaced, not suppressed. Both records project
      // so the canonical duplicate engine can flag them for review — silently
      // merging two different Contact records would decide for the user which
      // person they meant.
      && reason !== "ambiguous-shared-email";
}

export interface ContactEligibilityContext {
  /** The workspace the signed-in session currently holds. */
  workspaceId: string;
}

/**
 * THE per-Contact eligibility resolver. Every surface — the list, the group
 * expansion preview, the summary, and the payload builder — calls this one
 * function, so a Contact can never be judged eligible in one place and ineligible
 * in another.
 *
 * Deliberately does NOT consider duplicates: duplication is a property of a
 * selection, not of a Contact, and is resolved in `expandSelection`.
 */
export function resolveContactEligibility(
  contact: ContactListItem,
  ctx: ContactEligibilityContext,
): ContactRecipientEligibilityReason {
  // Workspace tenancy first. A Contact from another workspace is treated exactly
  // like one that does not exist — same label as "restricted", so the two are
  // indistinguishable to the viewer and neither discloses anything.
  if (contact.workspaceId !== ctx.workspaceId) return "cross-workspace";
  if (contact.status === "archived") return "archived-contact";
  if (!contact.email || !contact.email.trim()) return "missing-email";
  if (!isValidEmailDirection(contact.email)) return "invalid-email";
  return "eligible";
}

/**
 * Contacts the viewer may see at all. Anything failing this is removed before it
 * can reach a list, a count, a search result, or a group expansion — it is never
 * merely hidden with CSS.
 */
export function filterVisibleContacts(
  contacts: ContactListItem[],
  ctx: ContactEligibilityContext,
): ContactListItem[] {
  return contacts.filter((c) => c.workspaceId === ctx.workspaceId);
}

// ── Selection and expansion ───────────────────────────────────────────────────

export interface ContactSelectionEntry {
  contact: ContactListItem;
  /** Groups this person arrived through. Empty when picked directly. */
  viaGroupIds: ContactGroupId[];
  viaGroupNames: string[];
  /** True when the user picked this person directly, independent of any group. */
  pickedDirectly: boolean;
  reason: ContactRecipientEligibilityReason;
  /** User-driven exclusion. Never modifies the Contact or the Contact Group. */
  excluded: boolean;
}

export interface ContactSelectionSummary {
  directContacts:   number;
  groupsSelected:   number;
  totalConsidered:  number;
  eligible:         number;
  duplicatesMerged: number;
  needsAttention:   number;
  excluded:         number;
  /** Distinct Contact records sharing an email. Projected, then flagged for review. */
  conflicts:        number;
  /** Present only when something was dropped for tenancy/visibility reasons. */
  hiddenCount:      number;
}

export interface ContactExpansionResult {
  entries: ContactSelectionEntry[];
  summary: ContactSelectionSummary;
}

export interface ExpandSelectionInput {
  /** Contacts the user ticked directly in the Contacts tab. */
  directContacts: ContactListItem[];
  /** Groups the user ticked, with their loaded members. */
  groups: Array<{ id: ContactGroupId; name: string; members: ContactListItem[] }>;
  /** Contact IDs the user explicitly unticked in the expansion preview. */
  excludedContactIds: ReadonlySet<string>;
  ctx: ContactEligibilityContext;
}

/**
 * Deterministic expansion of the whole selection into individual people.
 *
 * Ordering is stable (direct picks first in pick order, then each group in
 * selection order, members in the order the service returned them), so the same
 * selection always produces the same rows in the same order.
 *
 * De-duplication is by CONTACT IDENTITY, not by email. The same Contact reached
 * through several groups, or picked directly and also present in a group, is one
 * person and collapses to one row with merged provenance.
 *
 * Two DIFFERENT Contact records that happen to share an email address are a
 * different situation and are deliberately NOT merged: that would silently decide
 * which of the two people the user meant. Both are kept and marked
 * `ambiguous-shared-email` so the canonical duplicate engine flags them for
 * review downstream, which is the established resolution policy.
 */
export function expandSelection(input: ExpandSelectionInput): ContactExpansionResult {
  const { directContacts, groups, excludedContactIds, ctx } = input;

  const byContactId = new Map<string, ContactSelectionEntry>();
  const order: string[] = [];
  let duplicatesMerged = 0;
  let hiddenCount = 0;

  const consider = (
    contact: ContactListItem,
    viaGroup: { id: ContactGroupId; name: string } | null,
  ) => {
    const reason = resolveContactEligibility(contact, ctx);

    // Never surfaced, never counted, never projected.
    if (reason === "cross-workspace" || reason === "restricted-contact") {
      hiddenCount += 1;
      return;
    }

    const key = String(contact.id);
    const existing = byContactId.get(key);
    if (existing) {
      // Same Contact record arriving again — one person, one row.
      duplicatesMerged += 1;
      if (viaGroup) {
        if (!existing.viaGroupIds.includes(viaGroup.id)) {
          existing.viaGroupIds.push(viaGroup.id);
          existing.viaGroupNames.push(viaGroup.name);
        }
      } else {
        existing.pickedDirectly = true;
      }
      return;
    }

    order.push(key);
    byContactId.set(key, {
      contact,
      viaGroupIds:   viaGroup ? [viaGroup.id] : [],
      viaGroupNames: viaGroup ? [viaGroup.name] : [],
      pickedDirectly: !viaGroup,
      reason,
      excluded: excludedContactIds.has(String(contact.id)),
    });
  };

  for (const c of directContacts) consider(c, null);
  for (const g of groups) {
    for (const m of g.members) consider(m, { id: g.id, name: g.name });
  }

  const entries = order.map((k) => byContactId.get(k)!);

  // Flag distinct Contact records that share a normalized address. Only applied to
  // entries that are otherwise fine, so a real problem (invalid email, archived)
  // is never masked by the conflict label.
  const emailCounts = new Map<string, number>();
  for (const e of entries) {
    if (!e.contact.email?.trim()) continue;
    const k = normalizeEmailForComparison(e.contact.email);
    emailCounts.set(k, (emailCounts.get(k) ?? 0) + 1);
  }
  for (const e of entries) {
    if (e.reason !== "eligible" || !e.contact.email?.trim()) continue;
    if ((emailCounts.get(normalizeEmailForComparison(e.contact.email)) ?? 0) > 1) {
      e.reason = "ambiguous-shared-email";
    }
  }

  let eligible = 0, needsAttention = 0, excluded = 0, conflicts = 0;
  for (const e of entries) {
    if (e.excluded) { excluded += 1; continue; }
    if (isBlockingReason(e.reason)) { needsAttention += 1; continue; }
    // Non-blocking: still projects. Shared-email conflicts are counted separately
    // so the summary can name them rather than hiding them inside "ready".
    eligible += 1;
    if (e.reason === "ambiguous-shared-email") conflicts += 1;
  }

  return {
    entries,
    summary: {
      directContacts:  directContacts.length,
      groupsSelected:  groups.length,
      totalConsidered: entries.length + duplicatesMerged,
      eligible,
      duplicatesMerged,
      needsAttention,
      excluded,
      conflicts,
      hiddenCount,
    },
  };
}

/** Entries that will actually become recipient rows. */
export function projectableEntries(entries: ContactSelectionEntry[]): ContactSelectionEntry[] {
  return entries.filter((e) => !e.excluded && !isBlockingReason(e.reason));
}

// ── Payload for the canonical row constructor ─────────────────────────────────

export interface ContactSourcePayload {
  headers: string[];
  cells: string[][];
  /** Index-aligned with `cells`. */
  contactIds: (string | null)[];
  /** Index-aligned with `cells`. First group a person arrived through, or null. */
  contactGroupIds: (string | null)[];
  /** Index-aligned. Contact status, so validation can see archived/restricted state. */
  contactStatuses: Array<{ contactId: string; status: ContactListItem["status"] }>;
  rowCount: number;
}

/**
 * Builds the payload in a SINGLE pass so `cells`, `contactIds`, `contactGroupIds`
 * and `contactStatuses` cannot drift out of alignment.
 *
 * `applyRecipientSource` reads `contactIds[i]` positionally against `cells[i]`.
 * Filtering one list without filtering the others in lockstep would silently
 * attribute every subsequent row to the wrong person, with no type error and no
 * visible symptom — so the filter is applied once, here, and the arrays are
 * emitted together.
 *
 * Only fields the recipient-row model approves are copied. Notes, phone numbers,
 * tags, group metadata, owner, usage history, and timestamps are deliberately
 * left behind.
 */
export function buildContactSourcePayload(entries: ContactSelectionEntry[]): ContactSourcePayload {
  const usable = projectableEntries(entries);

  const cells: string[][] = [];
  const contactIds: (string | null)[] = [];
  const contactGroupIds: (string | null)[] = [];
  const contactStatuses: ContactSourcePayload["contactStatuses"] = [];

  for (const e of usable) {
    cells.push([
      e.contact.name ?? "",
      e.contact.email ?? "",
      e.contact.organization ?? "",
    ]);
    contactIds.push(String(e.contact.id));
    contactGroupIds.push(e.viaGroupIds.length > 0 ? String(e.viaGroupIds[0]) : null);
    contactStatuses.push({ contactId: String(e.contact.id), status: e.contact.status });
  }

  return {
    headers: [...CONTACT_SOURCE_HEADERS],
    cells,
    contactIds,
    contactGroupIds,
    contactStatuses,
    rowCount: cells.length,
  };
}

/**
 * Which source union member to record. A selection that involved any group is
 * attributed to `contact-group`; a purely direct pick is `contact`.
 */
export function resolveSourceKind(entries: ContactSelectionEntry[]): "contact" | "contact-group" {
  return projectableEntries(entries).some((e) => e.viaGroupIds.length > 0)
    ? "contact-group"
    : "contact";
}

// ── Honest result language ────────────────────────────────────────────────────

export const CONTACT_SOURCE_NOTICE =
  "Selected Contacts are projected into this frontend batch draft. No request, invitation, " +
  "email, SMS message, recipient session, or production transaction was created or delivered.";

export const CONTACT_GROUP_EXPANSION_NOTICE =
  "A Contact Group is expanded into individual recipients. The group itself is never a " +
  "recipient and never signs. Excluding someone here affects only this batch draft — it does " +
  "not change the Contact or the Contact Group.";

export const CONTACT_NO_ACCESS_NOTICE =
  "Adding a Contact does not grant that person access to any document, and does not notify them.";

/** Built from real counts. Never asserts anything that did not happen. */
export function describeSelection(summary: ContactSelectionSummary): string[] {
  const parts: string[] = [];
  parts.push(`${summary.eligible} ${summary.eligible === 1 ? "recipient" : "recipients"} ready to add`);
  if (summary.duplicatesMerged > 0) {
    parts.push(`${summary.duplicatesMerged} duplicate ${summary.duplicatesMerged === 1 ? "entry" : "entries"} merged`);
  }
  if (summary.conflicts > 0) {
    parts.push(`${summary.conflicts} sharing an email address, flagged for review`);
  }
  if (summary.needsAttention > 0) {
    parts.push(`${summary.needsAttention} ${summary.needsAttention === 1 ? "Contact needs" : "Contacts need"} attention`);
  }
  if (summary.excluded > 0) parts.push(`${summary.excluded} excluded`);
  return parts;
}
