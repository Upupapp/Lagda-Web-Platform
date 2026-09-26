// The "?" on every placed field, and the note it opens.
//
// A field box on a busy page says very little: a colour, an initials pill,
// a truncated label. The badge answers the two questions a sender actually
// has about any one of them — WHO completes this, and what is it FOR — and,
// for a field nobody can complete yet, fixes it in place.
//
//   green  assigned to a participant whose role can complete it (or a
//          sender-supplied field, which needs nobody)
//   red    unassigned, assigned to someone no longer on the document, or to
//          a role that cannot complete that type
//
// ── Placement ──────────────────────────────────────────────────────────────
//
// Centred on the field's top-right corner; for a field too small to share a
// corner (a checkbox) it sits entirely OUTSIDE, above and to the right, so it
// never covers the thing it describes. The visible disc is 16px; the button
// is 24px of transparent hit area around it, so a finger can find it.
//
// ── The bubble ─────────────────────────────────────────────────────────────
//
// `position: fixed`, measured from the badge, then shifted to stay inside the
// viewport and flipped above the badge when there is no room below. It is
// rendered INSIDE the canvas's isolated stacking context (Z.editorCanvas), so
// it paints over fields but always beneath the properties sheet and dialogs.

import { useId, useLayoutEffect, useRef, useState } from "react";
import type { FieldDefinition, ParticipantEditorIdentity } from "../../models/field-editor";
import { FIELD_TYPE_LABELS, FIELD_TYPE_DESCRIPTIONS, FIELD_ELIGIBLE_ROLES } from "../../models/field-editor";
import type { PrepParticipant } from "../../models/prepare";
import { T, TONE, GF } from "../system/design-system";

export type FieldBadgeStatus = "ok" | "unassigned" | "ineligible";

/** Whether a field has somebody who can actually complete it. */
export function fieldBadgeStatus(
  field: Pick<FieldDefinition, "type" | "participantId" | "staticValue">,
  participants: readonly Pick<PrepParticipant, "id" | "role">[],
): FieldBadgeStatus {
  if (field.type === "sender-text") return "ok";
  if (field.staticValue !== undefined && field.staticValue !== null) return "ok";
  if (field.participantId === null) return "unassigned";
  const p = participants.find(x => x.id === field.participantId);
  if (!p || !FIELD_ELIGIBLE_ROLES[field.type].includes(p.role)) return "ineligible";
  return "ok";
}

/** Which ONE field's bubble opens by itself — never more than one. */
export function autoOpenBubbleFor(
  fields: readonly Pick<FieldDefinition, "id" | "type" | "participantId" | "staticValue">[],
  selectedFieldId: string | null,
  participants: readonly Pick<PrepParticipant, "id" | "role">[],
  dismissed: ReadonlySet<string>,
): string | null {
  const red = (f: (typeof fields)[number]) => fieldBadgeStatus(f, participants) !== "ok";
  if (selectedFieldId !== null) {
    const sel = fields.find(f => f.id === selectedFieldId);
    return sel && red(sel) && !dismissed.has(sel.id) ? sel.id : null;
  }
  return fields.find(f => red(f) && !dismissed.has(f.id))?.id ?? null;
}

const HIT = 24;
const DISC = 16;
const BUBBLE_W = 280;
const EDGE = 8;

interface FieldStatusBadgeProps {
  field: FieldDefinition;
  status: FieldBadgeStatus;
  identity: ParticipantEditorIdentity | null;
  participants: readonly PrepParticipant[];
  /** The field's size in CSS pixels, to decide whether it is too small to share a corner. */
  fieldPx: { width: number; height: number };
  open: boolean;
  onToggle: () => void;
  onClose: () => void;
  onAssign: (participantId: string) => void;
  /** Bumped by the canvas on scroll/zoom so an open bubble follows its badge. */
  layoutTick: number;
  /** Stacking inside the canvas (its CANVAS_Z layers), badge and note. */
  zBadge: number;
  zBubble: number;
}

