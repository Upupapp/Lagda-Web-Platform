// Tests for the shared safe platform projection — Gap Closure Command 5.
//
// `preparation-platform-projection.ts` is the ONE narrowing layer between Bulk
// Send batches (which hold recipient names, email addresses, organizations and
// raw CSV cell values) and every platform surface that publishes them: Global
// Search, the Command Palette, the Dashboard, Reports, Notifications and
// Documents.
//
// So the suite asserts three separate contracts, and each of them is a contract
// that was broken at least once during Gap Closure:
//
//   1. TENANCY   — a workspace only ever sees its own batches.
//   2. FIDELITY  — the status shown on a platform surface is a PURE MAPPING of
//                  the batch status the Bulk Send service itself derived. The
//                  first version re-derived readiness from `roleMappings` and
//                  reported a ready batch as "Mapping required".
//   3. PRIVACY   — no recipient value can reach the projection's output, so no
//                  surface can leak one even if it renders every field.
//
// Everything here drives the real service. Nothing is mocked, because the whole
// point of the projection is that it reads the service's validated snapshot
// rather than the raw fixtures.

import { afterEach, beforeEach, describe, it, expect, vi } from "vitest";

import { getCapability } from "../../config/product-capability-registry";
import {
  PROFILE_MATURITY_ALLOWLIST,
  type ProductCapabilityMaturity,
} from "../../models/product-capability";
import {
  buildAttentionSummary,
  buildPlatformSummaries,
  buildReportRows,
  buildSourceMix,
  isPreparationPlatformVisible,
  preparationMappingRoute,
  preparationRecipientsRoute,
  preparationReviewRoute,
  preparationRoute,
  PREPARATION_CAPABILITY_ID,
  PREPARATION_LIST_ROUTE,
  PREPARATION_STATUS_LABELS,
  type PreparationPlatformStatus,
  type PreparationPlatformSummary,
} from "../preparation-platform-projection";
import { bulkSendService } from "../mock/bulk-send.service";
import { BULK_SEND_BATCH_FIXTURES } from "../../data/mock/bulk-send";
import { BULK_SEND_BATCH_STATUS_LABELS, type BulkSendBatchStatus } from "../../models/bulk-send";
import {
  createTestBulkSendContext,
  OTHER_WORKSPACE_ID,
  TEST_HEADERS,
  TEST_ROWS,
  TEST_WORKSPACE_ID,
} from "../../../test/fixtures";

// ── Driving the capability gate ──────────────────────────────────────────────
//
// `isPreparationPlatformVisible()` is the projection's only gate. It calls the
// real `isCapabilityInActiveProfile("bulk-send")`, which answers by looking the
// capability up in the registry and testing its MATURITY against the maturity
// allowlist of `ACTIVE_LAUNCH_PROFILE`.
//
// `ACTIVE_LAUNCH_PROFILE` cannot be driven from a test. `capability-resolver.ts`
// derives it once at module scope from `import.meta.env.VITE_LAUNCH_PROFILE`,
// and under Vitest that read does not see `vitest.config.ts`'s
// `test.env.VITE_LAUNCH_PROFILE` — nor `vi.stubEnv` + `vi.resetModules()` + a
// verified-fresh dynamic re-import. It resolves "launch-default" every time.
// See the reported finding; it is an infrastructure defect, not a projection one.
//
// So the OTHER input to the same real decision is driven instead: the maturity
// the registry declares. "launch-core" is in every profile's allowlist and
// "future-product" is in none, so these two settings pin the gate open and shut
// regardless of which profile the resolver happened to derive. The real resolver,
// the real registry lookup and the real allowlist all still run — nothing in this
// suite is mocked or stubbed.
const bulkSendCapability = getCapability(PREPARATION_CAPABILITY_ID);
if (!bulkSendCapability) {
  throw new Error(`"${PREPARATION_CAPABILITY_ID}" is not in the product capability registry.`);
}

/** The maturity the repository actually ships, restored after every test. */
const SHIPPED_MATURITY: ProductCapabilityMaturity = bulkSendCapability.maturity;

