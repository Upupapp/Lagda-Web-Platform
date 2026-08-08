// Workflow templates and runs.
//
// The product claim being tested is narrow and load-bearing: a workflow can be
// started many times at once, and each run is independent. Everything that
// could break that is a shared reference — a run holding the template's stage
// array, or two runs holding each other's. Neither shows up in a type-check,
// neither shows up in a build, and both would present as one client's progress
// appearing on another client's run.

import { describe, it, expect, beforeEach } from "vitest";

import { workflowService } from "../mock/workflow.service";
import {
  computeRunProgress,
  validateTemplate,
  stageKindBlocks,
  DEFAULT_TEMPLATE_QUERY,
  DEFAULT_RUN_QUERY,
  stageId,
  slotId,
} from "../../models/workflow";
import type { WorkflowTemplate, WorkflowTemplateStage } from "../../models/workflow";

const WS = "ws_mls_001";

async function anyActiveTemplate(): Promise<WorkflowTemplate> {
  const templates = await workflowService.listTemplates(WS, DEFAULT_TEMPLATE_QUERY);
  const active = templates.find(t => t.status === "active");
  expect(active, "fixtures must contain an active template").toBeDefined();
  return active!;
}

describe("workflow fixtures", () => {
  beforeEach(() => workflowService.resetWorkflowDemonstration());

  it("are visible in the session workspace", async () => {
    // Bulk Send once shipped fixtures in a workspace the signed-in user was
    // never in, so every surface returned nothing. Same check, same reason.
    const templates = await workflowService.listTemplates(WS, DEFAULT_TEMPLATE_QUERY);
    expect(templates.length).toBeGreaterThan(0);
    expect(templates.every(t => t.workspaceId === WS)).toBe(true);
  });

  it("cover blocked, overdue and completed runs, not only the happy path", async () => {
    const active = await workflowService.listRuns(WS, "active", DEFAULT_RUN_QUERY);
    const completed = await workflowService.listRuns(WS, "completed", DEFAULT_RUN_QUERY);
    const statuses = new Set(active.map(r => r.status));
    expect(statuses.has("blocked"), "no blocked run to look at").toBe(true);
    expect(statuses.has("overdue"), "no overdue run to look at").toBe(true);
    expect(completed.length).toBeGreaterThan(0);
  });

  it("never separate active and completed runs into overlapping sets", async () => {
    const active = await workflowService.listRuns(WS, "active", DEFAULT_RUN_QUERY);
    const completed = await workflowService.listRuns(WS, "completed", DEFAULT_RUN_QUERY);
    const overlap = active.filter(a => completed.some(c => c.id === a.id));
    expect(overlap).toEqual([]);
  });
});

describe("starting a run", () => {
  beforeEach(() => workflowService.resetWorkflowDemonstration());

  it("leaves the template's stages byte-identical", async () => {
    const template = await anyActiveTemplate();
    const before = JSON.stringify(template.stages);

    await workflowService.startRun({
      templateId: template.id, name: "Run 1", documents: [], startedBy: "Tester", assignments: {},
    });

    const after = await workflowService.getTemplate(template.id);
    expect(JSON.stringify(after?.stages)).toBe(before);
  });

  it("counts the initiation on the template without changing the design", async () => {
    const template = await anyActiveTemplate();
    const beforeCount = template.initiationCount;
    const beforeStages = template.stages.length;

    await workflowService.startRun({
      templateId: template.id, name: "Run 1", documents: [], startedBy: "Tester", assignments: {},
    });

    const after = await workflowService.getTemplate(template.id);
    expect(after?.initiationCount).toBe(beforeCount + 1);
    expect(after?.stages.length).toBe(beforeStages);
    expect(after?.lastUsedAtDemonstration).not.toBeNull();
  });

  it("does not let a mutated run reach back into its template", async () => {
    const template = await anyActiveTemplate();
    const run = await workflowService.startRun({
      templateId: template.id, name: "Run 1", documents: [], startedBy: "Tester", assignments: {},
    });
    expect(run).not.toBeNull();

    run!.stages[0]!.name = "MUTATED BY CALLER";

    const after = await workflowService.getTemplate(template.id);
    expect(after?.stages[0]?.name).not.toBe("MUTATED BY CALLER");
  });

  it("gives two simultaneous runs of one template independent stages", async () => {
    // The whole selling point. If these shared stage objects, advancing one
    // client's contract would advance every other client's too.
    const template = await anyActiveTemplate();
    const a = await workflowService.startRun({
      templateId: template.id, name: "Client A", documents: [], startedBy: "Tester", assignments: {},
    });
    const b = await workflowService.startRun({
      templateId: template.id, name: "Client B", documents: [], startedBy: "Tester", assignments: {},
    });

    expect(a!.id).not.toBe(b!.id);
    expect(a!.stages[0]!.id).not.toBe(b!.stages[0]!.id);

    a!.stages[0]!.status = "completed";
    const reloadedB = await workflowService.getRun(b!.id);
    expect(reloadedB?.stages[0]?.status).not.toBe("completed");
  });

  it("fills a slot from the assignment map and falls back to the role name", async () => {
    const template = await anyActiveTemplate();
    const firstSlot = template.stages.flatMap(s => s.slots)[0];
    expect(firstSlot).toBeDefined();

    const run = await workflowService.startRun({
      templateId: template.id, name: "Named", documents: [],
      startedBy: "Tester", assignments: { [firstSlot!.id]: "Juan Dela Cruz" },
    });

    const named = run!.stages.flatMap(s => s.participants).find(p => p.displayName === "Juan Dela Cruz");
    expect(named, "the assignment was not applied").toBeDefined();
    // Every other participant still has a readable label rather than an id.
    for (const p of run!.stages.flatMap(s => s.participants)) {
      expect(p.displayName.trim()).not.toBe("");
    }
  });

  it("returns null for a template that does not exist", async () => {
    const run = await workflowService.startRun({
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      templateId: "wft_does_not_exist" as any,
      name: "Nope", documents: [], startedBy: "Tester", assignments: {},
    });
    expect(run).toBeNull();
  });
});

