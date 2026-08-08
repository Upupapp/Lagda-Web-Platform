// Mock Bulk Send service — Command 33.
//
// The ONE canonical service boundary for Bulk Send. All state is in-memory for the
// lifetime of the tab. Nothing is persisted, uploaded, queued, scheduled, delivered,
// signed, or enforced.
//
// Draft Projections are handed to the EXISTING document service so Documents remains
// the single source of truth for transactions.

import type {
  BulkSendBatch, BulkSendBatchId, BulkSendBatchSummary, BulkSendQuery,
  BulkSendRecipientRow, BulkSendRecipientRowId, BulkSendRoleMapping,
  BulkSendVariableMapping, BulkSendSavedConfiguration, BulkSendSavedConfigurationId,
  BulkSendImportPreview, BulkSendSourceColumn, BulkSendSourceSchema,
  BulkSendRecipientRowSource, BulkSendBulkCorrection, BulkSendCorrectionPreview,
  BulkSendRepresentativePreview, BulkSendBatchResultSummary, BulkSendProjectionResult,
  BulkSendActivityRecord, BulkSendActivityType, BulkSendScenario, BulkSendRequestDefaults,
  BulkSendEligibilitySummary, BulkSendEligibility, BulkSendPreviewKind,
} from "../../models/bulk-send";
import {
  bulkSendBatchId, bulkSendColumnId, bulkSendRowId, bulkSendProjectionId,
  bulkSendConfigId, isSafeBulkSendId, normalizeBulkSendText, normalizeHeader,
  BULK_SEND_BATCH_NAME_MAX, BULK_SEND_CONFIG_NAME_MAX, BULK_SEND_MAX_ROWS,
  BULK_SEND_MAX_PREVIEW_ROWS, EMPTY_VALIDATION_SUMMARY, DEFAULT_BULK_SEND_QUERY,
} from "../../models/bulk-send";
import {
  BULK_SEND_BATCH_FIXTURES, BULK_SEND_CONFIG_FIXTURES, BULK_SEND_DEMO_DATASETS,
  ARCHIVED_CONTACT_IDS, RESTRICTED_CONTACT_IDS,
} from "../../data/mock/bulk-send";
import {
  buildRoleMappings, buildVariableMappings, suggestRoleMappings, suggestVariableMappings,
  validateBatch, detectDuplicates, resolveEligibility, buildProjectionInputs,
  readRoleField, readVariableValue, applyTitlePattern,
  type ValidationContext,
} from "../bulk-send.engine";
import { parseTabularText, readLocalTabularFile, maskEmailDirection,
  DEFAULT_TABULAR_LIMITS } from "../../utils/tabular-import";
import { getTemplateById } from "./templates.service";
import { mockDocumentService } from "./document.service";
import type { DocumentListItem } from "../../models/documents";
import type { DocumentTemplate } from "../../models/templates";
import type { ServiceResult } from "../../models/errors";
import { ok, fail } from "../../models/errors";
import { delay } from "./delay";
import { registerSessionCleanup } from "../session-lifecycle";

// ── Context ───────────────────────────────────────────────────────────────────

export interface BulkSendContext {
  workspaceId:  string;
  workspaceName: string;
  teamId:       string | null;
  capabilityAvailable: boolean;
  canView:      boolean;
  canEdit:      boolean;
  signal?:      AbortSignal;
}

// ── Store ─────────────────────────────────────────────────────────────────────

function deepCopy<T>(v: T): T { return JSON.parse(JSON.stringify(v)) as T; }

let batches: BulkSendBatch[] = deepCopy(BULK_SEND_BATCH_FIXTURES);
let configurations: BulkSendSavedConfiguration[] = deepCopy(BULK_SEND_CONFIG_FIXTURES);
let activity: BulkSendActivityRecord[] = [];
let scenario: BulkSendScenario = "standard";

let counter = 5000;
function nextId(prefix: string): string { counter += 1; return `${prefix}_${counter}`; }

function guard(ctx: BulkSendContext, needsEdit: boolean): ServiceResult<never> | null {
  if (!ctx.capabilityAvailable) return fail("FEATURE_UNAVAILABLE");
  if (!ctx.canView) return fail("PERMISSION_DENIED");
  if (needsEdit && !ctx.canEdit) return fail("PERMISSION_DENIED");
  if (ctx.signal?.aborted) return fail("CANCELLED");
  return null;
}

function find(batchId: string): BulkSendBatch | undefined {
  return batches.find(b => String(b.id) === batchId);
}

function log(batch: BulkSendBatch, type: BulkSendActivityType, title: string, description: string): void {
  activity.unshift({
    id: nextId("bsact"), batchId: batch.id, type,
    timestamp: new Date().toISOString(), title, description, demonstrationOnly: true,
  });
  if (activity.length > 300) activity.length = 300;
}

// ── Contact statuses observed from the Contacts source ────────────────────────
//
// `buildValidationContext` is synchronous and the Contacts service is async, so
// validation cannot look a Contact up. The Contacts picker therefore passes the
// statuses it already holds through `applyRecipientSource`, and they are recorded
// here. Cleared on sign-out and on workspace switch — this map holds Contact IDs
// and must not survive an account change.
const _contactStatusById = new Map<string, string>();

function contactIdsWithStatus(status: string): Set<string> {
  const out = new Set<string>();
  for (const [id, s] of _contactStatusById) if (s === status) out.add(id);
  return out;
}

// ── Validation context ────────────────────────────────────────────────────────

function buildValidationContext(batch: BulkSendBatch, ctx: BulkSendContext): ValidationContext {
  const template = batch.templateId ? getTemplateById(batch.templateId) : null;
  return {
    template,
    templateArchived: !!template && template.status === "archived",
    templateRestricted: !!batch.templateId && !template,
    senderRestricted: false,
    teamRestricted: !!batch.scope.teamId && ctx.teamId !== null && ctx.teamId !== batch.scope.teamId,
    featureUnavailable: scenario === "feature-restricted",
    // Fixture IDs unioned with statuses observed from the real Contacts system,
    // so a Contact archived in Contacts is flagged here too.
    archivedContactIds: new Set([...ARCHIVED_CONTACT_IDS, ...contactIdsWithStatus("archived")]),
    restrictedContactIds: new Set([...RESTRICTED_CONTACT_IDS, ...contactIdsWithStatus("restricted")]),
    folderArchived: batch.organization.folderArchived,
    archivedTagCount: batch.organization.archivedTagNames.length,
    policyStale: batch.policy.stale,
    automationConflicts: batch.automation.conflicts,
  };
}

/** Recomputes validation, duplicates, row statuses and batch status. Mutates in place. */
function refresh(batch: BulkSendBatch, ctx: BulkSendContext): void {
  const vctx = buildValidationContext(batch, ctx);
  const { summary, rowStatuses } = validateBatch(batch, vctx);

  batch.duplicates = detectDuplicates(batch.rows, batch.roleMappings);
  for (const row of batch.rows) {
    row.status = rowStatuses[String(row.id)] ?? row.status;
    const group = batch.duplicates.find(g => g.rowIds.some(id => String(id) === String(row.id)));
    row.duplicateGroupKey = group ? group.key : null;
  }
  batch.validation = summary;

  // Derive batch status, unless it is in a terminal presentation state.
  if (batch.status !== "archived" && batch.status !== "draft-projections-created"
      && batch.status !== "partially-projected") {
    const hasRows = batch.rows.length > 0;
    const mappingBlocked = summary.blockingIssues.some(i => i.code.startsWith("mapping-"));
    const anyBlocking = summary.blockingIssues.length > 0;
    const needsReview = summary.warning > 0 || summary.duplicate > 0
      || summary.excluded > 0 || summary.restricted > 0 || summary.incomplete > 0;

    batch.status =
      !batch.templateId ? "draft"
      : !hasRows ? "draft"
      : mappingBlocked ? "mapping-required"
      : anyBlocking ? "invalid"
      : needsReview ? "needs-review"
      : "ready-in-demonstration";
  }

  batch.updatedAtDemonstration = new Date().toISOString();
}

