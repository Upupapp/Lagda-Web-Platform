# Signing Workflow — Stage Routing, Kanban, and eSignature Requirements

Command 37. Frontend demonstration only.

---

## 1. Purpose

Let a sender define, for **one document**, the sequence in which people act, who acts at each
point, exactly what each person must do, and whether each person must apply their own electronic
signature — and then watch that sequence progress on a Kanban board.

## 2. Product boundary

This feature covers **signing workflow and recipient routing**: stages, participants in each
stage, participant actions, per-participant eSignature requirements, stage order, within-stage
order, stage completion, and workflow progress.

It does **not** cover: bulk send, collaboration, versioning, contract lifecycle management,
conditional branching, quorum voting, recipient groups, or electronic notarization.

## 3. Signing Workflow vs. Workflow Automation

| | **Signing Workflow** (C37) | **Workflow Automation** (C32) |
|---|---|---|
| Question | "Who acts on *this* document, in what order, and what must each person do?" | "What happens automatically across *many* documents when an event occurs?" |
| Scope | One document transaction | Workspace-wide |
| Primitive | Stage → participant assignment → required action | Rule → trigger → condition → action; Policy |
| Capability | `signing-workflow` | `workflow-automation` |
| Maturity | `launch-core`, `enabledByDefault: true` | `enterprise-preview`, `enabledByDefault: false` |
| Routes | `/app/documents/:documentId/workflow*` | `/app/automation/*` |
| Permission | `view_documents` / `prepare_documents` | `view_workflow_automation` / `manage_workflow_automation` |

**Signing Workflow never imports from `models/workflow-automation.ts` or
`services/mock/workflow-automation.service.ts`, and works fully with `automationEnabled: false`
(the default launch profile).** `view_workflow_automation` never grants Signing Workflow access,
and vice versa. The Signing Workflow UI never mentions Rules, Policies, Simulations, or Conflicts.

## 4. Canonical route family

| Route | Purpose |
|---|---|
| `/app/documents/:documentId/workflow` | Persistent Workflow tab and status board |
| `/app/documents/:documentId/workflow/create` | Guided creation / edit workspace |
| `/app/documents/:documentId/workflow/review` | Final review before creating in demonstration |
| `/app/documents/:documentId/workflow/stages/:stageId` | Stage details |

All four are nested **inside** `documents/:transactionId`, so `TransactionDetailLayout` renders
once, document access is already established, and the platform shell appears once. All are
registered in `src/app/config/routes.ts` with `requiresAuth: true`, `isPublic: false`,
`isIndexable: false`, and are wrapped in `<CapabilityGuard capabilityId="signing-workflow">` in
`src/router.tsx`. Static `workflow/*` paths are registered before `stages/:stageId` to prevent
shadowing.

No top-level `/app/workflows`, `/app/processes`, `/app/kanban`, `/app/tasks`, or
`/app/automation/workflows` route was created.

## 5–8. Domain models

`src/app/models/signing-workflow.ts`.

**Workflow:** `SigningWorkflow`, `SigningWorkflowId`, `SigningWorkflowName`,
`SigningWorkflowDescription`, `SigningWorkflowStatus`, `SigningWorkflowConfigurationStatus`,
`SigningWorkflowProgress`, `SigningWorkflowSummary`, `SigningWorkflowValidationResult`,
`SigningWorkflowValidationIssue`, `SigningWorkflowAction`, `SigningWorkflowActionAvailability`,
`SigningWorkflowScenario`, `SigningWorkflowError`, `SigningWorkflowPermissionContext`,
`SigningWorkflowCapabilityContext`, `SigningWorkflowActivityRecord`.

**Stage:** `SigningStage`, `SigningStageId`, `SigningStageName`, `SigningStageDescription`,
`SigningStagePosition` (as `position`), `SigningStageType`, `SigningStageStatus`,
`SigningStageExecutionMode`, `SigningStageCompletionRule`, `SigningStageProgress`,
`SigningStageSummary`, `SigningStageAction`, `SigningStageActionAvailability`.

