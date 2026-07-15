// Field-placement editor domain models for /app/prepare/fields.
// All coordinates are NORMALIZED (0–1) relative to the logical page dimensions.
// Frontend-only: no PDF parsing, no real upload, no real signing, no real modification.
// Burgundy (#67023B) is NEVER used here — it is eNotary-only.

import type { PrepParticipantRole } from "./prepare";

// ── Identity types ────────────────────────────────────────────────────────────

export type FieldId          = string;
export type EditorDocumentId = string;
export type EditorPageId     = string;

export function makeFieldId(): FieldId {
  return `field_${Date.now()}_${Math.random().toString(36).slice(2, 6)}`;
}

// ── Field types ───────────────────────────────────────────────────────────────
// No eNotary fields, no notarial seals, no password/OTP fields.

export type FieldType =
  | "signature"
  | "initials"
  | "full-name"
  | "date-signed"
  | "text"
  | "multiline-text"
  | "checkbox"
  | "radio-group"
  | "email"
  | "title"
  | "company"
  | "acknowledgment"
  | "sender-text";

// ── Editor interaction modes ──────────────────────────────────────────────────

export type EditorMode =
  | "select"
  | "place-field"
  | "keyboard-place"
  | "field-list";

export type EditorSaveState =
  | "idle"
  | "saved-in-session"
  | "unsaved-changes"
  | "error";

export type EditorLoadState =
  | "initializing"
  | "ready"
  | "error"
  | "draft-unavailable"
  | "document-unavailable"
  | "permission-denied";

// ── Normalized coordinates ────────────────────────────────────────────────────
// x, y, width, height are all 0–1 relative to page dimensions.
// x=0, y=0 is the top-left of the page.
// Conversion to pixels: pixelX = rect.x * pageWidthPx; etc.

export interface NormalizedRect {
  x:      number; // 0–1 from left edge
  y:      number; // 0–1 from top edge
  width:  number; // 0–1 of page width
  height: number; // 0–1 of page height
}

// ── Field size constraints ────────────────────────────────────────────────────
// Normalized values; page is A4 portrait (595x842 CSS px at 100% zoom).
// Width relative to page width (595); height relative to page height (842).

export interface FieldSizeConstraints {
  defaultWidth:  number;
  defaultHeight: number;
  minWidth:      number;
  minHeight:     number;
  maxWidth:      number;
  maxHeight:     number;
  resizable:     boolean;
}

