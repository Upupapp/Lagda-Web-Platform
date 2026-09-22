// Applying a workflow template to a preparation draft.
//
// Three properties matter here, and the third is the one that would be
// expensive to get wrong in production:
//
//   1. A template produces a REAL pre-filled draft — the right people, in the
//      right routing steps — rather than the blank one the stub returned.
//   2. What it produces is a SNAPSHOT. Editing or deleting the template
//      afterwards cannot reach a draft already made from it.
//   3. Malformed role-slot data is refused OUTRIGHT. There is no input that
//      yields a participant list routing to some of the people it names and
//      silently to none of the rest — a request like that would go out,
//      collect what signatures it could, and report itself complete.

import { describe, it, expect } from "vitest";
import {
  resolveTemplateApplication, routingOrdersFor,
} from "../template-apply";
import type { TemplateRolePlaceholder, TemplateRoleMapping } from "../../../models/templates";

// Stable ids, so a test can assert on them without matching a timestamp.
function sequentialIds(): () => string {
  let n = 0;
  return () => `pax_${++n}`;
}

function slot(over: Partial<TemplateRolePlaceholder> = {}): TemplateRolePlaceholder {
  return {
    id: "ph_1",
    label: "Signer",
    role: "signer",
    required: true,
    routingStep: 1,
    defaultAuthMethod: "none",
    description: "",
    mustMapToParticipant: true,
    ...over,
  };
}

function mapping(over: Partial<TemplateRoleMapping> = {}): TemplateRoleMapping {
  return {
    placeholderId: "ph_1",
    placeholderLabel: "Signer",
    role: "signer",
    required: true,
    displayName: "Maria Santos",
    email: "maria.santos@ayalaland.com.ph",
    organization: "Ayala Land",
    authMethod: "none",
    ...over,
  };
}

/** The recurring two-step shape: an approver at step 1, a signer at step 2. */
const APPROVAL_THEN_SIGNING = {
  placeholders: [
    slot({ id: "ph_appr", label: "HR Approver", role: "approver", routingStep: 1 }),
    slot({ id: "ph_sign", label: "New Employee", role: "signer", routingStep: 2 }),
  ],
  roleMappings: [
    mapping({ placeholderId: "ph_appr", displayName: "Ana Reyes", email: "ana@acme.test" }),
    mapping({ placeholderId: "ph_sign", displayName: "Ben Cruz", email: "ben@acme.test" }),
  ],
};

const resolve = (
  input: Partial<Parameters<typeof resolveTemplateApplication>[0]> = {},
) => resolveTemplateApplication({
  placeholders: [slot()],
  roleMappings: [mapping()],
  routingMode: "sequential",
  newId: sequentialIds(),
  ...input,
});

// ── 1. A real pre-filled draft ──────────────────────────────────────────────

