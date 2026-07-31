// Recipient row editing — Gap Closure Command 2.
//
// Wires the EXISTING `bulkSendService.updateRecipientRow` into a real editing
// interface. It creates no second recipient-row service, no second row model, no
// second form architecture, and no data-grid dependency.
//
// What editing does and does not touch:
//   - Editing changes ONLY `row.values` on the current frontend batch draft.
//   - `row.originalValues` is never written, so the projected source values stay
//     available for comparison and for Revert.
//   - The originating record is never modified: not the Contact, not the Contact
//     Group or its membership, not the local CSV file, not the pasted text, not
//     the Demonstration Dataset fixture.
//   - Nothing is sent, invited, notified, synchronized, or persisted.
//
// Validation, duplicate detection, mapping status and readiness summaries are NOT
// recomputed here — `updateRecipientRow` calls the service's `refresh()`, which
// runs the canonical engine over the whole batch. Duplicating any of that in the
// editor would let the two disagree.

import { useCallback, useMemo, useState } from "react";
import type { BulkSendBatch, BulkSendRecipientRow, BulkSendRoleMapping } from "../../models/bulk-send";
import { BULK_SEND_ROLE_FIELD_ALIASES, normalizeBulkSendText } from "../../models/bulk-send";
import { isValidEmailDirection } from "../../utils/tabular-import";
import { BS, GF } from "./BulkSendKit";

export const ROW_VALUE_MAX = 500;

// ── Which columns mean what ───────────────────────────────────────────────────

export interface EditableColumn {
  id: string;
  header: string;
  /** Derived from the canonical role mappings, never guessed from header text. */
  kind: "name" | "email" | "organization" | "other";
  required: boolean;
}

/**
 * Editable columns come from the batch schema. Their meaning comes from the
 * canonical role mappings first — the same source `readRoleField` and the
 * duplicate detector read.
 *
 * A batch created without a Template has NO role mappings, so that lookup
 * classifies every column as "other". That would silently disable email-format
 * checking and required-field checking for exactly the batches most likely to
 * contain hand-entered mistakes. The fallback therefore consults
 * `BULK_SEND_ROLE_FIELD_ALIASES` against the schema's own `normalizedHeader` —
 * the same alias table and the same normalized text the deterministic mapping
 * suggester uses, so this is reused canonical logic, not header guesswork.
 */
export function deriveEditableColumns(batch: BulkSendBatch): EditableColumn[] {
  const columns = batch.schema?.columns ?? [];
  const mappings: BulkSendRoleMapping[] = batch.roleMappings ?? [];

  const nameIds = new Set<string>();
  const emailIds = new Set<string>();
  const orgIds = new Set<string>();
  const requiredIds = new Set<string>();

  for (const m of mappings) {
    const byField = m.columnByField ?? ({} as BulkSendRoleMapping["columnByField"]);
    if (byField.displayName) { nameIds.add(String(byField.displayName)); if (m.required) requiredIds.add(String(byField.displayName)); }
    if (byField.email)       { emailIds.add(String(byField.email));       if (m.required) requiredIds.add(String(byField.email)); }
    if (byField.organization) orgIds.add(String(byField.organization));
  }

  const aliasKind = (normalizedHeader: string): EditableColumn["kind"] => {
    const h = (normalizedHeader ?? "").trim();
    if (!h) return "other";
    if (BULK_SEND_ROLE_FIELD_ALIASES.email.includes(h)) return "email";
    if (BULK_SEND_ROLE_FIELD_ALIASES.displayName.includes(h)) return "name";
    if (BULK_SEND_ROLE_FIELD_ALIASES.organization.includes(h)) return "organization";
    return "other";
  };

  return columns.map((c) => {
    const id = String(c.id);
    const mapped: EditableColumn["kind"] =
      emailIds.has(id) ? "email" : nameIds.has(id) ? "name" : orgIds.has(id) ? "organization" : "other";
    const kind = mapped !== "other" ? mapped : aliasKind(c.normalizedHeader);
    return {
      id,
      header: c.header,
      kind,
      // A mapped role marks its own required fields. Without a Template, a
      // recipient still cannot be delivered to without an address, so an
      // alias-identified email column is treated as required.
      required: requiredIds.has(id) || (mappings.length === 0 && kind === "email"),
    };
  });
}