// At 100% zoom: A4 portrait = 595 x 842 CSS px
// checkbox 24×24px → w=24/595≈0.040, h=24/842≈0.028
export const FIELD_SIZE_CONSTRAINTS: Record<FieldType, FieldSizeConstraints> = {
  "signature":      { defaultWidth: 0.302, defaultHeight: 0.059, minWidth: 0.10,  minHeight: 0.030, maxWidth: 0.65, maxHeight: 0.130, resizable: true  },
  "initials":       { defaultWidth: 0.118, defaultHeight: 0.047, minWidth: 0.060, minHeight: 0.030, maxWidth: 0.25, maxHeight: 0.090, resizable: true  },
  "full-name":      { defaultWidth: 0.336, defaultHeight: 0.036, minWidth: 0.15,  minHeight: 0.024, maxWidth: 0.75, maxHeight: 0.060, resizable: true  },
  "date-signed":    { defaultWidth: 0.218, defaultHeight: 0.036, minWidth: 0.12,  minHeight: 0.024, maxWidth: 0.42, maxHeight: 0.060, resizable: true  },
  "text":           { defaultWidth: 0.336, defaultHeight: 0.036, minWidth: 0.10,  minHeight: 0.024, maxWidth: 0.80, maxHeight: 0.060, resizable: true  },
  "multiline-text": { defaultWidth: 0.437, defaultHeight: 0.095, minWidth: 0.15,  minHeight: 0.060, maxWidth: 0.85, maxHeight: 0.280, resizable: true  },
  "checkbox":       { defaultWidth: 0.040, defaultHeight: 0.028, minWidth: 0.030, minHeight: 0.021, maxWidth: 0.09, maxHeight: 0.064, resizable: false },
  "radio-group":    { defaultWidth: 0.302, defaultHeight: 0.083, minWidth: 0.15,  minHeight: 0.050, maxWidth: 0.65, maxHeight: 0.250, resizable: true  },
  "email":          { defaultWidth: 0.336, defaultHeight: 0.036, minWidth: 0.15,  minHeight: 0.024, maxWidth: 0.75, maxHeight: 0.060, resizable: true  },
  "title":          { defaultWidth: 0.252, defaultHeight: 0.036, minWidth: 0.10,  minHeight: 0.024, maxWidth: 0.55, maxHeight: 0.060, resizable: true  },
  "company":        { defaultWidth: 0.302, defaultHeight: 0.036, minWidth: 0.10,  minHeight: 0.024, maxWidth: 0.65, maxHeight: 0.060, resizable: true  },
  "acknowledgment": { defaultWidth: 0.504, defaultHeight: 0.042, minWidth: 0.20,  minHeight: 0.028, maxWidth: 0.85, maxHeight: 0.090, resizable: true  },
  "sender-text":    { defaultWidth: 0.403, defaultHeight: 0.036, minWidth: 0.10,  minHeight: 0.024, maxWidth: 0.85, maxHeight: 0.180, resizable: true  },
};

// ── Field type display metadata ───────────────────────────────────────────────

export const FIELD_TYPE_LABELS: Record<FieldType, string> = {
  "signature":      "Signature",
  "initials":       "Initials",
  "full-name":      "Full Name",
  "date-signed":    "Date Signed",
  "text":           "Text",
  "multiline-text": "Multiline Text",
  "checkbox":       "Checkbox",
  "radio-group":    "Radio Group",
  "email":          "Email",
  "title":          "Title / Position",
  "company":        "Company",
  "acknowledgment": "Acknowledgment",
  "sender-text":    "Sender Text",
};

export const FIELD_TYPE_ICONS: Record<FieldType, string> = {
  "signature":      "✍",
  "initials":       "Ii",
  "full-name":      "Aa",
  "date-signed":    "📅",
  "text":           "T",
  "multiline-text": "¶",
  "checkbox":       "☑",
  "radio-group":    "◉",
  "email":          "@",
  "title":          "Ti",
  "company":        "🏢",
  "acknowledgment": "✓",
  "sender-text":    "S",
};

export const FIELD_TYPE_DESCRIPTIONS: Record<FieldType, string> = {
  "signature":      "Participant handwritten or typed signature",
  "initials":       "Participant initials on a page",
  "full-name":      "Participant's legal full name",
  "date-signed":    "Date recorded when participant completes this field",
  "text":           "Single-line text entry",
  "multiline-text": "Multi-line text entry",
  "checkbox":       "Boolean checkbox — checked or unchecked",
  "radio-group":    "Select one option from a defined group",
  "email":          "Participant's email address",
  "title":          "Participant's job title or position",
  "company":        "Participant's organisation name",
  "acknowledgment": "Required explicit acknowledgment by the participant",
  "sender-text":    "Read-only text you provide; visible to all recipients",
};

// "plan-required: null" = available on all plans (demonstration)
export type FieldPlanTier = "all" | "standard" | "enterprise" | "planned";
export const FIELD_PLAN_TIER: Record<FieldType, FieldPlanTier> = {
  "signature":      "all",
  "initials":       "all",
  "full-name":      "all",
  "date-signed":    "all",
  "text":           "all",
  "multiline-text": "all",
  "checkbox":       "all",
  "radio-group":    "standard",
  "email":          "all",
  "title":          "all",
  "company":        "all",
  "acknowledgment": "all",
  "sender-text":    "all",
};

