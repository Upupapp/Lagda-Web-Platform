# Signing Workflow — Pre-Implementation Audit (Command 37)

Audit of the existing LAGDA routing / workflow surface performed before implementing
the stage-based Signing Workflow feature.

- Repository: `C:\Users\paulg\OneDrive\Desktop\LAGDA`
- Branch: `master`
- HEAD at audit time: `bd603cc` (C36 — official LAGDA logo PNGs integrated)
- Working tree at audit time: clean (only untracked `.claude/`)

---

## 1. Framework and architecture facts confirmed

| Concern | Finding |
|---|---|
| Framework | React 18.3.1 + Vite 6.3.5, TypeScript, `type: module` |
| Router | `react-router` 7.13.0, `createBrowserRouter` in `src/router.tsx` |
| Package manager | npm (`package-lock.json` present; `pnpm-workspace.yaml` also present but lockfile is npm) |
| Scripts | `dev`, `build`, `preview`, `check` (`check` is an alias for `vite build`) |
| Styling | Tailwind v4 available, but **platform screens are written with inline styles + a per-page `<style>` block**. shadcn/ui primitives exist under `src/app/components/ui`. |
| State | React Context per feature (`PlatformContext`, `PrepareContext`, `FieldEditorContext`, …). No Redux/Zustand. |
| Service layer | Singleton mock service classes/objects in `src/app/services/mock/*`, `delay()` helper, `ServiceResult<T>` from `src/app/models/errors.ts` |
| Test framework | **None installed.** No vitest/jest/playwright/axe in `package.json`. `npm run check` = production build only. |
| Browser test tooling | None |
| Accessibility tooling | None automated; a11y is enforced by hand-written patterns |
| Drag-and-drop library | `react-dnd` + `react-dnd-html5-backend` are in `package.json` but **not imported anywhere in `src/app`**. Only `TemplateFieldsPage.tsx` uses native pointer/`draggable` handling. |
| Motion | `motion` 12.23.24 dependency present; platform pages mostly use CSS transitions + `prefers-reduced-motion` blocks (31 occurrences across 29 files) |
| Interaction feedback | `src/app/utils/haptic.ts` exists — a small `navigator.vibrate` wrapper, mobile-UA gated, **no user opt-in and no reduced-motion check** |
| Route metadata | `src/app/config/routes.ts` — `RouteMeta` registry (title, description, breadcrumb, layout, requiresAuth, isPublic, isIndexable, status) |
| Capability registry (C35) | `src/app/config/product-capability-registry.ts` (28 capabilities) + `src/app/config/capability-resolver.ts` + `CapabilityGuard` |
| Permissions | `PlatformPermission` union + `ROLE_PERMISSIONS` in `src/app/models/index.ts`; `usePlatform().hasPermission` |
| Workspace / Team scoping | `PlatformContext` holds `currentWorkspace`; services expose `clearWorkspaceScoped*` methods called from `switchWorkspace` and `signOut` |

---

## 2. Existing routing surface

### 2.1 Document Details (Command 16)

Route family `/app/documents/:transactionId` in `src/router.tsx`:

| Path | Component |
|---|---|
| `documents/:transactionId` (index) | `OverviewTab` |
| `…/participants` | `ParticipantsTab` |
| `…/activity` | `ActivityTab` |
| `…/evidence` | `EvidenceTab` |
| `…/settings` | `SettingsTab` |

All five live in one 1,513-line file: `src/app/pages/platform/documents/TransactionDetailPage.tsx`.
Tab order is defined by the `TAB_LINKS` array inside `TransactionDetailLayout`.
`EvidenceTab` is hidden without `view_documents`/`view_audit`; `SettingsTab` is hidden without
`prepare_documents` unless the transaction is completed.

**Conclusion:** the Workflow tab must be inserted into this `TAB_LINKS` array and registered as
a nested child route. Existing information architecture (Overview first, Participants second)
is preserved by placing **Workflow between Overview and Participants** — routing configuration
is conceptually upstream of the participant directory.

### 2.2 Existing routing model — basic only

`src/app/models/transaction-detail.ts` already defines:

```ts
type RoutingMode = "sequential" | "parallel" | "mixed" | "approval-based";

interface RoutingStep {
  stepNumber: number;
  label: string;
  participantIds: string[];
  isCompleted: boolean;
  isCurrent: boolean;
  isFailed: boolean;
}
```

`TransactionDetail.routingSteps: RoutingStep[]` and `TransactionParticipant.routingStep: number`.

This is a **flat, read-only, numeric step model**. It has:

- no stage identity (no stable stage ID, no name, no description)
- no per-stage execution mode
- no per-stage completion rule
- no per-participant required action beyond the coarse `ParticipantRole`
- no explicit per-participant electronic-signature requirement
- no field-readiness concept
- no editing surface anywhere in Document Details

