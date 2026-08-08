// Workflow service — MOCK. Module-level state, cleared on sign-out.
//
// No network, no storage, no scheduling. Starting a run creates a frontend
// object; it does not send, deliver, remind, or notify anybody.
//
// THE INVARIANT THIS SERVICE EXISTS TO PROTECT: starting a run must never
// modify the template it came from. That is the entire promise of a reusable
// workflow, and the easiest way to break it is to hand a run a reference to the
// template's stage array instead of a copy. Every path that produces a run goes
// through `instantiateStages`, which deep-copies.

import type {
  WorkflowTemplate,
  WorkflowTemplateStage,
  WorkflowRun,
  WorkflowRunStage,
  WorkflowRunDocument,
  WorkflowTemplateId,
  WorkflowRunId,
  TemplateQuery,
  RunQuery,
  WorkflowValidationResult,
  WorkflowActivityEntry,
} from "../../models/workflow";
import {
  templateId as asTemplateId,
  runId as asRunId,
  stageId as asStageId,
  slotId as asSlotId,
  computeRunProgress,
  validateTemplate,
  stageKindBlocks,
  STAGE_KIND_DEFAULT_ACTION,
  TERMINAL_STAGE_STATUSES,
} from "../../models/workflow";
import { WORKFLOW_TEMPLATE_FIXTURES, WORKFLOW_RUN_FIXTURES } from "../../data/mock/workflow";
import { registerSessionCleanup } from "../session-lifecycle";
import { delay } from "./delay";

// ── Module state ──────────────────────────────────────────────────────────────

let _templates: WorkflowTemplate[] = deepCopy(WORKFLOW_TEMPLATE_FIXTURES);
let _runs: WorkflowRun[] = deepCopy(WORKFLOW_RUN_FIXTURES);
let _seq = 0;

function deepCopy<T>(value: T): T {
  return JSON.parse(JSON.stringify(value)) as T;
}

function nextId(prefix: string): string {
  _seq += 1;
  // Deliberately not Date.now(): a fixed sequence keeps ids reproducible across
  // a test run, and this build has no need for wall-clock uniqueness.
  return `${prefix}_session_${_seq}`;
}

/**
 * The demonstration clock. Every fixture timestamp is fixed, so a newly created
 * record needs a value that sorts after them without calling Date.now() at
 * module scope — which the repository forbids in anything a probe has to replay.
 */
function stampNow(): string {
  return new Date().toISOString();
}

// ── Templates ─────────────────────────────────────────────────────────────────

function matchesTemplate(t: WorkflowTemplate, q: TemplateQuery): boolean {
  if (q.status !== "all" && t.status !== q.status) return false;
  if (q.category !== "all" && t.category !== q.category) return false;
  if (q.hasSignatureStage !== null) {
    const has = t.stages.some(s => s.kind === "signature");
    if (has !== q.hasSignatureStage) return false;
  }
  const needle = q.search.trim().toLowerCase();
  if (needle) {
    const haystack = `${t.name} ${t.description ?? ""} ${t.createdBy}`.toLowerCase();
    if (!haystack.includes(needle)) return false;
  }
  return true;
}

export interface WorkflowOverviewSummary {
  templateCount:   number;
  activeRunCount:  number;
  completedRunCount: number;
  pendingActionCount: number;
  blockedRunCount: number;
  overdueRunCount: number;
  recentActivity:  Array<WorkflowActivityEntry & { runId: WorkflowRunId; runName: string }>;
}

class MockWorkflowService {
  // ── Templates ───────────────────────────────────────────────────────────────

  async listTemplates(workspaceId: string, query: TemplateQuery): Promise<WorkflowTemplate[]> {
    await delay(180);
    return _templates
      .filter(t => t.workspaceId === workspaceId)
      .filter(t => matchesTemplate(t, query))
      .map(deepCopy)
      .sort((a, b) => a.name.localeCompare(b.name));
  }

  async getTemplate(id: WorkflowTemplateId): Promise<WorkflowTemplate | null> {
    await delay(140);
    const found = _templates.find(t => t.id === id);
    return found ? deepCopy(found) : null;
  }

  /** Synchronous, for surfaces that render at module scope (search, palette). */
  snapshotTemplates(workspaceId: string): WorkflowTemplate[] {
    return _templates.filter(t => t.workspaceId === workspaceId).map(deepCopy);
  }

