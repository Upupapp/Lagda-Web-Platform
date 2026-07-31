// Bulk Send — the centralized engines.
//
// Exactly one implementation of each of the five things Command 33 requires to be
// centralized. No component, cell, or page duplicates any of this logic:
//
//   1. Role-mapping registry      -> buildRoleMappings / suggestRoleMappings
//   2. Variable-mapping registry  -> buildVariableMappings / suggestVariableMappings
//   3. Row validation engine      -> validateBatch
//   4. Duplicate detector         -> detectDuplicates
//   5. Eligibility resolver       -> resolveEligibility
//   6. Draft Projection builder   -> buildProjectionInputs
//
// Pure functions. They never mutate their inputs, never touch storage, never call the
// network, and never claim anything was delivered.

import type {
  DocumentTemplate,
  TemplateRoleMapping,
  TemplateVariableValues,
} from "../models/templates";
import type {
  BulkSendBatch,
  BulkSendBatchValidationSummary,
  BulkSendDuplicateGroup,
  BulkSendEligibility,
  BulkSendEligibilitySummary,
  BulkSendRecipientRow,
  BulkSendRecipientRowId,
  BulkSendRecipientRowStatus,
  BulkSendRoleField,
  BulkSendRoleMapping,
  BulkSendRowValidationIssue,
  BulkSendSourceColumn,
  BulkSendSourceColumnId,
  BulkSendVariableMapping,
  BulkSendMappingConfidence,
} from "../models/bulk-send";
import {
  BULK_SEND_MAX_ROWS,
  BULK_SEND_REQUIRED_ROLE_FIELDS,
  BULK_SEND_ROLE_FIELD_ALIASES,
  BULK_SEND_ROLE_FIELD_LABELS,
  BULK_SEND_VARIABLE_ALIASES,
  BULK_SEND_CELL_MAX,
  normalizeHeader,
} from "../models/bulk-send";
import { isValidEmailDirection, normalizeEmailForComparison } from "../utils/tabular-import";

// ═══════════════════════════════════════════════════════════════════════════════
// 1 + 2. MAPPING REGISTRIES
// ═══════════════════════════════════════════════════════════════════════════════

let mappingCounter = 0;
function nextMappingId(prefix: string): string {
  mappingCounter += 1;
  return `${prefix}_${mappingCounter}`;
}

/**
 * Builds one role mapping per Template placeholder. The placeholder set is
 * authoritative — Bulk Send can never invent, merge, or drop a participant role.
 */
export function buildRoleMappings(template: DocumentTemplate): BulkSendRoleMapping[] {
  return template.placeholders.map(p => ({
    id: nextMappingId("brm") as BulkSendRoleMapping["id"],
    placeholderId: p.id,
    placeholderLabel: p.label,
    role: p.role,
    required: p.required || p.mustMapToParticipant,
    columnByField: { displayName: null, email: null, organization: null },
    authMethod: p.defaultAuthMethod,
    confidence: { displayName: null, email: null, organization: null },
  }));
}

/** Builds one variable mapping per approved Template variable. */
export function buildVariableMappings(template: DocumentTemplate): BulkSendVariableMapping[] {
  return template.variables.map(v => ({
    id: nextMappingId("bvm") as BulkSendVariableMapping["id"],
    variableId: v.id,
    internalKey: v.internalKey,
    label: v.label,
    type: v.type,
    required: v.required,
    columnId: null,
    constantValue: null,
    confidence: null,
  }));
}