function setCapabilityMaturity(maturity: ProductCapabilityMaturity): void {
  (bulkSendCapability as unknown as { maturity: ProductCapabilityMaturity }).maturity = maturity;
}

beforeEach(() => setCapabilityMaturity("launch-core"));
afterEach(() => setCapabilityMaturity(SHIPPED_MATURITY));

// ── Helpers ──────────────────────────────────────────────────────────────────

/** Fails with the list of batch IDs actually present, so a miss is diagnosable. */
function requireItem(
  items: PreparationPlatformSummary[],
  batchId: string,
): PreparationPlatformSummary {
  const found = items.find((i) => i.batchId === batchId);
  if (!found) {
    throw new Error(
      `Expected a projection summary for batch "${batchId}". Present: ` +
        `[${items.map((i) => i.batchId).join(", ")}]`,
    );
  }
  return found;
}

/** A hand-built summary, so aggregate tests assert numbers nothing else derived. */
function makeSummary(overrides: Partial<PreparationPlatformSummary> = {}): PreparationPlatformSummary {
  const status: PreparationPlatformStatus = overrides.status ?? "draft";
  return {
    batchId: "bsb_synthetic",
    title: "Synthetic Batch",
    status,
    statusLabel: PREPARATION_STATUS_LABELS[status],
    batchStatusLabel: "Draft",
    templateName: "Synthetic Template",
    teamName: "Synthetic Team",
    includedRows: 0,
    readyRows: 0,
    issueCount: 0,
    duplicateCount: 0,
    attention: [],
    needsAttention: status === "needs-attention" || status === "mapping-required",
    readyForReview: status === "ready-for-review",
    updatedAtDemonstration: "2026-07-16T09:00:00+08:00",
    workspaceId: TEST_WORKSPACE_ID,
    route: "/app/bulk-send/bsb_synthetic",
    ...overrides,
  };
}

/**
 * The complete mapping the projection is required to perform. Written out here
 * independently of the implementation: if `toPlatformStatus` ever re-derives a
 * status instead of translating one, one of these pairs stops holding.
 */
const EXPECTED_STATUS_MAPPING: Record<BulkSendBatchStatus, PreparationPlatformStatus> = {
  "draft":                     "draft",
  "recipients-added":          "draft",
  "validation-required":       "draft",
  "mapping-required":          "mapping-required",
  "needs-review":              "needs-attention",
  "invalid":                   "needs-attention",
  "ready-in-demonstration":    "ready-for-review",
  "draft-projections-created": "projections-created",
  "partially-projected":       "projections-created",
  "archived":                  "archived",
  "unavailable":               "unavailable",
};

// ── Forbidden recipient values, derived from the real fixtures ───────────────
//
// Derived rather than hardcoded so that adding a fixture row automatically
// widens the privacy assertion instead of silently escaping it.

const FIXTURE_CELLS: Array<[string, string]> = BULK_SEND_BATCH_FIXTURES.flatMap((b) =>
  b.rows.flatMap((r) => Object.entries(r.values)),
);

const uniq = (values: string[]) => [...new Set(values.filter((v) => v.trim().length > 0))];

/** Every email direction in the fixtures. */
const FIXTURE_EMAILS = uniq(FIXTURE_CELLS.filter(([, v]) => v.includes("@")).map(([, v]) => v));

/** Recipient display names. Column IDs are stable fixture literals. */
const NAME_COLUMN_IDS = ["c_eng_name", "c_pol_name", "c_ven_name"];
const FIXTURE_RECIPIENT_NAMES = uniq(
  FIXTURE_CELLS.filter(([k]) => NAME_COLUMN_IDS.includes(k)).map(([, v]) => v),
);

/** Recipient organizations and firms. */
const ORG_COLUMN_IDS = ["c_eng_org", "c_eng_firm", "c_ven_company"];
const FIXTURE_RECIPIENT_ORGS = uniq(
  FIXTURE_CELLS.filter(([k]) => ORG_COLUMN_IDS.includes(k)).map(([, v]) => v),
);

