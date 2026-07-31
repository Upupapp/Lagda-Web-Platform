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

### C33 / C34 Confirmation — SUPERSEDED

This section previously stated that Commands 33 and 34 were not implemented. **Both have
since been built.** See §41 (Bulk Send) and §42 (Document Collaboration).

Two corrections to the original wording:

- Command 34 is **not** "Real-time Collaboration". Real-time collaboration, presence,
  typing indicators, live cursors, WebSockets, and Server-Sent Events are on that
  command's explicit do-not-implement list and none of them exists in the code.
  Command 34 is **asynchronous internal review**.
- Both capabilities are `enterprise-preview` and disabled in the default launch profile.

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


---

## 41. Bulk Send — Recipient Batches and Draft Projections (C33)

Frontend reference: `docs/bulk-send-recipient-batches-mapping-validation-and-draft-projections.md`
Mock service: `src/app/services/mock/bulk-send.service.ts`
Engines: `src/app/services/bulk-send.engine.ts`
Import parser: `src/app/utils/tabular-import.ts`

**Nothing in Command 33 is implemented on a backend.** Batches, recipient rows, parsed CSV,
mappings, validation, and Draft Projections are in-memory frontend state cleared on reload,
workspace switch, and sign-out. No file is uploaded. No request is delivered.

Bulk Send is `enterprise-preview` and disabled in the default launch profile.

### Required endpoints (illustrative)

| Method | Path |
|--------|------|
| GET/POST | /api/bulk-send/batches |
| GET/PATCH/DELETE | /api/bulk-send/batches/:batchId |
| POST | /api/bulk-send/batches/:batchId/duplicate |
| POST | /api/bulk-send/batches/:batchId/recipients (import job) |
| GET/PATCH/DELETE | /api/bulk-send/batches/:batchId/rows/:rowId |
| POST | /api/bulk-send/batches/:batchId/rows/bulk-correct |
| PUT | /api/bulk-send/batches/:batchId/role-mappings |
| PUT | /api/bulk-send/batches/:batchId/variable-mappings |
| POST | /api/bulk-send/batches/:batchId/validate |
| GET | /api/bulk-send/batches/:batchId/eligibility |
| POST | /api/bulk-send/batches/:batchId/create-drafts |
| GET | /api/bulk-send/batches/:batchId/results |
| CRUD | /api/bulk-send/saved-configurations |

### Production requirements

**Import and storage**
- Secure import storage with encryption at rest and a short retention window
- Server-side CSV/spreadsheet ingestion, virus and content scanning, encoding detection
- Column detection, delimiter detection, and header normalisation server-side
- **Formula-injection neutralisation must be re-applied server-side.** The frontend
  neutralisation is a display and copy-out safeguard, never a security boundary.
- Explicit import-data deletion and data-subject deletion paths

**Validation and authorization**
- Re-run the entire validation pipeline server-side; the client result is advisory only
- Per-row authorization: Contact, Template, sender, Team, and Workspace checked for every row
- Batch-size limits, rate limiting, and abuse controls
- Duplicate detection using server-side normalisation

**Execution**
- Queueing, background workers, and job status
- Idempotency keys so a retried batch cannot double-create transactions
- Optimistic concurrency and batch locking against concurrent edits
- Partial batch success, safe retry of failed rows only, cancellation, and emergency stop
- Progress reporting (the frontend deliberately shows no fake progress or queue position)

**Delivery — none of which Bulk Send may do client-side**
- Transaction creation from Template + role mappings + variable values
- Recipient invitation generation and secure access-token issuance
- Email, SMS, and push delivery; reminder scheduling and cancellation
- Bounce handling, suppression lists, and delivery-failure reporting
- Recipient privacy and Contact consent direction

**Operational**
- Template and mapping versioning so a saved configuration cannot silently drift
- Folder/Tag application, Policy and Rule evaluation, notification generation
- Audit logging, observability, metrics, alerting, retention
- Error contracts consistent with §26

### Explicit non-goals

Campaign analytics, marketing automation, open/click tracking, recipient scoring, electronic
notarization, and accreditation workflows.


---

## 42. Document Collaboration — Internal Review, Comments, Mentions (C34)

**Nothing in Command 34 is implemented on a backend.** Threads, comments, Personal Draft
Notes, mentions, reviewer assignments, reviewer responses, resolutions, and collaboration
activity are in-memory frontend demonstration state only. Nothing is persisted, delivered,
emailed, texted, pushed, or recorded.

Document Collaboration is `enterprise-preview` and disabled in the default launch profile.

