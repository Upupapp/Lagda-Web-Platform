// The other half of applying a template: what the DRAFT ends up holding.
//
// template-apply.test.ts proves the resolver is pure and its output is a
// snapshot. This file follows that output through `instantiateTemplate` and
// `prepareService.createDraft`, because a perfectly immutable snapshot is
// still worthless if the draft that receives it keeps a live handle on the
// caller's arrays, or if the draft comes back blank the way the stub's did.

import { describe, it, expect } from "vitest";
import { instantiateTemplate } from "../../mock/templates.service";
import { prepareService } from "../../mock/prepare.service";
import { resolveTemplateApplication } from "../template-apply";
import { getAllMockTemplates } from "../../../data/mock/templates";
import type { TemplateRoleMapping } from "../../../models/templates";
import type { DocumentTemplate } from "../../../models/templates";

/** A real fixture template with at least one mappable role — the same data
 *  the Use Template page walks a visitor through. */
function templateWithRoles(): DocumentTemplate {
  const found = getAllMockTemplates().find(t => t.placeholders.length > 0);
  if (!found) throw new Error("No mock template has role placeholders to test with.");
  return found;
}

/** Fills in every placeholder, the way a visitor who completed step 1 would. */
function mappingsFor(template: DocumentTemplate): TemplateRoleMapping[] {
  return template.placeholders.map((ph, i) => ({
    placeholderId: ph.id,
    placeholderLabel: ph.label,
    role: ph.role,
    required: ph.required,
    displayName: `Person ${i + 1}`,
    email: `person${i + 1}@example.test`,
    organization: "Acme",
    authMethod: ph.defaultAuthMethod,
  }));
}

describe("instantiateTemplate no longer discards its arguments", () => {
  it("returns a resolved application built from the mappings it was given", () => {
    const template = templateWithRoles();
    const result = instantiateTemplate(template.id, mappingsFor(template), {});

    expect(result.ok).toBe(true);
    expect(result.application).toBeDefined();
    expect(result.application!.participants.length)
      .toBe(template.placeholders.filter(p => p.mustMapToParticipant || true).length);

    // The names the caller passed in actually arrived.
    expect(result.application!.participants[0]!.name).toBe("Person 1");
  });

  it("copies the variable values rather than handing back the caller's object", () => {
    const template = templateWithRoles();
    const values = { greeting: "hello" };
    const result = instantiateTemplate(template.id, mappingsFor(template), values);

    expect(result.ok).toBe(true);
    values.greeting = "changed";
    expect(result.variableValues!["greeting"]).toBe("hello");
  });

  it("reports a missing template instead of inventing a draft id", () => {
    const result = instantiateTemplate("tpl_does_not_exist", [], {});
    expect(result.ok).toBe(false);
    expect(result.application).toBeUndefined();
    expect(result.errorMessage).toBeTruthy();
  });

  it("refuses when a required role was left unmapped", () => {
    const template = templateWithRoles();
    const result = instantiateTemplate(template.id, [], {});

    expect(result.ok).toBe(false);
    expect(result.application).toBeUndefined();
    // Names the role, so the visitor knows which field to go back and fill.
    expect(result.errorMessage).toBeTruthy();
  });

  it("returns no route into a draft that does not exist", () => {
    // The old stub returned `/app/prepare/<invented id>` — a route the router
    // does not define, so "Continue in Prepare" 404'd. Nothing here may
    // fabricate one.
    const template = templateWithRoles();
    const result = instantiateTemplate(template.id, mappingsFor(template), {});
    expect(result.prepStartRoute).toBeUndefined();
    expect(result.prepDraftId).toBeUndefined();
  });
});

