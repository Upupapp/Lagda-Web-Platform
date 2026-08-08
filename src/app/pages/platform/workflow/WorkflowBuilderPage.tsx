// Workflow builder and the start-a-run flow.
//
// The builder is deliberately a stage LIST rather than a drag-and-drop canvas.
// Order is the only spatial relationship a workflow has, a list already
// expresses it, and move-up/move-down works with a keyboard, on a phone, and
// with a screen reader — none of which is true of a drag surface without a
// great deal more work. The existing WorkflowBoard has drag for the
// per-document signing workflow; reusing it here would have bound this page to
// `SigningStage`, which is a different shape.

import { useEffect, useMemo, useState } from "react";
import { Link, useNavigate, useSearchParams } from "react-router";
import { ArrowDown, ArrowUp, Plus, Trash2, AlertTriangle, Info } from "lucide-react";

import { AppContent, PageHeader } from "../../../components/platform";
import { usePlatform } from "../../../context/PlatformContext";
import { usePageMeta } from "../../../hooks/usePageMeta";
import { workflowService } from "../../../services/mock/workflow.service";
import type {
  WorkflowTemplateStage, WorkflowTemplateId, WorkflowCategory, WorkflowStageKind,
  WorkflowParticipantSlot, WorkflowTemplate,
} from "../../../models/workflow";
import {
  WORKFLOW_STAGE_KINDS, STAGE_KIND_LABELS, STAGE_KIND_DESCRIPTIONS,
  STAGE_KIND_DEFAULT_ACTION, WORKFLOW_CATEGORIES, WORKFLOW_CATEGORY_LABELS,
  validateTemplate, stageKindBlocks, stageId, slotId,
  STAGE_NAME_MAX, MAX_STAGES_PER_TEMPLATE,
} from "../../../models/workflow";
import { WorkflowConceptNote, WorkflowDemoNote } from "../../../components/workflow/WorkflowKit";

const GF = { fontFamily: "'Geist', sans-serif" };
const GM = { fontFamily: "'Geist Mono', monospace" };
const NAVY = "#07111F";
const AZURE = "#0078D4";
const SLATE = "#64748B";
const SLATE_DARK = "#334155";
const BORDER = "#E2E8F0";

let uid = 0;
const nextKey = (p: string) => `${p}_new_${++uid}`;

const input: React.CSSProperties = {
  ...GF, minHeight: 44, width: "100%", padding: "0 12px", borderRadius: 8,
  border: `1px solid ${BORDER}`, fontSize: 14, boxSizing: "border-box",
};
const primaryBtn: React.CSSProperties = {
  ...GF, minHeight: 44, padding: "0 18px", borderRadius: 8, border: "none",
  background: AZURE, color: "#FFFFFF", fontSize: 14, fontWeight: 700, cursor: "pointer",
};
const secondaryBtn: React.CSSProperties = {
  ...GF, minHeight: 44, padding: "0 14px", borderRadius: 8, border: `1px solid ${BORDER}`,
  background: "#FFFFFF", color: SLATE_DARK, fontSize: 13, fontWeight: 600, cursor: "pointer",
};
const iconBtn: React.CSSProperties = {
  ...GF, minWidth: 44, minHeight: 44, borderRadius: 8, border: `1px solid ${BORDER}`,
  background: "#FFFFFF", color: SLATE_DARK, cursor: "pointer",
  display: "inline-flex", alignItems: "center", justifyContent: "center",
};

function blankStage(name: string, kind: WorkflowStageKind, position: number): WorkflowTemplateStage {
  return {
    id: stageId(nextKey("stage")),
    name,
    description: null,
    position,
    kind,
    slots: [],
    completion: "all",
    dueDateDirection: null,
    instruction: null,
  };
}

// ── Builder ───────────────────────────────────────────────────────────────────