function matchColumn(
  columns: BulkSendSourceColumn[],
  aliases: readonly string[],
  used: Set<string>,
): { column: BulkSendSourceColumn; confidence: BulkSendMappingConfidence } | null {
  // Exact normalized header match first.
  for (const c of columns) {
    if (used.has(String(c.id))) continue;
    if (aliases[0] && c.normalizedHeader === aliases[0]) {
      return { column: c, confidence: "exact-header-match" };
    }
  }
  // Then any known alias.
  for (const c of columns) {
    if (used.has(String(c.id))) continue;
    if (aliases.includes(c.normalizedHeader)) {
      return { column: c, confidence: "known-alias" };
    }
  }
  // Then a contains-match, which always requires review.
  for (const c of columns) {
    if (used.has(String(c.id))) continue;
    if (aliases.some(a => a.length > 3 && c.normalizedHeader.includes(a))) {
      return { column: c, confidence: "requires-review" };
    }
  }
  return null;
}

/**
 * Deterministic header-alias suggestion. This is a lookup table, NOT AI mapping,
 * and must never be described as intelligent or automatic.
 *
 * Only the FIRST placeholder receives suggestions when several share a role — a
 * multi-participant template always requires explicit review.
 */
export function suggestRoleMappings(
  mappings: BulkSendRoleMapping[],
  columns: BulkSendSourceColumn[],
): BulkSendRoleMapping[] {
  const used = new Set<string>();
  const seenRole = new Set<string>();

  return mappings.map(m => {
    // Second and later placeholders of the same role are never auto-suggested.
    if (seenRole.has(m.role)) return m;
    seenRole.add(m.role);

    const columnByField = { ...m.columnByField };
    const confidence = { ...m.confidence };

    (Object.keys(BULK_SEND_ROLE_FIELD_ALIASES) as BulkSendRoleField[]).forEach(field => {
      if (columnByField[field]) return;
      const hit = matchColumn(columns, BULK_SEND_ROLE_FIELD_ALIASES[field], used);
      if (hit) {
        columnByField[field] = hit.column.id;
        confidence[field] = hit.confidence;
        used.add(String(hit.column.id));
      }
    });

    return { ...m, columnByField, confidence };
  });
}

export function suggestVariableMappings(
  mappings: BulkSendVariableMapping[],
  columns: BulkSendSourceColumn[],
  usedColumnIds: BulkSendSourceColumnId[] = [],
): BulkSendVariableMapping[] {
  const used = new Set<string>(usedColumnIds.map(String));

  return mappings.map(m => {
    if (m.columnId || m.constantValue) return m;

    const key = normalizeHeader(m.internalKey);
    const aliases = BULK_SEND_VARIABLE_ALIASES[m.internalKey] ?? [key];

    // Exact internalKey / label match wins.
    const exact = columns.find(c => !used.has(String(c.id))
      && (c.normalizedHeader === key || c.normalizedHeader === normalizeHeader(m.label)));
    if (exact) {
      used.add(String(exact.id));
      return { ...m, columnId: exact.id, confidence: "exact-header-match" as const };
    }

    const hit = matchColumn(columns, aliases, used);
    if (hit) {
      used.add(String(hit.column.id));
      return { ...m, columnId: hit.column.id, confidence: hit.confidence };
    }
    return m;
  });
}

// ── Reading a mapped value out of a row ───────────────────────────────────────

export function readRoleField(
  row: BulkSendRecipientRow,
  mapping: BulkSendRoleMapping,
  field: BulkSendRoleField,
): string {
  const columnId = mapping.columnByField[field];
  if (!columnId) return "";
  return (row.values[String(columnId)] ?? "").trim();
}

export function readVariableValue(
  row: BulkSendRecipientRow,
  mapping: BulkSendVariableMapping,
): string {
  if (mapping.columnId) return (row.values[String(mapping.columnId)] ?? "").trim();
  return (mapping.constantValue ?? "").trim();
}

/** Type compatibility for a mapped variable value. Shape checks only. */
export function variableValueTypeValid(mapping: BulkSendVariableMapping, value: string): boolean {
  if (value.length === 0) return true; // emptiness is a required-check concern, not a type concern
  switch (mapping.type) {
    case "number":  return /^-?\d+(\.\d+)?$/.test(value);
    case "date":    return !Number.isNaN(Date.parse(value));
    case "yes-no":  return ["yes", "no", "true", "false", "y", "n"].includes(value.toLowerCase());
    case "select":  return true; // option membership is validated against the Template elsewhere
    default:        return true;
  }
}