// ── Schema building ───────────────────────────────────────────────────────────

function buildSchema(
  headers: string[],
  rows: string[][],
  source: BulkSendRecipientRowSource,
  extra: Partial<BulkSendSourceSchema> = {},
): BulkSendSourceSchema {
  const seen = new Map<string, number>();
  const columns: BulkSendSourceColumn[] = headers.map((h, index) => {
    const norm = normalizeHeader(h);
    const count = seen.get(norm) ?? 0;
    seen.set(norm, count + 1);
    return {
      id: bulkSendColumnId(`col_${index}_${norm.replace(/\s+/g, "_").slice(0, 24) || index}`),
      header: h,
      normalizedHeader: norm,
      index,
      sampleValues: rows.slice(0, 3).map(r => r[index] ?? "").filter(Boolean),
      duplicateHeader: count > 0,
    };
  });
  return {
    columns, rowCount: rows.length, source,
    fileNameDirection: null, fileSizeBytes: null, detectedDelimiter: null,
    headerDetected: true, parseWarnings: [],
    ...extra,
  };
}

function buildRows(
  batch: BulkSendBatch,
  schema: BulkSendSourceSchema,
  cells: string[][],
  source: BulkSendRecipientRowSource,
  contactIds: (string | null)[] = [],
  // Index-aligned with `cells`, exactly like `contactIds`. Without this, group
  // provenance was silently discarded: the field was hardcoded to null, so a row
  // could never record which Contact Group it came from.
  contactGroupIds: (string | null)[] = [],
): BulkSendRecipientRow[] {
  return cells.slice(0, BULK_SEND_MAX_ROWS).map((cellRow, i) => {
    const values: Record<string, string> = {};
    schema.columns.forEach((c, idx) => { values[String(c.id)] = cellRow[idx] ?? ""; });
    return {
      id: bulkSendRowId(nextId("bsr")),
      batchId: batch.id,
      rowNumber: i + 1,
      source,
      contactId: contactIds[i] ?? null,
      contactGroupId: contactGroupIds[i] ?? null,
      values,
      originalValues: { ...values },
      status: "incomplete",
      excluded: false,
      exclusionReason: null,
      projectionId: null,
      duplicateGroupKey: null,
      editedInSession: false,
    };
  });
}

// ── Defaults ──────────────────────────────────────────────────────────────────

function buildDefaults(template: DocumentTemplate | null): BulkSendRequestDefaults {
  const r = <T,>(value: T, source: BulkSendRequestDefaults["routingMode"]["source"]) =>
    ({ value, source, conflict: false, conflictExplanation: null });

  return {
    requestTitlePattern: r(template ? `${template.name} — {{recipient_name}}` : "{{recipient_name}}", "template"),
    senderMessage:       r(template?.settings?.invitationMessage ?? "", template?.settings?.invitationMessage ? "template" : "product-default"),
    routingMode:         r(template?.routing?.mode ?? "sequential", template?.routing ? "template" : "product-default"),
    authMethod:          r(template?.authentication?.globalDefault ?? "email-otp", template?.authentication ? "template" : "product-default"),
    consentRequired:     r(true, "product-default"),
    dueDateDirection:    r(null, "product-default"),
    expirationDirection: r(
      template?.settings?.expirationEnabled ? `${template.settings.expirationDays} days after the request begins` : null,
      template?.settings?.expirationEnabled ? "template" : "product-default"),
    completionCopyDirection: r(null, "product-default"),
    verificationDirection:   r("Verification record available after completion", "product-default"),
  };
}

// ── Service ───────────────────────────────────────────────────────────────────

class MockBulkSendService {

  // ── Batches ─────────────────────────────────────────────────────────────────

  async listBatches(query: BulkSendQuery, ctx: BulkSendContext): Promise<ServiceResult<BulkSendBatchSummary[]>> {
    const g = guard(ctx, false); if (g) return g;
    await delay(180);
    if (ctx.signal?.aborted) return fail("CANCELLED");
    if (scenario === "full-failure") return fail("DEMO_SERVICE_UNAVAILABLE");
    if (scenario === "new-workspace") return ok([]);

    const q = (query.q ?? "").trim().toLowerCase();
    let list = batches.filter(b => {
      if (b.scope.workspaceId !== ctx.workspaceId) return false;
      if (ctx.teamId && b.scope.teamId && b.scope.teamId !== ctx.teamId) return false;
      if (query.status !== "all" && b.status !== query.status) return false;
      if (query.templateId !== "all" && b.templateId !== query.templateId) return false;
      if (query.teamId !== "all" && b.scope.teamId !== query.teamId) return false;
      if (query.senderId !== "all" && b.scope.senderId !== query.senderId) return false;
      if (query.hasWarnings && b.validation.warning === 0) return false;
      if (query.hasExclusions && b.validation.excluded === 0) return false;
      if (query.hasProjections && !b.results) return false;
      if (q && !(b.name.toLowerCase().includes(q)
        || (b.templateName ?? "").toLowerCase().includes(q)
        || (b.scope.teamName ?? "").toLowerCase().includes(q)
        || b.scope.senderName.toLowerCase().includes(q))) return false;
      return true;
    });

    list = [...list].sort((a, b) => {
      switch (query.sort) {
        case "name":         return a.name.localeCompare(b.name);
        case "status":       return a.status.localeCompare(b.status);
        case "ready-rows":   return b.validation.ready - a.validation.ready;
        case "warning-rows": return b.validation.warning - a.validation.warning;
        case "created":      return b.createdAtDemonstration.localeCompare(a.createdAtDemonstration);
        default:             return b.updatedAtDemonstration.localeCompare(a.updatedAtDemonstration);
      }
    });

    return ok(list.map(b => ({
      id: b.id, name: b.name, status: b.status,
      templateName: b.templateName, teamName: b.scope.teamName, senderName: b.scope.senderName,
      totalRows: b.rows.length,
      readyRows: b.validation.ready,
      warningRows: b.validation.warning,
      excludedRows: b.validation.excluded,
      draftProjections: b.results?.draftProjectionsCreated ?? b.rows.filter(r => r.projectionId).length,
      updatedAtDemonstration: b.updatedAtDemonstration,
    })));
  }

  async getBatch(batchId: string, ctx: BulkSendContext): Promise<ServiceResult<BulkSendBatch>> {
    const g = guard(ctx, false); if (g) return g;
    if (!isSafeBulkSendId(batchId)) return fail("INVALID_ID");
    await delay(150);
    if (ctx.signal?.aborted) return fail("CANCELLED");

    const batch = find(batchId);
    if (!batch) return fail("NOT_FOUND");
    if (batch.scope.workspaceId !== ctx.workspaceId) return fail("WORKSPACE_RESTRICTED");

    refresh(batch, ctx);
    return ok(deepCopy(batch));
  }