**Assignment:** `StageParticipantAssignment`, `StageParticipantAssignmentId`,
`StageParticipantPosition` (as `position`), `StageParticipantAction`, `StageParticipantStatus`,
`StageParticipantProgress`, `StageParticipantSignatureRequirement`,
`StageParticipantFieldReadiness`, `StageParticipantAuthenticationDirection`,
`StageParticipantConsentDirection`, `StageParticipantNotificationDirection`.

**Board / preview:** `WorkflowBoardColumn`, `WorkflowBoardCard`, `WorkflowBoardSelection`,
`WorkflowBoardView`, `WorkflowBoardFilter`, `WorkflowBoardSort`,
`WorkflowDocumentPreviewContext`, `WorkflowCurrentStageResolution`,
`WorkflowNextStageResolution`, `WorkflowCompletionResolution`, `WorkflowDocumentSummary`.

Reused unchanged: `TransactionDetail`, `TransactionStatus`, `ParticipantRole`,
`PrepParticipantRole`, `FieldType`, `Permission` (`PlatformPermission`), `Workspace`, `Team`,
`User`, `ServiceResult`, `RouteMeta`. `RoutingMode` / `RoutingStep` are left untouched.

### Structure

```
Signing Workflow
  └─ ordered Stages (position 1..n, always contiguous)
       └─ Stage Participant Assignments (position 1..m)
            ├─ required participant Action
            ├─ individual eSignature requirement
            ├─ individual field assignments
            ├─ authentication / consent / notification direction
            └─ status
```

### Participant action types

| Action | Blocking | Signature |
|---|---|---|
| Sign | Yes | **Always required** |
| Approve | Yes | Optional, explicit |
| Review | Yes | Optional, explicit — *never* described as approval |
| Acknowledge | Yes | Optional, explicit |
| View | No | **Never** |
| Receive a Copy | No | **Never** |

The six actions map 1:1 onto the existing `PrepParticipantRole` union
(`ACTION_TO_PREP_ROLE` / `PREP_ROLE_TO_ACTION`), so no second participant vocabulary exists.

### Electronic signature requirements

Every assignment carries an explicit `{ signatureRequired, initialsRequired, source }`.
`source` is `action-implied` (Sign only), `explicit-sender-choice`, or `not-required`.

Enforced in **three** places so the rule cannot be bypassed:
`ParticipantConfigPanel` (UI), `MockSigningWorkflowService.refresh()` (data layer), and
`validateSigningWorkflow` (validation):

- Sign always requires a signature — the checkbox is locked on.
- View / Receive a Copy can never carry a signature or initials requirement.
- Approve / Review / Acknowledge + Signature requires **the participant's own** Signature field.
- One Signature field belongs to exactly one assignment (`ownerAssignmentId`). A field listed on
  one assignment but owned by another is a **blocking** issue.
- A shared generic stage Signature field cannot be represented — the model has no stage-level
  signature concept at all.
- No participant's Signature Library is ever read, shown, or selectable. A sender cannot select,
  view, or apply another person's saved signature.

### Stage execution and completion

- **Between stages:** strictly sequential. A later stage is `waiting-for-prior-stage`.
- **Within a stage:** `parallel` (default) or `ordered` (behind "Show advanced options").
- **Completion rule:** `all-required-participants-complete` only. Non-blocking assignments never
  prevent completion. Quorum, weighted voting, arbitrary formulas, and "any one signs for the
  group" are **not** implemented — see §16.

### Statuses

Centralised unions with label maps: `SigningWorkflowConfigurationStatus` (6),
`SigningWorkflowStatus` (11), `SigningStageStatus` (12), `StageParticipantStatus` (13).
No status is ever labelled "legally completed", "certified", "court approved", or "notarized".

## 9. Signing Workflow service

`src/app/services/mock/signing-workflow.service.ts` — `signingWorkflowService`.

Reads: `getDocumentWorkflow`, `getWorkflowSummary`, `listWorkflowStages`, `getWorkflowStage`,
`validateWorkflow`, `getWorkflowProgress`, `getFieldReadiness`, `getWorkflowDocumentPreview`,
`listParticipantCandidates`, `listTemplateBlueprints`, `listWorkflowActivity`.