export function WorkflowBuilderPage() {
  usePageMeta();
  const navigate = useNavigate();
  const [params] = useSearchParams();
  const editingId = params.get("template");
  const { user, currentWorkspace } = usePlatform();

  const [name, setName] = useState("");
  const [description, setDescription] = useState("");
  const [category, setCategory] = useState<WorkflowCategory>("general");
  const [estimate, setEstimate] = useState("");
  const [stages, setStages] = useState<WorkflowTemplateStage[]>([
    blankStage("Prepare Document", "prepare", 1),
  ]);
  const [saving, setSaving] = useState(false);
  const [loaded, setLoaded] = useState(!editingId);

  // Editing loads the existing design. A template being edited is NOT the same
  // object as any run started from it, so nothing here can disturb live work.
  useEffect(() => {
    if (!editingId) return;
    let cancelled = false;
    void workflowService.getTemplate(editingId as WorkflowTemplateId).then((t: WorkflowTemplate | null) => {
      if (cancelled || !t) { setLoaded(true); return; }
      setName(t.name);
      setDescription(t.description ?? "");
      setCategory(t.category);
      setEstimate(t.estimatedCompletion ?? "");
      setStages(t.stages);
      setLoaded(true);
    });
    return () => { cancelled = true; };
  }, [editingId]);

  const validation = useMemo(() => validateTemplate({ name, stages }), [name, stages]);
  const errors = validation.issues.filter(i => i.severity === "error");
  const warnings = validation.issues.filter(i => i.severity === "warning");

  const patchStage = (id: string, patch: Partial<WorkflowTemplateStage>) =>
    setStages(prev => prev.map(s => (s.id === id ? { ...s, ...patch } : s)));

  const move = (index: number, delta: number) =>
    setStages(prev => {
      const next = [...prev];
      const target = index + delta;
      if (target < 0 || target >= next.length) return prev;
      const a = next[index]!, b = next[target]!;
      next[index] = b; next[target] = a;
      return next.map((s, i) => ({ ...s, position: i + 1 }));
    });

  const addStage = () =>
    setStages(prev => prev.length >= MAX_STAGES_PER_TEMPLATE
      ? prev
      : [...prev, blankStage(`Stage ${prev.length + 1}`, "review", prev.length + 1)]);

  const removeStage = (id: string) =>
    setStages(prev => prev.filter(s => s.id !== id).map((s, i) => ({ ...s, position: i + 1 })));

  const addSlot = (stage: WorkflowTemplateStage) => {
    const slot: WorkflowParticipantSlot = {
      id: slotId(nextKey("slot")),
      label: "",
      kind: "role",
      action: STAGE_KIND_DEFAULT_ACTION[stage.kind],
      required: true,
      suggestedName: null,
    };
    patchStage(stage.id, { slots: [...stage.slots, slot] });
  };

  async function save(publish: boolean) {
    if (publish && !validation.canPublish) return;
    setSaving(true);
    const payload = {
      workspaceId: currentWorkspace?.id ?? "ws_mls_001",
      name, description: description || null, category, stages,
      estimatedCompletion: estimate || null,
      createdBy: user?.displayName ?? "You",
      publish,
    };
    const saved = editingId
      ? await workflowService.updateTemplate(editingId as WorkflowTemplateId, {
          name, description: description || null, category, stages,
          estimatedCompletion: estimate || null,
          ...(publish && validation.canPublish ? { status: "active" as const } : {}),
        })
      : await workflowService.createTemplate(payload);
    setSaving(false);
    if (saved) navigate(`/app/workflow/templates/${saved.id}`);
  }

  if (!loaded) {
    return <AppContent><PageHeader title="Workflow builder" /><p role="status" style={{ ...GF, color: SLATE }}>Loading workflow…</p></AppContent>;
  }

  return (
    <AppContent>
      <PageHeader
        title={editingId ? "Edit workflow" : "Create workflow"}
        description="Design the stages once. Every run you start follows this sequence with its own participants."
        breadcrumbs={[
          { label: "Workflow", to: "/app/workflow" },
          { label: "Workflows", to: "/app/workflow/templates" },
          { label: editingId ? "Edit" : "Create" },
        ]}
      />

      <div style={{ display: "flex", flexDirection: "column", gap: 16, maxWidth: 780 }}>
        <WorkflowDemoNote />
        <WorkflowConceptNote />

        {/* Step 1 */}
        <section aria-labelledby="wfb-name" style={card}>
          <h2 id="wfb-name" style={heading}>1. Name this workflow</h2>
          <Field label="Workflow name" required>
            <input value={name} onChange={e => setName(e.target.value)} style={input}
              placeholder="e.g. Contract Review and Signing" maxLength={120} />
          </Field>
          <Field label="Description">
            <textarea value={description} onChange={e => setDescription(e.target.value)}
              rows={2} style={{ ...input, minHeight: 66, padding: "10px 12px", resize: "vertical" }}
              placeholder="What is this process for?" maxLength={400} />
          </Field>
          <div style={{ display: "flex", gap: 12, flexWrap: "wrap" }}>
            <Field label="Category">
              <select value={category} onChange={e => setCategory(e.target.value as WorkflowCategory)} style={{ ...input, width: "auto", minWidth: 180 }}>
                {WORKFLOW_CATEGORIES.map(c => <option key={c} value={c}>{WORKFLOW_CATEGORY_LABELS[c]}</option>)}
              </select>
            </Field>
            <Field label="Estimated completion">
              <input value={estimate} onChange={e => setEstimate(e.target.value)} style={{ ...input, width: "auto", minWidth: 200 }}
                placeholder="e.g. About 5 working days" />
            </Field>
          </div>
        </section>

        {/* Step 2 */}
        <section aria-labelledby="wfb-stages" style={card}>
          <h2 id="wfb-stages" style={heading}>2. Add stages</h2>
          <p style={{ ...GF, fontSize: 12.5, color: SLATE, margin: "0 0 12px" }}>
            {stages.length} {stages.length === 1 ? "stage" : "stages"}, in order. Stages run one after
            another; a stage that asks someone to act holds the run until they do.
          </p>

          <ol style={{ listStyle: "none", margin: 0, padding: 0, display: "flex", flexDirection: "column", gap: 12 }}>
            {stages.map((stage, i) => (
              <li key={stage.id} style={{ border: `1px solid ${BORDER}`, borderRadius: 10, padding: 14, background: "#FFFFFF" }}>
                <div style={{ display: "flex", alignItems: "center", gap: 8, marginBottom: 10 }}>
                  <span style={{ ...GM, fontSize: 11, fontWeight: 700, color: SLATE }}>STAGE {i + 1}</span>
                  <div style={{ marginLeft: "auto", display: "flex", gap: 6 }}>
                    <button type="button" onClick={() => move(i, -1)} disabled={i === 0}
                      aria-label={`Move ${stage.name || `stage ${i + 1}`} earlier`}
                      style={{ ...iconBtn, opacity: i === 0 ? 0.4 : 1 }}>
                      <ArrowUp size={15} aria-hidden />
                    </button>
                    <button type="button" onClick={() => move(i, 1)} disabled={i === stages.length - 1}
                      aria-label={`Move ${stage.name || `stage ${i + 1}`} later`}
                      style={{ ...iconBtn, opacity: i === stages.length - 1 ? 0.4 : 1 }}>
                      <ArrowDown size={15} aria-hidden />
                    </button>
                    <button type="button" onClick={() => removeStage(stage.id)}
                      aria-label={`Remove ${stage.name || `stage ${i + 1}`}`}
                      style={{ ...iconBtn, color: "#991B1B", borderColor: "#FECACA" }}>
                      <Trash2 size={15} aria-hidden />
                    </button>
                  </div>
                </div>

                <Field label="Stage name" required>
                  <input value={stage.name} maxLength={STAGE_NAME_MAX}
                    onChange={e => patchStage(stage.id, { name: e.target.value })} style={input} />
                </Field>

                <Field label="What happens at this stage">
                  <select value={stage.kind}
                    onChange={e => {
                      const kind = e.target.value as WorkflowStageKind;
                      // Slot actions follow the stage kind, so a signature stage
                      // cannot end up asking people to merely review.
                      patchStage(stage.id, {
                        kind,
                        slots: stage.slots.map(s => ({ ...s, action: STAGE_KIND_DEFAULT_ACTION[kind] })),
                      });
                    }}
                    style={input}>
                    {WORKFLOW_STAGE_KINDS.map(k => <option key={k} value={k}>{STAGE_KIND_LABELS[k]}</option>)}
                  </select>
                  <p style={{ ...GF, fontSize: 12, color: SLATE, margin: "6px 0 0", lineHeight: 1.5 }}>
                    {STAGE_KIND_DESCRIPTIONS[stage.kind]}
                    {!stageKindBlocks(stage.kind) && " This stage never holds the run up."}
                  </p>
                </Field>

                <Field label="Description">
                  <input value={stage.description ?? ""}
                    onChange={e => patchStage(stage.id, { description: e.target.value || null })}
                    style={input} placeholder="Shown to everyone on this stage" />
                </Field>

                {/* Participants */}
                <fieldset style={{ border: "none", padding: 0, margin: "10px 0 0" }}>
                  <legend style={{ ...GF, fontSize: 12, color: SLATE_DARK, fontWeight: 600, padding: 0 }}>
                    Who is assigned
                  </legend>
                  <p style={{ ...GF, fontSize: 12, color: SLATE, margin: "4px 0 8px", lineHeight: 1.5 }}>
                    Name the role, not the person. You choose who fills each role when you start a run,
                    which is what lets one workflow serve many clients at once.
                  </p>
                  {stage.slots.length === 0 && stageKindBlocks(stage.kind) && (
                    <p role="note" style={warnBox}>
                      <AlertTriangle size={13} aria-hidden /> Nobody is assigned, so a run would stop here.
                    </p>
                  )}
                  <ul style={{ listStyle: "none", margin: 0, padding: 0, display: "flex", flexDirection: "column", gap: 8 }}>
                    {stage.slots.map(slot => (
                      <li key={slot.id} style={{ display: "flex", gap: 8, flexWrap: "wrap", alignItems: "flex-end" }}>
                        <label style={{ ...GF, fontSize: 11, color: SLATE, flex: 1, minWidth: 160 }}>
                          <span style={{ display: "block", marginBottom: 3 }}>Role name</span>
                          <input value={slot.label} style={input} placeholder="e.g. Legal Reviewer"
                            onChange={e => patchStage(stage.id, {
                              slots: stage.slots.map(s => s.id === slot.id ? { ...s, label: e.target.value } : s),
                            })} />
                        </label>
                        <label style={{ ...GF, fontSize: 11, color: SLATE, minWidth: 150 }}>
                          <span style={{ display: "block", marginBottom: 3 }}>Filled by</span>
                          <select value={slot.kind} style={input}
                            onChange={e => patchStage(stage.id, {
                              slots: stage.slots.map(s => s.id === slot.id
                                ? { ...s, kind: e.target.value as WorkflowParticipantSlot["kind"] } : s),
                            })}>
                            <option value="role">Someone in this role</option>
                            <option value="team">A team</option>
                            <option value="specific-user">A specific person</option>
                            <option value="external">An external recipient</option>
                          </select>
                        </label>
                        <label style={{ ...GF, fontSize: 12, color: SLATE_DARK, display: "inline-flex", alignItems: "center", gap: 6, minHeight: 44 }}>
                          <input type="checkbox" checked={slot.required}
                            onChange={e => patchStage(stage.id, {
                              slots: stage.slots.map(s => s.id === slot.id ? { ...s, required: e.target.checked } : s),
                            })} />
                          Required
                        </label>
                        <button type="button" aria-label={`Remove ${slot.label || "this role"}`}
                          onClick={() => patchStage(stage.id, { slots: stage.slots.filter(s => s.id !== slot.id) })}
                          style={{ ...iconBtn, color: "#991B1B", borderColor: "#FECACA" }}>
                          <Trash2 size={14} aria-hidden />
                        </button>
                      </li>
                    ))}
                  </ul>
                  <button type="button" onClick={() => addSlot(stage)} style={{ ...secondaryBtn, marginTop: 8 }}>
                    <Plus size={13} aria-hidden style={{ marginRight: 6, verticalAlign: "-2px" }} />
                    Add a role
                  </button>
                </fieldset>
              </li>
            ))}
          </ol>

          <button type="button" onClick={addStage} disabled={stages.length >= MAX_STAGES_PER_TEMPLATE}
            style={{ ...secondaryBtn, marginTop: 12, opacity: stages.length >= MAX_STAGES_PER_TEMPLATE ? 0.5 : 1 }}>
            <Plus size={14} aria-hidden style={{ marginRight: 6, verticalAlign: "-2px" }} />
            Add stage
          </button>
          {stages.length >= MAX_STAGES_PER_TEMPLATE && (
            <p style={{ ...GF, fontSize: 12, color: SLATE, margin: "6px 0 0" }}>
              A workflow can have up to {MAX_STAGES_PER_TEMPLATE} stages.
            </p>
          )}
        </section>

        {/* Step 3 */}
        <section aria-labelledby="wfb-review" style={card}>
          <h2 id="wfb-review" style={heading}>3. Review</h2>
          <p style={{ ...GF, fontSize: 13, color: SLATE_DARK, margin: "0 0 10px", lineHeight: 1.65 }}>
            {plainSummary(name, stages)}
          </p>

          {errors.length > 0 && (
            <div role="alert" style={{ ...warnBox, background: "#FEF2F2", borderColor: "#FECACA", color: "#991B1B", display: "block" }}>
              <strong style={{ display: "block", marginBottom: 4 }}>
                {errors.length === 1 ? "One thing to fix before publishing" : `${errors.length} things to fix before publishing`}
              </strong>
              <ul style={{ margin: 0, paddingLeft: 18 }}>
                {errors.map((e, i) => <li key={i} style={{ marginBottom: 2 }}>{e.message}</li>)}
              </ul>
            </div>
          )}

          {warnings.length > 0 && (
            <div role="note" style={{ ...warnBox, display: "block", marginTop: 8 }}>
              <strong style={{ display: "block", marginBottom: 4 }}>Worth checking</strong>
              <ul style={{ margin: 0, paddingLeft: 18 }}>
                {warnings.map((w, i) => <li key={i} style={{ marginBottom: 2 }}>{w.message}</li>)}
              </ul>
            </div>
          )}

          {errors.length === 0 && warnings.length === 0 && (
            <p style={{ ...GF, fontSize: 12.5, color: "#166534", margin: 0, display: "flex", alignItems: "center", gap: 6 }}>
              <Info size={13} aria-hidden /> This workflow is ready to publish.
            </p>
          )}
        </section>

        <div style={{ display: "flex", gap: 10, flexWrap: "wrap" }}>
          <button type="button" onClick={() => void save(true)} disabled={saving || !validation.canPublish}
            aria-describedby={validation.canPublish ? undefined : "wfb-publish-blocked"}
            style={{ ...primaryBtn, background: validation.canPublish ? AZURE : "#94A3B8", cursor: validation.canPublish ? "pointer" : "not-allowed" }}>
            {saving ? "Saving…" : "Publish workflow"}
          </button>
          <button type="button" onClick={() => void save(false)} disabled={saving} style={secondaryBtn}>
            Save as draft
          </button>
          <Link to="/app/workflow/templates" style={{ ...secondaryBtn, display: "inline-flex", alignItems: "center", textDecoration: "none" }}>
            Cancel
          </Link>
        </div>
        {!validation.canPublish && (
          <p id="wfb-publish-blocked" style={{ ...GF, fontSize: 12, color: SLATE, margin: 0 }}>
            Publishing is unavailable until the items above are fixed. You can still save this as a draft.
          </p>
        )}
      </div>
    </AppContent>
  );
}