/** Everything the projection publishes, as one string. */
function serializeEveryProjectionOutput(workspaceId: string): string {
  const items = buildPlatformSummaries(workspaceId);
  return JSON.stringify({
    summaries: items,
    reportRows: buildReportRows(items),
    attention: buildAttentionSummary(items),
    sourceMix: buildSourceMix(workspaceId),
  });
}

// ═════════════════════════════════════════════════════════════════════════════

describe("preparation platform projection — tenancy", () => {
  it("returns the session workspace's batches", () => {
    const items = buildPlatformSummaries(TEST_WORKSPACE_ID);

    expect(items.length).toBe(BULK_SEND_BATCH_FIXTURES.length);
    expect(items.map((i) => i.batchId).sort()).toEqual(
      BULK_SEND_BATCH_FIXTURES.map((b) => String(b.id)).sort(),
    );
    expect(items.every((i) => i.workspaceId === TEST_WORKSPACE_ID)).toBe(true);
  });

  it("returns nothing for a workspace the session is not in", () => {
    expect(buildPlatformSummaries(OTHER_WORKSPACE_ID)).toEqual([]);
    expect(buildSourceMix(OTHER_WORKSPACE_ID)).toEqual([]);
  });

  it("returns nothing for an empty workspace id rather than falling back to everything", () => {
    // A surface that forgets to resolve the workspace must get zero rows, never
    // an unscoped list. This is the difference between an empty dashboard and a
    // cross-tenant leak.
    expect(buildPlatformSummaries("")).toEqual([]);
    expect(buildSourceMix("")).toEqual([]);
  });

  it("narrows to a team without hiding workspace-wide batches", () => {
    const all = buildPlatformSummaries(TEST_WORKSPACE_ID);
    const hrOnly = buildPlatformSummaries(TEST_WORKSPACE_ID, "team_hr");

    // The HR-scoped batch survives; the Procurement-scoped one does not.
    expect(hrOnly.map((i) => i.batchId)).toContain("bsb_ack");
    expect(hrOnly.map((i) => i.batchId)).not.toContain("bsb_partial");
    // Batches with no team are workspace-wide and stay visible.
    expect(hrOnly.map((i) => i.batchId)).toContain("bsb_ready");
    expect(hrOnly.length).toBeLessThan(all.length);
  });

  it("does not stamp a new updated-at timestamp just because a surface read it", () => {
    // `snapshotForPlatform` refreshes a COPY. Refreshing in place would reset
    // every batch's "last updated" to now on each Dashboard paint.
    const first = requireItem(buildPlatformSummaries(TEST_WORKSPACE_ID), "bsb_ready");
    const second = requireItem(buildPlatformSummaries(TEST_WORKSPACE_ID), "bsb_ready");

    expect(first.updatedAtDemonstration).toBe("2026-07-20T10:15:00Z");
    expect(second.updatedAtDemonstration).toBe(first.updatedAtDemonstration);
  });
});

