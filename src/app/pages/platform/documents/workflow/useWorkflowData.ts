// Signing Workflow — shared data hook for every workflow route.
//
// One hook owns: capability resolution, permission mapping, workflow loading,
// validation, summary derivation, preview loading, and stale-request cancellation.
// Pages never call the service directly for reads.

import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { useOutletContext } from "react-router";
import { usePlatform, useCapability } from "../../../../context/PlatformContext";
import type { TxnOutletContext } from "../TransactionDetailPage";
import type {
  SigningWorkflow,
  SigningWorkflowSummary,
  SigningWorkflowValidationResult,
  SigningWorkflowPermissionContext,
  WorkflowBoardSelection,
  WorkflowDocumentPreviewContext,
  WorkflowDocumentSummary,
} from "../../../../models/signing-workflow";
import { buildWorkflowPermissionContext, EMPTY_BOARD_SELECTION } from "../../../../models/signing-workflow";
import {
  signingWorkflowService,
  buildDocumentSummary,
  type SigningWorkflowContext,
  type WorkflowParticipantCandidate,
} from "../../../../services/mock/signing-workflow.service";
import { validateSigningWorkflow } from "../../../../services/signing-workflow.validation";
import {
  resolveCurrentStage,
  resolveNextStage,
  orderedStages,
} from "../../../../services/signing-workflow.resolver";

export const SIGNING_WORKFLOW_CAPABILITY_ID = "signing-workflow";

export type WorkflowLoadState = "loading" | "ready" | "not-found" | "restricted" | "error";

export interface UseWorkflowDataResult {
  // Document context (authoritative — read from the transaction detail service)
  txn:            TxnOutletContext["txn"];
  documentId:     string;
  documentSummary: WorkflowDocumentSummary;

  // Capability and permissions
  capabilityAvailable: boolean;
  capabilityReason:    string;
  capabilityFallback:  string;
  permissions:         SigningWorkflowPermissionContext;

  // Workflow state
  workflow:   SigningWorkflow | null;
  validation: SigningWorkflowValidationResult | null;
  summary:    SigningWorkflowSummary | null;
  loadState:  WorkflowLoadState;
  errorMessage: string | null;

  // Derived
  stages:          SigningWorkflow["stages"];
  currentStageId:  SigningWorkflowSummary["currentStageId"];
  currentStageExplanation: string;
  nextStageExplanation:    string;

  // Selection
  selection:    WorkflowBoardSelection;
  setSelection: (s: WorkflowBoardSelection) => void;

  // Preview
  preview:        WorkflowDocumentPreviewContext | null;
  previewLoading: boolean;
  setPreviewPage: (page: number) => void;
  reloadPreview:  () => void;

  // Candidates
  candidates:        WorkflowParticipantCandidate[];
  candidatesLoading: boolean;

  // Actions
  ctx:    SigningWorkflowContext;
  reload: () => void;
}