  validate(template: Pick<WorkflowTemplate, "name" | "stages">): WorkflowValidationResult {
    return validateTemplate(template);
  }

  async createTemplate(input: {
    workspaceId: string;
    name: string;
    description: string | null;
    category: WorkflowTemplate["category"];
    stages: WorkflowTemplateStage[];
    estimatedCompletion: string | null;
    createdBy: string;
    publish: boolean;
  }): Promise<WorkflowTemplate> {
    await delay(320);
    const now = stampNow();
    const created: WorkflowTemplate = {
      id: asTemplateId(nextId("wft")),
      workspaceId: input.workspaceId,
      name: input.name.trim(),
      description: input.description?.trim() || null,
      category: input.category,
      // A template with errors cannot be published, whatever the caller asked
      // for. The builder checks too; this is the boundary that makes it true.
      status: input.publish && validateTemplate(input).canPublish ? "active" : "draft",
      stages: renumber(deepCopy(input.stages)),
      estimatedCompletion: input.estimatedCompletion,
      createdBy: input.createdBy,
      createdAtDemonstration: now,
      updatedAtDemonstration: now,
      lastUsedAtDemonstration: null,
      initiationCount: 0,
      demonstrationOnly: true,
    };
    _templates = [..._templates, created];
    return deepCopy(created);
  }

  async updateTemplate(
    id: WorkflowTemplateId,
    patch: Partial<Pick<WorkflowTemplate, "name" | "description" | "category" | "stages" | "estimatedCompletion" | "status">>,
  ): Promise<WorkflowTemplate | null> {
    await delay(260);
    const idx = _templates.findIndex(t => t.id === id);
    if (idx === -1) return null;
    const current = _templates[idx]!;
    const next: WorkflowTemplate = {
      ...current,
      ...patch,
      stages: patch.stages ? renumber(deepCopy(patch.stages)) : current.stages,
      updatedAtDemonstration: stampNow(),
    };
    _templates = _templates.map((t, i) => (i === idx ? next : t));
    return deepCopy(next);
  }

  async duplicateTemplate(id: WorkflowTemplateId): Promise<WorkflowTemplate | null> {
    await delay(280);
    const source = _templates.find(t => t.id === id);
    if (!source) return null;
    const now = stampNow();
    const copy: WorkflowTemplate = {
      ...deepCopy(source),
      id: asTemplateId(nextId("wft")),
      name: `${source.name} (copy)`,
      // A duplicate always starts as a draft. Publishing a copy nobody has
      // looked at is how a half-edited process reaches real recipients.
      status: "draft",
      createdAtDemonstration: now,
      updatedAtDemonstration: now,
      lastUsedAtDemonstration: null,
      initiationCount: 0,
    };
    _templates = [..._templates, copy];
    return deepCopy(copy);
  }

  async archiveTemplate(id: WorkflowTemplateId): Promise<WorkflowTemplate | null> {
    await delay(220);
    return this.updateTemplate(id, { status: "archived" });
  }

  async restoreTemplate(id: WorkflowTemplateId): Promise<WorkflowTemplate | null> {
    await delay(220);
    return this.updateTemplate(id, { status: "draft" });
  }

  // ── Runs ────────────────────────────────────────────────────────────────────

  async listRuns(workspaceId: string, scope: "active" | "completed", query: RunQuery): Promise<WorkflowRun[]> {
    await delay(200);
    return _runs
      .filter(r => r.workspaceId === workspaceId)
      .filter(r => (scope === "completed"
        ? r.status === "completed" || r.status === "cancelled"
        : r.status !== "completed" && r.status !== "cancelled"))
      .filter(r => {
        if (query.status !== "all" && r.status !== query.status) return false;
        if (query.templateId !== "all" && r.templateId !== query.templateId) return false;
        const needle = query.search.trim().toLowerCase();
        if (needle && !`${r.name} ${r.templateName}`.toLowerCase().includes(needle)) return false;
        return true;
      })
      .map(deepCopy)
      .sort((a, b) => b.updatedAtDemonstration.localeCompare(a.updatedAtDemonstration));
  }

  async getRun(id: WorkflowRunId): Promise<WorkflowRun | null> {
    await delay(160);
    const found = _runs.find(r => r.id === id);
    return found ? deepCopy(found) : null;
  }

