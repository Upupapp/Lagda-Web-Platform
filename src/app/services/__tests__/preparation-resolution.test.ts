// Preparation Policy and Automation resolution — Gap Closure Command 4 tests.
//
// WHAT THIS FILE DEFENDS
//
//  1. The capability gate. `workflow-automation` is `enterprise-preview`, so in
//     the launch-default profile NEITHER Policy nor Automation resolution may run
//     and the Command 32 engine must not be touched at all — not called and then
//     filtered.
//
//  2. THE PRIVACY INVARIANT. `PreparationResolutionInput` is the object most
//     likely to end up in a log. It must carry counts, kinds and flags only.
//     No recipient name, email direction, organization, cell value, Contact ID,
//     Contact Group ID, imported file name, sender name or Workspace name may
//     appear anywhere in it — asserted against values DERIVED from each batch, so
//     nothing is hard-coded and a newly added field is caught automatically.
//
//  3. Staleness detection. `computeInputVersion` must change when any single
//     field of the input changes and must not change when nothing did.
//
//  4. That `resolvePreparation` reshapes the CANONICAL engine's output rather
//     than inventing a second Policy evaluator: every requirement must name a
//     real Policy and every recommendation must name a real Rule.
//
// HOW THE PROFILE IS CONTROLLED — and why not with `vi.stubEnv`.
//
// `capability-resolver` derives `ACTIVE_LAUNCH_PROFILE` from
// `import.meta.env.VITE_LAUNCH_PROFILE` at module scope. In this repository
// `vi.stubEnv` cannot reach that value: it writes `process.env`, and under
// Vitest 3.2.4 with no `.env` file the `VITE_`-prefixed variable declared in
// `vitest.config.ts`'s `test.env` never lands on `import.meta.env` at all. That
// was verified by probe, not assumed — see the command report. Two consequences:
//
//   - The suite really runs under `launch-default`, so this capability resolves
//     UNAVAILABLE by default and every "engine ran" test must switch it on.
//   - The switch used here is a spy on the ONE gate the module under test
//     consumes, `isCapabilityInActiveProfile`. The launch-profile behaviour it
//     stands in for is asserted separately and for real, against the registry and
//     the production `resolveCapability` for both profiles.
//
// TEST DATA: fictional throughout. Authored addresses use `example.test`
// (RFC 6761 reserved). Production fixture batches are read, never modified.

import { beforeEach, describe, expect, it, vi } from "vitest";

import {
  RESOLUTION_CAPABILITY_ID,
  RESOLUTION_DISABLED_NOTICE,
  RESOLUTION_FRONTEND_NOTICE,
  RESOLUTION_STATUS_LABELS,
  blockingIssues,
  buildResolutionInput,
  computeInputVersion,
  isResolutionAvailable,
  recommendationTargetField,
  recommendationValue,
  resolvePreparation,
  type AutomationRecommendation,
  type PreparationResolutionInput,
  type ResolutionStatus,
} from "../preparation-resolution";

import * as capabilityResolver from "../../config/capability-resolver";
import { buildCapabilityContext, resolveCapability } from "../../config/capability-resolver";
import { getCapability } from "../../config/product-capability-registry";
import { PROFILE_MATURITY_ALLOWLIST } from "../../models/product-capability";
import type { LaunchProfileId } from "../../models/product-capability";

import { workflowAutomationService } from "../mock/workflow-automation.service";
import { BULK_SEND_BATCH_FIXTURES } from "../../data/mock/bulk-send";
import {
  EMPTY_VALIDATION_SUMMARY,
  bulkSendBatchId,
  bulkSendColumnId,
  bulkSendRowId,
} from "../../models/bulk-send";
import type {
  BulkSendBatch,
  BulkSendDefaultSource,
  BulkSendRecipientRow,
  BulkSendRequestDefaults,
  BulkSendResolvedValue,
  BulkSendRoleMapping,
  BulkSendRoleMappingId,
  BulkSendSourceSchema,
} from "../../models/bulk-send";
import type { PrepAuthMethodId } from "../../models/prepare";
import type { RoutingMode } from "../../models/transaction-detail";
import {
  TEST_EARLIER_ISO,
  TEST_HEADERS,
  TEST_NOW_ISO,
  TEST_ROWS,
  TEST_WORKSPACE_ID,
  TEST_WORKSPACE_NAME,
} from "../../../test/fixtures";

// ── Capability control ───────────────────────────────────────────────────────

/** Puts the capability inside the active profile, as `enterprise-preview` does. */
function withResolutionCapability() {
  return vi
    .spyOn(capabilityResolver, "isCapabilityInActiveProfile")
    .mockImplementation((id) => id === RESOLUTION_CAPABILITY_ID);
}

/** Puts the capability outside the active profile, as `launch-default` does. */
function withoutResolutionCapability() {
  return vi
    .spyOn(capabilityResolver, "isCapabilityInActiveProfile")
    .mockReturnValue(false);
}

/** A context that satisfies every per-user check, isolating the profile gate. */
function fullyPermittedIn(profile: LaunchProfileId) {
  return buildCapabilityContext(profile, ["view_workflow_automation"], {
    automationEnabled: true,
  });
}

// ── Local builders ───────────────────────────────────────────────────────────
//
// A batch is built here rather than driven through `bulkSendService` because
// `buildResolutionInput` is a pure function of the batch: constructing the batch
// directly keeps every field under the test's control and keeps the suite
// synchronous, so a failure names the field rather than the async setup.

const TEST_BATCH_ID = "bsb_resolution_test";
const COLUMN_IDS = ["col_name", "col_email", "col_org"] as const;

/** Recipient values authored for this suite. All must stay out of the input. */
const AUTHORED_RECIPIENT_VALUES: readonly string[] = [
  "Ana Test Reyes",
  "ana.reyes@example.test",
  "Test Legal Partners",
  "Ben Test Cruz",
  "ben.cruz@example.test",
  "Test Holdings",
];

