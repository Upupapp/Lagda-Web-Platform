// The knowledge base covers every ready-made document, and a confirmed chat
// becomes a real FlowDocument built from the ready-made wording.

import { describe, it, expect } from "vitest";
import rawLibrary from "../../../../../../../test/fixtures/ready_made_template.json";
import { KB, findClause, findDocument } from "../knowledge";
import { buildDraft, draftLength, draftStream, readyMadeSource, truncateDraft, participantBlocks } from "../draft";
import { typingUnitMs, typingWeights, TYPING_MAX_MS } from "../useDraftTypewriter";
import type { WritePlan } from "../engine";
import type { Participant } from "../participants";
import type { DocumentBlock, TemplateRolePlaceholder } from "../../../../../../models/templates";
import { slugify } from "../../../../../../services/ready-made-templates";

const ALL_RAW = rawLibrary.categories.flatMap(c => c.documents.map(d => ({ category: c.category, ...d })));

const plan = (over: Partial<WritePlan>): WritePlan => ({
  docId: null, title: "", clauseOnly: [], slots: {}, clauses: [], rules: [], participants: [], placement: "replace", ...over,
});

function textOf(blocks: readonly DocumentBlock[]): string {
  const out: string[] = [];
  const walk = (b: unknown) => {
    const node = b as { kind: string; text?: string; content?: unknown[]; label?: string };
    if (node.kind === "text") out.push(node.text ?? "");
    else if (node.kind === "fieldAnchor") out.push(`{${node.label ?? "field"}}`);
    node.content?.forEach(walk);
  };
  blocks.forEach(walk);
  return out.join(" ");
}

describe("knowledge base coverage", () => {
  it("has a document type for every ready-made title in every category (58)", () => {
    expect(ALL_RAW).toHaveLength(58);
    for (const raw of ALL_RAW) {
      const doc = KB.documents.find(d => "readyMadeTitle" in d.source && d.source.readyMadeTitle === raw.title.trim());
      expect(doc, raw.title).toBeDefined();
      expect(doc!.category).toBe(raw.category);
      expect(doc!.id).toBe(`${slugify(raw.category)}--${slugify(raw.title)}`);
    }
    expect(new Set(KB.documents.map(d => d.category)).size).toBe(15);
  });

  it("references the wording by title/id instead of copying it", () => {
    const json = JSON.stringify(KB);
    for (const raw of ALL_RAW) expect(json.includes(raw.body_content.slice(0, 80))).toBe(false);
  });

  it("gives every document two or three follow-up questions, with aliases and keywords", () => {
    for (const d of KB.documents) {
      const asked = d.slots.filter(s => s.ask !== false);
      expect(asked.length, d.title).toBeGreaterThanOrEqual(2);
      expect(asked.length, d.title).toBeLessThanOrEqual(3);
      for (const s of asked) expect(s.question.length).toBeGreaterThan(8);
      expect(d.aliases.length + d.keywords.length).toBeGreaterThan(3);
      for (const id of d.clauses) expect(findClause(id), `${d.title} → ${id}`).toBeDefined();
    }
  });

  it("keeps the detailed starter draft as a document type", () => {
    expect(findDocument("starter:employment-offer-letter")?.title).toBe("Employment Offer Letter");
  });

  it("has a clause library of at least thirty, including the standard ones", () => {
    expect(KB.clauses.length).toBeGreaterThanOrEqual(30);
    for (const id of [
      "confidentiality", "termination", "payment-terms", "governing-law", "dispute-resolution", "force-majeure",
      "data-privacy", "non-compete", "warranties", "indemnity", "intellectual-property", "notices",
      "entire-agreement", "amendments", "severability", "signature-block", "date-block", "witness-block",
    ]) expect(findClause(id), id).toBeDefined();
    expect(findClause("governing-law")!.text).toMatch(/Philippines/);
    expect(findClause("data-privacy")!.text).toMatch(/Republic Act No\. 10173/);
  });

  it("has intents with examples and several reply variants, and every fallback", () => {
    for (const id of ["greeting", "thanks", "bye", "help"]) {
      const i = KB.intents.find(x => x.id === id)!;
      expect(i.examples.length).toBeGreaterThan(2);
      expect(i.replies.length).toBeGreaterThanOrEqual(1);
    }
    expect(KB.intents.find(x => x.id === "greeting")!.replies.length).toBeGreaterThan(1);
    expect(KB.fallbacks.gibberish.length).toBeGreaterThan(1);
    expect(KB.fallbacks.noMatch.length).toBeGreaterThan(1);
    expect(KB.fallbacks.offTopic.keywords).toContain("weather");
    expect(KB.fallbacks.legalAdvice.replies.join(" ")).toMatch(/lawyer/);
    expect(KB.editRules.map(r => r.id)).toEqual(["formal", "plain", "shorter", "headings"]);
  });

  it("knows the participant role phrases", () => {
    const phrases = KB.participants.roles.flatMap(r => [...r.prefix, ...r.verbs, ...r.nouns]);
    for (const p of ["signed by", "signatory", "approved by", "approved or skipped by", "approve or skip", "reviewed by",
      "reviewer", "cc", "copy to", "carbon copy", "acknowledged by", "for acknowledgment of", "witnessed by"]) {
      expect(phrases, p).toContain(p);
    }
    expect(KB.participants.roles.find(r => r.label === "Witness")!.role).toBe("signer");
  });

  it("builds a draft for every document without throwing, from the ready-made wording", () => {
    for (const d of KB.documents) {
      const draft = buildDraft(plan({ docId: d.id, title: d.title }), []);
      expect(draft.content[0]).toMatchObject({ kind: "heading", level: 1 });
      const source = readyMadeSource(d);
      if (source) expect(textOf(draft.content)).toContain(source.body.slice(0, 60));
      expect(textOf(draft.content)).not.toMatch(/\{\w+\}/); // every placeholder resolved
    }
  });
});