/** Plain-language description of the sequence, for the review step. */
function plainSummary(name: string, stages: WorkflowTemplateStage[]): string {
  if (stages.length === 0) return "This workflow has no stages yet.";
  const named = stages.map(s => s.name.trim() || "an unnamed stage");
  const label = name.trim() || "This workflow";
  if (named.length === 1) return `${label} has one stage: ${named[0]}.`;
  const last = named[named.length - 1];
  return `${label} has ${named.length} stages. It starts with ${named[0]}, then moves through ${named.slice(1, -1).join(", ")}${named.length > 2 ? ", and finishes with " : "and finishes with "}${last}.`;
}

const card: React.CSSProperties = {
  background: "#FFFFFF", border: `1px solid ${BORDER}`, borderRadius: 12, padding: 18,
};
const heading: React.CSSProperties = {
  ...GF, fontSize: 15, fontWeight: 700, color: NAVY, margin: "0 0 12px",
};
const warnBox: React.CSSProperties = {
  ...GF, fontSize: 12.5, lineHeight: 1.6, color: "#92400E", background: "#FFFBEB",
  border: "1px solid #FDE68A", borderRadius: 8, padding: "8px 12px",
  display: "flex", alignItems: "center", gap: 6, margin: "0 0 8px",
};

function Field({ label, required, children }: { label: string; required?: boolean; children: React.ReactNode }) {
  return (
    <label style={{ ...GF, display: "block", marginBottom: 12 }}>
      <span style={{ display: "block", fontSize: 12, color: SLATE_DARK, fontWeight: 600, marginBottom: 4 }}>
        {label}{required && <span style={{ color: "#DC2626" }} aria-hidden> *</span>}
        {required && <span className="sr-only"> (required)</span>}
      </span>
      {children}
    </label>
  );
}

