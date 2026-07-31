// Unit tests for services/contact-recipient-source.ts — the single owner of
// Contact/Contact-Group recipient sourcing (Gap Closure Command 1).
//
// This module is pure. Every test here calls it directly rather than rendering
// ContactRecipientPicker, so a failure message names the function that broke
// instead of a DOM query that could not find a checkbox.
//
// The behaviours pinned here are the ones that are silently wrong when they
// regress — an expansion that produces one row per group, a de-duplication that
// merges two different people because they share a mailbox, or a payload whose
// parallel arrays drift by one index. None of those throw; they just attribute a
// document to the wrong person.

import type {
  ContactGroupId,
  ContactId,
  ContactListItem,
  ContactStatus,
} from "../../models/contacts";
import {
  CONTACT_ELIGIBILITY_HINTS,
  CONTACT_ELIGIBILITY_LABELS,
  CONTACT_GROUP_EXPANSION_NOTICE,
  CONTACT_NO_ACCESS_NOTICE,
  CONTACT_SOURCE_HEADERS,
  CONTACT_SOURCE_NOTICE,
  buildContactSourcePayload,
  describeSelection,
  expandSelection,
  filterVisibleContacts,
  isBlockingReason,
  projectableEntries,
  resolveContactEligibility,
  resolveSourceKind,
  type ContactRecipientEligibilityReason,
  type ContactSelectionEntry,
} from "../contact-recipient-source";
import {
  OTHER_WORKSPACE_ID,
  TEST_HEADERS,
  TEST_NOW_ISO,
  TEST_WORKSPACE_ID,
  createTestContact,
} from "../../../test/fixtures";

// ── Local builders ────────────────────────────────────────────────────────────
//
// `createTestContact` from fixtures.ts supplies the shared fictional identity
// values; this widens the result into a full `ContactListItem` (the shape the
// module actually consumes) and allows the two statuses the fixture builder does
// not expose. Every value is invented and every domain is RFC-reserved.

interface ContactSpec {
  id?: string;
  name?: string;
  email?: string;
  /** `null` means the Contact genuinely has no organization recorded. */
  organization?: string | null;
  status?: ContactStatus;
  workspaceId?: string;
  phone?: string;
  title?: string;
}

function contact(spec: ContactSpec = {}): ContactListItem {
  const id = spec.id ?? "ct_test_001";
  const base = createTestContact({
    id,
    name: spec.name,
    // Distinct by default. Sharing a mailbox is a specific behaviour under test,
    // so it must be requested explicitly — never inherited from a shared default.
    // (`??` keeps a deliberate "" or "   " intact.)
    email: spec.email ?? `${id.replace(/[^a-z0-9]+/gi, ".")}@example.test`,
    workspaceId: spec.workspaceId,
  });
  return {
    id: base.id as ContactId,
    status: spec.status ?? "active",
    scope: "workspace",
    name: base.name,
    email: base.email,
    organization: spec.organization === null ? undefined : (spec.organization ?? base.organization),
    phone: spec.phone,
    title: spec.title,
    tagIds: [],
    groupIds: [],
    usageCount: 0,
    updatedAt: TEST_NOW_ISO,
    workspaceId: base.workspaceId,
    demonstrationOnly: true,
  };
}

function group(id: string, name: string, members: ContactListItem[]) {
  return { id: id as ContactGroupId, name, members };
}

const CTX = { workspaceId: TEST_WORKSPACE_ID };

function expand(input: {
  directContacts?: ContactListItem[];
  groups?: Array<{ id: ContactGroupId; name: string; members: ContactListItem[] }>;
  excluded?: string[];
  workspaceId?: string;
}) {
  return expandSelection({
    directContacts: input.directContacts ?? [],
    groups: input.groups ?? [],
    excludedContactIds: new Set(input.excluded ?? []),
    ctx: { workspaceId: input.workspaceId ?? TEST_WORKSPACE_ID },
  });
}

/** Indexed access with a failure message that names the index, under noUncheckedIndexedAccess. */
function at<T>(arr: readonly T[], index: number): T {
  const value = arr[index];
  if (value === undefined) {
    throw new Error(`Expected an element at index ${index} but the array has ${arr.length}.`);
  }
  return value;
}

const idsOf = (entries: ContactSelectionEntry[]) => entries.map((e) => String(e.contact.id));

// ── Fixed people ──────────────────────────────────────────────────────────────

const ANA = contact({
  id: "ct_ana", name: "Ana Test Reyes",
  email: "ana.reyes@example.test", organization: "Test Legal Partners",
});
const BEN = contact({
  id: "ct_ben", name: "Ben Test Cruz",
  email: "ben.cruz@example.test", organization: "Test Holdings",
});
const CARMEN = contact({
  id: "ct_carmen", name: "Carmen Test Lopez",
  email: "carmen.lopez@example.test", organization: "Test Advisory",
});