function makeSchema(overrides: Partial<BulkSendSourceSchema> = {}): BulkSendSourceSchema {
  return {
    columns: TEST_HEADERS.map((header, index) => ({
      id: bulkSendColumnId(COLUMN_IDS[index] ?? `col_${index}`),
      header,
      normalizedHeader: header.toLowerCase(),
      index,
      sampleValues: [],
      duplicateHeader: false,
    })),
    rowCount: TEST_ROWS.length,
    source: "structured-paste",
    fileNameDirection: null,
    fileSizeBytes: null,
    detectedDelimiter: null,
    headerDetected: true,
    parseWarnings: [],
    ...overrides,
  };
}

function makeRow(index: number, overrides: Partial<BulkSendRecipientRow> = {}): BulkSendRecipientRow {
  const cells = TEST_ROWS[index] ?? [];
  const values: Record<string, string> = {};
  COLUMN_IDS.forEach((columnId, i) => {
    values[columnId] = cells[i] ?? "";
  });
  return {
    id: bulkSendRowId(`bsr_test_${index + 1}`),
    batchId: bulkSendBatchId(TEST_BATCH_ID),
    rowNumber: index + 1,
    source: "structured-paste",
    contactId: null,
    contactGroupId: null,
    values,
    originalValues: { ...values },
    status: "ready-in-demonstration",
    excluded: false,
    exclusionReason: null,
    projectionId: null,
    duplicateGroupKey: null,
    editedInSession: false,
    ...overrides,
  };
}

function resolvedValue<T>(
  value: T,
  source: BulkSendDefaultSource = "product-default",
): BulkSendResolvedValue<T> {
  return { value, source, conflict: false, conflictExplanation: null };
}

function makeDefaults(overrides: Partial<BulkSendRequestDefaults> = {}): BulkSendRequestDefaults {
  return {
    requestTitlePattern: resolvedValue("{{recipient_name}}", "template"),
    senderMessage: resolvedValue(""),
    routingMode: resolvedValue<RoutingMode>("sequential", "template"),
    authMethod: resolvedValue<PrepAuthMethodId>("email-otp", "template"),
    consentRequired: resolvedValue(true),
    dueDateDirection: resolvedValue<string | null>(null),
    expirationDirection: resolvedValue<string | null>(null),
    completionCopyDirection: resolvedValue<string | null>(null),
    verificationDirection: resolvedValue<string | null>(null),
    ...overrides,
  };
}

function makeRoleMapping(suffix: string, boundColumnId: string | null): BulkSendRoleMapping {
  return {
    id: `bsrm_${suffix}` as BulkSendRoleMappingId,
    placeholderId: `role_${suffix}`,
    placeholderLabel: "Test Signer",
    role: "signer",
    required: true,
    columnByField: {
      displayName: boundColumnId ? bulkSendColumnId(boundColumnId) : null,
      email: null,
      organization: null,
    },
    authMethod: "email-otp",
    confidence: { displayName: null, email: null, organization: null },
  };
}

function makeBatch(overrides: Partial<BulkSendBatch> = {}): BulkSendBatch {
  return {
    id: bulkSendBatchId(TEST_BATCH_ID),
    name: "Preparation Resolution Test Batch",
    status: "needs-review",
    scope: {
      workspaceId: TEST_WORKSPACE_ID,
      workspaceName: TEST_WORKSPACE_NAME,
      teamId: null,
      teamName: null,
      senderId: "wm_test_sender",
      senderName: "Test Sender Reyes",
    },
    templateId: "tpl-test-agreement",
    templateName: "Test Agreement Template",
    templateArchived: false,
    schema: makeSchema(),
    rows: [makeRow(0), makeRow(1)],
    roleMappings: [],
    variableMappings: [],
    defaults: null,
    organization: {
      folderId: null, folderName: null, tagIds: [], tagNames: [],
      folderArchived: false, archivedTagNames: [],
    },
    policy: { policyId: null, policyName: null, stale: false, appliedValues: [] },
    automation: { ruleId: null, ruleName: null, stale: false, projectedActions: [], conflicts: [] },
    validation: { ...EMPTY_VALIDATION_SUMMARY, totalRows: 2, ready: 2 },
    duplicates: [],
    results: null,
    appliedConfigurationId: null,
    createdAtDemonstration: TEST_EARLIER_ISO,
    updatedAtDemonstration: TEST_NOW_ISO,
    demonstrationOnly: true,
    ...overrides,
  };
}

/**
 * Every private string a batch holds. This is the forbidden set for the privacy
 * assertions and is DERIVED, so a batch fixture gaining a new recipient is
 * covered without editing this file.
 */
function privateValuesOf(batch: BulkSendBatch): string[] {
  const out = new Set<string>();
  const add = (v: string | null | undefined) => {
    if (typeof v === "string" && v.trim().length >= 4) out.add(v);
  };

  add(batch.name);
  add(batch.scope.senderName);
  add(batch.scope.senderId);
  add(batch.scope.workspaceId);
  add(batch.scope.workspaceName);
  add(batch.scope.teamId);
  add(batch.scope.teamName);
  add(batch.schema?.fileNameDirection);

  for (const row of batch.rows) {
    add(row.contactId);
    add(row.contactGroupId);
    add(row.exclusionReason);
    for (const v of Object.values(row.values)) add(v);
    for (const v of Object.values(row.originalValues)) add(v);
  }

  return [...out];
}

function assertNoPrivateValues(serialized: string, forbidden: readonly string[]): void {
  const leaked = forbidden.filter((f) => serialized.includes(f));
  expect(leaked, `these private values leaked into the resolution surface: ${leaked.join(" | ")}`)
    .toEqual([]);
}

// ── 1. Capability gating ─────────────────────────────────────────────────────

