# Workflow Automation — Pre-Build Audit

> Generated: C32 Step 1 — baseline scan before any automation code is written.

---

## 1. Purpose

This document records every existing "automation-adjacent" pattern in the LAGDA codebase — defaults, per-field controls, completion logic, folder/tag assignment, reminder direction, template defaults — so that the new Workflow Automation layer integrates cleanly rather than duplicating or conflicting with existing code.

---

## 2. Existing Settings Captured at Prepare Time

**File:** `src/app/pages/platform/prepare/SettingsStep.tsx`

The Settings step (step 5 of 7 in the Prepare workflow) already captures four groups of per-transaction controls:

| Group | Fields captured | Default values |
|---|---|---|
| **Invitation** | `subject` (string, max 200), `message` (string, max 2000), `senderDisplayName` (string, max 100) | `"Please review and sign {title}"`, `""`, `""` |
| **Reminders** | `enabled` (bool), `firstReminderDays` (1–30), `repeatIntervalDays` (1–30) | `true`, `3`, `7` |
| **Expiration** | `enabled` (bool), `expiresAt` (ISO date or null) | `false`, `null` |
| **Completion** | `notifySenderOnComplete`, `sendCompletionCopyToParticipants`, `sendCompletionCopyToCCRecipients`, `allowParticipantDownload`, `createVerificationRecord` (all bool) | `true`, `true`, `true`, `true`, `true` |

**Constraints (existing):**
- Settings are stored in `PrepareContext` React state only.
- No reminders, invitations, or notifications are dispatched from the frontend.
- Invitation messages are explicitly not persisted beyond the browser session.
- No schedulers, SSE, or timers exist anywhere in `src/`.

**Automation implication:** The Workflow Automation "Reminder Direction" and "Completion Behavior" policy families govern the *default* values pre-filled into these fields. They do NOT override the per-transaction choices a sender makes — they supply the initial values. Automation must never mutate `PrepareContext` or `PreparationDraft` directly; it only informs `DEFAULT_PREP_SETTINGS` at configuration time.

---

## 3. Model: `PrepSettings` and `DEFAULT_PREP_SETTINGS`

**File:** `src/app/models/prepare.ts`

```typescript
// Reminder sub-model
interface PrepReminderConfig {
  enabled: boolean;
  firstReminderDays: number;   // 1–30
  repeatIntervalDays: number;  // 1–30
}

// Expiration sub-model
interface PrepExpirationConfig {
  enabled: boolean;
  expiresAt: string | null;    // ISO date
}

// Completion sub-model
interface PrepCompletionConfig {
  notifySenderOnComplete: boolean;
  sendCompletionCopyToParticipants: boolean;
  sendCompletionCopyToCCRecipients: boolean;
  allowParticipantDownload: boolean;
  createVerificationRecord: boolean;
}

// Invitation sub-model
interface PrepInvitationConfig {
  subject: string;
  message: string;
  senderDisplayName: string;
}

// Full settings
interface PrepSettings {
  invitation: PrepInvitationConfig;
  reminders: PrepReminderConfig;
  expiration: PrepExpirationConfig;
  completion: PrepCompletionConfig;
}
```

`DEFAULT_PREP_SETTINGS` is the constant the automation "Request Defaults" policy family writes to conceptually at runtime (in production: stored per workspace; in demonstration: resolved at initialization from the active policy set).

---

## 4. Existing Template Defaults

**Files:** `src/app/pages/platform/templates/UseTemplatePage.tsx`, `src/app/pages/platform/templates/TemplateDetailPage.tsx`

Templates currently store a `settings` field of type `PrepSettings` (same shape as per-transaction settings). When a sender uses a template, `PrepareContext` is pre-populated with the template's stored settings. This is the primary per-template override pathway.

**Automation implication:** Automation "Request Defaults" policy applies when no template is active, or when the template has left a field at its own default. Template-level settings always win over workspace-level automation policy defaults. Automation must never write to template records.

---

## 5. Existing Workspace Settings

**File:** `src/app/pages/platform/settings/WorkspaceSettingsPage.tsx`

The workspace settings page contains branding, member management, and API key controls. It does **not** currently expose reminder or completion defaults at the workspace level — those are exclusively per-transaction or per-template.

**Automation implication:** The new "Organization Policies" policy family adds workspace-level defaults that fill the gap between "no template" and "explicit per-transaction override." This is additive — no existing workspace settings page content changes.

---

## 6. Existing Auth Method Configuration

**File:** `src/app/models/prepare.ts` — `getAuthMethodConfig()`

Auth methods available per participant:
- `none` — no authentication
- `email_otp` — email OTP
- `sms_otp` — SMS OTP
- `id_verification` — government ID verification
- `biometric` — facial biometric match

