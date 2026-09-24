// Real workflow-template service — talks to Lagda-Backend's workspace-scoped
// workflow-template routes (migration 058, extended by 059 and 060).
//
// ── What a stored template is, and is not ──────────────────────────────────
//
// It is a WORKFLOW SHAPE: named role slots and a routing mode, optionally a
// document (059) and field placements per role (060). Applying it to a draft
// is a separate step that lives in services/prepare/template-apply.ts and
// stays there — this file does CRUD and nothing else.
//
// ── The wire shape is NARROWER than the frontend's model ───────────────────
//
// `WorkflowRoleSlotSchema` is declared `additionalProperties: false` and has
// exactly six fields on READ (slotId, label, role, required, routingStep,
// defaultAuthMethod) — slotId is the one field the WRITE schema makes
// optional, so a round trip can preserve it without every caller having to
// supply one for a brand-new slot.
//
// The frontend's `TemplateRolePlaceholder` carries two more — `description`
// and `mustMapToParticipant` — and there is NO column for either. Sending
// them is not merely wasteful, it is REFUSED by the schema.
//
// So those two are presentational: they survive in the session and are lost
// on reload. `toPlaceholder` below fills them with honest defaults rather
// than pretending a round trip preserved them. Tracked separately; the fix
// is a migration, not a change here.

import { apiRequest } from "../api-client";
import type {
  DocumentTemplate,
  TemplateRolePlaceholder,
  TemplateRequestSettings,
  TemplateRoleResolution,
  TemplateVariable,
  TemplateVariableType,
  FlowDocument,
  ResolvedFieldAnchor,
} from "../../models/templates";
import type { PrepParticipantRole, PrepAuthMethodId } from "../../models/prepare";
import type { RoutingMode } from "../../models/transaction-detail";
import type { BackendFieldType, BackendRect } from "./preparation.service";

/** The seven fields `WorkflowRoleSlotSchema` returns on a READ. `resolution`
 *  (061) is the identical shape on read and write — there is no
 *  server-assigned part to it the way there is for `slotId`, so it reuses
 *  the frontend's own `TemplateRoleResolution` rather than a duplicate. */
export interface WireRoleSlot {
  slotId: string;
  label: string;
  role: PrepParticipantRole;
  required: boolean;
  routingStep: number;
  defaultAuthMethod: PrepAuthMethodId;
  resolution?: TemplateRoleResolution;
}

/** The write shape of a slot — `slotId` OPTIONAL, the one difference from
 *  `WireRoleSlot`. Omitted for a new slot; supplied (round-tripped from a
 *  slot this page already loaded) to keep the same slot's identity across
 *  an edit, which is what lets a field already placed "for" that role
 *  survive the edit too — see `WorkflowRoleSlotWriteSchema`'s own header. */
export interface WireRoleSlotWrite {
  slotId?: string;
  label: string;
  role: PrepParticipantRole;
  required: boolean;
  routingStep: number;
  defaultAuthMethod: PrepAuthMethodId;
  resolution?: TemplateRoleResolution;
}

/** A field placement — geometry for one ROLE, not one person. Mirrors
 *  `BackendPreparationField`/`Input` from preparation.service.ts exactly
 *  (same type union, same rect shape), with `slotId` where that one has
 *  `recipientId`: a template field is FOR A ROLE, not a resolved person. */
export interface WireField {
  fieldId: string;
  /** Null when the field is filled from a variable instead (064). */
  slotId: string | null;
  /** 064. One of the template's own `variables[].key` values, or null when a
   *  role signs it. Exactly one of the two is set. */
  variableKey: string | null;
  type: BackendFieldType;
  pageNumber: number;
  rect: BackendRect;
  required: boolean;
  label: string;
  layer: number;
}

export interface WireFieldInput {
  fieldId?: string;
  /** EXACTLY ONE of `slotId` / `variableKey`. The backend rejects both-set
   *  and neither-set with a named error. */
  slotId?: string;
  variableKey?: string;
  type: BackendFieldType;
  pageNumber: number;
  rect: BackendRect;
  required: boolean;
  label: string;
  layer: number;
}

/**
 * A slot's resolved assignment (061) — three states, not a nullable
 * person: "manual" means no `resolution` is configured; "unresolved" means
 * one is, but nobody currently holds that title; "resolved" carries who
 * does. `userId`/`displayName`/`email` are present ONLY when `status` is
 * `"resolved"`, matching the backend's own schema exactly.
 */
export interface WireRoleAssignment {
  slotId: string;
  status: "manual" | "resolved" | "unresolved";
  userId?: string;
  displayName?: string;
  email?: string;
}

