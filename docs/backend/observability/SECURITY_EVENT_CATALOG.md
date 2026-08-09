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
