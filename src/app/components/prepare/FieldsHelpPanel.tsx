// The Place Fields editor's own Help button and guide.
//
// The cross-step Preparation guide (PreparationHelpFab) cannot serve this
// step: the editor is a full-screen `position: fixed` surface at Z.drawer and
// the wizard's FAB sits beneath it at Z.helpFab, invisible. That FAB now
// stands down on this route (see PreparationHelpFab), and this one — living
// INSIDE the editor — takes its place, so there is exactly one Help button.
//
//   ≥ 768px  a side panel docked right, over a light scrim
//   < 768px  a bottom sheet
//
// Both are dialogs: Esc and tap-outside close them, focus moves to the close
// button on open and back to the FAB on close, and Tab stays inside.
//
// The keyboard section is GENERATED from FIELD_EDITOR_SHORTCUTS and
// CANVAS_NUDGE_SHORTCUTS — the same table the key handler reads — and the
// Validate section from FIELD_ISSUE_GUIDE, which the Validation panel's fix
// buttons read. Neither list can drift from what the editor actually does.

import { useEffect, useId, useRef, type CSSProperties, type KeyboardEvent as ReactKeyboardEvent, type ReactNode } from "react";
import { HelpCircle, X } from "lucide-react";
import { Z } from "../../utils/z-index";
import { T, GF, TONE } from "../system/design-system";
import { FIELD_EDITOR_SHORTCUTS, CANVAS_NUDGE_SHORTCUTS } from "../../hooks/useFieldEditorShortcuts";
import { FIELD_ISSUE_GUIDE } from "./field-issue-guide";
import { FIELD_ISSUE_CODES } from "../../models/field-editor";

const FOCUSABLE =
  'a[href], button:not([disabled]), input:not([disabled]), select:not([disabled]), textarea:not([disabled]), [tabindex]:not([tabindex="-1"])';

export const FIELDS_HELP_SIDE_MIN_WIDTH = 768;

/** Every keyboard row the panel shows, in order — exported for the drift test. */
export function helpShortcutRows(): { id: string; keys: string; description: string }[] {
  return [
    ...FIELD_EDITOR_SHORTCUTS.map(b => ({ id: b.id, keys: b.display.join(" + "), description: b.description })),
    ...CANVAS_NUDGE_SHORTCUTS.map(b => ({
      id: b.id,
      keys: b.id === "nudge" ? b.display.join(" ") : b.display.join(" + "),
      description: b.description,
    })),
  ];
}

function Section({ title, children }: { title: string; children: ReactNode }) {
  return (
    <section style={{ marginBottom: 18 }}>
      <h3 style={{ ...GF, margin: "0 0 6px", fontSize: 13.5, fontWeight: 800, color: T.ink }}>{title}</h3>
      <div style={{ ...GF, fontSize: 12.75, lineHeight: 1.55, color: T.inkSoft }}>{children}</div>
    </section>
  );
}

const P = ({ children }: { children: ReactNode }) => <p style={{ margin: "0 0 6px" }}>{children}</p>;

function Kbd({ children }: { children: ReactNode }) {
  return (
    <kbd style={{
      ...GF, display: "inline-block", minWidth: 18, padding: "1px 6px", borderRadius: 5,
      border: `1px solid ${T.borderStrong}`, borderBottomWidth: 2, background: T.canvas,
      fontSize: 11, fontWeight: 700, color: T.ink, textAlign: "center", whiteSpace: "nowrap",
    }}>{children}</kbd>
  );
}

