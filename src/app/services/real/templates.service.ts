// Real workflow-template service — talks to Lagda-Backend's workspace-scoped
// workflow-template routes (migration 058).
//
// ── What a stored template is, and is not ──────────────────────────────────
//
// It is a WORKFLOW SHAPE: named role slots and a routing mode. It holds no
// people, no document and no file. Applying it to a draft is a separate step
// that lives in services/prepare/template-apply.ts and stays there — this
// file does CRUD and nothing else.
//
// ── The wire shape is NARROWER than the frontend's model ───────────────────
//
// `WorkflowRoleSlotSchema` is declared `additionalProperties: false` and has
// exactly five fields: label, role, required, routingStep, defaultAuthMethod.
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
} from "../../models/templates";
import type { PrepParticipantRole, PrepAuthMethodId } from "../../models/prepare";
import type { RoutingMode } from "../../models/transaction-detail";

/** Exactly the five fields `WorkflowRoleSlotSchema` accepts. */
export interface WireRoleSlot {
  label: string;
  role: PrepParticipantRole;
  required: boolean;
  routingStep: number;
  defaultAuthMethod: PrepAuthMethodId;
}

export interface WireTemplate {
  workflowTemplateId: string;
  name: string;
  routingMode: RoutingMode;
  roleSlots: WireRoleSlot[];
  completionSettings: { notifySenderOnComplete: boolean };
  /**
   * 059. `null` until attached. Bare ids only — no filename, page count or
   * size travels on this object; `templates-source.ts` fetches those from
   * the document itself, through the same real document service every other
   * page uses, rather than this route duplicating that read.
   */
  documentId: string | null;
  sourceArtifactId: string | null;
  createdAt: string;
  updatedAt: string;
}

/** The body both POST and PUT take. PUT replaces wholesale — the backend has
 *  no PATCH for a template, because a partial update of an ordered slot list
 *  has no obvious meaning. */
export interface WireTemplateWrite {
  name: string;
  routingMode: RoutingMode;
  roleSlots: WireRoleSlot[];
  completionSettings: { notifySenderOnComplete: boolean };
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

  /**
   * Points the template at an ALREADY-uploaded document and artifact.
   *
   * Takes ids, never a file — the caller uploads through the ordinary
   * document create-then-upload path first (see `attachTemplateDocument` in
   * `templates-source.ts`) and hands the resulting pair here. This method
   * does no uploading of its own, matching the backend route it calls.
   */
  async attachDocument(
    workspaceId: string, templateId: string,
    document: { documentId: string; artifactId: string },
  ): Promise<WireTemplate> {
    return apiRequest<WireTemplate>(
      `${base(workspaceId)}/${encodeURIComponent(templateId)}/document`,
      { method: "PUT", body: document },
    );
  }

  /** Clears the reference. The document and its artifact are untouched. */
  async detachDocument(workspaceId: string, templateId: string): Promise<WireTemplate> {
    return apiRequest<WireTemplate>(
      `${base(workspaceId)}/${encodeURIComponent(templateId)}/document`,
      { method: "DELETE" },
    );
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
    // Positional, because the backend stores no slot id. Stable for a given
    // stored template because the array order is preserved, which the
    // repository's round-trip test pins.
    id: `slot-${String(index + 1)}`,
    label: slot.label,
    role: slot.role,
    required: slot.required,
    routingStep: slot.routingStep,
    defaultAuthMethod: slot.defaultAuthMethod,
    description: "",
    mustMapToParticipant: slot.required,
  };
}

/** A stored template, widened to the shape the templates pages render. */
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
    variables: [],
    fields: [],
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

/** The write body, built from what the editor holds. */
export function toWireWrite(input: {
  name: string;
  routingMode: RoutingMode;
  placeholders: readonly TemplateRolePlaceholder[];
  notifySenderOnComplete: boolean;
}): WireTemplateWrite {
  return {
    name: input.name.trim(),
    routingMode: input.routingMode,
    // ONLY the five fields the schema accepts. `description` and
    // `mustMapToParticipant` are dropped deliberately — see the header.
    roleSlots: input.placeholders.map(p => ({
      label: p.label.trim(),
      role: p.role,
      required: p.required,
      routingStep: p.routingStep,
      defaultAuthMethod: p.defaultAuthMethod,
    })),
    completionSettings: { notifySenderOnComplete: input.notifySenderOnComplete },
  };
}
