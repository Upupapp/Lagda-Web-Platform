// Signing Workflow tab — /app/documents/:transactionId/workflow
//
// The persistent, primary workflow screen. Renders one of:
//   loading · capability unavailable · restricted · not found · error
//   empty state (no workflow configured) · creation result · status board
//
// Views: Board (default) · Timeline · List. Only one view is mounted at a time,
// so no hidden duplicate control ever enters the focus order.

import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { Link, useLocation, useNavigate, useSearchParams } from "react-router";
import {
  ArrowRight, CheckCircle2, FileText, LayoutGrid, List as ListIcon, Plus, RefreshCw, Rows3,
} from "lucide-react";
import { LagdaLogo } from "../../../../components/brand/LagdaLogo";
import {
  GF, WF, TONES, WORKFLOW_STYLES,
  DemonstrationNotice, FieldReadinessMatrix, ParticipantConfigPanel,
  ValidationSummary, WorkflowBoard, WorkflowDocumentPreview, WorkflowList,
  WorkflowNotificationPreview, WorkflowPill, WorkflowSkeleton,
  WorkflowSummaryHeader, WorkflowTimeline, useAnnouncer,
} from "../../../../components/workflow";
import { CapabilityUnavailable } from "../../../../components/platform/CapabilityUnavailable";
import {
  buildSafeReturnPath,
  useWorkflowData,
} from "./useWorkflowData";
import type {
  SigningStageId,
  StageParticipantAssignmentId,
  UpdateStageParticipantInput,
  WorkflowBoardView,
} from "../../../../models/signing-workflow";
import {
  WORKFLOW_BOARD_VIEW_LABELS,
  WORKFLOW_DEMONSTRATION_NOTICE,
  WORKFLOW_LEGAL_NOTICE,
  WORKFLOW_PROGRESS_NOTICE,
  VALID_WORKFLOW_BOARD_VIEWS,
  parseWorkflowBoardView,
} from "../../../../models/signing-workflow";
import { signingWorkflowService } from "../../../../services/mock/signing-workflow.service";

type Panel = "issues" | "fields" | "notifications";