describe("resolution capability — profile boundary", () => {
  it("is the ONE registered workflow-automation capability, not a private flag", () => {
    expect(RESOLUTION_CAPABILITY_ID).toBe("workflow-automation");
    expect(getCapability(RESOLUTION_CAPABILITY_ID)?.maturity).toBe("enterprise-preview");
  });

  it("is excluded from the launch-default profile by the maturity allowlist", () => {
    // The data behind the gate. If someone reclassified the capability or widened
    // the allowlist, Policy and Automation would silently start resolving in the
    // public launch profile.
    expect(PROFILE_MATURITY_ALLOWLIST["launch-default"]).not.toContain("enterprise-preview");
    expect(PROFILE_MATURITY_ALLOWLIST["enterprise-preview"]).toContain("enterprise-preview");
  });

  it("resolves UNAVAILABLE in launch-default even for a fully permitted user", () => {
    const resolution = resolveCapability(RESOLUTION_CAPABILITY_ID, fullyPermittedIn("launch-default"));
    expect(resolution.available).toBe(false);
    expect(resolution.outcome).toBe("unavailable-profile");
    // Permission and feature flag were both granted, so only the profile can
    // have refused it.
    expect(resolution.reasonLabel).toContain("Enterprise Preview");
  });

  it("resolves AVAILABLE as a preview in the enterprise-preview profile", () => {
    const resolution = resolveCapability(
      RESOLUTION_CAPABILITY_ID, fullyPermittedIn("enterprise-preview"),
    );
    expect(resolution.available).toBe(true);
    expect(resolution.preview).toBe(true);
  });

  it("isResolutionAvailable asks the registry about the registered capability", () => {
    const spy = withResolutionCapability();
    expect(isResolutionAvailable()).toBe(true);
    expect(spy).toHaveBeenCalledWith(RESOLUTION_CAPABILITY_ID);
  });

  it("isResolutionAvailable returns a boolean, never a truthy value", () => {
    withoutResolutionCapability();
    expect(isResolutionAvailable()).toBe(false);
  });

  it("tracks the active profile rather than caching its own answer", () => {
    withoutResolutionCapability();
    expect(isResolutionAvailable()).toBe(false);
    withResolutionCapability();
    expect(isResolutionAvailable()).toBe(true);
  });
});

describe("resolvePreparation — capability outside the active profile", () => {
  beforeEach(() => {
    withoutResolutionCapability();
  });

  it("returns capability-disabled and NEVER calls the automation engine", () => {
    const runSimulation = vi.spyOn(workflowAutomationService, "runSimulation");
    const listPolicies = vi.spyOn(workflowAutomationService, "listPolicies");
    const listConflicts = vi.spyOn(workflowAutomationService, "listConflicts");
    const resolveDefaults = vi.spyOn(workflowAutomationService, "resolveDefaultsForContext");

    const input = buildResolutionInput(makeBatch({ defaults: makeDefaults() }));
    const result = resolvePreparation(input);

    expect(result.ok).toBe(true);
    if (!result.ok) throw new Error("unreachable");

    expect(result.data.status).toBe("capability-disabled");
    expect(result.data.notice).toBe(RESOLUTION_DISABLED_NOTICE);
    expect(result.data.requirements).toEqual([]);
    expect(result.data.recommendations).toEqual([]);
    expect(result.data.conflicts).toEqual([]);
    expect(result.data.skipped).toEqual([]);
    expect(result.data.matchedRuleNames).toEqual([]);

    // The whole point of the profile gate: the engine is not consulted, so no
    // Rule or Policy definition the profile excludes is even read.
    expect(runSimulation).not.toHaveBeenCalled();
    expect(listPolicies).not.toHaveBeenCalled();
    expect(listConflicts).not.toHaveBeenCalled();
    expect(resolveDefaults).not.toHaveBeenCalled();
  });

  it("still fingerprints the input identically, so gating does not fake staleness", () => {
    const input = buildResolutionInput(makeBatch({ defaults: makeDefaults() }));
    const disabled = resolvePreparation(input);
    if (!disabled.ok) throw new Error("unreachable");

    expect(disabled.data.inputVersion).toBe(computeInputVersion(input));
    expect(disabled.data.inputSummary).toEqual(input);
    expect(blockingIssues(disabled.data)).toBe(0);
  });

  it("reports the capability as out of profile without naming a different feature", () => {
    // Three capabilities share the enterprise-preview maturity; naming the wrong
    // one would tell a user their unrelated feature is unavailable.
    expect(RESOLUTION_DISABLED_NOTICE).toContain("Workflow Automation");
    expect(RESOLUTION_DISABLED_NOTICE).not.toContain("Bulk Send");
    expect(RESOLUTION_DISABLED_NOTICE).not.toContain("Collaboration");
    expect(RESOLUTION_DISABLED_NOTICE).toContain("Recipient preparation is unaffected");
  });

  it("gives the disabled status a user-facing label", () => {
    expect(RESOLUTION_STATUS_LABELS["capability-disabled"])
      .toBe("Not available in this product profile");
  });
});

// ── 2. buildResolutionInput — the privacy invariant ──────────────────────────

describe("buildResolutionInput — carries only scalar, non-identifying fields", () => {
  it("contains no nested object or array value", () => {
    const input = buildResolutionInput(
      makeBatch({ defaults: makeDefaults(), roleMappings: [makeRoleMapping("a", "col_name")] }),
    );

    const nonScalar = Object.entries(input as unknown as Record<string, unknown>)
      .filter(([, v]) => v !== null && typeof v === "object")
      .map(([k]) => k);

    // A nested value is how a row, a Contact, or a mapping table would smuggle
    // recipient data into an object destined for a log.
    expect(nonScalar).toEqual([]);
  });

  it("leaks no authored recipient name, email direction, or organization", () => {
    const input = buildResolutionInput(makeBatch({ defaults: makeDefaults() }));
    assertNoPrivateValues(JSON.stringify(input), AUTHORED_RECIPIENT_VALUES);
  });

  it("leaks nothing private from the batch — every string field asserted", () => {
    const batch = makeBatch({
      defaults: makeDefaults(),
      rows: [
        makeRow(0, { contactId: "ct_test_ana", contactGroupId: "cg_test_reviewers" }),
        makeRow(1, { excluded: true, exclusionReason: "Excluded during review — Ben Test Cruz" }),
      ],
    });
    assertNoPrivateValues(JSON.stringify(buildResolutionInput(batch)), privateValuesOf(batch));
  });

  it.each(BULK_SEND_BATCH_FIXTURES.map((b) => [String(b.id), b] as const))(
    "leaks nothing private from production batch fixture %s",
    (_id, fixture) => {
      const batch = JSON.parse(JSON.stringify(fixture)) as BulkSendBatch;
      assertNoPrivateValues(JSON.stringify(buildResolutionInput(batch)), privateValuesOf(batch));
    },
  );

  it("records the recipient source as a KIND and never the imported file name", () => {
    const batch = makeBatch({
      schema: makeSchema({
        source: "local-csv-preview",
        fileNameDirection: "test-recipients-list.csv",
        fileSizeBytes: 2048,
        detectedDelimiter: ",",
      }),
    });

    const input = buildResolutionInput(batch);
    expect(input.sourceKind).toBe("local-csv-preview");
    expect(JSON.stringify(input)).not.toContain("test-recipients-list.csv");
    expect(JSON.stringify(input)).not.toContain("2048");
  });

  it("carries no source at all when the batch has no schema", () => {
    expect(buildResolutionInput(makeBatch({ schema: null })).sourceKind).toBeNull();
  });
});

