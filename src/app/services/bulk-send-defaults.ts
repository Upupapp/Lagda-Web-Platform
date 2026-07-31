// Request Defaults — centralized field metadata, validation and impact.
//
// Gap Closure Command 3. Frontend demonstration only.
//
// This module owns, in ONE place: which defaults are editable, what type each
// holds, how each is formatted for display, what validates it, what depends on
// what, and whether changing it affects existing rows or only later ones.
//
// It does NOT own precedence. `BULK_SEND_DEFAULT_PRECEDENCE` in models/bulk-send.ts
// is the canonical order and `buildDefaults()` in the service is the canonical
// resolver. Reimplementing either here would let the editor and the engine
// disagree about which value wins.
//
// Policy and Automation are deliberately NOT consulted. Both are declared members
// of `BulkSendDefaultSource` and both sit in the precedence order, but nothing in
// the repository produces them and the Command 32 engine is not called from here.
// Where a field could in principle be resolved by one, that is stated as
// unresolved rather than simulated.

import type {
  BulkSendBatch,
  BulkSendDefaultSource,
  BulkSendRequestDefaults,
} from "../models/bulk-send";
import { BULK_SEND_DEFAULT_SOURCE_LABELS, normalizeBulkSendText } from "../models/bulk-send";
import type { PrepAuthMethodId } from "../models/prepare";
import type { RoutingMode } from "../models/templates";

// ── Field identity ────────────────────────────────────────────────────────────

export type DefaultFieldId = keyof BulkSendRequestDefaults;

export type DefaultValueType = "text" | "long-text" | "enum" | "boolean" | "duration-direction";

export type DefaultCategory = "request-identity" | "recipients" | "delivery" | "timing" | "security";

export const DEFAULT_CATEGORY_LABELS: Record<DefaultCategory, string> = {
  "request-identity": "Request",
  "recipients":       "Recipients",
  "delivery":         "Delivery",
  "timing":           "Timing",
  "security":         "Security",
};

/** Whether editing a field changes rows already in the batch, later ones, or neither. */
export type DefaultImpactScope = "existing-and-future" | "future-only" | "preview-only";

export const DEFAULT_IMPACT_LABELS: Record<DefaultImpactScope, string> = {
  "existing-and-future": "Applies to this batch's rows and to rows added later",
  "future-only":         "Applies only to recipients added after this change",
  "preview-only":        "Direction only in this phase — nothing is scheduled or enforced",
};

export interface DefaultEnumOption { value: string; label: string }

export interface DefaultFieldDefinition {
  id:           DefaultFieldId;
  label:        string;
  description:  string;
  category:     DefaultCategory;
  valueType:    DefaultValueType;
  options?:     DefaultEnumOption[];
  maxLength?:   number;
  /** Editable for the current request. All nine currently are. */
  requestEditable: boolean;
  /**
   * Editable at workspace scope. FALSE for every field: the canonical
   * `WorkspaceSettings` model holds no request or signing defaults, so there is
   * nowhere to store one. See the gap document — inventing a store here would be
   * a second Organization Settings architecture.
   */
  organizationEditable: boolean;
  impact:       DefaultImpactScope;
  /** True when the value is only a written direction, never enforced anywhere. */
  directionOnly: boolean;
  /** Fields whose meaning depends on this one. */
  dependents?:  DefaultFieldId[];
}

// ── Options drawn from canonical unions ───────────────────────────────────────

const ROUTING_OPTIONS: DefaultEnumOption[] = [
  { value: "sequential", label: "One after another (sequential)" },
  { value: "parallel",   label: "All at the same time (parallel)" },
];

const AUTH_OPTIONS: DefaultEnumOption[] = [
  { value: "none",            label: "No additional authentication" },
  { value: "email-otp",       label: "Email one-time code" },
  { value: "sms-otp",         label: "SMS one-time code" },
  { value: "knowledge-based", label: "Knowledge-based questions" },
  { value: "id-verification", label: "ID document check" },
  { value: "account-signin",  label: "LAGDA account sign-in" },
];

