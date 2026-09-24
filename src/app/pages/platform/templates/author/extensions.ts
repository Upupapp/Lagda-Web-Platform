// TipTap schema for authoring a template's FlowDocument (071).
//
// The schema here is deliberately a near-literal mirror of the backend's
// `FlowDocument` contract (`packages/contracts/src/workflow-templates/index.ts`)
// — paragraph, heading (1-3), orderedList > listItem > [paragraph|orderedList],
// pageBreak, and three inline run kinds (text, variable, fieldAnchor). That
// mirroring is what makes `converter.ts`'s round trip a straight structural
// walk instead of a second content model to keep in sync.
//
// Two custom marks (`fontFamily`, `fontSize`) carry the ribbon's font
// controls — TipTap's own `TextStyle`/`Color` extensions exist for a much
// wider CSS surface than a signable document needs, so these are written
// directly against the two attributes `DocumentTextMarkSchema` actually
// defines rather than pulling in a broader "any inline style" mark.
//
// Two custom inline ATOM nodes (`variableRef`, `fieldAnchor`) are the typed
// placeholders "insert variable" and "insert signature/date/initials" drop
// into the text — see each node's own comment for why they are atoms.

import { Mark, mergeAttributes, Node } from "@tiptap/core";
import StarterKit from "@tiptap/starter-kit";
import Underline from "@tiptap/extension-underline";
import TextAlign from "@tiptap/extension-text-align";
import type { DocumentFontFamily, FieldAnchorType } from "../../../../models/templates";

// ── Font family mark ─────────────────────────────────────────────────────────

export interface FontFamilyOptions { types: string[] }

declare module "@tiptap/core" {
  interface Commands<ReturnType> {
    fontFamily: {
      setFontFamily: (family: DocumentFontFamily) => ReturnType;
      unsetFontFamily: () => ReturnType;
    };
    fontSize: {
      setFontSize: (size: number) => ReturnType;
      unsetFontSize: () => ReturnType;
    };
  }
}

/** Maps each ribbon font name to the CSS stack the editor previews with —
 *  the actual glyphs come from the backend's OFL clones at render time
 *  (`packages/sealing/src/internal/document-fonts.ts`); this is preview
 *  only, so a close system-font analog is enough. */
export const FONT_FAMILY_CSS: Record<DocumentFontFamily, string> = {
  times:     "'Times New Roman', Times, serif",
  georgia:   "Georgia, 'Times New Roman', serif",
  helvetica: "Helvetica, Arial, sans-serif",
  calibri:   "Calibri, Candara, sans-serif",
  courier:   "'Courier New', Courier, monospace",
};

export const FontFamily = Mark.create<FontFamilyOptions>({
  name: "fontFamily",
  addOptions() { return { types: ["textStyle"] }; },
  addAttributes() {
    return {
      family: {
        default: "times" as DocumentFontFamily,
        parseHTML: el => el.getAttribute("data-font-family") ?? "times",
        renderHTML: attrs => ({
          "data-font-family": attrs.family as string,
          style: `font-family: ${FONT_FAMILY_CSS[attrs.family as DocumentFontFamily] ?? FONT_FAMILY_CSS.times}`,
        }),
      },
    };
  },
  parseHTML() { return [{ tag: "span[data-font-family]" }]; },
  renderHTML({ HTMLAttributes }) { return ["span", mergeAttributes(HTMLAttributes), 0]; },
  addCommands() {
    return {
      setFontFamily: family => ({ chain }) =>
        chain().setMark(this.name, { family }).run(),
      unsetFontFamily: () => ({ chain }) => chain().unsetMark(this.name).run(),
    };
  },
});

// ── Font size mark ───────────────────────────────────────────────────────────

export const FontSize = Mark.create({
  name: "fontSize",
  addAttributes() {
    return {
      size: {
        default: 11,
        parseHTML: el => {
          const raw = el.getAttribute("data-font-size");
          return raw ? Number(raw) : 11;
        },
        renderHTML: attrs => ({
          "data-font-size": String(attrs.size as number),
          style: `font-size: ${String(attrs.size as number)}pt`,
        }),
      },
    };
  },
  parseHTML() { return [{ tag: "span[data-font-size]" }]; },
  renderHTML({ HTMLAttributes }) { return ["span", mergeAttributes(HTMLAttributes), 0]; },
  addCommands() {
    return {
      setFontSize: size => ({ chain }) => chain().setMark(this.name, { size }).run(),
      unsetFontSize: () => ({ chain }) => chain().unsetMark(this.name).run(),
    };
  },
});