/**
 * A variable DEFINITION (063) — what backend `WorkflowTemplateVariable`
 * returns, unchanged. Five types only: the backend has no `select` (it would
 * need an `options` list the schema does not carry) and no `multiline-text`
 * distinction beyond the type name itself — both are exactly what the
 * backend's closed set says, not a frontend narrowing.
 */
export type WireVariableType = "short-text" | "multiline-text" | "date" | "number" | "yes-no";

export interface WireVariable {
  key: string;
  label: string;
  type: WireVariableType;
  required: boolean;
}

export interface WireTemplate {
  workflowTemplateId: string;
  name: string;
  routingMode: RoutingMode;
  roleSlots: WireRoleSlot[];
  completionSettings: { notifySenderOnComplete: boolean };
  /** 063. Definitions only — see `WireVariable`'s own header for what a
   *  variable does and does not connect to yet. */
  variables: WireVariable[];
  /**
   * 059. `null` until attached. Bare ids only — no filename, page count or
   * size travels on this object; `templates-source.ts` fetches those from
   * the document itself, through the same real document service every other
   * page uses, rather than this route duplicating that read.
   */
  documentId: string | null;
  sourceArtifactId: string | null;
  /** 071. The authored flowing document that PRODUCED the attached document,
   *  when the document was generated rather than uploaded. Empty for a
   *  template with nothing authored yet. */
  content: FlowDocument;
  contentPageCount: number;
  createdAt: string;
  updatedAt: string;
}

/** The body of `POST .../generate-document`. No `pageCount` — the layout
 *  engine computes how many pages result, it is never declared up front. */
export interface WireGenerateDocumentInput {
  content: FlowDocument;
}

/** One `fieldAnchor` run, resolved to where the layout engine actually
 *  placed it — returned alongside the regenerated template. */
export type WireResolvedFieldAnchor = ResolvedFieldAnchor;

export interface WireGenerateDocumentResult {
  template: WireTemplate;
  resolvedAnchors: WireResolvedFieldAnchor[];
}

/** The body both POST and PUT take. PUT replaces wholesale — the backend has
 *  no PATCH for a template, because a partial update of an ordered slot list
 *  has no obvious meaning. */
export interface WireTemplateWrite {
  name: string;
  routingMode: RoutingMode;
  roleSlots: WireRoleSlotWrite[];
  completionSettings: { notifySenderOnComplete: boolean };
  variables: WireVariable[];
}

const base = (workspaceId: string) =>
  `/workspaces/${encodeURIComponent(workspaceId)}/workflow-templates`;

class RealTemplatesService {
  async list(workspaceId: string): Promise<WireTemplate[]> {
    const result = await apiRequest<{ items: WireTemplate[] }>(base(workspaceId));
    return result.items;
  }

  async get(workspaceId: string, templateId: string): Promise<WireTemplate> {
    return apiRequest<WireTemplate>(
      `${base(workspaceId)}/${encodeURIComponent(templateId)}`,
    );
  }

  async create(workspaceId: string, input: WireTemplateWrite): Promise<WireTemplate> {
    return apiRequest<WireTemplate>(base(workspaceId), {
      method: "POST", body: input,
    });
  }

  async update(
    workspaceId: string, templateId: string, input: WireTemplateWrite,
  ): Promise<WireTemplate> {
    return apiRequest<WireTemplate>(
      `${base(workspaceId)}/${encodeURIComponent(templateId)}`,
      { method: "PUT", body: input },
    );
  }

  async remove(workspaceId: string, templateId: string): Promise<void> {
    await apiRequest<void>(
      `${base(workspaceId)}/${encodeURIComponent(templateId)}`,
      { method: "DELETE" },
    );
  }

  /** A template's field layout (060), in deterministic order. */
  async getFields(workspaceId: string, templateId: string): Promise<WireField[]> {
    const result = await apiRequest<{ items: WireField[] }>(
      `${base(workspaceId)}/${encodeURIComponent(templateId)}/fields`,
    );
    return result.items;
  }

  /** Whole-layout replace — the backend has no per-field endpoint, the same
   *  reason a real document preparation's fields are saved this way. */
  async saveFields(
    workspaceId: string, templateId: string, fields: WireFieldInput[],
  ): Promise<WireField[]> {
    const result = await apiRequest<{ items: WireField[] }>(
      `${base(workspaceId)}/${encodeURIComponent(templateId)}/fields`,
      { method: "PUT", body: { fields } },
    );
    return result.items;
  }