function HelpBody() {
  return (
    <>
      <Section title="Adding fields">
        <P>Press <strong>+ Add Field</strong> to choose a field type, a participant and a region of the page, or pick a type under <strong>Field Types</strong> in the side panel (on a phone: the menu, then <em>Field types</em>).</P>
        <P>After choosing a type the page is armed: <em>“Click anywhere on the page to place a … field.”</em> Click or tap where it belongs. Press <Kbd>Esc</Kbd> or Cancel to stop.</P>
      </Section>

      <Section title="Moving & resizing">
        <P>Drag a field to move it. When it is selected, drag one of its eight square handles to resize it.</P>
        <P>On a phone, open <strong>Properties</strong> for the selected field and use the <strong>Nudge</strong> pad — each press moves the field a fraction of a millimetre, for landing it exactly on a line.</P>
      </Section>

      <Section title="Assigning people">
        <P>Each field belongs to one participant, chosen under <strong>Participant</strong> in Field Properties. Only roles that can complete a field type are offered — a Signature over Name is for signers, a Reviewed over Name for reviewers, an Approved over Name for approvers.</P>
      </Section>

      <Section title="The question-mark badges">
        <P>Every field has a small <strong>?</strong> at its top-right corner. <span style={{ color: T.success, fontWeight: 700 }}>Green</span> means it is assigned to someone who can complete it; <span style={{ color: T.danger, fontWeight: 700 }}>red</span> means nobody can yet.</P>
        <P>Select a badge to see what the field is for and who completes it. On a red one, <strong>Assign someone</strong> lists the participants who can — choose one to fix it.</P>
      </Section>

      <Section title="Validate & Auto-fix">
        <P>Press <strong>Validate</strong> to check the placement. Errors stop you continuing; warnings do not. Where a fix is safe, the issue offers one:</P>
        <ul style={{ margin: "4px 0 0", padding: 0, listStyle: "none", display: "flex", flexDirection: "column", gap: 6 }}>
          {FIELD_ISSUE_CODES.map(code => {
            const g = FIELD_ISSUE_GUIDE[code];
            const tone = g.severity === "error" ? TONE.danger : TONE.warn;
            return (
              <li key={code} data-issue-code={code} style={{ padding: "7px 9px", borderRadius: 8, background: tone.wash, border: `1px solid ${tone.edge}` }}>
                <div style={{ fontWeight: 700, color: T.ink, fontSize: 12.25 }}>
                  {g.title} <span style={{ fontWeight: 600, fontSize: 10.5, color: tone.fg, textTransform: "uppercase", letterSpacing: "0.04em" }}>· {g.severity}</span>
                </div>
                <div style={{ fontSize: 12 }}>{g.meaning}</div>
                {g.fixLabel !== null && g.fixDoes !== null && (
                  <div style={{ fontSize: 12, marginTop: 2 }}><strong>{g.fixLabel}:</strong> {g.fixDoes}</div>
                )}
              </li>
            );
          })}
        </ul>
      </Section>

      <Section title="Auto-placement & Undo">
        <P>The first time you open Place Fields for a document, LAGDA adds a <strong>Signature over Name</strong> for every signer and a <strong>Reviewed over Name</strong> for every reviewer who has none, side by side at the bottom of the last page, without covering anything already there. Approvers get nothing automatically.</P>
        <P>A notice says what was placed — press <strong>Undo</strong> on it to remove exactly those fields. It never runs again for the same document, so a field you delete stays deleted.</P>
        <P><strong>Place fields for everyone</strong> in the toolbar adds only what is still missing, and can also add an optional <strong>Approved over Name</strong> for each approver.</P>
      </Section>

      <Section title="Keyboard shortcuts">
        <table style={{ width: "100%", borderCollapse: "collapse" }} aria-label="Keyboard shortcuts">
          <tbody>
            {helpShortcutRows().map(row => (
              <tr key={row.id} data-shortcut-id={row.id} style={{ borderTop: `1px solid ${T.border}` }}>
                <td style={{ padding: "5px 8px 5px 0", whiteSpace: "nowrap", verticalAlign: "top" }}>
                  <Kbd>{row.keys}</Kbd>
                </td>
                <td style={{ padding: "5px 0", fontSize: 12.25 }}>{row.description}</td>
              </tr>
            ))}
          </tbody>
        </table>
        <P><span style={{ fontSize: 11.5, color: T.silver }}>On a Mac, ⌘ works wherever Ctrl is shown. Shortcuts pause while you type in a box.</span></P>
      </Section>
    </>
  );
}

interface FieldsHelpPanelProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  /** "side" at ≥768px, "sheet" below. */
  mode: "side" | "sheet";
  /** Positioning for the FAB (it is placed inside the editor's main area). */
  fabStyle: CSSProperties;
  /** Hide the FAB (e.g. while the phone properties sheet is open). */
  fabHidden?: boolean;
}

