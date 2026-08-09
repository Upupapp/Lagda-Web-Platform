// Workflow — the primary product area.
//
// Five surfaces share one shell so the subtabs, the concept note and the demo
// notice are written once: Overview, Workflows (templates), Active runs,
// Completed, and Builder.
//
// The words are load-bearing. A "workflow" is the reusable design; a "run" is
// one live use of it. Every heading, empty state and button here keeps that
// separation, because the single most likely way to misuse this feature is to
// think editing a workflow changes work already in progress.

import { useCallback, useEffect, useMemo, useState } from "react";
import { Link, useLocation, useNavigate, useParams, useSearchParams } from "react-router";

import { AppContent, PageHeader } from "../../../components/platform";
import { TabStrip } from "../../../components/platform/TabStrip";
import { FilterChips } from "../../../components/platform/FilterChips";
import { useConfirm } from "../../../components/platform/ConfirmDialog";
import { usePlatform } from "../../../context/PlatformContext";
import { usePageMeta } from "../../../hooks/usePageMeta";
import { workflowService } from "../../../services/mock/workflow.service";
import type {
  WorkflowRun, TemplateQuery, RunQuery,
  WorkflowTemplateId, WorkflowRunId, WorkflowTemplateStatus, WorkflowCategory,
} from "../../../models/workflow";
import {
  DEFAULT_TEMPLATE_QUERY, DEFAULT_RUN_QUERY, computeRunProgress,
  TEMPLATE_STATUS_LABELS, WORKFLOW_CATEGORY_LABELS, WORKFLOW_CATEGORIES,
  RUN_STATUS_LABELS, ACTIVITY_KIND_LABELS, STAGE_KIND_LABELS,
} from "../../../models/workflow";
import {
  WorkflowTemplateCard, WorkflowRunCard, WorkflowEmptyState, WorkflowProgressBar,
  WorkflowStageColumn, WorkflowConceptNote, WorkflowDemoNote, RunStatusBadge,
  ParticipantRow,
} from "../../../components/workflow/WorkflowKit";
import { useAsyncData } from "../../../hooks/useAsyncData";
import { AsyncBoundary, RetryPanel, SkeletonCard, SkeletonCardGrid, SkeletonStatRow } from "../../../components/platform/AsyncBoundary";

const GF = { fontFamily: "'Geist', sans-serif" };
const GM = { fontFamily: "'Geist Mono', monospace" };
const NAVY = "#07111F";
const AZURE = "#0078D4";
const SLATE = "#64748B";
const SLATE_DARK = "#334155";
const BORDER = "#E2E8F0";

const WS_FALLBACK = "ws_mls_001";

// ── Shell ─────────────────────────────────────────────────────────────────────

const SUBTABS = [
  { to: "/app/workflow",           label: "Overview",  end: true },
  { to: "/app/workflow/templates", label: "Workflows", end: false },
  { to: "/app/workflow/runs",      label: "Active runs", end: false },
  { to: "/app/workflow/completed", label: "Completed", end: false },
];

function WorkflowShell({ children, actions }: { children: React.ReactNode; actions?: React.ReactNode }) {
  const { pathname } = useLocation();
  const isActive = (to: string, end: boolean) =>
    end ? pathname === to || pathname === `${to}/` : pathname.startsWith(to);

  return (
    <AppContent>
      <PageHeader
        title="Workflow"
        description="Design a process once, then start it as many times as you need."
        primaryAction={actions}
      />
      <TabStrip label="Workflow sections" activeKey={pathname}>
        {SUBTABS.map(t => {
          const active = isActive(t.to, t.end);
          return (
            <Link
              key={t.to}
              to={t.to}
              aria-current={active ? "page" : undefined}
              style={{
                ...GF, padding: "10px 16px", fontSize: 14, fontWeight: active ? 700 : 500,
                color: active ? AZURE : SLATE, textDecoration: "none", whiteSpace: "nowrap",
                borderBottom: `2px solid ${active ? AZURE : "transparent"}`,
              }}
            >
              {t.label}
            </Link>
          );
        })}
      </TabStrip>
      <div style={{ display: "flex", flexDirection: "column", gap: 16, marginTop: 18 }}>
        {children}
      </div>
    </AppContent>
  );
}