export const FIELD_TYPE_GROUPS: { label: string; types: FieldType[] }[] = [
  { label: "Signature & Identity",  types: ["signature", "initials", "full-name", "date-signed"] },
  { label: "Data Entry",            types: ["text", "multiline-text", "checkbox", "radio-group"] },
  { label: "Participant Details",   types: ["email", "title", "company"] },
  { label: "Acknowledgment",        types: ["acknowledgment"] },
  { label: "Sender Content",        types: ["sender-text"] },
];

// ── Role/field compatibility ──────────────────────────────────────────────────
// sender-text is not assigned to participants — it is sender-only.

export const FIELD_ELIGIBLE_ROLES: Record<FieldType, PrepParticipantRole[]> = {
  "signature":      ["signer"],
  "initials":       ["signer", "approver"],
  "full-name":      ["signer", "approver", "reviewer", "acknowledgment-recipient"],
  "date-signed":    ["signer", "approver"],
  "text":           ["signer", "approver", "reviewer", "acknowledgment-recipient"],
  "multiline-text": ["signer", "approver", "reviewer"],
  "checkbox":       ["signer", "approver", "reviewer", "acknowledgment-recipient"],
  "radio-group":    ["signer", "approver", "reviewer", "acknowledgment-recipient"],
  "email":          ["signer", "approver"],
  "title":          ["signer", "approver"],
  "company":        ["signer", "approver"],
  "acknowledgment": ["signer", "approver", "reviewer", "acknowledgment-recipient"],
  "sender-text":    [],  // sender-only; no participant assignment
};

export function isRoleEligibleForField(role: PrepParticipantRole, type: FieldType): boolean {
  return FIELD_ELIGIBLE_ROLES[type].includes(role);
}

// ── Participant visual identity ───────────────────────────────────────────────
// Color is supplemental — labels and initials are the primary identifier.

export const PARTICIPANT_ACCENT_COLORS = [
  "#2E7BB5",  // Blue
  "#5C6BC0",  // Indigo
  "#0F9D9D",  // Teal
  "#4CAF7D",  // Green
  "#F4A261",  // Orange
  "#7B5EA7",  // Purple
  "#546E7A",  // Blue-grey
  "#8D6048",  // Brown
];

export interface ParticipantEditorIdentity {
  participantId: string;
  index:         number;
  label:         string;   // "P1", "P2", …
  initials:      string;   // "AR", "MS", …
  colorHex:      string;   // supplemental only
  displayName:   string;
  role:          PrepParticipantRole;
}

export function buildParticipantIdentity(
  participantId: string,
  index: number,
  name: string,
  role: PrepParticipantRole,
): ParticipantEditorIdentity {
  const words    = name.trim().split(/\s+/).filter(Boolean);
  const initials = words.length >= 2
    ? (words[0]![0]! + words[words.length - 1]![0]!).toUpperCase()
    : (words[0]?.slice(0, 2) ?? "??").toUpperCase();
  return {
    participantId,
    index,
    label:       `P${index + 1}`,
    initials,
    colorHex:    PARTICIPANT_ACCENT_COLORS[index % PARTICIPANT_ACCENT_COLORS.length]!,
    displayName: name || `Participant ${index + 1}`,
    role,
  };
}

// ── Radio option ──────────────────────────────────────────────────────────────

export interface RadioOption {
  id:    string;
  label: string;
}

// ── Field definition ──────────────────────────────────────────────────────────

export interface FieldDefinition {
  id:            FieldId;
  type:          FieldType;
  documentId:    EditorDocumentId;
  pageId:        EditorPageId;
  rect:          NormalizedRect;
  participantId: string | null;   // null = sender field or unassigned
  label:         string;
  required:      boolean;
  layer:         number;          // z-order; higher = on top
  placeholder?:  string;
  multiline?:    boolean;
  requiredChecked?: boolean;
  radioGroupId?: string;
  radioOptions?: RadioOption[];
  senderText?:   string;
  demonstrationOnly: true;
}