Writes: `createWorkflowDraft`, `updateWorkflowDraft`, `removeWorkflowDraftDemonstration`,
`createWorkflowPreview`, `addWorkflowStage`, `updateWorkflowStage`, `duplicateWorkflowStage`,
`removeWorkflowStage`, `reorderWorkflowStages`, `addStageParticipant`, `updateStageParticipant`,
`removeStageParticipant`, `reorderStageParticipants`, `previewRecipientOrderConversion`,
`applyRecipientOrderConversion`.

Lifecycle: `clearWorkspaceScopedWorkflows`, `resetSigningWorkflowDemonstration`,
`resetWorkflowScenario`, `setWorkflowScenario`.

Every method takes a `SigningWorkflowContext` (`workspaceId`, `teamId`,
`capabilityAvailable`, `canView`, `canEdit`, optional `AbortSignal`), validates every ID with
`isSafeWorkflowIdValue`, returns `ServiceResult<T>`, and supports cancellation. Reorder operations
require the submitted ID list to be an exact permutation of the existing IDs — a reorder can never
add, remove, or invent an item. No network request is made.

## 10. Validation engine

`src/app/services/signing-workflow.validation.ts` — **one** `validateSigningWorkflow()`.
No card, panel, or page contains its own validation logic.

Returns `{ issues, blockingIssueCount, advisoryIssueCount, readyForReview, configurationStatus }`.
Each issue carries a stable `issueId`, `severity`, plain user-facing `message`, affected
`stageId` / `stageName` / `assignmentId` / `participantName`, `repairActionLabel`, and
`repairTarget` (`stage-editor` | `participant-editor` | `field-placement` | `workflow-basics`).

`computeFieldReadiness()` derives readiness from field references — the UI can never set it.

## 11. Current and next stage resolver

`src/app/services/signing-workflow.resolver.ts` — `resolveCurrentStage`, `resolveNextStage`,
`resolveWorkflowCompletion`, `resolveWorkflowProgress`, `resolveStageProgress`,
`resolveStageSummaries`, `describeAssignmentEligibility`.

The current stage is derived from **stage sequence + stage status + assignment status +
completion rule + transaction status** — never from visual board order. Inconsistent fixture data
resolves to `reason: "inconsistent-data"` with an explanation, never a throw and never an
impossible state. Nothing in the resolver marks anything complete.

## 12–16. Screens

**Workflow tab** (`WorkflowTab.tsx`): empty state · creation result panel · Board / Timeline /
List views · summary header · issues / field-readiness / notification-preview panels · document
preview (side panel on desktop, full-screen sheet on mobile) · participant configuration panel.

**Empty state:** one restrained `LagdaLogo variant="colored-icon"`, a three-stage fictional
example, the four things stages guarantee, `Create Signing Workflow`, and
`Use Current Recipient Order`.

**Guided creation** (`WorkflowCreatePage.tsx`): six steps — Workflow Basics · Build Stages ·
Add People · Configure Actions · Check Fields · Review Workflow — in **one** workspace with the
Kanban builder persistently visible, not six separate pages. Default workflow name is
`<Document title> Workflow`, editable.

**Review** (`WorkflowReviewPage.tsx`): answers all seven required review questions in plain
language, read-only board (timeline on mobile), signature-requirement summary, field readiness,
notification preview, validation, and `Create Workflow Preview`.

**Creation result:** rendered from router `state.workflowJustCreated`, never from the URL, so no
query value can trigger or forge it. Restrained success styling — **no confetti**.

**Stage detail** (`WorkflowStageDetailPage.tsx`): configuration, progress, people, checks,
activity boundaries, notification preview. Editable only while the stage is `draft`.

### Kanban board

`WorkflowBoard.tsx`. Columns are stages; cards are participant assignments. Connectors show an
Azure line **plus the word "Then"** — never arrows or colour alone. Each column shows a
design-system stage-number badge (never the logo).

**Moving a card never completes an action.** In `status` mode the board is fully read-only and
cards are not draggable. In `builder` mode a card may be moved to another draft stage — an
explicit reassignment of *where* someone acts. The announcement says so: *"Moved to X. No one's
status was changed."* A sender can never drag someone from Pending to Signed, and can never mark
another person's electronic signature as completed.

