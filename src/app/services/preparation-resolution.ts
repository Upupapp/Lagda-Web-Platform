// Preparation-facing Policy and Automation resolution — Gap Closure Command 4.
//
// This is a THIN BOUNDARY over the existing Command 32 engine
// (`workflowAutomationService`). It creates no second Rule engine, no second
// Policy evaluator, and no second conflict detector. Rule matching, policy
// resolution and conflict detection are performed by that engine; this module
// only builds a minimized input, splits the engine's output into Policy versus
// Automation outcomes, and enforces the capability boundary.
//
// CAPABILITY REALITY, verified against the registry rather than assumed:
// there is exactly ONE capability covering both — `workflow-automation`, which is
// `enterprise-preview` and therefore unavailable in `launch-default`. Policies are
// not separately classified as a launch capability. So in the default launch
// profile NEITHER Policy nor Automation resolution runs, and the engine is never
// called. Creating a separate policy capability to get around that would be
// inventing product scope.
//
// Nothing here enforces anything. No Rule is executed by a backend, no Policy is
// enforced, no notification is scheduled, no recipient or transaction is changed.

import type { BulkSendBatch } from "../models/bulk-send";
import type {
  AutoConflict,
  AutoPolicy,
  AutoSimProjectedChange,
  AutoSimulation,
  AutoSimTriggerContext,
} from "../models/workflow-automation";
import { workflowAutomationService } from "./mock/workflow-automation.service";
import { isCapabilityInActiveProfile } from "../config/capability-resolver";

// ── Capability ────────────────────────────────────────────────────────────────

export const RESOLUTION_CAPABILITY_ID = "workflow-automation";

/**
 * Profile-level gate. The engine must not be called at all when the capability is
 * outside the active product profile — not called and then filtered, which would
 * still read Rule and Policy definitions the profile excludes.
 */
export function isResolutionAvailable(): boolean {
  return isCapabilityInActiveProfile(RESOLUTION_CAPABILITY_ID);
}

// ── Input ─────────────────────────────────────────────────────────────────────

/**
 * Deliberately minimal. Counts, kinds and flags only.
 *
 * NEVER included: recipient names, email addresses, organizations, cell values,
 * Contact IDs, Contact notes, document content, field values, signatures,
 * authentication tokens, access links, consent evidence, IP addresses, or device
 * identifiers. The engine has no need of any of them, and a resolution input is
 * exactly the kind of object that ends up in a log.
 */
export interface PreparationResolutionInput {
  templateActive:   boolean;
  templateName:     string | null;
  recipientCount:   number;
  includedCount:    number;
  readyCount:       number;
  warningCount:     number;
  incompleteCount:  number;
  duplicateCount:   number;
  /** Which recipient source produced the rows, as a kind — never file names. */
  sourceKind:       string | null;
  routingMode:      string | null;
  authMethod:       string | null;
  consentRequired:  boolean | null;
  expirationSet:    boolean;
  mappedRoleCount:  number;
  totalRoleCount:   number;
  /** Rows the user edited directly. A count, never which rows or what changed. */
  explicitRowOverrides: number;
  /** Defaults the user overrode for this request. A count only. */
  requestOverrides: number;
  batchStatus:      string;
}

export function buildResolutionInput(batch: BulkSendBatch): PreparationResolutionInput {
  const d = batch.defaults;
  const explicitRowOverrides = batch.rows.filter(
    (r) => !r.excluded && Object.keys(r.values).some((k) => (r.values[k] ?? "") !== (r.originalValues[k] ?? "")),
  ).length;

  return {
    templateActive:  !!batch.templateId,
    templateName:    batch.templateName ?? null,
    recipientCount:  batch.rows.length,
    includedCount:   batch.rows.filter((r) => !r.excluded).length,
    readyCount:      batch.validation.ready,
    warningCount:    batch.validation.warning,
    incompleteCount: batch.validation.incomplete,
    duplicateCount:  batch.validation.duplicate,
    sourceKind:      batch.schema?.source ?? null,
    routingMode:     d ? String(d.routingMode.value) : null,
    authMethod:      d ? String(d.authMethod.value) : null,
    consentRequired: d ? !!d.consentRequired.value : null,
    expirationSet:   d ? d.expirationDirection.value !== null : false,
    mappedRoleCount: batch.roleMappings.filter((m) => Object.values(m.columnByField).some(Boolean)).length,
    totalRoleCount:  batch.roleMappings.length,
    explicitRowOverrides,
    requestOverrides: d
      ? Object.values(d).filter((v) => (v as { source: string }).source === "user").length
      : 0,
    batchStatus: batch.status,
  };
}

