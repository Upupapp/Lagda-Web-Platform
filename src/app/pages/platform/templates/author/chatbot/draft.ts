// Turns a confirmed chat into a FlowDocument for the editor, and slices that
// document into typing frames for the "written as if typed" reveal.
//
// The wording of each document comes from the ready-made library through
// the existing service (`findReadyMadeTemplate` + `buildReadyMadeDocument`)
// — the chatbot's JSON only references a title/id, it never copies a body.
// The approval-only documents the gallery leaves out (no Signer step) are
// read from the same library by title. The library is the one the SERVER
// handed over (093): the chatbot is a paid feature, and TemplateAuthorPage
// loads the full library before it opens.

import {
  buildReadyMadeDocument, findReadyMadeTemplate, readyMadeRawDocuments,
} from "../../../../../services/ready-made-templates";
import type {
  DocumentBlock, DocumentInlineContent, DocumentListItem, DocumentTextRun, FlowDocument, TemplateRolePlaceholder,
} from "../../../../../models/templates";
import { employmentOfferLetterStarter } from "../starterTemplates";
import { KB, findClause, findDocument, findRule, type KbClause, type KbDocument } from "./knowledge";
import type { WritePlan } from "./engine";
import type { Participant } from "./participants";


/** The ready-made wording for a chatbot document: title, body, preparer. */
export function readyMadeSource(doc: KbDocument): { title: string; body: string; preparedBy: string | null } | null {
  if (!("readyMadeTitle" in doc.source)) return null;
  const inGallery = findReadyMadeTemplate(doc.source.readyMadeId);
  // An empty body is the catalogue (no text): the full library is not loaded.
  if (inGallery && inGallery.body !== "") return { title: inGallery.title, body: inGallery.body, preparedBy: inGallery.preparedBy };
  const title = doc.source.readyMadeTitle;
  const raw = readyMadeRawDocuments().find(d => d.title.trim() === title);
  if (!raw || raw.body_content === undefined) return null;
  const preparer = raw.signing_workflow.find(s => s.action_type === "Preparer");
  return { title: raw.title.trim(), body: raw.body_content.trim(), preparedBy: preparer ? preparer.role.trim() : null };
}

const plain = (text: string): DocumentTextRun => ({ kind: "text", text });
const bold = (text: string): DocumentTextRun => ({ kind: "text", text, marks: [{ kind: "bold" }] });
const para = (...content: DocumentInlineContent): DocumentBlock => ({ kind: "paragraph", content });
const heading = (level: 1 | 2 | 3, text: string, align?: "center"): DocumentBlock =>
  ({ kind: "heading", level, ...(align ? { align } : {}), content: [plain(text)] });

// ── Placeholder filling ──────────────────────────────────────────────────────

function humanize(key: string): string {
  return key.replace(/_/g, " ").replace(/([a-z])([A-Z])/g, "$1 $2").replace(/^./, c => c.toUpperCase());
}

