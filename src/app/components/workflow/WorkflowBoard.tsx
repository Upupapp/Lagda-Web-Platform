// Signing Workflow — Kanban board.
//
// Columns are STAGES. Cards are PARTICIPANT ASSIGNMENTS. That is the whole model.
// This is not a task board: there are no arbitrary tasks, comments, attachments,
// subtasks, sprints, epics, or backlogs, and none can be created here.
//
// Critical safety rule: moving a card NEVER completes anyone's action.
//   - In "status" mode the board is read-only. Cards cannot be dragged at all.
//   - In "builder" mode a card may be moved to another DRAFT stage. That is an
//     explicit reassignment of where the person acts — it does not sign, approve,
//     review, acknowledge, or complete anything on their behalf.
//
// Drag and drop is a pure enhancement. Every move is also available through
// Move Up / Move Down / Move to Position buttons and full keyboard operation.

import { useId, useState } from "react";
import {
  AlertTriangle, CheckCircle2, Copy, GripVertical, Plus, Trash2, UserPlus,
} from "lucide-react";
import { GF, TONES, WF } from "./WorkflowStyles";
import {
  AssignmentStatusPill, ExecutionModeLine, ParticipantAvatar, ReadinessPill,
  ReorderControls, RequirementPill, StageNumberBadge, StageStatusPill,
  SignatureRequirementLine, describeRequirement,
} from "./WorkflowPrimitives";
import type {
  SigningStage,
  SigningStageId,
  SigningWorkflowValidationResult,
  StageParticipantAssignment,
  StageParticipantAssignmentId,
  WorkflowBoardSelection,
} from "../../models/signing-workflow";
import {
  AUTH_DIRECTION_LABELS,
  STAGE_ACTION_LABELS,
  STAGE_STATUS_LABELS,
} from "../../models/signing-workflow";
import {
  describeAssignmentEligibility,
  isAssignmentBlocking,
  resolveStageProgress,
} from "../../services/signing-workflow.resolver";
import { issuesForAssignment, issuesForStage } from "../../services/signing-workflow.validation";
import { interactionFeedback } from "../../utils/interaction-feedback";

// ── Props ─────────────────────────────────────────────────────────────────────

export interface WorkflowBoardProps {
  stages:     SigningStage[];
  validation: SigningWorkflowValidationResult;
  selection:  WorkflowBoardSelection;
  onSelect:   (selection: WorkflowBoardSelection) => void;
  /** "builder" allows editing; "status" is read-only. */
  mode:       "builder" | "status";
  currentStageId: SigningStageId | null;
  canEdit:    boolean;
  announce:   (message: string) => void;

  // Builder callbacks — omitted in status mode.
  onAddStage?:        (afterPosition: number) => void;
  onEditStage?:       (stageId: SigningStageId) => void;
  onDuplicateStage?:  (stageId: SigningStageId) => void;
  onDeleteStage?:     (stageId: SigningStageId) => void;
  onMoveStage?:       (stageId: SigningStageId, toPosition: number) => void;
  onAddPerson?:       (stageId: SigningStageId) => void;
  onMoveAssignment?:  (assignmentId: StageParticipantAssignmentId, fromStageId: SigningStageId, toStageId: SigningStageId) => void;
  onReorderAssignment?: (stageId: SigningStageId, assignmentId: StageParticipantAssignmentId, toPosition: number) => void;
  onOpenStageDetail?: (stageId: SigningStageId) => void;
}

// ── Board ─────────────────────────────────────────────────────────────────────