### 2.3 Prepare Document (Command 18)

`/app/prepare/*` with steps `upload → participants → routing → authentication → settings → review → fields`.
`src/app/models/prepare.ts` defines `PrepParticipantRole` which is **wider** than the sent-transaction role set:

```
signer | approver | reviewer | acknowledgment-recipient | viewer | carbon-copy
```

`RoutingStep.tsx` configures a `RoutingMode` plus routing groups (`PrepGroupId`).

**Conclusion:** the six Signing Workflow participant actions map cleanly onto the six existing
`PrepParticipantRole` values. No new participant-type vocabulary is required — Command 37's
"required action" is a *reuse* of this existing role union, elevated from a role into an explicit
per-assignment action with an explicit signature requirement flag.

### 2.4 Field placement (Command 19/21)

`src/app/models/field-editor.ts` — `FieldType` union includes `signature`, `initials`,
`full-name`, `date-signed`, `text`, `checkbox`, `acknowledgment`, etc. Fields carry a
participant assignment. `TransactionParticipant.assignedFieldCount` exists on the read model.

**Conclusion:** field readiness must be computed from the *count and type* of fields assigned to a
participant. The full field editor state (`FieldEditorContext`) is scoped to the prepare flow and
is not loaded inside Document Details — so the Workflow tab computes readiness from fixture-level
assigned-field descriptors and links out to Field Placement rather than embedding the editor.

### 2.5 Workflow Automation (Command 32) — a different system

`/app/automation/*`, `src/app/models/workflow-automation.ts` (624 lines), guarded by
`<CapabilityGuard capabilityId="workflow-automation">`. Registry entry:

- `maturity: "enterprise-preview"`, `enabledByDefault: false`
- `featureRequirements: ["automationEnabled"]`, and `DEFAULT_PLATFORM_FLAGS.automationEnabled === false`

So in the default launch profile every automation route already renders `CapabilityUnavailable`
without loading the automation chunk.

**Conclusion:** the name collision is real and dangerous. Mitigations adopted:

1. Signing Workflow is registered as a **separate** capability `signing-workflow`,
   `maturity: "launch-core"`, `enabledByDefault: true`.
2. Signing Workflow imports **nothing** from `models/workflow-automation.ts` or
   `services/mock/workflow-automation.service.ts`.
3. The Signing Workflow UI never mentions Rules, Policies, Simulations, or Conflicts.
4. Terminology is documented so "Workflow" alone is never used ambiguously in new copy.

---

## 3. Term sweep results

Searched for: workflow, signing workflow, routing, routing order, signing order, stage, step,
recipient order, participant order, sequential, parallel, hybrid, approver, reviewer,
acknowledgment, copy recipient, viewer, signer, signature required, initials required,
stage completion, waiting for previous, active/current/next recipient, participant status,
workflow status, kanban, board, column, drag and drop, sortable, reorder, move left/right,
haptic, vibrate, navigator.vibrate, animation, reduced motion.

| Term | Result |
|---|---|
| `kanban`, `board`, `column` (as a workflow board) | **No hits.** No existing board UI anywhere. |
| `stage` | Used only as prose in automation docs; no `SigningStage`-like type exists |
| `sequential` / `parallel` | Exist as `RoutingMode` values and as public marketing pages (`/features/parallel-signing`, `/features/sequential-signing`) |
| `hybrid` | Not present. `RoutingMode` uses `"mixed"` for the equivalent concept. |
| Recipient Group | **Not present.** No approved Recipient Group model exists → per Step 7, "any one signs for the group" is *not* implemented and a stage containing several named people is never treated as a group. |
| drag and drop | `react-dnd` installed but unused; `TemplateFieldsPage` uses hand-rolled pointer dragging |
| `navigator.vibrate` | Only `src/app/utils/haptic.ts` |
| `prefers-reduced-motion` | Widely respected (29 files) |

---

## 4. Reusable vs. new

### Reuse without modification

- `TransactionDetail`, `TransactionParticipant`, `TransactionStatus`, `ParticipantRole`
- `PrepParticipantRole` (source of the six action types)
- `FieldType` from `models/field-editor.ts`
- `ServiceResult<T>`, `ok()`, `fail()`, `LagdaErrorCode`
- `PageHeader`, `AppContent`, `FormCard`, `FormField`, `EmptyStateLayout`, `SkeletonBlock`
- `LagdaLogo` (C36 canonical component, PNG-first from `/public/brand/`) — **no second logo registry**
- `CapabilityGuard`, `CapabilityUnavailable`, `resolveCapability`
- `usePlatform`, `hasPermission`, `switchWorkspace`, `signOut`
- `src/app/utils/haptic.ts` (wrapped, not replaced)
- `mockTransactionDetailService.getTransaction()` for the authoritative document summary

