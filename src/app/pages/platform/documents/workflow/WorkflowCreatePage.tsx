// Guided Signing Workflow creation — /app/documents/:transactionId/workflow/create
//
// One guided workspace rather than six separate pages: the Kanban stage builder stays
// visible while the guided steps change what is emphasised beneath it. Progressive
// disclosure keeps advanced configuration (ordered stages, authentication, consent,
// instructions) out of a first-time user's way.
//
// Nothing here sends, persists, or signs anything.

import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { Link, useLocation, useNavigate, useSearchParams } from "react-router";
import { ArrowLeft, ArrowRight, FileText, Plus, Undo2 } from "lucide-react";
import {
  GF, WF, TONES, WORKFLOW_STYLES,
  AddPersonPanel, DemonstrationNotice, FieldReadinessMatrix, ParticipantConfigPanel,
  ValidationSummary, WorkflowBoard, WorkflowDocumentPreview, WorkflowSectionHeading,
  WorkflowSheet, WorkflowSkeleton, WorkflowSummaryHeader, useAnnouncer, useWorkflowConfirm,
} from "../../../../components/workflow";
import { CapabilityUnavailable } from "../../../../components/platform/CapabilityUnavailable";
import { WorkflowErrorState } from "./WorkflowTab";
import { buildSafeReturnPath, useWorkflowData } from "./useWorkflowData";
import type {
  AddStageParticipantInput,
  RecipientOrderConversionPreview,
  SigningStage,
  SigningStageExecutionMode,
  SigningStageId,
  SigningStageType,
  StageParticipantAssignmentId,
  UpdateStageParticipantInput,
  WorkflowCreationStepId,
} from "../../../../models/signing-workflow";
import {
  STAGE_DESCRIPTION_MAX_LENGTH,
  STAGE_EXECUTION_MODE_DESCRIPTIONS,
  STAGE_EXECUTION_MODE_LABELS,
  STAGE_NAME_MAX_LENGTH,
  STAGE_TYPE_LABELS,
  SUGGESTED_STAGE_NAMES,
  WORKFLOW_CREATION_STEPS,
  WORKFLOW_DEMONSTRATION_NOTICE,
  WORKFLOW_DESCRIPTION_MAX_LENGTH,
  WORKFLOW_NAME_MAX_LENGTH,
  parseCreationStepId,
} from "../../../../models/signing-workflow";
import { signingWorkflowService } from "../../../../services/mock/signing-workflow.service";