function CreateWorkflowLink() {
  return (
    <Link
      to="/app/workflow/builder"
      style={{
        ...GF, minHeight: 44, display: "inline-flex", alignItems: "center", padding: "0 16px",
        borderRadius: 8, background: AZURE, color: "#FFFFFF", fontSize: 14, fontWeight: 700,
        textDecoration: "none",
      }}
    >
      Create workflow
    </Link>
  );
}

// Removed from view but not from the accessibility tree — the skeletons beside
// it are aria-hidden, so this is what announces that something is loading.
const SR_ONLY: React.CSSProperties = {
  position: "absolute", width: 1, height: 1, padding: 0, margin: -1,
  overflow: "hidden", clip: "rect(0 0 0 0)", whiteSpace: "nowrap", border: 0,
};

// ── Overview ──────────────────────────────────────────────────────────────────

export function WorkflowOverviewPage() {
  usePageMeta();
  const { currentWorkspace } = usePlatform();
  const wsId = currentWorkspace?.id ?? WS_FALLBACK;
  const { status, data: summary, retry } = useAsyncData(
    () => workflowService.getOverview(wsId),
    [wsId],
    "workflow overview",
  );

  return (
    <WorkflowShell actions={<CreateWorkflowLink />}>
      <WorkflowDemoNote />
      <WorkflowConceptNote />

      <AsyncBoundary
        status={status}
        what="the workflow overview"
        onRetry={retry}
        skeleton={<SkeletonStatRow />}
      >
        {summary && (
        <>
          <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(160px, 1fr))", gap: 12 }}>
            <Stat label="Workflows" value={summary.templateCount} to="/app/workflow/templates" />
            <Stat label="Active runs" value={summary.activeRunCount} to="/app/workflow/runs" />
            <Stat label="Pending actions" value={summary.pendingActionCount} to="/app/workflow/runs" />
            <Stat label="Blocked" value={summary.blockedRunCount} to="/app/workflow/runs" tone={summary.blockedRunCount > 0 ? "alert" : undefined} />
            <Stat label="Overdue" value={summary.overdueRunCount} to="/app/workflow/runs" tone={summary.overdueRunCount > 0 ? "alert" : undefined} />
            <Stat label="Completed" value={summary.completedRunCount} to="/app/workflow/completed" />
          </div>

          <section aria-labelledby="wf-recent">
            <h2 id="wf-recent" style={{ ...GF, fontSize: 15, fontWeight: 700, color: NAVY, margin: "8px 0 10px" }}>
              Recent workflow activity
            </h2>
            {summary.recentActivity.length === 0 ? (
              <p style={{ ...GF, fontSize: 13, color: SLATE }}>No workflow activity yet.</p>
            ) : (
              <ul style={{ listStyle: "none", margin: 0, padding: 0, background: "#FFFFFF", border: `1px solid ${BORDER}`, borderRadius: 12 }}>
                {summary.recentActivity.map(entry => (
                  <li key={entry.id} style={{ padding: "12px 14px", borderBottom: `1px solid #F1F5F9` }}>
                    <p style={{ ...GF, margin: 0, fontSize: 13, color: NAVY }}>{entry.summary}</p>
                    <p style={{ ...GF, margin: "3px 0 0", fontSize: 11.5, color: SLATE }}>
                      <Link to={`/app/workflow/runs/${entry.runId}`} style={{ color: AZURE }}>{entry.runName}</Link>
                      {" · "}{ACTIVITY_KIND_LABELS[entry.kind]}
                      {" · "}{entry.atDemonstration.slice(0, 10)}
                    </p>
                  </li>
                ))}
              </ul>
            )}
          </section>
        </>
        )}
      </AsyncBoundary>
    </WorkflowShell>
  );
}