  async createBatch(
    input: { name: string; templateId: string | null },
    ctx: BulkSendContext,
  ): Promise<ServiceResult<BulkSendBatch>> {
    const g = guard(ctx, true); if (g) return g;
    const name = normalizeBulkSendText(input.name, BULK_SEND_BATCH_NAME_MAX);
    if (!name) return fail("REQUIRED_FIELD", "name");
    await delay(200);

    const template = input.templateId ? getTemplateById(input.templateId) : null;
    const now = new Date().toISOString();

    const batch: BulkSendBatch = {
      id: bulkSendBatchId(nextId("bsb")),
      name, status: "draft",
      scope: {
        workspaceId: ctx.workspaceId, workspaceName: ctx.workspaceName,
        teamId: ctx.teamId, teamName: null,
        senderId: "wm_ana", senderName: "Ana Reyes",
      },
      templateId: (template?.id ?? null),
      templateName: template?.name ?? null,
      templateArchived: template?.status === "archived",
      schema: null, rows: [],
      roleMappings: template ? buildRoleMappings(template) : [],
      variableMappings: template ? buildVariableMappings(template) : [],
      defaults: buildDefaults(template),
      organization: { folderId: null, folderName: null, tagIds: [], tagNames: [], folderArchived: false, archivedTagNames: [] },
      policy: { policyId: null, policyName: null, stale: false, appliedValues: [] },
      automation: { ruleId: null, ruleName: null, stale: false, projectedActions: [], conflicts: [] },
      validation: { ...EMPTY_VALIDATION_SUMMARY },
      duplicates: [], results: null, appliedConfigurationId: null,
      createdAtDemonstration: now, updatedAtDemonstration: now,
      demonstrationOnly: true,
    };

    batches.unshift(batch);
    refresh(batch, ctx);
    log(batch, "batch-created", "Batch created in frontend state",
      `"${name}" was created. Nothing was persisted or sent.`);
    return ok(deepCopy(batch));
  }

  async updateBatch(
    batchId: string,
    input: { name?: string; templateId?: string | null; defaults?: BulkSendRequestDefaults;
             organization?: BulkSendBatch["organization"] },
    ctx: BulkSendContext,
  ): Promise<ServiceResult<BulkSendBatch>> {
    const g = guard(ctx, true); if (g) return g;
    const batch = find(batchId);
    if (!batch) return fail("NOT_FOUND");
    if (batch.status === "archived") return fail("ARCHIVED");
    await delay(140);

    if (input.name !== undefined) {
      const name = normalizeBulkSendText(input.name, BULK_SEND_BATCH_NAME_MAX);
      if (!name) return fail("REQUIRED_FIELD", "name");
      batch.name = name;
    }
    if (input.templateId !== undefined) {
      const template = input.templateId ? getTemplateById(input.templateId) : null;
      batch.templateId = (template?.id ?? null);
      batch.templateName = template?.name ?? null;
      batch.templateArchived = template?.status === "archived";
      // Changing the Template invalidates every existing binding.
      batch.roleMappings = template ? buildRoleMappings(template) : [];
      batch.variableMappings = template ? buildVariableMappings(template) : [];
      batch.defaults = buildDefaults(template);
      if (batch.schema) {
        batch.roleMappings = suggestRoleMappings(batch.roleMappings, batch.schema.columns);
        batch.variableMappings = suggestVariableMappings(batch.variableMappings, batch.schema.columns);
      }
    }
    if (input.defaults) batch.defaults = input.defaults;
    if (input.organization) batch.organization = input.organization;

    refresh(batch, ctx);
    return ok(deepCopy(batch));
  }

  async duplicateBatch(
    batchId: string, includeRows: boolean, ctx: BulkSendContext,
  ): Promise<ServiceResult<BulkSendBatch>> {
    const g = guard(ctx, true); if (g) return g;
    const source = find(batchId);
    if (!source) return fail("NOT_FOUND");
    await delay(200);

    const now = new Date().toISOString();
    const copy: BulkSendBatch = {
      ...deepCopy(source),
      id: bulkSendBatchId(nextId("bsb")),
      name: normalizeBulkSendText(`${source.name} Copy`, BULK_SEND_BATCH_NAME_MAX),
      status: "draft",
      // Configuration-only duplication is the default: recipient rows and every
      // projection result are dropped unless the user explicitly opts in.
      rows: includeRows
        ? source.rows.map((r, i) => ({
            ...deepCopy(r),
            id: bulkSendRowId(nextId("bsr")),
            rowNumber: i + 1,
            status: "incomplete" as const,
            projectionId: null,
            excluded: false,
            exclusionReason: null,
          }))
        : [],
      schema: includeRows ? deepCopy(source.schema) : null,
      results: null,
      validation: { ...EMPTY_VALIDATION_SUMMARY },
      duplicates: [],
      createdAtDemonstration: now,
      updatedAtDemonstration: now,
    };
    copy.rows.forEach(r => { r.batchId = copy.id; });

    batches.unshift(copy);
    refresh(copy, ctx);
    log(copy, "batch-created", "Batch duplicated",
      includeRows ? "Configuration and recipient rows were copied." : "Configuration was copied. Recipient rows were not.");
    return ok(deepCopy(copy));
  }

  async archiveBatch(batchId: string, ctx: BulkSendContext): Promise<ServiceResult<true>> {
    const g = guard(ctx, true); if (g) return g;
    const batch = find(batchId);
    if (!batch) return fail("NOT_FOUND");
    await delay(120);
    batch.status = "archived";
    batch.updatedAtDemonstration = new Date().toISOString();
    log(batch, "batch-archived", "Batch archived", "The batch was archived for frontend reference.");
    return ok(true);
  }

  async restoreBatch(batchId: string, ctx: BulkSendContext): Promise<ServiceResult<BulkSendBatch>> {
    const g = guard(ctx, true); if (g) return g;
    const batch = find(batchId);
    if (!batch) return fail("NOT_FOUND");
    await delay(120);
    batch.status = "draft";
    refresh(batch, ctx);
    return ok(deepCopy(batch));
  }

  /** Removes mutable frontend state only. Draft Projections already created stay in Documents. */
  async removeBatchDemonstration(batchId: string, ctx: BulkSendContext): Promise<ServiceResult<true>> {
    const g = guard(ctx, true); if (g) return g;
    const index = batches.findIndex(b => String(b.id) === batchId);
    if (index === -1) return fail("NOT_FOUND");
    await delay(140);
    batches.splice(index, 1);
    activity = activity.filter(a => String(a.batchId) !== batchId);
    return ok(true);
  }

  // ── Recipient sources ───────────────────────────────────────────────────────

  listDemoDatasets(): typeof BULK_SEND_DEMO_DATASETS { return BULK_SEND_DEMO_DATASETS; }

  async parseStructuredPaste(text: string, ctx: BulkSendContext): Promise<ServiceResult<BulkSendImportPreview>> {
    const g = guard(ctx, true); if (g) return g;
    await delay(120);
    const parsed = parseTabularText(text, DEFAULT_TABULAR_LIMITS);
    if (!parsed.ok) return ok(this._emptyPreview(parsed.errors, "structured-paste"));
    const schema = buildSchema(parsed.headers, parsed.rows, "structured-paste", {
      detectedDelimiter: parsed.delimiter, headerDetected: parsed.headerDetected,
      parseWarnings: parsed.warnings,
    });
    return ok(this._buildPreview(schema, parsed.rows, parsed));
  }

