// Pure in-memory template service for /app/templates/* demonstration.
// No backend calls. No real storage. No real sharing. demonstrationOnly: true throughout.
// All mutations apply to the in-memory session copy only — resets on page reload.

import type {
  DocumentTemplate,
  DocumentTemplateId,
  TemplateListItem,
  TemplateListQuery,
  TemplateView,
  TemplateSortField,
  TemplateAction,
  TemplateActionAvailability,
  TemplateValidationResult,
  TemplateInstantiationResult,
  TemplateRoleMapping,
  TemplateVariableValues,
} from "../../models/templates";
import { getMockTemplate, getAllMockTemplates } from "../../data/mock/templates";

// ── Session-local mutation store ──────────────────────────────────────────────
// Stores overwritten templates (status changes, edits, duplicates) for this session.

const SESSION_MUTATIONS = new Map<string, DocumentTemplate>();

function getTemplate(id: DocumentTemplateId): DocumentTemplate | null {
  return SESSION_MUTATIONS.get(id) ?? getMockTemplate(id);
}

function getAllTemplates(): DocumentTemplate[] {
  const base   = getAllMockTemplates();
  const added  = Array.from(SESSION_MUTATIONS.values()).filter(t => !base.some(b => b.id === t.id));
  return [
    ...base.map(t => SESSION_MUTATIONS.get(t.id) ?? t),
    ...added,
  ];
}

// ── List item projection ──────────────────────────────────────────────────────

function toListItem(t: DocumentTemplate): TemplateListItem {
  return {
    id:               t.id,
    name:             t.name,
    category:         t.category,
    status:           t.status,
    scope:            t.scope,
    ownerLabel:       t.ownerLabel,
    placeholderCount: t.placeholders.length,
    routingMode:      t.routing.mode,
    documentCount:    t.documents.length,
    fieldCount:       t.fields.length,
    variableCount:    t.variables.length,
    lastUsedDate:     t.usageSummary.lastUsedDate,
    updatedAt:        t.updatedAt,
    usageCount:       t.usageSummary.timesUsed,
    hasErrors:        (t.validation?.errors?.length ?? 0) > 0,
    hasWarnings:      (t.validation?.warnings?.length ?? 0) > 0,
  };
}

// ── List filtering + sorting ──────────────────────────────────────────────────

function applyView(templates: DocumentTemplate[], view: TemplateView): DocumentTemplate[] {
  switch (view) {
    case "workspace": return templates.filter(t => t.scope === "workspace");
    case "personal":  return templates.filter(t => t.scope === "personal");
    case "drafts":    return templates.filter(t => t.status === "draft");
    case "available": return templates.filter(t => t.status === "available");
    case "archived":  return templates.filter(t => t.status === "archived");
    case "recent":    return templates
        .filter(t => t.usageSummary.lastUsedDate)
        .sort((a, b) => (b.usageSummary.lastUsedDate ?? "").localeCompare(a.usageSummary.lastUsedDate ?? ""));
    default:          return templates;
  }
}

function applySearch(templates: DocumentTemplate[], q: string): DocumentTemplate[] {
  if (!q.trim()) return templates;
  const lower = q.toLowerCase();
  return templates.filter(t =>
    t.name.toLowerCase().includes(lower) ||
    t.description.toLowerCase().includes(lower) ||
    t.tags.some(tag => tag.toLowerCase().includes(lower))
  );
}

function applySort(templates: TemplateListItem[], sort: TemplateSortField, dir: "asc" | "desc"): TemplateListItem[] {
  const mul = dir === "asc" ? 1 : -1;
  return [...templates].sort((a, b) => {
    switch (sort) {
      case "name":       return mul * a.name.localeCompare(b.name);
      case "category":   return mul * a.category.localeCompare(b.category);
      case "status":     return mul * a.status.localeCompare(b.status);
      case "usageCount": return mul * (a.usageCount - b.usageCount);
      case "lastUsed":   return mul * ((a.lastUsedDate ?? "").localeCompare(b.lastUsedDate ?? ""));
      case "updatedAt":
      default:           return mul * a.updatedAt.localeCompare(b.updatedAt);
    }
  });
}