// ══════════════════════════════════════════════════════════════════════════════
// Eligibility
// ══════════════════════════════════════════════════════════════════════════════

describe("resolveContactEligibility", () => {
  it("accepts an active, in-workspace Contact with a valid address", () => {
    expect(resolveContactEligibility(ANA, CTX)).toBe("eligible");
  });

  it("rejects a Contact from another workspace", () => {
    const outsider = contact({ id: "ct_outsider", workspaceId: OTHER_WORKSPACE_ID });
    expect(resolveContactEligibility(outsider, CTX)).toBe("cross-workspace");
  });

  it("checks tenancy BEFORE anything else, so no other property can be inferred", () => {
    // An out-of-workspace Contact that is also archived and has no address must
    // still report only `cross-workspace`. If archival or email state leaked out
    // ahead of the tenancy check, the picker's label would tell the viewer
    // something about a record in a workspace they are not in.
    const outsider = contact({
      id: "ct_outsider_archived",
      workspaceId: OTHER_WORKSPACE_ID,
      status: "archived",
      email: "",
    });
    expect(resolveContactEligibility(outsider, CTX)).toBe("cross-workspace");
    // Both hide behind the same user-facing wording, so the two are indistinguishable.
    expect(CONTACT_ELIGIBILITY_LABELS["cross-workspace"])
      .toBe(CONTACT_ELIGIBILITY_LABELS["restricted-contact"]);
  });

  it("rejects an archived Contact even when the address is perfectly valid", () => {
    expect(resolveContactEligibility(contact({ id: "ct_arch", status: "archived" }), CTX))
      .toBe("archived-contact");
  });

  it("reports archival ahead of a missing address", () => {
    const archivedNoEmail = contact({ id: "ct_arch2", status: "archived", email: "" });
    expect(resolveContactEligibility(archivedNoEmail, CTX)).toBe("archived-contact");
  });

  it("rejects an empty or whitespace-only address as missing, not invalid", () => {
    expect(resolveContactEligibility(contact({ id: "ct_a", email: "" }), CTX)).toBe("missing-email");
    expect(resolveContactEligibility(contact({ id: "ct_b", email: "   " }), CTX)).toBe("missing-email");
  });

  it("rejects malformed addresses as invalid", () => {
    const malformed = [
      "not-an-email",
      "roberto.alvarez@@example.test",
      "no-domain@localhost",
      "spaces in@example.test",
      "@example.test",
      "trailing@example.",
    ];
    for (const email of malformed) {
      expect(resolveContactEligibility(contact({ id: `ct_${email}`, email }), CTX))
        .toBe("invalid-email");
    }
  });

  it("tolerates surrounding whitespace on an otherwise valid address", () => {
    expect(resolveContactEligibility(contact({ id: "ct_ws", email: "  ana.reyes@example.test  " }), CTX))
      .toBe("eligible");
  });

  it("does not consider duplication — that is a property of a selection, not a Contact", () => {
    // Two records, same mailbox. Judged one at a time, both are simply eligible;
    // only `expandSelection` may add a conflict verdict.
    const twin = contact({ id: "ct_twin", name: "A. Reyes", email: ANA.email });
    expect(resolveContactEligibility(ANA, CTX)).toBe("eligible");
    expect(resolveContactEligibility(twin, CTX)).toBe("eligible");
  });

  // ── Documented gap ──────────────────────────────────────────────────────────
  //
  // `ContactStatus` has four members. The resolver only branches on `archived`,
  // so `restricted` and `invalid` Contacts are reported as fully eligible and are
  // projected into the payload. The `restricted-contact` reason, its label, and
  // the `reason === "restricted-contact"` branch inside `expandSelection` are
  // therefore unreachable today. Reported, not silently accepted.
  it("GAP: a `restricted` Contact resolves as eligible (see report)", () => {
    const restricted = contact({ id: "ct_restricted", status: "restricted" });
    expect(resolveContactEligibility(restricted, CTX)).toBe("eligible");
  });

  it("GAP: a `restricted` Contact still carries its true status into the payload", () => {
    // The safety net that keeps the gap above from becoming a real leak: the
    // canonical bulk-send validation reads `contactStatuses` and blocks the row
    // with `row-contact-restricted`. If this alignment broke, a restricted
    // Contact would validate clean.
    const restricted = contact({ id: "ct_restricted", status: "restricted" });
    const payload = buildContactSourcePayload(expand({ directContacts: [restricted] }).entries);
    expect(payload.rowCount).toBe(1);
    expect(payload.contactStatuses).toEqual([{ contactId: "ct_restricted", status: "restricted" }]);
  });
});