describe("a template produces a real pre-filled draft", () => {
  it("creates one participant per mapped slot, with the person's details", () => {
    const result = resolve();
    expect(result.ok).toBe(true);
    if (!result.ok) return;

    expect(result.application.participants).toHaveLength(1);
    const [p] = result.application.participants;
    expect(p!.name).toBe("Maria Santos");
    expect(p!.email).toBe("maria.santos@ayalaland.com.ph");
    expect(p!.organization).toBe("Ayala Land");
    expect(p!.role).toBe("signer");
  });

  it("takes the ROLE from the slot, not from the mapping", () => {
    // The slot is the template author's decision. A mapping row carrying a
    // stale role must not be able to change what the template said.
    const result = resolve({
      placeholders: [slot({ role: "approver" })],
      roleMappings: [mapping({ role: "signer" })],
    });
    expect(result.ok).toBe(true);
    if (!result.ok) return;
    expect(result.application.participants[0]!.role).toBe("approver");
  });

  it("puts each participant in the routing step its slot asked for", () => {
    const result = resolve({ ...APPROVAL_THEN_SIGNING, routingMode: "sequential" });
    expect(result.ok).toBe(true);
    if (!result.ok) return;

    const { participants, routing } = result.application;
    expect(routing.groups).toHaveLength(2);

    const approver = participants.find(p => p.role === "approver")!;
    const signer = participants.find(p => p.role === "signer")!;
    expect(routing.groups[0]!.participantIds).toEqual([approver.id]);
    expect(routing.groups[1]!.participantIds).toEqual([signer.id]);
  });

  it("gives every participant a routingGroupId pointing at a real group", () => {
    const result = resolve(APPROVAL_THEN_SIGNING);
    expect(result.ok).toBe(true);
    if (!result.ok) return;

    const groupIds = new Set(result.application.routing.groups.map(g => g.id));
    for (const p of result.application.participants) {
      expect(groupIds.has(p.routingGroupId!)).toBe(true);
    }
  });

  // ── The server-enforcement gate ──────────────────────────────────────────
  //
  // models/prepare's isAuthMethodAvailableForParticipant exists because the
  // backend enforces ONLY the secure invitation link today. A template that
  // could write "email-otp" onto a recipient would put a security promise in
  // front of the sender that nothing server-side checks — and two of the
  // shipped templates specify exactly that method.

  it("does NOT apply an auth method the server cannot enforce", () => {
    const result = resolve({
      placeholders: [slot({ defaultAuthMethod: "email-otp" })],
      // The page seeds each mapping from the slot default
      // (buildInitialMappings), so the fixture must too — otherwise the
      // mapping's "none" masks the slot and this passes for the wrong reason.
      roleMappings: [mapping({ authMethod: "email-otp" })],
      // Stands in for real-backend mode, where only "none" is available.
      isAuthAvailable: (method) => method === "none",
    });
    expect(result.ok).toBe(true);
    if (!result.ok) return;

    // Falls back to the draft default — the invitation link — not to a
    // setting nobody honours.
    expect(result.application.participants[0]!.authMethodOverride).toBeNull();
  });

  it("REPORTS the downgrade rather than swallowing it", () => {
    // Silently weakening an authentication setting is its own defect. The
    // caller has to be able to tell the sender.
    const result = resolve({
      placeholders: [slot({ label: "Client Signer", defaultAuthMethod: "email-otp" })],
      roleMappings: [mapping({ authMethod: "email-otp" })],
      isAuthAvailable: (method) => method === "none",
    });
    expect(result.ok).toBe(true);
    if (!result.ok) return;

    expect(result.authDowngrades).toEqual([
      { label: "Client Signer", requested: "email-otp" },
    ]);
  });

  it("reports nothing when every requested method is honoured", () => {
    const result = resolve({
      placeholders: [slot({ defaultAuthMethod: "email-otp" })],
      roleMappings: [mapping({ authMethod: "email-otp" })],
      isAuthAvailable: () => true,
    });
    expect(result.ok).toBe(true);
    if (!result.ok) return;
    expect(result.authDowngrades).toEqual([]);
    expect(result.application.participants[0]!.authMethodOverride).toBe("email-otp");
  });

  it("does not report a downgrade for a slot that asked for nothing", () => {
    // "none" is not a downgrade; it is the default. Reporting it would train
    // senders to ignore the notice.
    const result = resolve({
      placeholders: [slot({ defaultAuthMethod: "none" })],
      isAuthAvailable: (method) => method === "none",
    });
    expect(result.ok).toBe(true);
    if (!result.ok) return;
    expect(result.authDowngrades).toEqual([]);
    expect(result.application.participants[0]!.authMethodOverride).toBeNull();
  });

  it("applies the slot's default auth method when the visitor chose nothing", () => {
    // Otherwise `default_auth_method` is a column the template stores and
    // nothing ever reads.
    const result = resolve({
      placeholders: [slot({ defaultAuthMethod: "email-otp" })],
      roleMappings: [mapping({ authMethod: undefined as never })],
      isAuthAvailable: () => true,
    });
    expect(result.ok).toBe(true);
    if (!result.ok) return;
    expect(result.application.participants[0]!.authMethodOverride).toBe("email-otp");
  });

  it("lets the visitor's choice win over the slot default", () => {
    const result = resolve({
      placeholders: [slot({ defaultAuthMethod: "email-otp" })],
      roleMappings: [mapping({ authMethod: "sms-otp" })],
      isAuthAvailable: () => true,
    });
    expect(result.ok).toBe(true);
    if (!result.ok) return;
    expect(result.application.participants[0]!.authMethodOverride).toBe("sms-otp");
  });

  it("gives participants LOCAL ids, never backend `rcp_` ids", () => {
    // participant-sync skips creating anything whose id starts with `rcp_`,
    // on the grounds that the backend already knows it. A template-built
    // participant has never been persisted, so an `rcp_` id here would mean
    // the recipient is silently never created.
    const result = resolve(APPROVAL_THEN_SIGNING);
    expect(result.ok).toBe(true);
    if (!result.ok) return;
    for (const p of result.application.participants) {
      expect(p.id.startsWith("rcp_")).toBe(false);
    }
  });
});

