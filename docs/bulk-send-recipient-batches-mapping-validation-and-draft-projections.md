# Bulk Send — Recipient Batches, Mapping, Validation, and Draft Projections

Command 33. Frontend demonstration only.

---

## 1. Purpose

Prepare **one approved Template** against **many recipient rows**, bind source columns to
Template participant roles and variables, validate every row, and create deterministic
frontend **Draft Projections** that appear in the existing Documents workspace.

## 2. Canonical route family

| Route | Purpose |
|---|---|
| `/app/bulk-send` | Overview and batch list |
| `/app/bulk-send/new` | Create a batch (name + Template) |
| `/app/bulk-send/:batchId` | Batch details, configuration, validation, actions |
| `/app/bulk-send/:batchId/recipients` | Recipient sources and the recipient grid |
| `/app/bulk-send/:batchId/mapping` | Role and variable mapping |
| `/app/bulk-send/:batchId/review` | Representative previews, eligibility, projection |
| `/app/bulk-send/:batchId/results` | Row-by-row Draft Projection results |
| `/app/bulk-send/saved-configurations` | Saved configuration centre |
| `/app/bulk-send/saved-configurations/:configurationId` | Configuration details |

Static paths are registered **before** `:batchId` to prevent shadowing. No `/app/campaigns`,
`/app/mail-merge`, `/app/mass-send`, `/app/batch-jobs`, or `/app/bulk-requests` route exists.

## 3. Capability classification — a deliberate reversal

`bulk-send` was registered by C35 as `maturity: "deferred"`. `resolveCapability()` evaluates
`deferred` **before** the profile allowlist and returns unavailable in *every* profile, so
building the routes under that classification would have produced a feature unreachable
everywhere — the same defect class as the C37 STITCH-2 finding.

Reclassified to **`enterprise-preview`**, `enabledByDefault: false` — the same handling as C32
Workflow Automation. Bulk Send is fully built, stays out of the default launch profile, and
becomes usable with `VITE_LAUNCH_PROFILE=enterprise-preview`.

This reverses three earlier recorded statements, noted here rather than left to contradict:
C35's deferred classification, C37's "do not implement Bulk Send", and C37 acceptance
criterion #129. See `docs/bulk-send-audit.md` §1.

## 4. Domain boundaries

| Bulk Send is | Bulk Send is not |
|---|---|
| A preparation and projection tool for one Template | A second transaction store |
| A binding layer over existing Template roles/variables | A second role, variable, or participant model |
| A producer of Draft records handed to Documents | A delivery, campaign, or marketing system |

**Documents** stays authoritative for transactions. **Templates** stay authoritative for
document and role structure. **Contacts** stay authoritative for the recipient directory.
**My Actions** is never touched.

## 5. Reuse — the central architectural decision

`models/templates.ts` already defined everything needed:

```
TemplateRolePlaceholder  { id, label, role, required, routingStep, defaultAuthMethod, ... }
TemplateVariable         { id, label, internalKey, type, required, ... }
TemplateRoleMapping      { placeholderId, placeholderLabel, role, required,
                           displayName, email, organization?, authMethod }
TemplateVariableValues   { [internalKey]: string | boolean | null }
```

`UseTemplatePage` already produces `TemplateRoleMapping[]` + `TemplateVariableValues` for a
**single** document. Bulk Send therefore adds only the binding layer:

```
BulkSendRoleMapping      : sourceColumnId -> TemplateRolePlaceholderId  (+ per-field binding)
BulkSendVariableMapping  : sourceColumnId -> TemplateVariable.internalKey

per row -> TemplateRoleMapping[] + TemplateVariableValues   (the EXISTING shapes)
```

No second role model, variable model, or participant model was created.
`PrepParticipantRole` (6 values) and `PrepAuthMethodId` (6 values) are reused verbatim.

## 6. Statuses

**Batch** (11): draft · recipients-added · mapping-required · validation-required ·
needs-review · ready-in-demonstration · draft-projections-created · partially-projected ·
archived · invalid · unavailable.

**Row** (10): ready-in-demonstration · warning · incomplete · duplicate · restricted ·
excluded · invalid-mapping · unavailable · draft-projection-created ·
projection-failed-demonstration.

"Sent", "Delivered", "Processing", and "Queued" do not exist in either union. Row *lifecycle
status* is kept separate from validation *severity*.

## 7. Recipient sources