// ═══════════════════════════════════════════════════════════════════════════════
// 4. DUPLICATE DETECTOR
// ═══════════════════════════════════════════════════════════════════════════════

/**
 * Deterministic duplicate grouping.
 *
 * Matching display names alone NEVER force duplicate status — two different people
 * genuinely can share a name. Email matching is always qualified by the role it
 * appears in, and a Contact match never implies an authenticated user identity.
 */
export function detectDuplicates(
  rows: BulkSendRecipientRow[],
  roleMappings: BulkSendRoleMapping[],
): BulkSendDuplicateGroup[] {
  const groups: BulkSendDuplicateGroup[] = [];
  const active = rows.filter(r => !r.excluded);

  // (a) Identical rows across every mapped column.
  const identical = new Map<string, BulkSendRecipientRowId[]>();
  for (const row of active) {
    const key = Object.keys(row.values).sort()
      .map(k => `${k}=${(row.values[k] ?? "").trim().toLowerCase()}`).join("|");
    if (!key) continue;
    identical.set(key, [...(identical.get(key) ?? []), row.id]);
  }
  for (const [key, rowIds] of identical) {
    if (rowIds.length > 1) {
      groups.push({
        key: `identical:${key.slice(0, 40)}`,
        type: "identical-row",
        rowIds,
        explanation: `${rowIds.length} rows have identical values in every mapped column.`,
      });
    }
  }

  // (b) The same Contact used more than once.
  const byContact = new Map<string, BulkSendRecipientRowId[]>();
  for (const row of active) {
    if (!row.contactId) continue;
    byContact.set(row.contactId, [...(byContact.get(row.contactId) ?? []), row.id]);
  }
  for (const [contactId, rowIds] of byContact) {
    if (rowIds.length > 1) {
      groups.push({
        key: `contact:${contactId}`,
        type: "repeated-contact",
        rowIds,
        explanation: `The same Contact appears in ${rowIds.length} rows.`,
      });
    }
  }

  // (c) Same email direction repeated within one role.
  for (const mapping of roleMappings) {
    const emailColumn = mapping.columnByField.email;
    if (!emailColumn) continue;
    const byEmail = new Map<string, BulkSendRecipientRowId[]>();
    for (const row of active) {
      const email = normalizeEmailForComparison(row.values[String(emailColumn)] ?? "");
      if (!email) continue;
      byEmail.set(email, [...(byEmail.get(email) ?? []), row.id]);
    }
    for (const [email, rowIds] of byEmail) {
      if (rowIds.length > 1) {
        groups.push({
          key: `role:${mapping.placeholderId}:${email}`,
          type: "repeated-email-in-role",
          rowIds,
          explanation: `The same email direction is used ${rowIds.length} times for "${mapping.placeholderLabel}".`,
        });
      }
    }
  }

  // (d) One person assigned to incompatible roles within the SAME row.
  for (const row of active) {
    const emailToRoles = new Map<string, string[]>();
    for (const mapping of roleMappings) {
      const col = mapping.columnByField.email;
      if (!col) continue;
      const email = normalizeEmailForComparison(row.values[String(col)] ?? "");
      if (!email) continue;
      emailToRoles.set(email, [...(emailToRoles.get(email) ?? []), mapping.placeholderLabel]);
    }
    for (const [email, roles] of emailToRoles) {
      if (roles.length > 1) {
        groups.push({
          key: `same-row:${row.id}:${email}`,
          type: "participant-in-incompatible-roles",
          rowIds: [row.id],
          explanation: `In row ${row.rowNumber}, the same person is assigned to ${roles.length} roles: ${roles.join(", ")}.`,
        });
      }
    }
  }

  return groups;
}

