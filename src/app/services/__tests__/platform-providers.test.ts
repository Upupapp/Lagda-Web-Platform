// Gap Closure Command 5 — provider registration across the platform surfaces.
//
// Bulk Send contributes to Global Search, the Command Palette, Notifications and
// Reports. Every one of those is a place where recipient identity could leak, a
// place where a dead-end destination would strand the user, and a place where a
// "your batch was sent" claim would be a lie about what the demonstration did.
//
// These tests assert the CONTRACT of those contributions, not that they render:
//   1. the providers are genuinely registered — a `searchVisibility: true` flag
//      with no provider behind it is the original defect this command closed,
//   2. registration happens at module scope: no page visit, no navigation, no
//      React tree, no warm-up call,
//   3. nothing that reaches a surface carries recipient identity,
//   4. every destination is a route that exists, so no entry is a dead end,
//   5. no title, body, or label claims a send.
//
// Several checks are matcher-driven (a regex for "recipient identity", a
// forbidden-value list built from the batch fixtures). Each has a self-test
// proving the matcher actually bites — a privacy assertion that can never fail is
// worse than no assertion, because it reads like protection.

import { describe, it, expect, beforeEach, afterEach, vi } from "vitest";

import type { GlobalSearchResult } from "../../models/search";
import type { ReportQuery, ReportTable } from "../../models/reports";
import { BULK_SEND_BATCH_FIXTURES } from "../../data/mock/bulk-send";
import { PLATFORM_ROUTES } from "../../config/routes";
import { TEST_WORKSPACE_ID } from "../../../test/fixtures";

// Statically imported = the module graph as the test environment actually builds
// it, i.e. under the DEFAULT launch profile. Used only by the gating suite at the
// bottom; every other suite loads the enterprise-preview graph explicitly.
import { globalSearchService as defaultProfileSearch } from "../mock/global-search.service";
import { notificationCenterService as defaultProfileNotifications } from "../mock/notification-center.service";
import { reportingService as defaultProfileReports } from "../mock/reporting.service";

// ── Loading the surfaces with Bulk Send in the active profile ────────────────
//
// WHY THIS IS NEEDED. `ACTIVE_LAUNCH_PROFILE` is derived once, at module-load
// time, from `import.meta.env.VITE_LAUNCH_PROFILE`. Under Vitest `import.meta.env`
// carries only Vite's five built-ins: `test.env` in `vitest.config.ts` lands on
// `process.env`, and each module receives its own `import.meta`, so neither
// `vi.stubEnv` nor a direct write reaches the constant. The profile resolves to
// `launch-default` in every test run regardless of the configured value.
// (Reported as a finding. The configuration is deliberately NOT modified here.)
//
// Only the profile answer for `bulk-send` is replaced. The projection, the Bulk
// Send service, the validation engine, the search providers, the notification
// store and the reporting service are all the real modules — what is exercised
// below is production behaviour under the Enterprise Preview build, not a fake.

interface Surfaces {
  search: typeof import("../mock/global-search.service");
  notifications: typeof import("../mock/notification-center.service");
  reports: typeof import("../mock/reporting.service");
  projection: typeof import("../preparation-platform-projection");
}

async function loadSurfacesWithBulkSend(): Promise<Surfaces> {
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
  const [search, notifications, reports, projection] = await Promise.all([
    import("../mock/global-search.service"),
    import("../mock/notification-center.service"),
    import("../mock/reporting.service"),
    import("../preparation-platform-projection"),
  ]);
  return { search, notifications, reports, projection };
}

let surfaces: Surfaces;

beforeEach(async () => {
  surfaces = await loadSurfacesWithBulkSend();
});

afterEach(() => {
  vi.doUnmock("../../config/capability-resolver");
  vi.resetModules();
});

// ── Shared helpers ───────────────────────────────────────────────────────────

const REPORT_QUERY: ReportQuery = { datePreset: "last-30-days" };

/**
 * Batches the demonstration session can actually see. The projection filters on
 * workspace, so asserting against every fixture would be asserting against rows
 * the session should never receive.
 */
