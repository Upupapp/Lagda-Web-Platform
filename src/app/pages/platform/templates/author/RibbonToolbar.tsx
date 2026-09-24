// The Pass-1 ribbon: five fonts, bold/italic/underline, size, alignment
// (incl. justify), headings, numbered clauses, page break, insert variable,
// insert signature/date/initials field — and deliberately NOTHING else
// (no color, no highlighting — the contract's own header explains why a
// formal-document tool leaves those out). Tables and the rest of Pass 2 are
// not here yet.
//
// ── `compact` is a phone, and it changes two things ────────────────────────
//
// TOUCH TARGETS. 30x28 is a comfortable mouse target and a frustrating thumb
// one; compact promotes every control to 40x40, which is the platform's own
// floor for a tap.
//
// WHERE A MENU IS POSITIONED. The panels are `position: fixed`, measured from
// their trigger, rather than absolutely positioned inside the ribbon. The
// ribbon is a bounded scroll area on a phone, and an absolute child of a
// scroll container is CLIPPED by it — the font menu opened and was sliced off
// at the toolbar's bottom edge. Fixed also lets a trigger near the right edge
// flip its panel to right-aligned instead of running off-screen.

import { useRef, useState } from "react";
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

/** Roughly what a panel occupies, used only to decide which edge to anchor
 *  it to before it has been rendered and can be measured for real. */
const PANEL_W = 210;

function RibbonButton({
  active, disabled, onClick, title, compact, children,
}: {
  active?: boolean; disabled?: boolean; onClick: () => void; title: string;
  compact: boolean; children: React.ReactNode;
}) {
  return (
    <button
      type="button"
      title={title}
      aria-label={title}
      aria-pressed={active ?? false}
      disabled={disabled}
      onClick={onClick}
      style={{
        display: "inline-flex", alignItems: "center", justifyContent: "center",
        width: compact ? 40 : 30, height: compact ? 40 : 28,
        borderRadius: 7,
        border: active ? `1px solid ${AZURE}44` : "1px solid transparent",
        background: active ? `${AZURE}1F` : "transparent",
        color: active ? AZURE : disabled ? "#CBD5E1" : NAVY,
        cursor: disabled ? "default" : "pointer",
        flexShrink: 0,
      }}
    >
      {children}
    </button>
  );
}

function Divider({ compact }: { compact: boolean }) {
  if (compact) return null;
  return <div style={{ width: 1, alignSelf: "stretch", margin: "4px 6px", background: "rgba(0,0,0,0.08)" }} />;
}

/**
 * One cluster of related controls, which wraps as a UNIT.
 *
 * Without this the ribbon wraps control-by-control, and at 390px that put
 * Underline at the head of the alignment row and left the numbered-clause
 * button alone on a row of its own — every control reachable, and none of
 * them looking like it belonged to anything.
 */
function Group({ compact, children }: { compact: boolean; children: React.ReactNode }) {
  return (
    <div style={{ display: "flex", alignItems: "center", gap: compact ? 6 : 4, flexWrap: "nowrap" }}>
      {children}
    </div>
  );
}

interface PanelPosition {
  top: number;
  left?: number;
  right?: number;
  maxHeight: number;
}