  async previewLocalCsv(file: File, ctx: BulkSendContext): Promise<ServiceResult<BulkSendImportPreview>> {
    const g = guard(ctx, true); if (g) return g;
    if (scenario === "malformed-csv") {
      return ok(this._emptyPreview(["The file could not be parsed as delimited text."], "local-csv-preview"));
    }
    const read = await readLocalTabularFile(file, DEFAULT_TABULAR_LIMITS);
    if (!read.ok) return ok(this._emptyPreview([read.error ?? "The file could not be read."], "local-csv-preview"));

    const parsed = parseTabularText(read.text, DEFAULT_TABULAR_LIMITS);
    if (!parsed.ok) return ok(this._emptyPreview(parsed.errors, "local-csv-preview"));

    const schema = buildSchema(parsed.headers, parsed.rows, "local-csv-preview", {
      fileNameDirection: read.fileName, fileSizeBytes: read.sizeBytes,
      detectedDelimiter: parsed.delimiter, headerDetected: parsed.headerDetected,
      parseWarnings: parsed.warnings,
    });
    return ok(this._buildPreview(schema, parsed.rows, parsed));
  }

  private _emptyPreview(errors: string[], source: BulkSendRecipientRowSource): BulkSendImportPreview {
    return {
      schema: buildSchema([], [], source),
      previewRows: [], totalRowsDetected: 0, truncated: false,
      neutralizedCellCount: 0, errors,
    };
  }

  private _buildPreview(
    schema: BulkSendSourceSchema, rows: string[][],
    parsed: { totalRecordsDetected: number; truncated: boolean; neutralizedCellCount: number; warnings: string[] },
  ): BulkSendImportPreview {
    const previewRows = rows.slice(0, BULK_SEND_MAX_PREVIEW_ROWS).map(r => {
      const obj: Record<string, string> = {};
      schema.columns.forEach((c, i) => { obj[String(c.id)] = r[i] ?? ""; });
      return obj;
    });
    return {
      schema, previewRows,
      totalRowsDetected: parsed.totalRecordsDetected,
      truncated: parsed.truncated,
      neutralizedCellCount: parsed.neutralizedCellCount,
      errors: [],
    };
  }

  /** Commits parsed cells onto the batch and auto-suggests mappings deterministically. */
  async applyRecipientSource(
    batchId: string,
    headers: string[],
    cells: string[][],
    source: BulkSendRecipientRowSource,
    ctx: BulkSendContext,
    extra: {
      contactIds?: (string | null)[];
      /** Index-aligned with `cells`, like `contactIds`. */
      contactGroupIds?: (string | null)[];
      /**
       * Statuses of the Contacts being projected. Needed because
       * `buildValidationContext` is synchronous while the Contacts service is
       * async, so validation cannot look a Contact up on its own. Without this,
       * archived and restricted Contacts sourced from the real Contacts system
       * would validate as clean — the hardcoded fixture ID sets never match a
       * canonical `contact-*` ID, and `contactId` is a plain string so nothing
       * type-checks the join.
       */
      contactStatuses?: Array<{ contactId: string; status: string }>;
      fileNameDirection?: string | null;
      fileSizeBytes?: number | null;
    } = {},
  ): Promise<ServiceResult<BulkSendBatch>> {
    const g = guard(ctx, true); if (g) return g;
    const batch = find(batchId);
    if (!batch) return fail("NOT_FOUND");
    if (batch.status === "archived") return fail("ARCHIVED");
    await delay(180);

    const schema = buildSchema(headers, cells, source, {
      fileNameDirection: extra.fileNameDirection ?? null,
      fileSizeBytes: extra.fileSizeBytes ?? null,
    });
    // Record Contact statuses before rows are built so the validation pass that
    // `refresh()` triggers can see archived/restricted Contacts sourced from the
    // canonical Contacts system, not just the hardcoded fixture IDs.
    for (const s of extra.contactStatuses ?? []) {
      _contactStatusById.set(s.contactId, s.status);
    }

    batch.schema = schema;
    batch.rows = buildRows(batch, schema, cells, source, extra.contactIds ?? [], extra.contactGroupIds ?? []);

    const template = batch.templateId ? getTemplateById(batch.templateId) : null;
    if (template) {
      batch.roleMappings = suggestRoleMappings(
        batch.roleMappings.length ? batch.roleMappings : buildRoleMappings(template), schema.columns);
      const used = batch.roleMappings.flatMap(m => Object.values(m.columnByField)).filter(Boolean);
      batch.variableMappings = suggestVariableMappings(
        batch.variableMappings.length ? batch.variableMappings : buildVariableMappings(template),
        schema.columns, used.filter(Boolean) as never);
    }

    refresh(batch, ctx);
    log(batch, "recipients-added", "Recipients added",
      `${batch.rows.length} rows were added from ${source.replace(/-/g, " ")}.`);
    if (source === "local-csv-preview") {
      log(batch, "csv-previewed-locally", "CSV previewed locally",
        "A local file was parsed in the browser. It was not uploaded or persisted.");
    }
    return ok(deepCopy(batch));
  }

  // ── Rows ────────────────────────────────────────────────────────────────────

  async updateRecipientRow(
    batchId: string, rowId: string, values: Record<string, string>, ctx: BulkSendContext,
  ): Promise<ServiceResult<BulkSendBatch>> {
    const g = guard(ctx, true); if (g) return g;
    const batch = find(batchId);
    if (!batch) return fail("NOT_FOUND");
    const row = batch.rows.find(r => String(r.id) === rowId);
    if (!row) return fail("NOT_FOUND");
    await delay(110);

    for (const [k, v] of Object.entries(values)) {
      row.values[k] = normalizeBulkSendText(v, 500);
    }
    row.editedInSession = true;
    refresh(batch, ctx);
    log(batch, "rows-corrected", "Row corrected", `Row ${row.rowNumber} was edited in the batch.`);
    return ok(deepCopy(batch));
  }

  // ── Request Defaults ────────────────────────────────────────────────────────
  //
  // Two methods, both minimal extensions of this existing service boundary. No
  // separate defaults store is introduced: an override is simply the canonical
  // resolved value carrying `source: "user"`, which is the top of
  // BULK_SEND_DEFAULT_PRECEDENCE, and restoring inheritance recomputes the field
  // from `buildDefaults` — the same resolver that produced it originally.
  //
  // Neither method touches recipient rows. A default is a fallback; a row the user
  // edited keeps its own value.

