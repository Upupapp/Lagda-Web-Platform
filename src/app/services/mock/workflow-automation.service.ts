// Workflow Automation mock service — Command 32.
// In-memory store. No real scheduling, no real delivery, no real execution.
// All simulation results are demonstrationOnly: true.
// No Burgundy. No eNotary. No auto-signing, auth-bypass, or permission changes.

import type {
  AutoRule,
  AutoRuleId,
  AutoRuleSummary,
  AutoRuleListFilter,
  AutoPolicy,
  AutoPolicyId,
  AutoPolicyFamily,
  AutoConflict,
  AutoConflictId,
  AutoConflictListFilter,
  AutoConflictResolutionStrategy,
  AutoSimulation,
  AutoSimId,
  AutoSimTriggerContext,
  AutoActivity,
  AutoActivityId,
  AutoActivityListFilter,
  AutoOverviewStats,
  AutoValidationResult,
  AutoValidationIssue,
  AutoResult,
  AutoCondition,
  AutoAction,
  AutoTriggerKind,
  AutoRuleStatus,
  AutoRulePriority,
  AutoConflictBehavior,
  AutoConflictKind,
  AutoConflictSeverity,
  AutoActivityKind,
  AutoPolicyStatus,
} from "../../models/workflow-automation";
import {
  AUTO_ACTION_CONFIGS,
  AUTO_TRIGGER_CONFIGS,
} from "../../models/workflow-automation";

// ── ID generation ─────────────────────────────────────────────────────────────

let _seq = 1000;
function nextId(prefix: string): string {
  return `${prefix}_${++_seq}`;
}

function ruleId():     AutoRuleId     { return nextId("rule") as AutoRuleId; }
function policyId():   AutoPolicyId   { return nextId("pol")  as AutoPolicyId; }
function conflictId(): AutoConflictId { return nextId("cfl")  as AutoConflictId; }
function simId():      AutoSimId      { return nextId("sim")  as AutoSimId; }
function actId():      AutoActivityId { return nextId("act")  as AutoActivityId; }
function condId():     import("../../models/workflow-automation").AutoConditionId {
  return nextId("cond") as import("../../models/workflow-automation").AutoConditionId;
}
function actionId():   import("../../models/workflow-automation").AutoActionId {
  return nextId("actn") as import("../../models/workflow-automation").AutoActionId;
}

function now(): string {
  return new Date().toISOString();
}

function daysAgo(n: number): string {
  const d = new Date();
  d.setDate(d.getDate() - n);
  return d.toISOString();
}

// ── Fixture data ──────────────────────────────────────────────────────────────

const FIXTURE_RULES: AutoRule[] = [
  {
    id: "rule_001" as AutoRuleId,
    name: "Apply 'Urgent' tag on completion",
    description: "When any transaction completes, apply the Urgent tag to the finished document.",
    status: "active-demonstration",
    trigger: "transaction_completed",
    conditionLogic: "all",
    conditions: [],
    actions: [
      {
        id: "actn_001" as import("../../models/workflow-automation").AutoActionId,
        kind: "assign_tag",
        params: { tagId: "tag_001" },
        label: "Apply tag: Urgent",
      },
    ],
    priority: "normal",
    conflictBehavior: "use_highest_priority",
    scope: "workspace",
    createdAt: daysAgo(14),
    updatedAt: daysAgo(2),
    createdBy: "Demo User",
    lastFiredAt: daysAgo(1),
    firingCount: 12,
    demonstrationOnly: true,
  },
  {
    id: "rule_002" as AutoRuleId,
    name: "Default reminders for all transactions",
    description: "Pre-fill first reminder at 2 days, repeat every 5 days for all new transactions.",
    status: "active-demonstration",
    trigger: "transaction_created",
    conditionLogic: "all",
    conditions: [],
    actions: [
      {
        id: "actn_002" as import("../../models/workflow-automation").AutoActionId,
        kind: "set_reminder_defaults",
        params: { enabled: true, firstReminderDays: 2, repeatIntervalDays: 5 },
        label: "Set reminder: 2 days first, repeat every 5",
      },
    ],
    priority: "high",
    conflictBehavior: "use_highest_priority",
    scope: "workspace",
    createdAt: daysAgo(21),
    updatedAt: daysAgo(7),
    createdBy: "Demo User",
    lastFiredAt: daysAgo(0),
    firingCount: 34,
    demonstrationOnly: true,
  },
  {
    id: "rule_003" as AutoRuleId,
    name: "File completed docs in Archive folder",
    description: "Move completed transactions to the Archive folder automatically.",
    status: "active-demonstration",
    trigger: "transaction_completed",
    conditionLogic: "all",
    conditions: [],
    actions: [
      {
        id: "actn_003" as import("../../models/workflow-automation").AutoActionId,
        kind: "assign_folder",
        params: { folderId: "folder_002" },
        label: "Assign folder: Archive",
      },
    ],
    priority: "normal",
    conflictBehavior: "merge_non_conflicting",
    scope: "workspace",
    createdAt: daysAgo(10),
    updatedAt: daysAgo(5),
    createdBy: "Demo User",
    lastFiredAt: daysAgo(1),
    firingCount: 8,
    demonstrationOnly: true,
  },
  {
    id: "rule_004" as AutoRuleId,
    name: "Require SMS OTP for high-value signers",
    description: "When a signer is added, recommend SMS OTP as minimum authentication.",
    status: "conflict-detected",
    trigger: "transaction_sent",
    conditionLogic: "all",
    conditions: [
      {
        id: "cond_004" as import("../../models/workflow-automation").AutoConditionId,
        field: "participant_count",
        operator: "greater_than",
        value: 1,
        label: "Participant count > 1",
      },
    ],
    actions: [
      {
        id: "actn_004" as import("../../models/workflow-automation").AutoActionId,
        kind: "require_auth_method",
        params: { participantRole: "signer", minAuthMethod: "sms_otp" },
        label: "Require SMS OTP for signers",
      },
    ],
    priority: "high",
    conflictBehavior: "use_highest_priority",
    scope: "workspace",
    createdAt: daysAgo(5),
    updatedAt: daysAgo(1),
    createdBy: "Demo User",
    lastFiredAt: null,
    firingCount: 0,
    demonstrationOnly: true,
  },
  {
    id: "rule_005" as AutoRuleId,
    name: "Flag declined transactions for review",
    description: "When a participant declines, flag the transaction and add an activity note.",
    status: "active-demonstration",
    trigger: "participant_declined",
    conditionLogic: "all",
    conditions: [],
    actions: [
      {
        id: "actn_005" as import("../../models/workflow-automation").AutoActionId,
        kind: "flag_for_review",
        params: { reason: "Participant declined to sign" },
        label: "Flag for review",
      },
      {
        id: "actn_006" as import("../../models/workflow-automation").AutoActionId,
        kind: "add_activity_note",
        params: { note: "Participant declined — manual follow-up may be needed." },
        label: "Add activity note",
      },
    ],
    priority: "critical",
    conflictBehavior: "proceed_anyway",
    scope: "workspace",
    createdAt: daysAgo(8),
    updatedAt: daysAgo(3),
    createdBy: "Demo User",
    lastFiredAt: daysAgo(2),
    firingCount: 3,
    demonstrationOnly: true,
  },
  {
    id: "rule_006" as AutoRuleId,
    name: "Enable verification records",
    description: "Ensure all completed transactions generate a verification record.",
    status: "draft",
    trigger: "transaction_completed",
    conditionLogic: "all",
    conditions: [],
    actions: [
      {
        id: "actn_007" as import("../../models/workflow-automation").AutoActionId,
        kind: "set_completion_defaults",
        params: {
          notifySenderOnComplete: true,
          sendCompletionCopyToParticipants: true,
          sendCompletionCopyToCCRecipients: false,
          allowParticipantDownload: true,
          createVerificationRecord: true,
        },
        label: "Set completion defaults (verification on)",
      },
    ],
    priority: "normal",
    conflictBehavior: "use_highest_priority",
    scope: "workspace",
    createdAt: daysAgo(3),
    updatedAt: daysAgo(3),
    createdBy: "Demo User",
    lastFiredAt: null,
    firingCount: 0,
    demonstrationOnly: true,
  },
];

