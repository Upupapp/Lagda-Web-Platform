// Turns a template's role slots + a visitor's role mappings into a real
// pre-filled preparation draft: participants, routing groups, and the
// per-participant auth overrides the slots asked for.
//
// ── SNAPSHOT, NOT REFERENCE ─────────────────────────────────────────────────
//
// This is the whole point of the module, and the reason it is a pure function
// over plain data rather than a lookup.
//
// What comes out holds NO template id, no placeholder id, and no callback into
// the template. Once `resolveTemplateApplication` returns, the draft is on its
// own: editing the template afterwards — renaming a slot, changing a routing
// step, deleting the template outright — cannot reach back and alter a draft
// already built from it. A signing request is a legal artifact, and a document
// someone is midway through preparing must not change shape because an admin
// edited a template in another tab.
//
// The backend enforces the same rule from the other side: migration 058's
// table is the target of no foreign key, and `resolveTemplateForApply`
// deliberately returns no template id. An integration test asserts the absent
// FK against the live catalogue rather than trusting a comment.
//
// So the only correct way to use this function is: call it once, keep the
// result, forget where it came from.
//
// ── FAIL EXPLICITLY, NEVER PARTIALLY ───────────────────────────────────────
//
// Every rejection below is a rejection of the WHOLE application. There is no
// path that returns a half-built participant list.
//
// That is deliberate and it is the expensive-to-get-wrong case: a template
// that silently drops a malformed slot produces a draft that looks complete
// and routes to fewer people than it names. The document would go out, collect
// the signatures it could, and report itself finished — with a party who was
// supposed to sign never having been asked. A visible error at apply time is
// recoverable; that is not.

import type {
  PrepAuthMethodId,
  PrepParticipant,
  PrepParticipantRole,
  PrepRoutingConfig,
  PrepRoutingGroup,
  RoutingMode,
} from "../../models/prepare";
import {
  PREP_ROLE_IS_BLOCKING,
  VALID_PREP_PARTICIPANT_ROLES,
  deriveApprovalBasedGroups,
  normalizeRoutingGroups,
  isAuthMethodAvailableForParticipant,
} from "../../models/prepare";
import type {
  TemplateRolePlaceholder, TemplateRoleMapping, TemplateApplication,
} from "../../models/templates";

// Same shape the Participants step generates for a hand-added participant. It
// must NOT start with `rcp_`: participant-sync treats that prefix as "already
// persisted by the backend" and would skip creating the recipient entirely.
function defaultNewId(): string {
  return `pax_${Date.now()}_${Math.random().toString(36).slice(2, 8)}`;
}

const EMAIL_RE = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;

const VALID_ROUTING_MODES: readonly RoutingMode[] = [
  "sequential", "parallel", "mixed", "approval-based",
];

export type TemplateApplicationErrorCode =
  | "NO_ROLE_SLOTS"
  | "SLOT_LABEL_BLANK"
  | "SLOT_ROLE_UNKNOWN"
  | "SLOT_STEP_INVALID"
  | "SLOT_STEPS_NOT_CONTIGUOUS"
  | "NO_ONE_CAN_ACT"
  | "ROUTING_MODE_UNKNOWN"
  | "REQUIRED_SLOT_UNMAPPED"
  | "MAPPED_EMAIL_INVALID";

export interface TemplateApplicationFailure {
  ok: false;
  code: TemplateApplicationErrorCode;
  /** Shown to the visitor. Names the offending slot wherever one is at fault,
   *  because "this template is malformed" is not something they can act on. */
  message: string;
}

/** A role whose requested authentication method the server cannot enforce,
 *  and which therefore fell back to the secure invitation link. */
export interface AuthMethodDowngrade {
  label: string;
  requested: PrepAuthMethodId;
}

export interface TemplateApplicationSuccess {
  ok: true;
  application: TemplateApplication;
  /** Empty when every requested method was honoured. Non-empty means the
   *  caller SHOULD tell the sender, rather than let them believe a stronger
   *  check is in place than the server performs. */
  authDowngrades: AuthMethodDowngrade[];
}

export type { TemplateApplication };

export type TemplateApplicationResult =
  | TemplateApplicationSuccess
  | TemplateApplicationFailure;

export interface ResolveTemplateInput {
  placeholders: TemplateRolePlaceholder[];
  roleMappings: TemplateRoleMapping[];
  routingMode: RoutingMode;
  /** Injectable so tests get stable ids. Production uses the same generator
   *  the Participants step does. */
  newId?: () => string;
  /** Injectable so a test can exercise the real-backend restriction without
   *  reaching into import.meta.env. Production uses the real gate. */
  isAuthAvailable?: (method: PrepAuthMethodId, participant: PrepParticipant) => boolean;
}

const fail = (
  code: TemplateApplicationErrorCode, message: string,
): TemplateApplicationFailure => ({ ok: false, code, message });