The board region alone scrolls horizontally (`.wf-board-scroll`); the page never does. Below
860px the board becomes a vertical stack.

### Field readiness matrix

Stage · Person · Required action · Signature · Initials · Required · Assigned · Missing ·
Readiness · repair action. Filterable to issues only. Text labels throughout. No field values and
no signature representations. Carries an explicit note that readiness is a configuration check and
not a statement about legal compliance.

### Document preview

Reuses the existing deterministic preview fixtures — no PDF parsing, no file fetch, no competing
viewer. Selecting a stage or person scopes the highlighted fields and jumps to the right page.
Shows field **type and page only**. Never shows filled values, signature images, initials images,
strokes, evidence, or authentication details. On failure it preserves the workflow configuration
and offers Retry Preview.

## 17. Field Placement integration

`Workflow participant → view readiness → Open Field Placement → assign → return`.

`FieldsPage.tsx` now accepts a `returnTo` query parameter, validated to `/app/documents/...`
with no `//`, no `..`, and no `<>"'`, capped at 200 characters. Back and Continue both honour it.
No participant name, email, requirement, or field value ever appears in the URL. Returning
re-runs validation because readiness is recomputed by the service on every load.

**Known limitation:** the field editor is bound to an active preparation draft. Opening it for a
document without one redirects safely to `/app/prepare` (existing guard). See §22.

## 18. Recipient-order conversion

`Create Stages from Current Recipient Order`. Each existing routing step becomes one stage;
recipients sharing a step stay together. Preview first, apply second, `Undo generated stages`
before leaving the builder. Existing configuration is **never** silently overwritten — the service
returns `CONFLICT` if a workflow already exists. A Signer role *suggests* a signature requirement
and says so in the preview text; approval, review, and acknowledgment requirements are never
inferred from a title or role.

## 19. Templates integration

`WORKFLOW_TEMPLATE_BLUEPRINTS` in the fixtures define reusable stage names, order, role
placeholders, actions, and eSignature direction. Role placeholders only — actual people are
resolved through the authoritative participant flow. No template versioning, no bulk send, no
conditional branching.

## 20. Participants, Activity, and Evidence boundaries

The Participants tab remains the canonical participant directory; the Workflow tab shows
assignments by stage. One person may hold several explicit stage assignments — each is a separate
action, never merged. Identity editing uses the authoritative participant flow.

`SigningWorkflowActivityRecord` is marked `demonstrationOnly: true`, is stored only in the
service's in-memory log, and is never called an audit trail, Evidence, proof of signature, proof
of delivery, or proof of legal completion. Canonical `ActivityEvent` and Evidence are untouched.

## 21. Notifications and NOTIFY

`SIGNING_WORKFLOW_NOTIFICATION_DEFINITIONS` defines seven events:
`stage_ready`, `participant_action_required`, `participant_reminder_due`, `stage_completed`,
`stage_blocked`, `participant_declined`, `completed`.

Each records audience, exclusions, channel direction, timing direction, reminder stop conditions,
deep link, fallback link, frontend readiness, and `backendReady: false`. Rendered as previews in
`WorkflowNotificationPreview`.

Reminder direction stops on: participant completed · declined · rejected · stage completed ·
workflow completed · transaction cancelled · voided · expired · participant removed · access
revoked.

**No second notification system was created**, no `NotificationRecord` fixtures were added, no
provider is called, nothing is scheduled, and no delivery is claimed.

> The NOTIFY skill is not registered in this environment, so `/notify flow` was not invoked. The
> event table above is the deliverable that command would have produced.

## 22. Search, Command Palette, Dashboard, Documents

Global search adds one safe destination type: `Signing Workflow — <document title>` →
`/app/documents/:id/workflow`, gated on `view_documents`, only for documents that have a workflow,
and only in the `documents` scope. **Not indexed:** participant emails or names, signature
requirements, field values, authentication data, consent evidence, inaccessible document titles,
or Workflow Automation records. The palette navigates only — it can never create or mutate a
workflow.