const SESSION_BATCH_IDS = new Set(
  BULK_SEND_BATCH_FIXTURES.filter((b) => b.scope.workspaceId === TEST_WORKSPACE_ID).map((b) =>
    String(b.id),
  ),
);

/**
 * Every recipient-identity cell value in the batch fixtures: names, email
 * addresses, organizations. If one of these reaches a search result, a
 * notification, or a report row, the projection has leaked.
 *
 * Only identity columns are collected — including dates and free-text scope
 * cells would make the check noisy without making it stronger.
 */
const RECIPIENT_IDENTITY_VALUES: string[] = (() => {
  const values = new Set<string>();
  for (const batch of BULK_SEND_BATCH_FIXTURES) {
    for (const row of batch.rows) {
      for (const [columnId, value] of Object.entries(row.values)) {
        if (!/name|email|org|company/i.test(columnId)) continue;
        if (typeof value !== "string") continue;
        const trimmed = value.trim();
        if (trimmed.length >= 3) values.add(trimmed);
      }
    }
  }
  return [...values];
})();

/**
 * Labels that would mean a surface is reporting on PEOPLE rather than on
 * preparation work. "Recipient Rows" is deliberately allowed: it is a count of
 * rows, not an identity. "Participant", "Contact", "Name", "Email" are not.
 */
const IDENTITY_LABEL =
  /\b(name|names|email|e-?mail|address|addresses|organization|organisation|company|contact|contacts|person|people|participant|participants|signer|signers|recipient name)\b/i;

/** Language that would claim the demonstration performed a real send. */
const SEND_CLAIM = /was sent|delivered|signed|emailed/i;

/** Verbs that would make a palette entry an action rather than a destination. */
const MUTATING_VERB =
  /\b(send|deliver|email|notify|execute|run|apply|schedule|mark|remove|delete|archive|approve|submit)\b/i;

/**
 * "Bulk Send" is the feature's NAME, not a verb — every one of its entries
 * contains it. Strip the name first, then look for a verb in what is left, so
 * "Open Bulk Send" reads as navigation while "Send Bulk Send Batch Now" does not.
 */
function readsLikeAction(text: string): boolean {
  return MUTATING_VERB.test(text.replace(/bulk send/gi, " "));
}

/** Fields that would let a palette entry DO something instead of navigating. */
const EXECUTION_FIELDS = ["action", "handler", "onSelect", "onRun", "execute", "mutation", "perform"];

/**
 * Route existence check against the declared platform route table, with `:param`
 * segments treated as wildcards. A destination matching nothing here would land
 * the user on the not-found page.
 */
const ROUTE_PATTERNS = PLATFORM_ROUTES.map((route) => {
  const source = route.path
    .split("/")
    .map((segment) =>
      segment.startsWith(":") ? "[^/]+" : segment.replace(/[.*+?^${}()|[\]\\]/g, "\\$&"),
    )
    .join("/");
  return new RegExp(`^${source}$`);
});

function routeExists(path: string): boolean {
  return ROUTE_PATTERNS.some((pattern) => pattern.test(path));
}

/** Every user-visible string a search result puts on screen. */
function visibleText(result: GlobalSearchResult): string[] {
  return [
    result.title,
    result.description ?? "",
    result.workspaceContext ?? "",
    result.teamContext ?? "",
    result.statusLabel ?? "",
    ...result.matchedFields.map((f) => `${f.label} ${f.text}`),
  ];
}

type SearchService = typeof defaultProfileSearch;

function preparationResultsFrom(service: SearchService): GlobalSearchResult[] {
  const response = service.search({
    query: "bulk send",
    scope: "documents",
    maxPerGroup: 25,
  });
  const documents = response.groups.find((g) => g.scope === "documents");
  return (documents?.results ?? []).filter((r) => r.id.startsWith("sr_prep_"));
}

const preparationResults = () => preparationResultsFrom(surfaces.search.globalSearchService);