describe("isBlockingReason", () => {
  // Typed exhaustively: adding a reason to the union without deciding whether it
  // blocks will not compile, and the runtime loop catches label-map drift.
  const EXPECTED: Record<ContactRecipientEligibilityReason, boolean> = {
    "eligible":                false,
    "duplicate-in-selection":  false,
    "duplicate-across-groups": false,
    "ambiguous-shared-email":  false,
    "missing-email":           true,
    "invalid-email":           true,
    "archived-contact":        true,
    "restricted-contact":      true,
    "cross-workspace":         true,
    "excluded-by-user":        true,
  };

  it("classifies every declared reason", () => {
    const declared = Object.keys(CONTACT_ELIGIBILITY_LABELS) as ContactRecipientEligibilityReason[];
    expect(declared.sort()).toEqual(Object.keys(EXPECTED).sort());
    for (const reason of declared) {
      expect(isBlockingReason(reason), `blocking verdict for "${reason}"`).toBe(EXPECTED[reason]);
    }
  });

  it("does not block a shared-email conflict — both records must reach review", () => {
    // The whole point of the Gap 1 fix: surfacing the conflict rather than
    // resolving it by dropping one of the two people.
    expect(isBlockingReason("ambiguous-shared-email")).toBe(false);
  });

  it("gives every reason a user-facing label with no internal error text", () => {
    for (const [reason, label] of Object.entries(CONTACT_ELIGIBILITY_LABELS)) {
      expect(label.length, `label for "${reason}"`).toBeGreaterThan(0);
      expect(label).not.toMatch(/error|exception|undefined|null|throw/i);
    }
  });

  it("explains the non-obvious reasons with a hint", () => {
    for (const reason of ["missing-email", "invalid-email", "ambiguous-shared-email"] as const) {
      expect(CONTACT_ELIGIBILITY_HINTS[reason], `hint for "${reason}"`).toBeTruthy();
    }
  });
});

describe("filterVisibleContacts", () => {
  it("removes out-of-workspace Contacts entirely rather than marking them", () => {
    const outsider = contact({ id: "ct_outsider", name: "Beatriz Test Ocampo", workspaceId: OTHER_WORKSPACE_ID });
    const visible = filterVisibleContacts([ANA, outsider, BEN], CTX);
    expect(idsOf(visible.map((c) => ({ contact: c }) as ContactSelectionEntry)))
      .toEqual(["ct_ana", "ct_ben"]);
    expect(JSON.stringify(visible)).not.toContain("Beatriz");
  });

  it("preserves order and does not mutate the input array", () => {
    const input = [BEN, ANA, CARMEN];
    const visible = filterVisibleContacts(input, CTX);
    expect(visible.map((c) => String(c.id))).toEqual(["ct_ben", "ct_ana", "ct_carmen"]);
    expect(input).toHaveLength(3);
  });
});

// ══════════════════════════════════════════════════════════════════════════════
// Group expansion
// ══════════════════════════════════════════════════════════════════════════════

describe("expandSelection — Contact Group expansion", () => {
  it("expands a group into one entry PER MEMBER, never a single group row", () => {
    const result = expand({ groups: [group("cg_board", "Board Review", [ANA, BEN, CARMEN])] });

    expect(result.entries).toHaveLength(3);
    expect(idsOf(result.entries)).toEqual(["ct_ana", "ct_ben", "ct_carmen"]);
    // The group itself must never appear as a person.
    expect(idsOf(result.entries)).not.toContain("cg_board");
    expect(result.entries.some((e) => e.contact.name === "Board Review")).toBe(false);
    expect(result.summary.groupsSelected).toBe(1);
    expect(result.summary.directContacts).toBe(0);
    expect(result.summary.eligible).toBe(3);
  });

  it("records the provenance of a group-derived person without marking them a direct pick", () => {
    const result = expand({ groups: [group("cg_board", "Board Review", [ANA])] });
    const entry = at(result.entries, 0);
    expect(entry.viaGroupIds).toEqual(["cg_board"]);
    expect(entry.viaGroupNames).toEqual(["Board Review"]);
    expect(entry.pickedDirectly).toBe(false);
  });

  it("produces zero entries for an empty group, not one placeholder row", () => {
    const result = expand({ groups: [group("cg_empty", "Empty Group", [])] });
    expect(result.entries).toEqual([]);
    expect(result.summary.groupsSelected).toBe(1);
    expect(result.summary.eligible).toBe(0);
    expect(result.summary.totalConsidered).toBe(0);
  });

  it("orders direct picks first, then each group in selection order", () => {
    const result = expand({
      directContacts: [CARMEN],
      groups: [
        group("cg_one", "Group One", [ANA]),
        group("cg_two", "Group Two", [BEN]),
      ],
    });
    expect(idsOf(result.entries)).toEqual(["ct_carmen", "ct_ana", "ct_ben"]);
  });

  it("drops out-of-workspace members from a group without counting or exposing them", () => {
    const outsider = contact({
      id: "ct_outsider", name: "Beatriz Test Ocampo",
      email: "beatriz.ocampo@example.invalid", workspaceId: OTHER_WORKSPACE_ID,
    });
    const result = expand({ groups: [group("cg_mixed", "Mixed Group", [ANA, outsider, BEN])] });

    expect(idsOf(result.entries)).toEqual(["ct_ana", "ct_ben"]);
    expect(result.summary.hiddenCount).toBe(1);
    // Hidden means hidden: not in the considered total either.
    expect(result.summary.totalConsidered).toBe(2);
    expect(JSON.stringify(result)).not.toContain("beatriz.ocampo@example.invalid");
    expect(JSON.stringify(result)).not.toContain("Beatriz");
  });

  it("keeps an archived group member visible but blocked, so the user can see why", () => {
    const archived = contact({ id: "ct_archived", name: "Dario Test Ilagan", status: "archived" });
    const result = expand({ groups: [group("cg_mixed", "Mixed Group", [ANA, archived])] });

    expect(result.entries).toHaveLength(2);
    expect(at(result.entries, 1).reason).toBe("archived-contact");
    expect(result.summary.eligible).toBe(1);
    expect(result.summary.needsAttention).toBe(1);
    expect(result.summary.hiddenCount).toBe(0);
  });
});