export function WorkflowBoard(props: WorkflowBoardProps) {
  const { stages, mode, currentStageId, canEdit, announce } = props;
  const boardId = useId();
  const [draggingAssignment, setDraggingAssignment] = useState<string | null>(null);
  const [dropTargetStage, setDropTargetStage] = useState<string | null>(null);

  const builder = mode === "builder";

  const boardLabel = builder
    ? `Signing workflow stage builder. ${stages.length} ${stages.length === 1 ? "stage" : "stages"}, in order.`
    : `Signing workflow status board. ${stages.length} ${stages.length === 1 ? "stage" : "stages"}, in order.`;

  return (
    <div className="wf-stack" style={{ gap: 8 }}>
      {/* Text description of the sequence, so the order is never arrow-only. */}
      <p className="wf-visually-hidden" id={`${boardId}-desc`}>
        Stages run in order from stage 1 to stage {stages.length}. Each later stage waits
        for the stage before it to complete.
      </p>

      <div
        className="wf-board-scroll"
        role="list"
        aria-label={boardLabel}
        aria-describedby={`${boardId}-desc`}
        tabIndex={0}
      >
        {stages.map((stage, index) => (
          <StageColumnWithConnector
            key={String(stage.id)}
            {...props}
            stage={stage}
            index={index}
            isLast={index === stages.length - 1}
            totalStages={stages.length}
            isCurrent={stage.id === currentStageId}
            builder={builder}
            draggingAssignment={draggingAssignment}
            dropTargetStage={dropTargetStage}
            setDraggingAssignment={setDraggingAssignment}
            setDropTargetStage={setDropTargetStage}
          />
        ))}

        {builder && canEdit && props.onAddStage && (
          <div
            role="listitem"
            style={{ flex: "0 0 220px", width: 220, display: "flex", alignItems: "flex-start", paddingTop: 4 }}
          >
            <button
              type="button"
              className="wf-btn wf-btn-secondary"
              style={{ width: "100%", borderStyle: "dashed", minHeight: 120 }}
              onClick={() => {
                props.onAddStage?.(stages.length);
                announce("Add stage form opened.");
              }}
            >
              <Plus size={16} aria-hidden />
              Add Next Stage
            </button>
          </div>
        )}
      </div>
    </div>
  );
}

// ── Column + connector ────────────────────────────────────────────────────────

interface ColumnProps extends WorkflowBoardProps {
  stage: SigningStage;
  index: number;
  isLast: boolean;
  totalStages: number;
  isCurrent: boolean;
  builder: boolean;
  draggingAssignment: string | null;
  dropTargetStage: string | null;
  setDraggingAssignment: (v: string | null) => void;
  setDropTargetStage: (v: string | null) => void;
}

function StageColumnWithConnector(props: ColumnProps) {
  return (
    <>
      <StageColumn {...props} />
      {!props.isLast && (
        <div className="wf-connector" role="presentation">
          <span className="wf-connector-line" aria-hidden />
          <span className="wf-connector-label" style={GF}>Then</span>
          <span className="wf-connector-line" aria-hidden />
        </div>
      )}
    </>
  );
}