/**
 * Stable fingerprint of the input, used to detect staleness and to discard
 * results belonging to a superseded evaluation.
 *
 * Built from the already-minimized input, so it contains no private value and is
 * safe to hold in component state. It is not a security token and is not
 * persisted.
 */
export function computeInputVersion(input: PreparationResolutionInput): string {
  const bag = input as unknown as Record<string, unknown>;
  const ordered = Object.keys(bag).sort().map((k) => `${k}=${String(bag[k])}`);
  let hash = 0;
  const joined = ordered.join("|");
  for (let i = 0; i < joined.length; i++) {
    hash = ((hash << 5) - hash + joined.charCodeAt(i)) | 0;
  }
  return `v${(hash >>> 0).toString(36)}`;
}

// ── Output ────────────────────────────────────────────────────────────────────

export type ResolutionStatus =
  | "not-evaluated"
  | "capability-disabled"
  | "evaluating"
  | "resolved-no-changes"
  | "resolved-with-requirements"
  | "resolved-with-recommendations"
  | "resolved-with-conflicts"
  | "stale"
  | "failed";

export const RESOLUTION_STATUS_LABELS: Record<ResolutionStatus, string> = {
  "not-evaluated":                 "Not evaluated yet",
  "capability-disabled":           "Not available in this product profile",
  "evaluating":                    "Evaluating…",
  "resolved-no-changes":           "No applicable requirements identified",
  "resolved-with-requirements":    "Policy requirements apply",
  "resolved-with-recommendations": "Recommendations available",
  "resolved-with-conflicts":       "Conflicts require review",
  "stale":                         "Preparation details changed — re-evaluate",
  "failed":                        "Evaluation could not be completed",
};

export type ResolutionSeverity = "blocking" | "warning" | "info";

/** A mandatory outcome produced by a Policy. */
export interface PolicyRequirement {
  id:          string;
  title:       string;
  explanation: string;
  /** Safe display label. Never an internal ID as the primary label. */
  policyName:  string;
  field:       string;
  currentValue:  string;
  requiredValue: string;
  severity:    ResolutionSeverity;
  blocking:    boolean;
  /** Where the user goes to fix it. Validated internal path or null. */
  repairPath:  string | null;
  repairLabel: string | null;
}

/** An OPTIONAL outcome produced by an Automation Rule. */
export interface AutomationRecommendation {
  id:          string;
  title:       string;
  reason:      string;
  ruleName:    string;
  field:       string;
  currentValue:  string;
  proposedValue: string;
  /** False when this frontend phase cannot apply it. */
  applicable:  boolean;
  unsupportedReason: string | null;
  conflictsWith: string | null;
}

export interface ResolutionConflictView {
  id:          string;
  title:       string;
  kind:        string;
  severity:    ResolutionSeverity;
  /** True only when this conflict affected THIS evaluation. Those block review. */
  blocking:    boolean;
  affectedThisEvaluation: boolean;
  explanation: string;
  /** Generic source labels only — never another Team's private definition. */
  sources:     string[];
}

export interface PreparationResolutionResult {
  status:       ResolutionStatus;
  inputVersion: string;
  evaluatedAtDemonstration: string;
  requirements:    PolicyRequirement[];
  recommendations: AutomationRecommendation[];
  conflicts:       ResolutionConflictView[];
  /** Rules the engine considered but skipped, with its own safe reasons. */
  skipped:      Array<{ name: string; reason: string }>;
  matchedRuleNames: string[];
  /** What was sent to the engine, for explainability. Already minimized. */
  inputSummary: PreparationResolutionInput;
  notice:       string;
}

export const RESOLUTION_FRONTEND_NOTICE =
  "This is a frontend evaluation preview. No production Policy was enforced, no Automation " +
  "Rule was executed by a backend, no request or recipient was changed in production, and no " +
  "notification, reminder, or invitation was created or sent.";

export const RESOLUTION_DISABLED_NOTICE =
  "Policy and Automation resolution belongs to the Workflow Automation capability, which is " +
  "not part of the current product profile. Recipient preparation is unaffected.";

