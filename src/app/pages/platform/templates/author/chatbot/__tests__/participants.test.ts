// Participants: names + roles + routing order, read from free text, edited by
// command, and turned into template role slots.

import { describe, it, expect } from "vitest";
import {
  parseParticipants, parseParticipantEdit, participantsToPlaceholders, assignSteps, relabel,
  type Participant,
} from "../participants";
import { initialState, respond, type EngineContext, type EngineState, type EngineResult } from "../engine";
import { findDocument } from "../knowledge";
import type { TemplateRolePlaceholder } from "../../../../../../models/templates";

const EXAMPLE = "Create me an employment agreement contract to be signed by Juan Dela Cruz, but approved or skipped by Maria Santos";
const ctx: EngineContext = { userName: "Ana Reyes", documentHasContent: false, canSaveRoles: true, today: "March 1, 2027" };

const roles = (text: string) => parseParticipants(text).mentions.map(m => [m.name ?? `(${m.givenLabel ?? "?"})`, m.witness ? "witness" : m.role]);

function say(texts: string[]): { state: EngineState; last: EngineResult } {
  let state = initialState();
  let last: EngineResult | null = null;
  for (const t of texts) {
    last = respond(state, { text: t }, ctx);
    state = last.state;
  }
  return { state, last: last! };
}

const summary = (s: EngineState) => [...s.participants].sort((a, b) => a.step - b.step || a.order - b.order)
  .map(p => [p.name, p.label, p.role, p.step]);

describe("reading participants out of a request", () => {
  it("the example: signed by Juan Dela Cruz, approved or skipped by Maria Santos", () => {
    expect(roles(EXAMPLE)).toEqual([["Juan Dela Cruz", "signer"], ["Maria Santos", "approver"]]);
  });

  it.each([
    ["an NDA signed by Juan Cruz and Pedro Reyes", [["Juan Cruz", "signer"], ["Pedro Reyes", "signer"]]],
    ["signed first by Juan Cruz then by Pedro Reyes", [["Juan Cruz", "signer"], ["Pedro Reyes", "signer"]]],
    ["to be signed by \"Ma. Clara de los Santos\"", [["Ma. Clara de los Santos", "signer"]]],
    ["signed by 'Ramon Magsaysay Jr.'", [["Ramon Magsaysay Jr.", "signer"]]],
    ["signed by juan dela cruz and pedro reyes jr.", [["Juan Dela Cruz", "signer"], ["Pedro Reyes Jr.", "signer"]]],
    ["reviewed by Atty. Jose Rizal III", [["Atty. Jose Rizal III", "reviewer"]]],
    ["reviewed by Liza Soberano, then approved by Enrique Gil", [["Liza Soberano", "reviewer"], ["Enrique Gil", "approver"]]],
    ["approved by Maria Santos and Ana Cruz", [["Maria Santos", "approver"], ["Ana Cruz", "approver"]]],
    ["Juan will sign and Maria Santos will approve", [["Juan", "signer"], ["Maria Santos", "approver"]]],
    ["Pedro and Ana Cruz will approve, then Juan signs", [["Pedro", "approver"], ["Ana Cruz", "approver"], ["Juan", "signer"]]],
    ["cc Ana Lim", [["Ana Lim", "carbon-copy"]]],
    ["with a copy to Liza Soberano as well as Enrique Gil", [["Liza Soberano", "carbon-copy"], ["Enrique Gil", "carbon-copy"]]],
    ["copy furnished Rico Blanco", [["Rico Blanco", "carbon-copy"]]],
    ["acknowledged by Carlo Reyes", [["Carlo Reyes", "acknowledgment-recipient"]]],
    ["for acknowledgment of Grace Poe", [["Grace Poe", "acknowledgment-recipient"]]],
    ["witnessed by Mark Reyes and Lea Salonga", [["Mark Reyes", "witness"], ["Lea Salonga", "witness"]]],
    ["viewed by Tito Sotto", [["Tito Sotto", "viewer"]]],
    ["signed by Juan Dela Cruz, reviewed by Pedro Penduko, approved by Maria Santos, cc Ana Lim",
      [["Juan Dela Cruz", "signer"], ["Pedro Penduko", "reviewer"], ["Maria Santos", "approver"], ["Ana Lim", "carbon-copy"]]],
    ["acknowledged by the HR manager", [["(HR Manager)", "acknowledgment-recipient"]]],
    ["to be signed by the employee", [["(Employee)", "signer"]]],
  ])("%s", (input, expected) => {
    expect(roles(input)).toEqual(expected);
  });

  it("sees 'both parties sign', parallel wording and approval-first wording", () => {
    expect(parseParticipants("both parties sign").bothParties).toBe(true);
    expect(parseParticipants("signed by Juan and Pedro at the same time").parallel).toBe(true);
    expect(parseParticipants("approved by Maria Santos before signing").approvalFirst).toBe(true);
    expect(parseParticipants("signed by Juan after Maria Santos approves").approvalFirst).toBe(true);
    expect(parseParticipants("approved by Maria after Juan signs").approvalLast).toBe(true);
  });

  it("returns the names so the matcher can ignore them", () => {
    expect(parseParticipants(EXAMPLE).consumed).toEqual(["Juan Dela Cruz", "Maria Santos"]);
  });
});

