// Signing Workflow review — /app/documents/:transactionId/workflow/review
//
// The final check before the workflow is created in frontend demonstration state.
// Every required review question is answered in plain language on this page: the
// user never has to infer completion logic from icons.

import { useCallback, useState } from "react";
import { Link, useNavigate } from "react-router";
import { ArrowLeft, CheckCircle2 } from "lucide-react";
import {
  GF, WF, TONES, WORKFLOW_STYLES,
  DemonstrationNotice, FieldReadinessMatrix, ValidationSummary, WorkflowBoard,
  WorkflowDocumentPreview, WorkflowNotificationPreview, WorkflowPill,
  WorkflowSectionHeading, WorkflowSkeleton, WorkflowSummaryHeader, WorkflowTimeline,
  describeRequirement, useAnnouncer,
} from "../../../../components/workflow";
import { CapabilityUnavailable } from "../../../../components/platform/CapabilityUnavailable";
import { WorkflowErrorState } from "./WorkflowTab";
import { useWorkflowData } from "./useWorkflowData";
import {
  AUTH_DIRECTION_LABELS,
  CONSENT_DIRECTION_LABELS,
  STAGE_ACTION_LABELS,
  STAGE_EXECUTION_MODE_LABELS,
  WORKFLOW_DEMONSTRATION_NOTICE,
  WORKFLOW_LEGAL_NOTICE,
} from "../../../../models/signing-workflow";
import { signingWorkflowService } from "../../../../services/mock/signing-workflow.service";
import { resolveNextStage } from "../../../../services/signing-workflow.resolver";