  /**
   * Renders the given content into a PDF and attaches it to the template —
   * the authoring alternative to `attachDocument`'s "point at an already-
   * uploaded file". Whole-content replace, same one-atomic-write model as
   * `saveFields`: there is no per-block endpoint, and regenerating replaces
   * the previously attached document (and its content) rather than merging.
   */
  async generateDocument(
    workspaceId: string, templateId: string, input: WireGenerateDocumentInput,
  ): Promise<WireGenerateDocumentResult> {
    return apiRequest<WireGenerateDocumentResult>(
      `${base(workspaceId)}/${encodeURIComponent(templateId)}/generate-document`,
      { method: "POST", body: input },
    );
  }

  /**
   * What every resolved slot means RIGHT NOW (061). Read fresh on every
   * call — never cached — since the whole point is that a title change
   * (someone new becomes Department Head) is reflected without editing the
   * template.
   */
  async getRoleAssignments(workspaceId: string, templateId: string): Promise<WireRoleAssignment[]> {
    const result = await apiRequest<{ items: WireRoleAssignment[] }>(
      `${base(workspaceId)}/${encodeURIComponent(templateId)}/role-assignments`,
    );
    return result.items;
  }
}

export const realTemplatesService = new RealTemplatesService();

// ── Mapping ─────────────────────────────────────────────────────────────────

/**
 * A stored slot as the templates UI wants to see it.
 *
 * `description` and `mustMapToParticipant` have no column. They are filled
 * with defaults that are TRUE of a stored template rather than invented:
 * an empty description says "none was kept", and `mustMapToParticipant`
 * mirrors `required`, which is the only signal the backend actually has
 * about whether a slot must be filled.
 */
function toPlaceholder(slot: WireRoleSlot, index: number): TemplateRolePlaceholder {
  return {
    // Positional — this id is a presentational key for the templates UI's
    // own lists and forms, unrelated to identity on the backend. `slotId`
    // below is what actually round-trips.
    id: `slot-${String(index + 1)}`,
    // 060. The backend's own stable id for this slot — round-tripped on
    // save (see `toWireWrite`) so a field already placed "for" this role
    // survives an edit that renames or reorders it, and used by
    // `TemplateFieldsPage` to address the fields endpoint, which is keyed
    // by slotId, never by this object's positional `id`.
    backendSlotId: slot.slotId,
    label: slot.label,
    role: slot.role,
    required: slot.required,
    routingStep: slot.routingStep,
    defaultAuthMethod: slot.defaultAuthMethod,
    description: "",
    mustMapToParticipant: slot.required,
    ...(slot.resolution === undefined ? {} : { resolution: slot.resolution }),
  };
}

/** A stored template, widened to the shape the templates pages render. */
/** A stored variable, as the templates UI wants to see it. `id` and
 *  `internalKey` are both the backend's `key` — nothing else is unique per
 *  template the way this needs. */
function toTemplateVariable(wire: WireVariable): TemplateVariable {
  return {
    id: wire.key,
    internalKey: wire.key,
    label: wire.label,
    type: wire.type,
    required: wire.required,
    helpText: "",
    placeholder: "",
  };
}

export function toDocumentTemplate(wire: WireTemplate): DocumentTemplate {
  const placeholders = wire.roleSlots.map(toPlaceholder);

  return {
    id: wire.workflowTemplateId,
    name: wire.name,
    description: "",
    category: "other",
    status: "available",
    scope: "workspace",
    source: "blank",
    ownerLabel: "",
    workspaceLabel: "",
    tags: [],
    // A bare reference only. `toDocumentTemplate` does no I/O, so it cannot
    // fetch the filename or page count that make this genuinely useful on
    // screen — `templates-source.ts`'s `getTemplate` does that enrichment
    // (one document read, only when a reference is present) and replaces
    // this entry with a fuller one before a page ever renders it.
    documents: wire.documentId !== null && wire.sourceArtifactId !== null
      ? [{
          id: wire.documentId,
          displayName: "Attached document",
          pageCount: 0,
          order: 1,
          isPlaceholder: false,
          backendDocumentId: wire.documentId,
          backendArtifactId: wire.sourceArtifactId,
        }]
      : [],
    placeholders,
    routing: {
      mode: wire.routingMode,
      // The backend has no routing-group resource; groups are derived from
      // the slots' routingStep values, exactly as the prepare flow derives
      // them from recipients' routingOrder.
      groups: derivedGroups(placeholders),
    },
    authentication: {
      globalDefault: "none",
      placeholderOverrides: Object.fromEntries(
        placeholders.map(p => [p.id, p.defaultAuthMethod]),
      ),
    },
    settings: defaultSettings(wire.completionSettings.notifySenderOnComplete),
    variables: wire.variables.map(toTemplateVariable),
    fields: [],
    content: wire.content,
    contentPageCount: wire.contentPageCount,
    usageSummary: {
      timesUsed: 0, lastUsedDate: null, recentDraftStarts: 0,
      relatedFixtureIds: [], demonstrationOnly: true,
    },
    createdAt: wire.createdAt,
    updatedAt: wire.updatedAt,
    // A STORED template is not a demonstration — it is the workspace's own
    // data, round-tripped through the real API. The flag stays because the
    // shared `DocumentTemplate` type still declares it, not because this
    // record is fictional.
    demonstrationOnly: true,
  };
}

