// Cross-cutting security, privacy and cleanup invariants (STEP 18/19).
//
// These are the properties that are NOT owned by any single feature and are
// therefore the easiest to regress: a capability gate silently standing in for a
// permission check, a tenancy filter that stops biting, a "clear on sign-out"
// path that forgets one store, a value that leaks into a URL.
//
// Everything is asserted against the real services. Nothing is stubbed except
// the launch-profile constant in `withBulkSendCapability` below, and that
// exception is explained where it is defined.

import { describe, it, expect, vi } from "vitest";

import { bulkSendService } from "../mock/bulk-send.service";
import { globalSearchService } from "../mock/global-search.service";
import { notificationCenterService } from "../mock/notification-center.service";
import {
  buildPlatformSummaries,
  preparationRoute,
  preparationRecipientsRoute,
  preparationMappingRoute,
  preparationReviewRoute,
  PREPARATION_LIST_ROUTE,
} from "../preparation-platform-projection";
import { isCapabilityInActiveProfile } from "../../config/capability-resolver";
import { DEFAULT_BULK_SEND_QUERY } from "../../models/bulk-send";
import type { ServiceFailure, ServiceResult } from "../../models/errors";
import type { GlobalSearchResult } from "../../models/search";

import {
  TEST_WORKSPACE_ID,
  OTHER_WORKSPACE_ID,
  createTestBulkSendContext,
  createOtherWorkspaceContext,
  createUnavailableCapabilityContext,
  createReadOnlyBulkSendContext,
} from "../../../test/fixtures";

// ── Local helpers ────────────────────────────────────────────────────────────
//
// Narrowing helpers rather than `as` casts: if a call unexpectedly succeeds, the
// failure message says so instead of throwing a TypeError three lines later.

function expectSuccess<T>(result: ServiceResult<T>): T {
  if (!result.ok) {
    throw new Error(`Expected success but the service failed with ${result.code}.`);
  }
  return result.data;
}

function expectFailure<T>(result: ServiceResult<T>): ServiceFailure {
  if (result.ok) {
    throw new Error(
      `Expected the service to refuse, but it returned data: ${JSON.stringify(result.data).slice(0, 200)}`,
    );
  }
  return result;
}

const listQuery = { ...DEFAULT_BULK_SEND_QUERY };

/**
 * Runs a body against a module graph in which the `bulk-send` capability IS in
 * the active launch profile.
 *
 * WHY THIS EXISTS. `ACTIVE_LAUNCH_PROFILE` is derived from
 * `import.meta.env.VITE_LAUNCH_PROFILE` at module-load time. Under Vitest,
 * `import.meta.env` carries only Vite's own five built-ins — `test.env` in
 * `vitest.config.ts` lands on `process.env`, not on `import.meta.env`, and each
 * module receives its own `import.meta` object, so neither `vi.stubEnv` nor a
 * direct write from the test can reach the constant. The profile therefore
 * resolves to `launch-default` in every test run regardless of configuration.
 * (Reported as a finding; the configuration is deliberately not modified here.)
 *
 * Only the profile constant is replaced. The projection, the Bulk Send service,
 * the validation engine and the search providers are all the real modules, so
 * what is exercised below is production behaviour under a different profile —
 * not a fake.
 */
async function withBulkSendCapability<T>(
  run: (mods: {
    projection: typeof import("../preparation-platform-projection");
    search: typeof import("../mock/global-search.service");
  }) => Promise<T> | T,
): Promise<T> {
  vi.resetModules();
  vi.doMock("../../config/capability-resolver", async () => {
    const actual = await vi.importActual<typeof import("../../config/capability-resolver")>(
      "../../config/capability-resolver",
    );
    return {
      ...actual,
      ACTIVE_LAUNCH_PROFILE: "enterprise-preview",
      // Narrow override: every other capability keeps its real answer, so this
      // cannot accidentally switch on a deferred or future-product surface.
      isCapabilityInActiveProfile: (id: string) =>
        String(id) === "bulk-send" ? true : actual.isCapabilityInActiveProfile(id),
    };
  });
  try {
    const projection = await import("../preparation-platform-projection");
    const search = await import("../mock/global-search.service");
    return await run({ projection, search });
  } finally {
    vi.doUnmock("../../config/capability-resolver");
    vi.resetModules();
  }
}