const FIXTURE_POLICIES: AutoPolicy[] = [
  {
    id: "pol_001" as AutoPolicyId,
    family: "request_defaults",
    name: "Workspace Request Defaults",
    description: "Default invitation subject and sender name for all new transactions.",
    status: "active",
    settings: {
      invitationSubject: "Please review and sign: {title}",
      senderDisplayName: "LAGDA Signing Service",
    },
    scope: "workspace",
    createdAt: daysAgo(30),
    updatedAt: daysAgo(10),
    demonstrationOnly: true,
  },
  {
    id: "pol_002" as AutoPolicyId,
    family: "participant_security",
    name: "Participant Security Policy",
    description: "Minimum authentication recommendations by participant role.",
    status: "active",
    settings: {
      signerMinAuth: "email_otp",
      approverMinAuth: "email_otp",
      ccMinAuth: "none",
    },
    scope: "workspace",
    createdAt: daysAgo(30),
    updatedAt: daysAgo(7),
    demonstrationOnly: true,
  },
  {
    id: "pol_003" as AutoPolicyId,
    family: "reminder_direction",
    name: "Reminder Direction Policy",
    description: "Default reminder settings pre-filled in Prepare workflow.",
    status: "conflict-detected",
    settings: {
      remindersEnabled: true,
      firstReminderDays: 3,
      repeatIntervalDays: 7,
    },
    scope: "workspace",
    createdAt: daysAgo(30),
    updatedAt: daysAgo(1),
    demonstrationOnly: true,
  },
  {
    id: "pol_004" as AutoPolicyId,
    family: "completion_behavior",
    name: "Completion Behavior Policy",
    description: "Default completion settings for all transactions.",
    status: "active",
    settings: {
      notifySenderOnComplete: true,
      sendCompletionCopyToParticipants: true,
      sendCompletionCopyToCCRecipients: true,
      allowParticipantDownload: true,
      createVerificationRecord: true,
    },
    scope: "workspace",
    createdAt: daysAgo(30),
    updatedAt: daysAgo(14),
    demonstrationOnly: true,
  },
  {
    id: "pol_005" as AutoPolicyId,
    family: "organization",
    name: "Organization Policy",
    description: "Default folder and tag assignments for completed documents.",
    status: "inactive",
    settings: {
      defaultFolderId: null,
      defaultTagId: null,
    },
    scope: "workspace",
    createdAt: daysAgo(30),
    updatedAt: daysAgo(30),
    demonstrationOnly: true,
  },
];

const FIXTURE_CONFLICTS: AutoConflict[] = [
  {
    id: "cfl_001" as AutoConflictId,
    severity: "warning" as AutoConflictSeverity,
    kind: "parameter_value_collision" as AutoConflictKind,
    description: "Rule 'Default reminders for all transactions' sets firstReminderDays=2, but Reminder Direction Policy sets firstReminderDays=3. Both apply to the transaction_created trigger.",
    involvedRuleIds: ["rule_002" as AutoRuleId],
    involvedPolicyIds: ["pol_003" as AutoPolicyId],
    detectedAt: daysAgo(1),
    resolvedAt: null,
    resolution: null,
    demonstrationOnly: true,
  },
  {
    id: "cfl_002" as AutoConflictId,
    severity: "error" as AutoConflictSeverity,
    kind: "action_type_collision" as AutoConflictKind,
    description: "Rule 'Require SMS OTP for high-value signers' conflicts with Participant Security Policy which recommends email_otp for signers. Both target the signer minimum auth method.",
    involvedRuleIds: ["rule_004" as AutoRuleId],
    involvedPolicyIds: ["pol_002" as AutoPolicyId],
    detectedAt: daysAgo(1),
    resolvedAt: null,
    resolution: null,
    demonstrationOnly: true,
  },
];