describe("preparation platform projection — status is a pure mapping", () => {
  it("reports a batch the service considers ready as ready-for-review, not mapping-required", () => {
    // THE Gap 5 regression. `bsb_ready` ships with `roleMappings: []`, so any
    // implementation that re-derives readiness from role mappings reports it as
    // "Mapping required" while the feature's own screens say "Ready".
    const ready = requireItem(buildPlatformSummaries(TEST_WORKSPACE_ID), "bsb_ready");

    expect(ready.status).toBe("ready-for-review");
    expect(ready.status).not.toBe("mapping-required");
    expect(ready.readyForReview).toBe(true);
    expect(ready.needsAttention).toBe(false);
    expect(ready.attention).not.toContain("missing-role-mapping");
    expect(ready.statusLabel).toBe("Ready for review");
    expect(ready.batchStatusLabel).toBe("Ready in Demonstration");
  });

  it("translates every batch's own status through the documented mapping table", () => {
    const items = buildPlatformSummaries(TEST_WORKSPACE_ID);
    const snapshot = bulkSendService.snapshotForPlatform(TEST_WORKSPACE_ID);

    expect(snapshot.length).toBe(items.length);

    for (const batch of snapshot) {
      const item = requireItem(items, String(batch.id));
      expect({ id: item.batchId, status: item.status }).toEqual({
        id: String(batch.id),
        status: EXPECTED_STATUS_MAPPING[batch.status],
      });
      expect(item.batchStatusLabel).toBe(BULK_SEND_BATCH_STATUS_LABELS[batch.status]);
      expect(item.statusLabel).toBe(PREPARATION_STATUS_LABELS[item.status]);
    }
  });

  it("maps the terminal and attention states the fixtures actually produce", () => {
    const items = buildPlatformSummaries(TEST_WORKSPACE_ID);

    expect(requireItem(items, "bsb_ack").status).toBe("needs-attention");
    expect(requireItem(items, "bsb_issues").status).toBe("needs-attention");
    expect(requireItem(items, "bsb_partial").status).toBe("projections-created");
    expect(requireItem(items, "bsb_draft").status).toBe("draft");
    expect(requireItem(items, "bsb_archived").status).toBe("archived");
  });

  it("reports mapping-required only when the service itself is mapping-blocked", async () => {
    // The other half of the pure-mapping contract: a batch whose required roles
    // genuinely cannot be bound MUST surface as "mapping-required". Proving both
    // directions is what stops the mapping being silently inverted or flattened.
    const ctx = createTestBulkSendContext();

    const created = await bulkSendService.createBatch(
      { name: "Unmappable Source Probe", templateId: "tpl-engagement-standard" },
      ctx,
    );
    if (!created.ok) throw new Error(`createBatch failed: ${created.code}`);
    const batchId = String(created.data.id);

    // Headers that match no role-field or variable alias, so nothing can bind.
    const applied = await bulkSendService.applyRecipientSource(
      batchId,
      ["Alpha", "Beta"],
      [["one", "two"], ["three", "four"]],
      "structured-paste",
      ctx,
    );
    if (!applied.ok) throw new Error(`applyRecipientSource failed: ${applied.code}`);
    expect(applied.data.status).toBe("mapping-required");

    const probe = requireItem(buildPlatformSummaries(TEST_WORKSPACE_ID), batchId);
    expect(probe.status).toBe("mapping-required");
    expect(probe.statusLabel).toBe("Mapping required");
    expect(probe.attention).toContain("missing-role-mapping");
    expect(probe.needsAttention).toBe(true);
    expect(probe.readyForReview).toBe(false);
  });

  it("reads validation from the service instead of the raw fixtures", () => {
    // Fixtures ship with EMPTY_VALIDATION_SUMMARY and no duplicates. A projection
    // built from fixtures reports every batch as issue-free, which is exactly the
    // defect `snapshotForPlatform` exists to prevent.
    const rawIssues = BULK_SEND_BATCH_FIXTURES.find((b) => String(b.id) === "bsb_issues");
    expect(rawIssues?.validation.duplicate).toBe(0);

    const projected = requireItem(buildPlatformSummaries(TEST_WORKSPACE_ID), "bsb_issues");
    expect(projected.duplicateCount).toBeGreaterThan(0);
    expect(projected.issueCount).toBeGreaterThanOrEqual(projected.duplicateCount);
    expect(projected.attention).toContain("duplicate-recipient");
  });
});