function derivedGroups(placeholders: TemplateRolePlaceholder[]) {
  const steps = [...new Set(placeholders.map(p => p.routingStep))].sort((a, b) => a - b);
  return steps.map((step, i) => ({
    id: `grp-${String(step)}`,
    label: `Step ${String(i + 1)}`,
    step: i + 1,
    placeholderIds: placeholders.filter(p => p.routingStep === step).map(p => p.id),
  }));
}

/**
 * Only `notifySenderOnComplete` round-trips.
 *
 * The other completion flags the templates UI shows describe behaviour the
 * backend does not have, so they are rendered from their defaults rather than
 * from storage — the same honesty rule the backend applies by refusing to
 * persist them.
 */
function defaultSettings(
  notifySenderOnComplete: boolean,
): TemplateRequestSettings {
  return {
    invitationSubject: "",
    invitationMessage: "",
    reminderEnabled: false,
    reminderIntervalDays: 3,
    expirationEnabled: false,
    expirationDays: 30,
    // The ONE flag that round-trips. `workflow_templates.completion_
    // notification_settings` persists `notifySenderOnComplete` and nothing
    // else, because it is the only one with a real producer.
    completionCopySender: notifySenderOnComplete,
    // NO backend column, and no fan-out behind it either — the completion
    // notification is addressed to the sender alone today (Lagda-Backend
    // issue #28). Rendered false rather than shown as a saved preference
    // that silently does nothing.
    completionCopyParticipants: false,
    verificationEnabled: false,
  };
}

const WIRE_VARIABLE_TYPES: readonly TemplateVariableType[] =
  ["short-text", "multiline-text", "date", "number", "yes-no"];

function isWireVariableType(type: TemplateVariableType): type is WireVariableType {
  return WIRE_VARIABLE_TYPES.includes(type);
}

/**
 * A template variable, for the write body. Throws on `type: "select"` —
 * the one frontend type the backend has no column for (it would need an
 * `options` list `WorkflowTemplateVariableSchema` does not carry). The
 * Variables tab that calls this never offers `select` as a choice, so this
 * is a defensive check on data that should not exist, not a real UI path.
 */
function toWireVariable(v: TemplateVariable): WireVariable {
  if (!isWireVariableType(v.type)) {
    throw new TemplateVariableTypeUnsupportedError(v.type);
  }
  return { key: v.internalKey, label: v.label, type: v.type, required: v.required };
}

export class TemplateVariableTypeUnsupportedError extends Error {
  constructor(readonly type: string) {
    super(`The "${type}" variable type is not saved by this version.`);
  }
}

/** The write body, built from what the editor holds. */
export function toWireWrite(input: {
  name: string;
  routingMode: RoutingMode;
  placeholders: readonly TemplateRolePlaceholder[];
  notifySenderOnComplete: boolean;
  variables: readonly TemplateVariable[];
}): WireTemplateWrite {
  return {
    name: input.name.trim(),
    routingMode: input.routingMode,
    // `description` and `mustMapToParticipant` are dropped deliberately —
    // see the header. `slotId` is round-tripped WHEN this placeholder came
    // from a stored slot (`backendSlotId` set by `toPlaceholder`); omitted
    // for one the editor added locally, which is exactly "new slot, no id
    // yet" — the write schema mints one.
    roleSlots: input.placeholders.map(p => ({
      ...(p.backendSlotId !== undefined ? { slotId: p.backendSlotId } : {}),
      label: p.label.trim(),
      role: p.role,
      required: p.required,
      routingStep: p.routingStep,
      defaultAuthMethod: p.defaultAuthMethod,
      // 061. Sent through untouched WHEN present — the write schema
      // validates the unit still exists and is live; this file trusts that
      // rather than re-checking it.
      ...(p.resolution === undefined ? {} : { resolution: p.resolution }),
    })),
    completionSettings: { notifySenderOnComplete: input.notifySenderOnComplete },
    variables: input.variables.map(toWireVariable),
  };
}
