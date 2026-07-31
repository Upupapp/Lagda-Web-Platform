// Deterministic fictional test fixtures (Gap Closure Command 6).
//
// TEST DATA RULES — enforced by convention here and asserted in
// `src/app/services/__tests__/privacy-invariants.test.ts`:
//
//   - Every name, organization, and email is invented.
//   - Email domains are `example.test` / `example.invalid`, which RFC 2606 and
//     RFC 6761 reserve so they can never resolve to a real host.
//   - No real customer data, document content, signature, access link, token,
//     API key, or Policy configuration appears anywhere.
//   - Timestamps are fixed ISO strings with an explicit offset. Nothing reads the
//     wall clock, so a test cannot pass in the morning and fail at night.
//   - IDs are stable and readable, so a failure message names something a human
//     can find.
//
// These are BUILDERS, not shared singletons. Each call returns a fresh object so
// one test mutating a fixture cannot affect another.

import type { BulkSendContext } from "../app/services/mock/bulk-send.service";

// ── Fixed clock ──────────────────────────────────────────────────────────────
//
// Matches the repository's existing demonstration clock base so fixture data and
// test expectations agree.
export const TEST_NOW_ISO = "2026-07-16T09:00:00+08:00";
export const TEST_EARLIER_ISO = "2026-07-10T09:00:00+08:00";
export const TEST_LATER_ISO = "2026-07-20T09:00:00+08:00";

// ── Canonical test workspace ─────────────────────────────────────────────────
//
// `ws_mls_001` is the workspace the demonstration session actually holds. Tests
// that assert visibility must use it, or they assert against an empty set and
// pass for the wrong reason.
export const TEST_WORKSPACE_ID = "ws_mls_001";
export const TEST_WORKSPACE_NAME = "Mabini Legal Solutions";

/** A workspace the session is NOT in. Used to prove tenancy filtering bites. */
export const OTHER_WORKSPACE_ID = "ws_southgate_002";
export const OTHER_WORKSPACE_NAME = "Southgate Partners";

export const TEST_TEAM_ID = "team_mls_001";
export const OTHER_TEAM_ID = "team_mls_999";

// ── Values that must never appear in a platform surface ──────────────────────
//
// Used by the privacy tests as the forbidden set. If any of these turns up in a
// search index, a dashboard count, a report row, a notification body, or a URL,
// the projection has leaked.
export const FORBIDDEN_RECIPIENT_VALUES = [
  "maria.santos@example.test",
  "antonio.cruz@example.test",
  "Maria Santos",
  "Antonio Cruz",
  "Northbridge Business Services",
] as const;

// ── Builders ─────────────────────────────────────────────────────────────────

export interface TestContactInput {
  id?: string;
  name?: string;
  email?: string;
  organization?: string;
  status?: "active" | "archived" | "restricted";
  workspaceId?: string;
}

export function createTestContact(input: TestContactInput = {}) {
  return {
    id: input.id ?? "ct_test_001",
    name: input.name ?? "Ana Test Reyes",
    email: input.email ?? "ana.reyes@example.test",
    organization: input.organization ?? "Test Legal Partners",
    status: input.status ?? "active",
    workspaceId: input.workspaceId ?? TEST_WORKSPACE_ID,
  };
}

export function createTestContactGroup(input: {
  id?: string;
  name?: string;
  memberIds?: string[];
  workspaceId?: string;
} = {}) {
  return {
    id: input.id ?? "cg_test_001",
    name: input.name ?? "Test Review Group",
    memberIds: input.memberIds ?? ["ct_test_001", "ct_test_002"],
    workspaceId: input.workspaceId ?? TEST_WORKSPACE_ID,
  };
}

/**
 * A Bulk Send service context.
 *
 * Defaults to a fully-permitted view of the session workspace. Tests that check
 * gating override exactly one field, which makes the intent of the test obvious
 * from the call site.
 */
export function createTestBulkSendContext(
  overrides: Partial<BulkSendContext> = {},
): BulkSendContext {
  return {
    workspaceId: TEST_WORKSPACE_ID,
    workspaceName: TEST_WORKSPACE_NAME,
    teamId: null,
    capabilityAvailable: true,
    canView: true,
    canEdit: true,
    ...overrides,
  };
}

/** A context that can view but not edit — for permission-boundary tests. */
export function createReadOnlyBulkSendContext(): BulkSendContext {
  return createTestBulkSendContext({ canEdit: false });
}

/** A context in a different workspace — for tenancy tests. */
export function createOtherWorkspaceContext(): BulkSendContext {
  return createTestBulkSendContext({
    workspaceId: OTHER_WORKSPACE_ID,
    workspaceName: OTHER_WORKSPACE_NAME,
  });
}

/** A context where the capability is not in the active profile. */
export function createUnavailableCapabilityContext(): BulkSendContext {
  return createTestBulkSendContext({ capabilityAvailable: false });
}

// ── Tabular source fixtures ──────────────────────────────────────────────────
//
// Header strings are load-bearing in Bulk Send: column IDs derive from the
// normalized header and role suggestion matches against them. These use the
// canonical literals.

export const TEST_HEADERS = ["Name", "Email", "Organization"] as const;

export const TEST_ROWS: string[][] = [
  ["Ana Test Reyes", "ana.reyes@example.test", "Test Legal Partners"],
  ["Ben Test Cruz", "ben.cruz@example.test", "Test Holdings"],
];

/** Two rows sharing one address — exercises duplicate detection. */
export const TEST_ROWS_WITH_DUPLICATE: string[][] = [
  ["Ana Test Reyes", "ana.reyes@example.test", "Test Legal Partners"],
  ["Ana T. Reyes", "ana.reyes@example.test", "Test Legal Partners"],
];

/** One malformed address — exercises validation. */
export const TEST_ROWS_WITH_INVALID_EMAIL: string[][] = [
  ["Ana Test Reyes", "ana.reyes@example.test", "Test Legal Partners"],
  ["Ben Test Cruz", "not-an-email", "Test Holdings"],
];

/** A row with no address at all — exercises the incomplete path. */
export const TEST_ROWS_WITH_MISSING_EMAIL: string[][] = [
  ["Ana Test Reyes", "", "Test Legal Partners"],
];