// ─────────────────────────────────────────────────────────────────────────────
// 1. A capability being available is not permission
// ─────────────────────────────────────────────────────────────────────────────

describe("capability availability does not grant permission", () => {
  it("refuses a read with PERMISSION_DENIED when the capability is available but canView is false", async () => {
    const ctx = createTestBulkSendContext({ capabilityAvailable: true, canView: false });

    const failure = expectFailure(await bulkSendService.listBatches(listQuery, ctx));

    expect(failure.code).toBe("PERMISSION_DENIED");
    // A refusal must carry no payload. A regression that returned a partially
    // filtered list alongside `ok: false` would still be a disclosure.
    expect(failure).not.toHaveProperty("data");
  });

  it("refuses with FEATURE_UNAVAILABLE when the capability is not in the active profile", async () => {
    const failure = expectFailure(
      await bulkSendService.listBatches(listQuery, createUnavailableCapabilityContext()),
    );

    expect(failure.code).toBe("FEATURE_UNAVAILABLE");
    expect(failure).not.toHaveProperty("data");
  });

  it("reports FEATURE_UNAVAILABLE, not PERMISSION_DENIED, when both gates would fail", async () => {
    // Ordering is a disclosure decision, not a style choice. If the permission
    // gate ran first, the error code would tell an unauthorized caller that the
    // feature exists and that only their permissions are missing.
    const ctx = createTestBulkSendContext({
      capabilityAvailable: false,
      canView: false,
      canEdit: false,
    });

    const failure = expectFailure(await bulkSendService.listBatches(listQuery, ctx));

    expect(failure.code).toBe("FEATURE_UNAVAILABLE");
  });

  it("allows reads but refuses writes for a view-only context", async () => {
    const readOnly = createReadOnlyBulkSendContext();

    // The read is genuinely permitted...
    const batches = expectSuccess(await bulkSendService.listBatches(listQuery, readOnly));
    expect(batches.length).toBeGreaterThan(0);

    // ...and the write is refused, so "can see it" never implies "can change it".
    const created = expectFailure(
      await bulkSendService.createBatch(
        { name: "View Only Probe Batch", templateId: null },
        readOnly,
      ),
    );
    expect(created.code).toBe("PERMISSION_DENIED");

    // The refused write left no trace in the store.
    const after = expectSuccess(await bulkSendService.listBatches(listQuery, readOnly));
    expect(after.map((b) => b.name)).not.toContain("View Only Probe Batch");
    expect(after).toHaveLength(batches.length);
  });

  it("refuses every mutating entry point for a view-only context", async () => {
    const readOnly = createReadOnlyBulkSendContext();
    const [first] = expectSuccess(await bulkSendService.listBatches(listQuery, readOnly));
    expect(first).toBeDefined();
    const batchId = String(first!.id);

    // Widened to `unknown` because these entry points return different payload
    // types; only the refusal shape matters here.
    const refusals: Array<ServiceResult<unknown>> = await Promise.all([
      bulkSendService.updateBatch(batchId, { name: "Renamed By Probe" }, readOnly),
      bulkSendService.archiveBatch(batchId, readOnly),
      bulkSendService.duplicateBatch(batchId, true, readOnly),
      bulkSendService.removeBatchDemonstration(batchId, readOnly),
      bulkSendService.excludeRows(batchId, [], "probe", readOnly),
      bulkSendService.createDraftProjections(batchId, [], readOnly),
      bulkSendService.applyRecipientSource(
        batchId,
        ["Name"],
        [["Probe"]],
        "structured-paste",
        readOnly,
      ),
    ]);

    for (const refusal of refusals) {
      expect(expectFailure(refusal).code).toBe("PERMISSION_DENIED");
    }

    // The batch is untouched: still readable, still named what it was.
    const reread = expectSuccess(await bulkSendService.getBatch(batchId, readOnly));
    expect(reread.name).toBe(first!.name);
    expect(reread.status).not.toBe("archived");
  });
});