Full feature detail: `docs/document-collaboration-internal-review-comments-mentions-and-resolution.md`.

### Scope correction

C34 is **asynchronous internal review**, not real-time collaboration. Presence, typing
indicators, live cursors, WebSockets, and Server-Sent Events are explicitly out of scope
and must not be assumed by any backend design.

### What the backend must own

**Authorization — the frontend resolvers are advisory, not a security boundary**
- Thread visibility must be enforced server-side for all five levels
  (internal-workspace, internal-team, owner-and-reviewers, participant-visible,
  personal-draft-note), with the same ordering the frontend uses: Personal Draft Notes
  first and absolutely, then document access, then workspace, then thread rules.
- **A Workspace Administrator must not gain access to a private thread or to anyone's
  Personal Draft Notes by virtue of being an administrator.** There must be no elevation
  path, and the existence of a Personal Draft Note must not be disclosed.
- Collaboration must never grant document access. A mention must never grant access.
  Reviewer assignment must never grant access.
- Restricted threads must be refused at the API, not filtered in the client. A detail
  read of a restricted thread returns a permission error; only the list endpoint may
  return an existence-only row.

**Content safety**
- Comments are plain text. The backend must store and return plain text, must not
  render or accept HTML, and must apply its own control-character stripping and length
  caps (comment 2000, note 1000, title 140, summary 600, review name 120) rather than
  trusting client normalisation.
- Removal must clear the stored body and mentions, not merely flag the row.

**Mentions**
- Re-validate every mention against document access and thread visibility at write
  time. A crafted request must not be able to mention a member without access.
- Excluded members must be reported as a **count only**; returning names would leak
  workspace membership.
- Contacts are not mentionable. Suspended, deactivated, and other-workspace members are
  not mentionable. Cap of 10 per comment.

**Internal review**
- A member may update **only their own** reviewer response. There must be no path to
  respond on another member's behalf.
- A reviewer without document access is recorded as unavailable with a reason — never
  auto-granted access.
- "Ready for Preparation" is internal readiness direction. It must not be represented
  as participant approval, legal approval, or Evidence, and must not gate any
  participant action.

**Boundaries the backend must preserve**
- Collaboration must not write to transaction Activity, Evidence, Verification, or
  My Actions.
- Collaboration activity is not an immutable audit trail and must not be presented as
  one. Audit logging is a separate concern with its own retention rules.
- Blocking is workflow direction only. It must never block a participant action.

**Operational**
- Concurrency and optimistic locking on comment edits and resolution.
- Retention and deletion rules for comment content, especially Personal Draft Notes.
- Notification generation for mentions and replies — including delivery preferences,
  suppression, and the fact that a notification must not disclose thread content the
  recipient may not read.
- Anchor integrity: when a field, stage, folder, or tag is removed, the anchor must
  degrade to stale rather than breaking or silently retargeting.
- Error contracts consistent with §26.

### Explicit non-goals

Real-time presence, typing indicators, live cursors, operational transforms, chat,
external-recipient conversation, attachments, comment export, PDF annotation, document
redaction, field editing through comments, electronic notarization, and accreditation
workflows.


---

## 43. Contacts as a Bulk Send recipient source (Gap Closure Command 1)

**Nothing here is implemented on a backend.** Contact selection, Contact Group
expansion, eligibility, de-duplication and recipient-row projection are in-memory
frontend demonstration state. No Contact is read from, written to, or synchronized
with any service; nothing is imported, invited, sent, or persisted.

Full feature detail: `docs/contact-and-contact-group-recipient-source-gap.md`.

### What the backend must own

**Contact and Contact Group reads**
- Paginated, searchable Contact list scoped to the caller's workspace. The frontend
  currently pages client-side at 50 and cannot express a server cursor.