// ── Editor page and document ──────────────────────────────────────────────────

export interface EditorPage {
  id:          EditorPageId;
  documentId:  EditorDocumentId;
  pageNumber:  number;
  aspectRatio: number;   // width / height; A4 portrait ≈ 0.7068
  label:       string;
}

export interface EditorDocument {
  id:          EditorDocumentId;
  prepFileId:  string;  // references PrepFile.id
  displayName: string;
  pageCount:   number;
  pages:       EditorPage[];
}

// ── Editor history ─────────────────────────────────────────────────────────────

export interface EditorHistoryEntry {
  fields:      FieldDefinition[];
  description: string;
}

export const EDITOR_HISTORY_LIMIT = 50;

// ── Validation ─────────────────────────────────────────────────────────────────

export interface FieldValidationIssue {
  id:            string;
  severity:      "error" | "warning";
  code:          string;
  message:       string;
  fieldId?:      FieldId;
  documentId?:   EditorDocumentId;
  pageId?:       EditorPageId;
  participantId?: string;
  suggestion?:   string;
}

export interface ParticipantFieldCoverage {
  participantId:     string;
  name:              string;
  role:              PrepParticipantRole;
  fieldCount:        number;
  requiredFieldCount: number;
  hasSignature:      boolean;
  issues:            FieldValidationIssue[];
  isSatisfied:       boolean;
}

export interface FieldPlacementValidation {
  isValid:            boolean;
  readyToContinue:    boolean;
  errors:             FieldValidationIssue[];
  warnings:           FieldValidationIssue[];
  participantCoverage: ParticipantFieldCoverage[];
  totalFieldCount:    number;
  unassignedCount:    number;
  documentIds:        EditorDocumentId[];
}

// ── Coordinate utilities ──────────────────────────────────────────────────────

export function defaultFieldRect(
  type:   FieldType,
  clickX = 0.35,
  clickY = 0.35,
): NormalizedRect {
  const c = FIELD_SIZE_CONSTRAINTS[type];
  const x = Math.max(0, Math.min(1 - c.defaultWidth,  clickX - c.defaultWidth  / 2));
  const y = Math.max(0, Math.min(1 - c.defaultHeight, clickY - c.defaultHeight / 2));
  return { x, y, width: c.defaultWidth, height: c.defaultHeight };
}

export function clampRect(rect: NormalizedRect, type: FieldType): NormalizedRect {
  const c = FIELD_SIZE_CONSTRAINTS[type];
  const width  = Math.max(c.minWidth,  Math.min(c.maxWidth,  rect.width));
  const height = Math.max(c.minHeight, Math.min(c.maxHeight, rect.height));
  const x      = Math.max(0, Math.min(1 - width,  rect.x));
  const y      = Math.max(0, Math.min(1 - height, rect.y));
  return { x, y, width, height };
}

export function clampMoveRect(rect: NormalizedRect): NormalizedRect {
  return {
    ...rect,
    x: Math.max(0, Math.min(1 - rect.width,  rect.x)),
    y: Math.max(0, Math.min(1 - rect.height, rect.y)),
  };
}

// Detect meaningful overlap (> 20% shared area of the smaller field)
export function detectOverlap(a: NormalizedRect, b: NormalizedRect): boolean {
  const overlapX = Math.max(0, Math.min(a.x + a.width,  b.x + b.width)  - Math.max(a.x, b.x));
  const overlapY = Math.max(0, Math.min(a.y + a.height, b.y + b.height) - Math.max(a.y, b.y));
  if (overlapX <= 0 || overlapY <= 0) return false;
  const overlapArea = overlapX * overlapY;
  const minArea     = Math.min(a.width * a.height, b.width * b.height);
  return minArea > 0 && overlapArea / minArea > 0.20;
}