export function useWorkflowData(): UseWorkflowDataResult {
  const outlet = useOutletContext<TxnOutletContext>();
  const { txn } = outlet;
  const { hasPermission, currentWorkspace } = usePlatform();
  const capability = useCapability(SIGNING_WORKFLOW_CAPABILITY_ID);

  const documentId = txn.id;
  const workspaceId = currentWorkspace?.id ?? "";

  const documentSummary = useMemo(() => buildDocumentSummary(txn), [txn]);

  const permissions = useMemo(() => buildWorkflowPermissionContext({
    hasViewDocuments:    hasPermission("view_documents"),
    hasPrepareDocuments: hasPermission("prepare_documents"),
    documentAccessible:  true, // reaching this route already required document access
    configurationLocked: documentSummary.configurationLocked,
  }), [hasPermission, documentSummary.configurationLocked]);

  const ctx = useMemo<SigningWorkflowContext>(() => ({
    workspaceId,
    teamId: null,
    capabilityAvailable: capability.available,
    canView: permissions.canViewDocumentWorkflow,
    canEdit: permissions.canEditDocumentWorkflow,
  }), [workspaceId, capability.available, permissions]);

  const [workflow, setWorkflow]   = useState<SigningWorkflow | null>(null);
  const [loadState, setLoadState] = useState<WorkflowLoadState>("loading");
  const [errorMessage, setErrorMessage] = useState<string | null>(null);
  const [loadKey, setLoadKey]     = useState(0);
  const [selection, setSelectionState] = useState<WorkflowBoardSelection>(EMPTY_BOARD_SELECTION);

  const [preview, setPreview] = useState<WorkflowDocumentPreviewContext | null>(null);
  const [previewLoading, setPreviewLoading] = useState(false);
  const [previewKey, setPreviewKey] = useState(0);
  const [previewPage, setPreviewPageState] = useState(1);

  const [candidates, setCandidates] = useState<WorkflowParticipantCandidate[]>([]);
  const [candidatesLoading, setCandidatesLoading] = useState(false);

  const reload = useCallback(() => setLoadKey(k => k + 1), []);
  const reloadPreview = useCallback(() => setPreviewKey(k => k + 1), []);

  // Clearing selection whenever the workspace or document changes prevents a prior
  // workspace's stage/participant selection from surviving a switch.
  const workspaceRef = useRef(workspaceId);
  useEffect(() => {
    if (workspaceRef.current !== workspaceId) {
      workspaceRef.current = workspaceId;
      setSelectionState(EMPTY_BOARD_SELECTION);
      setWorkflow(null);
      setPreview(null);
      setLoadState("loading");
      setLoadKey(k => k + 1);
    }
  }, [workspaceId]);

  useEffect(() => {
    setSelectionState(EMPTY_BOARD_SELECTION);
  }, [documentId]);

  // ── Load workflow ───────────────────────────────────────────────────────────
  useEffect(() => {
    if (!capability.available) { setLoadState("restricted"); return; }
    if (!permissions.canViewDocumentWorkflow) { setLoadState("restricted"); return; }

    const controller = new AbortController();
    let cancelled = false;
    setLoadState("loading");
    setErrorMessage(null);

    signingWorkflowService
      .getDocumentWorkflow(documentId, { ...ctx, signal: controller.signal })
      .then(result => {
        if (cancelled) return;
        if (result.ok) {
          setWorkflow(result.data);
          setLoadState("ready");
        } else if (result.code === "CANCELLED") {
          // Superseded by a newer request — leave state to the newer effect.
        } else if (result.code === "NOT_FOUND") {
          setWorkflow(null);
          setLoadState("not-found");
        } else if (result.code === "PERMISSION_DENIED" || result.code === "FEATURE_UNAVAILABLE") {
          setWorkflow(null);
          setLoadState("restricted");
        } else {
          setWorkflow(null);
          setErrorMessage(result.message);
          setLoadState("error");
        }
      })
      .catch(() => {
        if (!cancelled) {
          setErrorMessage("The signing workflow could not be loaded.");
          setLoadState("error");
        }
      });

    return () => { cancelled = true; controller.abort(); };
  }, [documentId, loadKey, capability.available, permissions.canViewDocumentWorkflow, ctx]);

  // ── Load preview ────────────────────────────────────────────────────────────
  useEffect(() => {
    if (!capability.available || !permissions.canViewDocumentWorkflow) return;

    const controller = new AbortController();
    let cancelled = false;
    setPreviewLoading(true);

    signingWorkflowService
      .getWorkflowDocumentPreview(
        documentId,
        workflow ? String(workflow.id) : null,
        selection,
        { ...ctx, signal: controller.signal },
      )
      .then(result => {
        if (cancelled) return;
        if (result.ok) {
          setPreview({ ...result.data, documentTitle: txn.title });
          setPreviewPageState(result.data.currentPage);
        } else if (result.code !== "CANCELLED") {
          setPreview({
            availability: "unavailable",
            documentTitle: txn.title,
            pageCount: 1,
            currentPage: 1,
            selection,
            highlightedFields: [],
            missingFieldTypes: [],
            unavailableReason: "The document preview could not be loaded. Your workflow configuration is unchanged.",
          });
        }
      })
      .catch(() => {
        if (!cancelled) setPreview(null);
      })
      .finally(() => { if (!cancelled) setPreviewLoading(false); });

    return () => { cancelled = true; controller.abort(); };
  }, [documentId, workflow, selection, previewKey, capability.available, permissions.canViewDocumentWorkflow, ctx, txn.title]);

  // ── Load candidates ─────────────────────────────────────────────────────────
  useEffect(() => {
    if (!permissions.canAssignWorkflowParticipants) { setCandidates([]); return; }

    const controller = new AbortController();
    let cancelled = false;
    setCandidatesLoading(true);

    signingWorkflowService
      .listParticipantCandidates(
        documentId,
        { ...ctx, signal: controller.signal },
        txn.participants.map(p => ({ id: p.id, name: p.name, emailMasked: p.emailMasked })),
      )
      .then(result => {
        if (!cancelled && result.ok) setCandidates(result.data);
      })
      .catch(() => { if (!cancelled) setCandidates([]); })
      .finally(() => { if (!cancelled) setCandidatesLoading(false); });

    return () => { cancelled = true; controller.abort(); };
  }, [documentId, permissions.canAssignWorkflowParticipants, ctx, txn.participants]);

  // ── Derived ─────────────────────────────────────────────────────────────────

  const validation = useMemo(
    () => (workflow ? validateSigningWorkflow(workflow, documentId) : null),
    [workflow, documentId],
  );

  const stages = useMemo(() => (workflow ? orderedStages(workflow) : []), [workflow]);

  const currentResolution = useMemo(
    () => (workflow ? resolveCurrentStage(workflow, txn.status) : null),
    [workflow, txn.status],
  );

  const nextResolution = useMemo(
    () => (workflow ? resolveNextStage(workflow, currentResolution?.currentStageId ?? null) : null),
    [workflow, currentResolution],
  );

  const summary = useMemo<SigningWorkflowSummary | null>(() => {
    if (!workflow || !validation) return null;
    const allAssignments = workflow.stages.flatMap(s => s.assignments);
    return {
      workflowId: workflow.id,
      documentId: workflow.documentId,
      name: workflow.name,
      configurationStatus: workflow.configurationStatus,
      status: workflow.status,
      stageCount: workflow.stages.length,
      participantAssignmentCount: allAssignments.length,
      requiredSignatureCount: allAssignments.filter(a => a.signatureRequirement.signatureRequired).length,
      progress: {
        totalStages: workflow.stages.length,
        completedStages: workflow.stages.filter(s => s.status === "completed").length,
        totalRequiredActions: allAssignments.filter(a => a.blocking).length,
        completedRequiredActions: allAssignments.filter(a => a.blocking && a.status === "completed").length,
        totalRequiredSignatures: allAssignments.filter(a => a.signatureRequirement.signatureRequired).length,
        completedRequiredSignaturesInDemonstration: allAssignments.filter(
          a => a.signatureRequirement.signatureRequired && a.status === "completed",
        ).length,
        nonblockingAssignments: allAssignments.filter(a => !a.blocking).length,
        percentComplete: 0,
      },
      currentStageId: currentResolution?.currentStageId ?? null,
      currentStageName: currentResolution?.currentStageName ?? null,
      nextStageId: nextResolution?.nextStageId ?? null,
      nextStageName: nextResolution?.nextStageName ?? null,
      blockingIssueCount: validation.blockingIssueCount,
      advisoryIssueCount: validation.advisoryIssueCount,
    };
  }, [workflow, validation, currentResolution, nextResolution]);

  const setSelection = useCallback((s: WorkflowBoardSelection) => setSelectionState(s), []);

  const setPreviewPage = useCallback((page: number) => {
    setPreviewPageState(page);
    setPreview(prev => (prev ? { ...prev, currentPage: Math.max(1, Math.min(page, prev.pageCount)) } : prev));
  }, []);

  return {
    txn,
    documentId,
    documentSummary,
    capabilityAvailable: capability.available,
    capabilityReason: capability.reasonLabel,
    capabilityFallback: capability.safeFallbackRoute,
    permissions,
    workflow,
    validation,
    summary,
    loadState,
    errorMessage,
    stages,
    currentStageId: currentResolution?.currentStageId ?? null,
    currentStageExplanation: currentResolution?.explanation ?? "",
    nextStageExplanation: nextResolution?.explanation ?? "",
    selection,
    setSelection,
    preview: preview ? { ...preview, currentPage: previewPage } : null,
    previewLoading,
    setPreviewPage,
    reloadPreview,
    candidates,
    candidatesLoading,
    ctx,
    reload,
  };
}

// ── Safe return-path helper ───────────────────────────────────────────────────
// Field Placement round-trips carry only an internal path — never a participant
// email, a document title, a signature requirement, or a field value.

const SAFE_RETURN_PREFIX = "/app/documents/";

export function buildSafeReturnPath(pathname: string): string {
  if (typeof pathname !== "string") return "/app/documents";
  if (!pathname.startsWith(SAFE_RETURN_PREFIX)) return "/app/documents";
  if (pathname.includes("//") || pathname.includes("..") || /[<>"']/.test(pathname)) {
    return "/app/documents";
  }
  return pathname.slice(0, 200);
}

export function validateReturnTo(value: string | null): string | null {
  if (!value) return null;
  if (!value.startsWith(SAFE_RETURN_PREFIX)) return null;
  if (value.includes("//") || value.includes("..") || /[<>"']/.test(value)) return null;
  return value.slice(0, 200);
}