/**
 * Validates the slots ALONE, before any mapping is considered.
 *
 * Separate from mapping validation on purpose: a malformed template is the
 * template author's problem and the message should say so, while an unmapped
 * required slot is the current visitor's and is fixable in the form in front
 * of them. Collapsing the two produces an error that blames the wrong person.
 */
function validateSlots(
  placeholders: TemplateRolePlaceholder[],
): TemplateApplicationFailure | null {
  if (placeholders.length === 0) {
    return fail("NO_ROLE_SLOTS",
      "This template defines no roles, so there is no one to send it to.");
  }

  for (const slot of placeholders) {
    if (slot.label.trim() === "") {
      return fail("SLOT_LABEL_BLANK",
        "This template has a role with no name and cannot be used until it is fixed.");
    }
    if (!VALID_PREP_PARTICIPANT_ROLES.includes(slot.role)) {
      return fail("SLOT_ROLE_UNKNOWN",
        `The role “${slot.label}” has an unrecognised type and cannot be used.`);
    }
    if (!Number.isInteger(slot.routingStep) || slot.routingStep < 1) {
      return fail("SLOT_STEP_INVALID",
        `The role “${slot.label}” has an invalid routing step.`);
    }
  }

  // Contiguous from 1. A template whose steps are 1 and 3 is ambiguous: step 2
  // either does not exist or was deleted, and the two readings route
  // differently. Rather than pick one, refuse — the same rule the backend's
  // validateRoleSlots applies before it will store the template at all.
  const steps = [...new Set(placeholders.map(s => s.routingStep))].sort((a, b) => a - b);
  const contiguous = steps.every((step, i) => step === i + 1);
  if (!contiguous) {
    return fail("SLOT_STEPS_NOT_CONTIGUOUS",
      "This template's routing steps skip a number and cannot be used until it is fixed.");
  }

  // Viewers and copy recipients receive the document but never act on it. A
  // template made only of those would produce a request that can never
  // complete, because nothing would ever move it forward.
  if (!placeholders.some(s => PREP_ROLE_IS_BLOCKING[s.role])) {
    return fail("NO_ONE_CAN_ACT",
      "This template has no one who signs, approves or reviews, so a request made from it could never be completed.");
  }

  return null;
}

/**
 * Builds the routing groups for a resolved participant list.
 *
 * `approval-based` is delegated WHOLESALE to deriveApprovalBasedGroups, which
 * is the single source of truth for that mode and is deliberately not
 * reorderable. This module does not reimplement, wrap or second-guess it: it
 * hands over the participants and uses whatever comes back. The template's own
 * routingStep values are ignored in that mode, because the mode derives its
 * two phases from participant ROLES, not from step numbers.
 */
function buildRouting(
  participants: PrepParticipant[],
  stepByParticipantId: Map<string, number>,
  mode: RoutingMode,
): PrepRoutingConfig {
  if (mode === "approval-based") {
    return { mode, groups: deriveApprovalBasedGroups(participants) };
  }

  // Only participants who act occupy a routing step. A viewer or copy
  // recipient belongs to no group, exactly as the Routing step treats them.
  const blocking = participants.filter(p => PREP_ROLE_IS_BLOCKING[p.role]);

  if (mode === "parallel") {
    // Everyone at once — one step, whatever the template's numbers said.
    const groups: PrepRoutingGroup[] = blocking.length === 0 ? [] : [{
      id: "grp_step_1",
      stepNumber: 1,
      label: "Step 1",
      participantIds: blocking.map(p => p.id),
      requiredCompletionRule: "all",
    }];
    return { mode, groups: normalizeRoutingGroups(groups) };
  }

  // sequential and mixed both honour the template's step numbers. The
  // difference is only whether a step may hold more than one participant, and
  // that is already decided by the slots themselves.
  const distinctSteps = [...new Set(
    blocking.map(p => stepByParticipantId.get(p.id) ?? 1),
  )].sort((a, b) => a - b);

  const groups: PrepRoutingGroup[] = distinctSteps.map((step, i) => ({
    id: `grp_step_${step}`,
    stepNumber: i + 1,
    label: `Step ${i + 1}`,
    participantIds: blocking
      .filter(p => (stepByParticipantId.get(p.id) ?? 1) === step)
      .map(p => p.id),
    requiredCompletionRule: "all",
  }));

  // Renumbered rather than trusting the template's own numbers: an optional
  // slot left unmapped can empty a step, and a gap here would break the
  // `stepNumber === position + 1` invariant every other routing site relies on.
  return { mode, groups: normalizeRoutingGroups(groups) };
}

/**
 * The single entry point. Pure: same input, same output, no I/O, no clock
 * beyond id generation, and nothing retained.
 */
