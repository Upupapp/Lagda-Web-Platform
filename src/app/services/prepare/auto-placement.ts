// Auto-placement for Place Fields: a completion block for everyone who needs
// one, laid out at the bottom of the last page.
//
// ── What it replaces ───────────────────────────────────────────────────────
//
// The Validation panel's old Auto-Fix dropped ONE plain Signature at the
// centre of whatever page happened to be open, for one participant at a
// time. A document with four signers and two reviewers took six clicks and
// then six drags to tidy up.
//
// ── What it places ─────────────────────────────────────────────────────────
//
//   signer    without a signature-type field → signature-block (required)
//   reviewer  without a review-block         → review-block    (required)
//   approver  → nothing, unless the sender explicitly opts in
//               ("Place fields for everyone" → approval-block, OPTIONAL)
//
// Signers first in routing order, then reviewers (then opted-in approvers).
//
// ── Layout ─────────────────────────────────────────────────────────────────
//
// Rows of equal-width blocks with even gutters inside the page margins, the
// last row sitting on the bottom margin and further rows stacking UPWARD.
// Every row searches upward for the nearest band that is free of existing
// fields (and of rows already placed), so a page whose bottom is occupied
// gets its blocks just above what is there. Nothing here overlaps an
// existing field; if the last page is full the previous pages are tried.
//
// Pure: no React, no editor. FieldsPage applies the result with addFields().

import type {
  FieldDefinition, FieldType, NormalizedRect, EditorDocument, EditorPage,
} from "../../models/field-editor";
import {
  FIELD_SIZE_CONSTRAINTS, FIELD_TYPE_LABELS, SAFE_MARGIN, defaultRequiredFor, detectOverlap,
} from "../../models/field-editor";
import type { PrepParticipant, PrepRoutingConfig } from "../../models/prepare";

/** Horizontal page margin — comfortably inside the 3% safe-margin warning. */
export const PLACEMENT_MARGIN_X = 0.06;
/** Distance of the bottom row from the page's bottom edge. */
export const PLACEMENT_MARGIN_BOTTOM = 0.05;
/** Highest a row may climb. */
export const PLACEMENT_MARGIN_TOP = 0.05;
/** Vertical gap between rows, and the clearance kept from existing fields. */
export const PLACEMENT_ROW_GAP = 0.02;
/** Smallest horizontal gutter between blocks in a row. */
const MIN_GUTTER = 0.03;
/** Upward search step when a band is occupied. */
const SCAN_STEP = 0.005;

export interface PlacementRequest {
  participantId: string;
  type: FieldType;
}

export interface PlannedField {
  participantId: string;
  type: FieldType;
  pageId: string;
  rect: NormalizedRect;
}

/** Strict intersection with a clearance pad — stricter than detectOverlap(). */
function intersects(a: NormalizedRect, b: NormalizedRect, pad: number): boolean {
  return a.x < b.x + b.width + pad
    && b.x < a.x + a.width + pad
    && a.y < b.y + b.height + pad
    && b.y < a.y + a.height + pad;
}

function collides(rect: NormalizedRect, occupied: readonly NormalizedRect[]): boolean {
  return occupied.some(o => intersects(rect, o, PLACEMENT_ROW_GAP / 2) || detectOverlap(rect, o));
}

/** How many blocks sit side by side, and how wide each one is. */
export function rowGeometry(count: number, type: FieldType): { columns: number; width: number } {
  const c = FIELD_SIZE_CONSTRAINTS[type];
  const usable = 1 - 2 * PLACEMENT_MARGIN_X;
  // Three across only when there are at least three, and only while each
  // block keeps its minimum width — a printed name needs the room.
  const maxColumns = Math.max(1, Math.floor((usable - MIN_GUTTER) / (c.minWidth + MIN_GUTTER)));
  const columns = Math.max(1, Math.min(count, 3, maxColumns));
  const fit = (usable - (columns + 1) * MIN_GUTTER) / columns;
  return { columns, width: Math.max(c.minWidth, Math.min(c.defaultWidth, fit)) };
}

/** x positions for `n` blocks of `width` spread with EVEN gutters. */
function rowXs(n: number, width: number): number[] {
  const usable = 1 - 2 * PLACEMENT_MARGIN_X;
  const gutter = (usable - n * width) / (n + 1);
  return Array.from({ length: n }, (_, i) => PLACEMENT_MARGIN_X + gutter + i * (width + gutter));
}

/**
 * Lays `requests` out on ONE page. Returns null when they cannot all be
 * placed without an overlap. Rows are in reading order (first request top
 * left); the LAST row is the one on the bottom margin.
 */
export function layoutOnPage(
  requests: readonly PlacementRequest[],
  occupied: readonly NormalizedRect[],
): NormalizedRect[] | null {
  if (requests.length === 0) return [];
  // Every block in one run shares a size, so the rows line up.
  const type = requests[0]!.type;
  const height = FIELD_SIZE_CONSTRAINTS[type].defaultHeight;
  const { columns, width } = rowGeometry(requests.length, type);

  const rows: PlacementRequest[][] = [];
  for (let i = 0; i < requests.length; i += columns) rows.push(requests.slice(i, i + columns));

  const taken = [...occupied];
  const byRow: NormalizedRect[][] = new Array<NormalizedRect[]>(rows.length);
  // Bottom row first, each next row climbing from just above the last one.
  let ceiling = 1 - PLACEMENT_MARGIN_BOTTOM;
  for (let r = rows.length - 1; r >= 0; r--) {
    const xs = rowXs(rows[r]!.length, width);
    let y = ceiling - height;
    let placed: NormalizedRect[] | null = null;
    while (y >= PLACEMENT_MARGIN_TOP - 1e-9) {
      const candidate = xs.map(x => ({ x, y, width, height }));
      if (!candidate.some(rect => collides(rect, taken))) { placed = candidate; break; }
      y -= SCAN_STEP;
    }
    if (placed === null) return null;
    byRow[r] = placed;
    taken.push(...placed);
    ceiling = y - PLACEMENT_ROW_GAP;
  }
  return byRow.flat();
}

