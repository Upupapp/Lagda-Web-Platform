// Request Defaults editor — Gap Closure Command 3. Frontend demonstration only.
//
// Edits the defaults that apply to the CURRENT preparation draft. It does not
// resolve precedence — `BULK_SEND_DEFAULT_PRECEDENCE` and the service's
// `buildDefaults()` remain the only authorities — and it does not recompute
// validation, duplicates, mapping or readiness, because the service's `refresh()`
// already does that on every write.
//
// Scope boundaries, all enforced rather than described:
//   - Editing a default NEVER rewrites a recipient row the user edited. A default
//     is a fallback; explicit row values win, and the count of rows keeping their
//     own values is shown before Save.
//   - The Command 32 Policy and Automation engine is NOT called. Both are declared
//     members of the source union and both sit in the precedence order, but no code
//     produces them, so they are reported as unevaluated rather than simulated.
//   - Workspace-level defaults are NOT editable, because the canonical
//     WorkspaceSettings model holds no request or signing defaults. Inventing a
//     store would be a second Organization Settings architecture.

import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { AlertTriangle, RotateCcw, X } from "lucide-react";
import type { BulkSendBatch } from "../../models/bulk-send";
import {
  DEFAULT_CATEGORIES,
  DEFAULT_CATEGORY_LABELS,
  DEFAULT_FIELD_DEFINITIONS,
  FRONTEND_ONLY_NOTICE,
  ORGANIZATION_SCOPE_NOTICE,
  POLICY_AUTOMATION_NOTICE,
  buildChangePreview,
  countRowsWithExplicitOverrides,
  describeSource,
  formatDefaultValue,
  isRequestOverride,
  normalizeDefaultValue,
  readDefaultSource,
  readDefaultValue,
  validateDefaultsDraft,
  type DefaultFieldDefinition,
  type DefaultFieldId,
  type DefaultValidationIssue,
} from "../../services/bulk-send-defaults";
import { BS, GF, Notice, SectionHeading, TONES } from "./BulkSendKit";

export type DefaultsScope = "request" | "workspace";

export interface RequestDefaultsEditorProps {
  batch: BulkSendBatch;
  canEdit: boolean;
  /** Read-only reason when defaults cannot be changed in this batch state. */
  readOnlyReason: string | null;
  busy: boolean;
  onClose: () => void;
  onSave: (overrides: Partial<Record<DefaultFieldId, unknown>>) => Promise<{ ok: boolean; message?: string }>;
  onRestore: (fields: DefaultFieldId[] | "all") => Promise<{ ok: boolean; message?: string }>;
  confirmDiscard: (onConfirm: () => void) => void;
  confirmReset: (count: number, onConfirm: () => void) => void;
  announce: (message: string) => void;
}