// ── Public API ────────────────────────────────────────────────────────────────

export interface TemplateListResult {
  items:     TemplateListItem[];
  total:     number;
  page:      number;
  pageSize:  number;
  pageCount: number;
  demonstrationOnly: true;
}

const PAGE_SIZE = 20;

export function listTemplates(query: TemplateListQuery): TemplateListResult {
  let ts = getAllTemplates();

  // View filter (note: "all" shows everything including archived)
  if (query.view !== "all") ts = applyView(ts, query.view);

  // Facet filters
  if (query.status)   ts = ts.filter(t => t.status   === query.status);
  if (query.scope)    ts = ts.filter(t => t.scope    === query.scope);
  if (query.category) ts = ts.filter(t => t.category === query.category);
  if (query.role)     ts = ts.filter(t => t.placeholders.some(p => p.role === query.role));
  if (query.routing)  ts = ts.filter(t => t.routing.mode === query.routing);

  // Search
  if (query.q) ts = applySearch(ts, query.q);

  // Project to list items
  let items = ts.map(toListItem);

  // Sort
  items = applySort(items, query.sort, query.direction);

  // Paginate
  const total     = items.length;
  const pageCount = Math.max(1, Math.ceil(total / PAGE_SIZE));
  const page      = Math.min(Math.max(1, query.page), pageCount);
  const sliced    = items.slice((page - 1) * PAGE_SIZE, page * PAGE_SIZE);

  return { items: sliced, total, page, pageSize: PAGE_SIZE, pageCount, demonstrationOnly: true };
}

export function getTemplateById(id: DocumentTemplateId): DocumentTemplate | null {
  return getTemplate(id);
}

// ── Action availability ────────────────────────────────────────────────────────

export function getTemplateActionAvailability(template: DocumentTemplate): TemplateActionAvailability[] {
  const s = template.status;
  return [
    { action: "view",           available: true },
    { action: "use",            available: s === "available",
      reason: s !== "available" ? `Template must be Available to use (currently ${s}).` : undefined },
    { action: "edit",           available: s !== "archived" },
    { action: "edit-fields",    available: s !== "archived" },
    { action: "preview",        available: true },
    { action: "duplicate",      available: true },
    { action: "make-available", available: s === "draft",
      reason: s !== "draft" ? `Only Draft templates can be made Available.` : undefined },
    { action: "return-to-draft",available: s === "available",
      reason: s !== "available" ? `Only Available templates can be returned to Draft.` : undefined },
    { action: "archive",        available: s !== "archived",
      reason: s === "archived" ? "Template is already archived." : undefined },
    { action: "restore",        available: s === "archived",
      reason: s !== "archived" ? "Template is not archived." : undefined },
  ] satisfies TemplateActionAvailability[];
}

// ── Validation ────────────────────────────────────────────────────────────────

export function validateTemplate(template: DocumentTemplate): TemplateValidationResult {
  if (template.validation) return template.validation;

  const errors:   DocumentTemplate["validation"] extends undefined ? never : NonNullable<DocumentTemplate["validation"]>["errors"] = [];
  const warnings: NonNullable<DocumentTemplate["validation"]>["warnings"] = [];

  if (!template.name.trim())                               errors.push({ id: "v-name",  severity: "error",   message: "Template name is required.",               area: "details" });
  if (template.documents.length === 0)                     errors.push({ id: "v-docs",  severity: "error",   message: "At least one document is required.",        area: "documents" });
  if (template.placeholders.length === 0)                  errors.push({ id: "v-phs",   severity: "error",   message: "At least one role placeholder is required.",area: "placeholders" });
  if (template.fields.filter(f => f.placeholderId !== null).length === 0) warnings.push({ id: "v-flds", severity: "warning", message: "No recipient fields have been added.", area: "fields" });

  const isValid          = errors.length === 0;
  const canMakeAvailable = isValid;
  return { isValid, canMakeAvailable, errors, warnings };
}