// ═══════════════════════════════════════════════════════════════════════════════
// 3. VALIDATION ENGINE
// ═══════════════════════════════════════════════════════════════════════════════

function issue(
  code: BulkSendRowValidationIssue["code"],
  severity: BulkSendRowValidationIssue["severity"],
  message: string,
  extra: Partial<BulkSendRowValidationIssue> = {},
): BulkSendRowValidationIssue {
  return {
    code, severity, message,
    target: extra.target ?? null,
    columnId: extra.columnId ?? null,
    rowId: extra.rowId ?? null,
    suggestedCorrection: extra.suggestedCorrection ?? null,
    bulkCorrectionAvailable: extra.bulkCorrectionAvailable ?? false,
    mayRemainExcluded: extra.mayRemainExcluded ?? true,
  };
}

export interface ValidationContext {
  template:      DocumentTemplate | null;
  templateArchived: boolean;
  templateRestricted: boolean;
  senderRestricted:  boolean;
  teamRestricted:    boolean;
  featureUnavailable: boolean;
  /** Contact IDs that are archived or outside the current Workspace. */
  archivedContactIds:    ReadonlySet<string>;
  restrictedContactIds:  ReadonlySet<string>;
  folderArchived:  boolean;
  archivedTagCount: number;
  policyStale:     boolean;
  automationConflicts: string[];
}

/**
 * THE validation engine. Produces batch-level blocking issues, per-row issues,
 * and the row status each row should carry. Never mutates the batch.
 */
