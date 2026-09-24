// The Pass-1 ribbon: five fonts, bold/italic/underline, size, alignment
// (incl. justify), headings, numbered clauses, page break, insert variable,
// insert signature/date/initials field — and deliberately NOTHING else
// (no color, no highlighting — the contract's own header explains why a
// formal-document tool leaves those out). Tables and the rest of Pass 2 are
// not here yet.

import { useState } from "react";
import type { Editor } from "@tiptap/react";
import {
  Bold, Italic, Underline as UnderlineIcon, AlignLeft, AlignCenter, AlignRight,
  AlignJustify, ListOrdered, FileDown, Type as VariableIcon, PenLine, ChevronDown,
} from "lucide-react";
import {
  DOCUMENT_FONT_FAMILY_LABELS, FIELD_ANCHOR_TYPE_LABELS,
  type DocumentFontFamily, type FieldAnchorType, type TemplateVariable, type TemplateRolePlaceholder,
} from "../../../../models/templates";
import { Z } from "../../../../utils/z-index";

const GF     = { fontFamily: "'Geist', sans-serif" };
const AZURE  = "#0078D4";
const NAVY   = "#07111F";
const SILVER = "#64748B";
const BORDER = "1px solid rgba(0,0,0,0.08)";

const FONT_SIZES = [9, 10, 11, 12, 14, 16, 18, 20, 24, 28, 32];

function RibbonButton({
  active, disabled, onClick, title, children,
}: {
  active?: boolean; disabled?: boolean; onClick: () => void; title: string; children: React.ReactNode;
}) {
  return (
    <button
      type="button"
      title={title}
      disabled={disabled}
      onClick={onClick}
      style={{
        display: "inline-flex", alignItems: "center", justifyContent: "center",
        width: 30, height: 28, borderRadius: 6, border: "1px solid transparent",
        background: active ? `${AZURE}1F` : "transparent",
        color: active ? AZURE : disabled ? "#CBD5E1" : NAVY,
        cursor: disabled ? "default" : "pointer",
      }}
    >
      {children}
    </button>
  );
}

function Divider() {
  return <div style={{ width: 1, alignSelf: "stretch", margin: "4px 6px", background: "rgba(0,0,0,0.08)" }} />;
}