// ── Resolution ────────────────────────────────────────────────────────────────

/** Maps engine conflict severity onto the preparation vocabulary. */
function mapSeverity(s: AutoConflict["severity"]): ResolutionSeverity {
  return s === "error" ? "blocking" : s === "warning" ? "warning" : "info";
}

function displayValue(v: string | number | boolean | null): string {
  if (v === null || v === undefined || v === "") return "Not set";
  if (typeof v === "boolean") return v ? "Required" : "Not required";
  return String(v);
}

/** Human-readable field names. Internal keys are never shown raw. */
const FIELD_LABELS: Record<string, string> = {
  remindersEnabled:    "Reminder direction",
  firstReminderDays:   "First reminder timing",
  repeatIntervalDays:  "Reminder repeat interval",
  invitationSubject:   "Invitation subject direction",
  senderDisplayName:   "Sender display direction",
  authMethod:          "Authentication direction",
  expirationDays:      "Expiration direction",
  consentRequired:     "Consent direction",
  routingMode:         "Routing order",
};

function fieldLabel(field: string): string {
  return FIELD_LABELS[field] ?? field.replace(/([a-z])([A-Z])/g, "$1 $2").replace(/_/g, " ");
}

/**
 * Runs the CANONICAL Command 32 engine and reshapes its output for preparation.
 *
 * The split between requirement and recommendation is the engine's own:
 * `AutoSimProjectedChange.source` is `"policy"` or `"rule"`. Policy-sourced
 * changes become mandatory requirements; Rule-sourced changes become optional
 * recommendations. Nothing here re-decides which is which.
 */