function StageColumn(props: ColumnProps) {
  const {
    stage, totalStages, isCurrent, builder, canEdit, validation, selection,
    onSelect, announce, onAddPerson, onEditStage, onDuplicateStage, onDeleteStage,
    onMoveStage, onOpenStageDetail, onMoveAssignment,
    draggingAssignment, dropTargetStage, setDraggingAssignment, setDropTargetStage,
  } = props;

  const progress = resolveStageProgress(stage);
  const stageIssues = issuesForStage(validation, String(stage.id));
  const blockingIssues = stageIssues.filter(i => i.severity === "blocking");
  const editable = builder && canEdit && (stage.status === "draft" || stage.status === "ready");

  const sortedAssignments = [...stage.assignments].sort((a, b) => a.position - b.position);

  const accessibleLabel =
    `Stage ${stage.position} of ${totalStages}: ${stage.name}. `
    + `Status: ${STAGE_STATUS_LABELS[stage.status]}. `
    + `${progress.totalAssignments} ${progress.totalAssignments === 1 ? "person" : "people"}, `
    + `${progress.blockingAssignments} must act, `
    + `${progress.requiredSignatures} ${progress.requiredSignatures === 1 ? "signature" : "signatures"} required.`
    + (isCurrent ? " This is the current stage." : "")
    + (blockingIssues.length > 0 ? ` ${blockingIssues.length} issue must be fixed.` : "");

  const canAcceptDrop =
    builder && canEdit && draggingAssignment !== null
    && !sortedAssignments.some(a => String(a.id) === draggingAssignment);

  return (
    <section
      role="listitem"
      aria-label={accessibleLabel}
      className={`wf-column${isCurrent ? " wf-column-current" : ""}${dropTargetStage === String(stage.id) ? " wf-column-drop-target" : ""}`}
      onDragOver={canAcceptDrop ? (e) => { e.preventDefault(); setDropTargetStage(String(stage.id)); } : undefined}
      onDragLeave={canAcceptDrop ? () => setDropTargetStage(null) : undefined}
      onDrop={canAcceptDrop ? (e) => {
        e.preventDefault();
        setDropTargetStage(null);
        const payload = e.dataTransfer.getData("text/plain");
        // Only an opaque assignment ID is ever placed in the drag payload.
        const found = payload && draggingAssignment === payload ? payload : null;
        if (!found || !onMoveAssignment) { interactionFeedback("invalid-drop"); return; }
        const source = props.stages.find(s => s.assignments.some(a => String(a.id) === found));
        if (!source) { interactionFeedback("invalid-drop"); return; }
        onMoveAssignment(found as StageParticipantAssignmentId, source.id, stage.id);
        interactionFeedback("moved-between-stages");
        announce(`Moved to ${stage.name}. No one's status was changed.`);
      } : undefined}
    >
      {/* ── Column header ─────────────────────────────────────────────── */}
      <header style={{ padding: "14px 14px 12px", borderBottom: `1px solid ${WF.slate2}` }}>
        <div className="wf-row" style={{ gap: 8, marginBottom: 8 }}>
          <StageNumberBadge position={stage.position} current={isCurrent} />
          <h3 style={{
            ...GF, margin: 0, fontSize: 14, fontWeight: 700, color: WF.navy,
            flex: 1, minWidth: 0, overflowWrap: "anywhere",
          }}>
            {stage.name}
          </h3>
        </div>

        <div className="wf-row" style={{ gap: 6, marginBottom: 8 }}>
          <StageStatusPill status={stage.status} />
          {isCurrent && <span style={{ ...GF, fontSize: 11, fontWeight: 700, color: WF.azure }}>CURRENT STAGE</span>}
        </div>

        {stage.description && (
          <p style={{ ...GF, margin: "0 0 8px", fontSize: 12, color: WF.slate5, lineHeight: 1.55 }}>
            {stage.description}
          </p>
        )}

        <ExecutionModeLine mode={stage.executionMode} count={progress.totalAssignments} />

        {/* Counts as text — never a colour-only or icon-only signal. */}
        <dl style={{
          ...GF, margin: "10px 0 0", display: "grid",
          gridTemplateColumns: "1fr 1fr", gap: "4px 10px", fontSize: 11,
        }}>
          <div><dt style={{ display: "inline", color: WF.slate5 }}>People: </dt>
            <dd style={{ display: "inline", margin: 0, color: WF.slate7, fontWeight: 700 }}>{progress.totalAssignments}</dd></div>
          <div><dt style={{ display: "inline", color: WF.slate5 }}>Must act: </dt>
            <dd style={{ display: "inline", margin: 0, color: WF.slate7, fontWeight: 700 }}>{progress.blockingAssignments}</dd></div>
          <div><dt style={{ display: "inline", color: WF.slate5 }}>Signatures: </dt>
            <dd style={{ display: "inline", margin: 0, color: WF.slate7, fontWeight: 700 }}>{progress.requiredSignatures}</dd></div>
          <div><dt style={{ display: "inline", color: WF.slate5 }}>Completed: </dt>
            <dd style={{ display: "inline", margin: 0, color: WF.slate7, fontWeight: 700 }}>
              {progress.completedBlocking}/{progress.blockingAssignments}
            </dd></div>
        </dl>

        {stage.dueDateDirection && (
          <p style={{ ...GF, margin: "8px 0 0", fontSize: 11, color: WF.slate5 }}>
            Due direction: {stage.dueDateDirection}
          </p>
        )}

        {blockingIssues.length > 0 ? (
          <p className="wf-row" style={{ gap: 6, margin: "10px 0 0" }}>
            <AlertTriangle size={13} color={WF.errorText} aria-hidden />
            <span style={{ ...GF, fontSize: 11, fontWeight: 700, color: WF.errorText }}>
              {blockingIssues.length} {blockingIssues.length === 1 ? "issue" : "issues"} to fix
            </span>
          </p>
        ) : stage.assignments.length > 0 ? (
          <p className="wf-row" style={{ gap: 6, margin: "10px 0 0" }}>
            <CheckCircle2 size={13} color={WF.successText} aria-hidden />
            <span style={{ ...GF, fontSize: 11, fontWeight: 700, color: WF.successText }}>
              Fields ready
            </span>
          </p>
        ) : null}

        {/* Stage reordering — buttons first, never drag-only. */}
        {editable && onMoveStage && totalStages > 1 && (
          <div style={{ marginTop: 12 }}>
            <ReorderControls
              orientation="horizontal"
              itemLabel={`Stage ${stage.position}, ${stage.name}`}
              position={stage.position}
              total={totalStages}
              onMoveEarlier={() => {
                onMoveStage(stage.id, stage.position - 1);
                interactionFeedback("reorder-committed");
                announce(`${stage.name} moved to position ${stage.position - 1} of ${totalStages}.`);
              }}
              onMoveLater={() => {
                onMoveStage(stage.id, stage.position + 1);
                interactionFeedback("reorder-committed");
                announce(`${stage.name} moved to position ${stage.position + 1} of ${totalStages}.`);
              }}
              onMoveToPosition={(pos) => {
                if (pos === stage.position) return;
                onMoveStage(stage.id, pos);
                interactionFeedback("reorder-committed");
                announce(`${stage.name} moved to position ${pos} of ${totalStages}.`);
              }}
            />
          </div>
        )}
      </header>

      {/* ── Cards ─────────────────────────────────────────────────────── */}
      <div className="wf-column-body">
        {sortedAssignments.length === 0 ? (
          <div style={{
            padding: "16px 12px", borderRadius: 10, border: `1px dashed ${WF.slate3}`,
            background: WF.white, textAlign: "center",
          }}>
            <p style={{ ...GF, margin: "0 0 4px", fontSize: 13, fontWeight: 600, color: WF.slate6 }}>
              No one in this stage yet
            </p>
            <p style={{ ...GF, margin: 0, fontSize: 12, color: WF.slate5, lineHeight: 1.55 }}>
              {stage.type === "distribution"
                ? "Add people who should receive a copy."
                : "A stage needs at least one person who must sign, approve, review, or acknowledge, or it will never complete."}
            </p>
          </div>
        ) : (
          sortedAssignments.map(assignment => (
            <ParticipantCard
              key={String(assignment.id)}
              assignment={assignment}
              stage={stage}
              isCurrentStage={isCurrent}
              selected={selection.assignmentId === assignment.id}
              validation={validation}
              editable={editable}
              totalInStage={sortedAssignments.length}
              onSelect={() => onSelect({ stageId: stage.id, assignmentId: assignment.id })}
              onReorder={(toPosition) => {
                props.onReorderAssignment?.(stage.id, assignment.id, toPosition);
                interactionFeedback("reorder-committed");
                announce(
                  stage.executionMode === "ordered"
                    ? `${assignment.participantName} moved to position ${toPosition} in ${stage.name}. They now wait for the person above them.`
                    : `${assignment.participantName} moved to position ${toPosition} in ${stage.name}. This stage runs in parallel, so the order is for reading only.`,
                );
              }}
              dragging={draggingAssignment === String(assignment.id)}
              onDragStart={editable ? (e) => {
                // Only the opaque assignment ID travels in the drag payload.
                // No name, no email, no requirement, no field data.
                e.dataTransfer.setData("text/plain", String(assignment.id));
                e.dataTransfer.effectAllowed = "move";
                setDraggingAssignment(String(assignment.id));
              } : undefined}
              onDragEnd={editable ? () => {
                setDraggingAssignment(null);
                setDropTargetStage(null);
              } : undefined}
            />
          ))
        )}

        {/* ── Stage actions ───────────────────────────────────────────── */}
        {editable && (
          <div className="wf-stack" style={{ gap: 8, marginTop: 4 }}>
            {onAddPerson && (
              <button
                type="button"
                className="wf-btn wf-btn-secondary wf-btn-sm"
                onClick={() => onAddPerson(stage.id)}
                style={{ width: "100%" }}
              >
                <UserPlus size={15} aria-hidden />
                Add Person
              </button>
            )}
            <div className="wf-row" style={{ gap: 6 }}>
              {onEditStage && (
                <button
                  type="button"
                  className="wf-btn wf-btn-ghost wf-btn-sm"
                  onClick={() => onEditStage(stage.id)}
                  style={{ flex: 1 }}
                >
                  Edit Stage
                </button>
              )}
              {onDuplicateStage && (
                <button
                  type="button"
                  className="wf-icon-btn wf-icon-btn-sm"
                  style={{ width: 36, height: 36 }}
                  onClick={() => {
                    onDuplicateStage(stage.id);
                    announce(`${stage.name} duplicated. Review recipients and field assignments in the copy.`);
                  }}
                  aria-label={`Duplicate stage: ${stage.name}`}
                  title={`Duplicate stage: ${stage.name}`}
                >
                  <Copy size={15} aria-hidden />
                </button>
              )}
              {onDeleteStage && (
                <button
                  type="button"
                  className="wf-icon-btn wf-icon-btn-sm"
                  style={{ width: 36, height: 36, color: WF.errorText, borderColor: WF.errorBorder }}
                  onClick={() => onDeleteStage(stage.id)}
                  aria-label={`Delete stage: ${stage.name}`}
                  title={`Delete stage: ${stage.name}`}
                >
                  <Trash2 size={15} aria-hidden />
                </button>
              )}
            </div>
          </div>
        )}

        {!builder && onOpenStageDetail && (
          <button
            type="button"
            className="wf-btn wf-btn-secondary wf-btn-sm"
            style={{ width: "100%", marginTop: 4 }}
            onClick={() => onOpenStageDetail(stage.id)}
          >
            Open Stage Details
          </button>
        )}
      </div>
    </section>
  );
}