function Stat({ label, value, to, tone }: { label: string; value: number; to: string; tone?: "alert" }) {
  return (
    <Link to={to} style={{
      ...GF, textDecoration: "none", background: "#FFFFFF", borderRadius: 12, padding: "14px 16px",
      border: `1px solid ${tone === "alert" ? "#FECACA" : BORDER}`, display: "block", minHeight: 44,
    }}>
      <span style={{ ...GM, display: "block", fontSize: 24, fontWeight: 700, color: tone === "alert" ? "#991B1B" : NAVY }}>
        {value}
      </span>
      <span style={{ display: "block", fontSize: 12, color: SLATE, marginTop: 2 }}>{label}</span>
    </Link>
  );
}

// ── Templates list ────────────────────────────────────────────────────────────

export function WorkflowTemplatesPage() {
  usePageMeta();
  const { currentWorkspace } = usePlatform();
  const wsId = currentWorkspace?.id ?? WS_FALLBACK;
  const [params, setParams] = useSearchParams();

  const query: TemplateQuery = useMemo(() => ({
    ...DEFAULT_TEMPLATE_QUERY,
    search: params.get("q") ?? "",
    status: (params.get("status") as WorkflowTemplateStatus | "all") ?? "all",
    category: (params.get("category") as WorkflowCategory | "all") ?? "all",
  }), [params]);

  const { status, data: templates, retry } = useAsyncData(
    () => workflowService.listTemplates(wsId, query),
    [wsId, query],
    "workflows",
  );

  const setParam = useCallback((key: string, value: string) => {
    const next = new URLSearchParams(params);
    if (!value || value === "all") next.delete(key); else next.set(key, value);
    setParams(next, { replace: true });
  }, [params, setParams]);

  const chips = [
    ...(query.search ? [{ key: "q", label: `Search: "${query.search}"` }] : []),
    ...(query.status !== "all" ? [{ key: "status", label: `Status: ${TEMPLATE_STATUS_LABELS[query.status]}` }] : []),
    ...(query.category !== "all" ? [{ key: "category", label: `Category: ${WORKFLOW_CATEGORY_LABELS[query.category]}` }] : []),
  ];

  return (
    <WorkflowShell actions={<CreateWorkflowLink />}>
      <WorkflowConceptNote />

      <div style={{ display: "flex", gap: 10, flexWrap: "wrap", alignItems: "center" }}>
        <label style={{ ...GF, fontSize: 12, color: SLATE_DARK }}>
          <span style={{ display: "block", marginBottom: 4 }}>Search workflows</span>
          <input
            value={query.search}
            onChange={e => setParam("q", e.target.value)}
            placeholder="Search by name or description"
            style={{ ...GF, minHeight: 44, minWidth: 220, padding: "0 12px", borderRadius: 8, border: `1px solid ${BORDER}`, fontSize: 14 }}
          />
        </label>
        <Select label="Status" value={query.status} onChange={v => setParam("status", v)}
          options={[["all", "All statuses"], ["active", "Active"], ["draft", "Draft"], ["archived", "Archived"]]} />
        <Select label="Category" value={query.category} onChange={v => setParam("category", v)}
          options={[["all", "All categories"], ...WORKFLOW_CATEGORIES.map(c => [c, WORKFLOW_CATEGORY_LABELS[c]] as [string, string])]} />
      </div>

      <FilterChips
        chips={chips}
        onRemove={key => setParam(key === "q" ? "q" : key, "")}
        onClearAll={() => setParams(new URLSearchParams(), { replace: true })}
        label="Active workflow filters"
      />

      <AsyncBoundary status={status} what="your workflows" onRetry={retry} skeleton={<SkeletonCardGrid count={6} />}>
      {!templates ? null
        : templates.length === 0 ? (
          <WorkflowEmptyState
            title={chips.length > 0 ? "No workflows match these filters." : "No workflows yet."}
            body={chips.length > 0
              ? "Try removing a filter to see more."
              : "Create a reusable workflow to guide document review, signing, verification and completion across your team."}
            primary={chips.length === 0 ? { label: "Create workflow", to: "/app/workflow/builder" } : undefined}
          />
        ) : (
          <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fill, minmax(300px, 1fr))", gap: 14 }}>
            {templates.map(t => <WorkflowTemplateCard key={t.id} template={t} />)}
          </div>
        )}
      </AsyncBoundary>
    </WorkflowShell>
  );
}