const FIXTURE_ACTIVITY: AutoActivity[] = [
  {
    id: "act_001" as AutoActivityId,
    kind: "rule_activated",
    title: "Rule activated",
    detail: "Rule 'Apply Urgent tag on completion' was set to Active in Demonstration.",
    relatedRuleId: "rule_001" as AutoRuleId,
    performedBy: "Demo User",
    occurredAt: daysAgo(2),
    demonstrationOnly: true,
  },
  {
    id: "act_002" as AutoActivityId,
    kind: "conflict_detected",
    title: "Conflict detected",
    detail: "Parameter value collision between Rule 002 and Reminder Direction Policy.",
    relatedRuleId: "rule_002" as AutoRuleId,
    relatedPolicyId: "pol_003" as AutoPolicyId,
    relatedConflictId: "cfl_001" as AutoConflictId,
    performedBy: "System (Demonstration)",
    occurredAt: daysAgo(1),
    demonstrationOnly: true,
  },
  {
    id: "act_003" as AutoActivityId,
    kind: "rule_fired_simulated",
    title: "Rule fired (simulated)",
    detail: "Rule 'Flag declined transactions for review' fired on simulated participant_declined event.",
    relatedRuleId: "rule_005" as AutoRuleId,
    performedBy: "Demo User",
    occurredAt: daysAgo(2),
    demonstrationOnly: true,
  },
  {
    id: "act_004" as AutoActivityId,
    kind: "policy_updated",
    title: "Policy updated",
    detail: "Completion Behavior Policy was updated — createVerificationRecord set to true.",
    relatedPolicyId: "pol_004" as AutoPolicyId,
    performedBy: "Demo User",
    occurredAt: daysAgo(7),
    demonstrationOnly: true,
  },
  {
    id: "act_005" as AutoActivityId,
    kind: "rule_created",
    title: "Rule created",
    detail: "Rule 'Flag declined transactions for review' was created.",
    relatedRuleId: "rule_005" as AutoRuleId,
    performedBy: "Demo User",
    occurredAt: daysAgo(8),
    demonstrationOnly: true,
  },
];

// ── In-memory stores ──────────────────────────────────────────────────────────

let _rules:     AutoRule[]     = [...FIXTURE_RULES];
let _policies:  AutoPolicy[]   = [...FIXTURE_POLICIES];
let _conflicts: AutoConflict[] = [...FIXTURE_CONFLICTS];
let _sims:      AutoSimulation[] = [];
let _activity:  AutoActivity[] = [...FIXTURE_ACTIVITY];

// ── Helpers ───────────────────────────────────────────────────────────────────

function toSummary(rule: AutoRule): AutoRuleSummary {
  const hasConflicts = _conflicts.some(
    c => c.resolvedAt === null && c.involvedRuleIds.includes(rule.id)
  );
  return {
    id: rule.id,
    name: rule.name,
    status: rule.status,
    trigger: rule.trigger,
    priority: rule.priority,
    conditionCount: rule.conditions.length,
    actionCount: rule.actions.length,
    lastFiredAt: rule.lastFiredAt,
    firingCount: rule.firingCount,
    hasConflicts,
    demonstrationOnly: true,
  };
}

function addActivity(
  kind: AutoActivityKind,
  title: string,
  detail: string,
  extras: Partial<AutoActivity> = {},
): void {
  _activity = [
    {
      id: actId(),
      kind,
      title,
      detail,
      performedBy: "Demo User",
      occurredAt: now(),
      demonstrationOnly: true,
      ...extras,
    },
    ..._activity,
  ];
}

function err(code: string, message: string): { ok: false; error: { code: string; message: string } } {
  return { ok: false, error: { code, message } };
}

// ── Validation engine ─────────────────────────────────────────────────────────

function validateRule(
  name: string,
  trigger: AutoTriggerKind | null,
  conditions: AutoCondition[],
  actions: AutoAction[],
): AutoValidationResult {
  const issues: AutoValidationIssue[] = [];
  let idx = 0;

  if (!name.trim()) {
    issues.push({ id: `vi_${++idx}`, field: "name", severity: "error", code: "REQUIRED", message: "Rule name is required." });
  }
  if (!trigger) {
    issues.push({ id: `vi_${++idx}`, field: "trigger", severity: "error", code: "REQUIRED", message: "A trigger must be selected." });
  }
  if (actions.length === 0) {
    issues.push({ id: `vi_${++idx}`, field: "actions", severity: "error", code: "NO_ACTIONS", message: "At least one action is required." });
  }

  for (const action of actions) {
    const cfg = AUTO_ACTION_CONFIGS[action.kind];
    if (!cfg) {
      issues.push({ id: `vi_${++idx}`, field: `action_${action.id}`, severity: "error", code: "UNKNOWN_ACTION", message: `Unknown action kind: ${action.kind}` });
      continue;
    }
    for (const param of cfg.paramSchema) {
      if (param.required && (action.params[param.key] === null || action.params[param.key] === undefined || action.params[param.key] === "")) {
        issues.push({ id: `vi_${++idx}`, field: `action_${action.id}_${param.key}`, severity: "error", code: "PARAM_REQUIRED", message: `Action "${cfg.label}": ${param.label} is required.` });
      }
    }
  }

  // Warn about no conditions (rule applies universally)
  if (conditions.length === 0 && actions.length > 0) {
    issues.push({ id: `vi_${++idx}`, field: "conditions", severity: "warning", code: "NO_CONDITIONS", message: "No conditions set — this rule will fire for every matching trigger." });
  }

  return { valid: issues.filter(i => i.severity === "error").length === 0, issues };
}

// ── Conflict detector ─────────────────────────────────────────────────────────

