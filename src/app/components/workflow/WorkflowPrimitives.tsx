// Signing Workflow — shared presentational primitives.
//
// Accessibility rules applied throughout:
//   - No status is ever conveyed by colour alone: every pill carries text.
//   - No requirement is ever conveyed by an icon alone.
//   - Icon-only controls always carry an accessible name.
//   - Reorder controls are real buttons, never drag-only affordances.
//   - Announcements go through a single polite live region per screen.

import { useCallback, useEffect, useRef, useState } from "react";
import {
  AlertTriangle, CheckCircle2, ChevronDown, ChevronUp, Info,
  MoveHorizontal, PenLine, XCircle,
} from "lucide-react";
import { GF, TONES, WF, type Tone } from "./WorkflowStyles";
import type {
  SigningStageStatus,
  SigningWorkflowStatus,
  SigningWorkflowValidationIssue,
  StageParticipantAssignment,
  StageParticipantStatus,
  FieldReadinessState,
} from "../../models/signing-workflow";
import {
  FIELD_READINESS_LABELS,
  STAGE_PARTICIPANT_STATUS_LABELS,
  STAGE_STATUS_LABELS,
  WORKFLOW_STATUS_LABELS,
} from "../../models/signing-workflow";

// ── Tone mapping (presentation only — never in the model layer) ───────────────

export function stageStatusTone(status: SigningStageStatus): Tone {
  switch (status) {
    case "completed":               return TONES.success;
    case "ready":
    case "in-progress":             return TONES.azure;
    case "blocked":                 return TONES.warning;
    case "declined":
    case "rejected":                return TONES.error;
    case "expired":
    case "cancelled":
    case "skipped-unavailable":
    case "unavailable":             return TONES.muted;
    case "waiting-for-prior-stage": return TONES.neutral;
    case "draft":
    default:                        return TONES.neutral;
  }
}

export function workflowStatusTone(status: SigningWorkflowStatus): Tone {
  switch (status) {
    case "completed":   return TONES.success;
    case "ready":
    case "in-progress": return TONES.azure;
    case "blocked":     return TONES.warning;
    case "declined":
    case "rejected":    return TONES.error;
    case "expired":
    case "cancelled":
    case "voided":
    case "unavailable": return TONES.muted;
    default:            return TONES.neutral;
  }
}

export function assignmentStatusTone(status: StageParticipantStatus): Tone {
  switch (status) {
    case "completed":             return TONES.success;
    case "ready-for-action":
    case "in-progress":
    case "viewed":                return TONES.azure;
    case "declined":
    case "rejected":
    case "authentication-failed": return TONES.error;
    case "expired":
    case "cancelled":
    case "unavailable":           return TONES.muted;
    case "no-longer-required":    return TONES.muted;
    default:                      return TONES.neutral;
  }
}

export function readinessTone(state: FieldReadinessState): Tone {
  if (state === "ready") return TONES.success;
  if (state === "nonblocking") return TONES.neutral;
  if (state === "unavailable") return TONES.muted;
  return TONES.error;
}

// ── Pill ──────────────────────────────────────────────────────────────────────

export function WorkflowPill({
  label, tone, title, strong,
}: { label: string; tone: Tone; title?: string; strong?: boolean }) {
  return (
    <span
      title={title}
      style={{
        ...GF, display: "inline-block", fontSize: 12, fontWeight: strong ? 700 : 600,
        padding: "3px 9px", borderRadius: 100, lineHeight: 1.4,
        background: tone.bg, color: tone.text, border: `1px solid ${tone.border}`,
        whiteSpace: "nowrap",
      }}
    >
      {label}
    </span>
  );
}

export function StageStatusPill({ status }: { status: SigningStageStatus }) {
  return <WorkflowPill label={STAGE_STATUS_LABELS[status]} tone={stageStatusTone(status)} />;
}

export function WorkflowStatusPill({ status }: { status: SigningWorkflowStatus }) {
  return <WorkflowPill label={WORKFLOW_STATUS_LABELS[status]} tone={workflowStatusTone(status)} />;
}

export function AssignmentStatusPill({ status }: { status: StageParticipantStatus }) {
  return <WorkflowPill label={STAGE_PARTICIPANT_STATUS_LABELS[status]} tone={assignmentStatusTone(status)} />;
}

export function ReadinessPill({ state }: { state: FieldReadinessState }) {
  return <WorkflowPill label={FIELD_READINESS_LABELS[state]} tone={readinessTone(state)} />;
}

/**
 * The combined action + signature label. Always text — never an icon alone.
 * "Approval + Signature" is deliberately distinct from "Approval Only", and
 * a review is never labelled as an approval.
 */