const preparationCommands = () =>
  surfaces.search.globalSearchService.listCommands().filter((c) => c.id.startsWith("cmd_prep_"));

const preparationNotifications = () =>
  surfaces.notifications.notificationCenterService
    .getAllItems()
    .filter((n) => n.id.startsWith("notif-prep-"));

function tableCellStrings(table: ReportTable): string[] {
  return table.rows.flatMap((row) => Object.values(row.cells).map((cell) => String(cell ?? "")));
}

// ── Matcher self-tests ───────────────────────────────────────────────────────
//
// Proves the privacy checks below CAN fail. Without these, a typo in a regex or
// an empty forbidden-value list would turn every assertion in this file into a
// pass that means nothing.

describe("privacy matchers actually bite", () => {
  it("collects real recipient identity values from the batch fixtures", () => {
    expect(RECIPIENT_IDENTITY_VALUES.length).toBeGreaterThan(5);
    expect(RECIPIENT_IDENTITY_VALUES.some((v) => v.includes("@"))).toBe(true);
    expect(RECIPIENT_IDENTITY_VALUES.every((v) => v.length >= 3)).toBe(true);
  });

  it("flags identity-bearing labels and passes count labels", () => {
    expect(IDENTITY_LABEL.test("Participant Count")).toBe(true);
    expect(IDENTITY_LABEL.test("Recipient Name")).toBe(true);
    expect(IDENTITY_LABEL.test("Email Address")).toBe(true);
    expect(IDENTITY_LABEL.test("Contact Group")).toBe(true);
    expect(IDENTITY_LABEL.test("Recipient Rows")).toBe(false);
    expect(IDENTITY_LABEL.test("Preparation Status")).toBe(false);
  });

  it("flags send claims and mutating verbs", () => {
    expect(SEND_CLAIM.test("Your batch was sent to 12 recipients")).toBe(true);
    expect(SEND_CLAIM.test("The document was signed")).toBe(true);
    expect(SEND_CLAIM.test("Bulk Send batch ready for review")).toBe(false);
    expect(readsLikeAction("Send Batch Now")).toBe(true);
    expect(readsLikeAction("Mark Batch Ready")).toBe(true);
    expect(readsLikeAction("Remove Invalid Rows")).toBe(true);
    // The feature name is not a verb, but a verb next to it still counts.
    expect(readsLikeAction("Open Bulk Send")).toBe(false);
    expect(readsLikeAction("Create Bulk Send Batch")).toBe(false);
    expect(readsLikeAction("Send Bulk Send Batch Now")).toBe(true);
  });

  it("recognises declared platform routes and rejects undeclared ones", () => {
    expect(routeExists("/app/bulk-send")).toBe(true);
    expect(routeExists("/app/bulk-send/bsb_ready/review")).toBe(true);
    expect(routeExists("/app/bulk-send/bsb_ready/send-now")).toBe(false);
    expect(routeExists("/app/not-a-real-route")).toBe(false);
  });
});

// ── 1. Global Search provider ────────────────────────────────────────────────

