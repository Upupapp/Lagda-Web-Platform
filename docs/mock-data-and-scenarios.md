# LAGDA Mock Data and Scenarios

## 1. Purpose

All data displayed in the LAGDA frontend during the frontend-only phase is deterministic fixture data. No data is loaded from a real backend. This document describes the fixture architecture, ID strategy, scenario catalog, and how to extend or replace fixtures.

---

## 2. Fixture Registry

All fixture files live in `src/app/data/mock/`.

| File | Domain | Key exports |
|------|--------|-------------|
| index.ts | Cross-domain re-exports | MOCK_DOCUMENTS, MOCK_TEMPLATES, MOCK_CONTACTS, MOCK_NOTIFICATIONS |
| workspaces.ts | Session + Workspace | MOCK_CURRENT_USER, MOCK_WORKSPACES, MOCK_CURRENT_WORKSPACE, MOCK_SUBSCRIPTION |
| documents.ts | Document transactions | MOCK_DOCUMENTS (list), status spread across all statuses |
| transaction-detail.ts | Document detail tabs | MOCK_TRANSACTION_DETAIL, MOCK_PARTICIPANTS, MOCK_ACTIVITY, MOCK_EVIDENCE |
| verification.ts | Verification records | MOCK_VERIFICATION_RECORDS (match, mismatch, not-found) |
| prepare.ts | Preparation drafts | MOCK_PREPARE_DRAFT, MOCK_DRAFT_STEPS |
| field-editor.ts | Field placement | MOCK_FIELDS, MOCK_PAGES |
| recipient.ts | Recipient requests | MOCK_RECIPIENT_REQUESTS (signer, approver, reviewer, expired, etc.) |
| templates.ts | Template library | MOCK_TEMPLATES |
| contacts.ts | Contact directory | MOCK_CONTACTS, MOCK_CONTACT_GROUPS |
| workspace-admin.ts | Workspace admin | MOCK_WORKSPACE_DETAIL, MOCK_MEMBERS, MOCK_TEAMS, MOCK_ROLES |
| settings.ts | Settings domain | FIXTURE_USER_PROFILE, FIXTURE_BILLING_ACCOUNT, FIXTURE_INTEGRATIONS, etc. |

---

## 3. Identifier Strategy

All IDs use domain-prefixed lowercase strings. Format: `{prefix}_{context}_{sequence}`.

| Domain | Prefix | Example |
|--------|--------|---------|
| User | usr_ | usr_mls_001 |
| Workspace | ws_ | ws_mls_001 |
| Workspace Member | mbr_ | mbr_mls_001 |
| Team | team_ | team_mls_001 |
| Role | role_ | role_owner |
| Invitation | inv_ | inv_mls_001 |
| Contact | contact_ | contact_001 |
| Contact Group | group_ | group_001 |
| Template | tmpl_ | tmpl_001 |
| Transaction | txn_ | txn_001 |
| Participant | part_ | part_001 |
| Document | doc_ | doc_001 |
| Field | field_ | field_001 |
| Integration | intg_ | intg_gd_001 |
| Invoice | inv_bill_ | inv_bill_001 |
| Session | sess_ | sess_001 |
| Activity event | act_ | act_001 |
| Evidence item | evi_ | evi_001 |
| Verification record | ver_ | ver_001 |
| Recipient request | req_ | req_001 |

IDs are stable across fixture files. Cross-domain references use these constants (not inline strings) to ensure consistency.

---

## 4. Deterministic Clock

`src/app/utils/demo-clock.ts` provides all date construction for fixtures:
- Base date: `2026-07-16T08:00:00+08:00` (Asia/Manila)
- Use `isoDaysAgo(n)`, `isoDaysFromNow(n)`, `isoHoursAgo(n)` for relative dates
- Never use `new Date()` or `Date.now()` in fixture files
- Tests override the base date with `setDemoBaseDate()` for stable assertions

---

## 5. Fixture Builders

Current approach: inline object literals in each fixture file with typed exports.

Recommended pattern for new fixtures:
```ts
function buildTransaction(overrides: Partial<DocumentTransactionSummary>): DocumentTransactionSummary {
  return {
    id: "txn_default",
    title: "Sample Document",
    status: "draft",
    createdAt: isoDaysAgo(1),
    updatedAt: isoHoursAgo(2),
    participantCount: 1,
    completedParticipantCount: 0,
    workspaceId: "ws_mls_001",
    createdById: "usr_mls_001",
    ...overrides,
  };
}
```

Builders enforce type safety, reduce repetition, and make scenario creation readable.

---

## 6. Cross-Domain References

| Relationship | Source | Target | Verified |
|--------------|--------|--------|---------|
| Current user → workspace | MOCK_CURRENT_USER.workspaceId | MOCK_CURRENT_WORKSPACE.id | ✓ "ws_mls_001" |
| Transactions → workspace | DocumentTransactionSummary.workspaceId | MOCK_CURRENT_WORKSPACE.id | ✓ "ws_mls_001" |
| Members → workspace | WorkspaceMember.workspaceId | WS_MLS constant | ✓ |
| Billing seats (10) → member count (6 active) | FIXTURE_BILLING_ACCOUNT | MOCK_MEMBERS | ✓ Consistent |
| Usage Members-active (6/10) → actual members | FIXTURE_USAGE_DATA | MOCK_MEMBERS active count | ✓ Consistent |
| Subscription plan → workspace plan | MOCK_SUBSCRIPTION.plan | MOCK_CURRENT_WORKSPACE.plan | ⚠ "professional" ≠ PlanId |

