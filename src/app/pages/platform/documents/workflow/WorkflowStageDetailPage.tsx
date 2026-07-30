// Signing stage detail — /app/documents/:transactionId/workflow/stages/:stageId
//
// Draft workflows may be edited here. Once the transaction has moved past draft,
// the configuration is shown read-only so nothing implies a production transaction
// was modified.

import { useCallback, useEffect, useMemo, useState } from "react";
import { Link, useNavigate, useParams, useLocation } from "react-router";
import { ArrowLeft } from "lucide-react";
import {
  GF, WF, TONES, WORKFLOW_STYLES,
  AssignmentStatusPill, DemonstrationNotice, ExecutionModeLine, ParticipantAvatar,
  ParticipantConfigPanel, ReadinessPill, RequirementPill, StageNumberBadge,
  StageStatusPill, ValidationSummary, WorkflowNotificationPreview, WorkflowPill,
  WorkflowProgressBar, WorkflowSectionHeading, WorkflowSkeleton, useAnnouncer,
} from "../../../../components/workflow";
import { CapabilityUnavailable } from "../../../../components/platform/CapabilityUnavailable";
import { WorkflowErrorState } from "./WorkflowTab";
import { buildSafeReturnPath, useWorkflowData } from "./useWorkflowData";
import type {
  StageParticipantAssignmentId,
  UpdateStageParticipantInput,
} from "../../../../models/signing-workflow";
import {
  AUTH_DIRECTION_LABELS,
  CONSENT_DIRECTION_LABELS,
  NOTIFICATION_DIRECTION_LABELS,
  STAGE_ACTION_LABELS,
  STAGE_COMPLETION_RULE_LABELS,
  STAGE_EXECUTION_MODE_DESCRIPTIONS,
  STAGE_TYPE_LABELS,
  WORKFLOW_DEMONSTRATION_NOTICE,
  isSafeWorkflowIdValue,
} from "../../../../models/signing-workflow";
import {
  describeAssignmentEligibility,
  resolveNextStage,
  resolveStageProgress,
  stageHasTerminalNegativeAssignment,
} from "../../../../services/signing-workflow.resolver";
import { issuesForStage } from "../../../../services/signing-workflow.validation";
import { signingWorkflowService } from "../../../../services/mock/signing-workflow.service";