// ── Status mutations (in-session only) ───────────────────────────────────────

export interface TemplateStatusMutationResult {
  ok:      boolean;
  template?: DocumentTemplate;
  reason?: string;
  demonstrationOnly: true;
}

function mutateStatus(
  id: DocumentTemplateId,
  toStatus: DocumentTemplate["status"],
  allowedFrom: DocumentTemplate["status"][]
): TemplateStatusMutationResult {
  const t = getTemplate(id);
  if (!t) return { ok: false, reason: "Template not found.", demonstrationOnly: true };
  if (!allowedFrom.includes(t.status)) {
    return { ok: false, reason: `Cannot transition from ${t.status} to ${toStatus}.`, demonstrationOnly: true };
  }
  const updated: DocumentTemplate = {
    ...t,
    status:    toStatus,
    updatedAt: new Date().toISOString(),
  };
  SESSION_MUTATIONS.set(id, updated);
  return { ok: true, template: updated, demonstrationOnly: true };
}

export function makeTemplateAvailable(id: DocumentTemplateId): TemplateStatusMutationResult {
  const t = getTemplate(id);
  if (t) {
    const vr = validateTemplate(t);
    if (!vr.canMakeAvailable)
      return { ok: false, reason: vr.errors[0]?.message ?? "Template has validation errors.", demonstrationOnly: true };
  }
  return mutateStatus(id, "available", ["draft"]);
}

export function returnTemplateToDraft(id: DocumentTemplateId): TemplateStatusMutationResult {
  return mutateStatus(id, "draft", ["available"]);
}

export function archiveTemplate(id: DocumentTemplateId): TemplateStatusMutationResult {
  return mutateStatus(id, "archived", ["draft", "available", "unavailable"]);
}

export function restoreTemplate(id: DocumentTemplateId): TemplateStatusMutationResult {
  return mutateStatus(id, "draft", ["archived"]);
}

// ── Duplicate ─────────────────────────────────────────────────────────────────

export interface TemplateDuplicateResult {
  ok:         boolean;
  newId?:     string;
  template?:  DocumentTemplate;
  reason?:    string;
  demonstrationOnly: true;
}

export function duplicateTemplate(id: DocumentTemplateId): TemplateDuplicateResult {
  const t = getTemplate(id);
  if (!t) return { ok: false, reason: "Template not found.", demonstrationOnly: true };

  const newId  = `tpl-copy-${id}-${Date.now()}`;
  const cloned: DocumentTemplate = {
    ...t,
    id:          newId,
    name:        `Copy of ${t.name}`,
    status:      "draft",
    scope:       "personal",
    source:      "duplicated",
    ownerLabel:  "You (Demo User)",
    createdAt:   new Date().toISOString(),
    updatedAt:   new Date().toISOString(),
    usageSummary:{ timesUsed: 0, lastUsedDate: null, recentDraftStarts: 0, relatedFixtureIds: [], demonstrationOnly: true },
    validation:  undefined,
    demonstrationOnly: true,
  };
  SESSION_MUTATIONS.set(newId, cloned);
  return { ok: true, newId, template: cloned, demonstrationOnly: true };
}

// ── Template field update ─────────────────────────────────────────────────────

export interface TemplateFieldSaveResult {
  ok:        boolean;
  template?: DocumentTemplate;
  reason?:   string;
  demonstrationOnly: true;
}

export function saveTemplateFields(
  id: DocumentTemplateId,
  fields: DocumentTemplate["fields"]
): TemplateFieldSaveResult {
  const t = getTemplate(id);
  if (!t) return { ok: false, reason: "Template not found.", demonstrationOnly: true };
  const updated: DocumentTemplate = {
    ...t,
    fields,
    updatedAt: new Date().toISOString(),
    demonstrationOnly: true,
  };
  SESSION_MUTATIONS.set(id, updated);
  return { ok: true, template: updated, demonstrationOnly: true };
}

// ── Instantiation (Use Template → Prepare flow) ───────────────────────────────