// ── 3. buildResolutionInput — field derivation ───────────────────────────────

describe("buildResolutionInput — derived counts and flags", () => {
  it("separates the total recipient count from the included count", () => {
    const input = buildResolutionInput(
      makeBatch({ rows: [makeRow(0), makeRow(1, { excluded: true })] }),
    );
    expect(input.recipientCount).toBe(2);
    expect(input.includedCount).toBe(1);
  });

  it("counts an edited included row as an explicit override", () => {
    const edited = makeRow(0);
    edited.values["col_org"] = "Test Legal Partners Revised";

    const input = buildResolutionInput(makeBatch({ rows: [edited, makeRow(1)] }));
    expect(input.explicitRowOverrides).toBe(1);
  });

  it("does NOT count an edited row that was excluded from the batch", () => {
    const editedThenExcluded = makeRow(0, { excluded: true });
    editedThenExcluded.values["col_org"] = "Test Legal Partners Revised";

    const input = buildResolutionInput(makeBatch({ rows: [editedThenExcluded, makeRow(1)] }));
    expect(input.explicitRowOverrides).toBe(0);
  });

  it("counts an override as a NUMBER only — never which row or what changed", () => {
    const edited = makeRow(0);
    edited.values["col_email"] = "ana.revised@example.test";

    const input = buildResolutionInput(makeBatch({ rows: [edited, makeRow(1)] }));
    expect(input.explicitRowOverrides).toBe(1);
    expect(JSON.stringify(input)).not.toContain("ana.revised@example.test");
    expect(JSON.stringify(input)).not.toContain(String(edited.id));
  });

  it("reports null direction rather than a guess when the batch has no defaults", () => {
    const input = buildResolutionInput(makeBatch({ defaults: null }));
    expect(input.routingMode).toBeNull();
    expect(input.authMethod).toBeNull();
    expect(input.consentRequired).toBeNull();
    expect(input.expirationSet).toBe(false);
    expect(input.requestOverrides).toBe(0);
  });

  it("maps resolved defaults onto scalar direction fields", () => {
    const input = buildResolutionInput(
      makeBatch({
        defaults: makeDefaults({
          routingMode: resolvedValue<RoutingMode>("parallel", "user"),
          authMethod: resolvedValue<PrepAuthMethodId>("sms-otp", "user"),
          consentRequired: resolvedValue(false),
          expirationDirection: resolvedValue<string | null>("14 days after the request begins"),
        }),
      }),
    );
    expect(input.routingMode).toBe("parallel");
    expect(input.authMethod).toBe("sms-otp");
    expect(input.consentRequired).toBe(false);
    expect(input.expirationSet).toBe(true);
  });

  it("counts request overrides as only those the user set, not inherited values", () => {
    const noOverrides = buildResolutionInput(makeBatch({ defaults: makeDefaults() }));
    expect(noOverrides.requestOverrides).toBe(0);

    const twoOverrides = buildResolutionInput(
      makeBatch({
        defaults: makeDefaults({
          routingMode: resolvedValue<RoutingMode>("parallel", "user"),
          consentRequired: resolvedValue(false, "user"),
          authMethod: resolvedValue<PrepAuthMethodId>("sms-otp", "workflow-policy"),
        }),
      }),
    );
    expect(twoOverrides.requestOverrides).toBe(2);
  });

  it("counts only role mappings that actually bind a column", () => {
    const input = buildResolutionInput(
      makeBatch({
        roleMappings: [
          makeRoleMapping("bound", "col_name"),
          makeRoleMapping("unbound", null),
          makeRoleMapping("also_unbound", null),
        ],
      }),
    );
    expect(input.mappedRoleCount).toBe(1);
    expect(input.totalRoleCount).toBe(3);
  });

  it("passes the validation severity counts through unchanged", () => {
    const input = buildResolutionInput(
      makeBatch({
        validation: {
          ...EMPTY_VALIDATION_SUMMARY,
          totalRows: 9, ready: 4, warning: 2, incomplete: 2, duplicate: 1,
        },
      }),
    );
    expect(input.readyCount).toBe(4);
    expect(input.warningCount).toBe(2);
    expect(input.incompleteCount).toBe(2);
    expect(input.duplicateCount).toBe(1);
  });

  it("tracks whether a Template is active, and its name only", () => {
    const withTemplate = buildResolutionInput(makeBatch());
    expect(withTemplate.templateActive).toBe(true);
    expect(withTemplate.templateName).toBe("Test Agreement Template");

    const withoutTemplate = buildResolutionInput(
      makeBatch({ templateId: null, templateName: null }),
    );
    expect(withoutTemplate.templateActive).toBe(false);
    expect(withoutTemplate.templateName).toBeNull();
  });

  it("carries the batch lifecycle status verbatim", () => {
    expect(buildResolutionInput(makeBatch({ status: "mapping-required" })).batchStatus)
      .toBe("mapping-required");
  });

  it("does not mutate the batch it reads", () => {
    const batch = makeBatch({ defaults: makeDefaults() });
    const before = JSON.stringify(batch);
    buildResolutionInput(batch);
    expect(JSON.stringify(batch)).toBe(before);
  });
});

// ── 4. computeInputVersion — staleness detection ─────────────────────────────