// ── Draft override detection ──────────────────────────────────────────────────

/**
 * Computed by comparing current values against the projected source values rather
 * than reading `row.editedInSession`. That flag is set by the service on every
 * write and never cleared, so after a Revert it would keep claiming the row was
 * overridden when its values once again match the source.
 */
export function overriddenColumnIds(row: BulkSendRecipientRow, columns: EditableColumn[]): string[] {
  return columns
    .filter((c) => (row.values[c.id] ?? "") !== (row.originalValues[c.id] ?? ""))
    .map((c) => c.id);
}

export function hasDraftOverrides(row: BulkSendRecipientRow, columns: EditableColumn[]): boolean {
  return overriddenColumnIds(row, columns).length > 0;
}

// ── Pre-commit validation ─────────────────────────────────────────────────────
//
// Deliberately thin. Full validation belongs to the engine and runs on save. This
// only catches what would otherwise be committed and then reported after the fact,
// and it uses the SAME email helper the CSV path uses so the two cannot disagree.

export type RowFieldErrors = Record<string, string>;

export function validateRowDraft(values: Record<string, string>, columns: EditableColumn[]): RowFieldErrors {
  const errors: RowFieldErrors = {};
  for (const c of columns) {
    const raw = values[c.id] ?? "";
    const v = raw.trim();
    if (c.required && v.length === 0) {
      errors[c.id] = `${c.header} is required for this recipient.`;
      continue;
    }
    if (v.length === 0) continue;
    if (raw.length > ROW_VALUE_MAX) {
      errors[c.id] = `${c.header} is too long. Keep it under ${ROW_VALUE_MAX} characters.`;
      continue;
    }
    if (c.kind === "email" && !isValidEmailDirection(v)) {
      errors[c.id] = "Enter a valid email address, for example name@example.com.";
    }
  }
  return errors;
}

// ── Editor state ──────────────────────────────────────────────────────────────

export interface RowEditorState {
  rowId: string | null;
  values: Record<string, string>;
  errors: RowFieldErrors;
  saving: boolean;
  saveError: string | null;
}

const EMPTY: RowEditorState = { rowId: null, values: {}, errors: {}, saving: false, saveError: null };

export interface UseRowEditorOptions {
  batch: BulkSendBatch | null;
  columns: EditableColumn[];
  /** Calls the canonical service. Returns true when the batch was updated. */
  commit: (rowId: string, values: Record<string, string>) => Promise<{ ok: boolean; message?: string }>;
  announce: (message: string) => void;
  /** Asked to confirm before meaningful edits are discarded. */
  confirmDiscard: (onConfirm: () => void) => void;
}

