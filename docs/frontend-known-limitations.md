# LAGDA Frontend Known Limitations

Last updated: 2026-07-16 (Commands 1–35 complete)

This document honestly describes all limitations of the LAGDA frontend in its current frontend-only phase. All limitations listed here are by design. They do not represent bugs; they represent the boundary between what the frontend demonstrates and what requires a production backend.

---

## Authentication and Accounts

| Limitation | Detail |
|------------|--------|
| No production authentication | Sign-in accepts any email/password combination and returns a fixture session. No credentials are validated. |
| No persistent accounts | Accounts created on /create-account exist only in React memory and reset on page reload. |
| No real session tokens | The session is held in React context memory only. Page reload resets to the signed-out state. |
| No real MFA | The MFA enrollment and challenge demonstrations show UI flows but do not generate or validate real TOTP secrets or OTPs. |
| No real email or SMS delivery | No email or SMS is ever sent. Forms that appear to send OTPs or invitations are demonstrations only. |
| No real account recovery | Forgot password and reset password flows show UI only. No token is issued and no password is changed. |

---

## Documents and Files

| Limitation | Detail |
|------------|--------|
| No real file upload | The upload step accepts files via the browser File API but does not upload them to any server. Files are referenced in-memory only and are lost on page reload. |
| No real PDF parsing | Page count and page dimensions shown in the field editor are from fixture data, not extracted from uploaded files. |
| No real document storage | Documents exist only as fixture records. No files are stored anywhere. |
| No real PDF rendering | Document page previews in the field editor are placeholder illustrations, not rendered from real PDF pages. |

---

## Signing and Completion

| Limitation | Detail |
|------------|--------|
| No real signing-request creation | The "Send" action in the Prepare workflow simulates request creation in frontend state. No signing requests are created on a backend. |
| No real participant invitations | No email is sent to participants. The invitation demonstration shows confirmation UI only. |
| No real signature persistence | Signatures and initials drawn or typed in the recipient flow are held in RecipientContext memory only. They are lost when the browser tab is closed. |
| No real field value persistence | Values entered by recipients in signing fields are held in memory only. They are not stored anywhere. |
| No real transaction completion | When a recipient "completes" a signing demonstration, no transaction is completed on any backend. The status shown is a frontend state update only. |
| No real audit trail creation | Activity events and evidence items shown in document detail pages are pre-seeded fixture data. They were not created by real user actions. |

---

## Verification and Evidence

| Limitation | Detail |
|------------|--------|
| No real document hashing | Document hashes shown in verification records are fictional fixture values. No real hash is computed. |
| No real verification record creation | Verification records are fixture data. No record is written to any persistent store when a document is "completed" in the demonstration. |
| No real immutable evidence | Evidence packages shown in the Evidence tab are fixture data. They are not immutable records created by a backend. |
| Verification does not constitute notarization | Document verification confirms a Verification ID matches a record in the demonstration. It is not a notarial act and is not equivalent to notarization. |

---

## Templates and Contacts

| Limitation | Detail |
|------------|--------|
| No real template persistence | Templates created or edited in the demonstration exist in TemplateContext memory only. They are lost on page reload. |
| No real contact persistence | Contacts created, edited, or imported in the demonstration exist in ContactContext memory only. They are lost on page reload. |

---

## Workspace Administration

| Limitation | Detail |
|------------|--------|
| No real member provisioning | Invitations sent in the demonstration do not create any email or membership record. |
| No real role enforcement | Permission checks are frontend-only. A user could navigate directly to a restricted URL without a real backend enforcement layer. |
| No real team persistence | Teams created or edited exist in WorkspaceAdminContext memory only. |

---

## Settings

| Limitation | Detail |
|------------|--------|
| No real profile persistence | Profile changes are held in module-level state in settings.service.ts. They reset on page reload. |
| No real password updates | The password change demonstration validates fields and shows success UI, but no real password is changed. |
| No real MFA enrollment | The MFA enrollment demonstration generates a placeholder code labeled as not a real TOTP secret. No real authenticator enrollment occurs. |
| No real session revocation | Session revocation in the Sessions page is a demonstration. No real session is revoked. |
| No real notification preferences | Notification preferences are saved in module-level state and reset on page reload. |
| No real branding persistence | Logo uploads create an object URL in memory. Brand color updates are in module-level state. Both reset on page reload. |
| No real billing or payments | Billing information is fixture data. Plan changes are simulated in frontend state. No subscription, invoice, or payment is created. |
| No real usage metering | Usage metrics are fixture data. They are not computed from real activity. |
| No real integrations | Integration connections are simulated in module-level state. No OAuth exchange, credential storage, or data synchronization occurs. |
| No real API keys | API keys are not generated. "Do not generate API keys" is enforced in all demonstration screens. |
| No real webhooks | Webhook configuration is not implemented. |
| No real data export | The data export request creates a demonstration record in module-level state. No archive is generated and no data is delivered. |
| No real account deletion | The account closure request creates a demonstration record in module-level state. No account, Workspace, document, transaction, or stored data is deleted. |

