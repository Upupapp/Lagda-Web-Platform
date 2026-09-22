// Mapping between the stored wire shape and what the templates pages render.
//
// This is where a silent defect would live. The wire schema is declared
// `additionalProperties: false` with exactly five slot fields, while the
// frontend's `TemplateRolePlaceholder` carries seven — so a write that sends
// the extra two is REFUSED by the server, and a read that invents values for
// them tells the user something untrue.
//
// Neither failure is visible from the screen: a rejected save looks like a
// network error, and an invented description looks like a description.

import { describe, it, expect } from "vitest";
import {
  toDocumentTemplate, toWireWrite,
  type WireTemplate,
} from "../templates.service";
import type { TemplateRolePlaceholder } from "../../../models/templates";

const WIRE: WireTemplate = {
  workflowTemplateId: "wft_1",
  name: "New Hire Onboarding",
  routingMode: "sequential",
  roleSlots: [
    {
      label: "HR Approver", role: "approver",
      required: true, routingStep: 1, defaultAuthMethod: "email-otp",
    },
    {
      label: "New Employee", role: "signer",
      required: true, routingStep: 2, defaultAuthMethod: "none",
    },
  ],
  completionSettings: { notifySenderOnComplete: true },
  createdAt: "2026-09-22T09:00:00.000Z",
  updatedAt: "2026-09-22T10:00:00.000Z",
};

const slot = (over: Partial<TemplateRolePlaceholder> = {}): TemplateRolePlaceholder => ({
  id: "slot-1",
  label: "Signer",
  role: "signer",
  required: true,
  routingStep: 1,
  defaultAuthMethod: "none",
  description: "",
  mustMapToParticipant: true,
  ...over,
});

// ── Writing ─────────────────────────────────────────────────────────────────

describe("toWireWrite sends exactly what the schema accepts", () => {
  it("sends the five slot fields and NOTHING else", () => {
    // `additionalProperties: false` means an extra key is not ignored — the
    // whole request is rejected. So this asserts the key set exactly.
    const body = toWireWrite({
      name: "Onboarding",
      routingMode: "sequential",
      placeholders: [slot({ description: "an internal note", mustMapToParticipant: false })],
      notifySenderOnComplete: true,
    });

    expect(Object.keys(body.roleSlots[0]!).sort()).toEqual([
      "defaultAuthMethod", "label", "required", "role", "routingStep",
    ]);
  });

  it("drops description and mustMapToParticipant rather than sending them", () => {
    const body = toWireWrite({
      name: "Onboarding",
      routingMode: "sequential",
      placeholders: [slot({ description: "SHOULD NOT TRAVEL" })],
      notifySenderOnComplete: false,
    });

    expect(JSON.stringify(body)).not.toContain("SHOULD NOT TRAVEL");
    expect(JSON.stringify(body)).not.toContain("mustMapToParticipant");
  });

  it("trims the name and every label", () => {
    // The backend rejects a blank name, and a label that is only spaces
    // passes a length check while being useless on screen.
    const body = toWireWrite({
      name: "  Onboarding  ",
      routingMode: "parallel",
      placeholders: [slot({ label: "  HR Approver  " })],
      notifySenderOnComplete: true,
    });

    expect(body.name).toBe("Onboarding");
    expect(body.roleSlots[0]!.label).toBe("HR Approver");
  });

  it("preserves slot ORDER, which is the routing the author designed", () => {
    const body = toWireWrite({
      name: "Onboarding",
      routingMode: "sequential",
      placeholders: [
        slot({ id: "slot-1", label: "First", routingStep: 1 }),
        slot({ id: "slot-2", label: "Second", routingStep: 2 }),
      ],
      notifySenderOnComplete: true,
    });

    expect(body.roleSlots.map(s => s.label)).toEqual(["First", "Second"]);
  });

  it("sends only notifySenderOnComplete in completion settings", () => {
    const body = toWireWrite({
      name: "Onboarding", routingMode: "sequential",
      placeholders: [slot()], notifySenderOnComplete: true,
    });

    expect(Object.keys(body.completionSettings)).toEqual(["notifySenderOnComplete"]);
  });
});

// ── Reading ─────────────────────────────────────────────────────────────────

describe("toDocumentTemplate reads a stored template honestly", () => {
  it("carries the slots across with their routing intact", () => {
    const t = toDocumentTemplate(WIRE);

    expect(t.id).toBe("wft_1");
    expect(t.name).toBe("New Hire Onboarding");
    expect(t.routing.mode).toBe("sequential");
    expect(t.placeholders.map(p => p.label)).toEqual(["HR Approver", "New Employee"]);
    expect(t.placeholders.map(p => p.routingStep)).toEqual([1, 2]);
    expect(t.placeholders[0]!.role).toBe("approver");
    expect(t.placeholders[0]!.defaultAuthMethod).toBe("email-otp");
  });

  it("leaves description EMPTY rather than inventing one", () => {
    // There is no column for it. A plausible-looking description would be
    // the service telling the user something the record does not say.
    const t = toDocumentTemplate(WIRE);
    expect(t.placeholders.every(p => p.description === "")).toBe(true);
  });

  it("derives mustMapToParticipant from required, the only signal stored", () => {
    const t = toDocumentTemplate({
      ...WIRE,
      roleSlots: [
        { ...WIRE.roleSlots[0]!, required: true },
        { ...WIRE.roleSlots[1]!, required: false },
      ],
    });

    expect(t.placeholders.map(p => p.mustMapToParticipant)).toEqual([true, false]);
  });

  it("reports NO document and NO fields, because a template holds neither", () => {
    const t = toDocumentTemplate(WIRE);
    expect(t.documents).toEqual([]);
    expect(t.fields).toEqual([]);
    expect(t.variables).toEqual([]);
  });

  it("round-trips notifySenderOnComplete and nothing else from settings", () => {
    expect(toDocumentTemplate(WIRE).settings.completionCopySender).toBe(true);
    expect(
      toDocumentTemplate({
        ...WIRE, completionSettings: { notifySenderOnComplete: false },
      }).settings.completionCopySender,
    ).toBe(false);
  });

  it("does NOT claim participants are copied on completion", () => {
    // There is no backend column and no fan-out behind it — the completion
    // notification reaches the sender alone today. Showing this as a saved
    // preference would be a control that does nothing.
    expect(toDocumentTemplate(WIRE).settings.completionCopyParticipants).toBe(false);
  });

  it("groups slots that share a routing step", () => {
    const t = toDocumentTemplate({
      ...WIRE,
      roleSlots: [
        { ...WIRE.roleSlots[0]!, routingStep: 1 },
        { ...WIRE.roleSlots[1]!, routingStep: 1 },
      ],
    });

    expect(t.routing.groups).toHaveLength(1);
    expect(t.routing.groups[0]!.placeholderIds).toHaveLength(2);
  });
});

// ── The round trip ──────────────────────────────────────────────────────────

describe("a stored template survives a read-then-write cycle", () => {
  it("keeps every field the backend actually stores", () => {
    // The realistic failure: load a template, change nothing, save it, and
    // silently lose a slot's auth method or flip a required flag.
    const loaded = toDocumentTemplate(WIRE);
    const written = toWireWrite({
      name: loaded.name,
      routingMode: loaded.routing.mode,
      placeholders: loaded.placeholders,
      notifySenderOnComplete: loaded.settings.completionCopySender,
    });

    expect(written).toEqual({
      name: WIRE.name,
      routingMode: WIRE.routingMode,
      roleSlots: WIRE.roleSlots,
      completionSettings: WIRE.completionSettings,
    });
  });
});