  /** Applies request-level overrides. Values are already normalised by the caller. */
  async updateRequestDefaults(
    batchId: string,
    overrides: Partial<Record<keyof BulkSendRequestDefaults, unknown>>,
    ctx: BulkSendContext,
  ): Promise<ServiceResult<BulkSendBatch>> {
    const g = guard(ctx, true); if (g) return g;
    const batch = find(batchId);
    if (!batch) return fail("NOT_FOUND");
    if (batch.status === "archived") return fail("ARCHIVED");
    // Defaults describe how a request will be prepared, so they stop being
    // editable once projections exist.
    if (batch.status === "draft-projections-created" || batch.status === "partially-projected") {
      return fail("INVALID_STATE");
    }
    await delay(140);

    // A batch created without a Template starts with no resolved defaults. Build
    // them from the canonical resolver first so there is always something to
    // override, rather than refusing the edit.
    if (!batch.defaults) {
      batch.defaults = buildDefaults(batch.templateId ? getTemplateById(batch.templateId) : null);
    }

    for (const [key, value] of Object.entries(overrides)) {
      const field = key as keyof BulkSendRequestDefaults;
      if (!(field in batch.defaults)) continue;
      (batch.defaults[field] as { value: unknown; source: string; conflict: boolean; conflictExplanation: string | null }) = {
        value,
        source: "user",
        conflict: false,
        conflictExplanation: null,
      };
    }

    refresh(batch, ctx);
    log(batch, "defaults-updated", "Request defaults updated",
      `${Object.keys(overrides).length} request default(s) were overridden in this preparation draft.`);
    return ok(deepCopy(batch));
  }

  /**
   * Removes request-level overrides, letting the canonical resolver decide again.
   * Passing "all" resets every field.
   */
  async restoreRequestDefaults(
    batchId: string,
    fields: (keyof BulkSendRequestDefaults)[] | "all",
    ctx: BulkSendContext,
  ): Promise<ServiceResult<BulkSendBatch>> {
    const g = guard(ctx, true); if (g) return g;
    const batch = find(batchId);
    if (!batch) return fail("NOT_FOUND");
    if (batch.status === "archived") return fail("ARCHIVED");
    await delay(130);

    const template = batch.templateId ? getTemplateById(batch.templateId) : null;
    const inherited = buildDefaults(template);
    if (!batch.defaults) batch.defaults = inherited;

    const targets = fields === "all"
      ? (Object.keys(inherited) as (keyof BulkSendRequestDefaults)[])
      : fields;

    for (const field of targets) {
      if (!(field in batch.defaults) || !(field in inherited)) continue;
      (batch.defaults[field] as unknown) = { ...(inherited[field] as object) };
    }

    refresh(batch, ctx);
    log(batch, "defaults-updated", "Request defaults restored",
      fields === "all"
        ? "All request overrides were removed. Values are inherited again."
        : `${targets.length} request default(s) returned to their inherited value.`);
    return ok(deepCopy(batch));
  }

  async excludeRows(batchId: string, rowIds: string[], reason: string, ctx: BulkSendContext): Promise<ServiceResult<BulkSendBatch>> {
    const g = guard(ctx, true); if (g) return g;
    const batch = find(batchId);
    if (!batch) return fail("NOT_FOUND");
    await delay(120);
    const set = new Set(rowIds);
    let n = 0;
    for (const row of batch.rows) {
      if (set.has(String(row.id)) && !row.projectionId) {
        row.excluded = true;
        row.exclusionReason = normalizeBulkSendText(reason, 200) || "Excluded during review.";
        n++;
      }
    }
    refresh(batch, ctx);
    log(batch, "rows-excluded", "Rows excluded",
      `${n} rows were excluded. Exclusion is not deletion and does not change Contact records.`);
    return ok(deepCopy(batch));
  }

  async restoreRows(batchId: string, rowIds: string[], ctx: BulkSendContext): Promise<ServiceResult<BulkSendBatch>> {
    const g = guard(ctx, true); if (g) return g;
    const batch = find(batchId);
    if (!batch) return fail("NOT_FOUND");
    await delay(120);
    const set = new Set(rowIds);
    let n = 0;
    for (const row of batch.rows) {
      if (set.has(String(row.id))) { row.excluded = false; row.exclusionReason = null; n++; }
    }
    refresh(batch, ctx);
    log(batch, "rows-restored", "Rows restored",
      `${n} rows were restored and revalidated. Restoring does not guarantee Ready status.`);
    return ok(deepCopy(batch));
  }

  previewBulkCorrection(batch: BulkSendBatch, correction: BulkSendBulkCorrection): BulkSendCorrectionPreview {
    const affected: BulkSendRecipientRowId[] = [];
    const skipped: BulkSendRecipientRowId[] = [];

    for (const row of batch.rows) {
      if (row.excluded || row.projectionId) continue;
      switch (correction.type) {
        case "trim-whitespace": {
          const dirty = Object.values(row.values).some(v => v !== v.trim());
          (dirty ? affected : skipped).push(row.id);
          break;
        }
        case "apply-organization":
        case "apply-variable-constant": {
          if (!correction.columnId) break;
          const current = (row.values[String(correction.columnId)] ?? "").trim();
          // Never silently overwrite a differing value that is already present.
          if (!current) affected.push(row.id);
          else if (current === (correction.value ?? "").trim()) skipped.push(row.id);
          else skipped.push(row.id);
          break;
        }
        case "exclude-duplicates":
          (row.duplicateGroupKey ? affected : skipped).push(row.id);
          break;
        case "exclude-incomplete":
          (row.status === "incomplete" ? affected : skipped).push(row.id);
          break;
        default:
          affected.push(row.id);
      }
    }

    const description =
      correction.type === "trim-whitespace" ? "Removes leading and trailing spaces from every mapped value."
      : correction.type === "exclude-duplicates" ? "Excludes every row that belongs to a duplicate group."
      : correction.type === "exclude-incomplete" ? "Excludes every row that is missing a required value."
      : "Applies the value only to rows that are currently empty. Rows holding a different value are left untouched.";

    return { correction, affectedRowIds: affected, skippedRowIds: skipped, description };
  }

  async applyBulkCorrection(
    batchId: string, correction: BulkSendBulkCorrection, ctx: BulkSendContext,
  ): Promise<ServiceResult<BulkSendBatch>> {
    const g = guard(ctx, true); if (g) return g;
    const batch = find(batchId);
    if (!batch) return fail("NOT_FOUND");
    await delay(160);

    const preview = this.previewBulkCorrection(batch, correction);
    const affected = new Set(preview.affectedRowIds.map(String));

    for (const row of batch.rows) {
      if (!affected.has(String(row.id))) continue;
      switch (correction.type) {
        case "trim-whitespace":
          for (const [k, v] of Object.entries(row.values)) row.values[k] = v.trim();
          break;
        case "apply-organization":
        case "apply-variable-constant":
          if (correction.columnId) row.values[String(correction.columnId)] = normalizeBulkSendText(correction.value ?? "", 500);
          break;
        case "exclude-duplicates":
          row.excluded = true; row.exclusionReason = "Excluded as part of a duplicate group.";
          break;
        case "exclude-incomplete":
          row.excluded = true; row.exclusionReason = "Excluded — missing required values.";
          break;
        case "apply-auth-method":
          if (correction.authMethod) batch.roleMappings.forEach(m => { m.authMethod = correction.authMethod!; });
          break;
      }
    }

    refresh(batch, ctx);
    log(batch, "rows-corrected", "Bulk correction applied",
      `${preview.affectedRowIds.length} rows were changed. ${preview.skippedRowIds.length} were left untouched.`);
    return ok(deepCopy(batch));
  }

  // ── Mapping ─────────────────────────────────────────────────────────────────