// ─────────────────────────────────────────────────────────────────────────────
// 2. Workspace isolation
// ─────────────────────────────────────────────────────────────────────────────

describe("workspace isolation", () => {
  it("returns no batch belonging to the session workspace when listing from another workspace", async () => {
    const mine = expectSuccess(
      await bulkSendService.listBatches(listQuery, createTestBulkSendContext()),
    );
    // Guard against a vacuous pass: if the session workspace had no batches, the
    // disjointness assertion below would hold for the wrong reason.
    expect(mine.length).toBeGreaterThan(0);
    const myIds = new Set(mine.map((b) => String(b.id)));

    const theirs = expectSuccess(
      await bulkSendService.listBatches(listQuery, createOtherWorkspaceContext()),
    );

    for (const summary of theirs) {
      expect(myIds.has(String(summary.id))).toBe(false);
    }
    expect(theirs).toHaveLength(0);
  });

  it("refuses a direct read of another workspace's batch with WORKSPACE_RESTRICTED", async () => {
    const [first] = expectSuccess(
      await bulkSendService.listBatches(listQuery, createTestBulkSendContext()),
    );
    expect(first).toBeDefined();

    const failure = expectFailure(
      await bulkSendService.getBatch(String(first!.id), createOtherWorkspaceContext()),
    );

    expect(failure.code).toBe("WORKSPACE_RESTRICTED");
    // The refusal must not echo the batch name back to a caller who cannot see it.
    expect(JSON.stringify(failure)).not.toContain(first!.name);
  });

  it("does not surface a batch created in another workspace to the session workspace", async () => {
    const other = createOtherWorkspaceContext();
    const created = expectSuccess(
      await bulkSendService.createBatch(
        { name: "Southgate Only Probe Batch", templateId: null },
        other,
      ),
    );
    expect(String(created.scope.workspaceId)).toBe(OTHER_WORKSPACE_ID);

    const theirs = expectSuccess(await bulkSendService.listBatches(listQuery, other));
    expect(theirs.map((b) => String(b.id))).toContain(String(created.id));

    const mine = expectSuccess(
      await bulkSendService.listBatches(listQuery, createTestBulkSendContext()),
    );
    expect(mine.map((b) => String(b.id))).not.toContain(String(created.id));
    expect(mine.map((b) => b.name)).not.toContain("Southgate Only Probe Batch");
  });

  it("scopes the platform projection to the workspace it is asked for", async () => {
    await withBulkSendCapability(({ projection }) => {
      const mine = projection.buildPlatformSummaries(TEST_WORKSPACE_ID);
      expect(mine.length).toBeGreaterThan(0);
      for (const summary of mine) {
        expect(summary.workspaceId).toBe(TEST_WORKSPACE_ID);
      }

      expect(projection.buildPlatformSummaries(OTHER_WORKSPACE_ID)).toHaveLength(0);
      // An empty workspace ID must not be read as "no filter".
      expect(projection.buildPlatformSummaries("")).toHaveLength(0);
    });
  });
});

// ─────────────────────────────────────────────────────────────────────────────
// 3. Cleanup — workspace switch and sign-out
// ─────────────────────────────────────────────────────────────────────────────