describe("Global Search — Bulk Send preparation provider", () => {
  it("returns preparation results for a documents-scoped search", () => {
    const results = preparationResults();

    expect(results.length).toBeGreaterThan(0);
    for (const result of results) {
      expect(result.id).toMatch(/^sr_prep_/);
    }
  });

  it("only surfaces batches from the session workspace, one result per batch", () => {
    const results = preparationResults();
    const batchIds = results.map((r) => r.id.replace(/^sr_prep_/, ""));

    expect(batchIds.length).toBeGreaterThan(0);
    for (const batchId of batchIds) {
      expect(
        SESSION_BATCH_IDS.has(batchId),
        `search returned batch "${batchId}", which is not in the session workspace`,
      ).toBe(true);
    }
    expect(new Set(batchIds).size).toBe(batchIds.length);
  });

  it("caps its own contribution at 5, regardless of maxPerGroup", () => {
    // Documented behaviour, not an accident: the provider slices to 5 before the
    // scope's maxPerGroup applies, so asking for 25 cannot widen it. Pinned so a
    // change to the cap is a deliberate, visible decision.
    const PROVIDER_CAP = 5;
    expect(preparationResults()).toHaveLength(Math.min(PROVIDER_CAP, SESSION_BATCH_IDS.size));
  });

  it("sends every result to a Bulk Send route that exists", () => {
    const results = preparationResults();
    expect(results.length).toBeGreaterThan(0);

    for (const result of results) {
      expect(result.destination.type).toBe("platform-route");
      expect(result.destination.path.startsWith("/app/bulk-send")).toBe(true);
      expect(
        routeExists(result.destination.path),
        `result ${result.id} points at undeclared route ${result.destination.path}`,
      ).toBe(true);
      // A result must not become a way to reach something the viewer could not
      // open directly — the destination revalidates permission on arrival.
      expect(result.destination.requiresPermission).toBeTruthy();
    }
  });

  it("never indexes a recipient email address", () => {
    const results = preparationResults();
    expect(results.length).toBeGreaterThan(0);

    for (const result of results) {
      for (const text of visibleText(result)) {
        expect(text, `"${text}" in ${result.id}`).not.toContain("@");
      }
      // The URL is the other place an address could end up.
      expect(result.destination.path).not.toContain("@");
    }
  });

  it("never carries a recipient name, address, or organization from the batch rows", () => {
    const results = preparationResults();
    expect(results.length).toBeGreaterThan(0);

    expect(JSON.stringify(results)).toContainNoneOf(RECIPIENT_IDENTITY_VALUES);
  });

  it("produces identical results for identical queries", () => {
    const first = preparationResults().map((r) => `${r.id}|${r.title}|${r.description}`);
    const second = preparationResults().map((r) => `${r.id}|${r.title}|${r.description}`);

    expect(first.length).toBeGreaterThan(0);
    expect(second).toEqual(first);
  });
});

// ── 2. Command Palette provider ──────────────────────────────────────────────

describe("Command Palette — Bulk Send preparation commands", () => {
  it("registers exactly three preparation commands", () => {
    const commands = preparationCommands();

    expect(commands).toHaveLength(3);
    expect(commands.map((c) => c.id).sort()).toEqual([
      "cmd_prep_configs",
      "cmd_prep_new",
      "cmd_prep_open",
    ]);
  });

  it("gives every command a destination that exists", () => {
    const commands = preparationCommands();
    expect(commands.length).toBe(3);

    for (const command of commands) {
      expect(command.destination, `${command.id} has no destination`).toBeDefined();
      expect(command.destination!.type).toBe("platform-route");
      expect(command.destination!.path.startsWith("/app/bulk-send")).toBe(true);
      expect(
        routeExists(command.destination!.path),
        `${command.id} points at undeclared route ${command.destination!.path}`,
      ).toBe(true);
    }
  });

  it("carries no command that performs a mutation", () => {
    const commands = preparationCommands();
    expect(commands.length).toBe(3);

    for (const command of commands) {
      // Navigation only: a palette entry must never bypass a confirmation, a
      // validation step, or an authoritative form.
      for (const field of EXECUTION_FIELDS) {
        expect(
          Object.prototype.hasOwnProperty.call(command, field),
          `${command.id} exposes an executable "${field}" field`,
        ).toBe(false);
      }
      const words = [command.label, command.description ?? "", ...(command.aliases ?? [])].join(" ");
      expect(readsLikeAction(words), `${command.id} reads like an action: "${words}"`).toBe(false);
      expect(command.label).not.toMatch(SEND_CLAIM);
    }
  });

  it("keeps command ids unique across the whole palette", () => {
    const ids = surfaces.search.globalSearchService.listCommands().map((c) => c.id);
    expect(new Set(ids).size).toBe(ids.length);
  });

  it("is reachable by the terms a user would actually type", () => {
    for (const term of ["bulk", "recipients", "batch", "preparation"]) {
      const matched = surfaces.search.globalSearchService
        .searchCommands(term)
        .filter((c) => c.id.startsWith("cmd_prep_"));
      expect(matched.length, `no preparation command matched "${term}"`).toBeGreaterThan(0);
    }
  });
});