  async updateRoleMappings(batchId: string, mappings: BulkSendRoleMapping[], ctx: BulkSendContext): Promise<ServiceResult<BulkSendBatch>> {
    const g = guard(ctx, true); if (g) return g;
    const batch = find(batchId);
    if (!batch) return fail("NOT_FOUND");
    await delay(120);
    batch.roleMappings = deepCopy(mappings);
    refresh(batch, ctx);
    log(batch, "mapping-updated", "Role mapping updated", "Source columns were bound to Template participant roles.");
    return ok(deepCopy(batch));
  }

  async updateVariableMappings(batchId: string, mappings: BulkSendVariableMapping[], ctx: BulkSendContext): Promise<ServiceResult<BulkSendBatch>> {
    const g = guard(ctx, true); if (g) return g;
    const batch = find(batchId);
    if (!batch) return fail("NOT_FOUND");
    await delay(120);
    batch.variableMappings = deepCopy(mappings);
    refresh(batch, ctx);
    log(batch, "mapping-updated", "Variable mapping updated", "Source columns were bound to approved Template variables.");
    return ok(deepCopy(batch));
  }

  async autoSuggestMappings(batchId: string, ctx: BulkSendContext): Promise<ServiceResult<BulkSendBatch>> {
    const g = guard(ctx, true); if (g) return g;
    const batch = find(batchId);
    if (!batch || !batch.schema) return fail("NOT_FOUND");
    await delay(140);
    batch.roleMappings = suggestRoleMappings(batch.roleMappings, batch.schema.columns);
    batch.variableMappings = suggestVariableMappings(batch.variableMappings, batch.schema.columns);
    refresh(batch, ctx);
    log(batch, "mapping-updated", "Suggested mappings applied",
      "Deterministic header matches were applied. Ambiguous matches remain marked for review.");
    return ok(deepCopy(batch));
  }

  // ── Validation, eligibility, previews ───────────────────────────────────────

  async validateBatchNow(batchId: string, ctx: BulkSendContext): Promise<ServiceResult<BulkSendBatch>> {
    const g = guard(ctx, false); if (g) return g;
    const batch = find(batchId);
    if (!batch) return fail("NOT_FOUND");
    await delay(200);
    refresh(batch, ctx);
    log(batch, "validation-run", "Validation run", "Every row was revalidated against the current mappings.");
    return ok(deepCopy(batch));
  }

  getEligibility(batch: BulkSendBatch, ctx: BulkSendContext): { rows: BulkSendEligibility[]; summary: BulkSendEligibilitySummary } {
    const vctx = buildValidationContext(batch, ctx);
    const rowStatuses: Record<string, BulkSendBatch["rows"][number]["status"]> = {};
    for (const r of batch.rows) rowStatuses[String(r.id)] = r.status;
    return resolveEligibility(batch, batch.validation, rowStatuses, vctx);
  }

  getRepresentativePreviews(batch: BulkSendBatch, selectedRowId: string | null): BulkSendRepresentativePreview[] {
    const template = batch.templateId ? getTemplateById(batch.templateId) : null;
    const kinds: BulkSendPreviewKind[] = ["first-ready", "first-warning", "multi-participant", "selected"];

    const pick = (kind: BulkSendPreviewKind): BulkSendRecipientRow | null => {
      switch (kind) {
        case "first-ready":       return batch.rows.find(r => r.status === "ready-in-demonstration") ?? null;
        case "first-warning":     return batch.rows.find(r => r.status === "warning" || r.status === "duplicate") ?? null;
        case "multi-participant": return batch.roleMappings.filter(m => Object.values(m.columnByField).some(Boolean)).length > 1
          ? (batch.rows.find(r => !r.excluded) ?? null) : null;
        case "selected":          return selectedRowId ? (batch.rows.find(r => String(r.id) === selectedRowId) ?? null) : null;
      }
    };

    return kinds.map(kind => {
      const row = pick(kind);
      if (!row || !template || !batch.defaults) {
        return {
          kind, rowId: null, available: false,
          unavailableReason: !template ? "Choose a Template first."
            : kind === "multi-participant" ? "This Template maps a single participant role."
            : kind === "selected" ? "Select a row in the recipient grid."
            : "No matching row.",
          requestTitle: "", senderMessage: "", templateName: batch.templateName ?? "",
          participants: [], routingMode: "sequential", routingSummary: "",
          authDirection: "", consentDirection: "", dueDateDirection: null,
          expirationDirection: null, folderName: null, tagNames: [],
          variableValues: {}, defaultSources: [], warnings: [],
        };
      }

      const inputs = buildProjectionInputs(batch, [row.id], template, batch.defaults.requestTitlePattern.value);
      const input = inputs[0];
      const issues = batch.validation.issuesByRow[String(row.id)] ?? [];

      return {
        kind, rowId: row.id, available: true, unavailableReason: null,
        requestTitle: input?.documentTitle ?? "",
        senderMessage: batch.defaults.senderMessage.value,
        templateName: template.name,
        participants: input?.roleMappings ?? [],
        routingMode: batch.defaults.routingMode.value,
        routingSummary: batch.defaults.routingMode.value === "sequential"
          ? "Participants act one step at a time." : "Participants act in parallel.",
        authDirection: batch.defaults.authMethod.value,
        consentDirection: batch.defaults.consentRequired.value
          ? "Electronic records consent required" : "Electronic records consent not required",
        dueDateDirection: batch.defaults.dueDateDirection.value,
        expirationDirection: batch.defaults.expirationDirection.value,
        folderName: batch.organization.folderName,
        tagNames: batch.organization.tagNames,
        variableValues: input?.variableValues ?? {},
        defaultSources: [
          { label: "Request title", source: batch.defaults.requestTitlePattern.source },
          { label: "Routing", source: batch.defaults.routingMode.source },
          { label: "Authentication", source: batch.defaults.authMethod.source },
        ],
        warnings: issues.filter(i => i.severity !== "blocking").map(i => i.message),
      };
    });
  }

  // ── Draft Projections ───────────────────────────────────────────────────────