// ── The registry ──────────────────────────────────────────────────────────────

export const DEFAULT_FIELD_DEFINITIONS: DefaultFieldDefinition[] = [
  {
    id: "requestTitlePattern",
    label: "Request title pattern",
    description: "How each recipient's request is named. {{recipient_name}} is replaced per row.",
    category: "request-identity",
    valueType: "text",
    maxLength: 200,
    requestEditable: true, organizationEditable: false,
    impact: "existing-and-future", directionOnly: false,
  },
  {
    id: "senderMessage",
    label: "Message to recipients",
    description: "Shown with the request. Plain text only.",
    category: "delivery",
    valueType: "long-text",
    maxLength: 1000,
    requestEditable: true, organizationEditable: false,
    impact: "existing-and-future", directionOnly: true,
  },
  {
    id: "routingMode",
    label: "Routing order",
    description: "Whether participants act one after another or at the same time.",
    category: "recipients",
    valueType: "enum",
    options: ROUTING_OPTIONS,
    requestEditable: true, organizationEditable: false,
    impact: "existing-and-future", directionOnly: false,
  },
  {
    id: "authMethod",
    label: "Authentication direction",
    description: "The recipient authentication this batch intends. Nothing is enforced in this phase.",
    category: "security",
    valueType: "enum",
    options: AUTH_OPTIONS,
    requestEditable: true, organizationEditable: false,
    impact: "existing-and-future", directionOnly: true,
    dependents: ["consentRequired"],
  },
  {
    id: "consentRequired",
    label: "Electronic record consent",
    description: "Whether recipients are asked to consent to electronic records before acting.",
    category: "security",
    valueType: "boolean",
    requestEditable: true, organizationEditable: false,
    impact: "existing-and-future", directionOnly: true,
  },
  {
    id: "dueDateDirection",
    label: "Due date direction",
    description: "A written target for completion. No reminder is scheduled from it.",
    category: "timing",
    valueType: "duration-direction",
    maxLength: 120,
    requestEditable: true, organizationEditable: false,
    impact: "future-only", directionOnly: true,
    dependents: ["expirationDirection"],
  },
  {
    id: "expirationDirection",
    label: "Expiration direction",
    description: "When the request is intended to stop accepting action. Nothing expires automatically.",
    category: "timing",
    valueType: "duration-direction",
    maxLength: 120,
    requestEditable: true, organizationEditable: false,
    impact: "future-only", directionOnly: true,
  },
  {
    id: "completionCopyDirection",
    label: "Completed document direction",
    description: "Who is intended to receive the completed document. No copy is delivered.",
    category: "delivery",
    valueType: "text",
    maxLength: 200,
    requestEditable: true, organizationEditable: false,
    impact: "preview-only", directionOnly: true,
  },
  {
    id: "verificationDirection",
    label: "Verification direction",
    description: "What this batch states about Verification availability after completion.",
    category: "request-identity",
    valueType: "text",
    maxLength: 200,
    requestEditable: true, organizationEditable: false,
    impact: "preview-only", directionOnly: true,
  },
];

export function getFieldDefinition(id: DefaultFieldId): DefaultFieldDefinition | undefined {
  return DEFAULT_FIELD_DEFINITIONS.find((f) => f.id === id);
}

export const DEFAULT_CATEGORIES: DefaultCategory[] =
  ["request-identity", "recipients", "delivery", "timing", "security"];

// ── Source presentation ───────────────────────────────────────────────────────

/** True for sources that mean "the user chose this for this request". */
export function isRequestOverride(source: BulkSendDefaultSource): boolean {
  return source === "user";
}

/** True for sources the repository declares but no code currently produces. */
export function isUnresolvedSource(source: BulkSendDefaultSource): boolean {
  return source === "workflow-policy" || source === "automation-rule";
}