// ── 3. Notification provider ─────────────────────────────────────────────────

describe("Notifications — Bulk Send preparation fixtures", () => {
  it("registers both preparation notifications", () => {
    expect(preparationNotifications().map((n) => n.id).sort()).toEqual([
      "notif-prep-attention-001",
      "notif-prep-ready-001",
    ]);
  });

  it("points every action at a real batch and a route that exists", () => {
    const notifications = preparationNotifications();
    expect(notifications).toHaveLength(2);

    for (const notification of notifications) {
      expect(notification.hasAction).toBe(true);
      const path = notification.actionPath ?? "";
      expect(path.startsWith("/app/bulk-send/")).toBe(true);

      const batchId = path.split("/")[3] ?? "";
      expect(
        SESSION_BATCH_IDS.has(batchId),
        `notification ${notification.id} links to unknown batch "${batchId}"`,
      ).toBe(true);
      expect(routeExists(path), `${notification.id} points at undeclared route ${path}`).toBe(true);
    }
  });

  it("belongs to the session workspace and is in-app only", () => {
    const notifications = preparationNotifications();
    expect(notifications).toHaveLength(2);

    for (const notification of notifications) {
      // A notification scoped to another workspace would either never appear or
      // appear to the wrong audience.
      expect(notification.workspaceId).toBe(TEST_WORKSPACE_ID);
      // Preparation state is not worth an email, and this demonstration sends none.
      expect(notification.deliveryClass).toBe("in-app-only");
    }
  });

  it("never claims a send, a delivery, or a signature", () => {
    const notifications = preparationNotifications();
    expect(notifications).toHaveLength(2);

    for (const notification of notifications) {
      expect(notification.title, `${notification.id} title`).not.toMatch(SEND_CLAIM);
      expect(notification.body, `${notification.id} body`).not.toMatch(SEND_CLAIM);
    }
  });

  it("never puts recipient identity in a title, body, or action path", () => {
    const notifications = preparationNotifications();
    expect(notifications).toHaveLength(2);

    for (const notification of notifications) {
      expect(notification.title).not.toContain("@");
      expect(notification.body).not.toContain("@");
      expect(notification.actionPath ?? "").not.toContain("@");
      expect(
        `${notification.title} ${notification.body} ${notification.actionPath ?? ""}`,
      ).toContainNoneOf(RECIPIENT_IDENTITY_VALUES);
    }
  });
});

// ── 4. Reports provider ──────────────────────────────────────────────────────

describe("Reports — preparation family", () => {
  it("labels no column or metric with recipient identity", () => {
    const report = surfaces.reports.reportingService.getPreparationReport(REPORT_QUERY);
    const tables = [report.batchTable, report.sourceMix, report.detailTable];

    for (const table of tables) {
      expect(table.columns.length).toBeGreaterThan(0);
      for (const column of table.columns) {
        expect(column.label, `${table.id} column "${column.label}"`).not.toMatch(IDENTITY_LABEL);
      }
    }

    expect(report.readinessSummary.length).toBeGreaterThan(0);
    for (const card of report.readinessSummary) {
      expect(card.label, `metric "${card.label}"`).not.toMatch(IDENTITY_LABEL);
    }
  });

  it("puts no recipient value in any report cell", () => {
    const report = surfaces.reports.reportingService.getPreparationReport(REPORT_QUERY);
    const cells = [
      ...tableCellStrings(report.batchTable),
      ...tableCellStrings(report.sourceMix),
      ...tableCellStrings(report.detailTable),
    ];

    expect(cells.length).toBeGreaterThan(0);
    for (const cell of cells) {
      expect(cell).not.toContain("@");
    }
    expect(cells.join(" | ")).toContainNoneOf(RECIPIENT_IDENTITY_VALUES);
  });

  it("links every report row to a Bulk Send route that exists", () => {
    const report = surfaces.reports.reportingService.getPreparationReport(REPORT_QUERY);
    const links = report.batchTable.rows.map((r) => r.linkTo).filter((l): l is string => !!l);

    expect(links.length).toBeGreaterThan(0);
    for (const link of links) {
      expect(link.startsWith("/app/bulk-send")).toBe(true);
      expect(routeExists(link), `report row points at undeclared route ${link}`).toBe(true);
    }
  });

  it("excludes every recipient column from the export preview", () => {
    const preview = surfaces.reports.reportingService.getExportPreview("preparation", REPORT_QUERY);

    expect(preview.includedColumns.length).toBeGreaterThan(0);
    for (const column of preview.includedColumns) {
      expect(column, `export column "${column}"`).not.toMatch(IDENTITY_LABEL);
    }
    // Contrast: the documents family legitimately exports a participant count, so
    // a clean preparation preview is a real exclusion, not a vacuous match.
    const documents = surfaces.reports.reportingService.getExportPreview("documents", REPORT_QUERY);
    expect(documents.includedColumns.some((c) => IDENTITY_LABEL.test(c))).toBe(true);
  });
});