describe("drafts", () => {
  const NDA = "recruitment-and-hr--non-disclosure-agreement-nda";

  it("fills slots, uses the chosen option's sentence, and brackets what was skipped", () => {
    const d = buildDraft(plan({ docId: NDA, slots: { partyA: "Acme Inc.", scope: "one-way" } }), []);
    const t = textOf(d.content);
    expect(t).toContain("between Acme Inc. (the “Disclosing Party”) and [Receiving Party]");
    expect(t).toContain("[Receiving Party] will protect the confidential information that Acme Inc. shares.");
  });

  it("adds requested clauses, and the headings rule turns the list into headed sections", () => {
    const listed = buildDraft(plan({ docId: NDA, clauses: ["force-majeure"] }), []);
    expect(listed.content.some(b => b.kind === "orderedList")).toBe(true);
    expect(textOf(listed.content)).toContain("Force Majeure.");
    const headed = buildDraft(plan({ docId: NDA, clauses: ["force-majeure"], rules: ["headings"] }), []);
    expect(headed.content.some(b => b.kind === "orderedList")).toBe(false);
    expect(headed.content.some(b => b.kind === "heading" && textOf([b]).includes("Force Majeure"))).toBe(true);
  });

  it("plain language swaps legalese; shorter keeps the essentials", () => {
    const plainDraft = textOf(buildDraft(plan({ docId: NDA, rules: ["plain"] }), []).content);
    expect(plainDraft).not.toMatch(/\bshall\b/);
    const full = buildDraft(plan({ docId: NDA }), []);
    const short = buildDraft(plan({ docId: NDA, rules: ["shorter"] }), []);
    expect(draftLength(short)).toBeLessThan(draftLength(full));
  });

  it("a clause-only draft is just that clause", () => {
    const d = buildDraft(plan({ title: "Termination clause", clauseOnly: ["termination"] }), []);
    expect(textOf(d.content)).toContain("Either party may terminate");
  });

  const people: Participant[] = [
    { id: "a", name: "Juan Dela Cruz", role: "signer", label: "Employee", order: 0, step: 1 },
    { id: "b", name: "Maria Santos", role: "approver", label: "HR Approver", order: 1, step: 2 },
    { id: "c", name: "Pedro Reyes", role: "reviewer", label: "Hiring Manager", order: 2, step: 3 },
    { id: "d", name: "Grace Lim", role: "acknowledgment-recipient", label: "Payroll", order: 3, step: 4 },
    { id: "e", name: "Ana Lim", role: "carbon-copy", label: "HR Records", order: 4, step: 5 },
    { id: "f", name: "Mark Reyes", role: "signer", witness: true, label: "Witness", order: 5, step: 6 },
  ];

  it("names every participant in the signature section, by role", () => {
    const t = textOf(participantBlocks(people, []));
    expect(t).toContain("Employee:");
    expect(t).toContain("Name:  Juan Dela Cruz");
    expect(t).toContain("Approved by:  Maria Santos (HR Approver)");
    expect(t).toContain("Reviewed by:  Pedro Reyes (Hiring Manager)");
    expect(t).toContain("Acknowledged by:  Grace Lim (Payroll)");
    expect(t).toContain("Copy furnished:  Ana Lim");
    expect(t).toContain("Signed in the presence of:");
    expect(t).toContain("Witness: Mark Reyes");
  });

  it("binds signature and date fields to the saved role slot", () => {
    const slots: TemplateRolePlaceholder[] = [{
      id: "slot-1", backendSlotId: "wfs_emp", label: "Employee", role: "signer", required: true, routingStep: 1,
      defaultAuthMethod: "none", description: "", mustMapToParticipant: true,
    }];
    const blocks = participantBlocks(people.slice(0, 1), slots);
    const anchors = JSON.stringify(blocks).match(/"slotId":"wfs_emp"/g) ?? [];
    expect(anchors).toHaveLength(2); // signature + date
  });

  it("the employment example writes the names into the preamble and the signatures", () => {
    const d = buildDraft(plan({
      docId: "recruitment-and-hr--employment-offer-letter-and-contract-agreement",
      slots: { partyA: "Acme Inc.", partyB: "Juan Dela Cruz", jobTitle: "Software Engineer" },
      participants: people.slice(0, 2),
    }), []);
    const t = textOf(d.content);
    expect(t).toContain("between Acme Inc. (the “Employer”) and Juan Dela Cruz (the “Employee”)");
    expect(t).toContain("Approved by:  Maria Santos (HR Approver)");
  });
});