describe("computeInputVersion", () => {
  const baseInput = (): PreparationResolutionInput =>
    buildResolutionInput(makeBatch({ defaults: makeDefaults() }));

  it("is stable for the same input", () => {
    expect(computeInputVersion(baseInput())).toBe(computeInputVersion(baseInput()));
  });

  it("is stable across a structural clone of the same input", () => {
    const input = baseInput();
    const clone = JSON.parse(JSON.stringify(input)) as PreparationResolutionInput;
    expect(computeInputVersion(clone)).toBe(computeInputVersion(input));
  });

  it("does not depend on property insertion order", () => {
    const input = baseInput();
    const reversed = Object.fromEntries(
      Object.entries(input as unknown as Record<string, unknown>).reverse(),
    ) as unknown as PreparationResolutionInput;
    expect(computeInputVersion(reversed)).toBe(computeInputVersion(input));
  });

  it("changes when ANY single field of the input changes", () => {
    const input = baseInput();
    const original = computeInputVersion(input);
    const bag = input as unknown as Record<string, unknown>;

    const unchanged: string[] = [];
    for (const key of Object.keys(bag)) {
      const value = bag[key];
      const next =
        typeof value === "number" ? value + 1
        : typeof value === "boolean" ? !value
        : typeof value === "string" ? `${value}-changed`
        : "changed-from-null";

      const mutated = { ...bag, [key]: next } as unknown as PreparationResolutionInput;
      if (computeInputVersion(mutated) === original) unchanged.push(key);
    }

    // A field the fingerprint ignores is a field whose change would never be
    // detected as stale, so the user would keep seeing a superseded evaluation.
    expect(unchanged, `these fields do not affect the input version: ${unchanged.join(", ")}`)
      .toEqual([]);
  });

  it("changes when a recipient row is excluded from the batch", () => {
    const before = computeInputVersion(buildResolutionInput(makeBatch()));
    const after = computeInputVersion(
      buildResolutionInput(makeBatch({ rows: [makeRow(0), makeRow(1, { excluded: true })] })),
    );
    expect(after).not.toBe(before);
  });

  it("changes when a request default is overridden", () => {
    const before = computeInputVersion(
      buildResolutionInput(makeBatch({ defaults: makeDefaults() })),
    );
    const after = computeInputVersion(
      buildResolutionInput(
        makeBatch({
          defaults: makeDefaults({
            authMethod: resolvedValue<PrepAuthMethodId>("sms-otp", "user"),
          }),
        }),
      ),
    );
    expect(after).not.toBe(before);
  });

  it("does NOT change when only the batch name or recipient identity changes", () => {
    // The fingerprint is built from the minimized input, so private edits that
    // do not alter any resolution-relevant scalar must not invalidate a result.
    const first = makeBatch({ name: "Batch One" });
    const second = makeBatch({
      name: "Batch Two",
      rows: [
        makeRow(0, { id: bulkSendRowId("bsr_other_1"), contactId: "ct_other" }),
        makeRow(1, { id: bulkSendRowId("bsr_other_2") }),
      ],
    });
    expect(computeInputVersion(buildResolutionInput(second)))
      .toBe(computeInputVersion(buildResolutionInput(first)));
  });

  it("produces a short opaque token, not a serialization of the input", () => {
    const version = computeInputVersion(baseInput());
    expect(version).toMatch(/^v[0-9a-z]{1,7}$/);
    expect(version).not.toContain("Test Agreement Template");
  });
});

// ── 5. resolvePreparation — capability inside the active profile ─────────────

function availableInput(overrides: Partial<BulkSendBatch> = {}): PreparationResolutionInput {
  return buildResolutionInput(makeBatch({ defaults: makeDefaults(), ...overrides }));
}

describe("resolvePreparation — well-formed result", () => {
  beforeEach(() => {
    withResolutionCapability();
  });

  it("returns a result whose status has a user-facing label", () => {
    const result = resolvePreparation(availableInput());
    expect(result.ok).toBe(true);
    if (!result.ok) throw new Error("unreachable");

    const labelled = Object.keys(RESOLUTION_STATUS_LABELS) as ResolutionStatus[];
    expect(labelled).toContain(result.data.status);
    expect(RESOLUTION_STATUS_LABELS[result.data.status]).not.toBe("");
    expect(result.data.status).not.toBe("capability-disabled");
  });

  it("carries the frontend-only notice and the exact input it evaluated", () => {
    const input = availableInput();
    const result = resolvePreparation(input);
    if (!result.ok) throw new Error("unreachable");

    expect(result.data.notice).toBe(RESOLUTION_FRONTEND_NOTICE);
    expect(result.data.inputSummary).toEqual(input);
    // A caller detects staleness by recomputing the version from the current
    // batch and comparing. That only works if the two agree here.
    expect(result.data.inputVersion).toBe(computeInputVersion(input));
    expect(Number.isNaN(Date.parse(result.data.evaluatedAtDemonstration))).toBe(false);
  });

  it("states plainly that nothing was enforced, executed, or sent", () => {
    expect(RESOLUTION_FRONTEND_NOTICE).toContain("No production Policy was enforced");
    expect(RESOLUTION_FRONTEND_NOTICE).toContain("no Automation Rule was executed by a backend");
    expect(RESOLUTION_FRONTEND_NOTICE)
      .toContain("no notification, reminder, or invitation was created or sent");
  });

  it("does not mutate the input it was given", () => {
    const input = availableInput();
    const before = JSON.stringify(input);
    resolvePreparation(input);
    expect(JSON.stringify(input)).toBe(before);
  });

  it("reports requirements when active Policies exist", () => {
    const result = resolvePreparation(availableInput());
    if (!result.ok) throw new Error("unreachable");

    expect(result.data.requirements.length).toBeGreaterThan(0);
    expect(result.data.status).toBe("resolved-with-requirements");
  });

  it("names a real Policy for every requirement — no second Policy evaluator", () => {
    const result = resolvePreparation(availableInput());
    if (!result.ok) throw new Error("unreachable");

    const policies = workflowAutomationService.listPolicies();
    expect(policies.ok).toBe(true);
    if (!policies.ok) throw new Error("unreachable");
    const realNames = new Set(policies.data.map((p) => p.name));

    for (const requirement of result.data.requirements) {
      expect(realNames.has(requirement.policyName)).toBe(true);
      // A safe display label, never an internal identifier.
      expect(requirement.policyName).not.toMatch(/^pol_/);
      expect(requirement.title.length).toBeGreaterThan(0);
      expect(requirement.explanation.length).toBeGreaterThan(0);
      expect(["blocking", "warning", "info"]).toContain(requirement.severity);
    }
  });

  it("draws requirements only from ACTIVE Policies", () => {
    const policies = workflowAutomationService.listPolicies();
    if (!policies.ok) throw new Error("unreachable");
    const inactiveNames = new Set(
      policies.data.filter((p) => p.status !== "active").map((p) => p.name),
    );
    expect(inactiveNames.size).toBeGreaterThan(0);

    const result = resolvePreparation(availableInput());
    if (!result.ok) throw new Error("unreachable");

    for (const requirement of result.data.requirements) {
      expect(inactiveNames.has(requirement.policyName)).toBe(false);
    }
  });

  it("names a real Rule for every recommendation — no second Rule engine", () => {
    const result = resolvePreparation(availableInput());
    if (!result.ok) throw new Error("unreachable");

    const rules = workflowAutomationService.listRules();
    expect(rules.ok).toBe(true);
    if (!rules.ok) throw new Error("unreachable");
    const realNames = new Set(rules.data.map((r) => r.name));

    expect(result.data.recommendations.length).toBeGreaterThan(0);
    for (const recommendation of result.data.recommendations) {
      expect(realNames.has(recommendation.ruleName)).toBe(true);
      expect(result.data.matchedRuleNames).toContain(recommendation.ruleName);
    }
  });

  it("keeps mandatory Policy outcomes and optional Rule outcomes in separate lists", () => {
    const result = resolvePreparation(availableInput());
    if (!result.ok) throw new Error("unreachable");

    const requirementIds = result.data.requirements.map((r) => r.id);
    const recommendationIds = result.data.recommendations.map((r) => r.id);

    expect(requirementIds.every((id) => id.startsWith("req-"))).toBe(true);
    expect(recommendationIds.every((id) => id.startsWith("rec-"))).toBe(true);
    expect(requirementIds.filter((id) => recommendationIds.includes(id))).toEqual([]);
  });

  it("gives every recommendation a unique id so a list cannot collapse rows", () => {
    const result = resolvePreparation(availableInput());
    if (!result.ok) throw new Error("unreachable");

    const ids = result.data.recommendations.map((r) => r.id);
    expect(new Set(ids).size).toBe(ids.length);
  });
});