// ── Participant card ──────────────────────────────────────────────────────────

interface ParticipantCardProps {
  assignment:     StageParticipantAssignment;
  stage:          SigningStage;
  isCurrentStage: boolean;
  selected:       boolean;
  validation:     SigningWorkflowValidationResult;
  editable:       boolean;
  totalInStage:   number;
  onSelect:       () => void;
  onReorder:      (toPosition: number) => void;
  dragging:       boolean;
  onDragStart?:   (e: React.DragEvent) => void;
  onDragEnd?:     () => void;
}

function ParticipantCard({
  assignment, stage, isCurrentStage, selected, validation, editable,
  totalInStage, onSelect, onReorder, dragging, onDragStart, onDragEnd,
}: ParticipantCardProps) {
  const issues = issuesForAssignment(validation, String(assignment.id));
  const blocking = issues.filter(i => i.severity === "blocking");
  const eligibility = describeAssignmentEligibility(stage, assignment, isCurrentStage);
  const requirement = describeRequirement(assignment);
  const readiness = assignment.fieldReadiness;

  const cardLabel =
    `${assignment.participantName}. `
    + `Required action: ${STAGE_ACTION_LABELS[assignment.action]}. `
    + `${requirement}. `
    + `Status: ${eligibility} `
    + (isAssignmentBlocking(assignment) ? "This person must act before the stage can complete. " : "")
    + (blocking.length > 0 ? `${blocking.length} issue must be fixed. ` : "")
    + `Position ${assignment.position} of ${totalInStage} in ${stage.name}.`;

  return (
    <div>
      <div
        role="button"
        tabIndex={0}
        aria-label={cardLabel}
        aria-pressed={selected}
        className={`wf-pcard${selected ? " wf-pcard-selected" : ""}${dragging ? " wf-pcard-dragging" : ""}`}
        onClick={onSelect}
        onKeyDown={(e) => {
          if (e.key === "Enter" || e.key === " ") { e.preventDefault(); onSelect(); }
        }}
        draggable={editable}
        onDragStart={onDragStart}
        onDragEnd={onDragEnd}
      >
        <div className="wf-row" style={{ gap: 10, alignItems: "flex-start", flexWrap: "nowrap" }}>
          {editable && (
            <span
              aria-hidden
              title="Drag to move, or use the move buttons below"
              style={{ color: WF.slate4, cursor: "grab", flexShrink: 0, marginTop: 4 }}
            >
              <GripVertical size={14} />
            </span>
          )}
          <ParticipantAvatar name={assignment.participantName} size={30} />
          <div style={{ minWidth: 0, flex: 1 }}>
            <p style={{
              ...GF, margin: 0, fontSize: 13, fontWeight: 700, color: WF.navy,
              overflowWrap: "anywhere", lineHeight: 1.35,
            }}>
              {assignment.participantName}
            </p>
            <p style={{
              ...GF, margin: "2px 0 0", fontSize: 11, color: WF.slate5,
              overflowWrap: "anywhere", lineHeight: 1.4,
            }}>
              {assignment.participantEmailMasked}
              {assignment.participantOrganization && ` · ${assignment.participantOrganization}`}
            </p>
          </div>
        </div>

        <div className="wf-row" style={{ gap: 6, marginTop: 10 }}>
          <RequirementPill assignment={assignment} />
          <ReadinessPill state={readiness.state} />
        </div>

        <div style={{ marginTop: 8 }}>
          <SignatureRequirementLine assignment={assignment} />
        </div>

        <dl style={{ ...GF, margin: "8px 0 0", fontSize: 11, color: WF.slate5, lineHeight: 1.6 }}>
          <div>
            <dt style={{ display: "inline" }}>Required fields: </dt>
            <dd style={{ display: "inline", margin: 0, color: WF.slate7 }}>
              {readiness.requiredFieldCount} required, {readiness.assignedFieldCount} assigned
            </dd>
          </div>
          <div>
            <dt style={{ display: "inline" }}>Authentication: </dt>
            <dd style={{ display: "inline", margin: 0, color: WF.slate7 }}>
              {AUTH_DIRECTION_LABELS[assignment.authenticationDirection]}
            </dd>
          </div>
        </dl>

        <div className="wf-row" style={{ gap: 6, marginTop: 10 }}>
          <AssignmentStatusPill status={assignment.status} />
        </div>

        <p style={{ ...GF, margin: "8px 0 0", fontSize: 11, color: WF.slate5, lineHeight: 1.5 }}>
          {eligibility}
        </p>

        {blocking.length > 0 && (
          <p style={{
            ...GF, margin: "8px 0 0", fontSize: 11, color: WF.errorText,
            fontWeight: 600, lineHeight: 1.5,
            background: TONES.error.bg, border: `1px solid ${TONES.error.border}`,
            borderRadius: 6, padding: "6px 8px",
          }}>
            {blocking[0].message}
          </p>
        )}
      </div>

      {/* Non-drag reorder path — always rendered when editing, on every device. */}
      {editable && totalInStage > 1 && (
        <div style={{ marginTop: 6, paddingLeft: 2 }}>
          <ReorderControls
            orientation="vertical"
            itemLabel={assignment.participantName}
            position={assignment.position}
            total={totalInStage}
            onMoveEarlier={() => onReorder(assignment.position - 1)}
            onMoveLater={() => onReorder(assignment.position + 1)}
            onMoveToPosition={(pos) => { if (pos !== assignment.position) onReorder(pos); }}
          />
        </div>
      )}
    </div>
  );
}