describe("run progress", () => {
  beforeEach(() => workflowService.resetWorkflowDemonstration());

  it("reports percent from completed stages and names the current one", async () => {
    const runs = await workflowService.listRuns(WS, "active", DEFAULT_RUN_QUERY);
    const run = runs.find(r => r.status === "in-progress")!;
    const progress = computeRunProgress(run);

    expect(progress.totalStages).toBe(run.stages.length);
    expect(progress.percentComplete).toBeGreaterThan(0);
    expect(progress.percentComplete).toBeLessThan(100);
    expect(progress.currentStage).not.toBeNull();
    expect(progress.summaryLine).toContain(progress.currentStage!.name);
  });

  it("reports a completed run as 100% with no current stage", async () => {
    const runs = await workflowService.listRuns(WS, "completed", DEFAULT_RUN_QUERY);
    const run = runs.find(r => r.status === "completed")!;
    const progress = computeRunProgress(run);

    expect(progress.percentComplete).toBe(100);
    expect(progress.currentStage).toBeNull();
    expect(progress.summaryLine).toMatch(/All \d+ stages complete/);
  });

  it("surfaces blocked and overdue rather than hiding them behind a percentage", async () => {
    const runs = await workflowService.listRuns(WS, "active", DEFAULT_RUN_QUERY);
    expect(computeRunProgress(runs.find(r => r.status === "blocked")!).isBlocked).toBe(true);
    expect(computeRunProgress(runs.find(r => r.status === "overdue")!).isOverdue).toBe(true);
  });
});

describe("cancelling a run", () => {
  beforeEach(() => workflowService.resetWorkflowDemonstration());

  it("cancels unfinished stages but leaves completed ones alone", async () => {
    const runs = await workflowService.listRuns(WS, "active", DEFAULT_RUN_QUERY);
    const run = runs.find(r => r.status === "in-progress")!;
    const completedBefore = run.stages.filter(s => s.status === "completed").map(s => s.id);

    const cancelled = await workflowService.cancelRun(run.id, "Tester");

    expect(cancelled?.status).toBe("cancelled");
    for (const id of completedBefore) {
      expect(cancelled?.stages.find(s => s.id === id)?.status).toBe("completed");
    }
    expect(cancelled?.stages.some(s => s.status === "cancelled")).toBe(true);
  });

  it("does not touch the template it came from", async () => {
    const runs = await workflowService.listRuns(WS, "active", DEFAULT_RUN_QUERY);
    const run = runs[0]!;
    const before = await workflowService.getTemplate(run.templateId);

    await workflowService.cancelRun(run.id, "Tester");

    const after = await workflowService.getTemplate(run.templateId);
    expect(JSON.stringify(after?.stages)).toBe(JSON.stringify(before?.stages));
  });

  it("moves the run out of the active list and into completed", async () => {
    const before = await workflowService.listRuns(WS, "active", DEFAULT_RUN_QUERY);
    const run = before[0]!;
    await workflowService.cancelRun(run.id, "Tester");

    const active = await workflowService.listRuns(WS, "active", DEFAULT_RUN_QUERY);
    const completed = await workflowService.listRuns(WS, "completed", DEFAULT_RUN_QUERY);
    expect(active.some(r => r.id === run.id)).toBe(false);
    expect(completed.some(r => r.id === run.id)).toBe(true);
  });
});