describe("resolvePreparation — Policy requirement severity", () => {
  beforeEach(() => {
    withResolutionCapability();
  });

  it("blocks when no authentication direction is set and a Policy states a minimum", () => {
    const noAuth: PreparationResolutionInput = { ...availableInput(), authMethod: null };

    const result = resolvePreparation(noAuth);
    if (!result.ok) throw new Error("unreachable");

    const authRequirement = result.data.requirements.find((r) => r.id === "req-participant-auth");
    expect(authRequirement).toBeDefined();
    expect(authRequirement?.blocking).toBe(true);
    expect(authRequirement?.severity).toBe("blocking");
    // A blocking outcome must always tell the user where to go.
    expect(authRequirement?.repairLabel).toBe("Open Defaults");
    expect(blockingIssues(result.data)).toBeGreaterThan(0);
  });

  it("does NOT block when an authentication direction is set", () => {
    const input = availableInput();
    expect(input.authMethod).toBe("email-otp");

    const result = resolvePreparation(input);
    if (!result.ok) throw new Error("unreachable");

    const authRequirement = result.data.requirements.find((r) => r.id === "req-participant-auth");
    expect(authRequirement?.blocking).toBe(false);
    expect(authRequirement?.severity).toBe("info");
    expect(authRequirement?.repairLabel).toBeNull();
    expect(blockingIssues(result.data)).toBe(0);
  });

  it("treats an explicit 'none' direction as not satisfying the Policy minimum", () => {
    const result = resolvePreparation({ ...availableInput(), authMethod: "none" });
    if (!result.ok) throw new Error("unreachable");
    expect(result.data.requirements.find((r) => r.id === "req-participant-auth")?.blocking)
      .toBe(true);
  });

  it("compares the Policy's underscored value against the hyphenated preparation id", () => {
    // The engine stores `email_otp`; preparation uses `email-otp`. A raw compare
    // would report every batch as violating the Policy.
    const result = resolvePreparation({ ...availableInput(), authMethod: "email-otp" });
    if (!result.ok) throw new Error("unreachable");

    const authRequirement = result.data.requirements.find((r) => r.id === "req-participant-auth");
    expect(authRequirement?.blocking).toBe(false);
    // Displayed to a person, so neither underscores nor hyphens survive.
    expect(authRequirement?.requiredValue).not.toContain("_");
    expect(authRequirement?.requiredValue).toContain("or stronger");
    expect(authRequirement?.currentValue).not.toContain("-");
  });

  it("holds the invariant: blocking implies severity blocking AND a repair label", () => {
    for (const authMethod of [null, "none", "email-otp", "sms-otp", "id-verification"]) {
      const input: PreparationResolutionInput = { ...availableInput(), authMethod };
      const result = resolvePreparation(input);
      if (!result.ok) throw new Error("unreachable");

      for (const requirement of result.data.requirements) {
        if (!requirement.blocking) continue;
        expect(requirement.severity).toBe("blocking");
        expect(requirement.repairLabel).not.toBeNull();
      }
    }
  });
});