// ══════════════════════════════════════════════════════════════════════════════
// De-duplication BY CONTACT ID
// ══════════════════════════════════════════════════════════════════════════════

describe("expandSelection — de-duplication by Contact identity", () => {
  it("collapses the same Contact reached through two groups into one row", () => {
    const result = expand({
      groups: [
        group("cg_one", "Group One", [ANA, BEN]),
        group("cg_two", "Group Two", [ANA, CARMEN]),
      ],
    });

    expect(idsOf(result.entries)).toEqual(["ct_ana", "ct_ben", "ct_carmen"]);
    expect(result.summary.duplicatesMerged).toBe(1);
    expect(result.summary.totalConsidered).toBe(4);
    expect(result.summary.eligible).toBe(3);
  });

  it("merges provenance from every group the person arrived through, in order", () => {
    const result = expand({
      groups: [
        group("cg_one", "Group One", [ANA]),
        group("cg_two", "Group Two", [ANA]),
      ],
    });
    const entry = at(result.entries, 0);
    expect(entry.viaGroupIds).toEqual(["cg_one", "cg_two"]);
    expect(entry.viaGroupNames).toEqual(["Group One", "Group Two"]);
    // Names stay index-aligned with IDs.
    expect(entry.viaGroupNames).toHaveLength(entry.viaGroupIds.length);
  });

  it("does not repeat a group in provenance when it lists the same member twice", () => {
    const result = expand({ groups: [group("cg_dupe", "Duplicated Membership", [ANA, ANA])] });
    expect(result.entries).toHaveLength(1);
    expect(at(result.entries, 0).viaGroupIds).toEqual(["cg_dupe"]);
    expect(result.summary.duplicatesMerged).toBe(1);
  });

  it("keeps a direct pick that is also a group member as one row with both provenances", () => {
    const result = expand({
      directContacts: [ANA],
      groups: [group("cg_one", "Group One", [ANA, BEN])],
    });

    expect(idsOf(result.entries)).toEqual(["ct_ana", "ct_ben"]);
    const ana = at(result.entries, 0);
    expect(ana.pickedDirectly).toBe(true);
    expect(ana.viaGroupIds).toEqual(["cg_one"]);
    expect(result.summary.duplicatesMerged).toBe(1);
  });

  it("keeps a person ticked directly marked as a direct pick when a group also supplies them", () => {
    const result = expand({
      directContacts: [BEN],
      groups: [group("cg_one", "Group One", [BEN])],
    });
    const ben = at(result.entries, 0);
    expect(ben.pickedDirectly).toBe(true);
    expect(ben.viaGroupIds).toEqual(["cg_one"]);
  });

  it("collapses the same Contact appearing twice in the direct picks", () => {
    // The picker holds picks in a Set so this cannot normally happen, but the
    // service must not depend on its caller de-duplicating first.
    const result = expand({ directContacts: [ANA, ANA] });
    expect(result.entries).toHaveLength(1);
    expect(at(result.entries, 0).pickedDirectly).toBe(true);
    expect(at(result.entries, 0).viaGroupIds).toEqual([]);
    expect(result.summary.duplicatesMerged).toBe(1);
    // Merged on identity, so no phantom shared-address conflict.
    expect(result.summary.conflicts).toBe(0);
    expect(at(result.entries, 0).reason).toBe("eligible");
  });

  // ── The Gap 1 defect ────────────────────────────────────────────────────────

  it("does NOT merge two different Contacts that share an email address", () => {
    // Regression guard for the real defect found during Gap 1: de-duplicating by
    // email silently decided which of two people the user meant. Both records
    // must survive as separate rows.
    const sharedA = contact({
      id: "ct_shared_a", name: "Elena Test Marquez",
      email: "office@example.test", organization: "Marquez Test Realty",
    });
    const sharedB = contact({
      id: "ct_shared_b", name: "Felix Test Marquez",
      email: "office@example.test", organization: "Marquez Test Realty",
    });

    const result = expand({ directContacts: [sharedA, sharedB] });

    expect(idsOf(result.entries)).toEqual(["ct_shared_a", "ct_shared_b"]);
    expect(result.summary.duplicatesMerged).toBe(0);
    expect(at(result.entries, 0).reason).toBe("ambiguous-shared-email");
    expect(at(result.entries, 1).reason).toBe("ambiguous-shared-email");
    // Flagged, not suppressed: both still count as ready and both project.
    expect(result.summary.eligible).toBe(2);
    expect(result.summary.conflicts).toBe(2);
    expect(result.summary.needsAttention).toBe(0);

    const payload = buildContactSourcePayload(result.entries);
    expect(payload.rowCount).toBe(2);
    expect(payload.contactIds).toEqual(["ct_shared_a", "ct_shared_b"]);
    expect(payload.cells.map((row) => at(row, 0)))
      .toEqual(["Elena Test Marquez", "Felix Test Marquez"]);
  });

  it("detects a shared address across case and surrounding whitespace", () => {
    const upper = contact({ id: "ct_upper", name: "Gina Test Uy", email: "Office@Example.Test" });
    const spaced = contact({ id: "ct_spaced", name: "Hugo Test Uy", email: "  office@example.test  " });
    const result = expand({ directContacts: [upper, spaced] });

    expect(result.entries).toHaveLength(2);
    expect(result.entries.map((e) => e.reason))
      .toEqual(["ambiguous-shared-email", "ambiguous-shared-email"]);
    expect(result.summary.conflicts).toBe(2);
  });

  it("does not flag a conflict when one Contact record simply arrived twice", () => {
    // Same ID collapses first, so only one entry holds the address and nothing is
    // ambiguous. A conflict here would mean de-dup silently switched to email.
    const result = expand({
      directContacts: [ANA],
      groups: [group("cg_one", "Group One", [ANA])],
    });
    expect(result.entries).toHaveLength(1);
    expect(at(result.entries, 0).reason).toBe("eligible");
    expect(result.summary.conflicts).toBe(0);
    expect(result.summary.duplicatesMerged).toBe(1);
  });

  it("never flags Contacts that share only the absence of an address", () => {
    const noEmailA = contact({ id: "ct_noemail_a", name: "Ivan Test Bello", email: "" });
    const noEmailB = contact({ id: "ct_noemail_b", name: "Jaime Test Bello", email: "   " });
    const result = expand({ directContacts: [noEmailA, noEmailB] });

    expect(result.entries.map((e) => e.reason)).toEqual(["missing-email", "missing-email"]);
    expect(result.summary.conflicts).toBe(0);
    expect(result.summary.needsAttention).toBe(2);
    expect(result.summary.eligible).toBe(0);
  });

  it("does not let the conflict flag mask a genuine problem on the same record", () => {
    // An archived record sharing an address must keep saying "archived": the
    // conflict label would otherwise hide the reason it cannot be used.
    const archivedTwin = contact({
      id: "ct_archived_twin", name: "Karla Test Diaz",
      email: "office@example.test", status: "archived",
    });
    const activeTwin = contact({
      id: "ct_active_twin", name: "Lito Test Diaz", email: "office@example.test",
    });

    const result = expand({ directContacts: [archivedTwin, activeTwin] });
    expect(at(result.entries, 0).reason).toBe("archived-contact");
    expect(result.summary.needsAttention).toBe(1);
    // GAP (see report): the shared-address tally counts blocked records too, so
    // the surviving Contact is labelled a conflict even though the only other
    // holder of that address can never be added. Exactly one row is produced,
    // yet the summary still tells the user something needs reviewing.
    expect(at(result.entries, 1).reason).toBe("ambiguous-shared-email");
    expect(result.summary.conflicts).toBe(1);
    expect(buildContactSourcePayload(result.entries).rowCount).toBe(1);
    expect(describeSelection(result.summary))
      .toContain("1 sharing an email address, flagged for review");
  });
});