// ── Routing modes ───────────────────────────────────────────────────────────

describe("routing modes", () => {
  it("parallel collapses every slot into a single step", () => {
    const result = resolve({ ...APPROVAL_THEN_SIGNING, routingMode: "parallel" });
    expect(result.ok).toBe(true);
    if (!result.ok) return;

    expect(result.application.routing.groups).toHaveLength(1);
    expect(result.application.routing.groups[0]!.participantIds).toHaveLength(2);
  });

  it("mixed keeps two people who share a step together in it", () => {
    const result = resolve({
      placeholders: [
        slot({ id: "a", label: "A", routingStep: 1 }),
        slot({ id: "b", label: "B", routingStep: 1 }),
        slot({ id: "c", label: "C", routingStep: 2 }),
      ],
      roleMappings: [
        mapping({ placeholderId: "a", displayName: "A", email: "a@x.test" }),
        mapping({ placeholderId: "b", displayName: "B", email: "b@x.test" }),
        mapping({ placeholderId: "c", displayName: "C", email: "c@x.test" }),
      ],
      routingMode: "mixed",
    });
    expect(result.ok).toBe(true);
    if (!result.ok) return;

    expect(result.application.routing.groups).toHaveLength(2);
    expect(result.application.routing.groups[0]!.participantIds).toHaveLength(2);
    expect(result.application.routing.groups[1]!.participantIds).toHaveLength(1);
  });

  it("approval-based puts Approval first and Signing second", () => {
    // Delegated wholesale to deriveApprovalBasedGroups. This asserts the
    // delegation happened; that function's own behaviour is not re-tested
    // here and is deliberately not modified.
    const result = resolve({ ...APPROVAL_THEN_SIGNING, routingMode: "approval-based" });
    expect(result.ok).toBe(true);
    if (!result.ok) return;

    expect(result.application.routing.groups.map(g => g.label))
      .toEqual(["Approval", "Signing"]);
  });

  it("approval-based ignores the template's step numbers, using roles instead", () => {
    // The slots deliberately put the SIGNER first. Approval-based must still
    // sequence the approver ahead of them, because the mode derives its two
    // phases from roles.
    const result = resolve({
      placeholders: [
        slot({ id: "ph_sign", label: "Signer", role: "signer", routingStep: 1 }),
        slot({ id: "ph_appr", label: "Approver", role: "approver", routingStep: 2 }),
      ],
      roleMappings: [
        mapping({ placeholderId: "ph_sign", displayName: "S", email: "s@x.test" }),
        mapping({ placeholderId: "ph_appr", displayName: "A", email: "a@x.test" }),
      ],
      routingMode: "approval-based",
    });
    expect(result.ok).toBe(true);
    if (!result.ok) return;
    expect(result.application.routing.groups[0]!.label).toBe("Approval");
  });

  it("keeps step numbers contiguous when an optional slot is left unmapped", () => {
    // Slot 2 is optional and empty, so its step disappears. The remaining
    // groups must renumber to 1..n — the invariant every other routing site
    // relies on, and the one validateDraftState raises NON_CONTIGUOUS_STEPS on.
    const result = resolve({
      placeholders: [
        slot({ id: "a", label: "A", routingStep: 1 }),
        slot({ id: "b", label: "B", routingStep: 2, mustMapToParticipant: false }),
        slot({ id: "c", label: "C", routingStep: 3 }),
      ],
      roleMappings: [
        mapping({ placeholderId: "a", displayName: "A", email: "a@x.test" }),
        mapping({ placeholderId: "c", displayName: "C", email: "c@x.test" }),
      ],
      routingMode: "sequential",
    });
    expect(result.ok).toBe(true);
    if (!result.ok) return;

    expect(result.application.routing.groups.map(g => g.stepNumber)).toEqual([1, 2]);
  });

  it("leaves viewers and copy recipients out of every routing step", () => {
    const result = resolve({
      placeholders: [
        slot({ id: "s", label: "Signer", role: "signer", routingStep: 1 }),
        slot({ id: "v", label: "Watcher", role: "viewer", routingStep: 1 }),
      ],
      roleMappings: [
        mapping({ placeholderId: "s", displayName: "S", email: "s@x.test" }),
        mapping({ placeholderId: "v", displayName: "V", email: "v@x.test" }),
      ],
    });
    expect(result.ok).toBe(true);
    if (!result.ok) return;

    expect(result.application.participants).toHaveLength(2);
    const routed = new Set(result.application.routing.groups.flatMap(g => g.participantIds));
    const viewer = result.application.participants.find(p => p.role === "viewer")!;
    expect(routed.has(viewer.id)).toBe(false);
    expect(viewer.routingGroupId).toBeNull();
  });
});

