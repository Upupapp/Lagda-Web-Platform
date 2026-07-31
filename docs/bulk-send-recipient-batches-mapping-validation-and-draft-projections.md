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
4. ~~**Request defaults and organization defaults are resolved and displayed but not editable.**~~
   ✅ **CLOSED (Request scope) — Gap Closure Command 3 (2026-07-31).** A Defaults editor now
   sits on the batch overview: nine fields across five categories, each showing its effective
   value and source, with per-field override, per-field Restore inherited value, Reset all
   request overrides, centralized validation, dependency warnings, and an impact preview.
   Overrides set `source: "user"` — the top of the existing `BULK_SEND_DEFAULT_PRECEDENCE` —
   and restoring recomputes from `buildDefaults()`. **Recipient rows edited directly keep
   their own values**, proven by execution. Full detail:
   `docs/request-and-organization-defaults-editor-gap.md`.

   Carried forward, still open:
   - **The Organization/Workspace scope is NOT editable, because no workspace-level store
     exists.** Canonical `WorkspaceSettings` holds no request or signing defaults, and
     `workspace-default` is a source label nothing produces. Building it would mean inventing
     a second Organization Settings architecture. The editor states this plainly rather than
     presenting it as a permission restriction.
   - **Saved configurations carry `defaults` that are never applied to a batch.** The
     `saved-configuration` precedence layer exists in the model and in storage, but nothing
     reads it during resolution.
5. ~~**Policy and Automation resolution is modelled, not wired.**~~
   ✅ **CLOSED — Gap Closure Command 4 (2026-07-31).** The Command 32 engine is now called
   through a thin preparation-facing boundary (`services/preparation-resolution.ts`):
   `runSimulation` for Rule matching, `resolveDefaultsForContext` + `listPolicies` for Policy
   requirements, `listConflicts` for conflicts. Policy requirements are mandatory and block the
   final review; Automation recommendations are optional and apply only on explicit acceptance,
   through the existing `updateRequestDefaults` so they stay traceable and revertible. Full
   detail: `docs/policy-and-automation-resolution-integration-gap.md`.

   Carried forward, still open:
   - **Policy resolution is NOT available in the default launch profile.** There is exactly one
     capability — `workflow-automation` — and it owns both Rules and Policies. It is
     `enterprise-preview`, so in `launch-default` the engine is never called (verified: 0 engine
     calls) and no Policy or Automation UI appears. If Policy is meant to govern launch
     preparation it needs its own capability classification — a product decision.
   - **No fixture exercises the recommendation apply path.** Every currently matching
     recommendation targets a reminder field the batch does not model, so all report honestly
     as "not applicable".
   - **`transaction_created` is an approximation.** The engine has no preparation-specific
     trigger kind.
6. ~~**Notifications, Reports, Global Search, Command Palette, Dashboard, and platform-nav
   integration are not wired.**~~
   ✅ **CLOSED — Gap Closure Command 5 (2026-07-31).** All seven surfaces now register through
   their own canonical registries: a Global Search provider in `SCOPE_BUILDERS`, three
   navigation-only Command Palette commands, a Dashboard attention section, a sixth Reports
   family (`preparation`, route `/app/reports/preparation`), two in-app Notifications, and a
   secondary provenance badge in the Documents workspace. Every surface reads one shared safe
   projection (`services/preparation-platform-projection.ts`) that carries batch names, status
   labels and counts only — recipient names, email addresses, organizations, Contact identity,
   Contact Group membership, uploaded file contents and pasted values are structurally absent.
   The dormant `dashboardVisibility` flag was flipped to true now that an implementation backs
   it. Full detail: `docs/preparation-platform-provider-integration-gap.md`.

   Carried forward, still open:
   - **Bulk Send is deliberately NOT in primary navigation.** `navigationVisibility` stays
     `false`: it is an Enterprise Preview capability entered from Documents or a Template, and
     a top-level item would rank it above launch features. This is presentation, not
     authorization — the routes remain guarded and reachable by URL. Rationale recorded in
     `config/platform.nav.ts`.
   - **Notification fixtures are static.** They demonstrate the attention and ready-for-review
     conditions against real batches; nothing generates a notification when a batch actually
     changes state, because there is no backend to observe that change.
   - **The Documents provenance badge only appears on Draft Projections** created in-session,
     since `bulkSendSource` is attached at projection time and no fixture document carries it.
7. **Saved configuration create/rename/apply exist in the service but have no UI entry point**
   beyond duplicate/archive/restore/remove.
8. Batch **duplication with rows**, and per-row **exclusion reasons** beyond the default, are
   service-level only.
9. Pre-existing repo errors are unchanged (137 repo-wide, including `data/mock/templates.ts`).

Items 2, 3, 4 (Request scope), 5 and 6 are **closed** (Gap Closure Commands 1–5). Item 7 is
the honest remainder of Command 33 and is the recommended next focus.

**Correction to item 2's carried-forward note:** the fixture-workspace mismatch it describes
was repaired in Gap Closure Command 5. `BULK_SEND_BATCH_FIXTURES` now carry `ws_mls_001` /
"Mabini Legal Solutions", matching the session, so the six fixture batches are visible at
runtime and reachable without creating one first. The remaining "Northbridge Legal" strings in
that file are recipient *cell values* and were correctly left alone.
