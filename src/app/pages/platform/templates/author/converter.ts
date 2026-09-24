// FlowDocument ⇄ ProseMirror JSON — the one place this translation happens.
//
// The TipTap schema in `extensions.ts` mirrors `FlowDocument` block-for-block
// and run-for-run, so both directions here are a straight structural walk,
// not a re-interpretation. `toFlowDocument` is also where the ribbon's
// content becomes exactly what `FLOW_DOCUMENT_MAX_LIST_DEPTH` bounds — a
// list nested past three levels is flattened rather than sent to a backend
// that would 422 it with no indication of which clause to fix.

import type { JSONContent } from "@tiptap/core";
import type {
  FlowDocument, DocumentBlock, DocumentInlineContent, DocumentTextMark,
  DocumentFontFamily, DocumentBlockAlign, DocumentHeadingLevel,
  DocumentListItem, DocumentOrderedList, FieldAnchorType,
} from "../../../../models/templates";

const MAX_LIST_DEPTH = 3;

// ── FlowDocument → ProseMirror JSON (loading into the editor) ──────────────

function marksToJSON(marks: DocumentTextMark[] | undefined): JSONContent["marks"] {
  if (!marks || marks.length === 0) return undefined;
  return marks.map(m => {
    if (m.kind === "fontFamily") return { type: "fontFamily", attrs: { family: m.family } };
    if (m.kind === "fontSize") return { type: "fontSize", attrs: { size: m.size } };
    return { type: m.kind };
  });
}

function inlineToJSON(content: DocumentInlineContent): JSONContent[] {
  return content.map(run => {
    if (run.kind === "text") return { type: "text", text: run.text, marks: marksToJSON(run.marks) };
    if (run.kind === "variable") return { type: "variableRef", attrs: { key: run.key, label: run.label } };
    return {
      type: "fieldAnchor",
      attrs: {
        fieldType: run.fieldType,
        slotId: run.slotId ?? null,
        variableKey: run.variableKey ?? null,
        required: run.required,
        label: run.label,
      },
    };
  });
}

function blockToJSON(block: DocumentBlock): JSONContent {
  if (block.kind === "paragraph") {
    return {
      type: "paragraph",
      attrs: block.align ? { textAlign: block.align } : undefined,
      content: block.content.length > 0 ? inlineToJSON(block.content) : undefined,
    };
  }
  if (block.kind === "heading") {
    return {
      type: "heading",
      attrs: { level: block.level, ...(block.align ? { textAlign: block.align } : {}) },
      content: block.content.length > 0 ? inlineToJSON(block.content) : undefined,
    };
  }
  if (block.kind === "pageBreak") return { type: "pageBreak" };
  return {
    type: "orderedList",
    content: block.content.map(listItemToJSON),
  };
}

function listItemToJSON(item: DocumentListItem): JSONContent {
  return {
    type: "listItem",
    content: item.content.map(child =>
      child.kind === "orderedList" ? blockToJSON(child) : blockToJSON(child)),
  };
}

export function flowDocumentToJSON(doc: FlowDocument): JSONContent {
  return {
    type: "doc",
    content: doc.content.length > 0
      ? doc.content.map(blockToJSON)
      : [{ type: "paragraph" }],
  };
}

// ── ProseMirror JSON → FlowDocument (saving) ────────────────────────────────

function jsonToMarks(marks: JSONContent["marks"]): DocumentTextMark[] | undefined {
  if (!marks || marks.length === 0) return undefined;
  const out: DocumentTextMark[] = [];
  for (const m of marks) {
    if (m.type === "bold") out.push({ kind: "bold" });
    else if (m.type === "italic") out.push({ kind: "italic" });
    else if (m.type === "underline") out.push({ kind: "underline" });
    else if (m.type === "fontFamily") {
      out.push({ kind: "fontFamily", family: (m.attrs?.family ?? "times") as DocumentFontFamily });
    } else if (m.type === "fontSize") {
      out.push({ kind: "fontSize", size: Number(m.attrs?.size ?? 11) });
    }
  }
  return out.length > 0 ? out : undefined;
}