Dashboard and Documents-list projections were **not** added — see §24.

## 23. Permissions and capability

No new `PlatformPermission` values were added. `buildWorkflowPermissionContext()` maps the
existing ones onto the C37 vocabulary in one place:

| C37 capability | Requires |
|---|---|
| `view_document_workflow`, `view_workflow_progress`, `view_workflow_field_readiness`, `preview_workflow_notifications` | `view_documents` + document access |
| everything else (create / edit / delete / reorder / add stage / remove stage / assign participants / configure actions / configure signature requirements / configure stage execution / manage draft) | `view_documents` + `prepare_documents` + document access + **not** configuration-locked |

Viewing the workflow never grants document access. Assigning someone never grants them access.
A hidden tab is never treated as authorization — the routes are guarded independently.
Plan availability never grants permission. Query values can never grant permission.

Capability `signing-workflow`: `launch-core`, `enabledByDefault: true`,
`featureRequirements: ["documentsEnabled"]`, `permissionRequirements: ["view_documents"]`,
`indexable: false`, `sitemapInclude: false`, `safeFallbackRoute: /app/documents`.

## 24. Brand, logo, motion, haptics

**Palette:** Azure primary/current-stage · Deep Navy structure · Light Azure selected surfaces ·
Slate/Cool Gray support · Success Green complete · Warning Amber attention · Error Red blocked.
Gold is defined but used sparingly. **Burgundy never appears.**

**Logo:** the canonical C36 `LagdaLogo` component is reused. No second logo component or asset
registry. It appears in exactly **one** place — the empty-state surface, `colored-icon`, `lg`,
`decorative` — because the authenticated shell already provides identity elsewhere. It is never
used as a stage icon, participant icon, completion check, drag handle, progress marker, stage
badge, or button content; never recoloured, cropped, traced, rotated, distorted, or animated.

**Motion:** 160–200ms transform/opacity transitions, one-shot `wf-enter` rise, no continuous
pulsing, no confetti, no endless motion implying live updates. Everything is disabled under
`prefers-reduced-motion`. Motion is never the only status signal.

**Haptics:** `src/app/utils/interaction-feedback.ts` wraps the existing `utils/haptic.ts`.
**Disabled by default** — no approved opt-in preference architecture exists, so
`enableInteractionFeedback(true)` is never called in this build and every call is a silent no-op.
It also respects `prefers-reduced-motion`, uses only very brief existing patterns, covers five
moments only (reorder committed, moved between stages, validation resolved, invalid drop,
important confirmation), never fires on click/hover/scroll/passive updates, always accompanies
visible feedback, never blocks an interaction, adds no dependency, and requests no permission.

## 25. Accessibility

One `<h1>` per route · logical headings · accessible board label with a text sequence
description · accessible stage-column labels (number, name, status, counts, current-stage,
issues) · accessible participant-card labels (name, action, requirement, status, blocking,
position) · `<ol>` timeline · table captions.

**Drag is never required.** Every reorder has Move Left/Right (stages), Move Up/Down
(participants), a Move-to-Position select, and full keyboard operation. Controls are rendered on
every device, including mobile. Reorders are announced through a single polite live region, and
parallel vs. ordered stages get *different* announcements so visual order is never confused with
execution meaning.

Focus: sheets contain focus with a Tab trap, close on Escape, and restore focus to the opener.
Buttons are ~44px; icon-only controls carry `aria-label`; `:focus-visible` rings are Azure.
Only one view is mounted at a time, so no hidden duplicate control enters the focus order.
No status is colour-only or icon-only. Long names and emails use `overflow-wrap: anywhere`.

## 26. Responsive

Desktop `wf-split` (content + 340px panel) → single column at 1100px → stacked stages, full-screen
preview sheet, and a sticky bottom action bar at 860px. The sticky bar is `position: sticky`
inside flow (not fixed), so it never covers content, and it respects
`env(safe-area-inset-bottom)`. Only `.wf-board-scroll` scrolls horizontally; the page never does.
All sizing is relative, so 200% zoom behaves like a narrow viewport and retains every action.

## 27. Loading, empty, and error states