export function describeRequirement(assignment: StageParticipantAssignment): string {
  const { action, signatureRequirement } = assignment;
  const sig = signatureRequirement.signatureRequired;
  const init = signatureRequirement.initialsRequired;

  const base =
    action === "sign"         ? "Signature Required"
    : action === "approve"    ? (sig ? "Approval + Signature" : "Approval Only")
    : action === "review"     ? (sig ? "Review + Signature" : "Review Only")
    : action === "acknowledge"? (sig ? "Acknowledgment + Signature" : "Acknowledgment Only")
    : action === "view"       ? "View Only"
    : "Copy Only";

  return init ? `${base} + Initials` : base;
}

export function RequirementPill({ assignment }: { assignment: StageParticipantAssignment }) {
  const label = describeRequirement(assignment);
  const tone = assignment.signatureRequirement.signatureRequired ? TONES.azure : TONES.neutral;
  return <WorkflowPill label={label} tone={tone} />;
}

// ── Stage number badge ────────────────────────────────────────────────────────
// A design-system badge. The official LAGDA logo is never used here.

export function StageNumberBadge({ position, current }: { position: number; current?: boolean }) {
  return (
    <span
      aria-hidden="true"
      style={{
        ...GF, display: "inline-flex", alignItems: "center", justifyContent: "center",
        width: 26, height: 26, borderRadius: 8, flexShrink: 0,
        fontSize: 13, fontWeight: 800, letterSpacing: "-0.02em",
        background: current ? WF.azure : WF.slate1,
        color: current ? "#fff" : WF.slate6,
        border: `1px solid ${current ? WF.azure : WF.slate2}`,
      }}
    >
      {position}
    </span>
  );
}

// ── Avatar (safe initials only — never a signature representation) ────────────

export function ParticipantAvatar({ name, size = 32 }: { name: string; size?: number }) {
  const initials = name
    .split(/\s+/)
    .filter(Boolean)
    .slice(0, 2)
    .map(part => part[0]?.toUpperCase() ?? "")
    .join("") || "?";
  return (
    <span
      aria-hidden="true"
      style={{
        ...GF, display: "inline-flex", alignItems: "center", justifyContent: "center",
        width: size, height: size, borderRadius: size / 2, flexShrink: 0,
        background: WF.slate1, color: WF.slate6,
        fontSize: Math.round(size * 0.38), fontWeight: 700,
        border: `1px solid ${WF.slate2}`,
      }}
    >
      {initials}
    </span>
  );
}

// ── Progress ──────────────────────────────────────────────────────────────────
// Always accompanied by accessible text — never a bare ring or bar.

export function WorkflowProgressBar({
  label, completed, total, unit,
}: { label: string; completed: number; total: number; unit: string }) {
  const pct = total === 0 ? 0 : Math.round((completed / total) * 100);
  const done = total > 0 && completed === total;
  const text = `${completed} of ${total} ${unit}`;
  return (
    <div>
      <div style={{ display: "flex", justifyContent: "space-between", gap: 8, marginBottom: 6 }}>
        <span style={{ ...GF, fontSize: 12, fontWeight: 600, color: WF.slate6 }}>{label}</span>
        <span style={{ ...GF, fontSize: 12, fontWeight: 700, color: done ? WF.successText : WF.slate9 }}>
          {text}
        </span>
      </div>
      <div
        className="wf-progress-track"
        role="progressbar"
        aria-valuenow={completed}
        aria-valuemin={0}
        aria-valuemax={total}
        aria-valuetext={text}
        aria-label={label}
      >
        <div
          className={`wf-progress-fill${done ? " wf-progress-fill-done" : ""}`}
          style={{ width: `${pct}%` }}
        />
      </div>
    </div>
  );
}

// ── Live announcer ────────────────────────────────────────────────────────────
// One polite region per screen. Used for reorder confirmations and validation
// resolution — never for passive background updates.

export function useAnnouncer() {
  const [message, setMessage] = useState("");
  const timer = useRef<number | null>(null);

  const announce = useCallback((text: string) => {
    if (timer.current !== null) window.clearTimeout(timer.current);
    // Clearing first guarantees repeat announcements are read again.
    setMessage("");
    timer.current = window.setTimeout(() => setMessage(text), 60);
  }, []);

  useEffect(() => () => {
    if (timer.current !== null) window.clearTimeout(timer.current);
  }, []);

  const node = (
    <div aria-live="polite" aria-atomic="true" className="wf-visually-hidden">
      {message}
    </div>
  );

  return { announce, announcerNode: node };
}