  /**
   * Creates deterministic frontend Draft Projections for eligible rows and hands
   * them to the canonical Documents store.
   *
   * Creates NO recipient session, NO My Actions item, NO invitation, NO email/SMS/push,
   * NO reminder, NO Evidence, NO Verification, and applies NO signature.
   */
  async createDraftProjections(
    batchId: string, eligibleRowIds: string[], ctx: BulkSendContext,
  ): Promise<ServiceResult<BulkSendBatchResultSummary>> {
    const g = guard(ctx, true); if (g) return g;
    const batch = find(batchId);
    if (!batch) return fail("NOT_FOUND");
    const template = batch.templateId ? getTemplateById(batch.templateId) : null;
    if (!template) return fail("RESOURCE_UNAVAILABLE");

    // Always revalidate immediately before projecting — a query value can never
    // make a row eligible, and the client's list is never trusted on its own.
    refresh(batch, ctx);
    if (batch.validation.blockingIssues.length > 0) return fail("INCOMPATIBLE_CONFIGURATION");

    const { rows: eligibility } = this.getEligibility(batch, ctx);
    const trulyEligible = new Set(
      eligibility.filter(e => e.eligible).map(e => String(e.rowId)),
    );
    const requested = new Set(eligibleRowIds);
    const finalIds = [...trulyEligible].filter(id => requested.has(id));

    await delay(420);

    const inputs = buildProjectionInputs(
      batch, finalIds as unknown as BulkSendRecipientRowId[], template,
      batch.defaults?.requestTitlePattern.value ?? "",
    );

    const now = new Date().toISOString();
    const projectedDocs: DocumentListItem[] = [];
    const results: BulkSendProjectionResult[] = [];
    // The partial-projection scenario fails the last eligible row on purpose.
    const failIndex = scenario === "partial-projection" ? inputs.length - 1 : -1;

    inputs.forEach((input, index) => {
      const row = batch.rows.find(r => String(r.id) === String(input.rowId))!;
      const primary = input.roleMappings[0];
      const recipientDirection = primary ? maskEmailDirection(primary.email) : "—";

      if (index === failIndex) {
        row.status = "projection-failed-demonstration";
        results.push({
          rowId: row.id, rowNumber: row.rowNumber,
          status: "projection-failed-demonstration", projectionId: null, documentId: null,
          recipientDirection,
          explanation: "This row could not be projected in this demonstration scenario. Correct and retry.",
        });
        return;
      }

      const projectionId = bulkSendProjectionId(nextId("bsp"));
      const documentId = `doc_${String(projectionId)}`;

      projectedDocs.push({
        id: documentId,
        title: input.documentTitle,
        status: "draft",
        createdAt: now,
        updatedAt: now,
        participantCount: input.participantCount,
        completedParticipantCount: 0,
        participants: input.roleMappings.slice(0, 3).map(m => ({
          id: `par_${String(projectionId)}_${m.placeholderId}`,
          name: m.displayName,
          role: m.role === "carbon-copy" ? "carbon-copy"
              : m.role === "approver" ? "approver"
              : m.role === "viewer" ? "viewer" : "signer",
          status: "pending",
        })) as DocumentListItem["participants"],
        ownerName: batch.scope.senderName,
        workspaceId: batch.scope.workspaceId,
        folderIds: batch.organization.folderId ? [batch.organization.folderId] : [],
        tags: [],
        isMyAction: false,   // Bulk Send NEVER creates a My Actions assignment.
        bulkSendSource: {
          isDemonstrationProjection: true,
          batchId: String(batch.id),
          batchName: batch.name,
          rowId: String(row.id),
          templateId: String(template.id),
          templateName: template.name,
          noDeliveryPerformed: true,
        },
      });

      row.projectionId = projectionId;
      row.status = "draft-projection-created";
      results.push({
        rowId: row.id, rowNumber: row.rowNumber,
        status: "draft-projection-created", projectionId, documentId,
        recipientDirection,
        explanation: "A frontend Draft Projection was created. No request was delivered.",
      });
    });

    // Record the rows that were deliberately not projected.
    for (const row of batch.rows) {
      if (results.some(r => String(r.rowId) === String(row.id))) continue;
      const e = eligibility.find(x => String(x.rowId) === String(row.id));
      const status =
        row.excluded ? "excluded"
        : row.status === "restricted" ? "restricted"
        : row.status === "incomplete" ? "requires-correction"
        : row.status === "draft-projection-created" ? "draft-projection-created"
        : "unavailable";
      results.push({
        rowId: row.id, rowNumber: row.rowNumber,
        status: status as BulkSendProjectionResult["status"],
        projectionId: row.projectionId, documentId: null,
        recipientDirection: "—",
        explanation: e?.explanation ?? "This row did not create a Draft Projection.",
      });
    }

    // Hand the Drafts to the canonical Documents store.
    mockDocumentService.addDraftProjections(projectedDocs);

    const created = results.filter(r => r.status === "draft-projection-created" && r.documentId).length;
    const summary: BulkSendBatchResultSummary = {
      totalRows: batch.rows.length,
      draftProjectionsCreated: created,
      warningRows: batch.validation.warning,
      excludedRows: batch.validation.excluded,
      restrictedRows: batch.validation.restricted,
      failedProjections: results.filter(r => r.status === "projection-failed-demonstration").length,
      results: results.sort((a, b) => a.rowNumber - b.rowNumber),
      createdAtDemonstration: now,
    };

    batch.results = summary;
    batch.status = summary.failedProjections > 0 || summary.excludedRows > 0 || summary.restrictedRows > 0
      ? "partially-projected" : "draft-projections-created";
    batch.updatedAtDemonstration = now;

    log(batch, "draft-projections-created", "Draft Projections created",
      `${created} frontend Draft Projections were created. No request, invitation, email, SMS message, reminder, or recipient session was created or delivered.`);

    return ok(deepCopy(summary));
  }

  // ── Saved configurations ────────────────────────────────────────────────────

  async listSavedConfigurations(ctx: BulkSendContext): Promise<ServiceResult<BulkSendSavedConfiguration[]>> {
    const g = guard(ctx, false); if (g) return g;
    await delay(140);
    return ok(deepCopy(configurations));
  }

  async getSavedConfiguration(id: string, ctx: BulkSendContext): Promise<ServiceResult<BulkSendSavedConfiguration>> {
    const g = guard(ctx, false); if (g) return g;
    if (!isSafeBulkSendId(id)) return fail("INVALID_ID");
    await delay(120);
    const config = configurations.find(c => String(c.id) === id);
    if (!config) return fail("NOT_FOUND");
    if (config.status === "restricted") return fail("PERMISSION_DENIED");
    return ok(deepCopy(config));
  }

  async createSavedConfiguration(
    batchId: string, name: string, ctx: BulkSendContext,
  ): Promise<ServiceResult<BulkSendSavedConfiguration>> {
    const g = guard(ctx, true); if (g) return g;
    const batch = find(batchId);
    if (!batch || !batch.templateId) return fail("NOT_FOUND");
    const clean = normalizeBulkSendText(name, BULK_SEND_CONFIG_NAME_MAX);
    if (!clean) return fail("REQUIRED_FIELD", "name");
    await delay(180);

    const now = new Date().toISOString();
    const config: BulkSendSavedConfiguration = {
      id: bulkSendConfigId(nextId("bsc")),
      name: clean, status: "active",
      templateId: batch.templateId, templateName: batch.templateName ?? "",
      teamId: batch.scope.teamId, teamName: batch.scope.teamName,
      // Mapping RULES only. Recipient rows and cell values are never saved.
      roleMappings: deepCopy(batch.roleMappings),
      variableMappings: deepCopy(batch.variableMappings).map(m => ({ ...m, constantValue: m.constantValue })),
      defaults: deepCopy(batch.defaults),
      organization: deepCopy(batch.organization),
      policyId: batch.policy.policyId, ruleId: batch.automation.ruleId,
      staleReferences: [],
      createdAtDemonstration: now, updatedAtDemonstration: now,
      demonstrationOnly: true,
    };
    configurations.unshift(config);
    return ok(deepCopy(config));
  }

  async renameSavedConfiguration(id: string, name: string, ctx: BulkSendContext): Promise<ServiceResult<true>> {
    const g = guard(ctx, true); if (g) return g;
    const config = configurations.find(c => String(c.id) === id);
    if (!config) return fail("NOT_FOUND");
    const clean = normalizeBulkSendText(name, BULK_SEND_CONFIG_NAME_MAX);
    if (!clean) return fail("REQUIRED_FIELD", "name");
    await delay(110);
    config.name = clean;
    config.updatedAtDemonstration = new Date().toISOString();
    return ok(true);
  }

