// Policy and Automation review — Gap Closure Command 4.
//
// Presentation only. Every result shown here came from the canonical Command 32
// engine via `services/preparation-resolution.ts`. No Rule matching, Policy
// evaluation, conflict detection or precedence logic lives in this file.
//
// Two distinctions are load-bearing and are carried in TEXT, never colour or icon
// alone:
//   - A Policy requirement is MANDATORY. An Automation recommendation is OPTIONAL
//     and must be accepted explicitly.
//   - A blocking conflict cannot be dismissed. Only optional recommendations can.

import { useMemo, useState } from "react";
import { AlertTriangle, CheckCircle2, RefreshCw, ShieldCheck, Sparkles, X } from "lucide-react";
import {
  RESOLUTION_STATUS_LABELS,
  type AutomationRecommendation,
  type PolicyRequirement,
  type PreparationResolutionResult,
  type ResolutionConflictView,
} from "../../services/preparation-resolution";
import { BS, GF, Notice, SectionHeading, TONES } from "./BulkSendKit";

export interface PreparationResolutionPanelProps {
  result: PreparationResolutionResult;
  /** True when the batch changed since this result was produced. */
  stale: boolean;
  evaluating: boolean;
  applying: boolean;
  canApply: boolean;
  onReevaluate: () => void;
  onClose: () => void;
  onApply: (recommendationIds: string[]) => void;
  error: string | null;
}