describe("preparation platform projection — attention reasons", () => {
  it("flags an empty batch as having no recipients", () => {
    const draft = requireItem(buildPlatformSummaries(TEST_WORKSPACE_ID), "bsb_draft");

    expect(draft.includedRows).toBe(0);
    expect(draft.attention).toContain("no-recipients");
  });

  it("never flags a batch that has rows as having no recipients", () => {
    const items = buildPlatformSummaries(TEST_WORKSPACE_ID);
    const wrong = items.filter((i) => i.includedRows > 0 && i.attention.includes("no-recipients"));

    expect(wrong.map((i) => i.batchId)).toEqual([]);
  });

  it("only claims a mapping problem when the status says so", () => {
    const items = buildPlatformSummaries(TEST_WORKSPACE_ID);

    for (const item of items) {
      expect({
        id: item.batchId,
        claimsMapping: item.attention.includes("missing-role-mapping"),
      }).toEqual({ id: item.batchId, claimsMapping: item.status === "mapping-required" });
    }
  });

  it("only claims duplicates when duplicates were counted", () => {
    const items = buildPlatformSummaries(TEST_WORKSPACE_ID);

    for (const item of items) {
      expect({
        id: item.batchId,
        claimsDuplicates: item.attention.includes("duplicate-recipient"),
      }).toEqual({ id: item.batchId, claimsDuplicates: item.duplicateCount > 0 });
    }
  });

  it("flags a warnings-only batch as needing attention", () => {
    // `bsb_ack` has one row whose Contact is archived — a warning, not a
    // blocking issue. It must still reach a platform surface as needing
    // attention rather than looking clean.
    const ack = requireItem(buildPlatformSummaries(TEST_WORKSPACE_ID), "bsb_ack");

    expect(ack.status).toBe("needs-attention");
    expect(ack.needsAttention).toBe(true);
    expect(ack.readyForReview).toBe(false);
    expect(ack.issueCount).toBe(1);
    expect(ack.duplicateCount).toBe(0);
  });

  it("excludes excluded rows from includedRows", () => {
    // `bsb_partial` has three rows, one of them excluded during review.
    const partial = requireItem(buildPlatformSummaries(TEST_WORKSPACE_ID), "bsb_partial");
    const raw = BULK_SEND_BATCH_FIXTURES.find((b) => String(b.id) === "bsb_partial");

    expect(raw?.rows.length).toBe(3);
    expect(partial.includedRows).toBe(2);
  });
});

describe("buildAttentionSummary", () => {
  it("totals agree with the item list it was given", () => {
    const items = [
      makeSummary({ batchId: "a", status: "needs-attention", issueCount: 3, duplicateCount: 2 }),
      makeSummary({ batchId: "b", status: "mapping-required", issueCount: 1 }),
      makeSummary({ batchId: "c", status: "ready-for-review", issueCount: 0 }),
      makeSummary({ batchId: "d", status: "draft", issueCount: 5, duplicateCount: 1 }),
      makeSummary({ batchId: "e", status: "archived", issueCount: 0 }),
    ];

    expect(buildAttentionSummary(items)).toEqual({
      total: 5,
      needsAttention: 1,
      readyForReview: 1,
      mappingRequired: 1,
      withDuplicates: 2,
      totalIssues: 9,
    });
  });

  it("returns an all-zero summary for an empty list", () => {
    expect(buildAttentionSummary([])).toEqual({
      total: 0,
      needsAttention: 0,
      readyForReview: 0,
      mappingRequired: 0,
      withDuplicates: 0,
      totalIssues: 0,
    });
  });

  it("agrees with the real projection's own per-item flags", () => {
    const items = buildPlatformSummaries(TEST_WORKSPACE_ID);
    const summary = buildAttentionSummary(items);

    expect(summary.total).toBe(items.length);
    // `needsAttention` on an item is true for BOTH needs-attention and
    // mapping-required, and the summary splits those two apart. If either side
    // changes without the other, this stops adding up.
    expect(summary.needsAttention + summary.mappingRequired).toBe(
      items.filter((i) => i.needsAttention).length,
    );
    expect(summary.readyForReview).toBe(items.filter((i) => i.readyForReview).length);
    expect(summary.withDuplicates).toBe(items.filter((i) => i.duplicateCount > 0).length);
    expect(summary.needsAttention + summary.readyForReview).toBeLessThanOrEqual(summary.total);
  });
});

describe("buildReportRows", () => {
  it("substitutes honest placeholders for absent template and team", () => {
    const rows = buildReportRows([
      makeSummary({ batchId: "a", templateName: null, teamName: null }),
    ]);

    expect(rows[0]?.templateName).toBe("None");
    expect(rows[0]?.teamName).toBe("Whole workspace");
  });

  it("carries counts and labels only — no id, route, or workspace", () => {
    const rows = buildReportRows(buildPlatformSummaries(TEST_WORKSPACE_ID));

    expect(rows.length).toBeGreaterThan(0);
    for (const row of rows) {
      expect(Object.keys(row).sort()).toEqual([
        "includedRows",
        "issueCount",
        "readyRows",
        "statusLabel",
        "teamName",
        "templateName",
        "title",
        "updatedAtDemonstration",
      ]);
    }
  });
});

