// Signing Workflow — document + workflow summary header, and notification previews.
//
// The summary reuses authoritative document data from the transaction detail service.
// It invents no production values, and it is never called Evidence.

import { useState } from "react";
import { Bell, ChevronDown, ChevronRight } from "lucide-react";
import { GF, TONES, WF } from "./WorkflowStyles";
import { WorkflowPill, WorkflowProgressBar, WorkflowStatusPill } from "./WorkflowPrimitives";
import type {
  SigningWorkflowSummary,
  WorkflowDocumentSummary,
} from "../../models/signing-workflow";
import {
  SIGNING_WORKFLOW_NOTIFICATION_DEFINITIONS,
  WORKFLOW_CONFIGURATION_STATUS_LABELS,
  WORKFLOW_NOTIFICATION_PREVIEW_NOTICE,
} from "../../models/signing-workflow";
import { TRANSACTION_STATUS_LABELS } from "../../models";

// ── Summary header ────────────────────────────────────────────────────────────

export function WorkflowSummaryHeader({
  document, summary, compact,
}: {
  document: WorkflowDocumentSummary;
  summary: SigningWorkflowSummary | null;
  compact?: boolean;
}) {
  const [expanded, setExpanded] = useState(false);

  return (
    <section className="wf-panel wf-stack" aria-label="Document and workflow summary" style={{ gap: 14 }}>
      <div>
        <p style={{ ...GF, margin: "0 0 4px", fontSize: 11, fontWeight: 700, letterSpacing: "0.06em", textTransform: "uppercase", color: WF.slate5 }}>
          Document
        </p>
        <p style={{ ...GF, margin: 0, fontSize: 15, fontWeight: 700, color: WF.navy, overflowWrap: "anywhere", lineHeight: 1.4 }}>
          {document.title}
        </p>
      </div>

      <div className="wf-row" style={{ gap: 6 }}>
        <WorkflowPill label={TRANSACTION_STATUS_LABELS[document.documentStatus]} tone={TONES.neutral} />
        {summary && <WorkflowStatusPill status={summary.status} />}
        {summary && (
          <WorkflowPill
            label={WORKFLOW_CONFIGURATION_STATUS_LABELS[summary.configurationStatus]}
            tone={
              summary.configurationStatus === "ready-in-demonstration" ? TONES.success
              : summary.configurationStatus === "needs-attention" ? TONES.warning
              : TONES.neutral
            }
          />
        )}
      </div>

      {summary && (
        <>
          <div className="wf-stack" style={{ gap: 12 }}>
            <WorkflowProgressBar
              label="Stages complete"
              completed={summary.progress.completedStages}
              total={summary.progress.totalStages}
              unit="stages"
            />
            <WorkflowProgressBar
              label="Required actions complete"
              completed={summary.progress.completedRequiredActions}
              total={summary.progress.totalRequiredActions}
              unit="required actions"
            />
            <WorkflowProgressBar
              label="Required signatures complete"
              completed={summary.progress.completedRequiredSignaturesInDemonstration}
              total={summary.progress.totalRequiredSignatures}
              unit="required signatures"
            />
          </div>

          {summary.progress.nonblockingAssignments > 0 && (
            <p style={{ ...GF, margin: 0, fontSize: 12, color: WF.slate5, lineHeight: 1.6 }}>
              {summary.progress.nonblockingAssignments}{" "}
              {summary.progress.nonblockingAssignments === 1 ? "person does" : "people do"} not hold
              up completion — copy recipients and view-only participants are excluded from the
              required-action counts above.
            </p>
          )}

          <dl style={{ ...GF, margin: 0, display: "grid", gridTemplateColumns: "1fr", gap: 8, fontSize: 13 }}>
            <SummaryRow label="Current stage" value={summary.currentStageName ?? "None"} />
            <SummaryRow label="Next stage" value={summary.nextStageName ?? (summary.currentStageName ? "This is the final stage" : "Not started")} />
            <SummaryRow label="Stages" value={String(summary.stageCount)} />
            <SummaryRow label="People assigned" value={String(summary.participantAssignmentCount)} />
            <SummaryRow label="Signatures required" value={String(summary.requiredSignatureCount)} />
          </dl>
        </>
      )}

      {!compact && (
        <>
          <button
            type="button"
            className="wf-btn wf-btn-ghost wf-btn-sm"
            aria-expanded={expanded}
            onClick={() => setExpanded(e => !e)}
            style={{ justifyContent: "flex-start", padding: 0 }}
          >
            {expanded ? <ChevronDown size={15} aria-hidden /> : <ChevronRight size={15} aria-hidden />}
            {expanded ? "Hide document details" : "Show document details"}
          </button>

          {expanded && (
            <dl style={{ ...GF, margin: 0, display: "grid", gridTemplateColumns: "1fr", gap: 8, fontSize: 13 }}>
              <SummaryRow label="Owner" value={document.ownerName} />
              <SummaryRow label="Workspace" value={document.workspaceName} />
              <SummaryRow label="Participants on document" value={String(document.participantCount)} />
              <SummaryRow label="Pages (demonstration)" value={String(document.demonstrationPageCount)} />
              <SummaryRow label="Created" value={fmt(document.createdAt)} />
              <SummaryRow label="Last updated" value={fmt(document.updatedAt)} />
              <SummaryRow label="Expires" value={document.expiresAt ? fmt(document.expiresAt) : "No expiration set"} />
              <SummaryRow label="Verification" value={document.verificationDirection} />
            </dl>
          )}
        </>
      )}

      {document.configurationLocked && document.lockReason && (
        <div
          className="wf-card"
          style={{ padding: 12, background: TONES.neutral.bg, borderColor: TONES.neutral.border }}
        >
          <p style={{ ...GF, margin: 0, fontSize: 12, color: WF.slate6, lineHeight: 1.6 }}>
            {document.lockReason}
          </p>
        </div>
      )}
    </section>
  );
}