export function PreparationResolutionPanel({
  result, stale, evaluating, applying, canApply, onReevaluate, onClose, onApply, error,
}: PreparationResolutionPanelProps) {
  const [accepted, setAccepted] = useState<Set<string>>(new Set());
  const [dismissed, setDismissed] = useState<Set<string>>(new Set());
  const [showInput, setShowInput] = useState(false);

  const applicable = useMemo(
    () => result.recommendations.filter((r) => r.applicable && !dismissed.has(r.id)),
    [result.recommendations, dismissed],
  );
  const unsupported = result.recommendations.filter((r) => !r.applicable);
  const blockingConflicts = result.conflicts.filter((c) => c.blocking);

  const selected = [...accepted].filter((id) => applicable.some((r) => r.id === id));

  const applyDisabledReason =
    !canApply ? "You do not have permission to apply recommendations to this batch."
    : stale ? "Preparation details changed. Re-evaluate before applying."
    : applying ? "Recommendations are being applied."
    : selected.length === 0 ? "Select at least one recommendation."
    : null;

  return (
    <div className="bs-panel bs-stack" role="group" aria-label="Policy and Automation review">
      {/* ── Header ─────────────────────────────────────────────────────────── */}
      <div className="bs-row" style={{ justifyContent: "space-between", alignItems: "flex-start" }}>
        <div style={{ minWidth: 0 }}>
          <h2 style={{ ...GF, margin: 0, fontSize: 16, fontWeight: 700, color: BS.navy }}>
            Policy and Automation Review
          </h2>
          <p style={{ ...GF, margin: "4px 0 0", fontSize: 12.5, color: BS.slate5 }}>
            {stale ? RESOLUTION_STATUS_LABELS.stale : RESOLUTION_STATUS_LABELS[result.status]}
            {" · "}Evaluated {new Date(result.evaluatedAtDemonstration).toLocaleString("en-PH", {
              hour: "numeric", minute: "2-digit", day: "numeric", month: "short",
            })}
          </p>
        </div>
        <div className="bs-row" style={{ gap: 8 }}>
          <button type="button" className="bs-btn bs-btn-secondary bs-btn-sm"
            onClick={onReevaluate} disabled={evaluating || applying}>
            <RefreshCw size={14} aria-hidden /> {evaluating ? "Evaluating…" : "Re-evaluate"}
          </button>
          <button type="button" className="bs-btn bs-btn-ghost" onClick={onClose}
            aria-label="Close Policy and Automation review" style={{ minHeight: 44, width: 44, padding: 0 }}>
            <X size={18} aria-hidden />
          </button>
        </div>
      </div>

      {stale && (
        <Notice tone={TONES.warning}
          text="Preparation details changed since this evaluation. Re-evaluate before applying anything or continuing." />
      )}

      {error && (
        <div role="alert" className="bs-card" style={{ padding: 12, background: BS.errorBg, borderColor: BS.errorBorder }}>
          <p style={{ ...GF, margin: 0, fontSize: 13, color: BS.errorText }}>{error}</p>
        </div>
      )}

      {/* ── Counts, as text ────────────────────────────────────────────────── */}
      <div className="bs-row" style={{ gap: 8 }}>
        <Count label="Policy requirements" n={result.requirements.length} />
        <Count label="Recommendations" n={applicable.length} />
        <Count label="Conflicts" n={result.conflicts.length} />
        <Count label="Not applicable here" n={unsupported.length} />
      </div>

      {/* ── Conflicts first: blocking ones gate everything else ────────────── */}
      {result.conflicts.length > 0 && (
        <section>
          <SectionHeading level={3} title="Conflicts"
            description="Two active definitions propose different values for the same setting." />
          <div className="bs-stack" style={{ gap: 10 }}>
            {result.conflicts.map((c) => <ConflictCard key={c.id} conflict={c} />)}
          </div>
        </section>
      )}

      {/* ── Policy requirements: mandatory ─────────────────────────────────── */}
      <section>
        <SectionHeading level={3} title="Policy requirements"
          description="Set by active Policies. These are requirements, not suggestions." />
        {result.requirements.length === 0 ? (
          <p style={{ ...GF, margin: 0, fontSize: 13, color: BS.slate5 }}>
            No applicable Policy requirements were identified in this preview. This is not a
            statement that the request complies with any law, rule, or obligation.
          </p>
        ) : (
          <div className="bs-stack" style={{ gap: 10 }}>
            {result.requirements.map((r) => <RequirementCard key={r.id} requirement={r} />)}
          </div>
        )}
      </section>

      {/* ── Automation recommendations: optional ───────────────────────────── */}
      <section>
        <SectionHeading level={3} title="Automation recommendations"
          description="Optional. Nothing is applied unless you select it and choose Apply." />
        {applicable.length === 0 && unsupported.length === 0 ? (
          <p style={{ ...GF, margin: 0, fontSize: 13, color: BS.slate5 }}>
            No Automation Rule matched this preparation draft.
          </p>
        ) : (
          <div className="bs-stack" style={{ gap: 10 }}>
            {applicable.map((r) => (
              <RecommendationCard key={r.id} rec={r}
                checked={accepted.has(r.id)}
                disabled={stale || applying || !canApply}
                onToggle={() => setAccepted((s) => {
                  const n = new Set(s); n.has(r.id) ? n.delete(r.id) : n.add(r.id); return n;
                })}
                onDismiss={() => setDismissed((s) => new Set(s).add(r.id))} />
            ))}
            {unsupported.map((r) => <RecommendationCard key={r.id} rec={r} checked={false} disabled onToggle={() => {}} />)}
          </div>
        )}
      </section>

      {/* ── Skipped rules, for explainability ──────────────────────────────── */}
      {result.skipped.length > 0 && (
        <details>
          <summary style={{ ...GF, fontSize: 13, color: BS.slate6, cursor: "pointer", minHeight: 32, display: "flex", alignItems: "center" }}>
            Why some Rules did not apply ({result.skipped.length})
          </summary>
          <ul style={{ margin: "8px 0 0", paddingLeft: 18, ...GF, fontSize: 12.5, color: BS.slate6, lineHeight: 1.7 }}>
            {result.skipped.map((s, i) => <li key={i}>{s.reason}</li>)}
          </ul>
        </details>
      )}

      {/* ── What was evaluated ─────────────────────────────────────────────── */}
      <details open={showInput} onToggle={(e) => setShowInput((e.target as HTMLDetailsElement).open)}>
        <summary style={{ ...GF, fontSize: 13, color: BS.slate6, cursor: "pointer", minHeight: 32, display: "flex", alignItems: "center" }}>
          What was evaluated
        </summary>
        <p style={{ ...GF, margin: "8px 0", fontSize: 12, color: BS.slate5, lineHeight: 1.6 }}>
          Only counts and settings are sent for evaluation. No recipient name, email address,
          organization, cell value, or document content is included.
        </p>
        <dl style={{ ...GF, margin: 0, fontSize: 12.5, color: BS.slate6, lineHeight: 1.8 }}>
          <InputRow label="Template" value={result.inputSummary.templateName ?? "None"} />
          <InputRow label="Recipients included" value={String(result.inputSummary.includedCount)} />
          <InputRow label="Ready / warning / incomplete" value={`${result.inputSummary.readyCount} / ${result.inputSummary.warningCount} / ${result.inputSummary.incompleteCount}`} />
          <InputRow label="Routing" value={result.inputSummary.routingMode ?? "Not set"} />
          <InputRow label="Authentication direction" value={result.inputSummary.authMethod ?? "Not set"} />
          <InputRow label="Rows with explicit edits" value={String(result.inputSummary.explicitRowOverrides)} />
          <InputRow label="Request overrides" value={String(result.inputSummary.requestOverrides)} />
        </dl>
      </details>

      <Notice text={result.notice} compact />

      {/* ── Footer ─────────────────────────────────────────────────────────── */}
      <div className="bs-row" style={{ gap: 10, justifyContent: "flex-end", flexWrap: "wrap" }}>
        {applyDisabledReason && (
          <p style={{ ...GF, margin: 0, marginRight: "auto", fontSize: 12.5, color: BS.slate5, maxWidth: 320, lineHeight: 1.5 }}>
            {applyDisabledReason}
          </p>
        )}
        <button type="button" className="bs-btn bs-btn-secondary" onClick={onClose} disabled={applying}>
          Close
        </button>
        <button type="button" className="bs-btn bs-btn-primary"
          disabled={!!applyDisabledReason}
          aria-disabled={!!applyDisabledReason}
          title={applyDisabledReason ?? undefined}
          onClick={() => onApply(selected)}>
          {applying ? "Applying…" : `Apply ${selected.length} selected`}
        </button>
      </div>

      {blockingConflicts.length > 0 && (
        <Notice tone={TONES.error}
          text={`${blockingConflicts.length} blocking ${blockingConflicts.length === 1 ? "conflict" : "conflicts"} must be resolved in Automation before this preview can be relied on. Blocking conflicts cannot be dismissed here.`} />
      )}
    </div>
  );
}