function detectConflicts(): AutoConflict[] {
  const detected: AutoConflict[] = [];

  const activeRules = _rules.filter(r =>
    r.status === "active-demonstration" || r.status === "conflict-detected"
  );

  // Check pairs of active rules for action-type collision on same trigger
  for (let i = 0; i < activeRules.length; i++) {
    for (let j = i + 1; j < activeRules.length; j++) {
      const a = activeRules[i]!;
      const b = activeRules[j]!;
      if (a.trigger !== b.trigger) continue;

      for (const actionA of a.actions) {
        for (const actionB of b.actions) {
          if (actionA.kind !== actionB.kind) continue;
          // Same action kind on same trigger: collision
          const alreadyExists = _conflicts.some(
            c => c.involvedRuleIds.includes(a.id) && c.involvedRuleIds.includes(b.id) && c.kind === "action_type_collision"
          );
          if (!alreadyExists) {
            detected.push({
              id: conflictId(),
              severity: "warning",
              kind: "action_type_collision",
              description: `Rules "${a.name}" and "${b.name}" both perform "${actionA.kind}" on the "${a.trigger}" trigger.`,
              involvedRuleIds: [a.id, b.id],
              involvedPolicyIds: [],
              detectedAt: now(),
              resolvedAt: null,
              resolution: null,
              demonstrationOnly: true,
            });
          }
        }
      }
    }
  }

  // Check rules vs policies for parameter collision
  for (const rule of activeRules) {
    for (const action of rule.actions) {
      if (action.kind === "set_reminder_defaults") {
        const reminderPolicy = _policies.find(p => p.family === "reminder_direction" && p.status === "active");
        if (reminderPolicy) {
          const rDays = action.params["firstReminderDays"] as number;
          const pDays = reminderPolicy.settings["firstReminderDays"] as number;
          if (rDays !== pDays) {
            const alreadyExists = _conflicts.some(
              c => c.involvedRuleIds.includes(rule.id) && c.involvedPolicyIds.includes(reminderPolicy.id) && c.kind === "parameter_value_collision"
            );
            if (!alreadyExists) {
              detected.push({
                id: conflictId(),
                severity: "warning",
                kind: "parameter_value_collision",
                description: `Rule "${rule.name}" sets firstReminderDays=${rDays}, but Reminder Direction Policy sets firstReminderDays=${pDays}.`,
                involvedRuleIds: [rule.id],
                involvedPolicyIds: [reminderPolicy.id],
                detectedAt: now(),
                resolvedAt: null,
                resolution: null,
                demonstrationOnly: true,
              });
            }
          }
        }
      }

      if (action.kind === "require_auth_method") {
        const secPolicy = _policies.find(p => p.family === "participant_security" && p.status === "active");
        if (secPolicy) {
          const role = action.params["participantRole"] as string;
          const ruleAuth = action.params["minAuthMethod"] as string;
          const policyAuth = secPolicy.settings[`${role}MinAuth`] as string | undefined;
          if (policyAuth && ruleAuth !== policyAuth) {
            const alreadyExists = _conflicts.some(
              c => c.involvedRuleIds.includes(rule.id) && c.involvedPolicyIds.includes(secPolicy.id) && c.kind === "action_type_collision"
            );
            if (!alreadyExists) {
              detected.push({
                id: conflictId(),
                severity: "error",
                kind: "action_type_collision",
                description: `Rule "${rule.name}" requires ${ruleAuth} for ${role}, but Participant Security Policy recommends ${policyAuth}.`,
                involvedRuleIds: [rule.id],
                involvedPolicyIds: [secPolicy.id],
                detectedAt: now(),
                resolvedAt: null,
                resolution: null,
                demonstrationOnly: true,
              });
            }
          }
        }
      }
    }
  }

  return detected;
}

function syncConflicts(): void {
  const newConflicts = detectConflicts();
  _conflicts = [..._conflicts, ...newConflicts];

  // Update rule statuses for conflict-detected rules
  const conflictedRuleIds = new Set(
    _conflicts.filter(c => c.resolvedAt === null).flatMap(c => c.involvedRuleIds)
  );
  _rules = _rules.map(r => {
    if (r.status === "active-demonstration" && conflictedRuleIds.has(r.id)) {
      return { ...r, status: "conflict-detected" as AutoRuleStatus };
    }
    if (r.status === "conflict-detected" && !conflictedRuleIds.has(r.id)) {
      return { ...r, status: "active-demonstration" as AutoRuleStatus };
    }
    return r;
  });

  // Update policy statuses
  const conflictedPolicyIds = new Set(
    _conflicts.filter(c => c.resolvedAt === null).flatMap(c => c.involvedPolicyIds)
  );
  _policies = _policies.map(p => {
    if (p.status === "active" && conflictedPolicyIds.has(p.id)) {
      return { ...p, status: "conflict-detected" as AutoPolicyStatus };
    }
    if (p.status === "conflict-detected" && !conflictedPolicyIds.has(p.id)) {
      return { ...p, status: "active" as AutoPolicyStatus };
    }
    return p;
  });
}

// ── Simulation engine ─────────────────────────────────────────────────────────

function runSimulation(ctx: AutoSimTriggerContext): AutoSimulation {
  const matchedRules: AutoRule[] = [];
  const skippedRuleIds: AutoRuleId[] = [];
  const skippedReasons: Record<string, string> = {};

  // Find eligible rules for this trigger
  const eligible = _rules.filter(r =>
    r.trigger === ctx.triggerKind &&
    (r.status === "active-demonstration" || r.status === "conflict-detected")
  );

  // Evaluate conditions for each rule
  for (const rule of eligible) {
    if (rule.conditions.length === 0) {
      matchedRules.push(rule);
      continue;
    }

    const results = rule.conditions.map(cond => evaluateCondition(cond, ctx));
    const matched = rule.conditionLogic === "all"
      ? results.every(Boolean)
      : results.some(Boolean);

    if (matched) {
      matchedRules.push(rule);
    } else {
      skippedRuleIds.push(rule.id);
      skippedReasons[rule.id] = "Conditions not met";
    }
  }

  // Sort matched rules by priority
  const priorityOrder: Record<AutoRulePriority, number> = { critical: 4, high: 3, normal: 2, low: 1 };
  matchedRules.sort((a, b) => priorityOrder[b.priority] - priorityOrder[a.priority]);

  // Project changes from matched rules
  const projectedChanges: AutoSimulation["projectedChanges"] = [];
  const projectedNotifications: string[] = [];
  const projectedActivityNotes: string[] = [];
  const conflictsDetected: AutoConflictId[] = [];

  // Detect conflicts among matched rules
  const actionKindSeen = new Map<string, AutoRule>();
  for (const rule of matchedRules) {
    for (const action of rule.actions) {
      const existing = actionKindSeen.get(action.kind);
      if (existing) {
        const conflict = _conflicts.find(
          c => c.involvedRuleIds.includes(rule.id) && c.involvedRuleIds.includes(existing.id)
        );
        if (conflict) conflictsDetected.push(conflict.id);

        // Apply conflict behavior
        let resolveStrategy: AutoConflictBehavior = "use_highest_priority";
        if (rule.conflictBehavior === "abort") {
          skippedRuleIds.push(rule.id);
          skippedReasons[rule.id] = `Aborted due to conflict with "${existing.name}"`;
          continue;
        }
        if (rule.conflictBehavior === "merge_non_conflicting") {
          resolveStrategy = "merge_non_conflicting";
        }
        // For use_highest_priority: existing (higher priority) wins — skip current action
        if (resolveStrategy === "use_highest_priority") continue;
      } else {
        actionKindSeen.set(action.kind, rule);
      }

      // Generate projected changes
      const changes = projectActionChanges(action, rule);
      projectedChanges.push(...changes);

      if (action.kind === "add_activity_note") {
        projectedActivityNotes.push(action.params["note"] as string ?? "");
      }
      if (action.kind === "flag_for_review") {
        projectedNotifications.push(`Transaction flagged for review: ${action.params["reason"] ?? ""}`);
      }
    }
  }

  const sim: AutoSimulation = {
    id: simId(),
    triggerContext: ctx,
    matchedRuleIds: matchedRules.map(r => r.id),
    matchedRuleNames: matchedRules.map(r => r.name),
    skippedRuleIds,
    skippedReasons,
    projectedChanges,
    conflictsDetected,
    resolvedBy: conflictsDetected.length > 0 ? "use_highest_priority" : null,
    projectedNotifications,
    projectedActivityNotes,
    createdAt: now(),
    demonstrationOnly: true,
  };

  _sims = [sim, ..._sims.slice(0, 49)];
  return sim;
}