// ── routingOrder, the thing the backend actually stores ─────────────────────

describe("routingOrdersFor", () => {
  it("gives each routed participant its group's step number", () => {
    const result = resolve(APPROVAL_THEN_SIGNING);
    expect(result.ok).toBe(true);
    if (!result.ok) return;

    const orders = routingOrdersFor(result.application);
    expect(orders.map(o => o.routingOrder).sort()).toEqual([1, 2]);
  });

  it("gives everyone in a parallel step the SAME order — equal means together", () => {
    const result = resolve({ ...APPROVAL_THEN_SIGNING, routingMode: "parallel" });
    expect(result.ok).toBe(true);
    if (!result.ok) return;

    const orders = routingOrdersFor(result.application);
    expect(orders).toHaveLength(2);
    expect(new Set(orders.map(o => o.routingOrder)).size).toBe(1);
  });

  it("omits participants who occupy no step at all", () => {
    const result = resolve({
      placeholders: [
        slot({ id: "s", label: "Signer", role: "signer" }),
        slot({ id: "c", label: "Copy", role: "carbon-copy" }),
      ],
      roleMappings: [
        mapping({ placeholderId: "s", displayName: "S", email: "s@x.test" }),
        mapping({ placeholderId: "c", displayName: "C", email: "c@x.test" }),
      ],
    });
    expect(result.ok).toBe(true);
    if (!result.ok) return;

    expect(routingOrdersFor(result.application)).toHaveLength(1);
  });
});

// ── 2. Snapshot, not reference ──────────────────────────────────────────────

describe("snapshot independence", () => {
  it("carries no template id or placeholder id anywhere in the result", () => {
    // The structural guarantee. Nothing downstream CAN follow it back,
    // because there is nothing to follow.
    const result = resolve(APPROVAL_THEN_SIGNING);
    expect(result.ok).toBe(true);
    if (!result.ok) return;

    // resolveTemplateApplication takes no template id at all, so the only
    // identifier that COULD leak is a placeholder id. Neither appears.
    const serialized = JSON.stringify(result.application);
    expect(serialized).not.toContain("ph_appr");
    expect(serialized).not.toContain("ph_sign");
  });

  it("is unaffected when the template's slots are mutated afterwards", () => {
    const placeholders = [
      slot({ id: "ph_appr", label: "HR Approver", role: "approver", routingStep: 1 }),
      slot({ id: "ph_sign", label: "New Employee", role: "signer", routingStep: 2 }),
    ];
    const result = resolve({ ...APPROVAL_THEN_SIGNING, placeholders });
    expect(result.ok).toBe(true);
    if (!result.ok) return;

    const before = JSON.parse(JSON.stringify(result.application));

    // An admin edits the template in another tab: renames a role, flips
    // another to a different type, reorders the steps.
    placeholders[0]!.label = "Renamed Approver";
    placeholders[0]!.role = "viewer";
    placeholders[1]!.routingStep = 1;

    expect(result.application).toEqual(before);
  });

  it("is unaffected when the role mappings are mutated afterwards", () => {
    const roleMappings = [mapping({ displayName: "Maria Santos" })];
    const result = resolve({ roleMappings });
    expect(result.ok).toBe(true);
    if (!result.ok) return;

    roleMappings[0]!.displayName = "Someone Else";
    roleMappings[0]!.email = "someone.else@x.test";

    expect(result.application.participants[0]!.name).toBe("Maria Santos");
  });

  it("survives the template being emptied entirely", () => {
    // Standing in for deletion: the source is gone, the draft is not.
    const placeholders = [slot()];
    const result = resolve({ placeholders });
    expect(result.ok).toBe(true);
    if (!result.ok) return;

    placeholders.length = 0;

    expect(result.application.participants).toHaveLength(1);
    expect(result.application.routing.groups).toHaveLength(1);
  });
});

// ── 3. Malformed data fails explicitly ──────────────────────────────────────