export function resolveTemplateApplication(
  input: ResolveTemplateInput,
): TemplateApplicationResult {
  const { placeholders, roleMappings, routingMode } = input;
  const newId = input.newId ?? defaultNewId;
  const authAvailable = input.isAuthAvailable
    ?? ((method, participant) =>
      isAuthMethodAvailableForParticipant(method, participant).available);

  const authDowngrades: AuthMethodDowngrade[] = [];

  if (!VALID_ROUTING_MODES.includes(routingMode)) {
    return fail("ROUTING_MODE_UNKNOWN",
      "This template uses a routing mode this version does not understand.");
  }

  const slotFailure = validateSlots(placeholders);
  if (slotFailure) return slotFailure;

  const mappingByPlaceholder = new Map(roleMappings.map(m => [m.placeholderId, m]));

  const participants: PrepParticipant[] = [];
  const stepByParticipantId = new Map<string, number>();

  for (const slot of placeholders) {
    const mapping = mappingByPlaceholder.get(slot.id);
    const name = mapping?.displayName.trim() ?? "";
    const email = mapping?.email.trim() ?? "";

    if (name === "" || email === "") {
      // An optional slot nobody filled in simply does not become a
      // participant. A required one stops the whole apply.
      if (slot.mustMapToParticipant) {
        return fail("REQUIRED_SLOT_UNMAPPED",
          `“${slot.label}” is required by this template but has no name and email.`);
      }
      continue;
    }

    if (!EMAIL_RE.test(email)) {
      return fail("MAPPED_EMAIL_INVALID",
        `The email address given for “${slot.label}” is not valid.`);
    }

    const id = newId();
    const participant: PrepParticipant = {
      id,
      name,
      email,
      role: slot.role,
      organization: mapping?.organization?.trim() ?? "",
      isRequired: slot.required,
      // Filled in below, once the groups exist.
      routingGroupId: null,
      // Set just below, once it has been checked against what the server
      // actually enforces. Never assigned straight from the slot.
      authMethodOverride: null,
    };

    // ── The template may ASK for an auth method; it does not get to impose one
    //
    // A slot carries `defaultAuthMethod`, and the visitor can pick one while
    // mapping. Neither may be written onto the participant unchecked.
    //
    // isAuthMethodAvailableForParticipant is the single gate on that, and its
    // reason is worth restating: in real-backend mode the server enforces only
    // the secure invitation link. Writing "email-otp" onto a recipient would
    // put a security promise in front of the sender — a code the signer must
    // enter — that nothing server-side checks. Two of the shipped templates
    // specify exactly that method, so this is a live path, not a hypothetical.
    //
    // When the asked-for method is unavailable the participant falls back to
    // `null`, meaning "use the draft's default", which is the invitation link.
    // The downgrade is REPORTED rather than swallowed, so the caller can say
    // so; silently weakening an authentication setting is its own defect.
    const asked = mapping?.authMethod ?? slot.defaultAuthMethod ?? "none";
    if (asked !== "none") {
      if (authAvailable(asked, participant)) {
        participant.authMethodOverride = asked;
      } else {
        authDowngrades.push({ label: slot.label, requested: asked });
      }
    }

    participants.push(participant);
    stepByParticipantId.set(id, slot.routingStep);
  }

  // Re-checked AFTER mapping, not just on the slots. A template can be
  // perfectly well-formed and still end up with nobody who acts, if every
  // optional signing slot was left blank and only a viewer was filled in.
  if (!participants.some(p => PREP_ROLE_IS_BLOCKING[p.role])) {
    return fail("NO_ONE_CAN_ACT",
      "No one on this request signs, approves or reviews it, so it could never be completed.");
  }

  const routing = buildRouting(participants, stepByParticipantId, routingMode);

  const groupIdByParticipantId = new Map<string, string>();
  for (const group of routing.groups) {
    for (const participantId of group.participantIds) {
      groupIdByParticipantId.set(participantId, group.id);
    }
  }
  for (const participant of participants) {
    participant.routingGroupId = groupIdByParticipantId.get(participant.id) ?? null;
  }

  return { ok: true, application: { participants, routing }, authDowngrades };
}

/**
 * The routing ORDER each participant carries to the backend.
 *
 * The backend has no routing-group resource — only a `routingOrder` integer
 * per recipient, where equal values mean "these go at the same time". That
 * integer is a group's stepNumber, which is exactly the mapping
 * participant-sync's syncRoutingOrder already expects.
 *
 * Exported separately so the caller sends it through syncRoutingOrder
 * unchanged, rather than this module reaching for the network itself.
 */
export function routingOrdersFor(
  application: TemplateApplication,
): { id: string; routingOrder: number }[] {
  const orderByParticipantId = new Map<string, number>();
  for (const group of application.routing.groups) {
    for (const participantId of group.participantIds) {
      orderByParticipantId.set(participantId, group.stepNumber);
    }
  }
  return application.participants
    .filter(p => orderByParticipantId.has(p.id))
    .map(p => ({ id: p.id, routingOrder: orderByParticipantId.get(p.id)! }));
}

export type { PrepParticipantRole };
