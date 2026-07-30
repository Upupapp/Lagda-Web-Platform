# Workflow Automation — Rules, Policies, Simulations & Conflicts

**Command:** C32  
**Status:** Complete (frontend demonstration layer)  
**Routes:** `/app/automation/*` (10 routes)  
**Scope:** eSignature platform only — Burgundy (#67023B) and eNotary are NOT involved

---

## 1. Overview

The Workflow Automation module gives workspace owners and administrators a structured way to define **rules** (event-driven, conditional, action-producing) and **policies** (standing workspace-level defaults) that shape how document transactions are processed. All behavior is confined to the frontend demonstration layer — no real emails, webhooks, signing actions, or participant modifications are produced at any time.

Priority order for defaults (highest wins):
1. Explicit per-transaction setting
2. Template default
3. Matching active rule action
4. Workspace policy setting
5. System default

---

## 2. Routes

| Route | Component | Description |
|---|---|---|
| `/app/automation` | `AutomationOverviewPage` | Stats, active conflicts, recent activity |
| `/app/automation/rules` | `AutomationRulesPage` | Filterable rules list |
| `/app/automation/rules/new` | `CreateEditRulePage` | Create new rule |
| `/app/automation/rules/:ruleId` | `RuleDetailPage` | Rule detail + controls |
| `/app/automation/rules/:ruleId/edit` | `CreateEditRulePage` | Edit existing rule |
| `/app/automation/rules/:ruleId/test` | `TestRulePage` | Run simulation against rule |
| `/app/automation/conflicts` | `ConflictsPage` | Conflict detection center |
| `/app/automation/policies` | `PoliciesPage` | Policy family cards |
| `/app/automation/policies/:policyId` | `PolicyDetailPage` | Edit policy settings |
| `/app/automation/activity` | `AutomationActivityPage` | Automation event log |

Static sub-routes (`/new`, `/conflicts`, `/policies`, `/activity`) are declared before dynamic param routes (`:ruleId`, `:policyId`) in `router.tsx` to avoid shadowing.

---

## 3. Permissions

| Permission | Roles | Effect |
|---|---|---|
| `view_workflow_automation` | owner, administrator, sender | Can view all automation routes |
| `manage_workflow_automation` | owner, administrator | Can create, edit, activate, archive rules and policies |

Feature flag: `automationEnabled` — must be `true` in `PlatformFlags`. Default: `true`.

---

## 4. Data Models (`src/app/models/workflow-automation.ts`)

### Branded ID types
```typescript
AutoRuleId, AutoConditionId, AutoActionId, AutoPolicyId,
AutoConflictId, AutoSimId, AutoActivityId
```

### Result type
```typescript
type AutoResult<T> = { ok: true; data: T } | { ok: false; error: { code: string; message: string } }
```
Mirrors `OrgResult<T>` from document organization.

### Trigger kinds (13)
`document_sent`, `document_viewed`, `document_completed`, `document_declined`,
`document_expiring_soon`, `document_expired`, `participant_added`,
`participant_completed`, `authentication_failed`, `template_used`,
`transaction_created`, `workspace_member_joined`, `manual`

### Action kinds (9 available)
`send_notification`, `apply_tag`, `move_to_folder`, `set_reminder_schedule`,
`assign_auth_method`, `set_expiration`, `add_to_contact_group`,
`flag_for_review`, `create_verification_record`

### Prohibited action kinds (9)
Auto-signing, auto-approval, field completion, auth bypass, routing bypass,
permission changes, real email delivery, real SMS delivery, real webhook trigger.

### Rule status (6)
`draft`, `active-demonstration`, `paused`, `archived`, `invalid`, `conflict-detected`

### Rule priority (4)
`low`, `normal`, `high`, `critical`

### Conflict behavior (4)
`use_highest_priority`, `merge_non_conflicting`, `require_manual_review`, `proceed_anyway`

### Policy families (5)
| Family | Controls |
|---|---|
| `request_defaults` | Invitation subject, sender display name |
| `participant_security` | Min auth method per role (signer/approver/cc) |
| `reminder_direction` | Reminders enabled, first reminder days, repeat interval |
| `completion_behavior` | 5 completion action booleans |
| `organization` | Default folder ID, default tag ID |

### Conflict kinds (5)
`action_type_collision`, `parameter_value_collision`, `trigger_overlap`,
`priority_ambiguity`, `policy_rule_contradiction`

### Activity kinds (14)
`rule_created`, `rule_updated`, `rule_activated`, `rule_paused`,
`rule_archived`, `rule_restored`, `rule_duplicated`, `rule_removed`,
`policy_updated`, `policy_status_changed`, `conflict_detected`,
`conflict_resolved`, `simulation_run`, `conflict_scan_run`

---

## 5. Mock Service (`src/app/services/mock/workflow-automation.service.ts`)

Module-level in-memory stores (reset on sign-out):
```typescript
let _rules:     AutoRule[]
let _policies:  AutoPolicy[]
let _conflicts: AutoConflict[]
let _sims:      AutoSimulation[]
let _activity:  AutoActivity[]
```

### Key internals

**`validateRule(rule)`** — checks name required, trigger required, at least one action, param required fields, warns on no-conditions.

**`detectConflicts()`** — scans for:
- Action-type collisions between rule pairs that share the same trigger
- Policy-rule parameter collisions (reminder config, auth method config)

**`syncConflicts()`** — runs `detectConflicts()`, marks affected rules/policies as `conflict-detected`.

**`evaluateCondition(ctx, cond)`** — 10 operators: equals, not_equals, contains, not_contains, starts_with, greater_than, less_than, is_set, is_not_set, in_list.

**`runSimulation(ctx)`** — evaluates rule conditions against context, sorts matched rules by priority, resolves conflicts via `conflictBehavior`, generates `AutoSimProjectedChange[]`.

**`resolveDefaultsForContext(ctx)`** — walks policy chain to produce reminder/completion/invitation defaults (Template > Policy > System).

### Service API surface
```
listRules, getRule, createRule, updateRule, validateRule,
activateRule, pauseRule, archiveRule, restoreRule, duplicateRule, removeRule,
runSimulation, getSimulation, listSimulations,
listPolicies, getPolicy, getPolicyByFamily, updatePolicy, setPolicyStatus,
listConflicts, getConflict, resolveConflict, runConflictScan,
listActivity, getOverviewStats, resolveDefaultsForContext,
getTriggerConfigs, getActionConfigs, buildConditionId, buildActionId,
resetWorkflowAutomationDemonstration, clearWorkspaceScopedAutomation
```

---

## 6. Fixture Data

**6 fixture rules:**
- "Apply Urgent tag" — `active-demonstration`, trigger: document_expiring_soon
- "Default reminders" — `active-demonstration`, trigger: transaction_created
- "File completed docs" — `active-demonstration`, trigger: document_completed
- "Require SMS OTP" — `conflict-detected`, trigger: participant_added
- "Flag declined transactions" — `active-demonstration, critical`, trigger: document_declined
- "Enable verification records" — `draft`, trigger: document_completed

**5 fixture policies:** one per family, all `active`.

**2 fixture conflicts:**
- parameter_value_collision (warning): rule_002 vs pol_003 on reminder interval
- action_type_collision (error): rule_004 vs pol_002 on auth method assignment

**5 fixture activity entries** documenting the fixture rule states.

---

## 7. Pages

### AutomationOverviewPage
- Stats row: total rules, active, draft, conflicts, active policies, simulations run
- Demo notice banner (blue)
- Active conflicts panel + recent activity list
- "Scan for Conflicts" button
- Quick nav links to all sub-sections

### AutomationRulesPage
- Filterable list: search, status, priority, trigger
- Per-row actions: edit, activate/pause toggle, duplicate, archive
- Confirm archive modal

### CreateEditRulePage
- Unified create/edit form (detects mode via `ruleId` param)
- Trigger grid (13 triggers, aria-pressed)
- Condition builder (field/operator/value, add/remove, AND/OR logic)
- Action builder (pill buttons per kind, per-action param forms)
- Priority + conflict behavior selects
- Live validation via `validateRule()`

### RuleDetailPage
- Status badge, meta row (priority, conflict behavior, fired count, last fired)
- Conflicts banner if `status === "conflict-detected"`
- Trigger, conditions, actions display sections
- Status controls (activate/pause/archive/restore)
- Duplicate + remove with confirm dialog

### TestRulePage
- Context builder: trigger, transaction title, template name, participant count/role, sender role
- Pre-populates trigger from rule
- Runs `runSimulation()` → shows match verdict, projected changes table, activity notes
- All-matched-rules list

### ConflictsPage
- Active/resolved toggle
- Resolve modal: 4 resolution strategies + notes
- "Scan for Conflicts" button
- Empty states: green "no active conflicts" or grey "no resolved"

### PoliciesPage
- 5 family cards with icon, description, settings chips
- Policy status badge + link to detail

### PolicyDetailPage
- Family-specific editor forms:
  - request_defaults: text inputs
  - participant_security: 3 auth-method selects + amber warning
  - reminder_direction: checkbox + number inputs
  - completion_behavior: 5 boolean checkboxes
  - organization: folder/tag ID inputs

### AutomationActivityPage
- Filterable list: search + kind select
- "DEMONSTRATION" chip on every entry
- Load more pagination
- Kind icons and colors

---

## 8. Integration Points

### Global Search
Automation rules and policies appear as `navigation-command` results under the `"reports"` scope (no `"automation"` scope exists in `GlobalSearchScope`).

### Command Palette
5 commands registered under the `"Automation"` group:
- Open Automation (pinnable)
- Open Automation Rules (pinnable)
- Open Automation Policies
- Open Automation Conflicts
- Create Automation Rule (requires `manage_workflow_automation`)

### Platform Dashboard
`AutomationDirectionSection` renders for roles with `view_workflow_automation`, below the Reports section.

### Platform Nav
`Automation` entry added to `PRIMARY_NAV` under `automationEnabled` flag and `view_workflow_automation` permission. Desktop-only (`showOnMobile: false`).

### Session Lifecycle
- `signOut()` → `workflowAutomationService.resetWorkflowAutomationDemonstration()`
- `switchWorkspace()` → `workflowAutomationService.clearWorkspaceScopedAutomation(workspaceId)`

---

## 9. Hard Constraints (Demonstration Safety)

1. **No real delivery** — no email, SMS, webhook, or push notification is sent.
2. **No auto-signing** — rules cannot trigger signing, approval, field completion, or auth bypass.
3. **No mutation of PrepareContext** — automation does not modify the live prepare workflow.
4. **No Burgundy** — `#67023B` is strictly reserved for eNotary features. Automation uses Azure (#0078D4).
5. **demonstrationOnly: true** on all fixture and preview data.
6. **"Active in Demonstration"** — never "Live", "Running", or "Deployed".
7. **Module-level state only** — no localStorage, sessionStorage, cookies, or IndexedDB.
8. **No schedulers** — no WebSockets, SSE, setInterval, cron, or event buses.
9. **No prohibited action kinds** — the 9 prohibited kinds are listed in `AUTO_PROHIBITED_ACTIONS`; the service and UI enforce this at create/update time.
10. **Template > Policy > Rule > System** priority order is respected in `resolveDefaultsForContext()`.

---

## 10. Backend Handoff Notes

See `docs/backend-integration-handoff.md` §38 for the full endpoint specification, access control rules, and prohibited action enforcement requirements.


---

## Boundary with Signing Workflow (Command 37)

Command 37 added **Signing Workflow** — per-document, stage-based recipient routing at
`/app/documents/:documentId/workflow*`. It is a different system from Workflow Automation and the
two must never be merged.

| | Signing Workflow (C37) | Workflow Automation (C32) |
|---|---|---|
| Scope | One document transaction | Workspace-wide |
| Primitive | Stage → participant assignment → required action | Rule → trigger → condition → action; Policy |
| Capability | `signing-workflow` | `workflow-automation` |
| Maturity | `launch-core`, enabled by default | `enterprise-preview`, disabled by default |
| Feature flag | `documentsEnabled` | `automationEnabled` |
| Permissions | `view_documents` / `prepare_documents` | `view_workflow_automation` / `manage_workflow_automation` |

Hard rules:

- Signing Workflow imports nothing from `models/workflow-automation.ts` or
  `services/mock/workflow-automation.service.ts`.
- Signing Workflow works fully with `automationEnabled: false` — the default launch profile.
- `view_workflow_automation` never grants Signing Workflow access, and `view_documents` never
  grants Workflow Automation access.
- The Signing Workflow UI never mentions Rules, Policies, Simulations, or Conflicts.
- Global search never presents a Workflow Automation record as a Signing Workflow record.
- Workflow Automation remains an Enterprise Preview capability and is not a launch dependency.