/** The ordering: signers in routing order, then reviewers, then approvers. */
export function orderForPlacement(
  participants: readonly PrepParticipant[],
  routing: PrepRoutingConfig | undefined,
): PrepParticipant[] {
  const step = new Map<string, number>();
  const within = new Map<string, number>();
  for (const group of routing?.groups ?? []) {
    group.participantIds.forEach((id, i) => {
      if (!step.has(id)) { step.set(id, group.stepNumber); within.set(id, i); }
    });
  }
  const roleRank = (p: PrepParticipant) =>
    p.role === "signer" ? 0 : p.role === "reviewer" ? 1 : p.role === "approver" ? 2 : 3;
  return participants
    .map((p, index) => ({ p, index }))
    .sort((a, b) =>
      roleRank(a.p) - roleRank(b.p)
      || (step.get(a.p.id) ?? Number.MAX_SAFE_INTEGER) - (step.get(b.p.id) ?? Number.MAX_SAFE_INTEGER)
      || (within.get(a.p.id) ?? 0) - (within.get(b.p.id) ?? 0)
      || a.index - b.index)
    .map(x => x.p);
}

const SIGNATURE_TYPES: readonly FieldType[] = ["signature", "signature-block"];

/** The block a participant still lacks, or null when they need nothing. */
export function missingBlockFor(
  participant: PrepParticipant,
  fields: readonly FieldDefinition[],
  opts: { includeApprovers: boolean },
): FieldType | null {
  const own = fields.filter(f => f.participantId === participant.id);
  if (participant.role === "signer") {
    return own.some(f => SIGNATURE_TYPES.includes(f.type)) ? null : "signature-block";
  }
  if (participant.role === "reviewer") {
    return own.some(f => f.type === "review-block") ? null : "review-block";
  }
  if (participant.role === "approver" && opts.includeApprovers) {
    return own.some(f => f.type === "approval-block") ? null : "approval-block";
  }
  return null;
}

/** What "Place fields for everyone" would add, in placement order. */
export function planRequests(
  participants: readonly PrepParticipant[],
  routing: PrepRoutingConfig | undefined,
  fields: readonly FieldDefinition[],
  opts: { includeApprovers: boolean; onlyParticipantIds?: readonly string[] },
): PlacementRequest[] {
  const only = opts.onlyParticipantIds ? new Set(opts.onlyParticipantIds) : null;
  const out: PlacementRequest[] = [];
  for (const p of orderForPlacement(participants, routing)) {
    if (only && !only.has(p.id)) continue;
    const type = missingBlockFor(p, fields, opts);
    if (type) out.push({ participantId: p.id, type });
  }
  return out;
}

/**
 * Positions the requests on the target document — the last page first,
 * then earlier pages. As a last resort (every page full) the rows are
 * stacked from the bottom of the last page regardless, so a participant is
 * never silently left without their block; Validation then flags the
 * overlap for the sender.
 */
export function planPlacement(
  requests: readonly PlacementRequest[],
  document: EditorDocument,
  fields: readonly FieldDefinition[],
): PlannedField[] {
  if (requests.length === 0 || document.pages.length === 0) return [];
  const pages: EditorPage[] = [...document.pages].sort((a, b) => b.pageNumber - a.pageNumber);
  for (const page of pages) {
    const occupied = fields
      .filter(f => f.documentId === document.id && f.pageId === page.id)
      .map(f => f.rect);
    const rects = layoutOnPage(requests, occupied);
    if (rects) {
      return requests.map((r, i) => ({ participantId: r.participantId, type: r.type, pageId: page.id, rect: rects[i]! }));
    }
  }
  const last = pages[0]!;
  const rects = layoutOnPage(requests, []) ?? [];
  return requests.map((r, i) => ({
    participantId: r.participantId, type: r.type, pageId: last.id,
    rect: rects[i] ?? { x: PLACEMENT_MARGIN_X, y: 1 - PLACEMENT_MARGIN_BOTTOM - 0.1, width: 0.3, height: 0.09 },
  }));
}

/** The editor's add-field payloads for a plan. */
export function toFieldPartials(
  plan: readonly PlannedField[],
  documentId: string,
): Omit<FieldDefinition, "id" | "layer">[] {
  return plan.map(p => ({
    type: p.type,
    documentId,
    pageId: p.pageId,
    rect: p.rect,
    participantId: p.participantId,
    label: FIELD_TYPE_LABELS[p.type],
    required: defaultRequiredFor(p.type),
    demonstrationOnly: true,
  }));
}

/** The document auto-placement targets: the last document in the draft. */
export function placementTargetDocument(documents: readonly EditorDocument[]): EditorDocument | null {
  return documents.length === 0 ? null : documents[documents.length - 1]!;
}

// Re-exported for tests that want to assert margins against the warning zone.
export { SAFE_MARGIN };
