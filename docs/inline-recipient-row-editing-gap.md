# Inline recipient row editing

Gap Closure Command 2. Closes §17 gap 3 of
`docs/bulk-send-recipient-batches-mapping-validation-and-draft-projections.md`.
Frontend demonstration only.

---

## 1. What already existed

`bulkSendService.updateRecipientRow` was complete and correct — it was simply never
called from the interface.

```ts
// services/mock/bulk-send.service.ts:553
async updateRecipientRow(
  batchId: string, rowId: string, values: Record<string, string>, ctx: BulkSendContext,
): Promise<ServiceResult<BulkSendBatch>>
```

It guards on `ctx.canEdit`, normalises each value with `normalizeBulkSendText(v, 500)`,
sets `row.editedInSession`, calls `refresh(batch, ctx)` and writes an activity entry.

**`refresh()` is why this command adds almost no logic:** it runs the canonical
engine over the whole batch — `validateBatch`, `detectDuplicates`, row statuses,
mapping status and readiness summaries. Recomputing any of that in the editor would
let the two disagree, so the editor recomputes none of it.

The draft-override model also already existed on the row:

| Field | Role |
|---|---|
| `values` | current draft values — the only thing editing writes |
| `originalValues` | values the row was projected with; never written by an edit |
| `editedInSession` | service-set flag |
| `contactId` / `contactGroupId` | provenance, read-only |

So no new row model, override model, or service was created.

## 2. What was added

| File | Role |
|---|---|
| `components/bulk-send/RecipientRowEditor.tsx` | **new** — column classification, override detection, pre-commit validation, the `useRowEditor` hook, and the shared field controls |
| `pages/platform/bulk-send/BulkSendBatchPages.tsx` | Edit/Revert row actions, desktop inline editing, mobile sheet, editor lifecycle |

**No dependency was added.** No data grid, no form library, no second form
architecture, no second recipient-row service.

## 3. Editable and read-only fields

**Editable:** every column in `batch.schema.columns`, rendered as a plain-text
input. Values are keyed by column ID, which is what the row model stores.

**Read-only, and never rendered as an input:** row ID, batch ID, row number,
source type, `contactId`, `contactGroupId`, `originalValues`, status, `excluded`,
`exclusionReason`, `projectionId`, `duplicateGroupKey`, `editedInSession`,
workspace and team scope.

Role and template-role mapping are **not** edited here. Mapping has its own
authoritative screen (`/app/bulk-send/:batchId/mapping`) and duplicating it inside
a table row would fork the mapping logic. The row editor links onward to it
instead.

## 4. Column classification — and a bug the probe caught

Column meaning comes from the canonical role mappings first, the same
`columnByField` the duplicate detector and `readRoleField` use.

A batch created **without a Template has no role mappings**, so that lookup
classified every column as `"other"` — silently disabling email-format checking and
required-field checking for exactly the batches most likely to contain hand-entered
mistakes. This was found by executing the code, not by reading it.

The fallback consults `BULK_SEND_ROLE_FIELD_ALIASES` against the schema's own
`normalizedHeader` — the same alias table and the same normalised text the
deterministic mapping suggester uses. Reused canonical logic, not header guesswork.

Verified after the fix: `Name → name`, `Email → email (required)`,
`Organization → organization`.

## 5. Draft override indicator

Computed by comparing `values` against `originalValues` per column, **not** by
reading `editedInSession`. That flag is set on every write and never cleared, so
after a Revert it would keep claiming the row was overridden when its values once
again match the source.

Shown as the text "Draft override" beside the status, never colour or icon alone,
and kept separate from validation status. It never says "Contact modified".

## 6. Desktop inline editing

Edit turns that row's value cells into inputs; the rest of the table stays
readable. Row actions become Save row / Cancel. One row at a time — opening another
row while the current one has unsaved changes raises the discard confirmation.

Enter saves. That is safe here because every control is a single-line input — there
is no combobox or textarea to swallow the key. **Blur never saves and never
discards.**

## 7. Mobile editing

Below 768px (`useIsMobile`, the existing hook — no second breakpoint system) the
Edit action opens the existing `Sheet` from `BulkSendKit`, which already traps
focus and restores it. The sheet shows read-only source provenance, stacked labelled
fields, validation messages, and Save/Cancel in a sticky footer.

**Only one editor variant is ever mounted** — `editingThis` requires `!isMobile`
and the sheet requires `isMobile` — so no hidden duplicate control is focusable.

## 8. Validation