function Dropdown({
  label, width = 150, children,
}: { label: string; width?: number; children: (close: () => void) => React.ReactNode }) {
  const [open, setOpen] = useState(false);
  return (
    <div style={{ position: "relative" }}>
      <button
        type="button"
        onClick={() => setOpen(o => !o)}
        style={{
          display: "inline-flex", alignItems: "center", gap: 4, height: 28, padding: "0 8px",
          borderRadius: 6, border: "1px solid #E2E8F0", background: "#fff",
          color: NAVY, ...GF, fontSize: 12, cursor: "pointer", minWidth: width,
        }}
      >
        <span style={{ flex: 1, textAlign: "left", overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>{label}</span>
        <ChevronDown size={12} color={SILVER} />
      </button>
      {open && (
        <>
          <div style={{ position: "fixed", inset: 0, zIndex: Z.dropdown }} onClick={() => setOpen(false)} />
          <div style={{
            position: "absolute", top: 32, left: 0, zIndex: Z.dropdown + 1, background: "#fff",
            border: BORDER, borderRadius: 8, boxShadow: "0 8px 24px rgba(0,0,0,0.14)",
            minWidth: Math.max(width, 190), maxHeight: 280, overflowY: "auto", padding: 4,
          }}>
            {children(() => setOpen(false))}
          </div>
        </>
      )}
    </div>
  );
}

function DropdownItem({ onClick, children }: { onClick: () => void; children: React.ReactNode }) {
  return (
    <button
      type="button"
      onClick={onClick}
      style={{
        display: "block", width: "100%", textAlign: "left", padding: "6px 8px",
        borderRadius: 5, border: "none", background: "transparent", ...GF, fontSize: 12.5,
        color: NAVY, cursor: "pointer",
      }}
      onMouseEnter={e => { e.currentTarget.style.background = "#F1F5F9"; }}
      onMouseLeave={e => { e.currentTarget.style.background = "transparent"; }}
    >
      {children}
    </button>
  );
}

const FIELD_ANCHOR_TYPES: FieldAnchorType[] = [
  "signature", "initials", "date-signed", "full-name", "text", "email", "title", "company", "checkbox",
];

export function RibbonToolbar({
  editor, variables, placeholders,
}: {
  editor: Editor;
  variables: readonly TemplateVariable[];
  placeholders: readonly TemplateRolePlaceholder[];
}) {
  const currentFamily = (editor.getAttributes("fontFamily").family as DocumentFontFamily | undefined) ?? "times";
  const currentSize = (editor.getAttributes("fontSize").size as number | undefined) ?? 11;
  const headingLevel = ([1, 2, 3] as const).find(l => editor.isActive("heading", { level: l }));

  const setFont = (family: DocumentFontFamily) => editor.chain().focus().setFontFamily(family).run();
  const setSize = (size: number) => editor.chain().focus().setFontSize(size).run();

  const insertVariable = (v: TemplateVariable) =>
    editor.chain().focus().insertVariableRef({ key: v.internalKey, label: v.label }).run();

  const insertFieldForSlot = (fieldType: FieldAnchorType, slot: TemplateRolePlaceholder) => {
    if (!slot.backendSlotId) return;
    editor.chain().focus().insertFieldAnchor({
      fieldType, slotId: slot.backendSlotId, required: true,
      label: `${slot.label} — ${FIELD_ANCHOR_TYPE_LABELS[fieldType]}`,
    }).run();
  };

  const insertFieldForVariable = (fieldType: FieldAnchorType, v: TemplateVariable) => {
    editor.chain().focus().insertFieldAnchor({
      fieldType, variableKey: v.internalKey, required: v.required,
      label: v.label,
    }).run();
  };

  return (
    <div style={{
      display: "flex", alignItems: "center", flexWrap: "wrap", gap: 4,
      padding: "6px 12px", background: "#F8FAFC", borderBottom: BORDER, flexShrink: 0,
    }}>
      <Dropdown label={DOCUMENT_FONT_FAMILY_LABELS[currentFamily]} width={150}>
        {close => (
          <>
            {(Object.keys(DOCUMENT_FONT_FAMILY_LABELS) as DocumentFontFamily[]).map(f => (
              <DropdownItem key={f} onClick={() => { setFont(f); close(); }}>
                {DOCUMENT_FONT_FAMILY_LABELS[f]}
              </DropdownItem>
            ))}
          </>
        )}
      </Dropdown>

      <Dropdown label={`${String(currentSize)} pt`} width={70}>
        {close => (
          <>
            {FONT_SIZES.map(s => (
              <DropdownItem key={s} onClick={() => { setSize(s); close(); }}>{s} pt</DropdownItem>
            ))}
          </>
        )}
      </Dropdown>

      <Divider />

      <RibbonButton title="Bold" active={editor.isActive("bold")} onClick={() => editor.chain().focus().toggleBold().run()}>
        <Bold size={14} />
      </RibbonButton>
      <RibbonButton title="Italic" active={editor.isActive("italic")} onClick={() => editor.chain().focus().toggleItalic().run()}>
        <Italic size={14} />
      </RibbonButton>
      <RibbonButton title="Underline" active={editor.isActive("underline")} onClick={() => editor.chain().focus().toggleUnderline().run()}>
        <UnderlineIcon size={14} />
      </RibbonButton>

      <Divider />

      <RibbonButton title="Align left" active={editor.isActive({ textAlign: "left" }) || (!editor.isActive({ textAlign: "center" }) && !editor.isActive({ textAlign: "right" }) && !editor.isActive({ textAlign: "justify" }))} onClick={() => editor.chain().focus().setTextAlign("left").run()}>
        <AlignLeft size={14} />
      </RibbonButton>
      <RibbonButton title="Center" active={editor.isActive({ textAlign: "center" })} onClick={() => editor.chain().focus().setTextAlign("center").run()}>
        <AlignCenter size={14} />
      </RibbonButton>
      <RibbonButton title="Align right" active={editor.isActive({ textAlign: "right" })} onClick={() => editor.chain().focus().setTextAlign("right").run()}>
        <AlignRight size={14} />
      </RibbonButton>
      <RibbonButton title="Justify" active={editor.isActive({ textAlign: "justify" })} onClick={() => editor.chain().focus().setTextAlign("justify").run()}>
        <AlignJustify size={14} />
      </RibbonButton>

      <Divider />

      <Dropdown label={headingLevel ? `Heading ${String(headingLevel)}` : "Paragraph"} width={110}>
        {close => (
          <>
            <DropdownItem onClick={() => { editor.chain().focus().setParagraph().run(); close(); }}>Paragraph</DropdownItem>
            <DropdownItem onClick={() => { editor.chain().focus().toggleHeading({ level: 1 }).run(); close(); }}>Heading 1</DropdownItem>
            <DropdownItem onClick={() => { editor.chain().focus().toggleHeading({ level: 2 }).run(); close(); }}>Heading 2</DropdownItem>
            <DropdownItem onClick={() => { editor.chain().focus().toggleHeading({ level: 3 }).run(); close(); }}>Heading 3</DropdownItem>
          </>
        )}
      </Dropdown>

      <RibbonButton title="Numbered clause" active={editor.isActive("orderedList")} onClick={() => editor.chain().focus().toggleOrderedList().run()}>
        <ListOrdered size={14} />
      </RibbonButton>

      <Divider />

      <Dropdown label="Insert variable" width={150}>
        {close => variables.length === 0
          ? <div style={{ ...GF, fontSize: 12, color: SILVER, padding: "6px 8px" }}>No variables defined yet.</div>
          : variables.map(v => (
            <DropdownItem key={v.id} onClick={() => { insertVariable(v); close(); }}>
              <span style={{ display: "inline-flex", alignItems: "center", gap: 6 }}><VariableIcon size={12} color={SILVER} />{v.label}</span>
            </DropdownItem>
          ))}
      </Dropdown>

      <Dropdown label="Insert field" width={170}>
        {close => (
          <>
            {FIELD_ANCHOR_TYPES.map(ft => (
              <div key={ft} style={{ marginBottom: 4 }}>
                <div style={{ ...GF, fontSize: 10.5, fontWeight: 700, color: SILVER, textTransform: "uppercase", letterSpacing: "0.05em", padding: "6px 8px 2px" }}>
                  {FIELD_ANCHOR_TYPE_LABELS[ft]}
                </div>
                {placeholders.length === 0 && variables.length === 0 && (
                  <div style={{ ...GF, fontSize: 11.5, color: "#CBD5E1", padding: "2px 8px 6px" }}>No roles or variables yet.</div>
                )}
                {placeholders.map(p => (
                  <DropdownItem key={p.id} onClick={() => { insertFieldForSlot(ft, p); close(); }}>
                    <span style={{ display: "inline-flex", alignItems: "center", gap: 6 }}><PenLine size={12} color={SILVER} />For {p.label}</span>
                  </DropdownItem>
                ))}
                {variables.map(v => (
                  <DropdownItem key={v.id} onClick={() => { insertFieldForVariable(ft, v); close(); }}>
                    <span style={{ display: "inline-flex", alignItems: "center", gap: 6 }}><VariableIcon size={12} color={SILVER} />From {v.label}</span>
                  </DropdownItem>
                ))}
              </div>
            ))}
          </>
        )}
      </Dropdown>

      <RibbonButton title="Page break" onClick={() => editor.chain().focus().insertPageBreak().run()}>
        <FileDown size={14} />
      </RibbonButton>
    </div>
  );
}
