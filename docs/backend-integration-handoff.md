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

## 36. Explicit eNotary Exclusion

LAGDA eNotary is a separate future product pending Supreme Court accreditation. Backend work for eNotary must not begin until:
- Supreme Court accreditation is obtained
- Applicable rules are confirmed
- A separate implementation plan is approved

No eNotary backend routes, data models, or infrastructure should be built as part of this eSignature backend integration.