function evaluateCondition(
  cond: AutoCondition,
  ctx: AutoSimTriggerContext,
): boolean {
  const contextValue = getContextValue(cond.field, ctx);

  switch (cond.operator) {
    case "equals":        return String(contextValue) === String(cond.value);
    case "not_equals":    return String(contextValue) !== String(cond.value);
    case "contains":      return typeof contextValue === "string" && contextValue.toLowerCase().includes(String(cond.value).toLowerCase());
    case "not_contains":  return typeof contextValue === "string" && !contextValue.toLowerCase().includes(String(cond.value).toLowerCase());
    case "starts_with":   return typeof contextValue === "string" && contextValue.toLowerCase().startsWith(String(cond.value).toLowerCase());
    case "greater_than":  return Number(contextValue) > Number(cond.value);
    case "less_than":     return Number(contextValue) < Number(cond.value);
    case "is_set":        return contextValue !== null && contextValue !== undefined && contextValue !== "";
    case "is_not_set":    return contextValue === null || contextValue === undefined || contextValue === "";
    case "in_list":       return Array.isArray(cond.value) && cond.value.includes(String(contextValue));
    default:              return false;
  }
}

function getContextValue(
  field: AutoCondition["field"],
  ctx: AutoSimTriggerContext,
): string | number | null {
  switch (field) {
    case "transaction_title":    return ctx.transactionTitle ?? null;
    case "template_name":        return ctx.templateName ?? null;
    case "participant_count":    return ctx.participantCount ?? null;
    case "participant_role":     return ctx.participantRole ?? null;
    case "auth_method_used":     return ctx.authMethodUsed ?? null;
    case "sender_role":          return ctx.senderRole ?? null;
    case "folder_name":          return ctx.folderName ?? null;
    case "tag_name":             return ctx.tagName ?? null;
    case "template_used":        return ctx.templateName ? "yes" : "no";
    case "transaction_type":     return "standard";
    case "completion_time_days": return 3;
    case "reminder_number":      return 1;
    case "file_type":            return "pdf";
    case "folder_scope":         return "workspace";
    default:                     return null;
  }
}

function projectActionChanges(
  action: AutoAction,
  rule: AutoRule,
): AutoSimulation["projectedChanges"] {
  switch (action.kind) {
    case "set_reminder_defaults":
      return [
        { field: "settings.reminders.enabled", originalValue: true, projectedValue: action.params["enabled"] ?? true, source: "rule", sourceId: rule.id, sourceName: rule.name },
        { field: "settings.reminders.firstReminderDays", originalValue: 3, projectedValue: action.params["firstReminderDays"] ?? 3, source: "rule", sourceId: rule.id, sourceName: rule.name },
        { field: "settings.reminders.repeatIntervalDays", originalValue: 7, projectedValue: action.params["repeatIntervalDays"] ?? 7, source: "rule", sourceId: rule.id, sourceName: rule.name },
      ];
    case "set_expiration_default":
      return [
        { field: "settings.expiration.enabled", originalValue: false, projectedValue: action.params["enabled"] ?? false, source: "rule", sourceId: rule.id, sourceName: rule.name },
        { field: "settings.expiration.daysFromSend", originalValue: null, projectedValue: action.params["daysFromSend"] ?? null, source: "rule", sourceId: rule.id, sourceName: rule.name },
      ];
    case "set_completion_defaults":
      return Object.keys(action.params).map(k => ({
        field: `settings.completion.${k}`,
        originalValue: true,
        projectedValue: action.params[k] ?? null,
        source: "rule" as const,
        sourceId: rule.id,
        sourceName: rule.name,
      }));
    case "assign_folder":
      return [
        { field: "document.folderId", originalValue: null, projectedValue: action.params["folderId"] ?? null, source: "rule", sourceId: rule.id, sourceName: rule.name },
      ];
    case "assign_tag":
      return [
        { field: "document.tags", originalValue: "[]", projectedValue: `+tag:${action.params["tagId"] ?? ""}`, source: "rule", sourceId: rule.id, sourceName: rule.name },
      ];
    case "set_invitation_subject":
      return [
        { field: "settings.invitation.subject", originalValue: "Please review and sign {title}", projectedValue: action.params["subject"] ?? "", source: "rule", sourceId: rule.id, sourceName: rule.name },
      ];
    case "require_auth_method":
      return [
        { field: `participant.${action.params["participantRole"] ?? "signer"}.minAuth`, originalValue: "none", projectedValue: action.params["minAuthMethod"] ?? "email_otp", source: "rule", sourceId: rule.id, sourceName: rule.name },
      ];
    case "flag_for_review":
      return [
        { field: "transaction.reviewFlag", originalValue: null, projectedValue: action.params["reason"] ?? "Flagged", source: "rule", sourceId: rule.id, sourceName: rule.name },
      ];
    case "add_activity_note":
      return [
        { field: "activityLog.note", originalValue: null, projectedValue: action.params["note"] ?? "", source: "rule", sourceId: rule.id, sourceName: rule.name },
      ];
    default:
      return [];
  }
}