**Known inconsistency:** `MOCK_SUBSCRIPTION.plan = "professional"` uses a `SubscriptionPlan` value ("professional") that does not exist in `PlanId` (pricing.config.ts). This means the billing comparison table cannot highlight the current plan. Documented in final-frontend-audit.md. Fix at API integration time by aligning the plan enum.

---

## 7. Scenario Catalog

### Authentication Scenarios

| ID | Description | How to trigger |
|----|-------------|----------------|
| auth_signed_out | Default unauthenticated state | Not signed in (context default) |
| auth_signed_in | Demonstration sign-in | Sign in with any email on /sign-in |
| auth_mfa_required | MFA challenge screen | /mfa route |
| auth_session_expired | Session expiry state | /app/session-expired route |
| auth_onboarding_incomplete | Onboarding not completed | /onboarding/* routes |

### Platform Scenarios

| ID | Description |
|----|-------------|
| platform_standard | Owner of Mabini Legal Solutions (default) |
| platform_new_workspace | Empty workspace (no documents, members, templates) |
| platform_read_only | Viewer role — navigation reflects restricted permissions |

### Document Scenarios

All transaction statuses are represented in `documents.ts`:
- Draft, Ready to Send, Sent, Delivered, Viewed, Auth Completed, Awaiting Signature, Awaiting Approval, Partially Completed, Completed, Declined, Cancelled, Expired, Failed Delivery, Voided, Needs Attention, Archived

### Recipient Scenarios

| ID | Role | Status |
|----|------|--------|
| req_signer_standard | Signer | Active |
| req_approver | Approver | Active |
| req_reviewer | Reviewer | Active |
| req_acknowledgment | Acknowledgment Recipient | Active |
| req_viewer | Viewer | Active |
| req_copy_recipient | Copy Recipient | Completed |
| req_expired | Signer | Expired |
| req_cancelled | Signer | Cancelled |
| req_already_actioned | Signer | Already completed |
| req_routing_locked | Signer | Locked — prior participant hasn't acted |

### Verification Scenarios

| ID | Outcome |
|----|---------|
| ver_match | Verified — document matches record |
| ver_mismatch | Mismatch — document does not match |
| ver_not_found | Record not found |
| ver_expired | Record expired |
| ver_invalid_id | Invalid Verification ID format |

### Settings Scenarios

All settings pages use `FIXTURE_*` data from `settings.ts`:
- Persona: Ana Reyes, Managing Attorney, Mabini Legal Solutions
- Plan: Business (annual), 10 seats
- Security: No MFA, 4 sessions
- Usage: Members-active warning (6/10)
- Integrations: 8 entries across 6 categories

---

## 8. Development-Only Scenario Controls

No visible scenario switcher exists in the current build. Scenarios are selected by:
- Navigating to specific routes (e.g., `/sign/req_expired` for the expired recipient scenario)
- Editing the fixture file (module-level change, requires page reload)

A development scenario panel (toggleable via environment variable) is recommended for future implementation. It must not appear in production-facing navigation.

---

## 9. Privacy Rules

- No real names, organizations, or email addresses
- All personal data is fictional (Ana Reyes, Mabini Legal Solutions, etc.)
- Email addresses use `@example.com` (IANA reserved domain)
- No real phone numbers
- No real IP addresses (example ranges only)
- No real document content
- No real signatures
- Card "4242" is fictional demonstration only

---

## 10. Reset Behavior

All session-local mutations (from mock service `let` variables) reset on page reload. There is no explicit "reset to demo defaults" button in the current build.

Recommended: Add a `/dev/reset` route or keyboard shortcut (e.g., Ctrl+Shift+R in dev mode) that calls a `resetAllDemoState()` function in each service. This should be development-only and excluded from production-facing builds.

---

## 11. Fixture Integrity Checks

Manual checks passing at 477f681:
- Current user → current workspace: ✓
- Member IDs unique: ✓
- Role IDs unique: ✓
- Transaction IDs unique: ✓
- Integration IDs unique: ✓
- Billing seat count consistent with member fixtures: ✓
- Usage metrics consistent with member count: ✓
- Plan inconsistency: ⚠ documented in audit

Automated fixture-integrity tests are recommended as the next testing investment (see testing strategy).

---

## 12. Adding a New Scenario

1. Add typed fixture data to the appropriate domain file in `src/app/data/mock/`
2. Use `isoDaysAgo(n)` / `isoHoursAgo(n)` for all dates (never `new Date()`)
3. Use the ID prefix convention for the new entity
4. Verify cross-domain references are consistent
5. Update this document with the new scenario ID and route
6. Add a route to router.tsx if a new path is needed

---

## 13. Backend Migration

At backend integration time:
1. Replace each `src/app/data/mock/*.ts` import with an API response
2. Replace each `src/app/services/mock/*.service.ts` with a real adapter
3. Keep fixture files as a fallback/offline mode for demonstration
4. Fixture integrity tests become API contract tests
