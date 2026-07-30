# LAGDA Frontend-to-Backend Integration Handoff

## 1. Current Frontend Scope

The LAGDA frontend (Commands 1–25) is a fully-typed React 18 + Vite + react-router 7 single-page application. It covers all LAGDA eSignature product surfaces:
- Public information portal (LAGDA.io)
- Authenticated customer platform (/app/*)
- Sender document-preparation workflows
- Recipient document-action workflows
- Templates, Contacts, Workspace Administration, Settings

All data is currently served by deterministic in-memory mock adapters. No backend is connected. The frontend is ready for backend integration.

---

## 2. Current Mock Service Boundaries

Every domain has a mock service in `src/app/services/mock/`. Replace each with a real adapter that implements the same interface. The page components require no changes.

| Mock service | Replaces with |
|--------------|---------------|
| auth.service.ts | POST /auth/sign-in, /auth/register, /auth/sign-out, GET /auth/session |
| document.service.ts | GET /api/documents, GET /api/documents/:id |
| transaction-detail.service.ts | GET /api/documents/:id/detail, /participants, /activity, /evidence |
| verification.service.ts | GET /api/verify/:verificationId |
| prepare.service.ts | POST/PUT /api/prepare/drafts |
| field-editor.service.ts | GET/PUT /api/prepare/drafts/:id/fields |
| recipient.service.ts | GET /api/sign/:requestId, POST /api/sign/:requestId/action |
| templates.service.ts | GET/POST/PUT /api/templates |
| contacts.service.ts | GET/POST/PUT/DELETE /api/contacts |
| workspace.service.ts | GET /api/workspaces |
| workspace-admin.service.ts | Full workspace admin CRUD |
| settings.service.ts | All 8 settings domain endpoints |
| notification.service.ts | GET /api/notifications, PATCH /api/notifications/:id/read |

---

## 3. Authentication Requirements

- OAuth 2.0 / OIDC recommended for production authentication
- Session tokens must be HTTP-only secure cookies (not localStorage)
- MFA: TOTP (RFC 6238) via authenticator app; SMS OTP optional
- Email verification for new accounts
- Password reset via time-limited secure token in email
- Session expiry: configurable; default 8 hours idle
- CSRF protection required for all mutation endpoints

**Frontend notes:**
- Frontend auth flow (`/sign-in`, `/create-account`, `/mfa/*`) is complete and awaits real token handling
- `PlatformContext.signIn()` accepts session + user + workspace; connect it to the real session endpoint
- `PlatformContext.signOut()` calls the signOut service — connect to POST /auth/sign-out

---

## 4. Session Requirements

- Server-issued session must include: userId, workspaceId, role, permissions, plan
- Session refresh must be transparent (sliding expiry)
- Session expiry must redirect to `/app/session-expired` (already implemented)
- Multiple workspace sessions: the user holds memberships across workspaces; the session must include all accessible workspace IDs

---

## 5. Authorization Requirements

- Backend must enforce all permissions (frontend permission checks are advisory only)
- Authorization model: User → WorkspaceMembership → Role → Permissions
- Roles include both system roles (Owner, Administrator, Sender, etc.) and custom roles
- Custom roles reference the same permission IDs as system roles
- Every write operation must verify the caller has the required permission

---

## 6. Workspace Tenancy

- Every resource (document, template, contact, member, invitation, team, role) belongs to a Workspace
- Cross-workspace access must be explicitly denied by the backend
- The frontend sends the current workspaceId in every API request (header or path segment)
- Workspace switching: frontend sends a new workspaceId; backend validates membership before returning data

---

## 7. Document Upload Requirements

- Upload endpoint: POST /api/documents/upload
- Accept: PDF (primary), DOCX, DOC (future)
- Maximum file size: to be determined (suggest 25MB)
- Virus/malware scanning required
- File stored encrypted at rest
- Return: fileId, pageCount, pageDimensions (for field placement)
- Multipart form upload recommended

---

## 8. PDF Processing Requirements

- Page extraction: return page count and dimensions in points
- Page preview generation: PNG or WebP thumbnail per page for field-editor canvas
- Field overlay merging: after signing, embed approved fields into a final PDF
- No client-side PDF manipulation (jsPDF or pdfmake): all PDF operations server-side

---

## 9. Document Storage

- Encrypted at rest (AES-256 or equivalent)
- Versioned: original + signed final
- Immutable after completion
- Deletion only on explicit account/workspace closure with appropriate retention controls
- Philippines Data Privacy Act (RA 10173) compliance required

---

## 10. Signing-Request Creation

- POST /api/documents/:id/send
- Idempotency key required (prevent double-send)
- Validates: all participants have email, routing is valid, at least one signing field per signer
- Returns: transactionId, participantRequests (with requestId per participant)
- No re-send to the same participant without explicit action

---

## 11. Participant Invitations

- Email delivery required (transactional email service)
- Include: requestId, document title, sender name, expiry date, action URL
- Action URL format: `{baseUrl}/sign/{requestId}`
- Delivery status webhook recommended (delivered, bounced, opened)
- SMS delivery optional for high-security auth flows

---

## 12. Email and SMS Delivery

- Transactional email: SendGrid, AWS SES, or equivalent
- Templates: signing invitation, reminder, completion, decline notification
- SMS: Twilio or local Philippine gateway for OTP delivery
- Required events: document-sent, participant-completed, document-completed, document-declined, document-expiring (72h and 24h), delivery-failed

---

## 13. OTP and Authentication

- Email OTP: 6-digit, 10-minute expiry, rate-limited (5 attempts / 15 minutes)
- SMS OTP: 6-digit, 5-minute expiry
- TOTP (app): RFC 6238, 30-second window, 1 window grace
- Knowledge-based authentication: to be specified separately
- OTP rate limiting must be enforced server-side

---

## 14. Signature Adoption and Storage

- Signature image: stored as base64 PNG server-side
- Initials image: same format
- Font-based signature: render at signing time, store rendered image
- Drawn signature: store raw strokes + rendered image
- Typed signature: store text + font name + rendered image
- Signature must be associated with: userId (or anonymous token), requestId, timestamp, IP address, user-agent

---

## 15. Transaction Completion

- All participants have completed → transaction status = "completed"
- Generate final merged PDF (fields embedded)
- Generate completion certificate (audit summary page)
- Store immutable final package: original PDF + signed PDF + completion certificate + evidence log
- Issue Verification ID (LAGDA-{workspace}-{date}-{random})
- Send completion notifications to all participants and sender

---

## 16. Activity and Evidence

- Every participant action creates an immutable activity event (server timestamp, IP, user-agent)
- Evidence package: activity log + IP geolocation (city level only) + device fingerprint (no biometrics) + signature image + field values at signing time
- Activity and evidence must be server-generated; frontend fixtures are display-only
- Activity log must not be modifiable after creation

---

## 17. Hashing and Verification

- Document hash: SHA-256 of the original file at upload time
- Signed document hash: SHA-256 of the final merged PDF
- Verification record: verificationId, documentHash, signedDocumentHash, completedAt, participantCount, issuerWorkspaceId
- Public verification endpoint: GET /verify/:verificationId (returns safe public fields only — no private content)
- Authenticated verification: GET /api/verify/:verificationId (may include additional context for the owning workspace)

---

## 18. Templates

- POST /api/templates — create template (no real document attached)
- PUT /api/templates/:id — update template fields and role placeholders
- POST /api/templates/:id/use — instantiate a preparation draft from a template
- Template must not store real participant PII (only role placeholders)
- Template usage count tracked server-side

---

## 19. Contacts

- Full CRUD: GET/POST/PUT/DELETE /api/contacts
- Unique by (email, workspaceId) — server enforces; frontend shows advisory duplicate warning
- Contact import: POST /api/contacts/import (CSV, max 500 rows)
- Contacts are workspace-scoped
- Contact groups: GET/POST/PUT/DELETE /api/contact-groups

---

## 20. Workspace Administration

- Member invite: POST /api/workspace/invitations (sends email with accept link)
- Accept invitation: POST /api/invitations/:id/accept (creates WorkspaceMembership)
- Member removal: DELETE /api/workspace/members/:id (cannot remove sole owner)
- Role assignment: PATCH /api/workspace/members/:id/role
- Custom role CRUD: /api/workspace/roles
- Team CRUD: /api/workspace/teams
- Workspace settings update: PATCH /api/workspace/settings
- Owner transfer: POST /api/workspace/transfer-ownership (requires confirmation)

---

## 21. Billing

- Billing managed by a subscription platform (Stripe, Paddle, or local equivalent)
- Plan change: POST /api/billing/plan-change (requires confirmation step; idempotency key)
- Invoice list: GET /api/billing/invoices
- Seat count: derived from WorkspaceMembership count (server-computed)
- Usage metering: server-computed; expose via GET /api/usage

---

## 22. Usage Metering

- All usage metrics (signing requests, storage, members, templates, etc.) are server-computed
- GET /api/usage?period=current-month (periods: current-month, previous-month, last-90-days, current-year)
- Return format must match `UsageMetric` type in `src/app/models/settings.ts`
- Warnings (approaching/exceeded) computed server-side; frontend uses them for display only

---

## 23. Integrations

- OAuth 2.0 exchange for each integration (Google, Microsoft, etc.)
- Integration tokens stored encrypted server-side
- Frontend integration configuration form submits credentials to POST /api/integrations/:id/configure
- Test connection: POST /api/integrations/:id/test
- Disconnect: DELETE /api/integrations/:id

---

## 24. Notifications

- Real-time: WebSocket or Server-Sent Events for live notification badge updates
- POST /api/notifications/:id/read
- POST /api/notifications/read-all
- Notification preferences stored server-side: GET/PUT /api/settings/notifications

---

## 25. Data Export and Account Closure

- Export request: POST /api/data/export-request (queues background job; delivers download link by email)
- Account closure: POST /api/account/close-request (requires ownership transfer if sole owner; 30-day grace period recommended)
- Export and closure must comply with RA 10173 right-to-erasure obligations

---

## 26. Error Contracts

Map backend HTTP status codes to frontend `LagdaErrorCode` (see `src/app/models/errors.ts`):

| HTTP | Backend code | LagdaErrorCode |
|------|-------------|----------------|
| 401 | auth_required | AUTH_REQUIRED |
| 401 | session_expired | SESSION_EXPIRED |
| 403 | permission_denied | PERMISSION_DENIED |
| 403 | plan_restricted | PLAN_RESTRICTED |
| 404 | not_found | NOT_FOUND |
| 409 | conflict | CONFLICT |
| 422 | validation_error | INVALID_INPUT |
| 422 | invalid_state | INVALID_STATE |
| 410 | request_expired | REQUEST_EXPIRED |
| 410 | request_cancelled | REQUEST_CANCELLED |

---

## 27. Pagination Contracts

All list endpoints should support:
- `?page=1&perPage=20` (default perPage: 20, max: 100)
- Response: `{ items: T[], total: number, page: number, perPage: number, hasNextPage: boolean }`
- Matches `PaginatedResult<T>` in `src/app/models/errors.ts`

---

## 28. Idempotency Requirements

Operations requiring idempotency keys:
- Document send (prevent double-send)
- Invitation send (prevent duplicate invitations)
- Plan change (prevent double-charge)
- Signature submission (prevent duplicate completion)
- OTP delivery (prevent spam)

---

## 29. Security Requirements

- HTTPS everywhere; HSTS header
- HTTP-only secure cookies for session tokens
- CSRF tokens for all state-changing endpoints
- Rate limiting on: sign-in (5/min), OTP delivery (3/10min), verification (20/min), all write endpoints (100/min per user)
- Input validation and output encoding server-side
- SQL injection prevention (parameterized queries)
- File upload validation: magic byte check + AV scan
- Content-Security-Policy header
- No secrets in API responses

---

## 30. Privacy Requirements

- Philippines Data Privacy Act (RA 10173) compliance
- Personal data minimization: collect only what is necessary
- Data retention policy: documents retained per workspace plan terms
- Right to access: data export endpoint (see §25)
- Right to erasure: account closure with data deletion (see §25)
- Cross-border transfer restrictions: consider data residency
- Privacy impact assessment recommended before launch

---

## 31. Observability Requirements

- Structured logging (JSON) for all API requests and errors
- Error tracking (Sentry or equivalent) for unhandled backend exceptions
- Metrics: p50/p95/p99 response times per endpoint
- Alerting: error rate > 1%, p95 latency > 500ms
- Audit log: immutable record of all signing, completion, and admin actions

---

## 32. Auditability Requirements

- All document lifecycle events logged with: userId, workspaceId, action, timestamp (server), IP, user-agent
- Audit log accessible to Workspace Owners and Auditors
- Audit log cannot be modified or deleted (append-only store)
- Verification records reference the immutable audit evidence

---

## 33. Migration from Deterministic Fixtures

Steps for each domain:
1. Keep the mock service in place initially
2. Create a real API adapter implementing the same interface
3. Toggle between mock and real via `APP_CONFIG.mockMode = false`
4. Run fixture-integrity tests against real data
5. Remove mock service once real adapter is stable
6. Keep fixture data as a seed for development database

---

## 34. Recommended Implementation Sequence

**Phase 1 — Core authentication (unblocks everything)**
- Sign in / sign out / session refresh
- Account creation + email verification
- MFA (TOTP first, SMS second)

**Phase 2 — Document transactions**
- File upload + PDF processing
- Document list and detail
- Transaction status management

**Phase 3 — Sending**
- Signing-request creation
- Participant invitations (email delivery)
- Recipient flow (sign/:requestId)

**Phase 4 — Completion**
- Signature adoption + field value storage
- Transaction completion
- Verification record creation
- Completion notifications

**Phase 5 — Platform**
- Templates (real persistence)
- Contacts (real persistence)
- Workspace administration (members, roles, teams)
- Notifications

**Phase 6 — Settings**
- Profile and preferences persistence
- Security settings (password, MFA real enrollment)
- Billing integration
- Integrations (OAuth connectors)
- Data export and account closure

---

## 35. Reporting and Analytics (Command 29)

### API Endpoints Needed
- `GET /api/v1/reports/documents?workspace_id=&from=&to=` — Document operations aggregation
- `GET /api/v1/reports/participants?workspace_id=&from=&to=` — Participant role/routing aggregation
- `GET /api/v1/reports/templates?workspace_id=&from=&to=` — Template usage aggregation
- `GET /api/v1/reports/verification?workspace_id=&from=&to=` — Verification outcome aggregation
- `GET /api/v1/reports/teams?workspace_id=&from=&to=` — Workspace and team activity aggregation
- `GET /api/v1/report-views` — List saved views for authenticated user
- `POST /api/v1/report-views` — Create saved view
- `PATCH /api/v1/report-views/:id` — Rename, update annotation, set default
- `DELETE /api/v1/report-views/:id` — Archive or remove saved view
- `POST /api/v1/reports/:family/export` — Async export (returns job ID / download URL when complete)
- `POST /api/v1/reports/:family/share` — Create time-limited share token
- `POST /api/v1/reports/schedules` — Create scheduled delivery
- `GET/DELETE /api/v1/reports/schedules/:id` — Manage schedules

### Query Parameters
All report queries must accept:
- `workspace_id` (required, from session — never from client without re-validation)
- `from` / `to` (ISO 8601 timestamps)
- `team_id` (optional scope filter)
- `sender_id` (optional scope filter)

### Privacy Requirements (Mandatory, not Optional)
- **No participant names** in any aggregate report output
- **No authentication evidence** (OTP attempts, biometrics, identity data)
- **No field values** filled by participants (signature text, text fields, initials)
- **No exact coordinates** or device fingerprints in report output
- **No personal My Actions data** in workspace reports
- **No cross-workspace data** — strict isolation by workspace_id from authenticated session

### Member Activity Endpoint Requirement
The Teams report requires a member activity note returned with aggregate data:

```json
{
  "memberActivityNote": "Member-level information is limited to operational workflow direction and should not be interpreted as a productivity, trust, identity, or legal-quality score."
}
```

This note must be server-generated, not client-side injected, so it cannot be stripped by a future API consumer.

### Permission Gate
All reporting endpoints require `view_reports` scope. The permission must be enforced server-side (not frontend-only).

### Export Privacy
Export endpoint must enforce same privacy restrictions as report API:
- No participant names, signatures, field values, device data, exact location
- Export file must not include authentication evidence
- Export must be scoped to the authenticated user's workspace only

### Saved Views Storage
Saved views in the frontend are currently module-level memory only (reset on reload). Backend needs:
- User-scoped saved views table (`user_id`, `workspace_id`, `name`, `family`, `date_preset`, `filters`, `is_default`, `status`)
- Annotation stored as plain text field (max 500 chars)
- Archived vs. active distinction
- Per-family default-view designation (one default per family per user)

### eNotary Boundary
No eNotary report family, metrics, notarial rankings, or accreditation reports. Reports are scoped to eSignature workflows only.

---

## 37. Global Search and Indexing (Command 30)

### Purpose

Replace the frontend's deterministic in-memory mock (`global-search.service.ts`) with a production search backend. The frontend service boundary is already defined — each domain projection maps to one or more backend endpoints.

### API Endpoints Required

```
GET /api/v1/search?q=&scope=&sort=&page=&perPage=     (authenticated; workspace-scoped from session)
GET /api/v1/search/commands?q=                         (authenticated; returns permitted commands only)
```

#### Query Parameters
- `q` — UTF-8 search query, max 200 chars
- `scope` — one of: `all | documents | my-actions | templates | contacts | people-and-teams | verification | notifications | reports | settings | help`
- `sort` — one of: `relevance | updated-at | title | status`
- `page` / `perPage` — pagination (default page=1, perPage=20, max perPage=100)

#### Response shape (must match `GlobalSearchResponse` in `src/app/models/search.ts`)
```json
{
  "query": "agreement",
  "scope": "documents",
  "groups": [
    {
      "scope": "documents",
      "label": "Documents",
      "icon": "FileText",
      "results": [...],
      "totalCount": 12,
      "hasMore": true
    }
  ],
  "totalPermittedCount": 12,
  "sourceStatuses": [{"scope": "documents", "status": "ok", "label": "Documents"}],
  "demonstrationOnly": false
}
```

#### Each result must match `GlobalSearchResult`
- `id` — stable, workspace-scoped ID
- `type` — one of the 18 `GlobalSearchResultType` values
- `title`, `description` — plain text only; no HTML
- `matchedFields` — pre-computed match ranges for safe client-side highlighting (never raw HTML snippets)
- `matchScore` — server-ranked relevance score (0–100); client uses for display order confirmation only
- `destination.path` — internal route path (validated against `SAFE_RETURN_ROUTE_PREFIXES` on both client and server)
- `availability` — server determines whether resource is available, archived, restricted, etc.
- `demonstrationOnly: false` — always false in production

### Privacy Requirements (Mandatory)

**The following must NEVER appear in search result `title`, `description`, or any snippet field:**
- Raw signatures, initials, or drawn marks
- Participant field values (text fields, signatures, checkboxes)
- Consent evidence or authentication event details
- Document content text (PDF body, OCR output)
- Integration credentials, API keys, or webhook secrets
- Payment details, billing identifiers
- Another user's personal My Actions or private notifications
- Signature Library entries (user's personal library)
- eNotary records, accreditation data, or notarial evidence
- OTP codes, MFA secrets, or session tokens

**Scope-level permission enforcement (server-side, not frontend-advisory):**
- `documents` → requires `view_documents` permission
- `my-actions` → returns only the authenticated user's own pending assignments
- `templates` → requires `manage_templates`
- `contacts` → requires `manage_contacts`
- `people-and-teams` → requires `manage_team`
- `verification` → requires `verify_documents`
- `notifications` → returns only the authenticated user's own notifications
- `reports` → requires `view_reports`
- `settings` → returns only route metadata; no stored config values
- `help` → no permission required; public help content only

### Indexing Architecture

Recommended: Elasticsearch or Meilisearch per workspace.

**Index per workspace** (strict tenant isolation — never cross-workspace):
```
index: lagda_search_{workspace_id}
```

**Index documents include:**
- `id`, `type`, `title`, `description`, `workspaceContext`, `teamContext`, `status`, `updatedAt`
- Pre-approved text fields only — document title, template name, contact name and organization, member display name
- **No document content body**, **no participant PII beyond display name**, **no signatures**

**Re-index triggers:**
- Document status change
- Template created/updated
- Contact created/updated
- Member role change
- Workspace settings update

### Match Range Generation

The frontend uses pre-computed `matchedFields[].ranges[]` (`{ start, end }`) for safe client-side highlighting. The backend must return these — never raw HTML with `<em>` or `<mark>` tags, which could be rendered unsafely.

```json
"matchedFields": [
  {
    "field": "title",
    "label": "Title",
    "text": "Retainer Agreement — Mabini Business Services",
    "ranges": [{ "start": 0, "end": 8 }]
  }
]
```

### Rate Limiting

- Search endpoint: 120 requests/minute per authenticated user
- Commands endpoint: 60 requests/minute per authenticated user
- Burst: 10 concurrent requests per user

### eNotary Exclusion

No eNotary search scope, index, or commands. Do not index eNotary records, session logs, or notarial evidence in this search infrastructure. If eNotary is implemented in the future, it must use a separate index and separate endpoint, gated by explicit eNotary accreditation status.

---

## 37. Document Organization (C31)

Document organization is a metadata and navigation layer. It does **not** change document access, ownership, workflow status, or legal records. Backend must enforce all access rules independently of organization state.

### Folders
- `GET /api/workspaces/:wsId/folders` — list folders; filter by `scope`, `parentId`, `status`
- `POST /api/workspaces/:wsId/folders` — create; enforce `MAX_FOLDER_DEPTH = 3` server-side
- `PATCH /api/workspaces/:wsId/folders/:folderId` — rename
- `DELETE /api/workspaces/:wsId/folders/:folderId` — soft-archive
- `POST /api/workspaces/:wsId/folders/:folderId/restore`
- `GET /api/workspaces/:wsId/folders/:folderId/documents` — returns document summaries in folder

**Access rule:** Personal folders (`scope = "personal"`) must only be returned to the owning user. Workspace Administrators must not see other users' personal folders.

### Tags
- `GET/POST /api/workspaces/:wsId/tags`
- `PATCH /api/workspaces/:wsId/tags/:tagId` — rename or update style
- `DELETE /api/workspaces/:wsId/tags/:tagId` — soft-archive
- `POST /api/workspaces/:wsId/tags/:tagId/restore`
- `POST /api/workspaces/:wsId/documents/bulk/add-tags` — `{ documentIds, tagIds }`
- `POST /api/workspaces/:wsId/documents/bulk/remove-tags`

**Tag style:** Backend must validate against the 10 allowed `OrgTagStyle` values. Never accept raw hex.

### Starred / Favorites
- `GET /api/users/:userId/starred-documents` — per-user, not workspace-scoped
- `POST /api/users/:userId/starred-documents` — `{ documentIds }`
- `DELETE /api/users/:userId/starred-documents` — `{ documentIds }`

### Recently Viewed
- `GET /api/users/:userId/recently-viewed?workspaceId=` — returns up to 20 most recent
- `POST /api/users/:userId/recently-viewed` — called when a document detail page mounts

### Saved Views
- `GET /api/users/:userId/saved-views` — personal, per-user
- `POST /api/users/:userId/saved-views`
- `PATCH /api/users/:userId/saved-views/:viewId/name`
- `POST /api/users/:userId/saved-views/:viewId/duplicate`
- `PATCH /api/users/:userId/saved-views/:viewId/default` — must clear previous default
- `DELETE /api/users/:userId/saved-views/:viewId` — soft-archive
- `POST /api/users/:userId/saved-views/:viewId/restore`

### Bulk move
- `POST /api/workspaces/:wsId/documents/bulk/move` — `{ documentIds, folderId }`

### Org-filtered document views
The five org views (starred, recently-viewed, owned-by-me, shared-with-me, awaiting-others) are currently handled client-side. When a real backend is connected, add these as accepted `view` query parameters on the main documents list endpoint so filtering can move server-side.

### What must never happen
- Folder/tag assignment must never change `TransactionStatus`, delivery state, participant list, or signing order
- Personal folder contents must never be visible to workspace admins
- `demonstrationOnly: true` must be stripped from all real API responses; it is a frontend-only flag

---

## 36. Explicit eNotary Exclusion

LAGDA eNotary is a separate future product pending Supreme Court accreditation. Backend work for eNotary must not begin until:
- Supreme Court accreditation is obtained
- Applicable rules are confirmed
- A separate implementation plan is approved

No eNotary backend routes, data models, or infrastructure should be built as part of this eSignature backend integration.

---

## 38. Workflow Automation — Rules, Policies, Simulations & Conflicts (C32)

Automation is a workspace-scoped configuration layer. Rules and policies configure how the platform behaves; they do **not** act on participants directly. All backend enforcement of prohibited actions listed below is mandatory.

### Access control
- `view_workflow_automation` — required to read any automation resource
- `manage_workflow_automation` — required to create, update, activate, archive, or delete rules/policies
- All automation resources are strictly scoped to the requesting workspace (`workspace_id` column on every row)
- Workspace members with `sender` role may read rules but must never write them

### Rules

```
GET    /api/workspaces/:wsId/automation/rules                 list rules; filter: status, priority, trigger, q
POST   /api/workspaces/:wsId/automation/rules                 create rule
GET    /api/workspaces/:wsId/automation/rules/:ruleId         get rule
PATCH  /api/workspaces/:wsId/automation/rules/:ruleId         update rule (name/description/trigger/conditions/actions/priority/conflictBehavior/scope)
POST   /api/workspaces/:wsId/automation/rules/:ruleId/activate    set status → active
POST   /api/workspaces/:wsId/automation/rules/:ruleId/pause        set status → paused
POST   /api/workspaces/:wsId/automation/rules/:ruleId/archive      set status → archived
POST   /api/workspaces/:wsId/automation/rules/:ruleId/restore      set status → draft (from archived)
POST   /api/workspaces/:wsId/automation/rules/:ruleId/duplicate    clone rule, set status → draft
DELETE /api/workspaces/:wsId/automation/rules/:ruleId         hard delete (only if status is draft or archived)
```

Rule validation (backend must enforce):
- `name` required, max 120 chars
- `trigger` must be a valid trigger kind
- `actions` array must have at least one element
- Each action `kind` must be in the allowed list (see Prohibited Actions below)
- Each action's required params must be present and non-empty

### Policies

```
GET    /api/workspaces/:wsId/automation/policies              list policies (one per family)
GET    /api/workspaces/:wsId/automation/policies/:policyId    get policy
PATCH  /api/workspaces/:wsId/automation/policies/:policyId    update policy settings
POST   /api/workspaces/:wsId/automation/policies/:policyId/activate   set status → active
POST   /api/workspaces/:wsId/automation/policies/:policyId/pause      set status → paused
```

Policy families: `request_defaults`, `participant_security`, `reminder_direction`, `completion_behavior`, `organization`. Each workspace has exactly one policy row per family (seeded on workspace creation). PATCH is additive/partial — only update fields included in the request body.

### Conflict detection

```
GET    /api/workspaces/:wsId/automation/conflicts             list conflicts; filter: resolved (bool)
GET    /api/workspaces/:wsId/automation/conflicts/:conflictId get conflict
POST   /api/workspaces/:wsId/automation/conflicts/:conflictId/resolve  resolve conflict (strategy + notes)
POST   /api/workspaces/:wsId/automation/conflicts/scan        trigger conflict re-scan; returns updated conflict list
```

Conflict detection must run:
- After any rule create/update/activate/archive
- After any policy update/status change
- On explicit `/scan` request

Detected conflicts update rule `status` to `conflict-detected` and policy `status` accordingly.

### Simulations

```
POST   /api/workspaces/:wsId/automation/simulations           run simulation against provided context
GET    /api/workspaces/:wsId/automation/simulations/:simId    get simulation result
GET    /api/workspaces/:wsId/automation/simulations           list recent simulations (last 50)
```

Simulation request body: `{ triggerKind, transactionTitle?, templateName?, participantCount?, participantRole?, senderRole? }`. Returns matched rules, projected changes, activity notes. Simulation results are read-only and must be flagged `demonstrationOnly: true` at the API level for the frontend environment.

### Activity log

```
GET    /api/workspaces/:wsId/automation/activity              list activity; filter: kind, q, limit, offset
GET    /api/workspaces/:wsId/automation/activity/:activityId  get single entry
```

### Default resolution

```
GET    /api/workspaces/:wsId/automation/defaults?templateId=... resolve defaults for a context
```

Returns the effective reminder, completion, and invitation defaults applying the priority chain: explicit per-transaction > template default > active rule action > workspace policy > system default.

### Prohibited actions — backend must reject these action kinds with HTTP 422

The following action kinds must never be executed by the backend, regardless of what the frontend sends:
- `auto_sign_document` — backend must never sign a document on a participant's behalf
- `auto_approve_document` — backend must never approve without participant action
- `auto_complete_fields` — backend must never fill signing fields
- `bypass_authentication` — backend must never skip the configured auth method
- `bypass_routing_order` — backend must never skip a signing order step
- `modify_participant_permissions` — backend must never change participant access rights
- `send_real_email` — email delivery must only occur through the notification service; automation rules must not trigger raw email sends
- `send_real_sms` — same as above for SMS
- `trigger_real_webhook` — webhook delivery must only occur through the integrations service; automation rules must not fire arbitrary HTTP requests

### Invariants

- Rules and policies must never modify `TransactionStatus`, the signing order, participant auth methods in progress, or document fields after a transaction is active
- Conflict detection must be idempotent — running the scan twice produces the same result
- All automation resources must be hard-deleted when a workspace is deleted
- Simulation results must never affect real transaction state
- `demonstrationOnly` is a frontend-only field; strip it from production API responses

---

## 39. MVP Consolidation Notes (C35)

### Capability Registry

The frontend now includes a canonical product capability registry at `src/app/config/product-capability-registry.ts`. Each capability lists its `backendDependencies` as strings. The backend must implement these services before a capability is production-ready.

The capability system is frontend-only. Backend must enforce all access controls independently — the frontend capability resolver does not substitute for server-side authorization.

### Feature Flag Synchronization

`DEFAULT_PLATFORM_FLAGS` in `PlatformContext.tsx` contains the client-side defaults. In production, the backend may override these per-workspace by returning a `featureFlags` object in the `/auth/me` response:

```json
{
  "user": { ... },
  "workspace": { ... },
  "featureFlags": {
    "automationEnabled": false,
    "reportsEnabled": true
  }
}
```

Only flags returned by the backend should override defaults. Unknown flags should be ignored. The backend must not expose `automationEnabled: true` to workspaces on plans that don't include Workflow Automation.

### Launch Profile Isolation

The `VITE_LAUNCH_PROFILE` environment variable controls which capability maturity levels are visible. The backend must not expose enterprise-preview endpoints to workspaces in the default launch profile. Profile boundaries should be enforced at both the frontend (compilation) and backend (authorization) layers.

### Permission Enforcement

The frontend `ROLE_PERMISSIONS` map (`src/app/models/index.ts`) defines which permissions each role receives. The backend must implement equivalent role-based access control. Frontend permission checks are advisory and not a security boundary.

### C33 / C34 Confirmation

Commands 33 (Bulk Send) and 34 (Real-time Collaboration) were not implemented. There are no frontend routes, services, models, or components for these features. The backend should not define endpoints for them at this stage.

### Backend Priority Reference

See `docs/backend-implementation-priority.md` for the full P0→P3 endpoint list with recommended implementation order.


---

## 40. Signing Workflow — Stage Routing and eSignature Requirements (C37)

Frontend reference: `docs/signing-workflow-stage-routing-kanban-and-esignature-requirements.md`
Mock service: `src/app/services/mock/signing-workflow.service.ts`
Domain models: `src/app/models/signing-workflow.ts`

**Nothing in Command 37 is implemented on a backend.** All workflow state, stage state,
participant assignment state, progress, notification direction, and completion behaviour is
deterministic in-memory frontend state that resets on reload, workspace switch, and sign-out.

This is a DIFFERENT system from Workflow Automation (§38). Signing Workflow is per-document
recipient routing and is `launch-core`; Workflow Automation is workspace-wide rules and is
`enterprise-preview`. Do not merge their persistence, endpoints, or permissions.

### Required endpoints

| Method | Path | Replaces |
|--------|------|----------|
| GET    | /api/documents/:documentId/signing-workflow | getDocumentWorkflow, getWorkflowSummary |
| POST   | /api/documents/:documentId/signing-workflow | createWorkflowDraft |
| PATCH  | /api/documents/:documentId/signing-workflow/:workflowId | updateWorkflowDraft |
| DELETE | /api/documents/:documentId/signing-workflow/:workflowId | removeWorkflowDraftDemonstration |
| POST   | /api/documents/:documentId/signing-workflow/:workflowId/activate | createWorkflowPreview (real activation) |
| GET    | /api/documents/:documentId/signing-workflow/:workflowId/stages | listWorkflowStages |
| POST   | /api/documents/:documentId/signing-workflow/:workflowId/stages | addWorkflowStage |
| GET    | /api/documents/:documentId/signing-workflow/:workflowId/stages/:stageId | getWorkflowStage |
| PATCH  | /api/documents/:documentId/signing-workflow/:workflowId/stages/:stageId | updateWorkflowStage |
| DELETE | /api/documents/:documentId/signing-workflow/:workflowId/stages/:stageId | removeWorkflowStage |
| POST   | /api/documents/:documentId/signing-workflow/:workflowId/stages/:stageId/duplicate | duplicateWorkflowStage |
| PUT    | /api/documents/:documentId/signing-workflow/:workflowId/stage-order | reorderWorkflowStages |
| POST   | /api/documents/:documentId/signing-workflow/:workflowId/stages/:stageId/assignments | addStageParticipant |
| PATCH  | .../assignments/:assignmentId | updateStageParticipant |
| DELETE | .../assignments/:assignmentId | removeStageParticipant |
| PUT    | .../stages/:stageId/assignment-order | reorderStageParticipants |
| GET    | .../signing-workflow/:workflowId/validation | validateWorkflow |
| GET    | .../signing-workflow/:workflowId/progress | getWorkflowProgress |
| GET    | .../signing-workflow/:workflowId/field-readiness | getFieldReadiness |
| GET    | .../signing-workflow/:workflowId/preview | getWorkflowDocumentPreview |
| GET    | .../signing-workflow/candidates | listParticipantCandidates |
| POST   | .../signing-workflow/convert-from-recipient-order | applyRecipientOrderConversion |

### Production requirements

**Persistence**
- Signing workflow persistence, scoped to one document transaction, one workspace, one team.
- Stage persistence with a stable ID, name, description, type, execution mode, completion rule.
- Stage ordering persisted as a contiguous 1..n sequence; reorder must be a permutation-only
  operation that cannot add, remove, or invent a stage.
- Participant assignment persistence keyed to the canonical participant identity, never a copy.
- Participant action requirements and per-participant eSignature/initials requirements, each
  recorded with its explicit source (action-implied vs. explicit sender choice).

**Field assignment validation**
- A Sign assignment MUST have a Signature field owned by that assignment.
- Approve/Review/Acknowledge with a signature requirement MUST have a Signature field owned by
  that assignment.
- Exactly one assignment owns any given Signature or Initials field. Reject shared ownership.
- View and Receive-a-Copy assignments MUST NOT carry a signature or initials requirement.
- Detect removed and reassigned fields and surface them as validation issues.

**Routing state machine**
- Stage activation: a stage becomes ready only when every blocking assignment in the prior stage
  has completed.
- Participant eligibility: parallel stages make all blocking assignments eligible together;
  ordered stages gate each assignment on the prior position.
- Completion resolution: `all-required-participants-complete`. Non-blocking assignments
  (View, Receive a Copy) never block. Quorum and weighted voting are NOT in scope.
- Current-stage and next-stage resolution must be server-authoritative. The frontend resolver
  in `src/app/services/signing-workflow.resolver.ts` documents the exact expected semantics.
- Integrate with transaction status: cancelled, voided, expired, and declined transactions
  terminate the workflow.

**Enforcement (security-critical)**
- Recipient access, authentication, and consent must be enforced server-side. Workflow
  configuration MUST NOT grant document access.
- Signature application, approval, review, acknowledgment, decline, and rejection must be tied to
  one authenticated identified participant. One participant must never be able to complete
  another participant's assignment, and a sender must never be able to complete a participant's
  assignment on their behalf.
- A participant's Signature Library item must be readable only by that participant.
- A copy recipient must not receive document access before the approved transaction point.

**Lifecycle and eventing**
- Expiration, cancellation, voiding, and completion handling.
- Activity events and Evidence generation remain the canonical transaction systems. Workflow
  configuration history must NOT be presented as an audit trail or as Evidence.
- Notification event publication via a transactional outbox for the seven events defined in
  `SIGNING_WORKFLOW_NOTIFICATION_DEFINITIONS`.
- Reminder scheduling and cancellation honouring all ten stop conditions (participant completed,
  declined, rejected, stage completed, workflow completed, transaction cancelled, voided,
  expired, participant removed, access revoked).
- Email delivery is owned by the existing notification service (§12, §24). Do not add a second one.

**Operational**
- Idempotency keys on every mutating endpoint (§28).
- Optimistic concurrency (version or ETag) on workflow, stage, and assignment updates so two
  senders cannot silently overwrite each other's routing changes.
- Authorization: `view_documents` to read, `prepare_documents` to write. Workflow Automation
  permissions must NOT grant Signing Workflow access.
- Workspace isolation and team scope on every read and write.
- Audit requirements, retention, observability, retry behaviour, and error contracts follow
  §26, §29, §31, §32.

### Explicit non-goals for C37 backend work

Conditional branching, quorum voting, weighted voting, arbitrary completion formulas, recipient
groups ("any one of these people may sign"), bulk send, collaboration, document versioning,
contract lifecycle management, and any notarial or eNotary stage.