Pre-commit validation is deliberately thin: required-field presence, length, and
email format via `isValidEmailDirection` — the same helper the CSV path uses, so
contact-sourced and CSV-sourced rows are judged identically. Full validation is the
engine's job and runs on save.

On failure the editor stays open, entered values are preserved, and focus moves to
the first invalid field.

## 9. Duplicate detection — reran, with an honest limitation

`updateRecipientRow` → `refresh()` → `detectDuplicates` runs across all rows after
every save and every revert.

**Limitation, pre-existing and not introduced here:** the engine's email duplicate
rule iterates role mappings and skips any without a mapped email column
(`bulk-send.engine.ts:274-275`). A batch created **without a Template has no role
mappings**, so editing an address there cannot raise a duplicate.

Verified by execution:

| Batch | roleMappings | Two rows, same email |
|---|---|---|
| With Template | 2 | `dupKey = role:ph-employee:same@example.com` on both rows — detected |
| Without Template | 0 | `dupKey = null` — not detected |

This affects paste, CSV, fixture and Contact sources equally; it is a property of
the duplicate model, not of row editing. **The shared engine was deliberately not
forked for it** — defining "duplicate" without a role context is a product
decision, and changing `detectDuplicates` would touch every source at once.

Instead the condition is detected and stated plainly
(`emailDuplicateCheckingUnavailable`), both above the table and inside the edit
sheet, so a user correcting addresses is not left inferring safety from silence.

## 10. Revert

Shown only when a row actually has overrides. It writes `originalValues` back
through the **same** `updateRecipientRow` call, so there is one write path and the
engine revalidates exactly as it does for any other edit. Confirmed before
discarding. The row ID, provenance and inclusion state are untouched, and the
override indicator clears because it is computed from value comparison.

Verified: after revert, `values === originalValues` and the overridden column list
is empty.

## 11. Source records are never modified

Verified by execution against the real Contacts service — the source Contact's name
and email were byte-identical before and after editing its projected row.

The same holds by construction for the other sources: editing writes only
`batch.rows[i].values`. It never touches a Contact, Contact Group membership, the
local CSV file, the pasted text, or a Demonstration Dataset fixture.

## 12. Save and Cancel

**Save** blocks duplicate submission via a `saving` flag, calls the canonical
service, keeps edit mode open on validation failure, preserves entered values on
service error, and closes only on a successful result. It announces
*"Recipient row updated in this draft"* — never imported, synchronized, sent, or
persisted.

**Cancel** restores the prior values, clears field errors, and asks for
confirmation only when something meaningful would be lost. It never removes the
row, resets other rows, or clears batch defaults.

## 13. Unsaved-change handling

Protected when opening another row, closing the sheet, or cancelling — via the
existing `useBulkSendConfirm` dialog. **No second route-blocking system was
introduced.** Nothing is autosaved.

The editor is also closed when the row it points at is excluded or restored by the
bulk actions, so the user cannot keep typing into a row that no longer
participates.

## 14. Permissions and cleanup

Gated on the existing `permissions.canEditBatch`; no new permission. Rows that have
already produced a Draft Projection are locked, remain inspectable, and state the
reason.

Edit state resets on workspace change (`useEffect` on `ctx.workspaceId`), and
sign-out/account change replaces the batch context entirely.

## 15. STITCH — `flow` scope, audit-and-repair

P0 checks clean: no `localStorage`, no `sessionStorage`, no edit data in URLs or
route metadata, no logging of field values. One defect found and fixed: excluding
or restoring the row being edited left the editor open on it.

## 16. Verification performed

- **Executable probes** against the real service: column classification, edit
  applied, row ID stable, `contactId` preserved, `originalValues` unchanged,
  source Contact unchanged, revert restores exactly, override indicator clears,
  invalid email caught, and the with/without-Template duplicate comparison.
- Full-repo strict type-check: **160 before, 160 after** — zero added.
- Both launch profiles build.
- **No test framework, `tsconfig.json`, or ESLint added**, per the command.

## 17. Backend requirements

See `docs/backend-integration-handoff.md` §44.

## 18. Remaining gaps

Gap 3 is closed. Still open and recorded in §17:

1. No automated tests / testing infrastructure
4. Request and organization defaults editor
5. Policy and Automation resolution not wired
6. Notifications, Reports, Search, Command Palette, Dashboard, platform-nav
7. Saved configuration create/rename/apply have no UI entry point

Plus, carried from this command: **email duplicate detection does not run for
batches without a Template** (§9), and **Team scope is not enforced for Contacts**
(from Gap Closure Command 1).