describe("buildSourceMix", () => {
  it("counts batches per recipient source using human-readable labels", () => {
    const mix = buildSourceMix(TEST_WORKSPACE_ID);
    const byLabel = Object.fromEntries(mix.map((m) => [m.label, m.count]));

    // `bsb_draft` has no schema at all and must not appear as an empty source.
    expect(mix.every((m) => m.label.length > 0)).toBe(true);
    expect(mix.some((m) => m.label.includes("-"))).toBe(false);
    expect(byLabel["deterministic fixture"]).toBe(2);
    expect(byLabel["contact group"]).toBe(1);
    expect(byLabel["local csv preview"]).toBe(1);
    expect(byLabel["contact"]).toBe(1);
    expect(mix.reduce((n, m) => n + m.count, 0)).toBe(BULK_SEND_BATCH_FIXTURES.length - 1);
  });
});

// ═════════════════════════════════════════════════════════════════════════════
// PRIVACY — the reason the projection exists at all
// ═════════════════════════════════════════════════════════════════════════════

describe("preparation platform projection — privacy", () => {
  it("has a non-trivial forbidden set to check against", () => {
    // Guards the tests below from passing vacuously if the fixture column IDs
    // are ever renamed and the derived sets silently empty out.
    expect(FIXTURE_EMAILS.length).toBeGreaterThanOrEqual(10);
    expect(FIXTURE_RECIPIENT_NAMES.length).toBeGreaterThanOrEqual(10);
    expect(FIXTURE_RECIPIENT_ORGS.length).toBeGreaterThanOrEqual(5);
    expect(FIXTURE_RECIPIENT_NAMES).toContain("Maria Santos");
    expect(FIXTURE_EMAILS).toContain("maria.santos@example.com");
  });

  it("NEGATIVE CONTROL: the same checks trip on the unprojected service snapshot", () => {
    // Without this, a privacy test that never fails proves nothing. This is what
    // a surface would publish if it skipped the projection and read the service
    // directly — every assertion below must catch it.
    const unprojected = JSON.stringify(bulkSendService.snapshotForPlatform(TEST_WORKSPACE_ID));

    expect(unprojected).toContain("@");
    expect(FIXTURE_EMAILS.filter((e) => unprojected.includes(e)).length).toBeGreaterThan(5);
    expect(FIXTURE_RECIPIENT_NAMES.filter((n) => unprojected.includes(n)).length).toBeGreaterThan(5);
    expect(FIXTURE_RECIPIENT_ORGS.filter((o) => unprojected.includes(o)).length).toBeGreaterThan(3);
  });

  it("publishes no email address anywhere in its output", () => {
    const serialized = serializeEveryProjectionOutput(TEST_WORKSPACE_ID);
    // Not vacuous: the projection really did publish the batches.
    expect(serialized).toContain("Q3 Engagement Letters");

    // The blunt instrument on purpose: nothing the projection publishes has any
    // legitimate reason to contain "@", so this catches an address that reaches
    // a surface through a field nobody thought to check.
    expect(serialized).not.toContain("@");
    for (const email of FIXTURE_EMAILS) {
      expect(serialized).not.toContain(email);
    }
  });

  it("publishes no recipient name or organization anywhere in its output", () => {
    const serialized = serializeEveryProjectionOutput(TEST_WORKSPACE_ID);
    expect(serialized).toContain("Q3 Engagement Letters");

    for (const name of FIXTURE_RECIPIENT_NAMES) {
      expect(serialized).not.toContain(name);
    }
    for (const org of FIXTURE_RECIPIENT_ORGS) {
      expect(serialized).not.toContain(org);
    }
  });

  it("publishes no recipient value from a source added during the session", async () => {
    // Fixtures are one thing; a batch a user just pasted in is the case that
    // actually matters. `TEST_ROWS` map cleanly to role fields, so these values
    // are genuinely bound to participants — and must still never surface.
    const ctx = createTestBulkSendContext();

    const created = await bulkSendService.createBatch(
      { name: "Session Paste Probe", templateId: "tpl-engagement-standard" },
      ctx,
    );
    if (!created.ok) throw new Error(`createBatch failed: ${created.code}`);

    const applied = await bulkSendService.applyRecipientSource(
      String(created.data.id),
      [...TEST_HEADERS],
      TEST_ROWS,
      "structured-paste",
      ctx,
    );
    if (!applied.ok) throw new Error(`applyRecipientSource failed: ${applied.code}`);

    const serialized = serializeEveryProjectionOutput(TEST_WORKSPACE_ID);
    // The batch really is in the projection — otherwise this proves nothing.
    expect(serialized).toContain("Session Paste Probe");

    expect(serialized).not.toContain("@");
    for (const cell of TEST_ROWS.flat()) {
      expect(serialized).not.toContain(cell);
    }
  });

  it("exposes exactly the fields the summary contract declares", () => {
    // A structural lock. Adding `recipientEmails` or `rows` to the projection
    // would leak through every surface at once, and would fail here first.
    const items = buildPlatformSummaries(TEST_WORKSPACE_ID);
    expect(items.length).toBeGreaterThan(0);

    for (const item of items) {
      expect(Object.keys(item).sort()).toEqual([
        "attention",
        "batchId",
        "batchStatusLabel",
        "duplicateCount",
        "includedRows",
        "issueCount",
        "needsAttention",
        "readyForReview",
        "readyRows",
        "route",
        "status",
        "statusLabel",
        "teamName",
        "templateName",
        "title",
        "updatedAtDemonstration",
        "workspaceId",
      ]);
    }
  });

  it("builds routes that cannot carry a recipient value", () => {
    const items = buildPlatformSummaries(TEST_WORKSPACE_ID);

    for (const item of items) {
      expect(item.route).toMatch(/^\/app\/bulk-send(\/[A-Za-z0-9_-]{1,64})?$/);
    }
  });
});