describe("bulk send cleanup", () => {
  it("drops the prior workspace's batches and activity when switching workspace", async () => {
    const ctx = createTestBulkSendContext();

    const baselineIds = expectSuccess(await bulkSendService.listBatches(listQuery, ctx)).map((b) =>
      String(b.id),
    );
    expect(baselineIds.length).toBeGreaterThan(0);

    const created = expectSuccess(
      await bulkSendService.createBatch({ name: "Workspace Switch Probe", templateId: null }, ctx),
    );
    const createdId = String(created.id);

    // Creating a batch logs activity, so there is something to prove was cleared.
    expect(
      expectSuccess(await bulkSendService.listBatchActivity(createdId, ctx)).length,
    ).toBeGreaterThan(0);

    expect(
      expectSuccess(await bulkSendService.listBatches(listQuery, ctx)).map((b) => String(b.id)),
    ).toContain(createdId);

    // Switching to a workspace that owns none of these batches must leave nothing.
    bulkSendService.clearWorkspaceScopedBulkSend(OTHER_WORKSPACE_ID);

    expect(expectSuccess(await bulkSendService.listBatches(listQuery, ctx))).toHaveLength(0);
    expect(
      expectSuccess(await bulkSendService.listBatches(listQuery, createOtherWorkspaceContext())),
    ).toHaveLength(0);
    // Activity is workspace-derived state too — clearing batches without clearing
    // activity would leave batch names and row counts readable after the switch.
    expect(expectSuccess(await bulkSendService.listBatchActivity(createdId, ctx))).toHaveLength(0);

    // Sign-out / account change returns everything to the fixture baseline.
    bulkSendService.resetBulkSendDemonstration();

    const restored = expectSuccess(await bulkSendService.listBatches(listQuery, ctx));
    expect(restored.map((b) => String(b.id)).sort()).toEqual([...baselineIds].sort());
    // The batch created during the session must NOT come back.
    expect(restored.map((b) => String(b.id))).not.toContain(createdId);
  });

  it("keeps the batches of the workspace being switched INTO", async () => {
    const ctx = createTestBulkSendContext();
    const before = expectSuccess(await bulkSendService.listBatches(listQuery, ctx));

    // A blanket wipe would also make the previous test pass. This is the
    // discriminating case: the destination workspace's own work must survive.
    bulkSendService.clearWorkspaceScopedBulkSend(TEST_WORKSPACE_ID);

    const after = expectSuccess(await bulkSendService.listBatches(listQuery, ctx));
    expect(after.map((b) => String(b.id)).sort()).toEqual(before.map((b) => String(b.id)).sort());
  });

  it("returns saved configurations to the fixture baseline on reset", async () => {
    const ctx = createTestBulkSendContext();
    const baseline = expectSuccess(await bulkSendService.listSavedConfigurations(ctx)).map((c) =>
      String(c.id),
    );
    expect(baseline.length).toBeGreaterThan(0);

    const [firstBatch] = expectSuccess(await bulkSendService.listBatches(listQuery, ctx));
    expect(firstBatch).toBeDefined();
    const saved = expectSuccess(
      await bulkSendService.createSavedConfiguration(
        String(firstBatch!.id),
        "Session Only Probe Configuration",
        ctx,
      ),
    );

    expect(
      expectSuccess(await bulkSendService.listSavedConfigurations(ctx)).map((c) => String(c.id)),
    ).toContain(String(saved.id));

    bulkSendService.resetBulkSendDemonstration();

    const restored = expectSuccess(await bulkSendService.listSavedConfigurations(ctx)).map((c) =>
      String(c.id),
    );
    expect(restored.sort()).toEqual([...baseline].sort());
    expect(restored).not.toContain(String(saved.id));
  });

  it("clears recipient rows and mapping state on reset, not just batch records", async () => {
    const ctx = createTestBulkSendContext();
    const [first] = expectSuccess(await bulkSendService.listBatches(listQuery, ctx));
    expect(first).toBeDefined();
    const batchId = String(first!.id);

    await bulkSendService.applyRecipientSource(
      batchId,
      ["Name", "Email"],
      [["Ana Test Reyes", "ana.reyes@example.test"]],
      "structured-paste",
      ctx,
    );

    const dirty = expectSuccess(await bulkSendService.getBatch(batchId, ctx));
    expect(JSON.stringify(dirty)).toContain("ana.reyes@example.test");

    bulkSendService.resetBulkSendDemonstration();

    const clean = expectSuccess(await bulkSendService.getBatch(batchId, ctx));
    // The pasted address must be gone from the row values AND from the schema's
    // sample values, which is where a partial reset would leave it behind.
    expect(JSON.stringify(clean)).not.toContain("ana.reyes@example.test");
    expect(JSON.stringify(clean)).not.toContain("Ana Test Reyes");
  });
});