// ── Cards ─────────────────────────────────────────────────────────────────────

function RequirementCard({ requirement: r }: { requirement: PolicyRequirement }) {
  return (
    <div className="bs-card" style={{
      padding: 14,
      background: r.blocking ? BS.errorBg : BS.warnBg,
      borderColor: r.blocking ? BS.errorBorder : BS.warnBorder,
    }}>
      <div className="bs-row" style={{ gap: 8, marginBottom: 6 }}>
        <ShieldCheck size={14} aria-hidden style={{ color: r.blocking ? BS.errorText : BS.warnText }} />
        {/* Mandatory versus optional is stated in words. */}
        <span style={{
          ...GF, fontSize: 11.5, fontWeight: 700, padding: "2px 8px", borderRadius: 100,
          background: BS.white, color: r.blocking ? BS.errorText : BS.warnText,
          border: `1px solid ${r.blocking ? BS.errorBorder : BS.warnBorder}`,
        }}>
          {r.blocking ? "Required by Policy — blocking" : "Required by Policy"}
        </span>
      </div>
      <p style={{ ...GF, margin: "0 0 4px", fontSize: 14, fontWeight: 700, color: BS.navy }}>{r.title}</p>
      <p style={{ ...GF, margin: "0 0 8px", fontSize: 12.5, color: BS.slate6, lineHeight: 1.65 }}>{r.explanation}</p>
      <p style={{ ...GF, margin: 0, fontSize: 12.5, color: BS.slate6 }}>
        Current: <strong>{r.currentValue}</strong> · Required: <strong>{r.requiredValue}</strong>
      </p>
      <p style={{ ...GF, margin: "6px 0 0", fontSize: 12, color: BS.slate5 }}>
        Source: {r.policyName}
      </p>
    </div>
  );
}

