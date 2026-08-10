# Security Event Catalog — BACKEND-12

Structured operational telemetry for security-relevant occurrences.

**These are not evidence.** A failed sign-in is an operational signal with its
own retention; a signing action is business history in `evidence_events`. Some
occurrences produce both, and they remain two records.

## Format

```json
{ "event": "security.authorization_denied",
  "securityEvent": "authorization_denied",
  "requestId": "req_…", "workspaceId": "ws_…", "userId": "usr_…",
  "resourceType": "document", "result": "denied" }
```

Structured fields, never prose. An alert built on free-text matching breaks the
first time someone improves a message.

**Never** in a security event: the credential, the token, the OTP, the CSRF
value, the password, or the target resource of another tenant.

## Catalog

| Event | Status | Owner | Notes |
|---|---|---|---|
| `security.authentication_failed` | **PLANNED** | BACKEND-19/22 | `userId` only when the account is known. Never the attempted password |
| `security.session_created` | **PLANNED** | BACKEND-13 | Never the session token |
| `security.session_revoked` | **PLANNED** | BACKEND-13 | Include the reason: logout, rotation, expiry |
| `security.csrf_rejected` | **PLANNED** | BACKEND-13 | Never the token value, present or expected |
| `security.authorization_denied` | **PLANNED** | BACKEND-27 | Resource **type**, never another tenant's resource name |
| `security.tenant_access_denied` | **PLANNED** | BACKEND-27 | See below |
| `security.rate_limit_triggered` | **PLANNED** | BACKEND-15 | Scope category and route. No actor label in metrics |
| `security.signing_access_invalid` | **PLANNED** | BACKEND-34 | Never the access token |
| `security.otp_failed` | **PLANNED** | BACKEND-23 | Never the OTP, submitted or expected |
| `security.password_reset_requested` | **PLANNED** | BACKEND-21 | Never the reset token |
| `security.api_key_rejected` | **PLANNED** | BACKEND-52 | Key record ID or fingerprint, never the key |
| `security.webhook_signature_invalid` | **PLANNED** | BACKEND-53 | Never the signing secret |

Every one is PLANNED. None of these features exists, and implementing telemetry
for a flow that does not exist produces code nothing executes.

## Cross-tenant attempts

A cross-tenant access attempt is worth detecting, and the log records that one
occurred, in which workspace, by which actor, against which resource **type**.

It does **not** record the target workspace's name or the resource's title. The
client meanwhile receives a safe `not_found` where policy calls for it — the
telemetry must not become the disclosure the API response was designed to avoid.

## Not implemented here

- **No automatic blocking.** Repeated failures become observable; acting on them
  is BACKEND-15/56.
- **No separate security log store.** One pipeline today. Security logs may later
  need longer retention and tighter access — recorded for BACKEND-56/66.
- **No customer-facing exposure.** This telemetry never reaches a workspace user.
  The audit UI reads curated business records.

## Password recovery (BACKEND-22)

| Event | Fields | Notes |
|---|---|---|
| `auth.password_reset.requested` | `requestId`, result | Emitted for known and unknown alike |
| `auth.password_reset.challenge_created` | `requestId`, `userId`, `challengeId` | Internal; only after the account resolves |
| `auth.password_reset.rate_limited` | `requestId`, scope | Scope is a digested limiter key, never a raw address |
| `auth.password_reset.succeeded` | `requestId`, `userId`, `challengeId`, `revokedSessionCount` | A COUNT, never session identifiers |
| `auth.password_reset.invalid_token` | `requestId` | The internal reason may be recorded; it never reaches a response |
| `auth.password_reset.expired` | `requestId` | |

**Never recorded, anywhere:** the raw reset token, its digest, the full reset
URL, the plaintext password, the password hash, session tokens, CSRF tokens, or
the requesting email address.

The raw address is not logged on the public request path. Operational
correlation, if it is ever needed, uses the digested account scope the limiter
already produces.

Note the asymmetry: `requested` fires for every call, `challenge_created` only
when an account resolved. Internal logs may distinguish what the public response
does not — but only in a store the caller cannot read.

## Multi-factor authentication (BACKEND-23)