// ═════════════════════════════════════════════════════════════════════════════
// ROUTE BUILDERS
// ═════════════════════════════════════════════════════════════════════════════

describe("preparation route builders", () => {
  const BUILDERS: Array<[string, (id: string) => string, string]> = [
    ["preparationRoute", preparationRoute, ""],
    ["preparationRecipientsRoute", preparationRecipientsRoute, "/recipients"],
    ["preparationMappingRoute", preparationMappingRoute, "/mapping"],
    ["preparationReviewRoute", preparationReviewRoute, "/review"],
  ];

  const HOSTILE_IDS: Array<[string, string]> = [
    ["path traversal", "../../etc/passwd"],
    ["single traversal segment", ".."],
    ["nested path", "bsb_ready/../bsb_archived"],
    ["whitespace", "a b"],
    ["email address", "x@y.com"],
    ["recipient email", "maria.santos@example.com"],
    ["script tag", "<script>"],
    ["quote break-out", 'bsb_ready" onclick="x'],
    ["empty string", ""],
    ["percent-encoded traversal", "%2e%2e%2f"],
    ["query smuggling", "bsb_ready?next=/admin"],
    ["absolute url", "https://example.invalid/steal"],
    ["over the length limit", "a".repeat(200)],
  ];

  it.each(BUILDERS)("%s builds a canonical path for a safe id", (_name, build, suffix) => {
    expect(build("bsb_ready")).toBe(`/app/bulk-send/bsb_ready${suffix}`);
    expect(build("BSB-Ready_01")).toBe(`/app/bulk-send/BSB-Ready_01${suffix}`);
  });

  for (const [name, build] of BUILDERS) {
    it.each(HOSTILE_IDS)(`${name} falls back to the list route for %s`, (_label, hostile) => {
      expect(build(hostile)).toBe(PREPARATION_LIST_ROUTE);
    });
  }

  it("accepts an id at the length limit and rejects one past it", () => {
    const atLimit = "a".repeat(64);
    const overLimit = "a".repeat(65);

    expect(preparationRoute(atLimit)).toBe(`/app/bulk-send/${atLimit}`);
    expect(preparationRoute(overLimit)).toBe(PREPARATION_LIST_ROUTE);
  });

  it("never emits a route outside the Bulk Send tree", () => {
    const everyId = [
      ...HOSTILE_IDS.map(([, id]) => id),
      "bsb_ready",
      "a".repeat(64),
      " ",
      "..%2F..",
      "ñame",
    ];

    for (const [, build] of BUILDERS) {
      for (const id of everyId) {
        expect(build(id).startsWith("/app/bulk-send")).toBe(true);
        expect(build(id)).not.toContain("..");
        expect(build(id)).not.toContain("@");
        expect(build(id)).not.toContain("<");
      }
    }
  });

  it("exposes the list route as the single canonical fallback", () => {
    expect(PREPARATION_LIST_ROUTE).toBe("/app/bulk-send");
    expect(preparationRoute("")).toBe(PREPARATION_LIST_ROUTE);
  });
});