// ─────────────────────────────────────────────────────────────────────────────
// 4. Notification session state
// ─────────────────────────────────────────────────────────────────────────────

describe("notification center session state", () => {
  it("restores read and dismissed state on clearSessionState", () => {
    const baselineUnread = notificationCenterService.getUnreadCount();
    const baselineDismissed = notificationCenterService.countByView("dismissed");
    expect(baselineUnread).toBeGreaterThan(0);

    const dismissible = notificationCenterService
      .getAllItems()
      .find((n) => n.isDismissible && n.status === "unread");
    expect(dismissible).toBeDefined();
    const dismissibleId = String(dismissible!.id);

    notificationCenterService.markAllRead();
    expect(notificationCenterService.getUnreadCount()).toBe(0);

    expect(expectSuccess(notificationCenterService.dismiss(dismissibleId)).status).toBe("dismissed");
    expect(notificationCenterService.countByView("dismissed")).toBe(baselineDismissed + 1);

    notificationCenterService.clearSessionState();

    expect(notificationCenterService.getUnreadCount()).toBe(baselineUnread);
    expect(notificationCenterService.countByView("dismissed")).toBe(baselineDismissed);
    expect(expectSuccess(notificationCenterService.getById(dismissibleId)).status).toBe("unread");
  });

  it("does not leak a mutated record across clearSessionState via a retained reference", () => {
    const target = notificationCenterService.getAllItems().find((n) => n.status === "read");
    expect(target).toBeDefined();
    const targetId = String(target!.id);

    expectSuccess(notificationCenterService.markUnread(targetId));
    expect(expectSuccess(notificationCenterService.getById(targetId)).status).toBe("unread");

    notificationCenterService.clearSessionState();

    // The store is rebuilt from fixtures, so the record the next session reads
    // must not carry the previous session's status even though the old object
    // is still referenced by this test.
    expect(expectSuccess(notificationCenterService.getById(targetId)).status).toBe("read");
    expect(target!.status).toBe("unread"); // the stale reference is genuinely detached
  });
});

// ─────────────────────────────────────────────────────────────────────────────
// 5. Global Search destination cleanup
// ─────────────────────────────────────────────────────────────────────────────