export function validateBatch(
  batch: BulkSendBatch,
  ctx: ValidationContext,
): { summary: BulkSendBatchValidationSummary; rowStatuses: Record<string, BulkSendRecipientRowStatus> } {
  const blocking: BulkSendRowValidationIssue[] = [];
  const nonblocking: BulkSendRowValidationIssue[] = [];
  const issuesByRow: Record<string, BulkSendRowValidationIssue[]> = {};
  const rowStatuses: Record<string, BulkSendRecipientRowStatus> = {};

  // ── Batch-level ─────────────────────────────────────────────────────────────
  if (!batch.name.trim()) {
    blocking.push(issue("batch-name-required", "blocking", "This batch needs a name."));
  }
  if (!batch.templateId || !ctx.template) {
    blocking.push(issue("batch-template-required", "blocking", "Choose an approved Template for this batch."));
  }
  if (ctx.templateArchived) {
    blocking.push(issue("batch-template-archived", "blocking", "The selected Template is archived and cannot be used."));
  }
  if (ctx.templateRestricted) {
    blocking.push(issue("batch-template-restricted", "blocking", "You do not have access to the selected Template."));
  }
  if (ctx.senderRestricted) {
    blocking.push(issue("batch-sender-restricted", "blocking", "The selected sender is not available to you."));
  }
  if (ctx.teamRestricted) {
    blocking.push(issue("batch-team-restricted", "blocking", "The selected Team scope is not available to you."));
  }
  if (ctx.featureUnavailable) {
    blocking.push(issue("batch-feature-unavailable", "blocking", "A required feature is not available in this Workspace."));
  }
  if (batch.rows.length === 0) {
    blocking.push(issue("batch-no-recipients", "blocking", "Add at least one recipient row."));
  }
  if (batch.rows.length > BULK_SEND_MAX_ROWS) {
    blocking.push(issue("batch-too-many-rows", "blocking",
      `This frontend demonstration supports up to ${BULK_SEND_MAX_ROWS} rows.`));
  }

  // ── Mapping-level ───────────────────────────────────────────────────────────
  const columnUsage = new Map<string, string[]>();

  for (const mapping of batch.roleMappings) {
    const anyMapped = Object.values(mapping.columnByField).some(Boolean);

    if (mapping.required && !anyMapped) {
      blocking.push(issue("mapping-required-role-unmapped", "blocking",
        `"${mapping.placeholderLabel}" is a required role but no column is mapped to it.`,
        { target: mapping.placeholderLabel, bulkCorrectionAvailable: false, mayRemainExcluded: false }));
    }

    if (anyMapped) {
      for (const field of BULK_SEND_REQUIRED_ROLE_FIELDS) {
        if (!mapping.columnByField[field]) {
          blocking.push(issue("mapping-required-role-field-unmapped", "blocking",
            `"${mapping.placeholderLabel}" needs a column mapped to ${BULK_SEND_ROLE_FIELD_LABELS[field].toLowerCase()}.`,
            { target: mapping.placeholderLabel, mayRemainExcluded: false }));
        }
      }
    }

    for (const [field, columnId] of Object.entries(mapping.columnByField)) {
      if (!columnId) continue;
      const key = String(columnId);
      columnUsage.set(key, [...(columnUsage.get(key) ?? []), `${mapping.placeholderLabel} · ${field}`]);
    }
  }

  for (const mapping of batch.variableMappings) {
    if (mapping.required && !mapping.columnId && !mapping.constantValue) {
      blocking.push(issue("mapping-required-variable-unmapped", "blocking",
        `The required Template variable "${mapping.label}" is not mapped and has no constant value.`,
        { target: mapping.label, mayRemainExcluded: false }));
    }
    if (mapping.columnId) {
      const key = String(mapping.columnId);
      columnUsage.set(key, [...(columnUsage.get(key) ?? []), `Variable · ${mapping.label}`]);
    }
    // A variable the Template no longer defines.
    if (ctx.template && !ctx.template.variables.some(v => v.internalKey === mapping.internalKey)) {
      blocking.push(issue("mapping-unknown-variable", "blocking",
        `"${mapping.label}" is no longer defined on this Template.`, { target: mapping.label }));
    }
  }

  // One column feeding conflicting targets is an advisory, not a hard block:
  // reusing an organization column across two roles is legitimate.
  for (const [columnId, targets] of columnUsage) {
    if (targets.length > 1) {
      nonblocking.push(issue("mapping-column-conflict", "advisory",
        `One column is mapped to ${targets.length} targets: ${targets.join(", ")}. Confirm this is intended.`,
        { columnId: columnId as BulkSendSourceColumnId }));
    }
  }

  // ── Reference-level ─────────────────────────────────────────────────────────
  if (ctx.folderArchived) {
    nonblocking.push(issue("reference-folder-archived", "warning",
      "The selected Folder is archived. Projected Drafts will not be filed into it."));
  }
  if (ctx.archivedTagCount > 0) {
    nonblocking.push(issue("reference-tag-archived", "warning",
      `${ctx.archivedTagCount} selected ${ctx.archivedTagCount === 1 ? "Tag is" : "Tags are"} archived and will not be applied.`));
  }
  if (ctx.policyStale) {
    nonblocking.push(issue("reference-policy-stale", "warning",
      "The referenced Workflow Policy is paused or unavailable. Its defaults are not applied."));
  }
  for (const conflict of ctx.automationConflicts) {
    nonblocking.push(issue("reference-automation-conflict", "warning", conflict));
  }

  // ── Row-level ───────────────────────────────────────────────────────────────
  const duplicates = detectDuplicates(batch.rows, batch.roleMappings);
  const duplicateRowIds = new Set<string>();
  for (const g of duplicates) for (const id of g.rowIds) duplicateRowIds.add(String(id));

  const mappingIsInvalid = blocking.some(b => b.code.startsWith("mapping-"));

  for (const row of batch.rows) {
    const rowIssues: BulkSendRowValidationIssue[] = [];
    const rid = String(row.id);

    if (row.excluded) {
      rowStatuses[rid] = "excluded";
      issuesByRow[rid] = [];
      continue;
    }
    if (row.projectionId) {
      rowStatuses[rid] = "draft-projection-created";
      issuesByRow[rid] = [];
      continue;
    }

    // Restricted contacts.
    if (row.contactId && ctx.restrictedContactIds.has(row.contactId)) {
      rowIssues.push(issue("row-contact-restricted", "blocking",
        "This Contact is not available in the current Workspace or Team scope.",
        { rowId: row.id, mayRemainExcluded: true }));
      rowStatuses[rid] = "restricted";
      issuesByRow[rid] = rowIssues;
      continue;
    }
    if (row.contactId && ctx.archivedContactIds.has(row.contactId)) {
      rowIssues.push(issue("row-contact-archived", "warning",
        "This Contact is archived. Confirm before including the row.",
        { rowId: row.id, bulkCorrectionAvailable: true }));
    }

    // Per-role required values.
    for (const mapping of batch.roleMappings) {
      const anyMapped = Object.values(mapping.columnByField).some(Boolean);
      if (!anyMapped) continue;

      const name = readRoleField(row, mapping, "displayName");
      const email = readRoleField(row, mapping, "email");

      if (!name) {
        rowIssues.push(issue("row-missing-name", "blocking",
          `${mapping.placeholderLabel}: a recipient display name is required.`,
          { rowId: row.id, target: mapping.placeholderLabel, columnId: mapping.columnByField.displayName,
            suggestedCorrection: "Add a name in the recipient grid.", bulkCorrectionAvailable: false }));
      }
      if (!email) {
        rowIssues.push(issue("row-missing-email", "blocking",
          `${mapping.placeholderLabel}: an email direction is required.`,
          { rowId: row.id, target: mapping.placeholderLabel, columnId: mapping.columnByField.email }));
      } else if (!isValidEmailDirection(email)) {
        rowIssues.push(issue("row-invalid-email", "blocking",
          `${mapping.placeholderLabel}: "${email}" is not a valid email direction.`,
          { rowId: row.id, target: mapping.placeholderLabel, columnId: mapping.columnByField.email,
            suggestedCorrection: "Correct the address in the recipient grid.", bulkCorrectionAvailable: true }));
      }
    }

    // Per-variable required values and types.
    for (const mapping of batch.variableMappings) {
      const value = readVariableValue(row, mapping);
      if (mapping.required && !value) {
        rowIssues.push(issue("row-missing-required-variable", "blocking",
          `The required variable "${mapping.label}" has no value.`,
          { rowId: row.id, target: mapping.label, columnId: mapping.columnId,
            bulkCorrectionAvailable: true,
            suggestedCorrection: "Map a column or apply a constant value." }));
      } else if (value && !variableValueTypeValid(mapping, value)) {
        rowIssues.push(issue("row-invalid-variable-type", "blocking",
          `"${mapping.label}" expects ${mapping.type.replace("-", " ")} but received "${value}".`,
          { rowId: row.id, target: mapping.label, columnId: mapping.columnId }));
      }
    }

    // Oversized cells.
    for (const [columnId, value] of Object.entries(row.values)) {
      if (value.length >= BULK_SEND_CELL_MAX) {
        rowIssues.push(issue("row-value-too-long", "warning",
          `A value in this row reached the ${BULK_SEND_CELL_MAX}-character limit and was shortened.`,
          { rowId: row.id, columnId: columnId as BulkSendSourceColumnId }));
      }
    }

    if (duplicateRowIds.has(rid)) {
      rowIssues.push(issue("row-duplicate", "warning",
        "This row is part of a duplicate group. Review before creating a Draft Projection.",
        { rowId: row.id, bulkCorrectionAvailable: true }));
    }

    // Resolve the row's lifecycle status from its issues.
    const hasBlocking = rowIssues.some(i => i.severity === "blocking");
    const hasWarning = rowIssues.some(i => i.severity === "warning");

    rowStatuses[rid] =
      mappingIsInvalid ? "invalid-mapping"
      : hasBlocking     ? "incomplete"
      : duplicateRowIds.has(rid) ? "duplicate"
      : hasWarning      ? "warning"
      : "ready-in-demonstration";

    issuesByRow[rid] = rowIssues;
  }

  // ── Counts ──────────────────────────────────────────────────────────────────
  const count = (s: BulkSendRecipientRowStatus) =>
    Object.values(rowStatuses).filter(v => v === s).length;

  const summary: BulkSendBatchValidationSummary = {
    totalRows:      batch.rows.length,
    ready:          count("ready-in-demonstration"),
    warning:        count("warning"),
    incomplete:     count("incomplete"),
    duplicate:      count("duplicate"),
    restricted:     count("restricted"),
    excluded:       count("excluded"),
    invalidMapping: count("invalid-mapping"),
    unavailable:    count("unavailable"),
    projected:      count("draft-projection-created"),
    blockingIssues: blocking,
    nonblockingIssues: nonblocking,
    issuesByRow,
    validatedAtDemonstration: new Date().toISOString(),
  };

  return { summary, rowStatuses };
}