function Dropdown({
  label, width = 150, compact, children,
}: {
  label: string; width?: number; compact: boolean;
  children: (close: () => void) => React.ReactNode;
}) {
  const triggerRef = useRef<HTMLButtonElement>(null);
  const [position, setPosition] = useState<PanelPosition | null>(null);

  const open = () => {
    const rect = triggerRef.current?.getBoundingClientRect();
    if (!rect) return;
    const flipRight = rect.left + PANEL_W > window.innerWidth - 12;
    setPosition({
      top: rect.bottom + 4,
      ...(flipRight
        ? { right: Math.max(12, window.innerWidth - rect.right) }
        : { left: Math.max(12, rect.left) }),
      // Never taller than the room actually below the trigger.
      maxHeight: Math.max(160, window.innerHeight - rect.bottom - 24),
    });
  };

  const close = () => { setPosition(null); };

  return (
    <>
      <button
        ref={triggerRef}
        type="button"
        onClick={() => { if (position) { close(); } else { open(); } }}
        style={{
          display: "inline-flex", alignItems: "center", gap: 4,
          height: compact ? 40 : 28, padding: "0 10px",
          borderRadius: 7, border: "1px solid #E2E8F0", background: "#fff",
          color: NAVY, ...GF, fontSize: compact ? 13 : 12, cursor: "pointer",
          minWidth: width, flexShrink: 0,
        }}
      >
        <span style={{ flex: 1, textAlign: "left", overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>{label}</span>
        <ChevronDown size={12} color={SILVER} style={{ flexShrink: 0 }} />
      </button>
      {position && (
        <>
          <div style={{ position: "fixed", inset: 0, zIndex: Z.dropdown }} onClick={close} />
          <div
            role="menu"
            style={{
              position: "fixed",
              top: position.top,
              ...(position.left === undefined ? {} : { left: position.left }),
              ...(position.right === undefined ? {} : { right: position.right }),
              zIndex: Z.dropdown + 1,
              background: "#fff", border: BORDER, borderRadius: 10,
              boxShadow: "0 12px 32px rgba(7,17,31,0.20)",
              width: "max-content",
              minWidth: Math.max(width, 190),
              maxWidth: "calc(100vw - 24px)",
              maxHeight: position.maxHeight,
              overflowY: "auto",
              padding: 5,
            }}
          >
            {children(close)}
          </div>
        </>
      )}
    </>
  );
}

function DropdownItem({
  onClick, compact, children,
}: { onClick: () => void; compact: boolean; children: React.ReactNode }) {
  return (
    <button
      type="button"
      role="menuitem"
      onClick={onClick}
      style={{
        display: "block", width: "100%", textAlign: "left",
        padding: compact ? "10px 10px" : "6px 8px",
        minHeight: compact ? 40 : undefined,
        borderRadius: 6, border: "none", background: "transparent",
        ...GF, fontSize: compact ? 13.5 : 12.5, color: NAVY, cursor: "pointer",
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
  editor, variables, placeholders, compact = false,
}: {
  editor: Editor;
  variables: readonly TemplateVariable[];
  placeholders: readonly TemplateRolePlaceholder[];
  compact?: boolean;
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
      display: "flex", alignItems: "center", flexWrap: "wrap",
      gap: compact ? 6 : 4,
      padding: compact ? "10px 12px" : "6px 12px",
      background: "#F8FAFC", borderBottom: BORDER, flexShrink: 0,
    }}>
      <Group compact={compact}>
        <Dropdown label={DOCUMENT_FONT_FAMILY_LABELS[currentFamily]} width={compact ? 132 : 150} compact={compact}>
          {close => (
            <>
              {(Object.keys(DOCUMENT_FONT_FAMILY_LABELS) as DocumentFontFamily[]).map(f => (
                <DropdownItem key={f} compact={compact} onClick={() => { setFont(f); close(); }}>
                  {DOCUMENT_FONT_FAMILY_LABELS[f]}
                </DropdownItem>
              ))}
            </>
          )}
        </Dropdown>

        <Dropdown label={`${String(currentSize)} pt`} width={compact ? 74 : 70} compact={compact}>
          {close => (
            <>
              {FONT_SIZES.map(s => (
                <DropdownItem key={s} compact={compact} onClick={() => { setSize(s); close(); }}>{s} pt</DropdownItem>
              ))}
            </>
          )}
        </Dropdown>
      </Group>

      <Divider compact={compact} />

      <Group compact={compact}>
        <RibbonButton title="Bold" compact={compact} active={editor.isActive("bold")} onClick={() => editor.chain().focus().toggleBold().run()}>
          <Bold size={compact ? 16 : 14} />
        </RibbonButton>
        <RibbonButton title="Italic" compact={compact} active={editor.isActive("italic")} onClick={() => editor.chain().focus().toggleItalic().run()}>
          <Italic size={compact ? 16 : 14} />
        </RibbonButton>
        <RibbonButton title="Underline" compact={compact} active={editor.isActive("underline")} onClick={() => editor.chain().focus().toggleUnderline().run()}>
          <UnderlineIcon size={compact ? 16 : 14} />
        </RibbonButton>
      </Group>

      <Divider compact={compact} />

      <Group compact={compact}>
        <RibbonButton title="Align left" compact={compact} active={editor.isActive({ textAlign: "left" }) || (!editor.isActive({ textAlign: "center" }) && !editor.isActive({ textAlign: "right" }) && !editor.isActive({ textAlign: "justify" }))} onClick={() => editor.chain().focus().setTextAlign("left").run()}>
          <AlignLeft size={compact ? 16 : 14} />
        </RibbonButton>
        <RibbonButton title="Center" compact={compact} active={editor.isActive({ textAlign: "center" })} onClick={() => editor.chain().focus().setTextAlign("center").run()}>
          <AlignCenter size={compact ? 16 : 14} />
        </RibbonButton>
        <RibbonButton title="Align right" compact={compact} active={editor.isActive({ textAlign: "right" })} onClick={() => editor.chain().focus().setTextAlign("right").run()}>
          <AlignRight size={compact ? 16 : 14} />
        </RibbonButton>
        <RibbonButton title="Justify" compact={compact} active={editor.isActive({ textAlign: "justify" })} onClick={() => editor.chain().focus().setTextAlign("justify").run()}>
          <AlignJustify size={compact ? 16 : 14} />
        </RibbonButton>
      </Group>

      <Divider compact={compact} />

      <Group compact={compact}>
        <Dropdown label={headingLevel ? `Heading ${String(headingLevel)}` : "Paragraph"} width={compact ? 116 : 110} compact={compact}>
          {close => (
            <>
              <DropdownItem compact={compact} onClick={() => { editor.chain().focus().setParagraph().run(); close(); }}>Paragraph</DropdownItem>
              <DropdownItem compact={compact} onClick={() => { editor.chain().focus().toggleHeading({ level: 1 }).run(); close(); }}>Heading 1</DropdownItem>
              <DropdownItem compact={compact} onClick={() => { editor.chain().focus().toggleHeading({ level: 2 }).run(); close(); }}>Heading 2</DropdownItem>
              <DropdownItem compact={compact} onClick={() => { editor.chain().focus().toggleHeading({ level: 3 }).run(); close(); }}>Heading 3</DropdownItem>
            </>
          )}
        </Dropdown>

        <RibbonButton title="Numbered clause" compact={compact} active={editor.isActive("orderedList")} onClick={() => editor.chain().focus().toggleOrderedList().run()}>
          <ListOrdered size={compact ? 16 : 14} />
        </RibbonButton>
      </Group>

      <Divider compact={compact} />

      <Group compact={compact}>
        <Dropdown label="Insert variable" width={compact ? 132 : 150} compact={compact}>
          {close => variables.length === 0
            ? <div style={{ ...GF, fontSize: 12, color: SILVER, padding: "8px 10px" }}>No variables defined yet.</div>
            : variables.map(v => (
              <DropdownItem key={v.id} compact={compact} onClick={() => { insertVariable(v); close(); }}>
                <span style={{ display: "inline-flex", alignItems: "center", gap: 6 }}><VariableIcon size={12} color={SILVER} />{v.label}</span>
              </DropdownItem>
            ))}
        </Dropdown>

        <Dropdown label="Insert field" width={compact ? 120 : 170} compact={compact}>
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
                    <DropdownItem key={p.id} compact={compact} onClick={() => { insertFieldForSlot(ft, p); close(); }}>
                      <span style={{ display: "inline-flex", alignItems: "center", gap: 6 }}><PenLine size={12} color={SILVER} />For {p.label}</span>
                    </DropdownItem>
                  ))}
                  {variables.map(v => (
                    <DropdownItem key={v.id} compact={compact} onClick={() => { insertFieldForVariable(ft, v); close(); }}>
                      <span style={{ display: "inline-flex", alignItems: "center", gap: 6 }}><VariableIcon size={12} color={SILVER} />From {v.label}</span>
                    </DropdownItem>
                  ))}
                </div>
              ))}
            </>
          )}
        </Dropdown>

        <RibbonButton title="Page break" compact={compact} onClick={() => editor.chain().focus().insertPageBreak().run()}>
          <FileDown size={compact ? 16 : 14} />
        </RibbonButton>
      </Group>
    </div>
  );
}