function jsonToInline(nodes: JSONContent[] | undefined): DocumentInlineContent {
  if (!nodes) return [];
  const out: DocumentInlineContent = [];
  for (const n of nodes) {
    if (n.type === "text" && typeof n.text === "string" && n.text.length > 0) {
      const marks = jsonToMarks(n.marks);
      out.push(marks ? { kind: "text", text: n.text, marks } : { kind: "text", text: n.text });
    } else if (n.type === "variableRef") {
      out.push({
        kind: "variable",
        key: String(n.attrs?.key ?? ""),
        label: String(n.attrs?.label ?? ""),
      });
    } else if (n.type === "fieldAnchor") {
      const slotId = n.attrs?.slotId as string | null | undefined;
      const variableKey = n.attrs?.variableKey as string | null | undefined;
      out.push({
        kind: "fieldAnchor",
        fieldType: (n.attrs?.fieldType ?? "signature") as FieldAnchorType,
        ...(slotId ? { slotId } : {}),
        ...(variableKey ? { variableKey } : {}),
        required: Boolean(n.attrs?.required ?? true),
        label: String(n.attrs?.label ?? ""),
      });
    }
  }
  return out;
}

function alignOf(node: JSONContent): DocumentBlockAlign | undefined {
  const align = node.attrs?.textAlign as string | undefined;
  return align === "center" || align === "right" || align === "justify" ? align : undefined;
}

/** A list item at DEPTH (1-based). Past `MAX_LIST_DEPTH`, a nested list is
 *  dropped and its paragraphs are pulled up flat into the parent item —
 *  losing the sub-numbering rather than the words, and never silently
 *  producing a document the backend would refuse outright. */
function jsonToListItem(node: JSONContent, depth: number): DocumentListItem {
  const kids = node.content ?? [];
  const content: DocumentListItem["content"] = [];
  for (const child of kids) {
    if (child.type === "paragraph") {
      content.push({ kind: "paragraph", ...(alignOf(child) ? { align: alignOf(child) } : {}), content: jsonToInline(child.content) });
    } else if (child.type === "orderedList") {
      if (depth < MAX_LIST_DEPTH) {
        content.push(jsonToOrderedList(child, depth + 1));
      } else {
        // Flatten: pull each grandchild item's own paragraphs up as plain
        // paragraphs of THIS item, rather than a 4th list level.
        for (const grandItem of child.content ?? []) {
          for (const gc of grandItem.content ?? []) {
            if (gc.type === "paragraph") {
              content.push({ kind: "paragraph", content: jsonToInline(gc.content) });
            }
          }
        }
      }
    }
  }
  return { kind: "listItem", content: content.length > 0 ? content : [{ kind: "paragraph", content: [] }] };
}

function jsonToOrderedList(node: JSONContent, depth: number): DocumentOrderedList {
  return {
    kind: "orderedList",
    content: (node.content ?? []).map(item => jsonToListItem(item, depth)),
  };
}

function jsonToBlock(node: JSONContent): DocumentBlock | null {
  if (node.type === "paragraph") {
    return { kind: "paragraph", ...(alignOf(node) ? { align: alignOf(node) } : {}), content: jsonToInline(node.content) };
  }
  if (node.type === "heading") {
    const level = (node.attrs?.level ?? 1) as DocumentHeadingLevel;
    return { kind: "heading", level, ...(alignOf(node) ? { align: alignOf(node) } : {}), content: jsonToInline(node.content) };
  }
  if (node.type === "pageBreak") return { kind: "pageBreak" };
  if (node.type === "orderedList") return jsonToOrderedList(node, 1);
  return null;
}

/** Drops a block whose text content is entirely empty AND carries no
 *  field anchor/variable — an editor with nothing typed yet should save
 *  as an empty document, not one paragraph containing nothing. */
function isMeaningfulBlock(block: DocumentBlock): boolean {
  if (block.kind === "pageBreak") return true;
  if (block.kind === "orderedList") return block.content.length > 0;
  return block.content.some(run => run.kind !== "text" || run.text.trim() !== "");
}

export function jsonToFlowDocument(json: JSONContent): FlowDocument {
  const blocks = (json.content ?? [])
    .map(jsonToBlock)
    .filter((b): b is DocumentBlock => b !== null)
    .filter(isMeaningfulBlock);
  return { kind: "flowDocument", content: blocks };
}