export function WorkflowCreatePage() {
  const data = useWorkflowData();
  const navigate = useNavigate();
  const location = useLocation();
  const [searchParams, setSearchParams] = useSearchParams();
  const { announce, announcerNode } = useAnnouncer();
  const { confirm, confirmDialog } = useWorkflowConfirm();

  const base = `/app/documents/${data.documentId}/workflow`;
  const step: WorkflowCreationStepId = parseCreationStepId(searchParams.get("step"));
  const wantsRecipientConversion = searchParams.get("from") === "recipients";

  const [busy, setBusy] = useState(false);
  const [actionError, setActionError] = useState<string | null>(null);
  const [showPreviewSheet, setShowPreviewSheet] = useState(false);

  // Workflow basics form (only used before a draft exists, and to edit it after).
  const [name, setName] = useState("");
  const [description, setDescription] = useState("");
  const [nameTouched, setNameTouched] = useState(false);

  const [editingStage, setEditingStage] = useState<SigningStage | null>(null);
  const [addingStageAfter, setAddingStageAfter] = useState<number | null>(null);
  const [addPersonStageId, setAddPersonStageId] = useState<SigningStageId | null>(null);
  const [openAssignment, setOpenAssignment] = useState<{
    stageId: SigningStageId; assignmentId: StageParticipantAssignmentId;
  } | null>(null);

  const [conversionPreview, setConversionPreview] = useState<RecipientOrderConversionPreview | null>(null);
  const [conversionApplied, setConversionApplied] = useState(false);

  // ── Unsaved-change protection ───────────────────────────────────────────────
  // Only meaningful, untransferred work counts. An untouched form never warns.
  const hasUnsavedBasics = !data.workflow && (name.trim().length > 0 || description.trim().length > 0);

  useEffect(() => {
    if (!hasUnsavedBasics) return;
    function onBeforeUnload(e: BeforeUnloadEvent) { e.preventDefault(); e.returnValue = ""; }
    window.addEventListener("beforeunload", onBeforeUnload);
    return () => window.removeEventListener("beforeunload", onBeforeUnload);
  }, [hasUnsavedBasics]);

  const leaveBuilder = useCallback((destination: string) => {
    if (!hasUnsavedBasics) { navigate(destination); return; }
    confirm({
      title: "Leave without creating this workflow?",
      body: "The workflow details you entered have not been created yet. They are temporary frontend state and will be cleared.",
      confirmLabel: "Leave and clear",
      destructive: true,
      onConfirm: () => navigate(destination),
    });
  }, [hasUnsavedBasics, confirm, navigate]);

  // ── Default workflow name ───────────────────────────────────────────────────
  const defaultName = useMemo(
    () => `${data.documentSummary.title} Workflow`.slice(0, WORKFLOW_NAME_MAX_LENGTH),
    [data.documentSummary.title],
  );
  const initialisedName = useRef(false);
  useEffect(() => {
    if (!initialisedName.current && !data.workflow) {
      initialisedName.current = true;
      setName(defaultName);
    }
  }, [defaultName, data.workflow]);

  const setStep = useCallback((next: WorkflowCreationStepId) => {
    const params = new URLSearchParams(searchParams);
    params.set("step", next);
    params.delete("from");
    setSearchParams(params, { replace: true });
    const meta = WORKFLOW_CREATION_STEPS.find(s => s.id === next);
    if (meta) announce(`${meta.label}. ${meta.helper}`);
  }, [searchParams, setSearchParams, announce]);

  // ── Recipient-order conversion ──────────────────────────────────────────────
  useEffect(() => {
    if (!wantsRecipientConversion || data.workflow || conversionPreview) return;
    let cancelled = false;
    signingWorkflowService
      .previewRecipientOrderConversion(data.documentId, data.txn, data.ctx)
      .then(result => { if (!cancelled && result.ok) setConversionPreview(result.data); });
    return () => { cancelled = true; };
  }, [wantsRecipientConversion, data.workflow, conversionPreview, data.documentId, data.txn, data.ctx]);

  const applyConversion = useCallback(async () => {
    setBusy(true);
    setActionError(null);
    const result = await signingWorkflowService.applyRecipientOrderConversion(
      data.documentId, data.txn, name.trim() || defaultName, data.ctx,
    );
    setBusy(false);
    if (result.ok) {
      setConversionPreview(null);
      setConversionApplied(true);
      data.reload();
      announce("Stages were created from the current recipient order. Review every requirement before continuing.");
      setStep("actions");
    } else {
      setActionError(result.message);
    }
  }, [data, name, defaultName, announce, setStep]);

  const undoConversion = useCallback(() => {
    if (!data.workflow) return;
    confirm({
      title: "Undo the generated stages?",
      body: "The stages created from the current recipient order will be removed and the draft workflow deleted. The document's own recipient order is not changed.",
      confirmLabel: "Undo and remove draft",
      destructive: true,
      onConfirm: async () => {
        setBusy(true);
        const result = await signingWorkflowService.removeWorkflowDraftDemonstration(
          data.documentId, String(data.workflow!.id), data.ctx,
        );
        setBusy(false);
        if (result.ok) {
          setConversionApplied(false);
          data.reload();
          announce("The generated stages were removed. You can start again.");
          setStep("basics");
        }
      },
    });
  }, [data, announce, setStep, confirm]);

  // ── Mutations ───────────────────────────────────────────────────────────────

  const createDraft = useCallback(async () => {
    setNameTouched(true);
    if (!name.trim()) return;
    setBusy(true);
    setActionError(null);
    const result = await signingWorkflowService.createWorkflowDraft(
      data.documentId,
      { name, description, dueDateDirection: null, requestInstruction: null },
      data.ctx,
    );
    setBusy(false);
    if (result.ok) {
      data.reload();
      announce("Workflow draft created. Now add the stages.");
      setStep("stages");
    } else {
      setActionError(result.message);
    }
  }, [data, name, description, announce, setStep]);

  const saveBasics = useCallback(async () => {
    if (!data.workflow) return;
    setBusy(true);
    const result = await signingWorkflowService.updateWorkflowDraft(
      data.documentId, String(data.workflow.id), { name, description }, data.ctx,
    );
    setBusy(false);
    if (result.ok) { data.reload(); announce("Workflow details updated."); }
    else setActionError(result.message);
  }, [data, name, description, announce]);

  const runStageMutation = useCallback(async (
    fn: () => Promise<{ ok: boolean; message?: string }>,
    successMessage: string,
  ) => {
    setBusy(true);
    setActionError(null);
    const result = await fn();
    setBusy(false);
    if (result.ok) { data.reload(); announce(successMessage); }
    else { setActionError(result.message ?? "That change could not be applied."); }
  }, [data, announce]);

  const moveStage = useCallback((stageId: SigningStageId, toPosition: number) => {
    if (!data.workflow) return;
    const ordered = [...data.stages];
    const from = ordered.findIndex(s => s.id === stageId);
    if (from === -1) return;
    const target = Math.max(0, Math.min(ordered.length - 1, toPosition - 1));
    const [moved] = ordered.splice(from, 1);
    ordered.splice(target, 0, moved);
    void runStageMutation(
      () => signingWorkflowService.reorderWorkflowStages(
        data.documentId, String(data.workflow!.id), ordered.map(s => String(s.id)), data.ctx,
      ),
      `${moved.name} is now stage ${target + 1} of ${ordered.length}.`,
    );
  }, [data, runStageMutation]);

  const reorderAssignment = useCallback((
    stageId: SigningStageId, assignmentId: StageParticipantAssignmentId, toPosition: number,
  ) => {
    if (!data.workflow) return;
    const stage = data.stages.find(s => s.id === stageId);
    if (!stage) return;
    const ordered = [...stage.assignments].sort((a, b) => a.position - b.position);
    const from = ordered.findIndex(a => a.id === assignmentId);
    if (from === -1) return;
    const target = Math.max(0, Math.min(ordered.length - 1, toPosition - 1));
    const [moved] = ordered.splice(from, 1);
    ordered.splice(target, 0, moved);
    void runStageMutation(
      () => signingWorkflowService.reorderStageParticipants(
        data.documentId, String(data.workflow!.id), String(stageId),
        ordered.map(a => String(a.id)), data.ctx,
      ),
      `${moved.participantName} moved to position ${target + 1}. No one's status was changed.`,
    );
  }, [data, runStageMutation]);

  const moveAssignmentToStage = useCallback((
    assignmentId: StageParticipantAssignmentId, fromStageId: SigningStageId, toStageId: SigningStageId,
  ) => {
    if (!data.workflow) return;
    void runStageMutation(
      () => signingWorkflowService.updateStageParticipant(
        data.documentId, String(data.workflow!.id), String(fromStageId), String(assignmentId),
        { targetStageId: toStageId }, data.ctx,
      ),
      "The person was moved to another stage. Their action was not completed.",
    );
  }, [data, runStageMutation]);

  const addPerson = useCallback(async (input: AddStageParticipantInput) => {
    if (!data.workflow || !addPersonStageId) return;
    await runStageMutation(
      () => signingWorkflowService.addStageParticipant(
        data.documentId, String(data.workflow!.id), String(addPersonStageId), input, data.ctx,
      ),
      `${input.participantName} was added to the stage.`,
    );
    setAddPersonStageId(null);
  }, [data, addPersonStageId, runStageMutation]);

  const applyParticipantChange = useCallback(async (input: UpdateStageParticipantInput) => {
    if (!data.workflow || !openAssignment) return;
    await runStageMutation(
      () => signingWorkflowService.updateStageParticipant(
        data.documentId, String(data.workflow!.id), String(openAssignment.stageId),
        String(openAssignment.assignmentId), input, data.ctx,
      ),
      "The participant configuration was updated.",
    );
    setOpenAssignment(null);
  }, [data, openAssignment, runStageMutation]);

  const removeParticipant = useCallback(async () => {
    if (!data.workflow || !openAssignment) return;
    await runStageMutation(
      () => signingWorkflowService.removeStageParticipant(
        data.documentId, String(data.workflow!.id), String(openAssignment.stageId),
        String(openAssignment.assignmentId), data.ctx,
      ),
      "The person was removed from the stage.",
    );
    setOpenAssignment(null);
  }, [data, openAssignment, runStageMutation]);

  const openFieldPlacement = useCallback(() => {
    const returnTo = buildSafeReturnPath(location.pathname);
    navigate(`/app/prepare/fields?returnTo=${encodeURIComponent(returnTo)}`);
  }, [navigate, location.pathname]);

  const selectedAssignment = useMemo(() => {
    if (!openAssignment || !data.workflow) return null;
    const stage = data.workflow.stages.find(s => s.id === openAssignment.stageId);
    const assignment = stage?.assignments.find(a => a.id === openAssignment.assignmentId);
    return stage && assignment ? { stage, assignment } : null;
  }, [openAssignment, data.workflow]);

  useEffect(() => {
    if (openAssignment && !selectedAssignment) setOpenAssignment(null);
  }, [openAssignment, selectedAssignment]);

  // ── Guards ──────────────────────────────────────────────────────────────────

  if (!data.capabilityAvailable) {
    return (
      <CapabilityUnavailable
        outcome="unavailable-feature"
        reasonLabel={data.capabilityReason || "The signing workflow is not available for this document."}
        safeFallbackRoute={data.capabilityFallback || "/app/documents"}
        title="Signing Workflow Not Available"
      />
    );
  }

  if (!data.permissions.canCreateDocumentWorkflow) {
    return (
      <CapabilityUnavailable
        outcome="unavailable-permission"
        reasonLabel={
          data.documentSummary.lockReason
          ?? "You do not have permission to configure the signing workflow for this document."
        }
        safeFallbackRoute={base}
        title="Workflow Is Read-Only"
      />
    );
  }

  if (data.loadState === "loading") {
    return (
      <div className="wf-root">
        <style>{WORKFLOW_STYLES}</style>
        <h1 style={{ ...GF, margin: "0 0 16px", fontSize: 20, fontWeight: 700, color: WF.navy }}>
          Create Signing Workflow
        </h1>
        <WorkflowSkeleton label="Loading the workflow builder" />
      </div>
    );
  }

  if (data.loadState === "error") {
    return (
      <div className="wf-root">
        <style>{WORKFLOW_STYLES}</style>
        <WorkflowErrorState
          title="Workflow Builder Could Not Be Loaded"
          body={data.errorMessage ?? "Something went wrong."}
          primaryLabel="Return to Workflow"
          primaryTo={base}
          onRetry={data.reload}
        />
      </div>
    );
  }

  const validation = data.validation;
  const stepMeta = WORKFLOW_CREATION_STEPS.find(s => s.id === step)!;
  const stepIndex = WORKFLOW_CREATION_STEPS.findIndex(s => s.id === step);

  return (
    <div className="wf-root" style={{ paddingBottom: 8 }}>
      <style>{WORKFLOW_STYLES}</style>
      {announcerNode}

      {/* ── Header ────────────────────────────────────────────────────────── */}
      <header style={{ marginBottom: 18 }}>
        <button
          type="button"
          className="wf-btn wf-btn-ghost wf-btn-sm"
          style={{ padding: 0, marginBottom: 8 }}
          onClick={() => leaveBuilder(base)}
        >
          <ArrowLeft size={15} aria-hidden />
          Back to Signing Workflow
        </button>
        <h1 style={{ ...GF, margin: "0 0 6px", fontSize: 20, fontWeight: 700, color: WF.navy }}>
          Create Signing Workflow
        </h1>
        <p style={{ ...GF, margin: 0, fontSize: 14, color: WF.slate6, lineHeight: 1.6 }}>
          Decide who acts on this document, in what order, and exactly what each person must do.
        </p>
      </header>

      {/* ── Step navigation ───────────────────────────────────────────────── */}
      <nav aria-label="Workflow creation steps" style={{ marginBottom: 18 }}>
        <ol
          style={{
            ...GF, margin: 0, padding: 0, listStyle: "none",
            display: "flex", gap: 6, flexWrap: "wrap",
          }}
        >
          {WORKFLOW_CREATION_STEPS.map((s, i) => {
            const active = s.id === step;
            const reachable = !!data.workflow || s.id === "basics";
            return (
              <li key={s.id}>
                <button
                  type="button"
                  className={`wf-btn wf-btn-sm ${active ? "wf-btn-primary" : "wf-btn-secondary"}`}
                  aria-current={active ? "step" : undefined}
                  disabled={!reachable}
                  onClick={() => setStep(s.id)}
                  title={reachable ? s.helper : "Create the workflow first."}
                >
                  <span aria-hidden style={{ fontWeight: 800, opacity: 0.75 }}>{i + 1}</span>
                  {s.label}
                </button>
              </li>
            );
          })}
        </ol>
        <p style={{ ...GF, margin: "10px 0 0", fontSize: 13, color: WF.slate6 }}>
          Step {stepIndex + 1} of {WORKFLOW_CREATION_STEPS.length} — {stepMeta.helper}
        </p>
      </nav>

      {actionError && (
        <div
          role="alert"
          className="wf-card"
          style={{ padding: 12, marginBottom: 16, background: TONES.error.bg, borderColor: TONES.error.border }}
        >
          <p style={{ ...GF, margin: 0, fontSize: 13, color: TONES.error.text }}>{actionError}</p>
        </div>
      )}

      {/* ── Main split ────────────────────────────────────────────────────── */}
      <div className="wf-split">
        <div className="wf-stack">
          {/* Basics */}
          {step === "basics" && (
            <section className="wf-panel wf-stack" aria-label="Workflow basics">
              <WorkflowSectionHeading
                title="Workflow Basics"
                description="Give this signing workflow a name you will recognise later."
              />

              <div>
                <label htmlFor="wf-name" style={{ ...GF, display: "block", fontSize: 13, fontWeight: 600, color: WF.slate7, marginBottom: 6 }}>
                  Workflow name <span aria-hidden style={{ color: WF.errorText }}>*</span>
                </label>
                <input
                  id="wf-name"
                  className="wf-input"
                  value={name}
                  maxLength={WORKFLOW_NAME_MAX_LENGTH}
                  onChange={(e) => setName(e.target.value)}
                  onBlur={() => setNameTouched(true)}
                  aria-invalid={nameTouched && !name.trim()}
                  aria-describedby="wf-name-hint"
                />
                <p id="wf-name-hint" style={{ ...GF, margin: "6px 0 0", fontSize: 12, color: WF.slate5 }}>
                  Plain text, up to {WORKFLOW_NAME_MAX_LENGTH} characters. Only you and your team see this.
                </p>
                {nameTouched && !name.trim() && (
                  <p role="alert" style={{ ...GF, margin: "6px 0 0", fontSize: 12, color: WF.errorText }}>
                    A workflow name is required.
                  </p>
                )}
              </div>

              <div>
                <label htmlFor="wf-description" style={{ ...GF, display: "block", fontSize: 13, fontWeight: 600, color: WF.slate7, marginBottom: 6 }}>
                  Description (optional)
                </label>
                <textarea
                  id="wf-description"
                  className="wf-textarea"
                  value={description}
                  maxLength={WORKFLOW_DESCRIPTION_MAX_LENGTH}
                  onChange={(e) => setDescription(e.target.value)}
                />
              </div>

              <div className="wf-row" style={{ gap: 10 }}>
                {data.workflow ? (
                  <>
                    <button type="button" className="wf-btn wf-btn-primary" disabled={busy} onClick={saveBasics}>
                      Save Details
                    </button>
                    <button type="button" className="wf-btn wf-btn-secondary" onClick={() => setStep("stages")}>
                      Continue
                      <ArrowRight size={15} aria-hidden />
                    </button>
                  </>
                ) : (
                  <>
                    <button type="button" className="wf-btn wf-btn-primary" disabled={busy} onClick={createDraft}>
                      {busy ? "Working…" : "Create Signing Workflow"}
                    </button>
                    <button
                      type="button"
                      className="wf-btn wf-btn-secondary"
                      disabled={busy}
                      onClick={() => {
                        void signingWorkflowService
                          .previewRecipientOrderConversion(data.documentId, data.txn, data.ctx)
                          .then(r => { if (r.ok) setConversionPreview(r.data); });
                      }}
                    >
                      Use Current Recipient Order
                    </button>
                  </>
                )}
              </div>

              <DemonstrationNotice text={WORKFLOW_DEMONSTRATION_NOTICE} compact />
            </section>
          )}

          {/* Step guidance for every step after basics */}
          {step !== "basics" && data.workflow && (
            <section className="wf-panel" aria-label={stepMeta.label}>
              <WorkflowSectionHeading title={stepMeta.label} description={stepMeta.helper} />
              <div style={{ marginTop: 12 }}>
                <StepGuidance step={step} />
              </div>
              {conversionApplied && step === "actions" && (
                <div style={{ marginTop: 14 }}>
                  <button type="button" className="wf-btn wf-btn-secondary wf-btn-sm" disabled={busy} onClick={undoConversion}>
                    <Undo2 size={15} aria-hidden />
                    Undo generated stages
                  </button>
                </div>
              )}
            </section>
          )}

          {/* Board — always available once a draft exists */}
          {data.workflow && validation && step !== "fields" && step !== "review" && (
            <WorkflowBoard
              stages={data.stages}
              validation={validation}
              selection={data.selection}
              onSelect={data.setSelection}
              mode="builder"
              currentStageId={null}
              canEdit={data.permissions.canEditDocumentWorkflow && !busy}
              announce={announce}
              onAddStage={(afterPosition) => setAddingStageAfter(afterPosition)}
              onEditStage={(stageId) => setEditingStage(data.stages.find(s => s.id === stageId) ?? null)}
              onDuplicateStage={(stageId) => void runStageMutation(
                () => signingWorkflowService.duplicateWorkflowStage(
                  data.documentId, String(data.workflow!.id), String(stageId), data.ctx,
                ),
                "Stage duplicated. Review recipients and field assignments in the copy.",
              )}
              onDeleteStage={(stageId) => {
                const stage = data.stages.find(s => s.id === stageId);
                if (!stage) return;
                confirm({
                  title: `Delete "${stage.name}"?`,
                  body: stage.assignments.length > 0
                    ? `This stage contains ${stage.assignments.length} ${stage.assignments.length === 1 ? "person" : "people"}. Their assignments will be removed from the draft configuration. No invitation is withdrawn and no completed action is undone.`
                    : "This empty stage will be removed from the draft configuration.",
                  confirmLabel: "Delete stage",
                  destructive: true,
                  onConfirm: () => void runStageMutation(
                    () => signingWorkflowService.removeWorkflowStage(
                      data.documentId, String(data.workflow!.id), String(stageId), data.ctx,
                    ),
                    `${stage.name} was removed.`,
                  ),
                });
              }}
              onMoveStage={moveStage}
              onAddPerson={(stageId) => setAddPersonStageId(stageId)}
              onMoveAssignment={moveAssignmentToStage}
              onReorderAssignment={reorderAssignment}
            />
          )}

          {data.workflow && data.stages.length === 0 && step === "stages" && (
            <div className="wf-panel" style={{ textAlign: "center" }}>
              <p style={{ ...GF, margin: "0 0 12px", fontSize: 14, color: WF.slate6, lineHeight: 1.6 }}>
                No stages yet. A stage is one point in the sequence where one or more people act.
              </p>
              <button type="button" className="wf-btn wf-btn-primary" onClick={() => setAddingStageAfter(0)}>
                <Plus size={16} aria-hidden />
                Add First Stage
              </button>
            </div>
          )}

          {/* Fields step */}
          {step === "fields" && data.workflow && (
            <section className="wf-panel" aria-label="Field readiness">
              <WorkflowSectionHeading
                title="Field Readiness"
                description="Everyone who must sign needs their own fields on the document."
              />
              <div style={{ marginTop: 14 }}>
                <FieldReadinessMatrix stages={data.stages} onOpenFieldPlacement={openFieldPlacement} />
              </div>
            </section>
          )}

          {/* Review step */}
          {step === "review" && data.workflow && validation && (
            <section className="wf-panel wf-stack" aria-label="Review">
              <WorkflowSectionHeading
                title="Ready to review?"
                description="The full review screen shows the stage sequence, every required action, and the field readiness for each person."
              />
              <ValidationSummary
                issues={validation.issues}
                emptyMessage="This configuration has no outstanding issues."
                onRepair={(issue) => {
                  if (issue.repairTarget === "field-placement") openFieldPlacement();
                  else if (issue.repairTarget === "workflow-basics") setStep("basics");
                  else setStep("stages");
                }}
              />
              <Link
                to={`${base}/review`}
                className="wf-btn wf-btn-primary"
                aria-disabled={!validation.readyForReview}
                onClick={(e) => { if (!validation.readyForReview) e.preventDefault(); }}
                style={validation.readyForReview ? undefined : { opacity: 0.55, pointerEvents: "none" }}
              >
                Open Review Screen
                <ArrowRight size={16} aria-hidden />
              </Link>
              {!validation.readyForReview && (
                <p style={{ ...GF, margin: 0, fontSize: 12, color: WF.slate5 }}>
                  Fix the issues above before opening the review screen.
                </p>
              )}
            </section>
          )}

          {/* Validation panel (always visible once a draft exists, except on review) */}
          {data.workflow && validation && step !== "review" && (
            <ValidationSummary
              title="Configuration Checks"
              issues={validation.issues}
              emptyMessage="This configuration has no outstanding issues."
              onRepair={(issue) => {
                if (issue.repairTarget === "field-placement") { setStep("fields"); }
                else if (issue.repairTarget === "workflow-basics") setStep("basics");
                else if (issue.stageId) {
                  const stage = data.stages.find(s => String(s.id) === String(issue.stageId));
                  if (stage) setEditingStage(stage);
                }
              }}
            />
          )}
        </div>

        {/* ── Right panel ───────────────────────────────────────────────── */}
        <div className="wf-stack wf-desktop-only">
          <WorkflowSummaryHeader document={data.documentSummary} summary={data.summary} compact />
          <WorkflowDocumentPreview
            preview={data.preview}
            loading={data.previewLoading}
            documentTitle={data.documentSummary.title}
            contextLabel="Select a stage or a person on the board to see the fields that belong to them."
            selectedParticipantName={null}
            onPageChange={data.setPreviewPage}
            onRetry={data.reloadPreview}
            onOpenFieldPlacement={openFieldPlacement}
          />
        </div>
      </div>

      {/* ── Mobile sticky action bar ──────────────────────────────────────── */}
      <div className="wf-mobile-actionbar">
        <button
          type="button"
          className="wf-btn wf-btn-secondary wf-btn-sm"
          onClick={() => setShowPreviewSheet(true)}
          style={{ flex: 1 }}
        >
          <FileText size={15} aria-hidden />
          Preview
        </button>
        {stepIndex < WORKFLOW_CREATION_STEPS.length - 1 ? (
          <button
            type="button"
            className="wf-btn wf-btn-primary wf-btn-sm"
            style={{ flex: 2 }}
            disabled={!data.workflow && step === "basics" && !name.trim()}
            onClick={() => {
              if (!data.workflow && step === "basics") { void createDraft(); return; }
              setStep(WORKFLOW_CREATION_STEPS[stepIndex + 1].id);
            }}
          >
            Continue
            <ArrowRight size={15} aria-hidden />
          </button>
        ) : (
          <Link to={`${base}/review`} className="wf-btn wf-btn-primary wf-btn-sm" style={{ flex: 2 }}>
            Review Workflow
          </Link>
        )}
      </div>

      {/* ── Mobile preview sheet ──────────────────────────────────────────── */}
      {showPreviewSheet && (
        <div
          role="dialog"
          aria-modal="true"
          aria-label="Document preview"
          className="wf-mobile-only"
          style={{ position: "fixed", inset: 0, zIndex: 1100, background: WF.white, overflowY: "auto", padding: 16 }}
        >
          <WorkflowDocumentPreview
            preview={data.preview}
            loading={data.previewLoading}
            documentTitle={data.documentSummary.title}
            contextLabel="Select a stage or a person on the board to see the fields that belong to them."
            selectedParticipantName={null}
            onPageChange={data.setPreviewPage}
            onRetry={data.reloadPreview}
            onClose={() => setShowPreviewSheet(false)}
            onOpenFieldPlacement={openFieldPlacement}
          />
        </div>
      )}

      {/* ── Stage editor ──────────────────────────────────────────────────── */}
      {(editingStage || addingStageAfter !== null) && data.workflow && (
        <StageEditorSheet
          stage={editingStage}
          insertAfterPosition={addingStageAfter}
          busy={busy}
          onClose={() => { setEditingStage(null); setAddingStageAfter(null); }}
          onSave={async (input) => {
            if (editingStage) {
              await runStageMutation(
                () => signingWorkflowService.updateWorkflowStage(
                  data.documentId, String(data.workflow!.id), String(editingStage.id), input, data.ctx,
                ),
                `${input.name ?? editingStage.name} was updated.`,
              );
            } else {
              await runStageMutation(
                () => signingWorkflowService.addWorkflowStage(
                  data.documentId, String(data.workflow!.id),
                  { ...input, name: input.name ?? "", position: (addingStageAfter ?? 0) + 1 },
                  data.ctx,
                ),
                `${input.name} was added as a stage.`,
              );
            }
            setEditingStage(null);
            setAddingStageAfter(null);
          }}
        />
      )}

      {/* ── Add person ────────────────────────────────────────────────────── */}
      {addPersonStageId && data.workflow && (() => {
        const stage = data.stages.find(s => s.id === addPersonStageId);
        if (!stage) return null;
        const inOtherStages: Record<string, string[]> = {};
        for (const other of data.stages) {
          if (other.id === stage.id) continue;
          for (const a of other.assignments) {
            inOtherStages[a.participantId] = [...(inOtherStages[a.participantId] ?? []), other.name];
          }
        }
        return (
          <AddPersonPanel
            stage={stage}
            candidates={data.candidates}
            alreadyInStage={stage.assignments.map(a => a.participantId)}
            inOtherStages={inOtherStages}
            onAdd={addPerson}
            onClose={() => setAddPersonStageId(null)}
          />
        );
      })()}

      {/* ── Participant configuration ─────────────────────────────────────── */}
      {selectedAssignment && (
        <ParticipantConfigPanel
          assignment={selectedAssignment.assignment}
          stage={selectedAssignment.stage}
          allStages={data.stages}
          canEdit={data.permissions.canConfigureParticipantActions && !busy}
          onApply={applyParticipantChange}
          onRemove={removeParticipant}
          onOpenFieldPlacement={openFieldPlacement}
          onClose={() => {
            setOpenAssignment(null);
            // Clearing the selection lets the same card be reopened immediately.
            data.setSelection({ stageId: data.selection.stageId, assignmentId: null });
          }}
        />
      )}

      {/* ── Recipient-order conversion preview ────────────────────────────── */}
      {conversionPreview && (
        <ConversionPreviewSheet
          preview={conversionPreview}
          busy={busy}
          onApply={applyConversion}
          onClose={() => {
            setConversionPreview(null);
            const params = new URLSearchParams(searchParams);
            params.delete("from");
            setSearchParams(params, { replace: true });
          }}
        />
      )}

      {confirmDialog}

      {/* Cards open the participant panel when clicked on the board */}
      <BoardSelectionBridge
        selection={data.selection}
        onOpen={(stageId, assignmentId) => setOpenAssignment({ stageId, assignmentId })}
      />
    </div>
  );
}

