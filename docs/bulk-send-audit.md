# Bulk Send — Pre-Implementation Audit (Command 33)

- Repository: `C:\Users\paulg\OneDrive\Desktop\Lagda`
- Branch: `master`, HEAD `71d1126`
- Working tree at audit time: clean (only pre-existing untracked `.claude/`)

---

## 1. Command-sequencing conflict (resolved, recorded here deliberately)

Command 33 is being executed **after** Commands 35 and 37, not before. That creates three
recorded statements that contradict this command:

| Source | Statement |
|---|---|
| C35 capability registry | `bulk-send` classified `maturity: "deferred"`, `frontendReady: "not-started"`, "Bulk Send is deferred to a future release." |
| C37 brief | "Commands 33 and 34 were not implemented. Do not implement their Bulk Send or Collaboration scope." |
| C37 acceptance criteria | #129 — "No Bulk Send was added." |
| `docs/backend-integration-handoff.md` | "Commands 33 (Bulk Send) and 34 (Real-time Collaboration) were not implemented… The backend should not define endpoints for them at this stage." |

**Why this mattered technically, not just clerically.** `resolveCapability()` evaluates
`deferred` at step 2 and returns `available: false` for *every* launch profile — before the
profile allowlist is even consulted. Building the routes and guarding them with
`CapabilityGuard capabilityId="bulk-send"` would therefore have produced a feature that is
unreachable in every profile, which is the same defect class as the C37 STITCH-2 finding.

**Resolution (user decision):** reclassify `bulk-send` as **`enterprise-preview`** with
`enabledByDefault: false` — exactly how C32 Workflow Automation is handled. Bulk Send is fully
built and fully functional, stays out of the default launch profile (honouring C35/C37 launch
scope), and becomes usable under `VITE_LAUNCH_PROFILE=enterprise-preview`.

C37's and C35's documents are updated to record the reversal rather than being left to
contradict the code.

---

## 2. Existing bulk / batch / import / mapping code

| Search | Result |
|---|---|
| bulk send, batch send, bulk request, recipient batch, mail merge, campaign, mass send | **No implementation.** Only the deferred capability-registry entry. |
| CSV parser, delimiter detection, tab-separated | **None.** |
| `FileReader` | **None anywhere in the repo.** |
| Structured paste / `onPaste` / `clipboardData` | **None.** Only `navigator.clipboard.writeText` (outbound copy) in `MfaSetup`, `TransactionDetailPage`, `VerifyPage`. |
| Formula-injection handling / cell sanitisation | **None.** |
| Recipient grid / editable data grid | **None.** |
| Batch status / batch job / queue / progress polling | **None.** |
| `localStorage` batch/CSV, `sessionStorage` recipients | **None.** |

### `ContactImportPage.tsx` — the one adjacent surface
`/app/contacts/import` is a **static import-review demonstration**: it renders a fixed
7-row preview and a drop-zone that does not read a file. There is no parser, no `FileReader`,
no paste handling, and no validation engine behind it.

**Decision:** left untouched. It belongs to Contacts (C22) and imports *contact records*;
Bulk Send imports *recipient rows for one template*. Sharing a parser between them is
desirable later, so the new parser is written as a standalone utility rather than embedded in
Bulk Send components — but no C22 behaviour is changed by this command.

---

## 3. Existing models that MUST be reused (not duplicated)

This is the most important audit outcome. `src/app/models/templates.ts` already defines the
entire structure Bulk Send needs:

```ts
TemplateRolePlaceholder {
  id, label, role: PrepParticipantRole, required, routingStep,
  defaultAuthMethod: PrepAuthMethodId, description, mustMapToParticipant
}

TemplateVariable {
  id, label, internalKey, type: TemplateVariableType, required,
  helpText, placeholder, options?, defaultDirection?
}

TemplateRoleMapping {                    // <- already exists, used by UseTemplatePage
  placeholderId, placeholderLabel, role, required,
  displayName, email, organization?, authMethod
}

TemplateVariableValues { [internalKey: string]: string | boolean | null }
```

`instantiateTemplate(templateId, roleMappings, variableValues)` in
`services/mock/templates.service.ts` already turns exactly those two shapes into a prep draft
for the **single-document** flow (`UseTemplatePage`).

### The resulting architecture

Bulk Send mappings are **column → target bindings**, and the **per-row output is the existing
shapes**:

```
BulkSendRoleMapping      : sourceColumnId -> TemplateRolePlaceholderId
BulkSendVariableMapping  : sourceColumnId -> TemplateVariable.internalKey

per row  ->  TemplateRoleMapping[]  +  TemplateVariableValues   (existing types)
             ^ identical to what UseTemplatePage produces for one document
```