Contacts · Contact Groups · Structured Paste · Local CSV Preview · Demonstration Dataset.
Each carries an explicit privacy sentence in `BULK_SEND_SOURCE_PRIVACY`. No cloud import, no
Google Sheets, no Excel/Graph SDK, no email-account search, no clipboard read without an
explicit paste.

## 8. Local CSV safety — `utils/tabular-import.ts`

Hand-written parser; **no CSV, spreadsheet, or data-grid dependency was added**.

- Normal `<input type="file">`, extension **and** MIME checked
- 500 KB size cap, 500 row cap, 40 column cap, 500 char cell cap
- `FileReader` reads as UTF-8 **locally**; never uploaded, never persisted, never logged
- Binary content rejected via NUL detection
- Deterministic delimiter detection (`,` `\t` `;` `|`) by column-count consistency
- RFC4180 quote handling, including newlines inside quoted fields
- Deterministic header detection
- Duplicate headers renamed so they remain separately mappable
- Inconsistent column counts padded, counted, and reported
- **Formula neutralisation**: cells beginning `=` `+` `-` `@` `\t` `\r` are prefixed with `'`
  and reported. The raw value is tested *before* control-character stripping so a leading tab
  cannot smuggle a formula past the check, then re-tested after.
- Nothing is ever evaluated, and no cell is rendered as HTML

Required notice, shown verbatim on the CSV screen:
> The selected file is previewed locally in this frontend session. It is not uploaded or persisted.

## 9. The five centralized engines — `services/bulk-send.engine.ts`

One implementation each; no component duplicates any of it.

1. **Role-mapping registry** — `buildRoleMappings` / `suggestRoleMappings`
2. **Variable-mapping registry** — `buildVariableMappings` / `suggestVariableMappings`
3. **Validation engine** — `validateBatch`
4. **Duplicate detector** — `detectDuplicates`
5. **Eligibility resolver** — `resolveEligibility`
6. **Projection builder** — `buildProjectionInputs`

### Suggested mappings
A fixed header-alias table. Confidence is reported as **Exact Header Match**, **Known Alias**,
or **Requires Review**. Suggestions are never applied silently, the second and later
placeholders of a shared role are never auto-suggested, and the UI states plainly that this is
deterministic and **not AI**.

### Duplicate detection
Four groupings: identical rows · repeated Contact · repeated email direction within one role ·
one person in incompatible roles within a single row. **Matching display names alone never
force duplicate status.** Nothing is merged automatically.

### Eligibility
Per row, with stable reasons. A query parameter can never make a row eligible, plan
availability never grants permission, and frontend eligibility is explicitly not backend
authorization.

## 10. Service — `services/mock/bulk-send.service.ts`

Batches, recipient sources, rows, mapping, validation, previews, projections, saved
configurations, activity, and lifecycle. Every method takes a context carrying workspace,
team, capability, and permission flags plus an optional `AbortSignal`; every ID is
shape-validated; all results are `ServiceResult<T>`.

## 11. Draft Projections

`createDraftProjections` **always revalidates immediately before projecting** and intersects
the caller's row list with the freshly computed eligible set — the client list is never
trusted on its own.

Projected Drafts are handed to the **existing** `mockDocumentService.addDraftProjections()`;
Bulk Send keeps no transaction store. `DocumentListItem` gained an optional `bulkSendSource`
carrying opaque IDs and safe labels only — never recipient names, email direction, or cell values.

Every projection sets `isMyAction: false`. Bulk Send creates **no** recipient session, **no**
My Actions item, **no** invitation, **no** email/SMS/push, **no** reminder, **no** Evidence,
**no** Verification, and applies **no** signature.

## 12. Storage and privacy

Nothing is written to `localStorage` or `sessionStorage`. Recipient rows, CSV contents, pasted
text, mappings, validation results, and projection inputs live in memory only and are cleared
on workspace switch (`clearWorkspaceScopedBulkSend`) and sign-out
(`resetBulkSendDemonstration`), both wired in `PlatformContext`.

Saved configurations retain **mapping rules and defaults only** — never recipient rows,
never imported file contents, never cell values.

No recipient data appears in any URL or in route metadata. Route titles carry no batch name,
recipient name, email, Template name, Team name, sender name, filename, or dynamic ID.

## 13. Permissions

No new `PlatformPermission` values. `buildBulkSendPermissionContext()` maps the existing ones
in one place: `view_documents` to read, `prepare_documents` to edit/create/project,
`manage_contacts` additionally required to add recipients. Holding Bulk Send permission never
grants blanket Contact access, blanket Template access, or sender impersonation.