---

## eNotary

LAGDA eNotary is Coming Soon and Subject to Supreme Court Accreditation and applicable rules.

LAGDA eNotary is not active in any part of the application. It does not appear as:
- An active product feature
- A purchasable plan
- A Workspace role
- A participant role in any document transaction
- A field type
- A routing stage
- A billing metric
- An integration
- An API or webhook event

eNotary content is limited to the public /enotary/* information pages which clearly indicate Coming Soon status.

---

## Performance and Production-Readiness

| Limitation | Detail |
|------------|--------|
| No backend required for demonstration | All core workflows function without network access. |
| Plan ID inconsistency | MOCK_SUBSCRIPTION.plan uses "professional" which does not exist in the pricing.config.ts PlanId enum. The billing comparison table cannot highlight the current plan. Fix requires aligning the plan enum at API integration time. |
| No test framework configured | Vitest is not configured. Testing strategy is documented but no tests exist in the current build. |
| returnTo not allowlisted | The returnTo query parameter in auth redirects is not validated against an allowlist. Must be fixed before production deployment. |
| Legal pages in DRAFT | Privacy policy and Terms of Service are marked DRAFT and require legal counsel review before publication. |
| "legally certified audit outputs" phrase | Found in TransactionDetailPage.tsx:1154. Must be reviewed and replaced before production. |

---

## Signature Library (C26)

| Limitation | Detail |
|------------|--------|
| No real signature persistence | Saved signatures exist in `signature-library.service.ts` module-level state only. They are lost on page reload. |
| No signature verification | The library stores draw-mode and type-mode signatures as data strings. No cryptographic binding to a signer identity exists. |

---

## Recipient Inbox (C27)

| Limitation | Detail |
|------------|--------|
| No real inbox population | Inbox items are fixture data. They are not generated by real signing requests sent to the current user. |
| No real completion tracking | Marking an item complete is a frontend state update only. No backend record is created. |

---

## Notifications (C28)

| Limitation | Detail |
|------------|--------|
| No real notification delivery | Notifications are pre-seeded fixture data. No real events trigger them. |
| No real real-time push | The notification bell count does not update in real time. Refreshing re-loads fixture data. |
| No real preference enforcement | Notification preferences are stored in module-level state and do not affect which notifications appear. |

---

## Reports (C29)

| Limitation | Detail |
|------------|--------|
| No real report data | All report metrics, charts, and summaries are computed from fixture data. They do not reflect real signing activity. |
| No real CSV/PDF export | Export buttons show a demonstration of the UI. No real file is generated or downloaded. |
| No real date filtering | Date range filters update UI state but do not re-query any real data source. |

---

## Global Search and Command Palette (C30)

| Limitation | Detail |
|------------|--------|
| No real search index | Search results are computed from fixture data using in-memory string matching. No real full-text index exists. |
| No real relevance ranking | Results are ordered by a simple string-match score on fixture data. |
| Search scope results may be stale | When a document, contact, or template is "created" in the demonstration, it may not appear in search results because the fixture data is static. |

---

## Document Organization (C31)

| Limitation | Detail |
|------------|--------|
| No real folder persistence | Folders created in the demonstration exist in module-level state. They are lost on page reload. |
| No real tag persistence | Tags created or assigned exist in module-level state. They are lost on page reload. |
| No real saved views | Saved views are stored in module-level state. They are lost on page reload. |
| No real favorites | Favorited documents are tracked in module-level state. They are lost on page reload. |
| Bulk actions are simulated | Bulk moves, deletes, and tag assignments update local state only. No real document mutations occur. |

---

## Workflow Automation (C32 — Enterprise Preview)

| Limitation | Detail |
|------------|--------|
| Not available in default profile | Workflow Automation is enterprise-preview only. It is hidden from nav, dashboard, search, and command palette in the `launch-default` profile. Direct URL access (`/app/automation/*`) shows `CapabilityUnavailable`. |
| No real automation execution | Rules and policies do not trigger any real document events. The automation engine exists only as a frontend demonstration. |
| No real conflict detection | Conflict detection algorithms are simulated in the frontend service. No real evaluation occurs. |
| No real simulations | Policy simulations run against fixture data in the frontend service only. |
| No real activity log | Automation activity entries are fixture data and do not reflect real system events. |
| Prohibited action kinds are declared but not enforced | The backend handoff doc §38 lists 9 prohibited action kinds. These are not currently enforced in the frontend demonstration. |

---

## Feature Gating (C35, re-audited 2026-07-31)

| Limitation | Detail |
|------------|--------|
| Launch profile is compile-time only | `VITE_LAUNCH_PROFILE` is a build-time environment variable. There is no runtime mechanism to change launch profiles, and URL query parameters cannot override it. |
| Capability resolver uses frontend context only | `resolveCapability()` evaluates feature flags and role permissions as held in PlatformContext. A real backend would also enforce these server-side. |
| Permission checks are frontend-only | A user with direct URL knowledge could bypass frontend permission checks without a backend enforcement layer. |
| `routeIds` in the registry is decorative | Every capability declares `routeIds`, but **no code consumes it**. It cannot enforce anything and has already drifted from reality. Route gating is enforced only by explicit `CapabilityGuard` wrapping in `router.tsx`. |
| Navigation gates on feature flags, not capabilities | `platform.nav.ts` has no capability field; `PlatformSidebar`/`MobileNav` filter on `permission` + `featureFlag`. This now yields the correct result because `automationEnabled` is derived from the active profile, but a future capability whose flag is not wired would not be hidden by navigation alone. |
| Module-scope gates cannot see permissions | Search providers and command registries are evaluated at import time, so they use `isCapabilityInActiveProfile()` (profile only). Per-user enforcement happens at the route guard and via each result's `requiresPermission`. |

### Defects found and fixed in the 2026-07-31 re-audit

Recorded because each was latent for multiple commands. See
`docs/mvp-consolidation-reaudit.md`.

| Defect | Effect before fix |
|---|---|
| `automationEnabled` hardcoded `false` | Workflow Automation resolved unavailable in **every** profile, including `enterprise-preview`. The whole module was unreachable. |
| Module-scope gates used an empty capability context | `isAutomationSearchEnabled()` / `isCollaborationSearchEnabled()` were permanently `false` in every profile. |
| Three `post-launch` routes unguarded | `/app/documents/saved-views`, `/app/reports/saved`, `/app/settings/integrations` were reachable by direct URL in the launch profile. |
| `/dev/design-system` unguarded | A development-only page was live in production builds. |
| Resolver hardcoded one feature name | Gated Bulk Send and Collaboration routes told the user about *Workflow Automation*. |
| `notif-int-001` claimed webhook delivery | A notification asserted events "were delivered successfully" when nothing is sent. |

---

## Screens That Use Deterministic Demonstration Data

Every authenticated platform screen uses demonstration data. Key screens:

- Dashboard — fixture documents, templates, activity
- Documents list — all statuses represented with fictional transactions
- Document detail tabs — fictional participants, activity, evidence
- Prepare workflow — wizard captures data but does not create real requests
- Field editor — placeholder page previews, fictional fields
- Templates — fictional templates
- Contacts — fictional contacts
- Workspace administration — fictional members, teams, roles
- All settings pages — fictional profile, security, billing, usage, integrations
- Recipient flow — fictional signing requests (navigate to /sign/:requestId with fixture IDs)
- Verification — fictional verification records (navigate to /verify with fixture IDs)


---

## Signing Workflow (Command 37)

1. **No automated tests.** The repository has no test framework (no vitest, jest, playwright, or
   axe). No C37 tests could be written or run. Verification was a production build plus a strict
   TypeScript check of the new files using a temporary config and `npx typescript`.
2. **No type-checking or linting in the repository.** There is no `tsconfig.json`, no `typescript`
   dependency, and no ESLint configuration. `npm run check` is an alias for `vite build`, which
   uses esbuild and does not type-check. Adding `tsconfig.json` and a `typecheck` script is the
   highest-value follow-up.
3. **Ten pre-existing type errors** exist outside C37 and were left untouched:
   `capability-resolver.ts` (ImportMeta cast), `PlatformContext.tsx` (PlatformFlags cast), and
   `global-search.service.ts` (saved-view `description`, and the C32 automation builder using
   `subtitle` / `matchFields` / `score` instead of `description` / `matchedFields` / `matchScore`).
4. **Field Placement round trip is conditional.** The workflow passes a validated `returnTo`, and
   `FieldsPage` now honours it, but the field editor is bound to an active preparation draft.
   Opening it for a document without one redirects safely to `/app/prepare`.
5. **No Dashboard or Documents-list workflow projections.** Optional in the brief and deliberately
   deferred: adding a workflow column to the documents list would require loading workflow state
   for every row, which is a real performance and access-scoping cost for a secondary signal.
6. **Progress is fixture-derived, not enforced.** Stage advancement, participant eligibility, and
   completion come from deterministic frontend fixtures. Nothing is persisted, sent, signed, or
   enforced.
7. **No recipient groups, quorum, weighted voting, or conditional branching.** Deliberate: the
   repository contains no approved Recipient Group model with legal, permission, access, field,
   and notification boundaries.
8. **Haptics are disabled by default.** No approved interaction-preference opt-in exists, so
   `interaction-feedback.ts` is a permanent no-op in this build.
9. **NOTIFY and STITCH skills are not registered** in this environment, so neither was invoked.
   The notification event table in the C37 doc is the deliverable NOTIFY would have produced.
