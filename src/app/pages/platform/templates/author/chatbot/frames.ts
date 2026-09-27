// Typing frames for the chatbot's draft reveal: the draft's length, its
// characters in typing order, and the draft cut to its first N characters.
// No knowledge-base import, so the typewriter can load without it.

import type {
  DocumentBlock, DocumentInlineContent, DocumentListItem, FlowDocument,
} from "../../../../../models/templates";

// ── Typing frames ────────────────────────────────────────────────────────────
// Each block start counts as one character (a line break, where the rhythm
// pauses), each text character as one, and each variable, field or page
// break as one.

function inlineLength(c: DocumentInlineContent): number {
  return c.reduce((n, r) => n + (r.kind === "text" ? r.text.length : 1), 0);
}

function blockLength(b: DocumentBlock | DocumentListItem): number {
  if (b.kind === "paragraph" || b.kind === "heading") return 1 + inlineLength(b.content);
  if (b.kind === "pageBreak") return 1;
  if (b.kind === "orderedList") return b.content.reduce((n, li) => n + blockLength(li), 0);
  return b.content.reduce((n, ch) => n + blockLength(ch), 0);
}

export function draftLength(doc: FlowDocument): number {
  return doc.content.reduce((n, b) => n + blockLength(b), 0);
}

/** The characters in typing order, for the rhythm (pauses at punctuation). */
export function draftStream(doc: FlowDocument): string {
  let out = "";
  const inline = (c: DocumentInlineContent) => { for (const r of c) out += r.kind === "text" ? r.text : "•"; };
  const walk = (b: DocumentBlock | DocumentListItem) => {
    if (b.kind === "paragraph" || b.kind === "heading") { out += "\n"; inline(b.content); }
    else if (b.kind === "pageBreak") out += "\n";
    else if (b.kind === "orderedList") b.content.forEach(walk);
    else b.content.forEach(walk);
  };
  doc.content.forEach(walk);
  return out;
}

function truncInline(c: DocumentInlineContent, budget: number): [DocumentInlineContent, number] {
  const out: DocumentInlineContent = [];
  let left = budget;
  for (const r of c) {
    if (left <= 0) break;
    if (r.kind === "text") {
      const take = r.text.slice(0, left);
      if (take !== "") out.push({ ...r, text: take });
      left -= take.length;
    } else {
      out.push(r);
      left -= 1;
    }
  }
  return [out, budget - left];
}

function truncBlock<T extends DocumentBlock | DocumentListItem>(b: T, budget: number): [T | null, number] {
  if (budget <= 0) return [null, 0];
  if (b.kind === "paragraph" || b.kind === "heading") {
    const [content, used] = truncInline(b.content, budget - 1);
    return [{ ...b, content }, used + 1];
  }
  if (b.kind === "pageBreak") return [b, 1];
  const children = b.content as (DocumentBlock | DocumentListItem)[];
  const kept: (DocumentBlock | DocumentListItem)[] = [];
  let used = 0;
  for (const ch of children) {
    const [t, u] = truncBlock(ch, budget - used);
    if (t === null) break;
    kept.push(t);
    used += u;
  }
  if (kept.length === 0) return [null, 0];
  // A list item must start with a paragraph; a half-built one gets an empty one.
  if (b.kind === "listItem" && kept[0]?.kind !== "paragraph") kept.unshift({ kind: "paragraph", content: [] });
  return [{ ...b, content: kept }, used];
}

/** The first `chars` characters of the draft, blocks and formatting kept. */
export function truncateDraft(doc: FlowDocument, chars: number): FlowDocument {
  if (chars >= draftLength(doc)) return doc;
  const out: DocumentBlock[] = [];
  let used = 0;
  for (const b of doc.content) {
    const [t, u] = truncBlock(b, chars - used);
    if (t === null) break;
    out.push(t);
    used += u;
  }
  return { kind: "flowDocument", content: out };
}
