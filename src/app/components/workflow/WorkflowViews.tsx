// Signing Workflow — Timeline view, List view, and Field Readiness matrix.
//
// The Timeline is the accessible non-Kanban representation: a semantic ordered
// list that never scrolls horizontally and reads well on a 320px screen.
// The List view is the dense operational table for larger workflows.
//
// Neither view duplicates hidden focusable controls: only one view is mounted at
// a time, so nothing off-screen ever enters the focus order.

import { useState } from "react";
import { ArrowRight, Filter } from "lucide-react";
import { GF, TONES, WF } from "./WorkflowStyles";
import {
  AssignmentStatusPill, ExecutionModeLine, ParticipantAvatar, ReadinessPill,
  RequirementPill, StageNumberBadge, StageStatusPill, describeRequirement,
} from "./WorkflowPrimitives";
import type {
  SigningStage,
  SigningStageId,
  SigningWorkflowValidationResult,
  StageParticipantAssignment,
  WorkflowBoardFilter,
} from "../../models/signing-workflow";
import {
  STAGE_ACTION_LABELS,
  STAGE_STATUS_LABELS,
  WORKFLOW_BOARD_FILTER_LABELS,
  VALID_WORKFLOW_BOARD_FILTERS,
  FIELD_READINESS_LABELS,
  isFieldReadinessSatisfied,
} from "../../models/signing-workflow";
import {
  describeAssignmentEligibility,
  isAssignmentBlocking,
  resolveStageProgress,
} from "../../services/signing-workflow.resolver";
import { issuesForAssignment } from "../../services/signing-workflow.validation";

// ── Shared filtering ──────────────────────────────────────────────────────────

function matchesFilter(
  assignment: StageParticipantAssignment,
  validation: SigningWorkflowValidationResult,
  filter: WorkflowBoardFilter,
): boolean {
  switch (filter) {
    case "action-required":
      return assignment.status === "ready-for-action" || assignment.status === "in-progress";
    case "issues-only":
      return issuesForAssignment(validation, String(assignment.id)).length > 0;
    case "completed":
      return assignment.status === "completed";
    case "all":
    default:
      return true;
  }
}

export function WorkflowFilterControl({
  value, onChange, id,
}: { value: WorkflowBoardFilter; onChange: (v: WorkflowBoardFilter) => void; id: string }) {
  return (
    <div className="wf-row" style={{ gap: 8 }}>
      <Filter size={15} color={WF.slate5} aria-hidden />
      <label htmlFor={id} style={{ ...GF, fontSize: 13, fontWeight: 600, color: WF.slate6 }}>
        Show
      </label>
      <select
        id={id}
        className="wf-select"
        value={value}
        onChange={(e) => onChange(e.target.value as WorkflowBoardFilter)}
        style={{ width: "auto", minWidth: 150 }}
      >
        {VALID_WORKFLOW_BOARD_FILTERS.map(f => (
          <option key={f} value={f}>{WORKFLOW_BOARD_FILTER_LABELS[f]}</option>
        ))}
      </select>
    </div>
  );
}

// ── Timeline view ─────────────────────────────────────────────────────────────