**Automation implication:** The "Participant Security" policy family can express preferred minimum auth-method requirements by participant role. This is a recommendation/default mechanism only — it never bypasses or auto-applies authentication to a live participant session.

---

## 7. Existing Document Organization (from C31)

**File:** `src/app/services/mock/document-organization.service.ts`

Available operations for automation to integrate with:
- `assignFolder(documentId, folderId)` → `OrgResult<OrgDocument>`
- `removeFromFolder(documentId)` → `OrgResult<OrgDocument>`
- `assignTag(documentId, tagId)` → `OrgResult<OrgDocument>`
- `removeTag(documentId, tagId)` → `OrgResult<OrgDocument>`
- `starDocuments(documentIds)` → `OrgResult<void>`
- `unstarDocuments(documentIds)` → `OrgResult<void>`
- `listFolders({})`, `listTags({})`, `listSavedViews()`

**Automation implication:** "Organization Policies" can specify post-completion folder and tag defaults. These are expressed as policy intent — no auto-execution in demonstration mode. The simulation engine shows *projected* state, marked `demonstrationOnly: true`.

---

## 8. Existing Notification Center (from C29)

**File:** `src/app/services/mock/notification-center.service.ts`

In-memory notification store with:
- `push(notification)` — adds a notification to the in-memory list
- `markRead(id)`, `markAllRead()`, `dismiss(id)`
- `listNotifications(filter)` — returns paginated list

**Automation implication:** Automation activity events can project to notification center entries. The simulation engine can generate projected notifications without calling `push()` — they are shown as "projected" entries, not real notifications.

---

## 9. Existing Trigger-Like Patterns

**Scan result:** No trigger, scheduler, event-bus, webhook dispatcher, SSE stream, cron, or rule-evaluation code exists anywhere in `src/`. The closest patterns are:

1. `PrepareContext` `validate()` — synchronous validator called on demand; returns `PrepValidationResult`
2. `documentOrganizationService.bulkAssign()` — batch operation on explicit user action
3. `globalSearchService.search()` — on-demand query with scope filters

**Automation implication:** The automation service is the first trigger-evaluation engine in the codebase. It is entirely synchronous, in-memory, and demonstrationOnly. No background execution, no real event firing.

---

## 10. Existing Route and Navigation Patterns

**File:** `src/app/config/platform.nav.ts`

Current nav groups:
- Primary: Dashboard, Documents, Templates, Contacts, Reports
- Utility: Notifications, Settings
- Settings: Profile, Workspace, Team, Security, Billing, Integrations

**Automation implication:** A new "Automation" primary nav entry needs to be added with `automationEnabled` feature flag guard and `view_workflow_automation` permission guard.

---

## 11. Existing Global Search Integration Points

**File:** `src/app/services/mock/global-search.service.ts`

Scope builders already registered: `documents`, `templates`, `contacts`, `team`, `reports`.

**Automation implication:** A new `automation` scope builder should add rules, policies, and conflict results to global search. Three new Command Palette commands should be added: Open Rules, Open Policies, Open Conflicts.

---

## 12. What Does NOT Exist (confirmed absent)

| Capability | Status |
|---|---|
| Trigger evaluation engine | **Absent** — C32 creates it |
| Rule storage / CRUD | **Absent** — C32 creates it |
| Policy storage | **Absent** — C32 creates it |
| Conflict detection | **Absent** — C32 creates it |
| Simulation engine | **Absent** — C32 creates it |
| Activity log for automation events | **Absent** — C32 creates it |
| WebSockets / SSE / cron | **Absent** — must remain absent |
| Real email / SMS / webhook delivery | **Absent** — must remain absent |
| Automatic signing / auth bypass | **Absent** — must remain absent |

---

## 13. Integration Constraints

These are hard constraints derived from the audit — automation MUST respect all of them:

1. **No real delivery.** No invitations, reminders, or notifications are dispatched.
2. **No mutation of PrepareContext.** Automation informs defaults at initialization, not at runtime.
3. **Template wins over workspace policy wins over automation default.** Priority is always explicit > template > workspace > automation policy > system default.
4. **Burgundy (#67023B) never appears** in any automation UI. Automation is eSignature only.
5. **No localStorage / sessionStorage.** All automation state is module-level `let` variables.
6. **OrgResult<T> pattern.** All service methods return `OrgResult<T>`.
7. **Branded IDs.** All entity IDs use `string & { readonly __brand: "X" }`.
8. **demonstrationOnly: true** on all fixture data and simulation projections.
9. **No automatic actions on live participants.** Simulation shows projected state only.
10. **Inline styles only.** No Tailwind classes anywhere in JSX.