function Select({ label, value, onChange, options }: {
  label: string; value: string; onChange: (v: string) => void; options: [string, string][];
}) {
  return (
    <label style={{ ...GF, fontSize: 12, color: SLATE_DARK }}>
      <span style={{ display: "block", marginBottom: 4 }}>{label}</span>
      <select
        value={value}
        onChange={e => onChange(e.target.value)}
        style={{ ...GF, minHeight: 44, padding: "0 10px", borderRadius: 8, border: `1px solid ${BORDER}`, fontSize: 14, background: "#FFFFFF" }}
      >
        {options.map(([v, l]) => <option key={v} value={v}>{l}</option>)}
      </select>
    </label>
  );
}

// ── Runs list ─────────────────────────────────────────────────────────────────

function RunsList({ scope }: { scope: "active" | "completed" }) {
  usePageMeta();
  const { currentWorkspace } = usePlatform();
  const wsId = currentWorkspace?.id ?? WS_FALLBACK;
  const [params, setParams] = useSearchParams();

  const query: RunQuery = useMemo(() => ({
    ...DEFAULT_RUN_QUERY,
    search: params.get("q") ?? "",
    status: (params.get("status") as RunQuery["status"]) ?? "all",
  }), [params]);

  const { status, data: runs, retry } = useAsyncData(
    () => workflowService.listRuns(wsId, scope, query),
    [wsId, scope, query],
    scope === "active" ? "active workflow runs" : "completed workflow runs",
  );

  const setParam = (key: string, value: string) => {
    const next = new URLSearchParams(params);
    if (!value || value === "all") next.delete(key); else next.set(key, value);
    setParams(next, { replace: true });
  };

  const chips = [
    ...(query.search ? [{ key: "q", label: `Search: "${query.search}"` }] : []),
    ...(query.status !== "all" ? [{ key: "status", label: `Status: ${RUN_STATUS_LABELS[query.status]}` }] : []),
  ];

  const empty = scope === "active"
    ? {
        title: "No active workflow runs.",
        body: "Start a workflow from one of your workflows to begin routing documents through stages.",
        primary: { label: "Browse workflows", to: "/app/workflow/templates" },
      }
    : {
        title: "No completed workflow runs yet.",
        body: "Completed runs appear here with their documents, participants and audit trail.",
        primary: undefined,
      };

  return (
    <WorkflowShell actions={<CreateWorkflowLink />}>
      <div style={{ display: "flex", gap: 10, flexWrap: "wrap", alignItems: "center" }}>
        <label style={{ ...GF, fontSize: 12, color: SLATE_DARK }}>
          <span style={{ display: "block", marginBottom: 4 }}>Search runs</span>
          <input
            value={query.search}
            onChange={e => setParam("q", e.target.value)}
            placeholder="Search by run or workflow name"
            style={{ ...GF, minHeight: 44, minWidth: 220, padding: "0 12px", borderRadius: 8, border: `1px solid ${BORDER}`, fontSize: 14 }}
          />
        </label>
        {scope === "active" && (
          <Select label="Status" value={query.status} onChange={v => setParam("status", v)}
            options={[["all", "All statuses"], ["not-started", "Not started"], ["in-progress", "In progress"], ["blocked", "Blocked"], ["overdue", "Overdue"]]} />
        )}
      </div>

      <FilterChips
        chips={chips}
        onRemove={key => setParam(key, "")}
        onClearAll={() => setParams(new URLSearchParams(), { replace: true })}
        label="Active run filters"
      />

      <AsyncBoundary
        status={status}
        what={scope === "active" ? "your active runs" : "your completed runs"}
        onRetry={retry}
        skeleton={<SkeletonCardGrid count={4} minWidth={320} />}
      >
      {!runs ? null
        : runs.length === 0 ? (
          <WorkflowEmptyState
            title={chips.length > 0 ? "No runs match these filters." : empty.title}
            body={chips.length > 0 ? "Try removing a filter to see more." : empty.body}
            primary={chips.length === 0 ? empty.primary : undefined}
          />
        ) : (
          <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fill, minmax(320px, 1fr))", gap: 14 }}>
            {runs.map(r => <WorkflowRunCard key={r.id} run={r} />)}
          </div>
        )}
      </AsyncBoundary>
    </WorkflowShell>
  );
}

