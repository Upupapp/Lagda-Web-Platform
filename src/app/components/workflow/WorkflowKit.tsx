// Shared presentation for the Workflow product area.
//
// Everything that shows a run's progress reads `computeRunProgress` rather than
// counting stages itself, so the bar, the card and the overview cannot disagree
// about how far along a run is.
//
// Status is never colour alone: every badge carries a text label and an icon,
// because "blocked" and "overdue" are the two states someone most needs to
// notice and are exactly the two a red/amber-blind user would confuse.

import type { ReactNode } from "react";
import { Link } from "react-router";
import {
  CheckCircle2, Circle, Clock, AlertTriangle, PauseCircle, XCircle,
  FileText, PenLine, ShieldCheck, Bell, Archive, ClipboardCheck,
} from "lucide-react";

import type {
  WorkflowRun,
  WorkflowRunStage,
  WorkflowStageStatus,
  WorkflowRunStatus,
  WorkflowTemplate,
  WorkflowStageKind,
  WorkflowRunParticipant,
} from "../../models/workflow";
import {
  computeRunProgress,
  STAGE_STATUS_LABELS,
  RUN_STATUS_LABELS,
  STAGE_KIND_LABELS,
  TEMPLATE_STATUS_LABELS,
  WORKFLOW_CATEGORY_LABELS,
  PARTICIPANT_STATUS_LABELS,
} from "../../models/workflow";
import { STAGE_ACTION_LABELS } from "../../models/signing-workflow";

const GF = { fontFamily: "'Geist', sans-serif" };
const GM = { fontFamily: "'Geist Mono', monospace" };

const NAVY = "#07111F";
const AZURE = "#0078D4";
const SLATE = "#64748B";
const SLATE_DARK = "#334155";
const BORDER = "#E2E8F0";
const SURFACE = "#F8FAFC";

// ── Status presentation ───────────────────────────────────────────────────────

interface Tone { fg: string; bg: string; border: string; Icon: typeof Circle }

const STAGE_TONE: Record<WorkflowStageStatus, Tone> = {
  "not-started":     { fg: "#475569", bg: "#F1F5F9", border: "#E2E8F0", Icon: Circle },
  "waiting":         { fg: "#475569", bg: "#F1F5F9", border: "#E2E8F0", Icon: Clock },
  "in-progress":     { fg: "#0369A1", bg: "#E0F2FE", border: "#BAE6FD", Icon: Clock },
  "needs-review":    { fg: "#92400E", bg: "#FEF3C7", border: "#FDE68A", Icon: ClipboardCheck },
  "needs-signature": { fg: "#92400E", bg: "#FEF3C7", border: "#FDE68A", Icon: PenLine },
  "completed":       { fg: "#166534", bg: "#DCFCE7", border: "#BBF7D0", Icon: CheckCircle2 },
  "blocked":         { fg: "#991B1B", bg: "#FEE2E2", border: "#FECACA", Icon: AlertTriangle },
  "overdue":         { fg: "#9A3412", bg: "#FFEDD5", border: "#FED7AA", Icon: AlertTriangle },
  "skipped":         { fg: "#475569", bg: "#F1F5F9", border: "#E2E8F0", Icon: PauseCircle },
  "cancelled":       { fg: "#475569", bg: "#F1F5F9", border: "#E2E8F0", Icon: XCircle },
};

const RUN_TONE: Record<WorkflowRunStatus, Tone> = {
  "not-started": STAGE_TONE["not-started"],
  "in-progress": STAGE_TONE["in-progress"],
  "blocked":     STAGE_TONE.blocked,
  "overdue":     STAGE_TONE.overdue,
  "completed":   STAGE_TONE.completed,
  "cancelled":   STAGE_TONE.cancelled,
};

const KIND_ICON: Record<WorkflowStageKind, typeof Circle> = {
  prepare: FileText, review: ClipboardCheck, approval: CheckCircle2,
  signature: PenLine, verification: ShieldCheck, notification: Bell, archive: Archive,
};

export function StageStatusBadge({ status }: { status: WorkflowStageStatus }) {
  const t = STAGE_TONE[status];
  return (
    <span style={{
      ...GF, display: "inline-flex", alignItems: "center", gap: 5, fontSize: 11, fontWeight: 700,
      padding: "3px 9px", borderRadius: 999, color: t.fg, background: t.bg, border: `1px solid ${t.border}`,
    }}>
      <t.Icon size={11} aria-hidden />
      {STAGE_STATUS_LABELS[status]}
    </span>
  );
}