export function describeSource(source: BulkSendDefaultSource): string {
  if (source === "user") return "Overridden for this request";
  if (source === "workflow-policy") return "Workflow Policy — not evaluated";
  if (source === "automation-rule") return "Automation Rule — not evaluated";
  if (source === "workspace-default") return "Workspace default";
  return BULK_SEND_DEFAULT_SOURCE_LABELS[source];
}

export const POLICY_AUTOMATION_NOTICE =
  "Policy resolution is not connected in this frontend phase and no Automation Rule is " +
  "evaluated. Values shown come from your choice for this request, the Template, or the " +
  "product default.";

export const ORGANIZATION_SCOPE_NOTICE =
  "Workspace-level defaults are not available. The canonical Workspace Settings model holds " +
  "no request or signing defaults, so there is nothing to inherit from or write to. Values " +
  "here therefore resolve from your choice for this request, the Template, or the product " +
  "default. This is recorded as a backend and product requirement.";

export const FRONTEND_ONLY_NOTICE =
  "These changes update the current frontend preparation draft. No production request, " +
  "workspace setting, reminder, invitation, or recipient requirement was created, scheduled, " +
  "or delivered.";

// ── Value formatting ──────────────────────────────────────────────────────────

export function formatDefaultValue(def: DefaultFieldDefinition, value: unknown): string {
  if (value === null || value === undefined || value === "") return "Not set";
  if (def.valueType === "boolean") return value ? "Required" : "Not required";
  if (def.valueType === "enum") {
    const opt = def.options?.find((o) => o.value === String(value));
    // Never show a raw enum member to the user.
    return opt ? opt.label : String(value).replace(/-/g, " ");
  }
  return String(value);
}

export function readDefaultValue(defaults: BulkSendRequestDefaults, id: DefaultFieldId): unknown {
  return (defaults[id] as { value: unknown }).value;
}

export function readDefaultSource(defaults: BulkSendRequestDefaults, id: DefaultFieldId): BulkSendDefaultSource {
  return (defaults[id] as { source: BulkSendDefaultSource }).source;
}

// ── Validation ────────────────────────────────────────────────────────────────

export type DefaultIssueSeverity = "blocking" | "warning";

export interface DefaultValidationIssue {
  /** Stable ID, safe to key on. */
  code:     string;
  field:    DefaultFieldId;
  severity: DefaultIssueSeverity;
  message:  string;
  /** What the user should do about it. */
  action:   string;
}

/**
 * THE validation path for the defaults editor. Returns stable issue codes and
 * user-facing messages — never a raw regex, enum member, or internal error.
 */
export function validateDefaultsDraft(
  draft: Partial<Record<DefaultFieldId, unknown>>,
): DefaultValidationIssue[] {
  const issues: DefaultValidationIssue[] = [];

  for (const def of DEFAULT_FIELD_DEFINITIONS) {
    if (!(def.id in draft)) continue;
    const raw = draft[def.id];

    if (def.valueType === "enum") {
      const allowed = (def.options ?? []).map((o) => o.value);
      if (!allowed.includes(String(raw))) {
        issues.push({
          code: `defaults-unsupported-${def.id}`, field: def.id, severity: "blocking",
          message: `${def.label} is set to a value this product does not support.`,
          action: "Choose one of the listed options.",
        });
      }
      continue;
    }

    if (def.valueType === "boolean") continue;

    const text = typeof raw === "string" ? raw : raw === null ? "" : String(raw ?? "");
    if (def.maxLength && text.length > def.maxLength) {
      issues.push({
        code: `defaults-too-long-${def.id}`, field: def.id, severity: "blocking",
        message: `${def.label} is longer than ${def.maxLength} characters.`,
        action: "Shorten the value.",
      });
    }
    if (def.id === "requestTitlePattern" && text.trim().length === 0) {
      issues.push({
        code: "defaults-title-required", field: "requestTitlePattern", severity: "blocking",
        message: "Each request needs a title pattern.",
        action: "Enter a title, for example {{recipient_name}}.",
      });
    }
  }

  // ── Dependent fields ──────────────────────────────────────────────────────
  // Only relationships the product actually models are checked. Nothing here
  // silently rewrites another field.
  const due = typeof draft.dueDateDirection === "string" ? draft.dueDateDirection.trim() : "";
  const exp = typeof draft.expirationDirection === "string" ? draft.expirationDirection.trim() : "";
  if (due && !exp) {
    issues.push({
      code: "defaults-due-without-expiration", field: "dueDateDirection", severity: "warning",
      message: "A due date direction is set but no expiration direction is.",
      action: "Add an expiration direction, or clear the due date, so the two agree.",
    });
  }

  if (draft.authMethod === "none" && draft.consentRequired === false) {
    issues.push({
      code: "defaults-no-auth-no-consent", field: "authMethod", severity: "warning",
      message: "This batch intends neither additional authentication nor consent.",
      action: "Consider requiring consent, or an authentication method, before preparing.",
    });
  }

  return issues;
}