export function WorkflowRunsPage() { return <RunsList scope="active" />; }
export function WorkflowCompletedPage() { return <RunsList scope="completed" />; }

// ── Run detail ────────────────────────────────────────────────────────────────

export function WorkflowRunDetailPage() {
  usePageMeta();
  const { workflowRunId } = useParams<{ workflowRunId: string }>();
  const navigate = useNavigate();
  const { user, hasPermission } = usePlatform();
  const { confirm, confirmDialog } = useConfirm();
  const [tab, setTab] = useState<"board" | "documents" | "participants" | "activity">("board");

  const { status, data: loaded, retry } = useAsyncData(
    () => workflowService.getRun(workflowRunId as WorkflowRunId),
    [workflowRunId],
    "workflow run",
  );
  // Local copy so the cancel and reminder actions can update the view without
  // re-reading. Reset whenever a fresh load lands.
  const [run, setRun] = useState<WorkflowRun | null>(null);
  useEffect(() => { setRun(loaded); }, [loaded]);
  const notFound = status === "ready" && loaded === null;

  const canManage = hasPermission("manage_workflow");

  if (status === "full-error") {
    return (
      <AppContent>
        <PageHeader title="Workflow run" />
        <RetryPanel what="this workflow run" onRetry={retry} />
      </AppContent>
    );
  }

  if (notFound) {
    return (
      <AppContent>
        <PageHeader title="Workflow run not found" />
        <WorkflowEmptyState
          title="That workflow run is not available."
          body="It may have been cancelled, or the link may be incorrect."
          primary={{ label: "Back to active runs", to: "/app/workflow/runs" }}
        />
      </AppContent>
    );
  }

  if (!run) {
    return (
      <AppContent>
        <PageHeader title="Workflow run" />
        <p role="status" style={SR_ONLY}>Loading the workflow run…</p>
        <SkeletonCard lines={5} />
      </AppContent>
    );
  }

  const progress = computeRunProgress(run);

  return (
    <AppContent>
      {confirmDialog}
      <PageHeader
        title={run.name}
        description={`From ${run.templateName} · Started by ${run.startedBy}`}
        breadcrumbs={[
          { label: "Workflow", to: "/app/workflow" },
          { label: "Active runs", to: "/app/workflow/runs" },
          { label: run.name },
        ]}
      />

      <div style={{ display: "flex", flexDirection: "column", gap: 14 }}>
        <div style={{ display: "flex", gap: 10, alignItems: "center", flexWrap: "wrap" }}>
          <RunStatusBadge status={run.status} />
          {run.dueDateDirection && (
            <span style={{ ...GF, fontSize: 12, color: SLATE }}>{run.dueDateDirection}</span>
          )}
          <div style={{ marginLeft: "auto", display: "flex", gap: 8, flexWrap: "wrap" }}>
            {canManage && progress.currentStage && run.status !== "cancelled" && run.status !== "completed" && (
              <button
                type="button"
                onClick={() => {
                  const stage = progress.currentStage;
                  if (!stage) return;
                  void workflowService.sendReminder(run.id, stage, user?.displayName ?? "You").then(r => r && setRun(r));
                }}
                style={secondaryBtn}
              >
                Send reminder
              </button>
            )}
            {canManage && run.status !== "cancelled" && run.status !== "completed" && (
              <button
                type="button"
                onClick={() => confirm({
                  title: "Cancel this workflow run?",
                  body: `Every stage that has not finished will be marked cancelled. The workflow "${run.templateName}" is not affected and can still be started again. In this frontend demonstration nothing is sent to participants.`,
                  confirmLabel: "Cancel run",
                  destructive: true,
                  onConfirm: async () => {
                    const updated = await workflowService.cancelRun(run.id, user?.displayName ?? "You");
                    if (updated) setRun(updated);
                  },
                })}
                style={{ ...secondaryBtn, borderColor: "#FECACA", color: "#991B1B" }}
              >
                Cancel run
              </button>
            )}
          </div>
        </div>

        <div style={{ background: "#FFFFFF", border: `1px solid ${BORDER}`, borderRadius: 12, padding: 16 }}>
          <WorkflowProgressBar run={run} />
        </div>

        <TabStrip as="tablist" label="Workflow run sections" activeKey={tab}>
          {(["board", "documents", "participants", "activity"] as const).map(t => (
            <button
              key={t}
              role="tab"
              aria-selected={tab === t}
              onClick={() => setTab(t)}
              style={{
                ...GF, padding: "10px 16px", fontSize: 14, fontWeight: tab === t ? 700 : 500,
                color: tab === t ? AZURE : SLATE, background: "none", border: "none",
                borderBottom: `2px solid ${tab === t ? AZURE : "transparent"}`, cursor: "pointer",
                textTransform: "capitalize",
              }}
            >
              {t === "activity" ? "Activity & audit trail" : t}
            </button>
          ))}
        </TabStrip>

        {tab === "board" && (
          <div>
            <p style={{ ...GF, fontSize: 12.5, color: SLATE, margin: "0 0 10px" }}>
              {/* The order is stated in text, never left to horizontal position alone. */}
              {run.stages.length} stages, in order. {progress.summaryLine}
            </p>
            <div className="wf-board" style={{ display: "flex", gap: 12, overflowX: "auto", paddingBottom: 8 }}>
              {run.stages.map(stage => (
                <WorkflowStageColumn
                  key={stage.id}
                  stage={stage}
                  isCurrent={progress.currentStage?.id === stage.id}
                />
              ))}
            </div>
          </div>
        )}

        {tab === "documents" && (
          <ul style={{ listStyle: "none", margin: 0, padding: 0, display: "flex", flexDirection: "column", gap: 8 }}>
            {run.documents.length === 0 && (
              <li style={{ ...GF, fontSize: 13, color: SLATE }}>No documents attached to this run.</li>
            )}
            {run.documents.map(d => (
              <li key={d.id} style={{ background: "#FFFFFF", border: `1px solid ${BORDER}`, borderRadius: 10, padding: "12px 14px" }}>
                <p style={{ ...GF, margin: 0, fontSize: 13.5, fontWeight: 600, color: NAVY }}>{d.name}</p>
                <p style={{ ...GF, margin: "2px 0 0", fontSize: 12, color: SLATE }}>
                  {d.pageCount} {d.pageCount === 1 ? "page" : "pages"} · Sample document
                </p>
              </li>
            ))}
          </ul>
        )}

        {tab === "participants" && (
          <div style={{ display: "flex", flexDirection: "column", gap: 14 }}>
            {run.stages.filter(s => s.participants.length > 0).map(stage => (
              <section key={stage.id} style={{ background: "#FFFFFF", border: `1px solid ${BORDER}`, borderRadius: 12, padding: "12px 16px" }}>
                <h3 style={{ ...GF, margin: "0 0 2px", fontSize: 13.5, fontWeight: 700, color: NAVY }}>
                  {stage.position}. {stage.name}
                </h3>
                <p style={{ ...GM, margin: "0 0 8px", fontSize: 10.5, color: SLATE }}>
                  {STAGE_KIND_LABELS[stage.kind].toUpperCase()}
                </p>
                <ul style={{ listStyle: "none", margin: 0, padding: 0 }}>
                  {stage.participants.map(p => <ParticipantRow key={p.slotId} participant={p} />)}
                </ul>
              </section>
            ))}
          </div>
        )}

        {tab === "activity" && (
          <ol style={{ listStyle: "none", margin: 0, padding: 0, background: "#FFFFFF", border: `1px solid ${BORDER}`, borderRadius: 12 }}>
            {[...run.activity].reverse().map(entry => (
              <li key={entry.id} style={{ padding: "12px 16px", borderBottom: "1px solid #F1F5F9" }}>
                <p style={{ ...GF, margin: 0, fontSize: 13, color: NAVY }}>{entry.summary}</p>
                <p style={{ ...GM, margin: "3px 0 0", fontSize: 11, color: SLATE }}>
                  {ACTIVITY_KIND_LABELS[entry.kind]} · {entry.atDemonstration.replace("T", " ").slice(0, 16)}
                  {entry.actorName ? ` · ${entry.actorName}` : ""}
                </p>
              </li>
            ))}
          </ol>
        )}

        <button type="button" onClick={() => navigate("/app/workflow/runs")} style={{ ...secondaryBtn, alignSelf: "flex-start" }}>
          Back to active runs
        </button>
      </div>
    </AppContent>
  );
}