function RecommendationCard({ rec, checked, disabled, onToggle, onDismiss }: {
  rec: AutomationRecommendation; checked: boolean; disabled: boolean;
  onToggle: () => void; onDismiss?: () => void;
}) {
  return (
    <div className="bs-card" style={{ padding: 14, background: rec.applicable ? BS.white : BS.slate0 }}>
      <div className="bs-row" style={{ gap: 10, alignItems: "flex-start", flexWrap: "nowrap" }}>
        {rec.applicable ? (
          <input type="checkbox" checked={checked} disabled={disabled} onChange={onToggle}
            aria-label={`Accept recommendation: ${rec.title}`}
            style={{ width: 18, height: 18, marginTop: 3, accentColor: BS.azure, flexShrink: 0 }} />
        ) : (
          <Sparkles size={16} aria-hidden style={{ color: BS.slate4, marginTop: 3, flexShrink: 0 }} />
        )}
        <div style={{ minWidth: 0, flex: 1 }}>
          <span style={{
            ...GF, display: "inline-block", fontSize: 11.5, fontWeight: 700, padding: "2px 8px",
            borderRadius: 100, marginBottom: 6,
            background: BS.azureSoft, color: "#0369A1", border: `1px solid ${BS.azureBorder}`,
          }}>
            Automation recommendation — optional
          </span>
          <p style={{ ...GF, margin: "0 0 4px", fontSize: 14, fontWeight: 700, color: BS.navy }}>{rec.title}</p>
          <p style={{ ...GF, margin: "0 0 8px", fontSize: 12.5, color: BS.slate6, lineHeight: 1.65 }}>{rec.reason}</p>
          <p style={{ ...GF, margin: 0, fontSize: 12.5, color: BS.slate6 }}>
            Current: <strong>{rec.currentValue}</strong> → Proposed: <strong>{rec.proposedValue}</strong>
          </p>
          {rec.unsupportedReason && (
            <p style={{ ...GF, margin: "6px 0 0", fontSize: 12, color: BS.warnText, lineHeight: 1.5 }}>
              {rec.unsupportedReason}
            </p>
          )}
          {rec.conflictsWith && (
            <p style={{ ...GF, margin: "6px 0 0", fontSize: 12, color: BS.warnText }}>
              This recommendation conflicts with another active definition.
            </p>
          )}
          {onDismiss && rec.applicable && !disabled && (
            <button type="button" className="bs-btn bs-btn-ghost bs-btn-sm" style={{ marginTop: 8 }}
              onClick={onDismiss} aria-label={`Dismiss optional recommendation: ${rec.title}`}>
              Dismiss
            </button>
          )}
        </div>
      </div>
    </div>
  );
}

function ConflictCard({ conflict: c }: { conflict: ResolutionConflictView }) {
  return (
    <div className="bs-card" style={{
      padding: 14,
      background: c.blocking ? BS.errorBg : BS.warnBg,
      borderColor: c.blocking ? BS.errorBorder : BS.warnBorder,
    }}>
      <div className="bs-row" style={{ gap: 8, marginBottom: 6 }}>
        <AlertTriangle size={14} aria-hidden style={{ color: c.blocking ? BS.errorText : BS.warnText }} />
        <span style={{ ...GF, fontSize: 11.5, fontWeight: 700, color: c.blocking ? BS.errorText : BS.warnText }}>
          {c.blocking
            ? "Blocking conflict — cannot be dismissed"
            : c.affectedThisEvaluation ? "Conflict" : "Workspace conflict — did not affect this evaluation"}
        </span>
      </div>
      <p style={{ ...GF, margin: "0 0 4px", fontSize: 14, fontWeight: 700, color: BS.navy }}>{c.title}</p>
      <p style={{ ...GF, margin: "0 0 6px", fontSize: 12.5, color: BS.slate6, lineHeight: 1.65 }}>{c.explanation}</p>
      <p style={{ ...GF, margin: 0, fontSize: 12, color: BS.slate5 }}>
        {c.kind} · Involves {c.sources.join(" and ")}
      </p>
    </div>
  );
}

// ── Small helpers ─────────────────────────────────────────────────────────────

function Count({ label, n }: { label: string; n: number }) {
  return (
    <span style={{
      ...GF, fontSize: 12, padding: "4px 10px", borderRadius: 100,
      background: BS.slate0, border: `1px solid ${BS.slate2}`, color: BS.slate6,
    }}>
      {n} {label}
    </span>
  );
}

function InputRow({ label, value }: { label: string; value: string }) {
  return (
    <div>
      <dt style={{ display: "inline", fontWeight: 600 }}>{label}: </dt>
      <dd style={{ display: "inline", margin: 0 }}>{value}</dd>
    </div>
  );
}

/** Shown on the batch overview when resolution has not been run yet. */
export function ResolutionSummaryRow({ status, blocking, onOpen, evaluating }: {
  status: string; blocking: number; onOpen: () => void; evaluating: boolean;
}) {
  return (
    <div className="bs-row" style={{ justifyContent: "space-between", gap: 10, flexWrap: "wrap" }}>
      <span className="bs-row" style={{ gap: 8 }}>
        {blocking > 0
          ? <AlertTriangle size={15} aria-hidden style={{ color: BS.errorText }} />
          : <CheckCircle2 size={15} aria-hidden style={{ color: BS.successText }} />}
        <span style={{ ...GF, fontSize: 13, color: BS.slate7 }}>
          {status}
          {blocking > 0 && ` · ${blocking} blocking ${blocking === 1 ? "issue" : "issues"}`}
        </span>
      </span>
      <button type="button" className="bs-btn bs-btn-secondary bs-btn-sm" onClick={onOpen} disabled={evaluating}>
        {evaluating ? "Evaluating…" : "Review"}
      </button>
    </div>
  );
}