// ── Service API ───────────────────────────────────────────────────────────────

export const workflowAutomationService = {

  // Rules

  listRules(filter?: AutoRuleListFilter): AutoResult<AutoRuleSummary[]> {
    let rules = _rules.slice();
    if (filter?.status) rules = rules.filter(r => r.status === filter.status);
    if (filter?.trigger) rules = rules.filter(r => r.trigger === filter.trigger);
    if (filter?.priority) rules = rules.filter(r => r.priority === filter.priority);
    if (filter?.query) {
      const q = filter.query.toLowerCase();
      rules = rules.filter(r => r.name.toLowerCase().includes(q) || r.description.toLowerCase().includes(q));
    }
    return { ok: true, data: rules.map(toSummary) };
  },

  getRule(id: AutoRuleId): AutoResult<AutoRule> {
    const rule = _rules.find(r => r.id === id);
    if (!rule) return err("NOT_FOUND", "Rule not found.");
    return { ok: true, data: rule };
  },

  createRule(input: {
    name: string;
    description: string;
    trigger: AutoTriggerKind;
    conditionLogic: AutoRule["conditionLogic"];
    conditions: AutoCondition[];
    actions: AutoAction[];
    priority: AutoRulePriority;
    conflictBehavior: AutoConflictBehavior;
    scope: AutoRule["scope"];
  }): AutoResult<AutoRule> {
    const validation = validateRule(input.name, input.trigger, input.conditions, input.actions);
    if (!validation.valid) {
      return err("VALIDATION_FAILED", validation.issues.filter(i => i.severity === "error").map(i => i.message).join(" "));
    }
    const rule: AutoRule = {
      id: ruleId(),
      name: input.name.trim(),
      description: input.description.trim(),
      status: "draft",
      trigger: input.trigger,
      conditionLogic: input.conditionLogic,
      conditions: input.conditions,
      actions: input.actions,
      priority: input.priority,
      conflictBehavior: input.conflictBehavior,
      scope: input.scope,
      createdAt: now(),
      updatedAt: now(),
      createdBy: "Demo User",
      lastFiredAt: null,
      firingCount: 0,
      demonstrationOnly: true,
    };
    _rules = [..._rules, rule];
    addActivity("rule_created", "Rule created", `Rule "${rule.name}" was created.`, { relatedRuleId: rule.id });
    syncConflicts();
    return { ok: true, data: rule };
  },

  updateRule(id: AutoRuleId, patch: Partial<{
    name: string;
    description: string;
    trigger: AutoTriggerKind;
    conditionLogic: AutoRule["conditionLogic"];
    conditions: AutoCondition[];
    actions: AutoAction[];
    priority: AutoRulePriority;
    conflictBehavior: AutoConflictBehavior;
    scope: AutoRule["scope"];
  }>): AutoResult<AutoRule> {
    const idx = _rules.findIndex(r => r.id === id);
    if (idx === -1) return err("NOT_FOUND", "Rule not found.");
    const existing = _rules[idx]!;
    const updated = { ...existing, ...patch, updatedAt: now() };
    const validation = validateRule(updated.name, updated.trigger, updated.conditions, updated.actions);
    if (!validation.valid) {
      return err("VALIDATION_FAILED", validation.issues.filter(i => i.severity === "error").map(i => i.message).join(" "));
    }
    _rules = [..._rules.slice(0, idx), updated, ..._rules.slice(idx + 1)];
    addActivity("rule_updated", "Rule updated", `Rule "${updated.name}" was updated.`, { relatedRuleId: id });
    syncConflicts();
    return { ok: true, data: updated };
  },

  validateRule(name: string, trigger: AutoTriggerKind | null, conditions: AutoCondition[], actions: AutoAction[]): AutoValidationResult {
    return validateRule(name, trigger, conditions, actions);
  },

  activateRule(id: AutoRuleId): AutoResult<AutoRule> {
    const idx = _rules.findIndex(r => r.id === id);
    if (idx === -1) return err("NOT_FOUND", "Rule not found.");
    const rule = _rules[idx]!;
    if (rule.status === "archived") return err("ARCHIVED", "Archived rules cannot be activated. Restore first.");
    const validation = validateRule(rule.name, rule.trigger, rule.conditions, rule.actions);
    if (!validation.valid) return err("INVALID", "Rule has validation errors and cannot be activated.");
    const updated = { ...rule, status: "active-demonstration" as AutoRuleStatus, updatedAt: now() };
    _rules = [..._rules.slice(0, idx), updated, ..._rules.slice(idx + 1)];
    addActivity("rule_activated", "Rule activated", `Rule "${rule.name}" was set to Active in Demonstration.`, { relatedRuleId: id });
    syncConflicts();
    return { ok: true, data: updated };
  },

  pauseRule(id: AutoRuleId): AutoResult<AutoRule> {
    const idx = _rules.findIndex(r => r.id === id);
    if (idx === -1) return err("NOT_FOUND", "Rule not found.");
    const rule = _rules[idx]!;
    const updated = { ...rule, status: "paused" as AutoRuleStatus, updatedAt: now() };
    _rules = [..._rules.slice(0, idx), updated, ..._rules.slice(idx + 1)];
    addActivity("rule_paused", "Rule paused", `Rule "${rule.name}" was paused.`, { relatedRuleId: id });
    syncConflicts();
    return { ok: true, data: updated };
  },

  archiveRule(id: AutoRuleId): AutoResult<AutoRule> {
    const idx = _rules.findIndex(r => r.id === id);
    if (idx === -1) return err("NOT_FOUND", "Rule not found.");
    const rule = _rules[idx]!;
    const updated = { ...rule, status: "archived" as AutoRuleStatus, updatedAt: now() };
    _rules = [..._rules.slice(0, idx), updated, ..._rules.slice(idx + 1)];
    addActivity("rule_archived", "Rule archived", `Rule "${rule.name}" was archived.`, { relatedRuleId: id });
    syncConflicts();
    return { ok: true, data: updated };
  },

  restoreRule(id: AutoRuleId): AutoResult<AutoRule> {
    const idx = _rules.findIndex(r => r.id === id);
    if (idx === -1) return err("NOT_FOUND", "Rule not found.");
    const rule = _rules[idx]!;
    if (rule.status !== "archived") return err("NOT_ARCHIVED", "Only archived rules can be restored.");
    const updated = { ...rule, status: "draft" as AutoRuleStatus, updatedAt: now() };
    _rules = [..._rules.slice(0, idx), updated, ..._rules.slice(idx + 1)];
    addActivity("rule_restored", "Rule restored", `Rule "${rule.name}" was restored to Draft.`, { relatedRuleId: id });
    return { ok: true, data: updated };
  },

  duplicateRule(id: AutoRuleId): AutoResult<AutoRule> {
    const source = _rules.find(r => r.id === id);
    if (!source) return err("NOT_FOUND", "Rule not found.");
    const copy: AutoRule = {
      ...source,
      id: ruleId(),
      name: `Copy of ${source.name}`,
      status: "draft",
      firingCount: 0,
      lastFiredAt: null,
      createdAt: now(),
      updatedAt: now(),
      demonstrationOnly: true,
    };
    _rules = [..._rules, copy];
    addActivity("rule_duplicated", "Rule duplicated", `Rule "${source.name}" was duplicated.`, { relatedRuleId: copy.id });
    return { ok: true, data: copy };
  },

  removeRule(id: AutoRuleId): AutoResult<void> {
    const rule = _rules.find(r => r.id === id);
    if (!rule) return err("NOT_FOUND", "Rule not found.");
    if (rule.status === "active-demonstration") return err("ACTIVE", "Active rules cannot be removed. Archive or pause first.");
    _rules = _rules.filter(r => r.id !== id);
    _conflicts = _conflicts.filter(c => !c.involvedRuleIds.includes(id));
    addActivity("rule_removed", "Rule removed", `Rule "${rule.name}" was permanently removed.`);
    return { ok: true, data: undefined };
  },

  // Simulation

  runSimulation(ctx: AutoSimTriggerContext): AutoResult<AutoSimulation> {
    const sim = runSimulation(ctx);
    addActivity("simulation_run", "Simulation run", `Simulation for trigger "${ctx.triggerKind}" completed — ${sim.matchedRuleIds.length} rule(s) matched.`, { relatedSimId: sim.id });
    return { ok: true, data: sim };
  },

  getSimulation(id: AutoSimId): AutoResult<AutoSimulation> {
    const sim = _sims.find(s => s.id === id);
    if (!sim) return err("NOT_FOUND", "Simulation not found.");
    return { ok: true, data: sim };
  },

  listSimulations(): AutoResult<AutoSimulation[]> {
    return { ok: true, data: _sims.slice(0, 20) };
  },

  // Policies

  listPolicies(): AutoResult<AutoPolicy[]> {
    return { ok: true, data: _policies.slice() };
  },

  getPolicy(id: AutoPolicyId): AutoResult<AutoPolicy> {
    const policy = _policies.find(p => p.id === id);
    if (!policy) return err("NOT_FOUND", "Policy not found.");
    return { ok: true, data: policy };
  },

  getPolicyByFamily(family: AutoPolicyFamily): AutoResult<AutoPolicy> {
    const policy = _policies.find(p => p.family === family);
    if (!policy) return err("NOT_FOUND", `Policy for family "${family}" not found.`);
    return { ok: true, data: policy };
  },

  updatePolicy(id: AutoPolicyId, settings: Record<string, string | number | boolean | null>): AutoResult<AutoPolicy> {
    const idx = _policies.findIndex(p => p.id === id);
    if (idx === -1) return err("NOT_FOUND", "Policy not found.");
    const existing = _policies[idx]!;
    const updated: AutoPolicy = { ...existing, settings: { ...existing.settings, ...settings }, updatedAt: now() };
    _policies = [..._policies.slice(0, idx), updated, ..._policies.slice(idx + 1)];
    addActivity("policy_updated", "Policy updated", `Policy "${updated.name}" was updated.`, { relatedPolicyId: id });
    syncConflicts();
    return { ok: true, data: updated };
  },

  setPolicyStatus(id: AutoPolicyId, status: AutoPolicyStatus): AutoResult<AutoPolicy> {
    const idx = _policies.findIndex(p => p.id === id);
    if (idx === -1) return err("NOT_FOUND", "Policy not found.");
    const existing = _policies[idx]!;
    const updated: AutoPolicy = { ...existing, status, updatedAt: now() };
    _policies = [..._policies.slice(0, idx), updated, ..._policies.slice(idx + 1)];
    addActivity("policy_updated", "Policy status changed", `Policy "${updated.name}" status set to ${status}.`, { relatedPolicyId: id });
    syncConflicts();
    return { ok: true, data: updated };
  },

  // Conflicts

  listConflicts(filter?: AutoConflictListFilter): AutoResult<AutoConflict[]> {
    let conflicts = _conflicts.slice();
    if (filter?.severity) conflicts = conflicts.filter(c => c.severity === filter.severity);
    if (filter?.resolved !== undefined) {
      conflicts = filter.resolved
        ? conflicts.filter(c => c.resolvedAt !== null)
        : conflicts.filter(c => c.resolvedAt === null);
    }
    return { ok: true, data: conflicts };
  },

  getConflict(id: AutoConflictId): AutoResult<AutoConflict> {
    const conflict = _conflicts.find(c => c.id === id);
    if (!conflict) return err("NOT_FOUND", "Conflict not found.");
    return { ok: true, data: conflict };
  },

  resolveConflict(id: AutoConflictId, strategy: AutoConflictResolutionStrategy, notes: string): AutoResult<AutoConflict> {
    const idx = _conflicts.findIndex(c => c.id === id);
    if (idx === -1) return err("NOT_FOUND", "Conflict not found.");
    const conflict = _conflicts[idx]!;
    if (conflict.resolvedAt) return err("ALREADY_RESOLVED", "This conflict has already been resolved.");
    const updated: AutoConflict = {
      ...conflict,
      resolvedAt: now(),
      resolution: `${strategy}: ${notes}`,
    };
    _conflicts = [..._conflicts.slice(0, idx), updated, ..._conflicts.slice(idx + 1)];
    addActivity("conflict_resolved", "Conflict resolved", `Conflict resolved via ${strategy}.`, { relatedConflictId: id });
    syncConflicts();
    return { ok: true, data: updated };
  },

  runConflictScan(): AutoResult<AutoConflict[]> {
    syncConflicts();
    addActivity("conflict_detected", "Conflict scan run", `Manual conflict scan completed. ${_conflicts.filter(c => c.resolvedAt === null).length} active conflict(s).`);
    return { ok: true, data: _conflicts.filter(c => c.resolvedAt === null) };
  },

  // Activity

  listActivity(filter?: AutoActivityListFilter): AutoResult<AutoActivity[]> {
    let items = _activity.slice();
    if (filter?.kind) items = items.filter(a => a.kind === filter.kind);
    if (filter?.relatedRuleId) items = items.filter(a => a.relatedRuleId === filter.relatedRuleId);
    if (filter?.query) {
      const q = filter.query.toLowerCase();
      items = items.filter(a => a.title.toLowerCase().includes(q) || a.detail.toLowerCase().includes(q));
    }
    const offset = filter?.offset ?? 0;
    const limit  = filter?.limit  ?? 50;
    return { ok: true, data: items.slice(offset, offset + limit) };
  },

  // Overview

  getOverviewStats(): AutoResult<AutoOverviewStats> {
    const recent = _activity.slice(0, 5);
    return {
      ok: true,
      data: {
        totalRules:      _rules.length,
        activeRules:     _rules.filter(r => r.status === "active-demonstration" || r.status === "conflict-detected").length,
        draftRules:      _rules.filter(r => r.status === "draft").length,
        pausedRules:     _rules.filter(r => r.status === "paused").length,
        archivedRules:   _rules.filter(r => r.status === "archived").length,
        conflictCount:   _conflicts.filter(c => c.resolvedAt === null).length,
        activePolicies:  _policies.filter(p => p.status === "active").length,
        recentActivity:  recent,
        demonstrationOnly: true,
      },
    };
  },

  // Default resolution

  resolveDefaultsForContext(ctx: { templateActive: boolean }): {
    reminderDefaults: { enabled: boolean; firstReminderDays: number; repeatIntervalDays: number };
    completionDefaults: { notifySenderOnComplete: boolean; sendCompletionCopyToParticipants: boolean; sendCompletionCopyToCCRecipients: boolean; allowParticipantDownload: boolean; createVerificationRecord: boolean };
    invitationDefaults: { subject: string; senderDisplayName: string };
  } {
    // Template wins > workspace policy > system default
    if (ctx.templateActive) {
      return {
        reminderDefaults:    { enabled: true,  firstReminderDays: 3, repeatIntervalDays: 7 },
        completionDefaults:  { notifySenderOnComplete: true, sendCompletionCopyToParticipants: true, sendCompletionCopyToCCRecipients: true, allowParticipantDownload: true, createVerificationRecord: true },
        invitationDefaults:  { subject: "Please review and sign: {title}", senderDisplayName: "" },
      };
    }

    const reminderPolicy = _policies.find(p => p.family === "reminder_direction" && p.status === "active");
    const completionPolicy = _policies.find(p => p.family === "completion_behavior" && p.status === "active");
    const requestPolicy = _policies.find(p => p.family === "request_defaults" && p.status === "active");

    return {
      reminderDefaults: {
        enabled:              (reminderPolicy?.settings["remindersEnabled"]     as boolean  ?? true),
        firstReminderDays:    (reminderPolicy?.settings["firstReminderDays"]    as number   ?? 3),
        repeatIntervalDays:   (reminderPolicy?.settings["repeatIntervalDays"]   as number   ?? 7),
      },
      completionDefaults: {
        notifySenderOnComplete:             (completionPolicy?.settings["notifySenderOnComplete"]             as boolean ?? true),
        sendCompletionCopyToParticipants:   (completionPolicy?.settings["sendCompletionCopyToParticipants"]  as boolean ?? true),
        sendCompletionCopyToCCRecipients:   (completionPolicy?.settings["sendCompletionCopyToCCRecipients"]  as boolean ?? true),
        allowParticipantDownload:           (completionPolicy?.settings["allowParticipantDownload"]          as boolean ?? true),
        createVerificationRecord:           (completionPolicy?.settings["createVerificationRecord"]          as boolean ?? true),
      },
      invitationDefaults: {
        subject:             (requestPolicy?.settings["invitationSubject"]  as string ?? "Please review and sign: {title}"),
        senderDisplayName:   (requestPolicy?.settings["senderDisplayName"]  as string ?? ""),
      },
    };
  },

  // Helper exports for pages

  getTriggerConfigs() {
    return AUTO_TRIGGER_CONFIGS;
  },

  getActionConfigs() {
    return AUTO_ACTION_CONFIGS;
  },

  buildConditionId(): import("../../models/workflow-automation").AutoConditionId {
    return condId();
  },

  buildActionId(): import("../../models/workflow-automation").AutoActionId {
    return actionId();
  },

  // ── Session lifecycle ──────────────────────────────────────────────────────

  resetWorkflowAutomationDemonstration(): void {
    _rules     = JSON.parse(JSON.stringify(FIXTURE_RULES))     as AutoRule[];
    _policies  = JSON.parse(JSON.stringify(FIXTURE_POLICIES))  as AutoPolicy[];
    _conflicts = JSON.parse(JSON.stringify(FIXTURE_CONFLICTS)) as AutoConflict[];
    _sims      = [];
    _activity  = JSON.parse(JSON.stringify(FIXTURE_ACTIVITY))  as AutoActivity[];
  },

  clearWorkspaceScopedAutomation(_workspaceId: string): void {
    _sims = [];
  },
};