export function useRowEditor({ batch, columns, commit, announce, confirmDiscard }: UseRowEditorOptions) {
  const [state, setState] = useState<RowEditorState>(EMPTY);

  const editingRow = useMemo(
    () => (state.rowId ? batch?.rows.find((r) => String(r.id) === state.rowId) ?? null : null),
    [batch, state.rowId],
  );

  /** True when the working copy differs from what is currently stored on the row. */
  const isDirty = useMemo(() => {
    if (!editingRow) return false;
    return columns.some((c) => (state.values[c.id] ?? "") !== (editingRow.values[c.id] ?? ""));
  }, [editingRow, columns, state.values]);

  const open = useCallback((row: BulkSendRecipientRow) => {
    const seed: Record<string, string> = {};
    for (const c of columns) seed[c.id] = row.values[c.id] ?? "";
    setState({ rowId: String(row.id), values: seed, errors: {}, saving: false, saveError: null });
  }, [columns]);

  /** Guarded entry point — protects unsaved edits when moving to another row. */
  const requestOpen = useCallback((row: BulkSendRecipientRow) => {
    if (state.rowId && state.rowId !== String(row.id) && isDirty) {
      confirmDiscard(() => open(row));
      return;
    }
    open(row);
  }, [state.rowId, isDirty, confirmDiscard, open]);

  const close = useCallback(() => setState(EMPTY), []);

  const requestClose = useCallback(() => {
    if (isDirty) { confirmDiscard(() => setState(EMPTY)); return; }
    setState(EMPTY);
  }, [isDirty, confirmDiscard]);

  const setField = useCallback((columnId: string, value: string) => {
    setState((s) => ({
      ...s,
      values: { ...s.values, [columnId]: value.slice(0, ROW_VALUE_MAX) },
      // Clear this field's error as soon as the user starts correcting it.
      errors: s.errors[columnId] ? { ...s.errors, [columnId]: "" } : s.errors,
      saveError: null,
    }));
  }, []);

  const save = useCallback(async () => {
    if (!state.rowId || state.saving) return;   // blocks duplicate submission

    const errors = validateRowDraft(state.values, columns);
    const firstBad = columns.find((c) => errors[c.id]);
    if (firstBad) {
      // Edit mode stays open and the entered values are preserved.
      setState((s) => ({ ...s, errors }));
      announce("This row has a problem that needs correcting.");
      window.setTimeout(() => {
        document.getElementById(`rowedit-${firstBad.id}`)?.focus();
      }, 40);
      return;
    }

    setState((s) => ({ ...s, saving: true, saveError: null, errors: {} }));

    const normalized: Record<string, string> = {};
    for (const c of columns) normalized[c.id] = normalizeBulkSendText(state.values[c.id] ?? "", ROW_VALUE_MAX);

    const result = await commit(state.rowId, normalized);

    if (result.ok) {
      setState(EMPTY);
      announce("Recipient row updated in this draft. Validation and duplicates were rechecked.");
    } else {
      // Entered values are kept so nothing the user typed is lost.
      setState((s) => ({ ...s, saving: false, saveError: result.message ?? "That row could not be updated." }));
      announce("The row could not be updated.");
    }
  }, [state.rowId, state.saving, state.values, columns, commit, announce]);

  /**
   * Restores the values this row was projected with. Goes through the SAME service
   * method as Save so there is one write path, and the engine revalidates exactly
   * as it does for any other edit.
   */
  const revert = useCallback(async (row: BulkSendRecipientRow) => {
    const restored: Record<string, string> = {};
    for (const c of columns) restored[c.id] = row.originalValues[c.id] ?? "";
    setState((s) => (s.rowId === String(row.id) ? { ...s, saving: true, saveError: null } : s));
    const result = await commit(String(row.id), restored);
    if (result.ok) {
      setState(EMPTY);
      announce("Row restored to the values it was created with. The source record was not changed.");
    } else {
      setState((s) => ({ ...s, saving: false, saveError: result.message ?? "That row could not be restored." }));
    }
  }, [columns, commit, announce]);

  /** Called on workspace switch, sign-out, account change, and session expiry. */
  const reset = useCallback(() => setState(EMPTY), []);

  return { state, editingRow, isDirty, requestOpen, requestClose, close, setField, save, revert, reset };
}

// ── Field controls ────────────────────────────────────────────────────────────
//
// ONE implementation, rendered by both the desktop inline row and the mobile
// sheet, so the two can never drift apart. Only one of the two is ever mounted
// (chosen by useIsMobile), so no hidden duplicate is focusable.

export interface RowFieldProps {
  column: EditableColumn;
  value: string;
  error?: string;
  disabled?: boolean;
  overridden?: boolean;
  /** `inline` is compact for a table cell; `stacked` shows a visible label. */
  variant: "inline" | "stacked";
  onChange: (value: string) => void;
  onEnterSave?: () => void;
}