describe("typing frames and rhythm", () => {
  const doc = buildDraft(plan({ docId: "recruitment-and-hr--non-disclosure-agreement-nda" }), []);

  it("frames grow monotonically and end at exactly the draft", () => {
    const total = draftLength(doc);
    expect(draftStream(doc)).toHaveLength(total);
    let prev = -1;
    for (const n of [0, 1, 10, 50, 200, Math.floor(total / 2), total - 1]) {
      const len = draftLength(truncateDraft(doc, n));
      expect(len).toBeGreaterThanOrEqual(prev);
      expect(len).toBeLessThanOrEqual(n);
      prev = len;
    }
    expect(truncateDraft(doc, total)).toBe(doc);
  });

  it("pauses at punctuation and caps the whole reveal", () => {
    const w = typingWeights("a. b");
    expect(w[1]! - w[0]!).toBeGreaterThan((w[3]! - w[2]!) * 3); // "." weighs far more than a letter
    const cum = typingWeights(draftStream(doc));
    const totalMs = cum[cum.length - 1]! * typingUnitMs(cum[cum.length - 1]!);
    expect(totalMs).toBeLessThanOrEqual(TYPING_MAX_MS + 1);
    // A short draft types at the comfortable base pace rather than racing.
    expect(typingUnitMs(100)).toBe(28);
  });
});