### Normalize / extend

- `TAB_LINKS` in `TransactionDetailPage.tsx` — add the Workflow tab
- `PlatformContext.signOut` / `switchWorkspace` — add signing-workflow cleanup calls
- `product-capability-registry.ts` — add `signing-workflow`
- `config/routes.ts` — add four route metadata entries
- `CommandPalette.tsx` — add safe navigation-only commands
- `src/app/utils/haptic.ts` — wrapped by a new opt-in-gated `interaction-feedback.ts`
  (vibration **off by default**, because no approved interaction-preference opt-in exists)

### Missing — built by this command

- Stage-based Signing Workflow domain (workflow / stage / assignment)
- Explicit per-participant required action
- Explicit per-participant electronic-signature and initials requirements
- Per-stage execution mode (parallel / ordered) and completion rule
- Centralised validation engine
- Centralised current/next-stage resolver
- Field-readiness matrix
- Kanban builder + Kanban status board + Timeline + List views
- Workflow-scoped document preview context
- Guided creation experience, review screen, creation result
- Notification *direction* definitions (previews only)

---

## 5. Gaps and risks identified

| # | Gap | Severity | Handling in C37 |
|---|---|---|---|
| 1 | No test framework installed | High (blocks Step 63) | Cannot run automated tests. Test **specification** written to docs; verification is type-check + production build + manual route verification. Reported honestly. |
| 2 | `RoutingStep` is read-only with no identity | High | New `SigningStage` domain added alongside; `RoutingStep` untouched so Document Details keeps working |
| 3 | `react-dnd` present but unused, and it has no built-in keyboard support | Medium | **No new DnD dependency added.** Reorder is implemented with explicit buttons + keyboard + "Move to position", with native HTML5 drag as a pure enhancement. |
| 4 | `haptic.ts` fires with no user opt-in | Medium (a11y/comfort) | New `interaction-feedback.ts` abstraction defaults to **disabled**; existing callers unchanged |
| 5 | Name collision "Workflow" (Automation vs. Signing) | High | Separate capability, separate models, separate service, documented terminology |
| 6 | No Recipient Group model | Medium | Quorum / "any one signs" explicitly **not** implemented; documented as deferred |
| 7 | Several docs referenced by the command do not exist (`document-details.md`, `document-participants.md`, `document-activity.md`, `document-evidence.md`, `prepare-document-workflow.md`, `field-placement-editor.md`, `recipient-signing-experience.md`, `launch-navigation-model.md`, `contacts-and-participant-directory.md`) | Low | Equivalents located: `documents-workspace.md`, `frontend-architecture.md`, `platform-route-map.md`, `lagda-esignature-mvp-scope.md`, `recipient-inbox-and-my-actions.md`. Only existing files are updated; no placeholder docs are invented. |
| 8 | `TransactionDetailPage.tsx` is 1,513 lines | Low | Workflow code goes in new files; only the `TAB_LINKS` array and one import are touched |
| 9 | Participant emails in fixtures are already masked (`m****@example.com`) | — | Good. Workflow reuses the masked value; no unmasking anywhere. |

---

## 6. Deferred (explicitly not implemented by Command 37)

- Conditional branching, quorum voting, weighted voting, arbitrary completion formulas
- Recipient Groups ("any one of these people may sign")
- Bulk Send (C33), Collaboration (C34), document versioning, contract lifecycle
- Template *versioning*
- Production persistence of any kind — workflows live in in-memory frontend state only
- Real email / SMS / push / reminder scheduling
- Native haptic bridge, or any new device permission
- eNotary stages, notarial roles, notarial sessions, accreditation stages

---

## 7. Signing Workflow vs. Workflow Automation — canonical distinction

| | **Signing Workflow** (C37) | **Workflow Automation** (C32) |
|---|---|---|
| Question answered | "Who acts on *this* document, in what order, and what exactly must each person do?" | "What should happen automatically across *many* documents when an event occurs?" |
| Scope | One document transaction | Workspace-wide |
| Primitive | Stage → participant assignment → required action | Rule → trigger → condition → action; Policy |
| Capability id | `signing-workflow` | `workflow-automation` |
| Maturity | `launch-core`, enabled by default | `enterprise-preview`, disabled by default |
| Routes | `/app/documents/:documentId/workflow*` | `/app/automation/*` |
| Dependency | **None on Automation.** Works fully with `automationEnabled: false`. | — |
| Permissions | `view_documents` / `prepare_documents` | `view_workflow_automation` / `manage_workflow_automation` |

`view_workflow_automation` never grants Signing Workflow access, and vice versa.