describe("global search workspace-scoped cleanup", () => {
  it("drops workspace destinations but keeps settings and public ones", () => {
    globalSearchService.addRecentDestination("Bulk Send", "/app/bulk-send");
    globalSearchService.addRecentDestination("Batch review", "/app/bulk-send/bsb_ready/review");
    globalSearchService.addRecentDestination("Documents", "/app/documents/txn_001");
    globalSearchService.addRecentDestination("Security", "/app/settings/security");
    globalSearchService.addRecentDestination("Profile", "/app/settings/profile");

    const before = globalSearchService.getRecentDestinations().map((d) => d.path);
    expect(before).toContain("/app/bulk-send");
    expect(before).toContain("/app/settings/security");

    globalSearchService.clearWorkspaceScopedDestinations();

    const after = globalSearchService.getRecentDestinations().map((d) => d.path);
    expect(after).not.toContain("/app/bulk-send");
    expect(after).not.toContain("/app/bulk-send/bsb_ready/review");
    expect(after).not.toContain("/app/documents/txn_001");
    expect(after).toContain("/app/settings/security");
    expect(after).toContain("/app/settings/profile");
    // Nothing survives that is not explicitly personal or public.
    for (const path of after) {
      expect(
        path.startsWith("/app/settings/") ||
          path === "/help" ||
          path.startsWith("/resources/") ||
          path.startsWith("/legal/"),
      ).toBe(true);
    }
  });

  it("never retains a query that looks like a private value", () => {
    globalSearchService.addRecentQuery("retainer agreement");
    globalSearchService.addRecentQuery("ana.reyes@example.test");
    globalSearchService.addRecentQuery("VRF-2026-NBL-001");
    globalSearchService.addRecentQuery("4111111111111111");
    globalSearchService.addRecentQuery("09171234567");

    const retained = globalSearchService.getRecentQueries().map((q) => q.query);

    expect(retained).toContain("retainer agreement");
    expect(retained).not.toContain("ana.reyes@example.test");
    expect(retained).not.toContain("VRF-2026-NBL-001");
    expect(retained).not.toContain("4111111111111111");
    expect(retained).not.toContain("09171234567");
    expect(retained).toHaveLength(1);
  });

  it("clears every recent store on the sign-out reset", () => {
    globalSearchService.addRecentQuery("retainer agreement");
    globalSearchService.addRecentDestination("Security", "/app/settings/security");
    globalSearchService.pinCommand("cmd_dashboard");

    expect(globalSearchService.getRecentQueries().length).toBeGreaterThan(0);
    expect(globalSearchService.getRecentDestinations().length).toBeGreaterThan(0);
    expect(globalSearchService.getPinnedCommandIds().length).toBeGreaterThan(0);

    globalSearchService.resetGlobalSearchDemonstration();

    expect(globalSearchService.getRecentQueries()).toHaveLength(0);
    // A workspace-scoped clear deliberately keeps settings routes; a sign-out
    // reset must not, because the next session may be a different account.
    expect(globalSearchService.getRecentDestinations()).toHaveLength(0);
    expect(globalSearchService.getPinnedCommandIds()).toHaveLength(0);
  });
});

// ─────────────────────────────────────────────────────────────────────────────
// 6. Nothing is persisted to browser storage
// ─────────────────────────────────────────────────────────────────────────────

describe("no browser storage is written", () => {
  it("leaves localStorage and sessionStorage empty after exercising the services", async () => {
    expect(window.localStorage.length).toBe(0);
    expect(window.sessionStorage.length).toBe(0);

    const ctx = createTestBulkSendContext();

    // Bulk Send: create, import recipients, validate, list, save configurations.
    const batch = expectSuccess(
      await bulkSendService.createBatch({ name: "Storage Probe Batch", templateId: null }, ctx),
    );
    await bulkSendService.applyRecipientSource(
      String(batch.id),
      ["Name", "Email", "Organization"],
      [["Ana Test Reyes", "ana.reyes@example.test", "Test Legal Partners"]],
      "structured-paste",
      ctx,
    );
    await bulkSendService.validateBatchNow(String(batch.id), ctx);
    await bulkSendService.listBatches(listQuery, ctx);
    await bulkSendService.listSavedConfigurations(ctx);

    // Search: query, remember a query and a destination, pin a command.
    globalSearchService.search({ query: "agreement" });
    globalSearchService.addRecentQuery("agreement");
    globalSearchService.addRecentDestination("Documents", "/app/documents");
    globalSearchService.pinCommand("cmd_documents");
    globalSearchService.getSuggestions();

    // Notifications: read, dismiss, list.
    notificationCenterService.markAllRead();
    const dismissible = notificationCenterService.getAllItems().find((n) => n.isDismissible);
    if (dismissible) notificationCenterService.dismiss(String(dismissible.id));
    notificationCenterService.list({ view: "all", category: "", q: "", sort: "newest" });

    expect(window.localStorage.length).toBe(0);
    expect(window.sessionStorage.length).toBe(0);
    // document.cookie is the third persistence channel and is just as easy to
    // write to by accident.
    expect(document.cookie).toBe("");
  });
});