// Safe margin: 3% from each edge is the guidance zone (editor hint only, not a legal/printing guarantee)
export const SAFE_MARGIN = 0.03;

export function isNearPageEdge(rect: NormalizedRect): boolean {
  return (
    rect.x < SAFE_MARGIN ||
    rect.y < SAFE_MARGIN ||
    rect.x + rect.width  > 1 - SAFE_MARGIN ||
    rect.y + rect.height > 1 - SAFE_MARGIN
  );
}

// ── Resize handles ─────────────────────────────────────────────────────────────

export type ResizeHandle = "nw" | "n" | "ne" | "w" | "e" | "sw" | "s" | "se";

export const RESIZE_HANDLES: ResizeHandle[] = ["nw", "n", "ne", "w", "e", "sw", "s", "se"];

export function applyResizeDelta(
  origRect: NormalizedRect,
  handle:   ResizeHandle,
  dx:       number,   // normalized delta
  dy:       number,
  type:     FieldType,
): NormalizedRect {
  let { x, y, width, height } = origRect;
  const c = FIELD_SIZE_CONSTRAINTS[type];

  if (handle.includes("w")) { x += dx; width  -= dx; }
  if (handle.includes("e")) { width  += dx; }
  if (handle.includes("n")) { y += dy; height -= dy; }
  if (handle.includes("s")) { height += dy; }

  width  = Math.max(c.minWidth,  Math.min(c.maxWidth,  width));
  height = Math.max(c.minHeight, Math.min(c.maxHeight, height));
  x      = Math.max(0, Math.min(1 - width,  x));
  y      = Math.max(0, Math.min(1 - height, y));
  return { x, y, width, height };
}

// ── Command 20 recipient-flow preview data ────────────────────────────────────
// A sanitized read-model for Command 20. No sender internals, no private data.

export interface RecipientFlowField {
  id:            FieldId;
  type:          FieldType;
  documentId:    EditorDocumentId;
  pageId:        EditorPageId;
  rect:          NormalizedRect;
  participantId: string | null;
  label:         string;
  required:      boolean;
  layer:         number;
  placeholder?:  string;
  multiline?:    boolean;
  requiredChecked?: boolean;
  radioGroupId?: string;
  radioOptions?: RadioOption[];
}

export interface RecipientFlowPage {
  id:          EditorPageId;
  pageNumber:  number;
  aspectRatio: number;
  fields:      RecipientFlowField[];
}

export interface RecipientFlowDocument {
  id:        EditorDocumentId;
  pages:     RecipientFlowPage[];
  fieldCount: number;
}

export interface RecipientFlowPreview {
  documents:          RecipientFlowDocument[];
  totalFieldCount:    number;
  demonstrationOnly:  true;
}

export function buildRecipientFlowPreview(
  documents: EditorDocument[],
  fields:    FieldDefinition[],
): RecipientFlowPreview {
  const docs = documents.map(doc => {
    const docFields = fields.filter(f => f.documentId === doc.id);
    return {
      id:          doc.id,
      fieldCount:  docFields.length,
      pages:       doc.pages.map(page => ({
        id:          page.id,
        pageNumber:  page.pageNumber,
        aspectRatio: page.aspectRatio,
        fields:      docFields
          .filter(f => f.pageId === page.id)
          .map(f => ({
            id:            f.id,
            type:          f.type,
            documentId:    f.documentId,
            pageId:        f.pageId,
            rect:          f.rect,
            participantId: f.participantId,
            label:         f.label,
            required:      f.required,
            layer:         f.layer,
            placeholder:   f.placeholder,
            multiline:     f.multiline,
            requiredChecked: f.requiredChecked,
            radioGroupId:  f.radioGroupId,
            radioOptions:  f.radioOptions,
          } satisfies RecipientFlowField)),
      })),
    };
  });
  return {
    documents:       docs,
    totalFieldCount: fields.length,
    demonstrationOnly: true,
  };
}