describe("resolvePreparation — Automation recommendations", () => {
  beforeEach(() => {
    withResolutionCapability();
  });

  it("never presents a recommendation as unapplicable without saying why", () => {
    const result = resolvePreparation(availableInput());
    if (!result.ok) throw new Error("unreachable");

    for (const recommendation of result.data.recommendations) {
      if (recommendation.applicable) {
        expect(recommendation.unsupportedReason).toBeNull();
      } else {
        // Honesty rule: an unapplicable recommendation must never be shown as a
        // silently dead control.
        expect(recommendation.unsupportedReason).not.toBeNull();
        expect(String(recommendation.unsupportedReason).length).toBeGreaterThan(0);
      }
    }
  });

  it("reports every shipped engine recommendation as NOT applicable from preparation", () => {
    // Documents the current shipped reality: the engine emits dotted paths
    // (`settings.reminders.enabled`) while the applicable set holds bare field
    // names, so nothing the engine can produce is applicable today. See the
    // defect note in the command report.
    const result = resolvePreparation(availableInput());
    if (!result.ok) throw new Error("unreachable");

    expect(result.data.recommendations.length).toBeGreaterThan(0);
    for (const recommendation of result.data.recommendations) {
      expect(recommendation.applicable).toBe(false);
      expect(recommendationTargetField(recommendation)).toBeNull();
    }
  });

  it("gives every recommendation a readable title and a current/proposed pair", () => {
    const result = resolvePreparation(availableInput());
    if (!result.ok) throw new Error("unreachable");

    for (const recommendation of result.data.recommendations) {
      expect(recommendation.title).not.toBe("");
      expect(recommendation.title).toContain("—");
      expect(recommendation.currentValue).not.toBe("");
      expect(recommendation.proposedValue).not.toBe("");
      expect(recommendation.reason).toContain(recommendation.ruleName);
    }
  });

  it("takes recommendations only from Rule-sourced projected changes", () => {
    const simulation = workflowAutomationService.runSimulation({
      triggerKind: "transaction_created",
      participantCount: 2,
    });
    if (!simulation.ok) throw new Error("unreachable");
    const ruleSourced = simulation.data.projectedChanges.filter((c) => c.source === "rule");

    const result = resolvePreparation(availableInput());
    if (!result.ok) throw new Error("unreachable");

    expect(result.data.recommendations).toHaveLength(ruleSourced.length);
    expect(result.data.recommendations.map((r) => r.field))
      .toEqual(ruleSourced.map((c) => c.field));
  });
});

describe("resolvePreparation — conflicts", () => {
  beforeEach(() => {
    withResolutionCapability();
  });

  it("surfaces every UNRESOLVED workspace conflict, flagged or not", () => {
    const result = resolvePreparation(availableInput());
    if (!result.ok) throw new Error("unreachable");

    const openConflicts = workflowAutomationService.listConflicts({ resolved: false });
    expect(openConflicts.ok).toBe(true);
    if (!openConflicts.ok) throw new Error("unreachable");

    expect(result.data.conflicts.map((c) => c.id).sort())
      .toEqual(openConflicts.data.map((c) => String(c.id)).sort());
    expect(result.data.conflicts.length).toBeGreaterThan(0);
  });

  it("omits a conflict once it has been resolved in Automation", () => {
    const open = workflowAutomationService.listConflicts({ resolved: false });
    if (!open.ok) throw new Error("unreachable");
    const first = open.data[0];
    expect(first).toBeDefined();
    if (!first) throw new Error("unreachable");

    expect(workflowAutomationService.resolveConflict(
      first.id, "acknowledge_and_proceed", "Resolved by the test.",
    ).ok).toBe(true);

    const result = resolvePreparation(availableInput());
    if (!result.ok) throw new Error("unreachable");
    expect(result.data.conflicts.map((c) => c.id)).not.toContain(String(first.id));
  });

  it("describes a conflict's sources as counts only, never another Team's definitions", () => {
    const result = resolvePreparation(availableInput());
    if (!result.ok) throw new Error("unreachable");

    const raw = workflowAutomationService.listConflicts({ resolved: false });
    if (!raw.ok) throw new Error("unreachable");
    const involvedIds = raw.data.flatMap((c) => [
      ...c.involvedRuleIds.map(String),
      ...c.involvedPolicyIds.map(String),
    ]);
    expect(involvedIds.length).toBeGreaterThan(0);

    for (const conflict of result.data.conflicts) {
      expect(conflict.sources).toHaveLength(2);
      expect(conflict.sources[0]).toMatch(/^\d+ Rule\(s\)$/);
      expect(conflict.sources[1]).toMatch(/^\d+ Policy\(ies\)$/);
      const serializedSources = conflict.sources.join(" ");
      for (const id of involvedIds) {
        expect(serializedSources).not.toContain(id);
      }
    }
  });

  it("does not block on a workspace conflict that had no bearing on this evaluation", () => {
    const result = resolvePreparation(availableInput());
    if (!result.ok) throw new Error("unreachable");

    expect(result.data.conflicts.length).toBeGreaterThan(0);
    for (const conflict of result.data.conflicts) {
      if (conflict.affectedThisEvaluation) continue;
      expect(conflict.blocking).toBe(false);
      expect(conflict.explanation).toContain("did not affect this");
    }
    // Blocking always implies the conflict actually touched this evaluation.
    for (const conflict of result.data.conflicts) {
      if (conflict.blocking) expect(conflict.affectedThisEvaluation).toBe(true);
    }
  });

  it("marks a conflict as affecting THIS evaluation when the engine flags it", () => {
    // Two active Rules on `transaction_created` performing the same action kind
    // make the engine's own detector raise a conflict and the simulation flag it.
    const created = workflowAutomationService.createRule({
      name: "Test second reminder direction rule",
      description: "Fictional rule created by the preparation resolution test.",
      trigger: "transaction_created",
      conditionLogic: "all",
      conditions: [],
      actions: [{
        id: workflowAutomationService.buildActionId(),
        kind: "set_reminder_defaults",
        params: { enabled: true, firstReminderDays: 9, repeatIntervalDays: 11 },
        label: "Set reminder: 9 days first, repeat every 11",
      }],
      priority: "normal",
      conflictBehavior: "merge_non_conflicting",
      scope: "workspace",
    });
    expect(created.ok).toBe(true);
    if (!created.ok) throw new Error("unreachable");
    expect(workflowAutomationService.activateRule(created.data.id).ok).toBe(true);

    const result = resolvePreparation(availableInput());
    if (!result.ok) throw new Error("unreachable");

    const flagged = result.data.conflicts.filter((c) => c.affectedThisEvaluation);
    expect(flagged.length).toBeGreaterThan(0);
    for (const conflict of flagged) {
      expect(conflict.explanation).toContain("this preparation");
      expect(conflict.explanation).not.toContain("did not affect this");
    }

    // Both matched Rules contribute, because the second declares
    // `merge_non_conflicting` rather than deferring to the higher priority.
    expect(result.data.matchedRuleNames).toContain("Test second reminder direction rule");
    expect(new Set(result.data.recommendations.map((r) => r.ruleName)).size).toBeGreaterThan(1);
  });

  it("maps engine conflict severity onto the preparation vocabulary", () => {
    const result = resolvePreparation(availableInput());
    if (!result.ok) throw new Error("unreachable");

    const raw = workflowAutomationService.listConflicts({ resolved: false });
    if (!raw.ok) throw new Error("unreachable");
    const severityById = new Map(raw.data.map((c) => [String(c.id), c.severity]));

    const expected: Record<string, string> = { error: "blocking", warning: "warning", info: "info" };
    for (const conflict of result.data.conflicts) {
      const engineSeverity = severityById.get(conflict.id);
      expect(engineSeverity).toBeDefined();
      expect(conflict.severity).toBe(expected[String(engineSeverity)]);
    }
  });
});