// ══════════════════════════════════════════════════════════════════════════════
// Exclusion
// ══════════════════════════════════════════════════════════════════════════════

describe("expandSelection — user exclusion", () => {
  it("marks an excluded person without removing them from the preview", () => {
    const result = expand({
      groups: [group("cg_one", "Group One", [ANA, BEN])],
      excluded: ["ct_ben"],
    });

    expect(result.entries).toHaveLength(2);
    expect(at(result.entries, 1).excluded).toBe(true);
    // Still eligible in itself — exclusion is a selection decision, not a verdict.
    expect(at(result.entries, 1).reason).toBe("eligible");
    expect(result.summary.excluded).toBe(1);
    expect(result.summary.eligible).toBe(1);
  });

  it("never modifies the Contact or its group membership", () => {
    const member = contact({ id: "ct_member", name: "Mina Test Salazar" });
    member.groupIds = ["cg_one" as ContactGroupId];
    expand({ groups: [group("cg_one", "Group One", [member])], excluded: ["ct_member"] });
    expect(member.groupIds).toEqual(["cg_one"]);
    expect(member.status).toBe("active");
  });

  it("counts an excluded blocked person once, as excluded", () => {
    const archived = contact({ id: "ct_arch", status: "archived" });
    const result = expand({ directContacts: [archived], excluded: ["ct_arch"] });
    expect(result.summary.excluded).toBe(1);
    expect(result.summary.needsAttention).toBe(0);
    expect(result.summary.eligible).toBe(0);
  });

  it("keeps excluded people out of the projectable set and the payload", () => {
    const result = expand({
      directContacts: [ANA, BEN, CARMEN],
      excluded: ["ct_ben"],
    });
    expect(idsOf(projectableEntries(result.entries))).toEqual(["ct_ana", "ct_carmen"]);
    expect(buildContactSourcePayload(result.entries).contactIds).toEqual(["ct_ana", "ct_carmen"]);
  });
});