## 14. Fixtures

Six batches — ready · acknowledgment with warnings · deliberate issues (duplicate, invalid
email, missing name, missing required variable, neutralised formula cell) · partially projected
· empty draft · archived. Five saved configurations including one stale and one restricted.
Three demonstration datasets. All fictional, reserved example domains, stable IDs.

## 15. Legal and product safeguards

No claim of legally valid bulk delivery, guaranteed delivery, certified batch, secure import,
identity-verified list, sufficient consent, enforceability, or immutable batch record. Batch
activity is explicitly "fictional frontend demonstration history and is not an immutable audit
record". No eNotary batch, mapping, configuration, projection, or workflow exists.

## 16. Verification performed

- `npm run build` — **passes**. Chunks: `BulkSendBatchPages` 38.1 kB, `useBulkSend` 14.0 kB,
  `BulkSendConfigurationPages` 11.3 kB, `BulkSendOverviewPage` 9.2 kB.
- Strict type-check of every new Bulk Send file — **zero errors**.
- **No dependency added or removed.**

## 17. Known limitations — honest

1. **No automated tests.** The repository still has no test framework, `tsconfig.json`, or
   ESLint, so STEP 82/87's suites could not be written or run.
2. ~~**Contacts and Contact Group sources are declared but not wired to a picker.**~~
   ✅ **CLOSED — Gap Closure Command 1 (2026-07-31).** The source selector now offers five
   sources: Contacts, Contact Groups, Demonstration Dataset, Structured Paste, and Local CSV
   Preview. A multi-select `ContactRecipientPicker` reads the canonical Contacts service,
   expands Contact Groups into individual people, de-duplicates by Contact identity, flags
   distinct Contacts that share an email rather than merging them, and projects rows through
   the canonical `applyRecipientSource` path with Contact and Contact Group provenance.
   Full detail: `docs/contact-and-contact-group-recipient-source-gap.md`.

   Carried forward from that work, still open:
   - **Team scope is not enforced for Contacts** — the canonical Contacts service exposes no
     team scoping at all, so none was invented. Recorded as a backend requirement.
   - **Bulk Send fixture batches remain stamped `ws_northbridge_001`** while the session holds
     `ws_mls_001`, so `listBatches` filters them out and they are invisible at runtime.
     Reaching the recipients flow requires creating a batch in-session. Pre-existing; not
     repaired by that command.
3. ~~**Row inline editing is not built.**~~
   ✅ **CLOSED — Gap Closure Command 2 (2026-07-31).** `updateRecipientRow` is now wired to a
   real editing interface: inline editing on desktop, an Edit Recipient sheet below 768px,
   Save / Cancel / Revert, pre-commit validation reusing the canonical email helper, and full
   revalidation through the service's existing `refresh()`. Editing writes only
   `row.values`; `originalValues`, provenance and the row ID are preserved, and no source
   record — Contact, Contact Group membership, CSV file, pasted text, or fixture — is
   modified. Full detail: `docs/inline-recipient-row-editing-gap.md`.

   Carried forward from that work, still open:
   - **Email duplicate detection does not run for batches created without a Template.** The
     engine's duplicate rule iterates role mappings and skips any without a mapped email
     column, so a template-less batch has none. This affects every recipient source equally
     and predates row editing; the shared engine was deliberately not forked for it. The
     condition is now detected and stated in the UI rather than left silent.
4. **Request defaults and organization defaults are resolved and displayed but not editable**
   in the UI. `BulkSendRequestDefaults` carries source attribution and conflict flags, and the
   service computes them from the Template, but no defaults editor screen was built.
5. **Policy and Automation resolution is modelled, not wired.** The types, precedence order,
   and conflict fields exist; the C32 resolution engine is not yet called.
6. **Notifications, Reports, Global Search, Command Palette, Dashboard, and platform-nav
   integration are not wired.** The capability is flagged `searchVisibility: true` and
   `commandPaletteVisibility: true` but no provider or command was added.
7. **Saved configuration create/rename/apply exist in the service but have no UI entry point**
   beyond duplicate/archive/restore/remove.
8. Batch **duplication with rows**, and per-row **exclusion reasons** beyond the default, are
   service-level only.
9. Pre-existing repo errors are unchanged (137 repo-wide, including `data/mock/templates.ts`).

Items 2 and 3 are **closed** (Gap Closure Commands 1 and 2). Items 4–7 are the honest
remainder of Command 33 and are the recommended next focus, in that order.