export function instantiateTemplate(
  _id: DocumentTemplateId,
  _roleMappings: TemplateRoleMapping[],
  _variableValues: TemplateVariableValues
): TemplateInstantiationResult {
  // Frontend-only. Simulates handing off to the Command 18 Prepare flow.
  // In a real system this would create a draft transaction from the template.
  const draftId     = `draft-from-tpl-${Date.now()}`;
  return {
    ok:              true,
    prepDraftId:     draftId,
    prepStartRoute:  `/app/prepare/${draftId}`,
    demonstrationOnly: true,
  };
}

// ── Create from context ───────────────────────────────────────────────────────

export interface TemplateCreateResult {
  ok:        boolean;
  newId?:    string;
  template?: DocumentTemplate;
  reason?:   string;
  demonstrationOnly: true;
}

export function createBlankTemplate(name: string, category: DocumentTemplate["category"]): TemplateCreateResult {
  const newId = `tpl-new-${Date.now()}`;
  const blank: DocumentTemplate = {
    id:             newId,
    name:           name || "Untitled Template",
    description:    "",
    category,
    status:         "draft",
    scope:          "personal",
    source:         "blank",
    ownerLabel:     "You (Demo User)",
    workspaceLabel: "LAGDA Demo Workspace",
    tags:           [],
    documents:      [],
    placeholders:   [],
    routing:        { mode: "sequential", groups: [] },
    authentication: { globalDefault: "email-otp", placeholderOverrides: {} },
    settings: {
      invitationSubject:         "Please review and sign",
      invitationMessage:         "",
      reminderEnabled:           true,
      reminderIntervalDays:      3,
      expirationEnabled:         true,
      expirationDays:            14,
      completionCopySender:      true,
      completionCopyParticipants:false,
      verificationEnabled:       false,
    },
    variables:    [],
    fields:       [],
    usageSummary: { timesUsed: 0, lastUsedDate: null, recentDraftStarts: 0, relatedFixtureIds: [], demonstrationOnly: true },
    createdAt:    new Date().toISOString(),
    updatedAt:    new Date().toISOString(),
    demonstrationOnly: true,
  };
  SESSION_MUTATIONS.set(newId, blank);
  return { ok: true, newId, template: blank, demonstrationOnly: true };
}

// ── Simulated async wrappers ──────────────────────────────────────────────────
// Wrap each synchronous call in a short artificial delay for realistic UX.

export async function asyncListTemplates(query: TemplateListQuery): Promise<TemplateListResult> {
  await delay(120);
  return listTemplates(query);
}

export async function asyncGetTemplateById(id: DocumentTemplateId): Promise<DocumentTemplate | null> {
  await delay(90);
  return getTemplateById(id);
}

export async function asyncMakeAvailable(id: DocumentTemplateId): Promise<TemplateStatusMutationResult> {
  await delay(350);
  return makeTemplateAvailable(id);
}

export async function asyncReturnToDraft(id: DocumentTemplateId): Promise<TemplateStatusMutationResult> {
  await delay(350);
  return returnTemplateToDraft(id);
}

export async function asyncArchive(id: DocumentTemplateId): Promise<TemplateStatusMutationResult> {
  await delay(350);
  return archiveTemplate(id);
}

export async function asyncRestore(id: DocumentTemplateId): Promise<TemplateStatusMutationResult> {
  await delay(350);
  return restoreTemplate(id);
}

export async function asyncDuplicate(id: DocumentTemplateId): Promise<TemplateDuplicateResult> {
  await delay(400);
  return duplicateTemplate(id);
}

export async function asyncInstantiate(
  id: DocumentTemplateId,
  roleMappings: TemplateRoleMapping[],
  variableValues: TemplateVariableValues
): Promise<TemplateInstantiationResult> {
  await delay(600);
  return instantiateTemplate(id, roleMappings, variableValues);
}

export async function asyncCreateBlank(name: string, category: DocumentTemplate["category"]): Promise<TemplateCreateResult> {
  await delay(300);
  return createBlankTemplate(name, category);
}

function delay(ms: number): Promise<void> {
  return new Promise(resolve => setTimeout(resolve, ms));
}
