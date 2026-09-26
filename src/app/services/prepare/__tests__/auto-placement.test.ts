import { describe, it, expect } from "vitest";
import {
  layoutOnPage, planRequests, planPlacement, orderForPlacement, rowGeometry, toFieldPartials,
  PLACEMENT_MARGIN_X, PLACEMENT_MARGIN_BOTTOM, SAFE_MARGIN,
} from "../auto-placement";
import type { FieldDefinition, EditorDocument, NormalizedRect } from "../../../models/field-editor";
import { detectOverlap, isNearPageEdge } from "../../../models/field-editor";
import type { PrepParticipant, PrepRoutingConfig } from "../../../models/prepare";

function pax(id: string, role: PrepParticipant["role"], name = id): PrepParticipant {
  return { id, name, email: `${id}@x.com`, role } as PrepParticipant;
}
const doc: EditorDocument = {
  id: "d1", prepFileId: "f1", displayName: "c.pdf", pageCount: 3,
  pages: [1, 2, 3].map(n => ({ id: `p${n}`, documentId: "d1", pageNumber: n, aspectRatio: 595 / 842, label: `Page ${n}` })),
};
function field(over: Partial<FieldDefinition>): FieldDefinition {
  return {
    id: "f", type: "text", documentId: "d1", pageId: "p3",
    rect: { x: 0.1, y: 0.1, width: 0.3, height: 0.04 }, participantId: null,
    label: "x", required: false, layer: 1, demonstrationOnly: true, ...over,
  };
}
const intersects = (a: NormalizedRect, b: NormalizedRect) =>
  a.x < b.x + b.width && b.x < a.x + a.width && a.y < b.y + b.height && b.y < a.y + a.height;

function assertNoOverlaps(rects: NormalizedRect[], others: NormalizedRect[] = []) {
  const all = [...rects];
  for (let i = 0; i < all.length; i++) {
    for (let j = i + 1; j < all.length; j++) expect(intersects(all[i]!, all[j]!)).toBe(false);
    for (const o of others) {
      expect(intersects(all[i]!, o)).toBe(false);
      expect(detectOverlap(all[i]!, o)).toBe(false);
    }
  }
}

describe("who gets what", () => {
  const people = [
    pax("s1", "signer"), pax("r1", "reviewer"), pax("a1", "approver"),
    pax("s2", "signer"), pax("v1", "viewer"), pax("k1", "acknowledgment-recipient"),
  ];
  const routing: PrepRoutingConfig = {
    mode: "sequential",
    groups: [
      { id: "g1", stepNumber: 1, participantIds: ["s2"] },
      { id: "g2", stepNumber: 2, participantIds: ["s1", "r1"] },
    ],
  } as unknown as PrepRoutingConfig;

  it("signers (routing order) then reviewers; approvers only when asked", () => {
    expect(planRequests(people, routing, [], { includeApprovers: false })).toEqual([
      { participantId: "s2", type: "signature-block" },
      { participantId: "s1", type: "signature-block" },
      { participantId: "r1", type: "review-block" },
    ]);
    expect(planRequests(people, routing, [], { includeApprovers: true }).at(-1))
      .toEqual({ participantId: "a1", type: "approval-block" });
  });

  it("skips anyone who already has their field", () => {
    const fields = [
      field({ id: "a", type: "signature", participantId: "s1" }),
      field({ id: "b", type: "review-block", participantId: "r1" }),
    ];
    expect(planRequests(people, routing, fields, { includeApprovers: false }))
      .toEqual([{ participantId: "s2", type: "signature-block" }]);
  });

  it("orders by routing step even when participants were added in another order", () => {
    expect(orderForPlacement(people, routing).map(p => p.id).slice(0, 2)).toEqual(["s2", "s1"]);
  });

  it("makes review blocks required and approval blocks optional", () => {
    const partials = toFieldPartials([
      { participantId: "r1", type: "review-block", pageId: "p1", rect: { x: 0, y: 0, width: 0.3, height: 0.09 } },
      { participantId: "a1", type: "approval-block", pageId: "p1", rect: { x: 0, y: 0, width: 0.3, height: 0.09 } },
    ], "d1");
    expect(partials.map(p => [p.label, p.required])).toEqual([
      ["Reviewed over Name", true], ["Approved over Name", false],
    ]);
  });
});

describe("layout", () => {
  const req = (n: number) => Array.from({ length: n }, (_, i) => ({ participantId: `p${i}`, type: "signature-block" as const }));

  it("sits on the bottom of the LAST page, inside the margins", () => {
    const plan = planPlacement(req(2), doc, []);
    expect(plan.every(p => p.pageId === "p3")).toBe(true);
    for (const p of plan) {
      expect(p.rect.y + p.rect.height).toBeCloseTo(1 - PLACEMENT_MARGIN_BOTTOM, 5);
      expect(p.rect.x).toBeGreaterThanOrEqual(PLACEMENT_MARGIN_X - 1e-9);
      expect(p.rect.x + p.rect.width).toBeLessThanOrEqual(1 - PLACEMENT_MARGIN_X + 1e-9);
      expect(isNearPageEdge(p.rect)).toBe(false);
    }
    expect(PLACEMENT_MARGIN_BOTTOM).toBeGreaterThan(SAFE_MARGIN);
  });

  it("spaces a row with even gutters", () => {
    const rects = layoutOnPage(req(3), [])!;
    const gaps = [
      rects[0]!.x - PLACEMENT_MARGIN_X,
      rects[1]!.x - (rects[0]!.x + rects[0]!.width),
      rects[2]!.x - (rects[1]!.x + rects[1]!.width),
      1 - PLACEMENT_MARGIN_X - (rects[2]!.x + rects[2]!.width),
    ];
    for (const g of gaps) expect(g).toBeCloseTo(gaps[0]!, 6);
  });

  it("wraps many into further rows stacked UPWARD, first participant top-left", () => {
    const { columns } = rowGeometry(7, "signature-block");
    const rects = layoutOnPage(req(7), [])!;
    expect(rects).toHaveLength(7);
    assertNoOverlaps(rects);
    const rowsY = [...new Set(rects.map(r => r.y.toFixed(4)))];
    expect(rowsY).toHaveLength(Math.ceil(7 / columns));
    // Reading order: the first request is in the highest row; the last row
    // is the one on the bottom margin.
    expect(rects[0]!.y).toBeLessThan(rects[6]!.y);
    expect(rects[6]!.y + rects[6]!.height).toBeCloseTo(1 - PLACEMENT_MARGIN_BOTTOM, 5);
  });

  it("never overlaps existing fields, moving up to the nearest free band", () => {
    const blocker = field({ id: "foot", rect: { x: 0.05, y: 0.84, width: 0.9, height: 0.1 } });
    const plan = planPlacement(req(4), doc, [blocker]);
    expect(plan.every(p => p.pageId === "p3")).toBe(true);
    assertNoOverlaps(plan.map(p => p.rect), [blocker.rect]);
    // Directly above the blocker, not somewhere arbitrary.
    const lowest = Math.max(...plan.map(p => p.rect.y + p.rect.height));
    expect(lowest).toBeLessThanOrEqual(blocker.rect.y);
    expect(blocker.rect.y - lowest).toBeLessThan(0.05);
  });

  it("falls back to an earlier page when the last page is full", () => {
    const wall = field({ id: "wall", rect: { x: 0, y: 0, width: 1, height: 1 } });
    const plan = planPlacement(req(2), doc, [wall]);
    expect(plan.every(p => p.pageId === "p2")).toBe(true);
  });
});