// ── 5. Registration is deterministic and needs no navigation ─────────────────

describe("provider registration", () => {
  it("is populated on a fresh import, with no page rendered and no navigation", async () => {
    // A brand-new module registry. Nothing here mounts a router, renders a page,
    // or opens Bulk Send: only the service modules are imported. If registration
    // depended on a page visit, every assertion below would be empty.
    const fresh = await loadSurfacesWithBulkSend();

    expect(
      fresh.search.globalSearchService.listCommands().filter((c) => c.id.startsWith("cmd_prep_")),
    ).toHaveLength(3);
    // First call, no warm-up.
    expect(preparationResultsFrom(fresh.search.globalSearchService).length).toBeGreaterThan(0);
    expect(
      fresh.notifications.notificationCenterService
        .getAllItems()
        .filter((n) => n.id.startsWith("notif-prep-")),
    ).toHaveLength(2);
    expect(
      fresh.reports.reportingService.getPreparationReport(REPORT_QUERY).batchTable.rows.length,
    ).toBeGreaterThan(0);
    // The projection every surface reads is populated the same way.
    expect(fresh.projection.buildPlatformSummaries(TEST_WORKSPACE_ID).length).toBeGreaterThan(0);
  });

  it("produces the same registration on two independent fresh imports", async () => {
    const first = await loadSurfacesWithBulkSend();
    const firstCommands = first.search.globalSearchService.listCommands().map((c) => c.id);
    const firstResults = preparationResultsFrom(first.search.globalSearchService).map(
      (r) => `${r.id}|${r.title}`,
    );

    const second = await loadSurfacesWithBulkSend();
    const secondCommands = second.search.globalSearchService.listCommands().map((c) => c.id);
    const secondResults = preparationResultsFrom(second.search.globalSearchService).map(
      (r) => `${r.id}|${r.title}`,
    );

    expect(firstResults.length).toBeGreaterThan(0);
    expect(secondCommands).toEqual(firstCommands);
    expect(secondResults).toEqual(firstResults);
  });
});

// ── 6. The gate itself ───────────────────────────────────────────────────────
//
// The mirror image of everything above, on the REAL module graph this test
// environment builds (launch-default). If Bulk Send were registered
// unconditionally, these would fail — which is what makes the enterprise-preview
// assertions above meaningful rather than tautological.

describe("launch profile gating", () => {
  it("contributes nothing to any surface when bulk-send is not in the active profile", () => {
    expect(preparationResultsFrom(defaultProfileSearch)).toEqual([]);
    expect(defaultProfileSearch.listCommands().filter((c) => c.id.startsWith("cmd_prep_"))).toEqual(
      [],
    );
    expect(
      defaultProfileNotifications.getAllItems().filter((n) => n.id.startsWith("notif-prep-")),
    ).toEqual([]);
    expect(
      defaultProfileReports.getPreparationReport(REPORT_QUERY).batchTable.rows,
    ).toEqual([]);
  });
});