// ═══════════════════════════════════════════════════════════════════════════════
// 5. ELIGIBILITY RESOLVER
// ═══════════════════════════════════════════════════════════════════════════════

/**
 * Decides, per row, whether a Draft Projection may be created.
 *
 * Frontend eligibility is NOT backend authorization. A query parameter can never
 * make a row eligible, and plan availability never grants permission.
 */
export function resolveEligibility(
  batch: BulkSendBatch,
  summary: BulkSendBatchValidationSummary,
  rowStatuses: Record<string, BulkSendRecipientRowStatus>,
  ctx: ValidationContext,
): { rows: BulkSendEligibility[]; summary: BulkSendEligibilitySummary } {
  const batchBlocked = summary.blockingIssues.length > 0;

  const rows: BulkSendEligibility[] = batch.rows.map(row => {
    const status = rowStatuses[String(row.id)] ?? "unavailable";

    if (ctx.featureUnavailable) {
      return { rowId: row.id, eligible: false, reason: "feature-unavailable",
        explanation: "A required feature is not available in this Workspace." };
    }
    if (ctx.templateRestricted) {
      return { rowId: row.id, eligible: false, reason: "restricted-template",
        explanation: "You do not have access to the selected Template." };
    }
    if (ctx.teamRestricted) {
      return { rowId: row.id, eligible: false, reason: "restricted-team",
        explanation: "The selected Team scope is not available to you." };
    }
    if (ctx.senderRestricted) {
      return { rowId: row.id, eligible: false, reason: "restricted-sender",
        explanation: "The selected sender is not available to you." };
    }

    switch (status) {
      case "excluded":
        return { rowId: row.id, eligible: false, reason: "excluded",
          explanation: row.exclusionReason ?? "This row was excluded from the batch." };
      case "restricted":
        return { rowId: row.id, eligible: false, reason: "restricted-contact",
          explanation: "This Contact is not available in the current scope." };
      case "invalid-mapping":
        return { rowId: row.id, eligible: false, reason: "invalid-mapping",
          explanation: "Resolve the mapping issues before creating Draft Projections." };
      case "incomplete":
        return { rowId: row.id, eligible: false, reason: "incomplete",
          explanation: "This row is missing required values." };
      case "draft-projection-created":
        return { rowId: row.id, eligible: false, reason: "excluded",
          explanation: "A Draft Projection already exists for this row." };
      case "duplicate":
        return { rowId: row.id, eligible: !batchBlocked, reason: "duplicate",
          explanation: "This row is part of a duplicate group. It remains eligible but should be reviewed." };
      case "warning":
        return { rowId: row.id, eligible: !batchBlocked, reason: "eligible-with-warning",
          explanation: "Eligible, with warnings to review." };
      case "ready-in-demonstration":
        return { rowId: row.id, eligible: !batchBlocked, reason: batchBlocked ? "invalid-mapping" : "eligible",
          explanation: batchBlocked ? "Resolve the batch issues first." : "Ready to create a Draft Projection." };
      default:
        return { rowId: row.id, eligible: false, reason: "unavailable",
          explanation: "This row is unavailable." };
    }
  });

  const byReason: Record<string, number> = {};
  for (const r of rows) byReason[r.reason] = (byReason[r.reason] ?? 0) + 1;

  return {
    rows,
    summary: {
      eligible:    rows.filter(r => r.eligible && r.reason === "eligible").length,
      withWarning: rows.filter(r => r.eligible && r.reason !== "eligible").length,
      ineligible:  rows.filter(r => !r.eligible).length,
      excluded:    rows.filter(r => r.reason === "excluded").length,
      restricted:  rows.filter(r => r.reason.startsWith("restricted")).length,
      byReason,
      eligibleRowIds: rows.filter(r => r.eligible).map(r => r.rowId),
    },
  };
}