export function resolvePreparation(
  input: PreparationResolutionInput,
): { ok: true; data: PreparationResolutionResult } | { ok: false; message: string } {
  if (!isResolutionAvailable()) {
    return {
      ok: true,
      data: {
        status: "capability-disabled",
        inputVersion: computeInputVersion(input),
        evaluatedAtDemonstration: new Date().toISOString(),
        requirements: [], recommendations: [], conflicts: [], skipped: [],
        matchedRuleNames: [], inputSummary: input,
        notice: RESOLUTION_DISABLED_NOTICE,
      },
    };
  }

  // Build the engine's own trigger context. Only safe, non-identifying attributes.
  //
  // `transaction_created` is the correct trigger for batch preparation: a batch
  // produces Draft transactions, and that is the point at which preparation-time
  // Rules apply. (`template_used` was the intuitive choice but matches no Rule in
  // the engine's fixtures, which made the whole integration silently return
  // nothing — verified by probing the engine directly.)
  const triggerContext: AutoSimTriggerContext = {
    triggerKind: "transaction_created",
    templateName: input.templateName ?? undefined,
    participantCount: input.includedCount,
    authMethodUsed: input.authMethod ?? undefined,
  };

  const sim = workflowAutomationService.runSimulation(triggerContext);
  if (!sim.ok) {
    return { ok: false, message: "The evaluation could not be completed. Try again." };
  }
  const simulation: AutoSimulation = sim.data;

  const policies = workflowAutomationService.listPolicies();
  const activePolicies: AutoPolicy[] = policies.ok
    ? policies.data.filter((p) => p.status === "active")
    : [];

  // ── Policy requirements ────────────────────────────────────────────────────
  //
  // Policies do NOT arrive through the simulation. Verified by probing the engine:
  // `runSimulation` only ever emits `source: "rule"` projected changes. Policy
  // values come from the engine's own policy resolver instead, so filtering
  // simulation output for `source === "policy"` produced an always-empty list.
  const requirements: PolicyRequirement[] = [];

  // Ask the engine what the active Policies resolve to, independent of the
  // Template — `templateActive: false` is what makes it consult the policies
  // rather than return the template-wins branch.
  const policyResolved = workflowAutomationService.resolveDefaultsForContext({ templateActive: false });

  const securityPolicy = activePolicies.find((p) => p.family === "participant_security");
  if (securityPolicy) {
    // The engine stores this as `signerMinAuth`, and its values use underscores
    // (`email_otp`) while `PrepAuthMethodId` uses hyphens (`email-otp`). Both
    // facts were established by reading the fixtures, not assumed — comparing
    // them raw would report every batch as violating the Policy.
    const required = securityPolicy.settings["signerMinAuth"];
    if (required !== undefined && required !== null && String(required) !== "") {
      const norm = (v: string) => v.replace(/_/g, "-").toLowerCase();
      const requiredNorm = norm(String(required));
      const current = input.authMethod ?? "none";
      // "none" never satisfies a minimum; anything else is treated as meeting it,
      // because the engine expresses a floor rather than an ordered scale.
      const satisfied = requiredNorm === "none" || (current !== "none" && current !== "");
      requirements.push({
        id: "req-participant-auth",
        title: "Signer authentication direction is governed by a Policy",
        explanation:
          `The Policy "${securityPolicy.name}" states a minimum authentication direction for ` +
          `signers. This is a frontend evaluation preview and is not enforced anywhere.`,
        policyName: securityPolicy.name,
        field: "authMethod",
        currentValue: displayValue(current.replace(/-/g, " ")),
        requiredValue: displayValue(requiredNorm.replace(/-/g, " ") + " or stronger"),
        severity: satisfied ? "info" : "blocking",
        blocking: !satisfied,
        repairPath: null,
        repairLabel: satisfied ? null : "Open Defaults",
      });
    }
  }

  const requestPolicy = activePolicies.find((p) => p.family === "request_defaults");
  if (requestPolicy) {
    requirements.push({
      id: "req-request-defaults",
      title: "Invitation direction is set by a Policy",
      explanation:
        `The Policy "${requestPolicy.name}" states the invitation subject and sender display ` +
        `direction for prepared requests. No invitation is created or sent in this frontend phase.`,
      policyName: requestPolicy.name,
      field: "invitationSubject",
      currentValue: "Not set in this batch",
      requiredValue: displayValue(policyResolved.invitationDefaults.subject),
      severity: "info",
      blocking: false,
      repairPath: null,
      repairLabel: null,
    });
  }

  const reminderPolicy = activePolicies.find((p) => p.family === "reminder_direction");
  if (reminderPolicy) {
    requirements.push({
      id: "req-reminder-direction",
      title: "Reminder direction is set by a Policy",
      explanation:
        `The Policy "${reminderPolicy.name}" states the reminder direction for prepared ` +
        `requests. Nothing is scheduled and no reminder is sent in this frontend phase.`,
      policyName: reminderPolicy.name,
      field: "remindersEnabled",
      currentValue: "Not set in this batch",
      requiredValue: policyResolved.reminderDefaults.enabled
        ? `Reminders after ${policyResolved.reminderDefaults.firstReminderDays} days, repeating every ${policyResolved.reminderDefaults.repeatIntervalDays}`
        : "Reminders off",
      severity: "info",
      blocking: false,
      repairPath: null,
      repairLabel: null,
    });
  }

  const completionPolicy = activePolicies.find((p) => p.family === "completion_behavior");
  if (completionPolicy) {
    requirements.push({
      id: "req-completion-behavior",
      title: "Completion behaviour is set by a Policy",
      explanation:
        `The Policy "${completionPolicy.name}" states what happens when a prepared request ` +
        `completes. No completed document is generated or delivered in this frontend phase.`,
      policyName: completionPolicy.name,
      field: "completionBehavior",
      currentValue: "Not set in this batch",
      requiredValue: policyResolved.completionDefaults.createVerificationRecord
        ? "Verification record intended after completion"
        : "No Verification record intended",
      severity: "info",
      blocking: false,
      repairPath: null,
      repairLabel: null,
    });
  }

  // ── Automation recommendations ─────────────────────────────────────────────
  const recommendations: AutomationRecommendation[] = simulation.projectedChanges
    .filter((c: AutoSimProjectedChange) => c.source === "rule")
    .map((c, i) => {
      // Only fields this frontend can genuinely change are applicable. Anything
      // else is reported honestly rather than pretended.
      const applicableFields = new Set(["authMethod", "consentRequired", "routingMode", "expirationDays"]);
      const applicable = applicableFields.has(c.field);
      return {
        id: `rec-${c.field}-${i}`,
        title: `${fieldLabel(c.field)} — ${displayValue(c.projectedValue)}`,
        reason: `Recommended by the Rule "${c.sourceName}" for this preparation draft.`,
        ruleName: c.sourceName,
        field: c.field,
        currentValue: displayValue(c.originalValue),
        proposedValue: displayValue(c.projectedValue),
        applicable,
        unsupportedReason: applicable
          ? null
          : "This recommendation cannot be applied from the preparation screen in this frontend phase.",
        conflictsWith: c.conflictsWith ? String(c.conflictsWith) : null,
      };
    });

  // ── Conflicts ──────────────────────────────────────────────────────────────
  //
  // Every UNRESOLVED conflict is surfaced, not only those this particular
  // simulation flagged. `simulation.conflictsDetected` is empty for most trigger
  // contexts, so filtering on it hid genuinely open conflicts — including a
  // blocking one between an active Rule and an active Policy. An unresolved
  // conflict means the resolution shown here cannot be relied on, whichever
  // trigger produced it.
  const conflictList = workflowAutomationService.listConflicts();
  const flaggedHere = new Set(simulation.conflictsDetected.map(String));
  const conflicts: ResolutionConflictView[] = conflictList.ok
    ? conflictList.data
        .filter((c) => !c.resolvedAt)
        .map((c) => ({
          id: String(c.id),
          title: c.description,
          kind: c.kind.replace(/_/g, " "),
          severity: mapSeverity(c.severity),
          // Only a conflict that actually affected THIS evaluation blocks the
          // final review. Every open conflict is still surfaced, because an
          // unresolved one means resolution cannot be fully relied on — but
          // blocking on a workspace conflict that had no bearing on this batch
          // would permanently prevent projection for reasons the user cannot
          // address from the preparation screen.
          blocking: c.severity === "error" && flaggedHere.has(String(c.id)),
          affectedThisEvaluation: flaggedHere.has(String(c.id)),
          explanation: flaggedHere.has(String(c.id))
            ? "Two active definitions propose different values for a setting this preparation "
              + "draft uses. Resolve it in Automation before relying on this preview."
            : "Two active definitions conflict in this workspace. It did not affect this "
              + "particular evaluation, but resolution cannot be fully relied on until it is resolved.",
          // Counts, not private definitions from another Team.
          sources: [
            `${c.involvedRuleIds.length} Rule(s)`,
            `${c.involvedPolicyIds.length} Policy(ies)`,
          ],
        }))
    : [];

  const skipped = simulation.skippedRuleIds.map((id) => ({
    name: "A Rule was not applied",
    reason: simulation.skippedReasons[String(id)] ?? "It did not match this preparation draft.",
  }));

  const status: ResolutionStatus =
    conflicts.some((c) => c.blocking) ? "resolved-with-conflicts"
    : requirements.length > 0 ? "resolved-with-requirements"
    : recommendations.length > 0 ? "resolved-with-recommendations"
    : "resolved-no-changes";

  return {
    ok: true,
    data: {
      status,
      inputVersion: computeInputVersion(input),
      evaluatedAtDemonstration: new Date().toISOString(),
      requirements,
      recommendations,
      conflicts,
      skipped,
      matchedRuleNames: simulation.matchedRuleNames,
      inputSummary: input,
      notice: RESOLUTION_FRONTEND_NOTICE,
    },
  };
}

// ── Recommendation application ────────────────────────────────────────────────

/**
 * Which request-default field a recommendation maps onto, if any.
 *
 * Applying a recommendation goes through the EXISTING
 * `bulkSendService.updateRequestDefaults`, so an accepted recommendation is
 * recorded as an ordinary request override with `source: "user"` — the user
 * accepted it, so it is their choice. No new mutation path is introduced and no
 * recipient row is touched.
 */
export function recommendationTargetField(rec: AutomationRecommendation): string | null {
  const map: Record<string, string> = {
    authMethod: "authMethod",
    consentRequired: "consentRequired",
    routingMode: "routingMode",
    expirationDays: "expirationDirection",
  };
  return map[rec.field] ?? null;
}

export function recommendationValue(rec: AutomationRecommendation): unknown {
  if (rec.field === "consentRequired") return rec.proposedValue === "Required";
  if (rec.field === "expirationDays") return `${rec.proposedValue} days after the request begins`;
  return rec.proposedValue;
}

/** Blocking outcomes that must stop the final review. */
export function blockingIssues(result: PreparationResolutionResult | null): number {
  if (!result) return 0;
  return result.requirements.filter((r) => r.blocking).length
       + result.conflicts.filter((c) => c.blocking).length;
}