Loading: workflow tab, builder, stage list, participant candidates, document preview, field
readiness, review, status board, stage detail, workspace switch — all preserve the platform and
document shells, use `role="status"`, respect reduced motion, and cancel stale requests via
`AbortController`.

Empty: no workflow · no stages · empty stage · no field assignments · no validation issues ·
no current stage · no search/filter result (with Clear Search / Clear Filters).

Error: Workflow Not Found · Stage Not Found · Document Restricted · Capability Unavailable
(reuses C35 `CapabilityUnavailable`) · Document Preview Unavailable (preserves configuration,
offers Retry) · Field Reference Stale · Participant Unavailable · Partial Error (section-level) ·
Full Error (Retry + Return to Document + Contact Support). No stack traces, no raw IDs, no
inaccessible titles, no redirect loops, one `<h1>`.

## 28. Workspace, account, and session cleanup

`PlatformContext.switchWorkspace` calls `clearWorkspaceScopedWorkflows(nextWorkspaceId)`;
`signOut` calls `resetSigningWorkflowDemonstration()`. `useWorkflowData` watches the workspace ID
and clears the selected workflow, stage, participant, and preview context, then reloads — so prior
workspace content cannot flash. Selection also clears on document change. Sheets and dialogs
unmount with the route. **Nothing is written to localStorage or sessionStorage.**

## 29. Route and query safety

Path values: `documentId`, `stageId` — both shape-validated (`^[A-Za-z0-9_-]{1,64}$`).
Query values: `view` (validated against a whitelist, falls back to `board`), `step` (whitelist,
falls back to `basics`), `from=recipients` (opens a *preview* only), `returnTo` (validated internal
path). Router state carries `workflowJustCreated` only.

No email, name, document title, signature requirement, or field value is ever placed in a URL.
No query value can create a stage, reorder stages, complete a participant, broaden access, or
elevate the capability profile. Refresh, Back, and Forward all work; `setSearchParams` uses
`replace: true` for view/step changes so no history loop forms.

## 30. Unsaved-change handling

The builder warns only when there is genuine untransferred work (typed basics with no draft yet).
An untouched form never warns. `beforeunload` plus an explicit confirm on Back, both saying the
temporary frontend state will be cleared. The participant panel confirms before discarding edits
and restores focus on cancel. Nothing sensitive is persisted to avoid loss.

## 31. Client-side security and privacy

Never rendered: signature representations, Signature Library records, authentication codes, access
tokens, recipient links, consent evidence, IP addresses, device evidence, filled field values,
another participant's private status. Emails arrive pre-masked and are never unmasked.

The HTML5 drag payload contains **only an opaque assignment ID** — no name, email, requirement, or
field data. All user text goes through `normalizeWorkflowText` (control characters stripped,
whitespace collapsed, length-capped, plain text only). No `dangerouslySetInnerHTML`. Nothing is
logged. Cross-workspace members and suspended members never reach the participant picker.

## 32. Legal and eNotary boundaries

No claim of legally approved, guaranteed valid signing order, court-approved routing, certified
stage, legally completed stage, verified identity, notarized, immutable history,
evidence-backed board, or guaranteed enforceability. Language used: Signing Workflow, recipient
routing, required participant action, electronic signature required, Workflow Preview, frontend
demonstration, stage progress, field readiness.

`WORKFLOW_LEGAL_NOTICE`: *"Legal effect depends on the document, the parties, the circumstances,
and applicable requirements."*

No notary stage, notary role, notarial session, notarial certificate, seal stage, accreditation
stage, Supreme Court review stage, automatic notarization, or eNotary automation was added. Where
future eNotary is referenced anywhere in the platform, the exact wording remains:
**"Coming Soon — Subject to Supreme Court Accreditation and applicable rules."**

## 33. Testing

**The repository has no test framework** — `package.json` contains no vitest, jest, playwright, or
axe, and `npm run check` is an alias for `vite build`. No automated tests could be run or added
without introducing a test toolchain, which is outside this command's scope.

Verification actually performed:

1. `npm run build` — production build succeeds.
2. Strict TypeScript check of every new file, run with a temporary config:
   ```
   npx -y -p typescript@5.6.3 tsc --noEmit --strict --skipLibCheck --jsx react-jsx \
     --module esnext --moduleResolution bundler --target ES2020 <new files>
   ```
   Result: **zero errors in Command 37 files.** Ten pre-existing errors were surfaced in
   `capability-resolver.ts`, `PlatformContext.tsx`, and the C32 sections of
   `global-search.service.ts`; they are untouched and listed in §35.

The full intended test specification (domain, route, builder, stage order, participant, action,
field-readiness, kanban, preview, progress, notification, brand, motion, haptic, permission,
workspace/session, state, accessibility, responsive, and security suites) is retained in the
Command 37 brief and should be implemented once a test framework is added.

## 34. Deferred backend requirements

See `docs/backend-integration-handoff.md` § *Signing Workflow (Command 37)*.

## 35. Known limitations

1. **No automated tests.** No framework exists in the repository.
2. **No type-checking or linting in the repo.** There is no `tsconfig.json`, no `typescript`
   dependency, and no ESLint configuration. Type-checking required a temporary config and `npx`.
   Adding `tsconfig.json` + a `typecheck` script is the highest-value follow-up.
3. **Ten pre-existing type errors** in `capability-resolver.ts` (1), `PlatformContext.tsx` (1),
   and `global-search.service.ts` (8 — saved-view `description`, and the C32 automation builder's
   `subtitle` / `matchFields` / `score` properties). Left untouched as out of scope.
4. **Field Placement round trip is conditional.** `returnTo` is honoured, but the editor requires
   an active preparation draft; without one it safely redirects to `/app/prepare`.
5. **Dashboard and Documents-list projections were not added.** They were optional in the brief,
   and adding workflow columns to the documents list would have meant loading workflow state for
   every row — a real performance and access-scoping cost for a secondary signal. Deferred
   deliberately, not overlooked.
6. **Progress reflects fixtures, not enforcement.** Stage advancement, participant eligibility,
   and completion are read from deterministic frontend fixtures. Nothing is enforced.
7. **`WorkflowTab` chunk is ~93 kB (~23 kB gzip)** because it carries the shared workflow
   component set. The other three routes are 9–25 kB and reuse it.
8. **No recipient groups, quorum, weighted voting, or conditional branching** — deliberate.
9. **NOTIFY and STITCH skills are not registered** in this environment, so neither was invoked.


---

## Post-implementation audit (SWEEP · STITCH · BRAND · MOBILEVIEW · TEST)

Full record: `docs/signing-workflow-post-implementation-audit.md`.

Six findings fixed after C37 landed:
- Native `window.confirm` (C37 held the only 6 uses in the repo) replaced with a focus-trapped
  in-app `WorkflowConfirmDialog`.
- Dead export `ActionPill` removed.
- `/help` and `/contact` now open in a new tab, matching the PlatformHeader / UserMenu
  convention, so a sender is not pulled out of the authenticated shell mid-task.
- **`wf_004` removed and `txn_004` reserved as the editable, workflow-free document.** Because
  `txn_004` is the only draft transaction fixture, seeding a workflow onto it had left the
  empty-state CTA, the from-scratch creation flow, and the recipient-order conversion
  unreachable anywhere in the demonstration. Issue demonstrations moved to `wf_008`.
- Touch targets below 44px raised on touch viewports (`.wf-btn-sm`, both board icon buttons,
  the summary disclosure toggle).
- "Issues only" checkbox label given a 44px hit area.

Accepted with rationale, not changed: `demo-clock` is not used for mutation timestamps (they
are session events, not fixtures); the 860px board breakpoint deliberately differs from the
project's 768px threshold; the Field Placement round trip remains conditional on an active
preparation draft.

**Systemic finding, not a C37 defect:** the brand guideline's raw tokens (`#EAF6FF`,
`#E5E7EB`, `#22C55E`) are used **zero** times platform-wide; the codebase uses derived
accessible pairs (`#F0F9FF`, `#E2E8F0`, `#166534`). C37 matches the codebase. Reconciling the
brand doc with the implemented palette needs its own command.