export function WorkflowTimeline({
  stages, validation, currentStageId, onOpenStage, onSelectAssignment,
}: {
  stages: SigningStage[];
  validation: SigningWorkflowValidationResult;
  currentStageId: SigningStageId | null;
  onOpenStage?: (stageId: SigningStageId) => void;
  onSelectAssignment?: (stageId: SigningStageId, assignmentId: string) => void;
}) {
  return (
    <ol
      aria-label={`Signing workflow timeline. ${stages.length} ${stages.length === 1 ? "stage" : "stages"} in order.`}
      style={{ ...GF, margin: 0, padding: 0, listStyle: "none", display: "flex", flexDirection: "column", gap: 0 }}
    >
      {stages.map((stage, index) => {
        const isCurrent = stage.id === currentStageId;
        const progress = resolveStageProgress(stage);
        const isLast = index === stages.length - 1;

        return (
          <li key={String(stage.id)}>
            <div
              className="wf-card"
              style={{
                padding: 16,
                borderColor: isCurrent ? WF.azureBorder : WF.slate2,
                background: isCurrent ? WF.azureSoft : WF.white,
              }}
            >
              <div className="wf-row" style={{ gap: 10, marginBottom: 10 }}>
                <StageNumberBadge position={stage.position} current={isCurrent} />
                <h3 style={{ ...GF, margin: 0, fontSize: 15, fontWeight: 700, color: WF.navy, flex: 1, minWidth: 0, overflowWrap: "anywhere" }}>
                  {stage.name}
                </h3>
                <StageStatusPill status={stage.status} />
              </div>

              {isCurrent && (
                <p style={{ ...GF, margin: "0 0 8px", fontSize: 12, fontWeight: 700, color: WF.azure }}>
                  Current stage
                </p>
              )}

              {stage.description && (
                <p style={{ ...GF, margin: "0 0 10px", fontSize: 13, color: WF.slate6, lineHeight: 1.6 }}>
                  {stage.description}
                </p>
              )}

              <div style={{ marginBottom: 10 }}>
                <ExecutionModeLine mode={stage.executionMode} count={progress.totalAssignments} />
              </div>

              <p style={{ ...GF, margin: "0 0 12px", fontSize: 12, color: WF.slate6 }}>
                {progress.completedBlocking} of {progress.blockingAssignments} required{" "}
                {progress.blockingAssignments === 1 ? "action" : "actions"} complete
                {progress.requiredSignatures > 0 && ` · ${progress.requiredSignatures} ${progress.requiredSignatures === 1 ? "signature" : "signatures"} required`}
                {progress.nonblockingAssignments > 0 && ` · ${progress.nonblockingAssignments} not blocking`}
              </p>

              <ul style={{ margin: 0, padding: 0, listStyle: "none", display: "flex", flexDirection: "column", gap: 8 }}>
                {[...stage.assignments].sort((a, b) => a.position - b.position).map(assignment => {
                  const blocking = issuesForAssignment(validation, String(assignment.id))
                    .filter(i => i.severity === "blocking");
                  const body = (
                    <>
                      <div className="wf-row" style={{ gap: 8, flexWrap: "nowrap" }}>
                        <ParticipantAvatar name={assignment.participantName} size={26} />
                        <span style={{ ...GF, fontSize: 13, fontWeight: 600, color: WF.navy, overflowWrap: "anywhere", minWidth: 0, flex: 1 }}>
                          {assignment.participantName}
                        </span>
                      </div>
                      <div className="wf-row" style={{ gap: 6, marginTop: 6 }}>
                        <RequirementPill assignment={assignment} />
                        <AssignmentStatusPill status={assignment.status} />
                        <ReadinessPill state={assignment.fieldReadiness.state} />
                      </div>
                      <p style={{ ...GF, margin: "6px 0 0", fontSize: 11, color: WF.slate5, lineHeight: 1.5 }}>
                        {describeAssignmentEligibility(stage, assignment, isCurrent)}
                      </p>
                      {blocking.length > 0 && (
                        <p style={{ ...GF, margin: "6px 0 0", fontSize: 11, fontWeight: 600, color: WF.errorText, lineHeight: 1.5 }}>
                          {blocking[0].message}
                        </p>
                      )}
                    </>
                  );

                  return (
                    <li key={String(assignment.id)}>
                      {onSelectAssignment ? (
                        <button
                          type="button"
                          className="wf-pcard"
                          onClick={() => onSelectAssignment(stage.id, String(assignment.id))}
                          aria-label={`${assignment.participantName}. ${describeRequirement(assignment)}. ${describeAssignmentEligibility(stage, assignment, isCurrent)}`}
                        >
                          {body}
                        </button>
                      ) : (
                        <div className="wf-pcard" style={{ cursor: "default" }}>{body}</div>
                      )}
                    </li>
                  );
                })}
                {stage.assignments.length === 0 && (
                  <li style={{ ...GF, fontSize: 12, color: WF.slate5 }}>
                    No one has been added to this stage yet.
                  </li>
                )}
              </ul>

              {onOpenStage && (
                <button
                  type="button"
                  className="wf-btn wf-btn-secondary wf-btn-sm"
                  style={{ marginTop: 12 }}
                  onClick={() => onOpenStage(stage.id)}
                >
                  Open Stage Details
                </button>
              )}
            </div>

            {!isLast && (
              <div style={{ display: "flex", alignItems: "center", gap: 8, padding: "10px 0 10px 12px" }}>
                <span aria-hidden style={{ width: 2, height: 20, background: WF.azureBorder, borderRadius: 2 }} />
                <ArrowRight size={14} color={WF.slate4} aria-hidden style={{ transform: "rotate(90deg)" }} />
                <span style={{ ...GF, fontSize: 11, fontWeight: 700, letterSpacing: "0.08em", color: WF.slate5, textTransform: "uppercase" }}>
                  Then
                </span>
              </div>
            )}
          </li>
        );
      })}
    </ol>
  );
}

// ── List view ─────────────────────────────────────────────────────────────────