export function FieldStatusBadge({
  field, status, identity, participants, fieldPx, open, onToggle, onClose, onAssign, layoutTick,
  zBadge, zBubble,
}: FieldStatusBadgeProps) {
  const buttonRef = useRef<HTMLButtonElement>(null);
  const bubbleRef = useRef<HTMLDivElement>(null);
  const [pos, setPos] = useState<{ left: number; top: number; placement: "below" | "above" } | null>(null);
  const bubbleId = useId();

  const tiny = fieldPx.width < 56 || fieldPx.height < 30;
  const red = status !== "ok";
  const label = FIELD_TYPE_LABELS[field.type];
  const eligible = participants.filter(p => FIELD_ELIGIBLE_ROLES[field.type].includes(p.role));
  const assignedName = identity?.displayName
    ?? participants.find(p => p.id === field.participantId)?.name
    ?? null;

  const headline = field.type === "sender-text"
    ? `${label} — provided by you`
    : field.staticValue != null && field.participantId === null
      ? `${label} — filled in from the template`
      : status === "ok"
        ? `${label} for ${assignedName ?? "a participant"}`
        : status === "unassigned"
          ? `${label} — Not assigned yet`
          : `${label} — ${assignedName ?? "a removed participant"} can't complete this`;

  useLayoutEffect(() => {
    if (!open) { setPos(null); return; }
    const place = () => {
      const b = buttonRef.current?.getBoundingClientRect();
      if (!b) return;
      const vw = window.innerWidth;
      const vh = window.innerHeight;
      const width = Math.min(BUBBLE_W, vw - EDGE * 2);
      const height = bubbleRef.current?.offsetHeight ?? 120;
      // Right-aligned to the badge, then shifted inside the viewport.
      let left = b.right - width;
      left = Math.max(EDGE, Math.min(left, vw - width - EDGE));
      let top = b.bottom + 4;
      let placement: "below" | "above" = "below";
      if (top + height > vh - EDGE && b.top - 4 - height >= EDGE) {
        top = b.top - 4 - height;
        placement = "above";
      }
      top = Math.max(EDGE, Math.min(top, vh - height - EDGE));
      setPos({ left, top, placement });
    };
    place();
    // A second pass once the bubble has laid out and has a real height.
    const raf = window.requestAnimationFrame(place);
    window.addEventListener("resize", place);
    window.addEventListener("scroll", place, true);
    return () => {
      window.cancelAnimationFrame(raf);
      window.removeEventListener("resize", place);
      window.removeEventListener("scroll", place, true);
    };
  }, [open, layoutTick, field.rect.x, field.rect.y, field.rect.width, field.rect.height]);

  // Esc closes the note, before the editor's own Escape clears the selection.
  useLayoutEffect(() => {
    if (!open) return;
    const onKey = (e: KeyboardEvent) => {
      if (e.key !== "Escape") return;
      e.stopPropagation();
      onClose();
    };
    window.addEventListener("keydown", onKey, true);
    return () => { window.removeEventListener("keydown", onKey, true); };
  }, [open, onClose]);

  const tone = red ? TONE.danger : TONE.success;

  return (
    <>
      <button
        ref={buttonRef}
        type="button"
        data-field-badge={field.id}
        data-status={status}
        aria-label={`About this field: ${headline}`}
        aria-expanded={open}
        aria-controls={open ? bubbleId : undefined}
        onPointerDown={e => { e.stopPropagation(); }}
        onClick={e => { e.stopPropagation(); onToggle(); }}
        style={{
          position: "absolute",
          left: `${(field.rect.x + field.rect.width) * 100}%`,
          top: `${field.rect.y * 100}%`,
          // Centred on the corner, or — for a tiny field — wholly outside it.
          transform: tiny ? "translate(-2px, calc(-100% + 2px))" : "translate(-50%, -50%)",
          zIndex: zBadge,
          width: HIT, height: HIT, padding: 0, margin: 0,
          border: "none", background: "transparent", cursor: "pointer",
          display: "flex", alignItems: "center", justifyContent: "center",
          touchAction: "manipulation",
        }}
      >
        <span aria-hidden="true" style={{
          ...GF,
          width: DISC, height: DISC, borderRadius: "50%",
          background: red ? T.danger : T.success, color: T.surface,
          border: `1.5px solid ${T.surface}`,
          boxShadow: "0 1px 3px rgba(7,17,31,0.35)",
          fontSize: 10.5, fontWeight: 800, lineHeight: 1,
          display: "flex", alignItems: "center", justifyContent: "center",
        }}>?</span>
      </button>

      {open && (
        <div
          ref={bubbleRef}
          id={bubbleId}
          role="dialog"
          aria-modal="false"
          aria-label={`${label} details`}
          data-field-bubble={field.id}
          onPointerDown={e => { e.stopPropagation(); }}
          onClick={e => { e.stopPropagation(); }}
          style={{
            ...GF,
            position: "fixed",
            zIndex: zBubble,
            left: pos?.left ?? -9999,
            top: pos?.top ?? -9999,
            width: `min(${BUBBLE_W}px, calc(100vw - ${EDGE * 2}px))`,
            boxSizing: "border-box",
            visibility: pos ? "visible" : "hidden",
            background: T.surface,
            border: `1px solid ${tone.edge}`,
            borderTop: `3px solid ${red ? T.danger : T.success}`,
            borderRadius: 10,
            boxShadow: "0 10px 28px rgba(7,17,31,0.20)",
            padding: "10px 12px 12px",
            cursor: "default",
            textAlign: "left",
          }}
        >
          <div style={{ display: "flex", alignItems: "flex-start", gap: 8 }}>
            <div style={{ flex: 1, minWidth: 0 }}>
              <div style={{ fontSize: 12.5, fontWeight: 700, color: T.ink, lineHeight: 1.35, overflowWrap: "anywhere" }}>
                {headline}
              </div>
              <div style={{ fontSize: 11.5, color: T.inkSoft, lineHeight: 1.45, marginTop: 3 }}>
                {FIELD_TYPE_DESCRIPTIONS[field.type]}.
              </div>
            </div>
            <button
              type="button"
              onClick={onClose}
              aria-label="Close field details"
              style={{
                width: 24, height: 24, flexShrink: 0, marginTop: -4, marginRight: -6,
                border: "none", background: "transparent", color: T.silver,
                fontSize: 16, lineHeight: 1, cursor: "pointer",
              }}
            >×</button>
          </div>

          {red && (
            <div style={{ marginTop: 9 }}>
              <div style={{ fontSize: 10.5, fontWeight: 700, letterSpacing: "0.05em", textTransform: "uppercase", color: T.silver, marginBottom: 5 }}>
                Assign someone
              </div>
              {eligible.length === 0 ? (
                <div style={{ fontSize: 11.5, color: T.danger, lineHeight: 1.45 }}>
                  Nobody on this document has a role that can complete this field.
                </div>
              ) : (
                <div role="listbox" aria-label="Eligible participants" style={{ display: "flex", flexDirection: "column", gap: 4, maxHeight: 180, overflowY: "auto" }}>
                  {eligible.map(p => (
                    <button
                      key={p.id}
                      type="button"
                      role="option"
                      aria-selected={false}
                      onClick={() => { onAssign(p.id); }}
                      style={{
                        ...GF, display: "flex", alignItems: "center", justifyContent: "space-between", gap: 8,
                        width: "100%", minHeight: 32, padding: "5px 9px", borderRadius: 7,
                        border: `1px solid ${T.borderStrong}`, background: T.surface,
                        color: T.ink, fontSize: 12, fontWeight: 600, cursor: "pointer", textAlign: "left",
                      }}
                    >
                      <span style={{ minWidth: 0, overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>{p.name}</span>
                      <span style={{ fontSize: 10.5, color: T.silver, fontWeight: 500, flexShrink: 0, textTransform: "capitalize" }}>{p.role}</span>
                    </button>
                  ))}
                </div>
              )}
            </div>
          )}
        </div>
      )}
    </>
  );
}

/** The badge's tap target, in CSS pixels. */
export const FIELD_BADGE_HIT_SIZE = HIT;