describe("createDraft seeds a real draft from the application", () => {
  const application = () => {
    const template = templateWithRoles();
    const resolved = resolveTemplateApplication({
      placeholders: template.placeholders,
      roleMappings: mappingsFor(template),
      routingMode: "sequential",
    });
    if (!resolved.ok) throw new Error(`fixture template did not resolve: ${resolved.message}`);
    return { template, application: resolved.application };
  };

  it("arrives with participants and routing, not the blank draft", () => {
    // The stub returned `{ ...DRAFT_BLANK }` with only a sourceContext set, so
    // the visitor landed on an empty Participants step having just filled one
    // in. This is the regression test for that.
    const { template, application: app } = application();
    return prepareService.createDraft({
      source: "template",
      templateId: template.id,
      templateApplication: app,
    }).then(draft => {
      expect(draft.participants.length).toBe(app.participants.length);
      expect(draft.participants.length).toBeGreaterThan(0);
      expect(draft.routing.groups.length).toBe(app.routing.groups.length);
      expect(draft.routing.mode).toBe("sequential");
    });
  });

  it("records the template id as provenance only", () => {
    const { template, application: app } = application();
    return prepareService.createDraft({
      source: "template",
      templateId: template.id,
      templateApplication: app,
    }).then(draft => {
      expect(draft.sourceContext.source).toBe("template");
      expect(draft.sourceContext.templateId).toBe(template.id);
      // And the participants stand on their own — nothing needed the id to
      // produce them.
      expect(draft.participants.length).toBeGreaterThan(0);
    });
  });

  it("does not share arrays with the caller's application", () => {
    // If the draft held the same array, a later edit to the application — or
    // to a second draft built from it — would mutate this one too.
    const { template, application: app } = application();
    return prepareService.createDraft({
      source: "template",
      templateId: template.id,
      templateApplication: app,
    }).then(draft => {
      expect(draft.participants).not.toBe(app.participants);
      expect(draft.routing.groups).not.toBe(app.routing.groups);

      const nameBefore = draft.participants[0]!.name;
      app.participants[0]!.name = "Mutated After The Fact";
      expect(draft.participants[0]!.name).toBe(nameBefore);
    });
  });

  it("gives two drafts from one application independent participants", () => {
    const { template, application: app } = application();
    return Promise.all([
      prepareService.createDraft({ source: "template", templateId: template.id, templateApplication: app }),
      prepareService.createDraft({ source: "template", templateId: template.id, templateApplication: app }),
    ]).then(([first, second]) => {
      // Id uniqueness is asserted in services/mock/__tests__/draft-id.test.ts,
      // alongside the fix it guards. This test is about the PARTICIPANTS.
      expect(first.participants).not.toBe(second.participants);

      first.participants[0]!.name = "Only In The First";
      expect(second.participants[0]!.name).not.toBe("Only In The First");
    });
  });

  it("still returns a blank draft for a template id with no application", () => {
    // Nothing has been mapped to real people yet, so there is nothing to
    // pre-fill. Guessing would be worse than an empty step.
    const { template } = application();
    return prepareService.createDraft({
      source: "template",
      templateId: template.id,
    }).then(draft => {
      expect(draft.participants).toHaveLength(0);
      expect(draft.sourceContext.templateId).toBe(template.id);
    });
  });
});

describe("end to end: a template edit cannot reach a draft already made from it", () => {
  it("leaves the draft untouched when the template's slots change afterwards", () => {
    const template = templateWithRoles();

    // Work on a deep copy, so this test can mutate "the template" without
    // corrupting the shared fixture for every other test in the run.
    const editable: DocumentTemplate = JSON.parse(JSON.stringify(template));

    const resolved = resolveTemplateApplication({
      placeholders: editable.placeholders,
      roleMappings: mappingsFor(editable),
      routingMode: editable.routing.mode,
    });
    expect(resolved.ok).toBe(true);
    if (!resolved.ok) return;

    return prepareService.createDraft({
      source: "template",
      templateId: editable.id,
      templateApplication: resolved.application,
    }).then(draft => {
      const before = JSON.parse(JSON.stringify({
        participants: draft.participants,
        routing: draft.routing,
      }));

      // The admin edits the template: renames a role, moves it to another
      // step, then deletes every slot.
      editable.placeholders[0]!.label = "Renamed";
      editable.placeholders[0]!.routingStep = 9;
      editable.placeholders.length = 0;

      expect({ participants: draft.participants, routing: draft.routing }).toEqual(before);
    });
  });
});