// ── Reorder controls ──────────────────────────────────────────────────────────
// The non-drag path. Always present, on every device, for every reorderable item.
// Drag is a pure enhancement layered on top of these.

export interface ReorderControlsProps {
  /** "horizontal" renders Move Left / Move Right; "vertical" renders Move Up / Move Down. */
  orientation: "horizontal" | "vertical";
  itemLabel:   string;
  position:    number;
  total:       number;
  disabled?:   boolean;
  onMoveEarlier: () => void;
  onMoveLater:   () => void;
  onMoveToPosition: (position: number) => void;
}

export function ReorderControls({
  orientation, itemLabel, position, total, disabled,
  onMoveEarlier, onMoveLater, onMoveToPosition,
}: ReorderControlsProps) {
  const horizontal = orientation === "horizontal";
  const earlierLabel = horizontal ? "Move left" : "Move up";
  const laterLabel   = horizontal ? "Move right" : "Move down";
  const atStart = position <= 1;
  const atEnd   = position >= total;
  const selectId = `wf-move-to-${orientation}-${position}-${itemLabel.replace(/\W+/g, "-").toLowerCase()}`;

  return (
    <div className="wf-row" style={{ gap: 6 }}>
      <button
        type="button"
        className="wf-icon-btn"
        onClick={onMoveEarlier}
        disabled={disabled || atStart}
        aria-label={`${earlierLabel}: ${itemLabel}`}
        title={atStart ? `${itemLabel} is already first` : `${earlierLabel}: ${itemLabel}`}
      >
        {horizontal
          ? <ChevronUp size={16} style={{ transform: "rotate(-90deg)" }} aria-hidden />
          : <ChevronUp size={16} aria-hidden />}
      </button>
      <button
        type="button"
        className="wf-icon-btn"
        onClick={onMoveLater}
        disabled={disabled || atEnd}
        aria-label={`${laterLabel}: ${itemLabel}`}
        title={atEnd ? `${itemLabel} is already last` : `${laterLabel}: ${itemLabel}`}
      >
        {horizontal
          ? <ChevronDown size={16} style={{ transform: "rotate(-90deg)" }} aria-hidden />
          : <ChevronDown size={16} aria-hidden />}
      </button>

      {total > 2 && (
        <>
          <label htmlFor={selectId} className="wf-visually-hidden">
            Move {itemLabel} to position
          </label>
          <select
            id={selectId}
            className="wf-select"
            value={position}
            disabled={disabled}
            onChange={(e) => onMoveToPosition(Number(e.target.value))}
            style={{ width: "auto", minWidth: 92, paddingRight: 8 }}
          >
            {Array.from({ length: total }, (_, i) => i + 1).map(n => (
              <option key={n} value={n}>Position {n}</option>
            ))}
          </select>
        </>
      )}
    </div>
  );
}

// ── Validation summary ────────────────────────────────────────────────────────

export function ValidationSummary({
  issues, title, onRepair, emptyMessage,
}: {
  issues: SigningWorkflowValidationIssue[];
  title?: string;
  onRepair?: (issue: SigningWorkflowValidationIssue) => void;
  emptyMessage?: string;
}) {
  const blocking = issues.filter(i => i.severity === "blocking");
  const advisory = issues.filter(i => i.severity === "advisory");

  if (issues.length === 0) {
    return (
      <div
        className="wf-card"
        style={{ padding: 16, background: WF.successBg, borderColor: WF.successBorder }}
      >
        <div className="wf-row" style={{ gap: 8 }}>
          <CheckCircle2 size={18} color={WF.successText} aria-hidden />
          <p style={{ ...GF, margin: 0, fontSize: 14, fontWeight: 600, color: WF.successText }}>
            {emptyMessage ?? "No issues found in this configuration."}
          </p>
        </div>
      </div>
    );
  }

  const renderGroup = (
    list: SigningWorkflowValidationIssue[],
    groupTitle: string,
    tone: Tone,
    Icon: typeof AlertTriangle,
  ) => (
    <div className="wf-card" style={{ padding: 16, background: tone.bg, borderColor: tone.border }}>
      <div className="wf-row" style={{ gap: 8, marginBottom: 10 }}>
        <Icon size={18} color={tone.text} aria-hidden />
        <h3 style={{ ...GF, margin: 0, fontSize: 14, fontWeight: 700, color: tone.text }}>
          {groupTitle} ({list.length})
        </h3>
      </div>
      <ul style={{ margin: 0, padding: 0, listStyle: "none", display: "flex", flexDirection: "column", gap: 10 }}>
        {list.map((issue, i) => (
          <li key={`${issue.issueId}-${issue.assignmentId ?? issue.stageId ?? i}`}>
            <p style={{ ...GF, margin: 0, fontSize: 13, color: tone.text, lineHeight: 1.55 }}>
              {issue.stageName && (
                <span style={{ fontWeight: 700 }}>{issue.stageName}: </span>
              )}
              {issue.message}
            </p>
            {issue.repairActionLabel && onRepair && (
              <button
                type="button"
                className="wf-btn wf-btn-sm wf-btn-secondary"
                style={{ marginTop: 6 }}
                onClick={() => onRepair(issue)}
              >
                {issue.repairActionLabel}
              </button>
            )}
          </li>
        ))}
      </ul>
    </div>
  );

  return (
    <div className="wf-stack" role="group" aria-label={title ?? "Configuration issues"}>
      {title && (
        <h2 style={{ ...GF, margin: 0, fontSize: 15, fontWeight: 700, color: WF.navy }}>{title}</h2>
      )}
      {blocking.length > 0 && renderGroup(blocking, "Must be fixed before review", TONES.error, XCircle)}
      {advisory.length > 0 && renderGroup(advisory, "Worth checking", TONES.warning, AlertTriangle)}
    </div>
  );
}