describe("projectableEntries", () => {
  it("keeps eligible and conflict-flagged entries, drops blocked and excluded ones", () => {
    const shareA = contact({ id: "ct_share_a", name: "Nora Test Vega", email: "shared@example.test" });
    const shareB = contact({ id: "ct_share_b", name: "Omar Test Vega", email: "shared@example.test" });
    const archived = contact({ id: "ct_arch", status: "archived" });
    const noEmail = contact({ id: "ct_noemail", email: "" });

    const result = expand({
      directContacts: [ANA, shareA, archived, shareB, noEmail, BEN],
      excluded: ["ct_ben"],
    });

    expect(idsOf(projectableEntries(result.entries)))
      .toEqual(["ct_ana", "ct_share_a", "ct_share_b"]);
  });
});

// ══════════════════════════════════════════════════════════════════════════════
// Payload construction
// ══════════════════════════════════════════════════════════════════════════════

describe("buildContactSourcePayload", () => {
  it("emits exactly the canonical headers the column mapper recognises", () => {
    const payload = buildContactSourcePayload(expand({ directContacts: [ANA] }).entries);
    // Emitting field keys such as "displayName" would produce columns matching no
    // role/variable alias, and every row would land in `invalid-mapping`.
    expect(payload.headers).toEqual(["Name", "Email", "Organization"]);
    expect(payload.headers).toEqual([...CONTACT_SOURCE_HEADERS]);
    expect(payload.headers).toEqual([...TEST_HEADERS]);
  });

  it("hands out a fresh headers array, so a caller cannot corrupt the constant", () => {
    const payload = buildContactSourcePayload(expand({ directContacts: [ANA] }).entries);
    payload.headers[0] = "Mutated";
    expect(CONTACT_SOURCE_HEADERS[0]).toBe("Name");
    expect(buildContactSourcePayload(expand({ directContacts: [ANA] }).entries).headers[0]).toBe("Name");
  });

  it("writes cells in header order", () => {
    const payload = buildContactSourcePayload(expand({ directContacts: [ANA, BEN] }).entries);
    expect(payload.cells).toEqual([
      ["Ana Test Reyes", "ana.reyes@example.test", "Test Legal Partners"],
      ["Ben Test Cruz", "ben.cruz@example.test", "Test Holdings"],
    ]);
  });

  it("substitutes an empty string for a missing organization, never `undefined`", () => {
    const noOrg = contact({ id: "ct_noorg", name: "Pia Test Ramos", organization: null });
    const payload = buildContactSourcePayload(expand({ directContacts: [noOrg] }).entries);
    const row = at(payload.cells, 0);
    expect(row).toHaveLength(3);
    expect(at(row, 2)).toBe("");
    expect(row.every((cell) => typeof cell === "string")).toBe(true);
  });

  it("copies only the approved fields — never phone, title, tags or group metadata", () => {
    const rich = contact({
      id: "ct_rich", name: "Rosa Test Aquino", email: "rosa.aquino@example.test",
      organization: "Aquino Test Group", phone: "+63-000-0000000", title: "Managing Partner",
    });
    rich.tagIds = ["tag_private" as never];
    rich.groupIds = ["cg_private" as ContactGroupId];

    const payload = buildContactSourcePayload(expand({ directContacts: [rich] }).entries);
    const flat = payload.cells.flat().join("|");
    expect(flat).not.toContain("+63-000-0000000");
    expect(flat).not.toContain("Managing Partner");
    expect(flat).not.toContain("tag_private");
    expect(flat).not.toContain("cg_private");
    expect(at(payload.cells, 0)).toHaveLength(CONTACT_SOURCE_HEADERS.length);
  });

  // ── Index alignment ─────────────────────────────────────────────────────────

  it("keeps every parallel array the same length as `cells`", () => {
    const archived = contact({ id: "ct_arch", status: "archived" });
    const result = expand({
      directContacts: [ANA, archived, BEN],
      groups: [group("cg_one", "Group One", [CARMEN])],
    });
    const payload = buildContactSourcePayload(result.entries);

    expect(payload.rowCount).toBe(3);
    expect(payload.cells).toHaveLength(payload.rowCount);
    expect(payload.contactIds).toHaveLength(payload.rowCount);
    expect(payload.contactGroupIds).toHaveLength(payload.rowCount);
    expect(payload.contactStatuses).toHaveLength(payload.rowCount);
  });

  it("attributes each row to the right person when blocked entries are filtered out", () => {
    // The alignment failure this guards against is invisible: filtering `cells`
    // without filtering `contactIds` in lockstep shifts every later row onto the
    // wrong Contact, with no type error and no visible symptom.
    const blockedFirst = contact({ id: "ct_blocked_1", name: "Sara Test Yu", email: "" });
    const blockedMiddle = contact({ id: "ct_blocked_2", name: "Tomas Test Yu", email: "bad@@example.test" });
    const blockedLast = contact({ id: "ct_blocked_3", name: "Ugo Test Yu", status: "archived" });

    const result = expand({
      directContacts: [blockedFirst, ANA, blockedMiddle, BEN, blockedLast, CARMEN],
    });
    const payload = buildContactSourcePayload(result.entries);

    expect(payload.contactIds).toEqual(["ct_ana", "ct_ben", "ct_carmen"]);

    const emailById = new Map([ANA, BEN, CARMEN].map((c) => [String(c.id), c.email] as const));
    for (let i = 0; i < payload.rowCount; i += 1) {
      const id = at(payload.contactIds, i);
      const row = at(payload.cells, i);
      expect(at(row, 1), `email in row ${i} must belong to ${String(id)}`)
        .toBe(emailById.get(String(id)));
      expect(at(payload.contactStatuses, i).contactId, `status row ${i}`).toBe(id);
    }
    // Nothing about a blocked person may reach the payload.
    expect(JSON.stringify(payload)).not.toContain("Sara Test Yu");
    expect(JSON.stringify(payload)).not.toContain("bad@@example.test");
  });

  it("records `null` group provenance for a direct pick and the first group otherwise", () => {
    const result = expand({
      directContacts: [ANA],
      groups: [
        group("cg_one", "Group One", [BEN]),
        group("cg_two", "Group Two", [BEN, CARMEN]),
      ],
    });
    const payload = buildContactSourcePayload(result.entries);

    expect(payload.contactIds).toEqual(["ct_ana", "ct_ben", "ct_carmen"]);
    // Ben arrived through both groups; the FIRST one is recorded.
    expect(payload.contactGroupIds).toEqual([null, "cg_one", "cg_two"]);
  });

  it("carries each Contact's real status, index-aligned, for downstream validation", () => {
    const result = expand({ directContacts: [ANA, BEN] });
    const payload = buildContactSourcePayload(result.entries);
    expect(payload.contactStatuses).toEqual([
      { contactId: "ct_ana", status: "active" },
      { contactId: "ct_ben", status: "active" },
    ]);
  });

  it("returns an empty, still-aligned payload when nothing can be projected", () => {
    const archived = contact({ id: "ct_arch", status: "archived" });
    const payload = buildContactSourcePayload(expand({ directContacts: [archived] }).entries);
    expect(payload.rowCount).toBe(0);
    expect(payload.cells).toEqual([]);
    expect(payload.contactIds).toEqual([]);
    expect(payload.contactGroupIds).toEqual([]);
    expect(payload.contactStatuses).toEqual([]);
    // Headers are still emitted so the caller cannot build a schema-less batch.
    expect(payload.headers).toEqual([...CONTACT_SOURCE_HEADERS]);
  });
});