- Contact Group list, and group membership resolved server-side. Note the frontend
  found the two membership sides disagree in fixtures (a group's `contactIds` vs a
  contact's `groupIds`); the backend must pick one authoritative direction.
- Group member counts must be computed with the same status filter used to list
  groups, or the count shown on a card will disagree with the expansion.

**Tenancy — currently the weakest point**
- Workspace scoping must be enforced **server-side**. The frontend filters by
  `workspaceId`, but that is presentation, not authorization.
- **Team scope is not implemented at all** on the frontend because the canonical
  Contacts service exposes none. If Contacts are team-scoped in production, the
  backend must enforce it and expose it; the frontend claims nothing today.
- A Contact ID must never grant access. A Contact Group ID must never grant access.
  Group membership must never imply document permission.

**Eligibility and validation**
- Re-validate every Contact at projection time, not only at selection time. The
  frontend resolves eligibility when the picker renders; a Contact can be archived,
  restricted, removed, or have its address changed between selection and send.
- Email normalization and validity must match the rules applied to CSV-sourced rows
  so the two sources cannot disagree about the same address.
- Distinct Contact records sharing an address must be surfaced as a conflict for
  review, never silently merged.

**Projection integrity**
- Contact and Contact Group provenance (`contactId`, `contactGroupId`) must survive
  the row lifecycle and must not be inferable from a URL.
- Row-to-Contact attribution is positional in the current frontend contract; a real
  API should carry the association explicitly per row instead.
- Row limits must be reported, not silently truncated.

**Operational**
- Pagination, search, rate limiting, concurrency and idempotency on projection.
- Behaviour when a Contact is removed or a group's membership changes after rows
  were projected but before anything is sent.
- Privacy minimisation: only the fields a recipient row needs should ever leave the
  Contacts service. Notes, phone numbers, tags, owner and usage history must not.
- Audit requirements for reading Contacts in bulk, and retention for projected rows.
- Error contracts consistent with §26.

### Explicit non-goals

Contact import, contact synchronization, CRM behaviour, marketing campaigns,
recipient invitation delivery, and any notification to a selected Contact.


---

## 44. Recipient row editing (Gap Closure Command 2)

**Nothing here is implemented on a backend.** Row edits mutate an in-memory batch
draft. No recipient, Contact, request, invitation, or transaction is updated,
persisted, delivered, or synchronized.

Full feature detail: `docs/inline-recipient-row-editing-gap.md`.

### What the backend must own

**Update endpoint**
- A row-update endpoint accepting a row ID and a partial value map. The frontend
  contract is `updateRecipientRow(batchId, rowId, values, ctx)` returning the whole
  revalidated batch; a real API should return the updated row plus recomputed
  summaries rather than the entire batch.
- Server-side normalisation and length limits. The frontend caps values at 500
  characters and strips control characters, but that is convenience, not a guarantee.

**Concurrency**
- A stable row version or ETag. Two people editing the same batch will otherwise
  overwrite each other silently — the frontend has no version field today.
- Optimistic locking with a clear conflict response, and a defined resolution flow.
- Idempotency for retried saves.

**Validation and duplicates**
- Re-validate server-side. Frontend validation is advisory.
- Duplicate detection must not depend on a Template being selected. The current
  engine keys its email rule on mapped role columns, so a template-less batch gets
  no email duplicate detection at all. A backend should define duplicate identity
  independently of mapping.
- Email normalisation must match whatever the projection path uses, or the same
  address will be judged differently depending on how it arrived.

**Provenance and source immutability**
- `contactId` and `contactGroupId` must survive an edit and must not become
  writable through the update endpoint.
- Editing a projected row must never write back to the Contact, the Contact Group,
  or its membership. This boundary must be enforced server-side, not assumed.
- The projected-source snapshot (`originalValues`) must be preserved so Revert
  remains meaningful, and must not be client-supplied.

**Authorization**
- Row editing must be permission-checked per request. The frontend gates on an
  existing batch-edit permission; that is presentation.
- Workspace isolation must be enforced. Team scope, if it applies to batches, must
  be enforced too.
- Permission removed mid-edit must fail the save safely without leaking the prior
  row state.

**Operational**
- Stale-row handling: a defined response when the row was removed by someone else,
  and a client contract for closing the editor safely.
- Rate limiting on rapid successive edits.
- Audit policy for who changed which recipient value and when, kept separate from
  transaction Activity.
- Privacy minimisation: an edit log must not accumulate recipient email history
  beyond retention need.
- Error contracts consistent with §26.

### Explicit non-goals

Contact editing, Contact Group editing, contact synchronization, CSV rewriting,
fixture mutation, and any notification to an edited recipient.


---

## 45. Request and Organization Defaults (Gap Closure Command 3)

**Nothing here is persisted.** Request Defaults live on an in-memory batch draft.
No workspace setting, reminder, invitation, authentication requirement, consent
record, Policy, or Automation Rule is created, scheduled, applied, or delivered.

Full feature detail: `docs/request-and-organization-defaults-editor-gap.md`.

### The missing layer the backend must supply

The frontend models a seven-layer precedence stack
(`BULK_SEND_DEFAULT_PRECEDENCE`) but only three layers have producers:
`user` (added by this command), `template`, and `product-default`.

- **`workspace-default` has no store at all.** Canonical `WorkspaceSettings` holds
  membership and session fields only — no routing mode, authentication direction,
  consent, expiration, or sender message. A backend that wants workspace-inherited
  request defaults must define that store; the frontend deliberately did not invent
  one.
- **`saved-configuration` has a store but no reader.** `SavedConfiguration.defaults`
  is populated and persisted in the mock, but nothing consults it during
  resolution. Either wire it or remove the layer.
- **`workflow-policy` and `automation-rule` remain unproduced by design** (the
  Command 32 engine is a separate deferred gap).

### What the backend must own

**Persistence and concurrency**
- Request-default persistence scoped to the draft, and workspace-default
  persistence scoped to the workspace, as two distinct stores with distinct
  permissions.
- A version or ETag per scope. There is none today, so concurrent edits would
  overwrite each other silently.
- Idempotency for retried saves; a defined conflict response and resolution flow.

**Resolution**
- Server-side effective-value resolution. The frontend resolver is advisory.
- The resolved value must carry its source, or the UI cannot explain inheritance.
- Changing a workspace default must **not** rewrite existing request overrides,
  participant overrides, or recipient-row values, and must not touch sent or
  completed transactions.

**Authorization**
- Editing request defaults and managing workspace defaults must be separately
  permissioned. Holding one must not imply the other.
- Workspace isolation enforced server-side; team scope enforced if it applies.
- Permission removed mid-edit must fail the save without leaking prior values.

**Validation and safety**
- Re-validate server-side, including enum membership. Note that a Template fixture
  currently carries an authentication value outside `PrepAuthMethodId`; a backend
  must reject or migrate such values rather than propagate them.
- Direction-only fields (due date, expiration, reminders, completion copy) must not
  be treated as scheduling instructions until real scheduling exists.

**Operational**
- Cache invalidation when a workspace default changes.
- Audit policy for defaults changes, kept separate from transaction Activity.
- Privacy minimisation — sender messages and subjects must not accumulate in logs.
- Error contracts consistent with §26.

### Explicit non-goals

Policy evaluation, Automation execution, reminder scheduling, notification
delivery, and any production request or transaction mutation.


---

## 46. Policy and Automation resolution in preparation (Gap Closure Command 4)

**Nothing is enforced or executed.** No Policy is enforced, no Automation Rule is
run by a backend, and no recipient, request, transaction, notification, reminder or
invitation is created, changed, scheduled or delivered. Resolution is a frontend
evaluation preview over in-memory fixtures.

Full feature detail: `docs/policy-and-automation-resolution-integration-gap.md`.

### Capability reality the backend must resolve

There is exactly one capability, `workflow-automation`, and it owns both Rules and
Policies. It is `enterprise-preview`, so **Policy resolution does not run in the
default launch profile** — verified: zero engine calls there. If Policies are meant
to govern launch-profile preparation they need their own capability classification
and authorization model. That is a product decision the frontend deliberately did
not make on its own.

### What the backend must own

**Authoritative evaluation**
- Rule matching and Policy enforcement must be server-side. The frontend evaluation
  is a preview and must never be treated as enforcement.
- A preparation-specific trigger kind. The frontend uses `transaction_created` as
  the closest available approximation because the engine models no preparation
  trigger.
- Deterministic resolution: identical input must yield identical output, and every
  result must carry the input version it was computed from.

**Input contract and minimization**
- The frontend sends counts, kinds and flags only — no recipient identity, no
  document content, no field values. A backend contract must preserve that
  minimization rather than widening it for convenience.
- Raw resolution input must not be logged or retained beyond evaluation.

**Precedence and provenance**
- The seven-layer precedence order must be enforced server-side.
- An accepted recommendation must stay distinguishable from a value the user typed.
  The frontend records both as `source: "user"` — honest at the UI level, but it
  loses that distinction; a backend should keep them separate.
- Rule or Policy output must never overwrite an explicit recipient-row or
  participant value without an explicit acceptance step.

**Conflicts**
- Conflict detection, priority resolution, and a defined resolution strategy.
- Preserve the distinction between a conflict that affected a given evaluation and
  one that merely exists in the workspace. Blocking on the latter prevents work for
  reasons the user cannot address in context.

**Authorization and isolation**
- Rule and Policy definitions are workspace- and team-scoped; another workspace's or
  team's definitions must never be evaluated or named.
- Viewing a requirement must not require permission to read the Rule that produced
  it. The frontend shows a safe explanation and conflict source counts, never
  private definitions.
- Rule output must never grant access, bypass a permission, apply a signature,
  complete a participant, advance a stage, create Evidence, or send anything.

**Operational**
- Versioning, activation and archival of definitions; migration on change.
- Evaluation latency budget, timeouts, retry and safe-failure behaviour. A failed
  evaluation must not silently allow continuation where Policy is mandatory.
- Idempotency on recommendation acceptance.
- Explanation retention and sensitive-data redaction in any audit record.
- Error contracts consistent with §26.

### Explicit non-goals

Background execution, event processing, queues, webhooks, scheduling, conditional
branching, user-authored scripting, and any external workflow engine.

---

# Production test requirements

Gap Closure Command 6 (2026-08-01). **Not implemented — this is a handoff.**

The frontend now has a working quality system (see
`docs/frontend-testing-strategy.md`), but every service it tests is an in-memory
mock. Nothing below can be tested until a backend exists, and none of it should be
represented as covered today.

Each item states the invariant the test must protect, because the invariant is the
part worth carrying across.

## Authentication and session

- **Authentication integration** — real credential validation; failure paths do not
  leak whether an account exists.
- **Session integration** — issue, refresh, revoke. A revoked session is rejected
  immediately, not at next refresh.
- **Session expiry** — an expired session cannot complete an in-flight mutation,
  and the client is never told an operation succeeded when it did not.

## Authorization and tenancy

- **Workspace isolation** — every read and write is scoped server-side. A user
  cannot reach another workspace's batch, document, Contact, report or
  notification by ID, by query parameter, or by a stale deep link.
- **Team scope** — enforced on the server. The frontend passes `teamId` but team
  membership is not modelled.
- **Document authorization** — being named in a batch, mentioned in a comment, or
  assigned as a reviewer must never by itself grant document access.
- **Capability versus permission** — a capability being available must never grant
  a permission. Test both directions.

## Domain persistence

- **Contact API** and **Contact Group API** — CRUD, archive/restore, membership.
  Expanding a group must never mutate its membership.
- **Recipient-row persistence** — rows survive a reload; editing a row never
  mutates its source Contact, Contact Group, uploaded file, or pasted text.
- **Request Default persistence** and **Organization Default persistence** — the
  precedence chain `user > saved-configuration > template > workflow-policy >
  automation-rule > workspace-default > product-default` resolves identically on
  the server. **The workspace-level store does not exist yet** (see §17 gap 4).
- **Policy enforcement** — a mandatory Policy requirement genuinely blocks; it
  cannot be bypassed by a query parameter or a direct API call.
- **Automation execution** — a Rule can never send a notification, apply a
  signature, complete a participant, or grant access.
- **Signing Workflow state machine** — stage transitions, parallel versus ordered
  behaviour, one signature per assignment, a stage never signs, a group never
  signs, one participant cannot sign for another.
- **Recipient actions** and **eSignature application** — idempotent; a replayed
  request does not double-apply.

## Delivery

- **Notification outbox** — transactional outbox, at-least-once delivery with
  deduplication per recipient per event. Audience resolution excludes Contacts and
  recipients. Deep links revalidate authorization at the destination.
- **Email provider** and **SMS provider** — bounce and failure handling; a failed
  send is never reported as delivered.

## Read models

- **Search index** — permission-filtered at index time and again at query time.
  Recipient emails and names are never indexed. Deleting a record removes it from
  the index. Eventual consistency is bounded and stale results fail safely.
- **Report aggregation** — counts match the source of truth; export and schedule
  endpoints reject any request for recipient-level columns from the preparation
  family.
- **Dashboard aggregates** — permission-filtered counts; cache invalidation on
  workspace switch; partial failure degrades one card rather than the page.

## Records

- **Activity** — append-only, tamper-evident, complete for every state change.
- **Evidence** — generated only from real events; never from a demonstration path.
- **Verification** — a verification record corresponds to a real document and a
  real check.

## Cross-cutting

- **Idempotency** — every mutating endpoint accepts an idempotency key; replay
  returns the original result rather than duplicating.
- **Concurrency** — optimistic concurrency on batches, rows and defaults; a
  conflicting write is rejected with a usable error, not silently merged.
- **Rate limiting** — per user, per workspace, per endpoint.
- **Security** — authorization on every endpoint, injection, SSRF, file-upload
  validation, and the negative cases for each.
- **Data retention** — deletion actually deletes, including from indexes,
  aggregates and backups.
- **Backup and restoration** — restore is exercised, not just backup.
- **Observability** — structured logs with **redaction of recipient identity**,
  traces, and alerting on the outbox and index lag.
- **Failure recovery** — partial service failure degrades gracefully; no operation
  reports success on a failed write.