const secondaryBtn: React.CSSProperties = {
  ...GF, minHeight: 44, padding: "0 14px", borderRadius: 8,
  border: `1px solid ${BORDER}`, background: "#FFFFFF", color: SLATE_DARK,
  fontSize: 13, fontWeight: 600, cursor: "pointer",
};

// ── Template detail ───────────────────────────────────────────────────────────

export function WorkflowTemplateDetailPage() {
  usePageMeta();
  const { workflowTemplateId } = useParams<{ workflowTemplateId: string }>();
  const { status, data: template, retry } = useAsyncData(
    () => workflowService.getTemplate(workflowTemplateId as WorkflowTemplateId),
    [workflowTemplateId],
    "workflow",
  );
  const notFound = status === "ready" && template === null;

  if (status === "full-error") {
    return (
      <AppContent>
        <PageHeader title="Workflow" />
        <RetryPanel what="this workflow" onRetry={retry} />
      </AppContent>
    );
  }

  if (notFound) {
    return (
      <AppContent>
        <PageHeader title="Workflow not found" />
        <WorkflowEmptyState
          title="That workflow is not available."
          body="It may have been archived, or the link may be incorrect."
          primary={{ label: "Back to workflows", to: "/app/workflow/templates" }}
        />
      </AppContent>
    );
  }
  if (!template) {
    return (
      <AppContent>
        <PageHeader title="Workflow" />
        <p role="status" style={SR_ONLY}>Loading the workflow…</p>
        <SkeletonCard lines={5} />
      </AppContent>
    );
  }

  return (
    <AppContent>
      <PageHeader
        title={template.name}
        description={template.description ?? undefined}
        breadcrumbs={[
          { label: "Workflow", to: "/app/workflow" },
          { label: "Workflows", to: "/app/workflow/templates" },
          { label: template.name },
        ]}
      />
      <div style={{ display: "flex", flexDirection: "column", gap: 16 }}>
        <WorkflowConceptNote />

        <div style={{ display: "flex", gap: 8, flexWrap: "wrap" }}>
          <Link
            to={`/app/workflow/start?template=${template.id}`}
            style={{
              ...GF, minHeight: 44, display: "inline-flex", alignItems: "center", padding: "0 16px",
              borderRadius: 8, background: AZURE, color: "#FFFFFF", fontSize: 14, fontWeight: 700, textDecoration: "none",
            }}
          >
            Start workflow
          </Link>
          <Link to={`/app/workflow/builder?template=${template.id}`} style={{ ...secondaryBtn, display: "inline-flex", alignItems: "center", textDecoration: "none" }}>
            Edit workflow
          </Link>
        </div>

        <dl style={{ ...GF, display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(150px, 1fr))", gap: 12, margin: 0 }}>
          <Fact label="Status" value={TEMPLATE_STATUS_LABELS[template.status]} />
          <Fact label="Category" value={WORKFLOW_CATEGORY_LABELS[template.category]} />
          <Fact label="Stages" value={String(template.stages.length)} />
          <Fact label="Times started" value={String(template.initiationCount)} />
          <Fact label="Created by" value={template.createdBy} />
          <Fact label="Estimated" value={template.estimatedCompletion ?? "Not set"} />
        </dl>

        <section aria-labelledby="wf-stages">
          <h2 id="wf-stages" style={{ ...GF, fontSize: 15, fontWeight: 700, color: NAVY, margin: "0 0 4px" }}>
            Stages
          </h2>
          <p style={{ ...GF, fontSize: 12.5, color: SLATE, margin: "0 0 10px" }}>
            {template.stages.length} stages, in order. Each run follows this sequence with its own participants.
          </p>
          <ol className="wf-board" style={{ listStyle: "none", margin: 0, padding: 0, display: "flex", gap: 12, overflowX: "auto", paddingBottom: 8 }}>
            {template.stages.map(stage => (
              <li key={stage.id} style={{
                width: 250, flexShrink: 0, background: "#FFFFFF", border: `1px solid ${BORDER}`,
                borderRadius: 12, padding: 14,
              }}>
                <p style={{ ...GM, margin: "0 0 4px", fontSize: 10, color: SLATE, fontWeight: 700 }}>
                  {stage.position} · {STAGE_KIND_LABELS[stage.kind].toUpperCase()}
                </p>
                <h3 style={{ ...GF, margin: "0 0 6px", fontSize: 14, fontWeight: 700, color: NAVY }}>{stage.name}</h3>
                {stage.description && (
                  <p style={{ ...GF, margin: "0 0 8px", fontSize: 12, color: SLATE, lineHeight: 1.55 }}>{stage.description}</p>
                )}
                {stage.slots.length === 0 ? (
                  <p style={{ ...GF, margin: 0, fontSize: 12, color: "#94A3B8" }}>No one assigned.</p>
                ) : (
                  <ul style={{ listStyle: "none", margin: 0, padding: 0 }}>
                    {stage.slots.map(s => (
                      <li key={s.id} style={{ ...GF, fontSize: 12, color: SLATE_DARK, padding: "2px 0" }}>
                        {s.label}{!s.required && " (optional)"}
                      </li>
                    ))}
                  </ul>
                )}
              </li>
            ))}
          </ol>
        </section>
      </div>
    </AppContent>
  );
}

function Fact({ label, value }: { label: string; value: string }) {
  return (
    <div style={{ background: "#FFFFFF", border: `1px solid ${BORDER}`, borderRadius: 10, padding: "10px 12px" }}>
      <dt style={{ ...GF, fontSize: 11, color: SLATE, margin: 0 }}>{label}</dt>
      <dd style={{ ...GF, fontSize: 13.5, color: NAVY, fontWeight: 600, margin: "2px 0 0" }}>{value}</dd>
    </div>
  );
}