export function WorkflowReviewPage() {
  const data = useWorkflowData();
  const navigate = useNavigate();
  const { announce, announcerNode } = useAnnouncer();
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const base = `/app/documents/${data.documentId}/workflow`;

  const createPreview = useCallback(async () => {
    if (!data.workflow || busy) return;
    setBusy(true);
    setError(null);
    const result = await signingWorkflowService.createWorkflowPreview(
      data.documentId, String(data.workflow.id), data.ctx,
    );
    setBusy(false);
    if (result.ok) {
      announce("The signing workflow was created in frontend demonstration state.");
      navigate(base, { state: { workflowJustCreated: String(result.data.id) }, replace: true });
    } else {
      setError(
        result.code === "INCOMPATIBLE_CONFIGURATION"
          ? "Some issues still need to be fixed before this workflow can be created."
          : result.message,
      );
    }
  }, [data, busy, announce, navigate, base]);

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
          Review Signing Workflow
        </h1>
        <WorkflowSkeleton label="Loading the workflow review" />
      </div>
    );
  }

  if (data.loadState !== "ready" || !data.workflow || !data.validation) {
    return (
      <div className="wf-root">
        <style>{WORKFLOW_STYLES}</style>
        <WorkflowErrorState
          title="Workflow Not Found"
          body="There is no signing workflow to review for this document yet."
          primaryLabel="Return to Signing Workflow"
          primaryTo={base}
          onRetry={data.reload}
        />
      </div>
    );
  }

  const { workflow, validation } = data;
  const allAssignments = data.stages.flatMap(s => s.assignments);
  const signers = allAssignments.filter(a => a.signatureRequirement.signatureRequired);
  const nonblocking = allAssignments.filter(a => !a.blocking);
  const alreadyCreated = workflow.configurationStatus === "ready-in-demonstration";

  return (
    <div className="wf-root" style={{ paddingBottom: 8 }}>
      <style>{WORKFLOW_STYLES}</style>
      {announcerNode}

      <header style={{ marginBottom: 18 }}>
        <Link to={`${base}/create`} className="wf-btn wf-btn-ghost wf-btn-sm" style={{ padding: 0, marginBottom: 8 }}>
          <ArrowLeft size={15} aria-hidden />
          Back to Edit
        </Link>
        <h1 style={{ ...GF, margin: "0 0 6px", fontSize: 20, fontWeight: 700, color: WF.navy }}>
          Review Signing Workflow
        </h1>
        <p style={{ ...GF, margin: 0, fontSize: 14, color: WF.slate6, lineHeight: 1.6, overflowWrap: "anywhere" }}>
          {workflow.name}
        </p>
      </header>

      {error && (
        <div role="alert" className="wf-card" style={{ padding: 12, marginBottom: 16, background: TONES.error.bg, borderColor: TONES.error.border }}>
          <p style={{ ...GF, margin: 0, fontSize: 13, color: TONES.error.text }}>{error}</p>
        </div>
      )}

      <div className="wf-split">
        <div className="wf-stack">
          <WorkflowSummaryHeader document={data.documentSummary} summary={data.summary} />

          {/* ── Review questions, answered ────────────────────────────── */}
          <section className="wf-panel wf-stack" aria-label="Review questions">
            <WorkflowSectionHeading
              title="Check before you continue"
              description="Each question below is answered from the configuration you built."
            />

            <ReviewAnswer
              question="Are the stages in the correct order?"
              answer={
                data.stages.length === 0
                  ? "No stages have been added."
                  : data.stages.map(s => `${s.position}. ${s.name}`).join(" → ")
              }
            />
            <ReviewAnswer
              question="Are the correct people in each stage?"
              answer={
                data.stages
                  .map(s => `${s.name}: ${s.assignments.length === 0 ? "no one yet" : s.assignments.map(a => a.participantName).join(", ")}`)
                  .join(" · ")
              }
            />
            <ReviewAnswer
              question="Is each required action correct?"
              answer={
                allAssignments.length === 0
                  ? "No one has been assigned yet."
                  : allAssignments.map(a => `${a.participantName} — ${STAGE_ACTION_LABELS[a.action]}`).join(" · ")
              }
            />
            <ReviewAnswer
              question="Does each required signer have their own fields?"
              answer={
                signers.length === 0
                  ? "No one is required to sign in this workflow."
                  : signers
                      .map(a => `${a.participantName} — ${a.fieldReadiness.state === "ready" ? "fields ready" : "fields need attention"}`)
                      .join(" · ")
              }
            />
            <ReviewAnswer
              question="Are the authentication and consent directions correct?"
              answer={
                allAssignments.length === 0
                  ? "Nothing to check yet."
                  : allAssignments
                      .map(a => `${a.participantName} — ${AUTH_DIRECTION_LABELS[a.authenticationDirection]}, ${CONSENT_DIRECTION_LABELS[a.consentDirection]}`)
                      .join(" · ")
              }
            />
            <ReviewAnswer
              question="Are there unresolved issues?"
              answer={
                validation.blockingIssueCount === 0 && validation.advisoryIssueCount === 0
                  ? "No issues were found."
                  : `${validation.blockingIssueCount} must be fixed, ${validation.advisoryIssueCount} worth checking.`
              }
            />
            <ReviewAnswer
              question="What happens after each stage completes?"
              answer={
                data.stages
                  .map(s => resolveNextStage(workflow, s.id).explanation)
                  .join(" ")
              }
            />
          </section>

          {/* ── Read-only board ───────────────────────────────────────── */}
          <section className="wf-stack" aria-label="Stage sequence">
            <WorkflowSectionHeading title="Stage Sequence" />
            <div className="wf-desktop-only">
              <WorkflowBoard
                stages={data.stages}
                validation={validation}
                selection={data.selection}
                onSelect={data.setSelection}
                mode="status"
                currentStageId={null}
                canEdit={false}
                announce={announce}
              />
            </div>
            <div className="wf-mobile-only">
              <WorkflowTimeline
                stages={data.stages}
                validation={validation}
                currentStageId={null}
              />
            </div>
          </section>

          {/* ── Requirement summary ───────────────────────────────────── */}
          <section className="wf-panel wf-stack" aria-label="Electronic signature requirements">
            <WorkflowSectionHeading
              title="Electronic Signature Requirements"
              description="Every requirement below belongs to one identified person. A stage never signs, and no one signs for anyone else."
            />
            {signers.length === 0 ? (
              <p style={{ ...GF, margin: 0, fontSize: 13, color: WF.slate6 }}>
                No one in this workflow is required to provide an electronic signature.
              </p>
            ) : (
              <ul style={{ margin: 0, padding: 0, listStyle: "none", display: "flex", flexDirection: "column", gap: 10 }}>
                {signers.map(a => (
                  <li key={String(a.id)} className="wf-row" style={{ gap: 10, justifyContent: "space-between" }}>
                    <span style={{ ...GF, fontSize: 13, fontWeight: 600, color: WF.slate7, overflowWrap: "anywhere" }}>
                      {a.participantName}
                    </span>
                    <span className="wf-row" style={{ gap: 6 }}>
                      <WorkflowPill label={describeRequirement(a)} tone={TONES.azure} />
                      <WorkflowPill
                        label={a.fieldReadiness.state === "ready" ? "Fields ready" : "Fields need attention"}
                        tone={a.fieldReadiness.state === "ready" ? TONES.success : TONES.error}
                      />
                    </span>
                  </li>
                ))}
              </ul>
            )}

            {nonblocking.length > 0 && (
              <p style={{ ...GF, margin: 0, fontSize: 12, color: WF.slate5, lineHeight: 1.6 }}>
                {nonblocking.map(a => a.participantName).join(", ")}{" "}
                {nonblocking.length === 1 ? "does" : "do"} not hold up completion. Copy recipients
                receive the document only at the approved distribution point.
              </p>
            )}

            <p style={{ ...GF, margin: 0, fontSize: 12, color: WF.slate5, lineHeight: 1.6 }}>
              Each stage uses the rule: <strong>all required people must complete their action</strong>.
              Execution within a stage:{" "}
              {data.stages.map(s => `${s.name} — ${STAGE_EXECUTION_MODE_LABELS[s.executionMode]}`).join(" · ")}.
            </p>
          </section>

          {/* ── Field readiness ───────────────────────────────────────── */}
          <section className="wf-panel wf-stack" aria-label="Field readiness summary">
            <WorkflowSectionHeading title="Field Readiness" />
            <FieldReadinessMatrix stages={data.stages} />
          </section>

          {/* ── Notification preview ──────────────────────────────────── */}
          <section className="wf-panel">
            <WorkflowNotificationPreview documentId={data.documentId} />
          </section>

          {/* ── Issues ────────────────────────────────────────────────── */}
          <ValidationSummary
            title="Configuration Checks"
            issues={validation.issues}
            emptyMessage="This configuration has no outstanding issues."
            onRepair={() => navigate(`${base}/create`)}
          />

          {/* ── Primary action ────────────────────────────────────────── */}
          <section className="wf-panel wf-stack" aria-label="Create workflow">
            {alreadyCreated ? (
              <>
                <div className="wf-row" style={{ gap: 10 }}>
                  <CheckCircle2 size={18} color={WF.successText} aria-hidden />
                  <p style={{ ...GF, margin: 0, fontSize: 14, fontWeight: 600, color: WF.successText }}>
                    This workflow has already been created in demonstration state.
                  </p>
                </div>
                <Link to={base} className="wf-btn wf-btn-primary">Open Workflow Board</Link>
              </>
            ) : (
              <>
                <button
                  type="button"
                  className="wf-btn wf-btn-primary"
                  disabled={busy || !validation.readyForReview || !data.permissions.canCreateDocumentWorkflow}
                  onClick={createPreview}
                >
                  {busy ? "Working…" : "Create Workflow Preview"}
                </button>
                {!validation.readyForReview && (
                  <p style={{ ...GF, margin: 0, fontSize: 12, color: WF.slate5 }}>
                    Fix the issues above before creating this workflow.
                  </p>
                )}
                <Link to={`${base}/create`} className="wf-btn wf-btn-secondary">Back to Edit</Link>
              </>
            )}
            <DemonstrationNotice text={WORKFLOW_DEMONSTRATION_NOTICE} />
            <DemonstrationNotice text={WORKFLOW_LEGAL_NOTICE} compact />
          </section>
        </div>

        <div className="wf-desktop-only">
          <WorkflowDocumentPreview
            preview={data.preview}
            loading={data.previewLoading}
            documentTitle={data.documentSummary.title}
            contextLabel="Select a person on the board to see the fields that belong to them."
            selectedParticipantName={null}
            onPageChange={data.setPreviewPage}
            onRetry={data.reloadPreview}
          />
        </div>
      </div>
    </div>
  );
}

function ReviewAnswer({ question, answer }: { question: string; answer: string }) {
  return (
    <div style={{ borderTop: `1px solid ${WF.slate1}`, paddingTop: 12 }}>
      <p style={{ ...GF, margin: "0 0 4px", fontSize: 13, fontWeight: 700, color: WF.navy }}>
        {question}
      </p>
      <p style={{ ...GF, margin: 0, fontSize: 13, color: WF.slate6, lineHeight: 1.65, overflowWrap: "anywhere" }}>
        {answer}
      </p>
    </div>
  );
}