describe("resolvePreparation — engine failure boundary", () => {
  beforeEach(() => {
    withResolutionCapability();
  });

  it("returns a plain-language failure without leaking the engine's error code", () => {
    vi.spyOn(workflowAutomationService, "runSimulation").mockReturnValue({
      ok: false,
      error: { code: "ENGINE_INTERNAL_7734", message: "simulation store unavailable" },
    });

    const result = resolvePreparation(availableInput());
    expect(result.ok).toBe(false);
    if (result.ok) throw new Error("unreachable");

    expect(result.message).toBe("The evaluation could not be completed. Try again.");
    expect(result.message).not.toContain("ENGINE_INTERNAL_7734");
    expect(result.message).not.toContain("simulation store unavailable");
  });
});

describe("resolvePreparation — result carries no recipient data", () => {
  beforeEach(() => {
    withResolutionCapability();
  });

  it("leaks nothing private from the batch into the full result", () => {
    const batch = makeBatch({
      defaults: makeDefaults(),
      rows: [
        makeRow(0, { contactId: "ct_test_ana", contactGroupId: "cg_test_reviewers" }),
        makeRow(1),
      ],
    });

    const result = resolvePreparation(buildResolutionInput(batch));
    if (!result.ok) throw new Error("unreachable");

    assertNoPrivateValues(JSON.stringify(result.data), privateValuesOf(batch));
    assertNoPrivateValues(JSON.stringify(result.data), AUTHORED_RECIPIENT_VALUES);
  });
});

// ── 6. Recommendation application helpers ────────────────────────────────────

function makeRecommendation(
  overrides: Partial<AutomationRecommendation> = {},
): AutomationRecommendation {
  return {
    id: "rec-test-0",
    title: "Test recommendation",
    reason: "Recommended by a fictional test Rule.",
    ruleName: "Test Rule",
    field: "authMethod",
    currentValue: "Not set",
    proposedValue: "sms-otp",
    applicable: true,
    unsupportedReason: null,
    conflictsWith: null,
    ...overrides,
  };
}

describe("recommendationTargetField", () => {
  it.each([
    ["authMethod", "authMethod"],
    ["consentRequired", "consentRequired"],
    ["routingMode", "routingMode"],
    ["expirationDays", "expirationDirection"],
  ])("maps the applicable field %s onto the request default %s", (field, expected) => {
    expect(recommendationTargetField(makeRecommendation({ field }))).toBe(expected);
  });

  it.each([
    "settings.reminders.enabled",
    "settings.reminders.firstReminderDays",
    "settings.expiration.daysFromSend",
    "settings.completion.createVerificationRecord",
    "settings.invitation.subject",
    "participant.signer.minAuth",
    "document.folderId",
    "document.tags",
    "transaction.reviewFlag",
    "activityLog.note",
  ])("returns null for the engine-emitted field %s", (field) => {
    // Every one of these is a field the Command 32 engine really emits. None
    // maps onto a request default, so applying it is refused rather than faked.
    expect(recommendationTargetField(makeRecommendation({ field }))).toBeNull();
  });
});

describe("recommendationValue", () => {
  it("converts the displayed consent label back to a boolean", () => {
    expect(recommendationValue(
      makeRecommendation({ field: "consentRequired", proposedValue: "Required" }),
    )).toBe(true);
    expect(recommendationValue(
      makeRecommendation({ field: "consentRequired", proposedValue: "Not required" }),
    )).toBe(false);
  });

  it("renders an expiration proposal as the request-default direction sentence", () => {
    expect(recommendationValue(
      makeRecommendation({ field: "expirationDays", proposedValue: "14" }),
    )).toBe("14 days after the request begins");
  });

  it("passes any other proposed value straight through", () => {
    expect(recommendationValue(
      makeRecommendation({ field: "routingMode", proposedValue: "parallel" }),
    )).toBe("parallel");
  });
});

// ── 7. blockingIssues ────────────────────────────────────────────────────────

describe("blockingIssues", () => {
  beforeEach(() => {
    withResolutionCapability();
  });

  it("is zero when there is no result at all", () => {
    expect(blockingIssues(null)).toBe(0);
  });

  it("counts blocking requirements and blocking conflicts together", () => {
    const result = resolvePreparation({ ...availableInput(), authMethod: null });
    if (!result.ok) throw new Error("unreachable");

    const expected =
      result.data.requirements.filter((r) => r.blocking).length +
      result.data.conflicts.filter((c) => c.blocking).length;

    expect(blockingIssues(result.data)).toBe(expected);
    expect(expected).toBeGreaterThan(0);
  });

  it("ignores informational requirements and unflagged conflicts", () => {
    const result = resolvePreparation(availableInput());
    if (!result.ok) throw new Error("unreachable");

    expect(result.data.requirements.length).toBeGreaterThan(0);
    expect(result.data.conflicts.length).toBeGreaterThan(0);
    expect(blockingIssues(result.data)).toBe(0);
  });

  it("is zero for a capability-disabled result, which has nothing to block on", () => {
    withoutResolutionCapability();
    const result = resolvePreparation(availableInput());
    if (!result.ok) throw new Error("unreachable");
    expect(result.data.status).toBe("capability-disabled");
    expect(blockingIssues(result.data)).toBe(0);
  });
});