// ── Page break ────────────────────────────────────────────────────────────────
//
// A block atom with no content of its own — forces the next block onto a
// new page, exactly as `DocumentPageBreakSchema` describes.

export const PageBreak = Node.create({
  name: "pageBreak",
  group: "block",
  atom: true,
  selectable: true,
  parseHTML() { return [{ tag: "div[data-page-break]" }]; },
  renderHTML() {
    return ["div", { "data-page-break": "true", class: "flow-page-break" }, "Page break"];
  },
  addCommands() {
    return {
      insertPageBreak: () => ({ chain }) =>
        chain().insertContent({ type: this.name }).run(),
    };
  },
});

declare module "@tiptap/core" {
  interface Commands<ReturnType> {
    pageBreak: { insertPageBreak: () => ReturnType };
  }
}

// ── Variable reference ───────────────────────────────────────────────────────
//
// An inline ATOM — like an emoji or a mention, it is typed as one unit and
// deleted as one unit, never edited character-by-character in place, because
// its rendered text ("[Client Name]") is a presentational label, not the
// document's actual content the way a `text` run's string is.

export interface VariableRefAttrs { key: string; label: string }

export const VariableRef = Node.create({
  name: "variableRef",
  group: "inline",
  inline: true,
  atom: true,
  addAttributes() {
    return {
      key:   { default: "" },
      label: { default: "" },
    };
  },
  parseHTML() { return [{ tag: "span[data-variable-key]" }]; },
  renderHTML({ node }) {
    return ["span", {
      "data-variable-key": node.attrs.key as string,
      class: "flow-variable-ref",
    }, `[${node.attrs.label as string}]`];
  },
  addCommands() {
    return {
      insertVariableRef: (attrs: VariableRefAttrs) => ({ chain }) =>
        chain().insertContent({ type: this.name, attrs }).run(),
    };
  },
});

declare module "@tiptap/core" {
  interface Commands<ReturnType> {
    variableRef: { insertVariableRef: (attrs: VariableRefAttrs) => ReturnType };
  }
}

// ── Field anchor ──────────────────────────────────────────────────────────────
//
// The mechanism connecting typed text to a real, positioned field — see the
// backend contract's own header on "anchored fields". Also an inline atom,
// for the same reason `variableRef` is: "[Employer Signature]" is a label
// for where a signature will render, not editable prose.

export interface FieldAnchorAttrs {
  fieldType: FieldAnchorType;
  slotId?: string;
  variableKey?: string;
  required: boolean;
  label: string;
}

export const FieldAnchor = Node.create({
  name: "fieldAnchor",
  group: "inline",
  inline: true,
  atom: true,
  addAttributes() {
    return {
      fieldType:   { default: "signature" as FieldAnchorType },
      slotId:      { default: null },
      variableKey: { default: null },
      required:    { default: true },
      label:       { default: "" },
    };
  },
  parseHTML() { return [{ tag: "span[data-field-anchor]" }]; },
  renderHTML({ node }) {
    return ["span", {
      "data-field-anchor": node.attrs.fieldType as string,
      class: "flow-field-anchor",
    }, `[${node.attrs.label as string}]`];
  },
  addCommands() {
    return {
      insertFieldAnchor: (attrs: FieldAnchorAttrs) => ({ chain }) =>
        chain().insertContent({ type: this.name, attrs }).run(),
    };
  },
});

declare module "@tiptap/core" {
  interface Commands<ReturnType> {
    fieldAnchor: { insertFieldAnchor: (attrs: FieldAnchorAttrs) => ReturnType };
  }
}

// ── The assembled extension set ──────────────────────────────────────────────

export function flowDocumentExtensions() {
  return [
    StarterKit.configure({
      // Bounded by `FLOW_DOCUMENT_MAX_LIST_DEPTH` — enforced on save
      // (`converter.ts#assertWithinListDepth`), not here; TipTap's own
      // nesting has no natural ceiling to configure.
      heading: { levels: [1, 2, 3] },
      // No bullet lists, blockquotes, code blocks or horizontal rules —
      // `DocumentBlockSchema` has no such block kinds, and Pass 1's ribbon
      // deliberately does not offer them (the contract's own header on
      // scoping a formal-document tool, not a general editor).
      bulletList: false,
      blockquote: false,
      codeBlock: false,
      horizontalRule: false,
      dropcursor: false,
      gapcursor: false,
    }),
    Underline,
    TextAlign.configure({ types: ["paragraph", "heading"], alignments: ["left", "center", "right", "justify"] }),
    FontFamily,
    FontSize,
    PageBreak,
    VariableRef,
    FieldAnchor,
  ];
}