// ── Frontend-only notice ──────────────────────────────────────────────────────

export function DemonstrationNotice({ text, compact }: { text: string; compact?: boolean }) {
  return (
    <div
      className="wf-card"
      style={{
        padding: compact ? "10px 12px" : "14px 16px",
        background: WF.slate0, borderColor: WF.slate2,
        display: "flex", gap: 10, alignItems: "flex-start",
      }}
    >
      <Info size={16} color={WF.slate5} aria-hidden style={{ flexShrink: 0, marginTop: 1 }} />
      <p style={{ ...GF, margin: 0, fontSize: compact ? 12 : 13, color: WF.slate6, lineHeight: 1.6 }}>
        {text}
      </p>
    </div>
  );
}

// ── Section heading ───────────────────────────────────────────────────────────

export function WorkflowSectionHeading({
  title, description, level = 2, action,
}: {
  title: string;
  description?: string;
  level?: 2 | 3;
  action?: React.ReactNode;
}) {
  const Tag = level === 2 ? "h2" : "h3";
  return (
    <div style={{ display: "flex", justifyContent: "space-between", alignItems: "flex-start", gap: 12, flexWrap: "wrap" }}>
      <div style={{ minWidth: 0 }}>
        <Tag style={{ ...GF, margin: 0, fontSize: level === 2 ? 17 : 15, fontWeight: 700, color: WF.navy }}>
          {title}
        </Tag>
        {description && (
          <p style={{ ...GF, margin: "4px 0 0", fontSize: 13, color: WF.slate5, lineHeight: 1.6 }}>
            {description}
          </p>
        )}
      </div>
      {action}
    </div>
  );
}

// ── Loading skeleton ──────────────────────────────────────────────────────────

export function WorkflowSkeleton({ label }: { label: string }) {
  return (
    <div role="status" aria-live="polite" aria-label={label} style={{ padding: 4 }}>
      <span className="wf-visually-hidden">{label}</span>
      <style>{`
        @keyframes wf-sk { 0%,100% { opacity: 1 } 50% { opacity: 0.45 } }
        @media (prefers-reduced-motion: reduce) { .wf-sk { animation: none !important; opacity: 0.7 } }
      `}</style>
      <div style={{ display: "flex", gap: 16, flexWrap: "wrap" }}>
        {[0, 1, 2].map(i => (
          <div
            key={i}
            className="wf-sk"
            aria-hidden
            style={{
              flex: "1 1 260px", minWidth: 240, height: 190, borderRadius: 12,
              background: WF.slate1, animation: "wf-sk 1.4s ease-in-out infinite",
              animationDelay: `${i * 120}ms`,
            }}
          />
        ))}
      </div>
    </div>
  );
}

// ── Confirm dialog ────────────────────────────────────────────────────────────
// The platform never uses native window.confirm: it is unstyled, cannot be
// brand-aligned, is not focus-managed by the app, and some embedded contexts
// suppress it. This matches the focus-trapped dialog pattern used elsewhere.

export interface WorkflowConfirmRequest {
  title:        string;
  body:         string;
  confirmLabel: string;
  destructive?: boolean;
  onConfirm:    () => void;
}