// ── Impact ────────────────────────────────────────────────────────────────────

export interface DefaultChangePreview {
  field:        DefaultFieldId;
  label:        string;
  previousValue: string;
  nextValue:    string;
  previousSource: string;
  nextSource:   string;
  impact:       DefaultImpactScope;
  impactLabel:  string;
  /** Rows in this batch that already carry an explicit value and keep it. */
  rowsKeepingOverrides: number;
}

/**
 * Rows the user edited directly keep their values. A default is a fallback, so a
 * row with its own explicit value is never rewritten by changing one — this count
 * makes that visible before Save rather than after.
 */
export function countRowsWithExplicitOverrides(batch: BulkSendBatch): number {
  return batch.rows.filter((r) => {
    if (r.excluded) return false;
    return Object.keys(r.values).some((k) => (r.values[k] ?? "") !== (r.originalValues[k] ?? ""));
  }).length;
}

export function buildChangePreview(
  batch: BulkSendBatch,
  draft: Partial<Record<DefaultFieldId, unknown>>,
): DefaultChangePreview[] {
  const rowsKeeping = countRowsWithExplicitOverrides(batch);
  const out: DefaultChangePreview[] = [];
  // A batch created without a Template has no resolved defaults yet.
  const resolved = batch.defaults;
  if (!resolved) return out;

  for (const def of DEFAULT_FIELD_DEFINITIONS) {
    if (!(def.id in draft)) continue;
    const current = readDefaultValue(resolved, def.id);
    const next = draft[def.id];
    if (String(current ?? "") === String(next ?? "")) continue;

    out.push({
      field: def.id,
      label: def.label,
      previousValue: formatDefaultValue(def, current),
      nextValue: formatDefaultValue(def, next),
      previousSource: describeSource(readDefaultSource(resolved, def.id)),
      nextSource: describeSource("user"),
      impact: def.impact,
      impactLabel: DEFAULT_IMPACT_LABELS[def.impact],
      rowsKeepingOverrides: def.impact === "existing-and-future" ? rowsKeeping : 0,
    });
  }
  return out;
}

// ── Normalisation for commit ──────────────────────────────────────────────────

/** Plain text only. Applied before anything reaches the service. */
export function normalizeDefaultValue(def: DefaultFieldDefinition, value: unknown): unknown {
  if (def.valueType === "boolean") return !!value;
  if (def.valueType === "enum") return String(value);
  const text = typeof value === "string" ? value : value === null ? "" : String(value ?? "");
  const clean = normalizeBulkSendText(text, def.maxLength ?? 500);
  // These two are nullable in the model; an empty string is not the same as unset.
  if ((def.id === "dueDateDirection" || def.id === "expirationDirection"
    || def.id === "completionCopyDirection") && clean.length === 0) return null;
  return clean;
}

export type { RoutingMode, PrepAuthMethodId };