// ── Start a run ───────────────────────────────────────────────────────────────

export function StartWorkflowPage() {
  usePageMeta();
  const navigate = useNavigate();
  const [params] = useSearchParams();
  const { user } = usePlatform();
  const preselected = params.get("template");

  const [templates, setTemplates] = useState<WorkflowTemplate[] | null>(null);
  const [selectedId, setSelectedId] = useState<string>(preselected ?? "");
  const [runName, setRunName] = useState("");
  const [assignments, setAssignments] = useState<Record<string, string>>({});
  const [starting, setStarting] = useState(false);

  useEffect(() => {
    let cancelled = false;
    void workflowService.listTemplates("ws_mls_001", {
      search: "", status: "active", category: "all", hasSignatureStage: null,
    }).then(t => { if (!cancelled) setTemplates(t); });
    return () => { cancelled = true; };
  }, []);

  const template = templates?.find(t => t.id === selectedId) ?? null;
  const slots = template?.stages.flatMap(s => s.slots.map(slot => ({ stage: s, slot }))) ?? [];

  async function start() {
    if (!template) return;
    setStarting(true);
    const run = await workflowService.startRun({
      templateId: template.id,
      name: runName.trim() || `${template.name} — new run`,
      documents: [{ id: `wdoc_${Date.now()}`, name: "Sample document.pdf", pageCount: 6 }],
      startedBy: user?.displayName ?? "You",
      assignments,
    });
    setStarting(false);
    if (run) navigate(`/app/workflow/runs/${run.id}`);
  }

  return (
    <AppContent>
      <PageHeader
        title="Start a workflow"
        description="This creates a new run. The workflow itself stays reusable."
        breadcrumbs={[
          { label: "Workflow", to: "/app/workflow" },
          { label: "Workflows", to: "/app/workflow/templates" },
          { label: "Start" },
        ]}
      />
      <div style={{ display: "flex", flexDirection: "column", gap: 16, maxWidth: 720 }}>
        <WorkflowDemoNote />
        <p role="note" style={{
          ...GF, margin: 0, fontSize: 12.5, lineHeight: 1.65, color: SLATE_DARK,
          background: "#EFF6FF", border: "1px solid #BFDBFE", borderRadius: 10, padding: "10px 14px",
        }}>
          Starting this workflow creates a new run. The workflow stays reusable, and this run will have
          its own documents, participants, progress and audit trail. Other runs of the same workflow are
          not affected.
        </p>

        <section style={card}>
          <h2 style={heading}>1. Choose a workflow</h2>
          {!templates ? <p style={{ ...GF, color: SLATE, fontSize: 13 }}>Loading workflows…</p> : (
            <select value={selectedId} onChange={e => { setSelectedId(e.target.value); setAssignments({}); }} style={input}>
              <option value="">Select a workflow…</option>
              {templates.map(t => (
                <option key={t.id} value={t.id}>{t.name} ({t.stages.length} stages)</option>
              ))}
            </select>
          )}
        </section>

        {template && (
          <>
            <section style={card}>
              <h2 style={heading}>2. Name this run</h2>
              <p style={{ ...GF, fontSize: 12.5, color: SLATE, margin: "0 0 8px", lineHeight: 1.5 }}>
                Give it something you will recognise in a list of runs — often the client or matter.
              </p>
              <input value={runName} onChange={e => setRunName(e.target.value)} style={input}
                placeholder={`${template.name} — `} maxLength={120} />
            </section>

            <section style={card}>
              <h2 style={heading}>3. Confirm participants</h2>
              {slots.length === 0 ? (
                <p style={{ ...GF, fontSize: 13, color: SLATE }}>This workflow has no assigned roles.</p>
              ) : (
                <ul style={{ listStyle: "none", margin: 0, padding: 0, display: "flex", flexDirection: "column", gap: 10 }}>
                  {slots.map(({ stage, slot }) => (
                    <li key={slot.id}>
                      <label style={{ ...GF, display: "block" }}>
                        <span style={{ display: "block", fontSize: 12, color: SLATE_DARK, fontWeight: 600, marginBottom: 4 }}>
                          {slot.label || "Unnamed role"}
                          <span style={{ fontWeight: 400, color: SLATE }}> — {stage.name}{!slot.required && " (optional)"}</span>
                        </span>
                        <input
                          value={assignments[slot.id] ?? slot.suggestedName ?? ""}
                          onChange={e => setAssignments(a => ({ ...a, [slot.id]: e.target.value }))}
                          style={input}
                          placeholder="Who is filling this role?"
                        />
                      </label>
                    </li>
                  ))}
                </ul>
              )}
              <p style={{ ...GF, fontSize: 12, color: SLATE, margin: "10px 0 0", lineHeight: 1.5 }}>
                You can leave any of these blank and assign them later. Nobody is notified in this
                demonstration.
              </p>
            </section>

            <div style={{ display: "flex", gap: 10, flexWrap: "wrap" }}>
              <button type="button" onClick={() => void start()} disabled={starting} style={primaryBtn}>
                {starting ? "Starting…" : "Start workflow"}
              </button>
              <Link to="/app/workflow/templates" style={{ ...secondaryBtn, display: "inline-flex", alignItems: "center", textDecoration: "none" }}>
                Cancel
              </Link>
            </div>
          </>
        )}
      </div>
    </AppContent>
  );
}