export function RunStatusBadge({ status }: { status: WorkflowRunStatus }) {
  const t = RUN_TONE[status];
  return (
    <span style={{
      ...GF, display: "inline-flex", alignItems: "center", gap: 5, fontSize: 11, fontWeight: 700,
      padding: "3px 9px", borderRadius: 999, color: t.fg, background: t.bg, border: `1px solid ${t.border}`,
    }}>
      <t.Icon size={11} aria-hidden />
      {RUN_STATUS_LABELS[status]}
    </span>
  );
}

// ── Progress bar ──────────────────────────────────────────────────────────────

/**
 * The run progress bar.
 *
 * `role="img"` with a full sentence label rather than a progressbar role: the
 * useful information is "3 of 6 stages complete, currently in Legal Review",
 * and a percentage read on its own answers none of the questions someone opens
 * this page with. The same sentence is also rendered visibly, so nothing is
 * available only to assistive technology or only to sighted users.
 */
export function WorkflowProgressBar({ run, compact }: { run: WorkflowRun; compact?: boolean }) {
  const progress = computeRunProgress(run);
  const stages = run.stages;

  return (
    <div style={{ ...GF }}>
      {!compact && (
        <p style={{ margin: "0 0 8px", fontSize: 13, color: SLATE_DARK, fontWeight: 600 }}>
          {progress.summaryLine}
        </p>
      )}
      <div
        role="img"
        aria-label={`Workflow progress: ${progress.summaryLine}`}
        style={{ display: "flex", gap: 3, alignItems: "center" }}
      >
        {stages.map(stage => {
          const t = STAGE_TONE[stage.status];
          const isCurrent = progress.currentStage?.id === stage.id;
          return (
            <span
              key={stage.id}
              title={`${stage.name} — ${STAGE_STATUS_LABELS[stage.status]}`}
              style={{
                flex: 1, height: isCurrent ? 8 : 6, borderRadius: 999,
                background: t.bg, border: `1px solid ${t.border}`,
                // The current stage is taller AND outlined — size alone would be
                // invisible to anyone who cannot compare 6px against 8px.
                outline: isCurrent ? `2px solid ${AZURE}` : "none",
                outlineOffset: 1,
              }}
            />
          );
        })}
      </div>
      {compact && (
        <p style={{ margin: "6px 0 0", fontSize: 12, color: SLATE }}>{progress.summaryLine}</p>
      )}
    </div>
  );
}

// ── Participants ──────────────────────────────────────────────────────────────

function initials(name: string): string {
  const parts = name.trim().split(/\s+/);
  const a = parts[0]?.[0] ?? "";
  const b = parts.length > 1 ? parts[parts.length - 1]?.[0] ?? "" : "";
  return (a + b).toUpperCase() || "?";
}