So Bulk Send introduces **no second role model, no second variable model, and no second
participant model**. It introduces only the binding layer and the row/batch lifecycle around it.

`PrepParticipantRole` (6 values: signer, approver, reviewer, acknowledgment-recipient, viewer,
carbon-copy) and `PrepAuthMethodId` (6 values) are reused verbatim — the same unions C37
reused for Signing Workflow.

---

## 4. Documents integration — a real gap

`MockDocumentService` exposes `list`, `getFolders`, `getTags`, `archive`, `restore`,
`renameDraft`, `addTag`, `moveToFolder`, `reset`. **There is no create method.**

`DocumentListItem` also has no field indicating a document originated from Bulk Send.

**Decision:** extend the existing document service additively —
`addDraftProjections(items)` writing into its existing in-memory store — and add optional
fields to `DocumentListItem` for the Bulk Send source. Both are additive and cannot break
existing callers. This satisfies "reuse the existing Documents service boundary" and
"Documents remains authoritative"; a second transaction store is explicitly not created.

---

## 5. Other reusable architecture confirmed

| Concern | Reuse |
|---|---|
| Capability gating | `CapabilityGuard`, `resolveCapability`, `useCapability` (C35) |
| Permissions | `PlatformPermission` union + `ROLE_PERMISSIONS` (`models/index.ts`) |
| Route metadata | `RouteMeta` in `config/routes.ts` |
| Service results | `ServiceResult<T>`, `ok()`, `fail()`, `LagdaErrorCode` (`models/errors.ts`) |
| Contacts | `contacts.service.ts`, `ContactContext`, `ContactPicker` (C22) |
| Folders / Tags | `document-organization.service.ts` (C31) |
| Policies / Rules | `workflow-automation.service.ts` (C32) — **preview only** |
| Notifications | `notification-center.service.ts` (C28) |
| Search | `global-search.service.ts` scope builders (C30) |
| Workspace/session cleanup | `PlatformContext.switchWorkspace` / `signOut` hooks |
| Layout + styles | inline-style convention, `AppContent`, `PageHeader`, `FormCard` |
| Confirm dialogs | the focus-trapped pattern; **never** `window.confirm` (C37 audit finding) |
| Deterministic time | `utils/demo-clock.ts` |

---

## 6. Gaps and risks

| # | Gap | Handling |
|---|---|---|
| 1 | No test framework, no `tsconfig.json`, no ESLint | Cannot run STEP 87's test suites. Verification is production build + strict type-check via temporary config. Reported honestly. |
| 2 | `bulk-send` is `deferred` → routes unreachable | Reclassified to `enterprise-preview` per user decision. |
| 3 | No CSV parser or formula-injection handling exists | New `utils/tabular-import.ts` written with size/row limits, delimiter detection, and formula-prefix neutralisation (`=`, `+`, `-`, `@`, tab, CR). |
| 4 | `MockDocumentService` has no create path | Additive `addDraftProjections()`. |
| 5 | `DocumentListItem` has no provenance field | Additive optional `bulkSendSource`. |
| 6 | Several docs referenced by C33 do not exist (`document-details.md`, `document-participants.md`, `prepare-document-workflow.md`, `field-placement-editor.md`, `recipient-signing-experience.md`, `contacts-and-participant-directory.md`, `authentication-flows.md`, `onboarding-flows.md`) | Only existing files are updated; no placeholder docs invented. Equivalents located as in the C37 audit. |
| 7 | Doc filenames differ from C33's list | `document-organization-folders-tags-saved-views-and-bulk-actions.md` exists as `document-organization-folders-tags-saved-views-and-bulk-actions.md`; `notifications-center.md` is `in-app-notifications-and-alerts-center.md`; `reports-center.md` is `reports-analytics-and-operational-insights.md`. |
| 8 | 137 pre-existing repo-wide strict type errors | Out of scope; unchanged. New Bulk Send files must add zero. |

---

## 7. Deliberately NOT implemented

Production backend, persistence, real transaction creation, invitations, email/SMS/push,
reminders, recipient sessions, access tokens, document/PDF generation, Evidence, Verification,
signature application, participant actions, CSV upload to a server, spreadsheet/cloud import
SDKs, Google Sheets, Microsoft Excel/Graph, background jobs, queues, workers, progress polling,
WebSockets, Server-Sent Events, real exports/downloads, campaign analytics, marketing
automation, electronic notarization, accreditation workflows.

No new dependency is added. A small internal CSV/TSV parser is written instead of adding a
spreadsheet or data-grid library.