// ══════════════════════════════════════════════════════════════════════════════
// Source attribution and result language
// ══════════════════════════════════════════════════════════════════════════════

describe("resolveSourceKind", () => {
  it("reports `contact` for a purely direct selection", () => {
    expect(resolveSourceKind(expand({ directContacts: [ANA, BEN] }).entries)).toBe("contact");
  });

  it("reports `contact-group` as soon as one projected person came from a group", () => {
    const entries = expand({
      directContacts: [ANA],
      groups: [group("cg_one", "Group One", [BEN])],
    }).entries;
    expect(resolveSourceKind(entries)).toBe("contact-group");
  });

  it("ignores group members that will not be projected", () => {
    // Every group member is blocked or excluded, so no row actually originates
    // from a group and the batch must not claim it did.
    const archived = contact({ id: "ct_arch", status: "archived" });
    const entries = expand({
      directContacts: [ANA],
      groups: [
        group("cg_one", "Group One", [archived]),
        group("cg_two", "Group Two", [BEN]),
      ],
      excluded: ["ct_ben"],
    }).entries;
    expect(resolveSourceKind(entries)).toBe("contact");
  });
});

describe("describeSelection", () => {
  it("describes a clean single-person selection in the singular", () => {
    const { summary } = expand({ directContacts: [ANA] });
    expect(describeSelection(summary)).toEqual(["1 recipient ready to add"]);
  });

  it("names merged duplicates, conflicts, blocked Contacts and exclusions from real counts", () => {
    const shareA = contact({ id: "ct_share_a", name: "Vera Test Lim", email: "shared@example.test" });
    const shareB = contact({ id: "ct_share_b", name: "Wes Test Lim", email: "shared@example.test" });
    const archived = contact({ id: "ct_arch", status: "archived" });

    const { summary } = expand({
      directContacts: [shareA, shareB, archived, CARMEN, BEN],
      groups: [group("cg_one", "Group One", [shareA])],
      excluded: ["ct_ben"],
    });

    expect(summary.duplicatesMerged).toBe(1);
    expect(summary.conflicts).toBe(2);
    expect(summary.needsAttention).toBe(1);
    expect(summary.excluded).toBe(1);

    expect(describeSelection(summary)).toEqual([
      "3 recipients ready to add",
      "1 duplicate entry merged",
      "2 sharing an email address, flagged for review",
      "1 Contact needs attention",
      "1 excluded",
    ]);
  });

  it("pluralises merged duplicates and blocked Contacts", () => {
    const archivedA = contact({ id: "ct_arch_a", status: "archived" });
    const archivedB = contact({ id: "ct_arch_b", status: "archived" });
    const { summary } = expand({
      directContacts: [ANA, BEN],
      groups: [
        group("cg_one", "Group One", [ANA, BEN, archivedA]),
        group("cg_two", "Group Two", [archivedB]),
      ],
    });
    expect(describeSelection(summary)).toEqual([
      "2 recipients ready to add",
      "2 duplicate entries merged",
      "2 Contacts need attention",
    ]);
  });

  it("omits every line whose count is zero", () => {
    const { summary } = expand({ directContacts: [ANA, BEN] });
    const lines = describeSelection(summary);
    expect(lines).toHaveLength(1);
    expect(lines.join(" ")).not.toMatch(/duplicate|flagged|attention|excluded/);
  });

  it("never claims that anything was sent, invited, or delivered", () => {
    const { summary } = expand({ directContacts: [ANA] });
    const copy = [
      ...describeSelection(summary),
      CONTACT_SOURCE_NOTICE,
      CONTACT_GROUP_EXPANSION_NOTICE,
      CONTACT_NO_ACCESS_NOTICE,
    ].join(" ");
    expect(copy).not.toMatch(/\b(was sent|were sent|has been sent|have been sent|delivered to|notified)\b/i);
    expect(CONTACT_SOURCE_NOTICE).toMatch(/No request, invitation, email/);
    expect(CONTACT_GROUP_EXPANSION_NOTICE).toMatch(/never a recipient and never signs/);
    expect(CONTACT_NO_ACCESS_NOTICE).toMatch(/does not grant/);
  });
});