// ── Board selection bridge ────────────────────────────────────────────────────
// Opens the configuration panel whenever a card becomes the selected assignment.

function BoardSelectionBridge({
  selection, onOpen,
}: {
  selection: { stageId: SigningStageId | null; assignmentId: StageParticipantAssignmentId | null };
  onOpen: (stageId: SigningStageId, assignmentId: StageParticipantAssignmentId) => void;
}) {
  const last = useRef<string | null>(null);
  useEffect(() => {
    if (!selection.stageId || !selection.assignmentId) { last.current = null; return; }
    const key = `${selection.stageId}:${selection.assignmentId}`;
    if (last.current === key) return;
    last.current = key;
    onOpen(selection.stageId, selection.assignmentId);
  }, [selection.stageId, selection.assignmentId, onOpen]);
  return null;
}

// ── Step guidance ─────────────────────────────────────────────────────────────

function StepGuidance({ step }: { step: WorkflowCreationStepId }) {
  const lines: Record<WorkflowCreationStepId, string[]> = {
    basics: [],
    stages: [
      "Each stage is one point in the sequence. Stage 1 runs first; every later stage waits for the one before it.",
      "A stage needs at least one person who must act, or it will never complete.",
      "Use the move buttons or drag a column to change the order. Both do exactly the same thing.",
    ],
    people: [
      "Add each person to the stage where they act.",
      "The same person may appear in more than one stage. Each appearance is a separate action they must complete.",
      "Adding someone here does not grant document access or send an invitation.",
    ],
    actions: [
      "Every person needs one explicit required action: Sign, Approve, Review, Acknowledge, View, or Receive a Copy.",
      "A review is not an approval. An approval is not a signature unless you require one.",
      "Copy recipients and view-only participants never hold up the stage.",
    ],
    fields: [
      "Everyone with a signature requirement needs their own Signature field on the document.",
      "One signature field belongs to one person. It is never shared across a stage or a group.",
      "Open Field Placement to add or reassign fields, then come back here.",
    ],
    review: [
      "The review screen shows the stage order, the people in each stage, every required action, and the field readiness.",
    ],
  };
  return (
    <ul style={{ ...GF, margin: 0, paddingLeft: 18, display: "flex", flexDirection: "column", gap: 8 }}>
      {lines[step].map(l => (
        <li key={l} style={{ fontSize: 13, color: WF.slate6, lineHeight: 1.65 }}>{l}</li>
      ))}
    </ul>
  );
}

