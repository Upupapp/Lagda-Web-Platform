# Log Data Classification — BACKEND-12

Every value that could appear in a log, classified. Metrics are stricter still —
they carry no identifiers at all.

## Classes

| Class | Rule |
|---|---|
| `SAFE_OPERATIONAL` | Log freely |
| `CONTEXTUAL_IDENTIFIER` | Log for correlation. Never a metric label |
| `PII_RESTRICTED` | Only with a stated purpose. Never routine |
| `SENSITIVE` | Only in a named security flow |
| `SECRET_PROHIBITED` | **Never**, at any level, including `trace` |
| `DOCUMENT_CONTENT_PROHIBITED` | **Never** |

## Operational

| Value | Class | Notes |
|---|---|---|
| `requestId` | SAFE_OPERATIONAL | Opaque, server-generated, carries no business meaning |
| `service`, `processRole`, `environment` | SAFE_OPERATIONAL | On every line |
| `method`, route pattern, `statusCode` | SAFE_OPERATIONAL | Route **pattern**, never a raw URL |
| `durationMs`, `responseTime` | SAFE_OPERATIONAL | |
| `event`, `operation`, `useCase` | SAFE_OPERATIONAL | Stable names |
| `errorCategory`, `errorCode`, `dependency`, `retryable` | SAFE_OPERATIONAL | What alerts branch on |
| `sqlState`, `constraint` | SAFE_OPERATIONAL | Internal only, never sent to a client |
| Node version, build SHA | SAFE_OPERATIONAL | Startup only, never on a public endpoint |

## Identifiers

| Value | Class | Notes |
|---|---|---|
| `workspaceId` | CONTEXTUAL_IDENTIFIER | Log for correlation. **Never a metric label** |
| `userId` | CONTEXTUAL_IDENTIFIER | Preferred over email, always |
| `recipientId` | CONTEXTUAL_IDENTIFIER | Preferred over recipient email |
| `documentId`, `signingRequestId`, `artifactId` | CONTEXTUAL_IDENTIFIER | |
| `verificationId` | CONTEXTUAL_IDENTIFIER | Public-but-sensitive. Do not spray; prefer internal IDs |
| `jobId`, `attempt` | CONTEXTUAL_IDENTIFIER | BACKEND-16 |
| `idempotencyKey` | **SENSITIVE** | Not logged in full. A fingerprint convention is BACKEND-14's to define |

Identifiers, not display values. An ID is stable, less PII-rich, and does not
change when a customer renames something.

## PII

| Value | Class | Why not routinely logged |
|---|---|---|
| email address | PII_RESTRICTED | `userId` answers the same question |
| phone number | PII_RESTRICTED | |
| IP address | PII_RESTRICTED | **Not in request logs.** Evidence persistence stores it for selected signing events only, under proxy trust (BACKEND-10/11) |
| user-agent | PII_RESTRICTED | Only `userAgentPresent: true` is logged. Identifying in combination and high-cardinality |
| workspace **name** | PII_RESTRICTED | A customer identifier. Use the ID |
| document **name/title** | PII_RESTRICTED | A filename can reveal the legal matter — "Redundancy Notice — J Cruz.pdf" |
| template name | PII_RESTRICTED | Potentially customer-sensitive |
| search query text | PII_RESTRICTED | Free text may contain names and matters |
| location / region | PII_RESTRICTED | Not collected (OD-025) |

## Secrets — never, at any level

`password` · `currentPassword` · `newPassword` · password hash · `otp` ·
verification code · session cookie · session token · `X-CSRF-Token` ·
`Authorization` · signing access token · reset token · API key ·
webhook signing secret · S3 credentials · presigned URL · `DATABASE_URL` ·
email provider key · private key / HSM credential

A lower log level grants no exemption. `debug` and `trace` obey this identically.

## Document content — never

PDF bytes · extracted document text · signature image · initials image ·
participant field values · rendered certificate bytes

Binary values log as `[binary N bytes]`. A test encodes `%PDF-1.7-SYNTHETIC…`
into a `Uint8Array`, logs it, and asserts the marker never appears.

## Request and response bodies

**Not logged.** Not by default, and not as a routine debug feature.

A LAGDA request body may carry a password, an OTP, recipient PII, a signature
image or field values. "We redact the known-sensitive keys" fails the moment a
new key appears — so no body serializer exists at all.

## Metrics

Metrics carry **no identifiers and no PII**. Permitted labels: `method`, `route`
(pattern), `statusFamily`, `useCase`, `errorCategory`, `repository`,
`operation`, `dependency`, `sealScheme`, `result`, `processRole`,
`securityEvent`.

Two separate reasons, and either alone would be sufficient: cardinality, and
privacy.

## Where PII may legitimately appear

Not everything restricted is forbidden — collection must be **purposeful**:

- `userId` / `workspaceId` in operational logs: incident correlation. Stated
  purpose, minimal, ID-only.
- IP in **evidence** (not logs): handoff §16 requires it for participant
  actions. Written only under trusted proxy configuration (OD-027).
- User-agent in a **security event**: investigating a specific incident, not
  routine traffic.

## Privacy handoffs

**BACKEND-55/66 — retention.** Operational, security, metric and trace retention
are four separate decisions, and all four are separate from document and evidence
retention. Nothing is hardcoded.

**Data residency.** Logs may contain personal data, so a log aggregator or APM
vendor is a **processor** and belongs in the cross-border privacy decision
alongside the database. Logs are not outside privacy scope (OD-030).

**Access control.** Production logs must have restricted operational access. It
is not a given that every developer should read production logs indefinitely.