export function WorkflowStageDetailPage() {
  const { stageId } = useParams<{ stageId: string }>();
  const data = useWorkflowData();
  const navigate = useNavigate();
  const location = useLocation();
  const { announce, announcerNode } = useAnnouncer();
  const [busy, setBusy] = useState(false);

  const base = `/app/documents/${data.documentId}/workflow`;
  const validStageId = isSafeWorkflowIdValue(stageId) ? stageId : null;

  const stage = useMemo(
    () => (validStageId ? data.stages.find(s => String(s.id) === validStageId) ?? null : null),
    [data.stages, validStageId],
  );

  const [openAssignment, setOpenAssignment] = useState<StageParticipantAssignmentId | null>(null);
  const selectedAssignment = useMemo(
    () => (stage && openAssignment ? stage.assignments.find(a => a.id === openAssignment) ?? null : null),
    [stage, openAssignment],
  );

  useEffect(() => {
    if (openAssignment && !selectedAssignment) setOpenAssignment(null);
  }, [openAssignment, selectedAssignment]);

  const openFieldPlacement = useCallback(() => {
    const returnTo = buildSafeReturnPath(location.pathname);
    navigate(`/app/prepare/fields?returnTo=${encodeURIComponent(returnTo)}`);
  }, [navigate, location.pathname]);

  const applyParticipantChange = useCallback(async (input: UpdateStageParticipantInput) => {
    if (!data.workflow || !stage || !openAssignment) return;
    setBusy(true);
    const result = await signingWorkflowService.updateStageParticipant(
      data.documentId, String(data.workflow.id), String(stage.id), String(openAssignment), input, data.ctx,
    );
    setBusy(false);
    if (result.ok) { setOpenAssignment(null); data.reload(); announce("The participant configuration was updated."); }
    else announce(result.message);
  }, [data, stage, openAssignment, announce]);

  const removeParticipant = useCallback(async () => {
    if (!data.workflow || !stage || !openAssignment) return;
    setBusy(true);
    const result = await signingWorkflowService.removeStageParticipant(
      data.documentId, String(data.workflow.id), String(stage.id), String(openAssignment), data.ctx,
    );
    setBusy(false);
    if (result.ok) { setOpenAssignment(null); data.reload(); announce("The person was removed from the stage."); }
  }, [data, stage, openAssignment, announce]);

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

  if (!data.permissions.canViewDocumentWorkflow) {
    return (
      <CapabilityUnavailable
        outcome="unavailable-permission"
        reasonLabel="You do not have permission to view the signing workflow for this document."
        safeFallbackRoute="/app/documents"
        title="Permission Required"
      />
    );
  }

  if (data.loadState === "loading") {
    return (
      <div className="wf-root">
        <style>{WORKFLOW_STYLES}</style>
        <h1 style={{ ...GF, margin: "0 0 16px", fontSize: 20, fontWeight: 700, color: WF.navy }}>
          Signing Stage
        </h1>
        <WorkflowSkeleton label="Loading the stage" />
      </div>
    );
  }

  if (!validStageId || !stage || !data.workflow || !data.validation) {
    return (
      <div className="wf-root">
        <style>{WORKFLOW_STYLES}</style>
        <WorkflowErrorState
          title="Stage Not Found"
          body="That stage is not part of this document's signing workflow."
          primaryLabel="Return to Signing Workflow"
          primaryTo={base}
        />
      </div>
    );
  }

  const progress = resolveStageProgress(stage);
  const issues = issuesForStage(data.validation, String(stage.id));
  const isCurrent = data.currentStageId === stage.id;
  const nextStage = resolveNextStage(data.workflow, stage.id);
  const blocked = stageHasTerminalNegativeAssignment(stage);
  const editable = data.permissions.canEditDocumentWorkflow && stage.status === "draft";
  const sorted = [...stage.assignments].sort((a, b) => a.position - b.position);

  return (
    <div className="wf-root" style={{ paddingBottom: 8 }}>
      <style>{WORKFLOW_STYLES}</style>
      {announcerNode}

      <header style={{ marginBottom: 18 }}>
        <Link to={base} className="wf-btn wf-btn-ghost wf-btn-sm" style={{ padding: 0, marginBottom: 8 }}>
          <ArrowLeft size={15} aria-hidden />
          Back to Signing Workflow
        </Link>
        <div className="wf-row" style={{ gap: 10, marginBottom: 6 }}>
          <StageNumberBadge position={stage.position} current={isCurrent} />
          <h1 style={{ ...GF, margin: 0, fontSize: 20, fontWeight: 700, color: WF.navy, overflowWrap: "anywhere" }}>
            {stage.name}
          </h1>
        </div>
        <div className="wf-row" style={{ gap: 6 }}>
          <StageStatusPill status={stage.status} />
          <WorkflowPill label={STAGE_TYPE_LABELS[stage.type]} tone={TONES.neutral} />
          {isCurrent && <WorkflowPill label="Current stage" tone={TONES.azure} strong />}
        </div>
      </header>

      <div className="wf-split">
        <div className="wf-stack">
          {/* ── Configuration ─────────────────────────────────────────── */}
          <section className="wf-panel wf-stack" aria-label="Stage configuration">
            <WorkflowSectionHeading
              title="Configuration"
              description={
                editable
                  ? "This stage is still a draft, so it can be edited."
                  : "This stage is shown as read-only configuration. Nothing here modifies a production transaction."
              }
              action={
                editable
                  ? <Link to={`${base}/create`} className="wf-btn wf-btn-secondary wf-btn-sm">Edit in Builder</Link>
                  : undefined
              }
            />

            {stage.description && (
              <p style={{ ...GF, margin: 0, fontSize: 13, color: WF.slate6, lineHeight: 1.65 }}>
                {stage.description}
              </p>
            )}

            <dl style={{ ...GF, margin: 0, display: "flex", flexDirection: "column", gap: 10, fontSize: 13 }}>
              <DetailRow label="Position" value={`Stage ${stage.position} of ${data.stages.length}`} />
              <DetailRow label="Execution" value={STAGE_EXECUTION_MODE_DESCRIPTIONS[stage.executionMode]} />
              <DetailRow label="Completion rule" value={STAGE_COMPLETION_RULE_LABELS[stage.completionRule]} />
              <DetailRow label="Notification direction" value={NOTIFICATION_DIRECTION_LABELS[stage.notificationDirection]} />
              <DetailRow label="Due direction" value={stage.dueDateDirection ?? "None set"} />
              <DetailRow label="What happens next" value={nextStage.explanation} />
            </dl>

            {stage.instruction && (
              <div className="wf-card" style={{ padding: 12, background: WF.slate0, borderColor: WF.slate2 }}>
                <p style={{ ...GF, margin: "0 0 4px", fontSize: 12, fontWeight: 700, color: WF.slate7 }}>
                  Stage instructions
                </p>
                <p style={{ ...GF, margin: 0, fontSize: 13, color: WF.slate6, lineHeight: 1.6 }}>
                  {stage.instruction}
                </p>
              </div>
            )}

            <div style={{ marginTop: 4 }}>
              <ExecutionModeLine mode={stage.executionMode} count={progress.totalAssignments} />
            </div>
          </section>

          {/* ── Progress ──────────────────────────────────────────────── */}
          <section className="wf-panel wf-stack" aria-label="Stage progress">
            <WorkflowSectionHeading title="Progress" />
            <WorkflowProgressBar
              label="Required actions complete"
              completed={progress.completedBlocking}
              total={progress.blockingAssignments}
              unit="required actions"
            />
            <WorkflowProgressBar
              label="Required signatures complete"
              completed={progress.completedSignaturesInDemonstration}
              total={progress.requiredSignatures}
              unit="required signatures"
            />
            {progress.nonblockingAssignments > 0 && (
              <p style={{ ...GF, margin: 0, fontSize: 12, color: WF.slate5, lineHeight: 1.6 }}>
                {progress.nonblockingAssignments}{" "}
                {progress.nonblockingAssignments === 1 ? "person does" : "people do"} not hold up
                this stage and are excluded from the counts above.
              </p>
            )}
            {blocked && (
              <div className="wf-card" style={{ padding: 12, background: TONES.warning.bg, borderColor: TONES.warning.border }}>
                <p style={{ ...GF, margin: 0, fontSize: 13, color: TONES.warning.text, lineHeight: 1.6 }}>
                  A required person in this stage can no longer complete their action. Resolve this
                  through the document's participant flow.
                </p>
              </div>
            )}
          </section>

          {/* ── People ────────────────────────────────────────────────── */}
          <section className="wf-panel wf-stack" aria-label="People in this stage">
            <WorkflowSectionHeading
              title="People in this stage"
              description="Every person has one explicit required action. A stage never acts on anyone's behalf."
            />

            {sorted.length === 0 ? (
              <p style={{ ...GF, margin: 0, fontSize: 13, color: WF.slate6 }}>
                No one has been added to this stage yet.
              </p>
            ) : (
              <ol style={{ ...GF, margin: 0, padding: 0, listStyle: "none", display: "flex", flexDirection: "column", gap: 10 }}>
                {sorted.map(assignment => (
                  <li key={String(assignment.id)}>
                    <button
                      type="button"
                      className="wf-pcard"
                      onClick={() => setOpenAssignment(assignment.id)}
                      aria-label={`${assignment.participantName}. ${STAGE_ACTION_LABELS[assignment.action]}. Open configuration.`}
                    >
                      <div className="wf-row" style={{ gap: 10, flexWrap: "nowrap" }}>
                        <ParticipantAvatar name={assignment.participantName} size={32} />
                        <div style={{ minWidth: 0, flex: 1 }}>
                          <p style={{ ...GF, margin: 0, fontSize: 14, fontWeight: 700, color: WF.navy, overflowWrap: "anywhere" }}>
                            {assignment.participantName}
                          </p>
                          <p style={{ ...GF, margin: "2px 0 0", fontSize: 12, color: WF.slate5, overflowWrap: "anywhere" }}>
                            {assignment.participantEmailMasked}
                            {stage.executionMode === "ordered" && ` · position ${assignment.position}`}
                          </p>
                        </div>
                      </div>
                      <div className="wf-row" style={{ gap: 6, marginTop: 10 }}>
                        <RequirementPill assignment={assignment} />
                        <AssignmentStatusPill status={assignment.status} />
                        <ReadinessPill state={assignment.fieldReadiness.state} />
                      </div>
                      <dl style={{ ...GF, margin: "10px 0 0", fontSize: 12, color: WF.slate5, lineHeight: 1.7 }}>
                        <div>
                          <dt style={{ display: "inline" }}>Authentication: </dt>
                          <dd style={{ display: "inline", margin: 0, color: WF.slate7 }}>
                            {AUTH_DIRECTION_LABELS[assignment.authenticationDirection]}
                          </dd>
                        </div>
                        <div>
                          <dt style={{ display: "inline" }}>Consent: </dt>
                          <dd style={{ display: "inline", margin: 0, color: WF.slate7 }}>
                            {CONSENT_DIRECTION_LABELS[assignment.consentDirection]}
                          </dd>
                        </div>
                        <div>
                          <dt style={{ display: "inline" }}>Notification direction: </dt>
                          <dd style={{ display: "inline", margin: 0, color: WF.slate7 }}>
                            {NOTIFICATION_DIRECTION_LABELS[assignment.notificationDirection]}
                          </dd>
                        </div>
                      </dl>
                      <p style={{ ...GF, margin: "8px 0 0", fontSize: 12, color: WF.slate5, lineHeight: 1.55 }}>
                        {describeAssignmentEligibility(stage, assignment, isCurrent)}
                      </p>
                    </button>
                  </li>
                ))}
              </ol>
            )}
          </section>

          {/* ── Issues ────────────────────────────────────────────────── */}
          <ValidationSummary
            title="Checks for this stage"
            issues={issues}
            emptyMessage="This stage has no outstanding issues."
            onRepair={(issue) => {
              if (issue.repairTarget === "field-placement") openFieldPlacement();
              else navigate(`${base}/create`);
            }}
          />

          {/* ── Activity direction ────────────────────────────────────── */}
          <section className="wf-panel">
            <WorkflowSectionHeading
              title="Activity"
              description="Canonical document activity lives on the Activity tab. Workflow configuration changes are frontend demonstration records only and are never treated as an audit trail or as Evidence."
            />
            <div className="wf-row" style={{ gap: 10, marginTop: 12 }}>
              <Link to={`/app/documents/${data.documentId}/activity`} className="wf-btn wf-btn-secondary wf-btn-sm">
                Open Document Activity
              </Link>
              <Link to={`/app/documents/${data.documentId}/participants`} className="wf-btn wf-btn-secondary wf-btn-sm">
                Open Participants
              </Link>
            </div>
          </section>

          <DemonstrationNotice text={WORKFLOW_DEMONSTRATION_NOTICE} />
        </div>

        <div className="wf-stack wf-desktop-only">
          <section className="wf-panel">
            <WorkflowNotificationPreview documentId={data.documentId} />
          </section>
        </div>
      </div>

      {selectedAssignment && (
        <ParticipantConfigPanel
          assignment={selectedAssignment}
          stage={stage}
          allStages={data.stages}
          canEdit={editable && !busy}
          onApply={applyParticipantChange}
          onRemove={removeParticipant}
          onOpenFieldPlacement={openFieldPlacement}
          onClose={() => setOpenAssignment(null)}
        />
      )}
    </div>
  );
}

function DetailRow({ label, value }: { label: string; value: string }) {
  return (
    <div style={{ display: "flex", justifyContent: "space-between", gap: 16 }}>
      <dt style={{ color: WF.slate5, flexShrink: 0 }}>{label}</dt>
      <dd style={{ margin: 0, color: WF.slate9, fontWeight: 600, textAlign: "right", overflowWrap: "anywhere" }}>
        {value}
      </dd>
    </div>
  );
}