| Event | Fields |
|---|---|
| `auth.mfa.required` | `requestId`, `userId` |
| `auth.mfa.verification_succeeded` | `requestId`, `userId`, `pendingId`, `method` |
| `auth.mfa.verification_failed` | `requestId`, `pendingId`, `attemptNumber` |
| `auth.mfa.attempts_exhausted` | `requestId`, `pendingId` |
| `auth.mfa.enabled` / `auth.mfa.disabled` | `requestId`, `userId`, `factorType` |
| `auth.mfa.recovery_code_used` | `requestId`, `userId`, `remaining` |

**Never recorded, anywhere:** the submitted code, the TOTP secret in any form,
the provisioning URI, a recovery code, the pre-auth credential, the encryption
key, or a session credential.

`method` is a closed vocabulary (`PASSWORD_PLUS_TOTP`,
`PASSWORD_PLUS_RECOVERY_CODE`), safe as a metric label. Ids are safe in logs and
never in metric labels.

`attemptNumber` is recorded internally and **never returned** — an attempt count
in a response discloses the security configuration for no product benefit.

These are account-security events. They are **not** eSignature signing evidence.

## Workspace lifecycle (BACKEND-25)

| Event | Emitted when | Fields | Never |
|---|---|---|---|
| `workspace.created` | a workspace and its owner membership commit | `workspaceId`, `actorUserId`, `result` | the workspace **name** |
| `workspace.updated` | metadata changes | `workspaceId`, `actorUserId`, `changedFields`, `result` | the changed **values** |
| `security.tenant_access_denied` | a caller addresses a workspace they are not a member of | `requestedWorkspaceId`, `result: denied`, route | anything about the other tenant, and nothing in the RESPONSE |

`workspace.archived` is **not** in this catalog, because no archive action
exists (WORKSPACE_LIFECYCLE.md).

### Why no workspace name

A workspace name can carry a client, a matter, a counterparty, or the existence
of a transaction that has not been announced. It is the most revealing field in
the workspace schema and the least obviously so — see
WORKSPACE_DATA_CLASSIFICATION.md. Routine operational logs get the ID.

Enforced by a test that creates a workspace with a distinctive name and searches
the **entire** captured log output for it, rather than checking the fields of one
line.

### Alerting

A single `tenant_access_denied` is not an incident — a stale bookmark after
someone leaves a workspace produces one. A sustained spike from one actor is a
signal. Thresholds belong with the alerting work in BACKEND-66; the event is
emitted with bounded fields so a rule can be written against it.

### Metrics

`workspace_operations_total{operation, result, processRole}`. Three labels, all
code-defined and bounded. No `workspaceId`, no `userId`, no `membershipId` and
no name — the first three are unbounded and the fourth is business data. A test
asserts the exact label set.

Instrumented, collecting nothing: there is no exporter until BACKEND-66.


## Workspace invitations (BACKEND-26)

| Event | Emitted when | Fields | Never |
|---|---|---|---|
| `workspace.invitation.created` | an invitation and its delivery intent commit | `workspaceId`, `invitationId`, `actorUserId`, `role`, `result` | the invitee **email**, the token, the URL |
| `workspace.invitation.resent` | a credential is rotated | `workspaceId`, `invitationId`, `actorUserId`, `result` | the old or new token |
| `workspace.invitation.revoked` | a manager withdraws one | `workspaceId`, `invitationId`, `actorUserId`, `result` | — |
| `workspace.invitation.accepted` | a membership is created, or converges | `workspaceId`, `actorUserId`, `role`, `joined`, `result` | the token, the invitee email |
| `workspace.invitation.declined` | the invitee refuses | `actorUserId`, `result` | the token |

### Why the invitee email is absent

A manager is entitled to see who they invited — the pending list returns it. That
entitlement is scoped to the **response**. An address in an operational log is
personal data in a system that retains logs differently from tenant data and
ships them to places nobody reviewed for PII. Events carry `invitationId`.

### Why no token, ever

The raw credential grants tenant access. It appears in no event, no error, no
metric and no URL the backend constructs a log line from — and it is not
persisted, so there is nothing to leak from storage either.

### Metrics

`workspace_invitation_operations_total{operation, result, processRole}`. Three
labels, all code-defined and bounded. No workspace, user or invitation ID, no
email, no digest.

Instrumented, collecting nothing: there is no exporter until BACKEND-66.

### Alerting

A sustained spike in invitation **rejections** — rate-limit 429s, or repeated
`invalid_or_expired_invitation` from one address — is worth a signal: the first
suggests an email-bombing attempt or a runaway client, the second suggests token
guessing. A single instance of either is normal. Thresholds belong with
BACKEND-66.