export function WorkflowList({
  stages, validation, currentStageId, onSelectAssignment,
}: {
  stages: SigningStage[];
  validation: SigningWorkflowValidationResult;
  currentStageId: SigningStageId | null;
  onSelectAssignment?: (stageId: SigningStageId, assignmentId: string) => void;
}) {
  const [filter, setFilter] = useState<WorkflowBoardFilter>("all");

  const rows = stages.flatMap(stage =>
    [...stage.assignments]
      .sort((a, b) => a.position - b.position)
      .filter(a => matchesFilter(a, validation, filter))
      .map(assignment => ({ stage, assignment })),
  );

  return (
    <div className="wf-stack">
      <WorkflowFilterControl id="wf-list-filter" value={filter} onChange={setFilter} />

      {rows.length === 0 ? (
        <div className="wf-panel" style={{ textAlign: "center" }}>
          <p style={{ ...GF, margin: "0 0 12px", fontSize: 14, color: WF.slate6 }}>
            No people match this filter.
          </p>
          <button type="button" className="wf-btn wf-btn-secondary wf-btn-sm" onClick={() => setFilter("all")}>
            Clear Filters
          </button>
        </div>
      ) : (
        <>
          {/* Desktop table */}
          <div className="wf-card wf-desktop-only" style={{ overflowX: "auto" }}>
            <table className="wf-table">
              <caption className="wf-visually-hidden">
                People in this signing workflow, grouped by stage, in the order the stages run.
              </caption>
              <thead>
                <tr>
                  <th scope="col">Stage</th>
                  <th scope="col">Person</th>
                  <th scope="col">Required Action</th>
                  <th scope="col">Signature Required</th>
                  <th scope="col">Field Readiness</th>
                  <th scope="col">Status</th>
                  <th scope="col">Due Direction</th>
                </tr>
              </thead>
              <tbody>
                {rows.map(({ stage, assignment }) => (
                  <tr key={String(assignment.id)}>
                    <td>
                      <span style={{ ...GF, fontWeight: 700, color: WF.navy }}>
                        {stage.position}. {stage.name}
                      </span>
                      {stage.id === currentStageId && (
                        <span style={{ ...GF, display: "block", fontSize: 11, fontWeight: 700, color: WF.azure }}>
                          Current stage
                        </span>
                      )}
                    </td>
                    <td>
                      {onSelectAssignment ? (
                        <button
                          type="button"
                          className="wf-btn wf-btn-ghost wf-btn-sm"
                          style={{ padding: 0, minHeight: 0, fontWeight: 600, color: WF.azure }}
                          onClick={() => onSelectAssignment(stage.id, String(assignment.id))}
                        >
                          {assignment.participantName}
                        </button>
                      ) : (
                        <span style={{ ...GF, fontWeight: 600 }}>{assignment.participantName}</span>
                      )}
                      <span style={{ ...GF, display: "block", fontSize: 11, color: WF.slate5, overflowWrap: "anywhere" }}>
                        {assignment.participantEmailMasked}
                      </span>
                    </td>
                    <td>{STAGE_ACTION_LABELS[assignment.action]}</td>
                    <td>
                      {assignment.signatureRequirement.signatureRequired ? "Yes" : "No"}
                      {assignment.signatureRequirement.initialsRequired && " (plus initials)"}
                    </td>
                    <td><ReadinessPill state={assignment.fieldReadiness.state} /></td>
                    <td><AssignmentStatusPill status={assignment.status} /></td>
                    <td>{stage.dueDateDirection ?? "—"}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>

          {/* Mobile cards — same data, no horizontal scrolling */}
          <ul className="wf-mobile-only" style={{ margin: 0, padding: 0, listStyle: "none", display: "flex", flexDirection: "column", gap: 10 }}>
            {rows.map(({ stage, assignment }) => (
              <li key={String(assignment.id)} className="wf-card" style={{ padding: 14 }}>
                <p style={{ ...GF, margin: "0 0 6px", fontSize: 12, fontWeight: 700, color: WF.slate5 }}>
                  Stage {stage.position} · {stage.name}
                </p>
                <p style={{ ...GF, margin: "0 0 8px", fontSize: 14, fontWeight: 700, color: WF.navy, overflowWrap: "anywhere" }}>
                  {assignment.participantName}
                </p>
                <div className="wf-row" style={{ gap: 6, marginBottom: 8 }}>
                  <RequirementPill assignment={assignment} />
                  <AssignmentStatusPill status={assignment.status} />
                  <ReadinessPill state={assignment.fieldReadiness.state} />
                </div>
                {onSelectAssignment && (
                  <button
                    type="button"
                    className="wf-btn wf-btn-secondary wf-btn-sm"
                    onClick={() => onSelectAssignment(stage.id, String(assignment.id))}
                  >
                    Open Details
                  </button>
                )}
              </li>
            ))}
          </ul>
        </>
      )}
    </div>
  );
}

// ── Field readiness matrix ────────────────────────────────────────────────────

export function FieldReadinessMatrix({
  stages, onOpenFieldPlacement,
}: {
  stages: SigningStage[];
  onOpenFieldPlacement?: (stageId: SigningStageId, assignmentId: string) => void;
}) {
  const [issuesOnly, setIssuesOnly] = useState(false);

  const rows = stages.flatMap(stage =>
    [...stage.assignments]
      .sort((a, b) => a.position - b.position)
      .map(assignment => ({ stage, assignment })),
  ).filter(({ assignment }) =>
    !issuesOnly || !isFieldReadinessSatisfied(assignment.fieldReadiness.state),
  );

  const issueCount = stages
    .flatMap(s => s.assignments)
    .filter(a => !isFieldReadinessSatisfied(a.fieldReadiness.state)).length;

  return (
    <div className="wf-stack">
      <div className="wf-row" style={{ justifyContent: "space-between" }}>
        <p style={{ ...GF, margin: 0, fontSize: 13, color: WF.slate6 }}>
          {issueCount === 0
            ? "Everyone who must act has the fields they need."
            : `${issueCount} ${issueCount === 1 ? "person needs" : "people need"} field attention.`}
        </p>
        <label className="wf-row" style={{ ...GF, gap: 8, fontSize: 13, color: WF.slate6, cursor: "pointer", minHeight: 44 }}>
          <input
            type="checkbox"
            checked={issuesOnly}
            onChange={(e) => setIssuesOnly(e.target.checked)}
            style={{ width: 18, height: 18 }}
          />
          Issues only
        </label>
      </div>

      {rows.length === 0 ? (
        <div className="wf-panel" style={{ textAlign: "center" }}>
          <p style={{ ...GF, margin: 0, fontSize: 14, color: WF.slate6 }}>
            {issuesOnly ? "No field issues to show." : "No people have been assigned yet."}
          </p>
        </div>
      ) : (
        <div className="wf-card" style={{ overflowX: "auto" }}>
          <table className="wf-table">
            <caption className="wf-visually-hidden">
              Field readiness by stage and person. Readiness is a configuration check, not a legal-compliance check.
            </caption>
            <thead>
              <tr>
                <th scope="col">Stage</th>
                <th scope="col">Person</th>
                <th scope="col">Required Action</th>
                <th scope="col">Signature</th>
                <th scope="col">Initials</th>
                <th scope="col">Required</th>
                <th scope="col">Assigned</th>
                <th scope="col">Missing</th>
                <th scope="col">Readiness</th>
                <th scope="col"><span className="wf-visually-hidden">Repair action</span></th>
              </tr>
            </thead>
            <tbody>
              {rows.map(({ stage, assignment }) => {
                const r = assignment.fieldReadiness;
                return (
                  <tr key={String(assignment.id)}>
                    <td style={{ whiteSpace: "nowrap" }}>{stage.position}. {stage.name}</td>
                    <td style={{ overflowWrap: "anywhere" }}>{assignment.participantName}</td>
                    <td>{STAGE_ACTION_LABELS[assignment.action]}</td>
                    <td>{assignment.signatureRequirement.signatureRequired ? "Required" : "Not required"}</td>
                    <td>{assignment.signatureRequirement.initialsRequired ? "Required" : "Not required"}</td>
                    <td>{r.requiredFieldCount}</td>
                    <td>{r.assignedFieldCount}</td>
                    <td>
                      {r.missingFieldTypes.length === 0
                        ? "None"
                        : r.missingFieldTypes.map(t => (t === "signature" ? "Signature" : "Initials")).join(", ")}
                    </td>
                    <td><ReadinessPill state={r.state} /></td>
                    <td>
                      {r.repairActionLabel && onOpenFieldPlacement && (
                        <button
                          type="button"
                          className="wf-btn wf-btn-secondary wf-btn-sm"
                          onClick={() => onOpenFieldPlacement(stage.id, String(assignment.id))}
                        >
                          {r.repairActionLabel}
                        </button>
                      )}
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      )}

      <p style={{ ...GF, margin: 0, fontSize: 12, color: WF.slate5, lineHeight: 1.6 }}>
        Field readiness confirms that each person who must act has their own fields on the
        document. It is a configuration check only and is not a statement about legal
        compliance or enforceability.
      </p>

      <div
        className="wf-card"
        style={{ padding: 12, background: TONES.neutral.bg, borderColor: TONES.neutral.border }}
      >
        <p style={{ ...GF, margin: 0, fontSize: 12, color: WF.slate6, lineHeight: 1.6 }}>
          <strong>Readiness values:</strong>{" "}
          {Object.values(FIELD_READINESS_LABELS).join(" · ")}
        </p>
      </div>
    </div>
  );
}