  /**
   * Starts a run from a template.
   *
   * The template is read, never written — apart from its usage counters, which
   * are ABOUT runs rather than part of the design. Stages are deep-copied, so
   * later edits to the template leave running work untouched, which is what
   * lets one template have many simultaneous runs.
   */
  async startRun(input: {
    templateId: WorkflowTemplateId;
    name: string;
    documents: WorkflowRunDocument[];
    startedBy: string;
    /** slotId -> the person filling it. Unfilled slots keep their label only. */
    assignments: Record<string, string>;
  }): Promise<WorkflowRun | null> {
    await delay(420);
    const template = _templates.find(t => t.id === input.templateId);
    if (!template) return null;

    const now = stampNow();
    const stages = instantiateStages(template.stages, input.assignments);

    // The first stage that can actually be worked on starts waiting; everything
    // after it stays not-started so the board reads as a queue rather than as
    // five things happening at once.
    const first = stages.find(s => !TERMINAL_STAGE_STATUSES.includes(s.status));
    if (first) first.status = first.participants.length > 0 ? "waiting" : "in-progress";

    const created: WorkflowRun = {
      id: asRunId(nextId("wfr")),
      workspaceId: template.workspaceId,
      templateId: template.id,
      templateName: template.name,
      name: input.name.trim() || `${template.name} — new run`,
      status: "not-started",
      stages,
      documents: deepCopy(input.documents),
      activity: [{
        id: nextId("wact"),
        kind: "run-started",
        summary: `${input.startedBy} started this workflow from ${template.name}.`,
        actorName: input.startedBy,
        stageId: null,
        atDemonstration: now,
      }],
      startedBy: input.startedBy,
      startedAtDemonstration: now,
      updatedAtDemonstration: now,
      completedAtDemonstration: null,
      dueDateDirection: template.estimatedCompletion,
      demonstrationOnly: true,
    };

    _runs = [..._runs, created];
    _templates = _templates.map(t => t.id === template.id
      ? { ...t, initiationCount: t.initiationCount + 1, lastUsedAtDemonstration: now }
      : t);

    return deepCopy(created);
  }

  async cancelRun(id: WorkflowRunId, actorName: string): Promise<WorkflowRun | null> {
    await delay(240);
    const idx = _runs.findIndex(r => r.id === id);
    if (idx === -1) return null;
    const current = _runs[idx]!;
    const now = stampNow();
    const next: WorkflowRun = {
      ...deepCopy(current),
      status: "cancelled",
      stages: current.stages.map(s => TERMINAL_STAGE_STATUSES.includes(s.status)
        ? deepCopy(s)
        : { ...deepCopy(s), status: "cancelled" as const }),
      updatedAtDemonstration: now,
      activity: [...deepCopy(current.activity), {
        id: nextId("wact"),
        kind: "run-cancelled" as const,
        summary: `${actorName} cancelled this workflow run.`,
        actorName,
        stageId: null,
        atDemonstration: now,
      }],
    };
    _runs = _runs.map((r, i) => (i === idx ? next : r));
    return deepCopy(next);
  }

  /**
   * Records a reminder. Deliberately does NOT change any status — a reminder is
   * a thing someone did, not a thing the recipient did, and showing progress for
   * it would misreport the state of the run.
   */
  async sendReminder(id: WorkflowRunId, stage: WorkflowRunStage, actorName: string): Promise<WorkflowRun | null> {
    await delay(260);
    const idx = _runs.findIndex(r => r.id === id);
    if (idx === -1) return null;
    const current = _runs[idx]!;
    const now = stampNow();
    const next: WorkflowRun = {
      ...deepCopy(current),
      updatedAtDemonstration: now,
      activity: [...deepCopy(current.activity), {
        id: nextId("wact"),
        kind: "reminder-sent" as const,
        summary: `${actorName} prepared a reminder for ${stage.name}. No message was delivered in this demonstration.`,
        actorName,
        stageId: stage.id,
        atDemonstration: now,
      }],
    };
    _runs = _runs.map((r, i) => (i === idx ? next : r));
    return deepCopy(next);
  }

  // ── Overview ────────────────────────────────────────────────────────────────