function SummaryRow({ label, value }: { label: string; value: string }) {
  return (
    <div style={{ display: "flex", justifyContent: "space-between", gap: 12 }}>
      <dt style={{ color: WF.slate5, flexShrink: 0 }}>{label}</dt>
      <dd style={{ margin: 0, color: WF.slate9, fontWeight: 600, textAlign: "right", overflowWrap: "anywhere" }}>
        {value}
      </dd>
    </div>
  );
}

function fmt(iso: string): string {
  try {
    return new Date(iso).toLocaleDateString("en-PH", { year: "numeric", month: "short", day: "numeric" });
  } catch {
    return "—";
  }
}

// ── Notification preview ──────────────────────────────────────────────────────
// Definitions only. Nothing is created, scheduled, or delivered.

export function WorkflowNotificationPreview({ documentId }: { documentId: string }) {
  const [openEvent, setOpenEvent] = useState<string | null>(null);

  return (
    <section className="wf-stack" aria-label="Notification preview">
      <div className="wf-row" style={{ gap: 8 }}>
        <Bell size={16} color={WF.slate5} aria-hidden />
        <h2 style={{ ...GF, margin: 0, fontSize: 15, fontWeight: 700, color: WF.navy }}>
          Notification Preview
        </h2>
      </div>

      <p style={{ ...GF, margin: 0, fontSize: 13, color: WF.slate6, lineHeight: 1.6 }}>
        {WORKFLOW_NOTIFICATION_PREVIEW_NOTICE}
      </p>

      <ul style={{ margin: 0, padding: 0, listStyle: "none", display: "flex", flexDirection: "column", gap: 8 }}>
        {SIGNING_WORKFLOW_NOTIFICATION_DEFINITIONS.map(def => {
          const open = openEvent === def.eventId;
          return (
            <li key={def.eventId} className="wf-card" style={{ padding: 12 }}>
              <button
                type="button"
                className="wf-btn wf-btn-ghost"
                aria-expanded={open}
                onClick={() => setOpenEvent(open ? null : def.eventId)}
                style={{ width: "100%", justifyContent: "flex-start", padding: 0 }}
              >
                {open ? <ChevronDown size={15} aria-hidden /> : <ChevronRight size={15} aria-hidden />}
                <span style={{ ...GF, fontSize: 13, fontWeight: 700, color: WF.navy, textAlign: "left" }}>
                  {def.label}
                </span>
                <span style={{ marginLeft: "auto" }}>
                  <WorkflowPill label="Preview only" tone={TONES.neutral} />
                </span>
              </button>

              {open && (
                <dl style={{ ...GF, margin: "12px 0 0", display: "flex", flexDirection: "column", gap: 10, fontSize: 12 }}>
                  <PreviewRow label="Event" value={def.eventId} mono />
                  <PreviewRow label="Who would be addressed" value={def.audience} />
                  <PreviewRow label="Who would be excluded" value={def.exclusions.join(" · ")} />
                  <PreviewRow label="Channel direction" value={def.channelDirection} />
                  <PreviewRow label="Timing direction" value={def.timingDirection} />
                  <PreviewRow
                    label="Deep link"
                    value={def.deepLinkPattern.replace(":documentId", documentId)}
                    mono
                  />
                  <PreviewRow label="Fallback link" value={def.fallbackLink} mono />
                  <PreviewRow label="Frontend readiness" value={def.frontendReady ? "Frontend preview ready" : "Not started"} />
                  <PreviewRow label="Backend readiness" value="Backend service required — not implemented" />
                  <div>
                    <dt style={{ color: WF.slate5, marginBottom: 4 }}>Reminder direction stops when</dt>
                    <dd style={{ margin: 0 }}>
                      <ul style={{ margin: 0, paddingLeft: 18, color: WF.slate7, lineHeight: 1.7 }}>
                        {def.reminderStopConditions.map(c => <li key={c}>{c}</li>)}
                      </ul>
                    </dd>
                  </div>
                </dl>
              )}
            </li>
          );
        })}
      </ul>

      <p style={{ ...GF, margin: 0, fontSize: 12, color: WF.slate5, lineHeight: 1.6 }}>
        A notification never grants access. Opening any destination above re-checks document
        access, workspace scope, and permission before anything is shown.
      </p>
    </section>
  );
}

function PreviewRow({ label, value, mono }: { label: string; value: string; mono?: boolean }) {
  return (
    <div>
      <dt style={{ color: WF.slate5, marginBottom: 2 }}>{label}</dt>
      <dd
        style={{
          margin: 0, color: WF.slate7, lineHeight: 1.6, overflowWrap: "anywhere",
          fontFamily: mono ? "'Geist Mono', 'Courier New', monospace" : undefined,
        }}
      >
        {value}
      </dd>
    </div>
  );
}