describe("malformed role-slot data is refused outright", () => {
  const cases: ReadonlyArray<readonly [string, Parameters<typeof resolve>[0], string]> = [
    ["no slots at all", { placeholders: [] }, "NO_ROLE_SLOTS"],
    ["a blank label", { placeholders: [slot({ label: "   " })] }, "SLOT_LABEL_BLANK"],
    ["an unknown role",
      { placeholders: [slot({ role: "notary" as never })] }, "SLOT_ROLE_UNKNOWN"],
    ["a routing step of zero",
      { placeholders: [slot({ routingStep: 0 })] }, "SLOT_STEP_INVALID"],
    ["a negative routing step",
      { placeholders: [slot({ routingStep: -1 })] }, "SLOT_STEP_INVALID"],
    ["a fractional routing step",
      { placeholders: [slot({ routingStep: 1.5 })] }, "SLOT_STEP_INVALID"],
    ["a skipped routing step", {
      placeholders: [slot({ id: "a", routingStep: 1 }), slot({ id: "b", routingStep: 3 })],
      roleMappings: [
        mapping({ placeholderId: "a", email: "a@x.test" }),
        mapping({ placeholderId: "b", email: "b@x.test" }),
      ],
    }, "SLOT_STEPS_NOT_CONTIGUOUS"],
    ["steps starting at 2 rather than 1",
      { placeholders: [slot({ routingStep: 2 })] }, "SLOT_STEPS_NOT_CONTIGUOUS"],
    ["nobody who can act", {
      placeholders: [slot({ role: "viewer" }), slot({ id: "cc", role: "carbon-copy" })],
    }, "NO_ONE_CAN_ACT"],
    ["an unknown routing mode",
      { routingMode: "round-robin" as never }, "ROUTING_MODE_UNKNOWN"],
    ["a required slot with no mapping at all",
      { roleMappings: [] }, "REQUIRED_SLOT_UNMAPPED"],
    ["a required slot mapped to a blank name",
      { roleMappings: [mapping({ displayName: "  " })] }, "REQUIRED_SLOT_UNMAPPED"],
    ["a required slot mapped to a blank email",
      { roleMappings: [mapping({ email: "" })] }, "REQUIRED_SLOT_UNMAPPED"],
    ["a malformed email",
      { roleMappings: [mapping({ email: "not-an-email" })] }, "MAPPED_EMAIL_INVALID"],
  ];

  for (const [what, input, code] of cases) {
    it(`refuses ${what}`, () => {
      const result = resolve(input);
      expect(result.ok).toBe(false);
      if (result.ok) return;
      expect(result.code).toBe(code);
      // Every failure says something a person could act on.
      expect(result.message.length).toBeGreaterThan(20);
    });
  }

  it("refuses rather than dropping the bad slot and routing to the rest", () => {
    // THE test this file exists for. A template with one good signer and one
    // slot at a skipped step must NOT quietly produce a one-person request.
    const result = resolve({
      placeholders: [
        slot({ id: "good", label: "Good", routingStep: 1 }),
        slot({ id: "bad", label: "Bad", routingStep: 4 }),
      ],
      roleMappings: [
        mapping({ placeholderId: "good", displayName: "Good", email: "good@x.test" }),
        mapping({ placeholderId: "bad", displayName: "Bad", email: "bad@x.test" }),
      ],
    });

    expect(result.ok).toBe(false);
    // And nothing partial came back alongside the failure.
    expect(result).not.toHaveProperty("application");
  });

  it("refuses when every optional acting slot is left blank", () => {
    // Well-formed slots, and still nobody who can move the request forward
    // once the optional signer is skipped. Caught AFTER mapping, which the
    // slot-level check alone would miss.
    const result = resolve({
      placeholders: [
        slot({ id: "s", label: "Signer", role: "signer", mustMapToParticipant: false }),
        slot({ id: "v", label: "Watcher", role: "viewer" }),
      ],
      roleMappings: [mapping({ placeholderId: "v", displayName: "V", email: "v@x.test" })],
    });

    expect(result.ok).toBe(false);
    if (result.ok) return;
    expect(result.code).toBe("NO_ONE_CAN_ACT");
  });

  it("allows an optional slot to be skipped when someone else can still act", () => {
    // The control for the two tests above: skipping an optional slot is
    // normal, and must not be turned into an error by an over-eager check.
    const result = resolve({
      placeholders: [
        slot({ id: "s", label: "Signer", role: "signer" }),
        slot({ id: "o", label: "Optional", role: "signer", mustMapToParticipant: false }),
      ],
      roleMappings: [mapping({ placeholderId: "s", displayName: "S", email: "s@x.test" })],
    });

    expect(result.ok).toBe(true);
    if (!result.ok) return;
    expect(result.application.participants).toHaveLength(1);
  });
});