// ── Stage editor sheet ────────────────────────────────────────────────────────

function StageEditorSheet({
  stage, insertAfterPosition, busy, onSave, onClose,
}: {
  stage: SigningStage | null;
  insertAfterPosition: number | null;
  busy: boolean;
  onSave: (input: {
    name?: string; description?: string | null;
    type?: SigningStageType; executionMode?: SigningStageExecutionMode;
  }) => void | Promise<void>;
  onClose: () => void;
}) {
  const [name, setName] = useState(stage?.name ?? "");
  const [description, setDescription] = useState(stage?.description ?? "");
  const [type, setType] = useState<SigningStageType>(stage?.type ?? "action");
  const [executionMode, setExecutionMode] = useState<SigningStageExecutionMode>(stage?.executionMode ?? "parallel");
  const [showAdvanced, setShowAdvanced] = useState(false);
  const [touched, setTouched] = useState(false);

  const editing = !!stage;
  const invalid = !name.trim();

  return (
    <WorkflowSheet
      title={editing ? `Edit Stage ${stage!.position}` : `Add Stage ${(insertAfterPosition ?? 0) + 1}`}
      onClose={onClose}
      footer={
        <>
          <button type="button" className="wf-btn wf-btn-secondary" onClick={onClose}>Cancel</button>
          <button
            type="button"
            className="wf-btn wf-btn-primary"
            disabled={busy || invalid}
            onClick={() => { setTouched(true); if (!invalid) void onSave({ name, description: description || null, type, executionMode }); }}
          >
            {editing ? "Save Stage" : "Add Stage"}
          </button>
        </>
      }
    >
      <div className="wf-stack">
        <div>
          <label htmlFor="wf-stage-name" style={{ ...GF, display: "block", fontSize: 13, fontWeight: 600, color: WF.slate7, marginBottom: 6 }}>
            Stage name <span aria-hidden style={{ color: WF.errorText }}>*</span>
          </label>
          <input
            id="wf-stage-name"
            className="wf-input"
            value={name}
            maxLength={STAGE_NAME_MAX_LENGTH}
            onChange={(e) => setName(e.target.value)}
            onBlur={() => setTouched(true)}
            aria-invalid={touched && invalid}
          />
          {touched && invalid && (
            <p role="alert" style={{ ...GF, margin: "6px 0 0", fontSize: 12, color: WF.errorText }}>
              A stage name is required.
            </p>
          )}
          {!editing && (
            <div className="wf-row" style={{ gap: 6, marginTop: 10 }}>
              {SUGGESTED_STAGE_NAMES.map(s => (
                <button
                  key={s}
                  type="button"
                  className="wf-btn wf-btn-secondary wf-btn-sm"
                  onClick={() => setName(s)}
                >
                  {s}
                </button>
              ))}
            </div>
          )}
        </div>

        <div>
          <label htmlFor="wf-stage-desc" style={{ ...GF, display: "block", fontSize: 13, fontWeight: 600, color: WF.slate7, marginBottom: 6 }}>
            Description (optional)
          </label>
          <textarea
            id="wf-stage-desc"
            className="wf-textarea"
            value={description}
            maxLength={STAGE_DESCRIPTION_MAX_LENGTH}
            onChange={(e) => setDescription(e.target.value)}
          />
        </div>

        <button
          type="button"
          className="wf-btn wf-btn-ghost wf-btn-sm"
          aria-expanded={showAdvanced}
          onClick={() => setShowAdvanced(a => !a)}
          style={{ justifyContent: "flex-start", padding: 0 }}
        >
          {showAdvanced ? "Hide advanced options" : "Show advanced options"}
        </button>

        {showAdvanced && (
          <div className="wf-stack">
            <fieldset style={{ border: "none", margin: 0, padding: 0 }}>
              <legend style={{ ...GF, fontSize: 13, fontWeight: 600, color: WF.slate7, marginBottom: 8 }}>
                Stage type
              </legend>
              {(["action", "distribution"] as SigningStageType[]).map(t => (
                <label key={t} className="wf-row" style={{ gap: 10, minHeight: 44 }}>
                  <input
                    type="radio" name="wf-stage-type" checked={type === t}
                    onChange={() => setType(t)} style={{ width: 18, height: 18 }}
                  />
                  <span style={{ ...GF, fontSize: 13, color: WF.slate7 }}>
                    <strong>{STAGE_TYPE_LABELS[t]}</strong>
                    {" — "}
                    {t === "action"
                      ? "Contains people who must sign, approve, review, or acknowledge."
                      : "Contains only people who receive a copy or view the document."}
                  </span>
                </label>
              ))}
            </fieldset>

            <fieldset style={{ border: "none", margin: 0, padding: 0 }}>
              <legend style={{ ...GF, fontSize: 13, fontWeight: 600, color: WF.slate7, marginBottom: 8 }}>
                When more than one person is in this stage
              </legend>
              {(["parallel", "ordered"] as SigningStageExecutionMode[]).map(m => (
                <label key={m} className="wf-row" style={{ gap: 10, minHeight: 44, alignItems: "flex-start" }}>
                  <input
                    type="radio" name="wf-stage-exec" checked={executionMode === m}
                    onChange={() => setExecutionMode(m)} style={{ width: 18, height: 18, marginTop: 3 }}
                  />
                  <span style={{ ...GF, fontSize: 13, color: WF.slate7, lineHeight: 1.6 }}>
                    <strong>{STAGE_EXECUTION_MODE_LABELS[m]}</strong>
                    <br />
                    <span style={{ color: WF.slate5, fontSize: 12 }}>
                      {STAGE_EXECUTION_MODE_DESCRIPTIONS[m]}
                    </span>
                  </span>
                </label>
              ))}
            </fieldset>
          </div>
        )}
      </div>
    </WorkflowSheet>
  );
}