  async duplicateSavedConfiguration(id: string, ctx: BulkSendContext): Promise<ServiceResult<BulkSendSavedConfiguration>> {
    const g = guard(ctx, true); if (g) return g;
    const source = configurations.find(c => String(c.id) === id);
    if (!source) return fail("NOT_FOUND");
    await delay(140);
    const copy: BulkSendSavedConfiguration = {
      ...deepCopy(source),
      id: bulkSendConfigId(nextId("bsc")),
      name: normalizeBulkSendText(`${source.name} Copy`, BULK_SEND_CONFIG_NAME_MAX),
      status: "active", staleReferences: [],
      createdAtDemonstration: new Date().toISOString(),
      updatedAtDemonstration: new Date().toISOString(),
    };
    configurations.unshift(copy);
    return ok(deepCopy(copy));
  }

  async archiveSavedConfiguration(id: string, ctx: BulkSendContext): Promise<ServiceResult<true>> {
    const g = guard(ctx, true); if (g) return g;
    const config = configurations.find(c => String(c.id) === id);
    if (!config) return fail("NOT_FOUND");
    await delay(110);
    config.status = "archived";
    return ok(true);
  }

  async restoreSavedConfiguration(id: string, ctx: BulkSendContext): Promise<ServiceResult<true>> {
    const g = guard(ctx, true); if (g) return g;
    const config = configurations.find(c => String(c.id) === id);
    if (!config) return fail("NOT_FOUND");
    await delay(110);
    config.status = config.staleReferences.length > 0 ? "stale" : "active";
    return ok(true);
  }

  async removeSavedConfigurationDemonstration(id: string, ctx: BulkSendContext): Promise<ServiceResult<true>> {
    const g = guard(ctx, true); if (g) return g;
    const index = configurations.findIndex(c => String(c.id) === id);
    if (index === -1) return fail("NOT_FOUND");
    await delay(120);
    configurations.splice(index, 1);
    return ok(true);
  }

  /** Applies a saved configuration's RULES to a batch, then revalidates everything. */
  async applySavedConfiguration(batchId: string, configId: string, ctx: BulkSendContext): Promise<ServiceResult<BulkSendBatch>> {
    const g = guard(ctx, true); if (g) return g;
    const batch = find(batchId);
    const config = configurations.find(c => String(c.id) === configId);
    if (!batch || !config) return fail("NOT_FOUND");
    if (config.status === "restricted") return fail("PERMISSION_DENIED");
    await delay(200);

    const template = getTemplateById(config.templateId);
    if (!template || template.status === "archived") return fail("RESOURCE_UNAVAILABLE");

    batch.templateId = config.templateId;
    batch.templateName = config.templateName;
    batch.roleMappings = deepCopy(config.roleMappings);
    batch.variableMappings = deepCopy(config.variableMappings);
    batch.defaults = deepCopy(config.defaults) ?? buildDefaults(template);
    batch.organization = deepCopy(config.organization);
    batch.appliedConfigurationId = config.id;

    // Rebind against THIS batch's columns — a saved configuration never assumes
    // the new source has the same column IDs.
    if (batch.schema) {
      batch.roleMappings = suggestRoleMappings(buildRoleMappings(template), batch.schema.columns);
      batch.variableMappings = suggestVariableMappings(buildVariableMappings(template), batch.schema.columns);
    }

    refresh(batch, ctx);
    log(batch, "configuration-applied", "Saved configuration applied",
      `"${config.name}" was applied and all references were revalidated.`);
    return ok(deepCopy(batch));
  }

  // ── Activity ────────────────────────────────────────────────────────────────

  async listBatchActivity(batchId: string, ctx: BulkSendContext): Promise<ServiceResult<BulkSendActivityRecord[]>> {
    const g = guard(ctx, false); if (g) return g;
    await delay(90);
    return ok(activity.filter(a => String(a.batchId) === batchId).slice(0, 30));
  }

  /**
   * Synchronous, workspace-scoped, validated snapshot for platform surfaces
   * (Gap Closure Command 5).
   *
   * Global Search providers, the Command Palette registry, the Dashboard and the
   * Reports builders all need batch state, and none of them can await — they run
   * at module scope or during render.
   *
   * WHY THIS EXISTS RATHER THAN READING FIXTURES DIRECTLY: fixtures ship with
   * `EMPTY_VALIDATION_SUMMARY` and no role mappings. Validation is computed by
   * `refresh()`, which `getBatch` calls on every read. A surface that read the
   * fixtures directly would report every batch as having zero issues and no
   * mapping — which is exactly what the first version of this integration did.
   * Validation stays owned by this service; callers get the result, never their
   * own copy of the rules.
   *
   * Returns live batches. The caller is responsible for narrowing them to a safe
   * shape before anything reaches a search index, a report row, or a URL —
   * `preparation-platform-projection.ts` is that narrowing layer.
   */
  snapshotForPlatform(workspaceId: string, teamId: string | null = null): BulkSendBatch[] {
    if (scenario === "new-workspace" || scenario === "full-failure") return [];
    const ctx: BulkSendContext = {
      workspaceId, teamId,
      capabilityAvailable: true, canView: true, canEdit: false,
    } as BulkSendContext;
    const scoped = batches.filter(b => {
      if (b.scope.workspaceId !== workspaceId) return false;
      if (teamId && b.scope.teamId && b.scope.teamId !== teamId) return false;
      return true;
    });
    // Refresh a COPY, never the live store. `refresh()` stamps
    // `updatedAtDemonstration` with the current time, and this is a read path
    // called during render — refreshing in place would reset every batch's "last
    // updated" to now on every Dashboard paint.
    const snapshot = deepCopy(scoped);
    for (let i = 0; i < snapshot.length; i++) {
      const b = snapshot[i]!;
      refresh(b, ctx);
      // Reading a batch is not editing it. Restore the real last-updated time so
      // surfaces report when the work actually changed.
      b.updatedAtDemonstration = scoped[i]!.updatedAtDemonstration;
    }
    return snapshot;
  }

  // ── Lifecycle ───────────────────────────────────────────────────────────────

  /** Workspace switch: drop every batch and configuration scoped to the prior Workspace. */
  clearWorkspaceScopedBulkSend(nextWorkspaceId: string): void {
    batches = batches.filter(b => b.scope.workspaceId === nextWorkspaceId);
    activity = activity.filter(a => batches.some(b => b.id === a.batchId));
    // Holds Contact IDs from the previous workspace.
    _contactStatusById.clear();
  }

  /** Sign-out / account change: clear ALL recipient rows, CSV data, and mappings. */
  resetBulkSendDemonstration(): void {
    batches = deepCopy(BULK_SEND_BATCH_FIXTURES);
    configurations = deepCopy(BULK_SEND_CONFIG_FIXTURES);
    activity = [];
    scenario = "standard";
    counter = 5000;
    // Contact IDs must not survive an account change.
    _contactStatusById.clear();
  }

  setScenario(next: BulkSendScenario): void { scenario = next; }
  getScenario(): BulkSendScenario { return scenario; }
}

export const bulkSendService = new MockBulkSendService();
export { readRoleField, readVariableValue, applyTitlePattern };

// Clears every batch, recipient row, parsed CSV, pasted text, mapping,
// validation result and saved configuration before the next account loads.
registerSessionCleanup({
  id: "bulk-send",
  onSignOut: () => bulkSendService.resetBulkSendDemonstration(),
  onWorkspaceSwitch: (workspaceId) => bulkSendService.clearWorkspaceScopedBulkSend(workspaceId),
});