describe("reminders", () => {
  beforeEach(() => workflowService.resetWorkflowDemonstration());

  it("record activity without advancing anyone's status", async () => {
    // A reminder is something the sender did. Treating it as progress would
    // report a recipient as having acted when they have not.
    const runs = await workflowService.listRuns(WS, "active", DEFAULT_RUN_QUERY);
    const run = runs.find(r => r.status === "in-progress")!;
    const stage = computeRunProgress(run).currentStage!;
    const statusesBefore = stage.participants.map(p => p.status);

    const updated = await workflowService.sendReminder(run.id, stage, "Tester");

    const stageAfter = updated!.stages.find(s => s.id === stage.id)!;
    expect(stageAfter.participants.map(p => p.status)).toEqual(statusesBefore);
    expect(stageAfter.status).toBe(stage.status);
    expect(updated!.activity.at(-1)?.kind).toBe("reminder-sent");
  });
});

describe("template validation", () => {
  const named = (over: Partial<WorkflowTemplateStage> = {}): WorkflowTemplateStage => ({
    id: stageId("s1"), name: "Review", description: null, position: 1,
    kind: "review", slots: [], completion: "all",
    dueDateDirection: null, instruction: null, ...over,
  });

  it("blocks publishing a workflow with no name or no stages", () => {
    expect(validateTemplate({ name: "", stages: [named()] }).canPublish).toBe(false);
    expect(validateTemplate({ name: "X", stages: [] }).canPublish).toBe(false);
  });

  it("blocks a blocking stage that has nobody assigned", () => {
    const result = validateTemplate({ name: "X", stages: [named({ kind: "signature" })] });
    expect(result.canPublish).toBe(false);
    expect(result.issues.some(i => i.severity === "error" && /nobody is assigned/i.test(i.message))).toBe(true);
  });

  it("allows a notification stage with nobody assigned, because it never blocks", () => {
    expect(stageKindBlocks("notification")).toBe(false);
    const result = validateTemplate({
      name: "X",
      stages: [named({ kind: "signature", slots: [{ id: slotId("a"), label: "Signer", kind: "role", action: "sign", required: true, suggestedName: null }] }),
               named({ id: stageId("s2"), name: "Notify", kind: "notification", position: 2 })],
    });
    expect(result.issues.some(i => i.severity === "error")).toBe(false);
  });

  it("warns rather than blocks when no stage asks for a signature", () => {
    const result = validateTemplate({
      name: "Review only",
      stages: [named({ slots: [{ id: slotId("a"), label: "Reviewer", kind: "role", action: "review", required: true, suggestedName: null }] })],
    });
    expect(result.canPublish).toBe(true);
    expect(result.issues.some(i => i.severity === "warning" && /sign/i.test(i.message))).toBe(true);
  });
});

describe("templates", () => {
  beforeEach(() => workflowService.resetWorkflowDemonstration());

  it("duplicates as a draft with no inherited usage history", async () => {
    // A copy that arrived published, with someone else's usage count, would
    // read as an established process the moment it was created.
    const template = await anyActiveTemplate();
    const copy = await workflowService.duplicateTemplate(template.id);

    expect(copy?.status).toBe("draft");
    expect(copy?.initiationCount).toBe(0);
    expect(copy?.lastUsedAtDemonstration).toBeNull();
    expect(copy?.id).not.toBe(template.id);
    expect(copy?.stages.length).toBe(template.stages.length);
  });

  it("refuses to publish an invalid template even when asked to", async () => {
    const created = await workflowService.createTemplate({
      workspaceId: WS, name: "Broken", description: null, category: "general",
      // A signature stage with nobody on it is an error, so this cannot publish.
      stages: [{
        id: stageId("s1"), name: "Sign", description: null, position: 1,
        kind: "signature", slots: [], completion: "all",
        dueDateDirection: null, instruction: null,
      }],
      estimatedCompletion: null, createdBy: "Tester", publish: true,
    });
    expect(created.status).toBe("draft");
  });

  it("renumbers stage positions contiguously from 1", async () => {
    const created = await workflowService.createTemplate({
      workspaceId: WS, name: "Ordering", description: null, category: "general",
      stages: [
        { id: stageId("a"), name: "A", description: null, position: 9, kind: "review", slots: [], completion: "all", dueDateDirection: null, instruction: null },
        { id: stageId("b"), name: "B", description: null, position: 3, kind: "review", slots: [], completion: "all", dueDateDirection: null, instruction: null },
      ],
      estimatedCompletion: null, createdBy: "Tester", publish: false,
    });
    expect(created.stages.map(s => s.position)).toEqual([1, 2]);
  });
});