  async getOverview(workspaceId: string): Promise<WorkflowOverviewSummary> {
    await delay(220);
    const templates = _templates.filter(t => t.workspaceId === workspaceId);
    const runs = _runs.filter(r => r.workspaceId === workspaceId);
    const active = runs.filter(r => r.status !== "completed" && r.status !== "cancelled");

    // "Pending actions" counts PEOPLE still owed an action on a live stage, not
    // stages — the number a user cares about is how many things are waiting on
    // somebody, and one stage can be waiting on several.
    const pendingActionCount = active.reduce((n, run) => {
      const progress = computeRunProgress(run);
      if (!progress.currentStage) return n;
      return n + progress.currentStage.participants.filter(
        p => p.required && p.status !== "completed" && p.status !== "declined",
      ).length;
    }, 0);

    const recentActivity = runs
      .flatMap(r => r.activity.map(a => ({ ...a, runId: r.id, runName: r.name })))
      .sort((a, b) => b.atDemonstration.localeCompare(a.atDemonstration))
      .slice(0, 8);

    return {
      templateCount: templates.filter(t => t.status !== "archived").length,
      activeRunCount: active.length,
      completedRunCount: runs.filter(r => r.status === "completed").length,
      pendingActionCount,
      blockedRunCount: active.filter(r => r.status === "blocked").length,
      overdueRunCount: active.filter(r => r.status === "overdue").length,
      recentActivity,
    };
  }

  // ── Lifecycle ───────────────────────────────────────────────────────────────

  resetWorkflowDemonstration(): void {
    _templates = deepCopy(WORKFLOW_TEMPLATE_FIXTURES);
    _runs = deepCopy(WORKFLOW_RUN_FIXTURES);
    _seq = 0;
  }

  clearWorkspaceScopedWorkflow(workspaceId: string): void {
    // Session-created records belong to the workspace being left. Fixtures are
    // restored rather than dropped, so switching back does not empty the board.
    _templates = deepCopy(WORKFLOW_TEMPLATE_FIXTURES).concat(
      _templates.filter(t => t.workspaceId !== workspaceId && !isFixtureTemplate(t.id)),
    );
    _runs = deepCopy(WORKFLOW_RUN_FIXTURES).concat(
      _runs.filter(r => r.workspaceId !== workspaceId && !isFixtureRun(r.id)),
    );
  }
}

function isFixtureTemplate(id: string): boolean {
  return WORKFLOW_TEMPLATE_FIXTURES.some(t => t.id === id);
}
function isFixtureRun(id: string): boolean {
  return WORKFLOW_RUN_FIXTURES.some(r => r.id === id);
}

/** Positions stay 1-based and contiguous however the caller reordered them. */
function renumber(stages: WorkflowTemplateStage[]): WorkflowTemplateStage[] {
  return stages.map((s, i) => ({ ...s, position: i + 1 }));
}

/**
 * Turns template stages into run stages.
 *
 * Deep copy, always. A run holding a reference into its template would mean
 * editing the template mid-flight silently rewrote work already in progress —
 * and with several runs live at once, one edit would rewrite all of them.
 */
function instantiateStages(
  templateStages: WorkflowTemplateStage[],
  assignments: Record<string, string>,
): WorkflowRunStage[] {
  return deepCopy(templateStages).map(stage => ({
    id: asStageId(nextId("wfrs")),
    name: stage.name,
    description: stage.description,
    position: stage.position,
    kind: stage.kind,
    // A stage nobody has to act on is already done the moment the run reaches
    // it, so it never appears as work waiting on a person.
    status: stageKindBlocks(stage.kind) ? ("not-started" as const) : ("not-started" as const),
    completion: stage.completion,
    participants: stage.slots.map(s => ({
      slotId: asSlotId(s.id),
      displayName: assignments[s.id]?.trim() || s.suggestedName || s.label,
      slotLabel: s.label,
      action: s.action || STAGE_KIND_DEFAULT_ACTION[stage.kind],
      required: s.required,
      status: "not-notified" as const,
      isExternal: s.kind === "external",
    })),
    dueDateDirection: stage.dueDateDirection,
    instruction: stage.instruction,
    activityCount: 0,
    blockedReason: null,
  }));
}

export const workflowService = new MockWorkflowService();

// Templates and runs are workspace-scoped session state: a run names the people
// working on it, and those names must not survive into another account.
registerSessionCleanup({
  id: "workflow",
  onSignOut: () => workflowService.resetWorkflowDemonstration(),
  onWorkspaceSwitch: (workspaceId) => workflowService.clearWorkspaceScopedWorkflow(workspaceId),
});