/** `{key}` → the slot's value, the chosen option's sentence, or `[Label]`. */
function makeFiller(doc: KbDocument | undefined, plan: WritePlan): (s: string) => string {
  const values: Record<string, string> = { title: doc?.title ?? plan.title };
  const labels: Record<string, string> = {};
  for (const s of doc?.slots ?? []) {
    labels[s.key] = s.label;
    const v = plan.slots[s.key];
    if (v === undefined) continue;
    values[s.key] = s.type === "choice" ? (s.options?.find(o => o.value === v)?.text ?? v) : v;
  }
  if (plan.slots.effectiveDate !== undefined) values.effectiveDate = plan.slots.effectiveDate;
  const fallbackFor = (key: string) => {
    if (labels[key] !== undefined) return `[${labels[key]}]`;
    const def = KB.placeholderLabels[key];
    if (def !== undefined) return def.startsWith("[") || /\(|'/.test(def) || /^[a-z]/.test(def) ? def : `[${def}]`;
    return `[${humanize(key)}]`;
  };
  const once = (s: string) => s.replace(/\{(\w+)\}/g, (_m, key: string) => values[key] ?? fallbackFor(key));
  // Two passes: a chosen option's sentence can itself hold "{partyA}".
  return (s: string) => once(once(s));
}

function applyReplacements(text: string, replacements: Readonly<Record<string, string>>): string {
  let out = text;
  for (const [from, to] of Object.entries(replacements).sort((a, b) => b[0].length - a[0].length)) {
    const re = new RegExp(`\\b${from.replace(/[.*+?^${}()|[\]\\]/g, "\\$&")}`, "g");
    out = out.replace(re, to);
    const cap = from[0]!.toUpperCase() + from.slice(1);
    if (cap !== from) out = out.replace(new RegExp(`\\b${cap.replace(/[.*+?^${}()|[\]\\]/g, "\\$&")}`, "g"), to[0]!.toUpperCase() + to.slice(1));
  }
  return out;
}

function transformRuns(blocks: DocumentBlock[], fn: (s: string) => string): DocumentBlock[] {
  const inline = (c: DocumentInlineContent): DocumentInlineContent =>
    c.map(r => (r.kind === "text" ? { ...r, text: fn(r.text) } : r));
  const item = (li: DocumentListItem): DocumentListItem => ({
    kind: "listItem",
    content: li.content.map(ch => (ch.kind === "paragraph" ? { ...ch, content: inline(ch.content) } : { ...ch, content: ch.content.map(item) })),
  });
  return blocks.map(b => {
    if (b.kind === "paragraph" || b.kind === "heading") return { ...b, content: inline(b.content) };
    if (b.kind === "orderedList") return { ...b, content: b.content.map(item) };
    return b;
  });
}

// ── Clauses ──────────────────────────────────────────────────────────────────

const SIGNATURE_BLOCKS = new Set(["signature-block", "acknowledgment-block", "approval-block", "certification-block"]);

function clauseText(c: KbClause, plan: WritePlan): string {
  if (plan.rules.includes("plain") && c.plain !== undefined) return c.plain;
  return c.text ?? "";
}

function clauseBlocks(ids: readonly string[], plan: WritePlan, fill: (s: string) => string, parties: readonly string[]): DocumentBlock[] {
  const clauses = ids.map(findClause).filter((c): c is KbClause => c !== undefined);
  const terms = clauses.filter(c => c.kind === "clause");
  const blocks = clauses.filter(c => c.kind === "block");
  const out: DocumentBlock[] = [];
  if (terms.length > 0) {
    if (plan.rules.includes("headings")) {
      terms.forEach((c, i) => {
        out.push(heading(2, `${String(i + 1)}. ${c.title}`));
        out.push(para(plain(fill(clauseText(c, plan)))));
      });
    } else {
      out.push(heading(2, "Terms and Conditions"));
      out.push({
        kind: "orderedList",
        content: terms.map(c => ({
          kind: "listItem" as const,
          content: [{ kind: "paragraph" as const, content: [bold(`${c.title}. `), plain(fill(clauseText(c, plan)))] }],
        })),
      });
    }
  }
  for (const b of blocks) {
    out.push(para());
    out.push(heading(3, b.title));
    const lines = b.lines ?? [];
    if (b.id === "signature-block") {
      for (const party of parties.length > 0 ? parties : ["[Party Name]"]) {
        lines.forEach((l, i) => out.push(i === 0 ? para(bold(fill(l.replace("{party}", `${party}:`)))) : para(plain(fill(l)))));
        out.push(para());
      }
    } else {
      for (const l of lines) out.push(para(plain(fill(l))));
    }
  }
  return out;
}

// ── Signatures, from the participants ────────────────────────────────────────

function slotFor(p: Participant, placeholders: readonly TemplateRolePlaceholder[]): TemplateRolePlaceholder | undefined {
  return placeholders.find(ph => ph.role === p.role && ph.label.trim().toLowerCase() === p.label.trim().toLowerCase());
}

const LINE = "____________________";

export function participantBlocks(participants: readonly Participant[], placeholders: readonly TemplateRolePlaceholder[]): DocumentBlock[] {
  if (participants.length === 0) return [];
  const sorted = [...participants].sort((a, b) => a.step - b.step || a.order - b.order);
  const out: DocumentBlock[] = [para(), heading(2, "Signatures")];
  const nameOf = (p: Participant) => p.name ?? LINE;

  const signers = sorted.filter(p => p.role === "signer" && !p.witness);
  for (const p of signers) {
    const slot = slotFor(p, placeholders);
    const sig = slot?.backendSlotId
      ? [{ kind: "fieldAnchor" as const, fieldType: "signature" as const, slotId: slot.backendSlotId, required: true, label: `${p.label} Signature` }]
      : [plain(LINE)];
    const date = slot?.backendSlotId
      ? [{ kind: "fieldAnchor" as const, fieldType: "date-signed" as const, slotId: slot.backendSlotId, required: true, label: `${p.label} Date` }]
      : [plain(LINE)];
    out.push(para(bold(`${p.label}:`)));
    out.push(para(plain("Signature: "), ...sig));
    out.push(para(plain("Name: "), plain(nameOf(p))));
    out.push(para(plain("Date: "), ...date));
    out.push(para());
  }
  const witnesses = sorted.filter(p => p.witness);
  if (witnesses.length > 0) {
    out.push(para(bold("Signed in the presence of:")));
    for (const p of witnesses) {
      const slot = slotFor(p, placeholders);
      const sig = slot?.backendSlotId
        ? [{ kind: "fieldAnchor" as const, fieldType: "signature" as const, slotId: slot.backendSlotId, required: true, label: `${p.label} Signature` }]
        : [plain(LINE)];
      out.push(para(plain(`${p.label}: ${nameOf(p)} — Signature: `), ...sig));
    }
    out.push(para());
  }
  const labelled = (prefix: string, role: Participant["role"], withDate: boolean) => {
    for (const p of sorted.filter(x => x.role === role)) {
      out.push(para(bold(`${prefix} `), plain(`${nameOf(p)} (${p.label})`)));
      if (withDate) out.push(para(plain(`Date: ${LINE}`)));
    }
  };
  labelled("Reviewed by:", "reviewer", true);
  labelled("Approved by:", "approver", true);
  labelled("Acknowledged by:", "acknowledgment-recipient", true);
  const copies = sorted.filter(p => p.role === "carbon-copy");
  if (copies.length > 0) out.push(para(bold("Copy furnished: "), plain(copies.map(nameOf).join(", "))));
  return out;
}

// ── The draft ────────────────────────────────────────────────────────────────

function fillVariables(doc: FlowDocument, values: Readonly<Record<string, string>>): FlowDocument {
  const inline = (c: DocumentInlineContent): DocumentInlineContent =>
    c.map(r => (r.kind === "variable" && values[r.key] !== undefined ? plain(values[r.key]!) : r));
  const item = (li: DocumentListItem): DocumentListItem => ({
    kind: "listItem",
    content: li.content.map(ch => (ch.kind === "paragraph" ? { ...ch, content: inline(ch.content) } : { ...ch, content: ch.content.map(item) })),
  });
  return {
    kind: "flowDocument",
    content: doc.content.map(b => {
      if (b.kind === "paragraph" || b.kind === "heading") return { ...b, content: inline(b.content) };
      if (b.kind === "orderedList") return { ...b, content: b.content.map(item) };
      return b;
    }),
  };
}

function starterDraft(plan: WritePlan, placeholders: readonly TemplateRolePlaceholder[]): DocumentBlock[] {
  const base = employmentOfferLetterStarter(placeholders);
  const signer = plan.participants.find(p => p.role === "signer" && !p.witness && p.name !== null);
  const values: Record<string, string> = { ...plan.slots };
  if (signer?.name) values.employee_name = signer.name;
  const filled = fillVariables(base, values).content;
  if (plan.participants.length === 0) return filled;
  // The participants' own signature section replaces the starter's.
  const cut = filled.findIndex(b => b.kind === "pageBreak");
  return [...(cut === -1 ? filled : filled.slice(0, cut + 1)), ...participantBlocks(plan.participants, placeholders)];
}

/**
 * The document the chat agreed on. `placeholders` are the template's role
 * slots (after any the chat saved), so signature fields bind to real slots.
 */
export function buildDraft(plan: WritePlan, placeholders: readonly TemplateRolePlaceholder[]): FlowDocument {
  const doc = findDocument(plan.docId);
  const fill = makeFiller(doc, plan);
  let blocks: DocumentBlock[];

  if (!doc) {
    blocks = [heading(1, plan.title, "center"), ...clauseBlocks(plan.clauseOnly, plan, fill, [])];
  } else if ("starter" in doc.source) {
    blocks = starterDraft(plan, placeholders);
  } else {
    const source = readyMadeSource(doc);
    const base = source ? buildReadyMadeDocument(source, placeholders).content : [heading(1, doc.title, "center")];
    // base: [title, summary, (prepared by)?, ...(signatures)]
    const sigStart = base.findIndex(b => b.kind === "heading" && b.level === 2);
    const head = sigStart === -1 ? base : base.slice(0, Math.max(1, sigStart - 1));
    const tail = sigStart === -1 ? [] : base.slice(Math.max(1, sigStart - 1));
    const [title, ...rest] = head;
    const intro = doc.intro !== "" ? [para(plain(fill(doc.intro)))] : [];
    const purpose = rest.map(b => (b.kind === "paragraph" && b === rest[0] ? { ...b, content: [bold("Purpose. "), ...b.content] } : b));

    let ids = [...doc.clauses, ...plan.clauses.filter(c => !doc.clauses.includes(c))];
    if (plan.rules.includes("shorter")) {
      const essential = ids.filter(id => findClause(id)?.essential === true || plan.clauses.includes(id) || findClause(id)?.kind === "block");
      ids = essential.length > 0 ? essential : ids.slice(0, 3);
    }
    // Named participants bring their own signature section.
    if (plan.participants.length > 0) ids = ids.filter(id => !SIGNATURE_BLOCKS.has(id));
    const signatures = plan.participants.length > 0
      ? participantBlocks(plan.participants, placeholders)
      : tail.length > 0 || ids.some(id => SIGNATURE_BLOCKS.has(id))
        ? tail
        : clauseBlocks(["signature-block"], plan, fill, doc.parties);
    blocks = [
      ...(title ? [title] : []),
      ...intro,
      ...(plan.rules.includes("shorter") ? [] : purpose),
      ...clauseBlocks(ids, plan, fill, doc.parties),
      ...signatures,
    ];
  }

  for (const id of ["plain", "formal"] as const) {
    const rule = findRule(id);
    if (plan.rules.includes(id) && rule?.replacements) {
      const replacements = rule.replacements;
      blocks = transformRuns(blocks, s => applyReplacements(s, replacements));
    }
  }
  return { kind: "flowDocument", content: blocks };
}

export { draftLength, draftStream, truncateDraft } from "./frames";