export function ParticipantRow({ participant }: { participant: WorkflowRunParticipant }) {
  const done = participant.status === "completed";
  const declined = participant.status === "declined";
  return (
    <li style={{ display: "flex", alignItems: "center", gap: 8, padding: "6px 0" }}>
      <span aria-hidden style={{
        width: 26, height: 26, borderRadius: "50%", flexShrink: 0,
        background: done ? "#DCFCE7" : declined ? "#FEE2E2" : "#EFF6FF",
        color: done ? "#166534" : declined ? "#991B1B" : "#1D4ED8",
        display: "inline-flex", alignItems: "center", justifyContent: "center",
        ...GM, fontSize: 10, fontWeight: 700,
      }}>
        {initials(participant.displayName)}
      </span>
      <span style={{ flex: 1, minWidth: 0 }}>
        <span style={{ ...GF, display: "block", fontSize: 12, fontWeight: 600, color: NAVY, overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>
          {participant.displayName}
          {participant.isExternal && (
            <span style={{ ...GF, marginLeft: 6, fontSize: 10, fontWeight: 600, color: SLATE }}>External</span>
          )}
        </span>
        <span style={{ ...GF, display: "block", fontSize: 11, color: SLATE }}>
          {participant.slotLabel} · {STAGE_ACTION_LABELS[participant.action]}
          {!participant.required && " · Optional"}
        </span>
      </span>
      <span style={{ ...GF, fontSize: 11, color: done ? "#166534" : declined ? "#991B1B" : SLATE, flexShrink: 0 }}>
        {PARTICIPANT_STATUS_LABELS[participant.status]}
      </span>
    </li>
  );
}

// ── Stage column (Kanban) ─────────────────────────────────────────────────────

export function WorkflowStageColumn({
  stage, isCurrent, action,
}: {
  stage: WorkflowRunStage;
  isCurrent: boolean;
  action?: ReactNode;
}) {
  const KindIcon = KIND_ICON[stage.kind];
  const blocking = stage.participants.filter(p => p.required);
  const doneCount = blocking.filter(p => p.status === "completed").length;

  return (
    <section
      aria-label={`Stage ${stage.position}: ${stage.name}. ${STAGE_STATUS_LABELS[stage.status]}.`}
      aria-current={isCurrent ? "step" : undefined}
      style={{
        // Fixed 268px meant that on a 320px phone exactly one column fitted the
        // screen with nothing visible beside it, so a scrollable board read as a
        // single card and the remaining stages were invisible. Capping at 82vw
        // leaves the next column peeking, which is the affordance that tells
        // someone the board scrolls without adding any chrome to say so.
        width: "min(268px, 82vw)", flexShrink: 0, background: "#FFFFFF",
        border: `1px solid ${isCurrent ? AZURE : BORDER}`,
        boxShadow: isCurrent ? "0 0 0 3px rgba(0,120,212,0.12)" : "none",
        borderRadius: 12, display: "flex", flexDirection: "column",
      }}
    >
      <header style={{ padding: "12px 14px", borderBottom: `1px solid ${BORDER}` }}>
        <div style={{ display: "flex", alignItems: "center", gap: 6, marginBottom: 6 }}>
          <KindIcon size={13} color={SLATE} aria-hidden />
          <span style={{ ...GM, fontSize: 10, color: SLATE, fontWeight: 700 }}>
            {stage.position} · {STAGE_KIND_LABELS[stage.kind].toUpperCase()}
          </span>
          {isCurrent && (
            <span style={{ ...GF, marginLeft: "auto", fontSize: 10, fontWeight: 700, color: AZURE }}>
              CURRENT
            </span>
          )}
        </div>
        <h3 style={{ ...GF, margin: "0 0 6px", fontSize: 14, fontWeight: 700, color: NAVY }}>
          {stage.name}
        </h3>
        <StageStatusBadge status={stage.status} />
      </header>

      <div style={{ padding: "12px 14px", display: "flex", flexDirection: "column", gap: 10, flex: 1 }}>
        {stage.description && (
          <p style={{ ...GF, margin: 0, fontSize: 12, color: SLATE, lineHeight: 1.55 }}>
            {stage.description}
          </p>
        )}

        {stage.blockedReason && (
          <p role="note" style={{
            ...GF, margin: 0, fontSize: 12, lineHeight: 1.55, color: "#991B1B",
            background: "#FEF2F2", border: "1px solid #FECACA", borderRadius: 8, padding: "8px 10px",
          }}>
            {stage.blockedReason}
          </p>
        )}

        {stage.instruction && (
          <p style={{ ...GF, margin: 0, fontSize: 12, color: SLATE_DARK, lineHeight: 1.55, fontStyle: "italic" }}>
            {stage.instruction}
          </p>
        )}

        {stage.participants.length > 0 ? (
          <div>
            <p style={{ ...GM, margin: "0 0 2px", fontSize: 10, color: SLATE, fontWeight: 700 }}>
              {blocking.length > 0
                ? `${doneCount} of ${blocking.length} required complete`
                : `${stage.participants.length} informed`}
            </p>
            <ul style={{ listStyle: "none", margin: 0, padding: 0 }}>
              {stage.participants.map(p => <ParticipantRow key={p.slotId} participant={p} />)}
            </ul>
          </div>
        ) : (
          <p style={{ ...GF, margin: 0, fontSize: 12, color: "#94A3B8" }}>
            Nobody is assigned. This stage does not wait for anyone.
          </p>
        )}

        <div style={{ marginTop: "auto", display: "flex", flexDirection: "column", gap: 6 }}>
          {stage.dueDateDirection && (
            <p style={{ ...GF, margin: 0, fontSize: 11, color: SLATE }}>{stage.dueDateDirection}</p>
          )}
          {stage.activityCount > 0 && (
            <p style={{ ...GF, margin: 0, fontSize: 11, color: "#94A3B8" }}>
              {stage.activityCount} activity {stage.activityCount === 1 ? "entry" : "entries"}
            </p>
          )}
          {action}
        </div>
      </div>
    </section>
  );
}

// ── Cards ─────────────────────────────────────────────────────────────────────

export function WorkflowTemplateCard({ template }: { template: WorkflowTemplate }) {
  const signature = template.stages.some(s => s.kind === "signature");
  return (
    <article style={{
      background: "#FFFFFF", border: `1px solid ${BORDER}`, borderRadius: 12,
      padding: 16, display: "flex", flexDirection: "column", gap: 10,
    }}>
      <div style={{ display: "flex", alignItems: "flex-start", gap: 8 }}>
        <h3 style={{ ...GF, margin: 0, fontSize: 15, fontWeight: 700, color: NAVY, flex: 1 }}>
          <Link to={`/app/workflow/templates/${template.id}`} style={{ color: NAVY, textDecoration: "none" }}>
            {template.name}
          </Link>
        </h3>
        <span style={{
          ...GF, fontSize: 10, fontWeight: 700, padding: "2px 8px", borderRadius: 999,
          background: template.status === "active" ? "#DCFCE7" : template.status === "draft" ? "#FEF3C7" : "#F1F5F9",
          color: template.status === "active" ? "#166534" : template.status === "draft" ? "#92400E" : "#475569",
        }}>
          {TEMPLATE_STATUS_LABELS[template.status]}
        </span>
      </div>

      {template.description && (
        <p style={{ ...GF, margin: 0, fontSize: 12.5, color: SLATE, lineHeight: 1.6 }}>
          {template.description}
        </p>
      )}

      <ul style={{ listStyle: "none", margin: 0, padding: 0, display: "flex", flexWrap: "wrap", gap: 6 }}>
        <Meta>{template.stages.length} stages</Meta>
        <Meta>{WORKFLOW_CATEGORY_LABELS[template.category]}</Meta>
        {signature && <Meta>Includes signing</Meta>}
        {template.estimatedCompletion && <Meta>{template.estimatedCompletion}</Meta>}
      </ul>

      <p style={{ ...GF, margin: 0, fontSize: 11.5, color: "#94A3B8" }}>
        {/* The count is the point of a template: one design, many runs. */}
        Started {template.initiationCount} {template.initiationCount === 1 ? "time" : "times"}
        {template.lastUsedAtDemonstration
          ? ` · Last used ${template.lastUsedAtDemonstration.slice(0, 10)}`
          : " · Never used"} · By {template.createdBy}
      </p>

      <div style={{ display: "flex", gap: 8, flexWrap: "wrap", marginTop: 2 }}>
        <Link
          to={`/app/workflow/start?template=${template.id}`}
          style={{
            ...GF, minHeight: 40, display: "inline-flex", alignItems: "center", padding: "0 14px",
            borderRadius: 8, background: AZURE, color: "#FFFFFF", fontSize: 13, fontWeight: 700,
            textDecoration: "none",
          }}
        >
          Start workflow
        </Link>
        <Link
          to={`/app/workflow/templates/${template.id}`}
          style={{
            ...GF, minHeight: 40, display: "inline-flex", alignItems: "center", padding: "0 14px",
            borderRadius: 8, border: `1px solid ${BORDER}`, color: SLATE_DARK, fontSize: 13,
            fontWeight: 600, textDecoration: "none", background: "#FFFFFF",
          }}
        >
          View
        </Link>
      </div>
    </article>
  );
}

function Meta({ children }: { children: ReactNode }) {
  return (
    <li style={{
      ...GF, fontSize: 11, color: SLATE_DARK, background: SURFACE,
      border: `1px solid ${BORDER}`, borderRadius: 999, padding: "2px 9px",
    }}>
      {children}
    </li>
  );
}

export function WorkflowRunCard({ run }: { run: WorkflowRun }) {
  const progress = computeRunProgress(run);
  const waiting = progress.currentStage?.participants.filter(
    p => p.required && p.status !== "completed",
  ) ?? [];

  return (
    <article style={{
      background: "#FFFFFF", border: `1px solid ${BORDER}`, borderRadius: 12,
      padding: 16, display: "flex", flexDirection: "column", gap: 10,
    }}>
      <div style={{ display: "flex", alignItems: "flex-start", gap: 8, flexWrap: "wrap" }}>
        <h3 style={{ ...GF, margin: 0, fontSize: 15, fontWeight: 700, color: NAVY, flex: 1, minWidth: 180 }}>
          <Link to={`/app/workflow/runs/${run.id}`} style={{ color: NAVY, textDecoration: "none" }}>
            {run.name}
          </Link>
        </h3>
        <RunStatusBadge status={run.status} />
      </div>

      <p style={{ ...GF, margin: 0, fontSize: 12, color: SLATE }}>
        From <Link to={`/app/workflow/templates/${run.templateId}`} style={{ color: AZURE }}>{run.templateName}</Link>
        {" · "}Started by {run.startedBy}
      </p>

      <WorkflowProgressBar run={run} compact />

      {waiting.length > 0 && (
        <p style={{ ...GF, margin: 0, fontSize: 12, color: SLATE_DARK }}>
          Waiting on {waiting.map(p => p.displayName).join(", ")}
        </p>
      )}

      <div style={{ display: "flex", gap: 8, marginTop: 2 }}>
        <Link
          to={`/app/workflow/runs/${run.id}`}
          style={{
            ...GF, minHeight: 40, display: "inline-flex", alignItems: "center", padding: "0 14px",
            borderRadius: 8, background: AZURE, color: "#FFFFFF", fontSize: 13, fontWeight: 700,
            textDecoration: "none",
          }}
        >
          View workflow
        </Link>
      </div>
    </article>
  );
}

// ── Empty states ──────────────────────────────────────────────────────────────

export function WorkflowEmptyState({
  title, body, primary, secondary,
}: {
  title: string;
  body: string;
  primary?: { label: string; to: string };
  secondary?: ReactNode;
}) {
  return (
    <div style={{
      background: "#FFFFFF", border: `1px dashed ${BORDER}`, borderRadius: 12,
      padding: "40px 24px", textAlign: "center",
    }}>
      <h3 style={{ ...GF, margin: "0 0 8px", fontSize: 16, fontWeight: 700, color: NAVY }}>{title}</h3>
      <p style={{ ...GF, margin: "0 auto 18px", fontSize: 13.5, color: SLATE, lineHeight: 1.65, maxWidth: 460 }}>
        {body}
      </p>
      {primary && (
        <Link
          to={primary.to}
          style={{
            ...GF, minHeight: 44, display: "inline-flex", alignItems: "center", padding: "0 18px",
            borderRadius: 8, background: AZURE, color: "#FFFFFF", fontSize: 14, fontWeight: 700,
            textDecoration: "none",
          }}
        >
          {primary.label}
        </Link>
      )}
      {secondary && <div style={{ marginTop: 12 }}>{secondary}</div>}
    </div>
  );
}

/** The one place the template/run distinction is explained. */
export function WorkflowConceptNote() {
  return (
    <p role="note" style={{
      ...GF, margin: 0, fontSize: 12.5, lineHeight: 1.65, color: SLATE_DARK,
      background: "#EFF6FF", border: "1px solid #BFDBFE", borderRadius: 10, padding: "10px 14px",
    }}>
      <strong style={{ color: "#1D4ED8" }}>Workflows can be reused.</strong> Each time you start one,
      LAGDA creates a separate run with its own documents, participants, progress and audit trail.
      Starting a run never changes the workflow it came from.
    </p>
  );
}

export function WorkflowDemoNote() {
  return (
    <p role="note" style={{
      ...GF, margin: 0, fontSize: 12, lineHeight: 1.6, color: "#92400E",
      background: "#FFFBEB", border: "1px solid #FDE68A", borderRadius: 10, padding: "10px 14px",
    }}>
      Frontend demonstration. Workflows, runs and participants shown here are sample data.
      No document is sent, no reminder is delivered, and no participant is notified.
    </p>
  );
}

export { computeRunProgress };