export function WorkflowTab() {
  const data = useWorkflowData();
  const navigate = useNavigate();
  const location = useLocation();
  const [searchParams, setSearchParams] = useSearchParams();
  const { announce, announcerNode } = useAnnouncer();

  const base = `/app/documents/${data.documentId}/workflow`;

  // View is the only query value this screen reads, and it is validated on every read.
  const view: WorkflowBoardView = parseWorkflowBoardView(searchParams.get("view"));
  const [panel, setPanel] = useState<Panel>("issues");
  const [showPreviewSheet, setShowPreviewSheet] = useState(false);
  const [busy, setBusy] = useState(false);

  // The creation result is delivered through router state, never through the URL,
  // so nothing about the workflow can be triggered or forged by a query value.
  const justCreated = (location.state as { workflowJustCreated?: string } | null)?.workflowJustCreated;
  const showResult = !!justCreated && !!data.workflow && String(data.workflow.id) === justCreated;

  const setView = useCallback((next: WorkflowBoardView) => {
    const params = new URLSearchParams(searchParams);
    params.set("view", next);
    setSearchParams(params, { replace: true });
    announce(`${WORKFLOW_BOARD_VIEW_LABELS[next]} view shown.`);
  }, [searchParams, setSearchParams, announce]);

  // Selected assignment for the configuration panel.
  const [openAssignment, setOpenAssignment] = useState<{
    stageId: SigningStageId; assignmentId: StageParticipantAssignmentId;
  } | null>(null);

  const selectedAssignment = useMemo(() => {
    if (!openAssignment || !data.workflow) return null;
    const stage = data.workflow.stages.find(s => s.id === openAssignment.stageId);
    const assignment = stage?.assignments.find(a => a.id === openAssignment.assignmentId);
    return stage && assignment ? { stage, assignment } : null;
  }, [openAssignment, data.workflow]);

  // Closing the panel when the workflow reloads avoids a stale selection surviving.
  useEffect(() => {
    if (openAssignment && !selectedAssignment) setOpenAssignment(null);
  }, [openAssignment, selectedAssignment]);

  const selectedParticipantName = useMemo(() => {
    if (!data.selection.assignmentId || !data.workflow) return null;
    return data.workflow.stages
      .flatMap(s => s.assignments)
      .find(a => a.id === data.selection.assignmentId)?.participantName ?? null;
  }, [data.selection.assignmentId, data.workflow]);

  const previewContextLabel = useMemo(() => {
    if (selectedParticipantName) return `Showing the fields that belong to ${selectedParticipantName}.`;
    if (data.selection.stageId && data.workflow) {
      const stage = data.workflow.stages.find(s => s.id === data.selection.stageId);
      if (stage) return `Showing the fields for everyone in ${stage.name}.`;
    }
    return "Select a stage or a person to see the fields that belong to them.";
  }, [selectedParticipantName, data.selection.stageId, data.workflow]);

  const openFieldPlacement = useCallback(() => {
    const returnTo = buildSafeReturnPath(location.pathname);
    navigate(`/app/prepare/fields?returnTo=${encodeURIComponent(returnTo)}`);
  }, [navigate, location.pathname]);

  const applyParticipantChange = useCallback(async (input: UpdateStageParticipantInput) => {
    if (!data.workflow || !openAssignment) return;
    setBusy(true);
    const result = await signingWorkflowService.updateStageParticipant(
      data.documentId, String(data.workflow.id),
      String(openAssignment.stageId), String(openAssignment.assignmentId),
      input, data.ctx,
    );
    setBusy(false);
    if (result.ok) {
      setOpenAssignment(null);
      data.reload();
      announce("The participant configuration was updated in the draft.");
    } else {
      announce(result.message);
    }
  }, [data, openAssignment, announce]);

  const removeParticipant = useCallback(async () => {
    if (!data.workflow || !openAssignment) return;
    setBusy(true);
    const result = await signingWorkflowService.removeStageParticipant(
      data.documentId, String(data.workflow.id),
      String(openAssignment.stageId), String(openAssignment.assignmentId), data.ctx,
    );
    setBusy(false);
    if (result.ok) {
      setOpenAssignment(null);
      data.reload();
      announce("The person was removed from the stage in the draft.");
    }
  }, [data, openAssignment, announce]);

  // ── Guard states ────────────────────────────────────────────────────────────

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

  return (
    <div className="wf-root">
      <style>{WORKFLOW_STYLES}</style>
      {announcerNode}

      {data.loadState === "loading" && (
        <div style={{ padding: "8px 0" }}>
          <h1 style={{ ...GF, margin: "0 0 16px", fontSize: 20, fontWeight: 700, color: WF.navy }}>
            Signing Workflow
          </h1>
          <WorkflowSkeleton label="Loading the signing workflow" />
        </div>
      )}

      {data.loadState === "not-found" && (
        <WorkflowErrorState
          title="Workflow Not Found"
          body="A signing workflow for this document could not be found."
          primaryLabel="Return to Document Overview"
          primaryTo={`/app/documents/${data.documentId}`}
          onRetry={data.reload}
        />
      )}

      {data.loadState === "restricted" && (
        <WorkflowErrorState
          title="Document Restricted"
          body="You do not have access to this document's signing workflow."
          primaryLabel="Return to Documents"
          primaryTo="/app/documents"
        />
      )}

      {data.loadState === "error" && (
        <WorkflowErrorState
          title="Signing Workflow Could Not Be Loaded"
          body={data.errorMessage ?? "Something went wrong loading the signing workflow."}
          primaryLabel="Return to Document Overview"
          primaryTo={`/app/documents/${data.documentId}`}
          onRetry={data.reload}
        />
      )}

      {data.loadState === "ready" && !data.workflow && (
        <EmptyWorkflowState
          documentId={data.documentId}
          canCreate={data.permissions.canCreateDocumentWorkflow}
          lockReason={data.documentSummary.lockReason}
        />
      )}

      {data.loadState === "ready" && data.workflow && data.validation && (
        <>
          {/* ── Header ──────────────────────────────────────────────────── */}
          <header style={{ marginBottom: 20 }}>
            <h1 style={{ ...GF, margin: "0 0 6px", fontSize: 20, fontWeight: 700, color: WF.navy }}>
              Signing Workflow
            </h1>
            <p style={{ ...GF, margin: 0, fontSize: 14, color: WF.slate6, overflowWrap: "anywhere" }}>
              {data.workflow.name}
            </p>
          </header>

          {showResult && (
            <div style={{ marginBottom: 20 }}>
              <CreationResultPanel
                workflowName={data.workflow.name}
                documentTitle={data.documentSummary.title}
                stageCount={data.summary?.stageCount ?? 0}
                participantCount={data.summary?.participantAssignmentCount ?? 0}
                signatureCount={data.summary?.requiredSignatureCount ?? 0}
                readinessSatisfied={data.validation.blockingIssueCount === 0}
                documentId={data.documentId}
                onOpenFieldPlacement={openFieldPlacement}
              />
            </div>
          )}

          {/* ── View selector + actions ─────────────────────────────────── */}
          <div
            className="wf-row"
            style={{ justifyContent: "space-between", marginBottom: 16, gap: 12 }}
          >
            <div role="group" aria-label="Workflow view" className="wf-row" style={{ gap: 6 }}>
              {VALID_WORKFLOW_BOARD_VIEWS.map(v => {
                const active = v === view;
                const Icon = v === "board" ? LayoutGrid : v === "timeline" ? Rows3 : ListIcon;
                return (
                  <button
                    key={v}
                    type="button"
                    className={`wf-btn wf-btn-sm ${active ? "wf-btn-primary" : "wf-btn-secondary"}`}
                    aria-pressed={active}
                    onClick={() => setView(v)}
                  >
                    <Icon size={15} aria-hidden />
                    {WORKFLOW_BOARD_VIEW_LABELS[v]}
                  </button>
                );
              })}
            </div>

            <div className="wf-row" style={{ gap: 8 }}>
              <button
                type="button"
                className="wf-btn wf-btn-secondary wf-btn-sm wf-mobile-only"
                onClick={() => setShowPreviewSheet(true)}
              >
                <FileText size={15} aria-hidden />
                Preview Document
              </button>
              {data.permissions.canEditDocumentWorkflow && (
                <Link to={`${base}/create`} className="wf-btn wf-btn-secondary wf-btn-sm">
                  Edit Workflow
                </Link>
              )}
              {data.validation.readyForReview && (
                <Link to={`${base}/review`} className="wf-btn wf-btn-primary wf-btn-sm">
                  Review Workflow
                  <ArrowRight size={15} aria-hidden />
                </Link>
              )}
            </div>
          </div>

          {/* ── Main split ──────────────────────────────────────────────── */}
          <div className="wf-split">
            <div className="wf-stack">
              <WorkflowSummaryHeader document={data.documentSummary} summary={data.summary} />

              <p style={{ ...GF, margin: 0, fontSize: 13, color: WF.slate6, lineHeight: 1.6 }}>
                {data.currentStageExplanation} {data.nextStageExplanation}
              </p>

              {view === "board" && (
                <WorkflowBoard
                  stages={data.stages}
                  validation={data.validation}
                  selection={data.selection}
                  onSelect={data.setSelection}
                  mode="status"
                  currentStageId={data.currentStageId}
                  canEdit={false}
                  announce={announce}
                  onOpenStageDetail={(stageId) => navigate(`${base}/stages/${stageId}`)}
                />
              )}
              {/* Selecting a card on the board both scopes the preview and opens
                  the participant panel, so the board is not a dead end. */}
              <BoardSelectionOpener
                selection={data.selection}
                onOpen={(stageId, assignmentId) => setOpenAssignment({ stageId, assignmentId })}
              />

              {view === "timeline" && (
                <WorkflowTimeline
                  stages={data.stages}
                  validation={data.validation}
                  currentStageId={data.currentStageId}
                  onOpenStage={(stageId) => navigate(`${base}/stages/${stageId}`)}
                  onSelectAssignment={(stageId, assignmentId) => {
                    data.setSelection({ stageId, assignmentId: assignmentId as StageParticipantAssignmentId });
                    setOpenAssignment({ stageId, assignmentId: assignmentId as StageParticipantAssignmentId });
                  }}
                />
              )}

              {view === "list" && (
                <WorkflowList
                  stages={data.stages}
                  validation={data.validation}
                  currentStageId={data.currentStageId}
                  onSelectAssignment={(stageId, assignmentId) => {
                    data.setSelection({ stageId, assignmentId: assignmentId as StageParticipantAssignmentId });
                    setOpenAssignment({ stageId, assignmentId: assignmentId as StageParticipantAssignmentId });
                  }}
                />
              )}

              {/* ── Secondary panels ──────────────────────────────────── */}
              <div className="wf-card" style={{ padding: 20 }}>
                <div role="group" aria-label="Workflow details" className="wf-row" style={{ gap: 6, marginBottom: 16 }}>
                  {([
                    ["issues", `Issues (${data.validation.issues.length})`],
                    ["fields", "Field Readiness"],
                    ["notifications", "Notification Preview"],
                  ] as [Panel, string][]).map(([id, label]) => (
                    <button
                      key={id}
                      type="button"
                      className={`wf-btn wf-btn-sm ${panel === id ? "wf-btn-primary" : "wf-btn-secondary"}`}
                      aria-pressed={panel === id}
                      onClick={() => setPanel(id)}
                    >
                      {label}
                    </button>
                  ))}
                </div>

                {panel === "issues" && (
                  <ValidationSummary
                    issues={data.validation.issues}
                    emptyMessage="This configuration has no outstanding issues."
                    onRepair={(issue) => {
                      if (issue.repairTarget === "field-placement") openFieldPlacement();
                      else if (issue.stageId) navigate(`${base}/stages/${issue.stageId}`);
                      else navigate(`${base}/create`);
                    }}
                  />
                )}

                {panel === "fields" && (
                  <FieldReadinessMatrix
                    stages={data.stages}
                    onOpenFieldPlacement={openFieldPlacement}
                  />
                )}

                {panel === "notifications" && (
                  <WorkflowNotificationPreview documentId={data.documentId} />
                )}
              </div>

              <DemonstrationNotice text={WORKFLOW_PROGRESS_NOTICE} />
              <DemonstrationNotice text={WORKFLOW_LEGAL_NOTICE} compact />
            </div>

            {/* ── Desktop preview panel ─────────────────────────────────── */}
            <div className="wf-desktop-only">
              <WorkflowDocumentPreview
                preview={data.preview}
                loading={data.previewLoading}
                documentTitle={data.documentSummary.title}
                contextLabel={previewContextLabel}
                selectedParticipantName={selectedParticipantName}
                onPageChange={data.setPreviewPage}
                onRetry={data.reloadPreview}
                onOpenFieldPlacement={data.permissions.canEditDocumentWorkflow ? openFieldPlacement : undefined}
              />
            </div>
          </div>

          {/* ── Mobile full-screen preview sheet ──────────────────────────── */}
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
                contextLabel={previewContextLabel}
                selectedParticipantName={selectedParticipantName}
                onPageChange={data.setPreviewPage}
                onRetry={data.reloadPreview}
                onClose={() => setShowPreviewSheet(false)}
                onOpenFieldPlacement={data.permissions.canEditDocumentWorkflow ? openFieldPlacement : undefined}
              />
            </div>
          )}

          {/* ── Participant configuration ─────────────────────────────────── */}
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
        </>
      )}
    </div>
  );
}