// ─────────────────────────────────────────────────────────────────────────────
// 7. No recipient data in URLs
// ─────────────────────────────────────────────────────────────────────────────

/** A path is unsafe if it could carry an address or an unencoded free-text value. */
function assertSafePath(path: string, origin: string): void {
  expect(path, `${origin} produced a path containing "@": ${path}`).not.toContain("@");
  expect(path, `${origin} produced a path containing a space: ${path}`).not.toContain(" ");
}

const SEARCH_QUERIES = [
  // preparation
  "bulk", "batch", "recipient", "preparation",
  // documents / workflow / collaboration
  "agreement", "nda", "deed", "retainer", "workflow", "discussion", "comment",
  // organization
  "folder", "tag", "saved",
  // my actions
  "signer", "approver",
  // templates
  "template", "employment",
  // contacts and people
  "reyes", "santos", "harborline", "mabini", "team", "legal", "owner", "auditor",
  // verification, notifications, reports
  "verification", "expiring", "report", "documents",
  // settings and help
  "security", "billing", "usage", "privacy", "guide", "help", "faq",
];

/** The recipient values the Bulk Send fixtures actually hold. None may escape. */
const FIXTURE_RECIPIENT_VALUES = [
  "@example.com",
  "Jose Ramirez",
  "Elena Marquez",
  "Remedios Santos",
  "Acme Supplies Inc.",
];