// ═══════════════════════════════════════════════════════════════════════════════
// 6. DRAFT PROJECTION BUILDER
// ═══════════════════════════════════════════════════════════════════════════════

export interface BulkSendProjectionInput {
  rowId:          BulkSendRecipientRowId;
  rowNumber:      number;
  documentTitle:  string;
  /** The EXISTING single-document shape — identical to what UseTemplatePage builds. */
  roleMappings:   TemplateRoleMapping[];
  variableValues: TemplateVariableValues;
  participantCount: number;
}

/** Substitutes {{token}} placeholders in a title pattern using mapped variables. */
export function applyTitlePattern(
  pattern: string,
  variableValues: TemplateVariableValues,
  roleMappings: TemplateRoleMapping[],
  fallbackTitle: string,
): string {
  if (!pattern.trim()) return fallbackTitle;
  const primary = roleMappings[0];
  const out = pattern.replace(/\{\{\s*([a-zA-Z0-9_]+)\s*\}\}/g, (_m, key: string) => {
    if (key === "recipient_name" && primary) return primary.displayName;
    if (key === "organization" && primary) return primary.organization ?? "";
    const v = variableValues[key];
    if (v === null || v === undefined) return "";
    return String(v);
  }).replace(/\s+/g, " ").trim();
  return out || fallbackTitle;
}