export function FieldsHelpPanel({ open, onOpenChange, mode, fabStyle, fabHidden = false }: FieldsHelpPanelProps) {
  const fabRef = useRef<HTMLButtonElement>(null);
  const closeRef = useRef<HTMLButtonElement>(null);
  const surfaceRef = useRef<HTMLDivElement>(null);
  const wasOpen = useRef(false);
  const titleId = useId();

  useEffect(() => {
    if (open) closeRef.current?.focus();
    else if (wasOpen.current) fabRef.current?.focus();
    wasOpen.current = open;
  }, [open]);

  // Capture phase on window, and stopped there: the editor's own Escape
  // (clear the selection) listens on document and must not also fire.
  useEffect(() => {
    if (!open) return;
    const onKey = (e: KeyboardEvent) => {
      if (e.key !== "Escape") return;
      e.preventDefault();
      e.stopPropagation();
      onOpenChange(false);
    };
    window.addEventListener("keydown", onKey, true);
    return () => { window.removeEventListener("keydown", onKey, true); };
  }, [open, onOpenChange]);

  const trapTab = (e: ReactKeyboardEvent<HTMLDivElement>) => {
    if (e.key !== "Tab" || !surfaceRef.current) return;
    const items = Array.from(surfaceRef.current.querySelectorAll<HTMLElement>(FOCUSABLE));
    const first = items[0];
    const last = items[items.length - 1];
    if (!first || !last) return;
    if (e.shiftKey && document.activeElement === first) { e.preventDefault(); last.focus(); }
    else if (!e.shiftKey && document.activeElement === last) { e.preventDefault(); first.focus(); }
  };

  const side = mode === "side";

  return (
    <>
      {!fabHidden && (
        <button
          ref={fabRef}
          type="button"
          aria-label={open ? "Close the Place Fields guide" : "Open the Place Fields guide"}
          aria-expanded={open}
          aria-haspopup="dialog"
          onClick={() => { onOpenChange(!open); }}
          className="fields-help-fab"
          style={{
            position: "absolute",
            zIndex: Z.editorControls,
            width: 44, height: 44, borderRadius: "50%",
            border: "none", background: T.ink, color: T.surface,
            display: "flex", alignItems: "center", justifyContent: "center",
            cursor: "pointer", boxShadow: "0 6px 20px rgba(7,17,31,0.28)",
            ...fabStyle,
          }}
        >
          <HelpCircle size={22} strokeWidth={2} aria-hidden />
        </button>
      )}

      {open && (
        <>
          <div
            aria-hidden
            data-testid="fields-help-scrim"
            onClick={() => { onOpenChange(false); }}
            style={{
              position: "fixed", inset: 0, zIndex: Z.modalScrim,
              background: side ? "rgba(7,17,31,0.18)" : "rgba(7,17,31,0.45)",
            }}
          />
          <div
            ref={surfaceRef}
            role="dialog"
            aria-modal="true"
            aria-labelledby={titleId}
            data-testid="fields-help-panel"
            onKeyDown={trapTab}
            style={{
              ...GF,
              position: "fixed", zIndex: Z.modal,
              background: T.surface, boxSizing: "border-box",
              display: "flex", flexDirection: "column",
              ...(side
                ? {
                    top: 0, right: 0, bottom: 0, width: "min(400px, 100vw)",
                    borderLeft: `1px solid ${T.border}`,
                    boxShadow: "-10px 0 30px rgba(7,17,31,0.14)",
                  }
                : {
                    left: 0, right: 0, bottom: 0, maxHeight: "82vh",
                    borderRadius: "16px 16px 0 0",
                    boxShadow: "0 -8px 28px rgba(7,17,31,0.22)",
                    paddingBottom: "env(safe-area-inset-bottom, 0px)",
                  }),
            }}
          >
            {!side && (
              <div aria-hidden style={{ display: "flex", justifyContent: "center", padding: "8px 0 0" }}>
                <div style={{ width: 36, height: 4, borderRadius: 2, background: T.borderStrong }} />
              </div>
            )}
            <div style={{ display: "flex", alignItems: "flex-start", justifyContent: "space-between", gap: 12, padding: "14px 18px 12px", borderBottom: `1px solid ${T.border}`, flexShrink: 0 }}>
              <div style={{ minWidth: 0 }}>
                <p style={{ margin: 0, fontSize: 11.5, fontWeight: 700, letterSpacing: "0.05em", textTransform: "uppercase", color: T.azure }}>
                  Guide
                </p>
                <h2 id={titleId} style={{ margin: "2px 0 0", fontSize: 17, fontWeight: 800, color: T.ink }}>
                  Placing fields
                </h2>
              </div>
              <button
                ref={closeRef}
                type="button"
                onClick={() => { onOpenChange(false); }}
                aria-label="Close guide"
                style={{
                  width: 40, height: 40, flexShrink: 0, borderRadius: 10,
                  display: "inline-flex", alignItems: "center", justifyContent: "center",
                  background: T.canvas, border: `1px solid ${T.border}`, cursor: "pointer", color: T.ink,
                }}
              >
                <X size={18} aria-hidden />
              </button>
            </div>
            <div style={{ overflowY: "auto", padding: "14px 18px 20px", minHeight: 0, flex: 1 }}>
              <HelpBody />
            </div>
          </div>
        </>
      )}
      <style>{".fields-help-fab:hover { filter: brightness(1.12); }"}</style>
    </>
  );
}