describe("no recipient data reaches a URL", () => {
  it("keeps every preparation route builder output free of addresses and spaces", () => {
    const builders = [
      preparationRoute,
      preparationRecipientsRoute,
      preparationMappingRoute,
      preparationReviewRoute,
    ];
    const ids = [
      "bsb_ready",
      "bsb_issues",
      // Hostile inputs. None may end up in a path, encoded or not.
      "ana.reyes@example.test",
      "Ana Test Reyes",
      "bsb ready",
      "../../app/settings/security",
      "bsb_ready?email=ana.reyes@example.test",
      "bsb_ready#ana.reyes@example.test",
    ];

    for (const build of builders) {
      for (const id of ids) {
        const path = build(id);
        assertSafePath(path, `${build.name}("${id}")`);
        expect(path.startsWith(PREPARATION_LIST_ROUTE)).toBe(true);
      }
      // An unsafe ID must collapse to the list route, never be encoded into one.
      expect(build("ana.reyes@example.test")).toBe(PREPARATION_LIST_ROUTE);
      expect(build("Ana Test Reyes")).toBe(PREPARATION_LIST_ROUTE);
      expect(build("../../app/settings/security")).toBe(PREPARATION_LIST_ROUTE);
      expect(build("bsb_ready?email=ana.reyes@example.test")).toBe(PREPARATION_LIST_ROUTE);
      // A safe ID still produces a usable route, so the guard above is not just
      // rejecting everything.
      expect(build("bsb_ready")).toContain("bsb_ready");
    }
  });

  it("keeps every projected batch route and summary free of recipient values", async () => {
    await withBulkSendCapability(({ projection }) => {
      const summaries = projection.buildPlatformSummaries(TEST_WORKSPACE_ID);
      expect(summaries.length).toBeGreaterThan(0);

      for (const summary of summaries) {
        assertSafePath(summary.route, `projection route for batch ${summary.batchId}`);
        expect(summary.route.startsWith(PREPARATION_LIST_ROUTE)).toBe(true);
      }

      // The projection is the enforcement point for every downstream surface:
      // if a recipient value is not on it, no surface can leak it.
      const serialized = JSON.stringify(summaries);
      for (const value of FIXTURE_RECIPIENT_VALUES) {
        expect(serialized).not.toContain(value);
      }
      // Report rows are derived from the same summaries and must stay as clean.
      const reportSerialized = JSON.stringify(projection.buildReportRows(summaries));
      for (const value of FIXTURE_RECIPIENT_VALUES) {
        expect(reportSerialized).not.toContain(value);
      }
    });
  });

  it("keeps recipient values out of preparation search results entirely", async () => {
    await withBulkSendCapability(({ search }) => {
      const response = search.globalSearchService.search({ query: "bulk" });
      const preparationResults = response.groups
        .flatMap((g) => g.results)
        .filter((r) => String(r.id).startsWith("sr_prep_"));

      expect(preparationResults.length).toBeGreaterThan(0);

      const serialized = JSON.stringify(preparationResults);
      for (const value of FIXTURE_RECIPIENT_VALUES) {
        expect(serialized).not.toContain(value);
      }
      for (const result of preparationResults) {
        assertSafePath(result.destination.path, `preparation search result ${result.id}`);
      }
    });
  });

  it("hides the preparation surface entirely when bulk-send is not in the active profile", () => {
    // The profile this suite runs under. Asserted rather than assumed, so this
    // test cannot silently invert if the resolved profile ever changes.
    expect(isCapabilityInActiveProfile("bulk-send")).toBe(false);

    // Nothing may hint the feature exists: not the projection, not a search
    // result, not a palette command. A gated route reached from a visible
    // command is both a dead end and a disclosure.
    expect(buildPlatformSummaries(TEST_WORKSPACE_ID)).toHaveLength(0);

    const results = globalSearchService
      .search({ query: "bulk" })
      .groups.flatMap((g) => g.results);
    expect(results.filter((r) => String(r.id).startsWith("sr_prep_"))).toHaveLength(0);
    for (const result of results) {
      expect(result.destination.path.startsWith("/app/bulk-send")).toBe(false);
    }

    for (const command of globalSearchService.listCommands()) {
      expect(command.destination?.path.startsWith("/app/bulk-send") ?? false).toBe(false);
    }
  });

  it("keeps every search destination and palette command path free of addresses and spaces", () => {
    const seen: Array<{ path: string; origin: string }> = [];

    for (const query of SEARCH_QUERIES) {
      const response = globalSearchService.search({ query });
      const results: GlobalSearchResult[] = response.groups.flatMap((g) => g.results);
      for (const result of results) {
        seen.push({ path: result.destination.path, origin: `search("${query}") → ${result.id}` });
      }
    }

    for (const command of globalSearchService.listCommands()) {
      if (command.destination) {
        seen.push({ path: command.destination.path, origin: `command ${command.id}` });
      }
    }

    for (const suggestion of globalSearchService.getSuggestions()) {
      if (suggestion.destination) {
        seen.push({ path: suggestion.destination.path, origin: `suggestion ${suggestion.id}` });
      }
    }

    // Guard against a vacuous pass: if the search index went empty, every
    // assertion below would hold trivially.
    expect(seen.length).toBeGreaterThan(60);

    for (const { path, origin } of seen) {
      assertSafePath(path, origin);
      // Every destination is a same-origin absolute path. An absolute URL here
      // would mean a destination could leave the application entirely.
      expect(path.startsWith("/"), `${origin} produced a non-absolute path: ${path}`).toBe(true);
      expect(path.startsWith("//"), `${origin} produced a protocol-relative path: ${path}`).toBe(
        false,
      );
    }
  });

  it("keeps every notification action path free of addresses and spaces", () => {
    const items = notificationCenterService.getAllItems();
    expect(items.length).toBeGreaterThan(0);

    let withAction = 0;
    for (const item of items) {
      if (!item.actionPath) continue;
      withAction += 1;
      assertSafePath(item.actionPath, `notification ${item.id}`);
      expect(item.actionPath.startsWith("/")).toBe(true);
    }
    expect(withAction).toBeGreaterThan(0);
  });
});