export function RowField({
  column, value, error, disabled, overridden, variant, onChange, onEnterSave,
}: RowFieldProps) {
  const id = `rowedit-${column.id}`;
  const errId = `${id}-err`;
  const stacked = variant === "stacked";

  return (
    <div style={{ minWidth: 0, width: "100%" }}>
      {stacked ? (
        <label htmlFor={id} style={{ ...GF, display: "block", fontSize: 12.5, fontWeight: 700, color: BS.slate7, marginBottom: 5 }}>
          {column.header}
          {column.required && <span style={{ color: BS.errorText }} aria-hidden> *</span>}
          {column.required && <span className="bs-visually-hidden"> (required)</span>}
        </label>
      ) : (
        // The table already has a column header; repeating it visually would be
        // noise, but the control still needs an accessible name.
        <label htmlFor={id} className="bs-visually-hidden">
          {column.header}{column.required ? " (required)" : ""}
        </label>
      )}
      <input
        id={id}
        type={column.kind === "email" ? "email" : "text"}
        inputMode={column.kind === "email" ? "email" : undefined}
        autoComplete="off"
        spellCheck={column.kind === "email" ? false : undefined}
        className="bs-input"
        value={value}
        disabled={disabled}
        maxLength={ROW_VALUE_MAX}
        aria-invalid={error ? true : undefined}
        aria-describedby={error ? errId : undefined}
        onChange={(e) => onChange(e.target.value)}
        onKeyDown={(e) => {
          // Enter saves. Safe here: every control is a single-line input, with no
          // combobox or textarea to swallow the key.
          if (e.key === "Enter" && onEnterSave) { e.preventDefault(); onEnterSave(); }
        }}
        style={{
          minHeight: 44,
          fontSize: stacked ? 14 : 13,
          padding: stacked ? "10px 12px" : "8px 10px",
          borderColor: error ? BS.errorText : undefined,
        }}
      />
      {error && (
        <p id={errId} role="alert" style={{ ...GF, margin: "5px 0 0", fontSize: 12, color: BS.errorText, lineHeight: 1.5 }}>
          {error}
        </p>
      )}
      {!error && overridden && (
        // Text, not colour or icon alone.
        <p style={{ ...GF, margin: "4px 0 0", fontSize: 11.5, color: BS.slate5 }}>
          Draft override
        </p>
      )}
    </div>
  );
}

/**
 * True when the batch has no mapped email column, which is the case for any batch
 * created without a Template.
 *
 * The canonical duplicate detector keys its email rule on
 * `roleMapping.columnByField.email` and skips any mapping without one, so in that
 * state editing an address cannot raise a duplicate. That is a pre-existing
 * characteristic of the engine affecting every recipient source equally, not
 * something row editing introduced — but a user correcting addresses deserves to
 * know the check is not running rather than to infer safety from silence.
 */
export function emailDuplicateCheckingUnavailable(batch: BulkSendBatch): boolean {
  const mappings = batch.roleMappings ?? [];
  return !mappings.some((m) => !!m.columnByField?.email);
}

export function DuplicateCheckNotice() {
  return (
    <p style={{ ...GF, margin: 0, fontSize: 12, color: BS.slate5, lineHeight: 1.6 }}>
      Duplicate checking by email address begins once a Template is selected and its
      email column is mapped. Until then, edits are saved and validated but repeated
      addresses are not flagged.
    </p>
  );
}

/** Read-only provenance, kept visibly separate from anything editable. */
export function RowProvenance({ row, groupLabel }: { row: BulkSendRecipientRow; groupLabel?: string | null }) {
  const bits: string[] = [`Row ${row.rowNumber}`];
  if (row.contactId) bits.push("From a Contact");
  if (row.contactGroupId) bits.push(groupLabel ? `From group ${groupLabel}` : "From a Contact Group");
  return (
    <div style={{ padding: "10px 12px", borderRadius: 8, background: BS.slate0, border: `1px solid ${BS.slate2}` }}>
      <p style={{ ...GF, margin: 0, fontSize: 12, fontWeight: 700, color: BS.slate6 }}>Source (read only)</p>
      <p style={{ ...GF, margin: "4px 0 0", fontSize: 12.5, color: BS.slate6, lineHeight: 1.6 }}>
        {bits.join(" · ")}
      </p>
      <p style={{ ...GF, margin: "6px 0 0", fontSize: 12, color: BS.slate5, lineHeight: 1.6 }}>
        Editing changes this recipient row in the current preparation draft only.
        The source record is not changed.
      </p>
    </div>
  );
}