export function WorkflowConfirmDialog({
  request, onClose,
}: { request: WorkflowConfirmRequest | null; onClose: () => void }) {
  const panelRef = useRef<HTMLDivElement>(null);
  const confirmRef = useRef<HTMLButtonElement>(null);
  const previousFocus = useRef<HTMLElement | null>(null);

  useEffect(() => {
    if (!request) return;
    previousFocus.current = document.activeElement as HTMLElement | null;
    confirmRef.current?.focus();
    return () => { previousFocus.current?.focus?.(); };
  }, [request]);

  useEffect(() => {
    if (!request) return;
    function onKeyDown(e: KeyboardEvent) {
      if (e.key === "Escape") { e.stopPropagation(); onClose(); return; }
      if (e.key !== "Tab" || !panelRef.current) return;
      const focusable = panelRef.current.querySelectorAll<HTMLElement>(
        'button:not([disabled]), [tabindex]:not([tabindex="-1"])',
      );
      const first = focusable[0];
      const last = focusable[focusable.length - 1];
      if (!first || !last) return;
      if (e.shiftKey && document.activeElement === first) { e.preventDefault(); last.focus(); }
      else if (!e.shiftKey && document.activeElement === last) { e.preventDefault(); first.focus(); }
    }
    document.addEventListener("keydown", onKeyDown, true);
    return () => document.removeEventListener("keydown", onKeyDown, true);
  }, [request, onClose]);

  if (!request) return null;

  return (
    <div
      role="alertdialog"
      aria-modal="true"
      aria-labelledby="wf-confirm-title"
      aria-describedby="wf-confirm-body"
      style={{
        position: "fixed", inset: 0, zIndex: 1300,
        display: "flex", alignItems: "center", justifyContent: "center", padding: 20,
      }}
    >
      <div onClick={onClose} aria-hidden style={{ position: "absolute", inset: 0, background: "rgba(7,17,31,0.42)" }} />
      <div
        ref={panelRef}
        className="wf-root"
        style={{
          position: "relative", background: WF.white, borderRadius: 12,
          padding: "24px 26px", maxWidth: 440, width: "100%",
          boxShadow: "0 20px 60px rgba(7,17,31,0.18)",
        }}
      >
        <h2 id="wf-confirm-title" style={{ ...GF, margin: "0 0 10px", fontSize: 17, fontWeight: 700, color: WF.navy }}>
          {request.title}
        </h2>
        <p id="wf-confirm-body" style={{ ...GF, margin: "0 0 22px", fontSize: 14, color: WF.slate6, lineHeight: 1.65 }}>
          {request.body}
        </p>
        <div className="wf-row" style={{ gap: 10, justifyContent: "flex-end" }}>
          <button type="button" className="wf-btn wf-btn-secondary" onClick={onClose}>
            Cancel
          </button>
          <button
            ref={confirmRef}
            type="button"
            className={`wf-btn ${request.destructive ? "wf-btn-danger" : "wf-btn-primary"}`}
            onClick={() => { request.onConfirm(); onClose(); }}
          >
            {request.confirmLabel}
          </button>
        </div>
      </div>
    </div>
  );
}

/** Small hook so pages can request a confirmation without managing dialog state. */
export function useWorkflowConfirm() {
  const [request, setRequest] = useState<WorkflowConfirmRequest | null>(null);
  const confirm = useCallback((r: WorkflowConfirmRequest) => setRequest(r), []);
  const close = useCallback(() => setRequest(null), []);
  const dialog = <WorkflowConfirmDialog request={request} onClose={close} />;
  return { confirm, confirmDialog: dialog };
}

// ── Small inline helpers ──────────────────────────────────────────────────────

export function SignatureRequirementLine({ assignment }: { assignment: StageParticipantAssignment }) {
  const { signatureRequired, initialsRequired } = assignment.signatureRequirement;
  if (!signatureRequired && !initialsRequired) {
    return (
      <span style={{ ...GF, fontSize: 12, color: WF.slate5 }}>
        Electronic signature not required
      </span>
    );
  }
  return (
    <span className="wf-row" style={{ gap: 6 }}>
      <PenLine size={13} color={WF.azure} aria-hidden />
      <span style={{ ...GF, fontSize: 12, color: WF.slate7, fontWeight: 600 }}>
        {signatureRequired && "Electronic signature required"}
        {signatureRequired && initialsRequired && " · "}
        {initialsRequired && "Initials required"}
      </span>
    </span>
  );
}

export function ExecutionModeLine({ mode, count }: { mode: "parallel" | "ordered"; count: number }) {
  return (
    <span className="wf-row" style={{ gap: 6 }}>
      <MoveHorizontal size={13} color={WF.slate5} aria-hidden />
      <span style={{ ...GF, fontSize: 12, color: WF.slate5 }}>
        {mode === "parallel"
          ? (count > 1 ? "Everyone acts at the same time" : "Single person")
          : "One person after another"}
      </span>
    </span>
  );
}