describe("routing order and role labels", () => {
  const base = (list: Partial<Participant>[]): Participant[] => list.map((p, i) => ({
    id: `p${String(i)}`, name: null, role: "signer", label: "", order: i, step: 1, ...p,
  }));

  it("mention order, one step each; copies after the last actor", () => {
    const out = assignSteps(base([{ role: "signer" }, { role: "carbon-copy" }, { role: "approver" }]), { parallelSigners: false, approvalFirst: false });
    expect(out.map(p => [p.role, p.step])).toEqual([["signer", 1], ["carbon-copy", 3], ["approver", 2]]);
  });

  it("approval-first puts reviewers and approvers ahead of signers", () => {
    const out = assignSteps(base([{ role: "signer" }, { role: "approver" }, { role: "reviewer" }]), { parallelSigners: false, approvalFirst: true });
    expect(Object.fromEntries(out.map(p => [p.role, p.step]))).toEqual({ reviewer: 1, approver: 2, signer: 3 });
  });

  it("parallel signers share a step", () => {
    const out = assignSteps(base([{ role: "signer" }, { role: "signer" }, { role: "approver" }]), { parallelSigners: true, approvalFirst: false });
    expect(out.map(p => p.step)).toEqual([1, 1, 2]);
  });

  it("labels come from the document's own roles, then numbered defaults", () => {
    const offer = findDocument("recruitment-and-hr--employment-offer-letter-and-contract-agreement");
    const out = relabel(base([{ role: "signer" }, { role: "approver" }, { role: "signer", witness: true }, { role: "carbon-copy" }]), offer);
    expect(out.map(p => p.label)).toEqual(["Employee", "HR Approver", "Witness", "HR Records"]);
    const none = relabel(base([{ role: "signer" }, { role: "signer" }, { role: "viewer" }]), undefined);
    expect(none.map(p => p.label)).toEqual(["Signer 1", "Signer 2", "Viewer"]);
  });
});