// ══════════════════════════════════════════════════════════════════════════════
// End-to-end through the module
// ══════════════════════════════════════════════════════════════════════════════

describe("selecting a group and adding it as a recipient source", () => {
  it("turns a five-member group with two problems into three correctly attributed rows", () => {
    const archived = contact({ id: "ct_arch", name: "Xavi Test Cabrera", status: "archived" });
    const outsider = contact({
      id: "ct_outsider", name: "Yolanda Test Perez", workspaceId: OTHER_WORKSPACE_ID,
    });

    const result = expand({
      groups: [group("cg_review", "Quarterly Review", [ANA, archived, BEN, outsider, CARMEN])],
    });

    expect(result.summary).toEqual({
      directContacts: 0,
      groupsSelected: 1,
      totalConsidered: 4,
      eligible: 3,
      duplicatesMerged: 0,
      needsAttention: 1,
      excluded: 0,
      conflicts: 0,
      hiddenCount: 1,
    });

    const payload = buildContactSourcePayload(result.entries);
    expect(payload).toEqual({
      headers: ["Name", "Email", "Organization"],
      cells: [
        ["Ana Test Reyes", "ana.reyes@example.test", "Test Legal Partners"],
        ["Ben Test Cruz", "ben.cruz@example.test", "Test Holdings"],
        ["Carmen Test Lopez", "carmen.lopez@example.test", "Test Advisory"],
      ],
      contactIds: ["ct_ana", "ct_ben", "ct_carmen"],
      contactGroupIds: ["cg_review", "cg_review", "cg_review"],
      contactStatuses: [
        { contactId: "ct_ana", status: "active" },
        { contactId: "ct_ben", status: "active" },
        { contactId: "ct_carmen", status: "active" },
      ],
      rowCount: 3,
    });
    expect(resolveSourceKind(result.entries)).toBe("contact-group");
  });
});