// ── Conversion preview ────────────────────────────────────────────────────────

function ConversionPreviewSheet({
  preview, busy, onApply, onClose,
}: {
  preview: RecipientOrderConversionPreview;
  busy: boolean;
  onApply: () => void;
  onClose: () => void;
}) {
  return (
    <WorkflowSheet
      title="Create Stages from Current Recipient Order"
      onClose={onClose}
      footer={
        <>
          <button type="button" className="wf-btn wf-btn-secondary" onClick={onClose}>Cancel</button>
          <button
            type="button"
            className="wf-btn wf-btn-primary"
            disabled={busy || !preview.available || preview.wouldOverwriteExistingConfiguration}
            onClick={onApply}
          >
            Apply These Stages
          </button>
        </>
      }
    >
      {!preview.available ? (
        <p style={{ ...GF, margin: 0, fontSize: 14, color: WF.slate6, lineHeight: 1.6 }}>
          {preview.unavailableReason ?? "This document does not have a recipient order to convert."}
        </p>
      ) : (
        <div className="wf-stack">
          {preview.wouldOverwriteExistingConfiguration && (
            <div className="wf-card" style={{ padding: 12, background: TONES.warning.bg, borderColor: TONES.warning.border }}>
              <p style={{ ...GF, margin: 0, fontSize: 13, color: TONES.warning.text, lineHeight: 1.6 }}>
                A signing workflow already exists for this document. Existing configuration is
                never overwritten — remove the current workflow first if you want to start again.
              </p>
            </div>
          )}

          <p style={{ ...GF, margin: 0, fontSize: 13, color: WF.slate6, lineHeight: 1.6 }}>
            This is a preview. Nothing changes until you apply it, and you can undo it before you
            leave the builder.
          </p>

          <ol style={{ ...GF, margin: 0, padding: 0, listStyle: "none", display: "flex", flexDirection: "column", gap: 12 }}>
            {preview.stages.map((s, i) => (
              <li key={`${s.sourceStepNumber}-${i}`} className="wf-card" style={{ padding: 14 }}>
                <p style={{ ...GF, margin: "0 0 8px", fontSize: 13, fontWeight: 700, color: WF.navy }}>
                  Stage {i + 1} — {s.proposedName}
                </p>
                <ul style={{ margin: 0, padding: 0, listStyle: "none", display: "flex", flexDirection: "column", gap: 8 }}>
                  {s.participants.map(p => (
                    <li key={p.participantId}>
                      <p style={{ ...GF, margin: 0, fontSize: 13, fontWeight: 600, color: WF.slate7, overflowWrap: "anywhere" }}>
                        {p.participantName}
                      </p>
                      <p style={{ ...GF, margin: "2px 0 0", fontSize: 12, color: WF.slate5, lineHeight: 1.55 }}>
                        Proposed action: {p.proposedAction}. {p.suggestionReason}
                      </p>
                    </li>
                  ))}
                </ul>
              </li>
            ))}
          </ol>

          <ul style={{ ...GF, margin: 0, paddingLeft: 18, display: "flex", flexDirection: "column", gap: 6 }}>
            {preview.notes.map(n => (
              <li key={n} style={{ fontSize: 12, color: WF.slate5, lineHeight: 1.6 }}>{n}</li>
            ))}
          </ul>
        </div>
      )}
    </WorkflowSheet>
  );
}