describe("the conversation understands participants", () => {
  it("the example picks the employment agreement and names both roles in order", () => {
    const { state, last } = say([EXAMPLE]);
    expect(state.docId).toBe("recruitment-and-hr--employment-offer-letter-and-contract-agreement");
    expect(summary(state)).toEqual([
      ["Juan Dela Cruz", "Employee", "signer", 1],
      ["Maria Santos", "HR Approver", "approver", 2],
    ]);
    expect(last.replies[0]!.text).toMatch(/Juan Dela Cruz \(Employee, signs, step 1\); Maria Santos \(HR Approver, approves or skips, step 2\)/);
    // The signer's name fills the document's party.
    expect(state.slots.partyB).toBe("Juan Dela Cruz");
  });

  it("the summary card lists name, role and step", () => {
    const { state } = say([EXAMPLE, "Acme Inc.", "Software Engineer"]);
    expect(state.stage).toBe("confirm");
    const card = respond(state, { text: "make it formal" }, ctx).replies[1]!.card!;
    expect(card.participants).toEqual([
      { name: "Juan Dela Cruz", label: "Employee", role: "signer", roleTitle: "Signer", step: 1 },
      { name: "Maria Santos", label: "HR Approver", role: "approver", roleTitle: "Approver", step: 2 },
    ]);
    expect(card.note).toMatch(/template's roles/);
  });

  it.each([
    ["change Maria to reviewer", [["Juan Dela Cruz", "Employee", "signer", 1], ["Maria Santos", "Hiring Manager", "reviewer", 2]]],
    ["make Maria a reviewer", [["Juan Dela Cruz", "Employee", "signer", 1], ["Maria Santos", "Hiring Manager", "reviewer", 2]]],
    ["Maria should review instead", [["Juan Dela Cruz", "Employee", "signer", 1], ["Maria Santos", "Hiring Manager", "reviewer", 2]]],
    ["remove Juan", [["Maria Santos", "HR Approver", "approver", 1]]],
    ["add Pedro Reyes as signer", [["Juan Dela Cruz", "Employee", "signer", 1], ["Maria Santos", "HR Approver", "approver", 2], ["Pedro Reyes", "Candidate", "signer", 3]]],
    ["add Pedro as witness", [["Juan Dela Cruz", "Employee", "signer", 1], ["Maria Santos", "HR Approver", "approver", 2], ["Pedro", "Witness", "signer", 3]]],
    ["cc Ana Lim", [["Juan Dela Cruz", "Employee", "signer", 1], ["Maria Santos", "HR Approver", "approver", 2], ["Ana Lim", "HR Records", "carbon-copy", 3]]],
  ])("edit: %s", (edit, expected) => {
    const { state } = say([EXAMPLE, "Acme Inc.", "Software Engineer", edit]);
    expect(summary(state)).toEqual(expected);
    // Removing the signer empties the party slot they filled, so it is asked again.
    expect(state.stage).toBe(edit === "remove Juan" ? "slots" : "confirm");
  });

  it("an unknown name in an edit says who the participants are", () => {
    const { last } = say([EXAMPLE, "Acme Inc.", "Software Engineer", "remove Pedro"]);
    expect(last.replies[0]!.text).toMatch(/couldn't find “Pedro”.*Juan Dela Cruz, Maria Santos/);
  });

  it("the same person in two roles gets a clarifying question", () => {
    const { state, last } = say([EXAMPLE, "Acme Inc.", "Software Engineer", "Maria Santos will also sign"]);
    expect(state.stage).toBe("participant");
    expect(last.replies.at(-1)!.text).toBe("Should Maria Santos approve, or also sign?");
    expect(last.replies.at(-1)!.chips!.map(c => c.label)).toEqual(["Approve only", "Sign only", "Both"]);
    const both = respond(state, { action: { type: "participant-role", choice: "both" } }, ctx);
    expect(summary(both.state).filter(p => p[0] === "Maria Santos").map(p => p[2])).toEqual(["approver", "signer"]);
    const only = respond(state, { text: "approve only" }, ctx);
    expect(summary(only.state).filter(p => p[0] === "Maria Santos").map(p => p[2])).toEqual(["approver"]);
  });

  it("a role without a name asks for the name, and 'skip' leaves it blank", () => {
    const { state, last } = say(["an NDA to be signed by the employee"]);
    expect(state.stage).toBe("participant");
    expect(last.replies.at(-1)!.text).toMatch(/What is the employee's name\?/);
    const named = respond(state, { text: "Pedro Penduko" }, ctx);
    expect(named.state.participants[0]).toMatchObject({ name: "Pedro Penduko", label: "Employee", role: "signer" });
    const skipped = respond(state, { text: "skip" }, ctx);
    expect(skipped.state.participants[0]!.name).toBeNull();
    expect(skipped.state.stage).not.toBe("participant");
  });

  it("'both parties sign' adds both of the document's parties as parallel signers", () => {
    const { state } = say(["a lease agreement between Pedro Cruz and Ana Lim, both parties sign"]);
    expect(summary(state)).toEqual([["Pedro Cruz", "Lessor", "signer", 1], ["Ana Lim", "Lessee", "signer", 1]]);
  });

  it("participants without a document are kept while the document is chosen", () => {
    const { state, last } = say(["a contract signed by Juan Dela Cruz and approved by Maria Santos"]);
    expect(state.docId).toBeNull();
    expect(last.replies[0]!.text).toMatch(/Which document/);
    const chosen = respond(state, { text: "employment contract" }, ctx).state;
    expect(summary(chosen)).toEqual([["Juan Dela Cruz", "Employee", "signer", 1], ["Maria Santos", "HR Approver", "approver", 2]]);
  });

  it("the write plan carries the participants", () => {
    const { state } = say([EXAMPLE, "Acme Inc.", "Software Engineer"]);
    const plan = respond(state, { text: "yes" }, ctx).write!;
    expect(plan.participants.map(p => [p.name, p.label, p.role, p.step])).toEqual([
      ["Juan Dela Cruz", "Employee", "signer", 1], ["Maria Santos", "HR Approver", "approver", 2],
    ]);
  });
});

describe("edit commands", () => {
  it.each([
    ["change Maria to reviewer", { kind: "change", target: "Maria", role: "reviewer", witness: false }],
    ["switch Juan to approver", { kind: "change", target: "Juan", role: "approver", witness: false }],
    ["remove Juan", { kind: "remove", target: "Juan" }],
    ["delete the approver", { kind: "remove", target: "approver" }],
    ["add Pedro Reyes as signer", { kind: "add", name: "Pedro Reyes", role: "signer", witness: false }],
    ["add Ana Lim as a copy recipient", { kind: "add", name: "Ana Lim", role: "carbon-copy", witness: false }],
    ["also cc Ana", { kind: "add", name: "Ana", role: "carbon-copy", witness: false }],
  ])("%s", (input, expected) => {
    expect(parseParticipantEdit(input)).toEqual(expected);
  });

  it("ordinary sentences are not edits", () => {
    expect(parseParticipantEdit("I need an NDA")).toBeNull();
    expect(parseParticipantEdit("make it formal")).toBeNull();
  });
});

describe("into template role slots", () => {
  const people: Participant[] = [
    { id: "a", name: "Juan", role: "signer", label: "Employee", order: 0, step: 1 },
    { id: "b", name: "Maria", role: "approver", label: "HR Approver", order: 1, step: 2 },
    { id: "c", name: "Ana", role: "carbon-copy", label: "HR Records", order: 2, step: 3 },
  ];

  it("a template with no roles gets one slot per participant, gap-free, cc not blocking", () => {
    const slots = participantsToPlaceholders(people, []);
    expect(slots.map(s => [s.label, s.role, s.routingStep, s.required])).toEqual([
      ["Employee", "signer", 1, true], ["HR Approver", "approver", 2, true], ["HR Records", "carbon-copy", 3, false],
    ]);
    expect(slots.every(s => s.backendSlotId === undefined)).toBe(true);
  });

  it("existing slots are kept and reused by label and role; new ones follow", () => {
    const existing: TemplateRolePlaceholder[] = [{
      id: "slot-1", backendSlotId: "wfs_1", label: "Employee", role: "signer", required: true, routingStep: 1,
      defaultAuthMethod: "none", description: "", mustMapToParticipant: true,
    }, {
      id: "slot-2", backendSlotId: "wfs_2", label: "Legal", role: "reviewer", required: true, routingStep: 3,
      defaultAuthMethod: "none", description: "", mustMapToParticipant: true,
    }];
    const slots = participantsToPlaceholders(people, existing);
    expect(slots.map(s => [s.label, s.backendSlotId ?? null, s.routingStep])).toEqual([
      ["Employee", "wfs_1", 1], ["Legal", "wfs_2", 2], ["HR Approver", null, 3], ["HR Records", null, 4],
    ]);
  });
});