/**
 * Turns eligible rows into projection inputs. Produces DATA ONLY — it creates
 * nothing, sends nothing, and grants nothing. The caller decides what to do with it.
 */
export function buildProjectionInputs(
  batch: BulkSendBatch,
  eligibleRowIds: BulkSendRecipientRowId[],
  template: DocumentTemplate,
  titlePattern: string,
): BulkSendProjectionInput[] {
  const eligible = new Set(eligibleRowIds.map(String));

  return batch.rows
    .filter(r => eligible.has(String(r.id)))
    .map(row => {
      // Reuse the EXISTING TemplateRoleMapping shape, one entry per mapped placeholder.
      const roleMappings: TemplateRoleMapping[] = batch.roleMappings
        .filter(m => Object.values(m.columnByField).some(Boolean))
        .map(m => ({
          placeholderId:    m.placeholderId,
          placeholderLabel: m.placeholderLabel,
          role:             m.role,
          required:         m.required,
          displayName:      readRoleField(row, m, "displayName"),
          email:            readRoleField(row, m, "email"),
          organization:     readRoleField(row, m, "organization") || undefined,
          authMethod:       m.authMethod,
        }));

      const variableValues: TemplateVariableValues = {};
      for (const m of batch.variableMappings) {
        const value = readVariableValue(row, m);
        if (value) variableValues[m.internalKey] = value;
      }

      const fallback = `${template.name} — Row ${row.rowNumber}`;
      return {
        rowId: row.id,
        rowNumber: row.rowNumber,
        documentTitle: applyTitlePattern(titlePattern, variableValues, roleMappings, fallback),
        roleMappings,
        variableValues,
        participantCount: roleMappings.length,
      };
    });
}