// ═════════════════════════════════════════════════════════════════════════════
// CAPABILITY GATE
// ═════════════════════════════════════════════════════════════════════════════

describe("preparation platform projection — launch profile gate", () => {
  it("ships as an Enterprise Preview capability that launch-default excludes", () => {
    // The shipped registry values, captured before any test touched them. This
    // is what makes the behavioural test below meaningful rather than
    // hypothetical: Bulk Send really is absent from the default launch profile,
    // so "publishes nothing when gated off" is the production launch behaviour.
    expect(PREPARATION_CAPABILITY_ID).toBe("bulk-send");
    expect(SHIPPED_MATURITY).toBe("enterprise-preview");
    expect(PROFILE_MATURITY_ALLOWLIST["launch-default"]).not.toContain("enterprise-preview");
    expect(PROFILE_MATURITY_ALLOWLIST["enterprise-preview"]).toContain("enterprise-preview");
    expect(PROFILE_MATURITY_ALLOWLIST["development"]).toContain("enterprise-preview");
    // The two settings the gate is driven with really do bracket every profile.
    for (const allowed of Object.values(PROFILE_MATURITY_ALLOWLIST)) {
      expect(allowed).toContain("launch-core");
      expect(allowed).not.toContain("future-product");
    }
  });

  it("publishes nothing at all when the capability is not in the active profile", () => {
    // Under the default launch profile every platform surface must behave as
    // though Bulk Send does not exist — not "show it disabled", not "show the
    // counts with an unavailable badge".
    expect(buildPlatformSummaries(TEST_WORKSPACE_ID).length).toBeGreaterThan(0);
    setCapabilityMaturity("future-product");

    expect(isPreparationPlatformVisible()).toBe(false);
    expect(buildPlatformSummaries(TEST_WORKSPACE_ID)).toEqual([]);
    expect(buildPlatformSummaries(TEST_WORKSPACE_ID, "team_hr")).toEqual([]);
    expect(buildSourceMix(TEST_WORKSPACE_ID)).toEqual([]);

    // Aggregates over an empty projection are zero, never undefined or NaN — a
    // Dashboard tile must render "0", not "NaN".
    const items = buildPlatformSummaries(TEST_WORKSPACE_ID);
    expect(buildAttentionSummary(items)).toEqual({
      total: 0,
      needsAttention: 0,
      readyForReview: 0,
      mappingRequired: 0,
      withDuplicates: 0,
      totalIssues: 0,
    });
    expect(buildReportRows(items)).toEqual([]);
  });

  it("gates before it reads any batch, so a gated build touches no recipient data", () => {
    setCapabilityMaturity("future-product");
    const snapshotSpy = vi.spyOn(bulkSendService, "snapshotForPlatform");

    buildPlatformSummaries(TEST_WORKSPACE_ID);
    buildSourceMix(TEST_WORKSPACE_ID);

    expect(snapshotSpy).not.toHaveBeenCalled();
  });

  it("route builders stay usable when the capability is gated off", () => {
    // Routes are pure string builders. A gated build must still resolve a link
    // to the safe fallback rather than crashing a surface that renders one.
    setCapabilityMaturity("future-product");

    expect(preparationRoute("bsb_ready")).toBe("/app/bulk-send/bsb_ready");
    expect(preparationRoute("../../etc/passwd")).toBe(PREPARATION_LIST_ROUTE);
  });
});