// ── Board selection opener ────────────────────────────────────────────────────
// Opens the participant panel when a board card becomes the selected assignment.

function BoardSelectionOpener({
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

// ── Empty state ───────────────────────────────────────────────────────────────

function EmptyWorkflowState({
  documentId, canCreate, lockReason,
}: { documentId: string; canCreate: boolean; lockReason: string | null }) {
  const base = `/app/documents/${documentId}/workflow`;

  return (
    <div style={{ maxWidth: 720, margin: "0 auto", padding: "24px 0 8px" }}>
      <div className="wf-panel wf-stack wf-enter" style={{ gap: 20, textAlign: "center", alignItems: "center" }}>
        {/* One restrained brand element on an otherwise empty light surface.
            The canonical C36 LagdaLogo component is reused — no second registry,
            no recolouring, no animation, and never inside a button. */}
        <LagdaLogo variant="colored-icon" size="lg" decorative />

        <div>
          <h1 style={{ ...GF, margin: "0 0 8px", fontSize: 22, fontWeight: 700, color: WF.navy }}>
            Signing Workflow
          </h1>
          <p style={{ ...GF, margin: 0, fontSize: 14, color: WF.slate6, lineHeight: 1.7, maxWidth: 520 }}>
            A signing workflow decides who acts on this document, in what order, and exactly what
            each person must do.
          </p>
        </div>

        {/* Three-stage visual example with clearly fictional placeholders. */}
        <ExampleSequence />

        <ul
          style={{
            ...GF, margin: 0, padding: 0, listStyle: "none", textAlign: "left",
            display: "flex", flexDirection: "column", gap: 10, maxWidth: 520, width: "100%",
          }}
        >
          {[
            "Stages control when people act.",
            "People within a stage receive explicit actions.",
            "Electronic signature requirements are individual — one person, their own fields.",
            "Later stages wait for earlier stages to complete.",
          ].map(line => (
            <li key={line} className="wf-row" style={{ gap: 10, alignItems: "flex-start", flexWrap: "nowrap" }}>
              <CheckCircle2 size={16} color={WF.azure} aria-hidden style={{ flexShrink: 0, marginTop: 2 }} />
              <span style={{ fontSize: 13, color: WF.slate6, lineHeight: 1.6 }}>{line}</span>
            </li>
          ))}
        </ul>

        {canCreate ? (
          <div className="wf-row" style={{ gap: 10, justifyContent: "center" }}>
            <Link to={`${base}/create`} className="wf-btn wf-btn-primary">
              <Plus size={16} aria-hidden />
              Create Signing Workflow
            </Link>
            <Link to={`${base}/create?from=recipients`} className="wf-btn wf-btn-secondary">
              Use Current Recipient Order
            </Link>
          </div>
        ) : (
          <p
            className="wf-card"
            style={{ ...GF, margin: 0, padding: 14, fontSize: 13, color: WF.slate6, lineHeight: 1.6, width: "100%" }}
          >
            {lockReason
              ?? "You do not have permission to configure the signing workflow for this document."}
          </p>
        )}

        {/* /help lives on the public site. Opened in a new tab so the sender is
            not pulled out of the authenticated shell mid-task — matching the
            PlatformHeader and UserMenu convention. */}
        <Link
          to="/help"
          target="_blank"
          rel="noopener noreferrer"
          aria-label="Learn how signing workflows work (opens in new tab)"
          style={{ ...GF, fontSize: 13, color: WF.azure, fontWeight: 600 }}
        >
          Learn how signing workflows work
        </Link>
      </div>

      <div style={{ marginTop: 16 }}>
        <DemonstrationNotice text={WORKFLOW_DEMONSTRATION_NOTICE} />
      </div>
    </div>
  );
}

function ExampleSequence() {
  const example = [
    { n: 1, name: "Internal Review", detail: "Reviewer — review, no signature" },
    { n: 2, name: "Approval", detail: "Department head — approve with signature" },
    { n: 3, name: "Signing", detail: "Two signatories — sign, own fields each" },
  ];
  return (
    <div
      aria-label="Example: a three-stage signing workflow using placeholder names"
      role="group"
      style={{
        display: "flex", gap: 8, flexWrap: "wrap", justifyContent: "center",
        width: "100%", background: WF.slate0, border: `1px solid ${WF.slate2}`,
        borderRadius: 12, padding: 16,
      }}
    >
      {example.map((s, i) => (
        <div key={s.n} className="wf-row" style={{ gap: 8, flexWrap: "nowrap" }}>
          <div
            style={{
              background: WF.white, border: `1px solid ${WF.slate2}`, borderRadius: 10,
              padding: "10px 12px", minWidth: 150, textAlign: "left",
            }}
          >
            <span
              aria-hidden
              style={{
                ...GF, display: "inline-flex", alignItems: "center", justifyContent: "center",
                width: 20, height: 20, borderRadius: 6, background: WF.slate1,
                color: WF.slate6, fontSize: 11, fontWeight: 800, marginBottom: 6,
              }}
            >
              {s.n}
            </span>
            <p style={{ ...GF, margin: 0, fontSize: 12, fontWeight: 700, color: WF.navy }}>{s.name}</p>
            <p style={{ ...GF, margin: "2px 0 0", fontSize: 11, color: WF.slate5, lineHeight: 1.5 }}>
              {s.detail}
            </p>
          </div>
          {i < example.length - 1 && (
            <span style={{ ...GF, fontSize: 10, fontWeight: 700, letterSpacing: "0.08em", color: WF.slate4 }}>
              THEN
            </span>
          )}
        </div>
      ))}
    </div>
  );
}

// ── Creation result panel ─────────────────────────────────────────────────────

function CreationResultPanel({
  workflowName, documentTitle, stageCount, participantCount, signatureCount,
  readinessSatisfied, documentId, onOpenFieldPlacement,
}: {
  workflowName: string;
  documentTitle: string;
  stageCount: number;
  participantCount: number;
  signatureCount: number;
  readinessSatisfied: boolean;
  documentId: string;
  onOpenFieldPlacement: () => void;
}) {
  return (
    <section
      className="wf-panel wf-stack wf-enter"
      aria-label="Workflow creation result"
      style={{ borderColor: WF.successBorder, background: WF.successBg, gap: 14 }}
    >
      <div className="wf-row" style={{ gap: 10 }}>
        <CheckCircle2 size={20} color={WF.successText} aria-hidden />
        <h2 style={{ ...GF, margin: 0, fontSize: 17, fontWeight: 700, color: WF.successText }}>
          Signing Workflow Created in Demonstration
        </h2>
      </div>

      <p style={{ ...GF, margin: 0, fontSize: 14, color: WF.slate7, lineHeight: 1.6, overflowWrap: "anywhere" }}>
        <strong>{workflowName}</strong> for {documentTitle}
      </p>

      <div className="wf-row" style={{ gap: 6 }}>
        <WorkflowPill label={`${stageCount} ${stageCount === 1 ? "stage" : "stages"}`} tone={TONES.neutral} />
        <WorkflowPill label={`${participantCount} assigned`} tone={TONES.neutral} />
        <WorkflowPill label={`${signatureCount} ${signatureCount === 1 ? "signature" : "signatures"} required`} tone={TONES.neutral} />
        <WorkflowPill
          label={readinessSatisfied ? "Fields ready" : "Fields need attention"}
          tone={readinessSatisfied ? TONES.success : TONES.warning}
        />
      </div>

      <div className="wf-row" style={{ gap: 10 }}>
        {readinessSatisfied ? (
          <Link to={`/app/documents/${documentId}`} className="wf-btn wf-btn-primary wf-btn-sm">
            Review Document
          </Link>
        ) : (
          <button type="button" className="wf-btn wf-btn-primary wf-btn-sm" onClick={onOpenFieldPlacement}>
            Continue to Place Fields
          </button>
        )}
        <Link to={`/app/documents/${documentId}`} className="wf-btn wf-btn-secondary wf-btn-sm">
          Return to Document
        </Link>
      </div>

      <p style={{ ...GF, margin: 0, fontSize: 12, color: WF.slate6, lineHeight: 1.7 }}>
        {WORKFLOW_DEMONSTRATION_NOTICE}
      </p>
    </section>
  );
}

// ── Error state ───────────────────────────────────────────────────────────────

export function WorkflowErrorState({
  title, body, primaryLabel, primaryTo, onRetry,
}: {
  title: string;
  body: string;
  primaryLabel: string;
  primaryTo: string;
  onRetry?: () => void;
}) {
  return (
    <div style={{ maxWidth: 520, margin: "0 auto", padding: "48px 0", textAlign: "center" }}>
      <h1 style={{ ...GF, margin: "0 0 10px", fontSize: 20, fontWeight: 700, color: WF.navy }}>
        {title}
      </h1>
      <p style={{ ...GF, margin: "0 0 24px", fontSize: 14, color: WF.slate6, lineHeight: 1.7 }}>
        {body}
      </p>
      <div className="wf-row" style={{ gap: 10, justifyContent: "center" }}>
        {onRetry && (
          <button type="button" className="wf-btn wf-btn-secondary" onClick={onRetry}>
            <RefreshCw size={15} aria-hidden />
            Retry
          </button>
        )}
        <Link to={primaryTo} className="wf-btn wf-btn-primary">{primaryLabel}</Link>
      </div>
      <p style={{ ...GF, margin: "24px 0 0", fontSize: 12, color: WF.slate5 }}>
        Still stuck?{" "}
        <Link
          to="/contact"
          target="_blank"
          rel="noopener noreferrer"
          aria-label="Contact support (opens in new tab)"
          style={{ color: WF.azure, fontWeight: 600 }}
        >
          Contact support
        </Link>.
      </p>
    </div>
  );
}
