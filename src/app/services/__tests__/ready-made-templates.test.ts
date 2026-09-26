import { describe, it, expect } from "vitest";
import rawLibrary from "../../../assets/ready_made_template.json";
import {
  READY_MADE_TEMPLATES, READY_MADE_CATEGORIES, parseReadyMadeLibrary, findReadyMadeTemplate,
  searchReadyMadeTemplates, readyMadePlaceholders, buildReadyMadeDocument,
  readyMadeTypingFrame, readyMadeTypingLength,
} from "../ready-made-templates";
import type { TemplateRolePlaceholder } from "../../models/templates";

const offer = READY_MADE_TEMPLATES.find(t => t.title === "Employment Offer Letter and Contract Agreement")!;

describe("ready-made template library", () => {
  it("offers only the documents that have a signer (46 of 58)", () => {
    const all = rawLibrary.categories.flatMap(c => c.documents);
    expect(all).toHaveLength(58);
    expect(READY_MADE_TEMPLATES).toHaveLength(46);
    for (const t of READY_MADE_TEMPLATES) expect(t.roles.some(r => r.role === "signer")).toBe(true);
  });

  it("keeps every one of the 15 categories", () => {
    expect(READY_MADE_CATEGORIES).toHaveLength(15);
    expect(READY_MADE_CATEGORIES.reduce((n, c) => n + c.count, 0)).toBe(46);
  });

  it("gives every template a unique, stable id", () => {
    const ids = READY_MADE_TEMPLATES.map(t => t.id);
    expect(new Set(ids).size).toBe(ids.length);
    expect(findReadyMadeTemplate(offer.id)).toBe(offer);
    expect(findReadyMadeTemplate("nope")).toBeUndefined();
  });

  it("turns the preparer into the sender and maps the rest to roles, renumbered from 1", () => {
    expect(offer.preparedBy).toBe("HR Manager");
    expect(offer.roles).toEqual([
      { label: "Hiring Manager", role: "reviewer", routingStep: 1 },
      { label: "Candidate", role: "signer", routingStep: 2 },
      { label: "HR Director", role: "approver", routingStep: 3 },
      { label: "HR Records", role: "carbon-copy", routingStep: 4 },
    ]);
  });

  it("produces contiguous steps and unique role names for every template (the backend requires both)", () => {
    for (const t of READY_MADE_TEMPLATES) {
      expect(t.roles.map(r => r.routingStep)).toEqual(t.roles.map((_, i) => i + 1));
      expect(new Set(t.roles.map(r => r.label)).size).toBe(t.roles.length);
      expect(t.title.length).toBeLessThanOrEqual(200);
      for (const r of t.roles) expect(r.label.length).toBeLessThanOrEqual(120);
    }
  });

  it("skips a document with no signer", () => {
    const parsed = parseReadyMadeLibrary({ categories: [{ category: "X", documents: [{
      document_type: "t", title: "Approval only", body_content: "b",
      signing_workflow: [{ step: 1, role: "Clerk", action_type: "Preparer" }, { step: 2, role: "Boss", action_type: "Approver" }],
    }] }] });
    expect(parsed).toEqual([]);
  });

  it("searches title, type, category and role names", () => {
    expect(searchReadyMadeTemplates("candidate", null).map(t => t.id)).toContain(offer.id);
    expect(searchReadyMadeTemplates("", offer.categoryId).every(t => t.categoryId === offer.categoryId)).toBe(true);
    expect(searchReadyMadeTemplates("zzzz-no-match", null)).toEqual([]);
  });
});

describe("placeholders and document", () => {
  it("creates required, invitation-link slots", () => {
    const slots = readyMadePlaceholders(offer);
    expect(slots.map(s => s.label)).toEqual(["Hiring Manager", "Candidate", "HR Director", "HR Records"]);
    for (const s of slots) expect(s).toMatchObject({ required: true, defaultAuthMethod: "none" });
  });

  it("binds signature and date fields to saved signer slots only", () => {
    const saved: TemplateRolePlaceholder[] = readyMadePlaceholders(offer)
      .map((p, i) => ({ ...p, backendSlotId: `slot_${String(i)}` }));
    const doc = buildReadyMadeDocument(offer, saved);
    const anchors = JSON.stringify(doc).match(/"fieldAnchor"/g) ?? [];
    expect(anchors).toHaveLength(2);
    expect(JSON.stringify(doc)).toContain('"slotId":"slot_1"');
    expect(doc.content[0]).toMatchObject({ kind: "heading", content: [{ text: offer.title }] });
  });

  it("falls back to bracketed placeholders before the roles are saved", () => {
    const doc = JSON.stringify(buildReadyMadeDocument(offer, readyMadePlaceholders(offer)));
    expect(doc).not.toContain("fieldAnchor");
    expect(doc).toContain("[Candidate Signature]");
  });

  it("types the title, then the body, then settles on the full document", () => {
    const slots = readyMadePlaceholders(offer);
    const start = readyMadeTypingFrame(offer, slots, 0);
    expect(JSON.stringify(start)).not.toContain('"text":""');
    const mid = readyMadeTypingFrame(offer, slots, offer.title.length + 5);
    expect(mid.content[1]).toMatchObject({ content: [{ text: offer.body.slice(0, 5) }] });
    expect(readyMadeTypingFrame(offer, slots, readyMadeTypingLength(offer)))
      .toEqual(buildReadyMadeDocument(offer, slots));
  });
});