export function RequestDefaultsEditor({
  batch, canEdit, readOnlyReason, busy, onClose, onSave, onRestore,
  confirmDiscard, confirmReset, announce,
}: RequestDefaultsEditorProps) {
  const panelRef = useRef<HTMLDivElement>(null);
  const prevFocus = useRef<HTMLElement | null>(null);

  const [scope, setScope] = useState<DefaultsScope>("request");
  const [category, setCategory] = useState(DEFAULT_CATEGORIES[0]);
  const [draft, setDraft] = useState<Partial<Record<DefaultFieldId, unknown>>>({});
  const [saving, setSaving] = useState(false);
  const [saveError, setSaveError] = useState<string | null>(null);

  const resolved = batch.defaults;

  // ── Focus containment ──────────────────────────────────────────────────────
  useEffect(() => {
    prevFocus.current = document.activeElement as HTMLElement | null;
    const t = window.setTimeout(() => panelRef.current?.focus(), 60);
    return () => {
      window.clearTimeout(t);
      const el = prevFocus.current;
      if (el && el.isConnected) el.focus();
    };
  }, []);

  const requestClose = useCallback(() => {
    if (Object.keys(draft).length > 0) { confirmDiscard(onClose); return; }
    onClose();
  }, [draft, confirmDiscard, onClose]);

  useEffect(() => {
    function onKey(e: KeyboardEvent) {
      if (e.key === "Escape") { e.stopPropagation(); requestClose(); return; }
      if (e.key !== "Tab" || !panelRef.current) return;
      const f = panelRef.current.querySelectorAll<HTMLElement>(
        'a[href],button:not([disabled]),input:not([disabled]),select:not([disabled]),textarea:not([disabled]),[tabindex]:not([tabindex="-1"])');
      if (f.length === 0) return;
      const first = f[0], last = f[f.length - 1];
      if (!first || !last) return;
      if (e.shiftKey && document.activeElement === first) { e.preventDefault(); last.focus(); }
      else if (!e.shiftKey && document.activeElement === last) { e.preventDefault(); first.focus(); }
    }
    document.addEventListener("keydown", onKey, true);
    return () => document.removeEventListener("keydown", onKey, true);
  }, [requestClose]);

  // ── Derived ────────────────────────────────────────────────────────────────
  const issues = useMemo(() => validateDefaultsDraft(draft), [draft]);
  const blocking = issues.filter((i) => i.severity === "blocking");
  const changes = useMemo(() => buildChangePreview(batch, draft), [batch, draft]);
  const rowsKeeping = useMemo(() => countRowsWithExplicitOverrides(batch), [batch]);

  const overrideCount = useMemo(() => {
    if (!resolved) return 0;
    return DEFAULT_FIELD_DEFINITIONS.filter((d) => isRequestOverride(readDefaultSource(resolved, d.id))).length;
  }, [resolved]);

  const sourceCounts = useMemo(() => {
    const counts: Record<string, number> = {};
    if (!resolved) return counts;
    for (const d of DEFAULT_FIELD_DEFINITIONS) {
      const s = describeSource(readDefaultSource(resolved, d.id));
      counts[s] = (counts[s] ?? 0) + 1;
    }
    return counts;
  }, [resolved]);

  const editable = canEdit && !readOnlyReason;

  const saveDisabledReason =
    readOnlyReason ? readOnlyReason
    : !canEdit ? "You do not have permission to change defaults for this batch."
    : busy ? "Another change is still being applied."
    : blocking.length > 0 ? "Fix the highlighted problem before saving."
    : Object.keys(draft).length === 0 ? "Change a value to enable saving."
    : null;

  const setField = (id: DefaultFieldId, value: unknown) => {
    setDraft((d) => ({ ...d, [id]: value }));
    setSaveError(null);
  };

  const clearField = (id: DefaultFieldId) => {
    setDraft((d) => { const n = { ...d }; delete n[id]; return n; });
  };

  const handleSave = async () => {
    if (saving || blocking.length > 0 || Object.keys(draft).length === 0) return;
    setSaving(true); setSaveError(null);

    const normalized: Partial<Record<DefaultFieldId, unknown>> = {};
    for (const [k, v] of Object.entries(draft)) {
      const def = DEFAULT_FIELD_DEFINITIONS.find((d) => d.id === k);
      if (def) normalized[def.id] = normalizeDefaultValue(def, v);
    }

    const result = await onSave(normalized);
    setSaving(false);
    if (result.ok) {
      setDraft({});
      announce("Request Defaults updated in this preparation draft.");
    } else {
      // Entered values are preserved.
      setSaveError(result.message ?? "Those defaults could not be updated.");
      announce("The defaults could not be updated.");
    }
  };

  const handleRestoreField = async (id: DefaultFieldId) => {
    clearField(id);
    const r = await onRestore([id]);
    if (r.ok) announce("Value restored to what this request inherits.");
    else setSaveError(r.message ?? "That value could not be restored.");
  };

  const restoreAllOverrides = async () => {
    setDraft({});
    const r = await onRestore("all");
    if (r.ok) announce("All request overrides removed. Values are inherited again.");
    else setSaveError(r.message ?? "The overrides could not be removed.");
  };

  const handleResetAll = () => {
    // `confirmReset` hands back a synchronous callback, so the restore is
    // started here rather than awaited by the dialog.
    confirmReset(overrideCount, () => { void restoreAllOverrides(); });
  };

  const fieldsInCategory = DEFAULT_FIELD_DEFINITIONS.filter((d) => d.category === category);

  return (
    <div className="bs-panel" ref={panelRef} tabIndex={-1} role="group" aria-label="Defaults" style={{ outline: "none" }}>
      {/* ── Header ─────────────────────────────────────────────────────────── */}
      <div className="bs-row" style={{ justifyContent: "space-between", alignItems: "flex-start", marginBottom: 14 }}>
        <div style={{ minWidth: 0 }}>
          <h2 style={{ ...GF, margin: 0, fontSize: 16, fontWeight: 700, color: BS.navy }}>Defaults</h2>
          <p style={{ ...GF, margin: "4px 0 0", fontSize: 12.5, color: BS.slate5 }}>
            {batch.name}
            {Object.keys(draft).length > 0 && " · Unsaved changes"}
          </p>
        </div>
        <button type="button" className="bs-btn bs-btn-ghost" onClick={requestClose}
          aria-label="Close defaults editor" style={{ minHeight: 44, width: 44, padding: 0 }}>
          <X size={18} aria-hidden />
        </button>
      </div>

      {/* ── Scope selector ─────────────────────────────────────────────────── */}
      <div role="tablist" aria-label="Defaults scope" className="bs-row" style={{ gap: 6, marginBottom: 14 }}>
        {(["request", "workspace"] as DefaultsScope[]).map((s) => (
          <button key={s} type="button" role="tab" aria-selected={scope === s}
            className={`bs-btn bs-btn-sm ${scope === s ? "bs-btn-primary" : "bs-btn-secondary"}`}
            onClick={() => setScope(s)}>
            {s === "request" ? "This Request" : "Workspace Defaults"}
          </button>
        ))}
      </div>

      {scope === "workspace" ? (
        // Honest unavailable state. Not an error, and it does not pretend a
        // restricted setting is being withheld.
        <div className="bs-stack">
          <Notice text={ORGANIZATION_SCOPE_NOTICE} />
          <p style={{ ...GF, margin: 0, fontSize: 13, color: BS.slate6, lineHeight: 1.7 }}>
            Nothing here is hidden from you by permission. There is simply no
            workspace-level value for these fields to inherit from yet.
          </p>
          <div>
            <button type="button" className="bs-btn bs-btn-secondary bs-btn-sm" onClick={() => setScope("request")}>
              Back to this request
            </button>
          </div>
        </div>
      ) : !resolved ? (
        <Notice text="This batch has no resolved defaults yet. Select a Template, or add recipients, and they will appear here." />
      ) : (
        <div className="bs-stack">
          {/* ── Summary ────────────────────────────────────────────────────── */}
          <div className="bs-row" style={{ gap: 8 }}>
            {Object.entries(sourceCounts).map(([label, n]) => (
              <span key={label} style={{
                ...GF, fontSize: 12, padding: "4px 10px", borderRadius: 100,
                background: BS.slate0, border: `1px solid ${BS.slate2}`, color: BS.slate6,
              }}>
                {n} {label}
              </span>
            ))}
          </div>

          {readOnlyReason && <Notice text={readOnlyReason} tone={TONES.warning} />}
          {!canEdit && !readOnlyReason && (
            <Notice text="You do not have permission to change defaults for this batch." tone={TONES.warning} />
          )}

          <Notice text={POLICY_AUTOMATION_NOTICE} />

          {rowsKeeping > 0 && (
            <Notice
              tone={TONES.neutral}
              text={`${rowsKeeping} recipient ${rowsKeeping === 1 ? "row has" : "rows have"} values edited directly. Those keep their own values — changing a default never overwrites them.`}
            />
          )}

          {/* ── Category navigation ────────────────────────────────────────── */}
          <div role="tablist" aria-label="Default categories" className="bs-row bs-scroll-x"
            style={{ gap: 6, flexWrap: "nowrap", paddingBottom: 2 }}>
            {DEFAULT_CATEGORIES.map((c) => (
              <button key={c} type="button" role="tab" aria-selected={category === c}
                className={`bs-btn bs-btn-sm ${category === c ? "bs-btn-primary" : "bs-btn-secondary"}`}
                onClick={() => setCategory(c)}>
                {DEFAULT_CATEGORY_LABELS[c]}
              </button>
            ))}
          </div>

          {/* ── Fields ─────────────────────────────────────────────────────── */}
          <div className="bs-stack" style={{ gap: 18 }}>
            {fieldsInCategory.map((def) => (
              <DefaultFieldRow
                key={def.id}
                def={def}
                effectiveValue={readDefaultValue(resolved, def.id)}
                effectiveSource={readDefaultSource(resolved, def.id)}
                draftValue={def.id in draft ? draft[def.id] : undefined}
                issue={issues.find((i) => i.field === def.id)}
                disabled={!editable || saving || busy}
                onChange={(v) => setField(def.id, v)}
                onClearDraft={() => clearField(def.id)}
                onRestore={() => void handleRestoreField(def.id)}
              />
            ))}
          </div>

          {/* ── Impact preview ─────────────────────────────────────────────── */}
          {changes.length > 0 && (
            <div className="bs-card" style={{ padding: 14 }}>
              <SectionHeading level={3} title="What will change"
                description="Review before saving. Values are recalculated in this frontend draft only." />
              <ul style={{ listStyle: "none", margin: 0, padding: 0, display: "flex", flexDirection: "column", gap: 10 }}>
                {changes.map((c) => (
                  <li key={c.field} style={{ borderLeft: `3px solid ${BS.azureBorder}`, paddingLeft: 10 }}>
                    <p style={{ ...GF, margin: 0, fontSize: 13, fontWeight: 700, color: BS.navy }}>{c.label}</p>
                    <p style={{ ...GF, margin: "3px 0 0", fontSize: 12.5, color: BS.slate6, lineHeight: 1.6 }}>
                      {c.previousValue} → {c.nextValue}
                    </p>
                    <p style={{ ...GF, margin: "2px 0 0", fontSize: 12, color: BS.slate5 }}>
                      Source: {c.previousSource} → {c.nextSource} · {c.impactLabel}
                      {c.rowsKeepingOverrides > 0
                        ? ` · ${c.rowsKeepingOverrides} ${c.rowsKeepingOverrides === 1 ? "row keeps its own value" : "rows keep their own values"}`
                        : ""}
                    </p>
                  </li>
                ))}
              </ul>
              <div style={{ marginTop: 12 }}>
                <Notice text={FRONTEND_ONLY_NOTICE} compact />
              </div>
            </div>
          )}

          {issues.filter((i) => i.severity === "warning").map((i) => (
            <Notice key={i.code} tone={TONES.warning} text={`${i.message} ${i.action}`} />
          ))}

          {saveError && (
            <div role="alert" className="bs-card" style={{ padding: 12, background: BS.errorBg, borderColor: BS.errorBorder }}>
              <p style={{ ...GF, margin: 0, fontSize: 13, color: BS.errorText }}>{saveError}</p>
            </div>
          )}

          {/* ── Footer ─────────────────────────────────────────────────────── */}
          <div className="bs-row" style={{ gap: 10, justifyContent: "space-between", flexWrap: "wrap" }}>
            <button type="button" className="bs-btn bs-btn-ghost bs-btn-sm"
              disabled={!editable || overrideCount === 0 || saving || busy}
              title={overrideCount === 0 ? "This request has no overrides to reset." : undefined}
              onClick={handleResetAll}>
              <RotateCcw size={14} aria-hidden /> Reset all request overrides
            </button>
            <div className="bs-row" style={{ gap: 10 }}>
              {/* A disabled primary action always says why. */}
              {saveDisabledReason && !saving && (
                <p style={{ ...GF, margin: 0, fontSize: 12.5, color: BS.slate5, maxWidth: 320, lineHeight: 1.5 }}>
                  {saveDisabledReason}
                </p>
              )}
              <button type="button" className="bs-btn bs-btn-secondary" onClick={requestClose} disabled={saving}>
                Cancel
              </button>
              <button type="button" className="bs-btn bs-btn-primary"
                disabled={!!saveDisabledReason || saving}
                aria-disabled={!!saveDisabledReason || saving}
                title={saveDisabledReason ?? undefined}
                onClick={() => void handleSave()}>
                {saving ? "Saving…" : "Save changes"}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

// ── One field ─────────────────────────────────────────────────────────────────

function DefaultFieldRow({
  def, effectiveValue, effectiveSource, draftValue, issue, disabled,
  onChange, onClearDraft, onRestore,
}: {
  def: DefaultFieldDefinition;
  effectiveValue: unknown;
  effectiveSource: ReturnType<typeof readDefaultSource>;
  draftValue: unknown;
  issue?: DefaultValidationIssue;
  disabled: boolean;
  onChange: (v: unknown) => void;
  onClearDraft: () => void;
  onRestore: () => void;
}) {
  const id = `def-${def.id}`;
  const errId = `${id}-err`;
  const hasDraft = draftValue !== undefined;
  const isOverridden = isRequestOverride(effectiveSource);
  const current = hasDraft ? draftValue : effectiveValue;

  const unsupportedCurrent =
    def.valueType === "enum"
    && current !== null && current !== undefined && String(current) !== ""
    && !(def.options ?? []).some((o) => o.value === String(current));

  return (
    <div style={{ borderTop: `1px solid ${BS.slate2}`, paddingTop: 14 }}>
      <label htmlFor={id} style={{ ...GF, display: "block", fontSize: 13.5, fontWeight: 700, color: BS.navy }}>
        {def.label}
      </label>
      <p style={{ ...GF, margin: "3px 0 8px", fontSize: 12.5, color: BS.slate5, lineHeight: 1.6 }}>
        {def.description}
      </p>

      {/* Effective value + source, always as text — never colour or icon alone. */}
      <p style={{ ...GF, margin: "0 0 8px", fontSize: 12, color: BS.slate6 }}>
        Effective value: <strong>{formatDefaultValue(def, effectiveValue)}</strong>
        {" · "}Source: {describeSource(effectiveSource)}
        {def.directionOnly && " · Direction only"}
      </p>

      {def.valueType === "boolean" ? (
        <label className="bs-row" style={{ gap: 8, minHeight: 44, cursor: disabled ? "not-allowed" : "pointer" }}>
          <input id={id} type="checkbox" checked={!!current} disabled={disabled}
            onChange={(e) => onChange(e.target.checked)}
            style={{ width: 18, height: 18, accentColor: BS.azure }} />
          <span style={{ ...GF, fontSize: 13.5, color: BS.slate9 }}>
            {formatDefaultValue(def, current)}
          </span>
        </label>
      ) : def.valueType === "enum" ? (
        <>
          <select id={id} className="bs-select" disabled={disabled}
            value={String(current ?? "")}
            aria-invalid={issue ? true : undefined}
            aria-describedby={issue ? errId : undefined}
            onChange={(e) => onChange(e.target.value)}>
            {/* Some Template fixtures carry values outside the canonical union
                (for example an auth method of "email-code"). A <select> whose
                value matches no <option> silently renders the first one, so
                simply opening the editor and saving would change the setting
                without the user asking. Surface the real value instead. */}
            {unsupportedCurrent && (
              <option value={String(current)}>
                {String(current).replace(/-/g, " ")} — not a supported option
              </option>
            )}
            {def.options?.map((o) => <option key={o.value} value={o.value}>{o.label}</option>)}
          </select>
          {unsupportedCurrent && (
            <p style={{ ...GF, margin: "6px 0 0", fontSize: 12, color: BS.warnText, lineHeight: 1.5 }}>
              This batch inherited a value this product does not list. Choosing a
              supported option replaces it; leaving it alone changes nothing.
            </p>
          )}
        </>
      ) : def.valueType === "long-text" ? (
        <textarea id={id} className="bs-textarea" disabled={disabled}
          value={String(current ?? "")} maxLength={def.maxLength}
          aria-invalid={issue ? true : undefined}
          aria-describedby={issue ? errId : undefined}
          onChange={(e) => onChange(e.target.value)}
          style={{ fontFamily: "inherit", fontSize: 14, minHeight: 88 }} />
      ) : (
        <input id={id} type="text" className="bs-input" disabled={disabled}
          value={String(current ?? "")} maxLength={def.maxLength}
          aria-invalid={issue ? true : undefined}
          aria-describedby={issue ? errId : undefined}
          onChange={(e) => onChange(e.target.value)} />
      )}

      {issue && (
        <p id={errId} role="alert" style={{
          ...GF, margin: "6px 0 0", fontSize: 12, lineHeight: 1.5,
          color: issue.severity === "blocking" ? BS.errorText : BS.warnText,
        }}>
          <AlertTriangle size={12} aria-hidden style={{ verticalAlign: "-1px", marginRight: 4 }} />
          {issue.message} {issue.action}
        </p>
      )}

      <div className="bs-row" style={{ gap: 8, marginTop: 8 }}>
        {hasDraft && (
          <button type="button" className="bs-btn bs-btn-ghost bs-btn-sm" onClick={onClearDraft}
            aria-label={`Discard the unsaved change to ${def.label}`}>
            Undo this change
          </button>
        )}
        {isOverridden && !disabled && (
          <button type="button" className="bs-btn bs-btn-ghost bs-btn-sm" onClick={onRestore}
            aria-label={`Restore ${def.label} to its inherited value`}>
            Restore inherited value
          </button>
        )}
      </div>
    </div>
  );
}
